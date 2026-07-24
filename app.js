/**
 * PPG SIDUTA — Application Core Engine
 * Architecture: Event-driven State Management with Supabase Backend
 */

// ==========================================
// 1. STATE MANAGEMENT & GLOBALS
// ==========================================
const AppState = {
  currentUser: null,
  activeTab: 'masuk',
  wizard: {
    step: 1,
    level: '',
    dapukan: '',
    bidang: '',
    kelasUsia: '',
    desa: '',
    kelompok: ''
  },
  cache: {
    kelompokList: [],
    generusList: [],
    kelasList: [],
    presensiData: []
  }
};

// Map Dapukan berdasarkan Level
const DAPUKAN_MAP = {
  daerah: [
    { id: 'Pengurus Daerah', label: 'Pengurus Daerah', sub: 'Akses penuh tingkat daerah' },
    { id: 'Bidang PPG', label: 'Pengurus Bidang PPG', sub: 'Sesuai bidang tugas' }
  ],
  desa: [
    { id: 'Pengurus Desa', label: 'Pengurus Desa', sub: 'Akses penuh tingkat desa' },
    { id: 'Pengurus Kelompok', label: 'Pengurus Kelompok', sub: 'Akses tingkat kelompok' }
  ],
  kelompok: [
    { id: 'Wali KBM', label: 'Wali KBM / Guru', sub: 'Mengelola presensi & kelas' },
    { id: 'Mubaligh', label: 'Mubaligh / Mubalightghah', sub: 'Pengajar & pembina' }
  ]
};

// ==========================================
// 2. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await checkSession();
});

function initEventListeners() {
  // Tab Switcher (Masuk / Daftar)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchAuthTab(e.target.dataset.tab));
  });

  // Auth Handlers
  document.getElementById('loginBtn')?.addEventListener('click', doLogin);
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);

  // Form Kelola Kelas Handler
  document.getElementById('formTambahKelas')?.addEventListener('submit', handleTambahKelas);

  // Mobile Menu Toggle
  document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
}

async function checkSession() {
  showLoading(true);
  try {
    const sessionUser = localStorage.getItem('siduta_user');
    if (sessionUser) {
      const user = JSON.parse(sessionUser);
      if (user.status === 'APPROVED') {
        AppState.currentUser = user;
        renderAppShell();
      } else {
        showPendingScreen(user.username);
      }
    } else {
      showLoginScreen();
    }
  } catch (err) {
    console.error('Session restoration error:', err);
    showLoginScreen();
  } finally {
    showLoading(false);
  }
}

// ==========================================
// 3. AUTHENTICATION ENGINE
// ==========================================
function switchAuthTab(tab) {
  AppState.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  
  const panelMasuk = document.getElementById('panelMasuk');
  const panelDaftar = document.getElementById('panelDaftar');
  
  if (tab === 'masuk') {
    panelMasuk.style.display = 'block';
    panelDaftar.style.display = 'none';
  } else {
    panelMasuk.style.display = 'none';
    panelDaftar.style.display = 'block';
    resetWizard();
  }
}

async function doLogin() {
  const usernameInput = document.getElementById('loginUser').value.trim();
  const passwordInput = document.getElementById('loginPass').value.trim();
  const alertEl = document.getElementById('loginAlert');

  if (!usernameInput || !passwordInput) {
    showAlert(alertEl, 'error', 'Silakan isi username dan kata sandi.');
    return;
  }

  showLoading(true);
  try {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', usernameInput)
      .single();

    if (error || !user) {
      showAlert(alertEl, 'error', 'Username tidak ditemukan.');
      return;
    }

    const match = dcodeIO.bcrypt.compareSync(passwordInput, user.password_hash);
    if (!match) {
      showAlert(alertEl, 'error', 'Kata sandi salah.');
      return;
    }

    if (user.status === 'PENDING') {
      showPendingScreen(user.username);
      return;
    }

    AppState.currentUser = user;
    localStorage.setItem('siduta_user', JSON.stringify(user));
    renderAppShell();
    showToast('Berhasil masuk. Selamat datang!');
  } catch (err) {
    showAlert(alertEl, 'error', 'Terjadi kesalahan sistem: ' + err.message);
  } finally {
    showLoading(false);
  }
}

async function doRegister() {
  const nama = document.getElementById('regNama').value.trim();
  const username = document.getElementById('regUser').value.trim().toLowerCase();
  const password = document.getElementById('regPass').value.trim();
  const alertEl = document.getElementById('wizAlert');

  if (!nama || !username || !password) {
    showAlert(alertEl, 'error', 'Semua kolom data diri wajib diisi.');
    return;
  }

  if (password.length < 6) {
    showAlert(alertEl, 'error', 'Kata sandi minimal 6 karakter.');
    return;
  }

  showLoading(true);
  try {
    const salt = dcodeIO.bcrypt.genSaltSync(10);
    const password_hash = dcodeIO.bcrypt.hashSync(password, salt);

    const payload = {
      nama_lengkap: nama,
      username: username,
      password_hash: password_hash,
      level: AppState.wizard.level,
      dapukan: AppState.wizard.dapukan,
      bidang: AppState.wizard.bidang || null,
      kelas_usia: AppState.wizard.kelasUsia || null,
      desa: AppState.wizard.desa || null,
      kelompok: AppState.wizard.kelompok || null,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseClient.from('users').insert([payload]);

    if (error) {
      if (error.code === '23505') throw new Error('Username sudah digunakan.');
      throw error;
    }

    showPendingScreen(username);
  } catch (err) {
    showAlert(alertEl, 'error', err.message);
  } finally {
    showLoading(false);
  }
}

function doLogout() {
  localStorage.removeItem('siduta_user');
  AppState.currentUser = null;
  showLoginScreen();
  showToast('Anda telah keluar.');
}

// ==========================================
// 4. WIZARD REGISTRATION LOGIC
// ==========================================
function resetWizard() {
  AppState.wizard = { step: 1, level: '', dapukan: '', bidang: '', kelasUsia: '', desa: '', kelompok: '' };
  WIZ_renderStep(1);
}

function WIZ_setLevel(level, element) {
  AppState.wizard.level = level;
  AppState.wizard.dapukan = '';
  
  document.querySelectorAll('#levelGrid .wiz-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');

  const container = document.getElementById('jabatanOptions');
  container.innerHTML = '';

  const options = DAPUKAN_MAP[level] || [];
  options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'jabatan-item';
    div.onclick = () => WIZ_setDapukan(opt.id, div);
    div.innerHTML = `
      <div class="jab-label">${opt.label}</div>
      <div class="jab-sub">${opt.sub}</div>
    `;
    container.appendChild(div);
  });

  document.getElementById('jabatanGrid').style.display = 'block';
  document.getElementById('bidangField').style.display = 'none';
  document.getElementById('kelasUsiaField').style.display = 'none';
  WIZ_checkStep1();
}

function WIZ_setDapukan(dapukan, element) {
  AppState.wizard.dapukan = dapukan;
  document.querySelectorAll('#jabatanOptions .jabatan-item').forEach(i => i.classList.remove('selected'));
  element.classList.add('selected');

  document.getElementById('bidangField').style.display = (dapukan === 'Bidang PPG') ? 'block' : 'none';
  document.getElementById('kelasUsiaField').style.display = (dapukan === 'Wali KBM') ? 'block' : 'none';
  
  WIZ_checkStep1();
}

function WIZ_setKelasUsia(kelas, element) {
  AppState.wizard.kelasUsia = kelas;
  document.querySelectorAll('#kelasUsiaGrid .wiz-card-sm').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  WIZ_checkStep1();
}

function WIZ_checkStep1() {
  const { level, dapukan, kelasUsia } = AppState.wizard;
  let valid = !!(level && dapukan);

  if (dapukan === 'Wali KBM' && !kelasUsia) valid = false;

  const btn = document.getElementById('wizNext1');
  btn.disabled = !valid;
  btn.style.opacity = valid ? '1' : '.5';
}

function WIZ_next1() {
  if (AppState.wizard.dapukan === 'Bidang PPG') {
    AppState.wizard.bidang = document.getElementById('regBidang').value;
  }

  if (AppState.wizard.level === 'daerah') {
    // Skip step 2 untuk level daerah
    WIZ_renderStep(3);
  } else {
    WIZ_renderStep(2);
  }
}

function WIZ_onDesaChange(desa) {
  AppState.wizard.desa = desa;
  const kelompokSelect = document.getElementById('regKelompok');
  kelompokSelect.innerHTML = '<option value="">Pilih kelompok...</option>';

  if (desa) {
    // Populate dummy/cached kelompok
    const sampleKelompok = ['Kelompok 1', 'Kelompok 2', 'Kelompok 3'];
    sampleKelompok.forEach(k => {
      kelompokSelect.innerHTML += `<option value="${k}">${k}</option>`;
    });
  }

  document.getElementById('kelompokField').style.display = (AppState.wizard.level === 'kelompok') ? 'block' : 'none';
  WIZ_checkStep2();
}

function WIZ_checkStep2() {
  const { level, desa, kelompok } = AppState.wizard;
  let valid = false;

  if (level === 'desa' && desa) valid = true;
  if (level === 'kelompok' && desa && document.getElementById('regKelompok').value) {
    AppState.wizard.kelompok = document.getElementById('regKelompok').value;
    valid = true;
  }

  const btn = document.getElementById('wizNext2');
  btn.disabled = !valid;
  btn.style.opacity = valid ? '1' : '.5';
}

function WIZ_next2() { WIZ_renderStep(3); }
function WIZ_back(step) { WIZ_renderStep(step); }

function WIZ_renderStep(step) {
  AppState.wizard.step = step;
  
  document.getElementById('wizStep1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('wizStep2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('wizStep3').style.display = step === 3 ? 'block' : 'none';

  // Progress Bar
  const bar = document.getElementById('wizProgressBar');
  bar.style.width = step === 1 ? '33%' : step === 2 ? '66%' : '100%';

  if (step === 2) {
    document.getElementById('desaField').style.display = 'block';
    document.getElementById('kelompokField').style.display = (AppState.wizard.level === 'kelompok') ? 'block' : 'none';
  }

  if (step === 3) {
    const summary = document.getElementById('wizSummary');
    const w = AppState.wizard;
    summary.innerHTML = `<b>Konfirmasi Access:</b> Level ${w.level.toUpperCase()} | Dapukan: ${w.dapukan} ${w.desa ? '| Desa: ' + w.desa : ''} ${w.kelompok ? '| Kelompok: ' + w.kelompok : ''}`;
  }
}

// ==========================================
// 5. APPLICATION SHELL & DASHBOARD
// ==========================================
function renderAppShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('pendingScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  const u = AppState.currentUser;
  document.getElementById('navUserName').textContent = u.nama_lengkap;
  document.getElementById('navUserRole').textContent = `${u.dapukan} (${u.level.toUpperCase()})`;
  document.getElementById('navAvatar').textContent = u.nama_lengkap.charAt(0).toUpperCase();

  renderSidebarNav();
  navigateView('dashboard');
}

function renderSidebarNav() {
  const container = document.getElementById('sidebarNav');
  container.innerHTML = `
    <div class="nav-section">
      <div class="nav-section-title">Menu Utama</div>
      <div class="nav-item active" onclick="navigateView('dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        Dashboard
      </div>
      <div class="nav-item" onclick="navigateView('generus')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        Data Generus
      </div>
      <div class="nav-item" onclick="openModalKelas()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        Kelola Kelas
      </div>
    </div>
  `;
}

function navigateView(viewName) {
  closeSidebar();
  const title = document.getElementById('pageTitle');
  const subtitle = document.getElementById('pageSubtitle');
  const container = document.getElementById('viewContainer');

  if (viewName === 'dashboard') {
    title.textContent = 'Dashboard';
    subtitle.textContent = 'Ringkasan Statistik Generus & Presensi';
    renderDashboardView(container);
  } else if (viewName === 'generus') {
    title.textContent = 'Data Generus';
    subtitle.textContent = 'Pengelolaan Basis Data Generus';
    renderGenerusView(container);
  }
}

function renderDashboardView(container) {
  container.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-num" id="statTotal">0</div>
        <div class="stat-label">Total Generus</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="statPAUD">0</div>
        <div class="stat-label">PAUD / TK</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="statSD">0</div>
        <div class="stat-label">Tingkat SD</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="statSMP">0</div>
        <div class="stat-label">Tingkat SMP</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="statSMA">0</div>
        <div class="stat-label">Tingkat SMA/PRA</div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0; color:var(--green);">Aktivitas Terkini</h3>
      <p class="color-soft" style="font-size:13px;">Sistem siap digunakan. Silakan kelola kelas atau entri data generus.</p>
    </div>
  `;
  fetchDashboardStats();
}

async function fetchDashboardStats() {
  try {
    const { data, error } = await supabaseClient.from('generus').select('jenjang');
    if (error) throw error;

    if (data) {
      document.getElementById('statTotal').textContent = data.length;
      document.getElementById('statPAUD').textContent = data.filter(g => g.jenjang === 'PAUD TK').length;
      document.getElementById('statSD').textContent = data.filter(g => g.jenjang && g.jenjang.startsWith('SD')).length;
      document.getElementById('statSMP').textContent = data.filter(g => g.jenjang && g.jenjang.startsWith('SMP')).length;
      document.getElementById('statSMA').textContent = data.filter(g => g.jenjang && (g.jenjang.startsWith('SMA') || g.jenjang.startsWith('PRA'))).length;
    }
  } catch (err) {
    console.error('Error fetching stats:', err.message);
  }
}

function renderGenerusView(container) {
  container.innerHTML = `
    <div class="card">
      <div class="flex justify-between items-center" style="margin-bottom:16px;">
        <input type="text" placeholder="Cari nama generus..." style="padding:8px 12px; border:1px solid var(--line); border-radius:6px; width:240px;">
        <button class="btn btn-green btn-sm" onclick="showToast('Fitur Tambah Generus')">+ Tambah Generus</button>
      </div>
      <div class="empty-state">
        <div class="empty-title">Data Generus</div>
        <div class="empty-desc">Menampilkan seluruh data generus binaan.</div>
      </div>
    </div>
  `;
}

// ==========================================
// 6. KELOLA KELAS & PAUD/TK MANAGEMENT
// ==========================================
async function openModalKelas() {
  document.getElementById('modalKelasOverlay').classList.add('active');
  await loadDataKelas();
}

function closeModalKelas() {
  document.getElementById('modalKelasOverlay').classList.remove('active');
}

async function loadDataKelas() {
  const tbody = document.getElementById('tabelKelasBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Memuat data kelas...</td></tr>';

  try {
    const { data, error } = await supabaseClient
      .from('kelas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada kelas terdaftar.</td></tr>';
      return;
    }

    AppState.cache.kelasList = data;
    tbody.innerHTML = data.map((item, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><b>${escapeHtml(item.nama_kelas)}</b></td>
        <td><span class="badge ${getJenjangBadgeClass(item.jenjang)}">${escapeHtml(item.jenjang)}</span></td>
        <td class="text-center">Semester ${item.semester}</td>
        <td class="text-center">
          <button class="btn-icon danger" onclick="deleteKelas('${item.id}')" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--rose);">Gagal memuat data: ${err.message}</td></tr>`;
  }
}

async function handleTambahKelas(e) {
  e.preventDefault();

  const namaKelas = document.getElementById('inputNamaKelas').value.trim();
  const jenjang = document.getElementById('selectJenjangKelas').value;
  const semester = document.getElementById('selectSemesterKelas').value;

  if (!namaKelas || !jenjang) {
    showToast('Harap isi nama kelas dan jenjang!', 'error');
    return;
  }

  showLoading(true);
  try {
    const payload = {
      nama_kelas: namaKelas,
      jenjang: jenjang,
      semester: parseInt(semester, 10),
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseClient.from('kelas').insert([payload]);
    if (error) throw error;

    showToast('Kelas berhasil ditambahkan!');
    document.getElementById('formTambahKelas').reset();
    await loadDataKelas();
  } catch (err) {
    showToast('Gagal menambahkan kelas: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function deleteKelas(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;

  showLoading(true);
  try {
    const { error } = await supabaseClient.from('kelas').delete().eq('id', id);
    if (error) throw error;

    showToast('Kelas berhasil dihapus.');
    await loadDataKelas();
  } catch (err) {
    showToast('Gagal menghapus kelas: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

function getJenjangBadgeClass(jenjang) {
  if (jenjang === 'PAUD TK') return 'badge-gold';
  if (jenjang.startsWith('SD')) return 'badge-green';
  if (jenjang.startsWith('SMP')) return 'badge-gray';
  return 'badge-rose';
}

// ==========================================
// 7. UTILITY & UI HELPERS
// ==========================================
function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('pendingScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'none';
}

function showPendingScreen(username) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('pendingScreen').style.display = 'flex';
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('pendingUsername').textContent = username;
}

function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (show) el.classList.add('show');
  else el.classList.remove('show');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type === 'error' ? 'error' : ''}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showAlert(container, type, message) {
  container.className = `alert ${type}`;
  container.textContent = message;
  container.style.display = 'block';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
