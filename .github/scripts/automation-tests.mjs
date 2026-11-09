import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { commands, diagnosticsFor, runCheck } from './health-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const workflow = readFileSync(join(root, '.github/workflows/health-check.yml'), 'utf8');
const reporterScript = workflow.split('          script: |\n')[1]
  .split('\n').map(line => line.slice(12)).join('\n');

async function report(results, existing = [], labelStatus = 200) {
  const created = [];
  const labels = [];
  const github = {
    paginate: async (_method, options) => {
      assert.equal(options.state, 'open');
      assert.equal(options.per_page, 100);
      return [...existing];
    },
    rest: { issues: {
      listForRepo() {},
      getLabel: async () => { if (labelStatus !== 200) throw Object.assign(new Error('Label lookup failed'), { status: labelStatus }); },
      createLabel: async value => { labels.push(value.name); },
      create: async value => { created.push(value); return { data: { ...value, number: created.length } }; },
    } },
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction('github', 'context', 'core', 'process', reporterScript)(
    github, { repo: { owner: 'example', repo: 'puzzleme' }, serverUrl: 'https://github.com', runId: 123, sha: 'abc123' },
    { info() {} }, { env: { CHECK_RESULTS: JSON.stringify(results) } },
  );
  return { created, labels };
}

test('diagnostics exclude credential-shaped and arbitrary output', () => {
  const secret = 'PRIVATE_SENTINEL_DO_NOT_PUBLISH';
  const output = `error TS2322: ${secret}\nTOKEN=${secret}\nhttps://user:${secret}@registry.invalid`;
  assert.deepEqual(diagnosticsFor('typecheck', output), { typescriptCodes: ['TS2322'] });
  for (const check of Object.keys(commands)) {
    assert.ok(!JSON.stringify(diagnosticsFor(check, output)).includes(secret));
  }
  assert.deepEqual(diagnosticsFor('audit', JSON.stringify({
    metadata: { vulnerabilities: { low: 2, high: secret, critical: -1 } }, token: secret,
  })), { vulnerabilities: { info: null, low: 2, moderate: null, high: null, critical: null } });
});

test('unknown check cannot execute arbitrary input', () => {
  assert.throws(() => runCheck('constructor'), /Unknown health check/);
  assert.throws(() => runCheck('install; echo unsafe'), /Unknown health check/);
});

test('command failure preserves exit status, publishes safe evidence and deletes raw output', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'puzzleme-test-'));
  try {
    mkdirSync(join(temporary, 'bin'));
    mkdirSync(join(temporary, 'tmp'));
    const secret = 'PRIVATE_SENTINEL_DO_NOT_PUBLISH';
    writeFileSync(join(temporary, 'bin/pnpm'), `#!/bin/sh\necho 'error TS2345: ${secret}' >&2\nexit 7\n`, { mode: 0o700 });
    const child = spawnSync(process.execPath, [join(root, '.github/scripts/health-check.mjs'), 'typecheck'], {
      cwd: temporary, encoding: 'utf8',
      env: { ...process.env, PATH: `${temporary}/bin:${process.env.PATH}`, TMPDIR: join(temporary, 'tmp'), GITHUB_STEP_SUMMARY: join(temporary, 'summary') },
    });
    assert.equal(child.status, 7);
    assert.ok(!child.stdout.includes(secret));
    assert.equal(child.stderr, '');
    const artifact = readFileSync(join(temporary, 'artifacts/health/typecheck.json'), 'utf8');
    assert.ok(!artifact.includes(secret));
    assert.deepEqual(JSON.parse(artifact), {
      check: 'typecheck', exitCode: 7, status: 'failure', interrupted: false, typescriptCodes: ['TS2345'],
    });
    assert.ok(!readFileSync(join(temporary, 'summary'), 'utf8').includes(secret));
    // Any leftover raw capture would contain the sentinel.
    assert.deepEqual(readdirSync(join(temporary, 'tmp')), []);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test('reporter suppresses a matching open issue regardless of labels/title', async () => {
  const result = await report({ test: 'failure' }, [{ number: 42, body: '<!-- puzzleme-health:test:v1 -->', labels: [] }]);
  assert.equal(result.created.length, 0);
});

test('reporter creates one issue per failed check with required labels and no raw output', async () => {
  const result = await report({ test: 'failure', audit: 'failure', build: 'success', install: 'success', typecheck: 'skipped' }, [], 404);
  assert.deepEqual(result.labels, ['bug', 'automated']);
  assert.equal(result.created.length, 2);
  for (const issue of result.created) {
    assert.deepEqual(issue.labels, ['bug', 'automated']);
    assert.match(issue.body, /actions\/runs\/123/);
    assert.match(issue.body, /Acceptance criteria/);
  }
});

test('PR body markers do not suppress an issue; repeat reports are idempotent', async () => {
  const results = { audit: 'failure' };
  const first = await report(results, [{ pull_request: {}, body: '<!-- puzzleme-health:audit:v1 -->' }]);
  assert.equal(first.created.length, 1);
  const second = await report(results, first.created);
  assert.equal(second.created.length, 0);
});

test('missing failure metadata produces an infrastructure issue', async () => {
  const result = await report({ install: '', test: 'skipped' });
  assert.equal(result.created.length, 1);
  assert.match(result.created[0].body, /puzzleme-health:infrastructure:v1/);
});

test('unexpected API permission errors stop reporting without speculative writes', async () => {
  await assert.rejects(report({ test: 'failure' }, [], 403), /Label lookup failed/);
});
