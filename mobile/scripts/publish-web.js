// Builds the Anwarz PC version and puts it in the website (public/app → northviamarketing.com/app).
//   node scripts/publish-web.js   (in mobile/) then commit and push; Vercel serves it, the installed app updates itself.
// The web build lives under /app (ANWARZ_WEB=1 → experiments.baseUrl in app.config.js) and talks to
// the same website it's served from.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mobile = path.join(__dirname, '..');
const site = path.join(mobile, '..');
const out = path.join(site, 'public', 'app');
const tmp = path.join(site, '.anwarz-web-build'); // outside mobile/: its .gitignore is part of the update fingerprint

fs.rmSync(tmp, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${tmp}"`, {
  cwd: mobile,
  stdio: 'inherit',
  env: { ...process.env, ANWARZ_WEB: '1', EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://www.northviamarketing.com' },
});

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(tmp, out, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });

// Installable app: manifest, service worker (Windows notifications), icons.
for (const f of ['manifest.webmanifest', 'sw.js']) fs.copyFileSync(path.join(mobile, 'web', f), path.join(out, f));
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
const sharp = require(path.join(site, 'node_modules', 'sharp'));
const icon = path.join(mobile, 'assets', 'images', 'icon.png');

(async () => {
  await sharp(icon).resize(192, 192).png().toFile(path.join(out, 'icons', 'icon-192.png'));
  await sharp(icon).resize(512, 512).png().toFile(path.join(out, 'icons', 'icon-512.png'));

  const index = path.join(out, 'index.html');
  const head = [
    '<link rel="manifest" href="/app/manifest.webmanifest">',
    '<meta name="theme-color" content="#274290">',
    '<link rel="apple-touch-icon" href="/app/icons/icon-192.png">',
    '<title>Anwarz</title>',
  ].join('');
  let html = fs.readFileSync(index, 'utf8').replace(/<title>[^<]*<\/title>/, '');
  html = html.replace('</head>', `${head}</head>`);
  fs.writeFileSync(index, html);
  console.log(`\nAnwarz PC version written to ${path.relative(site, out)}. Commit and push to publish it.`);
})();
