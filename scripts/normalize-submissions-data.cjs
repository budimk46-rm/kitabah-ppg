#!/usr/bin/env node
/* ============================================================
   normalize-submissions-data.cjs — rapikan form_submissions.data
   ------------------------------------------------------------
   Bug lama: form publik mengirim `data` sebagai STRING JSON padahal kolomnya
   jsonb, sehingga tersimpan double-encode. Aplikasi versi baru sudah bisa
   membaca data seperti ini (normalizeSubmissionData), TAPI perangkat yang
   masih memakai app.min.js versi lama dari cache akan menyetujui data tsb
   dan menghasilkan baris KOSONG.

   Skrip ini mengubah `data` yang masih berupa string menjadi objek JSON
   sebenarnya di database. Isi data tidak diubah sama sekali — hanya bentuk
   penyimpanannya — sehingga aman dibaca app versi lama maupun baru.

   Default DRY-RUN (hanya baca).

   Pakai:  node scripts/normalize-submissions-data.cjs
           node scripts/normalize-submissions-data.cjs --apply
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'supabase.js'), 'utf8');
const URL_SB = SRC.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
const KEY = SRC.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1];
if (!URL_SB || !KEY) {
  console.error('Gagal membaca SUPABASE_URL / SUPABASE_ANON_KEY dari supabase.js');
  process.exit(1);
}
const HDR = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const PAGE = 1000;
const APPLY = process.argv.includes('--apply');
const garis = (c = '=') => c.repeat(78);

async function ambil(pathAndQuery) {
  const semua = [];
  let offset = 0;
  for (;;) {
    const r = await fetch(`${URL_SB}/rest/v1/${pathAndQuery}`, {
      headers: { ...HDR, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} pada ${pathAndQuery}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) break;
    semua.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return semua;
}

async function kirim(method, pathAndQuery, body) {
  const r = await fetch(`${URL_SB}/rest/v1/${pathAndQuery}`, {
    method,
    headers: { ...HDR, Prefer: 'return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} pada ${method} ${pathAndQuery}: ${(await r.text()).slice(0, 300)}`);
}

// String JSON bisa saja ter-encode lebih dari sekali → parse berulang sampai objek.
function keObjek(raw) {
  let v = raw;
  for (let i = 0; i < 5 && typeof v === 'string'; i++) {
    try { v = JSON.parse(v); } catch { return { ok: false }; }
  }
  return (v && typeof v === 'object' && !Array.isArray(v)) ? { ok: true, obj: v } : { ok: false };
}

(async () => {
  console.log(garis());
  console.log('NORMALISASI form_submissions.data (string JSON -> objek jsonb)');
  console.log(APPLY ? 'MODE  : APPLY — data akan DIPERBARUI' : 'MODE  : DRY-RUN — tidak menulis apa pun');
  console.log('WAKTU :', new Date().toLocaleString('id-ID'));
  console.log(garis());

  const semua = await ambil('form_submissions?select=id,jenis,status,kelompok_id,created_at,data&order=created_at.asc');
  console.log(`Total form_submissions: ${semua.length}`);

  const perlu = [];
  const rusak = [];
  for (const s of semua) {
    if (typeof s.data !== 'string') continue;
    const hasil = keObjek(s.data);
    if (hasil.ok) perlu.push({ sub: s, obj: hasil.obj });
    else rusak.push(s);
  }

  console.log(`Perlu dinormalisasi (data masih string): ${perlu.length}`);
  for (const p of perlu) {
    const s = p.sub;
    console.log(`  ${s.kelompok_id || '-'} | ${s.jenis}/${s.status} | ${String(s.created_at).slice(0, 10)} | ${s.id} -> "${p.obj.nama || p.obj.nama_lengkap || '-'}"`);
  }
  if (rusak.length) {
    console.log(`\n! Tidak bisa di-parse (dilewati, cek manual): ${rusak.length}`);
    rusak.forEach(s => console.log(`  ${s.id} (${s.jenis}/${s.status})`));
  }

  if (!perlu.length) { console.log('\nTidak ada yang perlu diperbaiki.'); return; }
  if (!APPLY) { console.log('\nJalankan ulang dengan --apply untuk mengeksekusi.'); return; }

  let ok = 0, gagal = 0;
  for (const p of perlu) {
    try {
      await kirim('PATCH', `form_submissions?id=eq.${p.sub.id}`, { data: p.obj });
      ok++;
    } catch (e) {
      gagal++;
      console.log(`GAGAL ${p.sub.id}: ${e.message}`);
    }
  }
  console.log(garis());
  console.log(`SELESAI — diperbarui: ${ok}, gagal: ${gagal}, dilewati: ${rusak.length}`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

