import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const cliRoot = dirname(require.resolve('@expo/cli/package.json'));
const fingerprintRoot = dirname(require.resolve('@expo/fingerprint/package.json'));

function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), 'puzzleme-glob-'));
  for (const file of ['src/index.ts', 'src/.hidden.ts', 'src/nested/scene.ts', 'node_modules/ignored.ts', 'ios/Game.xcodeproj/project.pbxproj']) {
    fs.mkdirSync(dirname(join(root, file)), { recursive: true });
    fs.writeFileSync(join(root, file), '');
  }
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

for (const consumer of ['@expo/cli', '@expo/fingerprint']) {
  const consumerRequire = createRequire(require.resolve(`${consumer}/package.json`));
  test(`${consumer}: canceled glob stops scheduling directory reads`, async t => {
    const { glob } = consumerRequire('glob');
    const controller = new AbortController();
    const reason = new Error('regression-test-abort');
    let readsAfterAbort = 0;
    let pending = 0;
    let onIdle;
    const idle = new Promise(resolve => { onIdle = resolve; });
    const instrumentedFs = {
      ...fs,
      readdir(path, options, callback) {
        if (controller.signal.aborted) readsAfterAbort++;
        pending++;
        fs.readdir(path, options, (error, entries) => {
          // Abort when the first real read completes, before traversal can recurse.
          if (!controller.signal.aborted) controller.abort(reason);
          callback(error, entries);
          if (--pending === 0) onIdle();
        });
      },
    };
    await assert.rejects(glob('**/*.ts', {
      cwd: fixture(t), fs: instrumentedFs, signal: controller.signal,
    }), error => error === reason);
    await idle;
    assert.equal(readsAfterAbort, 0);
  });
}

test('minimatch preprocessing respects the expansion budget for every affected consumer', () => {
  for (const consumer of ['@expo/fingerprint', 'eslint', '@eslint/config-array', '@typescript-eslint/typescript-estree', 'glob']) {
    const consumerRequire = createRequire(require.resolve(consumer));
    const { Minimatch } = consumerRequire('minimatch');
    const matcher = new Minimatch('**/../a/b/'.repeat(5) + '*.js', {
      optimizationLevel: 2, braceExpandMax: 4,
    });
    assert.ok(matcher.globParts.length <= 4, `${consumer}: expansion exceeded budget`);
  }
});

test('Expo glob helpers preserve async, stream, sync, dot and ignore behavior', async t => {
  const cwd = fixture(t);
  const { everyMatchAsync, anyMatchAsync } = require(join(cliRoot, 'build/src/utils/glob.js'));
  const options = { cwd, dot: true, nodir: true, ignore: ['node_modules/**'] };
  assert.deepEqual((await everyMatchAsync('**/*.ts', options)).sort(), [
    'src/.hidden.ts', 'src/index.ts', 'src/nested/scene.ts',
  ]);
  const first = await anyMatchAsync('**/*.ts', options);
  assert.equal(first.length, 1);
  assert.ok(first[0].startsWith('src/'));
  assert.deepEqual(await anyMatchAsync('**/*.missing', options), []);
  const cliRequire = createRequire(join(cliRoot, 'package.json'));
  assert.deepEqual(cliRequire('glob').sync('ios/*.xcodeproj', { cwd }), ['ios/Game.xcodeproj']);
});

test('Expo fingerprint keeps ordered ignore, negation and dotfile matching', () => {
  const { isIgnoredPath, buildDirMatchObjects, buildPathMatchObjects } = require(join(fingerprintRoot, 'build/utils/Path.js'));
  const patterns = ['**/generated/**', '!**/generated/keep.ts'];
  assert.equal(isIgnoredPath('src/generated/.cache', patterns), true);
  assert.equal(isIgnoredPath('src/generated/keep.ts', patterns), false);
  assert.equal(isIgnoredPath('src/index.ts', patterns), false);
  const dirs = buildDirMatchObjects(buildPathMatchObjects(['node_modules/**']));
  assert.equal(dirs.some(matcher => matcher.match('node_modules')), true);
});
