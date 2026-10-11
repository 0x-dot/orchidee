// Legge src/i18n/traduzioni.csv (key,it,en) e genera src/app/i18n.generated.ts.
// Accetta virgola o punto e virgola come separatore (Excel italiano salva spesso con ';').
// Fallisce con un messaggio chiaro se manca una traduzione o i segnaposto {x} non coincidono.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = join(root, 'src/i18n/traduzioni.csv');
const outPath = join(root, 'src/app/i18n.generated.ts');

function parseCsv(text, delim) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some(x => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some(x => x.trim() !== '')) rows.push(row);
  return rows;
}

let text = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const header = text.split(/\r?\n/, 1)[0];
const delim = header.includes(';') && !header.includes(',') ? ';' : ',';
const rows = parseCsv(text, delim);
const [h, ...data] = rows;
const iKey = h.findIndex(x => x.trim().toLowerCase() === 'key');
const iIt = h.findIndex(x => x.trim().toLowerCase() === 'it');
const iEn = h.findIndex(x => x.trim().toLowerCase() === 'en');
if ([iKey, iIt, iEn].includes(-1)) { console.error('i18n: la prima riga deve essere: key,it,en'); process.exit(1); }

const it = {}, en = {}, errors = [];
const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(',');
data.forEach((r, n) => {
  const key = (r[iKey] ?? '').trim();
  if (!key) return;
  const line = n + 2;
  if (key in it) errors.push(`riga ${line}: chiave duplicata "${key}"`);
  const a = r[iIt] ?? '', b = r[iEn] ?? '';
  if (!a.trim()) errors.push(`riga ${line}: "${key}" senza traduzione italiana`);
  if (!b.trim()) errors.push(`riga ${line}: "${key}" senza traduzione inglese`);
  if (ph(a) !== ph(b)) errors.push(`riga ${line}: "${key}" segnaposto diversi tra le lingue (${ph(a) || '-'} / ${ph(b) || '-'})`);
  it[key] = a; en[key] = b;
});

// Controllo statico: ogni chiave usata nei template/componenti esiste nel CSV
function walk(d) { return readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
const usage = /['"`]([a-z][A-Za-z]*(?:\.[A-Za-z]+)+|footer)['"`]\s*\|\s*t\b|\bt\(\s*['"`]([a-z][A-Za-z]*(?:\.[A-Za-z]+)+|footer)['"`]/g;
for (const f of walk(join(root, 'src/app')).filter(p => /\.(ts|html)$/.test(p) && !p.endsWith('generated.ts'))) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(usage)) {
    const k = m[1] || m[2];
    if (!(k in it)) errors.push(`${f.replace(root + '/', '')}: chiave "${k}" non presente nel CSV`);
  }
}

if (errors.length) { console.error('i18n: errori nelle traduzioni:\n - ' + errors.join('\n - ')); process.exit(1); }

writeFileSync(outPath,
`// GENERATO da scripts/build-i18n.mjs a partire da src/i18n/traduzioni.csv: non modificare a mano.
export const TRANSLATIONS: Record<'it' | 'en', Record<string, string>> = ${JSON.stringify({ it, en }, null, 2)};
`);
console.log(`i18n: ${Object.keys(it).length} chiavi → src/app/i18n.generated.ts`);
