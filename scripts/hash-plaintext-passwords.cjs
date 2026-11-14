#!/usr/bin/env node
/**
 * Ubah password_hash yang masih plaintext menjadi bcrypt TANPA mengubah password user.
 *
 * Kenapa perlu: login lama menyimpan password apa adanya (dan form registrasi lama
 * mengirim password mentah), jadi siapa pun yang bisa membaca tabel `anggota`
 * (RLS saat ini terbuka untuk anon) bisa melihat password semua orang.
 *
 * Hash dibuat dengan bcryptjs (cost 10). `verifyPassword()` di supabase.js sudah
 * menerima hash berawalan `$2` via window.dcodeIO.bcrypt (bcryptjs 2.4.3),
 * jadi password lama tetap berlaku — user tidak perlu tahu/diganti passwordnya.
 *
 * Pemakaian:
 *   node scripts/hash-plaintext-passwords.cjs                      # dry-run, role admin+daerah
 *   ROLES=all node scripts/hash-plaintext-passwords.cjs            # dry-run, semua role
 *   ROLES=all node scripts/hash-plaintext-passwords.cjs --apply    # eksekusi
 *
 * Yang dilewati otomatis: hash bcrypt yang sudah ada, sha256/md5 hex, dan nilai kosong
 * (tidak bisa dibalik jadi password, jadi jangan diutak-atik).
 */
const path = require('path');
// Pakai bcryptjs 2.4.3 yang SAMA dengan yang dimuat browser (bcrypt.min.js di root repo),
// supaya hash yang dihasilkan pasti bisa diverifikasi verifyPassword() di aplikasi.
// (Fallback ke node_modules hanya kalau file itu tidak ada.)
let bcrypt;
try {
  bcrypt = require(path.join(__dirname, '..', 'bcrypt.min.js'));
} catch (e) {
  bcrypt = require('bcryptjs');
}
if (!bcrypt || typeof bcrypt.hashSync !== 'function') {
  console.error('bcryptjs tidak tersedia. Jalankan: npm install');
  process.exit(1);
}

const URL_SB = process.env.SUPABASE_URL || 'https://leastktlugjzupeohqag.supabase.co';
const KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_HWHNNxI8i4BHUpJIL8lEcQ_RwIugn-o';
const APPLY = process.argv.includes('--apply');
const ROLES = (process.env.ROLES || 'admin,daerah').trim();

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function get(path) {
  const r = await fetch(`${URL_SB}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

async function patch(id, body) {
  const r = await fetch(`${URL_SB}/rest/v1/anggota?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
}

function classify(h) {
  if (!h) return 'kosong';
  if (h.startsWith('$2')) return 'sudah-bcrypt';
  if (/^[a-f0-9]{64}$/i.test(h)) return 'sha256-hex';
  if (/^[a-f0-9]{32}$/i.test(h)) return 'md5-hex';
  return 'plaintext';
}

(async () => {
  const q = ROLES === 'all'
    ? 'anggota?select=id,username,role,password_hash&order=username.asc'
    : `anggota?role=in.(${ROLES})&select=id,username,role,password_hash&order=username.asc`;
  const rows = await get(q);

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | role: ${ROLES} | akun diperiksa: ${rows.length}\n`);

  let ok = 0, skip = 0, fail = 0;
  for (const u of rows) {
    const kind = classify(u.password_hash);
    if (kind !== 'plaintext') {
      skip++;
      continue;
    }
    // Hash password yang sama -> login tetap memakai password lama.
    const newHash = bcrypt.hashSync(u.password_hash, bcrypt.genSaltSync(10));
    if (!bcrypt.compareSync(u.password_hash, newHash)) {
      console.log(`FAIL   ${u.username.padEnd(28)} [${u.role}] hash tidak lolos verifikasi lokal`);
      fail++;
      continue;
    }
    if (!APPLY) {
      ok++;
      continue;
    }
    try {
      await patch(u.id, { password_hash: newHash });
      console.log(`OK     ${u.username.padEnd(28)} [${u.role}] plaintext -> ${newHash.slice(0, 7)}...`);
      ok++;
    } catch (e) {
      console.log(`FAIL   ${u.username.padEnd(28)} [${u.role}] ${e.message}`);
      fail++;
    }
  }

  console.log(`\nRingkasan: ${APPLY ? 'diubah' : 'akan diubah'}=${ok} | dilewati (sudah hash/kosong)=${skip} | gagal=${fail}`);
  if (!APPLY && ok > 0) console.log('Jalankan ulang dengan --apply untuk menyimpan.');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
