import os
import json
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8085
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'db.json')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
FIXTURES_DIR = os.path.join(BASE_DIR, 'fixtures')

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

class ApplyPilotHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # CORS Headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
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

def run():
    print(f'[ApplyPilot Python Server] Running at http://localhost:{PORT}/')
    print(f'[ApplyPilot Python Server] JSON Database: {DB_FILE}')
    httpd = HTTPServer(('0.0.0.0', PORT), ApplyPilotHandler)
    httpd.serve_forever()

if __name__ == '__main__':
    run()
