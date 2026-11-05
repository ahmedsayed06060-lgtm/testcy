import type { Reporter, TestCase, TestResult, TestError } from '@playwright/test/reporter';

function escapeCommand(value: string) {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
function location(test: TestCase) {
  return `file=frontend/${test.location.file},line=${test.location.line}`;
}
function error(test: TestCase, value: TestError) {
  const message = escapeCommand((value.stack ?? value.message ?? 'Browser test failed').slice(-12000));
  console.log(`::error ${location(test)},title=${escapeCommand(test.title)}::${message}`);
}

class DiagnosticsReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed' || result.retry !== test.retries) return;
    for (const value of result.errors) error(test, value);
    const output = [...result.stdout, ...result.stderr]
      .map((chunk) => chunk.toString())
      .join('\n')
      .trim();
    if (output) {
      console.log(`::notice title=${escapeCommand(`${test.title} browser diagnostics`)}::${escapeCommand(output.slice(-16000))}`);
    }
  }

  onError(value: TestError) {
    const message = escapeCommand((value.stack ?? value.message ?? 'Playwright error').slice(-12000));
    console.log(`::error title=Playwright configuration::${message}`);
  }
}

export default DiagnosticsReporter;
