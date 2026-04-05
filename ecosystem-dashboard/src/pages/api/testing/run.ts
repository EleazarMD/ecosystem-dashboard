import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Define a whitelist of allowed test suites to prevent arbitrary command execution
const ALLOWED_TEST_SUITES: { [key: string]: { path: string; command: string; args: string[] } } = {
  'ahis-server-ts': {
    path: path.resolve(process.cwd(), '../../../core/orchestrator/libs/ahis-server-ts'),
    command: 'npm',
    args: ['run', 'test:report'],
  },
  // Add other test suites here as needed, e.g.:
  // 'ahis-client-ts': {
  //   path: path.resolve(process.cwd(), '../../../core/orchestrator/libs/ahis-client-ts'),
  //   command: 'npm',
  //   args: ['test'],
  // },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { suite } = req.body;

  if (!suite || typeof suite !== 'string' || !ALLOWED_TEST_SUITES[suite]) {
    return res.status(400).json({ error: 'Invalid or unsupported test suite specified.' });
  }

  const testConfig = ALLOWED_TEST_SUITES[suite];

  // Set headers for streaming the response
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush headers to start sending data immediately

  res.write(`--- Starting test suite: ${suite} ---\n\n`);

  const child = spawn(testConfig.command, testConfig.args, {
    cwd: testConfig.path,
    stdio: ['pipe', 'pipe', 'pipe'], // pipe stdout and stderr
    shell: true, // Use shell to handle npm command correctly on different OS
  });

  // Stream stdout
  child.stdout.on('data', (data) => {
    res.write(data);
  });

  // Stream stderr
  child.stderr.on('data', (data) => {
    res.write(data);
  });

  // Handle process exit
  child.on('close', (code) => {
    res.write(`\n--- Test suite '${suite}' finished with exit code ${code} ---\n`);

    // Read and stream the JSON report if it exists
    const reportPath = path.join(testConfig.path, 'test-results.json');
    try {
      if (fs.existsSync(reportPath)) {
        const reportContent = fs.readFileSync(reportPath, 'utf8');
        res.write(`\n---JEST_REPORT_START---${reportContent}---JEST_REPORT_END---\n`);
        // Clean up the file after sending
        fs.unlinkSync(reportPath);
      } else {
        res.write(`\n--- WARNING: Test report file not found. It might indicate an issue with the test script itself. ---\n`);
      }
    } catch (err: any) {
      res.write(`\n--- ERROR: Failed to read or clean up test report: ${err.message} ---\n`);
    }

    res.end();
  });

  // Handle errors in spawning the process
  child.on('error', (err) => {
    console.error(`Failed to start test suite '${suite}':`, err);
    res.write(`\n--- ERROR: Failed to start test suite. Check server logs. ---\n`);
    res.end();
  });

  // Ensure the connection is closed if the client disconnects
  req.on('close', () => {
    child.kill(); // Kill the child process if the client aborts the request
    res.end();
  });
}
