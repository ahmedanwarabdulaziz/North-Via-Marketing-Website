// Generates the notification sounds in assets/sounds (16-bit mono WAV, 44.1 kHz). Each alert type has
// its own sound so it can be told apart without looking. Run: node scripts/make-sounds.js
// Ahmed can still pick any phone sound per type (Settings → Apps → Anwarz → Notifications).

const fs = require('fs');
const path = require('path');

const RATE = 44100;
const out = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(out, { recursive: true });

/** A tone with a soft attack and an exponential fade; harmonics make it sound like a bell. */
function tone(freq, dur, { vol = 0.6, decay = 4, harmonics = [1, 0.35, 0.15], attack = 0.005 } = {}) {
  const n = Math.floor(dur * RATE);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-decay * t);
    let v = 0;
    harmonics.forEach((h, k) => (v += h * Math.sin(2 * Math.PI * freq * (k + 1) * t)));
    s[i] = v * env * vol;
  }
  return s;
}

/** A frequency sweep (for the siren). */
function sweep(f1, f2, dur, vol = 0.55) {
  const n = Math.floor(dur * RATE);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f1 + (f2 - f1) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    phase += (2 * Math.PI * f) / RATE;
    const edge = Math.min(1, i / 400, (n - i) / 400);
    s[i] = (Math.sin(phase) + 0.3 * Math.sin(2 * phase)) * vol * edge;
  }
  return s;
}

const silence = (dur) => new Float32Array(Math.floor(dur * RATE));

/** Places clips at start times (seconds) and mixes them. */
function mix(parts) {
  const end = Math.max(...parts.map(([at, clip]) => Math.floor(at * RATE) + clip.length));
  const s = new Float32Array(end);
  for (const [at, clip] of parts) {
    const o = Math.floor(at * RATE);
    for (let i = 0; i < clip.length; i++) s[o + i] += clip[i];
  }
  const peak = Math.max(...s.map(Math.abs)) || 1;
  if (peak > 0.95) for (let i = 0; i < s.length; i++) s[i] *= 0.95 / peak;
  return s;
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(out, name), Buffer.concat([header, data]));
  console.log(`${name}: ${(samples.length / RATE).toFixed(2)} s`);
}

// 🌐 Site down: urgent rising/falling siren, three cycles.
writeWav('siren.wav', mix([[0, sweep(650, 1150, 0.45)], [0.45, sweep(1150, 650, 0.45)], [0.9, sweep(650, 1150, 0.45)], [1.35, sweep(1150, 650, 0.45)], [1.8, sweep(650, 1150, 0.45)], [2.25, sweep(1150, 650, 0.45)]]));

// ⏰ Task reminder: warm three-note rising chime (C6, E6, G6).
writeWav('chime.wav', mix([[0, tone(1046.5, 1.2, { decay: 3 })], [0.18, tone(1318.5, 1.2, { decay: 3 })], [0.36, tone(1568, 1.5, { decay: 2.5 })]]));

// 🚨 Urgent email: two quick bright dings.
writeWav('ding.wav', mix([[0, tone(1760, 0.6, { decay: 6, vol: 0.55 })], [0.22, tone(1760, 0.9, { decay: 5, vol: 0.55 })]]));

// ⭐ Bad review: falling two-tone alert (attention, not alarm).
writeWav('alert.wav', mix([[0, tone(988, 0.5, { decay: 3, harmonics: [1, 0.5, 0.2] })], [0.28, tone(740, 0.9, { decay: 3, harmonics: [1, 0.5, 0.2] })]]));

// 🛋 JL Comfort order: quick sparkling coin arpeggio.
writeWav('coins.wav', mix([[0, tone(1975.5, 0.35, { decay: 9, vol: 0.45 })], [0.07, tone(2637, 0.4, { decay: 9, vol: 0.45 })], [0.14, tone(3136, 0.5, { decay: 8, vol: 0.4 })], [0.3, tone(2637, 0.6, { decay: 7, vol: 0.35 })]]));

// 🔌 Needs attention: soft low double knock.
writeWav('knock.wav', mix([[0, tone(330, 0.25, { decay: 18, harmonics: [1, 0.6, 0.3, 0.2], vol: 0.8 })], [0.16, tone(330, 0.3, { decay: 16, harmonics: [1, 0.6, 0.3, 0.2], vol: 0.8 })], [0.45, silence(0.05)]]));

// 📉 Ads stopped: falling three-note "drop" (something went down), distinct from the site siren.
writeWav('drop.wav', mix([[0, tone(1318.5, 0.5, { decay: 4, harmonics: [1, 0.45, 0.2] })], [0.2, tone(987.8, 0.5, { decay: 4, harmonics: [1, 0.45, 0.2] })], [0.4, tone(659.3, 1.1, { decay: 2.6, harmonics: [1, 0.45, 0.2] })]]));
