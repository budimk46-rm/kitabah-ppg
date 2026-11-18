#!/usr/bin/env node
/* ============================================================
   repair-jamaah-kosong.cjs — pulihkan data dari bug form publik
   ------------------------------------------------------------
   Penyebab: form publik mengirim form_submissions.data sebagai STRING JSON
   (JSON.stringify) padahal kolomnya jsonb → tersimpan double-encode. Saat PJP
   klik "Setujui", field terbaca undefined sehingga yang masuk ke tabel jamaah
   adalah baris KOSONG (nama '' + semua kolom null).

   Yang dilakukan skrip ini:
     1. Cari baris `jamaah` yang benar-benar kosong.
     2. Pasangkan dengan submission `approved` yang reviewed_at-nya berdekatan
        (beda <= 3 detik) dengan created_at baris kosong tsb di kelompok yang sama.
     3. Cek dulu apakah baris itu sudah dipakai (tautan keluarga / absensi) —
        kalau ada jejak, baris DILEWATI (tidak dihapus).
     4. Dengan --apply: submission dikembalikan ke status 'pending' (muncul lagi di
        "Menunggu Persetujuan" dengan data yang benar setelah app diperbaiki), lalu
        baris jamaah kosong DIHAPUS.

   Default DRY-RUN (hanya baca, tidak menulis apa pun).

   Pakai:  node scripts/repair-jamaah-kosong.cjs
           node scripts/repair-jamaah-kosong.cjs --apply
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
const TOLERANSI_MS = 3000;

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

// Data submission bisa objek (normal) atau string JSON (data lama double-encode).
function bacaData(raw) {
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return (p && typeof p === 'object') ? p : {}; } catch { return {}; }
  }
  return (raw && typeof raw === 'object') ? raw : {};
}

const selisihDetik = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000;
const garis = (c = '=') => c.repeat(78);
const jam = (s) => (s ? new Date(s).toISOString().replace('T', ' ').slice(0, 19) + 'Z' : '-');

(async () => {
  console.log(garis());
  console.log('PERBAIKAN BARIS JAMAAH KOSONG (akibat form publik ter-double-encode)');
  console.log(APPLY ? 'MODE  : APPLY — data akan DIUBAH' : 'MODE  : DRY-RUN — tidak menulis apa pun');
  console.log('WAKTU :', new Date().toLocaleString('id-ID'));
  console.log(garis());

  const kosong = await ambil(
    'jamaah?nama=eq.&jenis_kelamin=is.null&tgl_lahir=is.null&status_menikah=is.null&no_hp=is.null&keterangan=is.null' +
    '&select=id,kelompok_id,nama,created_at&order=created_at.asc'
  );
  if (!kosong.length) {
    console.log('Tidak ada baris jamaah kosong. Tidak ada yang perlu diperbaiki.');
    return;
  }
  console.log(`Baris jamaah kosong ditemukan: ${kosong.length}`);

  const subs = await ambil(
    'form_submissions?jenis=eq.jamaah&status=eq.approved&select=id,kelompok_id,status,created_at,reviewed_at,data'
  );

  const dipakai = new Set();
  const rencana = [];
  for (const row of kosong) {
    const kandidat = subs
      .filter(s => s.reviewed_at && s.kelompok_id === row.kelompok_id && !dipakai.has(s.id))
      .map(s => ({ sub: s, beda: selisihDetik(s.reviewed_at, row.created_at) }))
      .filter(x => x.beda * 1000 <= TOLERANSI_MS)
      .sort((a, b) => a.beda - b.beda)[0];
    if (kandidat) dipakai.add(kandidat.sub.id);
    rencana.push({ row, sub: kandidat ? kandidat.sub : null, data: kandidat ? bacaData(kandidat.sub.data) : {} });
  }

  console.log(garis('-'));
  let no = 0;
  for (const r of rencana) {
    no++;
    console.log(`${no}. ${r.row.kelompok_id} | baris ${r.row.id} | dibuat ${jam(r.row.created_at)}`);
    console.log(r.sub
      ? `   └ submission ${r.sub.id} (approved ${jam(r.sub.reviewed_at)}) → "${r.data.nama || '-'}"`
      : '   └ TIDAK ada submission yang cocok — baris ini DILEWATI (cek manual)');
  }
  console.log(garis('-'));

  // Baris kosong yang sudah dipakai (tautan keluarga / absensi) jangan dihapus.
  const layak = [];
  for (const r of rencana) {
    if (!r.sub) continue;
    const [keluarga, absensi] = await Promise.all([
      ambil(`jamaah_keluarga?or=(jamaah_id.eq.${r.row.id},anak_jamaah_id.eq.${r.row.id})&select=id`),
      ambil(`pengajian_absensi?jamaah_id=eq.${r.row.id}&select=id`),
    ]);
    const jejak = (keluarga?.length || 0) + (absensi?.length || 0);
    if (jejak) {
      console.log(`! DILEWATI ${r.row.id}: sudah punya ${jejak} referensi (keluarga/absensi).`);
      continue;
    }
    layak.push(r);
  }

  if (!APPLY) {
    console.log(`\nRencana: ${layak.length} baris kosong dihapus + submission-nya dikembalikan ke 'pending'.`);
    console.log('Jalankan ulang dengan --apply untuk mengeksekusi.');
    return;
  }

  let ubah = 0, hapus = 0, gagal = 0;
  for (const r of layak) {
    try {
      await kirim('PATCH', `form_submissions?id=eq.${r.sub.id}`, { status: 'pending', reviewed_at: null, reviewed_by: null });
      ubah++;
      await kirim('DELETE', `jamaah?id=eq.${r.row.id}`);
      hapus++;
      console.log(`OK ${r.row.kelompok_id}: baris kosong ${r.row.id} dihapus, submission ${r.sub.id} -> pending ("${r.data.nama || '-'}")`);
    } catch (e) {
      gagal++;
      console.log(`GAGAL ${r.row.id}: ${e.message}`);
    }
  }
  console.log(garis());
  console.log(`SELESAI - submission dikembalikan ke pending: ${ubah}, baris kosong dihapus: ${hapus}, gagal: ${gagal}`);
  console.log('Langkah berikutnya: buka menu Data Jamaah tiap kelompok tsb, lalu Setujui / Tolak');
  console.log('data yang muncul lagi di kartu "Menunggu Persetujuan" (nama sudah tampil benar).');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

