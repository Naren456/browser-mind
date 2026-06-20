import fs from 'fs';
import path from 'path';

export class Logger {
  private logPath: string;
  private logs: any[] = [];

  constructor(runId: string) {
    const logsDir = path.resolve(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logPath = path.join(logsDir, `${runId}.json`);
  }

  logStep(stepData: any) {
    this.logs.push(stepData);
    fs.writeFileSync(this.logPath, JSON.stringify(this.logs, null, 2), 'utf8');
    
    // Human-readable dev console logging
    console.log(`\x1b[36m[Step ${stepData.step}]\x1b[0m ${stepData.tool} ${stepData.args ? JSON.stringify(stepData.args) : ''}`);
  }

  logInfo(message: string, meta?: any) {
    console.log(`\x1b[32m[INFO]\x1b[0m ${message}`, meta || '');
  }

  logError(message: string, error: any) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, error);
  }
}
