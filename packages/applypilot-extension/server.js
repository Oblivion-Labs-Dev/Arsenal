import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseResumeIntoDb } from './server/resumeParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8085;
const DB_FILE = path.join(__dirname, 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Seed default schema if db.json doesn't exist
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      profile: {
        firstName: "Jane",
        lastName: "Doe",
        fullName: "Jane Doe",
        email: "jane.doe@example.com",
        phone: "+1 (555) 123-4567",
        location: "San Francisco, CA",
        linkedin: "https://linkedin.com/in/username",
        github: "https://github.com/username",
        portfolio: "https://janedoe.dev",
        workAuthorization: "Yes",
        sponsorship: "No",
        yearsExperience: "5",
        currentTitle: "Software Engineer",
        targetRole: "Senior Engineer",
        salaryExpectations: "$140,000"
      },
      documents: {
        defaultResume: null,
        defaultCoverLetter: null
      },
      applications: [],
      learnedAnswers: [],
      sessions: [],
      fieldMappings: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

initDb();

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function profileNeedsParsing(profile) {
  if (!profile) return true;
  return !profile.email?.trim() || !profile.lastName?.trim() || !profile.phone?.trim();
}

async function autoParseResumeIfNeeded() {
  try {
    const db = readDb();
    if (!db.documents?.defaultResume?.base64) return;
    if (!profileNeedsParsing(db.profile)) return;

    const { profile, extracted } = await parseResumeIntoDb(db);
    db.profile = profile;
    writeDb(db);
    console.log('[ApplyPilot Server] Auto-parsed resume into profile:', Object.keys(extracted).join(', '));
  } catch (err) {
    console.warn('[ApplyPilot Server] Resume auto-parse skipped:', err.message);
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS Headers for Extension scripts
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Endpoints
  if (req.url === '/api/parse-resume' || req.url?.startsWith('/api/parse-resume?')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const options = body ? JSON.parse(body) : {};
          const db = readDb();
          const { profile, extracted, textPreview } = await parseResumeIntoDb(db, {
            force: Boolean(options.force)
          });
          db.profile = profile;
          writeDb(db);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, profile, extracted, textPreview }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (req.url === '/api/db' || req.url?.startsWith('/api/db?')) {
    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to read database file' }));
      }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
    }
    return;
  }

  // Test fixtures (for Playwright e2e)
  if (req.url?.startsWith('/fixtures/')) {
    const fixtureName = path.basename(req.url.split('?')[0].replace('/fixtures/', ''));
    const fixturePath = path.join(FIXTURES_DIR, fixtureName);
    const ext = path.extname(fixturePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.stat(fixturePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        res.end('Fixture not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(fixturePath).pipe(res);
    });
    return;
  }

  // Static File Server
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'dashboard.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath);
  let contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to dashboard.html
      filePath = path.join(DIST_DIR, 'dashboard.html');
      contentType = 'text/html';
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[ApplyPilot Server] Running at http://localhost:${PORT}/`);
  console.log(`[ApplyPilot Server] JSON Database: ${DB_FILE}`);
  console.log(`[ApplyPilot Server] Resume parser: POST http://localhost:${PORT}/api/parse-resume`);
  void autoParseResumeIfNeeded();
});
