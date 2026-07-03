import fs from 'fs';
import path from 'path';

const filesToCopy = [
  { src: 'manifest.json', dest: 'dist/manifest.json' },
  { src: 'src/popup/popup.html', dest: 'dist/popup.html' },
  { src: 'src/popup/popup.css', dest: 'dist/popup.css' },
  { src: 'src/dashboard/dashboard.html', dest: 'dist/dashboard.html' },
  { src: 'src/dashboard/dashboard.css', dest: 'dist/dashboard.css' },
  { src: 'src/portal/portal.html', dest: 'dist/portal.html' },
  { src: 'src/portal/portal.css', dest: 'dist/portal.css' },
  { src: 'src/shared/process-shim.js', dest: 'dist/process-shim.js' },
  { src: 'icon.png', dest: 'dist/icon.png' }
];

filesToCopy.forEach(({ src, dest }) => {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
});
