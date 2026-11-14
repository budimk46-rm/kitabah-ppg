// Uji jalur login BARU terhadap database asli (bukan mock).
// Hanya memakai sandi yang salah / username tak ada, jadi tidak mengubah data.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'bcrypt.min.js'));

const URL_SB = 'https://leastktlugjzupeohqag.supabase.co';
const KEY = 'sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o';
const HDR = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };

const ctx = {
  console,
  window: { dcodeIO: { bcrypt } },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  TextEncoder,
  crypto: require('crypto').webcrypto,
  fetch,
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'supabase.js'), 'utf8'), ctx);

(async () => {
  // 1) Apakah RPC login_anggota sudah ada di database?
  const r = await fetch('https://leastktlugjzupeohqag.supabase.co/rest/v1/rpc/login_anggota', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: 'sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o', Authorization: 'Bearer sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o' },
    body: JSON.stringify({ p_username: 'ilma.nur', p_password: 'sandi-uji-salah' }),
  });
  console.log(`RPC login_anggota -> HTTP ${r.status} ${r.status === 200 ? '(aktif: login diproses di server)' : '(404 = belum dipasang, aplikasi pakai cara lama)'}`);

  // 2) Login sandi salah: harus "Kata sandi salah." (membuktikan baca DB + bcrypt jalan)
  try {
    await ctx.window.SB.login('ilma.nur', 'sandi-uji-salah');
    console.log('GAGAL: sandi salah malah diterima');
  } catch (e) {
    console.log(`login('ilma.nur', sandi salah) -> "${e.message}"`);
  }

  // 3) Username tidak ada
  try {
    await ctx.window.SB.login('zz.bukan.akun', 'apa-saja');
    console.log('GAGAL: username hantu malah diterima');
  } catch (e) {
    console.log(`login('zz.bukan.akun') -> "${e.message}"`);
  }

  // 4) Huruf besar/kecil: 'Ilma.nur' juga harus sampai ke tahap cek sandi (bukan "tidak ditemukan")
  try {
    await ctx.window.SB.login('Ilma.nur', 'sandi-uji-salah');
  } catch (e) {
    console.log(`login('Ilma.nur') -> "${e.message}"  (harus "Kata sandi salah.")`);
  }

  // 5) Status penguncian kolom password_hash + jumlah akun.
  //    Sejak Tahap 2 dijalankan, hash TIDAK bisa dibaca lagi dari luar - itu tujuannya.
  const kunci = await fetch(`${URL_SB}/rest/v1/anggota?select=password_hash&limit=1`, { headers: HDR });
  console.log(`\nselect password_hash dari luar -> HTTP ${kunci.status} ${kunci.status === 200 ? '(MASIH TERBUKA: Tahap 2 belum dijalankan)' : '(TERKUNCI: Tahap 2 aktif)'}`);
  if (kunci.status === 200) {
    const rows = await kunci.json();
    const h = rows?.[0]?.password_hash || '';
    console.log(`contoh prefix hash: ${h.slice(0, 7)} (harus $2a$10$ / $2b$10$)`);
  }

  const semua = await fetch(`${URL_SB}/rest/v1/anggota?select=id&limit=1000`, {
    headers: { ...HDR, 'Range-Unit': 'items', Range: '0-999' },
  });
  const total = semua.ok ? (await semua.json()).length : null;
  console.log(`jumlah akun terbaca (kolom aman): ${total === null ? `gagal HTTP ${semua.status}` : total}`);

  // 6) Cek kolom yang masih boleh dibaca (dipakai refresh sesi & Kelola Pengguna)
  const aman = await fetch(`${URL_SB}/rest/v1/anggota?select=id,username,nama_lengkap,role,status,kelompok_id,desa_id,wa_number,created_at,jabatan,akses_menu,akses_lintas,last_active,no_hp&limit=1`, { headers: HDR });
  console.log(`select kolom aman -> HTTP ${aman.status} ${aman.ok ? 'OK' : 'GAGAL (aplikasi akan rusak!)'}`);

  if (!aman.ok || total === null) process.exit(1);
})();


