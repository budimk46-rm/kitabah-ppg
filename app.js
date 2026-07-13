/* ============================================================
   KITABAH v2 — app.js
   Supabase-based, PWA-ready
   ============================================================ */

const SEM1_MONTHS = ['Juli','Agustus','September','Oktober','November','Desember'];
const SEM2_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni'];
const JENJANG_ORDER = ['PAUD TK','SD 1','SD 2','SD 3','SD 4','SD 5','SD 6',
  'SMP 1','SMP 2','SMP 3','SMA 1','SMA 2','SMA 3','PRA 1','PRA 2','PRA 3','PRA 4'];

const ROLE_LABELS = {
  admin: 'Administrator',
  daerah: 'Level Daerah',
  desa: 'Level Desa',
  pjp_kelompok: 'PJP Kelompok',
  wali_kbm: 'Wali KBM',
  guru: 'Guru Generus',
  kelompok: 'Pengelola Kelompok',
};

const TINGKATAN_LABELS = {
  caberawit: 'Caberawit',
  pra_remaja: 'Pra Remaja',
  remaja: 'Remaja',
  pra_nikah: 'Pra Nikah',
};

const TINGKATAN_COLORS = {
  caberawit: 'badge-green',
  pra_remaja: 'badge-gold',
  remaja: 'badge-rose',
  pra_nikah: 'badge-gray',
};

// Hitung tingkatan otomatis dari tanggal lahir
// Tahun ajaran mulai Juli — usia dihitung per 1 Juli tahun berjalan
function hitungTingkatan(tglLahir) {
  if (!tglLahir) return '';
  const lahir = new Date(tglLahir);
  const refDate = new Date();
  // Referensi: 1 Juli tahun berjalan
  const juli = new Date(refDate.getFullYear(), 6, 1);
  let usia = juli.getFullYear() - lahir.getFullYear();
  const bulanLahir = lahir.getMonth();
  const tglLahirNum = lahir.getDate();
  if (bulanLahir > 6 || (bulanLahir === 6 && tglLahirNum > 1)) usia--;
  if (usia < 13) return 'caberawit';
  if (usia < 16) return 'pra_remaja';
  if (usia < 19) return 'remaja';
  return 'pra_nikah';
}

// Hitung usia saat ini
function hitungUsia(tglLahir) {
  if (!tglLahir) return null;
  const lahir = new Date(tglLahir);
  const now = new Date();
  let usia = now.getFullYear() - lahir.getFullYear();
  if (now.getMonth() < lahir.getMonth() ||
     (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate())) {
    usia--;
  }
  return usia;
}

// Hitung generus yang akan naik level tahun depan (per 1 Juli tahun depan)
function hitungNaikLevel(tglLahir) {
  if (!tglLahir) return null;
  const lahir = new Date(tglLahir);
  const tahunDepan = new Date().getFullYear() + 1;
  const juli = new Date(tahunDepan, 6, 1);
  let usia = juli.getFullYear() - lahir.getFullYear();
  if (lahir.getMonth() > 6 || (lahir.getMonth() === 6 && lahir.getDate() > 1)) usia--;
  // Usia kritis yang menandai naik level
  if (usia === 7)  return 'Masuk SD';
  if (usia === 13) return 'Naik Pra Remaja';
  if (usia === 16) return 'Naik Remaja';
  if (usia === 19) return 'Naik Pra Nikah';
  return null;
}

// PPG Logo sebagai Base64 mini placeholder — diganti nanti dengan logo asli
const LOGO_PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><circle cx="30" cy="30" r="30" fill="%231B3A2C"/><text x="30" y="38" text-anchor="middle" fill="%23C19A4B" font-size="20" font-family="Arial" font-weight="bold">PPG</text></svg>';

/* ===== APP STATE ===== */
// Tentukan bulan dan semester berjalan
const _nowMonth = new Date().getMonth(); // 0=Jan, 6=Jul
const _SEM1_M = ['Juli','Agustus','September','Oktober','November','Desember'];
const _SEM2_M = ['Januari','Februari','Maret','April','Mei','Juni'];
const _defaultSem = _nowMonth >= 6 ? '1' : '2'; // Juli(6)-Des(11)=Sem1, Jan(0)-Jun(5)=Sem2
const _defaultMonth = _nowMonth >= 6 ? _SEM1_M[_nowMonth - 6] : _SEM2_M[_nowMonth];

const App = {
  user: null,
  session: null,
  currentPage: 'dashboard',
  kurState: {
    jenjang: 'PAUD TK',
    sem: _defaultSem,
    month: _defaultMonth,
    search: '',
  },
  cache: {
    materi: null,
    kelompok: null,
    desa: null,
    myProgress: null,
  },
};

/* ===== SESSION ===== */
function saveSession(user) {
  try { localStorage.setItem('kitabah_session', JSON.stringify(user)); } catch(e) {}
  App.user = user;
}
function loadSession() {
  try {
    const s = localStorage.getItem('kitabah_session');
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}
function clearSession() {
  try { localStorage.removeItem('kitabah_session'); } catch(e) {}
  App.user = null;
  App.cache = { materi: null, kelompok: null, desa: null, myProgress: null };
}

/* ===== UTILITIES ===== */
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Capitalize setiap awal kata — dipakai untuk nama generus dan nama ortu
function toTitleCase(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
}
function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
}
function currentMonthName() {
  return new Date().toLocaleDateString('id-ID', {month:'long'});
}
function currentSemester() {
  const m = new Date().getMonth() + 1; // 1-12
  return (m >= 7 || m <= 6) ? (m >= 7 ? '1' : '2') : '1';
}
function monthsForSemester(sem) {
  return sem === '1' ? SEM1_MONTHS : SEM2_MONTHS;
}

let toastTimer;
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function showLoading(show = true) {
  document.getElementById('loadingOverlay').classList.toggle('show', show);
}

function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

/* ===== SCREENS ===== */
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('pendingScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginLogo').src = LOGO_PLACEHOLDER;
}
function showPending(username, namaLengkap) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('pendingScreen').style.display = 'flex';
  document.getElementById('pendingUsername').textContent = username;
  loadPendingWaBtn(username, namaLengkap);
}
function showShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('pendingScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  renderNav();
  navigate('dashboard');
}

async function loadPendingWaBtn(username, namaLengkap) {
  try {
    const wa = await SB.settings.get('admin_whatsapp');
    if (!wa) return;
    let num = wa.replace(/[^0-9]/g, '');
    if (num.startsWith('0')) num = '62' + num.slice(1);
    const msg = `Halo Admin Kitabah, saya ${namaLengkap} (username: ${username}) baru mendaftar. Mohon diperiksa. Terima kasih.`;
    const btn = document.getElementById('pendingWaBtn');
    btn.style.display = 'flex';
    btn.onclick = () => window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  } catch(e) {}
}

/* ===== AUTH ===== */
async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const alertEl = document.getElementById('loginAlert');
  alertEl.innerHTML = '';
  if (!username || !password) return;

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Memeriksa...';

  try {
    const user = await SB.login(username, password);
    saveSession(user);
    showShell();
  } catch(e) {
    if (e.message === 'PENDING') {
      showPending(username, username);
    } else if (e.message === 'REJECTED') {
      alertEl.innerHTML = '<div class="alert error">Pendaftaran ditolak. Hubungi admin.</div>';
    } else {
      alertEl.innerHTML = `<div class="alert error">${escHtml(e.message)}</div>`;
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
}

async function doRegister() {
  const tipe = document.getElementById('regTipe').value;
  const namaLengkap = document.getElementById('regNama').value.trim();
  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  const kelompokId = document.getElementById('regKelompok').value;
  const desaId = document.getElementById('regDesa').value;
  const alertEl = document.getElementById('loginAlert');
  alertEl.innerHTML = '';

  if (!namaLengkap || !username || !password) {
    alertEl.innerHTML = '<div class="alert error">Semua field wajib diisi.</div>'; return;
  }
  if (password.length < 6) {
    alertEl.innerHTML = '<div class="alert error">Kata sandi minimal 6 karakter.</div>'; return;
  }
  if (['kelompok','pjp_kelompok','wali_kbm','guru'].includes(tipe) && !kelompokId) {
    alertEl.innerHTML = '<div class="alert error">Silakan pilih kelompok.</div>'; return;
  }
  if (tipe === 'desa' && !desaId) {
    alertEl.innerHTML = '<div class="alert error">Silakan pilih desa.</div>'; return;
  }

  const btn = document.getElementById('regBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Mendaftarkan...';

  try {
    // Cek username unik
    const existing = await SB.users.getAll();
    if (existing.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      alertEl.innerHTML = '<div class="alert error">Nama pengguna sudah dipakai.</div>';
      return;
    }

    const roleMap = {
      umum: 'kelompok', kelompok: 'kelompok', pjp_kelompok: 'pjp_kelompok',
      wali_kbm: 'wali_kbm', guru: 'guru', desa: 'desa', daerah: 'daerah',
    };

    await SB.users.register({
      username: username.toLowerCase(),
      password_hash: password, // stored plain for now, app-level check
      nama_lengkap: namaLengkap,
      role: roleMap[tipe] || 'kelompok',
      status: 'pending',
      kelompok_id: kelompokId || null,
      desa_id: desaId || null,
    });

    showPending(username, namaLengkap);
  } catch(e) {
    alertEl.innerHTML = `<div class="alert error">${escHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Daftar';
  }
}

function doLogout() {
  clearSession();
  showLogin();
}

/* ===== NAVIGATION ===== */
function SVG(d, w=18) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="${w}" height="${w}">${d}</svg>`; }
function gridIcon() { return SVG('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'); }
function bookIcon() { return SVG('<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>'); }
function calIcon() { return SVG('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'); }
function usersIcon() { return SVG('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'); }
function userIcon() { return SVG('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>'); }
function checkIcon() { return SVG('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>'); }
function chartIcon() { return SVG('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'); }
function cogIcon() { return SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>'); }

const NAV_ITEMS = {
  admin: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum & Materi', section: 'KONTEN' },
    { id: 'absensi', icon: calIcon(), label: 'Absensi & Jurnal' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'KELOLA' },
    { id: 'users', icon: userIcon(), label: 'Kelola Pengguna' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  daerah: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard Daerah' },
    { id: 'rekap_daerah', icon: chartIcon(), label: 'Rekap Semua Desa' },
  ],
  desa: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard Desa' },
    { id: 'rekap_desa', icon: chartIcon(), label: 'Rekap Kelompok' },
  ],
  pjp_kelompok: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN' },
    { id: 'progress', icon: checkIcon(), label: 'Progress Materi' },
    { id: 'absensi', icon: calIcon(), label: 'Absensi & Jurnal' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'KELOLA' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM' },
  ],
  wali_kbm: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM' },
  ],
  guru: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum Kelas Saya' },
    { id: 'absensi', icon: calIcon(), label: 'Input Absensi & Jurnal' },
  ],
  kelompok: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum' },
    { id: 'progress', icon: checkIcon(), label: 'Progress Materi' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap Progress' },
  ],
};

function renderNav() {
  const u = App.user;
  const items = NAV_ITEMS[u.role] || NAV_ITEMS.kelompok;
  document.getElementById('navUserName').textContent = u.nama_lengkap;
  document.getElementById('navUserRole').textContent = ROLE_LABELS[u.role] || u.role;
  document.getElementById('navAvatar').textContent = u.nama_lengkap.charAt(0).toUpperCase();

  let html = '';
  let lastSection = null;
  items.forEach(item => {
    if (item.section && item.section !== lastSection) {
      html += `<div class="nav-section-title">${escHtml(item.section)}</div>`;
      lastSection = item.section;
    }
    html += `<div class="nav-item" data-page="${item.id}" onclick="navigate('${item.id}')">
      ${item.icon} <span>${escHtml(item.label)}</span>
    </div>`;
  });
  document.getElementById('sidebarNav').innerHTML = html;
}

function navigate(page) {
  App.currentPage = page;
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  // Render page
  renderPage(page);
}

/* ===== PAGE ROUTER ===== */
async function renderPage(page) {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  try {
    switch(page) {
      case 'dashboard':   await renderDashboard(); break;
      case 'kurikulum':   await renderKurikulum(); break;
      case 'progress':    await renderProgress(); break;
      case 'absensi':     await renderAbsensi(); break;
      case 'santri':      await renderSantri(); break;
      case 'users':       await renderUsers(); break;
      case 'settings':    await renderSettings(); break;
      case 'rekap':       await renderRekap(); break;
      case 'rekap_desa':  await renderRekapDesa(); break;
      case 'rekap_daerah': await renderRekapDaerah(); break;
      default: main.innerHTML = '<div class="empty-state"><p>Halaman tidak ditemukan.</p></div>';
    }
  } catch(e) {
    main.innerHTML = `<div class="card"><p class="color-soft">Terjadi kesalahan: ${escHtml(e.message)}</p></div>`;
    console.error(e);
  }
}

/* ===== PAGE: DASHBOARD ===== */
async function renderDashboard() {
  const u = App.user;
  const main = document.getElementById('mainContent');

  // Load data sesuai role
  let stats = {};
  if (u.role === 'admin') {
    const [allUsers, allKelompok] = await Promise.all([SB.users.getAll(), SB.kelompok.getAll()]);
    const pending = allUsers.filter(x => x.status === 'pending');
    stats = {
      totalUser: allUsers.length,
      pending: pending.length,
      kelompok: allKelompok.length,
    };
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  let statsHtml = '';
  if (u.role === 'admin') {
    statsHtml = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-num">${stats.totalUser}</div>
          <div class="stat-label">Total Pengguna</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:${stats.pending > 0 ? 'var(--rose)' : 'var(--green)'};">${stats.pending}</div>
          <div class="stat-label">Menunggu Approve</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">31</div>
          <div class="stat-label">Total Kelompok</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">1.552</div>
          <div class="stat-label">Item Materi</div>
        </div>
      </div>
      ${stats.pending > 0 ? `
        <div class="card" style="border-left:4px solid var(--gold); background:var(--gold-soft);">
          <div class="flex items-center justify-between">
            <div>
              <div class="fw-bold" style="color:var(--green);">Ada ${stats.pending} pendaftar menunggu persetujuan</div>
              <div class="text-sm color-soft">Buka menu Kelola Pengguna untuk menyetujui atau menolak</div>
            </div>
            <button class="btn btn-gold btn-sm" onclick="navigate('users')">Lihat →</button>
          </div>
        </div>` : ''}
    `;
  }

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${greeting()}, ${escHtml(u.nama_lengkap.split(' ')[0])}!</h1>
        <p class="page-subtitle">${escHtml(ROLE_LABELS[u.role] || '')} · Bulan ${escHtml(currentMonthName())} ${new Date().getFullYear()}</p>
      </div>
    </div>
    ${statsHtml}
    <div class="card">
      <div class="fw-bold" style="font-size:15px; margin-bottom:12px; color:var(--green);">Menu Cepat</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px,1fr)); gap:10px;">
        ${getQuickMenuItems().map(item => `
          <button onclick="navigate('${item.page}')"
            style="padding:14px 10px; background:var(--cream-2); border-radius:var(--radius); border:1.5px solid var(--line); text-align:center; cursor:pointer; transition:all .15s;"
            onmouseover="this.style.borderColor='var(--green)'; this.style.background='var(--green-soft)'"
            onmouseout="this.style.borderColor='var(--line)'; this.style.background='var(--cream-2)'">
            <div style="font-size:22px; margin-bottom:6px;">${item.emoji}</div>
            <div style="font-size:12px; font-weight:700; color:var(--green);">${escHtml(item.label)}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function getQuickMenuItems() {
  const u = App.user;
  const all = [
    { page: 'kurikulum', emoji: '📖', label: 'Kurikulum', roles: ['admin','kelompok','pjp_kelompok','wali_kbm','guru'] },
    { page: 'absensi', emoji: '📋', label: 'Absensi & Jurnal', roles: ['admin','guru','pjp_kelompok'] },
    { page: 'santri', emoji: '👥', label: 'Data Santri', roles: ['admin','kelompok','pjp_kelompok'] },
    { page: 'progress', emoji: '✅', label: 'Progress Materi', roles: ['admin','kelompok','pjp_kelompok'] },
    { page: 'users', emoji: '⚙️', label: 'Kelola Pengguna', roles: ['admin'] },
    { page: 'rekap', emoji: '📊', label: 'Rekap KBM', roles: ['admin','kelompok','pjp_kelompok','wali_kbm'] },
    { page: 'rekap_desa', emoji: '🏡', label: 'Rekap Desa', roles: ['admin','desa'] },
    { page: 'rekap_daerah', emoji: '🗺️', label: 'Rekap Daerah', roles: ['admin','daerah'] },
  ];
  return all.filter(x => x.roles.includes(u.role));
}

/* ===== PAGE: KURIKULUM ===== */
async function renderKurikulum() {
  const main = document.getElementById('mainContent');
  if (!App.cache.materi) {
    App.cache.materi = await SB.materi.getAll();
  }
  const rows = App.cache.materi;

  // Ambil progress kalau role kelompok
  let progressSet = new Set();
  if (App.user.role === 'kelompok' && App.user.kelompok_id) {
    const prog = await SB.progress.getByKelompok(App.user.kelompok_id);
    progressSet = new Set(prog.map(p => p.materi_id + '|' + p.bulan));
    App.cache.myProgress = { set: progressSet, raw: prog };
  }

  // Gunakan App.kurState supaya state tidak terjebak di closure lama
  const ks = App.kurState;

  function render() {
    const currentJenjang = ks.jenjang;
    const currentSem = ks.sem;
    const currentMonth = ks.month;
    const searchQ = ks.search;
    const isAdmin = App.user.role === 'admin';
    const isKelompok = App.user.role === 'kelompok' || App.user.role === 'pjp_kelompok';
    const months = currentSem === '1' ? SEM1_MONTHS : SEM2_MONTHS;
    const monthsToShow = currentMonth ? [currentMonth] : months;

    let filtered = rows.filter(r =>
      r.jenjang === currentJenjang &&
      String(r.semester) === String(currentSem)
    );
    if (searchQ) {
      const q = searchQ.toLowerCase();
      filtered = filtered.filter(r =>
        [r.topik, r.poin_title, r.bab_title, r.sub_title, ...monthsToShow.map(m => r[m.toLowerCase()])].join(' ').toLowerCase().includes(q)
      );
    }

    const jenjangSidebarHtml = JENJANG_ORDER.map(j => {
      const cnt = rows.filter(r => r.jenjang === j && String(r.semester) === String(currentSem)).length;
      const isActive = j === currentJenjang;
      return `<div onclick="KUR_setJenjang('${j.replace(/'/g,"\\'")}'"
        style="display:flex; align-items:center; justify-content:space-between;
          padding:9px 12px; border-radius:8px; cursor:pointer; margin-bottom:2px;
          background:${isActive ? 'var(--green)' : 'transparent'};
          color:${isActive ? '#fff' : 'var(--ink)'};
          font-size:13px; font-weight:${isActive ? '700' : '600'};
          transition:all .15s;"
        onmouseover="if(this.dataset.active!=='1'){this.style.background='var(--green-soft)';this.style.color='var(--green)';}"
        onmouseout="if(this.dataset.active!=='1'){this.style.background='transparent';this.style.color='var(--ink)';}"
        data-active="${isActive ? '1' : '0'}">
        <span>${escHtml(j)}</span>
        <span style="font-size:11px; opacity:.6; font-weight:600;">${cnt}</span>
      </div>`;
    }).join('');

    // Group by bab
    const groups = {};
    const babOrder = [];
    filtered.forEach(r => {
      const k = (r.bab || '-') + '||' + (r.bab_title || '');
      if (!groups[k]) { groups[k] = { bab: r.bab, title: r.bab_title, subs: {}, subOrder: [] }; babOrder.push(k); }
      const sk = (r.sub || '-') + '||' + (r.sub_title || '');
      if (!groups[k].subs[sk]) { groups[k].subs[sk] = { sub: r.sub, title: r.sub_title, items: [] }; groups[k].subOrder.push(sk); }
      groups[k].subs[sk].items.push(r);
    });

    let cardsHtml = '';
    babOrder.forEach(bk => {
      const g = groups[bk];
      cardsHtml += `<div style="margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; padding-bottom:8px; border-bottom:2px solid var(--green);">
          <div style="width:28px; height:28px; background:var(--green); border-radius:7px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:800; flex-shrink:0;">${escHtml(g.bab || '•')}</div>
          <span style="font-family:var(--font-display); font-size:16px; font-weight:700; color:var(--green); text-transform:uppercase;">${escHtml(g.title || '')}</span>
        </div>`;
      g.subOrder.forEach(sk => {
        const sg = g.subs[sk];
        if (sg.sub) {
          cardsHtml += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; margin-left:6px;">
            <div style="width:20px; height:20px; background:var(--gold-soft); border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#8a6a24;">${escHtml(sg.sub)}</div>
            <span style="font-size:13px; font-weight:800; color:var(--ink);">${escHtml(sg.title || '')}</span>
          </div>`;
        }
        sg.items.forEach(item => {
          const monthsHtml = monthsToShow.map(m => {
            const col = m.toLowerCase();
            const val = item[col] || '';
            const checked = isKelompok && progressSet.has(item.id + '|' + m);
            return `<div style="padding:10px 13px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); ${checked ? 'background:var(--green-soft);' : ''}">
              <div style="font-size:9.5px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:var(--gold); margin-bottom:4px;">${m}</div>
              <div style="font-size:12.5px; color:${val ? 'var(--ink)' : 'var(--ink-soft)'}; font-style:${val ? 'normal' : 'italic'};">${escHtml(val || 'Belum diisi')}</div>
              ${isKelompok ? `<label style="display:flex; align-items:center; gap:6px; margin-top:8px; padding-top:8px; border-top:1px dashed var(--line); cursor:pointer;">
                <input type="checkbox" ${checked ? 'checked' : ''}
                  onchange="KUR_toggleProgress('${escHtml(item.id)}','${m}', this)"
                  style="width:15px; height:15px; accent-color:var(--green); cursor:pointer;">
                <span style="font-size:11.5px; font-weight:700; color:${checked ? 'var(--green)' : 'var(--ink-soft)'};">Sudah Disampaikan</span>
              </label>` : ''}
            </div>`;
          }).join('');

          const actionsHtml = isAdmin ? `
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button class="btn-icon" onclick="KUR_edit('${escHtml(item.id)}')" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
              </button>
              <button class="btn-icon danger" onclick="KUR_delete('${escHtml(item.id)}','${escHtml(item.topik || '')}')" title="Hapus">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>` : '';

          cardsHtml += `<div style="background:var(--white); border:1px solid var(--line); border-radius:var(--radius); margin-bottom:10px; overflow:hidden; box-shadow:var(--shadow);">
            <div style="display:flex; align-items:flex-start; gap:10px; padding:12px 14px; background:var(--cream-2); border-bottom:1px solid var(--line);">
              <div style="width:24px; height:24px; border-radius:6px; background:var(--white); border:1.5px solid var(--green); color:var(--green); font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${item.no ?? '•'}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-weight:800; font-size:13.5px; color:var(--green);">${escHtml(item.topik || '')}</div>
                ${item.poin_title ? `<div style="font-size:12px; color:var(--ink-soft); margin-top:2px;">${item.poin ? escHtml(item.poin) + '. ' : ''}${escHtml(item.poin_title)}</div>` : ''}
              </div>
              ${actionsHtml}
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr));">${monthsHtml}</div>
          </div>`;
        });
      });
      cardsHtml += '</div>';
    });

    if (!cardsHtml) cardsHtml = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <p class="empty-title">Tidak ada materi ditemukan</p>
      <p class="empty-desc">Coba ubah jenjang atau kata pencarian</p>
    </div>`;

    // Jenjang selector — scroll horizontal di mobile
    const jenjangBarHtml = JENJANG_ORDER.map(j => {
      const isActive = j === currentJenjang;
      const jSafe = j.replace(/'/g, "\\'");
      return `<button onclick="KUR_setJenjang('${jSafe}')"
        style="padding:8px 14px; border-radius:20px; white-space:nowrap; flex-shrink:0;
          background:${isActive?'var(--green)':'var(--white)'};
          color:${isActive?'#fff':'var(--ink-soft)'};
          border:1.5px solid ${isActive?'var(--green)':'var(--line)'};
          font-size:12.5px; font-weight:700; cursor:pointer; transition:all .15s;">
        ${escHtml(j)}
      </button>`;
    }).join('');

    // Bulan selector — bulan berjalan sebagai default
    const monthBarHtml = `
      <div onclick="KUR_setMonth(null)" style="padding:7px 13px; border-radius:20px; white-space:nowrap; flex-shrink:0;
        border:1.5px solid ${currentMonth===null?'var(--green)':'var(--line)'};
        background:${currentMonth===null?'var(--green)':'var(--white)'};
        color:${currentMonth===null?'#fff':'var(--ink-soft)'};
        font-size:12px; font-weight:700; cursor:pointer; transition:all .15s;">
        Semua Bulan
      </div>
      ${months.map(m => `
        <div onclick="KUR_setMonth('${m}')" style="padding:7px 13px; border-radius:20px; white-space:nowrap; flex-shrink:0;
          border:1.5px solid ${currentMonth===m?'var(--green)':'var(--line)'};
          background:${currentMonth===m?'var(--green)':'var(--white)'};
          color:${currentMonth===m?'#fff':'var(--ink-soft)'};
          font-size:12px; font-weight:700; cursor:pointer; transition:all .15s;">
          ${m}${m===currentMonthName()?' ●':''}
        </div>`).join('')}`;

    main.innerHTML = `
      <div style="max-width:100%;">

        <!-- Bar jenjang: scroll horizontal -->
        <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:10px; margin-bottom:12px;
          scrollbar-width:none; -ms-overflow-style:none;">
          ${jenjangBarHtml}
        </div>

        <!-- Header info + search + semester -->
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
          <div style="flex:1; min-width:0;">
            <h1 style="font-family:var(--font-display); font-size:18px; font-weight:700; color:var(--green); margin:0 0 2px;">
              ${escHtml(currentJenjang)}
            </h1>
            <div style="font-size:12px; color:var(--ink-soft);">
              ${filtered.length} materi ·
              <button onclick="KUR_setSem('1')" style="background:${currentSem==='1'?'var(--green)':'transparent'}; color:${currentSem==='1'?'#fff':'var(--ink-soft)'}; border:1px solid ${currentSem==='1'?'var(--green)':'var(--line)'}; border-radius:4px; padding:1px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-right:3px;">Sem 1</button>
              <button onclick="KUR_setSem('2')" style="background:${currentSem==='2'?'var(--green)':'transparent'}; color:${currentSem==='2'?'#fff':'var(--ink-soft)'}; border:1px solid ${currentSem==='2'?'var(--green)':'var(--line)'}; border-radius:4px; padding:1px 8px; font-size:11px; font-weight:700; cursor:pointer;">Sem 2</button>
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="search" placeholder="Cari..." value="${escHtml(searchQ)}"
              oninput="KUR_search(this.value)"
              style="padding:8px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px; width:140px;">
            <button class="btn btn-outline btn-sm" onclick="KUR_downloadPDF()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              PDF
            </button>
            ${isAdmin ? `<button class="btn btn-gold btn-sm" onclick="KUR_addNew()">+ Tambah</button>` : ''}
          </div>
        </div>

        <!-- Bar bulan: scroll horizontal, bulan berjalan ditandai -->
        <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:10px; margin-bottom:16px;
          scrollbar-width:none; -ms-overflow-style:none;">
          ${monthBarHtml}
        </div>

        <!-- Kartu materi -->
        <div>${cardsHtml}</div>
      </div>`;
  }

  // Expose state setters ke global
  // KUR_setJenjang dan KUR_setSem panggil renderKurikulum() ulang
  // supaya tidak terjebak closure render() dari instance lama
  window.KUR_setJenjang = async (j) => { App.kurState.jenjang = j; App.kurState.sem = _defaultSem; App.kurState.month = _defaultMonth; App.cache.materi = null; await renderKurikulum(); };
  window.KUR_setSem = async (s) => { App.kurState.sem = s; App.kurState.month = null; App.cache.materi = null; await renderKurikulum(); };
  window.KUR_setMonth = (m) => { App.kurState.month = m; render(); };
  window.KUR_search = (q) => { App.kurState.search = q; render(); };

  window.KUR_downloadPDF = async () => {
    const ks = App.kurState;
    const months = ks.sem === '1' ? SEM1_MONTHS : SEM2_MONTHS;
    const monthsToShow = ks.month ? [ks.month] : months;
    const filtered = (App.cache.materi || []).filter(r =>
      r.jenjang === ks.jenjang && String(r.semester) === String(ks.sem)
    );
    if (!filtered.length) { showToast('Tidak ada materi untuk di-download', true); return; }

    showToast('Menyiapkan PDF...');

    // Lazy load pdf-lib dari CDN
    if (!window.PDFLib) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = resolve;
        s.onerror = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
          s2.onload = resolve; s2.onerror = reject;
          document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      });
    }

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg  = await doc.embedFont(StandardFonts.Helvetica);

      // A4 landscape untuk lebih lebar
      const PW = 842, PH = 595;
      const ML = 36, MR = 36, MT = 44, MB = 36;
      const GREEN = rgb(0.106, 0.227, 0.173);
      const GOLD  = rgb(0.757, 0.604, 0.294);
      const GRAY  = rgb(0.5, 0.5, 0.5);
      const WHITE = rgb(1, 1, 1);
      const CREAM = rgb(0.98, 0.97, 0.94);

      // Lebar kolom tabel
      const COL_NO    = 24;
      const COL_TOPIK = 130;
      const COL_POIN  = 22;
      const COL_POIN_TITLE = 120;
      // Sisa dibagi untuk kolom bulan
      const nMonths = monthsToShow.length;
      const tableW  = PW - ML - MR;
      const COL_BULAN = Math.floor((tableW - COL_NO - COL_TOPIK - COL_POIN - COL_POIN_TITLE) / nMonths);

      let page, y;

      const addPage = () => {
        page = doc.addPage([PW, PH]);
        y = PH - MT;
      };
      addPage();

      // ---- Fungsi utilitas ----
      const wrap = (text, maxW, size, font) => {
        const words = String(text || '').split(' ');
        const lines = []; let cur = '';
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w;
          if (font.widthOfTextAtSize(test, size) > maxW) {
            if (cur) lines.push(cur);
            cur = w;
          } else cur = test;
        }
        if (cur) lines.push(cur);
        return lines.length ? lines : [''];
      };

      const checkSpace = (need) => {
        if (y - need < MB + 30) {
          // Footer sebelum ganti halaman
          page.drawText(`Halaman ${doc.getPageCount()} · ${ks.jenjang} · PPG Sidoarjo Utara`,
            { x: ML, y: MB, font: fReg, size: 7, color: GRAY });
          addPage();
          drawTableHeader();
        }
      };

      // ---- Header dokumen ----
      const drawDocHeader = () => {
        page.drawText('PENGGERAK PEMBINA GENERUS — SIDOARJO UTARA',
          { x: ML, y, font: fBold, size: 11, color: GREEN });
        y -= 14;
        const bulanLabel = monthsToShow.length === 1 ? `Bulan ${monthsToShow[0]}` : `Semester ${ks.sem} (${months[0]} – ${months[months.length-1]})`;
        page.drawText(`Target Pencapaian Materi  ·  ${ks.jenjang}  ·  ${bulanLabel}`,
          { x: ML, y, font: fReg, size: 9, color: GRAY });
        y -= 8;
        page.drawLine({ start:{x:ML,y}, end:{x:PW-MR,y}, thickness:1.5, color:GREEN });
        y -= 16;
      };
      drawDocHeader();

      // ---- Header tabel ----
      const drawTableHeader = () => {
        const ROW_H = 16;
        // Background hijau
        page.drawRectangle({ x:ML, y:y-ROW_H+4, width:tableW, height:ROW_H, color:GREEN });
        let cx = ML;
        const th = (txt, w) => {
          page.drawText(txt, { x:cx+3, y:y-ROW_H+7, font:fBold, size:7.5, color:WHITE });
          cx += w;
        };
        th('No', COL_NO);
        th('Topik', COL_TOPIK);
        th('', COL_POIN);
        th('Keterangan', COL_POIN_TITLE);
        monthsToShow.forEach(m => th(m, COL_BULAN));
        y -= ROW_H + 2;
      };
      drawTableHeader();

      // ---- Render baris ----
      // Group by bab
      const groups = {}, babOrder = [];
      filtered.forEach(r => {
        const k = (r.bab||'') + '||' + (r.bab_title||'');
        if (!groups[k]) { groups[k] = { bab:r.bab, title:r.bab_title, byTopik:{}, topikOrder:[] }; babOrder.push(k); }
        const g = groups[k];
        const tk = (r.no||'') + '||' + (r.topik||'');
        if (!g.byTopik[tk]) { g.byTopik[tk] = { no:r.no, topik:r.topik, rows:[] }; g.topikOrder.push(tk); }
        g.byTopik[tk].rows.push(r);
      });

      let rowIdx = 0;

      for (const bk of babOrder) {
        const g = groups[bk];

        // Bab header
        checkSpace(20);
        page.drawRectangle({ x:ML, y:y-12, width:tableW, height:15, color:rgb(0.9,0.95,0.91) });
        page.drawText(`${g.bab||''}  ${g.title||''}`,
          { x:ML+5, y:y-8, font:fBold, size:8.5, color:GREEN });
        y -= 17;

        for (const tk of g.topikOrder) {
          const topik = g.byTopik[tk];
          const subRows = topik.rows;
          const firstPoin = subRows[0];

          // Hitung tinggi baris pertama (topik + poin pertama)
          const topikLines = wrap(topik.topik, COL_TOPIK - 6, 8, fBold);
          const poinTLines = wrap(firstPoin.poin_title, COL_POIN_TITLE - 6, 8, fReg);
          const bulanLines = monthsToShow.map(m => wrap(firstPoin[m.toLowerCase()], COL_BULAN - 6, 8, fReg));
          const maxLines0 = Math.max(topikLines.length, poinTLines.length, ...bulanLines.map(b => b.length));
          const ROW_H0 = maxLines0 * 10 + 6;

          checkSpace(ROW_H0);

          let cx = ML;

          // No
          page.drawText(String(topik.no||'•'), { x:cx+3, y:y-8, font:fBold, size:8, color:GREEN });
          cx += COL_NO;

          // Topik (span semua poin di bawahnya)
          topikLines.forEach((l,i) => {
            page.drawText(l, { x:cx+3, y:y-8-i*10, font:fBold, size:8, color:GREEN });
          });
          cx += COL_TOPIK;

          // Poin pertama
          const drawPoinRow = (r, yStart, withBg) => {
            let cx2 = ML + COL_NO + COL_TOPIK;
            // Tidak ada background untuk baris detail
            // Poin huruf — warna hitam
            page.drawText(r.poin ? r.poin+'.' : '', { x:cx2+2, y:yStart-8, font:fBold, size:8, color:rgb(0.1,0.1,0.1) });
            cx2 += COL_POIN;
            // Poin title
            const ptLines = wrap(r.poin_title, COL_POIN_TITLE-6, 8, fReg);
            ptLines.forEach((l,i) => page.drawText(l, { x:cx2+3, y:yStart-8-i*10, font:fReg, size:8, color:rgb(0.2,0.2,0.2) }));
            cx2 += COL_POIN_TITLE;
            // Bulan
            monthsToShow.forEach(m => {
              const bLines = wrap(r[m.toLowerCase()], COL_BULAN-6, 8, fReg);
              bLines.forEach((l,i) => page.drawText(l, { x:cx2+3, y:yStart-8-i*10, font:fReg, size:8, color:rgb(0.15,0.15,0.15) }));
              cx2 += COL_BULAN;
            });
          };

          drawPoinRow(firstPoin, y, false);
          // Garis tipis bawah baris
          page.drawLine({ start:{x:ML,y:y-ROW_H0+2}, end:{x:PW-MR,y:y-ROW_H0+2}, thickness:0.25, color:rgb(0.88,0.88,0.88) });
          y -= ROW_H0;
          rowIdx++;

          // Sub-baris poin berikutnya (b, c, d, ...)
          for (let si = 1; si < subRows.length; si++) {
            const r = subRows[si];
            const ptL = wrap(r.poin_title, COL_POIN_TITLE-6, 8, fReg);
            const bL  = monthsToShow.map(m => wrap(r[m.toLowerCase()], COL_BULAN-6, 8, fReg));
            const mxL = Math.max(ptL.length, ...bL.map(b=>b.length));
            const rh  = mxL*10+6;
            checkSpace(rh);
            rowIdx++;
            drawPoinRow(r, y, true);
            // Garis tipis bawah baris
            page.drawLine({ start:{x:ML,y:y-rh+2}, end:{x:PW-MR,y:y-rh+2}, thickness:0.25, color:rgb(0.88,0.88,0.88) });
            y -= rh;
          }

          // Garis tipis antar topik
          page.drawLine({ start:{x:ML,y:y+1}, end:{x:PW-MR,y:y+1}, thickness:0.3, color:rgb(0.85,0.85,0.85) });
        }

        y -= 4;
      }

      // Footer halaman terakhir
      const pages = doc.getPages();
      pages.forEach((p, i) => {
        p.drawText(`Halaman ${i+1} / ${pages.length}  ·  ${ks.jenjang}  ·  PPG Sidoarjo Utara`,
          { x: ML, y: MB, font: fReg, size: 7, color: GRAY });
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type:'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `Materi_${ks.jenjang.replace(/ /g,'_')}_${monthsToShow.length===1?monthsToShow[0]:'Sem'+ks.sem}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh ✓');
    } catch(e) {
      showToast('Gagal membuat PDF: ' + e.message, true);
      console.error('PDF error:', e);
    }
  };
  window.KUR_toggleProgress = async (materiId, bulan, el) => {
    if (!App.user.kelompok_id) return;
    el.disabled = true;
    try {
      const result = await SB.progress.toggle(App.user.kelompok_id, materiId, bulan, App.user.id);
      const key = materiId + '|' + bulan;
      if (result === 'checked') progressSet.add(key);
      else progressSet.delete(key);
      render();
    } catch(e) {
      showToast('Gagal menyimpan: ' + e.message, true);
      el.checked = !el.checked;
    }
    el.disabled = false;
  };
  window.KUR_edit = (id) => {
    const item = rows.find(r => r.id === id);
    if (item) openEditMateriModal(item);
  };
  window.KUR_delete = async (id, label) => {
    if (!confirm(`Hapus materi "${label}"?`)) return;
    await SB.materi.delete(id);
    App.cache.materi = null;
    showToast('Materi dihapus');
    await renderKurikulum();
  };
  window.KUR_addNew = () => openEditMateriModal(null, currentJenjang, currentSem);

  render();
}

/* ===== PAGE: USERS ===== */
async function renderUsers() {
  const main = document.getElementById('mainContent');
  const [allUsers, kelompokList, desaList] = await Promise.all([
    SB.users.getAll(), SB.kelompok.getAll(), SB.desa.getAll()
  ]);
  const kelompokMap = Object.fromEntries(kelompokList.map(k => [k.id, k.nama]));
  const desaMap = Object.fromEntries(desaList.map(d => [d.id, d.nama]));

  const pending = allUsers.filter(u => u.status === 'pending');
  const approved = allUsers.filter(u => u.status === 'approved');
  const rejected = allUsers.filter(u => u.status === 'rejected');

  function badge(status) {
    const map = { pending: 'badge-gold', approved: 'badge-green', rejected: 'badge-rose' };
    const lbl = { pending: 'Menunggu', approved: 'Aktif', rejected: 'Ditolak' };
    return `<span class="badge ${map[status] || 'badge-gray'}">${lbl[status] || status}</span>`;
  }

  function userRows(list) {
    if (!list.length) return '<tr><td colspan="6" style="text-align:center; color:var(--ink-soft); padding:24px;">Tidak ada data</td></tr>';
    return list.map(u => `
      <tr>
        <td><b>${escHtml(u.nama_lengkap)}</b><br><span class="text-xs color-soft">@${escHtml(u.username)}</span></td>
        <td>${escHtml(ROLE_LABELS[u.role] || u.role)}</td>
        <td>${u.kelompok_id ? escHtml(kelompokMap[u.kelompok_id] || u.kelompok_id) : (u.desa_id ? escHtml(desaMap[u.desa_id] || u.desa_id) : '—')}</td>
        <td>${badge(u.status)}</td>
        <td>${fmtDateShort(u.created_at)}</td>
        <td>
          <div style="display:flex; gap:6px;">
            ${u.status === 'pending' ? `
              <button class="btn btn-green btn-sm" onclick="USR_approve('${u.id}')">Setujui</button>
              <button class="btn btn-danger btn-sm" onclick="USR_reject('${u.id}')">Tolak</button>` : ''}
            ${u.status !== 'pending' && u.username !== 'admin' ? `
              <button class="btn-icon danger" onclick="USR_delete('${u.id}','${escHtml(u.nama_lengkap)}')" title="Hapus">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  }

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Kelola Pengguna</h1>
        <p class="page-subtitle">${allUsers.length} total · ${pending.length} menunggu persetujuan</p>
      </div>
    </div>
    ${pending.length > 0 ? `
    <div class="card" style="border-left:4px solid var(--gold); background:var(--gold-soft); margin-bottom:6px;">
      <div class="fw-bold color-green" style="margin-bottom:12px;">👥 Menunggu Persetujuan (${pending.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Role</th><th>Kelompok / Desa</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(pending)}</tbody>
      </table></div>
    </div>` : ''}
    <div class="card">
      <div class="fw-bold color-green" style="margin-bottom:12px;">✅ Pengguna Aktif (${approved.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Role</th><th>Kelompok / Desa</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(approved)}</tbody>
      </table></div>
    </div>
    ${rejected.length > 0 ? `
    <div class="card">
      <div class="fw-bold" style="color:var(--rose); margin-bottom:12px;">✕ Ditolak (${rejected.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Role</th><th>Kelompok / Desa</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(rejected)}</tbody>
      </table></div>
    </div>` : ''}
  `;

  window.USR_approve = async (id) => {
    await SB.users.approve(id);
    showToast('Pengguna disetujui');
    await renderUsers();
  };
  window.USR_reject = async (id) => {
    await SB.users.reject(id);
    showToast('Pendaftaran ditolak');
    await renderUsers();
  };
  window.USR_delete = async (id, nama) => {
    if (!confirm(`Hapus pengguna "${nama}"?`)) return;
    await SB.users.delete(id);
    showToast('Pengguna dihapus');
    await renderUsers();
  };
}

/* ===== PAGE: SANTRI ===== */
async function renderSantri() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';

  // Load data master kelompok untuk admin
  if (isAdmin && !App.cache.kelompok) {
    App.cache.kelompok = await SB.kelompok.getAll();
  }

  let selectedKelompokId = u.kelompok_id || null;
  let kelasOptions = [];
  let selectedKelasId = null;
  let santriList = [];

  async function loadKelas(kelompokId) {
    selectedKelompokId = kelompokId;
    selectedKelasId = null;
    santriList = [];
    if (kelompokId) {
      kelasOptions = await SB.kelas.getByKelompok(kelompokId);
      if (kelasOptions.length) await loadSantri(kelasOptions[0].id);
      else render();
    } else {
      kelasOptions = [];
      render();
    }
  }

  async function loadSantri(kelasId) {
    selectedKelasId = kelasId;
    santriList = await SB.santri.getByKelas(kelasId);
    render();
  }

  function kelasLabel(k) {
    const nama = k.nama_kelas ? k.nama_kelas + ' — ' : '';
    return `${nama}${escHtml(k.jenjang)} Sem ${k.semester}`;
  }

  function render() {
    const kelompokList = App.cache.kelompok || [];

    const kelasOptsHtml = kelasOptions.map(k =>
      `<option value="${k.id}" ${k.id === selectedKelasId ? 'selected' : ''}>${kelasLabel(k)}</option>`
    ).join('');

    const selectedKelas = kelasOptions.find(k => k.id === selectedKelasId);

    const tableHtml = santriList.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Nama Lengkap</th><th>Tgl Lahir</th><th>Usia</th><th>Tingkatan</th><th>L/P</th><th>Nama Ortu</th><th>Tahun Depan</th><th>Aksi</th></tr></thead>
        <tbody>${santriList.map((s, i) => {
          const tingkatan = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
          const usia = hitungUsia(s.tgl_lahir);
          const naikLevel = hitungNaikLevel(s.tgl_lahir);
          // Simpan data santri ke window untuk akses dari onclick
          window['_strData_' + s.id] = s;
          return `<tr>
            <td>${i + 1}</td>
            <td><b>${escHtml(s.nama)}</b></td>
            <td>${s.tgl_lahir ? fmtDateShort(s.tgl_lahir) : '—'}</td>
            <td>${usia !== null ? usia + ' th' : '—'}</td>
            <td>${tingkatan ? `<span class="badge ${TINGKATAN_COLORS[tingkatan]||'badge-gray'}">${escHtml(TINGKATAN_LABELS[tingkatan]||tingkatan)}</span>` : '—'}</td>
            <td><span class="badge ${s.jenis_kel==='L'?'badge-green':'badge-rose'}">${s.jenis_kel||'—'}</span></td>
            <td>${escHtml(s.nama_ortu||'—')}</td>
            <td>${naikLevel ? `<span class="badge badge-gold">${escHtml(naikLevel)}</span>` : '—'}</td>
            <td>
              <div style="display:flex; gap:4px;">
                <button class="btn-icon" onclick="STR_edit('${s.id}')" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
                </button>
                <button class="btn-icon danger" onclick="STR_delete('${s.id}','${escHtml(s.nama)}')" title="Hapus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>` :
      '<div class="empty-state"><p class="empty-title">Belum ada generus</p><p class="empty-desc">Tambahkan data generus untuk kelas ini.</p></div>';

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data Santri / Generus</h1>
          <p class="page-subtitle">${selectedKelas ? kelasLabel(selectedKelas) + ' · ' : ''}${santriList.length} santri terdaftar</p>
        </div>
      </div>

      <!-- Pilihan Kelompok (admin) dan Kelas -->
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          ${isAdmin ? `
          <div style="flex:1; min-width:140px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Filter Desa</label>
            <select id="strDesaFilter" onchange="STR_filterDesa(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Semua Desa</option>
              ${['Barat 1','Barat 2','Tengah 1','Tengah 2','Timur 1','Timur 2'].map(d =>
                `<option value="Desa ${d}">Desa ${d}</option>`).join('')}
            </select>
          </div>
          <div style="flex:2; min-width:180px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelompok</label>
            <select id="strKelompokSel" onchange="STR_loadKelompok(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih kelompok...</option>
              ${(App.cache.kelompok||[]).map(k =>
                `<option value="${k.id}" data-desa="${escHtml(k.desa?.nama||k.desa_id)}" ${k.id===selectedKelompokId?'selected':''}>
                  ${escHtml(k.nama)} · ${escHtml(k.desa?.nama||k.desa_id)}
                </option>`).join('')}
            </select>
          </div>` : ''}
          <div style="flex:2; min-width:160px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelas</label>
            <select onchange="STR_loadKelas(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih kelas...</option>
              ${kelasOptsHtml}
            </select>
          </div>
        </div>
        ${(selectedKelompokId || !isAdmin) ? `
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px solid var(--line);">
          <button class="btn btn-gold btn-sm" onclick="STR_addKelas()">+ Kelas</button>
          ${selectedKelasId ? `
          <button class="btn btn-green btn-sm" onclick="STR_addSantri()">+ Tambah Santri</button>
          <button class="btn btn-outline btn-sm" onclick="STR_uploadExcel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Excel
          </button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="STR_downloadTemplate()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Template Excel
          </button>
        </div>` : ''}
      </div>

      ${selectedKelasId ? tableHtml : '<div class="card"><p class="color-soft">Pilih kelompok dan kelas untuk melihat atau mengelola data santri.</p></div>'}
    `;
  }

  window.STR_filterDesa = (desaNama) => {
    const sel = document.getElementById('strKelompokSel');
    if (!sel) return;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return; // placeholder
      opt.hidden = desaNama ? opt.dataset.desa !== desaNama : false;
    });
    // Reset pilihan kelompok kalau yang dipilih jadi hidden
    const current = sel.options[sel.selectedIndex];
    if (current && current.hidden) { sel.value = ''; STR_loadKelompok(''); }
  };
  window.STR_loadKelompok = async (id) => { await loadKelas(id); };
  window.STR_loadKelas = async (id) => { if (id) await loadSantri(id); };
  window.STR_addKelas = () => openAddKelasModal(selectedKelompokId, async () => {
    kelasOptions = await SB.kelas.getByKelompok(selectedKelompokId);
    render();
  });
  window.STR_addSantri = () => openAddSantriModal(selectedKelasId, null, async () => {
    await loadSantri(selectedKelasId);
  });

  // ── Download template Excel ────────────────────────────────
  window.STR_downloadTemplate = () => {
    window.open('https://budimk46-rm.github.io/kitabah-ppg/Template_Data_Generus.xlsx', '_blank');
  };

  // ── Upload Excel ───────────────────────────────────────────
  window.STR_uploadExcel = () => {
    if (!selectedKelasId) { showToast('Pilih kelas terlebih dahulu', true); return; }
    openImportExcelModal(selectedKelasId, selectedKelompokId, async () => {
      await loadSantri(selectedKelasId);
    });
  };
  window.STR_edit = (id) => {
    const s = window['_strData_' + id];
    if (!s) { showToast('Data tidak ditemukan', true); return; }
    openAddSantriModal(selectedKelasId, s, async () => await loadSantri(selectedKelasId));
  };
  window.STR_delete = async (id, nama) => {
    if (!confirm(`Hapus santri "${nama}"?`)) return;
    await SB.santri.softDelete(id);
    showToast('Santri dihapus');
    await loadSantri(selectedKelasId);
  };

  // Inisialisasi: kalau bukan admin, langsung load kelas kelompok sendiri
  if (!isAdmin && u.kelompok_id) {
    await loadKelas(u.kelompok_id);
  } else {
    render();
  }
}

/* ===== PAGE: ABSENSI & JURNAL ===== */
async function renderAbsensi() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';

  // Load kelompok untuk admin
  if (isAdmin && !App.cache.kelompok) {
    App.cache.kelompok = await SB.kelompok.getAll();
  }

  let myKelompokId = u.kelompok_id || null;

  // Kalau admin belum pilih kelompok, tampilkan picker dulu
  if (isAdmin && !myKelompokId) {
    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Absensi & Jurnal KBM</h1>
      </div>
      <div class="card">
        <p style="margin:0 0 16px; font-size:13.5px; color:var(--ink-soft);">Pilih kelompok terlebih dahulu untuk mengakses absensi.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <div style="flex:0 0 auto; min-width:160px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Filter Desa</label>
            <select id="absDesaFilter" onchange="ABS_filterDesa(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Semua Desa</option>
              ${['Barat 1','Barat 2','Tengah 1','Tengah 2','Timur 1','Timur 2'].map(d =>
                `<option value="Desa ${d}">Desa ${d}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1; min-width:200px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelompok</label>
            <select id="absKelompokSel"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih kelompok...</option>
              ${(App.cache.kelompok||[]).map(k =>
                `<option value="${k.id}" data-desa="${escHtml(k.desa?.nama||k.desa_id)}">
                  ${escHtml(k.nama)} · ${escHtml(k.desa?.nama||k.desa_id)}
                </option>`).join('')}
            </select>
          </div>
          <div style="display:flex; align-items:flex-end;">
            <button class="btn btn-green" onclick="ABS_pilihKelompok()">Buka Absensi →</button>
          </div>
        </div>
      </div>`;

    window.ABS_filterDesa = (desa) => {
      const sel = document.getElementById('absKelompokSel');
      Array.from(sel.options).forEach(o => {
        if (!o.value) return;
        o.hidden = desa ? o.dataset.desa !== desa : false;
      });
    };
    window.ABS_pilihKelompok = async () => {
      const id = document.getElementById('absKelompokSel').value;
      if (!id) { showToast('Pilih kelompok dulu', true); return; }
      myKelompokId = id;
      await lanjutAbsensi();
    };
    return;
  }

  await lanjutAbsensi();

  async function lanjutAbsensi() {
    // Pastikan materi sudah di-cache untuk tampilan target materi
    if (!App.cache.materi) {
      App.cache.materi = await SB.materi.getAll();
    }
    let selectedMateriIds = new Set();
  const kelasOptions = await SB.kelas.getByKelompok(myKelompokId);
  let selectedKelasId = kelasOptions.length ? kelasOptions[0].id : null;
  let selectedKelasLabel = kelasOptions.length ? kelasOptions[0].jenjang : '';
  let pertemuanList = [];
  let currentPertemuanId = null;
  let santriList = [];
  let absensiData = {};
  let jurnalData = null;

  async function loadPertemuan() {
    if (!selectedKelasId) return;
    pertemuanList = await SB.pertemuan.getByKelas(selectedKelasId);
    santriList = await SB.santri.getByKelas(selectedKelasId);
    // Default: tampilkan form pertemuan BARU (bukan data lama)
    currentPertemuanId = null;
    absensiData = {};
    jurnalData = null;
    selectedMateriIds = new Set();
    renderMain();
  }

  async function loadDetail(pId) {
    currentPertemuanId = pId;
    const [absen, jurnal] = await Promise.all([
      SB.absensi.getByPertemuan(pId),
      SB.jurnal.getByPertemuan(pId),
    ]);
    absensiData = Object.fromEntries(absen.map(a => [a.santri_id, a.status]));
    jurnalData = jurnal.length ? jurnal[0] : null;
    // Load materi yang sudah dipilih di jurnal ini
    const jurnalMateri = jurnalData ? (jurnalData.jurnal_materi || []) : [];
    selectedMateriIds = new Set(jurnalMateri.map(jm => jm.materi_id));
    renderMain();
  }

  function getMateriForDisplay(bulan) {
    const selectedKelas = kelasOptions.find(k => k.id === selectedKelasId);
    if (!selectedKelas || !App.cache.materi) return [];
    const col = bulan.toLowerCase();
    return App.cache.materi.filter(r =>
      r.jenjang === selectedKelas.jenjang &&
      String(r.semester) === String(selectedKelas.semester) &&
      r[col] && r[col].trim()
    );
  }

  function renderMain() {
    const selectedKelas = kelasOptions.find(k => k.id === selectedKelasId);
    const kelasOptHtml = kelasOptions.map(k =>
      `<option value="${k.id}" ${k.id === selectedKelasId ? 'selected' : ''}>
        ${k.nama_kelas ? escHtml(k.nama_kelas)+' — ' : ''}${escHtml(k.jenjang)} Sem ${k.semester}
      </option>`
    ).join('');

    const pertemuanOptHtml = [
      `<option value="">+ Pertemuan Baru</option>`,
      ...pertemuanList.map(p =>
        `<option value="${p.id}" ${p.id === currentPertemuanId ? 'selected' : ''}>
          ${escHtml(fmtDateShort(p.tanggal))} · Pertemuan ke-${p.pertemuan_ke||'?'}
        </option>`)
    ].join('');

    // ── Absensi ──
    const absensiTable = santriList.length ? `
      <div class="table-wrap"><table>
        <thead><tr>
          <th>#</th><th>Nama</th>
          <th style="text-align:center;">
            H&nbsp;&nbsp;I&nbsp;&nbsp;S&nbsp;&nbsp;A
            <div style="font-size:9px; font-weight:400; opacity:.7;">Hadir · Ijin · Sakit · Alpha</div>
          </th>
        </tr></thead>
        <tbody>${santriList.map((s, i) => {
          const status = absensiData[s.id] || '';
          return `<tr>
            <td>${i+1}</td>
            <td><b>${escHtml(s.nama)}</b></td>
            <td>
              <div style="display:flex; gap:5px; justify-content:center;">
                ${['H','I','S','A'].map(st => `
                  <button class="absen-btn ${st} ${status===st?'active':''}"
                    onclick="ABS_setStatus('${s.id}','${st}')"
                    title="${st==='H'?'Hadir':st==='I'?'Ijin':st==='S'?'Sakit':'Alpha'}"
                    style="width:36px; height:34px; font-size:13px; font-weight:800;">${st}
                  </button>`).join('')}
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` :
      '<div class="empty-state"><p class="empty-title">Belum ada santri</p><p class="empty-desc">Tambahkan santri di menu Data Santri.</p></div>';

    // ── Materi bulan: chip filter ──
    const allMonths = selectedKelas?.semester === '2' ? SEM2_MONTHS : SEM1_MONTHS;
    const nowMonth = currentMonthName();
    const nowIdx = allMonths.indexOf(nowMonth);
    // Tampilkan: bulan sebelum, berjalan, sesudah
    const visibleMonths = allMonths.filter((m, i) =>
      i >= Math.max(0, nowIdx-1) && i <= Math.min(allMonths.length-1, nowIdx+1)
    );
    if (!visibleMonths.includes(nowMonth) && nowIdx >= 0) visibleMonths.push(nowMonth);

    // ── Materi yang bisa dipilih ──
    let materiSectionHtml = '';
    if (currentPertemuanId !== undefined && selectedKelas) {
      const bulanToShow = jurnalBulan || nowMonth;
      const materiList = getMateriForDisplay(bulanToShow);

      const monthChips = [nowMonth, ...visibleMonths.filter(m => m !== nowMonth)].map(m => `
        <div onclick="ABS_setJurnalBulan('${m}')"
          style="padding:5px 12px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; flex-shrink:0;
            background:${(jurnalBulan||nowMonth)===m?'var(--green)':'var(--white)'};
            color:${(jurnalBulan||nowMonth)===m?'#fff':'var(--ink-soft)'};
            border:1.5px solid ${(jurnalBulan||nowMonth)===m?'var(--green)':'var(--line)'};">
          ${m}${m===nowMonth?' ●':''}
        </div>`).join('');

      // Group materi by bab
      const byBab = {}; const babOrder = [];
      materiList.forEach(r => {
        const k = (r.bab||'')+' '+( r.bab_title||'');
        if (!byBab[k]) { byBab[k]={title:k, items:[]}; babOrder.push(k); }
        byBab[k].items.push(r);
      });

      const col = bulanToShow.toLowerCase();
      const babsHtml = babOrder.map(bk => {
        const g = byBab[bk];
        const itemsHtml = g.items.map(r => {
          const dipilih = selectedMateriIds.has(r.id);
          return `<div onclick="ABS_toggleMateri('${r.id}','${escHtml(r.topik||'')}${r.poin_title?' - '+r.poin_title:''}')"
            style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px;
              border-bottom:1px solid var(--line); cursor:pointer; transition:background .15s;
              background:${dipilih?'var(--green-soft)':''};"
            onmouseover="this.style.background='${dipilih?'var(--green-soft)':'var(--cream-2)'}'"
            onmouseout="this.style.background='${dipilih?'var(--green-soft)':''}'"
            >
            <div style="width:22px; height:22px; border-radius:6px; border:2px solid ${dipilih?'var(--green)':'var(--line)'};
              background:${dipilih?'var(--green)':'transparent'};
              display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px;">
              ${dipilih?'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>':''}
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:700; font-size:13px; color:${dipilih?'var(--green)':'var(--ink)'};">
                ${r.no||'•'}. ${escHtml(r.topik||'')}
                ${r.poin?`<span style="color:var(--gold); font-weight:800;"> ${escHtml(r.poin)}.</span> ${escHtml(r.poin_title||'')}` : ''}
              </div>
              <div style="font-size:12px; color:var(--ink-soft); margin-top:2px;">${escHtml(r[col]||'')}</div>
            </div>
          </div>`;
        }).join('');
        return `<div style="margin-bottom:12px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);">
          <div style="background:var(--green); color:#fff; padding:8px 12px; font-size:12px; font-weight:800; text-transform:uppercase;">
            ${escHtml(g.title)}
          </div>
          ${itemsHtml}
        </div>`;
      }).join('');

      const selectedCount = selectedMateriIds.size;
      materiSectionHtml = `
        <div class="card" style="margin-top:18px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            <div>
              <div class="fw-bold color-green" style="font-size:15px;">📚 Materi yang Disampaikan</div>
              <div style="font-size:12px; color:var(--ink-soft);">Klik materi yang sudah disampaikan hari ini</div>
            </div>
            ${selectedCount ? `<span class="badge badge-green">${selectedCount} dipilih</span>` : ''}
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;">
            ${monthChips}
          </div>
          ${materiList.length ? babsHtml : `<div class="empty-state"><p class="empty-desc">Tidak ada target materi untuk bulan ${bulanToShow}.</p></div>`}
        </div>`;
    }

    // ── Jurnal ──
    const jurnalHtml = `
      <div class="card" style="margin-top:18px;">
        <div class="fw-bold color-green" style="font-size:15px; margin-bottom:14px;">📝 Catatan Jurnal KBM</div>
        <div class="form-group" style="margin-bottom:14px;">
          <label>Catatan kondisi KBM, kendala, atau hal penting lainnya</label>
          <textarea id="jurnalCatatan" rows="3"
            placeholder="Opsional — tuliskan catatan tambahan tentang KBM hari ini...">${escHtml(jurnalData?.catatan || '')}</textarea>
        </div>
      </div>`;

    // ── Tombol simpan semua ──
    const simpanHtml = currentPertemuanId ? `
      <div style="position:sticky; bottom:16px; z-index:10; margin-top:16px;">
        <button class="btn btn-green" onclick="ABS_simpanSemua()"
          style="width:100%; padding:14px; font-size:15px; font-weight:800; border-radius:var(--radius); box-shadow:var(--shadow-lg);">
          💾 Simpan Absensi + Jurnal
        </button>
      </div>` : '';

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Absensi & Jurnal KBM</h1>
      </div>

      <!-- Pilih Kelas & Pertemuan -->
      <div class="card">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          <div style="flex:1; min-width:150px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelas</label>
            <select onchange="ABS_setKelas(this)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              ${kelasOptHtml}
            </select>
          </div>
          <div style="flex:2; min-width:200px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Pertemuan</label>
            <select id="pertemuanSelect" onchange="ABS_setPertemuan(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              ${pertemuanOptHtml}
            </select>
          </div>
        </div>
        ${!currentPertemuanId ? `
          <div style="margin-top:14px; padding:14px; background:var(--gold-soft); border-radius:var(--radius-sm); font-size:13px; color:#8a6a24;">
            <b>Pertemuan baru</b> — tanggal hari ini (${fmtDateShort(new Date().toISOString().slice(0,10))}) akan dibuat saat Anda simpan.
            Atau pilih pertemuan sebelumnya dari dropdown untuk diedit.
          </div>
          <div style="margin-top:12px;">
            ${absensiTable}
          </div>
          ${jurnalHtml}
          ${materiSectionHtml}
          <div style="margin-top:16px;">
            <button class="btn btn-green" onclick="ABS_simpanBaru()"
              style="width:100%; padding:14px; font-size:15px; font-weight:800; border-radius:var(--radius);">
              💾 Buat Pertemuan & Simpan
            </button>
          </div>` :
        `<div style="margin-top:14px;">
          ${absensiTable}
        </div>
        ${jurnalHtml}
        ${materiSectionHtml}
        ${simpanHtml}`}
      </div>
    `;
  }

  // State bulan jurnal
  let jurnalBulan = currentMonthName();

  window.ABS_setKelas = async (sel) => {
    selectedKelasId = sel.value;
    await loadPertemuan();
  };

  window.ABS_setPertemuan = async (id) => {
    if (!id) {
      // Pertemuan baru
      currentPertemuanId = null;
      absensiData = {};
      jurnalData = null;
      selectedMateriIds = new Set();
      renderMain();
    } else {
      await loadDetail(id);
    }
  };

  window.ABS_setJurnalBulan = (bulan) => {
    jurnalBulan = bulan;
    renderMain();
  };

  window.ABS_setStatus = (santriId, status) => {
    absensiData[santriId] = status;
    renderMain();
  };

  window.ABS_toggleMateri = (materiId, label) => {
    if (selectedMateriIds.has(materiId)) {
      selectedMateriIds.delete(materiId);
    } else {
      selectedMateriIds.add(materiId);
    }
    // Auto-update catatan jurnal
    const textarea = document.getElementById('jurnalCatatan');
    if (textarea) {
      const materiList = Array.from(selectedMateriIds).map(id => {
        const m = (App.cache.materi||[]).find(r => r.id === id);
        if (!m) return null;
        return `• ${m.topik||''}${m.poin_title?' - '+m.poin_title:''}`;
      }).filter(Boolean);
      if (materiList.length) {
        textarea.value = 'Materi yang disampaikan:\n' + materiList.join('\n');
      } else {
        textarea.value = '';
      }
    }
    renderMain();
  };

  // Simpan untuk pertemuan BARU
  window.ABS_simpanBaru = async () => {
    const btn = document.querySelector('[onclick="ABS_simpanBaru()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    try {
      // 1. Buat pertemuan baru
      const kelasData = kelasOptions.find(k => k.id === selectedKelasId);
      const tgl = new Date().toISOString().slice(0,10);
      const bulanNow = currentMonthName();
      const kePertemuan = pertemuanList.filter(p => p.bulan === bulanNow).length + 1;
      const newPertemuan = await SB.pertemuan.insert({
        kelas_id: selectedKelasId,
        tanggal: tgl,
        bulan: bulanNow,
        tahun: new Date().getFullYear(),
        pertemuan_ke: kePertemuan,
        created_by: u.id,
      });
      const pId = newPertemuan?.[0]?.id;
      if (!pId) throw new Error('Gagal membuat pertemuan');
      currentPertemuanId = pId;
      await doSimpanAll(pId);
      pertemuanList = await SB.pertemuan.getByKelas(selectedKelasId);
      showToast(`Pertemuan ke-${kePertemuan} berhasil disimpan ✓`);
      await loadDetail(pId);
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Buat Pertemuan & Simpan'; }
  };

  // Simpan untuk pertemuan yang SUDAH ADA
  window.ABS_simpanSemua = async () => {
    const btn = document.querySelector('[onclick="ABS_simpanSemua()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    try {
      await doSimpanAll(currentPertemuanId);
      showToast('Absensi & jurnal disimpan ✓');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Absensi + Jurnal'; }
  };

  async function doSimpanAll(pId) {
    const kelompokId = u.kelompok_id || null;
    const bulan = jurnalBulan || currentMonthName();
    const catatan = document.getElementById('jurnalCatatan')?.value || '';

    // 1. Simpan absensi
    if (santriList.length) {
      const rows = santriList.map(s => ({
        pertemuan_id: pId,
        santri_id: s.id,
        status: absensiData[s.id] || 'A',
        dicatat_oleh: u.id,
      }));
      await SB.absensi.upsertBulk(rows);
    }

    // 2. Simpan jurnal
    await SB.jurnal.upsert({ pertemuan_id: pId, guru_id: u.id, catatan });

    // 3. Simpan materi dipilih ke jurnal_materi
    if (selectedMateriIds.size > 0) {
      await SB.jurnal.deleteMateri(pId); // hapus dulu yang lama (by pertemuan)
      const jurnalRows = await SB.jurnal.getByPertemuan(pId);
      const jurnalId = jurnalRows?.[0]?.id;
      if (jurnalId) {
        await SB.jurnal.insertMateri(jurnalId, Array.from(selectedMateriIds), bulan);
      }
    }

    // 4. Otomatis update progress kelompok
    if (kelompokId && selectedMateriIds.size > 0) {
      for (const materiId of selectedMateriIds) {
        try {
          await SB.progress.toggle_add(kelompokId, materiId, bulan, u.id);
        } catch(e) { /* abaikan error per-item */ }
      }
    }
  }

  window.ABS_addPertemuan = () => openAddPertemuanModal(selectedKelasId, async () => await loadPertemuan());

  await loadPertemuan();
  } // end lanjutAbsensi
}

/* ===== PAGE: SETTINGS ===== */
async function renderSettings() {
  const main = document.getElementById('mainContent');
  const waNum = await SB.settings.get('admin_whatsapp');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Pengaturan</h1>
    </div>
    <div class="card">
      <div class="fw-bold color-green" style="margin-bottom:16px; font-size:15px;">📱 Nomor WhatsApp Admin</div>
      <div class="form-group" style="margin-bottom:14px; max-width:360px;">
        <label>Nomor WA (dipakai untuk tombol info pendaftaran)</label>
        <input type="text" id="waInput" value="${escHtml(waNum)}" placeholder="contoh: 0895325194794">
      </div>
      <button class="btn btn-green" onclick="SET_saveWa()">Simpan Nomor</button>
    </div>
  `;
  window.SET_saveWa = async () => {
    const v = document.getElementById('waInput').value.trim();
    await SB.settings.set('admin_whatsapp', v);
    showToast('Nomor WhatsApp disimpan');
  };
}

/* ===== PAGE: PROGRESS (placeholder singkat) ===== */
async function renderProgress() {
  await renderKurikulum(); // Progress terintegrasi di kurikulum dengan checkbox
}

/* ===== PAGE: REKAP (placeholder) ===== */
async function renderRekap() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="page-header"><h1 class="page-title">Rekap KBM</h1></div>
    <div class="card">
      <p class="color-soft">Fitur rekap sedang dalam pengembangan. Akan tersedia pada update berikutnya.</p>
    </div>`;
}
async function renderRekapDesa() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="page-header"><h1 class="page-title">Rekap Desa</h1></div>
    <div class="card"><p class="color-soft">Dalam pengembangan.</p></div>`;
}
async function renderRekapDaerah() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="page-header"><h1 class="page-title">Rekap Daerah</h1></div>
    <div class="card"><p class="color-soft">Dalam pengembangan.</p></div>`;
}

/* ===== MODALS ===== */
function openEditMateriModal(item, defaultJenjang = '', defaultSem = '1') {
  const months = item ? (item.semester === '2' ? SEM2_MONTHS : SEM1_MONTHS) : SEM1_MONTHS;
  const isNew = !item;

  let el = document.getElementById('materiModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'materiModal';
    el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal modal-lg">
      <div class="modal-head">
        <h3 class="modal-title" id="materiModalTitle">Edit Materi</h3>
        <button class="modal-close" onclick="closeModal('materiModal')">✕</button>
      </div>
      <div class="modal-body" id="materiModalBody"></div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('materiModal')">Batal</button>
        <button class="btn btn-green" id="materiSaveBtn">Simpan</button>
      </div>
    </div>`;
    document.body.appendChild(el);
  }

  document.getElementById('materiModalTitle').textContent = isNew ? 'Tambah Materi Baru' : 'Edit Materi';
  const sem = item?.semester || defaultSem;
  const monthFields = months.map(m => `
    <div class="form-group">
      <label>${m}</label>
      <textarea name="bulan_${m.toLowerCase()}" rows="2">${escHtml(item?.[m.toLowerCase()] || '')}</textarea>
    </div>`).join('');

  document.getElementById('materiModalBody').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Jenjang</label>
        <select name="jenjang">${JENJANG_ORDER.map(j => `<option ${(item?.jenjang || defaultJenjang) === j ? 'selected' : ''}>${j}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Semester</label>
        <select name="semester"><option value="1" ${sem==='1'?'selected':''}>Semester 1</option><option value="2" ${sem==='2'?'selected':''}>Semester 2</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Bab (Romawi)</label><input name="bab" value="${escHtml(item?.bab || '')}"></div>
      <div class="form-group"><label>Judul Bab</label><input name="bab_title" value="${escHtml(item?.bab_title || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Sub (Huruf)</label><input name="sub" value="${escHtml(item?.sub || '')}"></div>
      <div class="form-group"><label>Judul Sub</label><input name="sub_title" value="${escHtml(item?.sub_title || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>No. Urut</label><input type="number" name="no" value="${item?.no ?? ''}"></div>
      <div class="form-group"><label>Topik</label><input name="topik" value="${escHtml(item?.topik || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Poin</label><input name="poin" value="${escHtml(item?.poin || '')}"></div>
      <div class="form-group"><label>Judul Poin</label><input name="poin_title" value="${escHtml(item?.poin_title || '')}"></div>
    </div>
    <div style="margin-top:10px; margin-bottom:8px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--green);">Target Per Bulan</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">${monthFields}</div>
  `;

  document.getElementById('materiSaveBtn').onclick = async () => {
    const body = document.getElementById('materiModalBody');
    const getData = (name) => body.querySelector(`[name="${name}"]`)?.value?.trim() || '';
    const sem2 = getData('semester') === '2' ? SEM2_MONTHS : SEM1_MONTHS;
    const data = {
      jenjang: getData('jenjang'), semester: getData('semester'),
      bab: getData('bab'), bab_title: getData('bab_title'),
      sub: getData('sub'), sub_title: getData('sub_title'),
      no: parseInt(getData('no')) || null,
      topik: getData('topik'), poin: getData('poin'), poin_title: getData('poin_title'),
    };
    sem2.forEach(m => { data[m.toLowerCase()] = getData('bulan_' + m.toLowerCase()); });

    if (!data.topik) { showToast('Topik wajib diisi', true); return; }
    const saveBtn = document.getElementById('materiSaveBtn');
    saveBtn.disabled = true;
    try {
      if (isNew) {
        // Generate ID baru
        const existing = await SB.materi.getAll();
        const maxId = Math.max(0, ...existing.map(r => parseInt(r.id.replace('R','')) || 0));
        data.id = 'R' + String(maxId + 1).padStart(4, '0');
        await SB.materi.insert(data);
        showToast('Materi ditambahkan');
      } else {
        await SB.materi.update(item.id, data);
        showToast('Materi diperbarui');
      }
      App.cache.materi = null;
      closeModal('materiModal');
      await renderKurikulum();
    } catch(e) {
      showToast('Error: ' + e.message, true);
    }
    saveBtn.disabled = false;
  };
  openModal('materiModal');
}

function openAddKelasModal(kelompokId, onSaved) {
  if (!kelompokId) { showToast('Pilih kelompok terlebih dahulu', true); return; }
  let el = document.getElementById('kelasModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kelasModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="modal">
    <div class="modal-head">
      <h3 class="modal-title">Tambah Kelas</h3>
      <button class="modal-close" onclick="closeModal('kelasModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;">
        <label>Nama Kelas (bebas sesuai kelompok)</label>
        <input id="kelasNama" placeholder="contoh: Kelas A, Caberawit 1, Pra Remaja">
        <div style="font-size:11.5px; color:var(--ink-soft); margin-top:5px;">Nama lokal kelas di kelompok Anda. Boleh dikosongkan.</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Jenjang Kurikulum</label>
          <select id="kelasJenjang">
            ${JENJANG_ORDER.map(j => `<option>${j}</option>`).join('')}
          </select>
          <div style="font-size:11.5px; color:var(--ink-soft); margin-top:5px;">Menentukan materi kurikulum yang berlaku untuk kelas ini.</div>
        </div>
        <div class="form-group">
          <label>Semester</label>
          <select id="kelasSem">
            <option value="1">Semester 1 (Juli – Desember)</option>
            <option value="2">Semester 2 (Januari – Juni)</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal('kelasModal')">Batal</button>
      <button class="btn btn-green" id="kelasSaveBtn">Simpan Kelas</button>
    </div>
  </div>`;

  document.getElementById('kelasSaveBtn').onclick = async () => {
    const nama_kelas = document.getElementById('kelasNama').value.trim();
    const jenjang = document.getElementById('kelasJenjang').value;
    const semester = document.getElementById('kelasSem').value;
    const btn = document.getElementById('kelasSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await SB.kelas.insert({ kelompok_id: kelompokId, nama_kelas, jenjang, semester });
      showToast('Kelas berhasil ditambahkan');
      closeModal('kelasModal');
      onSaved();
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
    }
    btn.disabled = false; btn.textContent = 'Simpan Kelas';
  };
  openModal('kelasModal');
}

function openAddSantriModal(kelasId, existingSantri, onSaved) {
  let el = document.getElementById('santriModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'santriModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }

  const s = existingSantri;
  const tingkatanAuto = s?.tgl_lahir ? hitungTingkatan(s.tgl_lahir) : '';
  const tingkatanVal = s?.tingkatan_override ? s.tingkatan : tingkatanAuto;

  el.innerHTML = `<div class="modal modal-lg">
    <div class="modal-head">
      <h3 class="modal-title">${s ? 'Edit Data Generus' : 'Tambah Generus Baru'}</h3>
      <button class="modal-close" onclick="closeModal('santriModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Nama Lengkap *</label>
          <input id="strNama" value="${escHtml(s?.nama||'')}" placeholder="Nama lengkap generus">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Tanggal Lahir *</label>
          <input type="date" id="strTglLahir" value="${s?.tgl_lahir||''}" onchange="STR_autoTingkatan(this.value)">
        </div>
        <div class="form-group">
          <label>Jenis Kelamin</label>
          <select id="strJK">
            <option value="">Pilih...</option>
            <option value="L" ${s?.jenis_kel==='L'?'selected':''}>Laki-laki (L)</option>
            <option value="P" ${s?.jenis_kel==='P'?'selected':''}>Perempuan (P)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Tingkatan</label>
          <select id="strTingkatan" onchange="STR_overrideTingkatan()">
            <option value="">— otomatis dari tgl lahir —</option>
            <option value="caberawit" ${tingkatanVal==='caberawit'?'selected':''}>Caberawit (PAUD TK – SD 6)</option>
            <option value="pra_remaja" ${tingkatanVal==='pra_remaja'?'selected':''}>Pra Remaja (SMP)</option>
            <option value="remaja" ${tingkatanVal==='remaja'?'selected':''}>Remaja (SMA)</option>
            <option value="pra_nikah" ${tingkatanVal==='pra_nikah'?'selected':''}>Pra Nikah (Lulus SMA)</option>
          </select>
          <div id="strTingkatanInfo" style="font-size:11.5px; color:var(--ink-soft); margin-top:4px;">
            ${tingkatanAuto ? 'Otomatis: <b>' + (TINGKATAN_LABELS[tingkatanAuto]||tingkatanAuto) + '</b>' : 'Isi tanggal lahir untuk kalkulasi otomatis'}
          </div>
        </div>
        <div class="form-group">
          <label>Nama Orang Tua (Ayah/Ibu)</label>
          <input id="strOrtu" value="${escHtml(s?.nama_ortu||'')}" placeholder="Nama ayah atau ibu">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>NIS (opsional)</label>
          <input id="strNis" value="${escHtml(s?.nis||'')}" placeholder="Nomor Induk Santri">
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal('santriModal')">Batal</button>
      <button class="btn btn-green" id="strSaveBtn">${s ? 'Simpan Perubahan' : 'Tambah Generus'}</button>
    </div>
  </div>`;

  // Auto-hitung tingkatan saat tgl lahir diubah
  window.STR_autoTingkatan = (tgl) => {
    const t = hitungTingkatan(tgl);
    const info = document.getElementById('strTingkatanInfo');
    if (info) info.innerHTML = t
      ? 'Otomatis: <b>' + (TINGKATAN_LABELS[t]||t) + '</b>'
      : 'Tanggal lahir tidak valid';
    // Kalau belum di-override, kosongkan select supaya pakai auto
    const sel = document.getElementById('strTingkatan');
    if (sel && !sel.dataset.overridden) sel.value = '';
  };
  window.STR_overrideTingkatan = () => {
    const sel = document.getElementById('strTingkatan');
    if (sel) sel.dataset.overridden = sel.value ? '1' : '';
  };

  document.getElementById('strSaveBtn').onclick = async () => {
    const nama = document.getElementById('strNama').value.trim();
    const tgl_lahir = document.getElementById('strTglLahir').value || null;
    const jenis_kel = document.getElementById('strJK').value || null;
    const nama_ortu = document.getElementById('strOrtu').value.trim() || null;
    const nis = document.getElementById('strNis').value.trim() || null;
    const selTingkatan = document.getElementById('strTingkatan');
    const tingkatan_override = !!selTingkatan.value;
    const tingkatan = selTingkatan.value || hitungTingkatan(tgl_lahir) || null;

    if (!nama) { showToast('Nama lengkap wajib diisi', true); return; }
    if (!tgl_lahir) { showToast('Tanggal lahir wajib diisi', true); return; }

    // Validasi: bandingkan tingkatan yang dipilih vs otomatis dari usia
    if (tingkatan_override && tingkatan) {
      const tingkatanOtomatis = hitungTingkatan(tgl_lahir);
      if (tingkatanOtomatis && tingkatan !== tingkatanOtomatis) {
        const usia = hitungUsia(tgl_lahir);
        const labelPilih = TINGKATAN_LABELS[tingkatan] || tingkatan;
        const labelSeharusnya = TINGKATAN_LABELS[tingkatanOtomatis] || tingkatanOtomatis;
        const lanjut = confirm(
          `⚠️ Perhatian!\n\n` +
          `Berdasarkan tanggal lahir, usia generus ini adalah ${usia} tahun.\n` +
          `Tingkatan yang seharusnya: ${labelSeharusnya}\n` +
          `Tingkatan yang dipilih: ${labelPilih}\n\n` +
          `Apakah Anda yakin ingin tetap menggunakan "${labelPilih}"?\n` +
          `Klik OK untuk lanjut, atau Batal untuk mengubah pilihan.`
        );
        if (!lanjut) return;
      }
    }

    const btn = document.getElementById('strSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';

    const data = {
      nama: toTitleCase(nama),
      tgl_lahir, jenis_kel,
      nama_ortu: nama_ortu ? toTitleCase(nama_ortu) : null,
      nis, tingkatan, tingkatan_override
    };

    try {
      if (s) {
        await SB.santri.update(s.id, data);
        showToast('Data generus diperbarui');
      } else {
        await SB.santri.insert({ ...data, kelas_id: kelasId, aktif: true });
        showToast('Generus berhasil ditambahkan');
      }
      closeModal('santriModal');
      onSaved();
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
    }
    btn.disabled = false; btn.textContent = s ? 'Simpan Perubahan' : 'Tambah Generus';
  };

  openModal('santriModal');
}

function openAddPertemuanModal(kelasId, onSaved) {
  let el = document.getElementById('pertemuanModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pertemuanModal';
    el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal"><div class="modal-head"><h3 class="modal-title">Buat Pertemuan Baru</h3><button class="modal-close" onclick="closeModal('pertemuanModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Tanggal Pertemuan</label><input type="date" id="ptTanggal" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Bulan</label><select id="ptBulan">${[...SEM1_MONTHS,...SEM2_MONTHS].map(m => `<option ${m===currentMonthName()?'selected':''}>${m}</option>`).join('')}</select></div>
          <div class="form-group"><label>Pertemuan Ke-</label><input type="number" id="ptKe" min="1" value="1"></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('pertemuanModal')">Batal</button>
        <button class="btn btn-green" id="ptSaveBtn">Buat Pertemuan</button>
      </div>
    </div>`;
    document.body.appendChild(el);
  }
  document.getElementById('ptSaveBtn').onclick = async () => {
    const tanggal = document.getElementById('ptTanggal').value;
    const bulan = document.getElementById('ptBulan').value;
    const ke = parseInt(document.getElementById('ptKe').value) || 1;
    if (!tanggal) { showToast('Tanggal wajib diisi', true); return; }
    await SB.pertemuan.insert({
      kelas_id: kelasId, tanggal, bulan,
      tahun: new Date(tanggal).getFullYear(),
      pertemuan_ke: ke, created_by: App.user.id,
    });
    showToast('Pertemuan dibuat');
    closeModal('pertemuanModal');
    onSaved();
  };
  openModal('pertemuanModal');
}


/* ===== IMPORT EXCEL ===== */
async function openImportExcelModal(kelasId, kelompokId, onDone) {
  // Lazy load SheetJS
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  let el = document.getElementById('importExcelModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'importExcelModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }

  el.innerHTML = `<div class="modal modal-lg">
    <div class="modal-head">
      <h3 class="modal-title">Import Data Generus dari Excel</h3>
      <button class="modal-close" onclick="closeModal('importExcelModal')">✕</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:12px 14px; margin-bottom:16px; font-size:13px; color:var(--green);">
        <b>Petunjuk:</b> Upload file Excel yang sudah diisi sesuai template. Sistem akan memvalidasi tiap baris sebelum menyimpan.
      </div>
      <div id="importDropZone"
        style="border:2px dashed var(--line); border-radius:var(--radius); padding:32px; text-align:center; cursor:pointer; transition:all .15s;"
        onclick="document.getElementById('importFileInput').click()"
        ondragover="event.preventDefault(); this.style.borderColor='var(--green)'; this.style.background='var(--green-soft)';"
        ondragleave="this.style.borderColor='var(--line)'; this.style.background='';"
        ondrop="event.preventDefault(); this.style.borderColor='var(--line)'; this.style.background=''; handleImportDrop(event);">
        <div style="font-size:32px; margin-bottom:8px;">📊</div>
        <div style="font-weight:700; color:var(--green); margin-bottom:4px;">Klik atau drag file Excel di sini</div>
        <div style="font-size:12px; color:var(--ink-soft);">Format: .xlsx · Template bisa diunduh dari tombol "Template Excel"</div>
        <input type="file" id="importFileInput" accept=".xlsx,.xls" style="display:none"
          onchange="handleImportFile(this.files[0])">
      </div>
      <div id="importPreview" style="margin-top:16px; display:none;">
        <div id="importStats" style="margin-bottom:10px;"></div>
        <div id="importTable" style="max-height:280px; overflow-y:auto;"></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal('importExcelModal')">Batal</button>
      <button class="btn btn-green" id="importSaveBtn" style="display:none;" onclick="doImportSave()">
        Simpan ke Database
      </button>
    </div>
  </div>`;

  let parsedRows = [];

  window.handleImportDrop = (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  };

  window.handleImportFile = async (file) => {
    if (!file) return;
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importSaveBtn').style.display = 'none';
    try {
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Baca semua cell secara raw, mapping kolom:
      // A=No, B=Nama, C=TglLahir, D=JK, E=Tingkatan, F=Ortu, G=NIS, H=NamaKelas, I=Jenjang, J=Semester
      // Data mulai baris 5, baris 5-6 adalah CONTOH — kita deteksi otomatis
      const range = window.XLSX.utils.decode_range(ws['!ref'] || 'A1:J36');
      parsedRows = [];

      for (let r = 4; r <= range.e.r; r++) { // r=4 → baris ke-5 (0-indexed)
        const getCell = (col) => {
          const addr = window.XLSX.utils.encode_cell({ r, c: col });
          const cell = ws[addr];
          if (!cell) return '';
          // Format tanggal jadi YYYY-MM-DD
          if (cell.t === 'd') {
            const d = cell.v;
            return d.getFullYear() + '-' +
              String(d.getMonth()+1).padStart(2,'0') + '-' +
              String(d.getDate()).padStart(2,'0');
          }
          return String(cell.v || '').trim();
        };

        const nama     = getCell(1); // Kolom B
        const tglLahir = getCell(2); // Kolom C
        const jk       = getCell(3).toUpperCase(); // Kolom D
        const tingk    = getCell(4).toLowerCase(); // Kolom E
        const ortu     = getCell(5); // Kolom F
        const nis      = getCell(6); // Kolom G

        // Skip baris kosong
        if (!nama && !tglLahir) continue;
        // Skip baris yang isinya sama persis dengan contoh (deteksi otomatis)
        if (nama === 'Ahmad Fulan bin Budi' || nama === 'Siti Aminah binti Darto') continue;

        const rowNum = r + 1; // 1-indexed untuk display
        const rowErrors = [];
        if (!nama) rowErrors.push('Nama kosong');
        if (!tglLahir || !/^\d{4}-\d{2}-\d{2}$/.test(tglLahir)) rowErrors.push('Format tgl lahir salah (harus YYYY-MM-DD)');
        if (jk && !['L','P'].includes(jk)) rowErrors.push('Jenis kelamin harus L atau P');
        if (tingk && !['caberawit','pra_remaja','remaja','pra_nikah'].includes(tingk)) rowErrors.push('Tingkatan tidak valid');

        const tingkatanOtomatis = tglLahir ? hitungTingkatan(tglLahir) : '';
        const tingkatanFinal = tingk || tingkatanOtomatis;
        let warningOverride = '';
        if (tingk && tingkatanOtomatis && tingk !== tingkatanOtomatis) {
          warningOverride = `⚠ Override (seharusnya: ${TINGKATAN_LABELS[tingkatanOtomatis]||tingkatanOtomatis})`;
        }

        parsedRows.push({
          _rowNum: rowNum, _errors: rowErrors, _warning: warningOverride,
          nama, tgl_lahir: tglLahir, jenis_kel: jk || null,
          tingkatan: tingkatanFinal || null, tingkatan_override: !!tingk,
          nama_ortu: ortu || null, nis: nis || null,
          kelas_id: kelasId, aktif: true,
        });
      }

      if (!parsedRows.length) { showToast('Tidak ada data. Pastikan data dimulai baris ke-5.', true); return; }

      const valid = parsedRows.filter(r => !r._errors.length);
      const invalid = parsedRows.filter(r => r._errors.length);

      document.getElementById('importStats').innerHTML = `
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <span class="badge badge-green">${valid.length} baris valid ✓</span>
          ${invalid.length ? `<span class="badge badge-rose">${invalid.length} baris error ✗</span>` : ''}
          <span class="badge badge-gray">${parsedRows.length} total</span>
        </div>`;

      document.getElementById('importTable').innerHTML = `
        <table style="width:100%; font-size:12px; border-collapse:collapse;">
          <thead><tr style="background:var(--green); color:#fff;">
            <th style="padding:7px;">Baris</th><th style="padding:7px; text-align:left;">Nama</th>
            <th style="padding:7px;">Tgl Lahir</th><th style="padding:7px;">L/P</th>
            <th style="padding:7px;">Tingkatan</th><th style="padding:7px; text-align:left;">Status</th>
          </tr></thead>
          <tbody>${parsedRows.map(r => {
            const bg = r._errors.length ? 'var(--rose-soft)' : r._warning ? 'var(--gold-soft)' : '';
            return `<tr style="background:${bg}; border-bottom:1px solid var(--line);">
              <td style="padding:6px; text-align:center;">${r._rowNum}</td>
              <td style="padding:6px;"><b>${escHtml(r.nama)}</b></td>
              <td style="padding:6px; text-align:center;">${escHtml(r.tgl_lahir)}</td>
              <td style="padding:6px; text-align:center;">${escHtml(r.jenis_kel||'—')}</td>
              <td style="padding:6px; text-align:center;">${escHtml(TINGKATAN_LABELS[r.tingkatan]||r.tingkatan||'—')}</td>
              <td style="padding:6px; font-size:11px; color:${r._errors.length?'var(--rose)':r._warning?'#8a6a24':'var(--green)'};">
                ${r._errors.length ? '✗ '+r._errors.join(', ') : r._warning || '✓ OK'}
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>`;

      document.getElementById('importPreview').style.display = 'block';
      if (valid.length) {
        const btn = document.getElementById('importSaveBtn');
        btn.style.display = 'flex';
        btn.textContent = `Simpan ${valid.length} Generus ke Database`;
      }
    } catch(e) { showToast('Gagal membaca file: ' + e.message, true); }
  };

  window.doImportSave = async () => {
    const valid = parsedRows.filter(r => !r._errors.length);
    if (!valid.length) return;
    const btn = document.getElementById('importSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    let berhasil = 0, gagal = 0;
    for (let i = 0; i < valid.length; i += 20) {
      const batch = valid.slice(i, i+20).map(r => ({
        nama: toTitleCase(r.nama),
        tgl_lahir: r.tgl_lahir,
        jenis_kel: r.jenis_kel,
        tingkatan: r.tingkatan,
        tingkatan_override: r.tingkatan_override,
        nama_ortu: r.nama_ortu ? toTitleCase(r.nama_ortu) : null,
        nis: r.nis,
        kelas_id: r.kelas_id,
        aktif: true,
      }));
      try { await SB.santri.insert(batch); berhasil += batch.length; }
      catch(e) { gagal += batch.length; console.error(e); }
    }
    showToast(`Import selesai: ${berhasil} berhasil${gagal?', '+gagal+' gagal':''}`);
    closeModal('importExcelModal');
    onDone();
  };

  openModal('importExcelModal');
}

/* ===== SVG ICONS ===== */

/* ===== EVENT LISTENERS ===== */
document.addEventListener('DOMContentLoaded', async () => {
  // Tab switching login
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('panelMasuk').style.display = tab === 'masuk' ? 'block' : 'none';
      document.getElementById('panelDaftar').style.display = tab === 'daftar' ? 'block' : 'none';
      document.getElementById('loginAlert').innerHTML = '';
      if (tab === 'daftar') {
        // Load kelompok & desa untuk dropdown
        const [kel, des] = await Promise.all([SB.kelompok.getAll(), SB.desa.getAll()]);
        document.getElementById('regKelompok').innerHTML =
          '<option value="">Pilih kelompok...</option>' +
          kel.map(k => `<option value="${k.id}">${escHtml(k.nama)} (${escHtml(k.desa?.nama || '')})</option>`).join('');
        document.getElementById('regDesa').innerHTML =
          '<option value="">Pilih desa...</option>' +
          des.map(d => `<option value="${d.id}">${escHtml(d.nama)}</option>`).join('');
      }
    });
  });

  // Jenis akun toggle
  document.getElementById('regTipe').addEventListener('change', function() {
    const v = this.value;
    document.getElementById('regKelompokField').style.display =
      ['kelompok','pjp_kelompok','wali_kbm','guru'].includes(v) ? 'block' : 'none';
    document.getElementById('regDesaField').style.display = v === 'desa' ? 'block' : 'none';
  });

  // Login form
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // Register
  document.getElementById('regBtn').addEventListener('click', doRegister);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', doLogout);

  // Mobile sidebar
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
  });

  // Close modals on overlay click
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
  });

  // Init — cek session
  showLoading(true);
  const session = loadSession();
  if (session) {
    App.user = session;
    showShell();
  } else {
    showLogin();
  }
  showLoading(false);
});

/* ===== SERVICE WORKER (PWA) ===== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('SW registered:', reg.scope);
    }).catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}
