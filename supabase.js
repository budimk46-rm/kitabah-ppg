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

// Hash password baru — pakai bcrypt (lib sudah dimuat di index.html), fallback SHA-256.
// Dipakai untuk ganti password (self-service maupun reset oleh admin), supaya
// password baru tidak pernah tersimpan plain text lagi.
async function hashPassword(plain) {
  if (window.dcodeIO && window.dcodeIO.bcrypt) {
    const salt = window.dcodeIO.bcrypt.genSaltSync(10);
    return window.dcodeIO.bcrypt.hashSync(plain, salt);
  }
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ============ USERS ============
const sbUsers = {
  getAll: () => sbFetch('anggota?select=id,username,password_hash,nama_lengkap,role,jabatan,status,kelompok_id,desa_id,akses_menu,akses_lintas,created_at&order=created_at.asc'),
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
  // "User Sedang Online" — heartbeat ringan + query yang aktif dalam N menit terakhir
  pingActive: (id) => sbFetch(`anggota?id=eq.${id}`, { method: 'PATCH', headers:{'Prefer':'return=minimal'}, body: JSON.stringify({ last_active: new Date().toISOString() }) }).catch(()=>{}),
  getOnline: (sinceIso) => sbFetch(`anggota?last_active=gte.${encodeURIComponent(sinceIso)}&status=eq.approved&select=id,nama_lengkap,role,kelompok_id,desa_id,last_active&order=last_active.desc`),
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
    // Dipecah 2 (per semester) — bukan 1 request raksasa (~1552 baris kurikulum
    // sekaligus bisa bikin proses JSON.parse di HP lemah kerasa macet lama),
    // dan bukan 16 request kecil-kecil (sisa cara lama yang malah bikin banyak
    // koneksi bersamaan nabrak batas server gratis).
    const [sem1, sem2] = await Promise.all([
      sbFetch(`materi?semester=eq.1&select=*&order=jenjang,id`),
      sbFetch(`materi?semester=eq.2&select=*&order=jenjang,id`),
    ]);
    return [...(sem1||[]), ...(sem2||[])];
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
    sbFetch(`kelas?kelompok_id=eq.${kelompokId}&select=id,kelompok_id,desa_id,nama_kelas,jenjang,semester&order=nama_kelas,jenjang,semester`),
  // Ambil kelas untuk BANYAK kelompok sekaligus dalam satu request
  getByKelompokIds: (kelompokIds) => {
    const ids = [...new Set(kelompokIds)].filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return sbFetch(`kelas?kelompok_id=in.(${ids.join(',')})&select=id,kelompok_id,desa_id,nama_kelas,jenjang,semester&order=nama_kelas,jenjang,semester`);
  },
  getByDesa: (desaId) =>
    sbFetch(`kelas?desa_id=eq.${desaId}&select=id,kelompok_id,desa_id,nama_kelas,jenjang,semester&order=nama_kelas,jenjang,semester`),
  insert: async (data) => {
    try {
      return await sbFetch('kelas', { method: 'POST', headers: {'Prefer':'return=representation'}, body: JSON.stringify(data) });
    } catch(e) {
      if (e.message && e.message.includes('409')) return [data];
      throw e;
    }
  },
  delete: (id) => sbFetch(`kelas?id=eq.${id}`, { method: 'DELETE' }),
  update: (id, data) => sbFetch(`kelas?id=eq.${id}`, { method: 'PATCH', headers:{'Prefer':'return=representation'}, body: JSON.stringify(data) }),
};

// ============ SANTRI ============
const sbSantri = {
  getByKelas: (kelasId) =>
    sbFetch(`santri?kelas_id=eq.${kelasId}&aktif=eq.true&select=*&order=nama`),
  // Ambil santri untuk BANYAK kelas sekaligus dalam satu request
  getByKelasIds: (kelasIds) => {
    const ids = [...new Set(kelasIds)].filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return sbFetch(`santri?kelas_id=in.(${ids.join(',')})&aktif=eq.true&select=*&order=nama`);
  },
  getUnassigned: (kelompokIds) => {
    const ids = [...new Set(Array.isArray(kelompokIds) ? kelompokIds : [kelompokIds])].filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return sbFetch(`santri?aktif=eq.true&kelas_id=is.null&kelompok_asal_id=in.(${ids.map(id=>`"${id}"`).join(',')})&select=*&order=nama`);
  },
  getByKelompok: (kelompokId) =>
    sbFetch(`santri?aktif=eq.true&select=*,kelas!inner(kelompok_id,jenjang,nama_kelas)&kelas.kelompok_id=eq.${kelompokId}&order=nama`),
  getAll: () =>
    sbFetch(`santri?aktif=eq.true&select=*,kelas(id,kelompok_id,desa_id,jenjang,nama_kelas,kelompok(nama,desa_id))&order=nama&limit=5000`),
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
  getByKelas: (kelasId, ta) =>
    sbFetch(`pertemuan?kelas_id=eq.${kelasId}${ta?'&tahun_ajaran=eq.'+encodeURIComponent(ta):''}&select=*&order=tanggal.desc`),
  // Ambil pertemuan untuk BANYAK kelas sekaligus dalam satu request
  getByKelasIds: (kelasIds, ta) => {
    const ids = [...new Set(kelasIds)].filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return sbFetch(`pertemuan?kelas_id=in.(${ids.join(',')})${ta?'&tahun_ajaran=eq.'+encodeURIComponent(ta):''}&select=*&order=tanggal.desc`);
  },
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
  insertMateri: (jurnalId, materiEntries, bulanTarget) => {
    // materiEntries: [{id, status}] — status 'tuntas' | 'belum_tuntas'
    const rows = materiEntries.map(m => ({ jurnal_id: jurnalId, materi_id: m.id, status: m.status || 'tuntas', bulan_target: bulanTarget }));
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
  // Ambil absensi untuk BANYAK pertemuan sekaligus dalam sedikit request (bukan satu per satu).
  // Dipecah per 150 id supaya URL tidak kepanjangan, tiap chunk jalan paralel.
  getByPertemuanIds: async (ids) => {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (!uniqueIds.length) return [];
    const CHUNK = 150;
    const chunks = [];
    for (let i = 0; i < uniqueIds.length; i += CHUNK) chunks.push(uniqueIds.slice(i, i + CHUNK));
    const results = await Promise.all(chunks.map(c =>
      sbFetch(`absensi?pertemuan_id=in.(${c.join(',')})&select=*,santri(nama)&order=santri(nama)`)
    ));
    return results.flat();
  },
  upsertBulk: (rows) => sbFetch('absensi?on_conflict=pertemuan_id,santri_id', {
    method: 'POST',
    headers: {'Prefer': 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify(rows)
  }),
};

// ============ PROGRESS ============
const sbProgress = {
  getByKelompok: (kelompokId, ta) =>
    sbFetch(`progress?kelompok_id=eq.${kelompokId}${ta?'&tahun_ajaran=eq.'+encodeURIComponent(ta):''}&select=*`),
  // Ambil progress untuk BANYAK kelompok sekaligus dalam satu request
  getByKelompokIds: (kelompokIds, ta) => {
    const ids = [...new Set(kelompokIds)].filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return sbFetch(`progress?kelompok_id=in.(${ids.join(',')})${ta?'&tahun_ajaran=eq.'+encodeURIComponent(ta):''}&select=*`);
  },
  toggle: async (kelompokId, materiId, bulan, userId, ta) => {
    const existing = await sbFetch(
      `progress?kelompok_id=eq.${kelompokId}&materi_id=eq.${encodeURIComponent(materiId)}&bulan=eq.${bulan}${ta?'&tahun_ajaran=eq.'+encodeURIComponent(ta):''}`
    );
    if (existing && existing.length > 0) {
      await sbFetch(`progress?id=eq.${existing[0].id}`, { method: 'DELETE' });
      return 'unchecked';
    } else {
      await sbFetch('progress', {
        method: 'POST',
        headers: {'Prefer':'resolution=ignore-duplicates'},
        body: JSON.stringify({ kelompok_id: kelompokId, materi_id: materiId, bulan, user_id: userId, tahun_ajaran: ta || null })
      });
      return 'checked';
    }
  },
  toggle_add: async (kelompokId, materiId, bulan, userId, ta) => {
    try {
      await sbFetch('progress', {
        method: 'POST',
        headers: {'Prefer':'resolution=ignore-duplicates'},
        body: JSON.stringify({ kelompok_id: kelompokId, materi_id: materiId, bulan, user_id: userId, tahun_ajaran: ta || null })
      });
    } catch(e) {}
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
  upsertPeserta: async (rows) => {
    // Supabase mungkin return 409, abaikan
    try {
      return await sbFetch('musyawarah_absensi?on_conflict=musyawarah_id,peserta_id', {
        method:'POST',
        headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(rows)
      });
    } catch(e) {
      if (e.message && e.message.includes('409')) return null;
      throw e;
    }
  },
  insertTamu: async (data) => {
    try {
      return await sbFetch('musyawarah_absensi', {
        method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data)
      });
    } catch(e) {
      if (e.message && e.message.includes('409')) {
        // Data mungkin sudah masuk, return dummy
        return [data];
      }
      throw e;
    }
  },
  delete: (id) => sbFetch(`musyawarah_absensi?id=eq.${id}`, { method:'DELETE' }),
  update: (id, data) => sbFetch(`musyawarah_absensi?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(data) }),
  deleteByMusyawarah: (musId) => sbFetch(`musyawarah_absensi?musyawarah_id=eq.${musId}`, { method:'DELETE' }),
};

// ============ MUSYAWARAH KONFIGURASI ============
const sbMusKonfig = {
  get: async (level, kelompokId, desaId) => {
    // Coba spesifik dulu
    let q = `musyawarah_konfigurasi?level_musyawarah=eq.${level}`;
    if (kelompokId) q += `&kelompok_id=eq.${kelompokId}`;
    else q += '&kelompok_id=is.null';
    if (desaId) q += `&desa_id=eq.${encodeURIComponent(desaId)}`;
    else q += '&desa_id=is.null';
    let res = await sbFetch(q + '&select=*&limit=1');
    if (res && res.length) return res;
    // Fallback: cari global (null/null)
    if (kelompokId || desaId) {
      const q2 = `musyawarah_konfigurasi?level_musyawarah=eq.${level}&kelompok_id=is.null&desa_id=is.null&select=*&limit=1`;
      res = await sbFetch(q2);
      if (res && res.length) return res;
    }
    return [];
  },
  upsert: async (data) => {
    // Manual upsert karena unique constraint dengan NULL gagal di PostgreSQL
    let q = `musyawarah_konfigurasi?level_musyawarah=eq.${data.level_musyawarah}`;
    if (data.kelompok_id) q += `&kelompok_id=eq.${data.kelompok_id}`;
    else q += '&kelompok_id=is.null';
    if (data.desa_id) q += `&desa_id=eq.${encodeURIComponent(data.desa_id)}`;
    else q += '&desa_id=is.null';
    const existing = await sbFetch(q + '&select=id&limit=1');
    if (existing && existing.length) {
      // Update
      return await sbFetch(`musyawarah_konfigurasi?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: {'Prefer':'return=representation'},
        body: JSON.stringify({ dapukan_wajib: data.dapukan_wajib, dibuat_oleh: data.dibuat_oleh, updated_at: data.updated_at }),
      });
    } else {
      // Insert
      return await sbFetch('musyawarah_konfigurasi', {
        method: 'POST',
        headers: {'Prefer':'return=representation'},
        body: JSON.stringify(data),
      });
    }
  },
};

// ============ PENILAIAN ============
const sbPenilaian = {
  getByKelas: (kelasId, bulan, ta) =>
    sbFetch(`penilaian?kelas_id=eq.${kelasId}&bulan=eq.${encodeURIComponent(bulan)}&tahun_ajaran=eq.${encodeURIComponent(ta)}&select=*`),
  getByKelompok: (klpId, bulan, ta) =>
    sbFetch(`penilaian?kelompok_id=eq.${klpId}&bulan=eq.${encodeURIComponent(bulan)}&tahun_ajaran=eq.${encodeURIComponent(ta)}&select=*`),
  upsert: (data) =>
    sbFetch('penilaian', { method:'POST', headers:{'Prefer':'return=representation,resolution=merge-duplicates'}, body:JSON.stringify(data) }),
};

// ============ SARPRAS ============
const sbSarpras = {
  getByKelompok: (klpId) => sbFetch(`sarpras?kelompok_id=eq.${klpId}&select=*&order=created_at`),
  getAll: () => sbFetch('sarpras?select=*&order=kelompok_id,created_at&limit=5000'),
  insert: async (data) => {
    try { return await sbFetch('sarpras', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }); }
    catch(e) { if (e.message?.includes('409')) return [data]; throw e; }
  },
  update: (id, data) => sbFetch(`sarpras?id=eq.${id}`, { method:'PATCH', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }),
  delete: (id) => sbFetch(`sarpras?id=eq.${id}`, { method:'DELETE' }),
};

// ============ MT/MS ============
const sbMtMs = {
  getByKelompok: (klpId) => sbFetch(`mt_ms?kelompok_id=eq.${klpId}&select=*&order=nama_lengkap`),
  getAll: () => sbFetch('mt_ms?select=*&order=nama_lengkap&limit=5000'),
  insert: async (data) => {
    try { return await sbFetch('mt_ms', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }); }
    catch(e) { if (e.message?.includes('409')) return [data]; throw e; }
  },
  update: (id, data) => sbFetch(`mt_ms?id=eq.${id}`, { method:'PATCH', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }),
  delete: (id) => sbFetch(`mt_ms?id=eq.${id}`, { method:'DELETE' }),
};

// ============ DATA GURU SEKOLAH ============
const sbGuruSekolah = {
  getByKelompok: (klpId) => sbFetch(`guru_sekolah?kelompok_id=eq.${klpId}&select=*&order=nama_lengkap`),
  getAll: () => sbFetch('guru_sekolah?select=*&order=nama_lengkap&limit=5000'),
  insert: async (data) => {
    try { return await sbFetch('guru_sekolah', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }); }
    catch(e) { if (e.message?.includes('409')) return [data]; throw e; }
  },
  update: (id, data) => sbFetch(`guru_sekolah?id=eq.${id}`, { method:'PATCH', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }),
  delete: (id) => sbFetch(`guru_sekolah?id=eq.${id}`, { method:'DELETE' }),
};

// ============ PROGRAM KERJA ============
const sbProker = {
  getAll: (tahun) => sbFetch(`program_kerja?tahun=eq.${tahun}&select=*&order=bidang,bulan_mulai`),
  insert: async (data) => {
    try { return await sbFetch('program_kerja', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }); }
    catch(e) { if (e.message?.includes('409')) return [data]; throw e; }
  },
  update: (id, data) => sbFetch(`program_kerja?id=eq.${id}`, { method:'PATCH', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }),
  delete: (id) => sbFetch(`program_kerja?id=eq.${id}`, { method:'DELETE' }),
};

const sbLaporan = {
  getByProgram: (prokerId) => sbFetch(`laporan_kegiatan?program_kerja_id=eq.${prokerId}&select=*&order=tanggal_kegiatan.desc`),
  getAll: (tahun) => sbFetch(`laporan_kegiatan?select=*,program_kerja!inner(tahun)&program_kerja.tahun=eq.${tahun}&order=tanggal_kegiatan.desc`),
  insert: async (data) => {
    try { return await sbFetch('laporan_kegiatan', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }); }
    catch(e) { if (e.message?.includes('409')) return [data]; throw e; }
  },
  update: (id, data) => sbFetch(`laporan_kegiatan?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(data) }),
  delete: (id) => sbFetch(`laporan_kegiatan?id=eq.${id}`, { method:'DELETE' }),
};

const sbSumberDana = {
  getAll: (tahun) => sbFetch(`sumber_dana?tahun=eq.${tahun}&select=*&order=created_at`),
  insert: async (data) => {
    try { return await sbFetch('sumber_dana', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }); }
    catch(e) { if (e.message?.includes('409')) return [data]; throw e; }
  },
  update: (id, data) => sbFetch(`sumber_dana?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(data) }),
  delete: (id) => sbFetch(`sumber_dana?id=eq.${id}`, { method:'DELETE' }),
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

// ============ FORM SUBMISSIONS (link publik tanpa login) ============
const sbFormSubmissions = {
  insert: (data) => sbFetch('form_submissions', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }),
  getPending: (jenis, kelompokId) =>
    sbFetch(`form_submissions?jenis=eq.${jenis}&kelompok_id=eq.${kelompokId}&status=eq.pending&select=*&order=created_at.asc`),
  // Versi umum — bisa scoped ke kelompok, desa, atau daerah
  getPendingScoped: (jenis, scopeType, scopeRef) => {
    let filter = `jenis=eq.${jenis}&status=eq.pending`;
    if (scopeType === 'kelompok') filter += `&kelompok_id=eq.${scopeRef}`;
    else if (scopeType === 'desa') filter += `&desa_id=eq.${scopeRef}`;
    else filter += `&level_daerah=eq.true`;
    return sbFetch(`form_submissions?${filter}&select=*&order=created_at.asc`);
  },
  updateStatus: (id, data) => sbFetch(`form_submissions?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(data) }),
};

// ============ LIVE CHAT ============
const sbChat = {
  getRecent: (limit=100) => sbFetch(`chat_messages?select=*&order=created_at.desc&limit=${limit}`),
  getSince: (sinceIso) => sbFetch(`chat_messages?created_at=gt.${encodeURIComponent(sinceIso)}&select=*&order=created_at.asc`),
  // Query ringan — cuma ambil waktu pesan terakhir, dipakai untuk badge notifikasi (bukan isi pesan)
  getLatestTimestamp: () => sbFetch(`chat_messages?select=created_at&order=created_at.desc&limit=1`),
  insert: (data) => sbFetch('chat_messages', { method:'POST', headers:{'Prefer':'return=representation'}, body:JSON.stringify(data) }),
};

// ============ RAPORT CABERAWIT ============
const sbMateriRaport = {
  getByJenjangSemester: (jenjang, semester) =>
    sbFetch(`materi_raport?jenjang=eq.${encodeURIComponent(jenjang)}&semester=eq.${semester}&select=*&order=urutan`),
  // Ambil materi untuk BANYAK jenjang sekaligus (dipakai rekap lintas kelas/kelompok)
  getByJenjangListSemester: (jenjangList, semester) => {
    const list = [...new Set(jenjangList)].filter(Boolean);
    if (!list.length) return Promise.resolve([]);
    const inList = list.map(j => `"${j}"`).join(',');
    return sbFetch(`materi_raport?jenjang=in.(${inList})&semester=eq.${semester}&select=*&order=urutan`);
  },
};
const sbRaportNilai = {
  getBySantri: (santriId, semester, ta) =>
    sbFetch(`raport_nilai?santri_id=eq.${santriId}&semester=eq.${semester}&tahun_ajaran=eq.${encodeURIComponent(ta)}&select=*`),
  // Ambil nilai untuk BANYAK santri sekaligus (dipakai rekap kelompok/desa/daerah)
  getBySantriIds: (santriIds, semester, ta) => {
    const ids = [...new Set(santriIds)].filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return sbFetch(`raport_nilai?santri_id=in.(${ids.join(',')})&semester=eq.${semester}&tahun_ajaran=eq.${encodeURIComponent(ta)}&select=*`);
  },
  upsertBulk: (rows) => sbFetch('raport_nilai?on_conflict=santri_id,materi_raport_id,semester,tahun_ajaran', {
    method: 'POST',
    headers: {'Prefer': 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify(rows)
  }),
};
const sbRaportCatatan = {
  get: (santriId, semester, ta) =>
    sbFetch(`raport_catatan?santri_id=eq.${santriId}&semester=eq.${semester}&tahun_ajaran=eq.${encodeURIComponent(ta)}&select=*`),
  upsert: (data) => sbFetch('raport_catatan?on_conflict=santri_id,semester,tahun_ajaran', {
    method: 'POST',
    headers: {'Prefer': 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify(data)
  }),
};

// ============ ACTIVITY LOG ============
// ============ NAV LOG (klik menu, dasar laporan User Tidak Aktif) ============
const sbNavLog = {
  insert: (userId) => sbFetch('user_nav_log', { method:'POST', headers:{'Prefer':'return=minimal'}, body: JSON.stringify({ user_id: userId }) }).catch(()=>{}),
  getInRange: (startIso, endIso) =>
    sbFetch(`user_nav_log?created_at=gte.${encodeURIComponent(startIso)}&created_at=lt.${encodeURIComponent(endIso)}&select=user_id`),
};

// ============ DATA JAMAAH ============
const sbJamaah = {
  getByKelompok: (kid) => sbFetch(`jamaah?kelompok_id=eq.${kid}&aktif=eq.true&select=*&order=nama`),
  getByKelompokIds: (ids) => {
    const list = [...new Set(ids)].filter(Boolean);
    if (!list.length) return Promise.resolve([]);
    return sbFetch(`jamaah?kelompok_id=in.(${list.join(',')})&aktif=eq.true&select=*&order=nama`);
  },
  insert: async (data) => {
    try { return await sbFetch('jamaah', { method:'POST', headers:{'Prefer':'return=representation'}, body: JSON.stringify(data) }); }
    catch(e) { if (e.message?.includes('409')) return [data]; throw e; }
  },
  update: (id, data) => sbFetch(`jamaah?id=eq.${id}`, { method:'PATCH', headers:{'Prefer':'return=representation'}, body: JSON.stringify(data) }),
  softDelete: (id) => sbFetch(`jamaah?id=eq.${id}`, { method:'PATCH', body: JSON.stringify({ aktif: false }) }),
};

// ============ TAUTAN KELUARGA JAMAAH ============
const sbJamaahKeluarga = {
  getByJamaah: (jamaahId) => sbFetch(`jamaah_keluarga?jamaah_id=eq.${jamaahId}&select=*`),
  getBySantriIds: (santriIds) => {
    const ids = [...new Set(santriIds)].filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    return sbFetch(`jamaah_keluarga?santri_id=in.(${ids.join(',')})&select=*`);
  },
  insertBulk: (rows) => {
    if (!rows.length) return Promise.resolve(null);
    return sbFetch('jamaah_keluarga', { method:'POST', headers:{'Prefer':'return=minimal,resolution=ignore-duplicates'}, body: JSON.stringify(rows) });
  },
  deleteByIds: (ids) => {
    if (!ids.length) return Promise.resolve(null);
    return sbFetch(`jamaah_keluarga?id=in.(${ids.join(',')})`, { method:'DELETE' });
  },
};

const sbActivityLog = {
  insert: (data) => sbFetch('activity_log', { method:'POST', headers:{'Prefer':'return=minimal'}, body:JSON.stringify(data) }).catch(e => console.error('Gagal simpan activity_log:', e)),
  getAll: (limit=300) => sbFetch(`activity_log?select=*&order=created_at.desc&limit=${limit}`),
  getByUser: (userId, limit=300) => sbFetch(`activity_log?user_id=eq.${userId}&select=*&order=created_at.desc&limit=${limit}`),
  deleteRange: (fromIso, toIso) => sbFetch(`activity_log?created_at=gte.${fromIso}&created_at=lte.${toIso}`, { method:'DELETE' }),
  deleteAll: () => sbFetch(`activity_log?id=not.is.null`, { method:'DELETE' }),
  getLoginsInRange: (startIso, endIso) =>
    sbFetch(`activity_log?action=eq.login&created_at=gte.${encodeURIComponent(startIso)}&created_at=lt.${encodeURIComponent(endIso)}&select=user_id,created_at`),
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
  musKonfig: sbMusKonfig,
  proker: sbProker,
  laporan: sbLaporan,
  sumberDana: sbSumberDana,
  mtMs: sbMtMs,
  guruSekolah: sbGuruSekolah,
  sarpras: sbSarpras,
  penilaian: sbPenilaian,
  activityLog: sbActivityLog,
  materiRaport: sbMateriRaport,
  raportNilai: sbRaportNilai,
  raportCatatan: sbRaportCatatan,
  chat: sbChat,
  navLog: sbNavLog,
  jamaah: sbJamaah,
  jamaahKeluarga: sbJamaahKeluarga,
  formSubmissions: sbFormSubmissions,
};
