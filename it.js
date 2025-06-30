import { execSync } from 'node:child_process';

// Script to launch integration tests

execSync('node integration-tests/setup-config.js ' + process.argv[2], {
  stdio: [process.stdin, process.stdout, process.stderr],
});
try {
  const test = process.argv[3] ? ` ${process.argv[3]}` : '';
  execSync('vitest run --config vitest-it.config.ts' + test, {
    stdio: [process.stdin, process.stdout, process.stderr],
  });
} catch {
  process.exit(1);
}
