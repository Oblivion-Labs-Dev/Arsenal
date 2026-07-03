import os
import json
import mimetypes
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8085
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'db.json')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
FIXTURES_DIR = os.path.join(BASE_DIR, 'fixtures')
LOG_DIR = os.path.join(BASE_DIR, 'logs')
LOG_FILE = os.path.join(LOG_DIR, 'client.jsonl')
MAX_LOG_LINES = 500

# Ensure db.json is initialized
def init_db():
    if not os.path.exists(DB_FILE):
        default_data = {
            "profile": {
                "firstName": "Jane",
                "lastName": "Doe",
                "fullName": "Jane Doe",
                "email": "jane.doe@example.com",
                "phone": "+1 (555) 123-4567",
                "location": "San Francisco, CA",
                "linkedin": "https://linkedin.com/in/username",
                "github": "https://github.com/username",
                "portfolio": "https://janedoe.dev",
                "workAuthorization": "Yes",
                "sponsorship": "No",
                "yearsExperience": "5",
                "currentTitle": "Software Engineer",
                "targetRole": "Senior Engineer",
                "salaryExpectations": "$140,000"
            },
            "documents": {
                "defaultResume": None,
                "defaultCoverLetter": None
            },
            "applications": [],
            "learnedAnswers": [],
            "sessions": [],
            "fieldMappings": []
        }
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, indent=2, ensure_ascii=False)

init_db()

def append_client_log(entry):
    os.makedirs(LOG_DIR, exist_ok=True)
    record = {'ts': datetime.now(timezone.utc).isoformat(), 'level': 'info', **entry}
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(record, ensure_ascii=False) + '\n')
    trim_log_file()
    level = str(record.get('level', 'info')).upper()
    source = record.get('source', 'client')
    print(f"[JobFill {level}] [{source}] {record.get('message', '')}")
    detail = record.get('detail')
    if detail:
        print(f"  detail: {json.dumps(detail, ensure_ascii=False)}")

def trim_log_file():
    if not os.path.isfile(LOG_FILE):
        return
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        lines = [line for line in f.read().splitlines() if line.strip()]
    if len(lines) <= MAX_LOG_LINES:
        return
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines[-MAX_LOG_LINES:]) + '\n')

def read_client_logs(limit=100):
    if not os.path.isfile(LOG_FILE):
        return []
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        lines = [line for line in f.read().splitlines() if line.strip()]
    parsed = []
    for line in lines[-limit:]:
        try:
            parsed.append(json.loads(line))
        except json.JSONDecodeError:
            parsed.append({'ts': '', 'level': 'warn', 'source': 'server', 'message': line})
    parsed.reverse()
    return parsed

def clear_client_logs():
    if os.path.isfile(LOG_FILE):
        os.remove(LOG_FILE)

class JobFillHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # CORS Headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/logs' or self.path.startswith('/api/logs?'):
            try:
                from urllib.parse import urlparse, parse_qs
                query = parse_qs(urlparse(self.path).query)
                limit = int(query.get('limit', ['100'])[0])
            except ValueError:
                limit = 100
            logs = read_client_logs(limit)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'logs': logs, 'file': LOG_FILE}).encode('utf-8'))
            return

        # API Endpoints
        if self.path == '/api/db' or self.path.startswith('/api/db?'):
            try:
                with open(DB_FILE, 'r', encoding='utf-8') as f:
                    data = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(data.encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        # Fixtures server
        if self.path.startswith('/fixtures/'):
            fixture_name = os.path.basename(self.path.split('?')[0])
            fixture_path = os.path.join(FIXTURES_DIR, fixture_name)
            if os.path.isfile(fixture_path):
                mime_type, _ = mimetypes.guess_type(fixture_path)
                self.send_response(200)
                self.send_header('Content-Type', mime_type or 'application/octet-stream')
                self.end_headers()
                with open(fixture_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'Fixture not found')
            return

        # Static File Server
        rel_path = self.path.split('?')[0].lstrip('/')
        if not rel_path or rel_path == '/':
            rel_path = 'dashboard.html'

        file_path = os.path.join(DIST_DIR, rel_path)
        if not os.path.isfile(file_path):
            # Fallback to SPA routing
            file_path = os.path.join(DIST_DIR, 'dashboard.html')

        mime_type, _ = mimetypes.guess_type(file_path)
        self.send_response(200)
        self.send_header('Content-Type', mime_type or 'application/octet-stream')
        self.end_headers()
        with open(file_path, 'rb') as f:
            self.wfile.write(f.read())

    def do_POST(self):
        if self.path == '/api/logs' or self.path.startswith('/api/logs?'):
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
                entry = json.loads(body) if body else {}
                if not entry.get('message'):
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': 'message is required'}).encode('utf-8'))
                    return
                append_client_log(entry)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return

        if self.path == '/api/db' or self.path.startswith('/api/db?'):
            try:
                content_length = int(self.headers['Content-Length'])
                body = self.rfile.read(content_length).decode('utf-8')
                parsed = json.loads(body)
                with open(DB_FILE, 'w', encoding='utf-8') as f:
                    json.dump(parsed, f, indent=2, ensure_ascii=False)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        if self.path == '/api/logs' or self.path.startswith('/api/logs?'):
            clear_client_logs()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
            return
        self.send_response(404)
        self.end_headers()

def run():
    print(f'[JobFill Python Server] Running at http://localhost:{PORT}/')
    print(f'[JobFill Python Server] JSON Database: {DB_FILE}')
    print(f'[JobFill Python Server] Client logs: GET http://localhost:{PORT}/api/logs')
    print(f'[JobFill Python Server] Log file: {LOG_FILE}')
    httpd = HTTPServer(('0.0.0.0', PORT), JobFillHandler)
    httpd.serve_forever()

if __name__ == '__main__':
    run()
