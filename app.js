/* ============================================================
   KITABAH v2 — app.js
   Supabase-based, PWA-ready
   ============================================================ */

const SEM1_MONTHS = ['Juli','Agustus','September','Oktober','November','Desember'];
const SEM2_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni'];

// Hitung tahun ajaran otomatis: Jul-Des = "2026/2027", Jan-Jun = "2025/2026"
// Urutan kelas usia yang benar
const KELAS_ORDER = {'CABERAWIT':1,'PRA REMAJA':2,'REMAJA':3,'PRA NIKAH':4};
function getKelasOrder(namaKelas) {
  const nm = (namaKelas||'').toUpperCase().trim();
  if (nm.startsWith('CABERAWIT')) return 1000 + nm.charCodeAt(nm.length-1);
  if (nm.startsWith('PRA REMAJA')) return 2000 + nm.charCodeAt(nm.length-1);
  if (nm.startsWith('REMAJA')) return 3000 + nm.charCodeAt(nm.length-1);
  if (nm.startsWith('PRA NIKAH')) return 4000 + nm.charCodeAt(nm.length-1);
  return 9000 + nm.charCodeAt(0);
}
function sortKelas(list) {
  return [...list].sort((a,b) => getKelasOrder(a.nama_kelas) - getKelasOrder(b.nama_kelas));
}

function getTahunAjaran(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12
  return m >= 7 ? `${y}/${y+1}` : `${y-1}/${y}`;
}
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
  const loginEl = document.getElementById('loginScreen');
  const pendingEl = document.getElementById('pendingScreen');
  const shellEl = document.getElementById('appShell');
  if (loginEl) loginEl.style.display = 'none';
  if (shellEl) shellEl.style.display = 'none';
  if (pendingEl) {
    pendingEl.style.display = 'flex';
    document.getElementById('pendingUsername').textContent = username;
  }
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
    const msg = `Halo Admin PPG SIDUTA, saya ${namaLengkap} (username: ${username}) baru mendaftar. Mohon diperiksa. Terima kasih.`;
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

/* ===== WIZARD REGISTRASI ===== */
const WIZ_STATE = {
  level: '',       // daerah / desa / kelompok
  jabatan: '',     // role value
  jabatanLabel: '',
  bidang: '',
  kelasUsia: '',
  desaId: '',
  kelompokId: '',
};

const JABATAN_CONFIG = {
  daerah: [
    { val:'daerah', icon:'👑', label:'Ulil Amri', sub:'Pimpinan daerah' },
    { val:'daerah', icon:'📋', label:'Penghar PPG', sub:'Pengurus harian daerah' },
    { val:'daerah_bidang', icon:'🏢', label:'Bidang PPG', sub:'Pilih salah satu bidang' },
  ],
  desa: [
    { val:'desa', icon:'👑', label:'Ulil Amri', sub:'Pimpinan desa' },
    { val:'pjp_desa_kbm', icon:'📚', label:'PJP Desa KBM', sub:'Penanggung jawab KBM desa' },
    { val:'pjp_desa_sarpras', icon:'🏗️', label:'PJP Desa Sarpras', sub:'Sarana dan prasarana' },
    { val:'pjp_desa_bk', icon:'🤝', label:'PJP Desa BK', sub:'Bimbingan konseling' },
  ],
  kelompok: [
    { val:'kelompok', icon:'👑', label:'Ulil Amri', sub:'Pimpinan kelompok' },
    { val:'pjp_kelompok', icon:'📋', label:'PJP Kelompok', sub:'Penanggung jawab program' },
    { val:'wali_kbm', icon:'🎓', label:'Wali KBM', sub:'Pilih kelas usia yang diampu' },
    { val:'guru', icon:'👨‍🏫', label:'Guru Generus', sub:'Pengajar generus' },
  ],
};

// Role mapping ke database (harus sesuai constraint: admin/daerah/desa/pjp_kelompok/wali_kbm/guru/kelompok)
const JABATAN_ROLE = {
  daerah:           'daerah',
  daerah_bidang:    'daerah',
  pjp_desa_kbm:     'desa',
  pjp_desa_sarpras: 'desa',
  pjp_desa_bk:      'desa',
  kelompok:         'kelompok',
  pjp_kelompok:     'pjp_kelompok',
  wali_kbm:         'wali_kbm',
  guru:             'guru',
};

// Mapping nama desa ke ID database
const DESA_ID_MAP = {
  'Desa Barat 1':  'D1',
  'Desa Barat 2':  'D2',
  'Desa Tengah 1': 'D3',
  'Desa Tengah 2': 'D4',
  'Desa Timur 1':  'D5',
  'Desa Timur 2':  'D6',
};

window.WIZ_setLevel = (level, el) => {
  // Reset semua state
  WIZ_STATE.level = level;
  WIZ_STATE.jabatan = '';
  WIZ_STATE.jabatanLabel = '';
  WIZ_STATE.bidang = '';
  WIZ_STATE.kelasUsia = '';
  WIZ_STATE.desaId = '';
  WIZ_STATE.kelompokId = '';

  // Highlight card yang dipilih
  document.querySelectorAll('#levelGrid .wiz-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  // Tampilkan jabatan
  const jabs = JABATAN_CONFIG[level] || [];
  document.getElementById('jabatanOptions').innerHTML = jabs.map(j => `
    <div class="jabatan-item" data-val="${j.val}" onclick="WIZ_setJabatan('${j.val}','${j.label}',this)">
      <span class="jab-icon">${j.icon}</span>
      <div>
        <div class="jab-label">${j.label}</div>
        <div class="jab-sub">${j.sub}</div>
      </div>
    </div>`).join('');

  document.getElementById('jabatanGrid').style.display = 'block';
  document.getElementById('bidangField').style.display = 'none';
  document.getElementById('kelasUsiaField').style.display = 'none';
  document.getElementById('wizNext1').disabled = true;
  document.getElementById('wizNext1').style.opacity = '.5';
};

window.WIZ_setJabatan = (val, label, el) => {
  WIZ_STATE.jabatan = val;
  WIZ_STATE.jabatanLabel = label;
  WIZ_STATE.bidang = '';
  WIZ_STATE.kelasUsia = '';

  document.querySelectorAll('#jabatanOptions .jabatan-item').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  // Tampilkan field bidang atau kelas usia jika perlu
  document.getElementById('bidangField').style.display = val === 'daerah_bidang' ? 'block' : 'none';
  document.getElementById('kelasUsiaField').style.display = val === 'wali_kbm' ? 'block' : 'none';

  // Enable next jika tidak butuh pilihan tambahan
  if (val !== 'daerah_bidang' && val !== 'wali_kbm') {
    document.getElementById('wizNext1').disabled = false;
    document.getElementById('wizNext1').style.opacity = '1';
  } else {
    document.getElementById('wizNext1').disabled = true;
    document.getElementById('wizNext1').style.opacity = '.5';
  }
};

window.WIZ_setKelasUsia = (kelas, el) => {
  WIZ_STATE.kelasUsia = kelas;
  document.querySelectorAll('#kelasUsiaGrid .wiz-card-sm').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('wizNext1').disabled = false;
  document.getElementById('wizNext1').style.opacity = '1';
};

document.addEventListener('change', e => {
  if (e.target.id === 'regBidang') {
    WIZ_STATE.bidang = e.target.value;
    const ok = !!e.target.value;
    document.getElementById('wizNext1').disabled = !ok;
    document.getElementById('wizNext1').style.opacity = ok ? '1' : '.5';
  }
});

window.WIZ_next1 = () => {
  if (!WIZ_STATE.jabatan) return;
  // Semua jabatan level desa dan kelompok butuh pilih desa
  const needsDesa = ['desa','pjp_desa_kbm','pjp_desa_sarpras','pjp_desa_bk',
    'kelompok','pjp_kelompok','wali_kbm','guru'].includes(WIZ_STATE.jabatan);
  const needsKelompok = ['kelompok','pjp_kelompok','wali_kbm','guru'].includes(WIZ_STATE.jabatan);

  if (needsDesa) {
    // Go to step 2
    document.getElementById('desaField').style.display = 'block';
    document.getElementById('kelompokField').style.display = 'none';
    // Reset pilihan desa/kelompok
    document.getElementById('regDesa').value = '';
    document.getElementById('regKelompok').innerHTML = '<option value="">Pilih kelompok...</option>';
    document.getElementById('wizNext2').disabled = true;
    document.getElementById('wizNext2').style.opacity = '.5';
    // Sembunyikan step 1, tampilkan step 2
    document.getElementById('wizStep1').style.display = 'none';
    document.getElementById('wizStep2').style.display = 'block';
    document.getElementById('wizStep3').style.display = 'none';
    WIZ_updateProgress(2);
  } else {
    // Level daerah — skip step 2, langsung step 3
    WIZ_goStep3();
  }
};

window.WIZ_onDesaChange = async (desaId) => {
  WIZ_STATE.desaId = desaId;
  WIZ_STATE.kelompokId = '';
  const needsKelompok = ['kelompok','pjp_kelompok','wali_kbm','guru'].includes(WIZ_STATE.jabatan);
  const kelompokSel = document.getElementById('regKelompok');
  const kelompokField = document.getElementById('kelompokField');

  if (needsKelompok && desaId) {
    kelompokField.style.display = 'block';
    kelompokSel.innerHTML = '<option value="">Memuat...</option>';
    try {
      const allKlp = await sbFetch('kelompok?select=id,nama,desa_id&order=nama');
      const klpDesa = allKlp.filter(k => {
        const desaMap = {'Desa Barat 1':'D1','Desa Barat 2':'D2','Desa Tengah 1':'D3',
                         'Desa Tengah 2':'D4','Desa Timur 1':'D5','Desa Timur 2':'D6'};
        return k.desa_id === desaMap[desaId];
      });
      kelompokSel.innerHTML = '<option value="">Pilih kelompok...</option>' +
        klpDesa.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
    } catch(e) {
      kelompokSel.innerHTML = '<option value="">Gagal memuat</option>';
    }
  } else {
    kelompokField.style.display = 'none';
  }
  WIZ_checkStep2();
};

window.WIZ_checkStep2 = () => {
  const needsKelompok = ['kelompok','pjp_kelompok','wali_kbm','guru'].includes(WIZ_STATE.jabatan);
  const desaOk = !!document.getElementById('regDesa').value;
  const kelompokOk = !needsKelompok || !!document.getElementById('regKelompok').value;
  const ok = desaOk && kelompokOk;
  document.getElementById('wizNext2').disabled = !ok;
  document.getElementById('wizNext2').style.opacity = ok ? '1' : '.5';
  if (needsKelompok) WIZ_STATE.kelompokId = document.getElementById('regKelompok').value;
};

window.WIZ_next2 = () => {
  WIZ_STATE.desaId = document.getElementById('regDesa').value;
  if (['kelompok','pjp_kelompok','wali_kbm','guru'].includes(WIZ_STATE.jabatan)) {
    WIZ_STATE.kelompokId = document.getElementById('regKelompok').value;
  }
  WIZ_goStep3();
};

function WIZ_goStep3() {
  // Sembunyikan step 1 dan 2, tampilkan step 3
  document.getElementById('wizStep1').style.display = 'none';
  document.getElementById('wizStep2').style.display = 'none';
  document.getElementById('wizStep3').style.display = 'block';
  WIZ_updateProgress(3);

  // Tampilkan ringkasan pilihan
  const parts = [];
  if (WIZ_STATE.level === 'daerah') parts.push('Level Daerah');
  else if (WIZ_STATE.level === 'desa') parts.push('Level Desa');
  else parts.push('Level Kelompok');
  parts.push(WIZ_STATE.jabatanLabel);
  if (WIZ_STATE.bidang) parts.push(WIZ_STATE.bidang);
  if (WIZ_STATE.kelasUsia) parts.push('Kelas ' + WIZ_STATE.kelasUsia);
  if (WIZ_STATE.desaId) parts.push(WIZ_STATE.desaId);
  if (WIZ_STATE.kelompokId) {
    const sel = document.getElementById('regKelompok');
    const opt = sel?.options[sel?.selectedIndex];
    if (opt?.text) parts.push(opt.text);
  }
  document.getElementById('wizSummary').innerHTML =
    '\u2713 ' + parts.join(' \u203A ');
}

window.WIZ_back = (fromStep) => {
  // Sembunyikan semua step dulu
  document.getElementById('wizStep1').style.display = 'none';
  document.getElementById('wizStep2').style.display = 'none';
  document.getElementById('wizStep3').style.display = 'none';

  if (fromStep === 2) {
    // Kembali ke step 1
    document.getElementById('wizStep1').style.display = 'block';
    WIZ_updateProgress(1);
  } else if (fromStep === 3) {
    // Kembali ke step 2 kalau ada, atau step 1
    const needsDesa = ['desa','pjp_desa_kbm','pjp_desa_sarpras','pjp_desa_bk',
      'kelompok','pjp_kelompok','wali_kbm','guru'].includes(WIZ_STATE.jabatan);
    if (needsDesa) {
      document.getElementById('wizStep2').style.display = 'block';
      WIZ_updateProgress(2);
    } else {
      document.getElementById('wizStep1').style.display = 'block';
      WIZ_updateProgress(1);
    }
  }
};

function WIZ_updateProgress(step) {
  const pct = step === 1 ? 33 : step === 2 ? 66 : 100;
  document.getElementById('wizProgressBar').style.width = pct + '%';
  ['1','2','3'].forEach(s => {
    const el = document.getElementById('wizStep'+s+'Label');
    if (el) el.style.color = parseInt(s) <= step ? 'var(--green)' : '#ccc';
  });
}

function WIZ_resetWizard() {
  // Reset state
  WIZ_STATE.level = '';
  WIZ_STATE.jabatan = '';
  WIZ_STATE.jabatanLabel = '';
  WIZ_STATE.bidang = '';
  WIZ_STATE.kelasUsia = '';
  WIZ_STATE.desaId = '';
  WIZ_STATE.kelompokId = '';

  // Reset UI step 1
  document.querySelectorAll('#levelGrid .wiz-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('jabatanGrid').style.display = 'none';
  document.getElementById('bidangField').style.display = 'none';
  document.getElementById('kelasUsiaField').style.display = 'none';
  document.querySelectorAll('#kelasUsiaGrid .wiz-card-sm').forEach(c => c.classList.remove('selected'));

  // Reset UI step 2
  document.getElementById('regDesa').value = '';
  document.getElementById('regKelompok').innerHTML = '<option value="">Pilih kelompok...</option>';
  document.getElementById('desaField').style.display = 'none';
  document.getElementById('kelompokField').style.display = 'none';

  // Restore step 3 HTML (bisa ter-replace setelah daftar sukses)
  const step3 = document.getElementById('wizStep3');
  if (!step3.querySelector('#regNama')) {
    step3.innerHTML = `
      <div id="wizSummary" style="background:#f0f7f2; border-radius:8px; padding:10px 14px; margin-bottom:16px; font-size:12.5px; color:#1B3A2C;"></div>
      <div id="wizAlert"></div>
      <div class="field">
        <label>Nama Lengkap</label>
        <input type="text" id="regNama" placeholder="Nama Anda sesuai data">
      </div>
      <div class="field">
        <label>Nama Pengguna</label>
        <input type="text" id="regUser" placeholder="contoh: budi.santoso" autocomplete="username">
      </div>
      <div class="field">
        <label>Kata Sandi</label>
        <input type="password" id="regPass" placeholder="Min. 6 karakter" autocomplete="new-password">
      </div>
      <div style="display:flex; gap:8px; margin-top:4px;">
        <button class="btn-outline" style="flex:1;" onclick="WIZ_back(3)">\u2190 Kembali</button>
        <button class="btn-primary" style="flex:2;" id="regBtn" onclick="doRegister()">Daftar Sekarang</button>
      </div>
      <div class="login-hint" style="margin-top:12px;">Setelah mendaftar, akun perlu disetujui admin sebelum dapat masuk.</div>`;
  } else {
    // Reset form fields
    document.getElementById('regNama').value = '';
    document.getElementById('regUser').value = '';
    document.getElementById('regPass').value = '';
    const wizAlert = document.getElementById('wizAlert');
    if (wizAlert) wizAlert.innerHTML = '';
  }

  // Tampilkan step 1, sembunyikan lainnya
  document.getElementById('wizStep1').style.display = 'block';
  document.getElementById('wizStep2').style.display = 'none';
  document.getElementById('wizStep3').style.display = 'none';
  WIZ_updateProgress(1);
}

async function doRegister() {
  const namaLengkap = document.getElementById('regNama').value.trim();
  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  const alertEl = document.getElementById('wizAlert') || document.getElementById('loginAlert');
  if (alertEl) alertEl.innerHTML = '';

  if (!WIZ_STATE.jabatan) {
    alertEl.innerHTML = '<div class="alert error">Pilih jenis akun terlebih dahulu.</div>'; return;
  }
  if (!namaLengkap || !username || !password) {
    alertEl.innerHTML = '<div class="alert error">Semua field wajib diisi.</div>'; return;
  }
  if (password.length < 6) {
    alertEl.innerHTML = '<div class="alert error">Kata sandi minimal 6 karakter.</div>'; return;
  }

  const btn = document.getElementById('regBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Mendaftarkan...';

  try {
    // Cek username langsung per query
    const cek = await sbFetch(`anggota?username=eq.${encodeURIComponent(username.toLowerCase())}&select=id`);
    if (cek && cek.length > 0) {
      if (alertEl) alertEl.innerHTML = '<div class="alert error">Nama pengguna sudah dipakai, coba yang lain.</div>';
      btn.disabled = false;
      btn.textContent = 'Daftar Sekarang';
      return;
    }

    // Buat label jabatan lengkap untuk catatan
    const jabatanLengkap = [
      WIZ_STATE.jabatanLabel,
      WIZ_STATE.bidang || '',
      WIZ_STATE.kelasUsia ? 'Kelas ' + WIZ_STATE.kelasUsia : '',
    ].filter(Boolean).join(' - ');

    const role = JABATAN_ROLE[WIZ_STATE.jabatan] || 'kelompok';

    await SB.anggota.register({
      username: username.toLowerCase(),
      password_hash: password,
      nama_lengkap: toTitleCase(namaLengkap),
      role,
      status: 'pending',
      kelompok_id: WIZ_STATE.kelompokId || null,
      desa_id: DESA_ID_MAP[WIZ_STATE.desaId] || WIZ_STATE.desaId || null,
      jabatan: jabatanLengkap,
    });

    // Register selalu berhasil (data masuk meski Supabase return 409)
    // Tampilkan pesan sukses langsung di form
    document.getElementById('wizStep3').innerHTML = `
      <div style="text-align:center; padding:20px 0;">
        <div style="width:56px; height:56px; border-radius:50%; background:#e8f5e9; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:28px;">✓</div>
        <div style="font-size:18px; font-weight:800; color:var(--green); margin-bottom:8px;">Pendaftaran Berhasil!</div>
        <div style="font-size:13px; color:var(--ink-soft); margin-bottom:6px;">Akun <b>${escHtml(username)}</b> sudah terdaftar.</div>
        <div style="font-size:13px; color:var(--ink-soft); margin-bottom:20px;">Admin perlu menyetujui akun Anda sebelum dapat masuk.</div>
        <button class="btn-primary" onclick="location.reload()">Kembali ke Login</button>
      </div>`;
    return;

  } catch(e) {
    if (alertEl) alertEl.innerHTML = `<div class="alert error">${escHtml(e.message || 'Terjadi kesalahan')}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Daftar Sekarang';
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
function meetIcon() { return SVG('<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'); }
function contactIcon() { return SVG('<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>'); }
function briefcaseIcon() { return SVG('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>'); }
function listIcon() { return SVG('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'); }
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
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'daftar_kelas', icon: listIcon(), label: 'Kelas Tiap Kelompok' },
    { id: 'users', icon: userIcon(), label: 'Kelola Pengguna' },
    { id: 'proker', icon: briefcaseIcon(), label: 'Program Kerja PPG' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus', section: 'KELOLA' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah', section: 'LAPORAN' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  daerah: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard Daerah' },
    { id: 'rekap_daerah', icon: chartIcon(), label: 'Rekap Semua Desa' },
    { id: 'santri', icon: usersIcon(), label: 'Data Generus' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'proker', icon: briefcaseIcon(), label: 'Program Kerja PPG' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah', section: 'LAPORAN' },
  ],
  desa: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard Desa' },
    { id: 'rekap_desa', icon: chartIcon(), label: 'Rekap Kelompok' },
    { id: 'santri', icon: usersIcon(), label: 'Data Generus' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah', section: 'LAPORAN' },
  ],
  pjp_kelompok: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN' },
    { id: 'absensi', icon: calIcon(), label: 'Absensi & Jurnal' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'KELOLA' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah', section: 'LAPORAN' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  wali_kbm: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah', section: 'LAPORAN' },
  ],
  guru: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum Kelas Saya' },
    { id: 'absensi', icon: calIcon(), label: 'Input Absensi & Jurnal' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah', section: 'LAPORAN' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  kelompok: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah', section: 'LAPORAN' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
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
      case 'absensi':     await renderAbsensi(); break;
      case 'santri':      await renderSantri(); break;
      case 'kelola_kelas': await renderKelolaKelas(); break;
      case 'daftar_kelas': await renderDaftarKelas(); break;
      case 'users':       await renderUsers(); break;
      case 'settings':    await renderSettings(); break;
      case 'rekap':       await renderRekap(); break;
      case 'proker':      await renderProker(); break;
      case 'pengurus':    await renderPengurus(); break;
      case 'musyawarah':  await renderMusyawarah(); break;
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
    const [allUsers, allKelompok] = await Promise.all([SB.anggota.getAll(), SB.kelompok.getAll()]);
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
    { page: 'users', emoji: '⚙️', label: 'Kelola Pengguna', roles: ['admin'] },
    { page: 'rekap', emoji: '📊', label: 'Rekap KBM', roles: ['admin','kelompok','pjp_kelompok','wali_kbm'] },
    { page: 'rekap_desa', emoji: '🏡', label: 'Rekap Desa', roles: ['admin','desa'] },
    { page: 'rekap_daerah', emoji: '🗺️', label: 'Rekap Daerah', roles: ['admin','daerah'] },
    { page: 'proker', emoji: '💼', label: 'Program Kerja PPG', roles: ['admin','daerah'] },
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
    const prog = await SB.progress.getByKelompok(App.user.kelompok_id, getTahunAjaran());
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
      const result = await SB.progress.toggle(App.user.kelompok_id, materiId, bulan, App.user.id, getTahunAjaran());
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
    SB.anggota.getAll(), SB.kelompok.getAll(), SB.desa.getAll()
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
    if (!list.length) return '<tr><td colspan="7" style="text-align:center; color:var(--ink-soft); padding:24px;">Tidak ada data</td></tr>';
    return list.map(u => `
      <tr>
        <td>
          <b>${escHtml(u.nama_lengkap)}</b>
          ${u.jabatan ? `<br><span style="font-size:11px; color:var(--green);">${escHtml(u.jabatan)}</span>` : ''}
        </td>
        <td><span style="font-size:12px;">${escHtml(ROLE_LABELS[u.role] || u.role)}</span></td>
        <td style="font-size:12px;">${u.kelompok_id ? escHtml(kelompokMap[u.kelompok_id] || u.kelompok_id) : (u.desa_id ? escHtml(desaMap[u.desa_id] || u.desa_id) : '—')}</td>
        <td style="font-size:11px; font-family:monospace;">
          <div>👤 ${escHtml(u.username)}</div>
          <div>🔑 ${escHtml(u.password_hash || '-')}</div>
        </td>
        <td>${badge(u.status)}</td>
        <td style="font-size:11px; color:var(--ink-soft);">${fmtDateShort(u.created_at)}</td>
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
        <thead><tr><th>Nama & Dapukan</th><th>Level</th><th>Kelompok / Desa</th><th>User & Password</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(pending)}</tbody>
      </table></div>
    </div>` : ''}
    <div class="card">
      <div class="fw-bold color-green" style="margin-bottom:12px;">✅ Pengguna Aktif (${approved.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama & Dapukan</th><th>Level</th><th>Kelompok / Desa</th><th>User & Password</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(approved)}</tbody>
      </table></div>
    </div>
    ${rejected.length > 0 ? `
    <div class="card">
      <div class="fw-bold" style="color:var(--rose); margin-bottom:12px;">✕ Ditolak (${rejected.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama & Dapukan</th><th>Level</th><th>Kelompok / Desa</th><th>User & Password</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(rejected)}</tbody>
      </table></div>
    </div>` : ''}
  `;

  window.USR_approve = async (id) => {
    await SB.anggota.approve(id);
    showToast('Pengguna disetujui');
    await renderUsers();
  };
  window.USR_reject = async (id) => {
    await SB.anggota.reject(id);
    showToast('Pendaftaran ditolak');
    await renderUsers();
  };
  window.USR_delete = async (id, nama) => {
    if (!confirm(`Hapus pengguna "${nama}"?`)) return;
    await SB.anggota.delete(id);
    showToast('Pengguna dihapus');
    await renderUsers();
  };
}

/* ===== PAGE: SANTRI ===== */
async function renderSantri() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin' || u.role === 'daerah';
  const isDesa = u.role === 'desa';
  const isKelompok = u.role === 'kelompok' || u.role === 'pjp_kelompok' || u.role === 'guru';

  // Load data master kelompok
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

  // ── Tampilkan dashboard dulu ──
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div><div style="margin-top:12px; color:var(--ink-soft); font-size:13px;">Memuat data generus...</div></div>';

  // Load semua santri sekaligus
  const allSantri = await SB.santri.getAll();

  // Filter sesuai role
  const kelompokList = App.cache.kelompok || [];
  let filteredKelompok = kelompokList;
  if (isDesa) {
    filteredKelompok = kelompokList.filter(k => k.desa_id === u.desa_id || k.desa?.id === u.desa_id);
  } else if (isKelompok) {
    filteredKelompok = kelompokList.filter(k => k.id === u.kelompok_id);
  }

  const kelompokIds = new Set(filteredKelompok.map(k => k.id));
  const santriFiltered = allSantri.filter(s => {
    const kid = s.kelas?.kelompok_id;
    return kelompokIds.has(kid);
  });

  // Hitung statistik per tingkatan per kelompok
  const TINGKATAN_LIST = ['caberawit','pra_remaja','remaja','pra_nikah'];

  function hitungStats(santriArr) {
    const s = {};
    TINGKATAN_LIST.forEach(t => { s[t] = {L:0, P:0}; });
    s.total = {L:0, P:0};
    santriArr.forEach(x => {
      const t = x.tingkatan_override ? x.tingkatan : hitungTingkatan(x.tgl_lahir);
      const jk = x.jenis_kel;
      if (t && s[t] && (jk === 'L' || jk === 'P')) {
        s[t][jk]++;
        s.total[jk]++;
      }
    });
    return s;
  }

  function statRow(label, stats, isHeader=false, indent=false) {
    const tot = (stats.total.L||0) + (stats.total.P||0);
    const grand = TINGKATAN_LIST.reduce((n,t) => n + (stats[t].L||0) + (stats[t].P||0), 0);
    const bg = isHeader ? 'background:var(--green); color:#fff;' : indent ? 'background:var(--white);' : 'background:var(--green-soft);';
    const fw = isHeader || !indent ? 'font-weight:700;' : '';
    const pad = indent ? 'padding-left:20px;' : '';
    return `<tr style="${bg}${fw}">
      <td style="${pad} padding:8px 10px; font-size:${indent?'12':'13'}px;">${escHtml(label)}</td>
      ${TINGKATAN_LIST.map(t => `
        <td style="text-align:center; padding:6px 4px; font-size:12px;">
          <span style="color:${isHeader?'#cfe':'#1a6b3a'};">${stats[t].L||0}L</span>
          <span style="color:${isHeader?'#fcc':'#a6483b'}; margin-left:3px;">${stats[t].P||0}P</span>
        </td>`).join('')}
      <td style="text-align:center; padding:6px 8px; font-weight:800; font-size:13px;">${grand}</td>
    </tr>`;
  }

  // Group kelompok per desa
  const desaMap = {};
  filteredKelompok.forEach(k => {
    const desaNama = k.desa?.nama || k.desa_id || 'Lainnya';
    if (!desaMap[desaNama]) desaMap[desaNama] = [];
    desaMap[desaNama].push(k);
  });

  // Hitung statistik total
  const statsTotal = hitungStats(santriFiltered);
  const totalGenerus = santriFiltered.length;

  // ── Render header tabel ──
  const tabelHeader = `
    <div class="table-wrap">
    <table style="min-width:600px; border-collapse:collapse; width:100%;">
      <thead>
        <tr style="background:var(--green); color:#fff;">
          <th style="padding:10px; text-align:left; font-size:12px;">Kelompok / Desa</th>
          <th style="text-align:center; padding:8px 4px; font-size:11px;">Caberawit</th>
          <th style="text-align:center; padding:8px 4px; font-size:11px;">Pra Remaja</th>
          <th style="text-align:center; padding:8px 4px; font-size:11px;">Remaja</th>
          <th style="text-align:center; padding:8px 4px; font-size:11px;">Pra Nikah</th>
          <th style="text-align:center; padding:8px; font-size:11px;">Total</th>
        </tr>
      </thead>
      <tbody>`;

  let tabelBody = '';

  if (isAdmin) {
    // Admin: total daerah + per desa + per kelompok
    tabelBody += statRow('TOTAL SELURUH DAERAH', statsTotal, true);
    Object.entries(desaMap).forEach(([desaNama, klpList], desaIdx) => {
      const santriDesa = santriFiltered.filter(s => {
        const k = klpList.find(k => k.id === s.kelas?.kelompok_id);
        return !!k;
      });
      const statsDesa = hitungStats(santriDesa);
      // Baris spasi antar desa (kecuali yang pertama sudah ada setelah total)
      if (desaIdx > 0) {
        tabelBody += `<tr><td colspan="6" style="padding:4px; background:var(--line); height:4px;"></td></tr>`;
      }
      tabelBody += `<tr style="background:#e8f0e8;"><td colspan="6" style="padding:8px 10px; font-size:13px; font-weight:800; color:var(--green); border-top:2px solid var(--green);">📍 ${escHtml(desaNama)} &nbsp;·&nbsp; ${santriDesa.length} generus</td></tr>`;
      tabelBody += statRow('Total ' + desaNama, statsDesa, false, false);
      klpList.forEach(k => {
        const santriKlp = santriFiltered.filter(s => s.kelas?.kelompok_id === k.id);
        const statsKlp = hitungStats(santriKlp);
        tabelBody += statRow(k.nama, statsKlp, false, true);
      });
    });
  } else if (isDesa) {
    // Desa: total desa + per kelompok
    tabelBody += statRow('TOTAL ' + (u.desa_nama || 'DESA SAYA'), statsTotal, true);
    Object.entries(desaMap).forEach(([desaNama, klpList]) => {
      klpList.forEach(k => {
        const santriKlp = santriFiltered.filter(s => s.kelas?.kelompok_id === k.id);
        const statsKlp = hitungStats(santriKlp);
        tabelBody += statRow(k.nama, statsKlp, false, true);
      });
    });
  } else {
    // Kelompok/PJP: total kelompok + detail per kelas
    const klp = filteredKelompok[0];
    tabelBody += statRow(klp?.nama || 'Kelompok Saya', statsTotal, true);

    // Load kelas untuk kelompok ini
    const myKelasList = sortKelas(await SB.kelas.getByKelompok(klp?.id || u.kelompok_id));

    for (const kls of myKelasList) {
      const santriKelas = santriFiltered.filter(s => s.kelas?.id === kls.id);
      const lCount = santriKelas.filter(s => s.jenis_kel === 'L').length;
      const pCount = santriKelas.filter(s => s.jenis_kel === 'P').length;

      tabelBody += `<tr style="background:var(--green-soft); border-top:2px solid var(--green);">
        <td style="padding:8px 10px; font-size:13px; font-weight:700; color:var(--green);">${escHtml(kls.nama_kelas || kls.jenjang)}</td>
        <td colspan="4" style="padding:8px 10px; font-size:12px; color:var(--ink-soft);">
          <span style="color:#1a6b3a; font-weight:700;">${lCount} L</span> · <span style="color:#a6483b; font-weight:700;">${pCount} P</span>
        </td>
        <td style="text-align:center; font-weight:800; font-size:13px;">${santriKelas.length}</td>
      </tr>`;

      if (santriKelas.length) {
        santriKelas.sort((a,b) => (a.nama||'').localeCompare(b.nama||'')).forEach((s, idx) => {
          tabelBody += `<tr style="border-bottom:1px solid var(--line);">
            <td colspan="5" style="padding:4px 10px 4px 24px; font-size:12.5px;">
              ${idx+1}. ${escHtml(s.nama)}
              <span style="color:${s.jenis_kel==='L'?'#1a6b3a':'#a6483b'}; font-weight:600; margin-left:4px;">(${s.jenis_kel})</span>
              ${s.tgl_lahir ? `<span style="color:var(--ink-soft); font-size:11px; margin-left:4px;">${hitungUsia(s.tgl_lahir)} thn</span>` : ''}
            </td>
            <td></td>
          </tr>`;
        });
      } else {
        tabelBody += `<tr><td colspan="6" style="padding:6px 10px 6px 24px; font-size:12px; color:var(--ink-soft); font-style:italic;">Belum ada santri di kelas ini</td></tr>`;
      }
    }

    if (!myKelasList.length) {
      tabelBody += `<tr><td colspan="6" style="padding:12px 10px; font-size:12px; color:var(--ink-soft); text-align:center;">Belum ada kelas. Tambahkan di menu Kelola Kelas Generus.</td></tr>`;
    }
  }

  const tabelFull = tabelHeader + tabelBody + `</tbody></table></div>`;

  // ── Stat cards ringkasan ──
  const grandTotal = TINGKATAN_LIST.reduce((n,t) => n + (statsTotal[t].L||0) + (statsTotal[t].P||0), 0);
  const grandL = TINGKATAN_LIST.reduce((n,t) => n + (statsTotal[t].L||0), 0);
  const grandP = TINGKATAN_LIST.reduce((n,t) => n + (statsTotal[t].P||0), 0);

  // ── Hitung naik kelas (tahun depan pindah tingkatan) ──
  function hitungTingkatanTahunDepan(tglLahir) {
    if (!tglLahir) return '';
    const lahir = new Date(tglLahir);
    const nextYear = new Date().getFullYear() + 1;
    const juli = new Date(nextYear, 6, 1);
    let usia = juli.getFullYear() - lahir.getFullYear();
    const bl = lahir.getMonth();
    const tg = lahir.getDate();
    if (bl > 6 || (bl === 6 && tg > 1)) usia--;
    if (usia < 13) return 'caberawit';
    if (usia < 16) return 'pra_remaja';
    if (usia < 19) return 'remaja';
    return 'pra_nikah';
  }

  // Map kelompok nama ke santri
  santriFiltered.forEach(s => {
    s.kelompok_nama = s.kelas?.kelompok?.nama || '';
  });

  const naikKelas = { caberawit_to_pra_remaja: [], pra_remaja_to_remaja: [], remaja_to_pra_nikah: [] };
  santriFiltered.forEach(s => {
    const tNow = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
    const tNext = hitungTingkatanTahunDepan(s.tgl_lahir);
    if (tNow && tNext && tNow !== tNext) {
      const key = tNow + '_to_' + tNext;
      if (naikKelas[key]) naikKelas[key].push(s);
    }
  });

  const totalNaik = naikKelas.caberawit_to_pra_remaja.length + naikKelas.pra_remaja_to_remaja.length + naikKelas.remaja_to_pra_nikah.length;

  function naikDetail(list, label) {
    if (!list.length) return '';
    // Group by kelompok
    const byKlp = {};
    list.forEach(s => {
      const kn = s.kelompok_nama || s.kelompok_id || '-';
      if (!byKlp[kn]) byKlp[kn] = 0;
      byKlp[kn]++;
    });
    return Object.entries(byKlp).map(([k,v]) => `${escHtml(k)}: ${v}`).join(', ');
  }

  const statCards = `
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card">
        <div class="stat-num">${grandTotal}</div>
        <div class="stat-label">Total Generus</div>
        <div style="font-size:11px; margin-top:3px; color:var(--ink-soft);">
          <span style="color:#1a6b3a;">${grandL} L</span> · <span style="color:#a6483b;">${grandP} P</span>
        </div>
      </div>
      ${TINGKATAN_LIST.map(t => `
      <div class="stat-card">
        <div class="stat-num" style="font-size:18px;">${(statsTotal[t].L||0)+(statsTotal[t].P||0)}</div>
        <div class="stat-label">${TINGKATAN_LABELS[t]||t}</div>
        <div style="font-size:11px; margin-top:3px; color:var(--ink-soft);">
          <span style="color:#1a6b3a;">${statsTotal[t].L||0}L</span> · <span style="color:#a6483b;">${statsTotal[t].P||0}P</span>
        </div>
      </div>`).join('')}
    </div>

    ${totalNaik > 0 ? `
    <div class="card" style="margin-bottom:16px; border:1.5px solid var(--gold); background:#fffbf0;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <div class="fw-bold" style="color:var(--gold); font-size:14px;">🎓 Prediksi Naik Kelas Tahun Depan</div>
        <div class="badge badge-gold" style="font-size:13px; font-weight:800;">${totalNaik} santri</div>
      </div>
      ${naikKelas.caberawit_to_pra_remaja.length ? `
      <div style="padding:8px 0; border-bottom:1px solid var(--line);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
          <div style="font-size:13px;"><b>CABERAWIT → PRA REMAJA</b> <span class="badge badge-green">${naikKelas.caberawit_to_pra_remaja.length}</span></div>
          <button class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 8px;" onclick="document.getElementById('nkDetail1').style.display=document.getElementById('nkDetail1').style.display==='none'?'block':'none'">Detail</button>
        </div>
        <div id="nkDetail1" style="display:none; margin-top:6px; font-size:12px; color:var(--ink-soft); background:var(--white); border-radius:6px; padding:6px 10px;">
          ${naikDetail(naikKelas.caberawit_to_pra_remaja)}
        </div>
      </div>` : ''}
      ${naikKelas.pra_remaja_to_remaja.length ? `
      <div style="padding:8px 0; border-bottom:1px solid var(--line);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
          <div style="font-size:13px;"><b>PRA REMAJA → REMAJA</b> <span class="badge badge-green">${naikKelas.pra_remaja_to_remaja.length}</span></div>
          <button class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 8px;" onclick="document.getElementById('nkDetail2').style.display=document.getElementById('nkDetail2').style.display==='none'?'block':'none'">Detail</button>
        </div>
        <div id="nkDetail2" style="display:none; margin-top:6px; font-size:12px; color:var(--ink-soft); background:var(--white); border-radius:6px; padding:6px 10px;">
          ${naikDetail(naikKelas.pra_remaja_to_remaja)}
        </div>
      </div>` : ''}
      ${naikKelas.remaja_to_pra_nikah.length ? `
      <div style="padding:8px 0;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
          <div style="font-size:13px;"><b>REMAJA → PRA NIKAH</b> <span class="badge badge-green">${naikKelas.remaja_to_pra_nikah.length}</span></div>
          <button class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 8px;" onclick="document.getElementById('nkDetail3').style.display=document.getElementById('nkDetail3').style.display==='none'?'block':'none'">Detail</button>
        </div>
        <div id="nkDetail3" style="display:none; margin-top:6px; font-size:12px; color:var(--ink-soft); background:var(--white); border-radius:6px; padding:6px 10px;">
          ${naikDetail(naikKelas.remaja_to_pra_nikah)}
        </div>
      </div>` : ''}
    </div>` : ''}`;

  // ── Render awal: dashboard saja, form ada di bawah ──
  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Data Santri / Generus</h1>
    </div>
    ${statCards}
    <div class="card" style="margin-bottom:18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
        <div class="fw-bold color-green" style="font-size:14px;">Rekap Jumlah Generus per Tingkatan</div>
        <button class="btn btn-outline btn-sm" onclick="STR_downloadPdf()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download PDF
        </button>
      </div>
      ${tabelFull}
      <div style="margin-top:8px; font-size:11px; color:var(--ink-soft);">L = Laki-laki · P = Perempuan · Tingkatan dihitung dari usia per 1 Juli ${new Date().getFullYear()}</div>
    </div>
  `;

  // ── Fungsi Download PDF ──
  window.STR_downloadPdf = async () => {
    showToast('Menyiapkan PDF...');
    if (!window.PDFLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg  = await doc.embedFont(StandardFonts.Helvetica);

      // Landscape A4
      const W = 842, H = 595;
      const ML = 36, MR = 36, MT = 40;
      const GREEN = rgb(0.106, 0.227, 0.173);
      const GRAY  = rgb(0.5, 0.5, 0.5);
      const RED   = rgb(0.65, 0.28, 0.23);
      const LGRAY = rgb(0.95, 0.95, 0.95);
      const LGREEN= rgb(0.91, 0.96, 0.91);

      let page = doc.addPage([W, H]);
      let y = H - MT;

      function newPage() { page = doc.addPage([W,H]); y = H - MT; }
      function checkY(n) { if (y < n + 30) newPage(); }

      // Header
      page.drawText('DATA GENERUS PPG SIDOARJO UTARA', { x:ML, y, font:fBold, size:13, color:GREEN });
      y -= 15;
      page.drawText('Tanggal cetak: ' + new Date().toLocaleDateString('id-ID') + '   |   Total: ' + grandTotal + ' generus',
        { x:ML, y, font:fReg, size:9, color:GRAY });
      y -= 8;
      page.drawLine({ start:{x:ML,y}, end:{x:W-MR,y}, thickness:1.5, color:GREEN });
      y -= 18;

      // Kolom tabel
      const COL = [
        { x:ML,    w:140, label:'Kelompok / Desa' },
        { x:ML+140, w:80, label:'Caberawit' },
        { x:ML+220, w:80, label:'Pra Remaja' },
        { x:ML+300, w:80, label:'Remaja' },
        { x:ML+380, w:80, label:'Pra Nikah' },
        { x:ML+460, w:60, label:'Total' },
      ];
      const TCOL = [
        { x:ML+140+5, w:35, label:'L' }, { x:ML+140+40, w:35, label:'P' },
        { x:ML+220+5, w:35, label:'L' }, { x:ML+220+40, w:35, label:'P' },
        { x:ML+300+5, w:35, label:'L' }, { x:ML+300+40, w:35, label:'P' },
        { x:ML+380+5, w:35, label:'L' }, { x:ML+380+40, w:35, label:'P' },
      ];

      // Header tabel
      page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:18, color:GREEN });
      COL.forEach(c => page.drawText(c.label, { x:c.x+4, y:y+0, font:fBold, size:8, color:rgb(1,1,1) }));
      y -= 20;
      // Sub-header L/P
      page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:14, color:rgb(0.2,0.5,0.3) });
      TCOL.forEach((c,i) => {
        page.drawText(c.label, { x:c.x+10, y:y-1, font:fBold, size:8, color:rgb(1,1,1) });
      });
      page.drawText('Jml', { x:ML+464, y:y-1, font:fBold, size:8, color:rgb(1,1,1) });
      y -= 16;

      function drawRow(label, stats, isTotal=false, indent=false) {
        checkY(14);
        const bg = isTotal ? LGREEN : (indent ? rgb(1,1,1) : rgb(0.96,0.98,0.96));
        page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:14, color:bg });
        const grand = TINGKATAN_LIST.reduce((n,t) => n+(stats[t].L||0)+(stats[t].P||0), 0);
        page.drawText((indent ? '  ' : '') + label.slice(0,28),
          { x:ML+4, y:y-1, font:isTotal?fBold:fReg, size:isTotal?8.5:8, color:isTotal?GREEN:rgb(0.1,0.1,0.1) });
        TINGKATAN_LIST.forEach((t,i) => {
          const bx = ML+140 + i*80;
          page.drawText(String(stats[t].L||0), { x:bx+8, y:y-1, font:fReg, size:8, color:rgb(0.1,0.4,0.2) });
          page.drawText(String(stats[t].P||0), { x:bx+42, y:y-1, font:fReg, size:8, color:rgb(0.5,0.1,0.1) });
        });
        page.drawText(String(grand), { x:ML+466, y:y-1, font:fBold, size:8.5, color:GREEN });
        y -= 14;
      }

      if (isAdmin) {
        drawRow('TOTAL SELURUH DAERAH', statsTotal, true);
        Object.entries(desaMap).forEach(([desaNama, klpList], di) => {
          checkY(20);
          if (di > 0) { y -= 6; }
          // Header desa
          page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:15, color:LGREEN });
          page.drawLine({ start:{x:ML,y:y+11}, end:{x:W-MR,y:y+11}, thickness:1.5, color:GREEN });
          const santriDesa = santriFiltered.filter(s => klpList.find(k=>k.id===s.kelas?.kelompok_id));
          page.drawText('Desa ' + desaNama + '  (' + santriDesa.length + ' generus)',
            { x:ML+4, y:y-1, font:fBold, size:9, color:GREEN });
          y -= 16;
          const statsDesa = hitungStats(santriDesa);
          drawRow('Total ' + desaNama, statsDesa, false, false);
          klpList.forEach(k => {
            const sk = santriFiltered.filter(s=>s.kelas?.kelompok_id===k.id);
            drawRow(k.nama, hitungStats(sk), false, true);
          });
        });
      } else if (isDesa) {
        drawRow('TOTAL DESA', statsTotal, true);
        Object.values(desaMap).flat().forEach(k => {
          const sk = santriFiltered.filter(s=>s.kelas?.kelompok_id===k.id);
          drawRow(k.nama, hitungStats(sk), false, true);
        });
      } else {
        drawRow(filteredKelompok[0]?.nama||'Kelompok', statsTotal, true);
      }

      // Keterangan
      y -= 6;
      checkY(16);
      page.drawText('L = Laki-laki   P = Perempuan   Tingkatan dihitung dari usia per 1 Juli ' + new Date().getFullYear(),
        { x:ML, y, font:fReg, size:8, color:GRAY });

      // Footer
      doc.getPages().forEach((p,i) => {
        p.drawText('Hal '+( i+1)+'/'+doc.getPageCount()+'  -  Data Generus PPG Sidoarjo Utara',
          { x:ML, y:22, font:fReg, size:7.5, color:GRAY });
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type:'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Data_Generus_PPG_' + new Date().toISOString().slice(0,10) + '.pdf';
      a.click(); URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
  };
}

/* ===== PAGE: KELOLA KELAS GENERUS ===== */
async function renderKelolaKelas() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Kelola Kelas Generus</h1>
    </div>
    <div class="card">
      <div id="santriFormArea"></div>
    </div>`;

  const formEl = document.getElementById('santriFormArea');

  // ── Form Kelola Kelas Generus ──
  const isAdminForm = u.role === 'admin';

  let selectedKelompokId = u.kelompok_id || null;
  let kelasOptions = [];
  let selectedKelasId = null;
  let santriList = [];

  async function loadKelas(kelompokId) {
    selectedKelompokId = kelompokId;
    selectedKelasId = null;
    santriList = [];
    if (kelompokId) {
      kelasOptions = sortKelas(await SB.kelas.getByKelompok(kelompokId));
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

    formEl.innerHTML = `
      <!-- Pilihan Kelompok (admin) dan Kelas -->
      <div style="margin-bottom:14px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          ${isAdminForm ? `
          <div style="flex:1; min-width:140px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Filter Desa</label>
            <select id="strDesaFilter" onchange="STR_filterDesa(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Semua Desa</option>
              ${['Barat 1','Barat 2','Tengah 1','Tengah 2','Timur 1','Timur 2'].map(d =>
                `<option value="Desa ${d}">Desa ${d}</option>`).join('')}
            </select>
          </div>` : ''}
          ${isAdminForm ? `
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
        ${(selectedKelompokId || !isAdminForm) ? `
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
    kelasOptions = sortKelas(await SB.kelas.getByKelompok(selectedKelompokId));
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

/* ===== PAGE: DAFTAR KELAS TIAP KELOMPOK (admin only) ===== */
async function renderDaftarKelas() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const allKlp = App.cache.kelompok || [];

  // Load kelas per kelompok
  const kelasPerKlp = {};
  await Promise.all(allKlp.map(async klp => {
    kelasPerKlp[klp.id] = sortKelas(await SB.kelas.getByKelompok(klp.id));
  }));

  // Group by desa
  const desaMap = {};
  allKlp.forEach(k => {
    const dNama = k.desa?.nama || k.desa_id || '-';
    if (!desaMap[dNama]) desaMap[dNama] = [];
    desaMap[dNama].push(k);
  });

  let html = `
    <div class="page-header">
      <h1 class="page-title">Kelas Tiap Kelompok</h1>
      <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">Daftar nama kelas yang dibuat di setiap kelompok</p>
    </div>`;

  for (const [desaNama, klpList] of Object.entries(desaMap)) {
    html += `<div class="card" style="margin-bottom:14px;">
      <div class="fw-bold color-green" style="font-size:14px; margin-bottom:12px;">🏘️ ${escHtml(desaNama)}</div>`;

    for (const klp of klpList) {
      const kelasList = kelasPerKlp[klp.id] || [];
      const kelasChips = kelasList.length
        ? kelasList.map(k => {
            const label = k.nama_kelas || k.jenjang;
            return `<span style="display:inline-block; padding:4px 10px; border-radius:16px; font-size:12px; font-weight:600; background:var(--green-soft); color:var(--green); border:1px solid var(--green); margin:2px;">${escHtml(label)}</span>`;
          }).join('')
        : '<span style="font-size:12px; color:var(--ink-soft);">Belum ada kelas</span>';

      html += `
        <div style="display:flex; align-items:flex-start; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line); flex-wrap:wrap; gap:6px;">
          <div style="font-weight:700; font-size:13px; min-width:140px;">${escHtml(klp.nama)}</div>
          <div style="flex:1; display:flex; flex-wrap:wrap; gap:2px;">${kelasChips}</div>
          <div style="font-size:11px; color:var(--ink-soft); min-width:50px; text-align:right;">${kelasList.length} kelas</div>
        </div>`;
    }
    html += '</div>';
  }

  main.innerHTML = html;
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
  const kelasOptions = sortKelas(await SB.kelas.getByKelompok(myKelompokId));
  let selectedKelasId = kelasOptions.length ? kelasOptions[0].id : null;
  let selectedKelasLabel = kelasOptions.length ? kelasOptions[0].jenjang : '';
  let activeKelompokId = myKelompokId; // track kelompok aktif untuk progress
  let cachedProgressSet = new Set(); // cache agar tidak fetch ulang tiap render
  let pertemuanList = [];
  let currentPertemuanId = null;
  let santriList = [];
  let absensiData = {};
  let jurnalData = null;

  async function refreshProgress() {
    const kId = activeKelompokId || myKelompokId || null;
    if (!kId) { cachedProgressSet = new Set(); return; }
    try {
      const progData = await SB.progress.getByKelompok(kId, getTahunAjaran());
      cachedProgressSet = new Set(progData.map(p => p.materi_id + '|' + p.bulan));
    } catch(e) { cachedProgressSet = new Set(); }
  }

  async function loadPertemuan() {
    if (!selectedKelasId) return;
    await refreshProgress(); // load progress sebelum render
    pertemuanList = await SB.pertemuan.getByKelas(selectedKelasId, getTahunAjaran());
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
      `<option value="${k.id}" data-kelompok-id="${k.kelompok_id||myKelompokId||''}" ${k.id === selectedKelasId ? 'selected' : ''}>
        ${k.nama_kelas ? escHtml(k.nama_kelas)+' — ' : ''}${escHtml(k.jenjang)} Sem ${k.semester}
      </option>`
    ).join('');

    const pertemuanOptHtml = [
      `<option value="">+ Pertemuan Baru</option>`,
      ...pertemuanList.map((p, idx) => {
        // Hitung apakah ada pertemuan lain di tanggal yang sama
        const sameTgl = pertemuanList.filter(x => x.tanggal === p.tanggal);
        const tglLabel = fmtDateShort(p.tanggal);
        const keLabel = sameTgl.length > 1
          ? `${tglLabel} · ke-${p.pertemuan_ke} (${sameTgl.indexOf(p)+1}× hari itu)`
          : `${tglLabel} · Pertemuan ke-${p.pertemuan_ke}`;
        return `<option value="${p.id}" ${p.id === currentPertemuanId ? 'selected' : ''}>${keLabel}</option>`;
      })
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
    // Tampilkan bulan sebelum, berjalan, sesudah — selalu urut kronologis
    let visibleMonths = [];
    if (nowIdx >= 0) {
      if (nowIdx > 0) visibleMonths.push(allMonths[nowIdx - 1]);
      visibleMonths.push(allMonths[nowIdx]);
      if (nowIdx < allMonths.length - 1) visibleMonths.push(allMonths[nowIdx + 1]);
    } else {
      // Bulan berjalan tidak ada di semester kelas ini — tampilkan semua bulan semester
      visibleMonths = [...allMonths];
    }

    // Gunakan cached progress — tidak fetch ulang setiap render
    const kelompokId4Progress = activeKelompokId || myKelompokId || null;
    const progressSet = cachedProgressSet;

    // ── Materi yang bisa dipilih ──
    let materiSectionHtml = '';
    if (currentPertemuanId !== undefined && selectedKelas) {
      const bulanToShow = jurnalBulan || nowMonth;
      const materiList = getMateriForDisplay(bulanToShow);

      // Chip bulan dalam urutan kronologis
      const monthChips = visibleMonths.map(m => {
        const isActive = (jurnalBulan || nowMonth) === m;
        return `<div onclick="ABS_setJurnalBulan('${m}')"
          style="padding:5px 12px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; flex-shrink:0;
            background:${isActive ? 'var(--green)' : 'var(--white)'};
            color:${isActive ? '#fff' : 'var(--ink-soft)'};
            border:1.5px solid ${isActive ? 'var(--green)' : 'var(--line)'};">
          ${m}${m === nowMonth ? ' ●' : ''}
        </div>`;
      }).join('');

      // Group materi by bab
      const byBab = {}; const babOrder = [];
      materiList.forEach(r => {
        const k = (r.bab || '') + ' ' + (r.bab_title || '');
        if (!byBab[k]) { byBab[k] = { title: k, items: [] }; babOrder.push(k); }
        byBab[k].items.push(r);
      });

      const col = bulanToShow.toLowerCase();
      const babsHtml = babOrder.map(bk => {
        const g = byBab[bk];
        const itemsHtml = g.items.map(r => {
          const dipilihHariIni = selectedMateriIds.has(r.id);
          const sudahPernah = !dipilihHariIni && progressSet.has(r.id + '|' + bulanToShow);

          // Gunakan data-id untuk onclick agar aman dari karakter khusus
          return `<div data-materi-id="${r.id}" onclick="ABS_toggleMateri(this.dataset.materiId)"
            style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px;
              border-bottom:1px solid var(--line); cursor:pointer; transition:background .15s;
              background:${dipilihHariIni ? 'var(--green-soft)' : sudahPernah ? '#f0f7f2' : ''};">
            <div style="width:22px; height:22px; border-radius:6px; flex-shrink:0; margin-top:2px;
              border:2px solid ${dipilihHariIni ? 'var(--green)' : sudahPernah ? '#7ab896' : 'var(--line)'};
              background:${dipilihHariIni ? 'var(--green)' : 'transparent'};
              display:flex; align-items:center; justify-content:center;">
              ${dipilihHariIni
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>'
                : sudahPernah
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="#7ab896" stroke-width="2.5" width="11" height="11"><path d="M20 6L9 17l-5-5"/></svg>'
                : ''}
            </div>
            <div style="flex:1; min-width:0;">
              <!-- Baris 1: nomor + topik (judul bab/sub) -->
              <div style="font-weight:800; font-size:13px; color:${dipilihHariIni ? 'var(--green)' : sudahPernah ? '#2d6a4f' : '#111'}; margin-bottom:${r.poin ? '4px' : '2px'};">
                ${r.no ? escHtml(r.no) + '.' : ''} ${escHtml(r.topik || '')}
                ${sudahPernah ? '<span style="font-size:10px; font-weight:600; color:#7ab896; margin-left:6px; vertical-align:middle;">&#10003; pernah</span>' : ''}
              </div>
              <!-- Baris 2: poin (a/b/c) + poin_title — menjorok -->
              ${r.poin ? `
              <div style="padding-left:14px; font-size:12.5px; font-weight:600;
                color:${dipilihHariIni ? 'var(--green)' : sudahPernah ? '#3a7a58' : '#222'};
                margin-bottom:3px;">
                ${escHtml(r.poin)}. ${escHtml(r.poin_title || '')}
              </div>` : ''}
              <!-- Baris 3: isi target bulan — menjorok, warna gelap -->
              <div style="padding-left:${r.poin ? '14px' : '0'}; font-size:12px; color:#333; margin-top:1px; line-height:1.4;">
                ${escHtml(r[col] || '')}
              </div>
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
      const pernahCount = materiList
        .filter(r => progressSet.has(r.id + '|' + bulanToShow) && !selectedMateriIds.has(r.id)).length;

      materiSectionHtml = `
        <div class="card" style="margin-top:18px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            <div>
              <div class="fw-bold color-green" style="font-size:15px;">📚 Materi yang Disampaikan</div>
              <div style="font-size:12px; color:var(--ink-soft);">Klik materi yang sudah disampaikan hari ini</div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${selectedCount ? `<span class="badge badge-green">✓ ${selectedCount} dipilih hari ini</span>` : ''}
              ${pernahCount ? `<span class="badge" style="background:#e8f5ef; color:#3a7a58;">✓ ${pernahCount} pernah disampaikan</span>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; overflow-x:auto; padding-bottom:4px;">
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
    const opt = sel.options[sel.selectedIndex];
    const newKelompokId = opt.dataset.kelompokId || myKelompokId;
    activeKelompokId = newKelompokId;
    selectedMateriIds = new Set();
    cachedProgressSet = new Set();
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

  window.ABS_toggleMateri = async (materiId) => {
    if (selectedMateriIds.has(materiId)) {
      selectedMateriIds.delete(materiId);
    } else {
      selectedMateriIds.add(materiId);
    }
    // Auto-update catatan jurnal
    const textarea = document.getElementById('jurnalCatatan');
    if (textarea) {
      const materiList = Array.from(selectedMateriIds).map(id => {
        const m = (App.cache.materi || []).find(r => r.id === id);
        if (!m) return null;
        return `• ${m.topik || ''}${m.poin_title ? ' - ' + m.poin_title : ''}`;
      }).filter(Boolean);
      textarea.value = materiList.length
        ? 'Materi yang disampaikan:\n' + materiList.join('\n')
        : '';
    }
    renderMain();
  };

  // Simpan untuk pertemuan BARU
  window.ABS_simpanBaru = async () => {
    const btn = document.querySelector('[onclick="ABS_simpanBaru()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    try {
      const tgl = new Date().toISOString().slice(0,10);
      const bulanNow = currentMonthName();

      // Hitung pertemuan ke berapa hari ini (support multiple pertemuan 1 hari)
      const pertemuanHariIni = pertemuanList.filter(p => p.tanggal === tgl);
      const kePertemuan = pertemuanList.filter(p => p.bulan === bulanNow).length + 1;
      const keDalamHari = pertemuanHariIni.length + 1; // ke-1, ke-2 dst dalam hari ini

      const newPertemuan = await SB.pertemuan.insert({
        tahun_ajaran: getTahunAjaran(),
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
      await refreshProgress(); // update cache setelah simpan
      pertemuanList = await SB.pertemuan.getByKelas(selectedKelasId, getTahunAjaran());
      const label = keDalamHari > 1
        ? `Pertemuan ke-${kePertemuan} (pertemuan ${keDalamHari}× hari ini) berhasil disimpan ✓`
        : `Pertemuan ke-${kePertemuan} berhasil disimpan ✓`;
      showToast(label);
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
      await refreshProgress(); // update cache setelah simpan
      showToast('Absensi & jurnal disimpan ✓');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Absensi + Jurnal'; }
  };

  async function doSimpanAll(pId) {
    const kelompokId = activeKelompokId || myKelompokId || null;
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

    // 2. Simpan jurnal — upsert dulu untuk dapat id-nya
    await SB.jurnal.upsert({ pertemuan_id: pId, guru_id: u.id, catatan });

    // 3. Simpan materi dipilih ke jurnal_materi
    if (selectedMateriIds.size > 0) {
      // Ambil jurnal_id yang baru saja disimpan
      const jurnalRows = await SB.jurnal.getByPertemuan(pId);
      const jurnalId = jurnalRows?.[0]?.id;
      if (jurnalId) {
        // Hapus jurnal_materi lama berdasarkan jurnal_id (bukan pertemuan_id)
        await SB.jurnal.deleteMateri(jurnalId);
        // Insert yang baru
        await SB.jurnal.insertMateri(jurnalId, Array.from(selectedMateriIds), bulan);
      }
    }

    // 4. Otomatis update progress kelompok
    if (kelompokId && selectedMateriIds.size > 0) {
      for (const materiId of selectedMateriIds) {
        try {
          await SB.progress.toggle_add(kelompokId, materiId, bulan, u.id, getTahunAjaran());
        } catch(e) { /* abaikan error per-item */ }
      }
    }
  }

  window.ABS_addPertemuan = () => openAddPertemuanModal(selectedKelasId, async () => await loadPertemuan());

  await loadPertemuan();
  } // end lanjutAbsensi
}

/* ===== PAGE: PROGRAM KERJA PPG ===== */
async function renderProker() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin' || u.role === 'daerah';
  const tahun = new Date().getFullYear();
  const BIDANG_LIST = ['Sekretariat','Kurikulum','Tenaga Pendidik','Seni & Olahraga','Kemandirian','Keputrian','KMM Daerah','Tahfidz','Sarana dan Prasarana','Penggalang Dana','Bimbingan Konseling'];
  const BULAN_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  let allProker = [], allLaporan = [], allDana = [];
  try {
    [allProker, allDana] = await Promise.all([
      SB.proker.getAll(tahun),
      SB.sumberDana.getAll(tahun),
    ]);
    // Load laporan per program
    const laporanPromises = (allProker||[]).map(p => SB.laporan.getByProgram(p.id));
    const laporanResults = await Promise.all(laporanPromises);
    allProker.forEach((p, i) => { p._laporan = laporanResults[i] || []; });
  } catch(e) { console.error(e); }

  function fmtRp(n) { return 'Rp ' + (n||0).toLocaleString('id-ID'); }

  function render() {
    const totalAnggaran = allProker.reduce((n,p) => n + (p.anggaran||0), 0);
    const totalRealisasi = allProker.reduce((n,p) => n + p._laporan.reduce((s,l) => s + (l.realisasi_anggaran||0), 0), 0);
    const totalProgram = allProker.length;
    const programDgLaporan = allProker.filter(p => p._laporan.length > 0).length;

    const totalTargetDana = allDana.reduce((n,d) => n + (d.estimasi_total_tahun||0), 0);
    const totalRealisasiDana = allDana.reduce((n,d) => n + (d.realisasi||0), 0);
    const saldo = totalTargetDana - totalAnggaran;
    const pctDana = totalTargetDana > 0 ? Math.round(totalRealisasiDana/totalTargetDana*100) : 0;

    // Neraca
    const neracaHtml = `
      <div class="card" style="border:2px solid var(--green); margin-bottom:16px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:var(--ink-soft); text-transform:uppercase;">Kebutuhan Anggaran</div>
            <div style="font-size:22px; font-weight:800; color:var(--green);">${fmtRp(totalAnggaran)}</div>
            <div style="font-size:12px; color:var(--ink-soft);">${totalProgram} program · ${programDgLaporan} sudah laporan</div>
          </div>
          <div>
            <div style="font-size:12px; font-weight:700; color:var(--ink-soft); text-transform:uppercase;">Target Sumber Dana</div>
            <div style="font-size:22px; font-weight:800; color:${saldo>=0?'var(--green)':'var(--rose)'};">${fmtRp(totalTargetDana)}</div>
            <div style="font-size:12px; color:var(--ink-soft);">Saldo: <b style="color:${saldo>=0?'var(--green)':'var(--rose)'};">${fmtRp(saldo)}</b> ${saldo>=0?'(surplus)':'(defisit)'}</div>
          </div>
        </div>
        <div style="margin-top:12px;">
          <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:4px;">Realisasi Dana: ${fmtRp(totalRealisasiDana)} (${pctDana}%)</div>
          <div style="height:8px; background:var(--line); border-radius:4px; overflow:hidden;">
            <div style="width:${Math.min(pctDana,100)}%; height:100%; background:${pctDana>=80?'var(--green)':pctDana>=50?'#e6a817':'var(--rose)'}; border-radius:4px;"></div>
          </div>
        </div>
      </div>`;

    // Sumber Dana
    const danaRows = allDana.map(d => `
      <tr style="border-bottom:1px solid var(--line);">
        <td style="padding:7px 10px; font-weight:600; font-size:13px;">${escHtml(d.nama_sumber)}</td>
        <td style="font-size:12px; color:var(--ink-soft);">${escHtml(d.frekuensi||'')} ${d.jumlah_unit>1?'× '+d.jumlah_unit:''}</td>
        <td style="text-align:right; font-size:12px; font-weight:600;">${fmtRp(d.estimasi_total_tahun)}</td>
        <td style="text-align:right; font-size:12px; font-weight:700; color:var(--green);">${fmtRp(d.realisasi)}</td>
        ${isAdmin ? `<td style="text-align:center;">
          <div style="display:flex; gap:3px; justify-content:center;">
            <button class="btn-icon" onclick="PK_editDana('${d.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
            <button class="btn-icon danger" onclick="PK_hapusDana('${d.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
          </div>
        </td>` : ''}
      </tr>`).join('');

    const danaHtml = `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div class="fw-bold color-green" style="font-size:14px;">💰 Sumber Dana</div>
          ${isAdmin ? '<button class="btn btn-outline btn-sm" onclick="PK_tambahDana()">+ Tambah</button>' : ''}
        </div>
        ${allDana.length ? `<div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:400px;">
          <thead><tr style="background:var(--green);">
            <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Sumber</th>
            <th style="font-size:11px; color:#fff; padding:7px 8px;">Frekuensi</th>
            <th style="text-align:right; font-size:11px; color:#fff; padding:7px 10px;">Target/Tahun</th>
            <th style="text-align:right; font-size:11px; color:#fff; padding:7px 10px;">Realisasi</th>
            ${isAdmin ? '<th style="font-size:11px; color:#fff; padding:7px 8px; width:50px;">Aksi</th>' : ''}
          </tr></thead>
          <tbody>${danaRows}</tbody>
        </table></div>` : '<div style="font-size:12px; color:var(--ink-soft);">Belum ada sumber dana.</div>'}
      </div>`;

    // Program Kerja per Bidang
    const bidangCards = BIDANG_LIST.map(bidang => {
      const programs = allProker.filter(p => p.bidang === bidang);
      if (!programs.length && !isAdmin) return '';
      const totalBidang = programs.reduce((n,p) => n + (p.anggaran||0), 0);
      const totalRealBidang = programs.reduce((n,p) => n + p._laporan.reduce((s,l) => s + (l.realisasi_anggaran||0), 0), 0);

      const progRows = programs.map(p => {
        const lapCount = p._laporan.length;
        const realP = p._laporan.reduce((s,l) => s + (l.realisasi_anggaran||0), 0);
        return `
          <div style="border-bottom:1px solid var(--line); padding:10px 0;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:6px;">
              <div style="flex:1; min-width:200px;">
                <div style="font-weight:700; font-size:13px;">${escHtml(p.nama_program)}</div>
                <div style="font-size:13.5px; color:#111; margin-top:4px; white-space:pre-wrap;">${escHtml(p.detail_program||'')}</div>
                <div style="font-size:11px; color:var(--ink-soft); margin-top:4px;">
                  📅 ${escHtml(p.bulan_mulai||'Belum ditentukan')} · 💰 ${fmtRp(p.anggaran)}
                </div>
              </div>
              <div style="display:flex; gap:4px; flex-shrink:0;">
                <span class="badge ${lapCount?'badge-green':'badge-gray'}">${lapCount} laporan</span>
                ${isAdmin ? `
                <button class="btn-icon" onclick="PK_editProker('${p.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                <button class="btn-icon danger" onclick="PK_hapusProker('${p.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>` : ''}
              </div>
            </div>
            ${lapCount ? `<details style="margin-top:8px;">
              <summary style="cursor:pointer; font-size:12px; font-weight:600; color:var(--green);">Lihat ${lapCount} laporan (realisasi: ${fmtRp(realP)})</summary>
              <div style="margin-top:6px;">
                ${p._laporan.map(l => `
                  <div style="background:var(--green-soft); border-radius:6px; padding:8px 10px; margin-bottom:6px;">
                    <div style="font-weight:600; font-size:12.5px;">${escHtml(l.nama_kegiatan)}</div>
                    <div style="font-size:11px; color:var(--ink-soft); margin-top:3px;">
                      ${l.tanggal_kegiatan ? '📅 '+fmtDateShort(l.tanggal_kegiatan)+' · ' : ''}💰 ${fmtRp(l.realisasi_anggaran)}
                    </div>
                    ${l.deskripsi ? `<div style="font-size:12px; color:var(--ink); margin-top:4px; white-space:pre-wrap;">${escHtml(l.deskripsi)}</div>` : ''}
                    ${l.foto_url ? `<img src="${escHtml(l.foto_url)}" style="max-width:100%; max-height:200px; border-radius:6px; margin-top:6px;">` : ''}
                    ${isAdmin ? `<div style="margin-top:4px; display:flex; gap:4px;">
                      <button class="btn-icon" onclick="PK_editLaporan('${l.id}','${p.id}')" title="Edit laporan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                      <button class="btn-icon danger" onclick="PK_hapusLaporan('${l.id}','${p.id}')" title="Hapus laporan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
                    </div>` : ''}
                  </div>`).join('')}
              </div>
            </details>` : ''}
            ${isAdmin ? `<button class="btn btn-outline btn-sm" style="margin-top:6px; font-size:11px;" onclick="PK_tambahLaporan('${p.id}')">+ Tambah Laporan</button>` : ''}
          </div>`;
      }).join('');

      return `
        <div class="card" style="margin-bottom:14px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
            <div>
              <div class="fw-bold color-green" style="font-size:14px;">📋 ${escHtml(bidang)}</div>
              <div style="font-size:12px; color:var(--ink-soft);">${programs.length} program · ${fmtRp(totalBidang)}</div>
            </div>
            ${isAdmin ? `<button class="btn btn-outline btn-sm" onclick="PK_tambahProker('${escHtml(bidang)}')">+ Program</button>` : ''}
          </div>
          ${progRows || '<div style="font-size:12px; color:var(--ink-soft); padding:8px 0;">Belum ada program kerja.</div>'}
        </div>`;
    }).join('');

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Program Kerja PPG</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">Tahun ${tahun} · TA ${getTahunAjaran()}</p>
        </div>
      </div>
      ${neracaHtml}
      ${danaHtml}
      <div class="fw-bold color-green" style="font-size:15px; margin-bottom:12px;">📋 Program Kerja per Bidang</div>
      ${bidangCards}`;
  }

  // === HANDLERS ===
  window.PK_tambahDana = () => openDanaModal(null);
  window.PK_editDana = (id) => openDanaModal(allDana.find(d=>d.id===id));
  window.PK_hapusDana = async (id) => {
    if (!confirm('Hapus sumber dana ini?')) return;
    await SB.sumberDana.delete(id);
    allDana = allDana.filter(d=>d.id!==id);
    showToast('Dihapus'); render();
  };

  window.PK_tambahProker = (bidang) => openProkerModal(null, bidang);
  window.PK_editProker = (id) => { const p = allProker.find(x=>x.id===id); if(p) openProkerModal(p, p.bidang); };
  window.PK_hapusProker = async (id) => {
    if (!confirm('Hapus program kerja ini beserta laporannya?')) return;
    await SB.proker.delete(id);
    allProker = allProker.filter(p=>p.id!==id);
    showToast('Dihapus'); render();
  };

  window.PK_tambahLaporan = (prokerId) => openLaporanModal(null, prokerId);
  window.PK_editLaporan = (lapId, prokerId) => {
    const pk = allProker.find(p=>p.id===prokerId);
    const lap = pk?._laporan.find(l=>l.id===lapId);
    if (lap) openLaporanModal(lap, prokerId);
  };
  window.PK_hapusLaporan = async (lapId, prokerId) => {
    if (!confirm('Hapus laporan ini?')) return;
    await SB.laporan.delete(lapId);
    const pk = allProker.find(p=>p.id===prokerId);
    if (pk) pk._laporan = pk._laporan.filter(l=>l.id!==lapId);
    showToast('Dihapus'); render();
  };

  // === MODAL SUMBER DANA ===
  function openDanaModal(existing) {
    const p = existing;
    // Detect freq number from existing data
    const freqMap = {'1x per tahun':1,'2x per tahun':2,'3x per tahun':3,'4x per tahun (triwulan)':4,'6x per tahun (2 bulan sekali)':6,'12x per tahun (tiap bulan)':12};
    if (p) p._freqNum = freqMap[p.frekuensi] || (p.estimasi_per_periode && p.jumlah_unit && p.estimasi_total_tahun ? Math.round(p.estimasi_total_tahun / (p.estimasi_per_periode * p.jumlah_unit)) : 1);

    window.PK_hitungDana = () => {
      const est = parseInt(document.getElementById('dnEst')?.value)||0;
      const unit = parseInt(document.getElementById('dnUnit')?.value)||1;
      const freq = parseInt(document.getElementById('dnFreq')?.value)||1;
      const total = est * unit * freq;
      const el = document.getElementById('dnTotalDisplay');
      if (el) el.textContent = 'Rp ' + total.toLocaleString('id-ID');
    };

    showModal('danaModal', `
      <h3 class="modal-title">${p?'Edit':'Tambah'} Sumber Dana</h3>
    `, `
      <div class="form-group"><label>Nama Sumber *</label><input id="dnNama" value="${escHtml(p?.nama_sumber||'')}"></div>
      <div class="form-group"><label>Deskripsi</label><input id="dnDesc" value="${escHtml(p?.deskripsi||'')}"></div>
      <div class="form-row">
        <div class="form-group"><label>Estimasi/Periode (Rp)</label><input type="number" id="dnEst" value="${p?.estimasi_per_periode||0}" oninput="PK_hitungDana()"></div>
        <div class="form-group"><label>Jumlah Unit</label><input type="number" id="dnUnit" value="${p?.jumlah_unit||1}" oninput="PK_hitungDana()"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Frekuensi</label>
          <select id="dnFreq" onchange="PK_hitungDana()">
            <option value="1" ${(p?.frekuensi||'')==='1x per tahun'?'selected':''}>1x per tahun</option>
            <option value="2" ${(p?.frekuensi||'')==='2x per tahun'?'selected':''}>2x per tahun</option>
            <option value="3" ${(p?.frekuensi||'')==='3x per tahun'?'selected':''}>3x per tahun</option>
            <option value="4" ${(p?.frekuensi||'')==='4x per tahun (triwulan)'?'selected':''}>4x per tahun (triwulan)</option>
            <option value="6" ${(p?.frekuensi||'')==='6x per tahun (2 bulan sekali)'||String(p?._freqNum)==='6'?'selected':''}>6x per tahun (2 bulan sekali)</option>
            <option value="12" ${(p?.frekuensi||'')==='12x per tahun (tiap bulan)'||String(p?._freqNum)==='12'?'selected':''}>12x per tahun (tiap bulan)</option>
          </select>
        </div>
        <div class="form-group"><label>Total/Tahun (otomatis)</label>
          <div id="dnTotalDisplay" style="font-size:18px; font-weight:800; color:var(--green); padding:6px 0;">Rp 0</div>
        </div>
      </div>
      <div class="form-group"><label>Realisasi (Rp)</label><input type="number" id="dnReal" value="${p?.realisasi||0}"></div>
      <script>window.PK_hitungDana&&PK_hitungDana();</script>
    `, async () => {
      const est = parseInt(document.getElementById('dnEst').value)||0;
      const unit = parseInt(document.getElementById('dnUnit').value)||1;
      const freqVal = parseInt(document.getElementById('dnFreq').value)||1;
      const freqLabels = {'1':'1x per tahun','2':'2x per tahun','3':'3x per tahun','4':'4x per tahun (triwulan)','6':'6x per tahun (2 bulan sekali)','12':'12x per tahun (tiap bulan)'};
      const totalTahun = est * unit * freqVal;
      const data = {
        nama_sumber: document.getElementById('dnNama').value.trim(),
        deskripsi: document.getElementById('dnDesc').value.trim()||null,
        estimasi_per_periode: est,
        frekuensi: freqLabels[freqVal] || freqVal+'x per tahun',
        jumlah_unit: unit,
        estimasi_total_tahun: totalTahun,
        realisasi: parseInt(document.getElementById('dnReal').value)||0,
        tahun, tahun_ajaran: getTahunAjaran(), dibuat_oleh: u.id,
      };
      if (!data.nama_sumber) { showToast('Nama wajib diisi',true); return; }
      if (p) { await SB.sumberDana.update(p.id, data); Object.assign(p, data); }
      else { const r = await SB.sumberDana.insert(data); if(r?.[0]) allDana.push(r[0]); else allDana.push(data); }
      showToast('Tersimpan'); closeModal('danaModal'); render();
    });
  }

  // === MODAL PROGRAM KERJA ===
  function openProkerModal(existing, bidangDefault) {
    const p = existing;
    const bidang = p?.bidang || bidangDefault || '';
    const selectedBulanArr = (p?.bulan_mulai||'').split(',').map(s=>s.trim()).filter(Boolean);
    showModal('prokerModal', `
      <h3 class="modal-title">${p?'Edit':'Tambah'} Program Kerja — ${escHtml(bidang)}</h3>
    `, `
      <input type="hidden" id="pkBidang" value="${escHtml(bidang)}">
      <div class="form-group"><label>Nama Program *</label><input id="pkNama" value="${escHtml(p?.nama_program||'')}"></div>
      <div class="form-group"><label>Detail Program</label><textarea id="pkDetail" rows="3">${escHtml(p?.detail_program||'')}</textarea></div>
      <div class="form-group"><label>Bulan Pelaksanaan</label>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px;" id="pkBulanGrid">
          ${BULAN_NAMES.map(b => {
            const checked = selectedBulanArr.includes(b);
            return `<label style="display:flex; align-items:center; gap:4px; padding:4px 6px; border-radius:6px; cursor:pointer; font-size:12px; border:1.5px solid ${checked?'var(--green)':'var(--line)'}; background:${checked?'var(--green-soft)':'var(--white)'};">
              <input type="checkbox" value="${b}" ${checked?'checked':''} style="accent-color:var(--green);"> ${b.slice(0,3)}
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="form-group"><label>Anggaran (Rp)</label><input type="number" id="pkAnggaran" value="${p?.anggaran||0}">
        <div style="font-size:11px; color:var(--ink-soft); margin-top:3px;">Total anggaran untuk semua bulan pelaksanaan yang dipilih, bukan per bulan.</div>
      </div>
    `, async () => {
      const bulanChecked = [...document.querySelectorAll('#pkBulanGrid input:checked')].map(c => c.value);
      const data = {
        bidang: document.getElementById('pkBidang').value,
        nama_program: document.getElementById('pkNama').value.trim(),
        detail_program: document.getElementById('pkDetail').value.trim()||null,
        bulan_mulai: bulanChecked.join(', '),
        bulan_selesai: null,
        anggaran: parseInt(document.getElementById('pkAnggaran').value)||0,
        tahun, tahun_ajaran: getTahunAjaran(), dibuat_oleh: u.id,
      };
      if (!data.nama_program) { showToast('Nama program wajib diisi',true); return; }
      if (p) { await SB.proker.update(p.id, data); Object.assign(p, data); }
      else { const r = await SB.proker.insert(data); if(r?.[0]){r[0]._laporan=[];allProker.push(r[0]);} }
      showToast('Tersimpan'); closeModal('prokerModal'); render();
    });
  }

  // === MODAL LAPORAN KEGIATAN ===
  function openLaporanModal(existing, prokerId) {
    const p = existing;
    showModal('laporanModal', `
      <h3 class="modal-title">${p?'Edit':'Tambah'} Laporan Kegiatan</h3>
    `, `
      <div class="form-group"><label>Nama Kegiatan *</label><input id="lpNama" value="${escHtml(p?.nama_kegiatan||'')}"></div>
      <div class="form-group"><label>Tanggal Kegiatan</label><input type="date" id="lpTgl" value="${p?.tanggal_kegiatan||new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label>Deskripsi</label><textarea id="lpDesc" rows="4" placeholder="Tempat, jam, jumlah peserta, keterangan...">${escHtml(p?.deskripsi||'')}</textarea></div>
      <div class="form-group"><label>Realisasi Anggaran (Rp)</label><input type="number" id="lpReal" value="${p?.realisasi_anggaran||0}"></div>
      <div class="form-group"><label>Foto Kegiatan</label><input type="file" id="lpFoto" accept="image/*"><div style="font-size:11px; color:var(--ink-soft); margin-top:3px;">Foto otomatis dikompres. Opsional.</div></div>
    `, async () => {
      let fotoUrl = p?.foto_url || null;
      const fileInput = document.getElementById('lpFoto');
      if (fileInput.files.length) {
        const file = fileInput.files[0];
        // Auto compress: resize max 800px & compress to JPEG 60%
        fotoUrl = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new window.Image();
            img.onload = () => {
              const MAX = 800;
              let w = img.width, h = img.height;
              if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else { w = Math.round(w * MAX / h); h = MAX; }
              }
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              const compressed = canvas.toDataURL('image/jpeg', 0.6);
              res(compressed);
            };
            img.onerror = rej;
            img.src = reader.result;
          };
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
      }
      const data = {
        program_kerja_id: prokerId,
        nama_kegiatan: document.getElementById('lpNama').value.trim(),
        tanggal_kegiatan: document.getElementById('lpTgl').value||null,
        deskripsi: document.getElementById('lpDesc').value.trim()||null,
        realisasi_anggaran: parseInt(document.getElementById('lpReal').value)||0,
        foto_url: fotoUrl, dibuat_oleh: u.id,
      };
      if (!data.nama_kegiatan) { showToast('Nama kegiatan wajib diisi',true); return; }
      if (p) {
        await SB.laporan.update(p.id, data);
        const pk = allProker.find(x=>x.id===prokerId);
        if (pk) { const idx = pk._laporan.findIndex(l=>l.id===p.id); if(idx>=0) Object.assign(pk._laporan[idx], data); }
        showToast('Laporan diperbarui');
      } else {
        const r = await SB.laporan.insert(data);
        const pk = allProker.find(x=>x.id===prokerId);
        if (pk && r?.[0]) pk._laporan.push(r[0]);
        showToast('Laporan tersimpan');
      }
      closeModal('laporanModal'); render();
    });
  }

  // === GENERIC MODAL HELPER ===
  function showModal(id, headerHtml, bodyHtml, onSave) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head">${headerHtml}<button class="modal-close" onclick="closeModal('${id}')">✕</button></div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('${id}')">Batal</button>
        <button class="btn btn-green" id="${id}Save">Simpan</button>
      </div>
    </div>`;
    document.getElementById(id+'Save').onclick = onSave;
    openModal(id);
    // Auto-trigger hitung dana jika ada
    if (window.PK_hitungDana && document.getElementById('dnEst')) {
      // Set freq dropdown dari existing
      setTimeout(() => PK_hitungDana(), 50);
    }
  }

  render();
}

/* ===== PAGE: DATA PENGURUS ===== */
async function renderPengurus() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // Load data pengurus
  let pengurusDaerah = [], pengurusDesa = {}, pengurusKlp = {};
  try {
    if (isAdmin || u.role === 'daerah') {
      pengurusDaerah = await SB.musPeserta.getByDaerah() || [];
    }
    if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

    if (isAdmin || u.role === 'daerah' || u.role === 'desa') {
      const DESA_NAMA_MAP = {'D1':'Desa Barat 1','D2':'Desa Barat 2','D3':'Desa Tengah 1','D4':'Desa Tengah 2','D5':'Desa Timur 1','D6':'Desa Timur 2'};
      const desaList = isAdmin || u.role === 'daerah'
        ? Object.entries(DESA_NAMA_MAP)
        : [[u.desa_id, DESA_NAMA_MAP[u.desa_id] || u.desa_id]];
      for (const [did, dNama] of desaList) {
        const p = await SB.musPeserta.getByDesa(dNama) || [];
        const p2 = await SB.musPeserta.getByDesa(did) || [];
        const seen = new Set();
        pengurusDesa[dNama] = [...p, ...p2].filter(x => { if(seen.has(x.id)) return false; seen.add(x.id); return true; });
      }
    }

    if (isAdmin) {
      for (const klp of (App.cache.kelompok||[])) {
        pengurusKlp[klp.id] = await SB.musPeserta.getByKelompok(klp.id) || [];
      }
    } else if (u.kelompok_id) {
      pengurusKlp[u.kelompok_id] = await SB.musPeserta.getByKelompok(u.kelompok_id) || [];
    } else if (u.role === 'desa') {
      const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
      for (const klp of klpDesa) {
        pengurusKlp[klp.id] = await SB.musPeserta.getByKelompok(klp.id) || [];
      }
    }
  } catch(e) { console.error(e); }

  function waBtn(p) {
    const waLink = p.wa_link || (p.no_hp ? 'https://wa.me/62'+p.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'') : '');
    return waLink ? `<a href="${escHtml(waLink)}" target="_blank" style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; background:#25d366; border-radius:50%; flex-shrink:0;" title="WhatsApp">
      <svg viewBox="0 0 24 24" fill="#fff" width="14" height="14"><path d="M17.5 14.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.4.2-.6.1-1.2-.6-2.2-1.3-3-2.3-.8-.9-1.3-2-1.5-3.1 0-.3 0-.5.2-.6l.7-.8c.2-.2.2-.4.1-.7l-1-2.3c-.1-.3-.3-.5-.6-.5h-.8c-.3 0-.7.1-.9.4-.8.8-1.2 1.8-1.1 2.9.2 2 1.2 3.9 2.7 5.4 1.5 1.5 3.4 2.5 5.4 2.7 1.1.1 2.1-.3 2.9-1.1.3-.3.4-.6.4-.9v-.8c0-.3-.2-.5-.3-.5z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.5.8 3.1 1.3 4.8 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 14.8 3.5 13.4 3.5 12 3.5 7.3 7.3 3.5 12 3.5S20.5 7.3 20.5 12 16.7 20 12 20z"/></svg>
    </a>` : '';
  }

  function renderTable(list, title, showEdit, editMode) {
    if (!list.length) return `<div style="font-size:12px; color:var(--ink-soft); padding:8px;">Belum ada data pengurus.</div>`;
    return `
      <div class="table-wrap">
        <table style="width:100%; border-collapse:collapse; min-width:400px;">
          <thead><tr style="background:var(--green);">
            <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff; width:30px;">No</th>
            <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Nama</th>
            <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Dapukan</th>
            <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff; width:40px;">WA</th>
            ${showEdit ? '<th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff; width:60px;">Aksi</th>' : ''}
          </tr></thead>
          <tbody>
            ${list.map((p,i) => `<tr style="border-bottom:1px solid var(--line);">
              <td style="padding:6px 10px; font-size:12px; color:var(--ink-soft);">${i+1}</td>
              <td style="padding:6px 10px; font-size:13px; font-weight:600;">${escHtml(p.nama)}</td>
              <td style="padding:6px 10px; font-size:12px; color:var(--ink-soft);">${escHtml(p.jabatan||'-')}</td>
              <td style="padding:6px 10px; text-align:center;">${waBtn(p)}</td>
              ${showEdit ? `<td style="padding:6px 10px; text-align:center;">
                <div style="display:flex; gap:3px; justify-content:center;">
                  <button class="btn-icon" onclick="PGR_edit('${p.id}','${editMode}')" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
                  </button>
                  <button class="btn-icon danger" onclick="PGR_hapus('${p.id}')" title="Hapus">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </td>` : ''}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // Build HTML
  let html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Data Pengurus</h1>
        <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">Direktori pengurus PPG Sidoarjo Utara</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="PGR_downloadPdf()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        PDF
      </button>
    </div>`;

  // Pengurus Daerah
  if (pengurusDaerah.length) {
    html += `<div class="card" style="margin-bottom:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <div class="fw-bold color-green" style="font-size:14px;">🏛️ Pengurus Daerah</div>
        ${isAdmin ? '<button class="btn btn-outline btn-sm" onclick="PGR_tambah(\'daerah\')">+ Tambah</button>' : ''}
      </div>
      ${renderTable(pengurusDaerah, 'Daerah', isAdmin, 'daerah')}
    </div>`;
  }

  // Pengurus Desa
  for (const [dNama, list] of Object.entries(pengurusDesa)) {
    const canEdit = isAdmin || u.role === 'desa';
    html += `<div class="card" style="margin-bottom:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <div class="fw-bold color-green" style="font-size:14px;">🏘️ ${escHtml(dNama)}</div>
        ${canEdit ? `<button class="btn btn-outline btn-sm" onclick="PGR_tambah('desa','${escHtml(dNama)}')">+ Tambah</button>` : ''}
      </div>
      ${renderTable(list, dNama, canEdit, 'desa')}
    </div>`;
  }

  // Pengurus Kelompok
  const allKlp = App.cache.kelompok || [];
  for (const [kid, list] of Object.entries(pengurusKlp)) {
    const klp = allKlp.find(k => k.id === kid);
    const canEdit = isAdmin || u.role === 'pjp_kelompok' || u.role === 'kelompok';
    html += `<div class="card" style="margin-bottom:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <div class="fw-bold color-green" style="font-size:14px;">👥 ${escHtml(klp?.nama||kid)} <span style="font-size:11px; color:var(--ink-soft);">(${escHtml(klp?.desa?.nama||'')})</span></div>
        ${canEdit ? `<button class="btn btn-outline btn-sm" onclick="PGR_tambah('kelompok','${kid}')">+ Tambah</button>` : ''}
      </div>
      ${renderTable(list, klp?.nama||kid, canEdit, 'kelompok')}
    </div>`;
  }

  main.innerHTML = html;

  // Handlers
  window.PGR_tambah = (mode, ref) => {
    const user = App.user;
    if (mode === 'daerah') openKelolaMusPesertaModal(null, user, 'daerah');
    else if (mode === 'desa') openKelolaMusPesertaModal(ref, user, 'desa');
    else openKelolaMusPesertaModal(ref || user.kelompok_id, user, 'kelompok');
  };
  window.PGR_edit = (id, mode) => {
    const user = App.user;
    if (mode === 'daerah') openKelolaMusPesertaModal(null, user, 'daerah');
    else if (mode === 'desa') openKelolaMusPesertaModal(user.desa_id, user, 'desa');
    else openKelolaMusPesertaModal(user.kelompok_id, user, mode);
  };
  window.PGR_hapus = async (id) => {
    if (!confirm('Hapus pengurus ini?')) return;
    await SB.musPeserta.softDelete(id);
    showToast('Pengurus dihapus');
    renderPengurus();
  };
  window.PGR_downloadPdf = async () => {
    showToast('Menyiapkan PDF...');
    if (!window.PDFLib) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload=res; s.onerror=rej; document.head.appendChild(s);
      });
    }
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg = await doc.embedFont(StandardFonts.Helvetica);
      const W=595,H=842,ML=40,MR=40,MT=44;
      const GREEN=rgb(0.106,0.227,0.173),GRAY=rgb(0.5,0.5,0.5),LGREEN=rgb(0.91,0.96,0.91);

      let page = doc.addPage([W,H]); let y = H-MT;
      function newPage(){page=doc.addPage([W,H]);y=H-MT;}
      function checkY(n){if(y<n+36)newPage();}

      page.drawText('DATA PENGURUS PPG SIDOARJO UTARA', {x:ML,y,font:fBold,size:13,color:GREEN});
      y-=14;
      page.drawText('Dicetak: '+new Date().toLocaleDateString('id-ID'), {x:ML,y,font:fReg,size:9,color:GRAY});
      y-=8; page.drawLine({start:{x:ML,y},end:{x:W-MR,y},thickness:1.5,color:GREEN}); y-=16;

      function drawSection(title, list) {
        checkY(30);
        page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:18,color:GREEN});
        page.drawText(title, {x:ML+5,y,font:fBold,size:10,color:rgb(1,1,1)});
        y-=22;
        list.forEach((p,i) => {
          checkY(14);
          const bg = i%2===0?LGREEN:rgb(1,1,1);
          page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:13,color:bg});
          page.drawText((i+1)+'.', {x:ML+3,y:y-1,font:fReg,size:8,color:GRAY});
          page.drawText(p.nama||'-', {x:ML+20,y:y-1,font:fBold,size:8.5,color:rgb(0.1,0.1,0.1)});
          page.drawText(p.jabatan||'-', {x:ML+180,y:y-1,font:fReg,size:8,color:rgb(0.3,0.3,0.3)});
          page.drawText(p.no_hp||'-', {x:ML+360,y:y-1,font:fReg,size:8,color:rgb(0.3,0.3,0.3)});
          y-=13;
        });
        y-=8;
      }

      if (pengurusDaerah.length) drawSection('PENGURUS DAERAH', pengurusDaerah);
      for (const [dNama, list] of Object.entries(pengurusDesa)) {
        if (list.length) drawSection('PENGURUS '+dNama.toUpperCase(), list);
      }
      for (const [kid, list] of Object.entries(pengurusKlp)) {
        const klp = allKlp.find(k=>k.id===kid);
        if (list.length) drawSection('KELOMPOK '+(klp?.nama||kid).toUpperCase(), list);
      }

      doc.getPages().forEach((p,i)=>{
        p.drawText('Hal '+(i+1)+'/'+doc.getPageCount(), {x:ML,y:24,font:fReg,size:8,color:GRAY});
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes],{type:'application/pdf'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download='Data_Pengurus_PPG.pdf'; a.click();
      URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh');
    } catch(e) { showToast('Gagal: '+e.message, true); }
  };
}

/* ===== PAGE: MUSYAWARAH ===== */
const MUSYAWARAH_LEVEL = {
  guru_generus: { label: 'Musyawarah Guru Generus', icon: '👨‍🏫', warna: 'badge-green', roles: ['pjp_kelompok','wali_kbm','guru','kelompok','admin'] },
  unsur_5:      { label: 'Musyawarah 5 Unsur Kelompok', icon: '🤝', warna: 'badge-gold', roles: ['pjp_kelompok','kelompok','admin'] },
  pjp_desa:     { label: 'Musyawarah PJP Desa', icon: '🏘️', warna: 'badge-rose', roles: ['desa','pjp_kelompok','admin'] },
  ppg_daerah:   { label: 'Musyawarah PPG Daerah', icon: '🏛️', warna: 'badge-gray', roles: ['daerah','desa','admin'] },
};

// Level yang bisa DILIHAT per role (level saya dan di atas saya)
const MUSYAWARAH_VISIBLE = {
  guru:         ['guru_generus'],
  wali_kbm:     ['guru_generus'],
  kelompok:     ['guru_generus','unsur_5'],
  pjp_kelompok: ['guru_generus','unsur_5','pjp_desa'],
  desa:         ['guru_generus','unsur_5','pjp_desa'],
  daerah:       ['guru_generus','unsur_5','pjp_desa','ppg_daerah'],
  admin:        ['guru_generus','unsur_5','pjp_desa','ppg_daerah'],
};

// Level yang bisa DIBUAT per role
const MUSYAWARAH_CREATE = {
  guru:         ['guru_generus'],
  wali_kbm:     ['guru_generus'],
  kelompok:     ['guru_generus','unsur_5'],
  pjp_kelompok: ['guru_generus','unsur_5'],
  desa:         ['pjp_desa'],
  daerah:       ['ppg_daerah'],
  admin:        ['guru_generus','unsur_5','pjp_desa','ppg_daerah'],
};

async function renderMusyawarah() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const role = u.role;
  const visibleLevels = MUSYAWARAH_VISIBLE[role] || [];
  const createLevels = MUSYAWARAH_CREATE[role] || [];

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // Load data musyawarah
  let allMusyawarah = [];
  try {
    if (role === 'admin' || role === 'daerah') {
      allMusyawarah = await SB.musyawarah.getAll();
    } else if (role === 'desa') {
      const desaId = u.desa_id || u.kelompok_id;
      allMusyawarah = await SB.musyawarah.getByDesa(desaId);
      const daerah = await SB.musyawarah.getByLevel('ppg_daerah');
      allMusyawarah = [...allMusyawarah, ...(daerah||[])];
    } else if (u.kelompok_id) {
      const klp = await SB.musyawarah.getByKelompok(u.kelompok_id);
      const desa = await SB.musyawarah.getByLevel('pjp_desa');
      const daerah = await SB.musyawarah.getByLevel('ppg_daerah');
      allMusyawarah = [...(klp||[]), ...(desa||[]), ...(daerah||[])];
    } else {
      allMusyawarah = await SB.musyawarah.getAll();
    }
    allMusyawarah = allMusyawarah.filter(m => visibleLevels.includes(m.level));
    const seen = new Set();
    allMusyawarah = allMusyawarah.filter(m => { if(seen.has(m.id)) return false; seen.add(m.id); return true; });
  } catch(e) { console.error(e); }

  const nowMonth = currentMonthName();
  let filterLevel = 'semua';

  // Auto-detect default level musyawarah berdasar role
  let defaultLevel = '';
  if (role === 'daerah') defaultLevel = 'ppg_daerah';
  else if (role === 'desa') defaultLevel = 'pjp_desa';
  else if (role === 'admin') defaultLevel = '';  // admin pilih sendiri
  // kelompok level → pilih antara guru_generus atau unsur_5

  function renderPage() {
    const filtered = allMusyawarah.filter(m =>
      filterLevel === 'semua' || m.level === filterLevel
    );

    // === Form notulensi baru (inline) ===
    let formHtml = '';
    if (createLevels.length) {
      // Pilihan jenis musyawarah
      let jenisSelector = '';
      if (defaultLevel && !['admin'].includes(role)) {
        // Daerah/Desa: otomatis, tidak perlu pilih
        const cfg = MUSYAWARAH_LEVEL[defaultLevel] || {};
        jenisSelector = `<input type="hidden" id="musLevelInline" value="${defaultLevel}">
          <div style="font-size:13px; color:var(--ink); margin-bottom:14px;">
            ${cfg.icon} <b>${cfg.label}</b>
          </div>`;
      } else if (['pjp_kelompok','kelompok','wali_kbm','guru'].includes(role)) {
        // Kelompok: pilih guru_generus atau unsur_5
        const opts = createLevels.filter(lv => ['guru_generus','unsur_5'].includes(lv));
        jenisSelector = `
          <div style="display:flex; gap:8px; margin-bottom:14px;" id="musLevelPicker">
            ${opts.map(lv => {
              const cfg = MUSYAWARAH_LEVEL[lv];
              return `<div class="wiz-card" style="flex:1; padding:12px 10px;" data-val="${lv}" onclick="MUS_pickLevel('${lv}',this)">
                <div style="font-size:20px;">${cfg.icon}</div>
                <div style="font-weight:700; font-size:12px; margin-top:4px;">${cfg.label.replace('Musyawarah ','')}</div>
              </div>`;
            }).join('')}
          </div>
          <input type="hidden" id="musLevelInline" value="">`;
      } else {
        // Admin: dropdown semua level
        jenisSelector = `
          <div class="form-group" style="margin-bottom:14px;">
            <label style="font-size:12px; font-weight:700; color:var(--green);">Jenis Musyawarah</label>
            <select id="musLevelInline" onchange="MUS_loadRekap(this.value);MUS_loadAbsensiInline(this.value)" style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih jenis...</option>
              ${createLevels.map(lv => {
                const cfg = MUSYAWARAH_LEVEL[lv];
                return `<option value="${lv}">${cfg?.icon||''} ${cfg?.label||lv}</option>`;
              }).join('')}
            </select>
          </div>`;
      }

      formHtml = `
        <div class="card" style="margin-bottom:18px; border:2px solid var(--green);">
          <div class="fw-bold color-green" style="font-size:15px; margin-bottom:14px;">+ Buat Notulensi Musyawarah</div>
          ${jenisSelector}
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
            <div>
              <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Tanggal</label>
              <input type="date" id="musTglInline" value="${new Date().toISOString().slice(0,10)}" style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
            </div>
            <div>
              <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Bulan Laporan</label>
              <select id="musBulanInline" style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
                ${[...SEM1_MONTHS,...SEM2_MONTHS].map(mn =>
                  `<option value="${mn}" ${mn===nowMonth?'selected':''}>${mn}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <!-- Rekap otomatis -->
          <div id="musRekapArea" style="margin-bottom:14px;"></div>

          <!-- ABSENSI PESERTA (inline, muncul setelah pilih jenis) -->
          <div id="musAbsensiArea" style="display:none; margin-bottom:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--green); margin-bottom:10px; border-top:2px solid var(--green); padding-top:12px;">📋 Absensi Peserta</div>
            <div id="musAbsensiStats" style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;"></div>
            <div id="musAbsensiList"></div>
            <!-- Tambah tamu -->
            <div style="border:1.5px dashed var(--line); border-radius:var(--radius-sm); padding:10px; background:var(--cream-2); margin-top:10px;">
              <div style="font-size:12px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">+ Tambah Peserta Tamu</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <input id="musInlineTamuNama" placeholder="Nama" style="flex:2; min-width:120px; padding:7px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:12px;">
                <input id="musInlineTamuJabatan" placeholder="Dapukan" style="flex:1; min-width:80px; padding:7px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:12px;">
                <input id="musInlineTamuHp" placeholder="No HP" style="flex:1; min-width:100px; padding:7px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:12px;">
                <button class="btn btn-outline btn-sm" onclick="MUS_addTamuInline()">+</button>
              </div>
            </div>
          </div>

          <!-- NOTULENSI -->
          <div id="musNotulensiArea" style="display:none;">
            <div style="font-size:13px; font-weight:700; color:var(--green); margin-bottom:10px; border-top:2px solid var(--green); padding-top:12px;">📝 Notulensi Pembahasan</div>
            <div style="margin-bottom:10px;">
              <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Pencapaian Materi</label>
              <textarea id="musPencapaianInline" rows="3" placeholder="Pencapaian target materi bulan ini per kelas usia..." style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px; resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom:10px;">
              <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Kendala</label>
              <textarea id="musKendalaInline" rows="2" placeholder="Kendala yang dihadapi..." style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px; resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom:10px;">
              <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Solusi</label>
              <textarea id="musSolusiInline" rows="2" placeholder="Solusi yang disepakati..." style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px; resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom:14px;">
              <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Tindak Lanjut</label>
              <textarea id="musTindakLanjutInline" rows="2" placeholder="Tindak lanjut, PIC, target waktu..." style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px; resize:vertical;"></textarea>
            </div>
          </div>

          <button class="btn btn-green" id="musSaveInline" onclick="MUS_simpanInline()" style="display:none;">Simpan Notulensi & Absensi</button>
        </div>`;
    }

    // === Tab filter + daftar notulensi ===
    const levelTabs = ['semua', ...visibleLevels].map(lv => {
      const cfg = MUSYAWARAH_LEVEL[lv];
      const count = lv === 'semua' ? allMusyawarah.length : allMusyawarah.filter(m => m.level === lv).length;
      return `<div onclick="MUS_setFilter('${lv}')"
        style="padding:5px 12px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; flex-shrink:0; white-space:nowrap;
          background:${filterLevel===lv?'var(--green)':'var(--white)'};
          color:${filterLevel===lv?'#fff':'var(--ink-soft)'};
          border:1.5px solid ${filterLevel===lv?'var(--green)':'var(--line)'};">
        ${lv==='semua'?'Semua':(cfg?.icon+' '+cfg?.label.replace('Musyawarah ',''))} (${count})
      </div>`;
    }).join('');

    const daftarHtml = filtered.length ? filtered.map(m => {
      const cfg = MUSYAWARAH_LEVEL[m.level] || {};
      const bisa_edit = m.dibuat_oleh === u.id || role === 'admin';
      return `<div class="card" style="margin-bottom:12px; padding:16px;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge ${cfg.warna||'badge-gray'}">${cfg.icon||''} ${cfg.label||m.level}</span>
              <span style="font-size:12px; color:var(--ink-soft);">${fmtDateShort(m.tanggal)}</span>
            </div>
            <div style="font-size:12px; color:var(--ink-soft);">
              Bulan: <b>${escHtml(m.bulan||'')}</b>
              ${m.anggota?.nama_lengkap ? ' · Oleh: '+escHtml(m.anggota.nama_lengkap) : ''}
            </div>
          </div>
          ${bisa_edit ? `<div style="display:flex; gap:6px; flex-shrink:0;">
            <button class="btn btn-outline btn-sm" onclick="MUS_absensi('${m.id}','${m.level}')" title="Absensi">
              📋
            </button>
            <button class="btn btn-outline btn-sm" onclick="MUS_pdf('${m.id}')" title="Download PDF">
              📄
            </button>
            <button class="btn-icon" onclick="MUS_edit('${m.id}')" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="MUS_delete('${m.id}')" title="Hapus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>` : ''}
        </div>
        <div style="display:grid; gap:8px;">
          ${m.pencapaian ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); margin-bottom:3px;">Pencapaian Materi</div><div style="font-size:13px; color:var(--ink); white-space:pre-wrap;">${escHtml(m.pencapaian)}</div></div>` : ''}
          ${m.kendala ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--rose); margin-bottom:3px;">Kendala</div><div style="font-size:13px; color:var(--ink); white-space:pre-wrap;">${escHtml(m.kendala)}</div></div>` : ''}
          ${m.solusi ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--gold); margin-bottom:3px;">Solusi</div><div style="font-size:13px; color:var(--ink); white-space:pre-wrap;">${escHtml(m.solusi)}</div></div>` : ''}
          ${m.tindak_lanjut ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin-bottom:3px;">Tindak Lanjut</div><div style="font-size:13px; color:var(--ink); white-space:pre-wrap;">${escHtml(m.tindak_lanjut)}</div></div>` : ''}
        </div>
      </div>`;
    }).join('') :
    `<div class="empty-state"><p class="empty-title">Belum ada notulensi</p><p class="empty-desc">Isi form di atas untuk menambahkan.</p></div>`;

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Musyawarah</h1>
      </div>
      ${formHtml}
      <div class="fw-bold color-green" style="font-size:14px; margin-bottom:12px;">Riwayat Notulensi</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; overflow-x:auto; padding-bottom:4px;">
        ${levelTabs}
      </div>
      ${daftarHtml}`;
  }

  // Handlers
  window.MUS_pickLevel = (lv, el) => {
    document.querySelectorAll('#musLevelPicker .wiz-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('musLevelInline').value = lv;
    MUS_loadRekap(lv);
    MUS_loadAbsensiInline(lv);
  };

  window.MUS_absensi = (id, level) => openMusAbsensiModal(id, level, u);
  window.MUS_setFilter = (lv) => { filterLevel = lv; renderPage(); };

  // Auto-load untuk desa/daerah
  if (defaultLevel && !['admin'].includes(role)) {
    setTimeout(() => { MUS_loadRekap(defaultLevel); MUS_loadAbsensiInline(defaultLevel); }, 100);
  }

  window.MUS_loadRekap = async (level) => {
    const area = document.getElementById('musRekapArea');
    if (!area) return;
    area.innerHTML = '<div style="text-align:center; padding:12px;"><div class="spinner dark"></div><div style="font-size:12px; color:var(--ink-soft); margin-top:6px;">Memuat data rekap...</div></div>';

    if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
    if (!App.cache.materi) App.cache.materi = await SB.materi.getAll();

    const now = currentMonthName();
    const semNow = SEM1_MONTHS.includes(now) ? SEM1_MONTHS : SEM2_MONTHS;
    // Urutan kalender: Jan-Des agar bulan sebelumnya selalu benar
    const KALENDER_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const idxKal = KALENDER_MONTHS.indexOf(now);
    const bulanLalu = idxKal > 0 ? KALENDER_MONTHS[idxKal - 1] : null;
    const bulanIni = now;

    function pctColor(p) { return p>=80?'var(--green)':p>=50?'#e6a817':'var(--rose)'; }
    function pctBadge(p) {
      if (p === null) return '<span style="color:var(--ink-soft);">-</span>';
      return `<span style="font-weight:800; color:${pctColor(p)};">${p}%</span>`;
    }

    async function hitungKelompokStats(klpId, bulan) {
      const kelasList = sortKelas(await SB.kelas.getByKelompok(klpId));
      const progData = await SB.progress.getByKelompok(klpId, getTahunAjaran());
      const progressSet = new Set(progData.map(p => p.materi_id + '|' + p.bulan));
      const results = [];
      for (const k of kelasList) {
        const [ptList, sList] = await Promise.all([
          SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
          SB.santri.getByKelas(k.id),
        ]);
        const ptBulan = ptList.filter(p => p.bulan === bulan);
        let H=0,I=0,S=0,A=0,slot=0;
        for (const p of ptBulan) {
          const abs = await SB.absensi.getByPertemuan(p.id);
          sList.forEach(s => {
            const a = abs.find(x => x.santri_id === s.id);
            const st = a?.status || 'A';
            if(st==='H')H++; else if(st==='I')I++; else if(st==='S')S++; else A++;
            slot++;
          });
        }
        const col = bulan.toLowerCase();
        const mk = (App.cache.materi||[]).filter(r =>
          r.jenjang === k.jenjang && String(r.semester) === String(k.semester) && r[col] && r[col].trim()
        );
        const mTarget = mk.length;
        const mCapai = mk.filter(r => progressSet.has(r.id+'|'+bulan)).length;
        results.push({
          kelas: k.nama_kelas || k.jenjang,
          jumlahSantri: sList.length,
          pertemuan: ptBulan.length,
          pctHadir: slot>0 ? Math.round(H/slot*100) : null,
          H, I, S, A,
          mTarget, mCapai,
          pctMateri: mTarget>0 ? Math.round(mCapai/mTarget*100) : null,
        });
      }
      return results;
    }

    function renderRekapTable(title, rows) {
      if (!rows.length) return `<div style="font-size:12px; color:var(--ink-soft); margin-bottom:6px;">${title}: Belum ada data</div>`;
      return `
        <div style="font-size:12px; font-weight:700; color:var(--green); margin-bottom:6px;">${title}</div>
        <div class="table-wrap" style="margin-bottom:12px;">
          <table style="width:100%; border-collapse:collapse; min-width:400px;">
            <thead><tr style="background:var(--green-soft);">
              <th style="padding:6px 10px; text-align:left; font-size:11px;">Kelas</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px;">Santri</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px;">Pertemuan</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px;">Kehadiran</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px;">Target Materi</th>
            </tr></thead>
            <tbody>
              ${rows.map(r => `<tr style="border-bottom:1px solid var(--line);">
                <td style="padding:6px 10px; font-weight:600; font-size:12.5px;">${escHtml(r.kelas)}</td>
                <td style="text-align:center; font-size:12px;">${r.jumlahSantri}</td>
                <td style="text-align:center; font-size:12px;">${r.pertemuan}x</td>
                <td style="text-align:center; font-size:12px;">${pctBadge(r.pctHadir)}</td>
                <td style="text-align:center; font-size:12px;">${pctBadge(r.pctMateri)}${r.mTarget?` <span style="font-size:10px; color:var(--ink-soft);">(${r.mCapai}/${r.mTarget})</span>`:''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    try {
      if ((level === 'guru_generus' || level === 'unsur_5') && u.kelompok_id) {
        // Level kelompok: rekap per kelas usia
        const klpNama = (App.cache.kelompok||[]).find(k=>k.id===u.kelompok_id)?.nama || u.kelompok_id;
        if (!window._musRekapBulan) window._musRekapBulan = bulanIni;
        const tampilBulan = window._musRekapBulan;
        const rows = await hitungKelompokStats(u.kelompok_id, tampilBulan);
        area.innerHTML = `
          <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:14px; border:1px solid var(--green);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <div style="font-weight:800; font-size:14px; color:var(--green);">📊 Rekap KBM — ${escHtml(klpNama)} · TA ${getTahunAjaran()}</div>
              <div style="display:flex; gap:6px;">
                ${bulanLalu ? `<button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanLalu?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanLalu}';MUS_loadRekap('${level}')">
                  ${bulanLalu}
                </button>` : ''}
                <button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanIni?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanIni}';MUS_loadRekap('${level}')">
                  ${bulanIni} ●
                </button>
              </div>
            </div>
            ${renderRekapTable('Bulan ' + tampilBulan, rows)}
          </div>`;

      } else if ((level === 'guru_generus' || level === 'unsur_5') && !u.kelompok_id) {
        // Admin pilih Guru Generus — perlu pilih kelompok dulu
        const allKlp = App.cache.kelompok || [];
        const selectedKlp = window._musRekapKelompokId || '';
        if (!window._musRekapBulan) window._musRekapBulan = bulanIni;
        const tampilBulan = window._musRekapBulan;

        let rekapContent = '';
        if (selectedKlp) {
          const klpNama = allKlp.find(k=>k.id===selectedKlp)?.nama || selectedKlp;
          const rows = await hitungKelompokStats(selectedKlp, tampilBulan);
          rekapContent = renderRekapTable('Bulan ' + tampilBulan + ' — ' + klpNama, rows);
        } else {
          rekapContent = '<div style="font-size:12px; color:var(--ink-soft); padding:8px 0;">Pilih kelompok untuk melihat rekap KBM.</div>';
        }

        area.innerHTML = `
          <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:14px; border:1px solid var(--green);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <div style="font-weight:800; font-size:14px; color:var(--green);">📊 Rekap KBM Kelompok · TA ${getTahunAjaran()}</div>
              <div style="display:flex; gap:6px;">
                ${bulanLalu ? `<button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanLalu?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanLalu}';MUS_loadRekap('${level}')">
                  ${bulanLalu}
                </button>` : ''}
                <button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanIni?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanIni}';MUS_loadRekap('${level}')">
                  ${bulanIni} ●
                </button>
              </div>
            </div>
            <div style="margin-bottom:10px;">
              <select onchange="window._musRekapKelompokId=this.value;MUS_loadRekap('${level}');MUS_loadAbsensiInline('${level}')" style="width:100%; padding:8px 12px; border:1.5px solid var(--line); border-radius:6px; font-size:13px;">
                <option value="">Pilih kelompok...</option>
                ${allKlp.map(k => `<option value="${k.id}" ${k.id===selectedKlp?'selected':''}>${escHtml(k.nama)} (${escHtml(k.desa?.nama||'')})</option>`).join('')}
              </select>
            </div>
            ${rekapContent}
          </div>`;

      } else if (level === 'pjp_desa' && u.desa_id) {
        // Level desa: rekap per kelompok dengan kehadiran + materi
        const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
        if (!window._musRekapBulan) window._musRekapBulan = bulanIni;
        const tampilBulan = window._musRekapBulan;

        let desaHtml = '';
        for (const klp of klpDesa) {
          const rows = await hitungKelompokStats(klp.id, tampilBulan);
          const avgHadir = rows.length ? Math.round(rows.reduce((n,r)=>n+(r.pctHadir||0),0)/rows.length) : null;
          const avgMateri = rows.length ? Math.round(rows.reduce((n,r)=>n+(r.pctMateri||0),0)/rows.length) : null;
          const klpElId = 'musRekapKlp_' + klp.id;

          let kelasDetail = rows.map(r => `
            <div style="display:flex; justify-content:space-between; padding:3px 8px; font-size:11.5px;">
              <span>${escHtml(r.kelas)}</span>
              <span>${r.jumlahSantri} santri · ${r.pertemuan}x · ${pctBadge(r.pctHadir)} hadir · ${pctBadge(r.pctMateri)} materi ${r.mTarget?'('+r.mCapai+'/'+r.mTarget+')':''}</span>
            </div>`).join('');

          desaHtml += `
            <div style="border-bottom:1px solid var(--line); padding:8px 0;">
              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; cursor:pointer;" onclick="document.getElementById('${klpElId}').style.display = document.getElementById('${klpElId}').style.display==='none'?'block':'none'">
                <div style="font-weight:700; font-size:13px;">${escHtml(klp.nama)}</div>
                <div style="font-size:12px;">
                  ${pctBadge(avgHadir)} hadir · ${pctBadge(avgMateri)} materi
                  <span style="font-size:10px; color:var(--ink-soft); margin-left:4px;">▼ detail</span>
                </div>
              </div>
              <div id="${klpElId}" style="display:none; margin-top:6px; background:var(--white); border-radius:6px; padding:6px 0;">
                ${kelasDetail}
              </div>
            </div>`;
        }
        area.innerHTML = `
          <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:14px; border:1px solid var(--green);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <div style="font-weight:800; font-size:14px; color:var(--green);">📊 Rekap KBM per Kelompok · TA ${getTahunAjaran()}</div>
              <div style="display:flex; gap:6px;">
                ${bulanLalu ? `<button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanLalu?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanLalu}';MUS_loadRekap('${level}')">
                  ${bulanLalu}
                </button>` : ''}
                <button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanIni?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanIni}';MUS_loadRekap('${level}')">
                  ${bulanIni} ●
                </button>
              </div>
            </div>
            <div style="font-size:11px; color:var(--ink-soft); margin-bottom:10px;">Bulan ${tampilBulan} · Klik kelompok untuk detail per kelas usia</div>
            ${desaHtml}
          </div>`;

      } else if (level === 'pjp_desa' && !u.desa_id) {
        // Admin pilih PJP Desa — perlu pilih desa dulu
        const DESA_LIST = [
          {id:'D1',nama:'Desa Barat 1'},{id:'D2',nama:'Desa Barat 2'},
          {id:'D3',nama:'Desa Tengah 1'},{id:'D4',nama:'Desa Tengah 2'},
          {id:'D5',nama:'Desa Timur 1'},{id:'D6',nama:'Desa Timur 2'},
        ];
        const selectedDesa = window._musRekapDesaId || '';
        if (!window._musRekapBulan) window._musRekapBulan = bulanIni;
        const tampilBulan = window._musRekapBulan;

        let rekapContent = '';
        if (selectedDesa) {
          const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === selectedDesa);
          let desaHtml = '';
          for (const klp of klpDesa) {
            const rows = await hitungKelompokStats(klp.id, tampilBulan);
            const avgHadir = rows.length ? Math.round(rows.reduce((n,r)=>n+(r.pctHadir||0),0)/rows.length) : null;
            const avgMateri = rows.length ? Math.round(rows.reduce((n,r)=>n+(r.pctMateri||0),0)/rows.length) : null;
            const klpElId = 'musRekapKlp_' + klp.id;
            let kelasDetail = rows.map(r => `
              <div style="display:flex; justify-content:space-between; padding:3px 8px; font-size:11.5px;">
                <span>${escHtml(r.kelas)}</span>
                <span>${r.jumlahSantri} santri · ${r.pertemuan}x · ${pctBadge(r.pctHadir)} hadir · ${pctBadge(r.pctMateri)} materi</span>
              </div>`).join('');
            desaHtml += `
              <div style="border-bottom:1px solid var(--line); padding:8px 0;">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; cursor:pointer;" onclick="document.getElementById('${klpElId}').style.display = document.getElementById('${klpElId}').style.display==='none'?'block':'none'">
                  <div style="font-weight:700; font-size:13px;">${escHtml(klp.nama)}</div>
                  <div style="font-size:12px;">${pctBadge(avgHadir)} hadir · ${pctBadge(avgMateri)} materi <span style="font-size:10px; color:var(--ink-soft);">▼</span></div>
                </div>
                <div id="${klpElId}" style="display:none; margin-top:6px; background:var(--white); border-radius:6px; padding:6px 0;">${kelasDetail}</div>
              </div>`;
          }
          rekapContent = desaHtml || '<div style="font-size:12px; color:var(--ink-soft);">Tidak ada kelompok di desa ini.</div>';
        } else {
          rekapContent = '<div style="font-size:12px; color:var(--ink-soft); padding:8px 0;">Pilih desa untuk melihat rekap per kelompok.</div>';
        }

        area.innerHTML = `
          <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:14px; border:1px solid var(--green);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <div style="font-weight:800; font-size:14px; color:var(--green);">📊 Rekap KBM per Kelompok</div>
              <div style="display:flex; gap:6px;">
                ${bulanLalu ? `<button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanLalu?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanLalu}';MUS_loadRekap('${level}')">
                  ${bulanLalu}
                </button>` : ''}
                <button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanIni?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanIni}';MUS_loadRekap('${level}')">
                  ${bulanIni} ●
                </button>
              </div>
            </div>
            <div style="margin-bottom:10px;">
              <select onchange="window._musRekapDesaId=this.value;MUS_loadRekap('${level}');MUS_loadAbsensiInline('${level}')" style="width:100%; padding:8px 12px; border:1.5px solid var(--line); border-radius:6px; font-size:13px;">
                <option value="">Pilih desa...</option>
                ${DESA_LIST.map(d => `<option value="${d.id}" ${d.id===selectedDesa?'selected':''}>${escHtml(d.nama)}</option>`).join('')}
              </select>
            </div>
            ${rekapContent}
          </div>`;

      } else if (level === 'ppg_daerah') {
        // Level daerah: rekap per desa dengan kehadiran + materi
        const allKlp = App.cache.kelompok || [];
        const desaMap = {};
        allKlp.forEach(k => {
          const dNama = k.desa?.nama || k.desa_id || '-';
          if (!desaMap[dNama]) desaMap[dNama] = [];
          desaMap[dNama].push(k);
        });

        // Default tampilkan bulan ini
        if (!window._musRekapBulan) window._musRekapBulan = bulanIni;
        const tampilBulan = window._musRekapBulan;

        // Fetch progress + kehadiran per kelompok (paralel)
        const klpData = {};
        await Promise.all(allKlp.map(async klp => {
          try {
            const [prog, kelasList] = await Promise.all([
              SB.progress.getByKelompok(klp.id, getTahunAjaran()),
              SB.kelas.getByKelompok(klp.id),
            ]);
            const materiCount = prog.filter(p => p.bulan === tampilBulan).length;

            // Hitung kehadiran per kelas
            let totalH=0, totalSlot=0;
            const kelasStats = [];
            await Promise.all(kelasList.map(async k => {
              const [ptList, sList] = await Promise.all([
                SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
                SB.santri.getByKelas(k.id),
              ]);
              const ptBulan = ptList.filter(p => p.bulan === tampilBulan);
              let kH=0, kSlot=0;
              for (const p of ptBulan) {
                const abs = await SB.absensi.getByPertemuan(p.id);
                sList.forEach(s => {
                  const a = abs.find(x => x.santri_id === s.id);
                  const st = a?.status || 'A';
                  if (st==='H') { kH++; totalH++; }
                  kSlot++; totalSlot++;
                });
              }
              kelasStats.push({
                nama: k.nama_kelas || k.jenjang,
                pctHadir: kSlot > 0 ? Math.round(kH/kSlot*100) : null,
                santri: sList.length,
                pertemuan: ptBulan.length,
              });
            }));

            klpData[klp.id] = {
              materi: materiCount,
              pctHadir: totalSlot > 0 ? Math.round(totalH/totalSlot*100) : null,
              kelasStats,
            };
          } catch(e) { klpData[klp.id] = { materi: 0, pctHadir: null, kelasStats: [] }; }
        }));

        let daerahHtml = '';
        for (const [desaNama, klpList] of Object.entries(desaMap)) {
          const totalMateri = klpList.reduce((n,k) => n + (klpData[k.id]?.materi||0), 0);
          const hadirArr = klpList.map(k => klpData[k.id]?.pctHadir).filter(p => p !== null);
          const avgHadir = hadirArr.length ? Math.round(hadirArr.reduce((a,b)=>a+b,0)/hadirArr.length) : null;
          const desaElId = 'musRekapDesa_' + desaNama.replace(/\s/g,'_');

          let detailRows = klpList.map(klp => {
            const d = klpData[klp.id] || { materi:0, pctHadir:null, kelasStats:[] };
            const kelasDetail = d.kelasStats.map(ks =>
              `<span style="font-size:10px; margin-left:8px; color:var(--ink-soft);">${escHtml(ks.nama)}: ${ks.pctHadir!==null?ks.pctHadir+'%':'-'}</span>`
            ).join('');
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 8px; font-size:11.5px; flex-wrap:wrap; gap:2px;">
              <span style="font-weight:600;">${escHtml(klp.nama)}</span>
              <span>
                ${pctBadge(d.pctHadir)} hadir · <b>${d.materi}</b> materi
                ${kelasDetail}
              </span>
            </div>`;
          }).join('');

          daerahHtml += `
            <div style="border-bottom:1px solid var(--line); padding:8px 0;">
              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; cursor:pointer;" onclick="document.getElementById('${desaElId}').style.display = document.getElementById('${desaElId}').style.display==='none'?'block':'none'">
                <div style="font-weight:700; font-size:13px;">📍 ${escHtml(desaNama)} <span style="font-size:11px; color:var(--ink-soft);">(${klpList.length} klp)</span></div>
                <div style="font-size:12px;">
                  ${pctBadge(avgHadir)} hadir · <b style="color:var(--green);">${totalMateri}</b> materi
                  <span style="font-size:10px; color:var(--ink-soft); margin-left:4px;">▼ detail</span>
                </div>
              </div>
              <div id="${desaElId}" style="display:none; margin-top:6px; background:var(--white); border-radius:6px; padding:6px 0;">
                ${detailRows}
              </div>
            </div>`;
        }

        area.innerHTML = `
          <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:14px; border:1px solid var(--green);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <div style="font-weight:800; font-size:14px; color:var(--green);">📊 Rekap KBM per Desa · TA ${getTahunAjaran()}</div>
              <div style="display:flex; gap:6px;">
                ${bulanLalu ? `<button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanLalu?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanLalu}';MUS_loadRekap('${level}')">
                  ${bulanLalu}
                </button>` : ''}
                <button class="btn btn-outline btn-sm" style="font-size:11px; padding:4px 10px; ${tampilBulan===bulanIni?'background:var(--green);color:#fff;':''}" onclick="window._musRekapBulan='${bulanIni}';MUS_loadRekap('${level}')">
                  ${bulanIni} ●
                </button>
              </div>
            </div>
            <div style="font-size:11px; color:var(--ink-soft); margin-bottom:10px;">Bulan ${tampilBulan} · Klik desa untuk detail per kelompok & kelas usia</div>
            ${daerahHtml}
          </div>`;
      } else {
        area.innerHTML = '';
      }
    } catch(e) {
      console.error('Load rekap error:', e);
      area.innerHTML = `<div style="color:var(--rose); font-size:12px; padding:8px;">Gagal memuat rekap: ${escHtml(e.message)}</div>`;
    }
  };

  // ── Absensi Inline State ──
  let musInlineAbsensi = {}; // peserta_id → status
  let musInlineTamu = []; // [{nama, jabatan, no_hp}]
  let musInlinePeserta = []; // daftar peserta tetap

  window.MUS_loadAbsensiInline = async (level) => {
    const absensiArea = document.getElementById('musAbsensiArea');
    const notulensiArea = document.getElementById('musNotulensiArea');
    const saveBtn = document.getElementById('musSaveInline');
    if (!absensiArea) return;

    if (!level) {
      absensiArea.style.display = 'none';
      notulensiArea.style.display = 'none';
      saveBtn.style.display = 'none';
      return;
    }

    const DESA_NAMA_MAP = {'D1':'Desa Barat 1','D2':'Desa Barat 2','D3':'Desa Tengah 1',
      'D4':'Desa Tengah 2','D5':'Desa Timur 1','D6':'Desa Timur 2'};
    musInlinePeserta = [];
    musInlineAbsensi = {};
    musInlineTamu = [];

    // Load konfigurasi dapukan wajib hadir
    let konfig = null;
    try {
      const res = await SB.musKonfig.get(level, u.kelompok_id || null, u.desa_id || null);
      if (res && res.length) konfig = res[0];
    } catch(e) {}
    const dapukanWajib = konfig?.dapukan_wajib || [];
    console.log('Konfig musyawarah:', level, 'dapukan wajib:', dapukanWajib, 'konfig:', konfig);

    // Load semua peserta yang relevan
    let allPeserta = [];
    try {
      const effectiveKlpId = u.kelompok_id || window._musRekapKelompokId || null;
      const effectiveDesaId = u.desa_id || window._musRekapDesaId || null;
      if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

      if (level === 'ppg_daerah') {
        allPeserta = await SB.musPeserta.getByDaerah() || [];
        const DESA_NAMES = ['Desa Barat 1','Desa Barat 2','Desa Tengah 1','Desa Tengah 2','Desa Timur 1','Desa Timur 2'];
        for (const dn of DESA_NAMES) {
          const dp = await SB.musPeserta.getByDesa(dn) || [];
          allPeserta = [...allPeserta, ...dp];
        }

      } else if (level === 'pjp_desa') {
        if (effectiveDesaId) {
          const desaNama = DESA_NAMA_MAP[effectiveDesaId] || effectiveDesaId;
          let p1 = await SB.musPeserta.getByDesa(effectiveDesaId) || [];
          let p2 = desaNama !== effectiveDesaId ? await SB.musPeserta.getByDesa(desaNama) || [] : [];
          const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === effectiveDesaId);
          for (const klp of klpDesa) {
            const kp = await SB.musPeserta.getByKelompok(klp.id) || [];
            p2 = [...p2, ...kp];
          }
          allPeserta = [...p1, ...p2];
        }
        // Jika belum pilih desa, allPeserta tetap kosong → pesan minta pilih

      } else if (level === 'guru_generus' || level === 'unsur_5') {
        if (effectiveKlpId) {
          allPeserta = await SB.musPeserta.getByKelompok(effectiveKlpId) || [];
        }
        // Jika belum pilih kelompok, allPeserta tetap kosong → pesan minta pilih
      }
      // Dedup
      const seen = new Set();
      allPeserta = allPeserta.filter(p => { if(seen.has(p.id)) return false; seen.add(p.id); return true; });
    } catch(e) { console.error('Load peserta error:', e); }
    console.log('allPeserta:', allPeserta.length, 'dapukan list:', [...new Set(allPeserta.map(p=>p.jabatan))]);

    // Filter berdasarkan konfigurasi dapukan wajib
    if (dapukanWajib.length > 0) {
      musInlinePeserta = allPeserta.filter(p => {
        const pDap = (p.jabatan||'').toLowerCase().trim();
        return dapukanWajib.some(d => {
          const dLow = d.toLowerCase().trim();
          // Exact match atau contains (untuk "Guru Generus" cocok dengan "Guru Caberawit" dll)
          return pDap === dLow || pDap.includes(dLow) || dLow.includes(pDap);
        });
      });
    } else {
      // Belum dikonfigurasi — tampilkan semua
      musInlinePeserta = allPeserta;
    }

    // Default semua hadir
    musInlinePeserta.forEach(p => { musInlineAbsensi[p.id] = 'H'; });

    MUS_renderAbsensiInline();
    absensiArea.style.display = 'block';
    notulensiArea.style.display = 'block';
    saveBtn.style.display = 'block';
  };

  window.MUS_renderAbsensiInline = () => {
    const listEl = document.getElementById('musAbsensiList');
    const statsEl = document.getElementById('musAbsensiStats');
    if (!listEl) return;

    const totalH = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'H').length + musInlineTamu.length;
    const totalI = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'I').length;
    const totalS = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'S').length;
    const totalA = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'A').length;

    statsEl.innerHTML = `
      <span class="badge badge-green">Hadir: ${totalH}</span>
      <span class="badge badge-gold">Izin: ${totalI}</span>
      <span class="badge" style="background:#e3f0f7; color:#4da6c9;">Sakit: ${totalS}</span>
      <span class="badge badge-rose">Alpha: ${totalA}</span>
      <span class="badge badge-gray">Total: ${musInlinePeserta.length + musInlineTamu.length}</span>`;

    // Kelompokkan peserta berdasarkan kelompok_id / desa_id / daerah
    if (!App.cache.kelompok) App.cache.kelompok = [];
    const groups = {};
    musInlinePeserta.forEach(p => {
      let groupKey = 'Lainnya';
      if (p.level_daerah) groupKey = '🏛️ Pengurus Daerah';
      else if (p.desa_id && !p.kelompok_id) groupKey = '🏘️ ' + (p.desa_id || 'Desa');
      else if (p.kelompok_id) {
        const klp = (App.cache.kelompok||[]).find(k => k.id === p.kelompok_id);
        groupKey = '👥 ' + (klp?.nama || p.kelompok_id);
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(p);
    });

    let html = '';
    for (const [group, members] of Object.entries(groups)) {
      if (Object.keys(groups).length > 1) {
        html += `<div style="font-size:12px; font-weight:700; color:var(--green); padding:8px 0 4px; border-bottom:2px solid var(--green); margin-top:8px;">${escHtml(group)} (${members.length})</div>`;
      }
      members.forEach(p => {
        const st = musInlineAbsensi[p.id] || 'H';
        const waLink = p.wa_link || (p.no_hp ? 'https://wa.me/62'+p.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'') : '');
        html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line); flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
            <div style="flex:1; min-width:0;">
              <div style="font-weight:700; font-size:13px;">${escHtml(p.nama)}</div>
              <div style="font-size:11px; color:var(--ink-soft);">${escHtml(p.jabatan||'')}</div>
            </div>
            ${waLink ? `<a href="${escHtml(waLink)}" target="_blank" style="flex-shrink:0; width:28px; height:28px; background:#25d366; border-radius:50%; display:flex; align-items:center; justify-content:center;" title="WhatsApp ${escHtml(p.nama)}">
              <svg viewBox="0 0 24 24" fill="#fff" width="16" height="16"><path d="M17.5 14.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.4.2-.6.1-1.2-.6-2.2-1.3-3-2.3-.8-.9-1.3-2-1.5-3.1 0-.3 0-.5.2-.6l.7-.8c.2-.2.2-.4.1-.7l-1-2.3c-.1-.3-.3-.5-.6-.5h-.8c-.3 0-.7.1-.9.4-.8.8-1.2 1.8-1.1 2.9.2 2 1.2 3.9 2.7 5.4 1.5 1.5 3.4 2.5 5.4 2.7 1.1.1 2.1-.3 2.9-1.1.3-.3.4-.6.4-.9v-.8c0-.3-.2-.5-.3-.5z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.5.8 3.1 1.3 4.8 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 14.8 3.5 13.4 3.5 12 3.5 7.3 7.3 3.5 12 3.5S20.5 7.3 20.5 12 16.7 20 12 20z"/></svg>
            </a>` : ''}
          </div>
          <div style="display:flex; gap:4px; flex-shrink:0;">
            ${['H','I','S','A'].map(s => `
              <button onclick="MUS_setAbsInline('${p.id}','${s}')"
                style="width:32px; height:30px; border:2px solid ${st===s?(s==='H'?'var(--green)':s==='I'?'var(--gold)':s==='S'?'#4da6c9':'var(--rose)'):'var(--line)'}; border-radius:6px; background:${st===s?(s==='H'?'var(--green)':s==='I'?'var(--gold)':s==='S'?'#4da6c9':'var(--rose)'):'transparent'}; color:${st===s?'#fff':(s==='H'?'var(--green)':s==='I'?'var(--gold)':s==='S'?'#4da6c9':'var(--rose)')}; font-weight:800; font-size:11px; cursor:pointer;">
                ${s}
              </button>`).join('')}
          </div>
        </div>`;
      });
    }

    // Tamu
    musInlineTamu.forEach((t, i) => {
      const waLink = t.no_hp ? 'https://wa.me/62'+t.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'') : '';
      html += `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line); flex-wrap:wrap; gap:6px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:13px;">${escHtml(t.nama)} <span class="badge badge-gray" style="font-size:10px;">Tamu</span></div>
            <div style="font-size:11px; color:var(--ink-soft);">${escHtml(t.jabatan||'')}</div>
          </div>
          ${waLink ? `<a href="${escHtml(waLink)}" target="_blank" style="flex-shrink:0; width:28px; height:28px; background:#25d366; border-radius:50%; display:flex; align-items:center; justify-content:center;" title="WhatsApp">
            <svg viewBox="0 0 24 24" fill="#fff" width="16" height="16"><path d="M17.5 14.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.4.2-.6.1-1.2-.6-2.2-1.3-3-2.3-.8-.9-1.3-2-1.5-3.1 0-.3 0-.5.2-.6l.7-.8c.2-.2.2-.4.1-.7l-1-2.3c-.1-.3-.3-.5-.6-.5h-.8c-.3 0-.7.1-.9.4-.8.8-1.2 1.8-1.1 2.9.2 2 1.2 3.9 2.7 5.4 1.5 1.5 3.4 2.5 5.4 2.7 1.1.1 2.1-.3 2.9-1.1.3-.3.4-.6.4-.9v-.8c0-.3-.2-.5-.3-.5z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.5.8 3.1 1.3 4.8 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 14.8 3.5 13.4 3.5 12 3.5 7.3 7.3 3.5 12 3.5S20.5 7.3 20.5 12 16.7 20 12 20z"/></svg>
          </a>` : ''}
        </div>
        <div style="display:flex; gap:4px; align-items:center;">
          <span class="badge badge-green">H</span>
          <button class="btn-icon danger" onclick="MUS_removeTamuInline(${i})" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>`;
    });

    listEl.innerHTML = html || (musInlinePeserta.length === 0 && musInlineTamu.length === 0
      ? '<div style="font-size:13px; color:var(--ink-soft); padding:12px 0; text-align:center;">Pilih desa atau kelompok di atas terlebih dahulu untuk menampilkan peserta.</div>'
      : '<div style="font-size:12px; color:var(--ink-soft); padding:8px 0;">Belum ada peserta tetap. Tambahkan di Data Pengurus.</div>');
  };

  window.MUS_setAbsInline = (pid, status) => {
    musInlineAbsensi[pid] = status;
    MUS_renderAbsensiInline();
  };

  window.MUS_addTamuInline = () => {
    const nama = document.getElementById('musInlineTamuNama').value.trim();
    if (!nama) { showToast('Nama tamu wajib diisi', true); return; }
    musInlineTamu.push({
      nama: toTitleCase(nama),
      jabatan: document.getElementById('musInlineTamuJabatan').value.trim() || null,
      no_hp: document.getElementById('musInlineTamuHp').value.trim() || null,
    });
    document.getElementById('musInlineTamuNama').value = '';
    document.getElementById('musInlineTamuJabatan').value = '';
    document.getElementById('musInlineTamuHp').value = '';
    MUS_renderAbsensiInline();
    showToast('Tamu ditambahkan');
  };

  window.MUS_removeTamuInline = (idx) => {
    musInlineTamu.splice(idx, 1);
    MUS_renderAbsensiInline();
  };

  window.MUS_simpanInline = async () => {
    const level = document.getElementById('musLevelInline')?.value;
    const tanggal = document.getElementById('musTglInline')?.value;
    const bulan = document.getElementById('musBulanInline')?.value;
    if (!level) { showToast('Pilih jenis musyawarah', true); return; }
    if (!tanggal) { showToast('Pilih tanggal', true); return; }

    const btn = document.getElementById('musSaveInline');
    btn.disabled = true; btn.textContent = 'Menyimpan...';

    const data = {
      level, tanggal, bulan,
      tahun: new Date(tanggal).getFullYear(),
      pencapaian: document.getElementById('musPencapaianInline')?.value.trim() || null,
      kendala: document.getElementById('musKendalaInline')?.value.trim() || null,
      solusi: document.getElementById('musSolusiInline')?.value.trim() || null,
      tindak_lanjut: document.getElementById('musTindakLanjutInline')?.value.trim() || null,
      kelompok_id: u.kelompok_id || null,
      desa_id: u.desa_id || null,
      dibuat_oleh: u.id,
    };

    try {
      const res = await SB.musyawarah.insert(data);
      const musId = res?.[0]?.id;

      // Simpan absensi peserta tetap
      if (musId && musInlinePeserta.length) {
        const absRows = musInlinePeserta.map(p => ({
          musyawarah_id: musId,
          peserta_id: p.id,
          status: musInlineAbsensi[p.id] || 'H',
        }));
        await SB.musAbsensi.upsertPeserta(absRows);
      }

      // Simpan tamu
      if (musId && musInlineTamu.length) {
        for (const t of musInlineTamu) {
          await SB.musAbsensi.insertTamu({
            musyawarah_id: musId,
            nama_tamu: t.nama,
            jabatan_tamu: t.jabatan,
            no_hp_tamu: t.no_hp,
            status: 'H',
          });
        }
      }

      showToast('Notulensi & absensi berhasil disimpan ✓');

      // Reset form
      document.getElementById('musPencapaianInline').value = '';
      document.getElementById('musKendalaInline').value = '';
      document.getElementById('musSolusiInline').value = '';
      document.getElementById('musTindakLanjutInline').value = '';
      musInlineTamu = [];
      musInlinePeserta.forEach(p => { musInlineAbsensi[p.id] = 'H'; });
      MUS_renderAbsensiInline();

      // Refresh daftar
      try {
        const fresh = await SB.musyawarah.getAll();
        allMusyawarah = (fresh||[]).filter(m => visibleLevels.includes(m.level));
        const seen2 = new Set();
        allMusyawarah = allMusyawarah.filter(m => { if(seen2.has(m.id)) return false; seen2.add(m.id); return true; });
      } catch(e2) {}

      renderPage();
      // Re-trigger level selection
      if (defaultLevel && !['admin'].includes(role)) {
        setTimeout(() => { MUS_loadRekap(defaultLevel); MUS_loadAbsensiInline(defaultLevel); }, 200);
      }
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
    }
    btn.disabled = false;
    btn.textContent = 'Simpan Notulensi & Absensi';
  };

  window.MUS_edit = (id) => {
    const m = allMusyawarah.find(x => x.id === id);
    if (!m) return;
    openMusyawarahModal(m, createLevels, u, async () => {
      try {
        const fresh = await SB.musyawarah.getAll();
        allMusyawarah = (fresh||[]).filter(m => visibleLevels.includes(m.level));
        const seen2 = new Set();
        allMusyawarah = allMusyawarah.filter(m => { if(seen2.has(m.id)) return false; seen2.add(m.id); return true; });
      } catch(e) {}
      renderPage();
    });
  };

  window.MUS_pdf = async (id) => {
    const m = allMusyawarah.find(x => x.id === id);
    if (!m) return;
    showToast('Menyiapkan PDF...');
    if (!window.PDFLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg = await doc.embedFont(StandardFonts.Helvetica);
      const W=595, H=842, ML=40, MR=40, MT=44;
      const GREEN=rgb(0.106,0.227,0.173), GRAY=rgb(0.5,0.5,0.5);

      let page = doc.addPage([W,H]); let y = H-MT;
      function newPage() { page=doc.addPage([W,H]); y=H-MT; }
      function checkY(n) { if(y<n+40) newPage(); }

      const cfg = MUSYAWARAH_LEVEL[m.level] || {};
      page.drawText((cfg.label||m.level).toUpperCase(), {x:ML,y,font:fBold,size:13,color:GREEN});
      y-=16;
      page.drawText('Tanggal: '+fmtDateShort(m.tanggal)+'   |   Bulan: '+(m.bulan||'-'), {x:ML,y,font:fReg,size:10,color:GRAY});
      y-=8;
      page.drawLine({start:{x:ML,y},end:{x:W-MR,y},thickness:1.5,color:GREEN});
      y-=16;

      // Load absensi
      let absList = [];
      try { absList = await SB.musAbsensi.getByMusyawarah(m.id); } catch(e){}
      if (absList.length) {
        page.drawText('DAFTAR HADIR', {x:ML,y,font:fBold,size:10,color:GREEN}); y-=14;
        absList.forEach((a,i) => {
          checkY(14);
          const nama = a.peserta_id ? (a.musyawarah_peserta?.nama||'-') : (a.nama_tamu||'Tamu');
          const jab = a.peserta_id ? (a.musyawarah_peserta?.jabatan||'') : (a.jabatan_tamu||'Tamu');
          const st = a.status||'H';
          page.drawText((i+1)+'. '+nama+' ('+jab+') - '+st, {x:ML+4,y,font:fReg,size:9,color:rgb(0.1,0.1,0.1)});
          y-=13;
        });
        y-=6;
      }

      const sections = [
        ['PENCAPAIAN MATERI', m.pencapaian],
        ['KENDALA', m.kendala],
        ['SOLUSI', m.solusi],
        ['TINDAK LANJUT', m.tindak_lanjut],
      ];
      sections.forEach(([title, text]) => {
        if (!text) return;
        checkY(30);
        page.drawText(title, {x:ML,y,font:fBold,size:10,color:GREEN}); y-=14;
        // Wrap text
        const words = text.split(/\s+/);
        let line = '';
        words.forEach(w => {
          const test = line ? line+' '+w : w;
          if (fReg.widthOfTextAtSize(test,9) > W-ML-MR-10) {
            checkY(13);
            page.drawText(line, {x:ML+4,y,font:fReg,size:9,color:rgb(0.15,0.15,0.15)});
            y-=13; line=w;
          } else line=test;
        });
        if (line) { checkY(13); page.drawText(line,{x:ML+4,y,font:fReg,size:9,color:rgb(0.15,0.15,0.15)}); y-=13; }
        y-=6;
      });

      doc.getPages().forEach((p,i)=>{
        p.drawText('Hal '+(i+1)+'/'+doc.getPageCount(), {x:ML,y:24,font:fReg,size:8,color:GRAY});
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes],{type:'application/pdf'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download='Notulensi_'+(cfg.label||m.level).replace(/\s/g,'_')+'_'+m.bulan+'.pdf';
      a.click(); URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh');
    } catch(e) { showToast('Gagal: '+e.message, true); console.error(e); }
  };

  window.MUS_delete = async (id) => {
    if (!confirm('Hapus notulensi ini?')) return;
    await SB.musyawarah.delete(id);
    allMusyawarah = allMusyawarah.filter(m => m.id !== id);
    showToast('Notulensi dihapus');
    renderPage();
  };

  renderPage();
}

function openMusyawarahModal(existing, createLevels, u, onSaved) {
  let el = document.getElementById('musyawarahModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'musyawarahModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }

  const nowMonth = currentMonthName();
  const today = new Date().toISOString().slice(0,10);
  const m = existing;

  const levelOpts = createLevels.map(lv => {
    const cfg = MUSYAWARAH_LEVEL[lv] || {};
    return `<option value="${lv}" ${m?.level===lv?'selected':''}>${cfg.icon||''} ${cfg.label||lv}</option>`;
  }).join('');

  el.innerHTML = `<div class="modal modal-lg" style="max-height:94vh;">
    <div class="modal-head">
      <h3 class="modal-title">${m ? 'Edit Notulensi' : 'Buat Notulensi Musyawarah'}</h3>
      <button class="modal-close" onclick="closeModal('musyawarahModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label>Jenis Musyawarah *</label>
          <select id="musLevel">
            <option value="">Pilih jenis...</option>
            ${levelOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Tanggal Musyawarah *</label>
          <input type="date" id="musTanggal" value="${m?.tanggal||today}">
        </div>
        <div class="form-group">
          <label>Bulan Laporan *</label>
          <select id="musBulan">
            ${[...SEM1_MONTHS,...SEM2_MONTHS].map(mn =>
              `<option value="${mn}" ${(m?.bulan||nowMonth)===mn?'selected':''}>${mn}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Peserta Hadir</label>
        <textarea id="musPeserta" rows="3" placeholder="Nama-nama peserta yang hadir, jabatan, dll...">${escHtml(m?.peserta||'')}</textarea>
      </div>
      <div class="form-group">
        <label>Pencapaian Materi</label>
        <textarea id="musPencapaian" rows="4" placeholder="Pencapaian target materi bulan ini per kelas usia, capaian KBM, dll...">${escHtml(m?.pencapaian||'')}</textarea>
      </div>
      <div class="form-group">
        <label>Kendala</label>
        <textarea id="musKendala" rows="3" placeholder="Kendala yang dihadapi selama bulan ini...">${escHtml(m?.kendala||'')}</textarea>
      </div>
      <div class="form-group">
        <label>Solusi</label>
        <textarea id="musSolusi" rows="3" placeholder="Solusi yang disepakati dalam musyawarah...">${escHtml(m?.solusi||'')}</textarea>
      </div>
      <div class="form-group">
        <label>Tindak Lanjut</label>
        <textarea id="musTindakLanjut" rows="3" placeholder="Tindak lanjut yang akan dilaksanakan, PIC, dan target waktu...">${escHtml(m?.tindak_lanjut||'')}</textarea>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal('musyawarahModal')">Batal</button>
      <button class="btn btn-green" id="musSaveBtn">${m ? 'Simpan Perubahan' : 'Simpan Notulensi'}</button>
    </div>
  </div>`;

  document.getElementById('musSaveBtn').onclick = async () => {
    const level = document.getElementById('musLevel').value;
    const tanggal = document.getElementById('musTanggal').value;
    const bulan = document.getElementById('musBulan').value;
    if (!level) { showToast('Pilih jenis musyawarah', true); return; }
    if (!tanggal) { showToast('Pilih tanggal', true); return; }

    const btn = document.getElementById('musSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';

    const data = {
      level, tanggal, bulan,
      tahun: new Date(tanggal).getFullYear(),
      peserta: document.getElementById('musPeserta').value.trim() || null,
      pencapaian: document.getElementById('musPencapaian').value.trim() || null,
      kendala: document.getElementById('musKendala').value.trim() || null,
      solusi: document.getElementById('musSolusi').value.trim() || null,
      tindak_lanjut: document.getElementById('musTindakLanjut').value.trim() || null,
      kelompok_id: u.kelompok_id || null,
      desa_id: u.desa_id || u.kelompok_id || null,
      dibuat_oleh: u.id,
    };

    try {
      let musId = m?.id;
      if (m) {
        await SB.musyawarah.update(m.id, data);
        showToast('Notulensi diperbarui ✓');
      } else {
        const res = await SB.musyawarah.insert(data);
        musId = res?.[0]?.id;
        showToast('Notulensi berhasil disimpan ✓');
      }
      closeModal('musyawarahModal');
      // Buka modal absensi peserta setelah simpan
      if (musId) {
        await openMusAbsensiModal(musId, level, u);
      }
      onSaved();
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
    }
    btn.disabled = false;
    btn.textContent = m ? 'Simpan Perubahan' : 'Simpan Notulensi';
  };

  openModal('musyawarahModal');
}

async function openMusAbsensiModal(musId, level, u) {
  let el = document.getElementById('musAbsensiModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'musAbsensiModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }

  // Load peserta tetap sesuai level
  let pesertaTetap = [];
  const DESA_NAMA_MAP = {'D1':'Desa Barat 1','D2':'Desa Barat 2','D3':'Desa Tengah 1',
    'D4':'Desa Tengah 2','D5':'Desa Timur 1','D6':'Desa Timur 2'};
  try {
    if (level === 'ppg_daerah') {
      pesertaTetap = await SB.musPeserta.getByDaerah();
    } else if (level === 'pjp_desa') {
      // User punya desa_id = D1, tapi peserta disimpan dengan desa_id = "Desa Barat 1"
      const desaId = u.desa_id || '';
      const desaNama = DESA_NAMA_MAP[desaId] || desaId;
      // Coba kedua format
      let p1 = await SB.musPeserta.getByDesa(desaId);
      let p2 = desaNama !== desaId ? await SB.musPeserta.getByDesa(desaNama) : [];
      // Gabungkan dan dedup
      const seen = new Set();
      pesertaTetap = [...(p1||[]), ...(p2||[])].filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id); return true;
      });
    } else if (u.kelompok_id) {
      // Level kelompok: guru_generus atau unsur_5
      pesertaTetap = await SB.musPeserta.getByKelompok(u.kelompok_id);
    }
  } catch(e) { console.error('Load peserta error:', e); }

  // Load absensi yang sudah ada
  let absensiList = [];
  try { absensiList = await SB.musAbsensi.getByMusyawarah(musId); } catch(e) {}

  // State absensi: peserta_id -> status
  const absensiState = {};
  absensiList.forEach(a => {
    if (a.peserta_id) absensiState[a.peserta_id] = a.status;
  });
  // Tamu (tidak punya peserta_id)
  let tamuList = absensiList.filter(a => !a.peserta_id);

  function renderAbsensiModal() {
    const pesertaRows = pesertaTetap.map(p => {
      const status = absensiState[p.id] || 'H';
      return `<tr>
        <td>
          <div style="font-weight:700; font-size:13px;">${escHtml(p.nama)}</div>
          <div style="font-size:11px; color:var(--ink-soft);">${escHtml(p.jabatan||'')}</div>
        </td>
        <td>${p.no_hp ? `<a href="${escHtml(p.wa_link||'#')}" target="_blank" style="font-size:12px; color:var(--green);">${escHtml(p.no_hp)}</a>` : '—'}</td>
        <td>
          <div style="display:flex; gap:5px;">
            ${['H','I','A'].map(st => `
              <button onclick="MABS_set('${p.id}','${st}')"
                style="width:34px; height:32px; border:2px solid ${status===st?(st==='H'?'var(--green)':st==='I'?'var(--gold)':'var(--rose)'):'var(--line)'}; border-radius:6px; background:${status===st?(st==='H'?'var(--green)':st==='I'?'var(--gold)':'var(--rose)'):'transparent'}; color:${status===st?'#fff':(st==='H'?'var(--green)':st==='I'?'var(--gold)':'var(--rose)')}; font-weight:800; font-size:12px; cursor:pointer;">
                ${st}
              </button>`).join('')}
          </div>
        </td>
      </tr>`;
    }).join('');

    const tamuRows = tamuList.map((t,i) => `
      <tr>
        <td>
          <div style="font-weight:700; font-size:13px;">${escHtml(t.nama_tamu||'')}</div>
          <div style="font-size:11px; color:var(--ink-soft);">${escHtml(t.jabatan_tamu||'Tamu')}</div>
        </td>
        <td>${t.no_hp_tamu || '—'}</td>
        <td>
          <div style="display:flex; gap:5px; align-items:center;">
            <span class="badge badge-green">H</span>
            <button class="btn-icon danger" onclick="MABS_hapusTamu('${t.id}')" title="Hapus tamu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');

    const totalH = pesertaTetap.filter(p => (absensiState[p.id]||'H')==='H').length + tamuList.length;
    const totalI = pesertaTetap.filter(p => (absensiState[p.id]||'H')==='I').length;
    const totalA = pesertaTetap.filter(p => (absensiState[p.id]||'H')==='A').length;

    el.innerHTML = `<div class="modal modal-lg" style="max-height:90vh;">
      <div class="modal-head">
        <h3 class="modal-title">📋 Absensi Peserta Musyawarah</h3>
        <button class="modal-close" onclick="closeModal('musAbsensiModal')">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
          <span class="badge badge-green">Hadir: ${totalH}</span>
          <span class="badge badge-gold">Ijin: ${totalI}</span>
          <span class="badge badge-rose">Alpha: ${totalA}</span>
          <span class="badge badge-gray">Total: ${pesertaTetap.length + tamuList.length}</span>
        </div>
        ${pesertaTetap.length ? `
        <div class="table-wrap" style="margin-bottom:14px;">
          <table>
            <thead><tr>
              <th>Nama & Dapukan</th>
              <th>No HP</th>
              <th style="text-align:center;">H &nbsp; I &nbsp; A</th>
            </tr></thead>
            <tbody>${pesertaRows}</tbody>
          </table>
        </div>` : `<div class="empty-state" style="margin-bottom:14px;">
          <p class="empty-title">Belum ada peserta tetap</p>
          <p class="empty-desc">Tambahkan peserta tetap di menu Pengaturan → Peserta Musyawarah.</p>
        </div>`}

        ${tamuRows ? `
        <div style="font-size:12px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; margin-bottom:8px;">Peserta Tamu</div>
        <div class="table-wrap" style="margin-bottom:14px;">
          <table><tbody>${tamuRows}</tbody></table>
        </div>` : ''}

        <!-- Form tambah tamu -->
        <div style="border:1.5px dashed var(--line); border-radius:var(--radius-sm); padding:12px; background:var(--cream-2);">
          <div style="font-size:12px; font-weight:700; color:var(--ink-soft); margin-bottom:8px;">+ Tambah Peserta Tamu (tidak ada di daftar tetap)</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <input id="tamuNama" placeholder="Nama tamu" style="flex:2; min-width:140px; padding:8px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:13px;">
            <input id="tamuJabatan" placeholder="Dapukan" style="flex:1; min-width:100px; padding:8px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:13px;">
            <input id="tamuHp" placeholder="No HP (opsional)" style="flex:1; min-width:120px; padding:8px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:13px;">
            <button class="btn btn-green btn-sm" onclick="MABS_tambahTamu()">Tambah</button>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('musAbsensiModal')">Lewati</button>
        <button class="btn btn-green" onclick="MABS_simpan()">💾 Simpan Absensi</button>
      </div>
    </div>`;
  }

  window.MABS_set = (pesertaId, status) => {
    absensiState[pesertaId] = status;
    renderAbsensiModal();
  };

  window.MABS_hapusTamu = async (id) => {
    await SB.musAbsensi.delete(id);
    tamuList = tamuList.filter(t => t.id !== id);
    renderAbsensiModal();
  };

  window.MABS_tambahTamu = async () => {
    const nama = document.getElementById('tamuNama').value.trim();
    if (!nama) { showToast('Nama tamu wajib diisi', true); return; }
    const jabatan = document.getElementById('tamuJabatan').value.trim();
    const hp = document.getElementById('tamuHp').value.trim();
    try {
      const res = await SB.musAbsensi.insertTamu({
        musyawarah_id: musId,
        nama_tamu: toTitleCase(nama),
        jabatan_tamu: jabatan || null,
        no_hp_tamu: hp || null,
        status: 'H',
      });
      if (res?.[0]) tamuList.push(res[0]);
      showToast('Tamu ditambahkan');
      renderAbsensiModal();
    } catch(e) { showToast('Gagal: ' + e.message, true); }
  };

  window.MABS_simpan = async () => {
    try {
      // Upsert absensi peserta tetap
      if (pesertaTetap.length) {
        const rows = pesertaTetap.map(p => ({
          musyawarah_id: musId,
          peserta_id: p.id,
          status: absensiState[p.id] || 'H',
        }));
        await SB.musAbsensi.upsertPeserta(rows);
      }
      showToast('Absensi musyawarah disimpan ✓');
      closeModal('musAbsensiModal');
    } catch(e) { showToast('Gagal: ' + e.message, true); }
  };

  renderAbsensiModal();
  openModal('musAbsensiModal');
}



async function renderSettings() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const waNum = await SB.settings.get('admin_whatsapp');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Pengaturan</h1>
    </div>

    ${u.role === 'admin' ? `
    <div class="card">
      <div class="fw-bold color-green" style="margin-bottom:16px; font-size:15px;">📱 Nomor WhatsApp Admin</div>
      <div class="form-group" style="margin-bottom:14px; max-width:360px;">
        <label>Nomor WA (dipakai untuk tombol info pendaftaran)</label>
        <input type="text" id="waInput" value="${escHtml(waNum)}" placeholder="contoh: 0895325194794">
      </div>
      <button class="btn btn-green" onclick="SET_saveWa()">Simpan Nomor</button>
    </div>` : ''}

    <div class="card" style="border:1.5px solid var(--green);">
      <div class="fw-bold" style="color:var(--green); font-size:15px; margin-bottom:8px;">👥 Peserta Musyawarah</div>
      <p style="font-size:13px; color:var(--ink-soft); margin:0 0 12px;">
        Konfigurasi dapukan wajib hadir di setiap jenis musyawarah.
      </p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        ${['pjp_kelompok','kelompok','admin'].includes(u.role) ? `
        <button style="padding:8px; border:1.5px solid var(--line); border-radius:8px; background:var(--white); cursor:pointer; font-size:12px; font-weight:600; color:var(--green); text-align:left;" onclick="SET_konfig('guru_generus')">
          👨‍🏫 Konfig Mus. Guru
        </button>
        <button style="padding:8px; border:1.5px solid var(--line); border-radius:8px; background:var(--white); cursor:pointer; font-size:12px; font-weight:600; color:var(--green); text-align:left;" onclick="SET_konfig('unsur_5')">
          🤝 Konfig Mus. 5 Unsur
        </button>` : ''}
        ${['desa','admin'].includes(u.role) ? `
        <button style="padding:8px; border:1.5px solid var(--line); border-radius:8px; background:var(--white); cursor:pointer; font-size:12px; font-weight:600; color:var(--green); text-align:left;" onclick="SET_konfig('pjp_desa')">
          🏘️ Konfig Mus. PJP Desa
        </button>` : ''}
        ${u.role === 'admin' ? `
        <button style="padding:8px; border:1.5px solid var(--line); border-radius:8px; background:var(--white); cursor:pointer; font-size:12px; font-weight:600; color:var(--green); text-align:left;" onclick="SET_konfig('ppg_daerah')">
          🏛️ Konfig Mus. PPG Daerah
        </button>` : ''}
      </div>
    </div>

    ${['admin','pjp_kelompok','guru'].includes(u.role) ? `
    <div class="card" style="border:1.5px solid var(--gold);">
      <div class="fw-bold" style="color:var(--green); font-size:15px; margin-bottom:8px;">🎓 Naik Kelas Tahunan</div>
      <p style="font-size:13px; color:var(--ink-soft); margin:0 0 12px;">
        Proses kenaikan kelas generus setiap awal tahun ajaran baru (Juli).
        Sistem otomatis mendeteksi berdasarkan usia, PJP bisa koreksi dan tentukan kelas tujuan.
      </p>
      <button class="btn btn-gold" onclick="SET_naikKelas()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        Proses Naik Kelas
      </button>
    </div>` : ''}

    ${u.role === 'admin' ? `
    <div class="card" style="border:2px solid var(--rose); background:var(--rose-soft);">
      <div class="fw-bold" style="color:var(--rose); font-size:15px; margin-bottom:8px;">🗑️ Reset Data Uji Coba</div>
      <p style="font-size:13px; color:var(--ink); margin:0 0 12px;">
        Hapus semua data transaksi (absensi, jurnal, pertemuan, progress) dari semua kelompok.
        Data master tetap aman: desa, kelompok, kelas, santri, materi kurikulum, dan akun pengguna tidak akan terhapus.
      </p>
      <div style="background:var(--white); border-radius:var(--radius-sm); padding:12px; margin-bottom:14px; font-size:12.5px; color:var(--ink-soft);">
        <b style="color:var(--rose);">Yang akan dihapus:</b><br>
        Absensi · Jurnal · Jurnal Materi · Pertemuan · Progress Materi
        <br><br>
        <b style="color:var(--green);">Yang tetap ada:</b><br>
        Desa · Kelompok · Kelas · Santri · Materi Kurikulum · Pengguna
      </div>
      <button class="btn btn-danger" onclick="SET_resetData()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        Hapus Data Transaksi
      </button>
    </div>` : ''}
  `;

  window.SET_saveWa = async () => {
    const v = document.getElementById('waInput').value.trim();
    await SB.settings.set('admin_whatsapp', v);
    showToast('Nomor WhatsApp disimpan');
  };

  window.SET_resetData = async () => {
    // Konfirmasi berlapis
    const step1 = confirm(
      '⚠️ PERINGATAN!\n\n' +
      'Anda akan menghapus SEMUA data transaksi:\n' +
      '- Absensi semua kelompok\n' +
      '- Jurnal KBM semua kelompok\n' +
      '- Data pertemuan semua kelompok\n' +
      '- Progress materi semua kelompok\n\n' +
      'Data ini TIDAK BISA dikembalikan!\n\n' +
      'Lanjutkan?'
    );
    if (!step1) return;

    const step2 = prompt(
      'Ketik HAPUS untuk konfirmasi penghapusan data:'
    );
    if (step2 !== 'HAPUS') {
      showToast('Reset dibatalkan — konfirmasi tidak sesuai', true);
      return;
    }

    const btn = document.querySelector('[onclick="SET_resetData()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menghapus...'; }

    try {
      showToast('Menghapus data transaksi...');

      // Hapus berurutan sesuai foreign key dependency
      await sbFetch('jurnal_materi?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
      await sbFetch('jurnal?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
      await sbFetch('absensi?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
      await sbFetch('pertemuan?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
      await sbFetch('progress?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });

      // Reset cache
      App.cache.myProgress = null;

      showToast('✓ Semua data transaksi berhasil dihapus');
      setTimeout(() => renderSettings(), 1000);
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error('Reset error:', e);
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Hapus Data Transaksi'; }
  };

  window.SET_naikKelas = () => openNaikKelasModal();
  window.SET_kelolaMusPeserta = (mode) => {
    const user = App.user;
    if (mode === 'daerah') openKelolaMusPesertaModal(null, user, 'daerah');
    else if (mode === 'desa') openKelolaMusPesertaModal(null, user, 'desa');
    else if (mode === 'kelompok_guru') openKelolaMusPesertaModal(user.kelompok_id, user, 'kelompok_guru');
    else if (mode === 'kelompok_5unsur') openKelolaMusPesertaModal(user.kelompok_id, user, 'kelompok_5unsur');
    else openKelolaMusPesertaModal(user.kelompok_id, user, 'kelompok');
  };
  window.SET_konfig = (levelMus) => openKonfigMusyawarahModal(levelMus, App.user);
}

/* ===== KONFIGURASI PESERTA MUSYAWARAH ===== */
async function openKonfigMusyawarahModal(levelMus, u) {
  let el = document.getElementById('konfigMusModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'konfigMusModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }

  const cfg = MUSYAWARAH_LEVEL[levelMus] || {};
  const kelompokId = u.kelompok_id || null;
  const desaId = u.desa_id || null;

  // Daftar semua dapukan yang tersedia per level
  // Load dapukan dari database (dinamis)
  let allPesertaForKonfig = [];
  try {
    if (levelMus === 'ppg_daerah') {
      allPesertaForKonfig = await SB.musPeserta.getByDaerah() || [];
      // Juga ambil dapukan dari semua desa
      const DESA_NAMES = ['Desa Barat 1','Desa Barat 2','Desa Tengah 1','Desa Tengah 2','Desa Timur 1','Desa Timur 2'];
      for (const dn of DESA_NAMES) {
        const dp = await SB.musPeserta.getByDesa(dn) || [];
        allPesertaForKonfig = [...allPesertaForKonfig, ...dp];
      }
    } else if (levelMus === 'pjp_desa') {
      // Ambil dari semua desa + semua kelompok
      const DESA_NAMES = ['Desa Barat 1','Desa Barat 2','Desa Tengah 1','Desa Tengah 2','Desa Timur 1','Desa Timur 2'];
      for (const dn of DESA_NAMES) {
        const dp = await SB.musPeserta.getByDesa(dn) || [];
        allPesertaForKonfig = [...allPesertaForKonfig, ...dp];
      }
      if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
      for (const klp of (App.cache.kelompok||[])) {
        const kp = await SB.musPeserta.getByKelompok(klp.id) || [];
        allPesertaForKonfig = [...allPesertaForKonfig, ...kp];
      }
    } else {
      // guru_generus / unsur_5 — hanya kelompok sendiri (cepat)
      if (kelompokId) {
        allPesertaForKonfig = await SB.musPeserta.getByKelompok(kelompokId) || [];
      } else {
        // Admin — load sampel 2 kelompok saja untuk daftar dapukan
        if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
        for (const klp of (App.cache.kelompok||[]).slice(0, 2)) {
          const kp = await SB.musPeserta.getByKelompok(klp.id) || [];
          allPesertaForKonfig = [...allPesertaForKonfig, ...kp];
        }
      }
    }
  } catch(e) { console.error(e); }

  // Ekstrak daftar dapukan unik dari data pengurus
  const options = [...new Set(
    allPesertaForKonfig.map(p => (p.jabatan||'').trim()).filter(j => j)
  )].sort();

  // Load konfigurasi existing
  let existing = null;
  try {
    const res = await SB.musKonfig.get(levelMus, kelompokId, desaId);
    if (res && res.length) existing = res[0];
  } catch(e) {}

  const selectedDapukan = new Set(existing?.dapukan_wajib || []);

  function renderKonfig() {
    const checkboxes = options.map(d => `
      <label style="display:flex; align-items:center; gap:8px; padding:8px 12px; border:1.5px solid ${selectedDapukan.has(d)?'var(--green)':'var(--line)'}; border-radius:8px; cursor:pointer; background:${selectedDapukan.has(d)?'var(--green-soft)':'var(--white)'}; transition:all .15s;" onclick="KONFIG_toggle('${escHtml(d)}')">
        <div style="width:20px; height:20px; border:2px solid ${selectedDapukan.has(d)?'var(--green)':'var(--line)'}; border-radius:4px; display:flex; align-items:center; justify-content:center; background:${selectedDapukan.has(d)?'var(--green)':'transparent'}; flex-shrink:0;">
          ${selectedDapukan.has(d) ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
        </div>
        <span style="font-size:13px; font-weight:${selectedDapukan.has(d)?'700':'500'}; color:${selectedDapukan.has(d)?'var(--green)':'var(--ink)'};">${escHtml(d)}</span>
      </label>`).join('');

    el.innerHTML = `<div class="modal modal-lg">
      <div class="modal-head">
        <h3 class="modal-title">Konfigurasi ${cfg.icon||''} ${cfg.label||levelMus}</h3>
        <button class="modal-close" onclick="closeModal('konfigMusModal')">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:14px; font-size:12.5px; color:var(--green);">
          Centang dapukan yang <b>wajib hadir</b> di musyawarah ini. Peserta dengan dapukan yang dicentang akan otomatis muncul di form absensi.
        </div>
        <div style="font-size:12px; font-weight:700; color:var(--ink-soft); margin-bottom:8px;">Dipilih: ${selectedDapukan.size} dapukan</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:14px;">
          ${checkboxes}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('konfigMusModal')">Batal</button>
        <button class="btn btn-green" onclick="KONFIG_simpan()">Simpan Konfigurasi</button>
      </div>
    </div>`;
  }

  window.KONFIG_toggle = (dapukan) => {
    if (selectedDapukan.has(dapukan)) selectedDapukan.delete(dapukan);
    else selectedDapukan.add(dapukan);
    renderKonfig();
  };

  window.KONFIG_simpan = async () => {
    try {
      await SB.musKonfig.upsert({
        level_musyawarah: levelMus,
        kelompok_id: kelompokId,
        desa_id: desaId,
        dapukan_wajib: [...selectedDapukan],
        dibuat_oleh: u.id,
        updated_at: new Date().toISOString(),
      });
      showToast('Konfigurasi peserta disimpan ✓');
      closeModal('konfigMusModal');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
    }
  };

  renderKonfig();
  openModal('konfigMusModal');
}

/* ===== KELOLA PESERTA MUSYAWARAH ===== */
async function openKelolaMusPesertaModal(refId, u, mode='kelompok') {
  let el = document.getElementById('musPesertaModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'musPesertaModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }

  const kelompokId = mode.startsWith('kelompok') ? (refId || u.kelompok_id) : null;
  const desaId = mode === 'desa' ? (refId || u.desa_id || null) : (u.desa_id || null);
  const judulMap = {
    daerah: 'Data Pengurus Daerah',
    desa: 'Data Pengurus Desa',
    kelompok: 'Data Pengurus Kelompok',
    kelompok_guru: 'Data Pengurus Kelompok — Guru Generus',
    kelompok_5unsur: 'Data Pengurus Kelompok — 5 Unsur',
  };
  const judul = judulMap[mode] || 'Data Pengurus';

  async function renderModal() {
    let pesertaList = [];
    if (mode === 'daerah') {
      pesertaList = await SB.musPeserta.getByDaerah();
    } else if (mode === 'desa' && desaId) {
      pesertaList = await SB.musPeserta.getByDesa(desaId);
    } else if ((mode === 'kelompok' || mode === 'kelompok_guru' || mode === 'kelompok_5unsur') && kelompokId) {
      pesertaList = await SB.musPeserta.getByKelompok(kelompokId);
    }

    el.innerHTML = `<div class="modal modal-lg">
      <div class="modal-head">
        <h3 class="modal-title">👥 ${judul}</h3>
        <button class="modal-close" onclick="closeModal('musPesertaModal')">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:14px; font-size:12.5px; color:var(--green);">
          Daftar ini akan otomatis tampil saat absensi musyawarah. Urutan bisa diatur dengan kolom No.
        </div>
        ${pesertaList.length ? `
        <div class="table-wrap" style="margin-bottom:14px;">
          <table>
            <thead><tr><th>No</th><th>Nama</th><th>Dapukan</th><th>No HP</th><th>Link WA</th><th>Aksi</th></tr></thead>
            <tbody>
              ${pesertaList.map((p,i) => `<tr>
                <td style="text-align:center;">${p.urutan||i+1}</td>
                <td><b>${escHtml(p.nama)}</b></td>
                <td>${escHtml(p.jabatan||'—')}</td>
                <td>${escHtml(p.no_hp||'—')}</td>
                <td>${p.wa_link ? `<a href="${escHtml(p.wa_link)}" target="_blank" style="color:var(--green); font-size:12px;">WhatsApp</a>` : '—'}</td>
                <td>
                  <div style="display:flex; gap:4px;">
                    <button class="btn-icon" onclick="MUP_edit('${p.id}')" title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
                    </button>
                    <button class="btn-icon danger" onclick="MUP_hapus('${p.id}')" title="Hapus">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` :
        '<div class="empty-state" style="margin-bottom:14px;"><p class="empty-title">Belum ada peserta tetap</p><p class="empty-desc">Tambahkan peserta tetap musyawarah.</p></div>'}
        <button class="btn btn-green btn-sm" onclick="MUP_tambah()">+ Tambah Peserta</button>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('musPesertaModal')">Tutup</button>
      </div>
    </div>`;

    window._musPesertaList = pesertaList;

    window.MUP_tambah = () => openFormPeserta(null);
    window.MUP_edit = (id) => {
      const p = pesertaList.find(x => x.id === id);
      if (p) openFormPeserta(p);
    };
    window.MUP_hapus = async (id) => {
      if (!confirm('Hapus peserta ini dari daftar tetap?')) return;
      await SB.musPeserta.softDelete(id);
      showToast('Peserta dihapus');
      await renderModal();
    };
  }  // end renderModal

  function openFormPeserta(existing) {
    let fel = document.getElementById('musPesertaFormModal');
    if (!fel) {
      fel = document.createElement('div');
      fel.id = 'musPesertaFormModal';
      fel.className = 'modal-overlay';
      document.body.appendChild(fel);
    }
    const p = existing;
    const urutanDef = (window._musPesertaList?.length || 0) + 1;

    const jabSuggMap = {
      daerah: ['Ulil Amri Daerah','Penghar PPG','Bidang Kurikulum','Bidang Tenaga Pendidik','Bidang Seni & Olahraga','Bidang Kemandirian','Bidang Keputrian','Bidang KMM Daerah','Bidang Tahfidz','Bidang Sarpras','Bidang Penggalang Dana','Bidang BK'],
      desa: ['Ulil Amri Desa','PJP Desa KBM','PJP Desa Sarpras','PJP Desa BK','Pengurus Desa'],
      kelompok_guru: ['PJP Kelompok','Wali KBM Caberawit','Wali KBM Pra Remaja','Wali KBM Remaja','Wali KBM Pra Nikah','Guru Caberawit','Guru Pra Remaja','Guru Remaja','Guru Pra Nikah'],
      kelompok_5unsur: ['Ulil Amri Kelompok','PJP Kelompok','Sekretaris','Bendahara','Bidang Kelompok'],
      kelompok: ['PJP Kelompok','Wali KBM','Guru','Ulil Amri'],
    };
    const jabSugg = jabSuggMap[mode] || jabSuggMap.kelompok;

    fel.innerHTML = `<div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">${p ? 'Edit Peserta' : 'Tambah Peserta'}</h3>
        <button class="modal-close" onclick="closeModal('musPesertaFormModal')">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nama Lengkap *</label>
          <input id="mupNama" value="${escHtml(p?.nama||'')}" placeholder="Nama lengkap peserta">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Dapukan</label>
            <input id="mupJabatan" value="${escHtml(p?.jabatan||'')}" placeholder="Pilih atau ketik dapukan" list="jabList">
            <datalist id="jabList">
              ${jabSugg.map(j => `<option value="${j}">`).join('')}
            </datalist>
          </div>
          <div class="form-group">
            <label>Urutan</label>
            <input type="number" id="mupUrutan" value="${p?.urutan||urutanDef}" min="1">
          </div>
        </div>
        <div class="form-group">
          <label>No HP / WhatsApp</label>
          <input id="mupHp" value="${escHtml(p?.no_hp||'')}" placeholder="08xxx">
          <div style="font-size:11px; color:var(--ink-soft); margin-top:4px;">Link WA otomatis dari nomor ini</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('musPesertaFormModal')">Batal</button>
        <button class="btn btn-green" id="mupSaveBtn">${p ? 'Simpan' : 'Tambah'}</button>
      </div>
    </div>`;

    document.getElementById('mupSaveBtn').onclick = async () => {
      const nama = document.getElementById('mupNama').value.trim();
      if (!nama) { showToast('Nama wajib diisi', true); return; }
      const btn = document.getElementById('mupSaveBtn');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      const data = {
        nama: toTitleCase(nama),
        jabatan: document.getElementById('mupJabatan').value.trim() || null,
        no_hp: document.getElementById('mupHp').value.trim() || null,
        urutan: parseInt(document.getElementById('mupUrutan').value) || 1,
        kelompok_id: (mode.startsWith('kelompok')) ? kelompokId : null,
        desa_id: mode === 'desa' ? desaId : null,
        level_daerah: mode === 'daerah',
        aktif: true,
      };
      try {
        if (p) await SB.musPeserta.update(p.id, data);
        else await SB.musPeserta.insert(data);
        showToast(p ? 'Peserta diperbarui' : 'Peserta ditambahkan');
        closeModal('musPesertaFormModal');
        await renderModal();
      } catch(e) {
        showToast('Gagal: ' + e.message, true);
      }
      btn.disabled = false;
    };

    openModal('musPesertaFormModal');
  }

  await renderModal();
  openModal('musPesertaModal');
}

/* ===== FITUR NAIK KELAS ===== */
async function openNaikKelasModal() {
  const u = App.user;
  const isAdmin = u.role === 'admin';

  // Load data yang dibutuhkan
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

  let el = document.getElementById('naikKelasModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'naikKelasModal';
    el.className = 'modal-overlay';
    document.body.appendChild(el);
  }

  // Step 1: Pilih kelompok
  async function showStep1() {
    const kelompokList = App.cache.kelompok || [];
    const myKelompokId = u.kelompok_id || null;

    el.innerHTML = `<div class="modal modal-lg">
      <div class="modal-head">
        <h3 class="modal-title">🎓 Proses Naik Kelas</h3>
        <button class="modal-close" onclick="closeModal('naikKelasModal')">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--gold-soft); border-radius:var(--radius-sm); padding:12px 14px; margin-bottom:16px; font-size:13px; color:#8a6a24;">
          <b>Naik Kelas Tahunan</b> — Sistem akan mendeteksi otomatis generus yang perlu naik tingkatan
          berdasarkan usia per 1 Juli ${new Date().getFullYear()}. Anda bisa koreksi sebelum diproses.
        </div>
        ${isAdmin ? `
        <div class="form-group" style="margin-bottom:14px;">
          <label>Pilih Kelompok</label>
          <select id="nkKelompokSel" style="width:100%; padding:10px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
            <option value="">Pilih kelompok...</option>
            ${kelompokList.map(k => `<option value="${k.id}">${escHtml(k.nama)} · ${escHtml(k.desa?.nama||k.desa_id)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-green" onclick="NK_loadKelompok(document.getElementById('nkKelompokSel').value)">Lanjut →</button>` :
        `<button class="btn btn-green" onclick="NK_loadKelompok('${myKelompokId}')">Lihat Prediksi Naik Kelas →</button>`}
      </div>
    </div>`;

    window.NK_loadKelompok = async (kelompokId) => {
      if (!kelompokId) { showToast('Pilih kelompok dulu', true); return; }
      await showStep2(kelompokId);
    };

    openModal('naikKelasModal');
  }

  // Step 2: Preview & konfirmasi
  async function showStep2(kelompokId) {
    el.querySelector('.modal-body').innerHTML =
      '<div style="text-align:center; padding:30px;"><div class="spinner dark"></div><div style="margin-top:10px; font-size:13px; color:var(--ink-soft);">Memuat data generus...</div></div>';

    const kelasList = await SB.kelas.getByKelompok(kelompokId);

    // Load semua santri dari semua kelas
    const allSantri = [];
    for (const k of kelasList) {
      const santriKelas = await SB.santri.getByKelas(k.id);
      santriKelas.forEach(s => allSantri.push({ ...s, _kelasSekarang: k }));
    }

    if (!allSantri.length) {
      el.querySelector('.modal-body').innerHTML =
        '<div class="empty-state"><p class="empty-title">Belum ada data generus</p><p class="empty-desc">Tambahkan data generus di menu Data Santri terlebih dahulu.</p></div>';
      return;
    }

    // Hitung tingkatan baru per 1 Juli tahun ini
    const tahunIni = new Date().getFullYear();
    const refDate = new Date(tahunIni, 6, 1); // 1 Juli tahun ini

    function hitungUsiaPer1Juli(tglLahir) {
      if (!tglLahir) return null;
      const lahir = new Date(tglLahir);
      let usia = refDate.getFullYear() - lahir.getFullYear();
      if (lahir.getMonth() > 6 || (lahir.getMonth() === 6 && lahir.getDate() > 1)) usia--;
      return usia;
    }

    function tingkatanDariUsia(usia) {
      if (usia === null) return null;
      if (usia < 13) return 'caberawit';
      if (usia < 16) return 'pra_remaja';
      if (usia < 19) return 'remaja';
      return 'pra_nikah';
    }

    // Identifikasi yang perlu naik kelas
    const perluNaik = [];
    const tetap = [];

    allSantri.forEach(s => {
      const usia = hitungUsiaPer1Juli(s.tgl_lahir);
      const tingkatanBaru = tingkatanDariUsia(usia);
      const tingkatanLama = s.tingkatan || hitungTingkatan(s.tgl_lahir);
      const naik = tingkatanBaru && tingkatanLama && tingkatanBaru !== tingkatanLama;

      if (naik) {
        perluNaik.push({ ...s, usia, tingkatanBaru, tingkatanLama, _naik: true, _kelasTujuan: '' });
      } else {
        tetap.push({ ...s, usia, tingkatanBaru: tingkatanLama });
      }
    });

    // Simpan state
    window._nkState = { perluNaik, tetap, kelasList, kelompokId };

    function renderStep2() {
      const { perluNaik, kelasList } = window._nkState;

      const kelasOptsHtml = kelasList.map(k =>
        `<option value="${k.id}">${k.nama_kelas ? escHtml(k.nama_kelas)+' - ' : ''}${escHtml(k.jenjang)} Sem ${k.semester}</option>`
      ).join('');

      const naikRows = perluNaik.map((s, idx) => {
        const checked = s._naik;
        return `<tr style="background:${checked?'var(--gold-soft)':'var(--white)'};">
          <td>
            <input type="checkbox" ${checked?'checked':''} onchange="NK_toggleNaik(${idx}, this.checked)"
              style="width:15px; height:15px; accent-color:var(--green);">
          </td>
          <td><b>${escHtml(s.nama)}</b><br><span style="font-size:11px; color:var(--ink-soft);">${escHtml(s._kelasSekarang.nama_kelas||s._kelasSekarang.jenjang)}</span></td>
          <td style="text-align:center;">${s.usia !== null ? s.usia+' th' : '—'}</td>
          <td><span class="badge ${TINGKATAN_COLORS[s.tingkatanLama]||'badge-gray'}">${escHtml(TINGKATAN_LABELS[s.tingkatanLama]||s.tingkatanLama||'—')}</span></td>
          <td>
            ${checked ? `<span class="badge ${TINGKATAN_COLORS[s.tingkatanBaru]||'badge-gray'}">${escHtml(TINGKATAN_LABELS[s.tingkatanBaru]||s.tingkatanBaru||'—')}</span>` : '<span style="font-size:12px; color:var(--ink-soft);">Tidak naik</span>'}
          </td>
          <td>
            ${checked ? `
            <select onchange="NK_setKelas(${idx}, this.value)"
              style="padding:6px 8px; border:1.5px solid var(--line); border-radius:6px; font-size:12px; width:100%;">
              <option value="">Pilih kelas tujuan...</option>
              ${kelasOptsHtml}
            </select>` : '—'}
          </td>
        </tr>`;
      }).join('');

      const tetapRows = tetap.map(s => `
        <tr>
          <td><b>${escHtml(s.nama)}</b><br><span style="font-size:11px; color:var(--ink-soft);">${escHtml(s._kelasSekarang.nama_kelas||s._kelasSekarang.jenjang)}</span></td>
          <td style="text-align:center;">${s.usia !== null ? s.usia+' th' : '—'}</td>
          <td><span class="badge ${TINGKATAN_COLORS[s.tingkatanBaru]||'badge-gray'}">${escHtml(TINGKATAN_LABELS[s.tingkatanBaru]||s.tingkatanBaru||'—')}</span></td>
          <td><span style="font-size:12px; color:var(--ink-soft);">Tetap di kelas ini</span></td>
        </tr>`).join('');

      el.querySelector('.modal-body').innerHTML = `
        <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:14px; font-size:12.5px; color:var(--green);">
          Referensi usia: <b>1 Juli ${tahunIni}</b> · ${perluNaik.filter(s=>s._naik).length} generus perlu naik kelas · ${tetap.length} generus tetap
        </div>

        ${perluNaik.length > 0 ? `
        <div class="fw-bold color-green" style="margin-bottom:10px; font-size:14px;">Generus yang Naik Kelas</div>
        <div class="table-wrap" style="margin-bottom:18px;">
          <table>
            <thead><tr>
              <th style="width:36px;">Naik</th>
              <th>Nama & Kelas Sekarang</th>
              <th style="text-align:center;">Usia</th>
              <th>Tingkatan Lama</th>
              <th>Tingkatan Baru</th>
              <th>Kelas Tujuan</th>
            </tr></thead>
            <tbody>${naikRows}</tbody>
          </table>
        </div>` : '<div style="padding:14px; background:var(--green-soft); border-radius:var(--radius-sm); margin-bottom:14px; font-size:13px; color:var(--green);">✓ Tidak ada generus yang perlu naik kelas saat ini.</div>'}

        ${tetap.length > 0 ? `
        <details>
          <summary style="cursor:pointer; font-size:13px; font-weight:700; color:var(--ink-soft); padding:8px 0; margin-bottom:8px;">
            Generus yang Tetap (${tetap.length} orang)
          </summary>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nama & Kelas</th><th style="text-align:center;">Usia</th><th>Tingkatan</th><th>Status</th></tr></thead>
              <tbody>${tetapRows}</tbody>
            </table>
          </div>
        </details>` : ''}
      `;

      // Update tombol di footer
      const saveBtn = el.querySelector('#nkProsesBtn');
      if (saveBtn) {
        const adaNaik = perluNaik.filter(s => s._naik).length;
        saveBtn.textContent = adaNaik > 0 ? `Proses Naik Kelas (${adaNaik} generus)` : 'Tidak ada yang diproses';
        saveBtn.disabled = adaNaik === 0;
      }
    }

    // Update footer modal dengan tombol proses
    el.querySelector('.modal-head').insertAdjacentHTML('afterend', '');
    el.innerHTML = `<div class="modal modal-lg" style="max-height:94vh;">
      <div class="modal-head">
        <h3 class="modal-title">🎓 Proses Naik Kelas</h3>
        <button class="modal-close" onclick="closeModal('naikKelasModal')">✕</button>
      </div>
      <div class="modal-body" id="nkBody"></div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('naikKelasModal')">Batal</button>
        <button class="btn btn-green" id="nkProsesBtn" onclick="NK_proses()">Proses Naik Kelas</button>
      </div>
    </div>`;

    // Ganti modal-body dengan versi baru
    document.getElementById('nkBody').outerHTML.replace('nkBody', 'nkBody');
    const body = el.querySelector('.modal-body');
    body.id = 'nkBody';

    window.NK_toggleNaik = (idx, checked) => {
      window._nkState.perluNaik[idx]._naik = checked;
      if (!checked) window._nkState.perluNaik[idx]._kelasTujuan = '';
      renderStep2();
    };
    window.NK_setKelas = (idx, kelasId) => {
      window._nkState.perluNaik[idx]._kelasTujuan = kelasId;
    };

    window.NK_proses = async () => {
      const { perluNaik, kelompokId } = window._nkState;
      const yangNaik = perluNaik.filter(s => s._naik);

      // Validasi: semua yang naik harus ada kelas tujuan
      const belumPilihKelas = yangNaik.filter(s => !s._kelasTujuan);
      if (belumPilihKelas.length > 0) {
        showToast(`${belumPilihKelas.length} generus belum dipilih kelas tujuannya`, true);
        return;
      }

      const konfirmasi = confirm(
        `Proses naik kelas untuk ${yangNaik.length} generus?\n\n` +
        yangNaik.map(s => `• ${s.nama}: ${TINGKATAN_LABELS[s.tingkatanLama]} → ${TINGKATAN_LABELS[s.tingkatanBaru]}`).join('\n') +
        '\n\nProgress materi kelas lama akan direset.'
      );
      if (!konfirmasi) return;

      const btn = document.getElementById('nkProsesBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

      try {
        let berhasil = 0;
        const kelasLamaReset = new Set();

        for (const s of yangNaik) {
          // 1. Update tingkatan dan pindah kelas
          await SB.santri.update(s.id, {
            tingkatan: s.tingkatanBaru,
            tingkatan_override: false,
            kelas_id: s._kelasTujuan,
          });

          // 2. Catat kelas lama untuk reset progress
          kelasLamaReset.add(s._kelasSekarang.id + '||' + s._kelasSekarang.kelompok_id);
          berhasil++;
        }

        // 3. Reset progress untuk kelas lama yang ada generus naik
        for (const key of kelasLamaReset) {
          const [kelasId, klpId] = key.split('||');
          // Hapus progress kelompok untuk materi jenjang kelas lama
          const kelasLama = window._nkState.kelasList.find(k => k.id === kelasId);
          if (kelasLama && klpId) {
            // Ambil semua materi_id dari jenjang kelas lama
            const materiLama = (App.cache.materi || []).filter(r =>
              r.jenjang === kelasLama.jenjang && String(r.semester) === String(kelasLama.semester)
            );
            // Hapus progress untuk materi-materi itu
            for (const m of materiLama) {
              try {
                await sbFetch(`progress?kelompok_id=eq.${klpId}&materi_id=eq.${m.id}`, { method: 'DELETE' });
              } catch(e) {}
            }
          }
        }

        showToast(`✓ ${berhasil} generus berhasil naik kelas`);
        closeModal('naikKelasModal');

        // Reset cache
        App.cache.myProgress = null;

      } catch(e) {
        showToast('Gagal: ' + e.message, true);
        console.error(e);
        if (btn) { btn.disabled = false; btn.textContent = 'Proses Naik Kelas'; }
      }
    };

    renderStep2();
  }

  await showStep1();
}

/* ===== PAGE: PROGRESS (placeholder singkat) ===== */
async function renderProgress() {
  await renderKurikulum(); // Progress terintegrasi di kurikulum dengan checkbox
}

/* ===== PAGE: REKAP (placeholder) ===== */
async function renderRekap() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';

  // Tentukan kelompok yang ditampilkan
  let myKelompokId = u.kelompok_id || null;

  // Admin: tampilkan picker kelompok dulu
  if (isAdmin && !App.cache.rekapKelompokId) {
    if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
    main.innerHTML = `
      <div class="page-header"><h1 class="page-title">Rekap KBM</h1></div>
      <div class="card">
        <p style="margin:0 0 14px; font-size:13.5px; color:var(--ink-soft);">Pilih kelompok untuk melihat rekap.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          <div style="flex:0 0 auto; min-width:150px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Desa</label>
            <select id="rekapDesaFilter" onchange="REKAP_filterDesa(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Semua Desa</option>
              ${['Barat 1','Barat 2','Tengah 1','Tengah 2','Timur 1','Timur 2'].map(d =>
                `<option value="Desa ${d}">Desa ${d}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1; min-width:180px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelompok</label>
            <select id="rekapKelompokSel"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih kelompok...</option>
              ${(App.cache.kelompok||[]).map(k =>
                `<option value="${k.id}" data-desa="${escHtml(k.desa?.nama||k.desa_id)}">
                  ${escHtml(k.nama)} · ${escHtml(k.desa?.nama||k.desa_id)}
                </option>`).join('')}
            </select>
          </div>
          <button class="btn btn-green" onclick="REKAP_pilihKelompok()">Lihat Rekap →</button>
        </div>
      </div>`;
    window.REKAP_filterDesa = (desa) => {
      const sel = document.getElementById('rekapKelompokSel');
      Array.from(sel.options).forEach(o => {
        if (!o.value) return;
        o.hidden = desa ? o.dataset.desa !== desa : false;
      });
    };
    window.REKAP_pilihKelompok = () => {
      const id = document.getElementById('rekapKelompokSel').value;
      if (!id) { showToast('Pilih kelompok dulu', true); return; }
      App.cache.rekapKelompokId = id;
      renderRekap();
    };
    return;
  }

  myKelompokId = myKelompokId || App.cache.rekapKelompokId;

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div><div style="margin-top:12px; color:var(--ink-soft); font-size:13px;">Memuat data rekap...</div></div>';

  // Load semua data yang dibutuhkan
  const [kelasListRaw, allMateri, progData] = await Promise.all([
    SB.kelas.getByKelompok(myKelompokId),
    App.cache.materi ? Promise.resolve(App.cache.materi) : SB.materi.getAll().then(d => { App.cache.materi = d; return d; }),
    SB.progress.getByKelompok(myKelompokId, getTahunAjaran()),
  ]);

  const kelasList = sortKelas(kelasListRaw);

  // Load pertemuan, santri, absensi untuk semua kelas
  const kelasData = {};
  await Promise.all(kelasList.map(async k => {
    const [pertemuanList, santriList] = await Promise.all([
      SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
      SB.santri.getByKelas(k.id),
    ]);
    // Load absensi untuk semua pertemuan
    const absensiAll = {};
    await Promise.all(pertemuanList.map(async p => {
      const absen = await SB.absensi.getByPertemuan(p.id);
      absensiAll[p.id] = absen;
    }));
    kelasData[k.id] = { kelas: k, pertemuanList, santriList, absensiAll };
  }));

  const progressSet = new Set(progData.map(p => p.materi_id + '|' + p.bulan));
  const allMonths = [...SEM1_MONTHS, ...SEM2_MONTHS];
  const nowMonth = currentMonthName();

  // State filter
  let selectedBulan = nowMonth;
  let viewMode = 'kelas'; // 'kelas' atau 'tingkatan'

  // Variabel closure untuk diakses fungsi PDF
  let lastKelasStats = [], lastTotalSantriAll = 0, lastTotalPertemuanAll = 0;
  let lastAvgHadir = null, lastAvgMateri = null, lastKelompokNama = '';

  function renderDashboard() {
    // Bulan chips
    const semNow = SEM1_MONTHS.includes(nowMonth) ? SEM1_MONTHS : SEM2_MONTHS;
    const semPrev = semNow === SEM1_MONTHS ? SEM2_MONTHS : SEM1_MONTHS;
    const sem1Label = 'Semester 1 (Jul - Des)';
    const sem2Label = 'Semester 2 (Jan - Jun)';
    const bulanChips = `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">${sem1Label}:</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM1_MONTHS.map(m => `
            <div onclick="REKAP_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--green)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">${sem2Label}:</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM2_MONTHS.map(m => `
            <div onclick="REKAP_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--green)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>`;

    // Hitung statistik per kelas
    const kelasStats = kelasList.map(k => {
      const d = kelasData[k.id];
      const pertemuanBulan = d.pertemuanList.filter(p => p.bulan === selectedBulan);
      const totalPertemuan = pertemuanBulan.length;
      const totalSantri = d.santriList.length;

      // Hitung kehadiran per santri di bulan ini
      let totalH = 0, totalI = 0, totalS = 0, totalA = 0, totalSlot = 0;
      pertemuanBulan.forEach(p => {
        const absen = d.absensiAll[p.id] || [];
        d.santriList.forEach(s => {
          const a = absen.find(x => x.santri_id === s.id);
          const st = a?.status || 'A';
          if (st === 'H') totalH++;
          else if (st === 'I') totalI++;
          else if (st === 'S') totalS++;
          else totalA++;
          totalSlot++;
        });
      });

      const pctHadir = totalSlot > 0 ? Math.round(totalH / totalSlot * 100) : null;

      // Progress materi bulan ini
      const col = selectedBulan.toLowerCase();
      const materiKelas = allMateri.filter(r =>
        r.jenjang === k.jenjang && String(r.semester) === String(k.semester)
      );
      const materiTarget = materiKelas.filter(r => r[col] && r[col].trim());
      const materiTercapai = materiTarget.filter(r => progressSet.has(r.id + '|' + selectedBulan));
      const pctMateri = materiTarget.length > 0
        ? Math.round(materiTercapai.length / materiTarget.length * 100) : null;

      // Detail per santri
      const santriStats = d.santriList.map(s => {
        let h=0, i=0, sv=0, a=0;
        pertemuanBulan.forEach(p => {
          const absen = d.absensiAll[p.id] || [];
          const rec = absen.find(x => x.santri_id === s.id);
          const st = rec?.status || (totalPertemuan > 0 ? 'A' : null);
          if (st === 'H') h++;
          else if (st === 'I') i++;
          else if (st === 'S') sv++;
          else if (st === 'A') a++;
        });
        const pct = totalPertemuan > 0 ? Math.round(h / totalPertemuan * 100) : null;
        return { ...s, h, i, s: sv, a, pct, totalPertemuan };
      });

      return { kelas: k, totalPertemuan, totalSantri, totalH, totalI, totalS, totalA, totalSlot, pctHadir, pctMateri, materiTarget, materiTercapai, santriStats };
    });

    // Group by tingkatan kalau viewMode = 'tingkatan'
    const TINGKATAN_MAP = {
      'PAUD TK':'caberawit','SD 1':'caberawit','SD 2':'caberawit','SD 3':'caberawit',
      'SD 4':'caberawit','SD 5':'caberawit','SD 6':'caberawit',
      'SMP 1':'pra_remaja','SMP 2':'pra_remaja','SMP 3':'pra_remaja',
      'SMA 1':'remaja','SMA 2':'remaja','SMA 3':'remaja',
      'PRA 1':'pra_nikah','PRA 2':'pra_nikah','PRA 3':'pra_nikah','PRA 4':'pra_nikah',
    };

    // Render kartu per kelas
    function progressBar(pct, color='var(--green)') {
      if (pct === null) return '<span style="color:var(--ink-soft); font-size:12px;">Belum ada data</span>';
      const c = pct >= 80 ? 'var(--green)' : pct >= 50 ? '#e6a817' : 'var(--rose)';
      return `<div style="display:flex; align-items:center; gap:8px;">
        <div style="flex:1; height:8px; background:var(--line); border-radius:4px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:${c}; border-radius:4px; transition:width .5s;"></div>
        </div>
        <span style="font-size:12px; font-weight:700; color:${c}; flex-shrink:0;">${pct}%</span>
      </div>`;
    }

    const kelasCards = kelasStats.map(ks => {
      const tingkatan = TINGKATAN_MAP[ks.kelas.jenjang] || '';
      const namaKelas = ks.kelas.nama_kelas || ks.kelas.jenjang;

      const santriRows = ks.santriStats.map((s, i) => {
        const pctColor = s.pct === null ? 'var(--ink-soft)' : s.pct >= 80 ? 'var(--green)' : s.pct >= 50 ? '#e6a817' : 'var(--rose)';
        return `<tr>
          <td>${i+1}</td>
          <td><b>${escHtml(s.nama)}</b></td>
          <td style="text-align:center; color:var(--green); font-weight:700;">${s.h}</td>
          <td style="text-align:center; color:#e6a817; font-weight:700;">${s.i}</td>
          <td style="text-align:center; color:#17a2b8; font-weight:700;">${s.s}</td>
          <td style="text-align:center; color:var(--rose); font-weight:700;">${s.a}</td>
          <td style="text-align:center; font-size:11px; color:var(--ink-soft);">${s.totalPertemuan}</td>
          <td style="text-align:center;">
            ${s.pct !== null ? `<span style="font-weight:800; color:${pctColor};">${s.pct}%</span>` : '—'}
          </td>
        </tr>`;
      }).join('');

      return `<div class="card" style="margin-bottom:16px;">
        <!-- Header kelas -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
          <div>
            <div style="font-family:var(--font-display); font-size:17px; font-weight:700; color:var(--green);">
              ${escHtml(namaKelas)}
            </div>
            <div style="font-size:12px; color:var(--ink);">
              Target Materi ${escHtml(ks.kelas.jenjang)} · Sem ${ks.kelas.semester} · ${ks.totalSantri} santri
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <div style="text-align:center; padding:8px 14px; background:var(--green-soft); border-radius:var(--radius-sm);">
              <div style="font-size:20px; font-weight:800; color:var(--green); line-height:1;">${ks.totalPertemuan}</div>
              <div style="font-size:10px; color:var(--ink-soft); font-weight:700;">Pertemuan</div>
            </div>
          </div>
        </div>

        <!-- Progress bars -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin-bottom:6px;">Kehadiran Bulan Ini</div>
            ${progressBar(ks.pctHadir)}
            ${ks.totalSlot > 0 ? `<div style="font-size:11px; color:var(--ink-soft); margin-top:4px;">H:${ks.totalH} I:${ks.totalI} S:${ks.totalS} A:${ks.totalA} · ${ks.totalPertemuan} pertemuan × ${ks.totalSantri} santri</div>` : ''}
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin-bottom:6px;">Progress Materi</div>
            ${progressBar(ks.pctMateri)}
            ${ks.materiTarget.length > 0 ? `<div style="font-size:11px; color:var(--ink-soft); margin-top:4px;">${ks.materiTercapai.length} dari ${ks.materiTarget.length} materi</div>` : '<div style="font-size:11px; color:var(--ink-soft); margin-top:4px;">Tidak ada target bulan ini</div>'}
          </div>
        </div>

        <!-- Detail santri (collapsible) -->
        ${ks.santriStats.length > 0 ? `
        <details>
          <summary style="cursor:pointer; font-size:13px; font-weight:700; color:var(--green); padding:8px 0; border-top:1px solid var(--line); list-style:none; display:flex; align-items:center; justify-content:space-between;">
            <span>Detail Per Santri</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <div style="margin-top:12px;">
            <div class="table-wrap"><table>
              <thead><tr>
                <th>#</th><th>Nama</th>
                <th style="text-align:center; color:#4ade80;">H</th>
                <th style="text-align:center; color:#fbbf24;">I</th>
                <th style="text-align:center; color:#67e8f9;">S</th>
                <th style="text-align:center; color:#f87171;">A</th>
                <th style="text-align:center;">Ptm</th>
                <th style="text-align:center;">%</th>
              </tr></thead>
              <tbody>${santriRows}</tbody>
            </table></div>
          </div>
        </details>` : ''}
      </div>`;
    }).join('');

    // Ringkasan total kelompok
    const totalPertemuanAll = kelasStats.reduce((s, k) => s + k.totalPertemuan, 0);
    const totalSantriAll = kelasStats.reduce((s, k) => s + k.totalSantri, 0);
    const avgHadir = kelasStats.filter(k => k.pctHadir !== null).length > 0
      ? Math.round(kelasStats.filter(k => k.pctHadir !== null).reduce((s, k) => s + (k.pctHadir||0), 0) / kelasStats.filter(k => k.pctHadir !== null).length) : null;
    const avgMateri = kelasStats.filter(k => k.pctMateri !== null).length > 0
      ? Math.round(kelasStats.filter(k => k.pctMateri !== null).reduce((s, k) => s + (k.pctMateri||0), 0) / kelasStats.filter(k => k.pctMateri !== null).length) : null;

    const kelompokNama = (App.cache.kelompok||[]).find(k => k.id === myKelompokId)?.nama || myKelompokId;
    // Simpan ke closure untuk diakses fungsi PDF
    lastKelasStats = kelasStats; lastTotalSantriAll = totalSantriAll;
    lastTotalPertemuanAll = totalPertemuanAll; lastAvgHadir = avgHadir;
    lastAvgMateri = avgMateri; lastKelompokNama = kelompokNama;

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rekap KBM</h1>
          <p style="font-size:15px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(kelompokNama)} · Bulan ${escHtml(selectedBulan)} · TA ${getTahunAjaran()}</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button class="btn btn-outline btn-sm" onclick="REKAP_pdfRingkas()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PDF Ringkas
          </button>
          <button class="btn btn-outline btn-sm" onclick="REKAP_pdfDetail()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PDF Detail
          </button>
          ${isAdmin ? `<button class="btn btn-outline btn-sm" onclick="REKAP_gantiKelompok()">Ganti Kelompok</button>` : ''}
        </div>
      </div>

      <!-- Ringkasan -->
      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card">
          <div class="stat-num">${kelasList.length}</div>
          <div class="stat-label">Kelas Aktif</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${totalSantriAll}</div>
          <div class="stat-label">Total Generus</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${totalPertemuanAll}</div>
          <div class="stat-label">Pertemuan Bulan Ini</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:${avgHadir===null?'var(--ink-soft)':avgHadir>=80?'var(--green)':avgHadir>=50?'#e6a817':'var(--rose)'};">
            ${avgHadir !== null ? avgHadir + '%' : '\u2014'}
          </div>
          <div class="stat-label">Rata-rata Kehadiran</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:${avgMateri===null?'var(--ink-soft)':avgMateri>=80?'var(--green)':avgMateri>=50?'#e6a817':'var(--rose)'};">
            ${avgMateri !== null ? avgMateri + '%' : '\u2014'}
          </div>
          <div class="stat-label">Progress Materi</div>
        </div>
      </div>

      <!-- Filter bulan -->
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:18px; overflow-x:auto; padding-bottom:4px;">
        ${bulanChips}
      </div>

      <!-- Kartu per kelas -->
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(420px, 1fr)); gap:16px;">
        ${kelasList.length > 0 ? kelasCards : '<div class="card"><p class="color-soft">Belum ada kelas di kelompok ini.</p></div>'}
      </div>
    `;
  }

  window.REKAP_setBulan = (b) => { selectedBulan = b; renderDashboard(); };
  window.REKAP_gantiKelompok = () => { App.cache.rekapKelompokId = null; renderRekap(); };

  // ── Helper: Load pdf-lib ──
  async function loadPdfLib() {
    if (window.PDFLib) return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      s.onload = res;
      s.onerror = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s2.onload = res; s2.onerror = rej;
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    });
  }

  function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ── PDF RINGKAS ──
  window.REKAP_pdfRingkas = async () => {
    showToast('Menyiapkan PDF Ringkas...');
    await loadPdfLib();
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg  = await doc.embedFont(StandardFonts.Helvetica);

      const W = 595, H = 842;
      const ML = 40, MR = 40, MT = 50;
      const GREEN = rgb(0.106, 0.227, 0.173);
      const GOLD  = rgb(0.757, 0.604, 0.294);
      const GRAY  = rgb(0.5, 0.5, 0.5);
      const RED   = rgb(0.65, 0.28, 0.23);

      let page = doc.addPage([W, H]);
      let y = H - MT;

      // Header
      page.drawText('REKAP KBM - PPG SIDOARJO UTARA', { x: ML, y, font: fBold, size: 12, color: GREEN });
      y -= 16;
      page.drawText(`Kelompok: ${lastKelompokNama}   |   Bulan: ${selectedBulan}   |   Dibuat: ${new Date().toLocaleDateString('id-ID')}`,
        { x: ML, y, font: fReg, size: 9, color: GRAY });
      y -= 8;
      page.drawLine({ start:{x:ML,y}, end:{x:W-MR,y}, thickness:1.5, color:GREEN });
      y -= 20;

      // Ringkasan angka
      page.drawText('RINGKASAN KELOMPOK', { x: ML, y, font: fBold, size: 10, color: GREEN });
      y -= 14;
      const summaryItems = [
        ['Jumlah Kelas Aktif', `${lastKelasStats.length} kelas`],
        ['Total Generus', `${lastTotalSantriAll} orang`],
        ['Total Pertemuan Bulan Ini', `${lastTotalPertemuanAll}x`],
        ['Rata-rata Kehadiran', lastAvgHadir !== null ? `${lastAvgHadir}%` : '-'],
        ['Rata-rata Progress Materi', lastAvgMateri !== null ? `${lastAvgMateri}%` : '-'],
      ];
      summaryItems.forEach(([label, val]) => {
        page.drawText(label + ':', { x: ML + 10, y, font: fReg, size: 9, color: rgb(0.2,0.2,0.2) });
        page.drawText(val, { x: ML + 200, y, font: fBold, size: 9, color: GREEN });
        y -= 13;
      });
      y -= 10;

      // Tabel per kelas
      page.drawText('REKAP PER KELAS', { x: ML, y, font: fBold, size: 10, color: GREEN });
      y -= 14;

      // Header tabel
      const cols = [
        { x: ML, w: 110, label: 'Kelas' },
        { x: ML+110, w: 65, label: 'Jenjang' },
        { x: ML+175, w: 50, label: 'Santri' },
        { x: ML+225, w: 60, label: 'Pertemuan' },
        { x: ML+285, w: 80, label: 'Kehadiran' },
        { x: ML+365, w: 80, label: 'Prog. Materi' },
        { x: ML+445, w: 70, label: 'Materi' },
      ];
      page.drawRectangle({ x: ML, y: y-4, width: W-ML-MR, height: 16, color: GREEN });
      cols.forEach(c => {
        page.drawText(c.label, { x: c.x+3, y: y+0, font: fBold, size: 8, color: rgb(1,1,1) });
      });
      y -= 18;

      lastKelasStats.forEach((ks, idx) => {
        if (y < 80) { page = doc.addPage([W, H]); y = H - MT; }
        const bg = idx % 2 === 0 ? rgb(0.97,0.97,0.97) : rgb(1,1,1);
        page.drawRectangle({ x: ML, y: y-4, width: W-ML-MR, height: 15, color: bg });

        const hadir = ks.pctHadir !== null ? ks.pctHadir + '%' : '-';
        const materi = ks.pctMateri !== null ? ks.pctMateri + '%' : '-';
        const materiDetail = ks.materiTarget.length > 0
          ? `${ks.materiTercapai.length}/${ks.materiTarget.length}`
          : '-';

        const hColor = ks.pctHadir === null ? GRAY : ks.pctHadir >= 80 ? GREEN : ks.pctHadir >= 50 ? GOLD : RED;
        const mColor = ks.pctMateri === null ? GRAY : ks.pctMateri >= 80 ? GREEN : ks.pctMateri >= 50 ? GOLD : RED;

        [
          [cols[0], ks.kelas.nama_kelas || ks.kelas.jenjang, rgb(0.1,0.1,0.1), true],
          [cols[1], ks.kelas.jenjang, GRAY, false],
          [cols[2], String(ks.totalSantri), rgb(0.1,0.1,0.1), false],
          [cols[3], String(ks.totalPertemuan) + 'x', rgb(0.1,0.1,0.1), false],
          [cols[4], hadir, hColor, true],
          [cols[5], materi, mColor, true],
          [cols[6], materiDetail, GRAY, false],
        ].forEach(([col, val, color, bold]) => {
          page.drawText(val, { x: col.x+3, y: y+0, font: bold ? fBold : fReg, size: 8, color });
        });
        y -= 15;
      });

      y -= 10;
      // Keterangan warna
      page.drawText('Keterangan: >=80% = Baik   50-79% = Perlu Perhatian   <50% = Kritis',
        { x: ML, y, font: fReg, size: 8, color: GRAY });

      // Footer
      doc.getPages().forEach((p, i) => {
        p.drawText(`Halaman ${i+1}/${doc.getPageCount()} - Rekap KBM ${lastKelompokNama} - ${selectedBulan}`,
          { x: ML, y: 24, font: fReg, size: 7, color: GRAY });
      });

      const bytes = await doc.save();
      downloadPdf(bytes, `Rekap_Ringkas_${lastKelompokNama.replace(/ /g,'_')}_${selectedBulan}.pdf`);
      showToast('PDF Ringkas berhasil diunduh +');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
  };

  // -- PDF DETAIL --
  window.REKAP_pdfDetail = async () => {
    showToast('Menyiapkan PDF Detail...');
    await loadPdfLib();
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg  = await doc.embedFont(StandardFonts.Helvetica);

      const W = 595, H = 842;
      const ML = 36, MR = 36, MT = 44;
      const GREEN = rgb(0.106, 0.227, 0.173);
      const GOLD  = rgb(0.757, 0.604, 0.294);
      const GRAY  = rgb(0.5, 0.5, 0.5);
      const RED   = rgb(0.65, 0.28, 0.23);

      let page = doc.addPage([W, H]);
      let y = H - MT;

      function newPage() {
        page = doc.addPage([W, H]);
        y = H - MT;
      }
      function checkY(need) { if (y < need + 40) newPage(); }

      // Cover / Header
      page.drawText('REKAP KBM LENGKAP', { x: ML, y, font: fBold, size: 13, color: GREEN });
      y -= 16;
      page.drawText(`Kelompok: ${lastKelompokNama}`, { x: ML, y, font: fBold, size: 10, color: rgb(0.1,0.1,0.1) });
      y -= 13;
      page.drawText(`Bulan: ${selectedBulan}   |   Semester: ${SEM1_MONTHS.includes(selectedBulan)?'1 (Jul-Des)':'2 (Jan-Jun)'}   |   Tanggal cetak: ${new Date().toLocaleDateString('id-ID')}`,
        { x: ML, y, font: fReg, size: 9, color: GRAY });
      y -= 8;
      page.drawLine({ start:{x:ML,y}, end:{x:W-MR,y}, thickness:1.5, color:GREEN });
      y -= 20;

      // Per kelas - detail lengkap
      for (const ks of lastKelasStats) {
        checkY(60);

        // Nama kelas header
        page.drawRectangle({ x: ML, y: y-4, width: W-ML-MR, height: 18, color: GREEN });
        const namaKelas = ks.kelas.nama_kelas || ks.kelas.jenjang;
        page.drawText(`${namaKelas}  -  ${ks.kelas.jenjang} Sem ${ks.kelas.semester}  |  ${ks.totalSantri} Generus  |  ${ks.totalPertemuan}x Pertemuan`,
          { x: ML+5, y: y+0, font: fBold, size: 9, color: rgb(1,1,1) });
        y -= 22;

        // Ringkasan kelas
        const hadir = ks.pctHadir !== null ? `${ks.pctHadir}% (H:${ks.totalH} I:${ks.totalI} S:${ks.totalS} A:${ks.totalA})` : 'Belum ada absensi';
        const materi = ks.pctMateri !== null ? `${ks.pctMateri}% (${ks.materiTercapai.length}/${ks.materiTarget.length} materi)` : 'Tidak ada target';
        page.drawText(`Kehadiran: ${hadir}`, { x: ML+5, y, font: fReg, size: 8.5, color: rgb(0.15,0.15,0.15) });
        y -= 12;
        page.drawText(`Progress Materi: ${materi}`, { x: ML+5, y, font: fReg, size: 8.5, color: rgb(0.15,0.15,0.15) });
        y -= 16;

        if (ks.santriStats.length > 0) {
          // Header tabel santri
          checkY(30);
          const sc = [
            { x: ML, w: 20, label: '#' },
            { x: ML+20, w: 160, label: 'Nama Santri' },
            { x: ML+180, w: 35, label: 'Hadir' },
            { x: ML+215, w: 30, label: 'Ijin' },
            { x: ML+245, w: 30, label: 'Sakit' },
            { x: ML+275, w: 35, label: 'Alpha' },
            { x: ML+310, w: 50, label: '% Hadir' },
          ];
          page.drawRectangle({ x: ML, y: y-4, width: W-ML-MR, height: 14, color: rgb(0.88,0.93,0.88) });
          sc.forEach(c => page.drawText(c.label, { x: c.x+2, y: y-1, font: fBold, size: 7.5, color: GREEN }));
          y -= 16;

          ks.santriStats.forEach((s, idx) => {
            checkY(14);
            const bg = idx % 2 === 0 ? rgb(0.98,0.98,0.98) : rgb(1,1,1);
            page.drawRectangle({ x: ML, y: y-4, width: W-ML-MR, height: 13, color: bg });
            const pctColor = s.pct === null ? GRAY : s.pct >= 80 ? GREEN : s.pct >= 50 ? GOLD : RED;
            [
              [sc[0], String(idx+1), GRAY, false],
              [sc[1], s.nama, rgb(0.1,0.1,0.1), true],
              [sc[2], String(s.h), GREEN, true],
              [sc[3], String(s.i), GOLD, false],
              [sc[4], String(s.s), rgb(0.09,0.63,0.72), false],
              [sc[5], String(s.a), RED, false],
              [sc[6], s.pct !== null ? s.pct + '%' : '-', pctColor, true],
            ].forEach(([col, val, color, bold]) => {
              page.drawText(val, { x: col.x+2, y: y-1, font: bold?fBold:fReg, size: 8, color });
            });
            y -= 13;
          });
          y -= 6;
        }

        // Daftar materi yang sudah disampaikan
        if (ks.materiTercapai.length > 0) {
          checkY(20);
          page.drawText('Materi yang sudah disampaikan:', { x: ML+5, y, font: fBold, size: 8, color: GREEN });
          y -= 12;
          ks.materiTercapai.forEach(m => {
            checkY(12);
            const label = `+ ${m.no||'*'}. ${m.topik||''}${m.poin_title?' - '+m.poin_title:''}`;
            page.drawText(label.slice(0, 90), { x: ML+10, y, font: fReg, size: 7.5, color: rgb(0.1,0.3,0.2) });
            y -= 11;
          });
        }

        // Materi yang belum
        const materiBlm = ks.materiTarget.filter(m => !progressSet.has(m.id+'|'+selectedBulan));
        if (materiBlm.length > 0) {
          checkY(20);
          page.drawText('Materi belum disampaikan:', { x: ML+5, y, font: fBold, size: 8, color: RED });
          y -= 12;
          materiBlm.forEach(m => {
            checkY(12);
            const label = `- ${m.no||'*'}. ${m.topik||''}${m.poin_title?' - '+m.poin_title:''}`;
            page.drawText(label.slice(0, 90), { x: ML+10, y, font: fReg, size: 7.5, color: rgb(0.5,0.2,0.15) });
            y -= 11;
          });
        }

        y -= 14;
      }

      // Footer semua halaman
      doc.getPages().forEach((p, i) => {
        p.drawText(`Halaman ${i+1}/${doc.getPageCount()} - Rekap KBM Lengkap - ${lastKelompokNama} - ${selectedBulan}`,
          { x: ML, y: 24, font: fReg, size: 7, color: GRAY });
      });

      const bytes = await doc.save();
      downloadPdf(bytes, `Rekap_Detail_${lastKelompokNama.replace(/ /g,'_')}_${selectedBulan}.pdf`);
      showToast('PDF Detail berhasil diunduh +');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
  };

  renderDashboard();
}
async function renderRekapDesa() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin' || u.role === 'daerah';

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  if (!App.cache.materi) App.cache.materi = await SB.materi.getAll();

  // Picker desa untuk admin/daerah
  if (isAdmin && !App.cache.rekapDesaId) {
    const desaList = [...new Set((App.cache.kelompok||[]).map(k => k.desa?.nama||k.desa_id))].filter(Boolean).sort();
    main.innerHTML = `
      <div class="page-header"><h1 class="page-title">Rekap Desa</h1></div>
      <div class="card">
        <p style="margin:0 0 14px; font-size:13.5px; color:var(--ink-soft);">Pilih desa untuk melihat rekap.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          <div style="flex:1; min-width:200px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Desa</label>
            <select id="rdDesaSel" style="width:100%; padding:10px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih desa...</option>
              ${desaList.map(d => `<option value="${escHtml(d)}">${escHtml(d)}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-green" onclick="RD_pilih(document.getElementById('rdDesaSel').value)">Lihat Rekap →</button>
        </div>
      </div>`;
    window.RD_pilih = (id) => {
      if (!id) { showToast('Pilih desa dulu', true); return; }
      App.cache.rekapDesaId = id;
      renderRekapDesa();
    };
    return;
  }

  const myDesaNama = App.cache.rekapDesaId || u.desa_nama || u.desa_id || null;
  const kelompokDesa = (App.cache.kelompok||[]).filter(k =>
    (k.desa?.nama || k.desa_id) === myDesaNama
  );

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div><div style="margin-top:12px; color:var(--ink-soft); font-size:13px;">Memuat data rekap desa...</div></div>';

  // Load semua data paralel
  const allSantri = await SB.santri.getAll();
  const nowMonth = currentMonthName();
  const semNow = SEM1_MONTHS.includes(nowMonth) ? SEM1_MONTHS : SEM2_MONTHS;
  let selectedBulan = nowMonth;

  // Load kelas, pertemuan, absensi, progress untuk setiap kelompok
  const kelompokData = {};
  await Promise.all(kelompokDesa.map(async klp => {
    const kelasList = sortKelas(await SB.kelas.getByKelompok(klp.id));
    const progData = await SB.progress.getByKelompok(klp.id, getTahunAjaran());
    const progressSet = new Set(progData.map(p => p.materi_id + '|' + p.bulan));

    const kelasData = {};
    await Promise.all(kelasList.map(async k => {
      const [pertemuanList, santriKelas] = await Promise.all([
        SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
        SB.santri.getByKelas(k.id),
      ]);
      const absensiAll = {};
      await Promise.all(pertemuanList.map(async p => {
        absensiAll[p.id] = await SB.absensi.getByPertemuan(p.id);
      }));
      kelasData[k.id] = { kelas: k, pertemuanList, santriKelas, absensiAll };
    }));

    kelompokData[klp.id] = { kelompok: klp, kelasList, kelasData, progressSet };
  }));

  function hitungStatsKlp(klpId, bulan) {
    const d = kelompokData[klpId];
    if (!d) return null;
    let totalPertemuan = 0, totalH = 0, totalI = 0, totalS = 0, totalA = 0, totalSlot = 0;
    let materiTarget = 0, materiTercapai = 0;
    const perKelas = [];

    d.kelasList.forEach(k => {
      const kd = d.kelasData[k.id];
      const perBulan = kd.pertemuanList.filter(p => p.bulan === bulan);
      let kH=0, kI=0, kS=0, kA=0, kSlot=0;
      perBulan.forEach(p => {
        const absen = kd.absensiAll[p.id] || [];
        kd.santriKelas.forEach(s => {
          const a = absen.find(x => x.santri_id === s.id);
          const st = a?.status || 'A';
          if (st==='H') { kH++; totalH++; } else if (st==='I') { kI++; totalI++; }
          else if (st==='S') { kS++; totalS++; } else { kA++; totalA++; }
          kSlot++; totalSlot++;
        });
      });
      totalPertemuan += perBulan.length;

      // Progress materi
      const col = bulan.toLowerCase();
      const materiKelas = (App.cache.materi||[]).filter(r =>
        r.jenjang === k.jenjang && String(r.semester) === String(k.semester) && r[col] && r[col].trim()
      );
      const kMT = materiKelas.length;
      const kMC = materiKelas.filter(r => d.progressSet.has(r.id+'|'+bulan)).length;
      materiTarget += kMT;
      materiTercapai += kMC;
      perKelas.push({
        nama: k.nama_kelas || k.jenjang,
        santri: kd.santriKelas.length,
        pertemuan: perBulan.length,
        pctHadir: kSlot > 0 ? Math.round(kH/kSlot*100) : null,
        pctMateri: kMT > 0 ? Math.round(kMC/kMT*100) : null,
        materiCapai: kMC, materiTarget: kMT,
      });
    });

    const pctHadir = totalSlot > 0 ? Math.round(totalH/totalSlot*100) : null;
    const pctMateri = materiTarget > 0 ? Math.round(materiTercapai/materiTarget*100) : null;

    // Jumlah generus per tingkatan
    const santriKlp = allSantri.filter(s => s.kelas?.kelompok_id === klpId);
    const TINGKATAN_LIST = ['caberawit','pra_remaja','remaja','pra_nikah'];
    const generus = {};
    TINGKATAN_LIST.forEach(t => { generus[t] = {L:0, P:0}; });
    santriKlp.forEach(s => {
      const t = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
      const jk = s.jenis_kel;
      if (t && generus[t] && (jk==='L'||jk==='P')) generus[t][jk]++;
    });
    const totalGenerus = santriKlp.length;

    return { totalPertemuan, totalH, totalI, totalS, totalA, totalSlot, pctHadir, pctMateri, materiTarget, materiTercapai, generus, totalGenerus, perKelas };
  }

  function pctBar(pct, w=80) {
    if (pct === null) return '<span style="font-size:11px; color:var(--ink-soft);">-</span>';
    const c = pct>=80?'var(--green)':pct>=50?'#e6a817':'var(--rose)';
    return `<div style="display:flex; align-items:center; gap:5px;">
      <div style="flex:1; height:6px; background:var(--line); border-radius:3px; overflow:hidden; min-width:${w}px;">
        <div style="width:${pct}%; height:100%; background:${c}; border-radius:3px;"></div>
      </div>
      <span style="font-size:11px; font-weight:700; color:${c}; flex-shrink:0;">${pct}%</span>
    </div>`;
  }

  function renderDashboard() {
    const bulanChips = `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">Semester 1 (Jul - Des):</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM1_MONTHS.map(m => `
            <div onclick="RD_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--green)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">Semester 2 (Jan - Jun):</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM2_MONTHS.map(m => `
            <div onclick="RD_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--green)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>`;

    // Hitung stats per kelompok
    const klpStats = kelompokDesa.map(klp => ({
      kelompok: klp,
      stats: hitungStatsKlp(klp.id, selectedBulan),
    }));

    // Total desa
    const totalDesa = {
      pertemuan: klpStats.reduce((n,k) => n+(k.stats?.totalPertemuan||0), 0),
      generus: klpStats.reduce((n,k) => n+(k.stats?.totalGenerus||0), 0),
      hadir: klpStats.filter(k=>k.stats?.pctHadir!==null),
      materi: klpStats.filter(k=>k.stats?.pctMateri!==null),
    };
    const avgHadir = totalDesa.hadir.length ? Math.round(totalDesa.hadir.reduce((n,k)=>n+(k.stats.pctHadir||0),0)/totalDesa.hadir.length) : null;
    const avgMateri = totalDesa.materi.length ? Math.round(totalDesa.materi.reduce((n,k)=>n+(k.stats.pctMateri||0),0)/totalDesa.materi.length) : null;

    const TINGKATAN_LIST = ['caberawit','pra_remaja','remaja','pra_nikah'];

    // Tabel per kelompok (format rekap daerah, detail langsung terbuka)
    const klpRows = klpStats.map(({kelompok:klp, stats:s}) => {
      const kelasRows = (s?.perKelas||[]).map(k => `
        <tr style="background:var(--green-soft);">
          <td style="padding:4px 10px; font-size:11.5px; color:var(--ink-soft);">↳ ${escHtml(k.nama)}</td>
          <td style="text-align:center; font-size:11px;">${k.santri}</td>
          <td style="text-align:center; font-size:11px;">${k.pertemuan}x</td>
          <td style="padding:4px 10px;">${pctBar(s?.pctHadir!==undefined?k.pctHadir:null, 60)}</td>
          <td style="padding:4px 10px;">${pctBar(k.pctMateri, 60)}</td>
        </tr>`).join('');

      const generusDetail = TINGKATAN_LIST.map(t => {
        const g = s?.generus[t] || {L:0,P:0};
        return `<span style="color:#1a6b3a;">${g.L}L</span><span style="color:#a6483b;">${g.P}P</span>`;
      }).join('<span style="color:var(--line); margin:0 3px;">|</span>');

      return `
        <tr style="border-bottom:2px solid var(--green-soft);">
          <td style="padding:7px 10px; font-size:12.5px; font-weight:700; color:var(--green);">${escHtml(klp.nama)}</td>
          <td style="text-align:center; font-size:12px; font-weight:700;">${s?.totalGenerus||0}</td>
          <td style="text-align:center; font-size:12px; font-weight:700;">${s?.totalPertemuan||0}x</td>
          <td style="padding:6px 10px; min-width:80px;">${pctBar(s?.pctHadir, 60)}</td>
          <td style="padding:6px 10px; min-width:80px;">${pctBar(s?.pctMateri, 60)}</td>
        </tr>
        ${kelasRows}
        <tr style="background:#f8f8f4;">
          <td colspan="5" style="padding:5px 10px; font-size:11px; color:var(--ink-soft);">
            👥 ${generusDetail}
          </td>
        </tr>`;
    }).join('');

    const tabelHtml = `
      <div class="card" style="padding:0; overflow:hidden;">
        <div style="background:var(--green); padding:12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-weight:800; font-size:15px; color:#fff;">📍 ${escHtml(myDesaNama)}</div>
            <div style="font-size:12px; color:rgba(255,255,255,.75);">${kelompokDesa.length} kelompok · ${totalDesa.generus} generus</div>
          </div>
          <div style="display:flex; gap:10px;">
            <div style="text-align:center;">
              <div style="font-size:16px; font-weight:800; color:${avgHadir===null?'rgba(255,255,255,.5)':avgHadir>=80?'#a3e6c0':avgHadir>=50?'#ffd97d':'#ffaaaa'};">${avgHadir!==null?avgHadir+'%':'—'}</div>
              <div style="font-size:10px; color:rgba(255,255,255,.7);">Kehadiran</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:16px; font-weight:800; color:${avgMateri===null?'rgba(255,255,255,.5)':avgMateri>=80?'#a3e6c0':avgMateri>=50?'#ffd97d':'#ffaaaa'};">${avgMateri!==null?avgMateri+'%':'—'}</div>
              <div style="font-size:10px; color:rgba(255,255,255,.7);">Materi</div>
            </div>
          </div>
        </div>
        <div class="table-wrap">
          <table style="width:100%; border-collapse:collapse; min-width:480px;">
            <thead><tr style="background:var(--green);">
              <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok / Kelas</th>
              <th style="text-align:center; font-size:11px; color:#fff; padding:7px 4px;">Generus</th>
              <th style="text-align:center; font-size:11px; color:#fff; padding:7px 4px;">Pertemuan</th>
              <th style="font-size:11px; color:#fff; padding:7px 10px;">Kehadiran</th>
              <th style="font-size:11px; color:#fff; padding:7px 10px;">Prog. Materi</th>
            </tr></thead>
            <tbody>${klpRows}</tbody>
          </table>
        </div>
      </div>`;

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rekap Desa</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(myDesaNama)} · ${kelompokDesa.length} kelompok · Bulan ${selectedBulan} · TA ${getTahunAjaran()}</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="RD_downloadPdf()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PDF
          </button>
          ${isAdmin ? `<button class="btn btn-outline btn-sm" onclick="RD_gantiDesa()">Ganti Desa</button>` : ''}
        </div>
      </div>

      <!-- Stat cards -->
      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-num">${kelompokDesa.length}</div><div class="stat-label">Kelompok</div></div>
        <div class="stat-card"><div class="stat-num">${totalDesa.generus}</div><div class="stat-label">Total Generus</div></div>
        <div class="stat-card"><div class="stat-num">${totalDesa.pertemuan}</div><div class="stat-label">Pertemuan</div></div>
        <div class="stat-card">
          <div class="stat-num" style="color:${avgHadir===null?'var(--ink-soft)':avgHadir>=80?'var(--green)':avgHadir>=50?'#e6a817':'var(--rose)'};">${avgHadir!==null?avgHadir+'%':'—'}</div>
          <div class="stat-label">Rata-rata Kehadiran</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:${avgMateri===null?'var(--ink-soft)':avgMateri>=80?'var(--green)':avgMateri>=50?'#e6a817':'var(--rose)'};">${avgMateri!==null?avgMateri+'%':'—'}</div>
          <div class="stat-label">Progress Materi</div>
        </div>
      </div>

      <div style="margin-bottom:16px;">${bulanChips}</div>

      ${tabelHtml}
    `;
  }

  window.RD_setBulan = (b) => { selectedBulan = b; renderDashboard(); };
  window.RD_gantiDesa = () => { App.cache.rekapDesaId = null; renderRekapDesa(); };

  window.RD_downloadPdf = async () => {
    showToast('Menyiapkan PDF...');
    if (!window.PDFLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg  = await doc.embedFont(StandardFonts.Helvetica);

      const W = 595, H = 842;
      const ML = 36, MR = 36, MT = 44;
      const GREEN  = rgb(0.106, 0.227, 0.173);
      const GOLD   = rgb(0.757, 0.604, 0.294);
      const GRAY   = rgb(0.5, 0.5, 0.5);
      const RED    = rgb(0.65, 0.28, 0.23);
      const LGREEN = rgb(0.91, 0.96, 0.91);
      const LYELLOW= rgb(0.99, 0.97, 0.88);

      let page = doc.addPage([W, H]);
      let y = H - MT;

      function newPage() { page = doc.addPage([W,H]); y = H - MT; }
      function checkY(n) { if (y < n + 36) newPage(); }

      function pctColor(pct) {
        if (pct === null) return GRAY;
        return pct >= 80 ? GREEN : pct >= 50 ? GOLD : RED;
      }

      // ── Cover / Header ──
      page.drawText('REKAP KBM DESA', { x:ML, y, font:fBold, size:14, color:GREEN });
      y -= 16;
      page.drawText(myDesaNama + '   |   Bulan: ' + selectedBulan + '   |   Dicetak: ' + new Date().toLocaleDateString('id-ID'),
        { x:ML, y, font:fReg, size:9, color:GRAY });
      y -= 8;
      page.drawLine({ start:{x:ML,y}, end:{x:W-MR,y}, thickness:1.5, color:GREEN });
      y -= 18;

      // ── Ringkasan Desa ──
      const klpStats = kelompokDesa.map(klp => ({
        kelompok: klp,
        stats: hitungStatsKlp(klp.id, selectedBulan),
      }));
      const avgH = (() => {
        const d = klpStats.filter(k=>k.stats?.pctHadir!==null);
        return d.length ? Math.round(d.reduce((n,k)=>n+(k.stats.pctHadir||0),0)/d.length) : null;
      })();
      const avgM = (() => {
        const d = klpStats.filter(k=>k.stats?.pctMateri!==null);
        return d.length ? Math.round(d.reduce((n,k)=>n+(k.stats.pctMateri||0),0)/d.length) : null;
      })();
      const totalGenerusDesa = klpStats.reduce((n,k)=>n+(k.stats?.totalGenerus||0),0);
      const totalPtmDesa = klpStats.reduce((n,k)=>n+(k.stats?.totalPertemuan||0),0);

      page.drawText('RINGKASAN DESA', { x:ML, y, font:fBold, size:10, color:GREEN });
      y -= 14;
      const summary = [
        ['Jumlah Kelompok', kelompokDesa.length + ' kelompok'],
        ['Total Generus', totalGenerusDesa + ' orang'],
        ['Total Pertemuan Bulan Ini', totalPtmDesa + 'x'],
        ['Rata-rata Kehadiran', avgH !== null ? avgH + '%' : '-'],
        ['Rata-rata Progress Materi', avgM !== null ? avgM + '%' : '-'],
      ];
      summary.forEach(([label, val]) => {
        page.drawText(label + ':', { x:ML+8, y, font:fReg, size:9, color:rgb(0.2,0.2,0.2) });
        page.drawText(val, { x:ML+200, y, font:fBold, size:9, color:GREEN });
        y -= 13;
      });
      y -= 10;

      // ── Tabel ringkasan per kelompok ──
      checkY(60);
      page.drawText('REKAP PER KELOMPOK', { x:ML, y, font:fBold, size:10, color:GREEN });
      y -= 14;

      // Header tabel
      const TC = [
        { x:ML,     w:110, label:'Kelompok' },
        { x:ML+110, w:50,  label:'Generus' },
        { x:ML+160, w:50,  label:'Pertemuan' },
        { x:ML+210, w:75,  label:'Kehadiran' },
        { x:ML+285, w:75,  label:'Prog. Materi' },
        { x:ML+360, w:45,  label:'Caberawit' },
        { x:ML+405, w:45,  label:'Pra Remaja' },
        { x:ML+450, w:45,  label:'Remaja' },
        { x:ML+495, w:55,  label:'Pra Nikah' },
      ];
      page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:16, color:GREEN });
      TC.forEach(c => page.drawText(c.label, { x:c.x+3, y:y, font:fBold, size:7.5, color:rgb(1,1,1) }));
      y -= 18;

      klpStats.forEach(({ kelompok: klp, stats: s }, idx) => {
        checkY(14);
        const bg = idx % 2 === 0 ? LGREEN : rgb(1,1,1);
        page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:14, color:bg });

        const TLIST = ['caberawit','pra_remaja','remaja','pra_nikah'];
        const hadirTxt = s?.pctHadir !== null ? s.pctHadir + '%' : '-';
        const materiTxt = s?.pctMateri !== null ? s.pctMateri + '%' : '-';

        page.drawText(klp.nama.slice(0,20), { x:ML+3, y:y-1, font:fBold, size:8, color:rgb(0.1,0.1,0.1) });
        page.drawText(String(s?.totalGenerus||0), { x:ML+113, y:y-1, font:fReg, size:8, color:rgb(0.1,0.1,0.1) });
        page.drawText(String(s?.totalPertemuan||0)+'x', { x:ML+163, y:y-1, font:fReg, size:8, color:rgb(0.1,0.1,0.1) });
        page.drawText(hadirTxt, { x:ML+213, y:y-1, font:fBold, size:8, color:pctColor(s?.pctHadir) });
        page.drawText(materiTxt, { x:ML+288, y:y-1, font:fBold, size:8, color:pctColor(s?.pctMateri) });
        TLIST.forEach((t, i) => {
          const bx = [ML+363, ML+408, ML+453, ML+498][i];
          const L = s?.generus[t]?.L||0, P = s?.generus[t]?.P||0;
          page.drawText(`${L}L ${P}P`, { x:bx, y:y-1, font:fReg, size:7.5, color:rgb(0.2,0.2,0.2) });
        });
        y -= 14;
      });

      y -= 10;
      page.drawText('Keterangan: >=80% = Baik   50-79% = Perlu Perhatian   <50% = Kritis',
        { x:ML, y, font:fReg, size:8, color:GRAY });
      y -= 20;

      // ── Detail per kelompok ──
      klpStats.forEach(({ kelompok: klp, stats: s }) => {
        if (!s) return;
        checkY(80);

        // Header kelompok
        page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:18, color:GREEN });
        page.drawText(klp.nama + '   |   ' + s.totalGenerus + ' generus   |   ' + s.totalPertemuan + 'x pertemuan',
          { x:ML+5, y:y, font:fBold, size:9, color:rgb(1,1,1) });
        y -= 22;

        // Kehadiran & materi
        const hadirTxt = s.pctHadir !== null
          ? s.pctHadir + '%  (H:' + s.totalH + ' I:' + s.totalI + ' S:' + s.totalS + ' A:' + s.totalA + ')'
          : 'Belum ada absensi';
        const materiTxt = s.pctMateri !== null
          ? s.pctMateri + '%  (' + s.materiTercapai + '/' + s.materiTarget + ' materi tercapai)'
          : 'Tidak ada target materi';

        page.drawText('Kehadiran : ' + hadirTxt,
          { x:ML+5, y, font:fReg, size:8.5, color:pctColor(s.pctHadir) });
        y -= 13;
        page.drawText('Prog. Materi: ' + materiTxt,
          { x:ML+5, y, font:fReg, size:8.5, color:pctColor(s.pctMateri) });
        y -= 13;

        // Generus per tingkatan
        const TLIST = ['caberawit','pra_remaja','remaja','pra_nikah'];
        const TLABELS = ['Caberawit','Pra Remaja','Remaja','Pra Nikah'];
        const genTxt = TLIST.map((t,i) =>
          TLABELS[i] + ': ' + (s.generus[t].L||0) + 'L ' + (s.generus[t].P||0) + 'P'
        ).join('   ');
        page.drawText('Generus    : ' + genTxt,
          { x:ML+5, y, font:fReg, size:8.5, color:rgb(0.2,0.2,0.2) });
        y -= 18;
      });

      // Footer
      doc.getPages().forEach((p, i) => {
        p.drawText('Hal '+(i+1)+'/'+doc.getPageCount()+'  -  Rekap KBM '+myDesaNama+' - '+selectedBulan,
          { x:ML, y:24, font:fReg, size:7.5, color:GRAY });
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type:'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Rekap_' + (myDesaNama||'Desa').replace(/ /g,'_') + '_' + selectedBulan + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
  };

  renderDashboard();
}
async function renderRekapDaerah() {
  const main = document.getElementById('mainContent');
  const u = App.user;

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  if (!App.cache.materi) App.cache.materi = await SB.materi.getAll();

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div><div style="margin-top:12px; color:var(--ink-soft); font-size:13px;">Memuat data rekap daerah...</div></div>';

  const kelompokList = App.cache.kelompok || [];
  const nowMonth = currentMonthName();
  const semNow = SEM1_MONTHS.includes(nowMonth) ? SEM1_MONTHS : SEM2_MONTHS;
  let selectedBulan = nowMonth;

  // Group kelompok per desa
  const desaMap = {};
  kelompokList.forEach(k => {
    const desaNama = k.desa?.nama || k.desa_id || 'Lainnya';
    if (!desaMap[desaNama]) desaMap[desaNama] = [];
    desaMap[desaNama].push(k);
  });

  // Load semua data paralel per kelompok
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div><div style="margin-top:12px; color:var(--ink-soft); font-size:13px;">Memuat data ' + kelompokList.length + ' kelompok...</div></div>';

  const allSantri = await SB.santri.getAll();
  const kelompokData = {};
  await Promise.all(kelompokList.map(async klp => {
    const kelasList = sortKelas(await SB.kelas.getByKelompok(klp.id));
    const progData = await SB.progress.getByKelompok(klp.id, getTahunAjaran());
    const progressSet = new Set(progData.map(p => p.materi_id + '|' + p.bulan));
    const kelasData = {};
    await Promise.all(kelasList.map(async k => {
      const [pertemuanList, santriKelas] = await Promise.all([
        SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
        SB.santri.getByKelas(k.id),
      ]);
      const absensiAll = {};
      await Promise.all(pertemuanList.map(async p => {
        absensiAll[p.id] = await SB.absensi.getByPertemuan(p.id);
      }));
      kelasData[k.id] = { kelas: k, pertemuanList, santriKelas, absensiAll };
    }));
    kelompokData[klp.id] = { kelompok: klp, kelasList, kelasData, progressSet };
  }));

  const TINGKATAN_LIST = ['caberawit','pra_remaja','remaja','pra_nikah'];

  function hitungStatsKlp(klpId, bulan) {
    const d = kelompokData[klpId];
    if (!d) return null;
    let totalPertemuan=0, totalH=0, totalI=0, totalS=0, totalA=0, totalSlot=0;
    let materiTarget=0, materiTercapai=0;
    const perKelas = [];
    d.kelasList.forEach(k => {
      const kd = d.kelasData[k.id];
      const perBulan = kd.pertemuanList.filter(p => p.bulan === bulan);
      let kH=0, kI=0, kS=0, kA=0, kSlot=0;
      perBulan.forEach(p => {
        const absen = kd.absensiAll[p.id] || [];
        kd.santriKelas.forEach(s => {
          const st = absen.find(x => x.santri_id === s.id)?.status || 'A';
          if (st==='H') { kH++; totalH++; } else if (st==='I') { kI++; totalI++; }
          else if (st==='S') { kS++; totalS++; } else { kA++; totalA++; }
          kSlot++; totalSlot++;
        });
      });
      totalPertemuan += perBulan.length;
      const col = bulan.toLowerCase();
      const mk = (App.cache.materi||[]).filter(r =>
        r.jenjang === k.jenjang && String(r.semester) === String(k.semester) && r[col] && r[col].trim()
      );
      const kMateriTarget = mk.length;
      const kMateriCapai = mk.filter(r => d.progressSet.has(r.id+'|'+bulan)).length;
      materiTarget += kMateriTarget;
      materiTercapai += kMateriCapai;
      perKelas.push({
        nama: k.nama_kelas || k.jenjang,
        pertemuan: perBulan.length,
        santri: kd.santriKelas.length,
        pctHadir: kSlot > 0 ? Math.round(kH/kSlot*100) : null,
        pctMateri: kMateriTarget > 0 ? Math.round(kMateriCapai/kMateriTarget*100) : null,
        materiCapai: kMateriCapai, materiTarget: kMateriTarget,
      });
    });
    const pctHadir = totalSlot > 0 ? Math.round(totalH/totalSlot*100) : null;
    const pctMateri = materiTarget > 0 ? Math.round(materiTercapai/materiTarget*100) : null;
    const santriKlp = allSantri.filter(s => s.kelas?.kelompok_id === klpId);
    const generus = {};
    TINGKATAN_LIST.forEach(t => { generus[t] = {L:0, P:0}; });
    santriKlp.forEach(s => {
      const t = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
      const jk = s.jenis_kel;
      if (t && generus[t] && (jk==='L'||jk==='P')) generus[t][jk]++;
    });
    return { totalPertemuan, totalH, totalI, totalS, totalA, totalSlot, pctHadir, pctMateri,
      materiTarget, materiTercapai, generus, totalGenerus: santriKlp.length, perKelas };
  }

  function pctBar(pct) {
    if (pct === null) return '<span style="font-size:11px; color:var(--ink-soft);">-</span>';
    const c = pct>=80?'var(--green)':pct>=50?'#e6a817':'var(--rose)';
    return `<div style="display:flex; align-items:center; gap:5px;">
      <div style="flex:1; height:6px; background:var(--line); border-radius:3px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:${c}; border-radius:3px;"></div>
      </div>
      <span style="font-size:11px; font-weight:700; color:${c};">${pct}%</span>
    </div>`;
  }

  function renderDashboard() {
    const bulanChips = `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">Semester 1 (Jul - Des):</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM1_MONTHS.map(m => `
            <div onclick="RDA_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--green)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">Semester 2 (Jan - Jun):</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM2_MONTHS.map(m => `
            <div onclick="RDA_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--green)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>`;

    // Hitung stats semua kelompok
    const allKlpStats = kelompokList.map(klp => ({
      kelompok: klp,
      desaNama: klp.desa?.nama || klp.desa_id || 'Lainnya',
      stats: hitungStatsKlp(klp.id, selectedBulan),
    }));

    // Total daerah
    const totalGenerusDaerah = allKlpStats.reduce((n,k) => n+(k.stats?.totalGenerus||0), 0);
    const totalPtmDaerah = allKlpStats.reduce((n,k) => n+(k.stats?.totalPertemuan||0), 0);
    const hadirArr = allKlpStats.filter(k => k.stats?.pctHadir !== null);
    const materiArr = allKlpStats.filter(k => k.stats?.pctMateri !== null);
    const avgHadirDaerah = hadirArr.length ? Math.round(hadirArr.reduce((n,k)=>n+(k.stats.pctHadir||0),0)/hadirArr.length) : null;
    const avgMateriDaerah = materiArr.length ? Math.round(materiArr.reduce((n,k)=>n+(k.stats.pctMateri||0),0)/materiArr.length) : null;

    // Kartu per desa
    const desaCards = Object.entries(desaMap).map(([desaNama, klpList]) => {
      const klpDesa = allKlpStats.filter(k => k.desaNama === desaNama);
      const totalGenDesa = klpDesa.reduce((n,k)=>n+(k.stats?.totalGenerus||0),0);
      const totalPtmDesa = klpDesa.reduce((n,k)=>n+(k.stats?.totalPertemuan||0),0);
      const hadirDesa = klpDesa.filter(k=>k.stats?.pctHadir!==null);
      const materiDesa = klpDesa.filter(k=>k.stats?.pctMateri!==null);
      const avgHD = hadirDesa.length ? Math.round(hadirDesa.reduce((n,k)=>n+(k.stats.pctHadir||0),0)/hadirDesa.length) : null;
      const avgMD = materiDesa.length ? Math.round(materiDesa.reduce((n,k)=>n+(k.stats.pctMateri||0),0)/materiDesa.length) : null;

      let klpIdx = 0;
      const klpRows = klpDesa.map(({kelompok:klp, stats:s}) => {
        klpIdx++;
        const uid = desaNama.replace(/\s/g,'') + '_' + klpIdx;
        const kelasDetail = (s?.perKelas||[]).map(k => `
          <tr class="kd_row" style="display:none; background:var(--green-soft);">
            <td style="padding:4px 10px; font-size:11.5px; color:var(--ink-soft);">↳ ${escHtml(k.nama)}</td>
            <td style="text-align:center; font-size:11px;">${k.santri}</td>
            <td style="text-align:center; font-size:11px;">${k.pertemuan}x</td>
            <td style="padding:4px 10px;">${pctBar(k.pctHadir)}</td>
            <td style="padding:4px 10px;">${pctBar(k.pctMateri)}</td>
          </tr>`).join('');

        const generusDetail = TINGKATAN_LIST.map(t => {
          const g = s?.generus[t] || {L:0,P:0};
          return `<span style="color:#1a6b3a;">${g.L}L</span><span style="color:#a6483b;">${g.P}P</span>`;
        }).join('<span style="color:var(--line); margin:0 3px;">|</span>');

        return `
          <tr style="border-bottom:1px solid var(--line); cursor:pointer;" onclick="var el=this.nextElementSibling;while(el&&el.classList.contains('kd_row')){el.style.display=el.style.display==='none'?'table-row':'none';el=el.nextElementSibling;}">
            <td style="padding:7px 10px; font-size:12.5px; font-weight:600;">${escHtml(klp.nama)} <span style="font-size:10px; color:var(--ink-soft);">▼</span></td>
            <td style="text-align:center; font-size:12px;">${s?.totalGenerus||0}</td>
            <td style="text-align:center; font-size:12px;">${s?.totalPertemuan||0}x</td>
            <td style="padding:6px 10px; min-width:90px;">${pctBar(s?.pctHadir)}</td>
            <td style="padding:6px 10px; min-width:90px;">${pctBar(s?.pctMateri)}</td>
          </tr>
          ${kelasDetail}
          <tr class="kd_row" style="display:none; background:#f8f8f4;">
            <td colspan="5" style="padding:5px 10px; font-size:11px; color:var(--ink-soft);">
              👥 ${generusDetail}
            </td>
          </tr>`;
      }).join('');

      return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
        <div style="background:var(--green); padding:12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-weight:800; font-size:15px; color:#fff;">📍 ${escHtml(desaNama)}</div>
            <div style="font-size:12px; color:rgba(255,255,255,.75);">${klpList.length} kelompok · ${totalGenDesa} generus</div>
          </div>
          <div style="display:flex; gap:10px;">
            <div style="text-align:center;">
              <div style="font-size:16px; font-weight:800; color:${avgHD===null?'rgba(255,255,255,.5)':avgHD>=80?'#a3e6c0':avgHD>=50?'#ffd97d':'#ffaaaa'};">${avgHD!==null?avgHD+'%':'—'}</div>
              <div style="font-size:10px; color:rgba(255,255,255,.7);">Kehadiran</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:16px; font-weight:800; color:${avgMD===null?'rgba(255,255,255,.5)':avgMD>=80?'#a3e6c0':avgMD>=50?'#ffd97d':'#ffaaaa'};">${avgMD!==null?avgMD+'%':'—'}</div>
              <div style="font-size:10px; color:rgba(255,255,255,.7);">Materi</div>
            </div>
          </div>
        </div>
        <div class="table-wrap">
          <table style="width:100%; border-collapse:collapse; min-width:480px;">
            <thead><tr style="background:var(--green);">
              <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok</th>
              <th style="text-align:center; font-size:11px; color:#fff; padding:7px 4px;">Generus</th>
              <th style="text-align:center; font-size:11px; color:#fff; padding:7px 4px;">Pertemuan</th>
              <th style="font-size:11px; color:#fff; padding:7px 10px;">Kehadiran</th>
              <th style="font-size:11px; color:#fff; padding:7px 10px;">Prog. Materi</th>
            </tr></thead>
            <tbody>${klpRows}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rekap Daerah</h1>
          <p class="page-subtitle">PPG Sidoarjo Utara · ${kelompokList.length} kelompok · Bulan ${selectedBulan} · TA ${getTahunAjaran()}</p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="RDA_downloadPdf()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          PDF
        </button>
      </div>

      <!-- Stat cards total daerah -->
      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-num">${kelompokList.length}</div><div class="stat-label">Total Kelompok</div></div>
        <div class="stat-card"><div class="stat-num">${totalGenerusDaerah}</div><div class="stat-label">Total Generus</div></div>
        <div class="stat-card"><div class="stat-num">${totalPtmDaerah}</div><div class="stat-label">Pertemuan Bulan Ini</div></div>
        <div class="stat-card">
          <div class="stat-num" style="color:${avgHadirDaerah===null?'var(--ink-soft)':avgHadirDaerah>=80?'var(--green)':avgHadirDaerah>=50?'#e6a817':'var(--rose)'};">${avgHadirDaerah!==null?avgHadirDaerah+'%':'—'}</div>
          <div class="stat-label">Rata-rata Kehadiran</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:${avgMateriDaerah===null?'var(--ink-soft)':avgMateriDaerah>=80?'var(--green)':avgMateriDaerah>=50?'#e6a817':'var(--rose)'};">${avgMateriDaerah!==null?avgMateriDaerah+'%':'—'}</div>
          <div class="stat-label">Progress Materi</div>
        </div>
      </div>

      <!-- Filter bulan -->
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; overflow-x:auto; padding-bottom:4px;">
        ${bulanChips}
      </div>

      <!-- Kartu per desa -->
      ${desaCards}
    `;
  }

  window.RDA_setBulan = (b) => { selectedBulan = b; renderDashboard(); };

  window.RDA_downloadPdf = async () => {
    showToast('Menyiapkan PDF Rekap Daerah...');
    if (!window.PDFLib) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg  = await doc.embedFont(StandardFonts.Helvetica);
      const W=842, H=595, ML=36, MR=36, MT=44;
      const GREEN=rgb(0.106,0.227,0.173), GOLD=rgb(0.757,0.604,0.294);
      const GRAY=rgb(0.5,0.5,0.5), RED=rgb(0.65,0.28,0.23);
      const LGREEN=rgb(0.91,0.96,0.91);

      let page = doc.addPage([W,H]); let y = H-MT;
      function newPage() { page=doc.addPage([W,H]); y=H-MT; }
      function checkY(n) { if(y<n+36) newPage(); }
      function pctC(p) { return p===null?GRAY:p>=80?GREEN:p>=50?GOLD:RED; }

      // Header
      page.drawText('REKAP KBM DAERAH - PPG SIDOARJO UTARA', {x:ML,y,font:fBold,size:13,color:GREEN});
      y-=15;
      page.drawText('Bulan: '+selectedBulan+'   |   Dicetak: '+new Date().toLocaleDateString('id-ID')+'   |   '+kelompokList.length+' kelompok   |   31 kelompok',
        {x:ML,y,font:fReg,size:9,color:GRAY});
      y-=8;
      page.drawLine({start:{x:ML,y},end:{x:W-MR,y},thickness:1.5,color:GREEN});
      y-=18;

      const allKlpStats = kelompokList.map(klp => ({
        kelompok:klp, desaNama:klp.desa?.nama||klp.desa_id||'Lainnya',
        stats: hitungStatsKlp(klp.id, selectedBulan),
      }));

      // Ringkasan per desa
      page.drawText('RINGKASAN PER DESA', {x:ML,y,font:fBold,size:10,color:GREEN}); y-=14;
      const TC=[
        {x:ML,w:80,label:'Desa'},{x:ML+80,w:50,label:'Kelompok'},
        {x:ML+130,w:55,label:'Generus'},{x:ML+185,w:55,label:'Pertemuan'},
        {x:ML+240,w:80,label:'Kehadiran'},{x:ML+320,w:80,label:'Prog.Materi'},
        {x:ML+400,w:370,label:'Caberawit     Pra Remaja      Remaja       Pra Nikah'},
      ];
      page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:16,color:GREEN});
      TC.forEach(c=>page.drawText(c.label,{x:c.x+3,y:y,font:fBold,size:7.5,color:rgb(1,1,1)}));
      y-=18;

      Object.entries(desaMap).forEach(([desaNama, klpList],di) => {
        checkY(14);
        const klpDesa = allKlpStats.filter(k=>k.desaNama===desaNama);
        const totG = klpDesa.reduce((n,k)=>n+(k.stats?.totalGenerus||0),0);
        const totP = klpDesa.reduce((n,k)=>n+(k.stats?.totalPertemuan||0),0);
        const hArr = klpDesa.filter(k=>k.stats?.pctHadir!==null);
        const mArr = klpDesa.filter(k=>k.stats?.pctMateri!==null);
        const avgH2 = hArr.length?Math.round(hArr.reduce((n,k)=>n+(k.stats.pctHadir||0),0)/hArr.length):null;
        const avgM2 = mArr.length?Math.round(mArr.reduce((n,k)=>n+(k.stats.pctMateri||0),0)/mArr.length):null;

        // Generus per tingkatan untuk desa
        const genDesa = {};
        TINGKATAN_LIST.forEach(t=>{genDesa[t]={L:0,P:0};});
        klpDesa.forEach(({stats:s})=>{ if(s) TINGKATAN_LIST.forEach(t=>{genDesa[t].L+=s.generus[t].L||0;genDesa[t].P+=s.generus[t].P||0;}); });

        const bg = di%2===0?LGREEN:rgb(1,1,1);
        page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:14,color:bg});
        page.drawText(desaNama,{x:ML+3,y:y-1,font:fBold,size:8.5,color:GREEN});
        page.drawText(String(klpList.length),{x:ML+83,y:y-1,font:fReg,size:8,color:rgb(0.1,0.1,0.1)});
        page.drawText(String(totG),{x:ML+133,y:y-1,font:fReg,size:8,color:rgb(0.1,0.1,0.1)});
        page.drawText(String(totP)+'x',{x:ML+188,y:y-1,font:fReg,size:8,color:rgb(0.1,0.1,0.1)});
        page.drawText(avgH2!==null?avgH2+'%':'-',{x:ML+243,y:y-1,font:fBold,size:8,color:pctC(avgH2)});
        page.drawText(avgM2!==null?avgM2+'%':'-',{x:ML+323,y:y-1,font:fBold,size:8,color:pctC(avgM2)});
        TINGKATAN_LIST.forEach((t,i)=>{
          const bx=ML+403+i*90;
          page.drawText(`${genDesa[t].L}L ${genDesa[t].P}P`,{x:bx,y:y-1,font:fReg,size:7.5,color:rgb(0.2,0.2,0.2)});
        });
        y-=14;
      });

      y-=12;

      // Detail per desa + kelompok
      Object.entries(desaMap).forEach(([desaNama, klpList]) => {
        checkY(60);
        page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:18,color:GREEN});
        page.drawText('Desa '+desaNama,{x:ML+5,y:y,font:fBold,size:10,color:rgb(1,1,1)});
        y-=22;

        // Sub-header kelompok
        const SCols=[
          {x:ML,w:100,l:'Kelompok'},{x:ML+100,w:50,l:'Generus'},
          {x:ML+150,w:55,l:'Pertemuan'},{x:ML+205,w:70,l:'Kehadiran'},
          {x:ML+275,w:70,l:'Prog.Materi'},{x:ML+345,w:460,l:'Caberawit      Pra Remaja      Remaja         Pra Nikah'},
        ];
        checkY(14);
        page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:14,color:rgb(0.2,0.5,0.3)});
        SCols.forEach(c=>page.drawText(c.l,{x:c.x+3,y:y-1,font:fBold,size:7.5,color:rgb(1,1,1)}));
        y-=16;

        const klpDesa = allKlpStats.filter(k=>k.desaNama===desaNama);
        klpDesa.forEach(({kelompok:klp,stats:s},idx)=>{
          checkY(14);
          const bg=idx%2===0?rgb(0.97,0.99,0.97):rgb(1,1,1);
          page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:13,color:bg});
          page.drawText(klp.nama.slice(0,18),{x:ML+3,y:y-1,font:fReg,size:8,color:rgb(0.1,0.1,0.1)});
          page.drawText(String(s?.totalGenerus||0),{x:ML+103,y:y-1,font:fReg,size:8,color:rgb(0.1,0.1,0.1)});
          page.drawText(String(s?.totalPertemuan||0)+'x',{x:ML+153,y:y-1,font:fReg,size:8,color:rgb(0.1,0.1,0.1)});
          page.drawText(s?.pctHadir!==null?s.pctHadir+'%':'-',{x:ML+208,y:y-1,font:fBold,size:8,color:pctC(s?.pctHadir)});
          page.drawText(s?.pctMateri!==null?s.pctMateri+'%':'-',{x:ML+278,y:y-1,font:fBold,size:8,color:pctC(s?.pctMateri)});
          TINGKATAN_LIST.forEach((t,i)=>{
            const bx=ML+348+i*105;
            page.drawText(`${s?.generus[t]?.L||0}L ${s?.generus[t]?.P||0}P`,{x:bx,y:y-1,font:fReg,size:7.5,color:rgb(0.2,0.2,0.2)});
          });
          y-=13;
        });
        y-=10;
      });

      // Footer
      doc.getPages().forEach((p,i)=>{
        p.drawText('Hal '+(i+1)+'/'+doc.getPageCount()+'  -  Rekap Daerah PPG Sidoarjo Utara - '+selectedBulan,
          {x:ML,y:24,font:fReg,size:7.5,color:GRAY});
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes],{type:'application/pdf'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download='Rekap_Daerah_PPG_'+selectedBulan+'.pdf';
      a.click(); URL.revokeObjectURL(url);
      showToast('PDF Rekap Daerah berhasil diunduh');
    } catch(e) {
      showToast('Gagal: '+e.message, true);
      console.error(e);
    }
  };

  renderDashboard();
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
    const nama_kelas = document.getElementById('kelasNama').value.trim().toUpperCase();
    const jenjang = document.getElementById('kelasJenjang').value;
    const semester = document.getElementById('kelasSem').value;
    if (!kelompokId) { showToast('Pilih kelompok terlebih dahulu', true); return; }
    if (!nama_kelas) { showToast('Nama kelas wajib diisi', true); return; }
    const btn = document.getElementById('kelasSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await SB.kelas.insert({ kelompok_id: kelompokId, nama_kelas, jenjang, semester: parseInt(semester) });
      showToast('Kelas berhasil ditambahkan');
      closeModal('kelasModal');
      onSaved();
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error('Insert kelas error:', e);
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
      tahun_ajaran: getTahunAjaran(new Date(tanggal)),
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
        // Reset wizard ke step 1
        WIZ_resetWizard();
      }
    });
  });

  // Login form
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

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
