// Uji jalur login BARU terhadap database asli (bukan mock).
// Hanya memakai sandi yang salah / username tak ada, jadi tidak mengubah data.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'bcrypt.min.js'));

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
  console.log(`RPC login_anggota -> HTTP ${r.status} (404 = belum dipasang, fallback dipakai)`);

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

  // 5) Hitung ulang status hash di DB
  const all = await (await fetch('https://leastktlugjzupeohqag.supabase.co/rest/v1/anggota?select=username,role,password_hash', {
    headers: { apikey: 'sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o', Authorization: 'Bearer sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o', 'Range-Unit': 'items', Range: '0-999' },
  })).json();
  const bc = all.filter(u => (u.password_hash || '').startsWith('$2'));
  const bukanBc = all.filter(u => !(u.password_hash || '').startsWith('$2'));
  console.log(`\nTotal akun: ${all.length} | bcrypt: ${bc.length} | plaintext/kosong: ${bukanBc.length}`);
  console.log(`Prefix: $2a$=${bc.filter(u => u.password_hash.startsWith('$2a$')).length} $2b$=${bc.filter(u => u.password_hash.startsWith('$2b$')).length}`);
  if (bukanBc.length) console.log('SISA:', bukanBc.map(u => `${u.username}[${u.role}]`).join(', '));
})();
