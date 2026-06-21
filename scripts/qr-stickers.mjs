// Generate printable QR sticker sheet for every asset cart, and verify each
// QR decodes back to its exact tag (so the in-app scanner will recognize it).
// Run:  node scripts/qr-stickers.mjs   →   writes qr-stickers.html + verifies.
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { writeFileSync } from 'node:fs';

// Mirrors src/data/seed.ts buildUnits(). Payload encoded in the QR = `code`.
const TYPE = {
  chair: 'Stacking chairs',
  'table-round': 'Round tables (8-seat)',
  'mic-handheld': 'Handheld mics',
  'mic-lav': 'Lavalier mics',
  projector: 'Projectors',
};
const HOME = {
  's0-space-21': 'Space 21',
  's0-box-14': 'Box 14',
  's0-box-9': 'Box 9 · store',
};

const units = [];
for (let i = 1; i <= 12; i++) {
  const id = String(i).padStart(2, '0');
  const home = i <= 3 ? 's0-space-21' : i === 4 ? 's0-box-14' : 's0-box-9';
  units.push({ code: `PB-CHR-${id}`, type: 'chair', qty: 50, home });
}
units.push(
  { code: 'PB-TBL-01', type: 'table-round', qty: 12, home: 's0-box-9' },
  { code: 'PB-TBL-02', type: 'table-round', qty: 12, home: 's0-box-14' },
  { code: 'PB-MIC-01', type: 'mic-handheld', qty: 8, home: 's0-box-9' },
  { code: 'PB-LAV-01', type: 'mic-lav', qty: 6, home: 's0-space-21' },
  { code: 'PB-PRJ-01', type: 'projector', qty: 4, home: 's0-box-9' },
);

// ── Decode-verify: render QR matrix → RGBA → jsQR → assert round-trip ──
function rgbaFromMatrix(code, scale = 8, quiet = 4) {
  const qr = QRCode.create(code, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const data = qr.modules.data;
  const dim = (n + quiet * 2) * scale;
  const buf = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!data[y * n + x]) continue; // dark module
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = ((y + quiet) * scale + dy) * dim + ((x + quiet) * scale + dx);
          buf[px * 4] = buf[px * 4 + 1] = buf[px * 4 + 2] = 0;
        }
      }
    }
  }
  return { buf, dim };
}

let failures = 0;
for (const u of units) {
  const { buf, dim } = rgbaFromMatrix(u.code);
  const res = jsQR(buf, dim, dim);
  const ok = res && res.data === u.code;
  if (!ok) {
    failures++;
    console.log(`  FAIL ${u.code} → decoded: ${res ? res.data : 'null'}`);
  } else {
    console.log(`  ok   ${u.code}`);
  }
}
console.log(`\nVerified ${units.length - failures}/${units.length} QR codes round-trip correctly.`);

// ── Printable sticker sheet (A4, ~45mm tiles) ─────────────────────────
const tiles = await Promise.all(
  units.map(async (u) => {
    const png = await QRCode.toDataURL(u.code, { margin: 1, width: 320, errorCorrectionLevel: 'M' });
    return `
    <div class="tile">
      <img src="${png}" alt="QR ${u.code}" />
      <div class="code">${u.code}</div>
      <div class="item">${u.qty}× ${TYPE[u.type]}</div>
      <div class="home">home: ${HOME[u.home]}</div>
    </div>`;
  }),
);

const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Theta — asset QR stickers</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 12mm; color: #111; background: #fff; }
  h1 { font-size: 16px; margin: 0 0 2mm; }
  p.sub { font-size: 11px; color: #666; margin: 0 0 6mm; }
  .grid { display: grid; grid-template-columns: repeat(4, 45mm); gap: 4mm; }
  .tile { border: 1px dashed #bbb; border-radius: 3mm; padding: 3mm; text-align: center;
          page-break-inside: avoid; }
  .tile img { width: 32mm; height: 32mm; display: block; margin: 0 auto 1.5mm; }
  .code { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; }
  .item { font-size: 10px; }
  .home { font-size: 9px; color: #777; margin-top: 0.5mm; }
  @media print { body { padding: 8mm; } @page { margin: 8mm; } }
</style></head><body>
  <h1>Theta — asset cart QR stickers</h1>
  <p class="sub">${units.length} tags. Each encodes its plain code (e.g. PB-CHR-01) — scan in the app's Scan asset view to relocate the cart.</p>
  <div class="grid">${tiles.join('')}</div>
</body></html>`;

writeFileSync('qr-stickers.html', html);
console.log('Wrote qr-stickers.html');
