// Uji cepat supabase.js tanpa browser: RPC login ada vs belum ada, plus jalur ganti password.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'bcrypt.min.js'));

const SRC = fs.readFileSync(path.join(__dirname, '..', 'supabase.js'), 'utf8');
const HASH_OK = bcrypt.hashSync('ilma123', bcrypt.genSaltSync(10));
const ROW = {
  id: 'u-1', username: 'ilma.nur', nama_lengkap: 'Ilma Nur', role: 'guru',
  status: 'approved', password_hash: HASH_OK, akses_menu: null,
};

function resp(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

function makeCtx(routes) {
  const calls = [];
  const ctx = {
    console: { log: () => {}, error: () => {}, warn: () => {} },
    window: { dcodeIO: { bcrypt } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    TextEncoder,
    crypto: require('crypto').webcrypto,
    fetch: async (url, opts = {}) => {
      calls.push({ url, method: opts.method || 'GET', body: opts.body });
      for (const r of routes) { if (url.includes(r.match)) return r.handle(url, opts); }
      return resp(404, { message: 'not found' });
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, calls };
}

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
}

(async () => {
  console.log('== A. RPC login_anggota BELUM ada (fallback cara lama) ==');
  {
    const { ctx, calls } = makeCtx([
      { match: '/rpc/login_anggota', handle: () => resp(404, { message: 'Could not find the function' }) },
      { match: '/rpc/cek_password', handle: () => resp(404, { message: 'Could not find the function' }) },
      { match: 'anggota?username=eq.', handle: () => resp(200, [ROW]) },
    ]);
    const u = await ctx.window.SB.login('ilma.nur', 'ilma123');
    ok('login berhasil lewat fallback REST', u && u.username === 'ilma.nur');
    ok('fallback memang membaca tabel anggota', calls.some(c => c.url.includes('anggota?username=eq.')));

    const { ctx: c2 } = makeCtx([
      { match: '/rpc/login_anggota', handle: () => resp(404, {}) },
      { match: 'anggota?username=eq.', handle: () => resp(200, [ROW]) },
    ]);
    let msg = '';
    try { await c2.window.SB.login('ilma.nur', 'salah'); } catch (e) { msg = e.message; }
    ok('sandi salah ditolak (fallback)', msg === 'Kata sandi salah.', `dapat: "${msg}"`);

    const { ctx: c3 } = makeCtx([{ match: '/rpc/cek_password', handle: () => resp(404, {}) }]);
    ok('cekPassword fallback ke hash lokal (benar)', (await c3.window.SB.cekPassword('ilma.nur', 'ilma123', HASH_OK)) === true);
    ok('cekPassword fallback ke hash lokal (salah)', (await c3.window.SB.cekPassword('ilma.nur', 'xxxxx', HASH_OK)) === false);
  }

  console.log('== B. RPC login_anggota SUDAH ada (hash tidak dikirim ke browser) ==');
  {
    const profil = { ...ROW }; delete profil.password_hash;
    const { ctx, calls } = makeCtx([
      { match: '/rpc/login_anggota', handle: () => resp(200, [{ status_code: 'ok', profil }]) },
    ]);
    const u = await ctx.window.SB.login('Ilma.nur ', 'ilma123');
    ok('login lewat RPC berhasil', u && u.username === 'ilma.nur');
    ok('profil tanpa password_hash', u && !('password_hash' in u));
    ok('tidak ada query baca tabel anggota', !calls.some(c => c.url.includes('/anggota?')));
    ok('mengirim p_username & p_password ke RPC', calls.some(c => c.url.includes('/rpc/login_anggota') && JSON.parse(c.body).p_password === 'ilma123'));

    const cases = [
      ['bad_password', 'Kata sandi salah.'],
      ['no_user', 'Nama pengguna tidak ditemukan.'],
      ['empty_password', 'Kata sandi salah.'],
      ['PENDING', 'PENDING'],
    ];
    for (const [kode, expect] of cases) {
      const body = kode === 'PENDING'
        ? [{ status_code: 'ok', profil: { ...profil, status: 'pending' } }]
        : [{ status_code: kode, profil: null }];
      const { ctx: c } = makeCtx([{ match: '/rpc/login_anggota', handle: () => resp(200, body) }]);
      let m = '';
      try { await c.window.SB.login('ilma.nur', 'x'); } catch (e) { m = e.message; }
      ok(`kode "${kode}" -> "${expect}"`, m === expect, `dapat: "${m}"`);
    }

    const { ctx: c4 } = makeCtx([{ match: '/rpc/cek_password', handle: () => resp(200, true) }]);
    ok('cekPassword lewat RPC = true', (await c4.window.SB.cekPassword('ilma.nur', 'ilma123')) === true);
    const { ctx: c5 } = makeCtx([{ match: '/rpc/cek_password', handle: () => resp(200, false) }]);
    ok('cekPassword lewat RPC = false', (await c5.window.SB.cekPassword('ilma.nur', 'salah')) === false);
  }

  console.log('== C. Jalur hash yang lemah sudah ditutup ==');
  {
    const { ctx } = makeCtx([]);
    ok('plaintext tidak lagi dianggap cocok', (await ctx.verifyPassword('rahasia', 'rahasia')) === false);
    const sha = require('crypto').createHash('sha256').update('rahasia').digest('hex');
    ok('hash SHA-256 tidak lagi diterima', (await ctx.verifyPassword('rahasia', sha)) === false);
    ok('hash kosong/null -> false', (await ctx.verifyPassword('rahasia', null)) === false);
    const h = await ctx.hashPassword('rahasia');
    ok('hashPassword menghasilkan bcrypt $2a$ (60 char)', h.startsWith('$2a$') && h.length === 60, h);
    ok('hash baru bisa diverifikasi', (await ctx.verifyPassword('rahasia', h)) === true);

    const bcryptOff = makeCtx([]);
    bcryptOff.ctx.window.dcodeIO = null;
    let throwMsg = '';
    try { await bcryptOff.ctx.hashPassword('rahasia'); } catch (e) { throwMsg = e.message; }
    ok('hashPassword melempar error (bukan SHA-256) saat lib absen', /belum termuat/.test(throwMsg), `dapat: "${throwMsg}"`);
  }

  console.log(`\nRingkasan: PASS=${pass} FAIL=${fail}`);
  process.exit(fail ? 1 : 0);
})();

