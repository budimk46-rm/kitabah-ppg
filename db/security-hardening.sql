-- ============================================================================
-- KITABAH / PPG SIDUTA — PENGERASAN AKSES DATABASE
-- Jalankan di Supabase Dashboard -> SQL Editor (butuh hak owner; anon key TIDAK bisa).
--
-- Kenapa perlu: aplikasi memakai "anon/publishable key" yang ikut terkirim ke
-- browser, dan RLS (Row Level Security) saat ini MATI. Artinya siapa pun yang
-- membuka DevTools bisa membaca seluruh tabel `anggota` — termasuk password_hash.
-- Setelah semua password di-hash bcrypt (selesai 14 Nov 2026), langkah berikutnya
-- adalah memastikan hash itu sendiri tidak bisa dibaca dari luar.
--
-- FILE INI DIBAGI 2 TAHAP. Jalankan TAHAP 1 dulu, uji, baru TAHAP 2.
--   TAHAP 1 : membuat fungsi verifikasi sandi di server (belum mengubah hak akses).
--             Setelah tahap ini, aplikasi otomatis login lewat RPC `login_anggota`.
--   TAHAP 2 : mencabut hak baca kolom password_hash untuk anon/authenticated.
--             Hanya boleh dijalankan SETELAH tahap 1 diuji & kode web sudah dideploy.
--
-- Rollback tahap 2 ada di bagian paling bawah.
-- ============================================================================


-- ############################################################################
-- TAHAP 1 — fungsi verifikasi sandi di server (aman, tidak mengubah hak akses)
-- ############################################################################

create extension if not exists pgcrypto;

-- Helper: cocokkan sandi dengan hash bcrypt. Toleran terhadap versi hash
-- ($2a$ dari bcryptjs 2.4.3 di browser, $2b$/$2y$ dari pustaka lain), karena
-- beberapa build pgcrypto hanya mengenal $2a$.
create or replace function public.kitabah_sandi_cocok(p_plain text, p_hash text)
returns boolean
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_hash text := btrim(coalesce(p_hash, ''));
  v_alt  text;
begin
  if p_plain is null or v_hash = '' then
    return false;
  end if;
  if left(v_hash, 4) not in ('$2a$', '$2b$', '$2y$') then
    return false;   -- bukan bcrypt: tolak (jangan pernah cocokkan plaintext)
  end if;
  begin
    if crypt(p_plain, v_hash) = v_hash then
      return true;
    end if;
    v_alt := '$2a$' || substr(v_hash, 5);
    if v_alt <> v_hash and crypt(p_plain, v_alt) = v_alt then
      return true;
    end if;
  exception when others then
    return false;
  end;
  return false;
end;
$fn$;

-- Login terverifikasi di server. Mengembalikan status_code + profil TANPA password_hash.
-- status_code: 'ok' | 'no_user' | 'bad_password' | 'empty_password'
create or replace function public.login_anggota(p_username text, p_password text)
returns table (status_code text, profil jsonb)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  r      public.anggota%rowtype;
  v_user text := btrim(coalesce(p_username, ''));
begin
  if v_user = '' then
    return query select 'no_user'::text, null::jsonb;
    return;
  end if;

  -- utamakan username yang persis sama, lalu yang hanya beda huruf besar/kecil
  select * into r
  from public.anggota a
  where lower(btrim(a.username)) = lower(v_user)
  order by (a.username = v_user) desc
  limit 1;

  if r.id is null then
    return query select 'no_user'::text, null::jsonb;
    return;
  end if;

  if coalesce(btrim(r.password_hash), '') = '' then
    return query select 'empty_password'::text, null::jsonb;
    return;
  end if;

  if not public.kitabah_sandi_cocok(p_password, r.password_hash) then
    return query select 'bad_password'::text, null::jsonb;
    return;
  end if;

  return query select 'ok'::text, (to_jsonb(r) - 'password_hash'::text);
end;
$fn$;

-- Cek sandi untuk fitur "Ganti Password" (tanpa mengirim hash ke browser).
create or replace function public.cek_password(p_username text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_hash text;
  v_user text := btrim(coalesce(p_username, ''));
begin
  if v_user = '' or p_password is null then
    return false;
  end if;
  select a.password_hash into v_hash
  from public.anggota a
  where lower(btrim(a.username)) = lower(v_user)
  order by (a.username = v_user) desc
  limit 1;
  return public.kitabah_sandi_cocok(p_password, v_hash);
end;
$fn$;

-- Hak eksekusi: hanya dua fungsi publik; helper tetap tertutup.
revoke all on function public.kitabah_sandi_cocok(text, text) from public;
revoke all on function public.login_anggota(text, text) from public;
revoke all on function public.cek_password(text, text) from public;
grant execute on function public.login_anggota(text, text) to anon, authenticated;
grant execute on function public.cek_password(text, text) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- UJI TAHAP 1 — jalankan satu per satu, GANTI username/sandi dengan akun uji.
-- Kalau hasilnya sesuai, baru lanjut ke TAHAP 2.
-- ---------------------------------------------------------------------------
-- (a) harus 1 baris, status_code = ok, kolom ada_hash = false
-- select status_code,
--        profil ->> 'username'      as username,
--        profil ->> 'role'          as role,
--        profil ? 'password_hash'   as ada_hash
-- from public.login_anggota('GANTI-USERNAME', 'GANTI-SANDI-BENAR');

-- (b) harus status_code = bad_password  (sandi salah)
-- select * from public.login_anggota('GANTI-USERNAME', 'sandi-salah');

-- (c) harus status_code = no_user       (username tidak ada)
-- select * from public.login_anggota('tidak.ada.username', 'apa-saja');

-- (d) harus true, lalu false
-- select public.cek_password('GANTI-USERNAME', 'GANTI-SANDI-BENAR');
-- select public.cek_password('GANTI-USERNAME', 'sandi-salah');



-- ############################################################################
-- TAHAP 2 — cabut hak baca kolom password_hash
-- Syarat: TAHAP 1 sudah dijalankan & diuji, dan versi web yang memakai RPC
-- (`supabase.js` dengan sbLoginViaRpc / cekPassword) sudah ter-deploy.
-- Efek: `select=*` pada tabel anggota akan DITOLAK; hanya kolom di bawah yang bisa
-- dibaca anon. Semua query di aplikasi sudah memakai daftar kolom eksplisit.
-- ############################################################################

revoke select on table public.anggota from anon, authenticated;

grant select (
  id, username, nama_lengkap, role, status, kelompok_id, desa_id,
  wa_number, created_at, jabatan, akses_menu, akses_lintas, last_active, no_hp
) on table public.anggota to anon, authenticated;

-- Cek hasilnya: password_hash tidak boleh muncul lagi saat dicoba dibaca.
-- select password_hash from public.anggota limit 1;   -- harus ERROR: permission denied
-- select count(*) from public.login_anggota('GANTI-USERNAME', 'GANTI-SANDI-BENAR');

-- CATATAN PENTING (jujur, jangan dilewat):
-- 1. Pencabutan ini hanya menutup PEMBACAAN hash. INSERT/UPDATE/DELETE oleh anon
--    MASIH terbuka karena aplikasi (tanpa Supabase Auth) memang menulis langsung
--    dari browser: pendaftaran, reset password oleh admin, hapus user, dsb.
-- 2. RLS per-baris/per-peran (guru hanya kelasnya, desa hanya desanya) TIDAK MUNGKIN
--    ditegakkan selama login masih "custom" seperti sekarang: policy Postgres butuh
--    identitas (auth.uid()) yang datang dari Supabase Auth. Untuk itu perlu migrasi
--    ke Supabase Auth (atau API perantara/serverless) — pekerjaan terpisah, bukan
--    sekadar mengaktifkan RLS.
-- 3. Selama write masih terbuka, aktor jahat tetap bisa MENIMPA password orang lain
--    (gangguan layanan), tapi tidak bisa MEMBACA password siapa pun.
-- 4. Fungsi login_anggota / cek_password bisa dipanggil siapa saja yang punya anon key.
--    Sama seperti form login biasa, jadi tidak menambah celah baru — tapi brute force
--    tetap harus dicegah di sisi lain (batas percobaan, CAPTCHA, atau Supabase Auth).


-- ############################################################################
-- ROLLBACK (kalau ada yang rusak setelah TAHAP 2)
-- ############################################################################
-- grant select on table public.anggota to anon, authenticated;
--
-- Kalau perlu membatalkan tahap 1 juga:
-- drop function if exists public.login_anggota(text, text);
-- drop function if exists public.cek_password(text, text);
-- drop function if exists public.kitabah_sandi_cocok(text, text);
-- (Aplikasi otomatis kembali ke cara lama bila RPC tidak ada.)
