#!/usr/bin/env node
/* ============================================================
   audit-supabase.mjs — Audit READ-ONLY database Kitabah v2
   ------------------------------------------------------------
   Yang diperiksa:
     1. Daftar tabel + jumlah baris presisi (count server-side, hemat egress)
     2. Tabel kosong / tabel yg tidak bisa diakses
     3. Duplikat pada kombinasi kolom yang seharusnya unik
     4. Relasi yatim (FK menunjuk baris yang sudah tidak ada)
     5. Inkonsistensi antar-tabel & nilai wajib yang kosong

   TIDAK ada operasi tulis (hanya GET). URL + key dibaca dari supabase.js
   supaya tidak ada duplikasi kredensial di repo.

   Pakai:  npm run audit
   Output: ringkasan di terminal + scripts/audit-report.md
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PAGE = 1000; // max-rows server PostgREST project ini = 1000 (lihat komentar di supabase.js)

// ---------- 1. Ambil kredensial dari supabase.js (sumber tunggal) ----------
const sbSrc = fs.readFileSync(path.join(ROOT, 'supabase.js'), 'utf8');
const BASE = sbSrc.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
const KEY = sbSrc.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1];
if (!BASE || !KEY) {
  console.error('Gagal membaca SUPABASE_URL / SUPABASE_ANON_KEY dari supabase.js');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// ---------- 2. Daftar tabel: hasil ekstraksi dari supabase.js + tabel tambahan ----------
const EXTRA_TABLES = ['materi_raport'];
const tables = [...new Set([
  ...[...sbSrc.matchAll(/sbFetch\(\s*[`'"]([a-z_0-9]+)/g)].map(m => m[1]),
  ...EXTRA_TABLES,
])].sort();

// ---------- 3. Helper HTTP ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function req(pathAndQuery, extraHeaders = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/rest/v1/${pathAndQuery}`, { headers: { ...H, ...extraHeaders } });
      const text = await res.text();
      return { ok: res.ok, status: res.status, headers: res.headers, text };
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(700 * attempt);
    }
  }
}

async function json(pathAndQuery, extraHeaders = {}) {
  const r = await req(pathAndQuery, extraHeaders);
  if (!r.ok) {
    const err = new Error(`HTTP ${r.status}: ${r.text.slice(0, 200)}`);
    err.status = r.status;
    err.body = r.text;
    throw err;
  }
  return r.text && r.text.trim() ? JSON.parse(r.text) : [];
}

// Jumlah baris presisi tanpa menarik datanya (Prefer: count=exact + Range 0-0)
async function countRows(table) {
  const r = await req(`${table}?select=*`, { Prefer: 'count=exact', Range: '0-0' });
  if (!r.ok) return { error: `HTTP ${r.status}`, total: null };
  const cr = r.headers.get('content-range') || '';
  const total = Number((cr.split('/')[1] || '').trim());
  return { total: Number.isFinite(total) ? total : null, error: null };
}

// Ambil SEMUA baris untuk kolom tertentu, dipaginasi (order stabil)
async function fetchRows(table, cols, { filter = '', orderBy = null } = {}) {
  const order = orderBy ? `&order=${orderBy}` : '';
  let offset = 0;
  const out = [];
  for (;;) {
    const q = `${table}?select=${cols.join(',')}${filter}${order}`;
    let page;
    try {
      page = await json(q, { Range: `${offset}-${offset + PAGE - 1}`, 'Range-Unit': 'items' });
    } catch (e) {
      if (e.status === 416) break; // range di luar data
      throw e;
    }
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

const empty = [];
const errors = [];
const schema = {};       // table -> kolom[]
const counts = {};       // table -> jumlah baris
const notes = [];        // keterbatasan / hal yang dilewati

console.log(`Audit READ-ONLY • ${tables.length} tabel • ${BASE}\n`);

// ---------- 4. Fase A: skema + jumlah baris ----------
for (const t of tables) {
  const c = await countRows(t);
  if (c.error) {
    errors.push({ table: t, error: c.error });
    continue;
  }
  counts[t] = c.total;
  if (!c.total) { empty.push(t); continue; }
  try {
    const one = await json(`${t}?select=*&limit=1`);
    schema[t] = one.length ? Object.keys(one[0]) : [];
    if (!schema[t].length) notes.push(`Kolom tabel \`${t}\` tidak terbaca (baris pertama kosong).`);
  } catch (e) {
    errors.push({ table: t, error: `skema: ${e.message}` });
  }
}

const accessible = Object.keys(counts).filter(t => counts[t] > 0 && schema[t]?.length);
console.log(`Fase A selesai: ${accessible.length} tabel berisi data, ${empty.length} kosong, ${errors.length} error.`);

// ---------- 5. Fase B: duplikat ----------
// Hanya kombinasi kolom yang secara bisnis seharusnya unik.
const DUP_CHECKS = [
  { table: 'anggota', cols: ['username'], label: 'username anggota' },
  { table: 'desa', cols: ['nama'], label: 'nama desa' },
  { table: 'kelompok', cols: ['desa_id', 'nama'], label: 'nama kelompok dalam satu desa' },
  { table: 'kelas', cols: ['kelompok_id', 'nama_kelas', 'jenjang', 'semester'], label: 'kelas (kelompok+nama+jenjang+semester)' },
  { table: 'santri', cols: ['nama', 'kelas_id'], label: 'nama santri dalam satu kelas' },
  { table: 'pertemuan', cols: ['kelas_id', 'tanggal', 'pertemuan_ke'], label: 'pertemuan (kelas+tanggal+ke-)' },
  { table: 'absensi', cols: ['pertemuan_id', 'santri_id'], label: 'absensi (pertemuan+santri)' },
  { table: 'jurnal', cols: ['pertemuan_id', 'guru_id'], label: 'jurnal (pertemuan+guru)' },
  { table: 'jurnal_materi', cols: ['jurnal_id', 'materi_id'], label: 'jurnal_materi (jurnal+materi)' },
  { table: 'progress', cols: ['kelompok_id', 'materi_id', 'tahun_ajaran', 'bulan'], label: 'progress (kelompok+materi+TA+bulan)' },
  { table: 'raport_nilai', cols: ['santri_id', 'materi_raport_id', 'semester', 'tahun_ajaran'], label: 'raport_nilai (santri+materi+semester+TA)' },
  { table: 'raport_catatan', cols: ['santri_id', 'semester', 'tahun_ajaran'], label: 'raport_catatan (santri+semester+TA)' },
];

const dupResults = [];
for (const chk of DUP_CHECKS) {
  const cols = schema[chk.table];
  if (!cols) continue;                                  // tabel kosong / tidak ada
  const missing = chk.cols.filter(c => !cols.includes(c));
  if (missing.length) { notes.push(`Cek duplikat \`${chk.label}\` dilewati — kolom tidak ada: ${missing.join(', ')}.`); continue; }

  const select = [...new Set(['id', ...chk.cols])].filter(c => cols.includes(c));
  const data = await fetchRows(chk.table, select, { orderBy: cols.includes('id') ? 'id.asc' : `${chk.cols[0]}.asc` });
  const seen = new Map();
  for (const r of data) {
    // Kalau SEMUA kolom kunci bernilai NULL, itu bukan duplikat (cuma sama-sama kosong).
    if (chk.cols.every(c => r[c] === null || r[c] === undefined)) continue;
    const k = chk.cols.map(c => (r[c] === null ? '\u0000NULL' : String(r[c]))).join('\u0001');
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(r.id ?? '(tanpa id)');
  }
  const dups = [...seen.entries()].filter(([, ids]) => ids.length > 1);
  if (dups.length) {
    dupResults.push({
      label: chk.label,
      table: chk.table,
      cols: chk.cols,
      groupCount: dups.length,
      rowCount: dups.reduce((a, [, ids]) => a + ids.length, 0),
      samples: dups.slice(0, 5).map(([k, ids]) => ({
        nilai: k.split('\u0001').map(v => (v === '\u0000NULL' ? 'NULL' : v)).join(' | '),
        jumlah: ids.length,
        ids: ids.slice(0, 4),
      })),
    });
  }
}
console.log(`Fase B selesai: ${dupResults.length} jenis duplikat ditemukan.`);

// ---------- 6. Fase C: relasi yatim (FK -> baris induk yang tidak ada) ----------
// Kolom *_id yang namanya tidak sama dengan nama tabelnya diberi padanan manual di sini.
// Bentuk "tabel.kolom" dipakai kalau kolom yang sama menunjuk ke induk berbeda
// (contoh: pengajian_absensi.pertemuan_id menunjuk ke `pengajian_pertemuan`, bukan `pertemuan`).
const FK_OVERRIDES = {
  'pengajian_absensi.pertemuan_id': 'pengajian_pertemuan',
  'jamaah.pasangan_id': 'jamaah',                 // relasi ke dirinya sendiri (pasangan)
  'jamaah.mtms_id': 'mt_ms',
  'jamaah_keluarga.anak_jamaah_id': 'jamaah',
  'musyawarah_absensi.peserta_id': 'musyawarah_peserta',
  'santri.simpatisan_wali_id': 'simpatisan',
  'simpatisan.keluarga_dari_id': 'jamaah',
  guru_id: 'anggota',
  pembina_id: 'anggota',
  pengurus_id: 'anggota',
  ketua_id: 'anggota',
  penilai_id: 'anggota',
  user_id: 'anggota',
  created_by: 'anggota',
  kelompok_asal_id: 'kelompok',
  desa_asal_id: 'desa',
  materi_raport_id: 'materi_raport',
};

// Tabel log: user_id di sini boleh yatim karena akunnya sudah dihapus
// (log sengaja menyimpan nama_lengkap/role secara denormalisasi agar riwayat tetap terbaca).
const SOFT_ORPHAN_TABLES = new Set(['activity_log', 'user_nav_log', 'chat_messages']);

const idCache = new Map();
async function parentIds(table) {
  if (idCache.has(table)) return idCache.get(table);
  const cols = schema[table];
  let set = new Set();
  if (cols && cols.includes('id')) {
    const data = await fetchRows(table, ['id'], { orderBy: 'id.asc' });
    set = new Set(data.map(r => String(r.id)));
  }
  idCache.set(table, set);
  return set;
}

const orphanResults = [];
const skippedFk = new Set();

for (const t of accessible) {
  const cols = schema[t];
  const fkCols = cols.filter(c => /_id$/.test(c) && c !== 'id');
  for (const col of fkCols) {
    const base = col.replace(/_id$/, '');
    const parent = FK_OVERRIDES[`${t}.${col}`] || FK_OVERRIDES[col] || base;
    if (!schema[parent] || !schema[parent].includes('id')) { skippedFk.add(`${t}.${col}`); continue; }

    // Anak: ambil kolom FK yang tidak null; induk: set id.
    let child;
    try {
      const select = ['id', col].filter(c => cols.includes(c));
      child = await fetchRows(t, select, { filter: `&${col}=not.is.null`, orderBy: cols.includes('id') ? 'id.asc' : null });
    } catch (e) {
      notes.push(`Relasi \`${t}.${col}\` gagal dibaca: ${e.message}`);
      continue;
    }
    if (!child.length) continue;

    const parents = await parentIds(parent);
    const bad = child.filter(r => !parents.has(String(r[col])));
    if (bad.length) {
      const uniqueVals = [...new Set(bad.map(r => String(r[col])))];
      orphanResults.push({
        child: t, column: col, parent,
        soft: SOFT_ORPHAN_TABLES.has(t),
        orphanRows: bad.length,
        distinctMissing: uniqueVals.length,
        samples: uniqueVals.slice(0, 5),
        sampleChildIds: bad.slice(0, 5).map(r => `${r.id ?? '?'} -> ${r[col]}`),
      });
    }
  }
}
console.log(`Fase C selesai: ${orphanResults.length} relasi yatim ditemukan.`);

// ---------- 7. Fase D: inkonsistensi ----------
const inconsistencies = [];

async function countWhere(table, query) {
  const r = await req(`${table}?select=*&${query}`, { Prefer: 'count=exact', Range: '0-0' });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const cr = r.headers.get('content-range') || '';
  const n = Number((cr.split('/')[1] || '').trim());
  return Number.isFinite(n) ? { total: n } : { error: `content-range tidak terbaca: "${cr}"` };
}

// D1. Kolom wajib yang kosong (hanya yang memang ada di skema)
const REQUIRED_COLS = [
  { table: 'santri', col: 'nama' },
  { table: 'santri', col: 'kelas_id' },
  { table: 'kelas', col: 'kelompok_id' },
  { table: 'kelas', col: 'nama_kelas' },
  { table: 'kelompok', col: 'desa_id' },
  { table: 'desa', col: 'nama' },
  { table: 'anggota', col: 'username' },
  { table: 'anggota', col: 'password_hash' },
  { table: 'anggota', col: 'role' },
  { table: 'pertemuan', col: 'kelas_id' },
  { table: 'pertemuan', col: 'tanggal' },
  { table: 'absensi', col: 'status' },
  { table: 'progress', col: 'tahun_ajaran' },
];
for (const item of REQUIRED_COLS) {
  const cols = schema[item.table];
  if (!cols || !cols.includes(item.col)) continue;
  const c = await countWhere(item.table, `${item.col}=is.null`);
  if (c.error) { notes.push(`Cek NULL \`${item.table}.${item.col}\` gagal: ${c.error}`); continue; }
  if (c.total > 0) inconsistencies.push({ jenis: 'nilai wajib kosong (NULL)', detail: `${item.table}.${item.col}`, jumlah: c.total });
}

// D2. Santri berstatus aktif tapi tanpa kelas
if (schema.santri?.includes('aktif') && schema.santri?.includes('kelas_id')) {
  const c = await countWhere('santri', 'aktif=eq.true&kelas_id=is.null');
  if (c.total > 0) inconsistencies.push({ jenis: 'santri aktif tanpa kelas', detail: 'santri.aktif=true & kelas_id NULL', jumlah: c.total });
}

// D3. kelas.desa_id tidak sama dengan desa_id kelompok induknya
if (schema.kelas?.includes('desa_id') && schema.kelas?.includes('kelompok_id') && schema.kelompok?.includes('desa_id')) {
  const kelasRows = await fetchRows('kelas', ['id', 'kelompok_id', 'desa_id'], { orderBy: 'id.asc' });
  const kelRows = await fetchRows('kelompok', ['id', 'desa_id'], { orderBy: 'id.asc' });
  const desaOf = new Map(kelRows.map(k => [String(k.id), k.desa_id]));
  const mismatch = kelasRows.filter(k => k.desa_id && desaOf.has(String(k.kelompok_id)) && String(k.desa_id) !== String(desaOf.get(String(k.kelompok_id))));
  if (mismatch.length) {
    inconsistencies.push({
      jenis: 'desa_id kelas tidak sinkron dengan kelompok',
      detail: 'kelas.desa_id ≠ kelompok.desa_id',
      jumlah: mismatch.length,
      samples: mismatch.slice(0, 5).map(k => `kelas ${k.id}: desa=${k.desa_id}, desa kelompok=${desaOf.get(String(k.kelompok_id))}`),
    });
  }
}

// D4. Akun approved tanpa wilayah (informatif — bisa wajar untuk pengurus pusat)
if (schema.anggota?.includes('status') && schema.anggota?.includes('desa_id')) {
  const c = await countWhere('anggota', 'status=eq.approved&desa_id=is.null');
  if (c.total > 0) inconsistencies.push({ jenis: 'akun approved tanpa desa_id (informatif)', detail: 'perlu dicek manual', jumlah: c.total });
}

// D4b. Khusus role desa/desa_view: tanpa desa_id DAN tanpa kelompok_id = akun tidak punya cakupan
// (di app.js scope-nya `allKelompok.filter(k => k.desa_id === u.desa_id)` -> hasil kosong).
if (schema.anggota?.includes('role') && schema.anggota?.includes('desa_id') && schema.anggota?.includes('kelompok_id')) {
  const c = await countWhere('anggota', 'status=eq.approved&role=in.(desa,desa_view)&desa_id=is.null&kelompok_id=is.null');
  if (c.total > 0) {
    inconsistencies.push({
      jenis: 'akun desa/desa_view tanpa cakupan wilayah',
      detail: 'desa_id & kelompok_id sama-sama NULL → dashboard/scope kosong',
      jumlah: c.total,
    });
  }
}

// D5. Username bentrok jika kapitalisasi diabaikan
if (schema.anggota?.includes('username')) {
  const rowsA = await fetchRows('anggota', ['id', 'username'], { filter: '&username=not.is.null', orderBy: 'id.asc' });
  const byLower = new Map();
  for (const r of rowsA) {
    const k = String(r.username).trim().toLowerCase();
    if (!byLower.has(k)) byLower.set(k, []);
    byLower.get(k).push(String(r.username));
  }
  const klu = [...byLower.entries()].filter(([, v]) => v.length > 1);
  if (klu.length) {
    inconsistencies.push({
      jenis: 'username sama (beda kapitalisasi)',
      detail: 'berpotensi membingungkan saat login',
      jumlah: klu.length,
      samples: klu.slice(0, 5).map(([k, v]) => `${k}: ${v.join(', ')}`),
    });
  }
}

console.log(`Fase D selesai: ${inconsistencies.length} temuan inkonsistensi.`);

// ---------- 8. Tulis laporan ----------
const now = new Date();
const stamp = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
const fmt = n => (n === null || n === undefined ? '—' : n.toLocaleString('id-ID'));

const totalRows = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
const sortedCounts = Object.entries(counts).sort((a, b) => (b[1] || 0) - (a[1] || 0));

const L = [];
L.push('# Laporan Audit Database Kitabah v2');
L.push('');
L.push(`- **Dijalankan**: ${stamp}`);
L.push(`- **Project**: \`${BASE}\``);
L.push('- **Mode**: READ-ONLY (hanya `GET`; tidak ada data yang diubah)');
L.push(`- **Tabel diperiksa**: ${tables.length} • **total baris**: ${fmt(totalRows)}`);
L.push('');
L.push('## Ringkasan temuan');
L.push('');
L.push('| Pemeriksaan | Temuan |');
L.push('| --- | --- |');
L.push(`| Tabel tidak bisa diakses / tidak ada | ${errors.length} |`);
L.push(`| Tabel kosong | ${empty.length} |`);
L.push(`| Jenis duplikat | ${dupResults.length} |`);
L.push(`| Relasi yatim (tabel data) | ${orphanResults.filter(o => !o.soft).length} |`);
L.push(`| Relasi yatim (tabel log — informatif) | ${orphanResults.filter(o => o.soft).length} |`);
L.push(`| Inkonsistensi | ${inconsistencies.length} |`);
L.push('');

L.push('## 1. Jumlah baris per tabel');
L.push('');
L.push('| Tabel | Baris | Kolom |');
L.push('| --- | ---: | ---: |');
for (const [t, n] of sortedCounts) L.push(`| \`${t}\` | ${fmt(n)} | ${schema[t]?.length ?? '—'} |`);
L.push('');

if (errors.length) {
  L.push('## 2. Tabel tidak bisa diakses');
  L.push('');
  for (const e of errors) L.push(`- \`${e.table}\` — ${e.error}`);
  L.push('');
}

if (empty.length) {
  L.push('## 3. Tabel kosong (0 baris)');
  L.push('');
  L.push(empty.map(t => `\`${t}\``).join(', '));
  L.push('');
}

L.push('## 4. Duplikat');
L.push('');
if (!dupResults.length) {
  L.push('Tidak ada duplikat pada kombinasi kolom yang diuji. ✅');
} else {
  for (const d of dupResults) {
    L.push(`### \`${d.table}\` — ${d.label}`);
    L.push(`- ${d.groupCount} grup duplikat, ${d.rowCount} baris terlibat.`);
    L.push('');
    L.push('| Nilai | Jumlah | Contoh id |');
    L.push('| --- | ---: | --- |');
    for (const s of d.samples) L.push(`| ${s.nilai} | ${s.jumlah} | ${s.ids.join(', ')} |`);
    L.push('');
  }
}
L.push('');

L.push('## 5. Relasi yatim (FK menunjuk baris induk yang hilang)');
L.push('');
const hardOrphans = orphanResults.filter(o => !o.soft);
const softOrphans = orphanResults.filter(o => o.soft);

function writeOrphanTable(list) {
  L.push('| Tabel anak | Kolom | Induk | Baris yatim | Nilai hilang (unik) | Contoh nilai |');
  L.push('| --- | --- | --- | ---: | ---: | --- |');
  for (const o of list) {
    L.push(`| \`${o.child}\` | \`${o.column}\` | \`${o.parent}\` | ${fmt(o.orphanRows)} | ${o.distinctMissing} | ${o.samples.join(', ')} |`);
  }
  L.push('');
}

if (!hardOrphans.length) {
  L.push('Tidak ada relasi yatim pada tabel data. ✅');
  L.push('');
} else {
  L.push('### 5a. Perlu tindakan (tabel data)');
  L.push('');
  writeOrphanTable(hardOrphans);
  L.push('Contoh baris (anak -> nilai induk yang tidak ada):');
  L.push('');
  for (const o of hardOrphans) L.push(`- \`${o.child}.${o.column}\`: ${o.sampleChildIds.join('; ')}`);
  L.push('');
}

if (softOrphans.length) {
  L.push('### 5b. Informatif (tabel log)');
  L.push('');
  L.push('Tabel log menyimpan `user_id` + nama/role secara denormalisasi, jadi kalau akun dihapus, baris log lama');
  L.push('tetap valid secara bisnis dan **tidak** perlu diperbaiki (kecuali Anda ingin membersihkan riwayat).');
  L.push('');
  writeOrphanTable(softOrphans);
}
L.push('');

L.push('## 6. Inkonsistensi');
L.push('');
if (!inconsistencies.length) {
  L.push('Tidak ada inkonsistensi pada aturan yang diuji. ✅');
} else {
  L.push('| Jenis | Detail | Jumlah |');
  L.push('| --- | --- | ---: |');
  for (const i of inconsistencies) L.push(`| ${i.jenis} | ${i.detail} | ${fmt(i.jumlah)} |`);
  const withSamples = inconsistencies.filter(i => i.samples?.length);
  if (withSamples.length) {
    L.push('');
    for (const i of withSamples) {
      L.push(`**${i.jenis}**`);
      for (const s of i.samples) L.push(`- ${s}`);
      L.push('');
    }
  }
}
L.push('');
L.push('## 7. Catatan & keterbatasan');
L.push('');
L.push('- Audit memakai **publishable/anon key** dari `supabase.js`, jadi hanya yang lolos policy RLS yang terlihat. Data yang disembunyikan RLS tidak ikut diperiksa.');
L.push('- Skema dibaca dari baris pertama tiap tabel; kalau semua baris bernilai `null` di kolom tertentu, kolom itu tetap terhitung (PostgREST selalu mengembalikan daftar kolom).');
L.push('- `pertemuan` **boleh** punya beberapa baris di tanggal yang sama (ada kolom `pertemuan_ke`; UI menampilkan "ke-N (2× hari itu)"). Karena itu uji duplikatnya memakai `kelas_id + tanggal + pertemuan_ke`.');
L.push('- Tabel log (`activity_log`, `user_nav_log`, `chat_messages`) sengaja menyimpan nama/role denormalisasi agar riwayat tetap terbaca walau akunnya sudah dihapus.');
L.push(`- Relasi FK yang tidak bisa dipetakan otomatis ke tabel induk (${skippedFk.size} kolom) dilewati: ${skippedFk.size ? [...skippedFk].slice(0, 30).join(', ') + (skippedFk.size > 30 ? ', …' : '') : '—'}`);
for (const n of notes) L.push(`- ${n}`);
L.push('');
L.push('---');
L.push('');
L.push('_Dibuat otomatis oleh `scripts/audit-supabase.mjs` (`npm run audit`)._');

const outFile = path.join(HERE, 'audit-report.md');
fs.writeFileSync(outFile, L.join('\n'), 'utf8');

// ---------- 9. Ringkasan terminal ----------
console.log('\n================ RINGKASAN ================');
console.log(`Total baris        : ${fmt(totalRows)} (${tables.length} tabel)`);
console.log(`Tabel kosong       : ${empty.length}${empty.length ? ' -> ' + empty.join(', ') : ''}`);
console.log(`Error akses        : ${errors.length}${errors.length ? ' -> ' + errors.map(e => e.table).join(', ') : ''}`);
console.log(`Jenis duplikat     : ${dupResults.length}`);
console.log(`Relasi yatim (data): ${orphanResults.filter(o => !o.soft).length} | (log, informatif): ${orphanResults.filter(o => o.soft).length}`);
console.log(`Inkonsistensi      : ${inconsistencies.length}`);
for (const o of orphanResults) console.log(`  ! ${o.soft ? '[log] ' : ''}${o.child}.${o.column} -> ${o.parent}: ${o.orphanRows} baris yatim`);
for (const i of inconsistencies) console.log(`  ! ${i.jenis} (${i.detail}): ${i.jumlah}`);
console.log(`\nLaporan lengkap: ${outFile}`);

