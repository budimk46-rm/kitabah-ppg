// LAPORAN DRY-RUN kualitas data — HANYA BACA (GET), tidak ada INSERT/UPDATE/DELETE.
// Dipakai untuk menyiapkan pembersihan data: santri tanpa kelas, nama ganda
// (santri & jamaah), dan anggota tanpa nomor HP.
//
// Jalankan:  npm run audit:data
// Opsi:      node scripts/audit-data-cleanup.cjs --detail   (tampilkan semua baris, tanpa batas 25 grup)
//
// Kenapa baris ganda berbahaya: satu orang terdata 2-3x membuat rekap/absensi/raport
// menghitung dobel, dan kalau salah satunya dihapus sembarangan, riwayat (absensi,
// nilai raport, tautan keluarga) bisa ikut hilang / yatim. Karena itu skrip ini juga
// MENGHITUNG JEJAK REFERENSI tiap baris sebelum ada yang menyentuh data.
const URL_SB = 'https://leastktlugjzupeohqag.supabase.co';
const KEY = 'sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o';
const HDR = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const PAGE = 1000;
const DETAIL = process.argv.includes('--detail');
const BATAS_GRUP = DETAIL ? Infinity : 25;

// Ambil SEMUA baris (PostgREST memotong 1000 baris/permintaan) — paginasi lewat header Range.
async function ambil(path) {
  const semua = [];
  let offset = 0;
  for (;;) {
    const r = await fetch(`${URL_SB}/rest/v1/${path}`, {
      headers: { ...HDR, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} pada ${path}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) break;
    semua.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return semua;
}

// Nama orang: rapikan spasi + huruf kecil, supaya "Aruni  Meisya" == "aruni meisya".
const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const tampil = (s) => String(s || '').length ? String(s) : '-';

function grupkan(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

function hitungReferensi(rows, field) {
  const map = new Map();
  for (const r of rows) {
    const v = r[field];
    if (!v) continue;
    map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

const garis = (c = '=') => c.repeat(72);

(async () => {
  console.log(garis());
  console.log('AUDIT DATA KITABAH-PPG SIDUTA - MODE DRY-RUN (tidak menulis apa pun)');
  console.log(new Date().toLocaleString('id-ID'));
  console.log(garis());

  // ---------- data referensi ----------
  const kelompok = await ambil('kelompok?select=id,nama,desa_id,desa(nama)&order=id');
  const kelas = await ambil('kelas?select=id,kelompok_id,desa_id,nama_kelas,jenjang,semester&order=id');
  const santri = await ambil('santri?select=id,nama,kelas_id,kelompok_asal_id,tingkatan,jenis_kel,tgl_lahir,aktif&aktif=eq.true&order=id');
  // Jamaah diambil SEMUA (aktif + nonaktif) — banyak "nama ganda" ternyata sisa baris
  // nonaktif (sudah soft-delete), jadi itu yang paling aman dibersihkan lebih dulu.
  const jamaahSemua = await ambil('jamaah?select=id,kelompok_id,nama,jenis_kelamin,tgl_lahir,no_hp,keterangan,status_menikah,santri_id,pasangan_id,aktif&order=id');
  const jamaah = jamaahSemua.filter(j => j.aktif !== false);

  const namaKelompok = new Map(kelompok.map(k => [k.id, `${k.nama}${k.desa?.nama ? ' / ' + k.desa.nama : ''}`]));
  const namaKelas = new Map(kelas.map(k => [k.id, k.nama_kelas || `${k.jenjang || '?'} ${k.semester || ''}`.trim()]));
  const klp = (id) => (id ? (namaKelompok.get(id) || `(id ${String(id).slice(0, 8)}...)`) : '(tanpa kelompok)');

  // ---------- 1) SANTRI TANPA KELAS ----------
  const tanpaKelas = santri.filter(s => !s.kelas_id);
  console.log(`\n[1] SANTRI AKTIF TANPA KELAS (kelas_id NULL): ${tanpaKelas.length} dari ${santri.length} santri aktif`);
  if (tanpaKelas.length) {
    const perKelompok = grupkan(tanpaKelas, s => s.kelompok_asal_id || 'TANPA_KELOMPOK');
    [...perKelompok.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([kid, rows]) => {
        console.log(`  ${klp(kid === 'TANPA_KELOMPOK' ? null : kid)}: ${rows.length} santri`);
        rows.slice(0, DETAIL ? Infinity : 6).forEach(s => {
          console.log(`     - ${tampil(s.nama)} | ${tampil(s.jenis_kel)} | tingkatan: ${tampil(s.tingkatan)} | lahir: ${tampil(s.tgl_lahir)}`);
        });
        if (!DETAIL && rows.length > 6) console.log(`     ... dan ${rows.length - 6} lainnya (pakai --detail untuk semua)`);
      });
  }

  // ---------- 2) NAMA SANTRI GANDA ----------
  const grupSantri = grupkan(santri, s => norm(s.nama));
  const dupSantri = [...grupSantri.entries()].filter(([, v]) => v.length > 1);
  const idDupSantri = dupSantri.flatMap(([, v]) => v.map(s => s.id));
  const totalBarisDupSantri = dupSantri.reduce((n, [, v]) => n + v.length, 0);

  console.log(`\n[2] NAMA SANTRI GANDA: ${dupSantri.length} nama, ${totalBarisDupSantri} baris (kelebihan ${totalBarisDupSantri - dupSantri.length} baris)`);
  if (idDupSantri.length) {
    // Jejak referensi: baris mana yang masih dipakai riwayat?
    const refAbsensi = hitungReferensi(await ambil('absensi?select=santri_id&order=santri_id'), 'santri_id');
    const refNilai = hitungReferensi(await ambil('raport_nilai?select=santri_id&order=santri_id'), 'santri_id');
    const refCatatan = hitungReferensi(await ambil('raport_catatan?select=santri_id&order=santri_id'), 'santri_id');
    const refKeluarga = hitungReferensi(await ambil('jamaah_keluarga?select=santri_id&order=santri_id'), 'santri_id');
    const refJamaah = hitungReferensi(jamaah, 'santri_id');

    const cetakGrupSantri = ([, rows], i) => {
      if (i >= BATAS_GRUP) return;
      console.log(`  "${tampil(rows[0].nama)}" x${rows.length}`);
      rows.forEach(s => {
        const jejak = [
          `absensi ${refAbsensi.get(s.id) || 0}`,
          `nilai ${refNilai.get(s.id) || 0}`,
          `catatan ${refCatatan.get(s.id) || 0}`,
          `keluarga ${refKeluarga.get(s.id) || 0}`,
          `ditautkan jamaah ${refJamaah.get(s.id) || 0}`,
        ].join(', ');
        console.log(`     - id ${s.id}`);
        console.log(`       kelas: ${s.kelas_id ? (namaKelas.get(s.kelas_id) || '?') : 'TANPA KELAS'} | kelompok asal: ${klp(s.kelompok_asal_id)} | lahir: ${tampil(s.tgl_lahir)} | ${jejak}`);
      });
    };
    dupSantri.sort((a, b) => b[1].length - a[1].length).forEach(cetakGrupSantri);
    if (dupSantri.length > BATAS_GRUP) console.log(`  ... dan ${dupSantri.length - BATAS_GRUP} nama ganda lain (pakai --detail)`);
    console.log('  PATOKAN AMAN: pertahankan baris dengan jejak referensi TERBANYAK; baris tanpa jejak');
    console.log('  sama sekali (0 absensi/0 nilai/0 tautan) paling aman dihapus lebih dulu.');
  }

  // ---------- 3) NAMA JAMAAH GANDA ----------
  const grupJamaahSemua = grupkan(jamaahSemua, j => norm(j.nama));
  const dupJamaahSemua = [...grupJamaahSemua.entries()].filter(([, v]) => v.length > 1);
  const totalBarisDupSemua = dupJamaahSemua.reduce((n, [, v]) => n + v.length, 0);
  const grupJamaah = grupkan(jamaah, j => norm(j.nama));
  const dupJamaah = [...grupJamaah.entries()].filter(([, v]) => v.length > 1);
  const totalBarisDupJamaah = dupJamaah.reduce((n, [, v]) => n + v.length, 0);
  const idDupJamaah = dupJamaahSemua.flatMap(([, v]) => v.map(j => j.id));

  console.log(`\n[3] NAMA JAMAAH GANDA`);
  console.log(`  semua baris (aktif + nonaktif): ${dupJamaahSemua.length} nama, ${totalBarisDupSemua} baris (kelebihan ${totalBarisDupSemua - dupJamaahSemua.length}) dari ${jamaahSemua.length} baris`);
  console.log(`  hanya yang AKTIF              : ${dupJamaah.length} nama, ${totalBarisDupJamaah} baris (kelebihan ${totalBarisDupJamaah - dupJamaah.length}) dari ${jamaah.length} jamaah aktif`);
  console.log(`  baris NONAKTIF                : ${jamaahSemua.length - jamaah.length} (sudah soft-delete, kandidat hapus permanen paling aman)`);
  if (idDupJamaah.length) {
    const refPengajian = hitungReferensi(await ambil('pengajian_absensi?select=jamaah_id&order=jamaah_id'), 'jamaah_id');
    const refKeluargaJ = hitungReferensi(await ambil('jamaah_keluarga?select=jamaah_id&order=jamaah_id'), 'jamaah_id');
    const refPasangan = hitungReferensi(jamaahSemua, 'pasangan_id');
    const sidikGrup = (rows) => new Set(rows.map(j => `${j.kelompok_id}|${j.tgl_lahir}|${j.no_hp}`)).size === 1;

    const cetakGrupJamaah = ([, rows], i) => {
      if (i >= BATAS_GRUP) return;
      const jmlAktif = rows.filter(j => j.aktif !== false).length;
      console.log(`  "${tampil(rows[0].nama)}" x${rows.length} (aktif ${jmlAktif}, nonaktif ${rows.length - jmlAktif})${sidikGrup(rows) ? '  [SEMUA BARIS IDENTIK - duplikat murni]' : ''}`);
      rows.forEach(j => {
        const jejak = [
          `pengajian ${refPengajian.get(j.id) || 0}`,
          `keluarga ${refKeluargaJ.get(j.id) || 0}`,
          `jadi pasangan ${refPasangan.get(j.id) || 0}`,
        ].join(', ');
        console.log(`     - ${j.aktif === false ? 'NONAKTIF' : 'AKTIF   '} id ${j.id} | ${klp(j.kelompok_id)} | ${tampil(j.jenis_kelamin)} | lahir ${tampil(j.tgl_lahir)} | hp ${tampil(j.no_hp)} | ${jejak}`);
      });
    };
    dupJamaahSemua.sort((a, b) => b[1].length - a[1].length).forEach(cetakGrupJamaah);
    if (dupJamaahSemua.length > BATAS_GRUP) console.log(`  ... dan ${dupJamaahSemua.length - BATAS_GRUP} nama ganda lain (pakai --detail)`);

    const murni = dupJamaahSemua.filter(([, rows]) => sidikGrup(rows));
    console.log(`  Dari ${dupJamaahSemua.length} nama ganda: ${murni.length} grup SEMUA BARISNYA IDENTIK (aman digabung),`);
    console.log(`  ${dupJamaahSemua.length - murni.length} grup BEDA DATA (perlu dicek manusia - bisa jadi orang berbeda / data berubah).`);

    // Kandidat PALING aman dihapus permanen: baris nonaktif, namanya ganda,
    // dan TIDAK punya jejak apa pun (0 absensi pengajian, 0 tautan keluarga, bukan pasangan).
    const kandidat = jamaahSemua.filter(j => {
      if (j.aktif !== false) return false;
      const grup = grupJamaahSemua.get(norm(j.nama));
      if (!grup || grup.length < 2) return false;
      return !refPengajian.get(j.id) && !refKeluargaJ.get(j.id) && !refPasangan.get(j.id);
    });
    console.log(`  KANDIDAT HAPUS PERMANEN (nonaktif + nama ganda + 0 jejak): ${kandidat.length} baris`);
    kandidat.slice(0, DETAIL ? Infinity : 10).forEach(j => console.log(`     - id ${j.id} | ${tampil(j.nama)} | ${klp(j.kelompok_id)} | lahir ${tampil(j.tgl_lahir)}`));
    if (!DETAIL && kandidat.length > 10) console.log(`     ... dan ${kandidat.length - 10} lainnya (pakai --detail)`);
  }

  // ---------- 4) ANGGOTA TANPA NO HP ----------
  // Kolom eksplisit (kolom password_hash sudah dikunci dari anon key sejak Tahap 1).
  const anggota = await ambil('anggota?select=id,username,nama_lengkap,role,status,kelompok_id,desa_id,no_hp&order=username');
  const tanpaHp = anggota.filter(a => !String(a.no_hp || '').trim());
  console.log(`\n[4] ANGGOTA TANPA NOMOR HP: ${tanpaHp.length} dari ${anggota.length} akun`);
  tanpaHp.forEach(a => {
    console.log(`  - ${a.username} | ${tampil(a.nama_lengkap)} | ${tampil(a.role)} | ${tampil(a.status)} | kelompok: ${klp(a.kelompok_id)}`);
  });

  console.log(`\n${garis()}`);
  console.log('RINGKASAN:');
  console.log(`  santri tanpa kelas      : ${tanpaKelas.length}`);
  console.log(`  nama santri ganda       : ${dupSantri.length} nama / ${totalBarisDupSantri} baris`);
  console.log(`  nama jamaah ganda       : ${dupJamaahSemua.length} nama / ${totalBarisDupSemua} baris (semua), ${dupJamaah.length} nama / ${totalBarisDupJamaah} baris (aktif)`);
  console.log(`  jamaah nonaktif         : ${jamaahSemua.length - jamaah.length} baris`);
  console.log(`  anggota tanpa no HP     : ${tanpaHp.length}`);
  console.log('Tidak ada data yang diubah oleh skrip ini (read-only).');
  console.log(garis());
})().catch(e => {
  console.error('\nGAGAL:', e.message);
  process.exit(1);
});
