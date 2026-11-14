// EXPORT EXCEL untuk KONFIRMASI pembersihan data per kelompok — HANYA BACA (GET).
// Tidak ada INSERT/UPDATE/DELETE ke database. File .xlsx yang dihasilkan dipakai
// koordinator kelompok untuk mencentang "hapus / tahan" sebelum ada yang dihapus.
//
// Jalankan:  npm run export:konfirmasi
// Hasil   :  Konfirmasi_Pembersihan_Data_<tanggal>.xlsx di folder aplikasi
const path = require('path');
const ExcelJS = require('exceljs');

const URL_SB = 'https://leastktlugjzupeohqag.supabase.co';
const KEY = 'sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o';
const HDR = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const PAGE = 1000;

// PostgREST memotong 1000 baris/permintaan -> paginasi lewat header Range.
async function ambil(p) {
  const semua = [];
  let offset = 0;
  for (;;) {
    const r = await fetch(`${URL_SB}/rest/v1/${p}`, {
      headers: { ...HDR, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} pada ${p}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) break;
    semua.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return semua;
}

const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const teks = (s) => String(s == null ? '' : s).trim();

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

// ---------- gaya tampilan ----------
const BIRU = 'FF1F4E79';
const HIJAU = 'FFC6EFCE';
const MERAH = 'FFFFC7CE';
const KUNING = 'FFFFEB9C';

function buatSheet(wb, nama, kolom) {
  const ws = wb.addWorksheet(nama, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = kolom.map(k => ({ header: k.header, key: k.key, width: k.width || 18 }));
  const head = ws.getRow(1);
  head.height = 30;
  head.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU } };
  head.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: kolom.length } };
  return ws;
}

function dropdown(ws, kolomIndex, dariBaris, sampaiBaris, pilihan) {
  const formulae = [`"${pilihan.join(',')}"`];
  for (let r = dariBaris; r <= sampaiBaris; r++) {
    ws.getCell(r, kolomIndex).dataValidation = {
      type: 'list', allowBlank: true, formulae,
      showErrorMessage: true, errorTitle: 'Pilih dari daftar', error: 'Gunakan pilihan yang tersedia di panah bawah.',
    };
  }
}

function warnai(sel, argb) {
  sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// ---------- mulai ----------
(async () => {
  console.log('Mengambil data dari Supabase (read-only)...');
  const kelompok = await ambil('kelompok?select=id,nama,desa_id,desa(nama)&order=id');
  const kelas = await ambil('kelas?select=id,kelompok_id,nama_kelas,jenjang,semester&order=id');
  const santri = await ambil('santri?select=id,nama,kelas_id,kelompok_asal_id,tingkatan,jenis_kel,tgl_lahir,aktif&aktif=eq.true&order=id');
  const jamaahSemua = await ambil('jamaah?select=id,kelompok_id,nama,jenis_kelamin,tgl_lahir,no_hp,keterangan,status_menikah,santri_id,pasangan_id,aktif&order=id');
  const jamaahAktif = jamaahSemua.filter(j => j.aktif !== false);
  const anggota = await ambil('anggota?select=id,username,nama_lengkap,role,status,kelompok_id,desa_id,no_hp&order=username');

  const namaKelompok = new Map(kelompok.map(k => [k.id, teks(k.nama)]));
  const desaKelompok = new Map(kelompok.map(k => [k.id, teks(k.desa && k.desa.nama)]));
  const namaKelas = new Map(kelas.map(k => [k.id, teks(k.nama_kelas) || `${teks(k.jenjang)} ${teks(k.semester)}`.trim()]));
  const klp = (id) => (id ? (namaKelompok.get(id) || `(id ${String(id).slice(0, 8)}...)`) : '(tanpa kelompok)');
  const desa = (id) => (id ? (desaKelompok.get(id) || '') : '');
  // Daftar kelas yang tersedia di tiap kelompok (saran pengisian kelas_id).
  const kelasPerKelompok = new Map();
  for (const k of kelas) {
    if (!k.kelompok_id) continue;
    if (!kelasPerKelompok.has(k.kelompok_id)) kelasPerKelompok.set(k.kelompok_id, []);
    kelasPerKelompok.get(k.kelompok_id).push(teks(k.nama_kelas));
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kitabah PPG Siduta';
  wb.created = new Date();

  // ---------- kumpulan temuan ----------
  const tanpaKelas = santri.filter(s => !s.kelas_id)
    .sort((a, b) => (klp(a.kelompok_asal_id) + norm(a.nama)).localeCompare(klp(b.kelompok_asal_id) + norm(b.nama)));

  const grupSantri = grupkan(santri, s => norm(s.nama));
  const dupSantri = [...grupSantri.entries()].filter(([, v]) => v.length > 1);
  const grupJamaahSemua = grupkan(jamaahSemua, j => norm(j.nama));
  const dupJamaahSemua = [...grupJamaahSemua.entries()].filter(([, v]) => v.length > 1);
  const grupJamaahAktif = grupkan(jamaahAktif, j => norm(j.nama));
  const dupJamaahAktif = [...grupJamaahAktif.entries()].filter(([, v]) => v.length > 1);
  const tanpaHp = anggota.filter(a => !teks(a.no_hp));

  // jejak referensi (dipakai untuk menentukan baris mana yang harus DIPERTAHANKAN)
  const refAbsensi = hitungReferensi(await ambil('absensi?select=santri_id&order=santri_id'), 'santri_id');
  const refNilai = hitungReferensi(await ambil('raport_nilai?select=santri_id&order=santri_id'), 'santri_id');
  const refCatatan = hitungReferensi(await ambil('raport_catatan?select=santri_id&order=santri_id'), 'santri_id');
  const refKeluargaSantri = hitungReferensi(await ambil('jamaah_keluarga?select=santri_id&order=santri_id'), 'santri_id');
  const refJamaahDariSantri = hitungReferensi(jamaahSemua, 'santri_id');
  const refPengajian = hitungReferensi(await ambil('pengajian_absensi?select=jamaah_id&order=jamaah_id'), 'jamaah_id');
  const refKeluargaJamaah = hitungReferensi(await ambil('jamaah_keluarga?select=jamaah_id&order=jamaah_id'), 'jamaah_id');
  const refPasangan = hitungReferensi(jamaahSemua, 'pasangan_id');

  const jejakSantri = (id) => ({
    absensi: refAbsensi.get(id) || 0,
    nilai: refNilai.get(id) || 0,
    catatan: refCatatan.get(id) || 0,
    keluarga: refKeluargaSantri.get(id) || 0,
    jamaah: refJamaahDariSantri.get(id) || 0,
  });
  const totalJejakSantri = (id) => {
    const j = jejakSantri(id);
    return j.absensi + j.nilai + j.catatan + j.keluarga + j.jamaah;
  };
  const jejakJamaah = (id) => ({
    pengajian: refPengajian.get(id) || 0,
    keluarga: refKeluargaJamaah.get(id) || 0,
    pasangan: refPasangan.get(id) || 0,
  });
  const totalJejakJamaah = (id) => {
    const j = jejakJamaah(id);
    return j.pengajian + j.keluarga + j.pasangan;
  };

  // Jamaah nonaktif + namanya ganda + tidak punya jejak apa pun = kandidat paling aman.
  const kandidatHapus = jamaahSemua.filter(j => {
    if (j.aktif !== false) return false;
    const grup = grupJamaahSemua.get(norm(j.nama));
    if (!grup || grup.length < 2) return false;
    return totalJejakJamaah(j.id) === 0;
  }).sort((a, b) => (klp(a.kelompok_id) + norm(a.nama)).localeCompare(klp(b.kelompok_id) + norm(b.nama)));

  console.log(`  santri tanpa kelas : ${tanpaKelas.length}`);
  console.log(`  nama santri ganda  : ${dupSantri.length} nama / ${dupSantri.reduce((n, [, v]) => n + v.length, 0)} baris`);
  console.log(`  hapus jamaah       : ${kandidatHapus.length} kandidat`);
  console.log(`  jamaah ganda aktif : ${dupJamaahAktif.length} nama`);
  console.log(`  anggota tanpa HP   : ${tanpaHp.length}`);

  // ---------- SHEET: RINGKASAN ----------
  const wsR = wb.addWorksheet('Ringkasan');
  wsR.columns = [{ width: 5 }, { width: 42 }, { width: 20 }, { width: 20 }, { width: 24 }, { width: 40 }];
  const judul = wsR.addRow(['KONFIRMASI PEMBERSIHAN DATA - KITABAH PPG SIDUTA']);
  wsR.mergeCells('A1:F1');
  judul.height = 32;
  judul.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
  warnai(judul.getCell(1), BIRU);
  judul.alignment = { vertical: 'middle', horizontal: 'center' };

  const sub = wsR.addRow([`Dibuat: ${new Date().toLocaleString('id-ID')}  |  Sumber: database Kitabah (read-only, belum ada yang dihapus)`]);
  wsR.mergeCells('A2:F2');
  sub.font = { italic: true, size: 10 };
  sub.alignment = { horizontal: 'center' };

  wsR.addRow([]);
  const hR = wsR.addRow(['No', 'Jenis temuan', 'Jumlah', 'Tindakan', 'Lembar', 'Catatan']);
  hR.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hR.eachCell(c => warnai(c, BIRU));
  hR.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const ringkasan = [
    [1, 'Santri aktif tanpa kelas', `${tanpaKelas.length} santri`, 'Tentukan kelasnya', '1. Santri Tanpa Kelas', 'Bukan dihapus - hanya belum masuk kelas, jadi tidak muncul di absensi/raport.'],
    [2, 'Nama santri ganda (1 orang >1 baris)', `${dupSantri.length} nama / ${dupSantri.reduce((n, [, v]) => n + v.length, 0)} baris`, 'Pilih 1 baris disimpan', '2. Nama Santri Ganda', 'Baris dengan jejak terbanyak disarankan DIPERTAHANKAN.'],
    [3, 'Jamaah nonaktif yang aman dihapus permanen', `${kandidatHapus.length} baris`, 'Hapus permanen', '3. Hapus Jamaah Nonaktif', 'Sudah nonaktif + nama ganda + 0 jejak (tidak dipakai riwayat apa pun).'],
    [4, 'Nama jamaah ganda yang masih aktif', `${dupJamaahAktif.length} nama / ${dupJamaahAktif.reduce((n, [, v]) => n + v.length, 0)} baris`, 'Perlu dicek manusia', '4. Jamaah Ganda Aktif', 'Bisa jadi orang berbeda atau data ganda. Jangan hapus sebelum dikonfirmasi.'],
    [5, 'Anggota (akun login) tanpa nomor HP', `${tanpaHp.length} akun`, 'Isi nomor HP', '5. Anggota Tanpa No HP', 'Hanya pelengkap data kontak, tidak ada yang dihapus.'],
  ];
  for (const r of ringkasan) {
    const row = wsR.addRow(r);
    row.alignment = { vertical: 'top', wrapText: true };
    row.height = 34;
  }

  wsR.addRow([]);
  const hCara = wsR.addRow(['CARA PAKAI FILE INI']);
  wsR.mergeCells(`A${hCara.number}:F${hCara.number}`);
  hCara.font = { bold: true, size: 12 };
  warnai(hCara.getCell(1), KUNING);
  const cara = [
    '1. Lembar "Per Kelompok" = rekap jumlah temuan tiap kelompok, boleh dicetak/dikirim ke koordinator masing-masing.',
    '2. Tiap lembar temuan sudah diurutkan per kelompok, jadi satu kelompok bisa difilter (panah filter di judul kolom).',
    '3. Kolom "Konfirmasi" sudah berupa pilihan (panah bawah) - cukup dipilih, tidak perlu mengetik.',
    '4. Kirim balik file ini setelah kolom Konfirmasi diisi. Tidak ada yang dihapus dari database sebelum file ini diterima.',
    '5. Kolom ID (di lembar 2 dan 3) JANGAN diubah/dihapus - itu penanda baris yang akan dieksekusi.',
  ];
  for (const t of cara) {
    const row = wsR.addRow(['', t]);
    wsR.mergeCells(`B${row.number}:F${row.number}`);
    row.alignment = { wrapText: true, vertical: 'top' };
  }

  // ---------- SHEET: PER KELOMPOK (rekap silang) ----------
  const kunciKelompok = new Set();
  tanpaKelas.forEach(s => kunciKelompok.add(s.kelompok_asal_id || ''));
  dupSantri.forEach(([, v]) => v.forEach(s => kunciKelompok.add(s.kelompok_asal_id || '')));
  kandidatHapus.forEach(j => kunciKelompok.add(j.kelompok_id || ''));
  dupJamaahAktif.forEach(([, v]) => v.forEach(j => kunciKelompok.add(j.kelompok_id || '')));
  tanpaHp.forEach(a => kunciKelompok.add(a.kelompok_id || ''));

  const wsK = buatSheet(wb, 'Per Kelompok', [
    { header: 'Kelompok', key: 'kelompok', width: 26 },
    { header: 'Desa', key: 'desa', width: 18 },
    { header: 'Hapus Jamaah Nonaktif', key: 'hapusJamaah', width: 13 },
    { header: 'Jamaah Ganda Aktif', key: 'jamaahGanda', width: 13 },
    { header: 'Nama Santri Ganda', key: 'santriGanda', width: 13 },
    { header: 'Santri Tanpa Kelas', key: 'santriTanpaKelas', width: 13 },
    { header: 'Anggota Tanpa No HP', key: 'anggotaTanpaHp', width: 13 },
    { header: 'Total Temuan', key: 'total', width: 12 },
    { header: 'Konfirmasi Koordinator', key: 'konfirmasi', width: 24 },
    { header: 'Catatan Kelompok', key: 'catatan', width: 34 },
  ]);
  const rekap = [...kunciKelompok].map(id => {
    const baris = {
      kelompok: id ? klp(id) : '(tanpa kelompok)',
      desa: id ? desa(id) : '',
      hapusJamaah: kandidatHapus.filter(j => (j.kelompok_id || '') === id).length,
      jamaahGanda: dupJamaahAktif.reduce((n, [, v]) => n + v.filter(j => (j.kelompok_id || '') === id).length, 0),
      santriGanda: dupSantri.reduce((n, [, v]) => n + v.filter(s => (s.kelompok_asal_id || '') === id).length, 0),
      santriTanpaKelas: tanpaKelas.filter(s => (s.kelompok_asal_id || '') === id).length,
      anggotaTanpaHp: tanpaHp.filter(a => (a.kelompok_id || '') === id).length,
      konfirmasi: '',
      catatan: '',
    };
    baris.total = baris.hapusJamaah + baris.jamaahGanda + baris.santriGanda + baris.santriTanpaKelas + baris.anggotaTanpaHp;
    return baris;
  }).sort((a, b) => b.total - a.total || a.kelompok.localeCompare(b.kelompok));

  rekap.forEach(r => wsK.addRow(r));
  const barisTotal = wsK.addRow({
    kelompok: 'TOTAL',
    desa: '',
    hapusJamaah: rekap.reduce((n, r) => n + r.hapusJamaah, 0),
    jamaahGanda: rekap.reduce((n, r) => n + r.jamaahGanda, 0),
    santriGanda: rekap.reduce((n, r) => n + r.santriGanda, 0),
    santriTanpaKelas: rekap.reduce((n, r) => n + r.santriTanpaKelas, 0),
    anggotaTanpaHp: rekap.reduce((n, r) => n + r.anggotaTanpaHp, 0),
    total: rekap.reduce((n, r) => n + r.total, 0),
  });
  barisTotal.font = { bold: true };
  barisTotal.eachCell(c => warnai(c, KUNING));
  dropdown(wsK, 9, 2, rekap.length + 1, ['Sudah dikonfirmasi', 'Belum dikonfirmasi', 'Ada yang ditolak']);

  // ---------- SHEET 1: SANTRI TANPA KELAS ----------
  const ws1 = buatSheet(wb, '1. Santri Tanpa Kelas', [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Kelompok', key: 'kelompok', width: 24 },
    { header: 'Desa', key: 'desa', width: 16 },
    { header: 'Nama Santri', key: 'nama', width: 32 },
    { header: 'JK', key: 'jk', width: 5 },
    { header: 'Tingkatan', key: 'tingkatan', width: 14 },
    { header: 'Tgl Lahir', key: 'lahir', width: 12 },
    { header: 'Kelas Tersedia di Kelompok Ini', key: 'tersedia', width: 46 },
    { header: 'Kelas yang Ditentukan', key: 'kelasBaru', width: 22 },
    { header: 'Konfirmasi', key: 'konfirmasi', width: 20 },
    { header: 'Catatan', key: 'catatan', width: 30 },
  ]);
  tanpaKelas.forEach((s, i) => {
    ws1.addRow({
      no: i + 1,
      kelompok: klp(s.kelompok_asal_id),
      desa: desa(s.kelompok_asal_id),
      nama: teks(s.nama),
      jk: teks(s.jenis_kel),
      tingkatan: teks(s.tingkatan) || '-',
      lahir: teks(s.tgl_lahir) || '-',
      tersedia: (kelasPerKelompok.get(s.kelompok_asal_id) || []).join(', ') || '(kelas belum dibuat)',
      kelasBaru: '',
      konfirmasi: '',
      catatan: '',
    });
  });
  if (tanpaKelas.length) {
    dropdown(ws1, 10, 2, tanpaKelas.length + 1, ['Tetap aktif - isi kelas', 'Bukan santri lagi', 'Perlu cek']);
  }

  // ---------- SHEET 2: NAMA SANTRI GANDA ----------
  const ws2 = buatSheet(wb, '2. Nama Santri Ganda', [
    { header: 'Nama (sama)', key: 'nama', width: 30 },
    { header: 'Kelompok', key: 'kelompok', width: 22 },
    { header: 'ID Santri (jangan diubah)', key: 'id', width: 38 },
    { header: 'Kelas Sekarang', key: 'kelas', width: 18 },
    { header: 'Tgl Lahir', key: 'lahir', width: 12 },
    { header: 'Absensi', key: 'absensi', width: 9 },
    { header: 'Nilai', key: 'nilai', width: 8 },
    { header: 'Catatan', key: 'catatanRef', width: 9 },
    { header: 'Tautan Keluarga', key: 'keluarga', width: 10 },
    { header: 'Ditautkan Jamaah', key: 'jamaah', width: 11 },
    { header: 'Total Jejak', key: 'total', width: 10 },
    { header: 'Usulan Sistem', key: 'usulan', width: 26 },
    { header: 'Konfirmasi', key: 'konfirmasi', width: 24 },
    { header: 'Catatan Petugas', key: 'catatan', width: 30 },
  ]);

  let baris2 = 2;
  dupSantri
    .sort((a, b) => (klp(a[1][0].kelompok_asal_id) + a[0]).localeCompare(klp(b[1][0].kelompok_asal_id) + b[0]))
    .forEach(([, rows]) => {
      const skor = rows.map(s => totalJejakSantri(s.id));
      const maks = Math.max(...skor);
      rows.forEach((s, idx) => {
        const j = jejakSantri(s.id);
        const usulan = skor[idx] === maks && maks > 0
          ? 'SIMPAN (jejak terbanyak)'
          : (skor[idx] === 0 ? 'HAPUS (0 jejak)' : 'PERLU CEK');
        const row = ws2.addRow({
          nama: teks(s.nama),
          kelompok: klp(s.kelompok_asal_id),
          id: s.id,
          kelas: s.kelas_id ? (namaKelas.get(s.kelas_id) || '?') : 'TANPA KELAS',
          lahir: teks(s.tgl_lahir) || '-',
          absensi: j.absensi,
          nilai: j.nilai,
          catatanRef: j.catatan,
          keluarga: j.keluarga,
          jamaah: j.jamaah,
          total: skor[idx],
          usulan,
          konfirmasi: '',
          catatan: '',
        });
        const selUsulan = row.getCell(12);
        selUsulan.font = { bold: true };
        warnai(selUsulan, usulan.startsWith('SIMPAN') ? HIJAU : (usulan.startsWith('HAPUS') ? MERAH : KUNING));
        baris2++;
      });
    });
  if (baris2 > 2) {
    dropdown(ws2, 13, 2, baris2 - 1, ['Setuju - hapus', 'Setuju - simpan semua', 'Perlu cek']);
  }

  // ---------- SHEET 3: HAPUS JAMAAH NONAKTIF (paling aman) ----------
  const ws3 = buatSheet(wb, '3. Hapus Jamaah Nonaktif', [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Kelompok', key: 'kelompok', width: 24 },
    { header: 'Desa', key: 'desa', width: 16 },
    { header: 'Nama Jamaah', key: 'nama', width: 32 },
    { header: 'JK', key: 'jk', width: 5 },
    { header: 'Tgl Lahir', key: 'lahir', width: 12 },
    { header: 'No HP', key: 'hp', width: 16 },
    { header: 'Keterangan', key: 'ket', width: 18 },
    { header: 'ID Jamaah (jangan diubah)', key: 'id', width: 38 },
    { header: 'Usulan Sistem', key: 'usulan', width: 20 },
    { header: 'Konfirmasi', key: 'konfirmasi', width: 18 },
    { header: 'Catatan', key: 'catatan', width: 30 },
  ]);
  kandidatHapus.forEach((j, i) => {
    const row = ws3.addRow({
      no: i + 1,
      kelompok: klp(j.kelompok_id),
      desa: desa(j.kelompok_id),
      nama: teks(j.nama),
      jk: teks(j.jenis_kelamin),
      lahir: teks(j.tgl_lahir) || '-',
      hp: teks(j.no_hp) || '-',
      ket: teks(j.keterangan) || '-',
      id: j.id,
      usulan: 'Hapus permanen',
      konfirmasi: '',
      catatan: '',
    });
    warnai(row.getCell(10), HIJAU);
  });
  if (kandidatHapus.length) {
    dropdown(ws3, 11, 2, kandidatHapus.length + 1, ['Hapus permanen', 'Tahan', 'Perlu cek']);
  }

  // ---------- SHEET 4: JAMAAH NAMA GANDA (MASIH AKTIF) ----------
  const ws4 = buatSheet(wb, '4. Jamaah Ganda Aktif', [
    { header: 'Nama (sama)', key: 'nama', width: 30 },
    { header: 'Kelompok', key: 'kelompok', width: 22 },
    { header: 'JK', key: 'jk', width: 5 },
    { header: 'Tgl Lahir', key: 'lahir', width: 12 },
    { header: 'No HP', key: 'hp', width: 16 },
    { header: 'ID Jamaah (jangan diubah)', key: 'id', width: 38 },
    { header: 'Absensi Pengajian', key: 'pengajian', width: 11 },
    { header: 'Tautan Keluarga', key: 'keluarga', width: 10 },
    { header: 'Jadi Pasangan', key: 'pasangan', width: 10 },
    { header: 'Total Jejak', key: 'total', width: 10 },
    { header: 'Usulan Sistem', key: 'usulan', width: 24 },
    { header: 'Konfirmasi', key: 'konfirmasi', width: 22 },
    { header: 'Catatan', key: 'catatan', width: 30 },
  ]);
  let baris4 = 2;
  dupJamaahAktif
    .sort((a, b) => (klp(a[1][0].kelompok_id) + a[0]).localeCompare(klp(b[1][0].kelompok_id) + b[0]))
    .forEach(([, rows]) => {
      const skor = rows.map(j => totalJejakJamaah(j.id));
      const maks = Math.max(...skor);
      rows.forEach((j, idx) => {
        const jj = jejakJamaah(j.id);
        const usulan = skor[idx] === maks && maks > 0
          ? 'SIMPAN (jejak terbanyak)'
          : (skor[idx] === 0 ? 'Kemungkinan ganda baru' : 'PERLU CEK');
        const row = ws4.addRow({
          nama: teks(j.nama),
          kelompok: klp(j.kelompok_id),
          jk: teks(j.jenis_kelamin),
          lahir: teks(j.tgl_lahir) || '-',
          hp: teks(j.no_hp) || '-',
          id: j.id,
          pengajian: jj.pengajian,
          keluarga: jj.keluarga,
          pasangan: jj.pasangan,
          total: skor[idx],
          usulan,
          konfirmasi: '',
          catatan: '',
        });
        warnai(row.getCell(11), usulan.startsWith('SIMPAN') ? HIJAU : (usulan.startsWith('Kemungkinan') ? MERAH : KUNING));
        baris4++;
      });
    });
  if (baris4 > 2) {
    dropdown(ws4, 12, 2, baris4 - 1, ['Bukan duplikat', 'Duplikat - timpa ke satu baris', 'Perlu cek']);
  }

  // ---------- SHEET 5: ANGGOTA TANPA NO HP ----------
  const ws5 = buatSheet(wb, '5. Anggota Tanpa No HP', [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Username', key: 'username', width: 22 },
    { header: 'Nama Lengkap', key: 'nama', width: 30 },
    { header: 'Role', key: 'role', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Kelompok', key: 'kelompok', width: 24 },
    { header: 'Desa', key: 'desa', width: 16 },
    { header: 'No HP (isi di sini)', key: 'hp', width: 20 },
    { header: 'Catatan', key: 'catatan', width: 30 },
  ]);
  tanpaHp.forEach((a, i) => {
    const row = ws5.addRow({
      no: i + 1,
      username: teks(a.username),
      nama: teks(a.nama_lengkap),
      role: teks(a.role),
      status: teks(a.status),
      kelompok: klp(a.kelompok_id),
      desa: desa(a.kelompok_id || a.desa_id),
      hp: '',
      catatan: '',
    });
    warnai(row.getCell(8), KUNING);
  });

  // ---------- simpan file ----------
  const stempel = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const namaFile = `Konfirmasi_Pembersihan_Data_${stempel}.xlsx`;
  const tujuan = path.join(__dirname, '..', namaFile);
  await wb.xlsx.writeFile(tujuan);
  console.log(`\nSELESAI -> ${tujuan}`);
  console.log('File ini belum mengubah data apa pun. Eksekusi hapus baru dilakukan setelah kolom Konfirmasi diterima kembali.');
})().catch(e => {
  console.error('\nGAGAL:', e.message);
  process.exit(1);
});
