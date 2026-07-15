// supabase.js - Kitabah v2 Supabase Client
// Simpan file ini bersama index.html

const SUPABASE_URL = 'https://jxkumrxnokmkzsmkhvol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4a3Vtcnhub2tta3pzbWtodm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Mjk1MTcsImV4cCI6MjA5OTMwNTUxN30.V1qxZCAeqH89un1yDQHZAV_rFHb-eAhNWLbO0SCB6Gk';

const SB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// Generic REST API helper
async function sbFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const method = options.method || 'GET';
  const extraHeaders = {};
  // Tambah Range header hanya untuk GET supaya bisa ambil lebih dari 1000 baris
  if (method === 'GET') {
    extraHeaders['Range-Unit'] = 'items';
    extraHeaders['Range'] = '0-9999';
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...SB_HEADERS, ...extraHeaders, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  return JSON.parse(text);
}

// ============ AUTH (custom, bukan Supabase Auth) ============
async function sbLogin(username, password) {
  const data = await sbFetch(`anggota?username=eq.${encodeURIComponent(username)}&select=*`);
  if (!data || data.length === 0) throw new Error('Nama pengguna tidak ditemukan.');
  const user = data[0];
  // Simple comparison (app-level, production should use bcrypt)
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new Error('Kata sandi salah.');
  if (user.status === 'pending') throw new Error('PENDING');
  if (user.status === 'rejected') throw new Error('REJECTED');
  return user;
}

// Password verification — bcrypt check via Web Crypto fallback
async function verifyPassword(plain, hash) {
  // hash is stored as bcrypt, but since we can't run bcrypt in browser easily,
  // for now we compare SHA-256 of plain or accept literal match for migration
  // In production, use a serverless function for bcrypt
  if (hash === plain) return true; // plain text stored (migration mode)
  // Try SHA-256 comparison
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  if (hash === hex) return true;
  // bcrypt check — delegate to stored hash starting with $2
  if (hash.startsWith('$2')) {
    // We use dcodeIO/bcryptjs loaded externally
    if (window.dcodeIO && window.dcodeIO.bcrypt) {
      return window.dcodeIO.bcrypt.compareSync(plain, hash);
    }
  }
  return false;
}

// ============ USERS ============
const sbUsers = {
  getAll: () => sbFetch('anggota?select=id,username,nama_lengkap,role,status,kelompok_id,desa_id,created_at&order=created_at.asc'),
  getPending: () => sbFetch('anggota?status=eq.pending&select=id,username,nama_lengkap,role,kelompok_id,desa_id,created_at&order=created_at.asc'),
  approve: (id) => sbFetch(`anggota?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }),
  reject: (id) => sbFetch(`anggota?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) }),
  delete: (id) => sbFetch(`anggota?id=eq.${id}`, { method: 'DELETE' }),
  register: async (data) => {
    // Direct fetch — Supabase selalu return 409 tapi data tetap masuk
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/daftar_anggota`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({
        p_username: data.username,
        p_password: data.password_hash,
        p_nama: data.nama_lengkap,
        p_role: data.role,
        p_jabatan: data.jabatan || '',
        p_kelompok_id: data.kelompok_id || null,
        p_desa_id: data.desa_id || null,
      })
    });
    // Tidak cek response status — data sudah masuk
    return null;
  },
  update: (id, data) => sbFetch(`anggota?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ============ KELOMPOK & DESA ============
const sbKelompok = {
  getAll: () => sbFetch('kelompok?select=id,nama,desa_id,desa(id,nama)&order=desa_id,nama'),
  getByDesa: (desaId) => sbFetch(`kelompok?desa_id=eq.${desaId}&select=id,nama,desa_id&order=nama`),
};
const sbDesa = {
  getAll: () => sbFetch('desa?select=id,nama&order=id'),
};

// ============ MATERI ============
const sbMateri = {
  getAll: async () => {
    // Ambil per-jenjang untuk menghindari batas 1000 baris
    const JENJANG = ['PAUD TK','SD 1','SD 2','SD 3','SD 4','SD 5','SD 6',
      'SMP 1','SMP 2','SMP 3','SMA 1','SMA 2','SMA 3','PRA 1','PRA 2','PRA 3','PRA 4'];
    const results = await Promise.all(
      JENJANG.map(j =>
        sbFetch(`materi?jenjang=eq.${encodeURIComponent(j)}&select=*&order=semester,id&limit=500`)
      )
    );
    return results.flat();
  },
  getByJenjang: (jenjang, semester) =>
    sbFetch(`materi?jenjang=eq.${encodeURIComponent(jenjang)}&semester=eq.${semester}&select=*&order=id&limit=500`),
  update: (id, data) => sbFetch(`materi?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  insert: (data) => sbFetch('materi', { method: 'POST', headers: {'Prefer':'return=representation'}, body: JSON.stringify(data) }),
  delete: (id) => sbFetch(`materi?id=eq.${id}`, { method: 'DELETE' }),
};

// ============ KELAS ============
const sbKelas = {
  getByKelompok: (kelompokId) =>
    sbFetch(`kelas?kelompok_id=eq.${kelompokId}&select=id,kelompok_id,nama_kelas,jenjang,semester&order=nama_kelas,jenjang,semester`),
  insert: (data) => sbFetch('kelas', { method: 'POST', headers: {'Prefer':'return=representation'}, body: JSON.stringify(data) }),
  delete: (id) => sbFetch(`kelas?id=eq.${id}`, { method: 'DELETE' }),
};

// ============ SANTRI ============
const sbSantri = {
  getByKelas: (kelasId) =>
    sbFetch(`santri?kelas_id=eq.${kelasId}&aktif=eq.true&select=*&order=nama`),
  getByKelompok: (kelompokId) =>
    sbFetch(`santri?aktif=eq.true&select=*,kelas!inner(kelompok_id,jenjang,nama_kelas)&kelas.kelompok_id=eq.${kelompokId}&order=nama`),
  getAll: () =>
    sbFetch(`santri?aktif=eq.true&select=*,kelas(kelompok_id,jenjang,nama_kelas,kelompok(nama,desa_id))&order=nama&limit=5000`),
  insert: (data) => sbFetch('santri', {
    method: 'POST',
    headers: {'Prefer':'return=representation'},
    body: JSON.stringify(Array.isArray(data) ? data : [data])
  }),
  update: (id, data) => sbFetch(`santri?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  softDelete: (id) => sbFetch(`santri?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ aktif: false }) }),
};

// ============ PERTEMUAN ============
const sbPertemuan = {
  getByKelas: (kelasId) =>
    sbFetch(`pertemuan?kelas_id=eq.${kelasId}&select=*&order=tanggal.desc`),
  insert: (data) => sbFetch('pertemuan', {
    method: 'POST',
    headers: {'Prefer':'return=representation'},
    body: JSON.stringify(data)
  }),
};

// ============ JURNAL ============
const sbJurnal = {
  getByPertemuan: (pertemuanId) =>
    sbFetch(`jurnal?pertemuan_id=eq.${pertemuanId}&select=*,jurnal_materi(*)`),
  upsert: (data) => sbFetch('jurnal?on_conflict=pertemuan_id,guru_id', {
    method: 'POST',
    headers: {'Prefer': 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify(data)
  }),
  insertMateri: (jurnalId, materiIds, bulanTarget) => {
    const rows = materiIds.map(mid => ({ jurnal_id: jurnalId, materi_id: mid, bulan_target: bulanTarget }));
    return sbFetch('jurnal_materi', {
      method: 'POST',
      headers: {'Prefer': 'resolution=ignore-duplicates'},
      body: JSON.stringify(rows)
    });
  },
  deleteMateri: (jurnalId) => sbFetch(`jurnal_materi?jurnal_id=eq.${jurnalId}`, { method: 'DELETE' }),
};

// ============ ABSENSI ============
const sbAbsensi = {
  getByPertemuan: (pertemuanId) =>
    sbFetch(`absensi?pertemuan_id=eq.${pertemuanId}&select=*,santri(nama)&order=santri(nama)`),
  upsertBulk: (rows) => sbFetch('absensi?on_conflict=pertemuan_id,santri_id', {
    method: 'POST',
    headers: {'Prefer': 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify(rows)
  }),
};

// ============ PROGRESS ============
const sbProgress = {
  getByKelompok: (kelompokId) =>
    sbFetch(`progress?kelompok_id=eq.${kelompokId}&select=*`),
  toggle: async (kelompokId, materiId, bulan, userId) => {
    const existing = await sbFetch(
      `progress?kelompok_id=eq.${kelompokId}&materi_id=eq.${encodeURIComponent(materiId)}&bulan=eq.${bulan}`
    );
    if (existing && existing.length > 0) {
      await sbFetch(`progress?id=eq.${existing[0].id}`, { method: 'DELETE' });
      return 'unchecked';
    } else {
      await sbFetch('progress', {
        method: 'POST',
        headers: {'Prefer':'resolution=ignore-duplicates'},
        body: JSON.stringify({ kelompok_id: kelompokId, materi_id: materiId, bulan, user_id: userId })
      });
      return 'checked';
    }
  },
  // Tambahkan progress kalau belum ada (tidak hapus kalau sudah ada)
  toggle_add: async (kelompokId, materiId, bulan, userId) => {
    try {
      await sbFetch('progress', {
        method: 'POST',
        headers: {'Prefer':'resolution=ignore-duplicates'},
        body: JSON.stringify({ kelompok_id: kelompokId, materi_id: materiId, bulan, user_id: userId })
      });
    } catch(e) { /* abaikan duplikat */ }
  },
  getAll: () => sbFetch('progress?select=*'),
};

// ============ MUSYAWARAH ============
const sbMusyawarah = {
  getAll: () => sbFetch('musyawarah?select=*,anggota(nama_lengkap)&order=tanggal.desc&limit=200'),
  getByLevel: (level) => sbFetch(`musyawarah?level=eq.${level}&select=*,anggota(nama_lengkap)&order=tanggal.desc`),
  getByKelompok: (kid) => sbFetch(`musyawarah?kelompok_id=eq.${kid}&select=*,anggota(nama_lengkap)&order=tanggal.desc`),
  getByDesa: (desa) => sbFetch(`musyawarah?desa_id=eq.${encodeURIComponent(desa)}&select=*,anggota(nama_lengkap)&order=tanggal.desc`),
  insert: (data) => sbFetch('musyawarah', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }),
  update: (id, data) => sbFetch(`musyawarah?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(data) }),
  delete: (id) => sbFetch(`musyawarah?id=eq.${id}`, { method:'DELETE' }),
};

// ============ MUSYAWARAH PESERTA ============
const sbMusPeserta = {
  getByKelompok: (kid) =>
    sbFetch(`musyawarah_peserta?kelompok_id=eq.${kid}&aktif=eq.true&order=urutan,nama&select=*`),
  getByDesa: (desaId) =>
    sbFetch(`musyawarah_peserta?desa_id=eq.${encodeURIComponent(desaId)}&aktif=eq.true&order=urutan,nama&select=*`),
  getByDaerah: () =>
    sbFetch(`musyawarah_peserta?level_daerah=eq.true&aktif=eq.true&order=urutan,nama&select=*`),
  insert: (data) => sbFetch('musyawarah_peserta', {
    method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data)
  }),
  update: (id, data) => sbFetch(`musyawarah_peserta?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(data) }),
  softDelete: (id) => sbFetch(`musyawarah_peserta?id=eq.${id}`, { method:'PATCH', body:JSON.stringify({aktif:false}) }),
};

// ============ MUSYAWARAH ABSENSI ============
const sbMusAbsensi = {
  getByMusyawarah: (musId) =>
    sbFetch(`musyawarah_absensi?musyawarah_id=eq.${musId}&select=*,musyawarah_peserta(nama,jabatan,no_hp,wa_link)&order=created_at`),
  upsertPeserta: (rows) => sbFetch('musyawarah_absensi?on_conflict=musyawarah_id,peserta_id', {
    method:'POST',
    headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(rows)
  }),
  insertTamu: (data) => sbFetch('musyawarah_absensi', {
    method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data)
  }),
  delete: (id) => sbFetch(`musyawarah_absensi?id=eq.${id}`, { method:'DELETE' }),
  deleteByMusyawarah: (musId) => sbFetch(`musyawarah_absensi?musyawarah_id=eq.${musId}`, { method:'DELETE' }),
};

// ============ SETTINGS ============
const sbSettings = {
  get: async (key) => {
    const d = await sbFetch(`settings?key=eq.${key}&select=value`);
    return d && d.length ? d[0].value : '';
  },
  set: (key, value) => sbFetch('settings', {
    method: 'POST',
    headers: {'Prefer': 'resolution=merge-duplicates'},
    body: JSON.stringify({ key, value })
  }),
};

// Export semua
window.SB = {
  login: sbLogin,
  anggota: sbUsers,
  kelompok: sbKelompok,
  desa: sbDesa,
  materi: sbMateri,
  kelas: sbKelas,
  santri: sbSantri,
  pertemuan: sbPertemuan,
  jurnal: sbJurnal,
  absensi: sbAbsensi,
  progress: sbProgress,
  settings: sbSettings,
  musyawarah: sbMusyawarah,
  musPeserta: sbMusPeserta,
  musAbsensi: sbMusAbsensi,
};
