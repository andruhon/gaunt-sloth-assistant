import { execSync } from 'node:child_process';

execSync('node integration-tests/setup-config.js ' + process.argv[2], {
  stdio: [process.stdin, process.stdout, process.stderr],
});
const test = process.argv[3] ? ` ${process.argv[3]}` : '';
execSync('vitest run --config vitest-it.config.ts' + test, {
  stdio: [process.stdin, process.stdout, process.stderr],
});
