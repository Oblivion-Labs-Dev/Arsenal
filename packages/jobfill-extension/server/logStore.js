import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'client.jsonl');
const MAX_LINES = 500;

function trimLogFile() {
  if (!fs.existsSync(LOG_FILE)) return;
  const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  if (lines.length <= MAX_LINES) return;
  fs.writeFileSync(LOG_FILE, `${lines.slice(-MAX_LINES).join('\n')}\n`, 'utf-8');
}

export function appendClientLog(entry) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const record = {
    ts: new Date().toISOString(),
    level: 'info',
    ...entry
  };
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(record)}\n`, 'utf-8');
  trimLogFile();
  const level = (record.level || 'info').toUpperCase();
  console.log(`[JobFill ${level}] [${record.source || 'client'}] ${record.message}`);
  if (record.detail && Object.keys(record.detail).length > 0) {
    console.log(`  detail: ${JSON.stringify(record.detail)}`);
  }
}

export function readClientLogs(limit = 100) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  const parsed = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { ts: '', level: 'warn', source: 'server', message: line };
    }
  });
  return parsed.slice(-limit).reverse();
}

export function clearClientLogs() {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }
}

export const CLIENT_LOG_FILE = LOG_FILE;
