import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const commands = Object.freeze({
  install: ['install', '--frozen-lockfile'],
  typecheck: ['typecheck'],
  test: ['test'],
  build: ['export:web'],
  audit: ['audit', '--audit-level=low', '--json'],
});

// Allowlist diagnostics instead of trying to redact arbitrary tool output.
// Never publish paths, source lines, package URLs, environment values, or raw messages.
export function diagnosticsFor(check, log) {
  if (check === 'typecheck') {
    return { typescriptCodes: [...new Set(log.match(/\bTS\d{4,5}\b/g) ?? [])].sort().slice(0, 50) };
  }
  if (check === 'audit') {
    try {
      const counts = JSON.parse(log).metadata?.vulnerabilities ?? {};
      return { vulnerabilities: Object.fromEntries(
        ['info', 'low', 'moderate', 'high', 'critical'].map(level => [
          level, Number.isSafeInteger(counts[level]) && counts[level] >= 0 ? counts[level] : null,
        ]),
      ) };
    } catch { return { auditResponse: 'unavailable' }; }
  }
  return {};
}

export function runCheck(check) {
  if (!Object.hasOwn(commands, check)) throw new Error('Unknown health check');
  const temporary = mkdtempSync(join(tmpdir(), 'puzzleme-health-'));
  const logPath = join(temporary, 'command.log');
  const fd = openSync(logPath, 'w', 0o600);
  let result;
  try {
    result = spawnSync('pnpm', commands[check], {
      stdio: ['ignore', fd, fd], timeout: 10 * 60 * 1000,
      env: { ...process.env, CI: 'true', EXPO_NO_TELEMETRY: '1' },
    });
  } finally { closeSync(fd); }
  try {
    const exitCode = Number.isInteger(result.status) ? result.status : 1;
    const report = {
      check, exitCode, status: exitCode === 0 ? 'success' : 'failure',
      interrupted: Boolean(result.error || result.signal),
      ...diagnosticsFor(check, readFileSync(logPath, 'utf8')),
    };
    mkdirSync('artifacts/health', { recursive: true });
    const safeLog = JSON.stringify(report, null, 2) + '\n';
    writeFileSync(`artifacts/health/${check}.json`, safeLog);
    process.stdout.write(safeLog);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Health: ${check}\n\n\`\`\`json\n${safeLog}\`\`\`\n`);
    return exitCode;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCheck(process.argv[2]);
}
