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

// PPG Logo sebagai Base64 mini placeholder — diganti nanti dengan logo asli
const LOGO_PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><circle cx="30" cy="30" r="30" fill="%231B3A2C"/><text x="30" y="38" text-anchor="middle" fill="%23C19A4B" font-size="20" font-family="Arial" font-weight="bold">PPG</text></svg>';

/* ===== APP STATE ===== */
const App = {
  user: null,
  session: null,
  currentPage: 'dashboard',
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

  // State filter
  let currentJenjang = JENJANG_ORDER[0];
  let currentSem = '1';
  let currentMonth = null;
  let searchQ = '';

  const isAdmin = App.user.role === 'admin';
  const isKelompok = App.user.role === 'kelompok' || App.user.role === 'pjp_kelompok';

  function render() {
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

    main.innerHTML = `
      <div style="display:grid; grid-template-columns:220px 1fr; gap:18px; min-height:calc(100vh - 100px);">
        <div style="display:flex; flex-direction:column; gap:0;">
          <div class="card" style="padding:12px;">
            <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--ink-soft); padding:4px 10px 10px;">Semester</div>
            <div style="display:flex; gap:6px; padding:0 4px 8px;">
              <button onclick="KUR_setSem('1')" style="flex:1; padding:8px; border-radius:6px; background:${currentSem==='1'?'var(--green)':'var(--cream-2)'}; color:${currentSem==='1'?'#fff':'var(--ink-soft)'}; font-size:12px; font-weight:700; border:none; cursor:pointer; transition:all .15s;">Sem 1</button>
              <button onclick="KUR_setSem('2')" style="flex:1; padding:8px; border-radius:6px; background:${currentSem==='2'?'var(--green)':'var(--cream-2)'}; color:${currentSem==='2'?'#fff':'var(--ink-soft)'}; font-size:12px; font-weight:700; border:none; cursor:pointer; transition:all .15s;">Sem 2</button>
            </div>
            <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--ink-soft); padding:8px 10px 10px; border-top:1px solid var(--line);">Jenjang & Kelas</div>
            <div>${jenjangSidebarHtml}</div>
          </div>
        </div>
        <div>
          <div class="page-header" style="flex-wrap:wrap; gap:10px;">
            <div>
              <h1 class="page-title" style="font-size:20px;">${escHtml(currentJenjang)}</h1>
              <p class="page-subtitle">Semester ${currentSem} · ${months[0]} – ${months[months.length-1]} · ${filtered.length} materi</p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <input type="search" placeholder="Cari materi..." value="${escHtml(searchQ)}"
                oninput="KUR_search(this.value)"
                style="padding:9px 13px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px; width:220px;">
              ${isAdmin ? `<button class="btn btn-gold btn-sm" onclick="KUR_addNew()">+ Tambah Materi</button>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:18px;">
            <div onclick="KUR_setMonth(null)" style="padding:7px 13px; border-radius:20px; border:1.5px solid ${currentMonth===null?'var(--green)':'var(--line)'}; background:${currentMonth===null?'var(--green)':'var(--white)'}; color:${currentMonth===null?'#fff':'var(--ink-soft)'}; font-size:12px; font-weight:700; cursor:pointer; transition:all .15s;">Semua Bulan</div>
            ${months.map(m => `<div onclick="KUR_setMonth('${m}')" style="padding:7px 13px; border-radius:20px; border:1.5px solid ${currentMonth===m?'var(--green)':'var(--line)'}; background:${currentMonth===m?'var(--green)':'var(--white)'}; color:${currentMonth===m?'#fff':'var(--ink-soft)'}; font-size:12px; font-weight:700; cursor:pointer; transition:all .15s;">${m}</div>`).join('')}
          </div>
          <div>${cardsHtml}</div>
        </div>
      </div>`;
  }

  // Expose state setters ke global
  window.KUR_setJenjang = (j) => { currentJenjang = j; currentSem = '1'; currentMonth = null; render(); };
  window.KUR_setSem = (s) => { currentSem = s; currentMonth = null; render(); };
  window.KUR_setMonth = (m) => { currentMonth = m; render(); };
  window.KUR_search = (q) => { searchQ = q; render(); };
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

  let kelasOptions = [];
  let selectedKelasId = null;
  let santriList = [];

  // Load kelas berdasarkan role
  if (u.role === 'admin') {
    const kel = await SB.kelompok.getAll();
    App.cache.kelompok = kel;
  }

  const myKelompokId = u.kelompok_id;
  if (myKelompokId) {
    kelasOptions = await SB.kelas.getByKelompok(myKelompokId);
  } else if (u.role === 'admin') {
    // Admin bisa pilih kelompok dulu
  }

  async function loadSantri(kelasId) {
    selectedKelasId = kelasId;
    santriList = await SB.santri.getByKelas(kelasId);
    render();
  }

  function render() {
    const kelasOptsHtml = kelasOptions.map(k =>
      `<option value="${k.id}" ${k.id === selectedKelasId ? 'selected' : ''}>${escHtml(k.jenjang)} - Sem ${k.semester}</option>`
    ).join('');

    const tableHtml = santriList.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Nama Santri</th><th>NIS</th><th>L/P</th><th>Aksi</th></tr></thead>
        <tbody>${santriList.map((s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><b>${escHtml(s.nama)}</b></td>
            <td>${escHtml(s.nis || '—')}</td>
            <td><span class="badge ${s.jenis_kel === 'L' ? 'badge-green' : 'badge-rose'}">${s.jenis_kel || '—'}</span></td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn-icon" onclick="STR_edit(${JSON.stringify(JSON.stringify(s))})" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
                </button>
                <button class="btn-icon danger" onclick="STR_delete('${s.id}','${escHtml(s.nama)}')" title="Hapus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>` :
      '<div class="empty-state"><p class="empty-title">Belum ada santri</p><p class="empty-desc">Tambahkan data santri untuk kelas ini.</p></div>';

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data Santri</h1>
          <p class="page-subtitle">${santriList.length} santri terdaftar</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${kelasOptions.length ? `
            <select onchange="STR_loadKelas(this.value)" style="padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih Kelas...</option>
              ${kelasOptsHtml}
            </select>` : ''}
          <button class="btn btn-gold btn-sm" onclick="STR_addKelas()">+ Tambah Kelas</button>
          ${selectedKelasId ? `<button class="btn btn-green btn-sm" onclick="STR_addSantri()">+ Tambah Santri</button>` : ''}
        </div>
      </div>
      ${selectedKelasId ? tableHtml : '<div class="card"><p class="color-soft">Pilih kelas di atas untuk melihat daftar santri.</p></div>'}
    `;
  }

  window.STR_loadKelas = async (id) => { if (id) await loadSantri(id); };
  window.STR_addKelas = () => openAddKelasModal(myKelompokId, async () => {
    kelasOptions = await SB.kelas.getByKelompok(myKelompokId);
    render();
  });
  window.STR_addSantri = () => openAddSantriModal(selectedKelasId, null, async () => {
    await loadSantri(selectedKelasId);
  });
  window.STR_edit = (jsonStr) => {
    const s = JSON.parse(JSON.parse(jsonStr));
    openAddSantriModal(selectedKelasId, s, async () => await loadSantri(selectedKelasId));
  };
  window.STR_delete = async (id, nama) => {
    if (!confirm(`Hapus santri "${nama}"?`)) return;
    await SB.santri.softDelete(id);
    showToast('Santri dihapus');
    await loadSantri(selectedKelasId);
  };

  if (kelasOptions.length > 0) {
    await loadSantri(kelasOptions[0].id);
  } else {
    render();
  }
}

/* ===== PAGE: ABSENSI & JURNAL ===== */
async function renderAbsensi() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const myKelompokId = u.kelompok_id;
  if (!myKelompokId) {
    main.innerHTML = '<div class="card"><p class="color-soft">Fitur ini memerlukan akun yang terhubung ke kelompok.</p></div>';
    return;
  }

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
    if (pertemuanList.length) await loadDetail(pertemuanList[0].id);
    else renderMain();
  }

  async function loadDetail(pId) {
    currentPertemuanId = pId;
    const [absen, jurnal] = await Promise.all([
      SB.absensi.getByPertemuan(pId),
      SB.jurnal.getByPertemuan(pId),
    ]);
    absensiData = Object.fromEntries(absen.map(a => [a.santri_id, a.status]));
    jurnalData = jurnal.length ? jurnal[0] : null;
    renderMain();
  }

  function renderMain() {
    const kelasOptHtml = kelasOptions.map(k =>
      `<option value="${k.id}" data-label="${escHtml(k.jenjang)} Sem ${k.semester}" ${k.id === selectedKelasId ? 'selected' : ''}>${escHtml(k.jenjang)} - Sem ${k.semester}</option>`
    ).join('');

    const pertemuanOptHtml = pertemuanList.map(p =>
      `<option value="${p.id}" ${p.id === currentPertemuanId ? 'selected' : ''}>${escHtml(fmtDate(p.tanggal))} (Pertemuan ke-${p.pertemuan_ke || '?'})</option>`
    ).join('');

    const absensiTable = santriList.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Nama Santri</th><th style="text-align:center;">Status Kehadiran</th></tr></thead>
        <tbody>${santriList.map((s, i) => {
          const status = absensiData[s.id] || '';
          return `<tr>
            <td>${i+1}</td>
            <td><b>${escHtml(s.nama)}</b></td>
            <td>
              <div style="display:flex; gap:6px; justify-content:center;">
                ${['H','I','S','A'].map(st => `
                  <button class="absen-btn ${st} ${status === st ? 'active' : ''}"
                    onclick="ABS_setStatus('${s.id}','${st}')">
                    ${st === 'H' ? 'Hadir' : st === 'I' ? 'Ijin' : st === 'S' ? 'Sakit' : 'Alpha'}
                  </button>`).join('')}
              </div>
            </td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>
      <div style="margin-top:14px;">
        <button class="btn btn-green" onclick="ABS_saveAbsensi()">💾 Simpan Absensi</button>
      </div>` :
      '<div class="empty-state"><p class="empty-title">Belum ada santri</p><p class="empty-desc">Tambahkan santri di menu Data Santri terlebih dahulu.</p></div>';

    const jurnalHtml = currentPertemuanId ? `
      <div class="card" style="margin-top:18px;">
        <div class="fw-bold color-green" style="font-size:15px; margin-bottom:14px;">📝 Jurnal KBM</div>
        <div class="form-group" style="margin-bottom:14px;">
          <label>Catatan Kegiatan KBM</label>
          <textarea id="jurnalCatatan" rows="4" placeholder="Tuliskan kondisi KBM, catatan penting, atau kendala hari ini...">${escHtml(jurnalData?.catatan || '')}</textarea>
        </div>
        <button class="btn btn-green" onclick="ABS_saveJurnal()">💾 Simpan Jurnal</button>
      </div>` : '';

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Absensi & Jurnal KBM</h1>
      </div>
      <div class="card">
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px;">
          <div style="flex:1; min-width:160px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--green); display:block; margin-bottom:5px;">Kelas</label>
            <select onchange="ABS_setKelas(this)" style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              ${kelasOptHtml}
            </select>
          </div>
          <div style="flex:1; min-width:180px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--green); display:block; margin-bottom:5px;">Pertemuan</label>
            <div style="display:flex; gap:6px;">
              <select id="pertemuanSelect" onchange="ABS_setPertemuan(this.value)" style="flex:1; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
                ${pertemuanOptHtml || '<option value="">Belum ada pertemuan</option>'}
              </select>
              <button class="btn btn-gold btn-sm" onclick="ABS_addPertemuan()">+ Baru</button>
            </div>
          </div>
        </div>
        ${currentPertemuanId ? absensiTable : '<p class="color-soft">Buat pertemuan baru atau pilih pertemuan yang sudah ada.</p>'}
      </div>
      ${jurnalHtml}
    `;
  }

  window.ABS_setKelas = async (sel) => {
    selectedKelasId = sel.value;
    selectedKelasLabel = sel.options[sel.selectedIndex].dataset.label;
    await loadPertemuan();
  };
  window.ABS_setPertemuan = async (id) => { if (id) await loadDetail(id); };
  window.ABS_setStatus = (santriId, status) => {
    absensiData[santriId] = status;
    renderMain();
  };
  window.ABS_saveAbsensi = async () => {
    if (!currentPertemuanId) return;
    const rows = santriList.map(s => ({
      pertemuan_id: currentPertemuanId,
      santri_id: s.id,
      status: absensiData[s.id] || 'A',
      dicatat_oleh: u.id,
    }));
    await SB.absensi.upsertBulk(rows);
    showToast('Absensi disimpan ✓');
  };
  window.ABS_saveJurnal = async () => {
    const catatan = document.getElementById('jurnalCatatan').value;
    await SB.jurnal.upsert({
      pertemuan_id: currentPertemuanId,
      guru_id: u.id,
      catatan,
    });
    showToast('Jurnal disimpan ✓');
  };
  window.ABS_addPertemuan = () => openAddPertemuanModal(selectedKelasId, async () => await loadPertemuan());

  await loadPertemuan();
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
  let el = document.getElementById('kelasModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kelasModal';
    el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal"><div class="modal-head"><h3 class="modal-title">Tambah Kelas</h3><button class="modal-close" onclick="closeModal('kelasModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Jenjang / Kelas Usia</label><select id="kelasJenjang">${JENJANG_ORDER.map(j => `<option>${j}</option>`).join('')}</select></div>
        <div class="form-group"><label>Semester</label><select id="kelasSem"><option value="1">Semester 1 (Juli-Des)</option><option value="2">Semester 2 (Jan-Jun)</option></select></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('kelasModal')">Batal</button>
        <button class="btn btn-green" id="kelasSaveBtn">Simpan</button>
      </div>
    </div>`;
    document.body.appendChild(el);
  }
  document.getElementById('kelasSaveBtn').onclick = async () => {
    const jenjang = document.getElementById('kelasJenjang').value;
    const semester = document.getElementById('kelasSem').value;
    await SB.kelas.insert({ kelompok_id: kelompokId, jenjang, semester });
    showToast('Kelas ditambahkan');
    closeModal('kelasModal');
    onSaved();
  };
  openModal('kelasModal');
}

function openAddSantriModal(kelasId, existingSantri, onSaved) {
  let el = document.getElementById('santriModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'santriModal';
    el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal"><div class="modal-head"><h3 class="modal-title" id="santriModalTitle">Tambah Santri</h3><button class="modal-close" onclick="closeModal('santriModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Nama Lengkap</label><input id="santriNama"></div>
        <div class="form-row">
          <div class="form-group"><label>NIS (opsional)</label><input id="santriNis"></div>
          <div class="form-group"><label>Jenis Kelamin</label><select id="santriJK"><option value="">Pilih...</option><option value="L">Laki-laki (L)</option><option value="P">Perempuan (P)</option></select></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('santriModal')">Batal</button>
        <button class="btn btn-green" id="santriSaveBtn">Simpan</button>
      </div>
    </div>`;
    document.body.appendChild(el);
  }
  document.getElementById('santriModalTitle').textContent = existingSantri ? 'Edit Data Santri' : 'Tambah Santri Baru';
  document.getElementById('santriNama').value = existingSantri?.nama || '';
  document.getElementById('santriNis').value = existingSantri?.nis || '';
  document.getElementById('santriJK').value = existingSantri?.jenis_kel || '';
  document.getElementById('santriSaveBtn').onclick = async () => {
    const nama = document.getElementById('santriNama').value.trim();
    if (!nama) { showToast('Nama wajib diisi', true); return; }
    const data = { nama, nis: document.getElementById('santriNis').value.trim() || null, jenis_kel: document.getElementById('santriJK').value || null };
    if (existingSantri) {
      await SB.santri.update(existingSantri.id, data);
      showToast('Data santri diperbarui');
    } else {
      await SB.santri.insert({ ...data, kelas_id: kelasId, aktif: true });
      showToast('Santri ditambahkan');
    }
    closeModal('santriModal');
    onSaved();
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
