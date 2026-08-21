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
// Kategori usia (gaya Data Jamaah) dari NAMA KELAS santri — dipakai buat nyocokin data
// Data Santri vs Data Jamaah (Data Santri jadi acuan, krn itu penempatan kelas yg SEBENARNYA
// dipakai, bukan cuma hasil hitung usia otomatis)
function kategoriDariNamaKelas(namaKelas) {
  const nm = (namaKelas||'').toUpperCase().trim();
  if (nm.startsWith('CABERAWIT')) return 'Caberawit';
  if (nm.startsWith('PRA REMAJA')) return 'Pra Remaja';
  if (nm.startsWith('REMAJA')) return 'Remaja';
  if (nm.startsWith('PRA NIKAH')) return 'Pra Nikah';
  return null; // PAUD/TK atau kelas lain di luar 4 kategori yg dibandingkan
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
  desa_view: 'Pengelola Desa',
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

// Tingkatan dari NAMA KELAS ASLI yang diikuti santri (kelas_id) — ini yang dipakai
// sebagai ACUAN UTAMA di mana pun perlu ngitung jumlah per tingkatan, BUKAN hasil hitung
// usia (hitungTingkatan di bawah pakai patokan 1 Juli, bisa beda dari kelas sebenarnya).
function tingkatanDariKelas(namaKelas) {
  const nm = (namaKelas||'').toUpperCase().trim();
  if (nm.startsWith('CABERAWIT')) return 'caberawit';
  if (nm.startsWith('PRA REMAJA')) return 'pra_remaja';
  if (nm.startsWith('REMAJA')) return 'remaja';
  if (nm.startsWith('PRA NIKAH')) return 'pra_nikah';
  return null;
}

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
  chatUnread: false,
  chatUnreadInterval: null,
  onlineHeartbeatInterval: null,
  aksesRefreshInterval: null,
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
  App.realUser = user; // identitas asli — jangan pernah diubah oleh impersonasi akses lintas
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
  App.cache = { materi: null, kelompok: null, desa: null, myProgress: null, allSantri: null };
  if (App.chatUnreadInterval) { clearInterval(App.chatUnreadInterval); App.chatUnreadInterval = null; }
  if (App.onlineHeartbeatInterval) { clearInterval(App.onlineHeartbeatInterval); App.onlineHeartbeatInterval = null; }
  if (App.aksesRefreshInterval) { clearInterval(App.aksesRefreshInterval); App.aksesRefreshInterval = null; }
}

/* ===== UTILITIES ===== */
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Overlay "Layar Penuh" per kelas — dipakai bersama oleh SEMUA level Rekap KBM
// (Kelompok/Desa/Daerah), biar gak ditulis ulang 3x. Data yg diterima:
// { nama, kelompokNama, desaNama(opsional), santri, pctHadir, pctMateri,
//   materiCapai, materiTarget, daftarMateri:[{topik,selesai}] }
function showFullscreenKelas(k) {
  let el = document.getElementById('rekapFullscreenOverlay');
  if (!el) { el = document.createElement('div'); el.id = 'rekapFullscreenOverlay'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed; inset:0; background:var(--cream,#FAF6EC); z-index:9999; overflow-y:auto; padding:40px;';
  el.innerHTML = `
    <button onclick="hideFullscreenKelas()" style="position:fixed; top:20px; right:20px; z-index:10000; background:var(--rose); color:#fff; border:none; border-radius:10px; padding:12px 22px; font-size:16px; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.2);">✕ Keluar Layar Penuh</button>
    <div style="max-width:900px; margin:0 auto;">
      ${(k.desaNama || k.kelompokNama) ? `<div style="font-size:16px; color:var(--ink-soft); font-weight:700; margin-bottom:4px;">${[k.desaNama, k.kelompokNama].filter(Boolean).map(escHtml).join(' · ')}</div>` : ''}
      <div style="font-size:44px; font-weight:800; color:var(--green); margin-bottom:24px;">${escHtml(k.nama)}</div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-bottom:32px;">
        <div style="background:#fff; border-radius:16px; padding:22px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,.06);">
          <div style="font-size:14px; color:var(--ink-soft); font-weight:700; margin-bottom:6px;">GENERUS</div>
          <div style="font-size:38px; font-weight:800; color:var(--ink);">${k.santri}</div>
        </div>
        <div style="background:#fff; border-radius:16px; padding:22px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,.06);">
          <div style="font-size:14px; color:var(--ink-soft); font-weight:700; margin-bottom:6px;">KEHADIRAN</div>
          <div style="font-size:38px; font-weight:800; color:${k.pctHadir>=80?'var(--green)':k.pctHadir>=50?'#e6a817':'var(--rose)'};">${k.pctHadir!=null?k.pctHadir+'%':'-'}</div>
        </div>
        <div style="background:#fff; border-radius:16px; padding:22px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,.06);">
          <div style="font-size:14px; color:var(--ink-soft); font-weight:700; margin-bottom:6px;">MATERI</div>
          <div style="font-size:38px; font-weight:800; color:${k.pctMateri>=80?'var(--green)':k.pctMateri>=50?'#e6a817':'var(--rose)'};">${k.pctMateri!=null?k.pctMateri+'%':'-'}</div>
          <div style="font-size:13px; color:var(--ink-soft); margin-top:2px;">${k.materiCapai} dari ${k.materiTarget} topik</div>
        </div>
      </div>

      <div style="font-size:20px; font-weight:800; color:var(--green); margin-bottom:14px;">📋 Daftar Materi Bulan Ini</div>
      <div style="background:#fff; border-radius:16px; padding:10px 24px; box-shadow:0 2px 10px rgba(0,0,0,.06);">
        ${k.daftarMateri.length ? k.daftarMateri.map(m => `
          <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 0; border-bottom:1px solid var(--line);">
            <span style="font-size:22px; flex-shrink:0;">${m.selesai?'✅':'⬜'}</span>
            <div>
              <div style="font-size:19px; font-weight:700; color:${m.selesai?'var(--ink)':'var(--ink-soft)'};">${m.bab?escHtml(m.bab)+'. ':''}${escHtml(m.babTitle||'')}</div>
              ${m.subTitle ? `<div style="font-size:17px; font-weight:600; color:${m.selesai?'var(--ink)':'var(--ink-soft)'}; margin-top:2px;">${m.sub?escHtml(m.sub)+'. ':''}${escHtml(m.subTitle)}</div>` : ''}
              ${m.poinTitle ? `<div style="font-size:15px; color:var(--ink-soft); margin-top:2px;">${escHtml(m.poinTitle)}</div>` : ''}
            </div>
          </div>`).join('') : '<div style="padding:20px 0; color:var(--ink-soft); font-size:16px;">Belum ada materi terjadwal bulan ini.</div>'}
      </div>
    </div>`;
  el.style.display = 'block';
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}
function hideFullscreenKelas() {
  const el = document.getElementById('rekapFullscreenOverlay');
  if (el) el.style.display = 'none';
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    const el = document.getElementById('rekapFullscreenOverlay');
    if (el) el.style.display = 'none';
  }
});

// Tampilan kompak 1 item materi (bab/sub/poin) — dipakai di daftar toggle "Detail Materi"
// di ketiga level Rekap KBM (beda dari showFullscreenKelas yg lebih besar/lega buat presentasi)
function materiItemCompactHtml(m) {
  const c = m.selesai ? 'var(--green)' : 'var(--ink-soft)';
  return `<div style="padding:4px 0; border-bottom:1px solid var(--line);">
    <div style="color:${c}; font-weight:700;">${m.selesai?'✅':'⬜'} ${m.bab?escHtml(m.bab)+'. ':''}${escHtml(m.babTitle||'')}</div>
    ${m.subTitle ? `<div style="color:${c}; margin-left:20px; font-weight:600;">${m.sub?escHtml(m.sub)+'. ':''}${escHtml(m.subTitle)}</div>` : ''}
    ${m.poinTitle ? `<div style="color:var(--ink-soft); margin-left:20px;">${escHtml(m.poinTitle)}</div>` : ''}
  </div>`;
}

// ===== EDITOR TEKS KAYA (Bold/Italic/dll) — dipakai di field2 notulensi Musyawarah =====
// Toolbar sederhana + <div contenteditable>. Isinya disimpan sbg HTML terbatas (cuma tag
// b/i/u/ul/li/br yg diperbolehkan execCommand dari toolbar ini — user gak bisa nyisipin
// tag lain krn gak ada cara paste-HTML dari toolbar ini, cuma ngetik+format biasa).
function richTextEditorHtml(id, initialHtml) {
  return `<div class="rte-wrap" style="border:1.5px solid var(--line); border-radius:var(--radius-sm); overflow:hidden;">
    <div style="display:flex; gap:2px; padding:5px 6px; background:var(--cream-2,#F4EFE3); border-bottom:1px solid var(--line);">
      <button type="button" onmousedown="event.preventDefault()" onclick="RTE_exec('${id}','bold')" title="Tebal (Bold)" style="width:28px; height:28px; border:none; background:none; border-radius:5px; cursor:pointer; font-weight:800; font-size:13px;">B</button>
      <button type="button" onmousedown="event.preventDefault()" onclick="RTE_exec('${id}','italic')" title="Miring (Italic)" style="width:28px; height:28px; border:none; background:none; border-radius:5px; cursor:pointer; font-style:italic; font-size:13px;">I</button>
      <button type="button" onmousedown="event.preventDefault()" onclick="RTE_exec('${id}','underline')" title="Garis Bawah" style="width:28px; height:28px; border:none; background:none; border-radius:5px; cursor:pointer; text-decoration:underline; font-size:13px;">U</button>
      <div style="width:1px; background:var(--line); margin:4px 3px;"></div>
      <button type="button" onmousedown="event.preventDefault()" onclick="RTE_exec('${id}','insertUnorderedList')" title="Daftar Poin" style="width:28px; height:28px; border:none; background:none; border-radius:5px; cursor:pointer; font-size:14px;">•≡</button>
    </div>
    <div id="${id}" class="rte-editor" contenteditable="true" style="min-height:90px; max-height:320px; overflow-y:auto; padding:9px 12px; font-size:13.5px; font-family:inherit; outline:none; background:var(--white);">${initialHtml || ''}</div>
  </div>`;
}
window.RTE_exec = (id, cmd) => {
  document.getElementById(id)?.focus();
  document.execCommand(cmd, false, null);
};
// Ambil isi editor sbg HTML utk disimpan. Div/p kosong dari browser (kadang muncul pas
// user Enter berkali2) dirapikan dikit, tapi TIDAK dihapus total krn itu representasi baris
// kosong yg sengaja ditekan user.
function RTE_getHtml(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  const html = el.innerHTML.trim();
  return (html === '<br>' || html === '') ? '' : html;
}
// Konten field notulensi bisa 2 macam: teks polos LAMA (dari sebelum ada rich-text editor
// ini) atau HTML BARU (dari editor). Dibedakan sederhana: kalau ada tag HTML ('<'), anggap
// udah HTML; kalau nggak, itu teks polos lama — escape dulu baru \n diubah jadi <br> biar
// baris barunya tetap kebaca pas ditampilkan di editor/tampilan HTML.
function contentToDisplayHtml(content) {
  if (!content) return '';
  if (content.includes('<')) return content;
  return escHtml(content).replace(/\n/g, '<br>');
}
// Parse HTML notulensi (dari editor RTE, tag terbatas b/i/u/ul/li/br/div) jadi array baris,
// tiap baris array run {text, bold, italic} — dipakai buat gambar PDF per-baris dgn font yg
// beda (Bold/Italic) tanpa kehilangan formatnya, bukan cuma strip semua tag jadi teks polos.
function htmlToPdfLines(html) {
  if (!html) return [];
  const container = document.createElement('div');
  container.innerHTML = html;
  const lines = [];
  let curLine = [];
  function pushLine() { lines.push(curLine); curLine = []; }
  const BLOCK_TAGS = ['div','p','li','ul','ol'];
  function walk(node, bold, italic) {
    if (node.nodeType === 3) { // text node
      const t = node.textContent;
      if (t) curLine.push({ text: t, bold, italic });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    const nb = bold || tag === 'b' || tag === 'strong';
    const ni = italic || tag === 'i' || tag === 'em';
    if (tag === 'br') { pushLine(); return; }
    if (tag === 'li') curLine.push({ text: '•  ', bold: false, italic: false });
    Array.from(node.childNodes).forEach(c => walk(c, nb, ni));
  }
  // Proses tiap ANAK LANGSUNG container satu-satu: kalau dia block-level (div/p/li/ul),
  // tutup dulu baris yg lagi "lepas" (teks/format inline yg ketik SEBELUM Enter pertama,
  // belum kebungkus tag apapun) SEBELUM masuk block itu — baru block-nya sendiri jadi baris
  // baru terpisah lagi setelahnya. Ini yg tadinya kelewat: teks lepas + div pertama nempel
  // jadi 1 baris krn cuma nunggu tag div NUTUP buat pushLine, gak ada pemisah SEBELUM masuk.
  Array.from(container.childNodes).forEach(child => {
    const isBlock = child.nodeType === 1 && BLOCK_TAGS.includes(child.tagName.toLowerCase());
    if (isBlock && curLine.length) pushLine();
    walk(child, false, false);
    if (isBlock) pushLine();
  });
  if (curLine.length) pushLine();
  // Buang baris yg bener2 kosong DI UJUNG doang (baris kosong di TENGAH tetep dipertahankan
  // sbg jarak antar paragraf yg sengaja dibuat user)
  while (lines.length && !lines[lines.length-1].some(r => r.text.trim())) lines.pop();
  return lines;
}

// Peta nama Desa (id -> nama lengkap, mis. "Desa Barat 1") — diambil dari tabel `desa`
// di database (di-cache sekali di App.cache.desa), BUKAN ditulis manual di kode.
// Jadi kalau suatu saat nambah/ubah nama Desa, tinggal ubah lewat Supabase (tabel desa),
// otomatis kepakai di SELURUH aplikasi tanpa perlu ubah kode sama sekali.
async function loadDesaMap() {
  if (!App.cache.desa) App.cache.desa = await SB.desa.getAll();
  return Object.fromEntries((App.cache.desa||[]).map(d => [d.id, d.nama]));
}
// Versi nama singkat (tanpa awalan "Desa ") — buat tempat yang nambahin kata "Desa" sendiri di teksnya
async function loadDesaMapSingkat() {
  const full = await loadDesaMap();
  return Object.fromEntries(Object.entries(full).map(([id,nama]) => [id, nama.replace(/^Desa\s+/i,'')]));
}

// Capitalize setiap awal kata — dipakai untuk nama generus dan nama ortu
function toTitleCase(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
// Tombol bulat WhatsApp — dipakai di Data Pengurus, Kelola Pengguna, dst. Butuh objek dengan .no_hp atau .wa_link
function waBtn(p) {
  const waLink = p.wa_link || (p.no_hp ? 'https://wa.me/62'+p.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'') : '');
  return waLink ? `<a href="${escHtml(waLink)}" target="_blank" style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; background:#25d366; border-radius:50%; flex-shrink:0;" title="WhatsApp">
    <svg viewBox="0 0 24 24" fill="#fff" width="14" height="14"><path d="M17.5 14.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.4.2-.6.1-1.2-.6-2.2-1.3-3-2.3-.8-.9-1.3-2-1.5-3.1 0-.3 0-.5.2-.6l.7-.8c.2-.2.2-.4.1-.7l-1-2.3c-.1-.3-.3-.5-.6-.5h-.8c-.3 0-.7.1-.9.4-.8.8-1.2 1.8-1.1 2.9.2 2 1.2 3.9 2.7 5.4 1.5 1.5 3.4 2.5 5.4 2.7 1.1.1 2.1-.3 2.9-1.1.3-.3.4-.6.4-.9v-.8c0-.3-.2-.5-.3-.5z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.5.8 3.1 1.3 4.8 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 14.8 3.5 13.4 3.5 12 3.5 7.3 7.3 3.5 12 3.5S20.5 7.3 20.5 12 16.7 20 12 20z"/></svg>
  </a>` : '';
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
async function showShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('pendingScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  if (!App.cache.desa) App.cache.desa = await SB.desa.getAll();
  renderNav();
  navigate('dashboard');
  startChatUnreadWatcher();
  startOnlineHeartbeat();
  startAksesRefreshWatcher();
}

// "User Sedang Online" — kirim tanda "masih aktif" tiap 2 menit selama aplikasi terbuka.
// Dashboard nanti anggap user "online" kalau last_active-nya dalam 5 menit terakhir.
function startOnlineHeartbeat() {
  if (App.onlineHeartbeatInterval) clearInterval(App.onlineHeartbeatInterval);
  SB.anggota.pingActive(App.user.id);
  App.onlineHeartbeatInterval = setInterval(() => SB.anggota.pingActive(App.user.id), 120000);
}

// Segarkan data akses user sendiri secara berkala — supaya kalau admin baru saja ubah
// akses_menu/akses_lintas/role, langsung kerasa tanpa perlu logout-login manual.
function startAksesRefreshWatcher() {
  if (App.aksesRefreshInterval) clearInterval(App.aksesRefreshInterval);
  App.aksesRefreshInterval = setInterval(refreshRealUserData, 90000);
}
async function refreshRealUserData() {
  if (!App.realUser?.id) return;
  try {
    const rows = await sbFetch(`anggota?id=eq.${App.realUser.id}&select=*`);
    const fresh = rows?.[0];
    if (!fresh) return;
    const navRelevantChanged = fresh.akses_lintas !== App.realUser.akses_lintas
      || fresh.akses_menu !== App.realUser.akses_menu
      || fresh.role !== App.realUser.role;
    App.realUser = fresh;
    try { localStorage.setItem('kitabah_session', JSON.stringify(fresh)); } catch(e) {}
    // Kalau lagi BUKAN di halaman akses lintas (identitas gak lagi "dipinjam"), App.user ikut disegarkan juga
    if (!(App.currentPage && App.currentPage.includes(':'))) App.user = fresh;
    if (navRelevantChanged && document.getElementById('sidebarNav')) renderNav();
  } catch(e) { /* diamkan, coba lagi interval berikutnya */ }
}

// Badge "ada pesan baru" di menu Live Chat — cek ringan (cuma 1 timestamp, bukan isi pesan),
// jalan tiap 60 detik selama aplikasi terbuka, di halaman manapun. Berhenti saat logout.
function startChatUnreadWatcher() {
  if (App.chatUnreadInterval) clearInterval(App.chatUnreadInterval);
  checkChatUnread();
  App.chatUnreadInterval = setInterval(checkChatUnread, 60000);
}
async function checkChatUnread() {
  try {
    const res = await SB.chat.getLatestTimestamp();
    const latest = res?.[0]?.created_at;
    if (!latest) return;
    const lastSeen = localStorage.getItem('kitabah_chat_lastseen');
    const isUnread = !lastSeen || new Date(latest) > new Date(lastSeen);
    if (isUnread !== App.chatUnread) {
      App.chatUnread = isUnread;
      if (document.getElementById('sidebarNav')) renderNav();
    }
  } catch(e) { /* diam-diam gagal, coba lagi di cek berikutnya */ }
}
function markChatAsRead() {
  localStorage.setItem('kitabah_chat_lastseen', new Date().toISOString());
  if (App.chatUnread) { App.chatUnread = false; renderNav(); }
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
// Catat aktivitas ke activity_log — best-effort, tidak pernah menghentikan alur UI kalau gagal.
function logActivity(action, modul, keterangan) {
  const u = App.user;
  if (!u) return;
  SB.activityLog.insert({
    user_id: u.id,
    nama_lengkap: u.nama_lengkap,
    role: u.role,
    kelompok_id: u.kelompok_id || null,
    action,
    modul,
    keterangan: keterangan || null,
  });
}

/* ===== FORM PUBLIK (link berbagi, tanpa login) ===== */
// Katalog dapukan pengurus — 3 kategori (4S / Unsur PPG / Tim 7) x 3 level (kelompok/desa/daerah).
// Dipakai di menu Data Pengurus (in-app) dan form publik (link share).
const TIM_7 = [
  'Tim Pernikahan & Keluarga Bahagia',
  'Tim Basyiron Wa Nadziron, Kematian & Faroid',
  'Tim Gambuh & Penyelesaian',
  'Tim Pembangunan & Penghimpun Benda SB',
  'Tim Bacaan & Sholat',
  'Tim Aghniya, Haji dan Umroh',
  "Tim Dhu'afa",
];
const EMPAT_S = ['Kyai', 'Wakil Kyai', 'KU', 'Penulis KU', 'Penerobos', 'Mubalegh', 'Aghnia'];
const DAPUKAN_CATALOG = {
  kelompok: {
    '4S': EMPAT_S,
    'Unsur PPG': ['PJP KBM', 'PJP SarPras', 'Wali KBM Caberawit', 'Wali KBM Pra Remaja', 'Wali KBM Remaja', 'Wali KBM Pra Nikah', 'Ketua MM', 'BK', 'MT', 'Guru Generus'],
    'Tim 7': TIM_7,
  },
  desa: {
    '4S': EMPAT_S,
    'Unsur PPG': ['PJP KBM', 'PJP SarPras', 'Ketua MM', 'BK'],
    'Tim 7': TIM_7,
  },
  daerah: {
    '4S': EMPAT_S,
    'Pengurus Harian': ['Ketua PPG', 'Wakil Ketua', 'Sekretaris', 'Bendahara'],
    'Pengurus Bidang': ['Kurikulum', 'Tenaga Pendidik', 'Seni & Olahraga', 'Kemandirian', 'Keputrian', 'KMM Daerah', 'Tahfidz', 'Sarana dan Prasarana', 'Penggalang Dana', 'Bimbingan Konseling'],
    'Tim 7': TIM_7,
  },
};
// Dapukan yang cuma boleh 1 orang per kelompok/desa/daerah — sisanya boleh banyak orang
const DAPUKAN_SOLO = new Set(['Kyai', 'KU']);

function dapukanGroupOf(level, dapukan) {
  const cat = DAPUKAN_CATALOG[level];
  if (!cat) return null;
  for (const [grp, list] of Object.entries(cat)) {
    if (list.includes(dapukan)) return grp;
  }
  return null;
}

const FORM_CONFIGS = {
  santri: {
    judul: 'Form Pendataan Santri Baru',
    fields: [
      { key:'nama', label:'Nama Lengkap', type:'text', required:true },
      { key:'jenis_kel', label:'Jenis Kelamin', type:'select', options:[['L','Laki-laki'],['P','Perempuan']], required:true },
      { key:'tgl_lahir', label:'Tanggal Lahir', type:'date', required:true },
      { key:'nama_ortu', label:'Nama Orang Tua / Wali', type:'text' },
    ],
  },
  mtms: {
    judul: 'Form Pendataan MT/MS Baru',
    fields: [
      { key:'nama_lengkap', label:'Nama Lengkap', type:'text', required:true },
      { key:'gender', label:'Jenis Kelamin', type:'select', options:[['L','Laki-laki'],['P','Perempuan']], required:true },
      { key:'tgl_lahir', label:'Tanggal Lahir', type:'date' },
      { key:'dapukan', label:'Dapukan', type:'select', options:[['MT','MT'],['MS','MS']], required:true },
      { key:'no_hp', label:'No. HP / WhatsApp', type:'text' },
    ],
  },
  pengurus: {
    judul: 'Form Pendataan Pengurus Baru',
    fields: [
      { key:'nama', label:'Nama Lengkap', type:'text', required:true },
      { key:'dapukan', label:'Dapukan', type:'text' },
      { key:'kategori', label:'Kategori', type:'text' },
    ],
  },
  guru_sekolah: {
    judul: 'Form Pendataan Guru Sekolah Baru',
    fields: [
      { key:'nama_lengkap', label:'Nama Lengkap', type:'text', required:true },
      { key:'gender', label:'Jenis Kelamin', type:'select', options:[['L','Laki-laki'],['P','Perempuan']], required:true },
      { key:'tgl_lahir', label:'Tanggal Lahir', type:'date' },
      { key:'status_kepegawaian', label:'Status Kepegawaian', type:'select', options:[['PNS','PNS (Pegawai Negeri Sipil)'],['PPPK','PPPK'],['GTT','GTT (Guru Tidak Tetap)'],['GTY','GTY (Guru Tetap Yayasan)']] },
      { key:'pendidikan_terakhir', label:'Pendidikan Terakhir', type:'select', options:[['SMA/SMK','SMA/SMK'],['D1','D1'],['D2','D2'],['D3','D3'],['D4','D4'],['S1','S1'],['S2','S2'],['S3','S3']] },
      { key:'program_studi', label:'Program Studi', type:'text' },
      { key:'kompetensi_mengajar', label:'Kompetensi Mengajar', type:'checkbox-group', options:['SD','SMP','SMK'] },
      { key:'penugasan_saat_ini', label:'Penugasan Saat Ini', type:'text' },
      { key:'no_wa', label:'No. WhatsApp', type:'text' },
    ],
  },
  jamaah: {
    judul: 'Form Pendataan Jamaah',
    fields: [
      { key:'nama', label:'Nama Lengkap', type:'text', required:true },
      { key:'jenis_kelamin', label:'Jenis Kelamin', type:'select', options:[['L','Laki-laki'],['P','Perempuan']], required:true },
      { key:'tgl_lahir', label:'Tanggal Lahir', type:'date' },
      { key:'status_menikah', label:'Status Pernikahan (kalau usia 19 th ke atas)', type:'select', options:[['belum_menikah','Belum Menikah'],['menikah','Menikah'],['duda','Duda'],['janda','Janda']] },
      { key:'no_hp', label:'No. HP / WhatsApp', type:'tel' },
      { key:'keterangan', label:'Keterangan (nama panggilan anak / ortu dari siapa)', type:'text' },
    ],
  },
};

function formFieldHtml(f) {
  if (f.type === 'select') {
    return `<select id="pf_${f.key}"><option value="">Pilih...</option>${f.options.map(([v,l])=>`<option value="${escHtml(v)}">${escHtml(l)}</option>`).join('')}</select>`;
  }
  if (f.type === 'checkbox-group') {
    return `<div style="display:flex; gap:14px; flex-wrap:wrap; padding:6px 0;">${f.options.map(o=>`
      <label style="display:flex; align-items:center; gap:5px; font-size:13px; font-weight:500;">
        <input type="checkbox" class="pf_cb_${f.key}" value="${o}"> ${o}
      </label>`).join('')}</div>`;
  }
  if (f.type === 'tel') {
    return `<input type="tel" inputmode="numeric" id="pf_${f.key}" placeholder="Contoh: 081234567890" oninput="this.value=this.value.replace(/[^0-9]/g,'')">`;
  }
  if (f.type === 'date') return tanggalLahirDropdownHtml(f.key);
  return `<input type="${f.type}" id="pf_${f.key}">`;
}

// Kotak Tanggal/Bulan/Tahun terpisah — GANTI <input type="date"> yang di HP defaultnya
// selalu nunjuk tahun SEKARANG, gampang kelupaan kegeser pas orang isi tanggal lahir sendiri
// (banyak kejadian: taggal-bulan bener, tapi tahunnya lupa diganti dari tahun sekarang).
function tanggalLahirDropdownHtml(fieldKey, existingValue) {
  const tahunSekarang = new Date().getFullYear();
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const opsiTgl = Array.from({length:31}, (_,i) => i+1);
  let opsiTahun = Array.from({length:100}, (_,i) => tahunSekarang - i); // sampai 100 tahun ke belakang
  let selTgl = '', selBln = '', selThn = '';
  if (existingValue && /^\d{4}-\d{2}-\d{2}$/.test(existingValue)) {
    const [y, m, d] = existingValue.split('-');
    selThn = String(parseInt(y,10)); selBln = String(parseInt(m,10)); selTgl = String(parseInt(d,10));
    if (!opsiTahun.includes(parseInt(y,10))) opsiTahun.push(parseInt(y,10)); // jaga2 data lama di luar 100 th
  }
  return `<div style="display:flex; gap:6px;">
    <select id="pf_${fieldKey}_tgl" style="flex:0.8;"><option value="">Tgl</option>${opsiTgl.map(t=>`<option value="${t}" ${String(t)===selTgl?'selected':''}>${t}</option>`).join('')}</select>
    <select id="pf_${fieldKey}_bln" style="flex:1.6;"><option value="">Bulan</option>${namaBulan.map((b,i)=>`<option value="${i+1}" ${String(i+1)===selBln?'selected':''}>${b}</option>`).join('')}</select>
    <select id="pf_${fieldKey}_thn" style="flex:1;"><option value="">Tahun</option>${opsiTahun.map(t=>`<option value="${t}" ${String(t)===selThn?'selected':''}>${t}</option>`).join('')}</select>
  </div>`;
}
// Gabungkan hasil ke-3 dropdown itu jadi 1 string ISO (YYYY-MM-DD), atau '' kalau ada yg kosong
function bacaTanggalDropdown(fieldKey) {
  const tgl = document.getElementById(`pf_${fieldKey}_tgl`)?.value;
  const bln = document.getElementById(`pf_${fieldKey}_bln`)?.value;
  const thn = document.getElementById(`pf_${fieldKey}_thn`)?.value;
  if (!tgl || !bln || !thn) return '';
  return `${thn}-${String(bln).padStart(2,'0')}-${String(tgl).padStart(2,'0')}`;
}

async function renderPublicForm(jenis, scope) {
  const screen = document.getElementById('publicFormScreen');
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('pendingScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'none';
  screen.style.display = 'flex';
  screen.style.cssText = 'display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; background:var(--cream);';

  const config = FORM_CONFIGS[jenis];
  if (!config) {
    screen.innerHTML = `<div class="login-card"><p style="text-align:center; color:var(--rose);">Link form tidak dikenali.</p></div>`;
    return;
  }
  // Cuma 'pengurus' yang boleh scope desa/daerah — jenis lain (santri/mtms/guru_sekolah) tetap kelompok saja
  if (scope.type !== 'kelompok' && jenis !== 'pengurus') {
    screen.innerHTML = `<div class="login-card"><p style="text-align:center; color:var(--rose);">Link ini tidak valid untuk jenis form ini.</p></div>`;
    return;
  }

  let scopeNama = '';
  try {
    if (scope.type === 'kelompok') {
      const klpList = await SB.kelompok.getAll();
      const klp = klpList.find(k => k.id === scope.id);
      if (!klp) { screen.innerHTML = `<div class="login-card"><p style="text-align:center; color:var(--rose);">Kelompok tidak ditemukan. Pastikan link yang dipakai benar.</p></div>`; return; }
      scopeNama = klp.nama + (klp.desa?.nama ? ' · ' + klp.desa.nama : '');
    } else if (scope.type === 'desa') {
      const DESA_NAMA_MAP = await loadDesaMap();
      scopeNama = DESA_NAMA_MAP[scope.id] || scope.id;
      if (!scopeNama) { screen.innerHTML = `<div class="login-card"><p style="text-align:center; color:var(--rose);">Desa tidak ditemukan.</p></div>`; return; }
    } else {
      scopeNama = 'PPG Sidoarjo Utara';
    }
  } catch(e) {
    screen.innerHTML = `<div class="login-card"><p style="text-align:center; color:var(--rose);">Gagal memuat halaman. Cek koneksi internet lalu coba lagi.</p></div>`;
    return;
  }

  const isPengurus = jenis === 'pengurus';
  const catalog = isPengurus ? (DAPUKAN_CATALOG[scope.type] || {}) : null;

  function renderFormBody() {
    const pengurusFieldsHtml = isPengurus ? `
      <div class="form-group" style="margin-bottom:12px;">
        <label>Kategori Dapukan *</label>
        <select id="pfKategori" onchange="PF_onKategoriChange()">
          <option value="">Pilih kategori...</option>
          ${Object.keys(catalog).map(g => `<option value="${escHtml(g)}">${escHtml(g)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Dapukan *</label>
        <select id="pfDapukan"><option value="">Pilih kategori dulu</option></select>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Tanggal Lahir</label>
        ${tanggalLahirDropdownHtml('tgl_lahir')}
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>No. HP / WhatsApp</label>
        <input type="tel" inputmode="numeric" id="pf_no_hp" placeholder="Contoh: 081234567890" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
      </div>
    ` : config.fields.map(f => `
      <div class="form-group" style="margin-bottom:12px;">
        <label>${escHtml(f.label)}${f.required?' *':''}</label>
        ${formFieldHtml(f)}
      </div>`).join('');

    screen.innerHTML = `
      <div class="login-card" style="max-width:440px;">
        <h1 class="login-title" style="font-size:19px;">${escHtml(config.judul)}</h1>
        <p class="login-subtitle">Untuk: <b>${escHtml(scopeNama)}</b></p>
        <div id="pfAlert"></div>
        <div style="margin-top:16px;">
          ${isPengurus ? `<div class="form-group" style="margin-bottom:12px;"><label>Nama Lengkap *</label><input type="text" id="pf_nama"></div>` : ''}
          ${pengurusFieldsHtml}
        </div>
        <button class="btn-primary" style="width:100%; margin-top:6px;" id="pfSubmitBtn" onclick="PF_submit()">Kirim Data</button>
        <div class="login-hint" style="margin-top:12px;">Data yang dikirim akan diperiksa dulu oleh pengurus terkait sebelum masuk ke sistem.</div>
      </div>`;
  }
  renderFormBody();

  window.PF_isiLagi = () => {
    renderFormBody();
  };

  window.PF_onKategoriChange = () => {
    const grp = document.getElementById('pfKategori').value;
    const sel = document.getElementById('pfDapukan');
    const list = catalog[grp] || [];
    sel.innerHTML = grp
      ? `<option value="">Pilih dapukan...</option>${list.map(d => `<option value="${escHtml(d)}">${escHtml(d)}</option>`).join('')}`
      : `<option value="">Pilih kategori dulu</option>`;
  };

  window.PF_submit = async () => {
    const data = {};
    if (isPengurus) {
      data.nama = document.getElementById('pf_nama')?.value.trim() || '';
      data.kategori = document.getElementById('pfKategori')?.value || '';
      data.dapukan = document.getElementById('pfDapukan')?.value || '';
      data.tgl_lahir = bacaTanggalDropdown('tgl_lahir');
      data.no_hp = document.getElementById('pf_no_hp')?.value.trim() || '';
      if (!data.nama || !data.dapukan) {
        document.getElementById('pfAlert').innerHTML = `<div class="alert alert-danger">Mohon lengkapi Nama dan Dapukan</div>`;
        return;
      }
    } else {
      for (const f of config.fields) {
        if (f.type === 'checkbox-group') {
          data[f.key] = Array.from(document.querySelectorAll(`.pf_cb_${f.key}:checked`)).map(c=>c.value).join(',');
        } else if (f.type === 'date') {
          data[f.key] = bacaTanggalDropdown(f.key);
        } else {
          const el = document.getElementById('pf_' + f.key);
          data[f.key] = el ? el.value.trim() : '';
        }
        if (f.required && !data[f.key]) {
          document.getElementById('pfAlert').innerHTML = `<div class="alert alert-danger">Mohon lengkapi "${escHtml(f.label)}"</div>`;
          return;
        }
      }
    }
    const btn = document.getElementById('pfSubmitBtn');
    btn.disabled = true; btn.textContent = 'Mengirim...';
    try {
      const payload = { jenis, data: JSON.stringify(data), status: 'pending' };
      if (scope.type === 'kelompok') payload.kelompok_id = scope.id;
      else if (scope.type === 'desa') payload.desa_id = scope.id;
      else payload.level_daerah = true;
      await SB.formSubmissions.insert(payload);
      screen.innerHTML = `<div class="login-card" style="max-width:440px; text-align:center;">
        <div style="font-size:40px; margin-bottom:10px;">✅</div>
        <h1 class="login-title" style="font-size:18px;">Data Terkirim</h1>
        <p class="login-subtitle">Terima kasih. Data yang dikirim akan diperiksa oleh pengurus ${escHtml(scopeNama)} sebelum masuk ke sistem.</p>
        <button class="btn-primary" style="width:100%; margin-top:14px;" onclick="PF_isiLagi()">+ Isi Data Baru</button>
      </div>`;
    } catch(e) {
      document.getElementById('pfAlert').innerHTML = `<div class="alert alert-danger">Gagal mengirim: ${escHtml(e.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Kirim Data';
    }
  };
}

/* ===== Komponen bersama: tombol share link + antrian persetujuan (dipakai di 4 menu) ===== */
function shareLinkButtonHtml(jenis, kelompokId) {
  return `<button class="btn btn-outline" onclick="SHARE_openLink('${jenis}','${kelompokId}')">🔗 Bagikan Link Form</button>`;
}

window.SHARE_openLink = (jenis, scope) => {
  let qs;
  if (scope === 'daerah') qs = `level=daerah`;
  else if (String(scope).startsWith('desa_')) qs = `level=desa&desa=${scope.slice(5)}`;
  else qs = `klp=${scope}`; // kelompok_id — perilaku lama, tetap dipakai untuk Santri/MT-MS/Guru Sekolah/Pengurus Kelompok
  const url = `${location.origin}${location.pathname}?isi=${jenis}&${qs}`;
  let el = document.getElementById('shareLinkModal');
  if (!el) { el = document.createElement('div'); el.id = 'shareLinkModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
  el.innerHTML = `<div class="modal">
    <div class="modal-head"><h3 class="modal-title">Bagikan Link Form</h3><button class="modal-close" onclick="closeModal('shareLinkModal')">✕</button></div>
    <div class="modal-body">
      <div style="font-size:12.5px; color:var(--ink-soft); margin-bottom:10px;">Link ini bisa dipakai berkali-kali oleh siapa saja untuk mengisi data sendiri. Data yang masuk akan menunggu persetujuanmu dulu sebelum resmi tersimpan.</div>
      <input id="shareLinkInput" value="${escHtml(url)}" readonly style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:12px; margin-bottom:10px;">
      <div style="display:flex; gap:8px;">
        <button class="btn btn-green" style="flex:1;" onclick="SHARE_copy()">📋 Salin Link</button>
        <a class="btn btn-outline" style="flex:1; text-align:center;" href="https://wa.me/?text=${encodeURIComponent(url)}" target="_blank">Kirim via WA</a>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" onclick="closeModal('shareLinkModal')">Tutup</button></div>
  </div>`;
  openModal('shareLinkModal');
};
window.SHARE_copy = () => {
  const input = document.getElementById('shareLinkInput');
  input.select();
  navigator.clipboard?.writeText(input.value).then(() => showToast('Link disalin ✓')).catch(() => showToast('Gagal menyalin, salin manual', true));
};

// Render bagian "Menunggu Persetujuan" — dipakai di renderSantri, renderMtMs, renderPengurus, renderGuruSekolah.
// approveFn: async (submission) => { ...insert ke tabel asli... } — return true kalau berhasil.
async function renderPendingSection(jenis, scopeType, scopeRef, config, approveFn) {
  const pending = await SB.formSubmissions.getPendingScoped(jenis, scopeType, scopeRef) || [];
  if (!pending.length) return '';

  const rows = pending.map(p => {
    const data = JSON.parse(p.data || '{}');
    const ringkas = config.fields.slice(0,3).map(f => data[f.key]).filter(Boolean).join(' · ');
    return `<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-bottom:1px solid var(--line); flex-wrap:wrap;">
      <div style="flex:1; min-width:160px;">
        <div style="font-weight:700; font-size:13px; color:#111;">${escHtml(data[config.fields[0].key]||'-')}</div>
        <div style="font-size:11px; color:var(--ink-soft);">${escHtml(ringkas)} · dikirim ${fmtDateShort(p.created_at)}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-green btn-sm" onclick="PEND_approve('${p.id}','${jenis}')">Setujui</button>
        <button class="btn btn-danger btn-sm" onclick="PEND_reject('${p.id}')">Tolak</button>
      </div>
    </div>`;
  }).join('');

  window.PEND_approve = async (id, jns) => {
    const sub = pending.find(p => p.id === id);
    if (!sub) return;
    const data = JSON.parse(sub.data || '{}');
    try {
      const ok = await approveFn(data, sub);
      if (ok === false) return; // approveFn sendiri yang urus alur (mis. butuh pilih kelas dulu)
      await SB.formSubmissions.updateStatus(id, { status:'approved', reviewed_at: new Date().toISOString(), reviewed_by: App.user.id });
      logActivity('tambah', 'Persetujuan Data', `Menyetujui data ${jns}: ${data[Object.keys(data)[0]]||''}`);
      showToast('Data disetujui & tersimpan ✓');
      renderPage(App.currentPage);
    } catch(e) { showToast('Gagal: ' + e.message, true); }
  };
  window.PEND_reject = async (id) => {
    if (!confirm('Tolak data ini? Data tidak akan masuk ke sistem.')) return;
    try {
      await SB.formSubmissions.updateStatus(id, { status:'rejected', reviewed_at: new Date().toISOString(), reviewed_by: App.user.id });
      showToast('Data ditolak');
      renderPage(App.currentPage);
    } catch(e) { showToast('Gagal: ' + e.message, true); }
  };

  return `<div class="card" style="margin-bottom:14px; border:1.5px solid #e6a817; padding:0; overflow:hidden;">
    <div style="background:#fff3d6; padding:10px 16px;">
      <div style="font-weight:800; font-size:13.5px; color:#a67c00;">📋 Menunggu Persetujuan (${pending.length})</div>
    </div>
    ${rows}
  </div>`;
}

async function openSantriApprovalModal(data, sub, kelompokId) {
  const kelasList = sortKelas(await SB.kelas.getByKelompok(kelompokId) || []);

  let el = document.getElementById('santriApprovalModal');
  if (!el) { el = document.createElement('div'); el.id = 'santriApprovalModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
  el.innerHTML = `<div class="modal">
    <div class="modal-head"><h3 class="modal-title">Setujui Data Santri</h3><button class="modal-close" onclick="closeModal('santriApprovalModal')">✕</button></div>
    <div class="modal-body">
      <div style="background:var(--green-soft); border-radius:8px; padding:12px; margin-bottom:14px; font-size:12.5px; line-height:1.7;">
        <b>${escHtml(data.nama||'-')}</b><br>
        ${data.jenis_kel==='L'?'Laki-laki':'Perempuan'} · Lahir ${data.tgl_lahir ? fmtDateShort(data.tgl_lahir) : '-'}<br>
        Ortu/Wali: ${escHtml(data.nama_ortu||'-')} ${data.no_hp_ortu ? '('+escHtml(data.no_hp_ortu)+')' : ''}
      </div>
      <div class="form-group">
        <label>Masukkan ke Kelas *</label>
        <select id="sapKelas">
          <option value="">Pilih kelas...</option>
          ${kelasList.map(k => `<option value="${k.id}">${escHtml(k.nama_kelas)} (${escHtml(k.jenjang)})</option>`).join('')}
        </select>
      </div>
      ${!kelasList.length ? '<div style="font-size:12px; color:var(--rose);">Belum ada kelas di kelompok ini. Buat kelas dulu lewat menu Kelola Kelas Generus.</div>' : ''}
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal('santriApprovalModal')">Batal</button>
      <button class="btn btn-green" id="sapSaveBtn">Setujui & Simpan</button>
    </div>
  </div>`;

  document.getElementById('sapSaveBtn').onclick = async () => {
    const kelasId = document.getElementById('sapKelas').value;
    if (!kelasId) { showToast('Pilih kelas dulu', true); return; }
    const btn = document.getElementById('sapSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await SB.santri.insert({
        nama: toTitleCase(data.nama||''), jenis_kel: data.jenis_kel || null,
        tgl_lahir: data.tgl_lahir || null, nama_ortu: data.nama_ortu ? toTitleCase(data.nama_ortu) : null,
        kelas_id: kelasId, aktif: true,
      });
      App.cache.allSantri = null;
      await SB.formSubmissions.updateStatus(sub.id, { status:'approved', reviewed_at: new Date().toISOString(), reviewed_by: App.user.id });
      logActivity('tambah', 'Persetujuan Data', `Menyetujui data santri: ${data.nama}`);
      showToast('Santri disetujui & tersimpan ✓');
      closeModal('santriApprovalModal');
      renderPage(App.currentPage);
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      btn.disabled = false; btn.textContent = 'Setujui & Simpan';
    }
  };

  openModal('santriApprovalModal');
}

/* ===== POP-UP WAJIB LENGKAPI NO. HP (saat login, kalau belum ada) ===== */
function showWajibNoHpModal() {
  let el = document.getElementById('wajibNoHpModal');
  if (!el) { el = document.createElement('div'); el.id = 'wajibNoHpModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
  el.innerHTML = `<div class="modal" style="max-width:420px;">
    <div class="modal-head"><h3 class="modal-title">📱 Lengkapi No. HP</h3></div>
    <div class="modal-body">
      <div style="background:var(--green-soft); border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:12.5px; color:var(--green);">
        Sebelum lanjut, mohon lengkapi nomor HP/WhatsApp kamu — dipakai admin untuk menghubungi kalau diperlukan.
      </div>
      <div class="form-group">
        <label>No. HP / WhatsApp *</label>
        <input type="tel" inputmode="numeric" id="wajibNoHp" placeholder="Contoh: 081234567890" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-green" id="wajibNoHpSaveBtn" style="width:100%;">Simpan & Lanjutkan</button>
    </div>
  </div>`;

  document.getElementById('wajibNoHpSaveBtn').onclick = async () => {
    const hp = document.getElementById('wajibNoHp').value.trim();
    if (!hp || hp.length < 8) { showToast('Masukkan nomor HP yang valid', true); return; }
    const btn = document.getElementById('wajibNoHpSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await SB.anggota.update(App.user.id, { no_hp: hp });
      App.user.no_hp = hp;
      saveSession(App.user);
      closeModal('wajibNoHpModal');
      showShell();
    } catch(e) {
      showToast('Gagal menyimpan: ' + e.message, true);
      btn.disabled = false; btn.textContent = 'Simpan & Lanjutkan';
    }
  };

  openModal('wajibNoHpModal');
}

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
    logActivity('login', 'Login', `${user.nama_lengkap} (${ROLE_LABELS[user.role]||user.role}) login`);
    if (!user.no_hp) showWajibNoHpModal(); else showShell();
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
    { val:'desa_ulil_amri', icon:'👑', label:'Ulil Amri', sub:'Pimpinan desa' },
    { val:'pjp_desa_kbm', icon:'📚', label:'PJP Desa KBM', sub:'Penanggung jawab KBM desa' },
    { val:'pjp_desa_sarpras', icon:'🏗️', label:'PJP Desa Sarpras', sub:'Sarana dan prasarana' },
    { val:'pjp_desa_bk', icon:'🤝', label:'PJP Desa BK', sub:'Bimbingan konseling' },
  ],
  kelompok: [
    { val:'kelompok', icon:'👑', label:'Ulil Amri', sub:'Pimpinan kelompok' },
    { val:'kelompok', icon:'🤝', label:'BK', sub:'Bimbingan Konseling' },
    { val:'pjp_kelompok', icon:'📚', label:'PJP Kelompok KBM', sub:'Penanggung jawab KBM kelompok' },
    { val:'pjp_kelompok', icon:'🏗️', label:'PJP Kelompok Sarpras', sub:'Sarana dan prasarana' },
    { val:'wali_kbm', icon:'🎓', label:'Wali KBM', sub:'Pilih kelas usia yang diampu' },
    { val:'guru', icon:'👨‍🏫', label:'Guru Generus', sub:'Pengajar generus' },
  ],
};

// Role mapping ke database (harus sesuai constraint: admin/daerah/desa/desa_view/pjp_kelompok/wali_kbm/guru/kelompok)
const JABATAN_ROLE = {
  daerah:           'daerah',
  daerah_bidang:    'daerah',
  desa_ulil_amri:   'desa_view', // Ulil Amri Desa — level Desa, read-only (BUG LAMA: gak ada mapping, jatuh ke 'kelompok')
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

  // Selalu bangun ulang bersih — sebelumnya ada logika "skip kalau sudah ada regNama"
  // yang rawan: kalau DOM lama (sebelum ada field baru seperti No. HP) masih nempel,
  // elemen barunya jadi tidak ketemu (null) dan bikin error pas submit.
  const step3 = document.getElementById('wizStep3');
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
    <div class="field">
      <label>No. HP / WhatsApp</label>
      <input type="tel" inputmode="numeric" id="regNoHp" placeholder="Contoh: 081234567890" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
    </div>
    <div style="display:flex; gap:8px; margin-top:4px;">
      <button class="btn-outline" style="flex:1;" onclick="WIZ_back(3)">\u2190 Kembali</button>
      <button class="btn-primary" style="flex:2;" id="regBtn" onclick="doRegister()">Daftar Sekarang</button>
    </div>
    <div class="login-hint" style="margin-top:12px;">Setelah mendaftar, akun perlu disetujui admin sebelum dapat masuk.</div>`;

  // Tampilkan step 1, sembunyikan lainnya
  document.getElementById('wizStep1').style.display = 'block';
  document.getElementById('wizStep2').style.display = 'none';
  document.getElementById('wizStep3').style.display = 'none';
  WIZ_updateProgress(1);
}

async function doRegister() {
  const elNama = document.getElementById('regNama');
  const elUser = document.getElementById('regUser');
  const elPass = document.getElementById('regPass');
  const elNoHp = document.getElementById('regNoHp');
  if (!elNama || !elUser || !elPass || !elNoHp) {
    showToast('Form belum siap, coba muat ulang halaman (F5).', true);
    return;
  }
  const namaLengkap = elNama.value.trim();
  const username = elUser.value.trim();
  const password = elPass.value;
  const noHp = elNoHp.value.trim();
  const alertEl = document.getElementById('wizAlert') || document.getElementById('loginAlert');
  if (alertEl) alertEl.innerHTML = '';

  if (!WIZ_STATE.jabatan) {
    alertEl.innerHTML = '<div class="alert error">Pilih jenis akun terlebih dahulu.</div>'; return;
  }
  if (!namaLengkap || !username || !password || !noHp) {
    alertEl.innerHTML = '<div class="alert error">Semua field wajib diisi.</div>'; return;
  }
  if (noHp.length < 8) {
    alertEl.innerHTML = '<div class="alert error">Masukkan nomor HP yang valid.</div>'; return;
  }
  if (password.length < 6) {
    alertEl.innerHTML = '<div class="alert error">Kata sandi minimal 6 karakter.</div>'; return;
  }

  const btn = document.getElementById('regBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Mendaftarkan...';

  try {
    // Cek username langsung per query — case-insensitive (biar "Budi123" & "budi123"
    // tetap dianggap bentrok), tapi yang TERSIMPAN nanti tetap sesuai huruf asli yg diketik.
    const cek = await sbFetch(`anggota?username=ilike.${encodeURIComponent(username)}&select=id`);
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
      username: username.trim(),
      password_hash: password,
      nama_lengkap: toTitleCase(namaLengkap),
      role,
      status: 'pending',
      kelompok_id: WIZ_STATE.kelompokId || null,
      desa_id: DESA_ID_MAP[WIZ_STATE.desaId] || WIZ_STATE.desaId || null,
      jabatan: jabatanLengkap,
      no_hp: noHp,
    });

    // SB.anggota.register() sudah verifikasi sendiri ke database — kalau sampai di sini
    // tanpa error, datanya memang benar-benar tersimpan.
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
  if (App.user) logActivity('logout', 'Login', `${App.user.nama_lengkap} logout`);
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
function starIcon() { return SVG('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'); }
function alertIcon() { return SVG('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'); }
function clipboardCheckIcon() { return SVG('<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>'); }
function boxIcon() { return SVG('<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'); }
function idCardIcon() { return SVG('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="8" cy="14" r="1.5"/><path d="M14 14h4"/>'); }
function briefcaseIcon() { return SVG('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>'); }
function listIcon() { return SVG('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'); }
function userIcon() { return SVG('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>'); }
function checkIcon() { return SVG('<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>'); }
function chartIcon() { return SVG('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'); }
function cogIcon() { return SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>'); }
function gradCapIcon() { return SVG('<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 1.1 2.7 3 6 3s6-1.9 6-3v-4.5"/><path d="M22 10v6"/>'); }
function logIcon() { return SVG('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>'); }
function raportIcon() { return SVG('<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="14" y2="11"/>'); }
function chatIcon() { return SVG('<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>'); }

const NAV_ITEMS = {
  admin: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum & Materi', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'absensi', icon: calIcon(), label: 'Absensi & Jurnal' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'penilaian', icon: starIcon(), label: 'Penilaian Generus' },
    { id: 'raport_caberawit', icon: raportIcon(), label: 'Raport Caberawit' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'DATA & KELOLA' },
    { id: 'daftar_kelas', icon: listIcon(), label: 'Kelas Tiap Kelompok' },
    { id: 'data_bk', icon: alertIcon(), label: 'Data BK' },
    { id: 'sarpras', icon: boxIcon(), label: 'Data Sarpras' },
    { id: 'mtms', icon: idCardIcon(), label: 'Data MT/MS' },
    { id: 'guru_sekolah', icon: gradCapIcon(), label: 'Data Guru Sekolah' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'data_jamaah', icon: usersIcon(), label: 'Data Jamaah' },
    { id: 'penerobosan', icon: clipboardCheckIcon(), label: 'Penerobosan Pusat' },
    { id: 'rekap_pengajian', icon: clipboardCheckIcon(), label: 'Rekap Absensi Pengajian' },
    { id: 'users', icon: userIcon(), label: 'Kelola Pengguna' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM', section: 'REKAP & LAPORAN' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport' },
    { id: 'rekap_desa', icon: chartIcon(), label: 'Rekap Desa' },
    { id: 'rekap_daerah', icon: chartIcon(), label: 'Rekap Daerah' },
    { id: 'monitor_mus', icon: clipboardCheckIcon(), label: 'Monitoring Musyawarah' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'proker', icon: briefcaseIcon(), label: 'Program Kerja PPG' },
    { id: 'log_aktivitas', icon: logIcon(), label: 'Log Aktivitas', section: 'SISTEM' },
    { id: 'user_tidak_aktif', icon: alertIcon(), label: 'User Tidak Aktif' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  daerah: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard Daerah' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'santri', icon: usersIcon(), label: 'Data Generus', section: 'DATA & KELOLA' },
    { id: 'data_bk', icon: alertIcon(), label: 'Data BK' },
    { id: 'sarpras', icon: boxIcon(), label: 'Data Sarpras' },
    { id: 'mtms', icon: idCardIcon(), label: 'Data MT/MS' },
    { id: 'guru_sekolah', icon: gradCapIcon(), label: 'Data Guru Sekolah' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'data_jamaah', icon: usersIcon(), label: 'Data Jamaah' },
    { id: 'penerobosan', icon: clipboardCheckIcon(), label: 'Penerobosan Pusat' },
    { id: 'rekap_pengajian', icon: clipboardCheckIcon(), label: 'Rekap Absensi Pengajian' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport', section: 'REKAP & LAPORAN' },
    { id: 'rekap_daerah', icon: chartIcon(), label: 'Rekap KBM' },
    { id: 'monitor_mus', icon: clipboardCheckIcon(), label: 'Monitoring Musyawarah' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'proker', icon: briefcaseIcon(), label: 'Program Kerja PPG' },
    { id: 'user_tidak_aktif', icon: alertIcon(), label: 'User Tidak Aktif', section: 'SISTEM' },
  ],
  desa: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard Desa' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'penilaian', icon: starIcon(), label: 'Penilaian Generus' },
    { id: 'santri', icon: usersIcon(), label: 'Data Generus', section: 'DATA & KELOLA' },
    { id: 'data_bk', icon: alertIcon(), label: 'Data BK' },
    { id: 'sarpras', icon: boxIcon(), label: 'Data Sarpras' },
    { id: 'mtms', icon: idCardIcon(), label: 'Data MT/MS' },
    { id: 'guru_sekolah', icon: gradCapIcon(), label: 'Data Guru Sekolah' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'data_jamaah', icon: usersIcon(), label: 'Data Jamaah' },
    { id: 'penerobosan', icon: clipboardCheckIcon(), label: 'Penerobosan Pusat' },
    { id: 'rekap_pengajian', icon: clipboardCheckIcon(), label: 'Rekap Absensi Pengajian' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport', section: 'REKAP & LAPORAN' },
    { id: 'rekap_desa', icon: chartIcon(), label: 'Rekap Kelompok' },
    { id: 'monitor_mus', icon: clipboardCheckIcon(), label: 'Monitoring Musyawarah' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'user_tidak_aktif', icon: alertIcon(), label: 'User Tidak Aktif', section: 'SISTEM' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  // Pengelola Desa (Ulil Amri Desa) — level Desa, TAPI READ-ONLY. Menu-nya SAMA PERSIS
  // kayak 'desa' (PJP Desa) di atas, biar bisa lihat semua yang sama — cuma gak bisa
  // edit apapun (canEdit di tiap halaman terkait sengaja gak nyantumin role ini).
  desa_view: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard Desa' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'penilaian', icon: starIcon(), label: 'Penilaian Generus' },
    { id: 'santri', icon: usersIcon(), label: 'Data Generus', section: 'DATA & KELOLA' },
    { id: 'data_bk', icon: alertIcon(), label: 'Data BK' },
    { id: 'sarpras', icon: boxIcon(), label: 'Data Sarpras' },
    { id: 'mtms', icon: idCardIcon(), label: 'Data MT/MS' },
    { id: 'guru_sekolah', icon: gradCapIcon(), label: 'Data Guru Sekolah' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'data_jamaah', icon: usersIcon(), label: 'Data Jamaah' },
    { id: 'penerobosan', icon: clipboardCheckIcon(), label: 'Penerobosan Pusat' },
    { id: 'rekap_pengajian', icon: clipboardCheckIcon(), label: 'Rekap Absensi Pengajian' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport', section: 'REKAP & LAPORAN' },
    { id: 'rekap_desa', icon: chartIcon(), label: 'Rekap Kelompok' },
    { id: 'monitor_mus', icon: clipboardCheckIcon(), label: 'Monitoring Musyawarah' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  pjp_kelompok: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'absensi', icon: calIcon(), label: 'Absensi & Jurnal' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'penilaian', icon: starIcon(), label: 'Penilaian Generus' },
    { id: 'raport_caberawit', icon: raportIcon(), label: 'Raport Caberawit' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'DATA & KELOLA' },
    { id: 'data_bk', icon: alertIcon(), label: 'Data BK' },
    { id: 'sarpras', icon: boxIcon(), label: 'Data Sarpras' },
    { id: 'mtms', icon: idCardIcon(), label: 'Data MT/MS' },
    { id: 'guru_sekolah', icon: gradCapIcon(), label: 'Data Guru Sekolah' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'data_jamaah', icon: usersIcon(), label: 'Data Jamaah' },
    { id: 'penerobosan', icon: clipboardCheckIcon(), label: 'Penerobosan Pusat' },
    { id: 'absensi_pengajian', icon: clipboardCheckIcon(), label: 'Absensi Pengajian' },
    { id: 'sub_pengajian', icon: usersIcon(), label: 'Nama Sub Pengajian' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM', section: 'REKAP & LAPORAN' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  wali_kbm: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'absensi', icon: calIcon(), label: 'Absensi & Jurnal' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'penilaian', icon: starIcon(), label: 'Penilaian Generus' },
    { id: 'raport_caberawit', icon: raportIcon(), label: 'Raport Caberawit' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'DATA & KELOLA' },
    { id: 'data_bk', icon: alertIcon(), label: 'Data BK' },
    { id: 'sarpras', icon: boxIcon(), label: 'Data Sarpras' },
    { id: 'mtms', icon: idCardIcon(), label: 'Data MT/MS' },
    { id: 'guru_sekolah', icon: gradCapIcon(), label: 'Data Guru Sekolah' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM', section: 'REKAP & LAPORAN' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  guru: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum Kelas Saya', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'absensi', icon: calIcon(), label: 'Input Absensi & Jurnal' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'penilaian', icon: starIcon(), label: 'Penilaian Generus' },
    { id: 'raport_caberawit', icon: raportIcon(), label: 'Raport Caberawit' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'DATA & KELOLA' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport', section: 'REKAP & LAPORAN' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
  kelompok: [
    { id: 'dashboard', icon: gridIcon(), label: 'Dashboard' },
    { id: 'live_chat', icon: chatIcon(), label: 'Live Chat' },
    { id: 'kurikulum', icon: bookIcon(), label: 'Kurikulum', section: 'KONTEN & PEMBELAJARAN' },
    { id: 'kelola_kelas', icon: cogIcon(), label: 'Kelola Kelas Generus' },
    { id: 'santri', icon: usersIcon(), label: 'Data Santri', section: 'DATA & KELOLA' },
    { id: 'data_bk', icon: alertIcon(), label: 'Data BK' },
    { id: 'pengurus', icon: contactIcon(), label: 'Data Pengurus' },
    { id: 'data_jamaah', icon: usersIcon(), label: 'Data Jamaah' },
    { id: 'penerobosan', icon: clipboardCheckIcon(), label: 'Penerobosan Pusat' },
    { id: 'absensi_pengajian', icon: clipboardCheckIcon(), label: 'Absensi Pengajian' },
    { id: 'rekap', icon: chartIcon(), label: 'Rekap KBM', section: 'REKAP & LAPORAN' },
    { id: 'rekap_raport', icon: chartIcon(), label: 'Rekap Raport' },
    { id: 'musyawarah', icon: meetIcon(), label: 'Musyawarah' },
    { id: 'settings', icon: cogIcon(), label: 'Pengaturan' },
  ],
};

// Hitung menu apa saja yang boleh diakses user ini.
// u.akses_menu = null/kosong -> pakai semua menu default role-nya.
// u.akses_menu = "id1,id2,..." -> hanya menu itu (dashboard & settings selalu ikut).
function getAllowedMenuIds(u) {
  const roleItems = NAV_ITEMS[u.role] || NAV_ITEMS.kelompok;
  const roleIds = roleItems.map(i => i.id);
  let allowed;
  if (u.akses_menu !== null && u.akses_menu !== undefined) {
    allowed = new Set(u.akses_menu.split(',').map(s => s.trim()).filter(Boolean));
  } else {
    allowed = new Set(roleIds);
  }
  allowed.add('dashboard');
  allowed.add('profil_saya');
  if (roleIds.includes('settings')) allowed.add('settings');
  // Akses lintas peran: mis. Wali KBM yang juga Pengurus Bidang Sarpras level Daerah.
  // Disimpan sebagai id sintetis "menu:level" atau "menu:desa:desaId", langsung dipakai apa adanya.
  if (u.akses_lintas) {
    u.akses_lintas.split(',').map(s => s.trim()).filter(Boolean).forEach(entry => allowed.add(entry));
  }
  // Menu "User Tidak Aktif" khusus akun admin utama (Budi) — user lain (termasuk role admin/daerah/desa lainnya) tidak perlu ini
  if (u.username !== 'admin') allowed.delete('user_tidak_aktif');
  return allowed;
}

function llMenuOptions(level, selected) {
  const navKey = level === 'kelompok' ? 'pjp_kelompok' : level; // akses lintas kelompok setara PJP Kelompok (edit penuh)
  const items = (NAV_ITEMS[navKey] || []).filter(i => i.id !== 'dashboard' && i.id !== 'settings');
  return items.map(i => `<option value="${i.id}" ${i.id===selected?'selected':''}>${escHtml(i.label)}</option>`).join('');
}

function renderNav() {
  const u = App.realUser || App.user; // SELALU identitas asli, bukan yang lagi "dipinjam" buat halaman aktif
  const roleItems = NAV_ITEMS[u.role] || NAV_ITEMS.kelompok;
  const allowed = getAllowedMenuIds(u);
  const items = roleItems.filter(item => allowed.has(item.id));

  const DESA_NAMA_MAP_NAV = Object.fromEntries((App.cache.desa||[]).map(d => [d.id, (d.nama||'').replace(/^Desa\s+/i,'')]));
  const lintasItems = (u.akses_lintas || '').split(',').map(s => s.trim()).filter(Boolean).map(entry => {
    const [menuId, level, scopeId] = entry.split(':');
    const navKey = level === 'kelompok' ? 'pjp_kelompok' : level;
    const meta = (NAV_ITEMS[navKey] || []).find(i => i.id === menuId);
    if (!meta) return null;
    const levelLabel = level === 'desa' ? `Desa ${DESA_NAMA_MAP_NAV[scopeId] || scopeId || ''}`.trim()
      : level === 'kelompok' ? `Kelompok ${(App.cache.kelompok||[]).find(k=>k.id===scopeId)?.nama || scopeId || ''}`.trim()
      : 'Daerah';
    return { id: entry, icon: meta.icon, label: `${meta.label} (Level ${levelLabel})` };
  }).filter(Boolean);

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
    const badge = (item.id === 'live_chat' && App.chatUnread)
      ? '<span style="width:8px; height:8px; border-radius:50%; background:var(--rose); display:inline-block; margin-left:6px;"></span>' : '';
    html += `<div class="nav-item" data-page="${item.id}" onclick="navigate('${item.id}')">
      ${item.icon} <span>${escHtml(item.label)}</span>${badge}
    </div>`;
  });
  if (lintasItems.length) {
    html += `<div class="nav-section-title">AKSES LINTAS PERAN</div>`;
    lintasItems.forEach(item => {
      html += `<div class="nav-item" data-page="${item.id}" onclick="navigate('${item.id}')">
        ${item.icon} <span>${escHtml(item.label)}</span>
      </div>`;
    });
  }
  document.getElementById('sidebarNav').innerHTML = html;
}

function navigate(page) {
  App.currentPage = page;
  // Catat klik menu (kecuali dashboard, karena itu otomatis kebuka pas login, bukan klik sengaja) —
  // dasar laporan "User Tidak Aktif Mingguan". Ringan, tidak nunggu selesai (fire-and-forget).
  if (page !== 'dashboard' && App.user) SB.navLog.insert(App.user.id);
  // Hentikan polling Live Chat kalau sedang pindah dari halaman itu — supaya tidak jalan terus di background
  if (App.chatInterval) { clearInterval(App.chatInterval); App.chatInterval = null; }
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  // Scroll ke atas — supaya halaman baru selalu mulai dari atas, tidak ikut posisi scroll halaman sebelumnya
  const mainEl = document.getElementById('mainContent');
  if (mainEl) mainEl.scrollTop = 0;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  // Render page
  renderPage(page);
}

/* ===== PAGE ROUTER ===== */
async function renderPage(page) {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // SELALU mulai dari identitas ASLI dulu, baru terapkan "pinjam role" kalau halaman ini
  // memang butuh — supaya pinjaman dari halaman SEBELUMNYA tidak nempel ke halaman baru.
  if (!App.realUser) App.realUser = App.user;
  App.user = App.realUser;

  // Guard: blokir akses ke halaman yang tidak diizinkan untuk user ini,
  // bukan cuma disembunyikan dari sidebar.
  const allowed = getAllowedMenuIds(App.user);
  if (!allowed.has(page)) {
    main.innerHTML = `<div class="card" style="text-align:center; padding:40px;">
      <div style="font-size:32px; margin-bottom:8px;">🔒</div>
      <div class="fw-bold" style="color:var(--rose); margin-bottom:4px;">Akses Ditolak</div>
      <div style="font-size:13px; color:var(--ink-soft);">Kamu tidak punya izin untuk mengakses halaman ini. Hubungi admin jika ini seharusnya bisa diakses.</div>
    </div>`;
    return;
  }

  // Akses lintas peran: id halaman berformat "menu:daerah"/"menu:desa:desaId"/"menu:kelompok:kelompokId".
  // App.user "dipinjamkan" jadi role level tsb SELAMA user masih di halaman ini (termasuk saat
  // klik tombol simpan/edit setelah render awal selesai) — BUKAN cuma pas render pertama, supaya
  // aksi interaktif (bukan cuma lihat data) ikut kepakai identitas pinjaman itu. Baru dikembalikan
  // ke identitas asli otomatis di awal navigate() berikutnya (lihat App.user = App.realUser di atas).
  let baseMenu = page;
  if (page.includes(':')) {
    const [menuId, level, scopeId] = page.split(':');
    baseMenu = menuId;
    App.user = level === 'desa'
      ? { ...App.realUser, role: 'desa', desa_id: scopeId || null }
      : level === 'kelompok'
        ? { ...App.realUser, role: 'pjp_kelompok', kelompok_id: scopeId || null, desa_id: null }
        : { ...App.realUser, role: 'daerah', desa_id: null };
  }

  try {
    switch(baseMenu) {
      case 'dashboard':   await renderDashboard(); break;
      case 'kurikulum':   await renderKurikulum(); break;
      case 'absensi':     await renderAbsensi(); break;
      case 'santri':      await renderSantri(); break;
      case 'kelola_kelas': await renderKelolaKelas(); break;
      case 'daftar_kelas': await renderDaftarKelas(); break;
      case 'users':       await renderUsers(); break;
      case 'settings':    await renderSettings(); break;
      case 'rekap':       await renderRekap(); break;
      case 'penilaian':   await renderPenilaian(); break;
      case 'data_bk':     await renderDataBK(); break;
      case 'monitor_mus': await renderMonitorMus(); break;
      case 'sarpras':     await renderSarpras(); break;
      case 'mtms':        await renderMtMs(); break;
      case 'guru_sekolah': await renderGuruSekolah(); break;
      case 'log_aktivitas': await renderLogAktivitas(); break;
      case 'user_tidak_aktif': await renderUserTidakAktif(); break;
      case 'data_jamaah': await renderDataJamaah(); break;
      case 'penerobosan': await renderPenerobosan(); break;
      case 'rekap_pengajian': await renderRekapPengajian(); break;
      case 'sub_pengajian': await renderSubPengajian(); break;
      case 'absensi_pengajian': await renderAbsensiPengajian(); break;
      case 'raport_caberawit': await renderRaportCaberawit(); break;
      case 'rekap_raport': await renderRekapRaport(); break;
      case 'profil_saya': await renderProfilSaya(); break;
      case 'live_chat': await renderLiveChat(); break;
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
    <div id="onlineUsersWidget"></div>
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

  loadOnlineUsersWidget();
}

// "User Sedang Online" — user yang last_active-nya dalam 5 menit terakhir.
// Dimuat async setelah dashboard tampil, tidak menghalangi render awal.
async function loadOnlineUsersWidget() {
  const el = document.getElementById('onlineUsersWidget');
  if (!el) return;
  try {
    const since = new Date(Date.now() - 5*60*1000).toISOString();
    const online = await SB.anggota.getOnline(since) || [];
    if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
    const DESA_NAMA_MAP = await loadDesaMapSingkat();

    function lokasiOf(u) {
      if (u.kelompok_id) {
        const klp = (App.cache.kelompok||[]).find(k => k.id === u.kelompok_id);
        return klp ? `${klp.nama} · ${klp.desa?.nama || ''}` : u.kelompok_id;
      }
      if (u.desa_id) return 'Desa ' + (DESA_NAMA_MAP[u.desa_id] || u.desa_id);
      if (u.role === 'daerah' || u.role === 'admin') return 'Daerah';
      return '-';
    }

    if (!online.length) {
      el.innerHTML = '';
      return;
    }
    const BATAS_AWAL = 8;
    const chipHtml = p => `
      <div style="display:flex; align-items:center; gap:6px; padding:6px 10px; background:var(--cream-2); border-radius:20px; border:1px solid var(--line);">
        <span style="width:6px; height:6px; border-radius:50%; background:#22c55e; flex-shrink:0;"></span>
        <span style="font-size:12px; font-weight:700; color:#111;">${escHtml(p.nama_lengkap)}</span>
        <span style="font-size:10.5px; color:var(--ink-soft);">${escHtml(ROLE_LABELS[p.role]||p.role)} · ${escHtml(lokasiOf(p))}</span>
      </div>`;
    const awal = online.slice(0, BATAS_AWAL);
    const sisa = online.slice(BATAS_AWAL);
    el.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
          <span style="width:8px; height:8px; border-radius:50%; background:#22c55e; display:inline-block;"></span>
          Sedang Online (${online.length})
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${awal.map(chipHtml).join('')}
        </div>
        ${sisa.length ? `
        <div id="onlineUsersSisa" style="display:none; flex-wrap:wrap; gap:8px; margin-top:8px; max-height:220px; overflow-y:auto;">
          ${sisa.map(chipHtml).join('')}
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="ONLINE_toggleSisa(this)">Lihat ${sisa.length} lainnya ↓</button>
        ` : ''}
      </div>`;
    window.ONLINE_toggleSisa = (btn) => {
      const el2 = document.getElementById('onlineUsersSisa');
      if (!el2) return;
      const buka = el2.style.display === 'none';
      el2.style.display = buka ? 'flex' : 'none';
      btn.textContent = buka ? 'Sembunyikan ↑' : `Lihat ${sisa.length} lainnya ↓`;
    };
  } catch(e) { el.innerHTML = ''; /* diam-diam gagal, jangan ganggu dashboard */ }
}

function getQuickMenuItems() {
  const u = App.user;
  const all = [
    { page: 'kurikulum', emoji: '📖', label: 'Kurikulum', roles: ['admin','kelompok','pjp_kelompok','wali_kbm','guru','desa','desa_view','daerah'] },
    { page: 'absensi', emoji: '📋', label: 'Absensi & Jurnal', roles: ['admin','guru','pjp_kelompok'] },
    { page: 'santri', emoji: '👥', label: 'Data Santri', roles: ['admin','kelompok','pjp_kelompok','desa','desa_view'] },
    { page: 'rekap', emoji: '📊', label: 'Rekap KBM', roles: ['admin','kelompok','pjp_kelompok','wali_kbm'] },
    { page: 'sarpras', emoji: '📦', label: 'Data Sarpras', roles: ['kelompok','pjp_kelompok','desa','desa_view'] },
    { page: 'data_jamaah', emoji: '🕌', label: 'Data Jamaah', roles: ['kelompok','pjp_kelompok','desa','desa_view','daerah','admin'] },
    { page: 'musyawarah', emoji: '💬', label: 'Musyawarah', roles: ['kelompok','pjp_kelompok','guru','desa','desa_view'] },
    { page: 'rekap_desa', emoji: '🏡', label: 'Rekap Desa', roles: ['admin','desa','desa_view'] },
    { page: 'monitor_mus', emoji: '📋', label: 'Monitoring Musyawarah', roles: ['desa','desa_view'] },
    { page: 'rekap_daerah', emoji: '🗺️', label: 'Rekap Daerah', roles: ['admin','daerah'] },
    { page: 'proker', emoji: '💼', label: 'Program Kerja PPG', roles: ['admin','daerah'] },
    { page: 'users', emoji: '⚙️', label: 'Kelola Pengguna', roles: ['admin'] },
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

  // Ambil progress kalau role level kelompok (semua peran: PJP Kelompok, Wali KBM, Guru, Kelompok)
  let progressSet = new Set();
  const KELOMPOK_ROLES = ['kelompok', 'pjp_kelompok', 'wali_kbm', 'guru'];
  if (KELOMPOK_ROLES.includes(App.user.role) && App.user.kelompok_id) {
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
    const isKelompok = KELOMPOK_ROLES.includes(App.user.role);
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
              ${checked ? `<div style="font-size:10.5px; font-weight:700; color:var(--green); margin-top:6px; padding-top:6px; border-top:1px dashed var(--line);">✓ Sudah disampaikan (lihat Absensi &amp; Jurnal)</div>` : ''}
            </div>`;
          }).join('');

          const actionsHtml = isAdmin ? `
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button class="btn-icon" onclick="KUR_edit('${escHtml(item.id)}')" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
              </button>
              <button class="btn-icon danger" onclick="KUR_delete(this.dataset.id, this.dataset.topik)" data-id="${escHtml(item.id)}" data-topik="${escHtml(item.topik || '')}" title="Hapus">
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
        const lines = [];
        String(text || '').split('\n').forEach(para => {
          const words = para.split(' ').filter(Boolean);
          let cur = '';
          if (!words.length) { lines.push(''); return; }
          for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (font.widthOfTextAtSize(test, size) > maxW) {
              if (cur) lines.push(cur);
              cur = w;
            } else cur = test;
          }
          if (cur) lines.push(cur);
        });
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
  // Map kelompok ke desa untuk sorting
  const klpDesaMap = Object.fromEntries(kelompokList.map(k => [k.id, k.desa_id || '']));

  // Sort: Admin dulu → Daerah → lalu per desa_id → kelompok_id → nama
  function groupKey(u) {
    if (u.role === 'admin') return '0_ADMIN';
    if (u.role === 'daerah') return '1_DAERAH';
    const desaId = u.desa_id || klpDesaMap[u.kelompok_id] || 'ZZ';
    return '2_' + desaId;
  }
  function sortUsers(list) {
    return [...list].sort((a, b) => {
      const gA = groupKey(a), gB = groupKey(b);
      if (gA !== gB) return gA.localeCompare(gB);
      const klpA = a.kelompok_id || '';
      const klpB = b.kelompok_id || '';
      if (klpA !== klpB) return klpA.localeCompare(klpB);
      return (a.nama_lengkap||'').localeCompare(b.nama_lengkap||'');
    });
  }

  const pending = sortUsers(allUsers.filter(u => u.status === 'pending'));
  const approvedAll = sortUsers(allUsers.filter(u => u.status === 'approved'));
  const rejectedAll = sortUsers(allUsers.filter(u => u.status === 'rejected'));

  let searchQuery = '';
  function cocokPencarian(u) {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const teks = [
      u.nama_lengkap, u.username, u.jabatan,
      ROLE_LABELS[u.role] || u.role,
      u.kelompok_id ? kelompokMap[u.kelompok_id] : '',
      u.desa_id ? desaMap[u.desa_id] : '',
    ].filter(Boolean).join(' ').toLowerCase();
    return teks.includes(q);
  }

  function badge(status) {
    const map = { pending: 'badge-gold', approved: 'badge-green', rejected: 'badge-rose' };
    const lbl = { pending: 'Menunggu', approved: 'Aktif', rejected: 'Ditolak' };
    return `<span class="badge ${map[status] || 'badge-gray'}">${lbl[status] || status}</span>`;
  }

  function groupLabel(u) {
    if (u.role === 'admin') return '👑 Administrator';
    if (u.role === 'daerah') return '🏛️ Level Daerah';
    const desaId = u.desa_id || klpDesaMap[u.kelompok_id] || '';
    return '🏘️ ' + (desaMap[desaId] || desaId || 'Tanpa Desa/Kelompok');
  }

  function userRows(list) {
    if (!list.length) return '<tr><td colspan="8" style="text-align:center; color:var(--ink-soft); padding:24px;">Tidak ada data</td></tr>';
    let lastGroup = null;
    return list.map(u => {
      const gKey = groupKey(u);
      let separator = '';
      if (gKey !== lastGroup) {
        lastGroup = gKey;
        separator = `<tr><td colspan="8" style="padding:8px 10px; background:var(--green); color:#fff; font-weight:700; font-size:12px;">${escHtml(groupLabel(u))}</td></tr>`;
      }
      return separator + `
      <tr>
        <td>
          <b>${escHtml(u.nama_lengkap)}</b>
          ${u.jabatan ? `<br><span style="font-size:11px; color:var(--green);">${escHtml(u.jabatan)}</span>` : ''}
        </td>
        <td><span style="font-size:12px;">${escHtml(ROLE_LABELS[u.role] || u.role)}</span></td>
        <td style="font-size:12px;">${u.kelompok_id ? escHtml(kelompokMap[u.kelompok_id] || u.kelompok_id) : (u.desa_id ? escHtml(desaMap[u.desa_id] || u.desa_id) : '—')}</td>
        <td style="font-size:11px; font-family:monospace;">
          <div>👤 ${escHtml(u.username)}</div>
        </td>
        <td>${badge(u.status)}</td>
        <td style="font-size:11px; color:var(--ink-soft);">${fmtDateShort(u.created_at)}</td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            ${u.status === 'pending' ? `
              <button class="btn btn-green btn-sm" onclick="USR_approve('${u.id}')">Setujui</button>
              <button class="btn btn-danger btn-sm" onclick="USR_reject('${u.id}')">Tolak</button>` : ''}
            ${u.status !== 'pending' ? waBtn(u) : ''}
            ${u.status !== 'pending' ? `
              <button class="btn-icon" onclick="USR_editData('${u.id}')" title="Edit Data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
              </button>` : ''}
            ${u.status !== 'pending' && u.username !== 'admin' ? `
              <button class="btn-icon" onclick="USR_aturAkses('${u.id}')" title="Atur Akses Fitur">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </button>
              <button class="btn-icon" onclick="USR_resetPassword(this.dataset.id, this.dataset.nama)" data-id="${u.id}" data-nama="${escHtml(u.nama_lengkap)}" title="Reset Password">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="16" r="1"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </button>
              <button class="btn-icon danger" onclick="USR_delete(this.dataset.id, this.dataset.nama)" data-id="${u.id}" data-nama="${escHtml(u.nama_lengkap)}" title="Hapus">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function render() {
    const approved = approvedAll.filter(cocokPencarian);
    const rejected = rejectedAll.filter(cocokPencarian);
    const pendingF = pending.filter(cocokPencarian);

    main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Kelola Pengguna</h1>
        <p class="page-subtitle">${allUsers.length} total · ${pending.length} menunggu persetujuan</p>
      </div>
    </div>
    <div class="card" style="margin-bottom:14px;">
      <div class="form-group" style="margin:0;">
        <label style="font-size:11px;">🔍 Cari Pengguna</label>
        <input type="text" id="usrSearchInput" value="${escHtml(searchQuery)}" oninput="USR_search(this.value)" placeholder="Cari nama, username, dapukan, kelompok, atau desa..." style="width:100%;">
      </div>
    </div>
    ${pendingF.length > 0 ? `
    <div class="card" style="border-left:4px solid var(--gold); background:var(--gold-soft); margin-bottom:6px;">
      <div class="fw-bold color-green" style="margin-bottom:12px;">👥 Menunggu Persetujuan (${pendingF.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama & Dapukan</th><th>Level</th><th>Kelompok / Desa</th><th>Username</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(pendingF)}</tbody>
      </table></div>
    </div>` : ''}
    <div class="card">
      <div class="fw-bold color-green" style="margin-bottom:12px;">✅ Pengguna Aktif (${approved.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama & Dapukan</th><th>Level</th><th>Kelompok / Desa</th><th>Username</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(approved)}</tbody>
      </table></div>
    </div>
    ${rejected.length > 0 ? `
    <div class="card">
      <div class="fw-bold" style="color:var(--rose); margin-bottom:12px;">✕ Ditolak (${rejected.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama & Dapukan</th><th>Level</th><th>Kelompok / Desa</th><th>Username</th><th>Status</th><th>Daftar</th><th>Aksi</th></tr></thead>
        <tbody>${userRows(rejected)}</tbody>
      </table></div>
    </div>` : ''}
    ${searchQuery.trim() && !pendingF.length && !approved.length && !rejected.length ? `<div class="card" style="text-align:center; padding:24px; color:var(--ink-soft); font-size:13px;">Tidak ada pengguna yang cocok dengan "${escHtml(searchQuery)}".</div>` : ''}
  `;
  }

  window.USR_search = (val) => {
    searchQuery = val;
    const cursorPos = document.getElementById('usrSearchInput')?.selectionStart;
    render();
    const newEl = document.getElementById('usrSearchInput');
    if (newEl) { newEl.focus(); if (cursorPos != null) newEl.setSelectionRange(cursorPos, cursorPos); }
  };

  render();

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

  window.USR_editData = (id) => {
    const target = allUsers.find(x => x.id === id);
    if (!target) return;

    let el = document.getElementById('editUserModal');
    if (!el) { el = document.createElement('div'); el.id = 'editUserModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    const ROLE_OPTIONS = ['admin','daerah','desa','desa_view','pjp_kelompok','kelompok','wali_kbm','guru'];
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Edit Data — ${escHtml(target.nama_lengkap)}</h3><button class="modal-close" onclick="closeModal('editUserModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Nama Lengkap</label><input id="eudNama" value="${escHtml(target.nama_lengkap||'')}"></div>
        <div class="form-group"><label>Username</label><input id="eudUsername" value="${escHtml(target.username||'')}"></div>
        <div class="form-group"><label>Dapukan / Jabatan</label><input id="eudJabatan" value="${escHtml(target.jabatan||'')}"></div>
        <div class="form-group"><label>No. HP / WhatsApp</label><input type="tel" inputmode="numeric" id="eudNoHp" value="${escHtml(target.no_hp||'')}" placeholder="Contoh: 081234567890" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
        <div class="form-group">
          <label>Peran / Level</label>
          <select id="eudRole">${ROLE_OPTIONS.map(r => `<option value="${r}" ${r===target.role?'selected':''}>${escHtml(ROLE_LABELS[r]||r)}</option>`).join('')}</select>
          <div style="font-size:11px; color:var(--ink-soft); margin-top:3px;">Hati-hati mengubah ini — menentukan menu & hak akses apa saja yang bisa dilihat/diedit user. Kelompok/Desa yang sudah tersimpan TIDAK ikut berubah, cuma perannya saja.</div>
        </div>
        <div style="font-size:11.5px; color:var(--ink-soft); margin-top:4px;">Ganti username berarti user harus login pakai username baru mulai sekarang. Pastikan sudah diinfokan ke yang bersangkutan.</div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('editUserModal')">Batal</button>
        <button class="btn btn-green" id="eudSaveBtn">Simpan</button>
      </div>
    </div>`;

    document.getElementById('eudSaveBtn').onclick = async () => {
      const nama = document.getElementById('eudNama').value.trim();
      const username = document.getElementById('eudUsername').value.trim();
      const jabatan = document.getElementById('eudJabatan').value.trim();
      const noHp = document.getElementById('eudNoHp').value.trim();
      const role = document.getElementById('eudRole').value;
      if (!nama || !username) { showToast('Nama dan Username wajib diisi', true); return; }

      const btn = document.getElementById('eudSaveBtn');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        await SB.anggota.update(target.id, { nama_lengkap: toTitleCase(nama), username, jabatan: jabatan || null, no_hp: noHp || null, role });
        target.nama_lengkap = toTitleCase(nama); target.username = username; target.jabatan = jabatan || null; target.no_hp = noHp || null; target.role = role;
        logActivity('ubah', 'Kelola Pengguna', `Edit data user: ${target.nama_lengkap}`);
        showToast('Data tersimpan');
        closeModal('editUserModal');
        await renderUsers();
      } catch(e) {
        const msg = e.message?.includes('409') ? 'Username sudah dipakai user lain' : ('Gagal: ' + e.message);
        showToast(msg, true);
      } finally {
        btn.disabled = false; btn.textContent = 'Simpan';
      }
    };

    openModal('editUserModal');
  };

  window.USR_aturAkses = (id) => {
    const target = allUsers.find(x => x.id === id);
    if (target) openAksesModal(target);
  };

  window.USR_resetPassword = (id, nama) => {
    let el = document.getElementById('resetPwModal');
    if (!el) { el = document.createElement('div'); el.id = 'resetPwModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Reset Password — ${escHtml(nama)}</h3><button class="modal-close" onclick="closeModal('resetPwModal')">✕</button></div>
      <div class="modal-body">
        <div style="font-size:12px; color:var(--ink-soft); margin-bottom:10px;">Password baru langsung aktif. Infokan ke user yang bersangkutan.</div>
        <div class="form-group"><label>Password Baru</label><input type="password" id="rpNew" placeholder="minimal 6 karakter"></div>
        <div class="form-group"><label>Konfirmasi Password Baru</label><input type="password" id="rpConfirm"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('resetPwModal')">Batal</button>
        <button class="btn btn-green" id="rpSaveBtn">Simpan</button>
      </div>
    </div>`;

    document.getElementById('rpSaveBtn').onclick = async () => {
      const newPw = document.getElementById('rpNew').value;
      const confirmPw = document.getElementById('rpConfirm').value;
      if (!newPw || newPw.length < 6) { showToast('Password minimal 6 karakter', true); return; }
      if (newPw !== confirmPw) { showToast('Konfirmasi password tidak cocok', true); return; }
      try {
        const newHash = await hashPassword(newPw);
        await SB.anggota.update(id, { password_hash: newHash });
        showToast('Password berhasil di-reset');
        closeModal('resetPwModal');
      } catch(e) { showToast('Gagal: ' + e.message, true); }
    };

    openModal('resetPwModal');
  };

  function openAksesModal(target) {
    const roleItems = (NAV_ITEMS[target.role] || NAV_ITEMS.kelompok).filter(i => i.id !== 'dashboard' && i.id !== 'settings');
    const isDefault = target.akses_menu === null || target.akses_menu === undefined;
    const currentSet = isDefault ? new Set(roleItems.map(i => i.id)) : new Set(target.akses_menu.split(',').map(s=>s.trim()).filter(Boolean));
    let grantedSet = new Set([...currentSet].filter(id => roleItems.some(i => i.id === id)));

    // Desa milik user ini sendiri — akses lintas peran Level Desa dikunci ke desa ini saja,
    // tidak mungkin kasih akses ke desa lain (tidak masuk akal secara organisasi).
    const targetKlp = (App.cache.kelompok||[]).find(k => k.id === target.kelompok_id);
    const targetDesaId = target.desa_id || targetKlp?.desa_id || null;
    const targetDesaNama = desaList.find(d => d.id === targetDesaId)?.nama || targetDesaId;

    function renderAksesBody() {
      const granted = roleItems.filter(i => grantedSet.has(i.id));
      const missing = roleItems.filter(i => !grantedSet.has(i.id));

      const grantedHtml = granted.length ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
        ${granted.map(i => `<span style="display:inline-flex; align-items:center; gap:6px; padding:5px 6px 5px 12px; border-radius:20px; background:var(--green-soft); color:var(--green); font-size:12px; font-weight:600;">
          ${escHtml(i.label)}
          <button type="button" onclick="AK_toggle('${i.id}',false)" title="Cabut akses ini" style="width:18px; height:18px; border-radius:50%; border:none; background:rgba(0,0,0,.08); color:var(--green); font-size:12px; line-height:1; cursor:pointer;">✕</button>
        </span>`).join('')}
      </div>` : `<div style="font-size:12px; color:var(--ink-soft); margin-bottom:12px;">Belum ada menu yang diberikan.</div>`;

      const missingHtml = missing.length ? missing.map(i => `
        <label style="display:flex; align-items:center; gap:8px; padding:7px 4px; border-bottom:1px solid var(--line); font-size:13px; color:#111; cursor:pointer;">
          <input type="checkbox" onchange="AK_toggle('${i.id}', this.checked)"> ${escHtml(i.label)}
        </label>`).join('') : `<div style="font-size:12px; color:var(--ink-soft); padding:8px 4px;">Semua menu sudah diberikan ke user ini. 🎉</div>`;

      const body = document.getElementById('aksesBodyWrap');
      if (!body) return;
      body.innerHTML = `
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin-bottom:6px;">Sudah Punya Akses</div>
        ${grantedHtml}
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin:10px 0 6px;">Belum Punya Akses — klik untuk tambah</div>
        <div style="max-height:220px; overflow-y:auto; border:1px solid var(--line); border-radius:8px; padding:0 8px;">${missingHtml}</div>
      `;
    }

    window.AK_toggle = (id, add) => {
      if (add) grantedSet.add(id); else grantedSet.delete(id);
      renderAksesBody();
    };

    function llRowHtml(row) {
      const level = row.level || (targetDesaId ? 'desa' : 'daerah');
      const desaFieldHtml = targetDesaId
        ? `<span style="display:${level==='desa'?'inline-flex':'none'}; align-items:center; gap:5px; padding:8px 10px; border:1.5px solid var(--line); border-radius:6px; font-size:12.5px; background:var(--cream-2); color:var(--ink-soft);" class="llDesaFixed">
             🏘️ ${escHtml(targetDesaNama)} <input type="hidden" class="llDesa" value="${targetDesaId}">
           </span>`
        : `<select class="llDesa" style="flex:0 0 auto; display:${level==='desa'?'inline-block':'none'};">
             ${desaList.map(d=>`<option value="${d.id}" ${d.id===row.desaId?'selected':''}>${escHtml(d.nama)}</option>`).join('')}
           </select>`;
      const kelompokChoices = targetDesaId
        ? kelompokList.filter(k => k.desa_id === targetDesaId)
        : kelompokList;
      const kelompokFieldHtml = `<span style="display:${level==='kelompok'?'inline-flex':'none'}; flex-direction:column; gap:2px;">
             <select class="llKelompok" style="flex:0 0 auto; min-width:140px;">
               <option value="">Pilih kelompok...</option>
               ${kelompokChoices.slice().sort((a,b)=>(a.nama||'').localeCompare(b.nama||'')).map(k=>`<option value="${k.id}" ${k.id===row.desaId?'selected':''}>${escHtml(k.nama)}</option>`).join('')}
             </select>
             ${targetDesaId ? `<span style="font-size:10px; color:var(--ink-soft);">Cuma kelompok di ${escHtml(targetDesaNama)}</span>` : ''}
           </span>`;
      return `<div class="ll-row" style="display:flex; gap:6px; align-items:center; margin-bottom:6px; flex-wrap:wrap;">
        <select class="llLevel" onchange="LL_onLevelChange(this)" style="flex:0 0 auto;">
          <option value="daerah" ${level==='daerah'?'selected':''}>Level Daerah</option>
          <option value="desa" ${level==='desa'?'selected':''}>Level Desa</option>
          <option value="kelompok" ${level==='kelompok'?'selected':''}>Level Kelompok</option>
        </select>
        ${desaFieldHtml}
        ${kelompokFieldHtml}
        <select class="llMenu" style="flex:1 1 auto; min-width:140px;">${llMenuOptions(level, row.menu)}</select>
        <button type="button" class="btn-icon danger" onclick="this.closest('.ll-row').remove()" title="Hapus baris">✕</button>
      </div>`;
    }

    window.LL_onLevelChange = (sel) => {
      const row = sel.closest('.ll-row');
      const level = sel.value;
      const desaEl = row.querySelector('.llDesa');
      const wrapper = desaEl.tagName === 'INPUT' ? desaEl.closest('.llDesaFixed') : desaEl;
      if (wrapper) wrapper.style.display = level === 'desa' ? (desaEl.tagName === 'INPUT' ? 'inline-flex' : 'inline-block') : 'none';
      const klpEl = row.querySelector('.llKelompok');
      const klpWrapper = klpEl ? klpEl.closest('span') : null;
      if (klpWrapper) klpWrapper.style.display = level === 'kelompok' ? 'inline-flex' : 'none';
      row.querySelector('.llMenu').innerHTML = llMenuOptions(level, null);
    };
    window.LL_addRow = () => {
      document.getElementById('llRows').insertAdjacentHTML('beforeend', llRowHtml({level:'daerah', menu:null, desaId:null}));
    };

    const existingLintas = (target.akses_lintas || '').split(',').map(s=>s.trim()).filter(Boolean).map(entry => {
      const [menu, level, desaId] = entry.split(':');
      return { menu, level, desaId };
    });
    const lintasRowsHtml = existingLintas.map(llRowHtml).join('');

    let el = document.getElementById('aksesModal');
    if (!el) { el = document.createElement('div'); el.id = 'aksesModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Atur Akses — ${escHtml(target.nama_lengkap)}</h3><button class="modal-close" onclick="closeModal('aksesModal')">✕</button></div>
      <div class="modal-body">
        <div style="font-size:12px; color:var(--ink-soft); margin-bottom:10px;">Dashboard & Pengaturan selalu bisa diakses.</div>
        <div id="aksesBodyWrap" style="margin-bottom:16px;"></div>

        <div style="border-top:1px solid var(--line); padding-top:12px;">
          <div class="fw-bold" style="font-size:13px; color:var(--green); margin-bottom:4px;">Akses Lintas Peran (opsional)</div>
          <div style="font-size:12px; color:var(--ink-soft); margin-bottom:10px;">Untuk user yang punya tanggung jawab ganda, misal Wali KBM kelompok yang juga Pengurus Bidang Sarpras level Daerah. Menu tambahan akan muncul terpisah di sidebar dengan label level-nya.</div>
          <div id="llRows">${lintasRowsHtml}</div>
          <button type="button" class="btn btn-outline btn-sm" onclick="LL_addRow()">+ Tambah Akses Lintas Peran</button>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('aksesModal')">Batal</button>
        <button class="btn btn-green" id="aksesSaveBtn">Simpan</button>
      </div>
    </div>`;

    document.getElementById('aksesSaveBtn').onclick = async () => {
      const checked = [...grantedSet];
      const fullDefault = checked.length === roleItems.length;
      const value = fullDefault ? null : checked.join(',');

      const lintasEntries = Array.from(document.querySelectorAll('.ll-row')).map(row => {
        const level = row.querySelector('.llLevel').value;
        const menu = row.querySelector('.llMenu').value;
        if (!menu) return null;
        if (level === 'desa') {
          const desaId = row.querySelector('.llDesa').value;
          return `${menu}:desa:${desaId}`;
        }
        if (level === 'kelompok') {
          const kelompokId = row.querySelector('.llKelompok').value;
          if (!kelompokId) return null; // belum pilih kelompok, jangan disimpan
          return `${menu}:kelompok:${kelompokId}`;
        }
        return `${menu}:daerah`;
      }).filter(Boolean);
      const aksesLintas = lintasEntries.length ? lintasEntries.join(',') : null;

      try {
        await SB.anggota.update(target.id, { akses_menu: value, akses_lintas: aksesLintas });
        target.akses_menu = value;
        target.akses_lintas = aksesLintas;
        showToast('Akses tersimpan');
        closeModal('aksesModal');
      } catch(e) { showToast('Gagal: ' + e.message, true); }
    };

    renderAksesBody();
    openModal('aksesModal');
  }
}

/* ===== PAGE: SANTRI ===== */
async function renderSantri() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin' || u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const isKelompok = u.role === 'kelompok' || u.role === 'pjp_kelompok' || u.role === 'guru';

  // Load data master kelompok
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

  // ── Tampilkan dashboard dulu ──
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div><div style="margin-top:12px; color:var(--ink-soft); font-size:13px;">Memuat data generus...</div></div>';

  // Load semua santri sekaligus
  const allSantri = App.cache.allSantri || (App.cache.allSantri = await SB.santri.getAll());

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
    // Santri yang sudah masuk kelas: pakai kelompok dari kelasnya.
    // Santri yang belum masuk kelas (kelas_id null): pakai kelompok_asal_id sebagai fallback,
    // supaya tetap kehitung di Data Generus, bukan cuma muncul di Kelola Kelas Generus.
    const kid = s.kelas?.kelompok_id || s.kelompok_asal_id;
    return kelompokIds.has(kid);
  });

  // Hitung statistik per tingkatan per kelompok
  const TINGKATAN_LIST = ['caberawit','pra_remaja','remaja','pra_nikah'];

  function hitungStats(santriArr) {
    const s = {};
    TINGKATAN_LIST.forEach(t => { s[t] = {L:0, P:0}; });
    s.total = {L:0, P:0};
    santriArr.forEach(x => {
      const t = tingkatanDariKelas(x.kelas?.nama_kelas) || (x.tingkatan_override ? x.tingkatan : hitungTingkatan(x.tgl_lahir));
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
        const kid = s.kelas?.kelompok_id || s.kelompok_asal_id;
        const k = klpList.find(k => k.id === kid);
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
        const santriKlp = santriFiltered.filter(s => (s.kelas?.kelompok_id || s.kelompok_asal_id) === k.id);
        const statsKlp = hitungStats(santriKlp);
        tabelBody += statRow(k.nama, statsKlp, false, true);
      });
    });
  } else if (isDesa) {
    // Desa: total desa + per kelompok
    tabelBody += statRow('TOTAL ' + (u.desa_nama || 'DESA SAYA'), statsTotal, true);
    Object.entries(desaMap).forEach(([desaNama, klpList]) => {
      klpList.forEach(k => {
        const santriKlp = santriFiltered.filter(s => (s.kelas?.kelompok_id || s.kelompok_asal_id) === k.id);
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

  const pendingHtmlSantri = u.role === 'pjp_kelompok' && u.kelompok_id
    ? await renderPendingSection('santri', 'kelompok', u.kelompok_id, FORM_CONFIGS.santri, async (data, sub) => {
        openSantriApprovalModal(data, sub, u.kelompok_id);
        return false; // modal yang urus insert + update status sendiri
      })
    : '';

  // ── Render awal: dashboard saja, form ada di bawah ──
  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Data Santri / Generus</h1>
      ${u.role === 'pjp_kelompok' && u.kelompok_id ? shareLinkButtonHtml('santri', u.kelompok_id) : ''}
    </div>
    ${pendingHtmlSantri}
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
  const isDesaForm = u.role === 'desa' || u.role === 'desa_view';
  const showPicker = isAdminForm || isDesaForm;
  const canEdit = isAdminForm || u.role === 'pjp_kelompok' || u.role === 'guru';

  let selectedKelompokId = u.kelompok_id || null;
  let kelasGabunganDesa = [];
  let kelasOptions = [];
  let selectedKelasId = null;
  let santriList = [];

  // Load kelas gabungan desa
  async function loadKelasGabungan() {
    const desaId = isDesaForm ? u.desa_id : null;
    if (desaId) {
      kelasGabunganDesa = sortKelas(await SB.kelas.getByDesa(desaId) || []);
      kelasGabunganDesa.forEach(g => { g._isGabungan = true; });
    }
  }

  async function loadKelas(kelompokId) {
    selectedKelompokId = kelompokId;
    selectedKelasId = null;
    santriList = [];
    await loadUnassignedManage();
    if (kelompokId) {
      let kelas = sortKelas(await SB.kelas.getByKelompok(kelompokId));
      // Load kelas gabungan desa
      const klp = (App.cache.kelompok||[]).find(k => k.id === kelompokId);
      const desaId = klp?.desa_id || u.desa_id;
      if (desaId) {
        const gabungan = await SB.kelas.getByDesa(desaId) || [];
        gabungan.forEach(g => { g._isGabungan = true; });
        kelas = [...kelas, ...sortKelas(gabungan)];
      }
      kelasOptions = kelas;
      if (kelasOptions.length) await loadSantri(kelasOptions[0].id);
      else render();
    } else if (isDesaForm && u.desa_id) {
      // Desa user tanpa kelompok dipilih — tampilkan kelas gabungan desa saja
      await loadKelasGabungan();
      kelasOptions = [...kelasGabunganDesa];
      if (kelasOptions.length) await loadSantri(kelasOptions[0].id);
      else render();
    } else {
      kelasOptions = [];
      render();
    }
  }

  // ── Unassigned checklist untuk kelas biasa ──
  let unassignedChecklistHtml = '';

  async function loadUnassignedChecklist() {
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    if (!kls || kls.desa_id || !selectedKelompokId) { unassignedChecklistHtml = ''; return; }

    // Map nama kelas ke tingkatan
    const nmUpper = (kls.nama_kelas||'').toUpperCase();
    let targetTingkatan = null;
    if (nmUpper.startsWith('CABERAWIT')) targetTingkatan = 'caberawit';
    else if (nmUpper.startsWith('PRA REMAJA')) targetTingkatan = 'pra_remaja';
    else if (nmUpper.startsWith('REMAJA')) targetTingkatan = 'remaja';
    else if (nmUpper.startsWith('PRA NIKAH')) targetTingkatan = 'pra_nikah';

    // Cuma santri yang BENAR-BENAR belum punya kelas sama sekali (kelas_id null).
    // Santri yang sudah di kelas lain TIDAK ikut muncul di sini — untuk memindahkan
    // santri antar kelas, pakai tombol "Pindah Kelas" di baris santri kelas asalnya.
    const unassignedPool = await SB.santri.getUnassigned(selectedKelompokId) || [];
    const allSantriKlp = unassignedPool.map(s => ({...s, _fromKelas: 'Belum masuk kelas', _fromKelasId: null}));

    // Filter by tingkatan dan belum di kelas ini
    const currentSantriIds = new Set(santriList.map(s => s.id));
    const unassignedAll = allSantriKlp.filter(s => !currentSantriIds.has(s.id));
    let unassigned = unassignedAll;
    if (targetTingkatan) {
      unassigned = unassignedAll.filter(s => {
        const t = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
        return t === targetTingkatan;
      });
    }

    if (!unassigned.length && !unassignedAll.length) { unassignedChecklistHtml = ''; return; }
    if (!unassigned.length && unassignedAll.length) {
      unassignedChecklistHtml = `
        <div class="card" style="margin-top:12px; border:1.5px solid var(--gold);">
          <div style="font-size:13px; color:var(--ink-soft); padding:8px 0;">Semua generus usia ${TINGKATAN_LABELS[targetTingkatan]||''} sudah masuk kelas.</div>
          <button class="btn btn-outline btn-sm" style="font-size:11px;" onclick="STR_showAllUsia()">Tampilkan Semua Usia (${unassignedAll.length})</button>
        </div>`;
      return;
    }

    unassigned.sort((a,b) => (a.nama||'').localeCompare(b.nama||''));
    unassignedChecklistHtml = `
      <div class="card" style="margin-top:12px; border:1.5px solid var(--gold);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
          <div class="fw-bold" style="color:var(--gold); font-size:14px;">\ud83d\udccb Generus ${targetTingkatan ? 'Usia ' + (TINGKATAN_LABELS[targetTingkatan]||'') + ' ' : ''}Belum di Kelas Ini</div>
          ${unassignedAll.length > unassigned.length ? `<button class="btn btn-outline btn-sm" style="font-size:11px;" onclick="STR_showAllUsia()">Semua Usia (${unassignedAll.length})</button>` : ''}
        </div>
        <div style="font-size:12px; color:var(--ink-soft); margin-bottom:10px;">Centang untuk memindahkan ke kelas <b>${escHtml(kls.nama_kelas||'')}</b></div>
        ${unassigned.map(s => `
          <div style="display:flex; align-items:center; gap:10px; padding:7px 10px; border-bottom:1px solid var(--line); cursor:pointer;"
            onclick="STR_assignToKelas('${s.id}')">
            <div style="width:22px; height:22px; border-radius:6px; flex-shrink:0; border:2px solid var(--line); background:transparent; display:flex; align-items:center; justify-content:center;"></div>
            <div style="flex:1;">
              <div style="font-weight:700; font-size:13px; color:#111;">${escHtml(s.nama)}</div>
              <div style="font-size:11px; color:var(--ink-soft);">
                ${s.jenis_kel||'\u2014'} \u00b7 ${s.tgl_lahir ? hitungUsia(s.tgl_lahir)+' thn' : '\u2014'} \u00b7 dari ${escHtml(s._fromKelas||'\u2014')}
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }


  async function loadSantri(kelasId) {
    selectedKelasId = kelasId;
    santriList = await SB.santri.getByKelas(kelasId);
    await loadUnassignedManage();
    const selectedKelasObj = kelasOptions.find(k => k.id === kelasId);
    if (selectedKelasObj?.desa_id && selectedKelompokId) {
      await loadSantriChecklist();
    }
    if (!selectedKelasObj?.desa_id && selectedKelompokId && canEdit) {
      await loadUnassignedChecklist();
    }
    render();
  }

  function kelasLabel(k) {
    const nama = k.nama_kelas ? k.nama_kelas + ' — ' : '';
    const gabungan = k.desa_id ? ' 🏘️ Gabungan' : '';
    return `${nama}${escHtml(k.jenjang)} Sem ${k.semester}${gabungan}`;
  }

  function render() {
    const kelompokList = App.cache.kelompok || [];

    const kelasOptsHtml = kelasOptions.map(k =>
      `<option value="${k.id}" ${k.id === selectedKelasId ? 'selected' : ''}>${kelasLabel(k)}</option>`
    ).join('');

    const selectedKelas = kelasOptions.find(k => k.id === selectedKelasId);
    const selectedKelasObj = selectedKelas;

    const tableHtml = santriList.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Nama Lengkap</th><th>Tgl Lahir</th><th>Usia</th><th>Tingkatan</th><th>L/P</th><th>Nama Ortu</th><th>No. HP</th><th>Tahun Depan</th><th>Aksi</th></tr></thead>
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
            <td>${s.no_hp ? `<a href="https://wa.me/62${s.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'')}" target="_blank" style="color:#25D366; font-weight:600; text-decoration:none;">📱 ${escHtml(s.no_hp)}</a>` : '—'}</td>
            <td>${naikLevel ? `<span class="badge badge-gold">${escHtml(naikLevel)}</span>` : '—'}</td>
            <td>
              <div style="display:flex; gap:4px;">
                <button class="btn-icon" onclick="STR_edit('${s.id}')" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
                </button>
                <button class="btn-icon" onclick="STR_pindahKelas(this.dataset.id, this.dataset.nama)" data-id="${s.id}" data-nama="${escHtml(s.nama)}" title="Pindah ke Kelas Lain">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M7 16l-4-4m0 0l4-4m-4 4h18"/></svg>
                </button>
                <button class="btn-icon danger" onclick="STR_delete(this.dataset.id, this.dataset.nama)" data-id="${s.id}" data-nama="${escHtml(s.nama)}" title="Keluarkan dari kelas (jadi belum masuk kelas, data tetap ada)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
                <button class="btn-icon danger" onclick="STR_hapusPermanen(this.dataset.id, this.dataset.nama)" data-id="${s.id}" data-nama="${escHtml(s.nama)}" title="Hapus Permanen (data generus dihapus total, tidak bisa dikembalikan)" style="background:#fbe4e4;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
          ${showPicker ? `
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
          <div style="flex:2; min-width:180px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelompok</label>
            <select id="strKelompokSel" onchange="STR_loadKelompok(this.value)"
              style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih kelompok...</option>
              ${(isDesaForm
                ? (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id)
                : (App.cache.kelompok||[])
              ).map(k =>
                `<option value="${k.id}" data-desa="${escHtml(k.desa?.nama||k.desa_id)}" ${k.id===selectedKelompokId?'selected':''}>
                  ${escHtml(k.nama)}${isAdminForm ? ' · '+escHtml(k.desa?.nama||k.desa_id) : ''}
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
        ${(selectedKelompokId || !showPicker || isDesaForm) ? `
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px solid var(--line);">
          ${selectedKelompokId ? `<button class="btn btn-gold btn-sm" style="min-width:130px;" onclick="STR_addKelas()">+ Kelas</button>` : ''}
          ${u.role === 'desa' || isAdminForm
            ? `<button class="btn btn-outline btn-sm" style="border-color:var(--green); min-width:130px;" onclick="STR_addKelasGabungan()">+ Kelas Gabungan</button>`
            : `<button class="btn btn-outline btn-sm" style="min-width:130px; opacity:.5; cursor:not-allowed; border-color:var(--line); color:var(--ink-soft);" onclick="showToast('Menu ini khusus PJP Desa. Kalau memang perlu, minta admin tambahkan Akses Lintas Peran (Level Desa) untuk Kelola Kelas Generus di akunmu.', true)" title="Khusus PJP Desa">+ Kelas Gabungan</button>`}
          ${selectedKelasId && !selectedKelasObj?.desa_id ? `
          <button class="btn btn-green btn-sm" style="min-width:130px;" onclick="STR_addSantri()">+ Tambah Santri</button>
          <button class="btn btn-outline btn-sm" style="min-width:130px;" onclick="STR_editKelas()">✏️ Edit Kelas</button>
          <button class="btn btn-outline btn-sm" style="min-width:130px; border-color:var(--rose); color:var(--rose);" onclick="STR_deleteKelas()">🗑️ Hapus Kelas</button>
          <button class="btn btn-outline btn-sm" style="min-width:130px; justify-content:center;" onclick="STR_uploadExcel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Excel
          </button>
          <button class="btn btn-outline btn-sm" style="min-width:130px; justify-content:center;" onclick="STR_downloadDataKelas()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Data
          </button>` : ''}
          <button class="btn btn-outline btn-sm" style="min-width:130px; justify-content:center;" onclick="STR_downloadTemplate()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Template Excel
          </button>
        </div>` : ''}
      </div>

      ${selectedKelasId ? (selectedKelasObj?.desa_id ? gabunganChecklistHtml : `
        ${tableHtml}
        ${canEdit && selectedKelompokId ? unassignedChecklistHtml : ''}
      `) : '<div class="card"><p class="color-soft">Pilih kelompok dan kelas untuk melihat atau mengelola data santri.</p></div>'}

      ${canEdit && selectedKelompokId ? unassignedManageHtml : ''}
    `;
  }

  // ── Daftar tetap "Generus Belum Masuk Kelas" (beda dari checklist tambah-ke-kelas
  //    di atas) — supaya generus yang dikeluarkan dari kelas tetap kelihatan & bisa
  //    dikelola (edit/pindah/hapus), bukan cuma numpang lewat di modal tambah santri.
  let unassignedManageHtml = '';
  let unassignedManageList = [];
  async function loadUnassignedManage() {
    if (!selectedKelompokId) { unassignedManageHtml = ''; return; }
    unassignedManageList = (await SB.santri.getUnassigned(selectedKelompokId) || [])
      .sort((a,b) => (a.nama||'').localeCompare(b.nama||''));
    if (!unassignedManageList.length) { unassignedManageHtml = ''; return; }
    unassignedManageHtml = `
      <div class="card" style="margin-top:16px; border:1.5px solid var(--gold);">
        <div class="fw-bold" style="font-size:13.5px; color:#8a6a24; margin-bottom:8px;">🗂️ Generus Belum Masuk Kelas (${unassignedManageList.length})</div>
        <div style="font-size:11.5px; color:var(--ink-soft); margin-bottom:10px;">Generus yang belum/sudah tidak berada di kelas manapun. Tetap tersimpan datanya — pindahkan ke kelas atau hapus dari sini kalau memang perlu.</div>
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Nama Lengkap</th><th>Tgl Lahir</th><th>Usia</th><th>Tingkatan</th><th>L/P</th><th>No. HP</th><th>Aksi</th></tr></thead>
          <tbody>${unassignedManageList.map((s,i) => {
            const tingkatan = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
            const usia = hitungUsia(s.tgl_lahir);
            window['_strData_' + s.id] = s;
            return `<tr>
              <td>${i+1}</td>
              <td><b>${escHtml(s.nama)}</b></td>
              <td>${s.tgl_lahir ? fmtDateShort(s.tgl_lahir) : '—'}</td>
              <td>${usia !== null ? usia + ' th' : '—'}</td>
              <td>${tingkatan ? `<span class="badge ${TINGKATAN_COLORS[tingkatan]||'badge-gray'}">${escHtml(TINGKATAN_LABELS[tingkatan]||tingkatan)}</span>` : '—'}</td>
              <td><span class="badge ${s.jenis_kel==='L'?'badge-green':'badge-rose'}">${s.jenis_kel||'—'}</span></td>
              <td>${s.no_hp ? `<a href="https://wa.me/62${s.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'')}" target="_blank" style="color:#25D366; font-weight:600; text-decoration:none;">📱 ${escHtml(s.no_hp)}</a>` : '—'}</td>
              <td>
                <div style="display:flex; gap:4px;">
                  <button class="btn-icon" onclick="STR_edit('${s.id}')" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>
                  </button>
                  <button class="btn-icon" onclick="STR_pindahKelas(this.dataset.id, this.dataset.nama)" data-id="${s.id}" data-nama="${escHtml(s.nama)}" title="Masukkan ke Kelas">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M7 16l-4-4m0 0l4-4m-4 4h18"/></svg>
                  </button>
                  <button class="btn-icon danger" onclick="STR_hapusPermanen(this.dataset.id, this.dataset.nama)" data-id="${s.id}" data-nama="${escHtml(s.nama)}" title="Hapus Permanen" style="background:#fbe4e4;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
  }

  // ── Render checklist gabungan ──
  let gabunganChecklistHtml = '';
  let allSantriKelompok = [];

  async function loadSantriChecklist() {
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    if (!kls?.desa_id || !selectedKelompokId) {
      gabunganChecklistHtml = '<div style="padding:12px; color:var(--ink-soft); font-size:13px;">Pilih kelompok terlebih dahulu untuk mendaftarkan santri ke kelas gabungan ini.</div>';
      return;
    }

    // Map jenjang ke tingkatan
    const jenjangToTingkatan = {
      'SD 1':'caberawit','SD 2':'caberawit','SD 3':'caberawit','SD 4':'caberawit','SD 5':'caberawit','SD 6':'caberawit',
      'SMP 1':'pra_remaja','SMP 2':'pra_remaja','SMP 3':'pra_remaja',
      'SMA 1':'remaja','SMA 2':'remaja','SMA 3':'remaja',
      'PRA 1':'pra_nikah','PRA 2':'pra_nikah',
      'PAUD TK':'caberawit',
    };
    const targetTingkatan = jenjangToTingkatan[kls.jenjang] || null;

    // Load semua santri dari kelompok ini (dari semua kelas)
    const allKelasKlp = await SB.kelas.getByKelompok(selectedKelompokId);
    let santriPool = [];
    for (const k of allKelasKlp) {
      const s = await SB.santri.getByKelas(k.id);
      santriPool = [...santriPool, ...s.map(x => ({...x, _fromKelas: k.nama_kelas || k.jenjang}))];
    }

    // Juga cek santri yang sudah di kelas gabungan lain tapi dari kelompok ini
    const santriGabungan = santriList.filter(s => s.kelompok_asal_id === selectedKelompokId);
    // Merge — tambah santri gabungan yang belum ada di pool
    santriGabungan.forEach(sg => {
      if (!santriPool.find(sp => sp.id === sg.id)) {
        santriPool.push({...sg, _fromKelas: 'Gabungan'});
      }
    });

    // Filter by tingkatan jika bisa
    if (targetTingkatan) {
      santriPool = santriPool.filter(s => {
        const t = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
        return t === targetTingkatan;
      });
    }

    allSantriKelompok = santriPool.sort((a,b) => (a.nama||'').localeCompare(b.nama||''));

    // Cek mana yang sudah terdaftar di kelas gabungan ini
    const sudahDaftar = new Set(santriList.filter(s => s.kelompok_asal_id === selectedKelompokId).map(s => s.id));

    const klpNama = (App.cache.kelompok||[]).find(k => k.id === selectedKelompokId)?.nama || selectedKelompokId;

    if (!allSantriKelompok.length) {
      gabunganChecklistHtml = `<div style="padding:14px; text-align:center; color:var(--ink-soft); font-size:13px;">
        Belum ada santri dari ${escHtml(klpNama)} dengan usia ${TINGKATAN_LABELS[targetTingkatan]||'sesuai'}.<br>
        Tambahkan santri dulu di kelas kelompok Anda.
      </div>`;
      return;
    }

    gabunganChecklistHtml = `
      <div style="margin-bottom:10px;">
        <div class="fw-bold color-green" style="font-size:14px; margin-bottom:4px;">✅ Daftarkan Santri dari ${escHtml(klpNama)}</div>
        <div style="font-size:12px; color:var(--ink-soft);">Centang santri yang mengikuti kelas gabungan ini. ${targetTingkatan ? 'Menampilkan santri usia '+TINGKATAN_LABELS[targetTingkatan]+'.' : ''}</div>
      </div>
      ${allSantriKelompok.map(s => {
        const checked = sudahDaftar.has(s.id);
        return `<div style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-bottom:1px solid var(--line); cursor:pointer; background:${checked?'var(--green-soft)':''};"
          onclick="STR_toggleGabungan('${s.id}', ${checked?'false':'true'})">
          <div style="width:22px; height:22px; border-radius:6px; flex-shrink:0;
            border:2px solid ${checked?'var(--green)':'var(--line)'};
            background:${checked?'var(--green)':'transparent'};
            display:flex; align-items:center; justify-content:center;">
            ${checked ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
          </div>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:13px; color:#111;">${escHtml(s.nama)}</div>
            <div style="font-size:11px; color:var(--ink-soft);">
              ${s.jenis_kel||'—'} · ${s.tgl_lahir ? hitungUsia(s.tgl_lahir)+' thn' : '—'}
              ${s._fromKelas ? ' · dari kelas '+escHtml(s._fromKelas) : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
      <div style="margin-top:8px; font-size:12px; color:var(--ink-soft);">
        ${sudahDaftar.size} dari ${allSantriKelompok.length} santri terdaftar di kelas ini.
      </div>`;
  }


  window.STR_assignToKelas = async (santriId) => {
    try {
      await SB.santri.update(santriId, { kelas_id: selectedKelasId });
      showToast('Santri dipindahkan ke kelas ini');
      await loadSantri(selectedKelasId);
    } catch(e) { showToast('Gagal: '+e.message, true); }
  };

  window.STR_showAllUsia = async () => {
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    if (!kls || !selectedKelompokId) return;
    const unassignedPool = await SB.santri.getUnassigned(selectedKelompokId) || [];
    const currentIds = new Set(santriList.map(s => s.id));
    const all = unassignedPool.filter(s => !currentIds.has(s.id)).sort((a,b) => (a.nama||'').localeCompare(b.nama||''));
    if (!all.length) { showToast('Tidak ada generus lain yang belum masuk kelas'); return; }
    unassignedChecklistHtml = `
      <div class="card" style="margin-top:12px; border:1.5px solid var(--gold);">
        <div class="fw-bold" style="color:var(--gold); font-size:14px; margin-bottom:6px;">📋 Semua Generus Belum di Kelas Ini</div>
        <div style="font-size:12px; color:var(--ink-soft); margin-bottom:10px;">Centang untuk memindahkan ke kelas <b>${escHtml(kls.nama_kelas||'')}</b></div>
        ${all.map(s => {
          const t = s.tingkatan_override ? s.tingkatan : hitungTingkatan(s.tgl_lahir);
          return `<div style="display:flex; align-items:center; gap:10px; padding:7px 10px; border-bottom:1px solid var(--line); cursor:pointer;"
            onclick="STR_assignToKelas('${s.id}')">
            <div style="width:22px; height:22px; border-radius:6px; flex-shrink:0; border:2px solid var(--line); background:transparent;"></div>
            <div style="flex:1;">
              <div style="font-weight:700; font-size:13px; color:#111;">${escHtml(s.nama)}</div>
              <div style="font-size:11px; color:var(--ink-soft);">
                ${s.jenis_kel||'—'} · ${s.tgl_lahir ? hitungUsia(s.tgl_lahir)+' thn' : '—'} · ${TINGKATAN_LABELS[t]||t||'—'}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    render();
  };

  // Handler toggle gabungan
  window.STR_toggleGabungan = async (santriId, add) => {
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    if (!kls) return;
    try {
      if (add) {
        await SB.santri.update(santriId, {
          kelas_id: selectedKelasId,
          kelompok_asal_id: selectedKelompokId,
        });
        showToast('Santri didaftarkan ke kelas gabungan');
      } else {
        const kelasKlp = await SB.kelas.getByKelompok(selectedKelompokId);
        if (kelasKlp.length) {
          await SB.santri.update(santriId, {
            kelas_id: kelasKlp[0].id,
            kelompok_asal_id: null,
          });
          showToast('Santri dikeluarkan dari kelas gabungan');
        }
      }
      await loadSantri(selectedKelasId);
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
    }
  };

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
    await loadKelas(selectedKelompokId);
  });
  window.STR_deleteKelas = async () => {
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    if (!kls) return;
    const santriCount = santriList.length;
    const msg = santriCount > 0
      ? `Hapus kelas "${kls.nama_kelas}"?\n\n⚠️ Ada ${santriCount} santri di kelas ini.\nSantri akan dipindah ke daftar "belum masuk kelas" dan bisa dipindahkan ke kelas lain.`
      : `Hapus kelas "${kls.nama_kelas}"?\nKelas ini kosong (tidak ada santri).`;
    if (!confirm(msg)) return;
    try {
      // Pindahkan semua santri ke null dulu (tapi tetap catat asal kelompoknya,
      // supaya tidak nyasar campur ke daftar "belum masuk kelas" kelompok lain)
      if (santriCount > 0) {
        for (const s of santriList) {
          await SB.santri.update(s.id, { kelas_id: null, kelompok_asal_id: kls.kelompok_id || selectedKelompokId });
        }
      }
      await SB.kelas.delete(kls.id);
      showToast('Kelas ' + kls.nama_kelas + ' dihapus');
      await loadKelas(selectedKelompokId || u.kelompok_id);
    } catch(e) { showToast('Gagal: ' + e.message, true); }
  };
  window.STR_editKelas = () => {
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    if (!kls) return;
    let el = document.getElementById('editKelasModal');
    if (!el) { el = document.createElement('div'); el.id = 'editKelasModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Edit Kelas — ${escHtml(kls.nama_kelas||'')}</h3><button class="modal-close" onclick="closeModal('editKelasModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Nama Kelas</label>
          <div style="font-size:16px; font-weight:800; color:var(--green); padding:6px 0;">${escHtml(kls.nama_kelas||'')}</div>
          <div style="font-size:11px; color:var(--ink-soft);">Nama kelas tidak bisa diubah.</div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Jenjang Kurikulum</label>
            <select id="editKlsJenjang">${JENJANG_ORDER.map(j => `<option ${j===kls.jenjang?'selected':''}>${j}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Semester</label>
            <select id="editKlsSem">
              <option value="1" ${String(kls.semester)==='1'?'selected':''}>Semester 1 (Jul – Des)</option>
              <option value="2" ${String(kls.semester)==='2'?'selected':''}>Semester 2 (Jan – Jun)</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('editKelasModal')">Batal</button>
        <button class="btn btn-green" id="editKlsSaveBtn">Simpan Perubahan</button>
      </div>
    </div>`;
    document.getElementById('editKlsSaveBtn').onclick = async () => {
      const jenjang = document.getElementById('editKlsJenjang').value;
      const semester = parseInt(document.getElementById('editKlsSem').value);
      try {
        await SB.kelas.update(kls.id, { jenjang, semester });
        showToast('Jenjang kurikulum berhasil diubah');
        closeModal('editKelasModal');
        await loadKelas(selectedKelompokId || u.kelompok_id);
      } catch(e) { showToast('Gagal: ' + e.message, true); }
    };
    openModal('editKelasModal');
  };
  window.STR_addKelasGabungan = async () => {
    // Tentukan desa_id
    let desaId = u.desa_id;
    if (isAdmin && selectedKelompokId) {
      const klp = (App.cache.kelompok||[]).find(k => k.id === selectedKelompokId);
      desaId = klp?.desa_id;
    }
    if (!desaId) { showToast('Pilih kelompok terlebih dahulu', true); return; }
    const DESA_NAMA_MAP = await loadDesaMap();
    const desaNama = DESA_NAMA_MAP[desaId] || desaId;
    openAddKelasGabunganModal(desaId, desaNama, async () => {
      await loadKelas(selectedKelompokId);
    });
  };
  window.STR_addSantri = () => {
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    // Jika kelas gabungan, set kelompok_asal_id
    const kelompokAsalId = kls?.desa_id ? (u.kelompok_id || selectedKelompokId) : null;
    openAddSantriModal(selectedKelasId, null, async () => {
      await loadSantri(selectedKelasId);
    }, kelompokAsalId);
  };

  // ── Download template Excel ────────────────────────────────
  window.STR_downloadTemplate = () => {
    window.open('https://budimk46-rm.github.io/kitabah-ppg/Template_Data_Generus.xlsx', '_blank');
  };

  // Download data generus kelas ini dalam format yang persis sama dengan Template Excel —
  // jadi kalau nanti mau diedit rame-rame atau perbaikan massal, tinggal upload ulang
  // lewat "Import Excel" tanpa perlu susun ulang formatnya.
  window.STR_downloadDataKelas = async () => {
    if (!selectedKelasId) { showToast('Pilih kelas terlebih dahulu', true); return; }
    if (!santriList.length) { showToast('Belum ada data generus di kelas ini', true); return; }
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    const aoa = [
      [`DATA GENERUS — ${kls?.nama_kelas || ''} (${kls?.jenjang || ''})`],
      ['Format ini bisa langsung di-import ulang lewat tombol "Import Excel" di menu Kelola Kelas Generus.'],
      ['Kolom Tanggal Lahir wajib format YYYY-MM-DD. Kolom Tingkatan: caberawit / pra_remaja / remaja / pra_nikah (kosongkan supaya otomatis dihitung dari usia).'],
      ['No', 'Nama', 'Tanggal Lahir', 'L/P', 'Tingkatan', 'Nama Orang Tua/Wali', 'NIS'],
      ...santriList.map((s, i) => [
        i + 1,
        s.nama || '',
        s.tgl_lahir || '',
        s.jenis_kel || '',
        s.tingkatan_override ? (s.tingkatan || '') : '',
        s.nama_ortu || '',
        s.nis || '',
      ]),
    ];
    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:5},{wch:28},{wch:14},{wch:6},{wch:14},{wch:28},{wch:12}];
    ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:6} }, { s:{r:1,c:0}, e:{r:1,c:6} }, { s:{r:2,c:0}, e:{r:2,c:6} }];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Data Generus');
    const fname = `Data_Generus_${(kls?.nama_kelas||'kelas').replace(/\s+/g,'_')}.xlsx`;
    window.XLSX.writeFile(wb, fname);
    showToast('Data berhasil diunduh');
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
  window.STR_pindahKelas = (id, nama) => {
    const currentKelas = kelasOptions.find(k => k.id === selectedKelasId);
    const pilihan = kelasOptions.filter(k => k.id !== selectedKelasId && !k.desa_id);
    let el = document.getElementById('pindahKelasModal');
    if (!el) { el = document.createElement('div'); el.id = 'pindahKelasModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Pindah Kelas — ${escHtml(nama)}</h3><button class="modal-close" onclick="closeModal('pindahKelasModal')">✕</button></div>
      <div class="modal-body">
        <div style="font-size:12.5px; color:var(--ink-soft); margin-bottom:12px;">Saat ini di kelas <b>${escHtml(currentKelas?.nama_kelas||'-')}</b>. Pilih kelas tujuan:</div>
        <div class="form-group">
          <label>Pindah ke Kelas</label>
          <select id="pkTarget">
            <option value="">Pilih kelas...</option>
            ${pilihan.map(k => `<option value="${k.id}">${escHtml(k.nama_kelas)} (${escHtml(k.jenjang)})</option>`).join('')}
          </select>
        </div>
        ${!pilihan.length ? '<div style="font-size:12px; color:var(--rose);">Belum ada kelas lain di kelompok ini.</div>' : ''}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('pindahKelasModal')">Batal</button>
        <button class="btn btn-green" id="pkSaveBtn">Pindahkan</button>
      </div>
    </div>`;

    document.getElementById('pkSaveBtn').onclick = async () => {
      const targetId = document.getElementById('pkTarget').value;
      if (!targetId) { showToast('Pilih kelas tujuan dulu', true); return; }
      const btn = document.getElementById('pkSaveBtn');
      btn.disabled = true; btn.textContent = 'Memindahkan...';
      try {
        await SB.santri.update(id, { kelas_id: targetId });
        App.cache.allSantri = null;
        const targetKelas = pilihan.find(k => k.id === targetId);
        logActivity('ubah', 'Santri', `Memindahkan "${nama}" dari ${currentKelas?.nama_kelas||'-'} ke ${targetKelas?.nama_kelas||'-'}`);
        showToast(`${nama} dipindahkan ke ${targetKelas?.nama_kelas||'kelas baru'}`);
        closeModal('pindahKelasModal');
        await loadSantri(selectedKelasId);
      } catch(e) {
        showToast('Gagal: ' + e.message, true);
        btn.disabled = false; btn.textContent = 'Pindahkan';
      }
    };

    openModal('pindahKelasModal');
  };

  window.STR_hapusPermanen = async (id, nama) => {
    if (!confirm(`⚠️ HAPUS PERMANEN "${nama}"?\n\nIni BEDA dari "Keluarkan dari Kelas" — data generus ini akan dihapus TOTAL dari sistem, termasuk riwayat absensinya, dan TIDAK BISA DIKEMBALIKAN.\n\nKalau cuma salah kelas atau mau dipindah, pakai tombol "Keluarkan dari kelas" saja, JANGAN pakai ini.\n\nYakin mau hapus permanen?`)) return;
    if (!confirm(`Konfirmasi sekali lagi — hapus permanen "${nama}"? Langkah ini tidak bisa dibatalkan.`)) return;
    try {
      await SB.santri.delete(id);
      App.cache.allSantri = null;
      logActivity('hapus', 'Santri', `Hapus permanen data generus "${nama}"`);
      showToast(`${nama} dihapus permanen ✓`);
      await loadSantri(selectedKelasId);
    } catch(e) {
      showToast('Gagal menghapus: ' + e.message, true);
    }
  };

  window.STR_delete = async (id, nama) => {
    if (!confirm(`Keluarkan "${nama}" dari kelas ini?\nSantri akan dipindah ke daftar belum masuk kelas.`)) return;
    await SB.santri.update(id, { kelas_id: null, kelompok_asal_id: selectedKelompokId });
    App.cache.allSantri = null;
    logActivity('ubah', 'Santri', `Mengeluarkan "${nama}" dari kelas`);
    showToast('Santri dikeluarkan dari kelas');
    await loadSantri(selectedKelasId);
  };

  // Inisialisasi
  if (!isAdmin && u.kelompok_id) {
    await loadKelas(u.kelompok_id);
  } else if (isDesaForm && u.desa_id) {
    // Desa user — load kelas gabungan desa
    await loadKelas(null);
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
    let selectedMateriIds = new Set();
    let materiStatus = {}; // materiId -> 'tuntas' | 'belum_tuntas'
    // Materi diambil per jenjang+semester saat dibutuhkan saja (bukan seluruh 1552 baris
    // kurikulum sekaligus) — payload kecil ini yang sebelumnya bikin loading lama/macet
    // di HP karena harus parsing JSON besar sekaligus di 1 request.
    let materiJenjangCache = {}; // key "jenjang|semester" -> materi rows
    async function ensureMateriLoaded(jenjang, semester) {
      const key = jenjang + '|' + semester;
      if (materiJenjangCache[key]) return;
      materiJenjangCache[key] = await SB.materi.getByJenjang(jenjang, semester) || [];
    }
  let kelasKlp = sortKelas(await SB.kelas.getByKelompok(myKelompokId));
  // Juga load kelas gabungan desa
  const myKlp = (App.cache.kelompok||[]).find(k => k.id === myKelompokId);
  if (myKlp?.desa_id) {
    const gabungan = await SB.kelas.getByDesa(myKlp.desa_id) || [];
    gabungan.forEach(g => { g._isGabungan = true; });
    kelasKlp = [...kelasKlp, ...sortKelas(gabungan)];
  }
  const kelasOptions = kelasKlp;

  // Kelompok belum punya kelas sama sekali — dulu di sini diam saja tanpa pesan apapun,
  // kelihatan seperti "loading terus" padahal sebenarnya sudah selesai proses & tidak ada
  // yang bisa ditampilkan. Sekarang kasih pesan yang jelas.
  if (!kelasOptions.length) {
    main.innerHTML = `
      <div class="page-header"><h1 class="page-title">Absensi & Jurnal KBM</h1></div>
      <div class="card" style="text-align:center; padding:36px 20px;">
        <div style="font-size:32px; margin-bottom:8px;">📭</div>
        <div class="fw-bold" style="margin-bottom:6px;">Belum Ada Kelas</div>
        <div style="font-size:13px; color:var(--ink-soft); max-width:360px; margin:0 auto;">
          Kelompok ini belum punya kelas generus sama sekali, jadi belum ada yang bisa diabsen.
          Buat kelas dulu lewat menu <b style="color:var(--green);">Kelola Kelas Generus</b>.
        </div>
        <button class="btn btn-green" style="margin-top:16px;" onclick="navigate('kelola_kelas')">Buka Kelola Kelas Generus →</button>
      </div>`;
    return;
  }

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
    const kls = kelasOptions.find(k => k.id === selectedKelasId);
    if (kls) await ensureMateriLoaded(kls.jenjang, kls.semester);
    pertemuanList = await SB.pertemuan.getByKelas(selectedKelasId, getTahunAjaran());
    santriList = await SB.santri.getByKelas(selectedKelasId);
    // Default: tampilkan form pertemuan BARU (bukan data lama)
    currentPertemuanId = null;
    absensiData = {};
    jurnalData = null;
    selectedMateriIds = new Set();
    materiStatus = {};
    renderMain();
  }

  async function loadDetail(pId) {
    currentPertemuanId = pId;
    // PENTING: sinkronkan "bulan aktif" ke bulan ASLI pertemuan ini (bukan bulan hari ini) —
    // supaya target materi & progress kurikulum tercatat ke bulan yang benar saat edit pertemuan lama.
    const ptm = pertemuanList.find(p => p.id === pId);
    if (ptm?.bulan) jurnalBulan = ptm.bulan;
    const [absen, jurnal] = await Promise.all([
      SB.absensi.getByPertemuan(pId),
      SB.jurnal.getByPertemuan(pId),
    ]);
    absensiData = Object.fromEntries(absen.map(a => [a.santri_id, a.status]));
    jurnalData = jurnal.length ? jurnal[0] : null;
    // Load materi yang sudah dipilih di jurnal ini
    const jurnalMateri = jurnalData ? (jurnalData.jurnal_materi || []) : [];
    selectedMateriIds = new Set(jurnalMateri.map(jm => jm.materi_id));
    materiStatus = Object.fromEntries(jurnalMateri.map(jm => [jm.materi_id, jm.status || 'tuntas']));
    renderMain();
  }

  function getMateriForDisplay(bulan) {
    const selectedKelas = kelasOptions.find(k => k.id === selectedKelasId);
    if (!selectedKelas) return [];
    const key = selectedKelas.jenjang + '|' + selectedKelas.semester;
    const materiList = materiJenjangCache[key] || [];
    const col = bulan.toLowerCase();
    return materiList.filter(r => r[col] && r[col].trim());
  }

  function renderMain() {
    // Simpan state jurnal sebelum re-render
    const jurnalEl = document.getElementById('jurnalCatatan');
    if (jurnalEl) _savedJurnalText = jurnalEl.value;

    // Simpan state absensi
    const absensiState = {};
    document.querySelectorAll('[data-santri-id]').forEach(el => {
      const sid = el.dataset.santriId;
      const active = el.querySelector('.active');
      if (active) absensiState[sid] = active.dataset.status;
    });
    const selectedKelas = kelasOptions.find(k => k.id === selectedKelasId);
    const kelasOptHtml = kelasOptions.map(k =>
      `<option value="${k.id}" data-kelompok-id="${k.kelompok_id||myKelompokId||''}" ${k.id === selectedKelasId ? 'selected' : ''}>
        ${k.nama_kelas ? escHtml(k.nama_kelas)+' — ' : ''}${escHtml(k.jenjang)} Sem ${k.semester}${k.desa_id ? ' 🏘️ Gabungan' : ''}
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
          const statusMateri = materiStatus[r.id] || 'tuntas';
          const belumTuntas = dipilihHariIni && statusMateri === 'belum_tuntas';

          // Gunakan data-id untuk onclick agar aman dari karakter khusus
          return `<div data-materi-id="${r.id}" onclick="ABS_toggleMateri(this.dataset.materiId)"
            style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px;
              border-bottom:1px solid var(--line); cursor:pointer; transition:background .15s;
              background:${belumTuntas ? '#fff8ea' : dipilihHariIni ? 'var(--green-soft)' : sudahPernah ? '#f0f7f2' : ''};">
            <div style="width:22px; height:22px; border-radius:6px; flex-shrink:0; margin-top:2px;
              border:2px solid ${belumTuntas ? '#e6a817' : dipilihHariIni ? 'var(--green)' : sudahPernah ? '#7ab896' : 'var(--line)'};
              background:${belumTuntas ? '#e6a817' : dipilihHariIni ? 'var(--green)' : 'transparent'};
              display:flex; align-items:center; justify-content:center;">
              ${dipilihHariIni
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>'
                : sudahPernah
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="#7ab896" stroke-width="2.5" width="11" height="11"><path d="M20 6L9 17l-5-5"/></svg>'
                : ''}
            </div>
            <div style="flex:1; min-width:0;">
              <!-- Baris 1: nomor + topik (judul bab/sub) -->
              <div style="font-weight:800; font-size:13px; color:${belumTuntas ? '#a67c00' : dipilihHariIni ? 'var(--green)' : sudahPernah ? '#2d6a4f' : '#111'}; margin-bottom:${r.poin ? '4px' : '2px'};">
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
              ${dipilihHariIni ? `
              <div style="display:flex; gap:6px; margin-top:8px;" onclick="event.stopPropagation()">
                <button type="button" onclick="ABS_setMateriStatus('${r.id}','tuntas')"
                  style="padding:4px 10px; border-radius:14px; font-size:11px; font-weight:700; cursor:pointer;
                    border:1.5px solid ${statusMateri==='tuntas'?'var(--green)':'var(--line)'};
                    background:${statusMateri==='tuntas'?'var(--green)':'#fff'};
                    color:${statusMateri==='tuntas'?'#fff':'var(--ink-soft)'};">✓ Tuntas</button>
                <button type="button" onclick="ABS_setMateriStatus('${r.id}','belum_tuntas')"
                  style="padding:4px 10px; border-radius:14px; font-size:11px; font-weight:700; cursor:pointer;
                    border:1.5px solid ${statusMateri==='belum_tuntas'?'#e6a817':'var(--line)'};
                    background:${statusMateri==='belum_tuntas'?'#e6a817':'#fff'};
                    color:${statusMateri==='belum_tuntas'?'#fff':'var(--ink-soft)'};">◐ Belum Tuntas, Lanjut Lagi</button>
              </div>` : ''}
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
      const belumTuntasCount = Array.from(selectedMateriIds).filter(id => materiStatus[id] === 'belum_tuntas').length;
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
              ${belumTuntasCount ? `<span class="badge" style="background:#fff3d6; color:#a67c00;">◐ ${belumTuntasCount} belum tuntas</span>` : ''}
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
      </div>
      <div class="card" id="absNotifOrtuBox" style="margin-top:12px;"></div>` : '';

    // Hitung pertemuan ke berapa bulan ini (khusus pertemuan BARU)
    const pertemuanBulanIni = pertemuanList.filter(p => p.bulan === nowMonth);
    const pertemuanKe = pertemuanBulanIni.length + 1;

    // Riwayat SEMUA pertemuan sepanjang tahun ajaran (bukan cuma bulan ini) — supaya kesalahan
    // di pertemuan bulan-bulan sebelumnya juga bisa dibuka & diperbaiki, bukan cuma bulan berjalan.
    const semuaPertemuanUrut = [...pertemuanList].sort((a,b) => (b.tanggal||'').localeCompare(a.tanggal||''));
    let bulanTerakhir = null;
    const riwayatHtml = semuaPertemuanUrut.length ? semuaPertemuanUrut.map((p, idx) => {
      const tandaBulan = p.bulan !== bulanTerakhir ? `<div style="padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--gold); background:var(--cream-2);">${escHtml(p.bulan||'')}</div>` : '';
      bulanTerakhir = p.bulan;
      return `${tandaBulan}<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid var(--line); cursor:pointer; background:${p.id===currentPertemuanId?'var(--green-soft)':'var(--white)'};" onclick="ABS_setPertemuan('${p.id}')">
        <div>
          <div style="font-weight:600; font-size:13px; color:${p.id===currentPertemuanId?'var(--green)':'var(--ink)'};">Pertemuan ke-${p.pertemuan_ke || (idx+1)}</div>
          <div style="font-size:11px; color:var(--ink-soft);">${fmtDateShort(p.tanggal)}</div>
        </div>
        <div style="font-size:11px; color:var(--ink-soft);">
          ${p.id===currentPertemuanId ? '<span class="badge badge-green" style="font-size:10px;">Sedang diedit</span>' : 'Edit \u2192'}
        </div>
      </div>`;
    }).join('') : '<div style="padding:10px; font-size:12px; color:var(--ink-soft);">Belum ada pertemuan di kelas ini.</div>';

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Absensi & Jurnal KBM</h1>
      </div>

      <!-- Pilih Kelas -->
      <div class="card" style="margin-bottom:14px;">
        <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelas</label>
        <select onchange="ABS_setKelas(this)"
          style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
          ${kelasOptHtml}
        </select>
      </div>

      <!-- Info Pertemuan -->
      <div class="card" style="border:2px solid var(--green); margin-bottom:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <div>
            <div style="font-size:18px; font-weight:800; color:var(--green);">
              ${currentPertemuanId
                ? 'Pertemuan ke-' + (pertemuanList.find(p=>p.id===currentPertemuanId)?.pertemuan_ke || '?')
                : 'Pertemuan ke-' + pertemuanKe + ' (Baru)'}
            </div>
            <div style="font-size:13px; color:var(--ink-soft);">
              ${selectedKelas?.nama_kelas||''} — ${nowMonth} ${new Date().getFullYear()} · TA ${getTahunAjaran()}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            ${currentPertemuanId ? '<button class="btn btn-outline btn-sm" onclick="ABS_setPertemuan(\'\')" style="font-size:11px;">+ Pertemuan Baru</button>' : ''}
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('riwayatPtm').style.display=document.getElementById('riwayatPtm').style.display==='none'?'block':'none'" style="font-size:11px;">
              📋 Riwayat (${semuaPertemuanUrut.length})
            </button>
          </div>
        </div>
        <div id="riwayatPtm" style="display:none; border:1px solid var(--line); border-radius:var(--radius-sm); overflow-y:auto; max-height:320px; margin-bottom:10px;">
          ${riwayatHtml}
        </div>
        ${!currentPertemuanId ? `
          <div style="padding:10px 14px; background:var(--gold-soft); border-radius:var(--radius-sm); font-size:13px; color:#8a6a24;">
            <label style="display:block; font-weight:700; margin-bottom:4px;">Tanggal pertemuan sebenarnya (bisa dipilih tanggal lampau kalau baru sempat diinput hari ini)</label>
            <input type="date" id="absTglInput" value="${new Date().toISOString().slice(0,10)}" style="padding:7px 10px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
          </div>` : `
          <div style="padding:10px 14px; background:var(--green-soft); border-radius:var(--radius-sm); font-size:13px; color:var(--green);">
            <label style="display:block; font-weight:700; margin-bottom:4px;">Mengedit pertemuan — tanggal</label>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <input type="date" id="absTglInput" value="${pertemuanList.find(p=>p.id===currentPertemuanId)?.tanggal||''}" style="padding:7px 10px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <button class="btn btn-outline btn-sm" onclick="ABS_ubahTanggal()">Ubah Tanggal Pertemuan Ini</button>
            </div>
          </div>`}
      </div>

      <!-- Absensi -->
      <div class="card">
        <div class="fw-bold color-green" style="font-size:15px; margin-bottom:12px;">\ud83d\udccb Absensi Kehadiran</div>
        ${absensiTable}
      </div>

      ${jurnalHtml}
      ${materiSectionHtml}

      ${currentPertemuanId ? simpanHtml : `
        <div style="margin-top:16px;">
          <button class="btn btn-green" onclick="ABS_simpanBaru()"
            style="width:100%; padding:14px; font-size:15px; font-weight:800; border-radius:var(--radius); box-shadow:var(--shadow-lg);">
            \ud83d\udcbe Buat Pertemuan & Simpan
          </button>
        </div>`}
    `;

    // Restore jurnal text setelah re-render
    const jurnalRestored = document.getElementById('jurnalCatatan');
    if (jurnalRestored && _savedJurnalText) {
      jurnalRestored.value = _savedJurnalText;
    }
  }

  // State bulan jurnal
  let jurnalBulan = currentMonthName();

  window.ABS_setKelas = async (sel) => {
    selectedKelasId = sel.value;
    const opt = sel.options[sel.selectedIndex];
    const newKelompokId = opt.dataset.kelompokId || myKelompokId;
    activeKelompokId = newKelompokId;
    selectedMateriIds = new Set();
    materiStatus = {};
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
      materiStatus = {};
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
    // Simpan isi jurnal sebelum re-render
    const textarea = document.getElementById('jurnalCatatan');
    if (textarea) _savedJurnalText = textarea.value;

    if (selectedMateriIds.has(materiId)) {
      selectedMateriIds.delete(materiId);
      delete materiStatus[materiId];
    } else {
      selectedMateriIds.add(materiId);
      materiStatus[materiId] = 'tuntas'; // default saat pertama dicentang
    }
    renderMain();
  };

  window.ABS_setMateriStatus = (materiId, status) => {
    const textarea = document.getElementById('jurnalCatatan');
    if (textarea) _savedJurnalText = textarea.value;
    materiStatus[materiId] = status;
    renderMain();
  };

  // Simpan state jurnal agar tidak hilang saat re-render
  let _savedJurnalText = '';

  // Simpan untuk pertemuan BARU
  window.ABS_simpanBaru = async () => {
    const btn = document.querySelector('[onclick="ABS_simpanBaru()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    try {
      const tglInput = document.getElementById('absTglInput');
      const tgl = tglInput?.value || new Date().toISOString().slice(0,10);
      const tglObj = new Date(tgl + 'T00:00:00');
      const bulanNow = tglObj.toLocaleDateString('id-ID', {month:'long'});

      // Hitung pertemuan ke berapa hari ini (support multiple pertemuan 1 hari)
      const pertemuanHariIni = pertemuanList.filter(p => p.tanggal === tgl);
      const kePertemuan = pertemuanList.filter(p => p.bulan === bulanNow).length + 1;
      const keDalamHari = pertemuanHariIni.length + 1; // ke-1, ke-2 dst dalam hari ini

      const newPertemuan = await SB.pertemuan.insert({
        tahun_ajaran: getTahunAjaran(),
        kelas_id: selectedKelasId,
        tanggal: tgl,
        bulan: bulanNow,
        tahun: tglObj.getFullYear(),
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
  // Susun pesan WA ke orang tua sesuai status kehadiran generus di pertemuan kelas
  function buildPesanWaOrtu(status, namaGenerus, namaKelas, pertemuanKe, tanggal) {
    const tglFmt = fmtDateShort(tanggal);
    const pembuka = `Assalamu'alaikum Warahmatullahi Wabarakatuh\n\nYth. Bapak/Ibu Wali dari Ananda ${namaGenerus},\n\nKami sampaikan bahwa pada ${tglFmt}, telah dilaksanakan pengajian ${namaKelas} pertemuan ke-${pertemuanKe||'?'}.\n\n`;
    const penutup = `\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh`;
    const isi = {
      H: `Alhamdulillah, Ananda ${namaGenerus} telah HADIR pada pertemuan tersebut.\n\nAlhamdulillahi Jaza Kumullohu Khoiro.`,
      S: `Kami mendapat kabar Ananda ${namaGenerus} berhalangan hadir dikarenakan sakit.\n\nSemoga Ananda ${namaGenerus} segera diberikan kesembuhan dan kesehatan, sehingga bisa kembali mengikuti pengajian berikutnya. Aamiin.`,
      I: `Ananda ${namaGenerus} pada pertemuan tersebut berhalangan hadir dengan keterangan izin.\n\nSemoga di pertemuan berikutnya Ananda ${namaGenerus} bisa hadir kembali.`,
      A: `Ananda ${namaGenerus} pada pertemuan tersebut belum berkesempatan hadir.\n\nAmal sholih orang tua bisa menyemangati anaknya untuk hadir di pengajian berikutnya, atas amal sholihnya disyukuri Alhamdulillahi Jaza Kumullohu Khoiro.`,
    };
    return pembuka + (isi[status] || isi.A) + penutup;
  }

  window.ABS_toggleNotifOrtu = () => {
    const el = document.getElementById('absNotifOrtuList');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  async function loadNotifOrtuSection(pId) {
    const box = document.getElementById('absNotifOrtuBox');
    if (!box || !santriList.length) return;
    const p = pertemuanList.find(x => x.id === pId);
    const klsNama = kelasOptions?.find(k => k.id === selectedKelasId)?.nama_kelas || '';
    const kelompokId = activeKelompokId || myKelompokId || null;

    try {
      const [links, jamaahKlp] = await Promise.all([
        SB.jamaahKeluarga.getBySantriIds(santriList.map(s => s.id)),
        kelompokId ? SB.jamaah.getByKelompok(kelompokId) : Promise.resolve([]),
      ]);
      const jamaahById = new Map((jamaahKlp||[]).map(j => [j.id, j]));
      const parentBySantriId = new Map();
      (links||[]).forEach(l => {
        if (l.santri_id) {
          const ortu = jamaahById.get(l.jamaah_id);
          if (ortu) parentBySantriId.set(l.santri_id, ortu);
        }
      });

      box.innerHTML = `
        <div class="fw-bold" style="font-size:12.5px; margin-bottom:8px; color:var(--green); cursor:pointer;" onclick="ABS_toggleNotifOrtu()">📤 Kirim Notifikasi ke Orang Tua ▾</div>
        <div id="absNotifOrtuList" style="display:none;">
          ${santriList.map(s => {
            const status = absensiData[s.id] || 'A';
            const ortu = parentBySantriId.get(s.id);
            const waLink = ortu?.no_hp
              ? 'https://wa.me/62' + ortu.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'')
                + '?text=' + encodeURIComponent(buildPesanWaOrtu(status, s.nama, klsNama, p?.pertemuan_ke, p?.tanggal))
              : '';
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--line); font-size:12.5px;">
              <span>${escHtml(s.nama)} <span style="color:var(--ink-soft);">(${status})</span></span>
              ${waLink ? `<a href="${waLink}" target="_blank" class="btn btn-outline btn-sm" style="padding:4px 10px;">📤 Kirim WA</a>` : '<span style="font-size:11px; color:var(--rose);">No. HP Ortu belum ada</span>'}
            </div>`;
          }).join('')}
        </div>`;
    } catch(e) { console.error('Gagal load notif ortu:', e); }
  }

  window.ABS_simpanSemua = async () => {
    const btn = document.querySelector('[onclick="ABS_simpanSemua()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    try {
      await doSimpanAll(currentPertemuanId);
      await refreshProgress(); // update cache setelah simpan
      const p = pertemuanList.find(x => x.id === currentPertemuanId);
      logActivity('ubah', 'Absensi', `Simpan absensi & jurnal — pertemuan ke-${p?.pertemuan_ke||'?'} (${p?fmtDateShort(p.tanggal):'-'})`);
      showToast('Absensi & jurnal disimpan ✓');
      await loadNotifOrtuSection(currentPertemuanId);
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Absensi + Jurnal'; }
  };

  window.ABS_ubahTanggal = async () => {
    const tglBaru = document.getElementById('absTglInput')?.value;
    if (!tglBaru) { showToast('Pilih tanggal dulu', true); return; }
    const p = pertemuanList.find(x => x.id === currentPertemuanId);
    if (!p) return;
    if (tglBaru === p.tanggal) { showToast('Tanggalnya sama, tidak ada perubahan'); return; }
    if (!confirm(`Ubah tanggal pertemuan ini dari ${fmtDateShort(p.tanggal)} jadi ${fmtDateShort(tglBaru)}?`)) return;
    const btn = document.querySelector('[onclick="ABS_ubahTanggal()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    try {
      const tglObj = new Date(tglBaru + 'T00:00:00');
      const bulanBaru = tglObj.toLocaleDateString('id-ID', {month:'long'});
      await SB.pertemuan.update(currentPertemuanId, { tanggal: tglBaru, bulan: bulanBaru, tahun: tglObj.getFullYear() });
      logActivity('ubah', 'Absensi', `Ubah tanggal pertemuan ke-${p.pertemuan_ke||'?'} dari ${fmtDateShort(p.tanggal)} ke ${fmtDateShort(tglBaru)}`);
      showToast('Tanggal pertemuan berhasil diubah ✓');
      pertemuanList = await SB.pertemuan.getByKelas(selectedKelasId, getTahunAjaran());
      await refreshProgress();
      await loadDetail(currentPertemuanId);
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Ubah Tanggal Pertemuan Ini'; }
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

    // 3. Simpan materi dipilih ke jurnal_materi (dengan status tuntas/belum_tuntas)
    if (selectedMateriIds.size > 0) {
      // Ambil jurnal_id yang baru saja disimpan
      const jurnalRows = await SB.jurnal.getByPertemuan(pId);
      const jurnalId = jurnalRows?.[0]?.id;
      if (jurnalId) {
        // Hapus jurnal_materi lama berdasarkan jurnal_id (bukan pertemuan_id)
        await SB.jurnal.deleteMateri(jurnalId);
        // Insert yang baru, sertakan status per materi
        const materiEntries = Array.from(selectedMateriIds).map(id => ({ id, status: materiStatus[id] || 'tuntas' }));
        await SB.jurnal.insertMateri(jurnalId, materiEntries, bulan);
      }
    }

    // 4. Otomatis update progress kurikulum — HANYA untuk materi yang sudah Tuntas.
    // Materi Belum Tuntas tetap tercatat di jurnal (riwayat dibahas), tapi belum
    // terhitung selesai di progress kurikulum sampai suatu saat ditandai Tuntas.
    if (kelompokId && selectedMateriIds.size > 0) {
      for (const materiId of selectedMateriIds) {
        if ((materiStatus[materiId] || 'tuntas') !== 'tuntas') continue;
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

/* ===== PAGE: PENILAIAN GENERUS ===== */
async function renderPenilaian() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const isKelompok = ['pjp_kelompok','guru','kelompok','wali_kbm'].includes(u.role);
  const canEdit = isAdmin || u.role === 'pjp_kelompok' || u.role === 'guru';

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  if (!App.cache.materi) App.cache.materi = await SB.materi.getAll();
  const DESA_NAMA_MAP = await loadDesaMap();
  const NILAI_CYCLE = [null,'A','B','C','D'];
  const NILAI_COLOR = { A:'#1a6b3a', B:'#2563eb', C:'#ca8a04', D:'#c0392b' };
  const NILAI_BG = { A:'#e8f5ed', B:'#eff6ff', C:'#fef9c3', D:'#fde8e8' };
  const NILAI_LABEL = { A:'Sangat Baik', B:'Baik', C:'Cukup', D:'Kurang' };

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  const nowMonth = currentMonthName();
  let selectedBulan = nowMonth;
  const ta = getTahunAjaran();

  if (isKelompok) {
    // === INPUT MODE (kelompok/admin) ===
    let myKelompokId = u.kelompok_id || null;
    let myKelasList = [];

    async function loadKelasList() {
      myKelasList = [];
      if (myKelompokId) {
        myKelasList = sortKelas(await SB.kelas.getByKelompok(myKelompokId));
        const myKlp = (App.cache.kelompok||[]).find(k => k.id === myKelompokId);
        if (myKlp?.desa_id) {
          const gab = await SB.kelas.getByDesa(myKlp.desa_id) || [];
          myKelasList = [...myKelasList, ...sortKelas(gab)];
        }
      }
    }

    await loadKelasList();
    let selectedKelasId = myKelasList.length ? myKelasList[0].id : null;
    let santriList = [];
    let topikList = [];
    let nilaiMap = {}; // santriId|topik → nilai
    let detailMap = {}; // santriId|topik → {items:[...]}
    let catatanMap = {}; // santriId|topik → catatan
    let unsavedChanges = new Set();

    async function loadData() {
      if (!selectedKelasId) return;
      const kls = myKelasList.find(k => k.id === selectedKelasId);
      santriList = await SB.santri.getByKelas(selectedKelasId);
      if (kls?.desa_id && myKelompokId) santriList = santriList.filter(s => s.kelompok_asal_id === myKelompokId);

      // Get topik dari materi berdasar jenjang
      const jenjang = kls?.jenjang || 'SD 3';
      const sem = String(kls?.semester || 1);
      const materiList = (App.cache.materi||[]).filter(m => m.jenjang === jenjang && String(m.semester) === sem);
      topikList = [...new Set(materiList.map(m => m.bab_title).filter(Boolean))];

      // Load existing penilaian
      const existing = await SB.penilaian.getByKelas(selectedKelasId, selectedBulan, ta) || [];
      nilaiMap = {};
      detailMap = {};
      catatanMap = {};
      existing.forEach(p => {
        nilaiMap[p.santri_id + '|' + p.topik] = p.nilai;
        if (p.detail) detailMap[p.santri_id + '|' + p.topik] = p.detail;
        if (p.catatan) catatanMap[p.santri_id + '|' + p.topik] = p.catatan;
      });
    }

    await loadData();

    function render() {
      const kls = myKelasList.find(k => k.id === selectedKelasId);
      const kelasOpts = myKelasList.map(k =>
        `<option value="${k.id}" ${k.id===selectedKelasId?'selected':''}>${k.nama_kelas||k.jenjang} — ${k.jenjang} Sem ${k.semester}${k.desa_id?' 🏘️':''}</option>`
      ).join('');

      const bulanChips = [...SEM1_MONTHS, ...SEM2_MONTHS].map(m =>
        `<div onclick="PNL_setBulan('${m}')" style="padding:5px 10px; border-radius:16px; font-size:11px; font-weight:700; cursor:pointer; display:inline-block; margin:2px;
          background:${selectedBulan===m?'var(--green)':'var(--white)'}; color:${selectedBulan===m?'#fff':'var(--ink-soft)'}; border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
          ${m.slice(0,3)}${m===nowMonth?' ●':''}
        </div>`).join('');

      // Header topik (singkat)
      const topikHeaders = topikList.map(t =>
        `<th style="padding:5px 3px; font-size:10px; color:#fff; text-align:center; min-width:42px; max-width:60px; word-break:break-word;">${escHtml(t.length > 10 ? t.slice(0,8)+'..' : t)}</th>`
      ).join('');

      // Rows
      const rows = santriList.map((s, i) => {
        const cells = topikList.map(t => {
          const key = s.id + '|' + t;
          const val = nilaiMap[key] || null;
          const color = val ? NILAI_COLOR[val] : '#ccc';
          const bg = val ? NILAI_BG[val] : '#f5f5f5';
          return `<td style="padding:3px 2px; text-align:center;">
            <div onclick="PNL_tap(this.dataset.sid, this.dataset.topik)" data-sid="${s.id}" data-topik="${escHtml(t)}" title="${escHtml(t)}: ${val ? NILAI_LABEL[val] : 'Belum'}"
              style="width:32px; height:28px; border-radius:6px; margin:0 auto; cursor:pointer; font-size:12px; font-weight:800;
                background:${bg}; color:${color}; border:1.5px solid ${color};
                display:flex; align-items:center; justify-content:center; user-select:none;">
              ${val || '—'}
            </div>
          </td>`;
        }).join('');
        return `<tr style="border-bottom:1px solid var(--line);">
          <td style="padding:5px 6px; font-size:11px; text-align:center;">${i+1}</td>
          <td style="padding:5px 8px; font-size:12px; font-weight:600; white-space:nowrap;">${escHtml(s.nama)}</td>
          <td style="padding:5px 4px; text-align:center; font-size:11px; font-weight:700; color:${s.jenis_kel==='L'?'#1a6b3a':'#a6483b'};">${s.jenis_kel||'—'}</td>
          ${cells}
        </tr>`;
      }).join('');

      // Hitung stats
      const totalCells = santriList.length * topikList.length;
      const filledCells = Object.values(nilaiMap).filter(v => v).length;
      const pct = totalCells ? Math.round(filledCells/totalCells*100) : 0;

      const scopeLabel = (App.cache.kelompok||[]).find(k => k.id === myKelompokId)?.nama || '';

      main.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Penilaian Generus</h1>
            <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(scopeLabel)} · Bulan ${selectedBulan} · TA ${ta}</p>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
          ${isAdmin ? `<div style="flex:1; min-width:180px;">
            <label style="font-size:11px; font-weight:700; color:var(--green); display:block; margin-bottom:4px;">Kelompok</label>
            <select onchange="PNL_setKelompok(this.value)" style="width:100%; padding:8px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih kelompok...</option>
              ${(App.cache.kelompok||[]).map(k => `<option value="${k.id}" ${k.id===myKelompokId?'selected':''}>${escHtml(k.nama)} · ${escHtml(k.desa?.nama||k.desa_id)}</option>`).join('')}
            </select>
          </div>` : ''}
          <div style="flex:1; min-width:180px;">
            <label style="font-size:11px; font-weight:700; color:var(--green); display:block; margin-bottom:4px;">Kelas</label>
            <select onchange="PNL_setKelas(this.value)" style="width:100%; padding:8px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              ${myKelasList.length ? kelasOpts : `<option value="">${isAdmin ? 'Pilih kelompok dulu' : 'Belum ada kelas — buat dulu di Kelola Kelas'}</option>`}
            </select>
          </div>
        </div>

        <div style="margin-bottom:14px; display:flex; flex-wrap:wrap; gap:2px;">${bulanChips}</div>

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:center;">
          <span style="font-size:11px; color:var(--ink-soft);">Keterangan:</span>
          <span style="font-size:11px; font-weight:700; color:#1a6b3a; background:#e8f5ed; padding:2px 8px; border-radius:10px;">A Sangat Baik</span>
          <span style="font-size:11px; font-weight:700; color:#2563eb; background:#eff6ff; padding:2px 8px; border-radius:10px;">B Baik</span>
          <span style="font-size:11px; font-weight:700; color:#ca8a04; background:#fef9c3; padding:2px 8px; border-radius:10px;">C Cukup</span>
          <span style="font-size:11px; font-weight:700; color:#c0392b; background:#fde8e8; padding:2px 8px; border-radius:10px;">D Kurang</span>
          <span style="font-size:11px; color:var(--ink-soft); margin-left:8px;">Terisi: ${filledCells}/${totalCells} (${pct}%)</span>
          ${unsavedChanges.size ? `<span style="font-size:11px; color:var(--rose); font-weight:700; margin-left:8px;">⚠️ ${unsavedChanges.size} belum disimpan</span>` : ''}
        </div>

        ${canEdit ? `<div style="margin-bottom:14px;">
          <button id="pnlSaveBtn" class="btn btn-green" onclick="PNL_save()" ${!unsavedChanges.size?'disabled':''} style="padding:10px 24px;">
            💾 Simpan Penilaian${unsavedChanges.size ? ' ('+unsavedChanges.size+')' : ''}
          </button>
        </div>` : ''}

        ${topikList.length && santriList.length ? `
        <div class="card" style="padding:0; overflow:hidden;">
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--green);">
              <th style="padding:5px 6px; font-size:10px; color:#fff; width:28px;">No</th>
              <th style="padding:5px 8px; font-size:10px; color:#fff; text-align:left;">Nama</th>
              <th style="padding:5px 4px; font-size:10px; color:#fff; text-align:center; width:28px;">L/P</th>
              ${topikHeaders}
            </tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>` : '<div class="card"><p style="color:var(--ink-soft);">Pilih kelas untuk mulai penilaian. Pastikan kelas sudah memiliki santri dan jenjang kurikulum yang benar.</p></div>'}
      `;
    }

    // Load existing detail & catatan
    async function loadExistingDetail() {
      if (!selectedKelasId) return;
      const existing = await SB.penilaian.getByKelas(selectedKelasId, selectedBulan, ta) || [];
      existing.forEach(p => {
        const key = p.santri_id + '|' + p.topik;
        if (p.detail) detailMap[key] = p.detail;
        if (p.catatan) catatanMap[key] = p.catatan;
      });
    }

    window.PNL_tap = (santriId, topik) => {
      if (!canEdit) return;
      // Buka modal detail
      const kls = myKelasList.find(k => k.id === selectedKelasId);
      const jenjang = kls?.jenjang || 'SD 3';
      const sem = String(kls?.semester || 1);
      const santri = santriList.find(s => s.id === santriId);
      const key = santriId + '|' + topik;

      // Cari materi items untuk topik ini di bulan ini
      const materiList = (App.cache.materi||[]).filter(m =>
        m.jenjang === jenjang && String(m.semester) === sem && m.bab_title === topik
      );
      console.log('PNL_tap debug:', { jenjang, sem, topik, bulan: selectedBulan, totalMateri: (App.cache.materi||[]).length, matchedMateri: materiList.length });
      if (materiList.length) console.log('Sample materi:', JSON.stringify(materiList[0]).slice(0,200));
      if (!materiList.length) {
        // Coba cek bab_title yang ada
        const allBabs = [...new Set((App.cache.materi||[]).filter(m => m.jenjang === jenjang && String(m.semester) === sem).map(m => m.bab_title))];
        console.log('Available bab_titles for', jenjang, sem, ':', allBabs);
      }

      // Cek materi yang ada target di bulan ini
      const bulanCol = selectedBulan.toLowerCase();
      const materiItems = materiList.filter(m => m[bulanCol] && m[bulanCol].trim()).map(m => ({
        materi_id: m.id,
        label: [m.sub_title, m.topik, m.poin_title].filter(Boolean).join(' — ') || m.bab_title,
        tuntas: false,
      }));

      // Jika tidak ada materi spesifik bulan ini, tampilkan semua materi topik
      const itemsToShow = materiItems.length ? materiItems : materiList.map(m => ({
        materi_id: m.id,
        label: [m.sub_title, m.topik, m.poin_title].filter(Boolean).join(' — ') || m.bab_title,
        tuntas: false,
      }));

      // Restore dari detail yang sudah ada
      const existingDetail = detailMap[key];
      if (existingDetail?.items) {
        itemsToShow.forEach(item => {
          const found = existingDetail.items.find(d => d.materi_id === item.materi_id);
          if (found) item.tuntas = found.tuntas;
        });
      }

      const currentNilai = nilaiMap[key] || null;
      const currentCatatan = catatanMap[key] || '';

      let el = document.getElementById('pnlDetailModal');
      if (!el) { el = document.createElement('div'); el.id = 'pnlDetailModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }

      function renderModal() {
        const tuntasCount = itemsToShow.filter(i => i.tuntas).length;
        const totalCount = itemsToShow.length;
        const pctTuntas = totalCount ? Math.round(tuntasCount / totalCount * 100) : 0;
        const autoNilai = pctTuntas >= 80 ? 'A' : pctTuntas >= 60 ? 'B' : pctTuntas >= 40 ? 'C' : totalCount ? 'D' : null;

        el.innerHTML = `<div class="modal" style="max-width:500px;">
          <div class="modal-head" style="background:var(--green);">
            <h3 class="modal-title" style="color:#fff;">${escHtml(santri?.nama||'')} — ${escHtml(topik)}</h3>
            <button class="modal-close" onclick="closeModal('pnlDetailModal')" style="color:#fff;">✕</button>
          </div>
          <div class="modal-body" style="max-height:60vh; overflow-y:auto;">
            <div style="font-size:12px; color:var(--ink-soft); margin-bottom:10px;">
              Bulan ${selectedBulan} · ${escHtml(kls?.jenjang||'')} Sem ${kls?.semester||''}
            </div>

            ${itemsToShow.length ? `
            <div id="pnl-progress" style="font-size:12px; font-weight:700; color:var(--green); margin-bottom:8px;">Target Materi (${tuntasCount}/${totalCount} tuntas — ${pctTuntas}%):</div>
            <div style="background:var(--bg); border-radius:8px; padding:4px 0; margin-bottom:12px;">
              ${itemsToShow.map((item, idx) => `
                <div id="pnl-item-${idx}" onclick="PNL_toggleItem(${idx})" style="display:flex; align-items:center; gap:8px; padding:7px 12px; cursor:pointer; border-bottom:1px solid var(--line);">
                  <div class="pnl-checkbox" style="width:22px; height:22px; border-radius:6px; flex-shrink:0;
                    border:2px solid ${item.tuntas?'var(--green)':'var(--line)'};
                    background:${item.tuntas?'var(--green)':'transparent'};
                    display:flex; align-items:center; justify-content:center;">
                    ${item.tuntas ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
                  </div>
                  <div class="pnl-label" style="font-size:12px; color:#111; ${item.tuntas?'':'opacity:.7;'}">${escHtml(item.label)}</div>
                </div>`).join('')}
            </div>` : '<div style="font-size:12px; color:var(--ink-soft); margin-bottom:12px;">Tidak ada detail materi untuk topik ini di bulan ${selectedBulan}.</div>'}

            <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
              <div style="font-size:12px; font-weight:700; color:var(--green);">Nilai:</div>
              ${['A','B','C','D'].map(n => `
                <div id="pnl-nbtn-${n}" onclick="PNL_setNilaiModal('${n}')" style="width:36px; height:32px; border-radius:8px; cursor:pointer; font-size:14px; font-weight:800;
                  background:${(currentNilai||autoNilai)===n ? NILAI_BG[n] : '#f5f5f5'};
                  color:${(currentNilai||autoNilai)===n ? NILAI_COLOR[n] : '#ccc'};
                  border:2px solid ${(currentNilai||autoNilai)===n ? NILAI_COLOR[n] : '#e5e5e5'};
                  display:flex; align-items:center; justify-content:center;">
                  ${n}
                </div>`).join('')}
              ${autoNilai && totalCount ? `<span id="pnl-auto" style="font-size:11px; color:var(--ink-soft);">Auto: ${autoNilai} (${pctTuntas}%)</span>` : ''}
            </div>

            <div class="form-group" style="margin-bottom:0;">
              <label style="font-size:12px;">Catatan</label>
              <input id="pnlCatatanInput" value="${escHtml(currentCatatan)}" placeholder="Catatan tambahan (opsional)" style="font-size:13px;">
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-outline" onclick="closeModal('pnlDetailModal')">Batal</button>
            <button class="btn btn-green" onclick="PNL_saveDetail(this.dataset.sid, this.dataset.topik)" data-sid="${santriId}" data-topik="${escHtml(topik)}">Simpan</button>
          </div>
        </div>`;
      }

      window.PNL_toggleItem = (idx) => {
        itemsToShow[idx].tuntas = !itemsToShow[idx].tuntas;
        // Update DOM langsung tanpa re-render
        const itemEl = document.getElementById('pnl-item-'+idx);
        if (itemEl) {
          const box = itemEl.querySelector('.pnl-checkbox');
          const label = itemEl.querySelector('.pnl-label');
          if (itemsToShow[idx].tuntas) {
            box.style.borderColor = 'var(--green)';
            box.style.background = 'var(--green)';
            box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>';
            if (label) label.style.opacity = '1';
          } else {
            box.style.borderColor = 'var(--line)';
            box.style.background = 'transparent';
            box.innerHTML = '';
            if (label) label.style.opacity = '.7';
          }
        }
        // Update progress & auto nilai
        const tuntasCount = itemsToShow.filter(i => i.tuntas).length;
        const totalCount = itemsToShow.length;
        const pctTuntas = totalCount ? Math.round(tuntasCount / totalCount * 100) : 0;
        const autoNilai = pctTuntas >= 80 ? 'A' : pctTuntas >= 60 ? 'B' : pctTuntas >= 40 ? 'C' : 'D';
        nilaiMap[key] = autoNilai;
        // Update progress text
        const progEl = document.getElementById('pnl-progress');
        if (progEl) progEl.textContent = `Target Materi (${tuntasCount}/${totalCount} tuntas — ${pctTuntas}%):`;
        const autoEl = document.getElementById('pnl-auto');
        if (autoEl) autoEl.textContent = `Auto: ${autoNilai} (${pctTuntas}%)`;
        // Update nilai buttons
        ['A','B','C','D'].forEach(n => {
          const btn = document.getElementById('pnl-nbtn-'+n);
          if (btn) {
            btn.style.background = autoNilai===n ? NILAI_BG[n] : '#f5f5f5';
            btn.style.color = autoNilai===n ? NILAI_COLOR[n] : '#ccc';
            btn.style.borderColor = autoNilai===n ? NILAI_COLOR[n] : '#e5e5e5';
          }
        });
      };

      window.PNL_setNilaiModal = (n) => {
        nilaiMap[key] = n;
        ['A','B','C','D'].forEach(v => {
          const btn = document.getElementById('pnl-nbtn-'+v);
          if (btn) {
            btn.style.background = n===v ? NILAI_BG[v] : '#f5f5f5';
            btn.style.color = n===v ? NILAI_COLOR[v] : '#ccc';
            btn.style.borderColor = n===v ? NILAI_COLOR[v] : '#e5e5e5';
          }
        });
      };

      window.PNL_saveDetail = (sid, tpk) => {
        const k2 = sid + '|' + tpk;
        detailMap[k2] = { items: itemsToShow };
        catatanMap[k2] = document.getElementById('pnlCatatanInput')?.value || '';
        unsavedChanges.add(k2);
        closeModal('pnlDetailModal');
        render();
      };

      renderModal();
      openModal('pnlDetailModal');
    };

    window.PNL_save = async () => {
      if (!unsavedChanges.size) { showToast('Tidak ada perubahan'); return; }
      const btn = document.getElementById('pnlSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
      const kls = myKelasList.find(k => k.id === selectedKelasId);
      let saved = 0, errors = 0;
      for (const key of unsavedChanges) {
        const [santriId, ...topikParts] = key.split('|');
        const topik = topikParts.join('|');
        const nilai = nilaiMap[key];
        if (nilai) {
          try {
            const payload = {
              santri_id: santriId, kelas_id: selectedKelasId,
              kelompok_id: myKelompokId || kls?.kelompok_id,
              bulan: selectedBulan, tahun_ajaran: ta,
              topik, nilai,
              detail: detailMap[key] || null,
              catatan: catatanMap[key] || null,
            };
            await SB.penilaian.upsert(payload);
            saved++;
          } catch(e) { errors++; console.error(e); }
        }
      }
      unsavedChanges.clear();
      if (saved > 0) {
        logActivity('ubah', 'Penilaian', `Menilai ${saved} data — kelas ${kls?.nama_kelas||'-'}, bulan ${selectedBulan} TA ${ta}`);
      }
      showToast(`${saved} penilaian tersimpan${errors ? ', '+errors+' gagal' : ''}`);
      render();
    };

    window.PNL_setKelas = async (id) => {
      selectedKelasId = id;
      main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
      await loadData();
      render();
    };

    window.PNL_setKelompok = async (id) => {
      myKelompokId = id;
      main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
      await loadKelasList();
      selectedKelasId = myKelasList.length ? myKelasList[0].id : null;
      unsavedChanges.clear();
      await loadData();
      render();
    };

    window.PNL_setBulan = async (b) => {
      selectedBulan = b;
      main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
      await loadData();
      render();
    };

    render();

  } else {
    // === REKAP MODE (desa/daerah) ===
    let kelompokList = App.cache.kelompok || [];
    if (isDesa) kelompokList = kelompokList.filter(k => k.desa_id === u.desa_id);

    async function loadRekapData() {
      const rekapData = {};
      await Promise.all(kelompokList.map(async klp => {
        const penilaian = await SB.penilaian.getByKelompok(klp.id, selectedBulan, ta) || [];
        const byNilai = { A:0, B:0, C:0, D:0 };
        const byTopik = {};
        penilaian.forEach(p => {
          if (p.nilai && byNilai[p.nilai] !== undefined) byNilai[p.nilai]++;
          if (!byTopik[p.topik]) byTopik[p.topik] = { A:0, B:0, C:0, D:0 };
          if (p.nilai) byTopik[p.topik][p.nilai]++;
        });
        rekapData[klp.id] = { total: penilaian.length, ...byNilai, byTopik };
      }));
      return rekapData;
    }

    let rekapData = await loadRekapData();

    function render() {
      const byDesa = {};
      kelompokList.forEach(k => {
        const dn = k.desa?.nama || DESA_NAMA_MAP[k.desa_id] || k.desa_id;
        if (!byDesa[dn]) byDesa[dn] = [];
        byDesa[dn].push(k);
      });

      const scopeLabel = isDesa ? (DESA_NAMA_MAP[u.desa_id]||'Desa') : 'Daerah Sidoarjo Utara';
      const allTotal = Object.values(rekapData).reduce((s,d) => s+d.total, 0);
      const allA = Object.values(rekapData).reduce((s,d) => s+d.A, 0);
      const allB = Object.values(rekapData).reduce((s,d) => s+d.B, 0);
      const allC = Object.values(rekapData).reduce((s,d) => s+d.C, 0);
      const allD = Object.values(rekapData).reduce((s,d) => s+d.D, 0);

      const bulanChips = [...SEM1_MONTHS, ...SEM2_MONTHS].map(m =>
        `<div onclick="PNL_setBulan('${m}')" style="padding:5px 10px; border-radius:16px; font-size:11px; font-weight:700; cursor:pointer; display:inline-block; margin:2px;
          background:${selectedBulan===m?'var(--green)':'var(--white)'}; color:${selectedBulan===m?'#fff':'var(--ink-soft)'}; border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
          ${m.slice(0,3)}${m===nowMonth?' ●':''}
        </div>`).join('');

      const desaCards = Object.entries(byDesa).map(([dn, klpList]) => {
        const rows = klpList.map((k) => {
          const d = rekapData[k.id] || { total:0, A:0, B:0, C:0, D:0, byTopik:{} };
          const topikEntries = Object.entries(d.byTopik||{});
          const topikRows = topikEntries.length ? topikEntries.map(([topik, v]) =>
            `<tr class="pnl-detail-${k.id}" style="display:none; background:#f9f9f6;">
              <td style="padding:3px 10px 3px 28px; font-size:11px; color:var(--ink-soft);">↳ ${escHtml(topik)}</td>
              <td style="text-align:center; font-size:11px;">${v.A+v.B+v.C+v.D}</td>
              <td style="text-align:center; font-size:11px; color:#1a6b3a;">${v.A||'—'}</td>
              <td style="text-align:center; font-size:11px; color:#2563eb;">${v.B||'—'}</td>
              <td style="text-align:center; font-size:11px; color:#ca8a04;">${v.C||'—'}</td>
              <td style="text-align:center; font-size:11px; color:#c0392b;">${v.D||'—'}</td>
            </tr>`
          ).join('') : `<tr class="pnl-detail-${k.id}" style="display:none; background:#f9f9f6;">
              <td colspan="6" style="padding:6px 10px 6px 28px; font-size:11px; color:var(--ink-soft); font-style:italic;">Belum ada nilai untuk bulan ini</td>
            </tr>`;
          return `<tr style="border-bottom:1px solid var(--line); cursor:pointer;" onclick="document.querySelectorAll('.pnl-detail-${k.id}').forEach(r=>r.style.display=r.style.display==='none'?'':'none')">
            <td style="padding:6px 10px; font-size:12.5px; font-weight:600;">${escHtml(k.nama)} <span style="font-size:10px;color:var(--ink-soft);">▼</span></td>
            <td style="text-align:center; font-size:12px; font-weight:700;">${d.total||'—'}</td>
            <td style="text-align:center; font-size:12px; font-weight:700; color:#1a6b3a;">${d.A||'—'}</td>
            <td style="text-align:center; font-size:12px; font-weight:700; color:#2563eb;">${d.B||'—'}</td>
            <td style="text-align:center; font-size:12px; font-weight:700; color:#ca8a04;">${d.C||'—'}</td>
            <td style="text-align:center; font-size:12px; font-weight:700; color:#c0392b;">${d.D||'—'}</td>
          </tr>
          ${topikRows}`;
        }).join('');

        return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
          <div style="background:var(--green); padding:10px 16px;">
            <div style="font-weight:800; font-size:14px; color:#fff;">🏘️ ${escHtml(dn)}</div>
          </div>
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--green);">
              <th style="padding:6px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok</th>
              <th style="padding:6px 4px; text-align:center; font-size:11px; color:#fff;">Total</th>
              <th style="padding:6px 4px; text-align:center; font-size:11px; color:#fff;">A</th>
              <th style="padding:6px 4px; text-align:center; font-size:11px; color:#fff;">B</th>
              <th style="padding:6px 4px; text-align:center; font-size:11px; color:#fff;">C</th>
              <th style="padding:6px 4px; text-align:center; font-size:11px; color:#fff;">D</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>`;
      }).join('');

      main.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Rekap Penilaian Generus</h1>
            <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(scopeLabel)} · Bulan ${selectedBulan} · TA ${ta}</p>
          </div>
        </div>
        <div class="stat-grid" style="margin-bottom:16px;">
          <div class="stat-card"><div class="stat-num">${allTotal}</div><div class="stat-label">Total Penilaian</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#1a6b3a;">${allA}</div><div class="stat-label">A Sangat Baik</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#2563eb;">${allB}</div><div class="stat-label">B Baik</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#ca8a04;">${allC}</div><div class="stat-label">C Cukup</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#c0392b;">${allD}</div><div class="stat-label">D Kurang</div></div>
        </div>
        <div style="margin-bottom:14px; display:flex; flex-wrap:wrap; gap:2px;">${bulanChips}</div>
        ${desaCards}
      `;
    }

    window.PNL_setBulan = async (b) => {
      selectedBulan = b;
      main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
      rekapData = await loadRekapData();
      render();
    };

    render();
  }
}

/* ===== PAGE: DATA BK ===== */
async function renderDataBK() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const isKelompok = ['pjp_kelompok','guru','kelompok','wali_kbm'].includes(u.role);

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const kelompokMap = Object.fromEntries((App.cache.kelompok||[]).map(k => [k.id, k]));
  const DESA_NAMA_MAP = await loadDesaMap();

  // Tentukan kelompok yang diproses
  let kelompokList = App.cache.kelompok || [];
  if (isDesa) kelompokList = kelompokList.filter(k => k.desa_id === u.desa_id);
  else if (isKelompok) kelompokList = kelompokList.filter(k => k.id === u.kelompok_id);

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  const nowMonth = currentMonthName();
  let selectedBulan = nowMonth;

  // Load data per kelompok
  const bkData = {}; // klpId → [{santri, kelas, pct, h, total}]
  const pertemuanCount = {}; // klpId → total pertemuan bulan ini (semua kelas, apapun hasil BK-nya)
  const pertemuanDetail = {}; // klpId → [{namaKelas, jenjang, count}] rincian per kelas
  async function loadBKData(bulan) {
    // Fase 1: kumpulkan kelas + pertemuan + santri per kelompok (paralel, belum ambil absensi)
    const klpMeta = await Promise.all(kelompokList.map(async klp => {
      let kelasList = sortKelas(await SB.kelas.getByKelompok(klp.id));
      if (klp.desa_id) {
        const gabungan = await SB.kelas.getByDesa(klp.desa_id) || [];
        kelasList = [...kelasList, ...gabungan.map(g => ({...g, _isGab: true}))];
      }
      const kelasMeta = await Promise.all(kelasList.map(async kls => {
        const ptList = (await SB.pertemuan.getByKelas(kls.id, getTahunAjaran())).filter(p => p.bulan === bulan);
        if (!ptList.length) return null;
        let santriList = await SB.santri.getByKelas(kls.id);
        if (kls._isGab) santriList = santriList.filter(s => s.kelompok_asal_id === klp.id);
        // Tetap dipertahankan meski santriList kosong — supaya jumlah pertemuan tidak hilang dari hitungan
        return { kls, ptList, santriList };
      }));
      return { klp, kelasMeta: kelasMeta.filter(Boolean) };
    }));

    // Fase 2: satu kali fetch absensi untuk SEMUA pertemuan sekaligus
    const allPtIds = klpMeta.flatMap(km => km.kelasMeta.flatMap(m => m.ptList.map(p => p.id)));
    const allAbs = await SB.absensi.getByPertemuanIds(allPtIds);
    const absByPt = {};
    allAbs.forEach(a => { (absByPt[a.pertemuan_id] ||= []).push(a); });

    // Fase 3: hitung dari data yang sudah ada di memori — tidak ada fetch lagi
    klpMeta.forEach(({ klp, kelasMeta }) => {
      bkData[klp.id] = [];
      pertemuanCount[klp.id] = kelasMeta.reduce((sum, m) => sum + m.ptList.length, 0);
      pertemuanDetail[klp.id] = kelasMeta.map(m => ({ namaKelas: m.kls.nama_kelas || m.kls.jenjang, jenjang: m.kls.jenjang, count: m.ptList.length }));
      kelasMeta.forEach(({ kls, ptList, santriList }) => {
        santriList.forEach(s => {
          let h = 0;
          ptList.forEach(p => {
            const a = (absByPt[p.id]||[]).find(x => x.santri_id === s.id);
            if (a?.status === 'H') h++;
          });
          const pct = Math.round(h / ptList.length * 100);
          if (pct < 50) {
            bkData[klp.id].push({
              santri: s, kelas: kls, pct, h, total: ptList.length,
              kelasNama: kls.nama_kelas || kls.jenjang,
            });
          }
        });
      });
    });
  }

  await loadBKData(selectedBulan);

  function render() {
    const bulanChips = `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">Semester 1 (Jul - Des):</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM1_MONTHS.map(m => `
            <div onclick="BK_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--rose)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--rose)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">Semester 2 (Jan - Jun):</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM2_MONTHS.map(m => `
            <div onclick="BK_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--rose)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--rose)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>`;

    // Hitung total
    const allBK = Object.values(bkData).flat();
    const totalL = allBK.filter(d => d.santri.jenis_kel === 'L').length;
    const totalP = allBK.filter(d => d.santri.jenis_kel === 'P').length;
    const totalAll = allBK.length;

    const scopeLabel = isKelompok ? (kelompokMap[u.kelompok_id]?.nama||'') : isDesa ? (DESA_NAMA_MAP[u.desa_id]||'Desa') : 'Daerah Sidoarjo Utara';

    let contentHtml = '';

    if (isKelompok) {
      // === Level Kelompok: detail per kelas ===
      const myBK = bkData[u.kelompok_id] || [];
      const byKelas = {};
      myBK.forEach(d => {
        const kn = d.kelasNama;
        if (!byKelas[kn]) byKelas[kn] = [];
        byKelas[kn].push(d);
      });

      contentHtml = Object.entries(byKelas).length ? Object.entries(byKelas).map(([kelasNama, list]) => `
        <div class="card" style="margin-bottom:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div class="fw-bold" style="color:var(--rose); font-size:14px;">🔴 ${escHtml(kelasNama)}</div>
            <span class="badge badge-rose">${list.length} generus</span>
          </div>
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--rose);">
              <th style="color:#fff; padding:6px; font-size:11px; width:30px;">No</th>
              <th style="color:#fff; padding:6px 8px; font-size:11px; text-align:left;">Nama</th>
              <th style="color:#fff; padding:6px; font-size:11px; text-align:center;">L/P</th>
              <th style="color:#fff; padding:6px; font-size:11px; text-align:center;">Pertemuan KBM</th>
              <th style="color:#fff; padding:6px 8px; font-size:11px; text-align:center;">Kehadiran</th>
            </tr></thead>
            <tbody>${list.map((d, i) => `<tr style="border-bottom:1px solid var(--line);">
              <td style="padding:5px 6px; font-size:12px; text-align:center;">${i+1}</td>
              <td style="padding:5px 8px; font-size:13px; font-weight:600; color:#111;">${escHtml(d.santri.nama)}</td>
              <td style="padding:5px 6px; font-size:12px; text-align:center; font-weight:700; color:${d.santri.jenis_kel==='L'?'#1a6b3a':'#a6483b'};">${d.santri.jenis_kel}</td>
              <td style="padding:5px 6px; font-size:12px; text-align:center;">${d.total}x</td>
              <td style="padding:5px 8px; font-size:12px; text-align:center; font-weight:800; color:var(--rose);">${d.pct}% (${d.h}/${d.total})</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>`).join('')
        : (kelompokList[0] && !pertemuanCount[kelompokList[0].id]
            ? '<div class="card" style="text-align:center; padding:24px;"><div style="font-size:24px; margin-bottom:8px;">📭</div><div style="font-size:14px; color:var(--ink-soft); font-weight:700;">Belum ada pertemuan di kelompok ini bulan ini.</div></div>'
            : '<div class="card" style="text-align:center; padding:24px;"><div style="font-size:24px; margin-bottom:8px;">✅</div><div style="font-size:14px; color:var(--green); font-weight:700;">Alhamdulillah, tidak ada generus di bawah 50% kehadiran bulan ini.</div></div>');
    } else {
      // === Level Desa/Daerah: jumlah per kelompok ===
      const byDesa = {};
      kelompokList.forEach(k => {
        const desaNama = k.desa?.nama || DESA_NAMA_MAP[k.desa_id] || k.desa_id;
        if (!byDesa[desaNama]) byDesa[desaNama] = [];
        byDesa[desaNama].push(k);
      });

      contentHtml = Object.entries(byDesa).map(([desaNama, klpList]) => {
        const desaBK = klpList.flatMap(k => bkData[k.id] || []);
        const desaL = desaBK.filter(d => d.santri.jenis_kel === 'L').length;
        const desaP = desaBK.filter(d => d.santri.jenis_kel === 'P').length;

        const rows = klpList.map(k => {
          const kb = bkData[k.id] || [];
          const kL = kb.filter(d => d.santri.jenis_kel === 'L').length;
          const kP = kb.filter(d => d.santri.jenis_kel === 'P').length;
          const ptmCount = pertemuanCount[k.id] || 0;
          const detail = pertemuanDetail[k.id] || [];
          const detailId = 'bkPtmDetail_' + k.id;
          return `<tr style="border-bottom:1px solid var(--line);">
            <td style="padding:6px 10px; font-size:12.5px; font-weight:600; color:#111;">${escHtml(k.nama)}</td>
            <td style="padding:6px 8px; text-align:center; font-size:12px; color:${ptmCount?'#111':'var(--ink-soft)'};">
              <span style="display:inline-flex; align-items:center; gap:4px; cursor:${detail.length?'pointer':'default'};" ${detail.length ? `onclick="BK_togglePtmDetail('${detailId}', this)"` : ''}>
                ${ptmCount ? ptmCount+'x' : '<i>belum ada</i>'}
                ${detail.length ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10" style="transition:transform .15s;"><polyline points="6 9 12 15 18 9"/></svg>' : ''}
              </span>
            </td>
            <td style="padding:6px 8px; text-align:center; font-size:13px; font-weight:700; color:${!ptmCount ? 'var(--ink-soft)' : (kb.length?'var(--rose)':'var(--green)')};">${!ptmCount ? '—' : (kb.length || '✅')}</td>
            <td style="padding:6px 8px; text-align:center; font-size:12px; color:#1a6b3a; font-weight:700;">${kL||'—'}</td>
            <td style="padding:6px 8px; text-align:center; font-size:12px; color:#a6483b; font-weight:700;">${kP||'—'}</td>
          </tr>
          ${detail.length ? `<tr id="${detailId}" style="display:none;"><td colspan="5" style="padding:0; background:var(--cream-2);">
            <div style="padding:8px 16px;">
              ${detail.map(d => `<div style="display:flex; justify-content:space-between; font-size:11.5px; padding:3px 0; color:var(--ink-soft);">
                <span>${escHtml(d.namaKelas)}</span><span style="font-weight:700;">${d.count}x</span>
              </div>`).join('')}
            </div>
          </td></tr>` : ''}`;
        }).join('');

        return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
          <div style="background:var(--rose); padding:10px 16px; display:flex; align-items:center; justify-content:space-between;">
            <div style="font-weight:800; font-size:14px; color:#fff;">🏘️ ${escHtml(desaNama)}</div>
            <div style="font-size:12px; color:rgba(255,255,255,.8);">${desaBK.length} generus (${desaL}L · ${desaP}P)</div>
          </div>
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--rose);">
              <th style="padding:6px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px; color:#fff;">Pertemuan KBM</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px; color:#fff;">BK</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px; color:#fff;">L</th>
              <th style="padding:6px 8px; text-align:center; font-size:11px; color:#fff;">P</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>`;
      }).join('');
    }

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data BK</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(scopeLabel)} · Bulan ${selectedBulan} · TA ${getTahunAjaran()}</p>
          <p style="font-size:12px; color:var(--ink-soft); margin-top:2px;">Generus dengan kehadiran di bawah 50%</p>
        </div>
      </div>

      <div style="background:var(--green-soft); border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:var(--green); line-height:1.6;">
        ℹ️ Persentase dihitung dari jumlah pertemuan yang <b>sudah dilaksanakan</b> bulan ini (kolom "Pertemuan KBM"), bukan dari target sebulan penuh. Kalau bulan berjalan baru mulai dan pertemuannya masih sedikit, angka persentase belum tentu mencerminkan pola kehadiran sebenarnya — perhatikan juga kolom "Pertemuan KBM" sebelum menyimpulkan.
      </div>

      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-num" style="color:var(--rose);">${totalAll}</div><div class="stat-label">Total BK</div></div>
        <div class="stat-card"><div class="stat-num" style="color:#1a6b3a;">${totalL}</div><div class="stat-label">Laki-laki</div></div>
        <div class="stat-card"><div class="stat-num" style="color:#a6483b;">${totalP}</div><div class="stat-label">Perempuan</div></div>
      </div>

      <div style="margin-bottom:16px;">${bulanChips}</div>

      ${contentHtml}
    `;
  }

  window.BK_togglePtmDetail = (id, el) => {
    const row = document.getElementById(id);
    if (!row) return;
    const buka = row.style.display === 'none';
    row.style.display = buka ? 'table-row' : 'none';
    const arrow = el.querySelector('svg');
    if (arrow) arrow.style.transform = buka ? 'rotate(180deg)' : 'rotate(0deg)';
  };

  window.BK_setBulan = async (b) => {
    selectedBulan = b;
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    await loadBKData(b);
    render();
  };

  render();
}

/* ===== PAGE: MONITORING MUSYAWARAH ===== */
async function renderMonitorMus() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const DESA_NAMA_MAP = await loadDesaMap();

  // Filter kelompok sesuai role
  let kelompokList = App.cache.kelompok || [];
  if (isDesa) {
    kelompokList = kelompokList.filter(k => k.desa_id === u.desa_id);
  } else if (u.kelompok_id) {
    kelompokList = kelompokList.filter(k => k.id === u.kelompok_id);
  }

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // Load semua musyawarah
  let allMus = [];
  if (isAdmin || isDaerah) {
    allMus = await SB.musyawarah.getAll() || [];
  } else {
    // Load per kelompok
    const results = await Promise.all(kelompokList.map(k => SB.musyawarah.getByKelompok(k.id)));
    allMus = results.filter(Boolean).flat();
  }

  const nowMonth = currentMonthName();
  let selectedBulan = nowMonth;

  async function render() {
    // Filter musyawarah by bulan DAN tahun (dari tanggal)
    const tahunFilter = getTahunAjaran(); // misal "2026/2027"
    const musBulan = allMus.filter(m => {
      if (!m.tanggal) return false;
      const d = new Date(m.tanggal);
      const bln = BULAN_NAMES_FULL[d.getMonth()];
      const thn = d.getFullYear();
      // Cek apakah tanggal masuk tahun ajaran yang sama
      const mTA = thn + '/' + (thn+1);
      const mTA2 = (thn-1) + '/' + thn;
      const bulanOk = bln === selectedBulan;
      const tahunOk = d.getMonth() >= 6 ? mTA === tahunFilter : mTA2 === tahunFilter;
      return bulanOk && tahunOk;
    });

    // Ambil data kehadiran (musyawarah_absensi) untuk musyawarah bulan ini
    const absensiMap = {}; // musyawarah_id -> { hadir, total, pct }
    await Promise.all(musBulan.map(async m => {
      try {
        const rows = await SB.musAbsensi.getByMusyawarah(m.id) || [];
        const hadir = rows.filter(r => r.status === 'H').length;
        absensiMap[m.id] = { hadir, total: rows.length, pct: rows.length ? Math.round(hadir/rows.length*100) : null };
      } catch(e) { absensiMap[m.id] = { hadir:0, total:0, pct:null }; }
    }));

    // Map: kelompok_id → { guru_generus: {tanggal,id}, unsur_5: {tanggal,id} }
    const statusMap = {};
    kelompokList.forEach(k => { statusMap[k.id] = { guru_generus: null, unsur_5: null }; });
    musBulan.forEach(m => {
      if (m.kelompok_id && statusMap[m.kelompok_id]) {
        if (m.level === 'guru_generus') statusMap[m.kelompok_id].guru_generus = { tanggal: m.tanggal, id: m.id };
        if (m.level === 'unsur_5') statusMap[m.kelompok_id].unsur_5 = { tanggal: m.tanggal, id: m.id };
      }
    });

    // Group by desa
    const byDesa = {};
    kelompokList.forEach(k => {
      const desaNama = k.desa?.nama || DESA_NAMA_MAP[k.desa_id] || k.desa_id;
      if (!byDesa[desaNama]) byDesa[desaNama] = [];
      byDesa[desaNama].push(k);
    });

    // Total stats
    const totalKlp = kelompokList.length;
    const guruDone = kelompokList.filter(k => statusMap[k.id]?.guru_generus).length;
    const unsurDone = kelompokList.filter(k => statusMap[k.id]?.unsur_5).length;

    // Bulan chips
    const bulanChips = `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:6px;">Semester 1 (Jul - Des):</div>
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
          ${SEM1_MONTHS.map(m => `
            <div onclick="MM_setBulan('${m}')"
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
            <div onclick="MM_setBulan('${m}')"
              style="padding:7px 4px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; text-align:center;
                background:${selectedBulan===m?'var(--green)':'var(--white)'};
                color:${selectedBulan===m?'#fff':'var(--ink-soft)'};
                border:1.5px solid ${selectedBulan===m?'var(--green)':'var(--line)'};">
              ${m.slice(0,3)}${m===nowMonth?' ●':''}
            </div>`).join('')}
        </div>
      </div>`;

    // Tabel per desa
    const desaCards = Object.entries(byDesa).map(([desaNama, klpList]) => {
      const guruDesaDone = klpList.filter(k => statusMap[k.id]?.guru_generus).length;
      const unsurDesaDone = klpList.filter(k => statusMap[k.id]?.unsur_5).length;

      const rows = klpList.map(k => {
        const st = statusMap[k.id];
        const guruOk = !!st.guru_generus;
        const unsurOk = !!st.unsur_5;
        const guruPct = guruOk ? absensiMap[st.guru_generus.id] : null;
        const unsurPct = unsurOk ? absensiMap[st.unsur_5.id] : null;
        return `<tr style="border-bottom:1px solid var(--line);">
          <td style="padding:7px 10px; font-size:12.5px; font-weight:600; color:#111;">${escHtml(k.nama)}</td>
          <td style="padding:7px 8px; text-align:center; font-size:12px; font-weight:700; color:${guruOk?'var(--green)':'var(--rose)'};">
            ${guruOk ? '✅ '+fmtDateShort(st.guru_generus.tanggal) + (guruPct && guruPct.pct!==null ? `<br><span style="font-size:10px; font-weight:600; color:var(--ink-soft);">👤 ${guruPct.hadir}/${guruPct.total} hadir (${guruPct.pct}%)</span>` : '') : '❌ Belum'}
          </td>
          <td style="padding:7px 8px; text-align:center; font-size:12px; font-weight:700; color:${unsurOk?'var(--green)':'var(--rose)'};">
            ${unsurOk ? '✅ '+fmtDateShort(st.unsur_5.tanggal) + (unsurPct && unsurPct.pct!==null ? `<br><span style="font-size:10px; font-weight:600; color:var(--ink-soft);">👤 ${unsurPct.hadir}/${unsurPct.total} hadir (${unsurPct.pct}%)</span>` : '') : '❌ Belum'}
          </td>
        </tr>`;
      }).join('');

      const pctGuru = klpList.length ? Math.round(guruDesaDone/klpList.length*100) : 0;
      const pctUnsur = klpList.length ? Math.round(unsurDesaDone/klpList.length*100) : 0;

      return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
        <div style="background:var(--green); padding:10px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
          <div style="font-weight:800; font-size:14px; color:#fff;">🏘️ ${escHtml(desaNama)}</div>
          <div style="font-size:11px; color:rgba(255,255,255,.8);">Guru: ${guruDesaDone}/${klpList.length} (${pctGuru}%) · 5 Unsur: ${unsurDesaDone}/${klpList.length} (${pctUnsur}%)</div>
        </div>
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
          <thead><tr style="background:var(--green);">
            <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok</th>
            <th style="padding:7px 8px; text-align:center; font-size:11px; color:#fff;">Mus. Guru Generus</th>
            <th style="padding:7px 8px; text-align:center; font-size:11px; color:#fff;">Mus. 5 Unsur</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr style="background:var(--green-soft); font-weight:700;">
              <td style="padding:7px 10px; font-size:12px; color:var(--green);">TOTAL</td>
              <td style="padding:7px 8px; text-align:center; font-size:12px; color:${pctGuru>=100?'var(--green)':'var(--rose)'};">${guruDesaDone}/${klpList.length} (${pctGuru}%)</td>
              <td style="padding:7px 8px; text-align:center; font-size:12px; color:${pctUnsur>=100?'var(--green)':'var(--rose)'};">${unsurDesaDone}/${klpList.length} (${pctUnsur}%)</td>
            </tr>
          </tbody>
        </table></div>
      </div>`;
    }).join('');

    // Ringkasan
    const pctGuruAll = totalKlp ? Math.round(guruDone/totalKlp*100) : 0;
    const pctUnsurAll = totalKlp ? Math.round(unsurDone/totalKlp*100) : 0;

    // Status PJP Desa (admin/daerah only)
    let desaMusHtml = '';
    let pjpDesaDone = 0;
    const totalDesa = Object.keys(DESA_NAMA_MAP).length;
    if (isAdmin || isDaerah) {
      const DESA_IDS = Object.keys(DESA_NAMA_MAP);
      const musPjpDesa = musBulan.filter(m => m.level === 'pjp_desa');
      const desaStatus = DESA_IDS.map(did => {
        const desaNama = DESA_NAMA_MAP[did] || did;
        const found = musPjpDesa.find(m => m.desa_id === did || m.desa_id === desaNama);
        return { id: did, nama: desaNama, tanggal: found?.tanggal || null, musId: found?.id || null };
      });
      pjpDesaDone = desaStatus.filter(d => d.tanggal).length;
      const pctPD = Math.round(pjpDesaDone/totalDesa*100);

      desaMusHtml = `
        <div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
          <div style="background:#1a5c3a; padding:10px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
            <div style="font-weight:800; font-size:14px; color:#fff;">🏛️ Musyawarah PJP Desa</div>
            <div style="font-size:11px; color:rgba(255,255,255,.8);">${pjpDesaDone}/${totalDesa} terlaksana (${pctPD}%)</div>
          </div>
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#1a5c3a;">
              <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Desa</th>
              <th style="padding:7px 8px; text-align:center; font-size:11px; color:#fff;">Mus. PJP Desa</th>
            </tr></thead>
            <tbody>
              ${desaStatus.map(d => {
                const pctInfo = d.musId ? absensiMap[d.musId] : null;
                return `<tr style="border-bottom:1px solid var(--line);">
                <td style="padding:7px 10px; font-size:12.5px; font-weight:600; color:#111;">${escHtml(d.nama)}</td>
                <td style="padding:7px 8px; text-align:center; font-size:12px; font-weight:700; color:${d.tanggal?'var(--green)':'var(--rose)'};">
                  ${d.tanggal ? '✅ '+fmtDateShort(d.tanggal) + (pctInfo && pctInfo.pct!==null ? `<br><span style="font-size:10px; font-weight:600; color:var(--ink-soft);">👤 ${pctInfo.hadir}/${pctInfo.total} hadir (${pctInfo.pct}%)</span>` : '') : '❌ Belum'}
                </td>
              </tr>`;
              }).join('')}
            </tbody>
          </table></div>
        </div>`;
    }

    const scopeLabel = isDesa ? (DESA_NAMA_MAP[u.desa_id]||'Desa') : 'Daerah Sidoarjo Utara';

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Monitoring Musyawarah</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(scopeLabel)} · Bulan ${selectedBulan} · TA ${getTahunAjaran()}</p>
        </div>
      </div>

      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card">
          <div class="stat-num" style="color:${pctGuruAll>=100?'var(--green)':pctGuruAll>=50?'#e6a817':'var(--rose)'};">${guruDone}/${totalKlp}</div>
          <div class="stat-label">Mus. Guru</div>
          <div style="font-size:11px; color:var(--ink-soft);">${pctGuruAll}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-num" style="color:${pctUnsurAll>=100?'var(--green)':pctUnsurAll>=50?'#e6a817':'var(--rose)'};">${unsurDone}/${totalKlp}</div>
          <div class="stat-label">Mus. 5 Unsur</div>
          <div style="font-size:11px; color:var(--ink-soft);">${pctUnsurAll}%</div>
        </div>
        ${(isAdmin||isDaerah) ? `<div class="stat-card">
          <div class="stat-num" style="color:${pjpDesaDone>=totalDesa?'var(--green)':pjpDesaDone>=3?'#e6a817':'var(--rose)'};">${pjpDesaDone}/${totalDesa}</div>
          <div class="stat-label">Mus. PJP Desa</div>
          <div style="font-size:11px; color:var(--ink-soft);">${Math.round(pjpDesaDone/totalDesa*100)}%</div>
        </div>` : ''}
        <div class="stat-card">
          <div class="stat-num" style="color:var(--rose);">${(totalKlp-guruDone)+(totalKlp-unsurDone)}</div>
          <div class="stat-label">Total Belum</div>
        </div>
      </div>

      <div style="margin-bottom:16px;">${bulanChips}</div>

      ${desaMusHtml}
      ${desaCards}
    `;
  }

  const BULAN_NAMES_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  window.MM_setBulan = async (b) => { selectedBulan = b; await render(); };

  await render();
}

/* ===== PAGE: DATA SARPRAS ===== */
async function renderSarpras() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const isPjp = u.role === 'pjp_kelompok';
  const canEdit = isAdmin || isPjp;
  const isRekap = isAdmin || isDaerah || isDesa;

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const kelompokMap = Object.fromEntries((App.cache.kelompok||[]).map(k => [k.id, k]));
  const DESA_NAMA_MAP = await loadDesaMap();

  const DEFAULT_ITEMS = ['Peraga Tilawati','Papan Peraga','White Board','Spidol','Penghapus','Dampar','Laptop SB','LCD Proyektor / TV Monitor','Layar Proyektor','Wifi'];

  async function getMasterItems() {
    try {
      const v = await SB.settings.get('sarpras_master_items');
      if (v) { const arr = JSON.parse(v); if (Array.isArray(arr) && arr.length) return arr; }
    } catch(e) {}
    return DEFAULT_ITEMS;
  }
  async function saveMasterItems(list) {
    await SB.settings.set('sarpras_master_items', JSON.stringify(list));
  }

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // Load data
  let allData = [];
  if (isAdmin || isDaerah) {
    allData = await SB.sarpras.getAll() || [];
  } else if (isDesa) {
    const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
    const results = await Promise.all(klpDesa.map(k => SB.sarpras.getByKelompok(k.id)));
    allData = results.filter(Boolean).flat();
  } else if (u.kelompok_id) {
    allData = await SB.sarpras.getByKelompok(u.kelompok_id) || [];
    // Auto-create item master jika belum ada
    if (!allData.length) {
      const masterItems = await getMasterItems();
      const batch = masterItems.map(item => ({
        kelompok_id: u.kelompok_id, nama_item: item.toUpperCase(),
        status: null, kondisi: null, keterangan: null, dibuat_oleh: u.id,
      }));
      for (const b of batch) {
        const r = await SB.sarpras.insert(b);
        if (r?.[0]) allData.push(r[0]); else allData.push({...b, id:'tmp_'+Date.now()+Math.random()});
      }
    }
  }

  function render() {
    if (isRekap) { renderRekap(); return; }
    // === PJP Kelompok view ===
    const klpNama = kelompokMap[u.kelompok_id]?.nama || u.kelompok_id;
    const rows = allData.map((d, i) => {
      const stIcon = d.status === 'Ada' ? '✅' : d.status === 'Tidak Ada' ? '❌' : '—';
      const stColor = d.status === 'Ada' ? 'var(--green)' : d.status === 'Tidak Ada' ? 'var(--rose)' : 'var(--ink-soft)';
      const kdIcon = d.kondisi === 'Baik' ? '🟢' : d.kondisi === 'Rusak' ? '🔴' : '';
      const kdColor = d.kondisi === 'Baik' ? 'var(--green)' : d.kondisi === 'Rusak' ? 'var(--rose)' : 'var(--ink-soft)';
      return `<tr style="border-bottom:1px solid var(--line);">
        <td style="padding:7px 6px; text-align:center; font-size:12px;">${i+1}</td>
        <td style="padding:7px 8px; font-size:13px; font-weight:600; color:#111;">${escHtml(d.nama_item)}</td>
        <td style="padding:7px 8px; text-align:center; font-size:12px; font-weight:700; color:${stColor};">${stIcon} ${escHtml(d.status||'—')}</td>
        <td style="padding:7px 8px; text-align:center; font-size:12px; font-weight:700; color:${kdColor};">${kdIcon} ${escHtml(d.kondisi||'—')}</td>
        <td style="padding:7px 8px; font-size:12px; color:#111;">${escHtml(d.keterangan||'')}</td>
        ${canEdit ? `<td style="padding:7px 4px; text-align:center;">
          <div style="display:flex; gap:3px; justify-content:center;">
            <button class="btn-icon" onclick="SP_edit('${d.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
            <button class="btn-icon danger" onclick="SP_hapus('${d.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
          </div>
        </td>` : ''}
      </tr>`;
    }).join('');

    const adaCount = allData.filter(d=>d.status==='Ada').length;
    const tidakAdaCount = allData.filter(d=>d.status==='Tidak Ada').length;
    const baikCount = allData.filter(d=>d.kondisi==='Baik').length;
    const rusakCount = allData.filter(d=>d.kondisi==='Rusak').length;

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data Sarana Prasarana</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(klpNama)} · ${allData.length} item</p>
        </div>
        ${canEdit ? '<button class="btn btn-green" onclick="SP_tambah()">+ Tambah Item</button>' : ''}
      </div>
      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-num" style="color:var(--green);">${adaCount}</div><div class="stat-label">Ada</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--rose);">${tidakAdaCount}</div><div class="stat-label">Tidak Ada</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--green);">${baikCount}</div><div class="stat-label">Baik</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--rose);">${rusakCount}</div><div class="stat-label">Rusak</div></div>
      </div>
      <div class="card" style="padding:0; overflow:hidden;">
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:500px;">
          <thead><tr style="background:var(--green);">
            <th style="color:#fff; padding:7px 6px; font-size:11px; width:35px;">No</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Item</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:center;">Status</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:center;">Kondisi</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Keterangan</th>
            ${canEdit ? '<th style="color:#fff; padding:7px 4px; font-size:11px; width:60px;">Aksi</th>' : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  // === REKAP (desa/daerah/admin) ===
  function renderRekap() {
    const scopeLabel = isDesa ? (DESA_NAMA_MAP[u.desa_id]||'Desa') : 'Daerah Sidoarjo Utara';

    // Masalah: rusak atau tidak ada
    const masalah = allData.filter(d => d.status === 'Tidak Ada' || d.kondisi === 'Rusak');
    const masalahByDesa = {};
    masalah.forEach(d => {
      const klp = kelompokMap[d.kelompok_id];
      const desaNama = klp?.desa?.nama || DESA_NAMA_MAP[klp?.desa_id] || '—';
      if (!masalahByDesa[desaNama]) masalahByDesa[desaNama] = [];
      masalahByDesa[desaNama].push({...d, klpNama: klp?.nama || d.kelompok_id});
    });

    const masalahHtml = masalah.length ? Object.entries(masalahByDesa).map(([desaNama, list]) => `
      <div class="card" style="margin-bottom:12px; padding:0; overflow:hidden;">
        <div style="background:var(--rose); padding:8px 16px;">
          <div style="font-weight:700; font-size:13px; color:#fff;">🏘️ ${escHtml(desaNama)} — ${list.length} item perlu perhatian</div>
        </div>
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
          <thead><tr style="background:var(--rose-soft);">
            <th style="padding:5px 8px; font-size:11px; text-align:left; color:#fff;">Kelompok</th>
            <th style="padding:5px 8px; font-size:11px; text-align:left; color:#fff;">Item</th>
            <th style="padding:5px 8px; font-size:11px; text-align:center; color:#fff;">Masalah</th>
            <th style="padding:5px 8px; font-size:11px; text-align:left; color:#fff;">Keterangan</th>
          </tr></thead>
          <tbody>${list.map(d => `<tr style="border-bottom:1px solid var(--line);">
            <td style="padding:5px 8px; font-size:12px; font-weight:600;">${escHtml(d.klpNama)}</td>
            <td style="padding:5px 8px; font-size:12px; color:#111;">${escHtml(d.nama_item)}</td>
            <td style="padding:5px 8px; font-size:12px; text-align:center; font-weight:700; color:var(--rose);">${d.status==='Tidak Ada'?'❌ Tidak Ada':'🔴 Rusak'}</td>
            <td style="padding:5px 8px; font-size:12px; color:#111;">${escHtml(d.keterangan||'')}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`).join('') : '<div class="card"><p style="color:var(--green); font-weight:600;">✅ Semua item dalam kondisi baik!</p></div>';

    // Data lengkap per kelompok — semua item (bukan cuma yg bermasalah), tampilan sama
    // kayak yg dilihat PJP Kelompok sendiri, tapi read-only (tanpa tombol edit/hapus)
    const kelompokScopeSarpras = isDesa
      ? (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id)
      : (App.cache.kelompok||[]);
    window.SP_lihatDetailKelompok = (kelompokId) => {
      const klp = kelompokMap[kelompokId];
      const items = allData.filter(d => d.kelompok_id === kelompokId).sort((a,b) => (a.nama_item||'').localeCompare(b.nama_item||''));
      let el = document.getElementById('spDetailModal');
      if (!el) { el = document.createElement('div'); el.id = 'spDetailModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
      el.innerHTML = `<div class="modal" style="max-width:600px;">
        <div class="modal-head"><h3 class="modal-title">📋 Sarpras — ${escHtml(klp?.nama||kelompokId)}</h3><button class="modal-close" onclick="closeModal('spDetailModal')">✕</button></div>
        <div class="modal-body">
          ${!items.length ? '<div style="text-align:center; padding:20px; color:var(--ink-soft); font-size:13px;">Belum ada data sarpras dari kelompok ini.</div>' : `
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--green);">
              <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Item</th>
              <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:center;">Status</th>
              <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:center;">Kondisi</th>
              <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Keterangan</th>
            </tr></thead>
            <tbody>${items.map(d => {
              const stIcon = d.status === 'Ada' ? '✅' : d.status === 'Tidak Ada' ? '❌' : '—';
              const stColor = d.status === 'Ada' ? 'var(--green)' : d.status === 'Tidak Ada' ? 'var(--rose)' : 'var(--ink-soft)';
              const kdIcon = d.kondisi === 'Baik' ? '🟢' : d.kondisi === 'Rusak' ? '🔴' : '';
              const kdColor = d.kondisi === 'Baik' ? 'var(--green)' : d.kondisi === 'Rusak' ? 'var(--rose)' : 'var(--ink-soft)';
              return `<tr style="border-bottom:1px solid var(--line);">
                <td style="padding:6px 8px; font-size:12.5px; font-weight:600;">${escHtml(d.nama_item)}</td>
                <td style="padding:6px 8px; text-align:center; font-size:12px; font-weight:700; color:${stColor};">${stIcon} ${escHtml(d.status||'—')}</td>
                <td style="padding:6px 8px; text-align:center; font-size:12px; font-weight:700; color:${kdColor};">${kdIcon} ${escHtml(d.kondisi||'—')}</td>
                <td style="padding:6px 8px; font-size:12px; color:#111;">${escHtml(d.keterangan||'')}</td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>`}
        </div>
        <div class="modal-foot"><button class="btn btn-outline" onclick="closeModal('spDetailModal')">Tutup</button></div>
      </div>`;
      openModal('spDetailModal');
    };
    const detailPerKelompokSarprasHtml = `
      <div class="card" style="margin-bottom:16px; padding:0; overflow:hidden;">
        <div style="background:var(--green); padding:10px 16px;">
          <div style="font-weight:700; font-size:14px; color:#fff;">📋 Data Lengkap per Kelompok</div>
        </div>
        <div>${kelompokScopeSarpras.map(k => {
          const jml = allData.filter(d => d.kelompok_id === k.id).length;
          return `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 16px; border-bottom:1px solid var(--line);">
            <div>
              <div style="font-size:13px; font-weight:600;">${escHtml(k.nama)}</div>
              <div style="font-size:11px; color:var(--ink-soft);">${jml} item</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="SP_lihatDetailKelompok('${k.id}')">Lihat Detail</button>
          </div>`;
        }).join('')}</div>
      </div>`;

    // Ringkasan per item
    const itemNames = [...new Set(allData.map(d => d.nama_item))].sort();
    const summaryRows = itemNames.map(item => {
      const list = allData.filter(d => d.nama_item === item);
      const ada = list.filter(d => d.status === 'Ada').length;
      const tidakAda = list.filter(d => d.status === 'Tidak Ada').length;
      const baik = list.filter(d => d.kondisi === 'Baik').length;
      const rusak = list.filter(d => d.kondisi === 'Rusak').length;
      const belum = list.filter(d => !d.status).length;
      return `<tr style="border-bottom:1px solid var(--line);">
        <td style="padding:5px 8px; font-size:12px; font-weight:600; color:#111;">${escHtml(item)}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px; color:var(--green); font-weight:700;">${ada}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px; color:var(--rose); font-weight:700;">${tidakAda}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px; color:var(--green); font-weight:700;">${baik}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px; color:var(--rose); font-weight:700;">${rusak}</td>
        <td style="padding:5px 8px; text-align:center; font-size:12px; color:var(--ink-soft);">${belum}</td>
      </tr>`;
    }).join('');

    // Count total kelompok yang sudah isi data
    const klpDiisi = [...new Set(allData.map(d => d.kelompok_id))].length;
    const totalKlp = isDesa ? (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id).length : (App.cache.kelompok||[]).length;

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rekap Sarana Prasarana</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(scopeLabel)} · ${klpDiisi}/${totalKlp} kelompok sudah mengisi</p>
        </div>
        ${isAdmin ? '<button class="btn btn-green" onclick="SP_tambahMaster()">+ Tambah Item Sarpras</button>' : ''}
      </div>
      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-num">${allData.length}</div><div class="stat-label">Total Item</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--green);">${allData.filter(d=>d.status==='Ada').length}</div><div class="stat-label">Ada</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--rose);">${allData.filter(d=>d.status==='Tidak Ada').length}</div><div class="stat-label">Tidak Ada</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--rose);">${allData.filter(d=>d.kondisi==='Rusak').length}</div><div class="stat-label">Rusak</div></div>
      </div>

      <div class="fw-bold" style="font-size:15px; color:var(--rose); margin-bottom:10px;">⚠️ Item Perlu Perhatian (${masalah.length})</div>
      ${masalahHtml}

      ${detailPerKelompokSarprasHtml}

      <div class="card" style="margin-top:16px; padding:0; overflow:hidden;">
        <div style="background:var(--green); padding:10px 16px;">
          <div style="font-weight:700; font-size:14px; color:#fff;">📊 Ringkasan per Item</div>
        </div>
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
          <thead><tr style="background:var(--green);">
            <th style="padding:7px 8px; font-size:11px; text-align:left; color:#fff;">Item</th>
            <th style="padding:7px 8px; font-size:11px; text-align:center; color:#fff;">✅ Ada</th>
            <th style="padding:7px 8px; font-size:11px; text-align:center; color:#fff;">❌ Tdk Ada</th>
            <th style="padding:7px 8px; font-size:11px; text-align:center; color:#fff;">🟢 Baik</th>
            <th style="padding:7px 8px; font-size:11px; text-align:center; color:#fff;">🔴 Rusak</th>
            <th style="padding:7px 8px; font-size:11px; text-align:center; color:#fff;">Belum Isi</th>
          </tr></thead>
          <tbody>${summaryRows}</tbody>
        </table></div>
      </div>`;
  }

  // === HANDLERS ===
  window.SP_tambah = () => openSarprasModal(null);
  window.SP_edit = (id) => openSarprasModal(allData.find(d=>d.id===id));
  window.SP_hapus = async (id) => {
    if (!confirm('Hapus item ini?')) return;
    await SB.sarpras.delete(id);
    allData = allData.filter(d=>d.id!==id);
    showToast('Dihapus'); render();
  };

  window.SP_tambahMaster = () => {
    let el = document.getElementById('spMasterModal');
    if (!el) { el = document.createElement('div'); el.id = 'spMasterModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Tambah Item Sarpras Baru</h3><button class="modal-close" onclick="closeModal('spMasterModal')">✕</button></div>
      <div class="modal-body">
        <div style="font-size:12px; color:var(--ink-soft); margin-bottom:10px;">Item ini akan otomatis muncul di semua 31 kelompok. Tiap kelompok tinggal isi status & kondisinya.</div>
        <div class="form-group"><label>Nama Item Baru *</label><input id="spmNama" placeholder="contoh: Meja Lipat"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('spMasterModal')">Batal</button>
        <button class="btn btn-green" id="spmSaveBtn">Tambahkan ke Semua Kelompok</button>
      </div>
    </div>`;

    document.getElementById('spmSaveBtn').onclick = async () => {
      const nama = document.getElementById('spmNama').value.trim().toUpperCase();
      if (!nama) { showToast('Nama item wajib diisi', true); return; }

      const master = await getMasterItems();
      if (master.some(m => m.toUpperCase() === nama)) { showToast('Item ini sudah ada di daftar master', true); return; }

      const btn = document.getElementById('spmSaveBtn');
      btn.disabled = true; btn.textContent = 'Menambahkan...';
      try {
        await saveMasterItems([...master, nama]);

        if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
        const existingKlpIds = new Set(allData.filter(d => d.nama_item === nama).map(d => d.kelompok_id));
        const targets = (App.cache.kelompok||[]).filter(k => !existingKlpIds.has(k.id));

        for (const k of targets) {
          const r = await SB.sarpras.insert({ kelompok_id: k.id, nama_item: nama, status: null, kondisi: null, keterangan: null, dibuat_oleh: u.id });
          if (r?.[0]) allData.push(r[0]);
        }

        showToast(`Item ditambahkan ke ${targets.length} kelompok`);
        closeModal('spMasterModal');
        render();
      } catch(e) {
        showToast('Gagal: ' + e.message, true);
      } finally {
        btn.disabled = false; btn.textContent = 'Tambahkan ke Semua Kelompok';
      }
    };

    openModal('spMasterModal');
  };

  function openSarprasModal(existing) {
    const p = existing;
    let el = document.getElementById('sarprasModal');
    if (!el) { el = document.createElement('div'); el.id = 'sarprasModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">${p?'Edit':'Tambah'} Item Sarpras</h3><button class="modal-close" onclick="closeModal('sarprasModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Nama Item *</label><input id="spNama" value="${escHtml(p?.nama_item||'')}" ${p?'readonly style="background:#f5f5f5;"':''}></div>
        <div class="form-row">
          <div class="form-group"><label>Status *</label>
            <select id="spStatus">
              <option value="">Pilih...</option>
              <option value="Ada" ${p?.status==='Ada'?'selected':''}>✅ Ada</option>
              <option value="Tidak Ada" ${p?.status==='Tidak Ada'?'selected':''}>❌ Tidak Ada</option>
            </select>
          </div>
          <div class="form-group"><label>Kondisi</label>
            <select id="spKondisi">
              <option value="-" ${!p?.kondisi||p?.kondisi==='-'?'selected':''}>—</option>
              <option value="Baik" ${p?.kondisi==='Baik'?'selected':''}>🟢 Baik</option>
              <option value="Rusak" ${p?.kondisi==='Rusak'?'selected':''}>🔴 Rusak</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Keterangan</label><input id="spKet" value="${escHtml(p?.keterangan||'')}" placeholder="Jumlah, merk, speed wifi, dll"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('sarprasModal')">Batal</button>
        <button class="btn btn-green" id="spSaveBtn">Simpan</button>
      </div>
    </div>`;

    document.getElementById('spSaveBtn').onclick = async () => {
      const nama = document.getElementById('spNama').value.trim().toUpperCase();
      const status = document.getElementById('spStatus').value;
      const kondisi = document.getElementById('spKondisi').value;
      const ket = document.getElementById('spKet').value.trim();
      if (!nama) { showToast('Nama item wajib diisi',true); return; }
      if (!status) { showToast('Status wajib dipilih',true); return; }

      // Jika status Tidak Ada, kondisi otomatis -
      const kondisiFinal = status === 'Tidak Ada' ? '-' : kondisi;

      const data = {
        kelompok_id: u.kelompok_id,
        nama_item: nama, status, kondisi: kondisiFinal,
        keterangan: ket || null, dibuat_oleh: u.id,
      };
      try {
        if (p) {
          await SB.sarpras.update(p.id, data);
          Object.assign(p, data);
        } else {
          const r = await SB.sarpras.insert(data);
          if (r?.[0]) allData.push(r[0]); else allData.push({...data, id:'tmp_'+Date.now()});
        }
        showToast('Tersimpan'); closeModal('sarprasModal'); render();
      } catch(e) { showToast('Gagal: '+e.message, true); }
    };
    openModal('sarprasModal');
  }

  render();
}

/* ===== PAGE: DATA MT/MS ===== */
async function renderMtMs() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const isPjp = u.role === 'pjp_kelompok';
  const canEdit = isAdmin || isPjp;

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const kelompokMap = Object.fromEntries((App.cache.kelompok||[]).map(k => [k.id, k]));

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // Load data sesuai role
  let allData = [];
  if (isAdmin || isDaerah) {
    allData = await SB.mtMs.getAll() || [];
  } else if (isDesa) {
    const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
    console.log('MT/MS desa load:', u.desa_id, 'kelompok:', klpDesa.map(k=>k.id+' '+k.nama));
    const results = await Promise.all(klpDesa.map(k => SB.mtMs.getByKelompok(k.id)));
    allData = results.filter(Boolean).flat();
    console.log('MT/MS loaded:', allData.length, 'records');
  } else if (u.kelompok_id) {
    allData = await SB.mtMs.getByKelompok(u.kelompok_id) || [];
  }

  const pendingHtml = isPjp && u.kelompok_id
    ? await renderPendingSection('mtms', 'kelompok', u.kelompok_id, FORM_CONFIGS.mtms, async (data) => {
        await SB.mtMs.insert({
          kelompok_id: u.kelompok_id, nama_lengkap: (data.nama_lengkap||'').toUpperCase(),
          gender: data.gender || null, tgl_lahir: data.tgl_lahir || null,
          dapukan: data.dapukan || null, no_hp: data.no_hp || null, dibuat_oleh: u.id,
        });
        return true;
      })
    : '';

  function fmtWa(no) {
    if (!no) return '';
    let n = no.replace(/\D/g,'');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return `<a href="https://wa.me/${n}" target="_blank" style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:var(--green); color:#fff; text-decoration:none;" title="${escHtml(no)}">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
    </a>`;
  }

  function hitungStatusMT(selesai) {
    if (!selesai) return { label: '—', cls: '', color: 'var(--ink-soft)' };
    const now = new Date();
    const end = new Date(selesai);
    const diffMs = end - now;
    const diffBln = diffMs / (1000*60*60*24*30);
    if (diffBln < 0) return { label: 'Habis', cls: 'rose', color: 'var(--rose)', icon: '🔴' };
    if (diffBln <= 3) return { label: Math.ceil(diffBln) + ' bln lagi', cls: 'gold', color: '#e6a817', icon: '⚠️' };
    return { label: Math.ceil(diffBln) + ' bln lagi', cls: 'green', color: 'var(--green)', icon: '🟢' };
  }

  function render() {
    // Summary
    const mtList = allData.filter(d => d.dapukan === 'MT');
    const msList = allData.filter(d => d.dapukan === 'MS');
    const mengajar = allData.filter(d => d.status_mengajar === 'Kelas Generus');
    const tidakAktif = allData.filter(d => d.status_mengajar === 'Tidak Aktif');
    const cL = (list) => list.filter(d => d.gender === 'L').length;
    const cP = (list) => list.filter(d => d.gender === 'P').length;

    // Alert MT segera habis / habis
    const mtSegeraHabis = mtList.filter(d => { const s = hitungStatusMT(d.tanggal_selesai_tugas); return s.cls === 'gold'; });
    const mtHabis = mtList.filter(d => { const s = hitungStatusMT(d.tanggal_selesai_tugas); return s.cls === 'rose'; });

    const alertHtml = (mtSegeraHabis.length || mtHabis.length) ? `
      ${mtHabis.length ? `<div class="card" style="border:2px solid var(--rose); background:var(--rose-soft); margin-bottom:12px;">
        <div class="fw-bold" style="color:var(--rose); font-size:14px; margin-bottom:8px;">🔴 MT Masa Tugas Habis (${mtHabis.length})</div>
        ${mtHabis.map(d => `<div style="font-size:13px; padding:3px 0; color:#111;">${escHtml(d.nama_lengkap)} — ${escHtml(kelompokMap[d.kelompok_id]?.nama||d.kelompok_id)} — selesai ${fmtDateShort(d.tanggal_selesai_tugas)}</div>`).join('')}
      </div>` : ''}
      ${mtSegeraHabis.length ? `<div class="card" style="border:2px solid var(--gold); background:#fffbf0; margin-bottom:12px;">
        <div class="fw-bold" style="color:#e6a817; font-size:14px; margin-bottom:8px;">⚠️ MT Segera Habis Masa Tugas (${mtSegeraHabis.length})</div>
        ${mtSegeraHabis.map(d => `<div style="font-size:13px; padding:3px 0; color:#111;">${escHtml(d.nama_lengkap)} — ${escHtml(kelompokMap[d.kelompok_id]?.nama||d.kelompok_id)} — selesai ${fmtDateShort(d.tanggal_selesai_tugas)}</div>`).join('')}
      </div>` : ''}` : '';

    // Group by kelompok for desa/daerah/admin
    const showGrouped = isAdmin || isDaerah || isDesa;
    let tabelHtml = '';

    function renderTable(list, showKlpCol) {
      if (!list.length) return '<div style="font-size:12px; color:var(--ink-soft); padding:8px;">Belum ada data.</div>';
      return `<div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:600px;">
        <thead><tr style="background:var(--green);">
          <th style="color:#fff; padding:7px 6px; font-size:11px;">No</th>
          <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Nama</th>
          <th style="color:#fff; padding:7px 6px; font-size:11px;">Lahir</th>
          <th style="color:#fff; padding:7px 4px; font-size:11px;">L/P</th>
          <th style="color:#fff; padding:7px 6px; font-size:11px;">MT/MS</th>
          <th style="color:#fff; padding:7px 8px; font-size:11px;">Status Mengajar</th>
          ${list[0]?.dapukan==='MT'||list.some(d=>d.dapukan==='MT') ? '<th style="color:#fff; padding:7px 6px; font-size:11px;">Masa Tugas</th>' : ''}
          <th style="color:#fff; padding:7px 4px; font-size:11px;">WA</th>
          ${canEdit ? '<th style="color:#fff; padding:7px 4px; font-size:11px; width:60px;">Aksi</th>' : ''}
        </tr></thead>
        <tbody>${list.map((d, i) => {
          const st = hitungStatusMT(d.tanggal_selesai_tugas);
          return `<tr style="border-bottom:1px solid var(--line);">
            <td style="padding:5px 6px; font-size:12px; text-align:center;">${i+1}</td>
            <td style="padding:5px 8px; font-size:13px; font-weight:600; color:#111;">${escHtml(d.nama_lengkap)}</td>
            <td style="padding:5px 6px; font-size:11px; text-align:center; color:#111;">${d.tgl_lahir ? fmtDateShort(d.tgl_lahir) : '—'}</td>
            <td style="padding:5px 4px; font-size:12px; text-align:center; font-weight:700; color:${d.gender==='L'?'#1a6b3a':'#a6483b'};">${d.gender||'—'}</td>
            <td style="padding:5px 6px; font-size:12px; text-align:center; font-weight:700; color:#111;">${d.dapukan||'—'}</td>
            <td style="padding:5px 8px; font-size:12px; color:#111;">${escHtml(d.status_mengajar||'—')}</td>
            ${list.some(x=>x.dapukan==='MT') ? `<td style="padding:5px 6px; font-size:11px; text-align:center;">
              ${d.dapukan==='MT' ? `<span style="color:${st.color}; font-weight:700;">${st.icon||''} ${st.label}</span>
                ${d.tanggal_selesai_tugas ? '<br><span style="font-size:10px; color:var(--ink-soft);">s/d '+fmtDateShort(d.tanggal_selesai_tugas)+'</span>' : ''}` : '—'}
            </td>` : ''}
            <td style="padding:5px 4px; text-align:center;">${fmtWa(d.no_hp)}</td>
            ${canEdit ? `<td style="padding:5px 4px; text-align:center;">
              <div style="display:flex; gap:3px; justify-content:center;">
                <button class="btn-icon" onclick="MTMS_edit('${d.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                <button class="btn-icon danger" onclick="MTMS_hapus('${d.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
              </div>
            </td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
    }

    if (showGrouped) {
      // Group by kelompok, then by desa
      const byDesa = {};
      allData.forEach(d => {
        const klp = kelompokMap[d.kelompok_id];
        const desaNama = klp?.desa?.nama || klp?.desa_id || '—';
        if (!byDesa[desaNama]) byDesa[desaNama] = {};
        const klpNama = klp?.nama || d.kelompok_id;
        if (!byDesa[desaNama][klpNama]) byDesa[desaNama][klpNama] = [];
        byDesa[desaNama][klpNama].push(d);
      });

      tabelHtml = Object.entries(byDesa).map(([desaNama, klpMap]) => {
        const klpCards = Object.entries(klpMap).map(([klpNama, list]) => `
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:13px; color:var(--green); margin-bottom:6px;">👥 ${escHtml(klpNama)} <span style="font-weight:400; color:var(--ink-soft);">(${list.length} orang)</span></div>
            ${renderTable(list, false)}
          </div>`).join('');

        return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
          <div style="background:var(--green); padding:10px 16px;">
            <div style="font-weight:800; font-size:14px; color:#fff;">🏘️ ${escHtml(desaNama)}</div>
          </div>
          <div style="padding:14px;">${klpCards}</div>
        </div>`;
      }).join('');
    } else {
      tabelHtml = `<div class="card">${renderTable(allData, false)}</div>`;
    }

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data MT / MS</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">Total ${allData.length} orang</p>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${isPjp && u.kelompok_id ? shareLinkButtonHtml('mtms', u.kelompok_id) : ''}
          <button class="btn btn-outline btn-sm" onclick="MTMS_downloadPdf()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PDF
          </button>
          ${canEdit ? '<button class="btn btn-green" onclick="MTMS_tambah()">+ Tambah MT/MS</button>' : ''}
        </div>
      </div>

      ${pendingHtml}

      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-num">${mtList.length}</div><div class="stat-label">MT</div><div style="font-size:11px; color:var(--ink-soft);"><span style="color:#1a6b3a;">${cL(mtList)}L</span> · <span style="color:#a6483b;">${cP(mtList)}P</span></div></div>
        <div class="stat-card"><div class="stat-num">${msList.length}</div><div class="stat-label">MS</div><div style="font-size:11px; color:var(--ink-soft);"><span style="color:#1a6b3a;">${cL(msList)}L</span> · <span style="color:#a6483b;">${cP(msList)}P</span></div></div>
        <div class="stat-card"><div class="stat-num">${mengajar.length}</div><div class="stat-label">Mengajar Generus</div><div style="font-size:11px; color:var(--ink-soft);"><span style="color:#1a6b3a;">${cL(mengajar)}L</span> · <span style="color:#a6483b;">${cP(mengajar)}P</span></div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--rose);">${tidakAktif.length}</div><div class="stat-label">Tidak Aktif</div><div style="font-size:11px; color:var(--ink-soft);"><span style="color:#1a6b3a;">${cL(tidakAktif)}L</span> · <span style="color:#a6483b;">${cP(tidakAktif)}P</span></div></div>
      </div>

      ${alertHtml}
      ${tabelHtml}
    `;
  }

  // === PDF MT/MS ===
  window.MTMS_downloadPdf = async () => {
    showToast('Menyiapkan PDF...');

    // Lazy load pdf-lib dari CDN — sebelumnya gak ada sama sekali di sini, jadi gagal
    // "PDFLib is not defined" kalau user belum pernah buka halaman lain yg udah muat pdf-lib duluan.
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
      }).catch(() => { showToast('Gagal memuat pustaka PDF dari internet — cek koneksi internet, lalu coba lagi', true); throw new Error('pdf-lib gagal dimuat'); });
    }

    try {
      showToast('Membuat PDF...');
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg = await doc.embedFont(StandardFonts.Helvetica);
      const ML = 40, MR = 40, W = 842 - ML - MR; // landscape A4
      const GREEN = rgb(0.1, 0.42, 0.18);
      const GRAY = rgb(0.4, 0.4, 0.4);
      const BLACK = rgb(0, 0, 0);

      let page = doc.addPage([842, 595]); // landscape
      let y = 555;
      function checkY(need) {
        if (y < need + 40) {
          page = doc.addPage([842, 595]);
          y = 555;
        }
      }

      // Title
      const scopeLabel = isDesa ? (DESA_NAMA_MAP_PDF[u.desa_id]||'Desa') : (isDaerah||isAdmin ? 'Daerah Sidoarjo Utara' : ((App.cache.kelompok||[]).find(k=>k.id===u.kelompok_id)?.nama||''));
      page.drawText('DATA MT / MS — ' + scopeLabel, { x: ML, y, font: fBold, size: 14, color: GREEN });
      y -= 16;
      // mtList/msList/mengajar/tidakAktif cuma ada di scope render() (fungsi tetangga) — dihitung
      // ulang di sini dari allData yg SAMA, bukan diakses langsung (beda scope, bakal ReferenceError).
      const mtListPdf = allData.filter(d => d.dapukan === 'MT');
      const msListPdf = allData.filter(d => d.dapukan === 'MS');
      const mengajarPdf = allData.filter(d => d.status_mengajar === 'Kelas Generus');
      const tidakAktifPdf = allData.filter(d => d.status_mengajar === 'Tidak Aktif');
      page.drawText('Total: ' + allData.length + ' orang | MT: ' + mtListPdf.length + ' | MS: ' + msListPdf.length + ' | Mengajar Generus: ' + mengajarPdf.length + ' | Tidak Aktif: ' + tidakAktifPdf.length, { x: ML, y, font: fReg, size: 8, color: GRAY });
      y -= 20;

      // Group by kelompok
      const byKlp = {};
      allData.forEach(d => {
        const klp = kelompokMap[d.kelompok_id];
        const klpNama = klp?.nama || d.kelompok_id;
        if (!byKlp[klpNama]) byKlp[klpNama] = [];
        byKlp[klpNama].push(d);
      });

      const colX = [ML, ML+25, ML+190, ML+255, ML+285, ML+325, ML+445, ML+550, ML+640];
      const colH = ['No','Nama Lengkap','Tgl Lahir','L/P','MT/MS','Status Mengajar','Mulai Tugas','Selesai','Status'];

      for (const [klpNama, list] of Object.entries(byKlp)) {
        checkY(40);
        page.drawText('Kelompok: ' + klpNama + ' (' + list.length + ' orang)', { x: ML, y, font: fBold, size: 10, color: GREEN });
        y -= 14;

        // Header
        checkY(16);
        colH.forEach((h, i) => page.drawText(h, { x: colX[i], y, font: fBold, size: 7, color: GREEN }));
        y -= 2;
        page.drawLine({ start:{x:ML,y}, end:{x:842-MR,y}, thickness:0.5, color:GREEN });
        y -= 10;

        list.forEach((d, idx) => {
          checkY(14);
          const st = hitungStatusMT(d.tanggal_selesai_tugas);
          const vals = [
            String(idx+1),
            (d.nama_lengkap||'').slice(0,28),
            d.tgl_lahir ? fmtDateShort(d.tgl_lahir) : '—',
            d.gender || '—',
            d.dapukan || '—',
            (d.status_mengajar||'—').slice(0,20),
            d.tanggal_mulai_tugas ? fmtDateShort(d.tanggal_mulai_tugas) : '—',
            d.tanggal_selesai_tugas ? fmtDateShort(d.tanggal_selesai_tugas) : '—',
            d.dapukan==='MT' ? st.label : '—',
          ];
          vals.forEach((v, i) => page.drawText(v, { x: colX[i], y, font: fReg, size: 7, color: BLACK }));
          y -= 12;
        });
        y -= 8;
      }

      // Footer
      doc.getPages().forEach((p, i) => {
        p.drawText('Halaman ' + (i+1) + '/' + doc.getPageCount() + ' — Data MT/MS — Dicetak: ' + new Date().toLocaleDateString('id-ID'), { x: ML, y: 20, font: fReg, size: 7, color: GRAY });
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj; a.download = 'Data_MT_MS_' + scopeLabel.replace(/ /g,'_') + '.pdf'; a.click();
      URL.revokeObjectURL(urlObj);
      showToast('PDF berhasil diunduh');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error(e);
    }
  };
  const DESA_NAMA_MAP_PDF = await loadDesaMap();

  // === HANDLERS ===
  window.MTMS_tambah = () => openMtMsModal(null);
  window.MTMS_edit = (id) => openMtMsModal(allData.find(d=>d.id===id));
  window.MTMS_hapus = async (id) => {
    if (!confirm('Hapus data MT/MS ini?')) return;
    try {
      await SB.mtMs.delete(id);
      allData = allData.filter(d=>d.id!==id);
      showToast('Dihapus'); render();
    } catch(e) { showToast('Gagal menghapus: ' + e.message, true); }
  };

  function openMtMsModal(existing) {
    const p = existing;
    const isMT = p?.dapukan === 'MT';
    const klpId = p?.kelompok_id || u.kelompok_id || '';

    // Auto hitung selesai +18 bulan
    const defaultMulai = p?.tanggal_mulai_tugas || new Date().toISOString().slice(0,10);
    const defaultSelesai = p?.tanggal_selesai_tugas || (() => {
      const d = new Date(defaultMulai);
      d.setMonth(d.getMonth() + 18);
      return d.toISOString().slice(0,10);
    })();

    const STATUS_OPTIONS = ['Kelas Generus','Pengajian Kelompok','Pengajian Ibu-Ibu','Tidak Aktif'];

    const formHtml = `
      <div class="form-group"><label>Nama Lengkap *</label><input id="mmNama" value="${escHtml(p?.nama_lengkap||'')}"></div>
      <div class="form-row">
        <div class="form-group"><label>Tanggal Lahir</label><input type="date" id="mmLahir" value="${p?.tgl_lahir||''}"></div>
        <div class="form-group"><label>Gender *</label>
          <select id="mmGender"><option value="">Pilih...</option><option value="L" ${p?.gender==='L'?'selected':''}>Laki-laki</option><option value="P" ${p?.gender==='P'?'selected':''}>Perempuan</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Dapukan *</label>
          <select id="mmDapukan" onchange="document.getElementById('mmMTFields').style.display=this.value==='MT'?'block':'none'">
            <option value="">Pilih...</option><option value="MT" ${p?.dapukan==='MT'?'selected':''}>MT</option><option value="MS" ${p?.dapukan==='MS'?'selected':''}>MS</option>
          </select>
        </div>
        <div class="form-group"><label>Status Mengajar *</label>
          <select id="mmStatus">${STATUS_OPTIONS.map(s=>`<option value="${s}" ${p?.status_mengajar===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
      </div>
      <div id="mmMTFields" style="display:${isMT||!p?'block':'none'};">
        <div class="form-row">
          <div class="form-group"><label>Mulai Tugas</label><input type="date" id="mmMulai" value="${defaultMulai}" onchange="MTMS_autoSelesai()"></div>
          <div class="form-group"><label>Selesai Tugas</label><input type="date" id="mmSelesai" value="${defaultSelesai}">
            <div style="font-size:10px; color:var(--ink-soft); margin-top:2px;">Otomatis +18 bulan, bisa diubah jika diperpanjang</div>
          </div>
        </div>
      </div>
      <div class="form-group"><label>No HP / WhatsApp</label><input id="mmHp" value="${escHtml(p?.no_hp||'')}" placeholder="contoh: 08123456789"></div>
    `;

    let el = document.getElementById('mtmsModal');
    if (!el) { el = document.createElement('div'); el.id = 'mtmsModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">${p?'Edit':'Tambah'} Data MT/MS</h3><button class="modal-close" onclick="closeModal('mtmsModal')">✕</button></div>
      <div class="modal-body">${formHtml}</div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('mtmsModal')">Batal</button>
        <button class="btn btn-green" id="mtmsSaveBtn">Simpan</button>
      </div>
    </div>`;

    window.MTMS_autoSelesai = () => {
      const mulai = document.getElementById('mmMulai').value;
      if (mulai) {
        const d = new Date(mulai);
        d.setMonth(d.getMonth() + 18);
        document.getElementById('mmSelesai').value = d.toISOString().slice(0,10);
      }
    };

    document.getElementById('mtmsSaveBtn').onclick = async () => {
      const nama = document.getElementById('mmNama').value.trim().toUpperCase();
      const gender = document.getElementById('mmGender').value;
      const dapukan = document.getElementById('mmDapukan').value;
      const status = document.getElementById('mmStatus').value;
      if (!nama || !gender || !dapukan) { showToast('Nama, Gender, dan Dapukan wajib diisi', true); return; }

      const data = {
        kelompok_id: klpId,
        nama_lengkap: nama,
        tgl_lahir: document.getElementById('mmLahir').value || null,
        gender, dapukan, status_mengajar: status,
        no_hp: document.getElementById('mmHp').value.trim() || null,
        tanggal_mulai_tugas: dapukan === 'MT' ? (document.getElementById('mmMulai').value || null) : null,
        tanggal_selesai_tugas: dapukan === 'MT' ? (document.getElementById('mmSelesai').value || null) : null,
        dibuat_oleh: u.id,
      };

      try {
        if (p) {
          await SB.mtMs.update(p.id, data);
          Object.assign(p, data);
        } else {
          const r = await SB.mtMs.insert(data);
          if (r?.[0]) allData.push(r[0]); else allData.push({...data, id: 'tmp_'+Date.now()});
        }
        showToast('Tersimpan'); closeModal('mtmsModal'); render();
      } catch(e) { showToast('Gagal: ' + e.message, true); }
    };

    openModal('mtmsModal');
  }

  render();
}

/* ===== PAGE: DATA GURU SEKOLAH ===== */
async function renderGuruSekolah() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const isPjp = u.role === 'pjp_kelompok';
  const isWaliKbm = u.role === 'wali_kbm';
  const canEdit = isAdmin || isPjp || isWaliKbm;

  const STATUS_OPTIONS = [
    { val: 'PNS', label: 'PNS (Pegawai Negeri Sipil)' },
    { val: 'PPPK', label: 'PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)' },
    { val: 'GTT', label: 'GTT (Guru Tidak Tetap)' },
    { val: 'GTY', label: 'GTY (Guru Tetap Yayasan)' },
  ];
  const PENDIDIKAN_OPTIONS = ['SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3'];
  const KOMPETENSI_OPTIONS = ['SD', 'SMP', 'SMK'];

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const kelompokMap = Object.fromEntries((App.cache.kelompok||[]).map(k => [k.id, k]));

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // Load data sesuai role
  let allData = [];
  if (isAdmin || isDaerah) {
    allData = await SB.guruSekolah.getAll() || [];
  } else if (isDesa) {
    const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
    const results = await Promise.all(klpDesa.map(k => SB.guruSekolah.getByKelompok(k.id)));
    allData = results.filter(Boolean).flat();
  } else if (u.kelompok_id) {
    allData = await SB.guruSekolah.getByKelompok(u.kelompok_id) || [];
  }

  const pendingHtml = (isPjp || isWaliKbm) && u.kelompok_id
    ? await renderPendingSection('guru_sekolah', 'kelompok', u.kelompok_id, FORM_CONFIGS.guru_sekolah, async (data) => {
        await SB.guruSekolah.insert({
          kelompok_id: u.kelompok_id, nama_lengkap: (data.nama_lengkap||'').toUpperCase(),
          gender: data.gender || null, tgl_lahir: data.tgl_lahir || null,
          status_kepegawaian: data.status_kepegawaian || null, pendidikan_terakhir: data.pendidikan_terakhir || null,
          program_studi: data.program_studi || null, kompetensi_mengajar: data.kompetensi_mengajar || null,
          penugasan_saat_ini: data.penugasan_saat_ini || null, no_wa: data.no_wa || null, dibuat_oleh: u.id,
        });
        return true;
      })
    : '';

  function fmtWa(no) {
    if (!no) return '—';
    let n = no.replace(/\D/g,'');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return `<a href="https://wa.me/${n}" target="_blank" style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:var(--green); color:#fff; text-decoration:none;" title="${escHtml(no)}">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
    </a>`;
  }

  function kompetensiChips(str) {
    if (!str) return '—';
    return str.split(',').filter(Boolean).map(k => `<span style="display:inline-block; padding:2px 7px; border-radius:20px; background:var(--green-soft,#eaf3ec); color:var(--green); font-size:10px; font-weight:700; margin:1px;">${escHtml(k)}</span>`).join(' ');
  }

  function render() {
    const cL = allData.filter(d => d.gender === 'L').length;
    const cP = allData.filter(d => d.gender === 'P').length;
    const countByStatus = Object.fromEntries(STATUS_OPTIONS.map(s => [s.val, allData.filter(d => d.status_kepegawaian === s.val).length]));

    const showGrouped = isAdmin || isDaerah || isDesa;
    let tabelHtml = '';

    function renderTable(list) {
      if (!list.length) return '<div style="font-size:12px; color:var(--ink-soft); padding:8px;">Belum ada data.</div>';
      return `<div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:800px;">
        <thead><tr style="background:var(--green);">
          <th style="color:#fff; padding:7px 6px; font-size:11px;">No</th>
          <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Nama</th>
          <th style="color:#fff; padding:7px 4px; font-size:11px;">L/P</th>
          <th style="color:#fff; padding:7px 6px; font-size:11px;">Lahir</th>
          <th style="color:#fff; padding:7px 6px; font-size:11px;">Status</th>
          <th style="color:#fff; padding:7px 8px; font-size:11px;">Pendidikan</th>
          <th style="color:#fff; padding:7px 8px; font-size:11px;">Kompetensi</th>
          <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Penugasan</th>
          <th style="color:#fff; padding:7px 4px; font-size:11px;">WA</th>
          ${canEdit ? '<th style="color:#fff; padding:7px 4px; font-size:11px; width:60px;">Aksi</th>' : ''}
        </tr></thead>
        <tbody>${list.map((d, i) => `<tr style="border-bottom:1px solid var(--line);">
            <td style="padding:5px 6px; font-size:12px; text-align:center;">${i+1}</td>
            <td style="padding:5px 8px; font-size:13px; font-weight:600; color:#111;">${escHtml(d.nama_lengkap)}</td>
            <td style="padding:5px 4px; font-size:12px; text-align:center; font-weight:700; color:${d.gender==='L'?'#1a6b3a':'#a6483b'};">${d.gender||'—'}</td>
            <td style="padding:5px 6px; font-size:11px; text-align:center; color:#111;">${d.tgl_lahir ? fmtDateShort(d.tgl_lahir) : '—'}</td>
            <td style="padding:5px 6px; font-size:12px; text-align:center; font-weight:700; color:#111;">${d.status_kepegawaian||'—'}</td>
            <td style="padding:5px 8px; font-size:12px; color:#111;">${escHtml(d.pendidikan_terakhir||'—')}${d.program_studi ? '<br><span style="font-size:10px; color:var(--ink-soft);">'+escHtml(d.program_studi)+'</span>' : ''}</td>
            <td style="padding:5px 8px; font-size:12px;">${kompetensiChips(d.kompetensi_mengajar)}</td>
            <td style="padding:5px 8px; font-size:12px; color:#111;">${escHtml(d.penugasan_saat_ini||'—')}</td>
            <td style="padding:5px 4px; text-align:center;">${fmtWa(d.no_wa)}</td>
            ${canEdit ? `<td style="padding:5px 4px; text-align:center;">
              <div style="display:flex; gap:3px; justify-content:center;">
                <button class="btn-icon" onclick="GS_edit('${d.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                <button class="btn-icon danger" onclick="GS_hapus('${d.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
              </div>
            </td>` : ''}
          </tr>`).join('')}</tbody>
      </table></div>`;
    }

    if (showGrouped) {
      const byDesa = {};
      allData.forEach(d => {
        const klp = kelompokMap[d.kelompok_id];
        const desaNama = klp?.desa?.nama || klp?.desa_id || '—';
        if (!byDesa[desaNama]) byDesa[desaNama] = {};
        const klpNama = klp?.nama || d.kelompok_id;
        if (!byDesa[desaNama][klpNama]) byDesa[desaNama][klpNama] = [];
        byDesa[desaNama][klpNama].push(d);
      });

      tabelHtml = Object.entries(byDesa).map(([desaNama, klpMap]) => {
        const klpCards = Object.entries(klpMap).map(([klpNama, list]) => `
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:13px; color:var(--green); margin-bottom:6px;">👥 ${escHtml(klpNama)} <span style="font-weight:400; color:var(--ink-soft);">(${list.length} orang)</span></div>
            ${renderTable(list)}
          </div>`).join('');

        return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
          <div style="background:var(--green); padding:10px 16px;">
            <div style="font-weight:800; font-size:14px; color:#fff;">🏘️ ${escHtml(desaNama)}</div>
          </div>
          <div style="padding:14px;">${klpCards}</div>
        </div>`;
      }).join('');
      if (!allData.length) tabelHtml = '<div class="card"><div style="font-size:12px; color:var(--ink-soft); padding:8px;">Belum ada data.</div></div>';
    } else {
      tabelHtml = `<div class="card">${renderTable(allData)}</div>`;
    }

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data Guru Sekolah</h1>
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">Total ${allData.length} orang</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${(isPjp || isWaliKbm) && u.kelompok_id ? shareLinkButtonHtml('guru_sekolah', u.kelompok_id) : ''}
          ${canEdit ? '<button class="btn btn-green" onclick="GS_tambah()">+ Tambah Guru</button>' : ''}
        </div>
      </div>

      ${pendingHtml}

      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-num">${allData.length}</div><div class="stat-label">Total Guru</div><div style="font-size:11px; color:var(--ink-soft);"><span style="color:#1a6b3a;">${cL}L</span> · <span style="color:#a6483b;">${cP}P</span></div></div>
        ${STATUS_OPTIONS.map(s => `<div class="stat-card"><div class="stat-num">${countByStatus[s.val]}</div><div class="stat-label">${s.val}</div></div>`).join('')}
      </div>

      ${tabelHtml}
    `;
  }

  // === HANDLERS ===
  window.GS_tambah = () => openGuruSekolahModal(null);
  window.GS_edit = (id) => openGuruSekolahModal(allData.find(d=>d.id===id));
  window.GS_hapus = async (id) => {
    if (!confirm('Hapus data guru ini?')) return;
    try {
      await SB.guruSekolah.delete(id);
      allData = allData.filter(d=>d.id!==id);
      showToast('Dihapus'); render();
    } catch(e) { showToast('Gagal menghapus: ' + e.message, true); }
  };

  function openGuruSekolahModal(existing) {
    const p = existing;
    const klpId = p?.kelompok_id || u.kelompok_id || '';
    const kompetensiSet = (p?.kompetensi_mengajar || '').split(',').filter(Boolean);

    const formHtml = `
      <div class="form-group"><label>Nama Lengkap *</label><input id="gsNama" value="${escHtml(p?.nama_lengkap||'')}"></div>
      <div class="form-row">
        <div class="form-group"><label>Gender *</label>
          <select id="gsGender"><option value="">Pilih...</option><option value="L" ${p?.gender==='L'?'selected':''}>Laki-laki</option><option value="P" ${p?.gender==='P'?'selected':''}>Perempuan</option></select>
        </div>
        <div class="form-group"><label>Tanggal Lahir</label><input type="date" id="gsLahir" value="${p?.tgl_lahir||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Status Kepegawaian *</label>
          <select id="gsStatus"><option value="">Pilih...</option>${STATUS_OPTIONS.map(s=>`<option value="${s.val}" ${p?.status_kepegawaian===s.val?'selected':''}>${escHtml(s.label)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Pendidikan Terakhir</label>
          <select id="gsPendidikan"><option value="">Pilih...</option>${PENDIDIKAN_OPTIONS.map(s=>`<option value="${s}" ${p?.pendidikan_terakhir===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Program Studi</label><input id="gsProdi" value="${escHtml(p?.program_studi||'')}" placeholder="contoh: Pendidikan Agama Islam"></div>
      <div class="form-group"><label>Kompetensi Mengajar</label>
        <div style="display:flex; gap:14px; flex-wrap:wrap; padding:6px 0;">
          ${KOMPETENSI_OPTIONS.map(k => `<label style="display:flex; align-items:center; gap:5px; font-size:13px; font-weight:500; color:#111;">
            <input type="checkbox" class="gsKomp" value="${k}" ${kompetensiSet.includes(k)?'checked':''}> ${k}
          </label>`).join('')}
        </div>
      </div>
      <div class="form-group"><label>Penugasan Saat Ini</label><input id="gsPenugasan" value="${escHtml(p?.penugasan_saat_ini||'')}" placeholder="contoh: SDN Sidoklumpuk 1"></div>
      <div class="form-group"><label>No WhatsApp</label><input id="gsWa" value="${escHtml(p?.no_wa||'')}" placeholder="contoh: 08123456789"></div>
    `;

    let el = document.getElementById('gsModal');
    if (!el) { el = document.createElement('div'); el.id = 'gsModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">${p?'Edit':'Tambah'} Data Guru Sekolah</h3><button class="modal-close" onclick="closeModal('gsModal')">✕</button></div>
      <div class="modal-body">${formHtml}</div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('gsModal')">Batal</button>
        <button class="btn btn-green" id="gsSaveBtn">Simpan</button>
      </div>
    </div>`;

    document.getElementById('gsSaveBtn').onclick = async () => {
      const nama = document.getElementById('gsNama').value.trim().toUpperCase();
      const gender = document.getElementById('gsGender').value;
      const status = document.getElementById('gsStatus').value;
      if (!nama || !gender || !status) { showToast('Nama, Gender, dan Status Kepegawaian wajib diisi', true); return; }
      const kompetensi = Array.from(document.querySelectorAll('.gsKomp:checked')).map(c => c.value).join(',');

      const data = {
        kelompok_id: klpId,
        nama_lengkap: nama,
        gender,
        tgl_lahir: document.getElementById('gsLahir').value || null,
        status_kepegawaian: status,
        pendidikan_terakhir: document.getElementById('gsPendidikan').value || null,
        program_studi: document.getElementById('gsProdi').value.trim() || null,
        kompetensi_mengajar: kompetensi || null,
        penugasan_saat_ini: document.getElementById('gsPenugasan').value.trim() || null,
        no_wa: document.getElementById('gsWa').value.trim() || null,
        dibuat_oleh: u.id,
      };

      try {
        if (p) {
          await SB.guruSekolah.update(p.id, data);
          Object.assign(p, data);
        } else {
          const r = await SB.guruSekolah.insert(data);
          if (r?.[0]) allData.push(r[0]); else allData.push({...data, id: 'tmp_'+Date.now()});
        }
        showToast('Tersimpan'); closeModal('gsModal'); render();
      } catch(e) { showToast('Gagal: ' + e.message, true); }
    };

    openModal('gsModal');
  }

  render();
}

/* ===== PAGE: USER TIDAK AKTIF (mingguan) ===== */
async function renderUserTidakAktif() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';

  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay(); // 0=Min,1=Sen,...6=Sab
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0,0,0,0);
    return date;
  }
  const thisMonday = getMonday(new Date());
  let weekOffset = -1; // -1 = minggu lalu (yang sudah lengkap), default tampil

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const DESA_NAMA_MAP = await loadDesaMapSingkat();

  async function loadData() {
    const weekStart = new Date(thisMonday); weekStart.setDate(weekStart.getDate() + weekOffset*7);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);

    const allUsers = await SB.anggota.getAll() || [];
    let scopedUsers = allUsers.filter(x => x.status === 'approved');
    if (isDesa) {
      const klpIds = new Set((App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id).map(k => k.id));
      scopedUsers = scopedUsers.filter(x => klpIds.has(x.kelompok_id));
    }

    const [logins, navs] = await Promise.all([
      SB.activityLog.getLoginsInRange(weekStart.toISOString(), weekEnd.toISOString()),
      SB.navLog.getInRange(weekStart.toISOString(), weekEnd.toISOString()),
    ]);
    const loginSet = new Set((logins||[]).map(r => r.user_id));
    const navSet = new Set((navs||[]).map(r => r.user_id));

    const takAktif = scopedUsers.filter(x => !loginSet.has(x.id) || !navSet.has(x.id))
      .map(x => ({ ...x, status_minggu: !loginSet.has(x.id) ? 'tidak_login' : 'login_saja' }));

    return { weekStart, weekEnd, takAktif };
  }

  function lokasiOf(x) {
    if (x.kelompok_id) {
      const klp = (App.cache.kelompok||[]).find(k => k.id === x.kelompok_id);
      return klp ? `${klp.nama} · ${klp.desa?.nama||''}` : x.kelompok_id;
    }
    if (x.desa_id) return 'Desa ' + (DESA_NAMA_MAP[x.desa_id] || x.desa_id);
    return '-';
  }

  function render(data) {
    const { weekStart, weekEnd, takAktif } = data;
    const weekEndDisplay = new Date(weekEnd); weekEndDisplay.setDate(weekEndDisplay.getDate() - 1);
    const isCurrentIncomplete = weekOffset >= 0;

    const rows = takAktif.map(x => `
      <tr style="border-bottom:1px solid var(--line);">
        <td style="padding:8px 10px; font-size:13px; font-weight:600;">${escHtml(x.nama_lengkap)}</td>
        <td style="padding:8px 10px; font-size:12px; color:var(--ink-soft);">${escHtml(ROLE_LABELS[x.role]||x.role)}</td>
        <td style="padding:8px 10px; font-size:12px; color:var(--ink-soft);">${escHtml(lokasiOf(x))}</td>
        <td style="padding:8px 10px; text-align:center;">
          ${x.status_minggu === 'tidak_login'
            ? '<span style="font-size:11px; font-weight:700; color:var(--rose); background:#fde8e8; padding:3px 8px; border-radius:10px;">Tidak Login</span>'
            : '<span style="font-size:11px; font-weight:700; color:#a67c00; background:#fff3d6; padding:3px 8px; border-radius:10px;">Login Saja</span>'}
        </td>
      </tr>`).join('');

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">User Tidak Aktif</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">User yang tidak login sama sekali, atau login tapi tidak buka menu apapun, dalam 1 minggu (Senin–Minggu)</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="UTA_ubahMinggu(-1)">← Minggu Sebelumnya</button>
        <div style="text-align:center; font-weight:700; color:var(--green); font-size:13px;">
          ${fmtDateShort(weekStart)} – ${fmtDateShort(weekEndDisplay)}
        </div>
        <button class="btn btn-outline btn-sm" onclick="UTA_ubahMinggu(1)" ${isCurrentIncomplete ? 'disabled style="opacity:.4;"' : ''}>Minggu Berikutnya →</button>
      </div>

      ${!takAktif.length ? `<div class="card" style="text-align:center; padding:36px 20px;">
        <div style="font-size:32px; margin-bottom:8px;">🎉</div>
        <div class="fw-bold">Semua User Aktif Minggu Ini</div>
        <div style="font-size:13px; color:var(--ink-soft); margin-top:4px;">Tidak ada user yang tidak login atau cuma login tanpa buka menu.</div>
      </div>` : `
      <div class="card" style="padding:0; overflow:hidden;">
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:500px;">
          <thead><tr style="background:var(--green);">
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff;">Nama</th>
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff;">Level</th>
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff;">Lokasi</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff;">Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`}
    `;
  }

  window.UTA_ubahMinggu = async (delta) => {
    const newOffset = weekOffset + delta;
    if (newOffset >= 0) return; // gak boleh lihat minggu yang belum selesai
    weekOffset = newOffset;
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    render(await loadData());
  };

  render(await loadData());
}

/* ===== PAGE: DATA JAMAAH ===== */
/* ===== PAGE: PENEROBOSAN PUSAT ===== */
const PENEROBOSAN_KATEGORI_MAP = {
  'Bayi': 'BALITA', 'PAUD/TK': 'CBR/PAUD-SD', 'Caberawit': 'CBR/PAUD-SD',
  'Pra Remaja': 'PRA REMAJA', 'Remaja': 'REMAJA', 'Pra Nikah': 'USIA NIKAH',
  'Dewasa': 'DEWASA', 'Istimewa': 'DEWASA',
};
const PENEROBOSAN_KATEGORI_ORDER = ['BALITA','CBR/PAUD-SD','PRA REMAJA','REMAJA','USIA NIKAH','DEWASA'];
const PENEROBOSAN_4S = ['Kyai','Wakil Kyai','Penerobos','Mubalegh','KU','Aghnia'];
const BULAN_LIST = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

/* ===== PAGE: NAMA SUB PENGAJIAN ===== */
/* ===== PAGE: ABSENSI PENGAJIAN (Pengajian Kelompok & Pengajian Sub Kelompok) ===== */
const PENGAJIAN_ELIGIBLE_KAT = ['Pra Remaja','Remaja','Pra Nikah','Dewasa','Istimewa'];
const PENGAJIAN_STATUS_LABEL = { H:'Hadir', S:'Sakit', I:'Izin', A:'Alpa' };
const PENGAJIAN_STATUS_COLOR = { H:'#1a6b3a', S:'#a67c00', I:'#1a5ba6', A:'#a6483b' };
function pengajianJenisLabel(j) { return j==='sub' ? 'Sub Pengajian' : j==='ibu_ibu' ? 'Ibu-Ibu Kelompok' : 'Kelompok'; }
// Bp./Ibu untuk yang sudah menikah, Sdra./Sdri. untuk yang belum — dipakai di tampilan Absensi Pengajian
function gelarNama(x) {
  const menikah = ['menikah','duda','janda'].includes(x.status_menikah);
  const prefix = x.jenis_kelamin === 'L' ? (menikah ? 'Bp. ' : 'Sdra. ') : (menikah ? 'Ibu ' : 'Sdri. ');
  return prefix + (x.nama || '');
}

async function renderAbsensiPengajian() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const canEdit = u.role === 'pjp_kelompok' || u.role === 'admin';
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  let jenis = 'kelompok';
  let selectedSubId = '';
  const subList = await SB.subPengajian.getByKelompok(u.kelompok_id) || [];
  let bulan = BULAN_LIST[new Date().getMonth()];
  let tahun = new Date().getFullYear();
  let pertemuanList = [];
  let currentPertemuanId = null;
  let jamaahEligible = [];
  let absensiMap = {};
  let viewMode = 'absen'; // 'absen' atau 'rekap'
  let riwayatOpen = true;
  let rekapBulanAwalIdx = Math.floor(new Date().getMonth() / 3) * 3; // default: kuartal berjalan (0,3,6,9)
  let rekapTahun = new Date().getFullYear();
  let rekapHtml = '';
  let rekapBawah50 = {}; // { 'Agustus 2026': [nama,...], ... }

  async function loadPertemuanList() {
    if (jenis === 'sub' && !selectedSubId) { pertemuanList = []; currentPertemuanId = null; return; }
    pertemuanList = await SB.pengajianPertemuan.getByKelompok(u.kelompok_id, jenis, selectedSubId, bulan, tahun) || [];
    currentPertemuanId = null;
    riwayatOpen = true;
  }
  let allJamaahKelompok = []; // dipakai jg utk cari peserta yang mau ditambah manual
  async function loadEligibleJamaah() {
    allJamaahKelompok = await SB.jamaah.getByKelompok(u.kelompok_id) || [];
    let base;

    if (jenis === 'ibu_ibu') {
      // Semua jamaah perempuan yang SUDAH/PERNAH MENIKAH (termasuk Janda) — dicek langsung
      // dari field status_menikah (bukan dari kategori usia, krn Istimewa/60+ bisa nutupin
      // status Dewasa meski udah nikah).
      base = allJamaahKelompok.filter(x => x.jenis_kelamin === 'P' && ['menikah','janda'].includes(x.status_menikah));
    } else {
      base = allJamaahKelompok.filter(x => PENGAJIAN_ELIGIBLE_KAT.includes(kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah)));

      // Santri yang cuma ada di Data Generus (belum pernah "Jadikan Santri" dari Data Jamaah,
      // jadi belum punya baris jamaah asli) tetap harus ikut ditawarkan di sini kalau usianya
      // masuk kriteria — dibikinkan "baris virtual" (persis pola yg sama dgn Data Jamaah),
      // supaya gak invisible cuma karena jalur masuknya beda (lewat Kelola Kelas Generus).
      // (Gak relevan buat Ibu-Ibu Kelompok — santri/kelas gak berlaku buat jamaah yg udah menikah.)
      const [santriKelompok, santriBelumMasukKelas] = await Promise.all([
        SB.santri.getByKelompok(u.kelompok_id) || [],
        SB.santri.getUnassigned(u.kelompok_id) || [],
      ]);
      const semuaSantriKelompok = [...(santriKelompok||[]), ...(santriBelumMasukKelas||[])];
      const santriIdSudahAdaJamaah = new Set(allJamaahKelompok.filter(x => x.santri_id).map(x => x.santri_id));
      semuaSantriKelompok.forEach(s => {
        if (santriIdSudahAdaJamaah.has(s.id)) return; // udah ada baris jamaah asli, gak usah didobel
        const kat = kategoriUsiaJamaah(s.tgl_lahir, null);
        if (!PENGAJIAN_ELIGIBLE_KAT.includes(kat)) return;
        base.push({
          id: 'virtual_santri_' + s.id, nama: s.nama, jenis_kelamin: s.jenis_kel, tgl_lahir: s.tgl_lahir,
          santri_id: s.id, status_menikah: null, keterangan: null, no_hp: null, _virtual: true,
        });
      });

      if (jenis === 'sub') base = base.filter(x => x.sub_pengajian_id === selectedSubId);
    }

    // Terapkan tambah/keluarkan manual (di luar kriteria otomatis)
    const overrides = (jenis === 'sub' && !selectedSubId) ? [] : await SB.pengajianOverride.getByScope(u.kelompok_id, jenis, selectedSubId) || [];
    const keluarIds = new Set(overrides.filter(o => o.tipe === 'keluar').map(o => o.jamaah_id));
    const tambahIds = overrides.filter(o => o.tipe === 'tambah').map(o => o.jamaah_id);
    let hasil = base.filter(x => !keluarIds.has(x.id));
    tambahIds.forEach(id => {
      if (!hasil.find(x => x.id === id)) {
        const x = allJamaahKelompok.find(a => a.id === id);
        if (x) hasil.push(x);
      }
    });

    jamaahEligible = await urutkanSesuaiKeluarga(hasil);
  }

  // Urutkan sesuai keluarga yang sudah ditautkan (pasangan berdampingan, anak yang tertaut
  // ikut nempel di bawah ortunya) — sama pola dengan Data Jamaah, cuma disederhanakan
  // krn semua yang muncul di sini sudah pasti usia Pra Remaja ke atas.
  async function urutkanSesuaiKeluarga(jamList) {
    if (!jamList.length) return jamList;
    const byId = new Map(jamList.map(x => [x.id, x]));
    // Santri lama yang ditautkan lewat santri_id (bukan anak_jamaah_id) tetap harus ketemu —
    // jamaah row-nya sendiri (kalau ada, dari "Jadikan Santri") yang punya x.santri_id itu.
    const santriIdToJamId = new Map(jamList.filter(x => x.santri_id).map(x => [x.santri_id, x.id]));
    // Baris "virtual" (santri yg belum punya jamaah asli) ID-nya bukan UUID asli — jangan
    // ikut dikirim ke query ini (cuma jamaah ASLI yg bisa jadi ortu/jamaah_id di tabel ini).
    const realIds = jamList.filter(x => !x._virtual).map(x => x.id);
    const links = await SB.jamaahKeluarga.getByJamaahIds(realIds) || [];
    const linksByParent = new Map();
    links.forEach(l => { (linksByParent.get(l.jamaah_id) || linksByParent.set(l.jamaah_id, []).get(l.jamaah_id)).push(l); });

    const processed = new Set();
    const families = [];
    const dewasaSorted = jamList.filter(x => ['Dewasa','Istimewa'].includes(kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah)))
      .sort((a,b) => (a.nama||'').localeCompare(b.nama||''));

    dewasaSorted.forEach(adult => {
      if (processed.has(adult.id)) return;
      const pasangan = adult.pasangan_id ? byId.get(adult.pasangan_id) : null;
      const anggota = (pasangan && !processed.has(pasangan.id))
        ? (adult.jenis_kelamin === 'L' ? [adult, pasangan] : [pasangan, adult])
        : [adult];
      anggota.forEach(a => processed.add(a.id));

      const childIds = new Set();
      anggota.forEach(a => (linksByParent.get(a.id)||[]).forEach(l => {
        if (l.anak_jamaah_id && byId.has(l.anak_jamaah_id)) childIds.add(l.anak_jamaah_id);
        else if (l.santri_id && santriIdToJamId.has(l.santri_id)) childIds.add(santriIdToJamId.get(l.santri_id));
      }));
      const anak = [...childIds].map(id => byId.get(id)).filter(Boolean)
        .sort((a,b) => (a.tgl_lahir||'9999-99-99').localeCompare(b.tgl_lahir||'9999-99-99'));
      anak.forEach(a => processed.add(a.id));

      families.push([...anggota, ...anak]);
    });

    const sisa = jamList.filter(x => !processed.has(x.id))
      .sort((a,b) => (a.tgl_lahir||'9999-99-99').localeCompare(b.tgl_lahir||'9999-99-99')); // urut usia tua ke muda

    return families.flat().concat(sisa);
  }

  async function loadDetail(pid) {
    currentPertemuanId = pid;
    await loadEligibleJamaah();
    absensiMap = {};
    if (pid) {
      const rows = await SB.pengajianAbsensi.getByPertemuan(pid) || [];
      rows.forEach(r => { absensiMap[r.jamaah_id] = r.status; });
    }
  }

  async function loadRekapData() {
    if (jenis === 'sub' && !selectedSubId) { rekapHtml = ''; return; }
    await loadEligibleJamaah();
    const bulanTiga = [0,1,2].map(i => {
      const idx = (rekapBulanAwalIdx + i) % 12;
      const tahunGeser = rekapTahun + Math.floor((rekapBulanAwalIdx + i) / 12);
      return { bulan: BULAN_LIST[idx], tahun: tahunGeser };
    });

    const perBulanData = await Promise.all(bulanTiga.map(async ({bulan: b, tahun: t}) => {
      const pList = await SB.pengajianPertemuan.getByKelompok(u.kelompok_id, jenis, selectedSubId, b, t) || [];
      const totalPtm = pList.length;
      const absensiPerOrang = {}; // jamaahId -> jumlah hadir
      if (totalPtm) {
        const allAbsensi = await Promise.all(pList.map(p => SB.pengajianAbsensi.getByPertemuan(p.id)));
        allAbsensi.flat().forEach(a => {
          if (a.status === 'H') absensiPerOrang[a.jamaah_id] = (absensiPerOrang[a.jamaah_id]||0) + 1;
        });
      }
      return { bulan: b, tahun: t, totalPtm, absensiPerOrang };
    }));

    rekapBawah50 = {};
    perBulanData.forEach(({bulan: b, tahun: t, totalPtm, absensiPerOrang}) => {
      const key = `${b} ${t}`;
      if (!totalPtm) { rekapBawah50[key] = null; return; } // belum ada pertemuan bulan itu
      rekapBawah50[key] = jamaahEligible.filter(x => {
        const pct = Math.round(((absensiPerOrang[x.id]||0) / totalPtm) * 100);
        return pct < 50;
      }).map(x => x.nama);
    });

    const totalKeseluruhan = perBulanData.reduce((s,d) => s + d.totalPtm, 0);
    const hadirKeseluruhan = jamaahEligible.reduce((sum, x) => {
      return sum + perBulanData.reduce((s,d) => s + (d.absensiPerOrang[x.id]||0), 0);
    }, 0);
    const pctKeseluruhan = totalKeseluruhan && jamaahEligible.length
      ? Math.round((hadirKeseluruhan / (totalKeseluruhan * jamaahEligible.length)) * 100) : 0;

    rekapHtml = `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; gap:20px; flex-wrap:wrap;">
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Rata-rata Kehadiran 3 Bulan</span><div style="font-size:22px; font-weight:800; color:${pctKeseluruhan<50?'var(--rose)':'var(--green)'};">${pctKeseluruhan}%</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Jumlah Jamaah</span><div style="font-size:22px; font-weight:800; color:var(--green);">${jamaahEligible.length}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Total Pertemuan (3 bulan)</span><div style="font-size:22px; font-weight:800; color:var(--green);">${totalKeseluruhan}</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:12.5px; margin-bottom:10px;">⚠️ Hadir di Bawah 50% per Bulan</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${perBulanData.map(d => {
            const key = `${d.bulan} ${d.tahun}`;
            const jml = rekapBawah50[key]?.length ?? 0;
            return `<button class="btn btn-outline btn-sm" onclick="PGJ_lihatBawah50('${key}')" ${rekapBawah50[key]===null?'disabled':''}>
              Hadir &lt; 50% — ${d.bulan.slice(0,3)} (${rekapBawah50[key]===null?'blm ada ptm':jml})
            </button>`;
          }).join('')}
        </div>
        <div id="pgjBawah50List" style="display:none; margin-top:12px; padding:12px; background:var(--cream-2); border-radius:8px; font-size:12.5px;"></div>
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
          <thead><tr style="background:var(--green);">
            <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Nama</th>
            ${perBulanData.map(d => `<th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">${d.bulan.slice(0,3)} ${d.tahun}${!d.totalPtm?' (blm ada ptm)':''}</th>`).join('')}
          </tr></thead>
          <tbody>${jamaahEligible.length ? jamaahEligible.map(x => `<tr style="border-bottom:1px solid var(--line);">
            <td style="padding:6px 10px; font-size:12.5px; font-weight:600;">${escHtml(gelarNama(x))}</td>
            ${perBulanData.map(d => {
              if (!d.totalPtm) return `<td style="padding:6px 10px; text-align:center; font-size:12px; color:var(--ink-soft);">-</td>`;
              const pct = Math.round(((d.absensiPerOrang[x.id]||0) / d.totalPtm) * 100);
              return `<td style="padding:6px 10px; text-align:center; font-size:12px; font-weight:700; color:${pct<50?'var(--rose)':'var(--ink)'};">${pct}%</td>`;
            }).join('')}
          </tr>`).join('') : `<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--ink-soft); font-size:12.5px;">${jenis==='sub' ? 'Belum ada generus yang ditandai masuk sub ini.' : jenis==='ibu_ibu' ? 'Belum ada jamaah perempuan yang sudah menikah di Data Jamaah.' : 'Belum ada generus usia Pra Remaja ke atas di Data Jamaah.'}</td></tr>`}</tbody>
        </table></div>
      </div>
    `;
  }

  function render() {
    const subNama = subList.find(s => s.id === selectedSubId)?.nama || '';
    const p = pertemuanList.find(x => x.id === currentPertemuanId);

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Absensi Pengajian</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Absensi Pengajian Kelompok & Pengajian Sub Kelompok — generus Pra Remaja s/d Istimewa</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
          <button class="btn ${jenis==='kelompok'?'btn-green':'btn-outline'} btn-sm" onclick="PGJ_gantiJenis('kelompok')">Pengajian Kelompok</button>
          <button class="btn ${jenis==='sub'?'btn-green':'btn-outline'} btn-sm" onclick="PGJ_gantiJenis('sub')">Pengajian Sub Kelompok</button>
          <button class="btn ${jenis==='ibu_ibu'?'btn-green':'btn-outline'} btn-sm" onclick="PGJ_gantiJenis('ibu_ibu')">👩 Pengajian Ibu-Ibu Klp</button>
          <span style="width:1px; background:var(--line); margin:0 2px;"></span>
          <button class="btn ${viewMode==='absen'?'btn-green':'btn-outline'} btn-sm" onclick="PGJ_gantiMode('absen')">📋 Absensi</button>
          <button class="btn ${viewMode==='rekap'?'btn-green':'btn-outline'} btn-sm" onclick="PGJ_gantiMode('rekap')">📊 Rekap Kehadiran</button>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          ${jenis==='sub' ? `<div class="form-group" style="margin:0;"><label style="font-size:11px;">Sub Pengajian</label>
            <select id="pgjSub" onchange="PGJ_gantiSub(this.value)">
              <option value="">Pilih sub...</option>
              ${subList.map(s => `<option value="${s.id}" ${s.id===selectedSubId?'selected':''}>${escHtml(s.nama)}</option>`).join('')}
            </select>
          </div>` : ''}
          ${viewMode==='absen' ? `
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Bulan</label>
            <select id="pgjBulan" onchange="PGJ_gantiPeriode()">${BULAN_LIST.map(b=>`<option value="${b}" ${b===bulan?'selected':''}>${b}</option>`).join('')}</select>
          </div>
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Tahun</label>
            <select id="pgjTahun" onchange="PGJ_gantiPeriode()">${[tahun-1,tahun,tahun+1].map(t=>`<option value="${t}" ${t===tahun?'selected':''}>${t}</option>`).join('')}</select>
          </div>
          ${canEdit && !(jenis==='sub' && !selectedSubId) ? `<div class="form-group" style="margin:0;"><label style="font-size:11px; visibility:hidden;">.</label><button class="btn btn-green" style="padding:10px 16px; font-size:13.5px; height:auto;" onclick="PGJ_buatBaru()">+ Pertemuan Baru</button></div>` : ''}
          ` : `
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Kuartal</label>
            <select id="pgjRekapBulan" onchange="PGJ_gantiRekapPeriode()">
              ${[[0,'Triwulan 1 (Jan–Mar)'],[3,'Triwulan 2 (Apr–Jun)'],[6,'Triwulan 3 (Jul–Sep)'],[9,'Triwulan 4 (Okt–Des)']].map(([idx,label])=>`<option value="${idx}" ${idx===rekapBulanAwalIdx?'selected':''}>${label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Tahun</label>
            <select id="pgjRekapTahun" onchange="PGJ_gantiRekapPeriode()">${[rekapTahun-1,rekapTahun,rekapTahun+1].map(t=>`<option value="${t}" ${t===rekapTahun?'selected':''}>${t}</option>`).join('')}</select>
          </div>
          <span style="font-size:11px; color:var(--ink-soft);">Rekap per triwulan (3 bulan kalender), selalu mulai dari Januari tiap tahun</span>
          `}
        </div>
        ${!subList.length && jenis==='sub' ? '<div style="margin-top:10px; font-size:12px; color:var(--rose);">Belum ada Sub Pengajian — buat dulu di menu "Nama Sub Pengajian".</div>' : ''}
      </div>

      ${jenis==='sub' && !selectedSubId ? '<div class="card" style="text-align:center; padding:24px; color:var(--ink-soft); font-size:13px;">Pilih Sub Pengajian dulu di atas.</div>' : (viewMode==='rekap' ? rekapHtml : `
      <div class="card sd-wrap ${riwayatOpen?'sd-open':''}" style="margin-bottom:14px; padding:0;">
        <div class="sd-trigger" onclick="PGJ_toggleRiwayat()" style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px;">
          <div>
            <div style="font-size:10.5px; color:var(--ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.03em;">Riwayat Pertemuan</div>
            <div style="font-size:13.5px; font-weight:700; color:var(--green);">${p ? `Pertemuan Ke-${p.pertemuan_ke||'?'} · ${fmtDateShort(p.tanggal)}` : (pertemuanList.length ? 'Pilih pertemuan...' : 'Belum ada pertemuan bulan ini')}</div>
          </div>
          <svg class="sd-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:var(--green);"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sd-panel">
          <div style="max-height:320px; overflow-y:auto; border-top:1px solid var(--line);">
            ${pertemuanList.length ? pertemuanList.map(x => `
              <div onclick="PGJ_pilihPertemuan('${x.id}')" style="padding:10px 14px; cursor:pointer; border-bottom:1px solid var(--line); background:${x.id===currentPertemuanId?'var(--green-soft)':'transparent'}; transition:background-color .25s cubic-bezier(.16,1,.3,1);">
                <span style="font-size:12.5px; font-weight:700;">Ke-${x.pertemuan_ke||'?'}</span>
                <span style="font-size:11px; color:var(--ink-soft); margin-left:8px;">${fmtDateShort(x.tanggal)}</span>
              </div>`).join('') : '<div style="padding:16px; font-size:12px; color:var(--ink-soft); text-align:center;">Belum ada pertemuan bulan ini.</div>'}
          </div>
        </div>
      </div>

        <div class="card">
          ${!currentPertemuanId ? '<div style="text-align:center; padding:30px; color:var(--ink-soft); font-size:13px;">Pilih pertemuan di atas, atau buat pertemuan baru.</div>' : `
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
              <div>
                <div class="fw-bold" style="font-size:14px;">Pertemuan Ke-${p?.pertemuan_ke||'?'} ${jenis==='sub'?'· '+escHtml(subNama):''}</div>
                <div style="font-size:12px; color:var(--ink-soft);">${jamaahEligible.length} orang · Terisi ${Object.keys(absensiMap).length}/${jamaahEligible.length}</div>
              </div>
              ${canEdit ? `<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="PGJ_kelolaPeserta()">👥 Kelola Peserta</button>
                <button class="btn btn-green btn-sm" onclick="PGJ_scanQR()">📷 Scan QR</button>
                <button class="btn btn-outline btn-sm" style="color:var(--rose); border-color:var(--rose);" onclick="PGJ_hapusPertemuan(this.dataset.ptmke)" data-ptmke="${p?.pertemuan_ke||'?'}">🗑️ Hapus Pertemuan</button>
              </div>` : ''}
            </div>
            <div class="form-group" style="margin-bottom:12px; max-width:220px;">
              <label style="font-size:11px;">📅 Tanggal Pertemuan</label>
              <input type="date" id="pgjTglInput" value="${p?.tanggal||''}" ${!canEdit?'disabled':''} style="border:1.5px solid var(--line); border-radius:var(--radius-sm); padding:9px 12px; font-size:13px; background:var(--white);">
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label style="font-size:11px;">📖 Materi Pengajian</label>
              <textarea id="pgjMateriInput" rows="2" placeholder="Materi apa saja yang dibahas di pertemuan ini..." ${!canEdit?'disabled':''}>${escHtml(p?.materi||'')}</textarea>
            </div>
            ${!jamaahEligible.length ? `<div style="text-align:center; padding:20px; color:var(--ink-soft); font-size:12.5px;">${jenis==='sub' ? 'Belum ada generus yang ditandai masuk sub ini di Data Jamaah.' : jenis==='ibu_ibu' ? 'Belum ada jamaah perempuan yang sudah menikah di Data Jamaah.' : 'Belum ada generus usia Pra Remaja ke atas di Data Jamaah.'}</div>` : `
            <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
              <thead><tr style="background:var(--green);">
                <th style="padding:6px 10px; text-align:left; font-size:11px; color:#fff;">Nama</th>
                <th style="padding:6px 10px; text-align:center; font-size:11px; color:#fff;">Status</th>
              </tr></thead>
              <tbody>${jamaahEligible.map(x => `<tr style="border-bottom:1px solid var(--line);">
                <td style="padding:6px 10px; font-size:12.5px; font-weight:600;">${escHtml(gelarNama(x))}</td>
                <td style="padding:6px 10px; text-align:center;">
                  <div style="display:flex; gap:4px; justify-content:center;">
                    ${['H','S','I','A'].map(st => `<button ${canEdit?`onclick="PGJ_setStatus('${x.id}','${st}')"`:'disabled'} style="width:30px; height:26px; border-radius:6px; border:1.5px solid ${absensiMap[x.id]===st?PENGAJIAN_STATUS_COLOR[st]:'var(--line)'}; background:${absensiMap[x.id]===st?PENGAJIAN_STATUS_COLOR[st]:'#fff'}; color:${absensiMap[x.id]===st?'#fff':PENGAJIAN_STATUS_COLOR[st]}; font-size:11px; font-weight:800; cursor:${canEdit?'pointer':'default'};">${st}</button>`).join('')}
                  </div>
                </td>
              </tr>`).join('')}</tbody>
            </table></div>
            ${canEdit ? `<button class="btn btn-green" style="width:100%; margin-top:14px; padding:10px;" id="pgjSaveBtn" onclick="PGJ_simpan()">💾 Simpan Semua Perubahan</button>` : ''}
            `}
          `}
        </div>`)}
    `;
  }

  window.PGJ_gantiJenis = async (j) => {
    jenis = j; selectedSubId = '';
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    if (viewMode === 'rekap') await loadRekapData(); else await loadPertemuanList();
    render();
  };
  window.PGJ_gantiSub = async (id) => {
    selectedSubId = id;
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    if (viewMode === 'rekap') await loadRekapData(); else await loadPertemuanList();
    render();
  };
  window.PGJ_gantiMode = async (mode) => {
    viewMode = mode;
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    if (mode === 'rekap') await loadRekapData(); else await loadPertemuanList();
    render();
  };
  window.PGJ_gantiRekapPeriode = async () => {
    rekapBulanAwalIdx = parseInt(document.getElementById('pgjRekapBulan').value);
    rekapTahun = parseInt(document.getElementById('pgjRekapTahun').value);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    await loadRekapData();
    render();
  };
  window.PGJ_lihatBawah50 = (key) => {
    const box = document.getElementById('pgjBawah50List');
    if (!box) return;
    const names = rekapBawah50[key] || [];
    box.style.display = 'block';
    box.innerHTML = `<b>Hadir &lt; 50% — ${escHtml(key)}:</b><br>${names.length ? escHtml(names.join(', ')) : 'Alhamdulillah, tidak ada yang di bawah 50% bulan ini.'}`;
  };
  window.PGJ_gantiPeriode = async () => {
    bulan = document.getElementById('pgjBulan').value;
    tahun = parseInt(document.getElementById('pgjTahun').value);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    await loadPertemuanList();
    render();
  };
  window.PGJ_toggleRiwayat = () => { riwayatOpen = !riwayatOpen; render(); };

  window.PGJ_pilihPertemuan = async (id) => {
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    await loadDetail(id);
    riwayatOpen = false; // tutup dropdown otomatis biar tabel dapet ruang penuh
    render();
  };
  window.PGJ_buatBaru = async () => {
    try {
      const tglBaru = new Date().toISOString().slice(0,10);
      const kePertemuan = pertemuanList.length + 1;
      const payload = {
        kelompok_id: u.kelompok_id, jenis, tanggal: tglBaru,
        bulan: new Date(tglBaru+'T00:00:00').toLocaleDateString('id-ID',{month:'long'}),
        tahun: new Date(tglBaru+'T00:00:00').getFullYear(),
        pertemuan_ke: kePertemuan, created_by: u.id,
      };
      if (jenis === 'sub') payload.sub_pengajian_id = selectedSubId;
      const res = await SB.pengajianPertemuan.insert(payload);
      const newId = res?.[0]?.id;
      logActivity('tambah', 'Absensi Pengajian', `Buat pertemuan ${pengajianJenisLabel(jenis)} ke-${kePertemuan}`);
      showToast('Pertemuan baru dibuat ✓');
      await loadPertemuanList();
      if (newId) { await loadDetail(newId); riwayatOpen = false; }
      render();
    } catch(e) { showToast('Gagal membuat pertemuan: ' + e.message, true); }
  };
  window.PGJ_kelolaPeserta = async () => {
    let el = document.getElementById('pgjPesertaModal');
    if (!el) { el = document.createElement('div'); el.id = 'pgjPesertaModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }

    async function renderModal() {
      const overrides = await SB.pengajianOverride.getByScope(u.kelompok_id, jenis, selectedSubId) || [];
      const keluarList = overrides.filter(o => o.tipe === 'keluar').map(o => ({ ...o, jamaah: allJamaahKelompok.find(x=>x.id===o.jamaah_id) })).filter(o=>o.jamaah);
      const tambahList = overrides.filter(o => o.tipe === 'tambah').map(o => ({ ...o, jamaah: allJamaahKelompok.find(x=>x.id===o.jamaah_id) })).filter(o=>o.jamaah);
      // Kandidat buat ditambah manual: semua jamaah kelompok yang BELUM ada di daftar peserta saat ini
      const currentIds = new Set(jamaahEligible.map(x=>x.id));
      const kandidatTambah = allJamaahKelompok.filter(x => !currentIds.has(x.id))
        .sort((a,b) => (a.nama||'').localeCompare(b.nama||''));

      el.innerHTML = `<div class="modal modal-lg">
        <div class="modal-head"><h3 class="modal-title">👥 Kelola Peserta — ${jenis==='sub' ? escHtml(subList.find(s=>s.id===selectedSubId)?.nama||'') : 'Pengajian Kelompok'}</h3><button class="modal-close" onclick="closeModal('pgjPesertaModal')">✕</button></div>
        <div class="modal-body">
          <div style="background:var(--green-soft); border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:var(--green);">
            Daftar peserta otomatis mengikuti kriteria ${jenis==='ibu_ibu' ? 'jamaah perempuan yang sudah menikah' : 'usia (Pra Remaja s/d Istimewa)'}${jenis==='sub'?' + Sub Pengajian yang ditandai di Data Jamaah':''}. Kalau ada yang perlu dikecualikan atau ditambahkan di luar itu, atur di sini.
          </div>

          <div class="fw-bold" style="font-size:12.5px; margin-bottom:8px;">+ Tambahkan Peserta di Luar Kriteria</div>
          <select id="pgjTambahSelect" style="width:100%; margin-bottom:8px;">
            <option value="">Pilih generus...</option>
            ${kandidatTambah.map(x => `<option value="${x.id}">${escHtml(gelarNama(x))} (${escHtml(kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah))})</option>`).join('')}
          </select>
          <button class="btn btn-green btn-sm" onclick="PGJ_tambahPeserta()" style="margin-bottom:16px;">+ Tambahkan</button>

          ${tambahList.length ? `<div class="fw-bold" style="font-size:12.5px; margin-bottom:6px; color:var(--green);">Peserta Tambahan Manual</div>
            ${tambahList.map(o => `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--line); font-size:12.5px;">
              <span>${escHtml(gelarNama(o.jamaah))}</span>
              <button class="btn-icon danger" onclick="PGJ_batalOverride('${o.id}')" title="Batalkan tambahan ini"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
            </div>`).join('')}
          <div style="margin-bottom:16px;"></div>` : ''}

          <div class="fw-bold" style="font-size:12.5px; margin-bottom:6px;">Keluarkan dari Peserta</div>
          <div style="max-height:200px; overflow-y:auto; border:1px solid var(--line); border-radius:6px; padding:6px 10px; margin-bottom:10px;">
            ${jamaahEligible.length ? jamaahEligible.map(x => `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--line); font-size:12.5px;">
              <span>${escHtml(gelarNama(x))}</span>
              ${x._virtual ? '<span style="font-size:10px; color:var(--ink-soft); font-style:italic;">Data Santri</span>' : `<button class="btn-icon danger" onclick="PGJ_keluarkanPeserta('${x.id}','${escHtml(x.nama)}')" title="Keluarkan dari daftar peserta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`}
            </div>`).join('') : '<div style="font-size:12px; color:var(--ink-soft); padding:6px 0;">Belum ada peserta.</div>'}
          </div>

          ${keluarList.length ? `<div class="fw-bold" style="font-size:12.5px; margin-bottom:6px; color:var(--rose);">Sudah Dikeluarkan</div>
            ${keluarList.map(o => `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--line); font-size:12.5px;">
              <span style="color:var(--ink-soft); text-decoration:line-through;">${escHtml(gelarNama(o.jamaah))}</span>
              <button class="btn btn-outline btn-sm" onclick="PGJ_batalOverride('${o.id}')">Masukkan Lagi</button>
            </div>`).join('')}` : ''}
        </div>
        <div class="modal-foot"><button class="btn btn-outline" onclick="closeModal('pgjPesertaModal')">Tutup</button></div>
      </div>`;
    }

    window.PGJ_tambahPeserta = async () => {
      const jamaahId = document.getElementById('pgjTambahSelect').value;
      if (!jamaahId) { showToast('Pilih generus dulu', true); return; }
      try {
        await SB.pengajianOverride.insert({
          kelompok_id: u.kelompok_id, jenis, sub_pengajian_id: jenis==='sub'?selectedSubId:null,
          jamaah_id: jamaahId, tipe: 'tambah',
        });
        showToast('Peserta ditambahkan ✓');
        await loadEligibleJamaah();
        await renderModal();
        render();
      } catch(e) { showToast('Gagal menambah: ' + e.message, true); }
    };
    window.PGJ_keluarkanPeserta = async (jamaahId, nama) => {
      if (!confirm(`Keluarkan "${nama}" dari daftar peserta ${jenis==='sub'?'Sub Pengajian ini':'Pengajian '+pengajianJenisLabel(jenis)}?`)) return;
      try {
        await SB.pengajianOverride.insert({
          kelompok_id: u.kelompok_id, jenis, sub_pengajian_id: jenis==='sub'?selectedSubId:null,
          jamaah_id: jamaahId, tipe: 'keluar',
        });
        showToast('Peserta dikeluarkan');
        await loadEligibleJamaah();
        await renderModal();
        render();
      } catch(e) { showToast('Gagal mengeluarkan: ' + e.message, true); }
    };
    window.PGJ_batalOverride = async (overrideId) => {
      try {
        await SB.pengajianOverride.delete(overrideId);
        showToast('Berhasil diubah ✓');
        await loadEligibleJamaah();
        await renderModal();
        render();
      } catch(e) { showToast('Gagal: ' + e.message, true); }
    };

    await renderModal();
    openModal('pgjPesertaModal');
  };

  window.PGJ_scanQR = async () => {
    if (!currentPertemuanId) { showToast('Pilih pertemuan dulu', true); return; }
    if (!window.jsQR) {
      showToast('Menyiapkan pemindai...');
      try {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';
          s.onload = res; s.onerror = () => {
            const s2 = document.createElement('script');
            s2.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
            s2.onload = res; s2.onerror = () => rej(new Error('Gagal memuat pustaka pemindai dari internet — cek koneksi internet, lalu coba lagi'));
            document.head.appendChild(s2);
          };
          document.head.appendChild(s);
        });
      } catch(e) { showToast(e.message, true); return; }
    }

    let el = document.getElementById('pgjScanModal');
    if (!el) { el = document.createElement('div'); el.id = 'pgjScanModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal" style="max-width:420px;">
      <div class="modal-head"><h3 class="modal-title">📷 Scan QR Kehadiran</h3><button class="modal-close" onclick="PGJ_tutupScan()">✕</button></div>
      <div class="modal-body">
        <video id="pgjScanVideo" style="width:100%; border-radius:8px; background:#000;" playsinline></video>
        <canvas id="pgjScanCanvas" style="display:none;"></canvas>
        <div id="pgjScanStatus" style="margin-top:10px; padding:10px 12px; border-radius:8px; background:var(--cream-2); font-size:13px; text-align:center; min-height:20px;">Arahkan kamera ke kartu QR...</div>
      </div>
      <div class="modal-foot"><button class="btn btn-outline" onclick="PGJ_tutupScan()">Selesai</button></div>
    </div>`;
    openModal('pgjScanModal');

    const video = document.getElementById('pgjScanVideo');
    const canvas = document.getElementById('pgjScanCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('pgjScanStatus');
    let stream = null;
    let scanning = true;
    let lastScannedId = null, lastScannedAt = 0;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      await video.play();
    } catch(e) {
      statusEl.textContent = '❌ Gagal mengakses kamera: ' + e.message;
      return;
    }

    function tick() {
      if (!scanning) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          const now = Date.now();
          if (code.data !== lastScannedId || now - lastScannedAt > 3000) {
            lastScannedId = code.data; lastScannedAt = now;
            handleScan(code.data);
          }
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    function handleScan(jamaahId) {
      const orang = jamaahEligible.find(x => x.id === jamaahId);
      if (!orang) {
        statusEl.style.background = '#fbe4e4'; statusEl.style.color = 'var(--rose)';
        statusEl.textContent = '⚠️ Kartu ini bukan peserta di pertemuan ini';
        return;
      }
      absensiMap[orang.id] = 'H';
      statusEl.style.background = 'var(--green-soft)'; statusEl.style.color = 'var(--green)';
      statusEl.textContent = `✅ ${gelarNama(orang)} — Hadir`;
      // Simpan langsung ke DB tiap scan biar gak ketinggalan kalau lupa klik Simpan
      SB.pengajianAbsensi.upsertBulk([{ pertemuan_id: currentPertemuanId, jamaah_id: orang.id, status: 'H' }]).catch(()=>{});
    }

    window.PGJ_tutupScan = () => {
      scanning = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      closeModal('pgjScanModal');
      render(); // refresh tampilan grid H/S/I/A biar sinkron sama hasil scan
    };
  };

  window.PGJ_hapusPertemuan = async (pertemuanKe) => {
    const p = pertemuanList.find(x => x.id === currentPertemuanId);
    if (!p) return;
    if (!confirm(`Hapus pertemuan ke-${pertemuanKe} (${fmtDateShort(p.tanggal)}) beserta SEMUA data absensinya?\n\nIni tidak bisa dibatalkan — cocok dipakai kalau ini cuma data uji coba.`)) return;
    try {
      await SB.pengajianPertemuan.delete(currentPertemuanId);
      logActivity('hapus', 'Absensi Pengajian', `Hapus pertemuan ke-${pertemuanKe} (${pengajianJenisLabel(jenis)})`);
      showToast('Pertemuan dihapus');
      currentPertemuanId = null;
      await loadPertemuanList();
      render();
    } catch(e) { showToast('Gagal menghapus: ' + e.message, true); }
  };

  window.PGJ_setStatus = (jamaahId, status) => {
    absensiMap[jamaahId] = status;
    render();
  };
  window.PGJ_simpan = async () => {
    const btn = document.getElementById('pgjSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    try {
      // Simpan perubahan tanggal & materi kalau ada yang diubah, sekalian dalam 1 aksi
      const p = pertemuanList.find(x => x.id === currentPertemuanId);
      const tglBaru = document.getElementById('pgjTglInput')?.value;
      const materiBaru = document.getElementById('pgjMateriInput')?.value.trim() || null;
      const updatePayload = {};
      if (tglBaru && p && tglBaru !== p.tanggal) {
        const tglObj = new Date(tglBaru+'T00:00:00');
        updatePayload.tanggal = tglBaru;
        updatePayload.bulan = tglObj.toLocaleDateString('id-ID',{month:'long'});
        updatePayload.tahun = tglObj.getFullYear();
      }
      if (materiBaru !== (p?.materi ?? null)) updatePayload.materi = materiBaru;
      if (Object.keys(updatePayload).length) {
        await SB.pengajianPertemuan.update(currentPertemuanId, updatePayload);
        if (p) Object.assign(p, updatePayload);
      }
      // Peserta "virtual" (cuma data Santri, belum ada baris Jamaah asli) yang mau ditandai
      // kehadirannya WAJIB dibikinkan baris Jamaah asli dulu — pengajian_absensi.jamaah_id
      // itu FK ke tabel jamaah asli, gak bisa nunjuk ke id semu.
      for (const x of jamaahEligible) {
        if (x._virtual && absensiMap[x.id]) {
          const res = await SB.jamaah.insert({
            kelompok_id: u.kelompok_id, nama: x.nama, jenis_kelamin: x.jenis_kelamin,
            tgl_lahir: x.tgl_lahir, santri_id: x.santri_id, aktif: true,
          });
          const jamaahIdBaru = res?.[0]?.id;
          if (jamaahIdBaru) {
            absensiMap[jamaahIdBaru] = absensiMap[x.id];
            delete absensiMap[x.id];
            x.id = jamaahIdBaru;
            x._virtual = false;
          }
        }
      }
      const rows = jamaahEligible.filter(x => absensiMap[x.id]).map(x => ({
        pertemuan_id: currentPertemuanId, jamaah_id: x.id, status: absensiMap[x.id],
      }));
      if (rows.length) await SB.pengajianAbsensi.upsertBulk(rows);
      logActivity('ubah', 'Absensi Pengajian', `Simpan perubahan pertemuan ${pengajianJenisLabel(jenis)}`);
      showToast('Semua perubahan tersimpan ✓');
      if (updatePayload.tanggal) { await loadPertemuanList(); await loadDetail(currentPertemuanId); }
    } catch(e) {
      showToast('Gagal menyimpan: ' + e.message, true);
    }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Semua Perubahan'; }
    render();
  };

  await loadPertemuanList();
  render();
}

async function renderSubPengajian() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  let subList = await SB.subPengajian.getByKelompok(u.kelompok_id) || [];

  function render() {
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Nama Sub Pengajian</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Atur nama-nama Sub Pengajian di kelompokmu sendiri (istilah bebas, sesuai kebiasaan kelompok)</p>
        </div>
        <button class="btn btn-green" onclick="SBP_tambah()">+ Tambah Sub</button>
      </div>
      <div class="card" style="padding:0; overflow:hidden;">
        ${subList.length ? `<div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
          <thead><tr style="background:var(--green);">
            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#fff;">Nama Sub Pengajian</th>
            <th style="padding:8px 12px; text-align:center; font-size:11px; color:#fff; width:100px;">Aksi</th>
          </tr></thead>
          <tbody>${subList.map(s => `<tr style="border-bottom:1px solid var(--line);">
            <td style="padding:8px 12px; font-size:13px; font-weight:600;">${escHtml(s.nama)}</td>
            <td style="padding:8px 12px; text-align:center;">
              <div style="display:flex; gap:4px; justify-content:center;">
                <button class="btn-icon" onclick="SBP_edit(this.dataset.id, this.dataset.nama)" data-id="${s.id}" data-nama="${escHtml(s.nama)}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                <button class="btn-icon danger" onclick="SBP_hapus(this.dataset.id, this.dataset.nama)" data-id="${s.id}" data-nama="${escHtml(s.nama)}" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
              </div>
            </td>
          </tr>`).join('')}</tbody>
        </table></div>` : '<div style="padding:30px; text-align:center; font-size:13px; color:var(--ink-soft);">Belum ada Sub Pengajian. Klik "+ Tambah Sub" untuk mulai.</div>'}
      </div>
      <div style="font-size:11.5px; color:var(--ink-soft); margin-top:10px;">Sub Pengajian ini dipakai untuk mengelompokkan generus (Pra Remaja s/d Istimewa) di menu Data Jamaah, dan dipakai saat absen di menu Absensi Pengajian → Pengajian Sub Kelompok.</div>
    `;
  }

  window.SBP_tambah = () => {
    const nama = prompt('Nama Sub Pengajian baru:');
    if (!nama || !nama.trim()) return;
    (async () => {
      try {
        await SB.subPengajian.insert({ kelompok_id: u.kelompok_id, nama: nama.trim() });
        showToast('Sub Pengajian ditambahkan ✓');
        subList = await SB.subPengajian.getByKelompok(u.kelompok_id) || [];
        render();
      } catch(e) { showToast('Gagal menambah: ' + e.message, true); }
    })();
  };
  window.SBP_edit = (id, namaLama) => {
    const nama = prompt('Ubah nama Sub Pengajian:', namaLama);
    if (!nama || !nama.trim() || nama.trim() === namaLama) return;
    (async () => {
      try {
        await SB.subPengajian.update(id, { nama: nama.trim() });
        showToast('Nama Sub Pengajian diubah ✓');
        subList = await SB.subPengajian.getByKelompok(u.kelompok_id) || [];
        render();
      } catch(e) { showToast('Gagal mengubah: ' + e.message, true); }
    })();
  };
  window.SBP_hapus = async (id, nama) => {
    if (!confirm(`Hapus Sub Pengajian "${nama}"?\nGenerus yang sudah ditandai masuk sub ini akan otomatis jadi "belum ada sub" lagi.`)) return;
    try {
      await SB.subPengajian.delete(id);
      showToast('Sub Pengajian dihapus');
      subList = await SB.subPengajian.getByKelompok(u.kelompok_id) || [];
      render();
    } catch(e) { showToast('Gagal menghapus: ' + e.message, true); }
  };

  render();
}

/* ===== PAGE: REKAP ABSENSI PENGAJIAN (Desa/Daerah/Admin) ===== */
async function renderRekapPengajian() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const kelompokScope = isDesa
    ? (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id)
    : (App.cache.kelompok||[]);
  const scopeLabel = isDesa ? 'kelompok-kelompok di desamu' : 'seluruh kelompok';
  const DESA_NAMA_MAP = await loadDesaMap();

  let bulan = BULAN_LIST[new Date().getMonth()];
  let tahun = new Date().getFullYear();
  let rows = [];

  async function loadData() {
    const perKlp = await Promise.all(kelompokScope.map(async klp => {
      const pList = await SB.pengajianPertemuan.getByKelompok(klp.id, 'kelompok', null, bulan, tahun) || [];
      const detail = await Promise.all(pList.map(async p => {
        const abs = await SB.pengajianAbsensi.getByPertemuan(p.id) || [];
        const totalTercatat = abs.length;
        const hadir = abs.filter(a => a.status === 'H').length;
        const pct = totalTercatat ? Math.round((hadir/totalTercatat)*100) : null;
        return { kelompok: klp.nama, desaId: klp.desa_id, pertemuanKe: p.pertemuan_ke, tanggal: p.tanggal, pct, hadir, totalTercatat };
      }));
      return detail;
    }));
    rows = perKlp.flat().sort((a,b) => a.kelompok.localeCompare(b.kelompok) || (a.pertemuanKe||0)-(b.pertemuanKe||0));
  }

  function render() {
    const rataRata = rows.length && rows.some(r=>r.pct!=null)
      ? Math.round(rows.filter(r=>r.pct!=null).reduce((s,r)=>s+r.pct,0) / rows.filter(r=>r.pct!=null).length) : null;
    const klpBelumLapor = kelompokScope.filter(k => !rows.some(r => r.kelompok === k.nama)).length;

    function tabelRows(rowList) {
      return `<div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
        <thead><tr style="background:var(--green);">
          <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">Pertemuan Ke-</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">Tanggal</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">Hadir</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">% Hadir</th>
        </tr></thead>
        <tbody>${rowList.length ? rowList.map(r => `<tr style="border-bottom:1px solid var(--line);">
          <td style="padding:6px 10px; font-size:12.5px; font-weight:600;">${escHtml(r.kelompok)}</td>
          <td style="padding:6px 10px; text-align:center; font-size:12px;">${r.pertemuanKe||'?'}</td>
          <td style="padding:6px 10px; text-align:center; font-size:12px;">${fmtDateShort(r.tanggal)}</td>
          <td style="padding:6px 10px; text-align:center; font-size:12px;">${r.hadir}/${r.totalTercatat}</td>
          <td style="padding:6px 10px; text-align:center; font-size:12px; font-weight:700; color:${r.pct!=null&&r.pct<50?'var(--rose)':'var(--ink)'};">${r.pct!=null?r.pct+'%':'-'}</td>
        </tr>`).join('') : `<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--ink-soft); font-size:12.5px;">Belum ada pertemuan Pengajian Kelompok yang tercatat bulan ini.</td></tr>`}</tbody>
      </table></div>`;
    }

    let tabelHtml;
    if (isDesa) {
      tabelHtml = `<div class="card" style="padding:0; overflow:hidden;">${tabelRows(rows)}</div>`;
    } else {
      // Admin / Daerah: dipecah per Desa dulu, tiap Desa isinya kelompok-kelompok di bawahnya
      const byDesa = {};
      kelompokScope.forEach(k => { (byDesa[k.desa_id] ||= []).push(k); });
      tabelHtml = Object.keys(byDesa).length ? Object.entries(byDesa).map(([did, klpList]) => {
        const rowsDesa = rows.filter(r => klpList.some(k => k.nama === r.kelompok));
        return `<div class="card" style="margin-bottom:12px; padding:0; overflow:hidden;">
          <div class="fw-bold color-green" style="font-size:13.5px; padding:10px 14px; border-bottom:1px solid var(--line);">🏘️ ${escHtml(DESA_NAMA_MAP[did]||did)}</div>
          ${tabelRows(rowsDesa)}
        </div>`;
      }).join('') : `<div class="card" style="text-align:center; padding:24px; color:var(--ink-soft); font-size:13px;">Belum ada data kelompok/desa untuk ditampilkan.</div>`;
    }

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rekap Absensi Pengajian</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Persentase kehadiran Pengajian Kelompok tiap pertemuan — ${escHtml(scopeLabel)}</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Bulan</label>
          <select id="rpjBulan" onchange="RPJ_gantiPeriode()">${BULAN_LIST.map(b=>`<option value="${b}" ${b===bulan?'selected':''}>${b}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Tahun</label>
          <select id="rpjTahun" onchange="RPJ_gantiPeriode()">${[tahun-1,tahun,tahun+1].map(t=>`<option value="${t}" ${t===tahun?'selected':''}>${t}</option>`).join('')}</select>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; gap:20px; flex-wrap:wrap;">
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Rata-rata Kehadiran Bulan Ini</span><div style="font-size:22px; font-weight:800; color:${rataRata!=null&&rataRata<50?'var(--rose)':'var(--green)'};">${rataRata!=null?rataRata+'%':'-'}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Total Pertemuan Tercatat</span><div style="font-size:22px; font-weight:800; color:var(--green);">${rows.length}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Kelompok Belum Lapor Bulan Ini</span><div style="font-size:22px; font-weight:800; color:${klpBelumLapor?'var(--rose)':'var(--green)'};">${klpBelumLapor}</div></div>
        </div>
      </div>

      ${tabelHtml}
      <div style="font-size:11px; color:var(--ink-soft); margin-top:10px;">Rekap ini khusus Pengajian Kelompok (bukan Pengajian Sub Kelompok, karena nama sub berbeda-beda tiap kelompok jadi tidak bisa digabung jadi 1 rekap).</div>
    `;
  }

  window.RPJ_gantiPeriode = async () => {
    bulan = document.getElementById('rpjBulan').value;
    tahun = parseInt(document.getElementById('rpjTahun').value);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    await loadData();
    render();
  };

  await loadData();
  render();
}

async function renderPenerobosan() {
  const u = App.user;
  if (u.role === 'pjp_kelompok' || u.role === 'kelompok') return renderPenerobosanEntry();
  if (u.role === 'desa' || u.role === 'desa_view') return renderPenerobosanDesa();
  return renderPenerobosanRekap();
}

async function renderPenerobosanEntry() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const canEdit = u.role === 'pjp_kelompok' || u.role === 'admin';
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const klp = (App.cache.kelompok||[]).find(k => k.id === u.kelompok_id);

  let bulan = BULAN_LIST[new Date().getMonth()];
  let tahun = new Date().getFullYear();
  let lastData = null;

  async function loadAuto() {
    // Ambil LANGSUNG dari fungsi hitung terpusat yang sama dipakai Data Jamaah —
    // bukan hitung ulang sendiri di sini. Jadi dijamin selalu sama angkanya, gak perlu
    // disinkronin manual tiap ada perubahan logic kategori.
    const { counts: kategoriJamaah } = await hitungJamaahPerKategoriKelompok(u.kelompok_id);

    const jamaahCount = {};
    PENEROBOSAN_KATEGORI_ORDER.forEach(k => { jamaahCount[k] = { L:0, P:0 }; });
    let jamaahBelumDiketahui = 0;
    Object.entries(kategoriJamaah).forEach(([katJamaah, jumlah]) => {
      const kat = PENEROBOSAN_KATEGORI_MAP[katJamaah];
      if (!kat) { jamaahBelumDiketahui += jumlah.L + jumlah.P; return; }
      jamaahCount[kat].L += jumlah.L;
      jamaahCount[kat].P += jumlah.P;
    });

    const pengurus = await SB.musPeserta.getByKelompok(u.kelompok_id) || [];
    const p4s = PENEROBOSAN_4S.map(d => pengurus.find(p => p.jabatan === d)).filter(Boolean);
    const pLain = pengurus.filter(p => !PENEROBOSAN_4S.includes(p.jabatan));

    const mtMsList = await SB.mtMs.getByKelompok(u.kelompok_id) || [];
    const jumlahMT = mtMsList.filter(x => x.dapukan === 'MT').length;
    const jumlahMS = mtMsList.filter(x => x.dapukan === 'MS').length;

    const existing = (await SB.penerobosan.getByKelompokBulan(u.kelompok_id, bulan, tahun) || [])[0] || null;

    return { jamaahCount, jamaahBelumDiketahui, p4s, pLain, jumlahMT, jumlahMS, existing };
  }

  function render(data) {
    lastData = data;
    const { jamaahCount, jamaahBelumDiketahui, p4s, pLain, jumlahMT, jumlahMS, existing } = data;
    const totalJamaah = { L:0, P:0 };
    PENEROBOSAN_KATEGORI_ORDER.forEach(k => { totalJamaah.L += jamaahCount[k].L; totalJamaah.P += jamaahCount[k].P; });

    const n = (key) => existing?.[key] ?? 0;

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Penerobosan Pusat</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">${escHtml(klp?.nama||'')} · Laporan bulanan ke Pusat</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Bulan</label>
          <select id="penBulan" onchange="PEN_gantiPeriode()">${BULAN_LIST.map(b=>`<option value="${b}" ${b===bulan?'selected':''}>${b}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Tahun</label>
          <select id="penTahun" onchange="PEN_gantiPeriode()">${[tahun-1,tahun,tahun+1].map(t=>`<option value="${t}" ${t===tahun?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        ${existing ? '<span style="font-size:11px; font-weight:700; color:var(--green); background:var(--green-soft); padding:4px 10px; border-radius:10px;">✓ Sudah pernah disimpan</span>' : '<span style="font-size:11px; color:var(--ink-soft);">Belum ada laporan periode ini</span>'}
      </div>

      ${jamaahBelumDiketahui ? `<div class="card" style="margin-bottom:14px; border:1.5px solid var(--rose); background:var(--rose-soft);">
        <div style="font-size:12.5px; color:var(--rose); font-weight:700;">⚠️ ${jamaahBelumDiketahui} jamaah belum ada tanggal lahirnya di Data Jamaah</div>
        <div style="font-size:11.5px; color:var(--ink-soft); margin-top:3px;">Orang-orang ini tidak ikut terhitung di jumlah otomatis bawah ini (usianya tidak bisa ditentukan) — makanya totalnya bisa lebih kecil dari yang tampil di Data Jamaah. Lengkapi tanggal lahirnya di Data Jamaah supaya ikut terhitung.</div>
      </div>` : ''}

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">👥 Jumlah Jamaah — otomatis dari Data Jamaah</div>
        <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
          <thead><tr style="background:var(--green);">
            <th style="padding:6px 6px; text-align:left; font-size:10px; color:#fff; width:38%;">Kategori</th>
            <th style="padding:6px 4px; text-align:center; font-size:10px; color:#fff;">L</th>
            <th style="padding:6px 4px; text-align:center; font-size:10px; color:#fff;">P</th>
            <th style="padding:6px 4px; text-align:center; font-size:10px; color:#fff;">Jumlah</th>
          </tr></thead>
          <tbody>
            ${PENEROBOSAN_KATEGORI_ORDER.map(k => `<tr style="border-bottom:1px solid var(--line);">
              <td style="padding:5px 6px; font-size:11px; font-weight:600; word-break:break-word;">${k}</td>
              <td style="padding:5px 4px; text-align:center; font-size:11px;">${jamaahCount[k].L}</td>
              <td style="padding:5px 4px; text-align:center; font-size:11px;">${jamaahCount[k].P}</td>
              <td style="padding:5px 4px; text-align:center; font-size:11px; font-weight:700;">${jamaahCount[k].L+jamaahCount[k].P}</td>
            </tr>`).join('')}
            <tr style="background:var(--cream-2);">
              <td style="padding:6px 6px; font-size:11px; font-weight:800;">TOTAL</td>
              <td style="padding:6px 4px; text-align:center; font-size:11px; font-weight:800;">${totalJamaah.L}</td>
              <td style="padding:6px 4px; text-align:center; font-size:11px; font-weight:800;">${totalJamaah.P}</td>
              <td style="padding:6px 4px; text-align:center; font-size:11px; font-weight:800; color:var(--green);">${totalJamaah.L+totalJamaah.P}</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:11px; color:var(--ink-soft); margin-top:8px;">Data ini bersumber dari menu Data Jamaah. Kalau ada yang kurang/salah, perbaiki di sana, otomatis ikut berubah di sini.</div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">🤝 Jumlah & Nama Pengurus — otomatis dari Data Pengurus</div>
        <div style="font-size:12px; margin-bottom:10px;"><b>${p4s.length}</b> pengurus 4-S · <b>${pLain.length}</b> pengurus lain · <b style="color:var(--green);">${p4s.length+pLain.length}</b> total</div>
        <div style="font-size:10.5px; font-weight:700; color:var(--gold); text-transform:uppercase; margin-bottom:4px;">4-S</div>
        ${p4s.length ? p4s.map(p => `<div style="font-size:12px; padding:3px 0; border-bottom:1px dashed var(--line);">${escHtml(p.nama)} <span style="color:var(--ink-soft);">— ${escHtml(p.jabatan)}</span></div>`).join('') : '<div style="font-size:11.5px; color:var(--ink-soft); font-style:italic;">Belum ada data di Data Pengurus</div>'}
        <div style="font-size:10.5px; font-weight:700; color:var(--gold); text-transform:uppercase; margin:10px 0 4px;">Kepengurusan Lain</div>
        ${pLain.length ? pLain.map(p => `<div style="font-size:12px; padding:3px 0; border-bottom:1px dashed var(--line);">${escHtml(p.nama)} <span style="color:var(--ink-soft);">— ${escHtml(p.jabatan)}</span></div>`).join('') : '<div style="font-size:11.5px; color:var(--ink-soft); font-style:italic;">Belum ada data di Data Pengurus</div>'}
        <div style="font-size:11px; color:var(--ink-soft); margin-top:8px;">Data ini bersumber dari menu Data Pengurus. Perbaikan dilakukan di sana.</div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">🕌 Sarana & Prasarana</div>
        <div style="background:var(--green-soft); border-radius:8px; padding:10px 14px; margin-bottom:12px; display:flex; gap:20px; flex-wrap:wrap;">
          <div><span style="font-size:11px; color:var(--ink-soft);">MT (otomatis dari Data MT/MS)</span><div style="font-size:18px; font-weight:800; color:var(--green);">${jumlahMT}</div></div>
          <div><span style="font-size:11px; color:var(--ink-soft);">MS (otomatis dari Data MT/MS)</span><div style="font-size:18px; font-weight:800; color:var(--green);">${jumlahMS}</div></div>
        </div>
        <div style="font-size:11px; color:var(--ink-soft); margin-bottom:8px;">Yang di bawah ini isi manual:</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px;">
          ${[['sarpras_masjid','Masjid'],['sarpras_aula','Aula'],['sarpras_madrasah','Madrasah'],
             ['sarpras_jeding_putra','Jeding (Putra)'],['sarpras_jeding_putri','Jeding (Putri)'],
             ['sarpras_sekolah','Sekolah'],['sarpras_pondok','Pondok'],
             ['sarpras_kamar_mt','Kamar MT'],['sarpras_kamar_tamu','Kamar Tamu']]
            .map(([key,label]) => `<div class="form-group" style="margin:0;"><label style="font-size:11px;">${label}</label><input type="number" min="0" id="pen_${key}" value="${n(key)}" ${!canEdit?'disabled':''}></div>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">📅 Kegiatan Kelompok / Minggu <span style="font-weight:400; color:var(--ink-soft); font-size:11px;">(isi manual)</span></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px;">
          ${[['kegiatan_klp','Kelompok'],['kegiatan_muda_mudi','Muda-mudi'],['kegiatan_cbr','Caberawit'],
             ['kegiatan_ibu2','Ibu-ibu'],['kegiatan_5unsur','5 Unsur'],['kegiatan_musyawarah','Musyawarah']]
            .map(([key,label]) => `<div class="form-group" style="margin:0;"><label style="font-size:11px;">${label}</label><input type="number" min="0" id="pen_${key}" value="${n(key)}" ${!canEdit?'disabled':''}></div>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">👩 Janda <span style="font-weight:400; color:var(--ink-soft); font-size:11px;">(isi manual)</span></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px;">
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">JML</label><input type="number" min="0" id="pen_janda_jml" value="${existing?.janda_jml ?? 0}" ${!canEdit?'disabled':''}></div>
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Siap Diwayuh — BTN</label><input type="number" min="0" id="pen_janda_btn" value="${existing?.janda_btn ?? 0}" ${!canEdit?'disabled':''}></div>
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Siap Diwayuh — TR-AN</label><input type="number" min="0" id="pen_janda_tran" value="${existing?.janda_tran ?? 0}" ${!canEdit?'disabled':''}></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">📊 Sub / KK / Persenan <span style="font-weight:400; color:var(--ink-soft); font-size:11px;">(angka laporan manual kelompok)</span></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px;">
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Sub</label><input type="number" min="0" id="pen_sub" value="${existing?.sub ?? ''}" ${!canEdit?'disabled':''}></div>
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">KK (Kepala Keluarga)</label><input type="number" min="0" id="pen_kk" value="${existing?.kk ?? ''}" ${!canEdit?'disabled':''}></div>
          <div class="form-group" style="margin:0;"><label style="font-size:11px;">Persenan (%)</label><input type="number" min="0" max="100" step="0.1" id="pen_persenan" value="${existing?.persenan ?? ''}" ${!canEdit?'disabled':''}></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">📝 Catatan</div>
        <textarea id="pen_catatan" rows="3" style="width:100%; resize:vertical;" ${!canEdit?'disabled':''}>${escHtml(existing?.catatan||'')}</textarea>
      </div>

      ${existing ? `<div style="display:flex; gap:8px; margin-bottom:10px;">
        <button class="btn btn-outline" style="flex:1;" onclick="PEN_downloadExcel()">📥 Download Excel</button>
        <button class="btn btn-outline" style="flex:1;" onclick="PEN_downloadPdf()">📥 Download PDF</button>
      </div>` : ''}
      ${canEdit ? `<button class="btn btn-green" style="width:100%; padding:12px;" id="penSaveBtn" onclick="PEN_simpan()">💾 ${existing?'Simpan Perubahan':'Simpan Laporan'} ${bulan} ${tahun}</button>` : ''}
    `;
  }

  window.PEN_gantiPeriode = async () => {
    bulan = document.getElementById('penBulan').value;
    tahun = parseInt(document.getElementById('penTahun').value);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    render(await loadAuto());
  };

  // Data grid bersama (dipakai Excel & PDF, biar isinya selalu konsisten) —
  // 30 kolom virtual (A..AD) meniru persis susunan form aslinya.
  function buildPenerobosanGrid() {
    const { jamaahCount, p4s, pLain, jumlahMT, jumlahMS, existing } = lastData;
    const totalJamaah = { L:0, P:0 };
    PENEROBOSAN_KATEGORI_ORDER.forEach(k => { totalJamaah.L += jamaahCount[k].L; totalJamaah.P += jamaahCount[k].P; });
    const totalPengurus = p4s.length + pLain.length;
    const desaNama = klp?.desa?.nama || '';
    const daerahNama = 'Sidoarjo Utara';
    const K = PENEROBOSAN_KATEGORI_ORDER;

    const R = () => new Array(33).fill('');
    const rows = [];
    for (let i=0;i<33;i++) rows.push(R());
    const set = (r,c,v) => { rows[r-1][c] = v; };

    set(1,4,'LAPORAN PENEROBOSAN UMUM');
    set(2,4,'JUMLAH JAMAAH , PERSENAN DAN KEGIATAN KELOMPOK');
    set(3,4,'Kelompok :'); set(3,7, klp?.nama||''); set(3,19,'Bulan :'); set(3,21, bulan);
    set(4,4,'Desa :'); set(4,7, desaNama); set(4,19,'Tahun :'); set(4,21, tahun);
    set(5,4,'Daerah :'); set(5,7, daerahNama);
    set(6,27,'DIISI KELOMPOK');
    set(7,1,'JUMLAH JAMAAH'); set(7,25,'JANDA'); set(7,28,'SUB'); set(7,29,'KK'); set(7,30,'PERSENAN');
    set(8,25,'JML'); set(8,26,'SIAP DIWAYUH');
    set(9,26,'BTN'); set(9,27,'TR-AN');
    set(8,1,'BALITA'); set(8,4,'CBR/PAUD-SD'); set(8,7,'PRA REMAJA'); set(8,10,'REMAJA'); set(8,13,'USIA NIKAH'); set(8,16,'DEWASA'); set(8,19,'TOTAL JIWA JAMAAH'); set(8,22,'JUMLAH PENGURUS');
    ['L','P','J'].forEach((lbl,i) => { for (let g=0; g<7; g++) set(9, 1+g*3+i, lbl); });
    set(9,22,'4-S'); set(9,23,'LAIN'); set(9,24,'JML');
    K.forEach((kat,i) => { set(10, 1+i*3, jamaahCount[kat].L); set(10, 2+i*3, jamaahCount[kat].P); set(10, 3+i*3, jamaahCount[kat].L+jamaahCount[kat].P); });
    set(10,19, totalJamaah.L); set(10,20, totalJamaah.P); set(10,21, totalJamaah.L+totalJamaah.P);
    set(10,22, p4s.length); set(10,23, pLain.length); set(10,24, totalPengurus);
    set(10,25, existing?.janda_jml ?? 0); set(10,26, existing?.janda_btn ?? 0); set(10,27, existing?.janda_tran ?? 0);
    set(10,28, existing?.sub ?? ''); set(10,29, existing?.kk ?? ''); set(10,30, existing?.persenan ?? '');

    set(12,1,'SARANA DAN PRASARANA'); set(12,12,'SEKOLAH'); set(12,14,'PONDOK'); set(12,16,'MT'); set(12,17,'MS'); set(12,18,'KAMAR MT'); set(12,20,'KAMAR TAMU'); set(12,22,'KEGIATAN KELOMPOK/ MINGGU');
    set(13,1,'MASJID'); set(13,3,'AULA'); set(13,5,'MADRASAH'); set(13,8,'JEDING');
    set(14,8,'PUTRA'); set(14,10,'PUTRI'); set(14,22,'KLP'); set(14,23,'Muda-di'); set(14,24,'Cbr'); set(14,25,'Ibu-ibu'); set(14,26,'5 Unsur'); set(14,28,'Musyawarah');
    set(15,1, existing?.sarpras_masjid||0); set(15,3, existing?.sarpras_aula||0); set(15,5, existing?.sarpras_madrasah||0);
    set(15,8, existing?.sarpras_jeding_putra||0); set(15,10, existing?.sarpras_jeding_putri||0);
    set(15,12, existing?.sarpras_sekolah||0); set(15,14, existing?.sarpras_pondok||0);
    set(15,16, jumlahMT); set(15,17, jumlahMS); set(15,18, existing?.sarpras_kamar_mt||0); set(15,20, existing?.sarpras_kamar_tamu||0);
    set(15,22, existing?.kegiatan_klp||0); set(15,23, existing?.kegiatan_muda_mudi||0); set(15,24, existing?.kegiatan_cbr||0);
    set(15,25, existing?.kegiatan_ibu2||0); set(15,26, existing?.kegiatan_5unsur||0); set(15,28, existing?.kegiatan_musyawarah||0);

    const kepCols = [
      { label:'Kyai Kelompok', c:2, list: p4s.filter(p=>p.jabatan==='Kyai') },
      { label:'Wakil Kelompok', c:6, list: p4s.filter(p=>p.jabatan==='Wakil Kyai') },
      { label:'Pnb Kelompok', c:10, list: p4s.filter(p=>p.jabatan==='Penerobos') },
      { label:'Mubaligh Kelompok', c:14, list: p4s.filter(p=>p.jabatan==='Mubalegh') },
      { label:'KU Kelompok', c:18, list: p4s.filter(p=>p.jabatan==='KU') },
      { label:"Aghniya' Kelompok", c:22, list: p4s.filter(p=>p.jabatan==='Aghnia') },
      { label:'Kepengurusan Lain', c:26, list: pLain },
    ];
    kepCols.forEach(({label,c,list}) => {
      set(18, c, label);
      list.slice(0,7).forEach((p,i) => set(19+i, c, p.nama + (label==='Kepengurusan Lain' ? ` (${p.jabatan})` : '')));
    });

    set(27,3,'CATATAN :'); set(27,6, existing?.catatan || '-');
    set(27,19, 'Sidoarjo, ' + new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}));
    set(29,19,'Kyai Kelompok'); set(29,24,'Penerobos Kelompok');
    if (p4s.find(p=>p.jabatan==='Kyai')) set(32,19, p4s.find(p=>p.jabatan==='Kyai').nama);
    if (p4s.find(p=>p.jabatan==='Penerobos')) set(32,24, p4s.find(p=>p.jabatan==='Penerobos').nama);

    return rows;
  }

  // Daftar sel gabungan (dipakai Excel !merges & border kotak PDF) — meniru koordinat form asli
  function penerobosanMerges() {
    const colIdx = (letters) => letters.split('').reduce((n,c)=> n*26 + (c.charCodeAt(0)-64), 0) - 1;
    const M = (a,b) => { const [c1,r1]=a.match(/([A-Z]+)(\d+)/).slice(1), [c2,r2]=b.match(/([A-Z]+)(\d+)/).slice(1); return { r1:+r1-1, c1:colIdx(c1), r2:+r2-1, c2:colIdx(c2) }; };
    return [
      M('E1','AD1'), M('E2','AD2'), M('AB6','AD6'),
      M('B7','Y7'), M('Z7','AB7'), M('Z8','Z9'), M('AA8','AB8'), M('AC7','AC9'), M('AD7','AD9'), M('AE7','AG9'),
      M('B8','D8'), M('E8','G8'), M('H8','J8'), M('K8','M8'), M('N8','P8'), M('Q8','S8'), M('T8','V8'), M('W8','Y8'),
      M('AE10','AG10'),
      M('B12','L12'), M('M12','N14'), M('O12','P14'), M('Q12','Q14'), M('R12','R14'), M('S12','T14'), M('U12','V14'), M('W12','AD13'),
      M('B13','C14'), M('D13','E14'), M('F13','H14'), M('I13','L13'),
      M('I14','J14'), M('K14','L14'), M('AA14','AB14'), M('AC14','AD14'),
      M('B15','C15'), M('D15','E15'), M('F15','H15'), M('I15','J15'), M('K15','L15'), M('M15','N15'), M('O15','P15'), M('S15','T15'), M('U15','V15'), M('AA15','AB15'), M('AC15','AD15'),
      M('C18','F18'), M('G18','J18'), M('K18','N18'), M('O18','R18'), M('S18','V18'), M('W18','Z18'), M('AA18','AD18'),
      ...[19,20,21,22,23,24,25].flatMap(r => [M(`C${r}`,`F${r}`), M(`G${r}`,`J${r}`), M(`K${r}`,`N${r}`), M(`O${r}`,`R${r}`), M(`S${r}`,`V${r}`), M(`W${r}`,`Z${r}`), M(`AA${r}`,`AD${r}`)]),
      M('C27','D27'), M('S27','AB27'),
      M('S29','V29'), M('X29','AB29'),
    ];
  }

  window.PEN_downloadExcel = async () => {
    if (!lastData) return;
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const rows = buildPenerobosanGrid();
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = penerobosanMerges().map(m => ({ s:{r:m.r1,c:m.c1}, e:{r:m.r2,c:m.c2} }));
    ws['!cols'] = new Array(33).fill({wch:9});
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Penerobosan');
    window.XLSX.writeFile(wb, `Penerobosan_${(klp?.nama||'kelompok').replace(/\s+/g,'_')}_${bulan}_${tahun}.xlsx`);
    showToast('Excel berhasil diunduh');
  };

  window.PEN_downloadPdf = async () => {
    if (!lastData) return;
    showToast('Menyiapkan PDF...');
    if (!window.PDFLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = res; s.onerror = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
          s2.onload = res; s2.onerror = rej; document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      });
    }
    try {
      const rows = buildPenerobosanGrid();
      const merges = penerobosanMerges();
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg = await doc.embedFont(StandardFonts.Helvetica);
      // Landscape A4 — 30 kolom virtual meniru form aslinya, jadi butuh halaman lebar
      const W = 842, H = 595, ML = 18, MT = 122;
      const nCols = 33, nRows = rows.length;
      const gridW = W - ML*2, colW = gridW / nCols;
      const gridH = H - MT - 20, rowH = gridH / nRows;
      const GREEN = rgb(0.106,0.227,0.173), LGREEN = rgb(0.85,0.93,0.86), GRAY = rgb(0.55,0.55,0.55), WHITE = rgb(1,1,1), DARK = rgb(0.1,0.1,0.1), LINE = rgb(0.55,0.55,0.55);
      const esc = s => String(s??'').toString().replace(/[^\x00-\xFF]/g, '');

      const page = doc.addPage([W,H]);
      // Header — 2 baris judul, rata tengah
      page.drawRectangle({ x:0, y:H-52, width:W, height:52, color:GREEN });
      const t1 = 'LAPORAN PENEROBOSAN UMUM', t2 = 'JUMLAH JAMAAH , PERSENAN DAN KEGIATAN KELOMPOK';
      page.drawText(t1, { x: W/2 - fBold.widthOfTextAtSize(t1,14)/2, y:H-24, font:fBold, size:14, color:WHITE });
      page.drawText(t2, { x: W/2 - fReg.widthOfTextAtSize(t2,9)/2, y:H-38, font:fReg, size:9, color:rgb(0.9,0.95,0.9) });

      // Kelompok / Desa / Daerah / Bulan / Tahun — teks bebas, TANPA garis/kotak
      let hy = H - 75;
      const lbl = (label, val, x) => { page.drawText(esc(label), {x, y:hy, font:fBold, size:9, color:DARK}); page.drawText(esc(val), {x:x+50, y:hy, font:fReg, size:9, color:DARK}); };
      lbl('Kelompok :', klp?.nama||'', ML); lbl('Bulan :', bulan, ML+330); hy -= 15;
      lbl('Desa :', klp?.desa?.nama||'', ML); lbl('Tahun :', String(tahun), ML+330); hy -= 15;
      lbl('Daerah :', 'Sidoarjo Utara', ML);

      const top = H - MT;
      // Kolom A (index 0) di form asli selalu kosong — dilewati saja, grid mulai dari kolom B
      const gridColStart = 1;
      const effCols = nCols - gridColStart;
      const colW2 = gridW / effCols;
      const cellX = c => ML + (c - gridColStart)*colW2;
      const cellY = r => top - r*rowH;

      // Bikin daftar kotak sel yang BENERAN ada (gabungan dari sel merge + sel tunggal),
      // cuma untuk baris yang memang berbentuk tabel — bukan judul/header info/footer.
      // Baris 11 (0-idx 10) sengaja dilewati juga — itu baris kosong pemisah sebelum
      // Sarana & Prasarana, biar ada jarak tanpa garis, bukan kotak-kotak kosong.
      const mergeMap = new Map();
      merges.forEach((m, idx) => { for (let r=m.r1; r<=m.r2; r++) for (let c=m.c1; c<=m.c2; c++) mergeMap.set(`${r},${c}`, idx); });
      // colEnd beda per bagian — cuma baris Jamaah/Janda/Sub/KK/Persenan yang pakai kolom baru (30-32),
      // Sarpras/Kegiatan & Kepengurusan tetap di lebar asli (30 kolom) biar gak ada kotak kosong nyempil
      const griddedRanges = [
        { rows:[6,9], colEnd:nCols },
        { rows:[11,14], colEnd:30 },
        { rows:[17,24], colEnd:30 },
      ];
      const HEADER_ROWS = new Set([6,7,8, 11,12,13, 17]); // baris label/judul dalam grid -> BG hijau muda
      const cellRects = [];
      const addedMergeIdx = new Set();
      griddedRanges.forEach(({rows:[rs,re], colEnd}) => {
        for (let r=rs; r<=re; r++) {
          for (let c=gridColStart; c<colEnd; c++) {
            const key = `${r},${c}`;
            if (mergeMap.has(key)) {
              const idx = mergeMap.get(key);
              if (!addedMergeIdx.has(idx)) { addedMergeIdx.add(idx); cellRects.push(merges[idx]); }
            } else {
              cellRects.push({ r1:r, c1:c, r2:r, c2:c });
            }
          }
        }
      });

      // Gambar kotak per sel — BG hijau muda utk baris header/label, transparan utk baris angka
      cellRects.forEach(({r1,c1,r2,c2}) => {
        const x = cellX(c1), yTop = cellY(r1), w = (c2-c1+1)*colW2, h = (r2-r1+1)*rowH;
        const isHeader = HEADER_ROWS.has(r1);
        page.drawRectangle({ x, y: yTop-h, width:w, height:h, borderColor:LINE, borderWidth:0.5, color: isHeader?LGREEN:undefined });
      });

      // Isi teks tiap sel — rata TENGAH (horizontal) & MIDDLE (vertikal) di dalam kotaknya masing-masing
      cellRects.forEach(({r1,c1,r2,c2}) => {
        const val = rows[r1][c1];
        if (val === '' || val == null) return;
        const isHeader = HEADER_ROWS.has(r1);
        const w = (c2-c1+1)*colW2, h = (r2-r1+1)*rowH;
        const cx = cellX(c1) + w/2, cy = cellY(r1) - h/2;
        const size = isHeader ? 7 : 7.5;
        const font = isHeader ? fBold : fReg;
        let text = esc(val);
        const maxChars = Math.floor((w - 4) / (size*0.55));
        if (text.length > maxChars && maxChars > 3) text = text.slice(0, maxChars-1) + '.';
        const tw = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: cx - tw/2, y: cy - size*0.35, font, size, color: isHeader ? GREEN : DARK });
      });

      // Bagian non-grid (judul, footer) — teks bebas, rata tengah horizontal di dalam lebar halaman
      const freeRows = [0,1, 5, 25,26,27,28,29,30,31,32];
      freeRows.forEach(r => {
        rows[r].forEach((val, c) => {
          if (val === '' || val == null) return;
          if (r === 0 || r === 1) return; // sudah digambar sbg judul di atas
          const x = cellX(c) + 2;
          const y = cellY(r) - rowH*0.68;
          const isSectionLabel = (r===26 && c===3);
          const size = isSectionLabel ? 8 : 7;
          const font = (isSectionLabel || r===5) ? fBold : fReg;
          page.drawText(esc(val), { x, y, font, size, color: isSectionLabel ? GREEN : DARK });
        });
      });

      // Garis pemisah tipis di area catatan/footer (bukan grid penuh)
      page.drawLine({ start:{x:ML, y:cellY(26)}, end:{x:ML+gridW, y:cellY(26)}, thickness:0.5, color:LINE });

      page.drawText('Hal 1/1', { x:W/2-15, y:8, font:fReg, size:7, color:GRAY });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type:'application/pdf' });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj; a.download = `Penerobosan_${(klp?.nama||'kelompok').replace(/\s+/g,'_')}_${bulan}_${tahun}.pdf`; a.click();
      URL.revokeObjectURL(urlObj);
      showToast('PDF berhasil diunduh');
    } catch(e) { showToast('Gagal membuat PDF: ' + e.message, true); }
  };

  window.PEN_simpan = async () => {
    const btn = document.getElementById('penSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const getNum = (id) => { const v = document.getElementById(id).value; return v === '' ? null : Number(v); };
      const payload = {
        kelompok_id: u.kelompok_id, bulan, tahun,
        sarpras_masjid: getNum('pen_sarpras_masjid')||0, sarpras_aula: getNum('pen_sarpras_aula')||0,
        sarpras_madrasah: getNum('pen_sarpras_madrasah')||0,
        sarpras_jeding_putra: getNum('pen_sarpras_jeding_putra')||0, sarpras_jeding_putri: getNum('pen_sarpras_jeding_putri')||0,
        sarpras_sekolah: getNum('pen_sarpras_sekolah')||0,
        sarpras_pondok: getNum('pen_sarpras_pondok')||0, sarpras_kamar_mt: getNum('pen_sarpras_kamar_mt')||0,
        sarpras_kamar_tamu: getNum('pen_sarpras_kamar_tamu')||0,
        kegiatan_klp: getNum('pen_kegiatan_klp')||0, kegiatan_muda_mudi: getNum('pen_kegiatan_muda_mudi')||0,
        kegiatan_cbr: getNum('pen_kegiatan_cbr')||0, kegiatan_ibu2: getNum('pen_kegiatan_ibu2')||0,
        kegiatan_5unsur: getNum('pen_kegiatan_5unsur')||0, kegiatan_musyawarah: getNum('pen_kegiatan_musyawarah')||0,
        janda_jml: getNum('pen_janda_jml')||0, janda_btn: getNum('pen_janda_btn')||0, janda_tran: getNum('pen_janda_tran')||0,
        sub: getNum('pen_sub'), kk: getNum('pen_kk'), persenan: getNum('pen_persenan'),
        catatan: document.getElementById('pen_catatan').value.trim() || null,
        dibuat_oleh: u.id, updated_at: new Date().toISOString(),
      };
      await SB.penerobosan.upsert(payload);
      logActivity('tambah', 'Penerobosan Pusat', `Simpan laporan ${bulan} ${tahun}`);
      showToast('Laporan tersimpan ✓');
      render(await loadAuto());
    } catch(e) {
      showToast('Gagal menyimpan: ' + e.message, true);
      btn.disabled = false; btn.textContent = `💾 Simpan Laporan ${bulan} ${tahun}`;
    }
  };

  render(await loadAuto());
}

/* --- Mode Desa: rekap per kelompok + kepengurusan desa + input manual --- */
const PENEROBOSAN_KATEGORI_MAP_DESA = {
  'Bayi': 'CBR/PAUD-SD', 'PAUD/TK': 'CBR/PAUD-SD', 'Caberawit': 'CBR/PAUD-SD',
  'Pra Remaja': 'PRA REMAJA', 'Remaja': 'REMAJA', 'Pra Nikah': 'USIA NIKAH',
  'Dewasa': 'DEWASA', 'Istimewa': 'DEWASA',
};
const PENEROBOSAN_KATEGORI_ORDER_DESA = ['CBR/PAUD-SD','PRA REMAJA','REMAJA','USIA NIKAH','DEWASA'];
const PENEROBOSAN_4S_DESA = [
  { dapukan:'Kyai', label:'Imam Desa (Kyai Desa)' },
  { dapukan:'Wakil Kyai', label:'Wakil Desa' },
  { dapukan:'Penerobos', label:'Penerobos Desa' },
  { dapukan:'Mubalegh', label:'Muballigh Desa' },
  { dapukan:'KU', label:'KU Desa' },
  { dapukan:'Aghnia', label:"Aghniya' Desa" },
];

async function renderPenerobosanDesa() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const canEdit = u.role === 'desa' || u.role === 'admin';
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const kelompokList = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
  const DESA_NAMA_MAP = await loadDesaMap();
  const desaNama = DESA_NAMA_MAP[u.desa_id] || u.desa_id;

  let bulan = BULAN_LIST[new Date().getMonth()];
  let tahun = new Date().getFullYear();
  let lastData = null;

  async function loadData() {
    const perKelompok = await Promise.all(kelompokList.map(async klp => {
      // Ambil LANGSUNG dari fungsi hitung terpusat yang sama dipakai Data Jamaah — jangan
      // hitung ulang sendiri, biar selalu sama angkanya.
      const { counts: kategoriJamaah } = await hitungJamaahPerKategoriKelompok(klp.id);
      const cnt = {}; PENEROBOSAN_KATEGORI_ORDER_DESA.forEach(k => { cnt[k] = { L:0, P:0 }; });
      let jamaahBelumDiketahui = 0;
      Object.entries(kategoriJamaah).forEach(([katJamaah, jumlah]) => {
        const kat = PENEROBOSAN_KATEGORI_MAP_DESA[katJamaah];
        if (!kat) { jamaahBelumDiketahui += jumlah.L + jumlah.P; return; }
        cnt[kat].L += jumlah.L;
        cnt[kat].P += jumlah.P;
      });
      const pengurus = await SB.musPeserta.getByKelompok(klp.id) || [];
      const jml4s = pengurus.filter(p => PENEROBOSAN_4S.includes(p.jabatan)).length;
      const jmlLain = pengurus.length - jml4s;
      const mtMsList = await SB.mtMs.getByKelompok(klp.id) || [];
      const jumlahMT = mtMsList.filter(x => x.dapukan === 'MT').length;
      const jumlahMS = mtMsList.filter(x => x.dapukan === 'MS').length;
      const lapKlp = (await SB.penerobosan.getByKelompokBulan(klp.id, bulan, tahun) || [])[0] || null;
      return { klp, cnt, jml4s, jmlLain, jumlahMT, jumlahMS, jamaahBelumDiketahui, lapKlp };
    }));

    const pengurusDesa = await SB.musPeserta.getByDesa(u.desa_id) || [];
    const desa4s = PENEROBOSAN_4S_DESA.map(d => ({ ...d, orang: pengurusDesa.find(p => p.jabatan === d.dapukan) }));
    const desaLain = pengurusDesa.filter(p => !PENEROBOSAN_4S.includes(p.jabatan));

    const existing = (await SB.penerobosanDesa.getByDesaBulan(u.desa_id, bulan, tahun) || [])[0] || null;

    return { perKelompok, desa4s, desaLain, existing };
  }

  function render(data) {
    lastData = data;
    const { perKelompok, desa4s, desaLain, existing } = data;
    const n = (key) => existing?.[key] ?? 0;

    const totals = { cnt:{}, jml4s:0, jmlLain:0, sub:0, kk:0, mt:0, ms:0, jandaJml:0, jandaBtn:0, jandaTran:0 };
    PENEROBOSAN_KATEGORI_ORDER_DESA.forEach(k => { totals.cnt[k] = { L:0, P:0 }; });
    perKelompok.forEach(({ cnt, jml4s, jmlLain, jumlahMT, jumlahMS, lapKlp }) => {
      PENEROBOSAN_KATEGORI_ORDER_DESA.forEach(k => { totals.cnt[k].L += cnt[k].L; totals.cnt[k].P += cnt[k].P; });
      totals.jml4s += jml4s; totals.jmlLain += jmlLain;
      totals.sub += lapKlp?.sub || 0; totals.kk += lapKlp?.kk || 0;
      totals.mt += jumlahMT; totals.ms += jumlahMS;
      totals.jandaJml += lapKlp?.janda_jml || 0; totals.jandaBtn += lapKlp?.janda_btn || 0; totals.jandaTran += lapKlp?.janda_tran || 0;
    });
    let totalJiwa = 0;
    PENEROBOSAN_KATEGORI_ORDER_DESA.forEach(k => { totalJiwa += totals.cnt[k].L + totals.cnt[k].P; });
    const totalBelumDiketahui = perKelompok.reduce((s, p) => s + (p.jamaahBelumDiketahui||0), 0);

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Penerobosan Pusat</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">${escHtml(desaNama)} · Rekap semua kelompok</p>
        </div>
        ${existing ? `<div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="PEND_downloadExcel()">📥 Download Excel</button>
          <button class="btn btn-outline btn-sm" onclick="PEND_downloadPdf()">📥 Download PDF</button>
        </div>` : ''}
      </div>

      ${totalBelumDiketahui ? `<div class="card" style="margin-bottom:14px; border:1.5px solid var(--rose); background:var(--rose-soft);">
        <div style="font-size:12.5px; color:var(--rose); font-weight:700;">⚠️ ${totalBelumDiketahui} jamaah (gabungan semua kelompok di desa ini) belum ada tanggal lahirnya di Data Jamaah</div>
        <div style="font-size:11.5px; color:var(--ink-soft); margin-top:3px;">Orang-orang ini tidak ikut terhitung di jumlah otomatis di bawah — usianya tidak bisa ditentukan. Minta PJP Kelompok terkait melengkapi tanggal lahirnya di Data Jamaah supaya ikut terhitung.</div>
      </div>` : ''}

      <div class="card" style="margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Bulan</label>
          <select id="penDBulan" onchange="PEND_gantiPeriode()">${BULAN_LIST.map(b=>`<option value="${b}" ${b===bulan?'selected':''}>${b}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Tahun</label>
          <select id="penDTahun" onchange="PEND_gantiPeriode()">${[tahun-1,tahun,tahun+1].map(t=>`<option value="${t}" ${t===tahun?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        ${existing ? '<span style="font-size:11px; font-weight:700; color:var(--green); background:var(--green-soft); padding:4px 10px; border-radius:10px;">✓ Sudah pernah disimpan</span>' : ''}
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:12.5px; color:var(--green); margin-bottom:8px;">📊 Ringkasan Desa — otomatis</div>
        <div style="display:flex; gap:18px; flex-wrap:wrap;">
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Jml Kelompok</span><div style="font-size:16px; font-weight:800; color:var(--green);">${kelompokList.length}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Wakil Kyai Desa</span><div style="font-size:16px; font-weight:800; color:var(--green);">${desa4s.find(d=>d.dapukan==='Wakil Kyai')?.orang ? 1 : 0}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Sub</span><div style="font-size:16px; font-weight:800; color:var(--green);">${totals.sub}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">KK</span><div style="font-size:16px; font-weight:800; color:var(--green);">${totals.kk}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Jumlah Jiwa Jamaah</span><div style="font-size:16px; font-weight:800; color:var(--green);">${totalJiwa}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">MT</span><div style="font-size:16px; font-weight:800; color:var(--green);">${totals.mt}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">MS</span><div style="font-size:16px; font-weight:800; color:var(--green);">${totals.ms}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Janda (JML)</span><div style="font-size:16px; font-weight:800; color:var(--gold);">${totals.jandaJml}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Siap Diwayuh — BTN</span><div style="font-size:16px; font-weight:800; color:var(--gold);">${totals.jandaBtn}</div></div>
          <div><span style="font-size:10.5px; color:var(--ink-soft);">Siap Diwayuh — TR-AN</span><div style="font-size:16px; font-weight:800; color:var(--gold);">${totals.jandaTran}</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); padding:12px 14px 0;">👥 Jumlah Jamaah per Kelompok — otomatis dari Data Jamaah & Data Pengurus</div>
        <div class="table-wrap" style="margin-top:8px;"><table style="width:100%; border-collapse:collapse; min-width:960px;">
          <thead><tr style="background:var(--green);">
            <th style="padding:6px 8px; text-align:left; font-size:10px; color:#fff;">Kelompok</th>
            ${PENEROBOSAN_KATEGORI_ORDER_DESA.map(k=>`<th colspan="2" style="padding:6px 4px; text-align:center; font-size:9px; color:#fff;">${k}</th>`).join('')}
            <th style="padding:6px 6px; text-align:center; font-size:10px; color:#fff;">Sub</th>
            <th style="padding:6px 6px; text-align:center; font-size:10px; color:#fff;">KK</th>
            <th style="padding:6px 6px; text-align:center; font-size:10px; color:#fff;">4-S</th>
            <th style="padding:6px 6px; text-align:center; font-size:10px; color:#fff;">Lain</th>
            <th style="padding:6px 6px; text-align:center; font-size:10px; color:#fff;">Janda</th>
            <th style="padding:6px 6px; text-align:center; font-size:10px; color:#fff;">Persenan</th>
          </tr></thead>
          <tbody>
            ${perKelompok.map(({klp,cnt,jml4s,jmlLain,lapKlp}) => `<tr style="border-bottom:1px solid var(--line);">
              <td style="padding:5px 8px; font-size:12px; font-weight:600;">${escHtml(klp.nama)}</td>
              ${PENEROBOSAN_KATEGORI_ORDER_DESA.map(k=>`<td style="padding:5px 3px; text-align:center; font-size:11px;">${cnt[k].L}</td><td style="padding:5px 3px; text-align:center; font-size:11px; border-right:1px solid var(--line);">${cnt[k].P}</td>`).join('')}
              <td style="padding:5px 6px; text-align:center; font-size:11px;">${lapKlp?.sub ?? '-'}</td>
              <td style="padding:5px 6px; text-align:center; font-size:11px;">${lapKlp?.kk ?? '-'}</td>
              <td style="padding:5px 6px; text-align:center; font-size:11px;">${jml4s}</td>
              <td style="padding:5px 6px; text-align:center; font-size:11px;">${jmlLain}</td>
              <td style="padding:5px 6px; text-align:center; font-size:11px;">${lapKlp?.janda_jml ?? '-'}</td>
              <td style="padding:5px 6px; text-align:center; font-size:11px;">${lapKlp?.persenan ?? '-'}</td>
            </tr>`).join('')}
            <tr style="background:var(--cream-2); font-weight:800;">
              <td style="padding:6px 8px; font-size:12px;">JUMLAH</td>
              ${PENEROBOSAN_KATEGORI_ORDER_DESA.map(k=>`<td style="padding:6px 3px; text-align:center; font-size:11px;">${totals.cnt[k].L}</td><td style="padding:6px 3px; text-align:center; font-size:11px; border-right:1px solid var(--line);">${totals.cnt[k].P}</td>`).join('')}
              <td style="padding:6px 6px; text-align:center; font-size:11px;">${totals.sub}</td>
              <td style="padding:6px 6px; text-align:center; font-size:11px;">${totals.kk}</td>
              <td style="padding:6px 6px; text-align:center; font-size:11px;">${totals.jml4s}</td>
              <td style="padding:6px 6px; text-align:center; font-size:11px;">${totals.jmlLain}</td>
              <td style="padding:6px 6px; text-align:center; font-size:11px;">${totals.jandaJml}</td>
              <td style="padding:6px 6px; text-align:center; font-size:11px;">-</td>
            </tr>
          </tbody>
        </table></div>
        <div style="font-size:11px; color:var(--ink-soft); padding:0 14px 12px;">Kolom Sub/KK/Persenan/Janda ditarik dari laporan Penerobosan level Kelompok masing-masing (bulan yang sama). Kalau kosong ("-"), berarti kelompok itu belum simpan laporannya bulan ini. Kolom Persenan dalam satuan Rupiah.</div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">🤝 Kepengurusan Desa — otomatis dari Data Pengurus level Desa</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px;">
          ${desa4s.map(d => `<div style="font-size:12px; padding:6px 8px; background:var(--cream-2); border-radius:6px;"><b>${escHtml(d.label)}</b><br>${d.orang ? escHtml(d.orang.nama) : '<i style="color:var(--ink-soft);">Belum diisi</i>'}</div>`).join('')}
        </div>
        <div style="font-size:10.5px; font-weight:700; color:var(--gold); text-transform:uppercase; margin:12px 0 4px;">Kepengurusan Lain</div>
        ${desaLain.length ? desaLain.map(p => `<div style="font-size:12px; padding:3px 0; border-bottom:1px dashed var(--line);">${escHtml(p.nama)} <span style="color:var(--ink-soft);">— ${escHtml(p.jabatan)}</span></div>`).join('') : '<div style="font-size:11.5px; color:var(--ink-soft); font-style:italic;">Belum ada data</div>'}
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">🕌 Sarana & Prasarana Desa <span style="font-weight:400; color:var(--ink-soft); font-size:11px;">(isi manual — angka desa sendiri)</span></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px;">
          ${[['sarpras_masjid','Masjid'],['sarpras_jeding','Jeding'],['sarpras_aula','Aula'],['sarpras_madrasah','Madrasah'],['sarpras_pondok','Pondok'],['sarpras_sekolah','Sekolah']]
            .map(([key,label]) => `<div class="form-group" style="margin:0;"><label style="font-size:11px;">${label}</label><input type="number" min="0" id="pend_${key}" value="${n(key)}"></div>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">📅 Kegiatan Desa <span style="font-weight:400; color:var(--ink-soft); font-size:11px;">(isi manual)</span></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px;">
          ${[['kegiatan_desa','Desa'],['kegiatan_muda_mudi','Muda-mudi'],['kegiatan_ibu2','Ibu-ibu'],['kegiatan_aghniya',"Aghniya'"],['kegiatan_musyawarah','Musyawarah']]
            .map(([key,label]) => `<div class="form-group" style="margin:0;"><label style="font-size:11px;">${label}</label><input type="number" min="0" id="pend_${key}" value="${n(key)}"></div>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="fw-bold" style="font-size:13.5px; color:var(--green); margin-bottom:10px;">📖 JML Pengajian / Bulan di Desa <span style="font-weight:400; color:var(--ink-soft); font-size:11px;">(isi manual)</span></div>
        <input type="number" min="0" id="pend_jml_pengajian_bulan" value="${n('jml_pengajian_bulan')}" style="max-width:160px;">
      </div>

      <button class="btn btn-green" style="width:100%; padding:12px;" id="penDSaveBtn" onclick="PEND_simpan()">💾 ${existing?'Simpan Perubahan':'Simpan Laporan'} ${bulan} ${tahun}</button>
    `;
  }

  window.PEND_gantiPeriode = async () => {
    bulan = document.getElementById('penDBulan').value;
    tahun = parseInt(document.getElementById('penDTahun').value);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    render(await loadData());
  };

  // Data grid bersama (Excel & PDF) — 29 kolom virtual (A..AC) meniru form Desa asli
  function buildPenerobosanDesaGrid() {
    const { perKelompok, desa4s, desaLain, existing } = lastData;
    const totals = { cnt:{}, jml4s:0, jmlLain:0, sub:0, kk:0, mt:0, ms:0, jandaJml:0, jandaBtn:0, jandaTran:0 };
    PENEROBOSAN_KATEGORI_ORDER_DESA.forEach(k => { totals.cnt[k] = { L:0, P:0 }; });
    perKelompok.forEach(({ cnt, jml4s, jmlLain, jumlahMT, jumlahMS, lapKlp }) => {
      PENEROBOSAN_KATEGORI_ORDER_DESA.forEach(k => { totals.cnt[k].L += cnt[k].L; totals.cnt[k].P += cnt[k].P; });
      totals.jml4s += jml4s; totals.jmlLain += jmlLain;
      totals.sub += lapKlp?.sub || 0; totals.kk += lapKlp?.kk || 0;
      totals.mt += jumlahMT; totals.ms += jumlahMS;
      totals.jandaJml += lapKlp?.janda_jml || 0; totals.jandaBtn += lapKlp?.janda_btn || 0; totals.jandaTran += lapKlp?.janda_tran || 0;
    });
    const totL = PENEROBOSAN_KATEGORI_ORDER_DESA.reduce((s,k)=>s+totals.cnt[k].L,0);
    const totP = PENEROBOSAN_KATEGORI_ORDER_DESA.reduce((s,k)=>s+totals.cnt[k].P,0);

    const R = () => new Array(31).fill('');
    const rows = []; for (let i=0;i<39;i++) rows.push(R());
    const set = (r,c,v) => { rows[r-1][c] = v; };

    set(2,0,'LAPORAN PENEROBOSAN UMUM');
    set(3,0,'JUMLAH JAMAAH , PERSENAN , KEGIATAN DAN KEPENGURUSAN DESA');
    set(4,1,'Desa :'); set(4,4, desaNama); set(4,13,'Bulan :'); set(4,15, bulan);
    set(5,1,'Daerah :'); set(5,4,'Sidoarjo Utara'); set(5,13,'Tahun :'); set(5,15, String(tahun));

    set(6,0,'NO'); set(6,1,'KELOMPOK'); set(6,3,'JUMLAH JAMAAH'); set(6,21,'JANDA'); set(6,24,'SUB'); set(6,25,'KK'); set(6,26,'JML PENGURUS'); set(6,29,'PERSENAN');
    set(7,3,'CBR / PAUD - SD'); set(7,6,'PRA REMAJA'); set(7,9,'REMAJA'); set(7,12,'USIA NIKAH'); set(7,15,'DEWASA'); set(7,18,'TOTAL JAMAAH');
    set(7,21,'JML'); set(7,22,'SIAP DIWAYUH');
    set(8,22,'BTN'); set(8,23,'TR-AN');
    ['L','P','J'].forEach((lbl,i)=>{ for (let g=0; g<6; g++) set(8, 3+g*3+i, lbl); });
    set(8,26,'4 S'); set(8,27,'LAIN'); set(8,28,'JML');

    perKelompok.slice(0,11).forEach((pk,i) => {
      const r = 9+i;
      set(r,0,i+1); set(r,1,pk.klp.nama);
      PENEROBOSAN_KATEGORI_ORDER_DESA.forEach((k,ki) => { set(r,3+ki*3,pk.cnt[k].L); set(r,4+ki*3,pk.cnt[k].P); set(r,5+ki*3,pk.cnt[k].L+pk.cnt[k].P); });
      const kL = PENEROBOSAN_KATEGORI_ORDER_DESA.reduce((s,k)=>s+pk.cnt[k].L,0), kP = PENEROBOSAN_KATEGORI_ORDER_DESA.reduce((s,k)=>s+pk.cnt[k].P,0);
      set(r,18,kL); set(r,19,kP); set(r,20,kL+kP);
      set(r,21, pk.lapKlp?.janda_jml ?? ''); set(r,22, pk.lapKlp?.janda_btn ?? ''); set(r,23, pk.lapKlp?.janda_tran ?? '');
      set(r,24, pk.lapKlp?.sub ?? ''); set(r,25, pk.lapKlp?.kk ?? '');
      set(r,26, pk.jml4s); set(r,27, pk.jmlLain); set(r,28, pk.jml4s+pk.jmlLain);
      set(r,29, pk.lapKlp?.persenan ?? '');
    });
    set(20,0,'JUMLAH');
    PENEROBOSAN_KATEGORI_ORDER_DESA.forEach((k,ki) => { set(20,3+ki*3, totals.cnt[k].L); set(20,4+ki*3, totals.cnt[k].P); set(20,5+ki*3, totals.cnt[k].L+totals.cnt[k].P); });
    set(20,18,totL); set(20,19,totP); set(20,20,totL+totP);
    set(20,21, totals.jandaJml); set(20,22, totals.jandaBtn); set(20,23, totals.jandaTran);
    set(20,24, totals.sub); set(20,25, totals.kk); set(20,26, totals.jml4s); set(20,27, totals.jmlLain); set(20,28, totals.jml4s+totals.jmlLain);

    set(22,0,'Wakil Kyai Desa'); set(22,2,'KLP'); set(22,3,'SUB'); set(22,4,'KK'); set(22,5,'JUMLAH'); set(22,17,'MT'); set(22,18,'MS');
    set(22,19, 'JML PENGAJIAN / BULAN DI DESA : ' + (existing?.jml_pengajian_bulan ?? 0));
    set(24,0, desa4s.find(d=>d.dapukan==='Wakil Kyai')?.orang ? 1 : 0);
    set(24,2, perKelompok.length); set(24,3, totals.sub); set(24,4, totals.kk); set(24,5, totL+totP); set(24,17, totals.mt); set(24,18, totals.ms);
    set(23,5,'Masjid'); set(23,7,'Jeding'); set(23,9,'Aula'); set(23,11,'Madrasah'); set(23,13,'Pondok'); set(23,15,'Sekolah');
    set(23,19,'Desa'); set(23,21,'Muda-di'); set(23,23,'Ibu-ibu'); set(23,25,"Aghniya'"); set(23,27,'Musyawarah');
    set(24,5, existing?.sarpras_masjid||0); set(24,7, existing?.sarpras_jeding||0); set(24,9, existing?.sarpras_aula||0);
    set(24,11, existing?.sarpras_madrasah||0); set(24,13, existing?.sarpras_pondok||0); set(24,15, existing?.sarpras_sekolah||0);
    set(24,19, existing?.kegiatan_desa||0); set(24,21, existing?.kegiatan_muda_mudi||0); set(24,23, existing?.kegiatan_ibu2||0);
    set(24,25, existing?.kegiatan_aghniya||0); set(24,27, existing?.kegiatan_musyawarah||0);

    const kepCols = [
      { label:'IMAM DESA', c:0, orang: desa4s.find(d=>d.dapukan==='Kyai')?.orang },
      { label:'WAKIL DESA', c:4, orang: desa4s.find(d=>d.dapukan==='Wakil Kyai')?.orang },
      { label:'PENEROBOS DESA', c:8, orang: desa4s.find(d=>d.dapukan==='Penerobos')?.orang },
      { label:'MUBALLIGH DESA', c:12, orang: desa4s.find(d=>d.dapukan==='Mubalegh')?.orang },
      { label:'KU  DESA', c:16, orang: desa4s.find(d=>d.dapukan==='KU')?.orang },
      { label:"AGHNIYA'  DESA", c:21, orang: desa4s.find(d=>d.dapukan==='Aghnia')?.orang },
    ];
    kepCols.forEach(({label,c,orang}) => { set(26,c,label); if (orang) set(27,c,orang.nama); });
    set(26,25,'KEPENGURUSAN LAIN');
    desaLain.slice(0,6).forEach((p,i) => set(27+i,25, p.nama + ` (${p.jabatan})`));

    set(34,10,'Sidoarjo, ' + new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}));
    set(36,9,'Kyai Desa'); set(36,17,'Penerobos Desa');
    if (desa4s.find(d=>d.dapukan==='Kyai')?.orang) set(39,9, desa4s.find(d=>d.dapukan==='Kyai').orang.nama);
    if (desa4s.find(d=>d.dapukan==='Penerobos')?.orang) set(39,17, desa4s.find(d=>d.dapukan==='Penerobos').orang.nama);

    return rows;
  }

  function penerobosanDesaMerges() {
    const colIdx = (letters) => letters.split('').reduce((n,c)=> n*26 + (c.charCodeAt(0)-64), 0) - 1;
    const M = (a,b) => { const [c1,r1]=a.match(/([A-Z]+)(\d+)/).slice(1), [c2,r2]=b.match(/([A-Z]+)(\d+)/).slice(1); return { r1:+r1-1, c1:colIdx(c1), r2:+r2-1, c2:colIdx(c2) }; };
    return [
      M('A2','AC2'), M('A3','AC3'),
      M('A6','A8'), M('B6','C8'), M('D6','U6'), M('V6','X6'), M('V7','V8'), M('W7','X7'), M('Y6','Y8'), M('Z6','Z8'), M('AA6','AC7'), M('AD6','AE8'),
      M('D7','F7'), M('G7','I7'), M('J7','L7'), M('M7','O7'), M('P7','R7'), M('S7','U7'),
      ...[9,10,11,12,13,14,15,16,17,18,19].map(r => M(`B${r}`,`C${r}`)),
      ...[9,10,11,12,13,14,15,16,17,18,19].map(r => M(`AD${r}`,`AE${r}`)),
      M('A20','C20'), M('AD20','AE20'),
      M('A22','B23'), M('C22','C23'), M('D22','D23'), M('E22','E23'), M('F22','Q22'), M('R22','R23'), M('S22','S23'), M('T22','AC22'),
      M('F23','G23'), M('H23','I23'), M('J23','K23'), M('L23','M23'), M('N23','O23'), M('P23','Q23'),
      M('T23','U23'), M('V23','W23'), M('X23','Y23'), M('Z23','AA23'), M('AB23','AC23'),
      M('A24','B24'), M('F24','G24'), M('H24','I24'), M('J24','K24'), M('L24','M24'), M('N24','O24'), M('P24','Q24'),
      M('T24','U24'), M('V24','W24'), M('X24','Y24'), M('Z24','AA24'), M('AB24','AC24'),
      M('A26','D26'), M('E26','H26'), M('I26','L26'), M('M26','P26'), M('Q26','U26'), M('V26','Y26'), M('Z26','AC26'),
      ...[27,28,29,30,31,32].flatMap(r => [M(`A${r}`,`D${r}`), M(`E${r}`,`H${r}`), M(`I${r}`,`L${r}`), M(`M${r}`,`P${r}`), M(`Q${r}`,`U${r}`), M(`V${r}`,`Y${r}`), M(`Z${r}`,`AC${r}`)]),
      M('K34','U34'), M('J36','N36'), M('R36','V36'), M('J39','N39'), M('R39','V39'),
    ];
  }

  window.PEND_downloadExcel = async () => {
    if (!lastData) return;
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const rows = buildPenerobosanDesaGrid();
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = penerobosanDesaMerges().map(m => ({ s:{r:m.r1,c:m.c1}, e:{r:m.r2,c:m.c2} }));
    ws['!cols'] = new Array(31).fill({wch:9});
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Penerobosan Desa');
    window.XLSX.writeFile(wb, `Penerobosan_${desaNama.replace(/\s+/g,'_')}_${bulan}_${tahun}.xlsx`);
    showToast('Excel berhasil diunduh');
  };

  window.PEND_downloadPdf = async () => {
    if (!lastData) return;
    showToast('Menyiapkan PDF...');
    if (!window.PDFLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = res; s.onerror = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
          s2.onload = res; s2.onerror = rej; document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      });
    }
    try {
      const rows = buildPenerobosanDesaGrid();
      const merges = penerobosanDesaMerges();
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg = await doc.embedFont(StandardFonts.Helvetica);
      const W = 842, H = 595, ML = 18, MT = 122;
      const nCols = 31, nRows = rows.length;
      const gridW = W - ML*2;
      const gridH = H - MT - 20, rowH = gridH / nRows;
      const GREEN = rgb(0.106,0.227,0.173), LGREEN = rgb(0.85,0.93,0.86), GRAY = rgb(0.55,0.55,0.55), WHITE = rgb(1,1,1), DARK = rgb(0.1,0.1,0.1), LINE = rgb(0.55,0.55,0.55);
      const esc = s => String(s??'').toString().replace(/[^\x00-\xFF]/g, '');

      const page = doc.addPage([W,H]);
      page.drawRectangle({ x:0, y:H-52, width:W, height:52, color:GREEN });
      const t1 = 'LAPORAN PENEROBOSAN UMUM', t2 = 'JUMLAH JAMAAH , PERSENAN , KEGIATAN DAN KEPENGURUSAN DESA';
      page.drawText(t1, { x: W/2 - fBold.widthOfTextAtSize(t1,14)/2, y:H-24, font:fBold, size:14, color:WHITE });
      page.drawText(t2, { x: W/2 - fReg.widthOfTextAtSize(t2,9)/2, y:H-38, font:fReg, size:9, color:rgb(0.9,0.95,0.9) });

      let hy = H - 75;
      const lbl = (label, val, x) => { page.drawText(esc(label), {x, y:hy, font:fBold, size:9, color:DARK}); page.drawText(esc(val), {x:x+50, y:hy, font:fReg, size:9, color:DARK}); };
      lbl('Desa :', desaNama, ML); lbl('Bulan :', bulan, ML+330); hy -= 15;
      lbl('Daerah :', 'Sidoarjo Utara', ML); lbl('Tahun :', String(tahun), ML+330);

      const top = H - MT;
      // Beda dari versi Kelompok — kolom A di grid Desa DIPAKAI (IMAM DESA, JUMLAH), jadi jangan disembunyikan
      const gridColStart = 0;
      const effCols = nCols - gridColStart;
      const colW2 = gridW / effCols;
      const cellX = c => ML + (c - gridColStart)*colW2;
      const cellY = r => top - r*rowH;

      const mergeMap = new Map();
      merges.forEach((m, idx) => { for (let r=m.r1; r<=m.r2; r++) for (let c=m.c1; c<=m.c2; c++) mergeMap.set(`${r},${c}`, idx); });
      // colEnd beda per bagian: tabel utama (row6-20) butuh sampai kolom PERSENAN(29),
      // Ringkasan Desa & Kepengurusan cuma sampai kolom 28 — jangan ikut lebar baru
      const griddedRanges = [
        { rows:[5,19], colEnd:31 },
        { rows:[21,23], colEnd:29 },
        { rows:[25,31], colEnd:29 },
      ];
      const HEADER_ROWS = new Set([5,6,7, 21,22, 25]);
      const cellRects = [];
      const addedMergeIdx = new Set();
      griddedRanges.forEach(({rows:[rs,re], colEnd}) => {
        for (let r=rs; r<=re; r++) {
          for (let c=gridColStart; c<colEnd; c++) {
            const key = `${r},${c}`;
            if (mergeMap.has(key)) {
              const idx = mergeMap.get(key);
              if (!addedMergeIdx.has(idx)) { addedMergeIdx.add(idx); cellRects.push(merges[idx]); }
            } else { cellRects.push({ r1:r, c1:c, r2:r, c2:c }); }
          }
        }
      });

      cellRects.forEach(({r1,c1,r2,c2}) => {
        const x = cellX(c1), yTop = cellY(r1), w = (c2-c1+1)*colW2, h = (r2-r1+1)*rowH;
        const isHeader = HEADER_ROWS.has(r1);
        page.drawRectangle({ x, y: yTop-h, width:w, height:h, borderColor:LINE, borderWidth:0.5, color: isHeader?LGREEN:undefined });
      });
      cellRects.forEach(({r1,c1,r2,c2}) => {
        const val = rows[r1][c1];
        if (val === '' || val == null) return;
        const isHeader = HEADER_ROWS.has(r1);
        const w = (c2-c1+1)*colW2, h = (r2-r1+1)*rowH;
        const cx = cellX(c1) + w/2, cy = cellY(r1) - h/2;
        const size = isHeader ? 6.5 : 7;
        const font = isHeader ? fBold : fReg;
        let text = esc(val);
        const maxChars = Math.floor((w - 4) / (size*0.55));
        if (text.length > maxChars && maxChars > 3) text = text.slice(0, maxChars-1) + '.';
        const tw = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: cx - tw/2, y: cy - size*0.35, font, size, color: isHeader ? GREEN : DARK });
      });

      const freeRows = [24,25,26,27,28,29,30,31, 33,35,38];
      freeRows.forEach(r => {
        rows[r].forEach((val, c) => {
          if (val === '' || val == null) return;
          if (r>=25 && r<=31) return; // sudah digambar sbg grid di atas
          const x = cellX(c) + 2, y = cellY(r) - rowH*0.68;
          page.drawText(esc(val), { x, y, font:fReg, size:8, color:DARK });
        });
      });

      page.drawText('Hal 1/1', { x:W/2-15, y:8, font:fReg, size:7, color:GRAY });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type:'application/pdf' });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj; a.download = `Penerobosan_${desaNama.replace(/\s+/g,'_')}_${bulan}_${tahun}.pdf`; a.click();
      URL.revokeObjectURL(urlObj);
      showToast('PDF berhasil diunduh');
    } catch(e) { showToast('Gagal membuat PDF: ' + e.message, true); }
  };

  window.PEND_simpan = async () => {
    const btn = document.getElementById('penDSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const getNum = (id) => { const v = document.getElementById(id).value; return v === '' ? 0 : Number(v); };
      const payload = {
        desa_id: u.desa_id, bulan, tahun,
        sarpras_masjid: getNum('pend_sarpras_masjid'), sarpras_jeding: getNum('pend_sarpras_jeding'),
        sarpras_aula: getNum('pend_sarpras_aula'), sarpras_madrasah: getNum('pend_sarpras_madrasah'),
        sarpras_pondok: getNum('pend_sarpras_pondok'), sarpras_sekolah: getNum('pend_sarpras_sekolah'),
        kegiatan_desa: getNum('pend_kegiatan_desa'), kegiatan_muda_mudi: getNum('pend_kegiatan_muda_mudi'),
        kegiatan_ibu2: getNum('pend_kegiatan_ibu2'), kegiatan_aghniya: getNum('pend_kegiatan_aghniya'),
        kegiatan_musyawarah: getNum('pend_kegiatan_musyawarah'),
        jml_pengajian_bulan: getNum('pend_jml_pengajian_bulan'),
        dibuat_oleh: u.id, updated_at: new Date().toISOString(),
      };
      await SB.penerobosanDesa.upsert(payload);
      logActivity('tambah', 'Penerobosan Pusat Desa', `Simpan laporan ${bulan} ${tahun}`);
      showToast('Laporan tersimpan ✓');
      render(await loadData());
    } catch(e) {
      showToast('Gagal menyimpan: ' + e.message, true);
      btn.disabled = false; btn.textContent = `💾 Simpan Laporan ${bulan} ${tahun}`;
    }
  };

  render(await loadData());
}

async function renderPenerobosanRekap() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin', isDaerah = u.role === 'daerah', isDesa = u.role === 'desa' || u.role === 'desa_view';
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const kelompokScope = (isAdmin || isDaerah)
    ? (App.cache.kelompok || [])
    : (App.cache.kelompok || []).filter(k => k.desa_id === u.desa_id);
  const DESA_NAMA_MAP = await loadDesaMap();

  let bulan = BULAN_LIST[new Date().getMonth()];
  let tahun = new Date().getFullYear();

  async function load() {
    const [laporan, hasilJamaah] = await Promise.all([
      SB.penerobosan.getByKelompokIds(kelompokScope.map(k=>k.id), bulan, tahun) || [],
      // Jumlah jamaah LANGSUNG dari fungsi kanonik yang sama dipakai Data Jamaah tiap
      // kelompok — BUKAN hitung ulang sendiri di sini.
      Promise.all(kelompokScope.map(async k => ({ id: k.id, ...(await hitungJamaahPerKategoriKelompok(k.id)) }))),
    ]);
    const byKlp = {};
    laporan.forEach(l => { byKlp[l.kelompok_id] = l; });
    const jamaahByKlp = new Map(hasilJamaah.map(h => [h.id, h]));
    return { byKlp, jamaahByKlp };
  }

  function render({ byKlp, jamaahByKlp }) {
    const sudah = kelompokScope.filter(k => byKlp[k.id]).length;
    const totalJamaahSemua = [...jamaahByKlp.values()].reduce((s,h) => s + h.total, 0);

    function tabelKelompok(klpList) {
      return `<div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
        <thead><tr style="background:var(--green);">
          <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">Status</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">Jml Jamaah</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">Sub</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">KK</th>
          <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff;">Persenan</th>
        </tr></thead>
        <tbody>
          ${klpList.map(k => {
            const l = byKlp[k.id];
            const jml = jamaahByKlp.get(k.id)?.total ?? '-';
            return `<tr style="border-bottom:1px solid var(--line);">
              <td style="padding:6px 10px; font-size:12.5px; font-weight:600;">${escHtml(k.nama)}</td>
              <td style="padding:6px 10px; text-align:center;">${l ? '<span style="font-size:11px; font-weight:700; color:var(--green); background:var(--green-soft); padding:2px 8px; border-radius:8px;">✓ Sudah</span>' : '<span style="font-size:11px; color:var(--ink-soft);">Belum</span>'}</td>
              <td style="padding:6px 10px; text-align:center; font-size:12px; font-weight:700;">${jml}</td>
              <td style="padding:6px 10px; text-align:center; font-size:12px;">${l?.sub ?? '-'}</td>
              <td style="padding:6px 10px; text-align:center; font-size:12px;">${l?.kk ?? '-'}</td>
              <td style="padding:6px 10px; text-align:center; font-size:12px;">${l?.persenan!=null ? l.persenan+'%' : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
    }

    const headerCard = `
      <div class="card" style="margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Bulan</label>
          <select id="penrBulan" onchange="PENR_gantiPeriode()">${BULAN_LIST.map(b=>`<option value="${b}" ${b===bulan?'selected':''}>${b}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="margin:0;"><label style="font-size:11px;">Tahun</label>
          <select id="penrTahun" onchange="PENR_gantiPeriode()">${[tahun-1,tahun,tahun+1].map(t=>`<option value="${t}" ${t===tahun?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        <span style="font-size:12px; font-weight:700; color:var(--green);">${sudah} / ${kelompokScope.length} kelompok sudah lapor</span>
      </div>
      <div class="card" style="margin-bottom:14px; text-align:center; padding:16px;">
        <div style="font-size:11px; color:var(--ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px;">Total Jamaah ${isDesa?'Se-Desa':'Se-Daerah'}</div>
        <div style="font-size:28px; font-weight:800; color:var(--green);">${totalJamaahSemua}</div>
      </div>`;

    let bodyHtml;
    if (isDesa) {
      // Level Desa: langsung tabel kelompok, gak perlu dipecah lagi (cuma 1 desa yg dilihat)
      bodyHtml = `<div class="card" style="padding:0; overflow:hidden;">${tabelKelompok(kelompokScope)}</div>`;
    } else {
      // Admin / Daerah: dipecah per Desa, tiap Desa bisa dibuka detail per Kelompoknya
      const byDesa = {};
      kelompokScope.forEach(k => { (byDesa[k.desa_id] ||= []).push(k); });
      bodyHtml = Object.keys(byDesa).length ? Object.entries(byDesa).map(([did, klpList]) => {
        const sudahDesa = klpList.filter(k => byKlp[k.id]).length;
        const jmlDesa = klpList.reduce((s,k) => s + (jamaahByKlp.get(k.id)?.total ?? 0), 0);
        const idp = 'penrDetail_' + did;
        return `<div class="card" style="margin-bottom:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div class="fw-bold color-green" style="font-size:13.5px;">🏘️ ${escHtml(DESA_NAMA_MAP[did]||did)}</div>
            <div style="font-size:12px; color:var(--ink-soft);">Jamaah: <b>${jmlDesa}</b> · Lapor: <b style="color:var(--green);">${sudahDesa}/${klpList.length}</b> kelompok</div>
          </div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="PENR_toggleDetail('${idp}')">📋 Detail per Kelompok</button>
          <div id="${idp}" style="display:none; margin-top:10px;">${tabelKelompok(klpList)}</div>
        </div>`;
      }).join('') : `<div class="card" style="text-align:center; padding:24px; color:var(--ink-soft); font-size:13px;">Belum ada data kelompok/desa untuk ditampilkan.</div>`;
    }

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Penerobosan Pusat</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Rekap status laporan bulanan${isDesa?' se-Desa':' — dipecah per Desa & Kelompok'}</p>
        </div>
      </div>
      ${headerCard}
      ${bodyHtml}
    `;
  }

  window.PENR_toggleDetail = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.PENR_gantiPeriode = async () => {
    bulan = document.getElementById('penrBulan').value;
    tahun = parseInt(document.getElementById('penrTahun').value);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    render(await load());
  };

  render(await load());
}

async function renderDataJamaah() {
  const u = App.user;
  if (u.role === 'pjp_kelompok' || u.role === 'kelompok') return renderJamaahEntry();
  return renderJamaahRekap();
}

function hitungIstimewa(tglLahir) {
  if (!tglLahir) return false;
  return hitungUsia(tglLahir) >= 60;
}

const KATEGORI_JAMAAH_ORDER = ['Bayi','PAUD/TK','Caberawit','Pra Remaja','Remaja','Pra Nikah','Dewasa','Istimewa','Belum Diketahui'];
function kategoriUsiaJamaah(tglLahir, statusMenikah) {
  if (!tglLahir) return 'Belum Diketahui';
  const usia = hitungUsia(tglLahir);
  if (usia >= 60) return 'Istimewa'; // Istimewa selalu menang, apapun status nikahnya
  if (['menikah','duda','janda'].includes(statusMenikah)) return 'Dewasa'; // sudah/pernah menikah = Dewasa, berapapun usianya
  if (usia < 4) return 'Bayi';
  if (usia <= 6) return 'PAUD/TK';
  if (usia <= 12) return 'Caberawit';
  if (usia <= 15) return 'Pra Remaja';
  if (usia <= 18) return 'Remaja';
  return 'Pra Nikah';
}

// ===== SATU-SATUNYA sumber hitungan jamaah per kategori usia per kelompok =====
// Dipakai oleh Data Jamaah (kartu ringkasan) MAUPUN Penerobosan Pusat (Kelompok & Desa) —
// supaya keduanya PASTI sama angkanya (gak hitung ulang terpisah-pisah lagi kayak dulu,
// yang berkali-kali ketauan gampang beda krn logic-nya kepisah & gampang lupa disinkronin).
// Balikannya: { counts: {kategori: {L,P}}, total }
async function hitungJamaahPerKategoriKelompok(kelompokId) {
  const [jamaahList, santriAsli, santriBelumMasukKelas] = await Promise.all([
    SB.jamaah.getByKelompok(kelompokId) || [],
    SB.santri.getByKelompok(kelompokId) || [],
    SB.santri.getUnassigned(kelompokId) || [],
  ]);
  const semuaSantri = [...(santriAsli||[]), ...(santriBelumMasukKelas||[])];
  const kategoriDariSantri = new Map();
  semuaSantri.forEach(s => {
    const kat = kategoriDariNamaKelas(s.kelas?.nama_kelas);
    if (kat) kategoriDariSantri.set(s.id, kat);
  });

  const counts = {};
  KATEGORI_JAMAAH_ORDER.forEach(k => { counts[k] = { L:0, P:0 }; });
  const santriIdSudahAdaJamaah = new Set();

  (jamaahList||[]).forEach(x => {
    const katUsia = kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah);
    const katSantri = x.santri_id ? kategoriDariSantri.get(x.santri_id) : null;
    const kat = katSantri || katUsia;
    if (x.santri_id) santriIdSudahAdaJamaah.add(x.santri_id);
    if (!counts[kat]) counts[kat] = { L:0, P:0 };
    if (x.jenis_kelamin === 'L') counts[kat].L++;
    else if (x.jenis_kelamin === 'P') counts[kat].P++;
  });

  // Santri (kelas atau belum) yang belum punya baris jamaah asli — "baris bayangan" di Data
  // Jamaah, ikut kehitung juga di sini. Tautan keluarga TIDAK relevan buat hitungan ini.
  semuaSantri.forEach(s => {
    if (santriIdSudahAdaJamaah.has(s.id)) return;
    const kat = kategoriDariSantri.get(s.id) || kategoriUsiaJamaah(s.tgl_lahir, null);
    if (!counts[kat]) counts[kat] = { L:0, P:0 };
    if (s.jenis_kel === 'L') counts[kat].L++;
    else if (s.jenis_kel === 'P') counts[kat].P++;
  });

  const total = Object.values(counts).reduce((s,c) => s + c.L + c.P, 0);
  return { counts, total };
}


function jamaahKategoriTableHtml(list, santriKategoriMap) {
  const counts = {};
  KATEGORI_JAMAAH_ORDER.forEach(k => { counts[k] = { L:0, P:0 }; });
  list.forEach(x => {
    const katUsia = kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah);
    const katSantri = santriKategoriMap && x.santri_id ? santriKategoriMap.get(x.santri_id) : null;
    const kat = (katSantri && katSantri !== katUsia) ? katSantri : katUsia;
    if (!counts[kat]) counts[kat] = { L:0, P:0 };
    if (x.jenis_kelamin === 'L') counts[kat].L++;
    else if (x.jenis_kelamin === 'P') counts[kat].P++;
  });
  return jamaahKategoriTableHtmlFromCounts(counts);
}

// Versi yang nerima counts yg SUDAH dihitung (dari hitungJamaahPerKategoriKelompok, atau
// gabungan/jumlah counts dari beberapa kelompok) — dipakai di rekap Desa/Daerah supaya
// SATU-SATUNYA sumber kategori tetap fungsi kanonik itu, bukan hitung ulang list mentah lagi.
function jamaahKategoriTableHtmlFromCounts(counts) {
  const grandTotal = Object.values(counts).reduce((s,c) => ({ L: s.L+c.L, P: s.P+c.P }), { L:0, P:0 });
  const rows = KATEGORI_JAMAAH_ORDER.map(kat => {
    const c = counts[kat] || { L:0, P:0 };
    if (kat === 'Belum Diketahui' && !c.L && !c.P) return '';
    return `<tr style="border-bottom:1px solid var(--line); ${kat==='Istimewa'?'background:var(--gold-soft);':''}">
      <td style="padding:6px 10px; font-size:12.5px; font-weight:600;">${escHtml(kat)}</td>
      <td style="padding:6px 10px; text-align:center; font-size:14px; color:#2563eb; font-weight:700;">${c.L}</td>
      <td style="padding:6px 10px; text-align:center; font-size:14px; color:#db2777; font-weight:700;">${c.P}</td>
      <td style="padding:6px 10px; text-align:center; font-size:14px; font-weight:800;">${c.L+c.P}</td>
    </tr>`;
  }).join('');
  const totalRow = `<tr style="background:var(--green);">
      <td style="padding:8px 10px; font-size:13px; font-weight:800; color:#fff; background:var(--green);">JUMLAH</td>
      <td style="padding:8px 10px; text-align:center; font-size:15px; font-weight:800; color:#fff; background:var(--green);">${grandTotal.L}</td>
      <td style="padding:8px 10px; text-align:center; font-size:15px; font-weight:800; color:#fff; background:var(--green);">${grandTotal.P}</td>
      <td style="padding:8px 10px; text-align:center; font-size:18px; font-weight:900; color:var(--gold); background:var(--green);">${grandTotal.L+grandTotal.P}</td>
    </tr>`;
  return `<div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
    <thead><tr style="background:var(--green);">
      <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Kategori Usia</th>
      <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff; width:50px;">L</th>
      <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff; width:50px;">P</th>
      <th style="padding:7px 10px; text-align:center; font-size:11px; color:#fff; width:60px;">Total</th>
    </tr></thead>
    <tbody>${rows}${totalRow}</tbody>
  </table></div>`;
}
// Jumlahkan beberapa objek counts jadi satu (buat agregasi per-Desa dari counts per-Kelompok)
function jumlahkanCounts(daftarCounts) {
  const hasil = {};
  KATEGORI_JAMAAH_ORDER.forEach(k => { hasil[k] = { L:0, P:0 }; });
  daftarCounts.forEach(counts => {
    Object.entries(counts).forEach(([kat, c]) => {
      if (!hasil[kat]) hasil[kat] = { L:0, P:0 };
      hasil[kat].L += c.L; hasil[kat].P += c.P;
    });
  });
  return hasil;
}

/* --- Mode entri: PJP Kelompok --- */
async function renderJamaahEntry() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const canEdit = u.role === 'pjp_kelompok' || u.role === 'admin';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const kelompokNama = (App.cache.kelompok||[]).find(k => k.id === u.kelompok_id)?.nama || '';
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  let list = [], santriKlp = [], santriBelumTertaut = [], byId, santriIdToJamaahRow, linksByJamaahId, listUrut = [], childLinkMap = new Map(), dupSantriMap = new Map(), globalLinkedSantriIds = new Set(), globalLinkedAnakJamaahIds = new Set(), kategoriDariSantriMap = new Map();
  let searchQuery = '';
  let filterKategori = new Set();
  let filterKategoriOpen = false;

  // Susun urutan tampil per keluarga: Suami -> Istri -> Anak 1, 2, dst -> keluarga berikutnya.
  // Anak bisa berupa jamaah (belum jadi santri) ATAU jamaah yang sudah "Jadikan Santri" (masih ada barisnya di sini).
  async function refreshJamaahData() {
    list = await SB.jamaah.getByKelompok(u.kelompok_id) || [];
    santriKlp = await SB.santri.getByKelompok(u.kelompok_id) || [];
    // Kategori usia versi Data Santri (dari nama kelas asli, BUKAN hitung usia otomatis) —
    // dipakai buat nyocokin/deteksi beda sama kategori Data Jamaah.
    kategoriDariSantriMap = new Map();
    santriKlp.forEach(s => {
      const kat = kategoriDariNamaKelas(s.kelas?.nama_kelas);
      if (kat) kategoriDariSantriMap.set(s.id, kat);
    });
    const linkedSet = new Set((await SB.jamaahKeluarga.getBySantriIds(santriKlp.map(s => s.id)) || []).map(r => r.santri_id));
    santriBelumTertaut = santriKlp.filter(s => !linkedSet.has(s.id));

    const allLinks = await SB.jamaahKeluarga.getByJamaahIds(list.map(x => x.id)) || [];
    byId = new Map(list.map(x => [x.id, x]));
    santriIdToJamaahRow = new Map(list.filter(x => x.santri_id).map(x => [x.santri_id, x]));
    linksByJamaahId = new Map();
    allLinks.forEach(l => { (linksByJamaahId.get(l.jamaah_id) || linksByJamaahId.set(l.jamaah_id, []).get(l.jamaah_id)).push(l); });

    // Santri yang belum punya baris Data Jamaah sendiri (belum pernah lewat "Jadikan Santri")
    // dibikinkan baris "virtual" (cuma buat tampilan, gak tersimpan) — SEMUA santri begini,
    // TERTAUT KELUARGA ATAU BELUM SAMA SEKALI, supaya tetap ikut kehitung di jumlah/kategori.
    // Tautan keluarga cuma pengaruh ke URUTAN tampil (nempel di bawah ortu atau di daftar sisa),
    // BUKAN penentu ikut kehitung atau tidak.
    const santriIdSudahAdaJamaah = new Set(santriIdToJamaahRow.keys());
    santriKlp.filter(s => !santriIdSudahAdaJamaah.has(s.id)).forEach(s => {
      const virtualRow = {
        id: 'virtual_santri_' + s.id, nama: s.nama, jenis_kelamin: s.jenis_kel, tgl_lahir: s.tgl_lahir,
        santri_id: s.id, status_menikah: null, keterangan: null, no_hp: null, _virtual: true,
      };
      list.push(virtualRow);
      byId.set(virtualRow.id, virtualRow);
      santriIdToJamaahRow.set(s.id, virtualRow);
    });

    const processed = new Set();
    const families = [];
    const dewasaSorted = [...list]
      .filter(x => ['Dewasa','Istimewa'].includes(kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah)))
      .sort((a,b) => (a.nama||'').localeCompare(b.nama||''));

    dewasaSorted.forEach(adult => {
      if (processed.has(adult.id)) return;
      const pasangan = adult.pasangan_id ? byId.get(adult.pasangan_id) : null;
      let anggota;
      if (pasangan && !processed.has(pasangan.id)) {
        anggota = adult.jenis_kelamin === 'L' ? [adult, pasangan] : [pasangan, adult];
      } else {
        anggota = [adult];
      }
      anggota.forEach(a => processed.add(a.id));

      const childIds = new Set();
      anggota.forEach(a => {
        (linksByJamaahId.get(a.id) || []).forEach(l => {
          if (l.anak_jamaah_id) childIds.add(l.anak_jamaah_id);
          else if (l.santri_id && santriIdToJamaahRow.has(l.santri_id)) childIds.add(santriIdToJamaahRow.get(l.santri_id).id);
        });
      });
      const anak = [...childIds].map(id => byId.get(id)).filter(Boolean)
        .sort((a,b) => (a.tgl_lahir||'9999-99-99').localeCompare(b.tgl_lahir||'9999-99-99'));
      anak.forEach(a => processed.add(a.id));

      families.push([...anggota, ...anak]);
    });

    const sisa = list.filter(x => !processed.has(x.id)).sort((a,b) => (a.nama||'').localeCompare(b.nama||''));
    listUrut = families.flat().concat(sisa);

    // Peta anak (baris jamaah, baik yg masih murni jamaah maupun yg udah "Jadikan Santri")
    // -> record tautannya, dipakai buat tombol "Lepas Tautan" langsung di tabel.
    childLinkMap = new Map();
    allLinks.forEach(l => {
      const parentRow = byId.get(l.jamaah_id);
      if (!parentRow) return;
      if (l.anak_jamaah_id) {
        childLinkMap.set(l.anak_jamaah_id, { linkId: l.id, parentNama: parentRow.nama });
      } else if (l.santri_id && santriIdToJamaahRow.has(l.santri_id)) {
        childLinkMap.set(santriIdToJamaahRow.get(l.santri_id).id, { linkId: l.id, parentNama: parentRow.nama });
      }
    });
    // Set GLOBAL santri_id/anak_jamaah_id yang udah tertaut ke SIAPAPUN — dipakai buat filter
    // checklist supaya gak nawarin lagi anak yang udah tertaut ke ortu lain. Beda dari childLinkMap
    // di atas (yang cuma nyimpen link yg SANTRI-nya punya baris jamaah sendiri) — set ini nangkep
    // SEMUA link apa adanya, termasuk santri lama yg gak pernah lewat "Jadikan Santri".
    globalLinkedSantriIds = new Set(allLinks.filter(l => l.santri_id).map(l => l.santri_id));
    globalLinkedAnakJamaahIds = new Set(allLinks.filter(l => l.anak_jamaah_id).map(l => l.anak_jamaah_id));

    // Deteksi kemiripan nama dgn Data Santri yg SUDAH ADA — buat jamaah yg BELUM ditautkan
    // (x.santri_id kosong), supaya PJP ketahuan SEBELUM klik "Jadikan Santri" kalau ternyata
    // orangnya sudah pernah didaftarkan sebagai Santri lewat jalur lain (input manual/import Excel
    // lama), jadi gak bikin data dobel di kelas.
    const normNama = (s) => (s||'').toLowerCase().trim().replace(/\s+/g,' ');
    const santriByNormNama = new Map();
    santriKlp.forEach(s => {
      const key = normNama(s.nama);
      if (!santriByNormNama.has(key)) santriByNormNama.set(key, []);
      santriByNormNama.get(key).push(s);
    });
    dupSantriMap = new Map();
    list.forEach(x => {
      if (x.santri_id) return; // udah tertaut resmi, gak perlu dicek lagi
      const match = (santriByNormNama.get(normNama(x.nama)) || []).find(s => s.id !== x.santri_id);
      if (match) dupSantriMap.set(x.id, match);
    });
  }
  await refreshJamaahData();

  const pendingHtml = canEdit ? await renderPendingSection('jamaah', 'kelompok', u.kelompok_id, FORM_CONFIGS.jamaah, async (data) => {
    await SB.jamaah.insert({
      kelompok_id: u.kelompok_id, nama: toTitleCase(data.nama||''), jenis_kelamin: data.jenis_kelamin || null,
      tgl_lahir: data.tgl_lahir || null, status_menikah: data.status_menikah || null,
      no_hp: data.no_hp || null, keterangan: data.keterangan || null, aktif: true,
    });
    return true;
  }) : '';

  function render() {
    // Kategori "efektif" — sama persis logic yg dipakai di badge "Beda dgn usia" per baris,
    // di-share ke sini juga biar filter kategori 100% konsisten sama yg ditampilkan.
    function kategoriEfektif(x) {
      const katUsia = kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah);
      const katSantri = x.santri_id ? kategoriDariSantriMap.get(x.santri_id) : null;
      return (katSantri && katSantri !== katUsia) ? katSantri : katUsia;
    }
    const filteredListUrut = listUrut.filter(x => {
      if (searchQuery.trim() && !(x.nama||'').toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      if (filterKategori.size && !filterKategori.has(kategoriEfektif(x))) return false;
      return true;
    });
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data Jamaah</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Sensus keluarga lengkap kelompok — dasar data absensi Pengajian Kelompok</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="JMH_downloadPdf()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
          <button class="btn btn-outline btn-sm" onclick="JMH_cetakKartuQR()">🔖 Cetak Kartu QR (utk Absensi Pengajian)</button>
          ${canEdit ? `
          <button class="btn btn-outline btn-sm" onclick="JMH_downloadTemplate()">📥 Template Excel</button>
          <button class="btn btn-outline btn-sm" onclick="JMH_openImportExcel()">📊 Import Excel</button>
          ${shareLinkButtonHtml('jamaah', u.kelompok_id)}
          <button class="btn btn-green" onclick="JMH_tambah()">+ Tambah Jamaah</button>` : ''}
        </div>
      </div>

      ${pendingHtml}

      ${santriBelumTertaut.length ? `
      <div class="card" style="margin-bottom:16px; border:1.5px solid var(--gold);">
        <button class="btn btn-outline btn-sm" onclick="JMH_toggleBelumTertaut()">⚠️ ${santriBelumTertaut.length} Generus Belum Ada Data Keluarga</button>
        <div id="jmhBelumTertautList" style="display:none; margin-top:10px; font-size:12.5px; color:var(--ink-soft);">
          ${santriBelumTertaut.map(s => escHtml(s.nama)).join(', ')}
        </div>
      </div>` : ''}

      ${dupSantriMap.size ? `
      <div class="card" style="margin-bottom:16px; border:1.5px solid var(--rose);">
        <div style="font-size:12.5px; font-weight:700; color:var(--rose);">⚠️ ${dupSantriMap.size} Data Jamaah Mirip dengan Data Santri yang Sudah Ada</div>
        <div style="font-size:11.5px; color:var(--ink-soft); margin-top:4px;">Kemungkinan orang yang sama sudah tercatat 2 kali (di Data Jamaah dan Data Santri terpisah). Cek tanda ⚠️ merah di kolom Keterangan pada tabel di bawah, lalu pilih "Tautkan ke situ" kalau memang orang yang sama — supaya tidak double saat "Jadikan Santri".</div>
      </div>` : ''}

      <div class="card" style="margin-bottom:16px; padding:0; overflow:hidden;">
        ${jamaahKategoriTableHtml(list, kategoriDariSantriMap)}
      </div>

      <div class="card" style="margin-bottom:16px; text-align:center; padding:16px; max-width:220px;">
        <div style="font-size:11px; color:var(--ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px;">Jumlah KK</div>
        <div style="font-size:28px; font-weight:800; color:var(--green);">${list.filter(x => x.kepala_keluarga === true).length}</div>
        <div style="font-size:10.5px; color:var(--ink-soft); margin-top:2px;">Dari yang ditandai "Status Kepala Keluarga: Ya"</div>
      </div>

      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-start;">
          <div class="form-group" style="margin:0; flex:1; min-width:180px;">
            <label style="font-size:11px;">🔍 Cari Nama</label>
            <input type="text" id="jmhSearchInput" value="${escHtml(searchQuery)}" oninput="JMH_search(this.value)" placeholder="Ketik nama yang mau dicari..." style="width:100%;">
          </div>
          <div class="sd-wrap ${filterKategoriOpen?'sd-open':''}" style="flex:1; min-width:160px;">
            <label style="font-size:11px; display:block; margin-bottom:4px;">Filter Kategori</label>
            <div class="sd-trigger" onclick="JMH_toggleFilterKategori()" style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); background:var(--white); cursor:pointer;">
              <span style="font-size:13px;">${filterKategori.size ? `${filterKategori.size} kategori dipilih` : 'Semua Kategori'}</span>
              <svg class="sd-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--ink-soft);"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="sd-panel">
              <div style="border:1.5px solid var(--line); border-top:none; border-radius:0 0 var(--radius-sm) var(--radius-sm); padding:8px 12px; background:var(--white);">
                ${KATEGORI_JAMAAH_ORDER.map(k => `<label style="display:flex; align-items:center; gap:8px; padding:5px 0; font-size:13px; font-weight:400; cursor:pointer;">
                  <input type="checkbox" onchange="JMH_toggleKategoriCheck('${k}')" ${filterKategori.has(k)?'checked':''} style="width:16px; height:16px; margin:0;">
                  ${k}
                </label>`).join('')}
                ${filterKategori.size ? `<button class="btn btn-outline btn-sm" style="width:100%; margin-top:6px;" onclick="JMH_clearFilterKategori()">Kosongkan Pilihan</button>` : ''}
              </div>
            </div>
          </div>
        </div>
        ${(searchQuery.trim() || filterKategori.size) ? `<div style="font-size:11px; color:var(--ink-soft); margin-top:8px;">Menampilkan ${filteredListUrut.length} dari ${listUrut.length} data${searchQuery.trim() ? ` yang cocok dengan "${escHtml(searchQuery)}"` : ''}${filterKategori.size ? ` (kategori: ${[...filterKategori].map(escHtml).join(', ')})` : ''}</div>` : ''}
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        ${!list.length ? '<div style="text-align:center; padding:30px; color:var(--ink-soft); font-size:13px;">Belum ada data jamaah. Klik "+ Tambah Jamaah" untuk mulai.</div>' : (!filteredListUrut.length ? `<div style="text-align:center; padding:30px; color:var(--ink-soft); font-size:13px;">Tidak ada data yang cocok dengan filter saat ini.</div>` : `
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:650px;">
          <thead><tr style="background:var(--green);">
            <th style="padding:8px 6px; text-align:center; font-size:11px; color:#fff; width:36px;">No</th>
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff;">Nama</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff; width:50px;">L/P</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff; width:60px;">Usia</th>
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff; width:100px;">Kategori</th>
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff;">No. HP</th>
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff;">Keterangan</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff; width:110px;">Transfer Data</th>
            ${canEdit ? '<th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff; width:70px;">Aksi</th>' : ''}
          </tr></thead>
          <tbody>
            ${filteredListUrut.map((x, idx) => {
              const usia = x.tgl_lahir ? hitungUsia(x.tgl_lahir) : null;
              const katUsia = kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah);
              const katSantri = x.santri_id ? kategoriDariSantriMap.get(x.santri_id) : null;
              const adaBedaKategori = katSantri && katSantri !== katUsia;
              // Data Santri jadi ACUAN kalau beda dengan hasil hitung usia otomatis —
              // kelas yg sebenarnya diikuti lebih valid drpd hitungan usia semata.
              const kat = adaBedaKategori ? katSantri : katUsia;
              return `<tr style="border-bottom:1px solid var(--line);">
                <td style="padding:7px 6px; text-align:center; font-size:12px; color:var(--ink-soft);">${idx+1}</td>
                <td style="padding:7px 10px; font-size:13px; font-weight:600;">${escHtml(x.nama)}</td>
                <td style="padding:7px 10px; text-align:center; font-size:12px;">${escHtml(x.jenis_kelamin||'-')}</td>
                <td style="padding:7px 10px; text-align:center; font-size:12px;">${usia!=null ? usia+' th' : '-'}</td>
                <td style="padding:7px 10px; font-size:11.5px; color:${kat==='Istimewa'?'var(--gold)':'var(--ink-soft)'}; font-weight:${kat==='Istimewa'?'700':'500'};">
                  ${escHtml(kat)}
                  ${adaBedaKategori ? `<div style="margin-top:2px; font-size:10px; color:var(--rose); font-weight:700;" title="Hitungan usia: ${escHtml(katUsia)}, tapi kelas di Data Santri: ${escHtml(katSantri)}. Kategori di sini mengikuti Data Santri.">⚠️ Beda dgn usia (${escHtml(katUsia)})</div>` : ''}
                </td>
                <td style="padding:7px 10px; font-size:12px; color:var(--ink-soft);">${escHtml(x.no_hp||'-')}</td>
                <td style="padding:7px 10px; font-size:12px; color:var(--ink-soft);">
                  ${escHtml(x.keterangan||'-')}
                  ${childLinkMap.has(x.id) ? `<div style="margin-top:2px; font-size:10.5px;">
                    🔗 Anak dari <b>${escHtml(childLinkMap.get(x.id).parentNama)}</b>
                    ${canEdit ? ` · <a href="#" onclick="JMH_lepasTautan('${childLinkMap.get(x.id).linkId}','${escHtml(x.nama)}'); return false;" style="color:var(--rose);">Lepas Tautan</a>` : ''}
                  </div>` : ''}
                  ${dupSantriMap.has(x.id) ? `<div style="margin-top:2px; font-size:10.5px; color:var(--rose); font-weight:700;">
                    ⚠️ Mirip data Santri yang sudah ada
                    ${canEdit ? ` · <a href="#" onclick="JMH_tautkanSantriAda('${x.id}','${dupSantriMap.get(x.id).id}'); return false;" style="color:var(--rose); text-decoration:underline;">Tautkan ke situ</a>` : ''}
                  </div>` : ''}
                </td>
                <td style="padding:7px 10px; text-align:center;">
                  <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                    ${x.santri_id ? '<span style="font-size:10.5px; font-weight:700; color:var(--green);">✅ Generus</span>' : ''}
                    ${!x.santri_id && canEdit && ['PAUD/TK','Caberawit','Pra Remaja','Remaja','Pra Nikah'].includes(kat)
                      ? `<button class="btn btn-outline btn-sm" style="font-size:10.5px; padding:4px 8px;" onclick="JMH_jadikanSantri('${x.id}')">Jadikan Santri</button>` : ''}
                    ${canEdit && (hitungUsia(x.tgl_lahir) ?? 0) >= 17
                      ? `<button class="btn btn-outline btn-sm" style="font-size:10.5px; padding:4px 8px;" onclick="JMH_transferDewasa('${x.id}')">🔄 Transfer Data</button>` : ''}
                    ${!x.santri_id && !(canEdit && ['PAUD/TK','Caberawit','Pra Remaja','Remaja','Pra Nikah'].includes(kat)) && !(canEdit && (hitungUsia(x.tgl_lahir) ?? 0) >= 17)
                      ? '<span style="font-size:11px; color:var(--ink-soft);">-</span>' : ''}
                  </div>
                </td>
                ${canEdit ? `<td style="padding:7px 10px; text-align:center;">
                  ${x._virtual ? '<span style="font-size:10px; color:var(--ink-soft); font-style:italic;">Data Santri</span>' : `
                  <div style="display:flex; gap:3px; justify-content:center;">
                    <button class="btn-icon" onclick="JMH_edit('${x.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                    <button class="btn-icon danger" onclick="JMH_hapus(this.dataset.id, this.dataset.nama)" data-id="${x.id}" data-nama="${escHtml(x.nama)}" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
                  </div>`}
                </td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>`)}
      </div>
    `;
  }

  window.JMH_tambah = () => openJamaahModal(null);
  window.JMH_edit = (id) => openJamaahModal(list.find(x => x.id === id));

  window.JMH_tautkanSantriAda = async (jamaahId, santriId) => {
    const jm = list.find(x => x.id === jamaahId);
    const st = santriKlp.find(s => s.id === santriId);
    if (!jm || !st) return;
    if (!confirm(`Tautkan "${jm.nama}" ke data Santri "${st.nama}" yang sudah ada?\n\nData Jamaah ini akan ditandai sebagai orang yang sama dengan Santri itu — TIDAK akan dibuatkan data Santri baru (menghindari data dobel).`)) return;
    try {
      await SB.jamaah.update(jamaahId, { santri_id: santriId });
      logActivity('ubah', 'Data Jamaah', `Menautkan "${jm.nama}" ke data Santri yang sudah ada`);
      showToast('Berhasil ditautkan, tidak ada data dobel ✓');
      await refreshJamaahData();
      render();
    } catch(e) {
      showToast('Gagal menautkan: ' + e.message, true);
    }
  };

  window.JMH_lepasTautan = async (linkId, namaAnak) => {
    if (!confirm(`Lepas tautan keluarga untuk "${namaAnak}"?\nData jamaah/generusnya sendiri tidak akan terhapus, cuma tautan ke orang tuanya saja yang dilepas.`)) return;
    try {
      await SB.jamaahKeluarga.deleteByIds([linkId]);
      logActivity('ubah', 'Data Jamaah', `Melepas tautan keluarga untuk "${namaAnak}"`);
      showToast('Tautan berhasil dilepas ✓');
      await refreshJamaahData();
      render();
    } catch(e) {
      showToast('Gagal melepas tautan: ' + e.message, true);
    }
  };
  window.JMH_hapus = async (id, nama) => {
    if (!confirm(`Hapus data jamaah "${nama}"?`)) return;
    await SB.jamaah.softDelete(id);
    logActivity('hapus', 'Data Jamaah', `Menghapus data jamaah: ${nama}`);
    showToast('Data jamaah dihapus');
    await refreshJamaahData();
    render();
  };

  window.JMH_jadikanSantri = async (jamaahId) => {
    const jm = list.find(x => x.id === jamaahId);
    if (!jm) return;
    const kelasKlp = sortKelas(await SB.kelas.getByKelompok(u.kelompok_id) || []);

    let el = document.getElementById('jadikanSantriModal');
    if (!el) { el = document.createElement('div'); el.id = 'jadikanSantriModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Jadikan Data Santri — ${escHtml(jm.nama)}</h3><button class="modal-close" onclick="closeModal('jadikanSantriModal')">✕</button></div>
      <div class="modal-body">
        <div style="background:var(--green-soft); border-radius:8px; padding:12px; margin-bottom:14px; font-size:12.5px; line-height:1.7;">
          <b>${escHtml(jm.nama)}</b><br>
          ${jm.jenis_kelamin==='L'?'Laki-laki':'Perempuan'} · Lahir ${jm.tgl_lahir ? fmtDateShort(jm.tgl_lahir) : '-'}
        </div>
        ${dupSantriMap.has(jm.id) ? `<div style="background:#fbe4e4; border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:12px; color:var(--rose); font-weight:600;">
          ⚠️ Ada data Santri dengan nama yang mirip: <b>${escHtml(dupSantriMap.get(jm.id).nama)}</b>. Kalau ini orang yang sama, batalkan dan pakai "Tautkan ke situ" di Data Jamaah supaya tidak dobel.
        </div>` : ''}
        <div class="form-group">
          <label>Masukkan ke Kelas *</label>
          <select id="jsKelas">
            <option value="">Pilih kelas...</option>
            ${kelasKlp.map(k => `<option value="${k.id}">${escHtml(k.nama_kelas)} (${escHtml(k.jenjang)})</option>`).join('')}
          </select>
        </div>
        ${!kelasKlp.length ? '<div style="font-size:12px; color:var(--rose);">Belum ada kelas di kelompok ini. Buat kelas dulu lewat menu Kelola Kelas Generus.</div>' : ''}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('jadikanSantriModal')">Batal</button>
        <button class="btn btn-green" id="jsSaveBtn">Jadikan Santri</button>
      </div>
    </div>`;

    document.getElementById('jsSaveBtn').onclick = async () => {
      const kelasId = document.getElementById('jsKelas').value;
      if (!kelasId) { showToast('Pilih kelas dulu', true); return; }
      const btn = document.getElementById('jsSaveBtn');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        const res = await SB.santri.insert({
          nama: toTitleCase(jm.nama||''), jenis_kel: jm.jenis_kelamin || null,
          tgl_lahir: jm.tgl_lahir || null, kelas_id: kelasId, aktif: true,
        });
        const santriId = res?.[0]?.id;
        await SB.jamaah.update(jm.id, { santri_id: santriId });
        App.cache.allSantri = null;
        logActivity('tambah', 'Data Jamaah', `Menjadikan "${jm.nama}" sebagai data santri`);
        showToast(`${jm.nama} berhasil dijadikan data santri ✓`);
        closeModal('jadikanSantriModal');
        await refreshJamaahData();
        render();
      } catch(e) {
        showToast('Gagal: ' + e.message, true);
        btn.disabled = false; btn.textContent = 'Jadikan Santri';
      }
    };

    openModal('jadikanSantriModal');
  };

  // Transfer data jamaah usia 17+ (regardless kategori) ke MT/MS, Data Pengurus, atau Guru Sekolah —
  // hindari input ulang nama yang sama kalau orangnya sudah punya beberapa peran sekaligus.
  window.JMH_transferDewasa = async (jamaahId) => {
    const jm = list.find(x => x.id === jamaahId);
    if (!jm) return;
    if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
    const myKlp = (App.cache.kelompok||[]).find(k => k.id === u.kelompok_id);
    const myDesaId = myKlp?.desa_id || '';
    const DESA_NAMA_MAP = await loadDesaMap();

    // Kalau ini masih "baris bayangan" (santri yg belum py baris jamaah asli), bikinkan
    // dulu baris jamaah asli SEBELUM transfer apapun — SB.jamaah.update(jm.id,...) bakal
    // gagal 400 kalau id-nya masih 'virtual_santri_...' (bukan UUID asli).
    async function pastikanJamaahAsli() {
      if (!jm._virtual) return;
      const res = await SB.jamaah.insert({
        kelompok_id: u.kelompok_id, nama: jm.nama, jenis_kelamin: jm.jenis_kelamin,
        tgl_lahir: jm.tgl_lahir, status_menikah: jm.status_menikah, santri_id: jm.santri_id,
        no_hp: jm.no_hp, keterangan: jm.keterangan, aktif: true,
      });
      const idBaru = res?.[0]?.id;
      if (idBaru) { jm.id = idBaru; jm._virtual = false; }
    }

    let el = document.getElementById('jmhTransferModal');
    if (!el) { el = document.createElement('div'); el.id = 'jmhTransferModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }

    function render() {
      el.innerHTML = `<div class="modal modal-lg">
        <div class="modal-head"><h3 class="modal-title">Transfer Data — ${escHtml(jm.nama)}</h3><button class="modal-close" onclick="closeModal('jmhTransferModal')">✕</button></div>
        <div class="modal-body">
          <div style="background:var(--green-soft); border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:var(--green);">
            Pilih peran yang mau dibuatkan datanya — nama, jenis kelamin, tanggal lahir, dan No. HP otomatis kecopy dari Data Jamaah, tidak perlu ketik ulang. 1 orang boleh punya lebih dari 1 peran.
          </div>

          <div class="card" style="margin-bottom:12px; ${jm.mtms_id?'opacity:.6;':''}">
            <div class="fw-bold" style="font-size:13px; margin-bottom:8px;">📋 MT / MS</div>
            ${jm.mtms_id ? `<div style="font-size:12px; color:var(--green); font-weight:700;">✅ Sudah jadi data MT/MS</div>` : `
            <div class="form-group" style="margin-bottom:8px;">
              <select id="jtMtmsDapukan"><option value="">Pilih dapukan...</option><option value="MT">MT</option><option value="MS">MS</option></select>
            </div>
            <button class="btn btn-outline btn-sm" id="jtMtmsBtn">+ Jadikan MT/MS</button>`}
          </div>

          <div class="card" style="margin-bottom:12px;">
            <div class="fw-bold" style="font-size:13px; margin-bottom:8px;">🤝 Data Pengurus</div>
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:11.5px;">Level</label>
              <select id="jtPgrLevel" onchange="JMH_transferPgrLevelChange()">
                <option value="kelompok">Kelompok Saya (${escHtml(myKlp?.nama||'-')})</option>
                <option value="desa">Desa ${escHtml(DESA_NAMA_MAP[myDesaId]||'')}</option>
                <option value="daerah">Daerah</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:11.5px;">Kategori</label>
              <select id="jtPgrKategori" onchange="JMH_transferPgrKategoriChange()"><option value="">Pilih level dulu</option></select>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:11.5px;">Dapukan</label>
              <select id="jtPgrDapukan"><option value="">Pilih kategori dulu</option></select>
            </div>
            <button class="btn btn-outline btn-sm" id="jtPgrBtn">+ Tambahkan sebagai Pengurus</button>
          </div>

          <div class="card" style="${jm.guru_sekolah_id?'opacity:.6;':''}">
            <div class="fw-bold" style="font-size:13px; margin-bottom:8px;">🎓 Guru Sekolah</div>
            ${jm.guru_sekolah_id ? `<div style="font-size:12px; color:var(--green); font-weight:700;">✅ Sudah jadi data Guru Sekolah</div>` : `
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:11.5px;">Status Kepegawaian</label>
              <select id="jtGuruStatus"><option value="">Pilih...</option><option value="PNS">PNS</option><option value="PPPK">PPPK</option><option value="GTT">GTT</option><option value="GTY">GTY</option></select>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:11.5px;">Pendidikan Terakhir</label>
              <select id="jtGuruPendidikan"><option value="">Pilih...</option>${['SMA/SMK','D1','D2','D3','D4','S1','S2','S3'].map(p=>`<option value="${p}">${p}</option>`).join('')}</select>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:11.5px;">Penugasan Saat Ini</label>
              <input id="jtGuruPenugasan" placeholder="Misal: Guru Kelas 4 SDN 1">
            </div>
            <button class="btn btn-outline btn-sm" id="jtGuruBtn">+ Jadikan Guru Sekolah</button>`}
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" onclick="closeModal('jmhTransferModal')">Tutup</button>
        </div>
      </div>`;

      if (!jm.mtms_id) {
        document.getElementById('jtMtmsBtn').onclick = async () => {
          const dapukan = document.getElementById('jtMtmsDapukan').value;
          if (!dapukan) { showToast('Pilih dapukan MT/MS dulu', true); return; }
          const btn = document.getElementById('jtMtmsBtn');
          btn.disabled = true; btn.textContent = 'Menyimpan...';
          try {
            await pastikanJamaahAsli();
            const res = await SB.mtMs.insert({
              kelompok_id: u.kelompok_id, nama_lengkap: (jm.nama||'').toUpperCase(),
              gender: jm.jenis_kelamin || null, tgl_lahir: jm.tgl_lahir || null,
              dapukan, no_hp: jm.no_hp || null, dibuat_oleh: u.id,
            });
            await SB.jamaah.update(jm.id, { mtms_id: res?.[0]?.id });
            jm.mtms_id = res?.[0]?.id;
            logActivity('tambah', 'Data Jamaah', `Menjadikan "${jm.nama}" sebagai data MT/MS`);
            showToast(`${jm.nama} berhasil dijadikan MT/MS ✓`);
            render();
          } catch(e) { showToast('Gagal: ' + e.message, true); btn.disabled=false; btn.textContent='+ Jadikan MT/MS'; }
        };
      }

      document.getElementById('jtPgrBtn').onclick = async () => {
        const level = document.getElementById('jtPgrLevel').value;
        const dapukan = document.getElementById('jtPgrDapukan').value;
        if (!dapukan) { showToast('Pilih dapukan dulu', true); return; }
        const btn = document.getElementById('jtPgrBtn');
        btn.disabled = true; btn.textContent = 'Menyimpan...';
        try {
          let currentList = [];
          const payload = { nama: toTitleCase(jm.nama||''), jabatan: dapukan, tgl_lahir: jm.tgl_lahir || null, no_hp: jm.no_hp || null, aktif: true };
          if (level === 'kelompok') { payload.kelompok_id = u.kelompok_id; currentList = await SB.musPeserta.getByKelompok(u.kelompok_id) || []; }
          else if (level === 'desa') { payload.desa_id = myDesaId; currentList = await SB.musPeserta.getByDesa(myDesaId) || []; }
          else { payload.level_daerah = true; currentList = await SB.musPeserta.getByDaerah() || []; }
          if (DAPUKAN_SOLO.has(dapukan) && currentList.some(p => p.jabatan === dapukan)) {
            showToast(`${dapukan} di level itu sudah ada orangnya`, true);
            btn.disabled = false; btn.textContent = '+ Tambahkan sebagai Pengurus';
            return;
          }
          await SB.musPeserta.insert(payload);
          logActivity('tambah', 'Data Jamaah', `Menjadikan "${jm.nama}" sebagai Pengurus (${dapukan})`);
          showToast(`${jm.nama} berhasil ditambahkan sebagai ${dapukan} ✓`);
          btn.disabled = false; btn.textContent = '+ Tambahkan sebagai Pengurus';
        } catch(e) { showToast('Gagal: ' + e.message, true); btn.disabled=false; btn.textContent='+ Tambahkan sebagai Pengurus'; }
      };

      if (!jm.guru_sekolah_id) {
        document.getElementById('jtGuruBtn').onclick = async () => {
          const btn = document.getElementById('jtGuruBtn');
          btn.disabled = true; btn.textContent = 'Menyimpan...';
          try {
            await pastikanJamaahAsli();
            const res = await SB.guruSekolah.insert({
              kelompok_id: u.kelompok_id, nama_lengkap: (jm.nama||'').toUpperCase(),
              gender: jm.jenis_kelamin || null, tgl_lahir: jm.tgl_lahir || null,
              status_kepegawaian: document.getElementById('jtGuruStatus').value || null,
              pendidikan_terakhir: document.getElementById('jtGuruPendidikan').value || null,
              penugasan_saat_ini: document.getElementById('jtGuruPenugasan').value.trim() || null,
              no_wa: jm.no_hp || null, dibuat_oleh: u.id,
            });
            await SB.jamaah.update(jm.id, { guru_sekolah_id: res?.[0]?.id });
            jm.guru_sekolah_id = res?.[0]?.id;
            logActivity('tambah', 'Data Jamaah', `Menjadikan "${jm.nama}" sebagai data Guru Sekolah`);
            showToast(`${jm.nama} berhasil dijadikan Guru Sekolah ✓`);
            render();
          } catch(e) { showToast('Gagal: ' + e.message, true); btn.disabled=false; btn.textContent='+ Jadikan Guru Sekolah'; }
        };
      }

      JMH_transferPgrLevelChange();
    }

    window.JMH_transferPgrLevelChange = () => {
      const level = document.getElementById('jtPgrLevel')?.value;
      const catalog = DAPUKAN_CATALOG[level];
      const sel = document.getElementById('jtPgrKategori');
      if (!sel || !catalog) return;
      sel.innerHTML = `<option value="">Pilih kategori...</option>${Object.keys(catalog).map(g => `<option value="${escHtml(g)}">${escHtml(g)}</option>`).join('')}`;
      document.getElementById('jtPgrDapukan').innerHTML = '<option value="">Pilih kategori dulu</option>';
    };
    window.JMH_transferPgrKategoriChange = () => {
      const level = document.getElementById('jtPgrLevel')?.value;
      const kategori = document.getElementById('jtPgrKategori')?.value;
      const dapukanList = DAPUKAN_CATALOG[level]?.[kategori] || [];
      document.getElementById('jtPgrDapukan').innerHTML = `<option value="">Pilih dapukan...</option>${dapukanList.map(d => `<option value="${escHtml(d)}">${escHtml(d)}</option>`).join('')}`;
    };

    render();
    openModal('jmhTransferModal');
  };

  window.JMH_cetakKartuQR = () => {
    const kandidat = listUrut.filter(x => !x._virtual && PENGAJIAN_ELIGIBLE_KAT.includes(kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah)));
    if (!kandidat.length) { showToast('Belum ada generus usia Pra Remaja ke atas untuk dicetak kartunya', true); return; }

    let el = document.getElementById('jmhQrPilihModal');
    if (!el) { el = document.createElement('div'); el.id = 'jmhQrPilihModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal" style="max-width:480px;">
      <div class="modal-head"><h3 class="modal-title">🔖 Pilih Nama untuk Dicetak Kartu QR</h3><button class="modal-close" onclick="closeModal('jmhQrPilihModal')">✕</button></div>
      <div class="modal-body">
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button class="btn btn-outline btn-sm" onclick="JMH_qrPilihSemua(true)">Pilih Semua</button>
          <button class="btn btn-outline btn-sm" onclick="JMH_qrPilihSemua(false)">Kosongkan Semua</button>
        </div>
        <div style="max-height:320px; overflow-y:auto; border:1px solid var(--line); border-radius:6px; padding:6px 10px;">
          ${kandidat.map(x => `<div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid var(--line);">
            <input type="checkbox" id="jmhQrCk_${x.id}" class="jmhQrCk" value="${x.id}" checked style="flex:0 0 16px; width:16px; height:16px; margin:0;">
            <label for="jmhQrCk_${x.id}" style="flex:1 1 auto; font-size:13px; font-weight:400; cursor:pointer; margin:0;">${escHtml(x.nama)}</label>
          </div>`).join('')}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('jmhQrPilihModal')">Batal</button>
        <button class="btn btn-green" onclick="JMH_cetakKartuQRLanjut()">🖨️ Cetak yang Dipilih</button>
      </div>
    </div>`;
    openModal('jmhQrPilihModal');
  };

  window.JMH_qrPilihSemua = (checked) => {
    document.querySelectorAll('.jmhQrCk').forEach(el => { el.checked = checked; });
  };

  window.JMH_cetakKartuQRLanjut = () => {
    const dipilihIds = new Set(Array.from(document.querySelectorAll('.jmhQrCk:checked')).map(el => el.value));
    if (!dipilihIds.size) { showToast('Pilih minimal 1 nama dulu', true); return; }
    const kandidat = listUrut.filter(x => dipilihIds.has(x.id));
    closeModal('jmhQrPilihModal');
    // Pakai layanan gambar QR langsung (bukan pustaka JS yang perlu dimuat dari CDN) —
    // lebih tahan terhadap jaringan yang memblokir pemuatan script dari luar.
    const cardsHtml = kandidat.map(x => {
      const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=5&data=${encodeURIComponent(x.id)}`;
      const waLink = x.no_hp
        ? 'https://wa.me/62' + x.no_hp.replace(/^0/,'').replace(/[^0-9]/g,'')
          + '?text=' + encodeURIComponent(`Halo ${x.nama}, ini kartu QR untuk Absensi Pengajian kelompok ${kelompokNama||''}. Simpan gambar QR di link ini ke HP ya:\n${qrImgUrl}`)
        : '';
      return `<div class="qr-card">
          <img src="${qrImgUrl}" width="120" height="120" alt="QR ${escHtml(x.nama)}">
          <div class="qr-nama">${escHtml(x.nama)}</div>
          <div class="qr-klp">${escHtml(kelompokNama||'')}</div>
          ${waLink ? `<a href="${waLink}" target="_blank" class="wa-btn">📤 Kirim ke WA</a>` : '<div class="wa-none">No. HP belum ada</div>'}
        </div>`;
    });
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Kartu QR Absensi Pengajian — ${escHtml(kelompokNama||'')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .qr-card { border: 1.5px dashed #999; border-radius: 8px; padding: 10px; text-align: center; page-break-inside: avoid; }
          .qr-card img { display: block; margin: 0 auto 6px; }
          .qr-nama { font-weight: 700; font-size: 13px; }
          .qr-klp { font-size: 10px; color: #666; margin-bottom: 6px; }
          .wa-btn { display: inline-block; margin-top: 4px; padding: 5px 10px; background: #25D366; color: #fff; border-radius: 6px; font-size: 11px; text-decoration: none; }
          .wa-none { margin-top: 4px; font-size: 10px; color: #b33; }
          .print-btn { margin-bottom: 16px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
          @media print { .print-btn, .wa-btn, .wa-none { display: none; } }
        </style>
      </head><body>
        <button class="print-btn" onclick="window.print()">🖨️ Cetak Halaman Ini</button>
        <p style="font-size:12px; color:#666; margin:-10px 0 16px;">Mau dicetak fisik? Klik tombol di atas. Mau langsung dikirim ke HP masing-masing? Klik "Kirim ke WA" di tiap kartu (kalau No. HP-nya sudah tercatat di Data Jamaah).</p>

        <div class="qr-grid">${cardsHtml.join('')}</div>
      </body></html>`);
    win.document.close();
    showToast('Kartu QR siap — dibuka di tab baru ✓');
  };

  // ── Template Excel (dibuat langsung di browser, bukan file statis) ──
  window.JMH_downloadTemplate = async () => {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        s.onload = res;
        s.onerror = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.20.1/dist/xlsx.full.min.js';
          s2.onload = res; s2.onerror = rej;
          document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      }).catch(() => { showToast('Gagal memuat pustaka Excel — cek koneksi internet', true); throw new Error('xlsx gagal dimuat'); });
    }
    const aoa = [
      ['TEMPLATE DATA JAMAAH'],
      ['Isi mulai baris ke-5 (baris contoh di bawah boleh dihapus atau ditimpa).'],
      ['Kolom Tanggal Lahir wajib format YYYY-MM-DD. Kolom Status Pernikahan: menikah / belum_menikah / duda / janda (boleh dikosongkan kalau belum usia nikah).'],
      ['No', 'Nama', 'L/P', 'Tanggal Lahir', 'Status Pernikahan', 'No. HP', 'Keterangan'],
      [1, 'Ahmad Fulan bin Budi', 'L', '1990-05-15', 'menikah', '081234567890', 'Ayah dari Fulan'],
      [2, 'Siti Aminah binti Darto', 'P', '2015-03-20', '', '', 'Anak'],
    ];
    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:5},{wch:28},{wch:6},{wch:14},{wch:16},{wch:16},{wch:24}];
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:6} },
      { s:{r:1,c:0}, e:{r:1,c:6} },
      { s:{r:2,c:0}, e:{r:2,c:6} },
    ];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Data Jamaah');
    window.XLSX.writeFile(wb, 'Template_Data_Jamaah.xlsx');
  };

  // ── Import Excel ──
  window.JMH_openImportExcel = async () => {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        s.onload = res;
        s.onerror = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.20.1/dist/xlsx.full.min.js';
          s2.onload = res; s2.onerror = rej;
          document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      }).catch(() => { showToast('Gagal memuat pustaka Excel — cek koneksi internet', true); throw new Error('xlsx gagal dimuat'); });
    }

    let el = document.getElementById('jmhImportModal');
    if (!el) { el = document.createElement('div'); el.id = 'jmhImportModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal modal-lg">
      <div class="modal-head"><h3 class="modal-title">Import Data Jamaah dari Excel</h3><button class="modal-close" onclick="closeModal('jmhImportModal')">✕</button></div>
      <div class="modal-body">
        <div style="background:var(--green-soft); border-radius:var(--radius-sm); padding:12px 14px; margin-bottom:16px; font-size:13px; color:var(--green);">
          <b>Petunjuk:</b> Upload file Excel sesuai format Template. Sistem akan memvalidasi tiap baris sebelum menyimpan.
        </div>
        <div id="jmhImportDropZone"
          style="border:2px dashed var(--line); border-radius:var(--radius); padding:32px; text-align:center; cursor:pointer;"
          onclick="document.getElementById('jmhImportFileInput').click()"
          ondragover="event.preventDefault(); this.style.borderColor='var(--green)'; this.style.background='var(--green-soft)';"
          ondragleave="this.style.borderColor='var(--line)'; this.style.background='';"
          ondrop="event.preventDefault(); this.style.borderColor='var(--line)'; this.style.background=''; JMH_handleImportDrop(event);">
          <div style="font-size:32px; margin-bottom:8px;">📊</div>
          <div style="font-weight:700; color:var(--green); margin-bottom:4px;">Klik atau drag file Excel di sini</div>
          <div style="font-size:12px; color:var(--ink-soft);">Format: .xlsx · Template bisa diunduh dari tombol "Template Excel"</div>
          <input type="file" id="jmhImportFileInput" accept=".xlsx,.xls" style="display:none" onchange="JMH_handleImportFile(this.files[0])">
        </div>
        <div id="jmhImportPreview" style="margin-top:16px; display:none;">
          <div id="jmhImportStats" style="margin-bottom:10px;"></div>
          <div id="jmhImportTable" style="max-height:280px; overflow-y:auto;"></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('jmhImportModal')">Batal</button>
        <button class="btn btn-green" id="jmhImportSaveBtn" style="display:none;" onclick="JMH_doImportSave()">Simpan ke Database</button>
      </div>
    </div>`;

    let parsedRows = [];

    window.JMH_handleImportDrop = (e) => {
      const file = e.dataTransfer.files[0];
      if (file) JMH_handleImportFile(file);
    };

    window.JMH_handleImportFile = async (file) => {
      if (!file) return;
      document.getElementById('jmhImportPreview').style.display = 'none';
      document.getElementById('jmhImportSaveBtn').style.display = 'none';
      try {
        const buf = await file.arrayBuffer();
        const wb = window.XLSX.read(buf, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const range = window.XLSX.utils.decode_range(ws['!ref'] || 'A1:G20');
        parsedRows = [];

        for (let r = 4; r <= range.e.r; r++) { // baris ke-5 (0-indexed r=4) dan seterusnya
          const getCell = (col) => {
            const addr = window.XLSX.utils.encode_cell({ r, c: col });
            const cell = ws[addr];
            if (!cell) return '';
            if (cell.t === 'd') {
              const d = cell.v;
              return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            }
            return String(cell.v || '').trim();
          };

          const nama = getCell(1); // B
          const jk = getCell(2).toUpperCase(); // C
          const tglLahir = getCell(3); // D
          const statusNikah = getCell(4).toLowerCase(); // E
          const noHp = getCell(5); // F
          const keterangan = getCell(6); // G

          if (!nama && !tglLahir) continue;
          if (nama === 'Ahmad Fulan bin Budi' || nama === 'Siti Aminah binti Darto') continue;

          const rowNum = r + 1;
          const rowErrors = [];
          if (!nama) rowErrors.push('Nama kosong');
          if (!jk) rowErrors.push('L/P kosong');
          else if (!['L','P'].includes(jk)) rowErrors.push('L/P harus L atau P');
          if (tglLahir && !/^\d{4}-\d{2}-\d{2}$/.test(tglLahir)) rowErrors.push('Format tgl lahir salah (harus YYYY-MM-DD)');
          if (statusNikah && !['menikah','belum_menikah','duda','janda'].includes(statusNikah)) rowErrors.push('Status Pernikahan harus "menikah", "belum_menikah", "duda", atau "janda" (atau kosongkan)');

          parsedRows.push({
            _rowNum: rowNum, _errors: rowErrors,
            nama, jenis_kelamin: jk || null, tgl_lahir: tglLahir || null,
            status_menikah: statusNikah || null, no_hp: noHp || null, keterangan: keterangan || null,
            kelompok_id: u.kelompok_id,
          });
        }

        if (!parsedRows.length) { showToast('Tidak ada data. Pastikan data dimulai baris ke-5.', true); return; }

        const valid = parsedRows.filter(r => !r._errors.length);
        const invalid = parsedRows.filter(r => r._errors.length);

        document.getElementById('jmhImportStats').innerHTML = `
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <span class="badge badge-green">${valid.length} baris valid ✓</span>
            ${invalid.length ? `<span class="badge badge-rose">${invalid.length} baris error ✗</span>` : ''}
            <span class="badge badge-gray">${parsedRows.length} total</span>
          </div>`;

        document.getElementById('jmhImportTable').innerHTML = `
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <thead><tr style="background:var(--green); color:#fff;">
              <th style="padding:7px;">Baris</th><th style="padding:7px; text-align:left;">Nama</th>
              <th style="padding:7px;">L/P</th><th style="padding:7px;">Tgl Lahir</th>
              <th style="padding:7px; text-align:left;">Status</th>
            </tr></thead>
            <tbody>${parsedRows.map(r => {
              const bg = r._errors.length ? 'var(--rose-soft)' : '';
              return `<tr style="background:${bg}; border-bottom:1px solid var(--line);">
                <td style="padding:6px; text-align:center;">${r._rowNum}</td>
                <td style="padding:6px;"><b>${escHtml(r.nama)}</b></td>
                <td style="padding:6px; text-align:center;">${escHtml(r.jenis_kelamin||'—')}</td>
                <td style="padding:6px; text-align:center;">${escHtml(r.tgl_lahir||'—')}</td>
                <td style="padding:6px; font-size:11px; color:${r._errors.length?'var(--rose)':'var(--green)'};">
                  ${r._errors.length ? '✗ '+r._errors.join(', ') : '✓ OK'}
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>`;

        document.getElementById('jmhImportPreview').style.display = 'block';
        if (valid.length) {
          const btn = document.getElementById('jmhImportSaveBtn');
          btn.style.display = 'flex';
          btn.textContent = `Simpan ${valid.length} Jamaah ke Database`;
        }
      } catch(e) { showToast('Gagal membaca file: ' + e.message, true); }
    };

    window.JMH_doImportSave = async () => {
      const valid = parsedRows.filter(r => !r._errors.length);
      if (!valid.length) return;
      const btn = document.getElementById('jmhImportSaveBtn');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      let berhasil = 0, gagal = 0;
      for (let i = 0; i < valid.length; i += 20) {
        const batch = valid.slice(i, i+20).map(r => ({
          nama: toTitleCase(r.nama), jenis_kelamin: r.jenis_kelamin, tgl_lahir: r.tgl_lahir,
          status_menikah: r.status_menikah, no_hp: r.no_hp, keterangan: r.keterangan,
          kelompok_id: r.kelompok_id, aktif: true,
        }));
        try { await SB.jamaah.insert(batch); berhasil += batch.length; }
        catch(e) { gagal += batch.length; console.error(e); }
      }
      showToast(`Import selesai: ${berhasil} berhasil${gagal?', '+gagal+' gagal':''}`);
      closeModal('jmhImportModal');
      await refreshJamaahData();
      render();
    };

    openModal('jmhImportModal');
  };

  window.JMH_downloadPdf = async () => {
    if (!listUrut.length) { showToast('Belum ada data jamaah untuk diunduh', true); return; }
    showToast('Menyiapkan PDF...');
    if (!window.PDFLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = res; s.onerror = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
          s2.onload = res; s2.onerror = rej; document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      });
    }
    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const doc = await PDFDocument.create();
      const fBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fReg = await doc.embedFont(StandardFonts.Helvetica);
      const W = 595, H = 842, ML = 40, MR = 40, MT = 44;
      const GREEN = rgb(0.106, 0.227, 0.173), GOLD = rgb(0.66, 0.5, 0.15), GRAY = rgb(0.45, 0.45, 0.45);
      const LGREEN = rgb(0.93, 0.96, 0.93), WHITE = rgb(1, 1, 1), DARK = rgb(0.1, 0.1, 0.1);
      const COLS = [
        { key:'no', label:'No', x: ML,       w:22 },
        { key:'nama', label:'Nama', x: ML+24, w:150 },
        { key:'jk', label:'L/P', x: ML+176, w:26 },
        { key:'usia', label:'Usia', x: ML+204, w:34 },
        { key:'kat', label:'Kategori', x: ML+240, w:82 },
        { key:'hp', label:'No. HP', x: ML+324, w:90 },
        { key:'ket', label:'Keterangan', x: ML+416, w: W-MR-(ML+416) },
      ];

      let page, y, no = 1;
      function drawHeader() {
        page.drawRectangle({ x:0, y:H-40, width:W, height:40, color:GREEN });
        page.drawText('DATA JAMAAH', { x:ML, y:H-26, font:fBold, size:13, color:WHITE });
        page.drawText(escLatin(kelompokNama||''), { x:ML, y:H-38, font:fReg, size:8, color:rgb(0.85,0.9,0.85) });
        page.drawText('Dicetak: '+new Date().toLocaleDateString('id-ID'), { x:W-MR-120, y:H-26, font:fReg, size:8, color:rgb(0.85,0.9,0.85) });
        y = H - 58;
        // Header tabel
        page.drawRectangle({ x:ML, y:y-4, width:W-ML-MR, height:16, color:GOLD });
        COLS.forEach(c => page.drawText(c.label, { x:c.x+2, y:y, font:fBold, size:8, color:WHITE }));
        y -= 18;
      }
      function newPage() { page = doc.addPage([W,H]); drawHeader(); }
      function checkY() { if (y < 50) newPage(); }
      function escLatin(s) { return String(s||'').replace(/[^\x00-\xFF]/g, ''); }

      newPage();
      listUrut.forEach((x, i) => {
        checkY();
        const usia = x.tgl_lahir ? hitungUsia(x.tgl_lahir) : null;
        const kat = kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah);
        const bg = i % 2 === 0 ? LGREEN : WHITE;
        page.drawRectangle({ x:ML, y:y-3, width:W-ML-MR, height:13, color:bg });
        const vals = {
          no: String(no++), nama: escLatin(x.nama||'-'), jk: x.jenis_kelamin||'-',
          usia: usia!=null ? usia+' th' : '-', kat: escLatin(kat),
          hp: x.no_hp||'-', ket: escLatin(x.keterangan||'-'),
        };
        COLS.forEach(c => {
          let text = String(vals[c.key]||'-');
          const maxChars = Math.floor(c.w / 4.4);
          if (text.length > maxChars) text = text.slice(0, maxChars-1)+'.';
          page.drawText(text, { x:c.x+2, y, font: c.key==='nama'?fBold:fReg, size:7.8, color: c.key==='nama'?DARK:rgb(0.3,0.3,0.3) });
        });
        y -= 13;
      });

      doc.getPages().forEach((p, i) => {
        p.drawText('Hal '+(i+1)+'/'+doc.getPageCount(), { x:W/2-20, y:20, font:fReg, size:8, color:GRAY });
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type:'application/pdf' });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj; a.download = `Data_Jamaah_${(kelompokNama||'kelompok').replace(/\s+/g,'_')}.pdf`; a.click();
      URL.revokeObjectURL(urlObj);
      showToast('PDF berhasil diunduh');
    } catch(e) { showToast('Gagal membuat PDF: ' + e.message, true); }
  };

  window.JMH_toggleBelumTertaut = () => {
    const el = document.getElementById('jmhBelumTertautList');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.JMH_search = (val) => {
    searchQuery = val;
    const cursorPos = document.getElementById('jmhSearchInput')?.selectionStart;
    render();
    const newEl = document.getElementById('jmhSearchInput');
    if (newEl) { newEl.focus(); if (cursorPos != null) newEl.setSelectionRange(cursorPos, cursorPos); }
  };
  window.JMH_toggleFilterKategori = () => { filterKategoriOpen = !filterKategoriOpen; render(); };
  window.JMH_toggleKategoriCheck = (k) => {
    if (filterKategori.has(k)) filterKategori.delete(k); else filterKategori.add(k);
    filterKategoriOpen = true; // tetap kebuka biar bisa centang lebih dari 1 tanpa harus buka ulang
    render();
  };
  window.JMH_clearFilterKategori = () => {
    filterKategori.clear();
    filterKategoriOpen = true;
    render();
  };

  async function openJamaahModal(existing) {
    const kategori = existing ? kategoriUsiaJamaah(existing.tgl_lahir, existing.status_menikah) : null;
    const subPengajianList = await SB.subPengajian.getByKelompok(u.kelompok_id) || [];
    const showKeluarga = existing && (kategori === 'Dewasa' || kategori === 'Istimewa');
    let linkedSantriIds = new Set();
    let linkedJamaahIds = new Set();
    if (showKeluarga) {
      const links = await SB.jamaahKeluarga.getByJamaah(existing.id) || [];
      linkedSantriIds = new Set(links.filter(l => l.santri_id).map(l => l.santri_id));
      linkedJamaahIds = new Set(links.filter(l => l.anak_jamaah_id).map(l => l.anak_jamaah_id));
    }
    // Anak yang masih di Data Jamaah (belum jadi Santri) — termasuk Bayi <4th sekalipun.
    // Yang SUDAH tertaut ke ortu LAIN gak ditawarkan lagi di sini (biar gak dobel-tautan) —
    // tapi kalau tertaut ke ortu yang SEDANG diedit ini, tetap ditampilkan (buat uncheck=lepas tautan).
    const ANAK_KATEGORI = ['Bayi','PAUD/TK','Caberawit','Pra Remaja','Remaja'];
    const jamaahAnakCandidates = existing
      ? list.filter(x => x.id !== existing.id && !x.santri_id && ANAK_KATEGORI.includes(kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah))
          && !(globalLinkedAnakJamaahIds.has(x.id) && !linkedJamaahIds.has(x.id)))
      : [];
    // Santri yang ditawarkan di checklist juga dikecualikan kalau sudah tertaut ke ortu lain —
    // dicek 2 jalur: (a) link langsung via santri_id, (b) link LAMA via anak_jamaah_id ke baris
    // jamaah santri ini SEBELUM dia "Jadikan Santri" (link lama itu gak otomatis pindah waktu transfer,
    // jadi kalau cuma cek jalur (a) doang, kasus ini kelewat dan anaknya kelihatan gak tertaut lagi).
    const santriKlpForLink = santriKlp.filter(s => {
      const directLinked = globalLinkedSantriIds.has(s.id) && !linkedSantriIds.has(s.id);
      const jRow = santriIdToJamaahRow.get(s.id);
      const oldJamaahLinked = jRow && globalLinkedAnakJamaahIds.has(jRow.id) && !linkedJamaahIds.has(jRow.id);
      return !directLinked && !oldJamaahLinked;
    });
    // Kandidat pasangan — jamaah Dewasa/Istimewa lain yang belum ditautkan ke orang lain
    const pasanganCandidates = showKeluarga
      ? list.filter(x => x.id !== existing.id
          && (kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah) === 'Dewasa' || kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah) === 'Istimewa')
          && (!x.pasangan_id || x.pasangan_id === existing.id))
      : [];

    let el = document.getElementById('jamaahModal');
    if (!el) { el = document.createElement('div'); el.id = 'jamaahModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">${existing?'Edit':'Tambah'} Jamaah</h3><button class="modal-close" onclick="closeModal('jamaahModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Nama Lengkap *</label><input id="jmhNama" value="${escHtml(existing?.nama||'')}"></div>
        <div class="form-group"><label>Jenis Kelamin *</label>
          <select id="jmhJK"><option value="">Pilih...</option><option value="L" ${existing?.jenis_kelamin==='L'?'selected':''}>Laki-laki</option><option value="P" ${existing?.jenis_kelamin==='P'?'selected':''}>Perempuan</option></select>
        </div>
        <div class="form-group"><label>Tanggal Lahir</label>${tanggalLahirDropdownHtml('jmhTgl', existing?.tgl_lahir||'')}</div>
        <div class="form-group"><label>Status Pernikahan (kalau usia 19 th ke atas)</label>
          <select id="jmhStatusNikah"><option value="">Pilih...</option><option value="belum_menikah" ${existing?.status_menikah==='belum_menikah'?'selected':''}>Belum Menikah</option><option value="menikah" ${existing?.status_menikah==='menikah'?'selected':''}>Menikah</option><option value="duda" ${existing?.status_menikah==='duda'?'selected':''}>Duda</option><option value="janda" ${existing?.status_menikah==='janda'?'selected':''}>Janda</option></select>
        </div>
        <div class="form-group"><label>Status Kepala Keluarga</label>
          <select id="jmhKepalaKeluarga"><option value="">Pilih...</option><option value="ya" ${existing?.kepala_keluarga===true?'selected':''}>Ya</option><option value="tidak" ${existing?.kepala_keluarga===false?'selected':''}>Tidak</option></select>
          <div style="font-size:10.5px; color:var(--ink-soft); margin-top:3px;">Dasar hitung Jumlah KK — tandai "Ya" untuk 1 orang per rumah tangga (biasanya kepala keluarga/suami, tapi bisa siapa saja yang mewakili 1 KK).</div>
        </div>
        <div class="form-group"><label>No. HP / WhatsApp</label><input type="tel" inputmode="numeric" id="jmhHp" value="${escHtml(existing?.no_hp||'')}" placeholder="Contoh: 081234567890" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
        <div class="form-group"><label>Keterangan (opsional)</label><input id="jmhKet" value="${escHtml(existing?.keterangan||'')}" placeholder="Misal: Ahmad (anak) / Ortu dari Ahmad"></div>
        ${existing && ['Pra Remaja','Remaja','Pra Nikah','Dewasa','Istimewa'].includes(kategori) ? `
        <div class="form-group"><label>Sub Pengajian (opsional)</label>
          <select id="jmhSubPengajian">
            <option value="">Belum ada sub</option>
            ${subPengajianList.map(s => `<option value="${s.id}" ${existing?.sub_pengajian_id===s.id?'selected':''}>${escHtml(s.nama)}</option>`).join('')}
          </select>
          ${!subPengajianList.length ? '<div style="font-size:10.5px; color:var(--ink-soft); margin-top:3px;">Belum ada Sub Pengajian — buat dulu di menu "Nama Sub Pengajian".</div>' : ''}
        </div>` : ''}
        ${showKeluarga ? `
        <div class="form-group">
          <label>Pasangan (Suami/Istri) — supaya keluarga tampil berurutan</label>
          <select id="jmhPasangan">
            <option value="">Tidak ada / belum ditautkan</option>
            ${pasanganCandidates.map(x => `<option value="${x.id}" ${existing.pasangan_id===x.id?'selected':''}>${escHtml(x.nama)}</option>`).join('')}
          </select>
        </div>` : ''}
        ${showKeluarga ? `
        <div class="form-group">
          <label>Anak — centang semua yang jadi anaknya (termasuk yang masih Bayi)</label>
          <div style="max-height:220px; overflow-y:auto; border:1px solid var(--line); border-radius:var(--radius-sm); padding:6px 10px;">
            ${santriKlpForLink.length || jamaahAnakCandidates.length ? `
              ${santriKlpForLink.length ? `<div style="font-size:10.5px; font-weight:700; color:var(--green); text-transform:uppercase; margin:4px 0;">Sudah jadi Generus (Data Santri)</div>
                ${santriKlpForLink.map(s => `
                  <div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid var(--line);">
                    <input type="checkbox" id="jmhAnak_s_${s.id}" class="jmhAnak" data-tipe="santri" value="${s.id}" ${linkedSantriIds.has(s.id)?'checked':''} style="flex:0 0 16px; width:16px; height:16px; margin:0;">
                    <label for="jmhAnak_s_${s.id}" style="flex:1 1 auto; display:block; font-size:13px; font-weight:400; text-transform:none; letter-spacing:normal; color:var(--ink); margin:0; cursor:pointer;">${escHtml(s.nama)}</label>
                  </div>`).join('')}` : ''}
              ${jamaahAnakCandidates.length ? `<div style="font-size:10.5px; font-weight:700; color:var(--gold); text-transform:uppercase; margin:8px 0 4px;">Belum jadi Generus (masih Data Jamaah)</div>
                ${jamaahAnakCandidates.map(x => `
                  <div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid var(--line);">
                    <input type="checkbox" id="jmhAnak_j_${x.id}" class="jmhAnak" data-tipe="jamaah" value="${x.id}" ${linkedJamaahIds.has(x.id)?'checked':''} style="flex:0 0 16px; width:16px; height:16px; margin:0;">
                    <label for="jmhAnak_j_${x.id}" style="flex:1 1 auto; display:block; font-size:13px; font-weight:400; text-transform:none; letter-spacing:normal; color:var(--ink); margin:0; cursor:pointer;">${escHtml(x.nama)} <span style="font-size:10.5px; color:var(--ink-soft);">(${escHtml(kategoriUsiaJamaah(x.tgl_lahir, x.status_menikah))})</span></label>
                  </div>`).join('')}` : ''}
            ` : '<div style="font-size:12px; color:var(--ink-soft); padding:6px 0;">Belum ada calon anak (Santri/Jamaah) di kelompok ini — mungkin semuanya sudah tertaut ke ortu lain.</div>'}
          </div>
        </div>` : (existing ? `<div style="font-size:11.5px; color:var(--ink-soft);">Penautan anak cuma tersedia untuk jamaah kategori Dewasa/Istimewa.</div>` : '')}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('jamaahModal')">Batal</button>
        <button class="btn btn-green" id="jmhSaveBtn">Simpan</button>
      </div>
    </div>`;
    document.getElementById('jmhSaveBtn').onclick = async () => {
      const nama = document.getElementById('jmhNama').value.trim();
      const jk = document.getElementById('jmhJK').value;
      const tgl = bacaTanggalDropdown('jmhTgl') || null;
      const statusNikah = document.getElementById('jmhStatusNikah').value || null;
      const kkRaw = document.getElementById('jmhKepalaKeluarga').value;
      const kepalaKeluarga = kkRaw === 'ya' ? true : (kkRaw === 'tidak' ? false : null);
      const hp = document.getElementById('jmhHp').value.trim() || null;
      const ket = document.getElementById('jmhKet').value.trim() || null;
      const subPengajianEl = document.getElementById('jmhSubPengajian');
      const subPengajianId = subPengajianEl ? (subPengajianEl.value || null) : undefined;
      if (!nama || !jk) { showToast('Nama dan Jenis Kelamin wajib diisi', true); return; }
      const btn = document.getElementById('jmhSaveBtn');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        let jamaahId = existing?.id;
        if (existing) {
          const updatePayload = { nama: toTitleCase(nama), jenis_kelamin: jk, tgl_lahir: tgl, status_menikah: statusNikah, kepala_keluarga: kepalaKeluarga, no_hp: hp, keterangan: ket };
          if (subPengajianId !== undefined) updatePayload.sub_pengajian_id = subPengajianId;
          await SB.jamaah.update(existing.id, updatePayload);
          logActivity('ubah', 'Data Jamaah', `Mengubah data jamaah: ${nama}`);
        } else {
          const res = await SB.jamaah.insert({ kelompok_id: u.kelompok_id, nama: toTitleCase(nama), jenis_kelamin: jk, tgl_lahir: tgl, status_menikah: statusNikah, kepala_keluarga: kepalaKeluarga, no_hp: hp, keterangan: ket, aktif: true });
          jamaahId = res?.[0]?.id;
          logActivity('tambah', 'Data Jamaah', `Menambah data jamaah: ${nama}`);
        }
        // Sinkronkan tautan pasangan (dua arah — kalau A pilih B, B juga ikut nunjuk ke A)
        if (showKeluarga && jamaahId) {
          const pasanganBaru = document.getElementById('jmhPasangan')?.value || null;
          const pasanganLama = existing.pasangan_id || null;
          if (pasanganBaru !== pasanganLama) {
            // Lepaskan pasangan lama dulu kalau ada
            if (pasanganLama) await SB.jamaah.update(pasanganLama, { pasangan_id: null });
            // Kalau pasangan baru itu sendiri sedang tertaut ke orang lain, lepas dulu tautan lamanya
            if (pasanganBaru) {
              const target = list.find(x => x.id === pasanganBaru);
              if (target?.pasangan_id && target.pasangan_id !== jamaahId) {
                await SB.jamaah.update(target.pasangan_id, { pasangan_id: null });
              }
              await SB.jamaah.update(pasanganBaru, { pasangan_id: jamaahId });
            }
            await SB.jamaah.update(jamaahId, { pasangan_id: pasanganBaru });
          }
        }
        // Sinkronkan tautan anak (Santri & Jamaah) kalau bagian itu tampil
        if (showKeluarga && jamaahId) {
          const checkedSantri = new Set(Array.from(document.querySelectorAll('.jmhAnak[data-tipe="santri"]:checked')).map(c => c.value));
          const checkedJamaah = new Set(Array.from(document.querySelectorAll('.jmhAnak[data-tipe="jamaah"]:checked')).map(c => c.value));
          const toAdd = [
            ...[...checkedSantri].filter(id => !linkedSantriIds.has(id)).map(santriId => ({ jamaah_id: jamaahId, santri_id: santriId })),
            ...[...checkedJamaah].filter(id => !linkedJamaahIds.has(id)).map(anakId => ({ jamaah_id: jamaahId, anak_jamaah_id: anakId })),
          ];
          const currentLinks = await SB.jamaahKeluarga.getByJamaah(jamaahId) || [];
          const toRemoveLinkIds = currentLinks
            .filter(l => (l.santri_id && !checkedSantri.has(l.santri_id)) || (l.anak_jamaah_id && !checkedJamaah.has(l.anak_jamaah_id)))
            .map(l => l.id);
          await SB.jamaahKeluarga.insertBulk(toAdd);
          await SB.jamaahKeluarga.deleteByIds(toRemoveLinkIds);
        }
        showToast('Tersimpan ✓');
        closeModal('jamaahModal');
        await refreshJamaahData();
        render();
      } catch(e) { showToast('Gagal: ' + e.message, true); btn.disabled=false; btn.textContent='Simpan'; }
    };
    openModal('jamaahModal');
  }

  render();
}

/* --- Mode rekap: Desa / Daerah / Admin --- */
async function renderJamaahRekap() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

  const kelompokScope = (isAdmin || isDaerah)
    ? (App.cache.kelompok || [])
    : (App.cache.kelompok || []).filter(k => k.desa_id === u.desa_id);

  // Ambil hitungan LANGSUNG dari fungsi kanonik yang sama dipakai halaman Data Jamaah tiap
  // kelompok (& Penerobosan Pusat) — BUKAN nge-fetch mentahan terus hitung ulang sendiri di
  // sini. Jadi rekap Desa/Daerah ini DIJAMIN sama persis angkanya sama yang dilihat PJP
  // Kelompok masing-masing, gak akan pernah beda lagi krn sumbernya emang satu.
  const semuaKelompokUntukSeDaerah = (isDesa) ? (App.cache.kelompok || []) : kelompokScope;
  const hasilPerKelompok = await Promise.all(semuaKelompokUntukSeDaerah.map(async k => {
    const { counts } = await hitungJamaahPerKategoriKelompok(k.id);
    return { kelompok: k, counts };
  }));
  const countsByKelompokId = new Map(hasilPerKelompok.map(r => [r.kelompok.id, r.counts]));

  function statsFromCounts(counts) {
    let total=0, L=0, P=0, lansiaL=0, lansiaP=0;
    Object.entries(counts).forEach(([kat, c]) => {
      total += c.L + c.P; L += c.L; P += c.P;
      if (kat === 'Istimewa') { lansiaL += c.L; lansiaP += c.P; }
    });
    return { total, L, P, lansiaL, lansiaP };
  }

  function detailPerKelompokHtml(klpList, idPrefix) {
    if (!klpList.length) {
      return `<div id="${idPrefix}" style="display:none; margin-top:10px; padding:14px; text-align:center; font-size:12px; color:var(--ink-soft); border:1px solid var(--line); border-radius:8px;">Belum ada kelompok terdaftar di sini.</div>`;
    }
    const rows = klpList.map(k => {
      const c = statsFromCounts(countsByKelompokId.get(k.id) || {});
      return `<tr style="border-bottom:1px solid var(--line);">
        <td style="padding:6px 10px; font-size:12.5px; font-weight:600;">${escHtml(k.nama)}</td>
        <td style="padding:6px 10px; text-align:center; font-size:12px;">${c.L}</td>
        <td style="padding:6px 10px; text-align:center; font-size:12px;">${c.P}</td>
        <td style="padding:6px 10px; text-align:center; font-size:12px; font-weight:700;">${c.total}</td>
        <td style="padding:6px 10px; text-align:center; font-size:12px; color:var(--gold); font-weight:700;">${c.lansiaL}</td>
        <td style="padding:6px 10px; text-align:center; font-size:12px; color:var(--gold); font-weight:700;">${c.lansiaP}</td>
      </tr>`;
    }).join('');
    return `<div id="${idPrefix}" style="display:none; margin-top:10px; border:1px solid var(--line); border-radius:8px; overflow:hidden;">
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr style="background:var(--green);">
          <th style="padding:6px 10px; text-align:left; font-size:10.5px; color:#fff;">Kelompok</th>
          <th style="padding:6px 10px; text-align:center; font-size:10.5px; color:#fff;">L</th>
          <th style="padding:6px 10px; text-align:center; font-size:10.5px; color:#fff;">P</th>
          <th style="padding:6px 10px; text-align:center; font-size:10.5px; color:#fff;">Total</th>
          <th style="padding:6px 10px; text-align:center; font-size:10.5px; color:#fff;">Istimewa L</th>
          <th style="padding:6px 10px; text-align:center; font-size:10.5px; color:#fff;">Istimewa P</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  window.JMH_toggleDetail = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  // Total se-daerah — selalu dari SEMUA kelompok (bukan cuma scope si viewer), supaya Desa
  // pun tetap bisa lihat gambaran besar seluruh daerah.
  const countsSeDaerah = jumlahkanCounts([...countsByKelompokId.values()]);
  const cSeDaerah = statsFromCounts(countsSeDaerah);
  const totalSeDaerahHtml = `<div class="card" style="margin-bottom:14px; text-align:center; padding:18px;">
    <div style="font-size:11.5px; color:var(--ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px;">Total Jamaah Se-Daerah</div>
    <div style="font-size:30px; font-weight:800; color:var(--green); margin-bottom:6px;">${cSeDaerah.total}</div>
    <div style="font-size:13px; color:#000;">L: <b style="color:#000;">${cSeDaerah.L}</b> &nbsp;·&nbsp; P: <b style="color:#000;">${cSeDaerah.P}</b></div>
  </div>`;

  let bodyHtml = totalSeDaerahHtml;
  const DESA_NAMA_MAP = await loadDesaMap();
  if (isDesa) {
    const countsDesaIni = jumlahkanCounts(kelompokScope.map(k => countsByKelompokId.get(k.id) || {}));
    bodyHtml += `
      <div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">${jamaahKategoriTableHtmlFromCounts(countsDesaIni)}</div>
      <div class="card">
        <button class="btn btn-outline btn-sm" onclick="JMH_toggleDetail('jmhDetailDesa')">📋 Detail per Kelompok</button>
        ${detailPerKelompokHtml(kelompokScope, 'jmhDetailDesa')}
      </div>`;
  } else {
    // Admin / Daerah — total keseluruhan + breakdown per Desa, tiap Desa bisa dibuka lagi
    // detail per Kelompok-nya (sesuai diminta: dipecah per Desa, lalu tiap Kelompok di dalamnya).
    const byDesa = {};
    kelompokScope.forEach(k => { (byDesa[k.desa_id] ||= []).push(k); });
    bodyHtml += `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">${jamaahKategoriTableHtmlFromCounts(countsSeDaerah)}</div>` + (Object.keys(byDesa).length ? Object.entries(byDesa).map(([did, klpList]) => {
      const countsDesa = jumlahkanCounts(klpList.map(k => countsByKelompokId.get(k.id) || {}));
      const c = statsFromCounts(countsDesa);
      const idp = 'jmhDetail_' + did;
      return `<div class="card" style="margin-bottom:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div class="fw-bold color-green" style="font-size:13.5px;">🏘️ ${escHtml(DESA_NAMA_MAP[did]||did)}</div>
          <div style="font-size:12px; color:var(--ink-soft);">Total: <b>${c.total}</b> · L: <b>${c.L}</b> · P: <b>${c.P}</b> · Istimewa L: <b style="color:var(--gold);">${c.lansiaL}</b> · Istimewa P: <b style="color:var(--gold);">${c.lansiaP}</b></div>
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="JMH_toggleDetail('${idp}')">📋 Detail per Kelompok</button>
        ${detailPerKelompokHtml(klpList, idp)}
      </div>`;
    }).join('') : `<div class="card" style="text-align:center; padding:24px; color:var(--ink-soft); font-size:13px;">Belum ada data kelompok/desa untuk ditampilkan.</div>`);
  }

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Data Jamaah</h1>
        <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Rekap sensus jamaah — dasar data absensi Pengajian Kelompok</p>
      </div>
    </div>
    ${bodyHtml}
  `;
}


async function renderLogAktivitas() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  let allLogs = await SB.activityLog.getAll(300) || [];
  let filterModul = '';
  let filterAksi = '';
  let searchQ = '';

  const ACTION_META = {
    login:  { icon: '🔓', color: 'var(--green)', label: 'Login' },
    logout: { icon: '🔒', color: 'var(--ink-soft)', label: 'Logout' },
    tambah: { icon: '➕', color: 'var(--green)', label: 'Tambah' },
    ubah:   { icon: '✏️', color: '#e6a817', label: 'Ubah' },
    hapus:  { icon: '🗑️', color: 'var(--rose)', label: 'Hapus' },
  };

  function buildRows() {
    let filtered = allLogs;
    if (filterModul) filtered = filtered.filter(l => l.modul === filterModul);
    if (filterAksi) filtered = filtered.filter(l => l.action === filterAksi);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      filtered = filtered.filter(l =>
        (l.nama_lengkap||'').toLowerCase().includes(q) ||
        (l.keterangan||'').toLowerCase().includes(q)
      );
    }
    const rows = filtered.map(l => {
      const meta = ACTION_META[l.action] || { icon:'•', color:'var(--ink-soft)', label: l.action };
      return `<tr style="border-bottom:1px solid var(--line);">
        <td style="padding:6px 8px; font-size:11px; color:var(--ink-soft); white-space:nowrap;">${fmtDateShort(l.created_at)} ${new Date(l.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td>
        <td style="padding:6px 8px; font-size:12.5px; font-weight:600; color:#111;">${escHtml(l.nama_lengkap||'-')}</td>
        <td style="padding:6px 8px; font-size:11px; color:var(--ink-soft);">${escHtml(ROLE_LABELS[l.role]||l.role||'-')}</td>
        <td style="padding:6px 8px; font-size:12px;">${escHtml(l.modul||'-')}</td>
        <td style="padding:6px 8px; font-size:12px; font-weight:700; color:${meta.color};">${meta.icon} ${meta.label}</td>
        <td style="padding:6px 8px; font-size:12px; color:#111;">${escHtml(l.keterangan||'')}</td>
      </tr>`;
    }).join('');
    return { rows: rows || '<tr><td colspan="6" style="text-align:center; color:var(--ink-soft); padding:24px;">Tidak ada data</td></tr>', count: filtered.length };
  }

  function updateTable() {
    const { rows, count } = buildRows();
    document.getElementById('logTbody').innerHTML = rows;
    document.getElementById('logCount').textContent = `${count} dari ${allLogs.length} catatan (300 terbaru)`;
  }

  function render() {
    const modulList = [...new Set(allLogs.map(l => l.modul))].sort();
    const { rows, count } = buildRows();

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Log Aktivitas</h1>
          <p id="logCount" style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${count} dari ${allLogs.length} catatan (300 terbaru)</p>
        </div>
        <button class="btn btn-danger" onclick="LOG_hapusModal()">🗑️ Hapus Log</button>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="form-row">
          <div class="form-group">
            <label>Cari (nama / keterangan)</label>
            <input id="logSearch" value="${escHtml(searchQ)}" placeholder="ketik untuk mencari...">
          </div>
          <div class="form-group">
            <label>Modul</label>
            <select id="logModul">
              <option value="">Semua Modul</option>
              ${modulList.map(m => `<option value="${escHtml(m)}" ${filterModul===m?'selected':''}>${escHtml(m)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Aksi</label>
            <select id="logAksi">
              <option value="">Semua Aksi</option>
              ${Object.entries(ACTION_META).map(([k,v]) => `<option value="${k}" ${filterAksi===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:700px;">
          <thead><tr style="background:var(--green);">
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Waktu</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Nama</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Level</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Modul</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Aksi</th>
            <th style="color:#fff; padding:7px 8px; font-size:11px; text-align:left;">Keterangan</th>
          </tr></thead>
          <tbody id="logTbody">${rows}</tbody>
        </table></div>
      </div>
    `;

    document.getElementById('logSearch').oninput = (e) => { searchQ = e.target.value; updateTable(); };
    document.getElementById('logModul').onchange = (e) => { filterModul = e.target.value; updateTable(); };
    document.getElementById('logAksi').onchange = (e) => { filterAksi = e.target.value; updateTable(); };
  }

  window.LOG_hapusModal = () => {
    let el = document.getElementById('logHapusModal');
    if (!el) { el = document.createElement('div'); el.id = 'logHapusModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    const today = new Date().toISOString().slice(0,10);
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">Hapus Log Aktivitas</h3><button class="modal-close" onclick="closeModal('logHapusModal')">✕</button></div>
      <div class="modal-body">
        <div style="font-size:12px; color:var(--ink-soft); margin-bottom:12px;">Pilih rentang tanggal yang ingin dihapus. Data yang dihapus tidak bisa dikembalikan.</div>
        <div class="form-row">
          <div class="form-group"><label>Dari Tanggal</label><input type="date" id="logHapusDari" value="${today}"></div>
          <div class="form-group"><label>Sampai Tanggal</label><input type="date" id="logHapusSampai" value="${today}"></div>
        </div>
        <div style="border-top:1px solid var(--line); margin-top:8px; padding-top:10px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--rose); font-weight:600;">
            <input type="checkbox" id="logHapusSemua"> Hapus SEMUA log (abaikan rentang tanggal di atas)
          </label>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('logHapusModal')">Batal</button>
        <button class="btn btn-danger" id="logHapusBtn">Hapus</button>
      </div>
    </div>`;

    document.getElementById('logHapusBtn').onclick = async () => {
      const hapusSemua = document.getElementById('logHapusSemua').checked;
      const dari = document.getElementById('logHapusDari').value;
      const sampai = document.getElementById('logHapusSampai').value;

      if (!hapusSemua && (!dari || !sampai)) { showToast('Pilih tanggal dari dan sampai', true); return; }
      if (!hapusSemua && dari > sampai) { showToast('Tanggal "Dari" harus sebelum "Sampai"', true); return; }

      const confirmMsg = hapusSemua
        ? 'Yakin hapus SEMUA log aktivitas? Tindakan ini tidak bisa dibatalkan.'
        : `Yakin hapus log dari ${fmtDateShort(dari)} sampai ${fmtDateShort(sampai)}? Tindakan ini tidak bisa dibatalkan.`;
      if (!confirm(confirmMsg)) return;

      const btn = document.getElementById('logHapusBtn');
      btn.disabled = true; btn.textContent = 'Menghapus...';
      try {
        if (hapusSemua) {
          await SB.activityLog.deleteAll();
        } else {
          await SB.activityLog.deleteRange(`${dari}T00:00:00`, `${sampai}T23:59:59`);
        }
        logActivity('hapus', 'Log Aktivitas', hapusSemua ? 'Menghapus semua log aktivitas' : `Menghapus log ${dari} s/d ${sampai}`);
        showToast('Log berhasil dihapus');
        closeModal('logHapusModal');
        allLogs = await SB.activityLog.getAll(300) || [];
        render();
      } catch(e) {
        showToast('Gagal: ' + e.message, true);
      } finally {
        btn.disabled = false; btn.textContent = 'Hapus';
      }
    };

    openModal('logHapusModal');
  };

  render();
}

/* ===== PAGE: RAPORT CABERAWIT ===== */
async function renderRaportCaberawit() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';

  const SECTION_LABEL = { A: 'A. Akhlaqul Karimah', B: 'B. Alim Faqih', C: 'C. Kemandirian' };
  const JENJANG_LIST_RAPORT = ['PAUD TK','SD 1','SD 2','SD 3','SD 4','SD 5','SD 6'];

  function hitungPredikat(nilai, skala) {
    if (nilai === null || nilai === undefined || nilai === '') return '';
    const n = Number(nilai);
    if (isNaN(n)) return '';
    if (skala === 'alim_faqih') {
      if (n > 96) return 'A+';
      if (n >= 90) return 'A';
      if (n >= 86) return 'B+';
      if (n >= 80) return 'B';
      if (n >= 76) return 'C+';
      return 'C'; // termasuk di bawah 70 — tetap predikat terendah
    } else {
      if (n > 96) return 'A+';
      if (n >= 90) return 'A';
      if (n >= 86) return 'B+';
      if (n >= 80) return 'B';
      if (n >= 70) return 'C';
      return 'D'; // termasuk di bawah 60 — tetap predikat terendah
    }
  }

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // === Penentuan kelompok scope (admin perlu pilih dulu, mirip halaman Rekap) ===
  let myKelompokId = u.kelompok_id || null;
  if (isAdmin && !App.cache.raportKelompokId) {
    main.innerHTML = `
      <div class="page-header"><h1 class="page-title">Raport Caberawit</h1></div>
      <div class="card">
        <p style="margin:0 0 14px; font-size:13.5px; color:var(--ink-soft);">Pilih kelompok untuk mengisi/lihat raport.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          <div style="flex:1; min-width:200px;">
            <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); display:block; margin-bottom:5px;">Kelompok</label>
            <select id="rcKelompokSel" style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px;">
              <option value="">Pilih kelompok...</option>
              ${(App.cache.kelompok||[]).map(k => `<option value="${k.id}">${escHtml(k.nama)} · ${escHtml(k.desa?.nama||k.desa_id)}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-green" onclick="RC_pilihKelompok()">Lanjut →</button>
        </div>
      </div>`;
    window.RC_pilihKelompok = () => {
      const id = document.getElementById('rcKelompokSel').value;
      if (!id) { showToast('Pilih kelompok dulu', true); return; }
      App.cache.raportKelompokId = id;
      renderRaportCaberawit();
    };
    return;
  }
  myKelompokId = myKelompokId || App.cache.raportKelompokId;

  const kelasList = sortKelas(await SB.kelas.getByKelompok(myKelompokId));
  const nowMonth = currentMonthName();
  let semester = SEM1_MONTHS.includes(nowMonth) ? 1 : 2;
  const ta = getTahunAjaran();

  let selectedKelasId = kelasList.length ? kelasList[0].id : null;
  let santriList = [];
  let selectedSantriId = null;
  let materiList = [];
  let materiLoadedKey = null; // 'jenjang|semester' terakhir yang sudah di-load, biar tidak fetch ulang tiap ganti santri
  let nilaiMap = {};   // materi_raport_id -> nilai
  let catatanText = '';
  let hasUnsaved = false;

  async function loadSantri() {
    santriList = selectedKelasId ? await SB.santri.getByKelas(selectedKelasId) : [];
    selectedSantriId = santriList.length ? santriList[0].id : null;
  }
  await loadSantri();

  // Load daftar materi raport HANYA kalau jenjang/semester berubah (bukan tiap ganti santri)
  async function loadMateriJikaPerlu() {
    const kls = kelasList.find(k => k.id === selectedKelasId);
    const jenjang = kls?.jenjang || '';
    if (!JENJANG_LIST_RAPORT.includes(jenjang)) { materiList = []; materiLoadedKey = null; return; }
    const key = jenjang + '|' + semester;
    if (key === materiLoadedKey) return; // sudah ada, tidak perlu fetch ulang
    materiList = await SB.materiRaport.getByJenjangSemester(jenjang, semester) || [];
    materiLoadedKey = key;
  }

  // Load nilai + catatan untuk santri yang sedang aktif saja — ini yang ringan & cepat, dipanggil tiap ganti santri
  async function loadNilaiCatatan() {
    nilaiMap = {}; catatanText = '';
    if (!selectedSantriId || !materiList.length) return;
    const [nilaiRows, catatanRows] = await Promise.all([
      SB.raportNilai.getBySantri(selectedSantriId, semester, ta),
      SB.raportCatatan.get(selectedSantriId, semester, ta),
    ]);
    (nilaiRows||[]).forEach(r => { nilaiMap[r.materi_raport_id] = r.nilai; });
    catatanText = catatanRows?.[0]?.catatan || '';
    hasUnsaved = false;
  }

  await loadMateriJikaPerlu();
  await loadNilaiCatatan();

  function render() {
    const kls = kelasList.find(k => k.id === selectedKelasId);
    const jenjang = kls?.jenjang || '-';
    const jenjangValid = JENJANG_LIST_RAPORT.includes(jenjang);
    const santri = santriList.find(s => s.id === selectedSantriId);
    const santriIdx = santriList.findIndex(s => s.id === selectedSantriId);

    let bodyHtml = '';
    if (!jenjangValid) {
      bodyHtml = `<div class="card" style="text-align:center; padding:30px; color:var(--ink-soft); font-size:13px;">
        Raport ini khusus untuk jenjang Caberawit (PAUD TK – SD 6). Kelas "${escHtml(kls?.nama_kelas||'-')}" jenjangnya "${escHtml(jenjang)}", belum ada template raport untuk jenjang ini.
      </div>`;
    } else if (!materiList.length) {
      bodyHtml = `<div class="card" style="text-align:center; padding:30px; color:var(--ink-soft); font-size:13px;">Belum ada data materi raport untuk jenjang ${escHtml(jenjang)} semester ${semester}.</div>`;
    } else {
      // Group by section + subsection
      const groups = [];
      let lastKey = null;
      materiList.forEach(m => {
        const key = m.section + '|' + (m.subsection||'');
        if (key !== lastKey) { groups.push({ section: m.section, subsection: m.subsection, items: [] }); lastKey = key; }
        groups[groups.length-1].items.push(m);
      });

      let lastSection = null;
      const groupsHtml = groups.map(g => {
        let sectionHeader = '';
        if (g.section !== lastSection) {
          sectionHeader = `<div style="background:var(--green); color:#fff; font-weight:800; font-size:13px; padding:8px 12px; margin-top:14px; border-radius:6px;">${escHtml(SECTION_LABEL[g.section]||g.section)}</div>`;
          lastSection = g.section;
        }
        const subHeader = g.subsection ? `<div style="font-weight:700; font-size:12.5px; color:var(--green); padding:8px 4px 4px;">${escHtml(g.subsection)}</div>` : '';
        const rows = g.items.map((m, i) => {
          const nilai = nilaiMap[m.id];
          const predikat = hitungPredikat(nilai, m.skala);
          return `<div style="display:flex; align-items:center; gap:10px; padding:6px 14px 6px 4px; border-bottom:1px solid var(--line);">
            <div style="width:22px; flex-shrink:0; font-size:12px; color:var(--ink-soft); text-align:center;">${i+1}</div>
            <div style="flex:1; min-width:0; font-size:12.5px; color:#111;">${escHtml(m.teks)}</div>
            <input type="number" min="0" max="100" data-mid="${m.id}" data-skala="${m.skala}" value="${nilai??''}"
              oninput="RC_onNilaiInput(this)"
              style="width:56px; flex-shrink:0; padding:5px 6px; border:1.5px solid var(--line); border-radius:6px; font-size:12px; text-align:center;">
            <div id="predikat-${m.id}" style="width:40px; flex-shrink:0; text-align:center; font-weight:800; font-size:12px; color:var(--gold);">${predikat}</div>
          </div>`;
        }).join('');
        return sectionHeader + subHeader + rows;
      }).join('');

      bodyHtml = `
        <div class="card" style="margin-bottom:14px;">
          <div style="display:flex; gap:10px; padding:8px 14px 8px 4px; border-bottom:2px solid var(--green); font-weight:700; font-size:11px; color:var(--ink-soft); text-transform:uppercase;">
            <div style="width:22px;">No</div><div style="flex:1;">Materi Pembinaan</div><div style="width:56px; text-align:center;">Nilai</div><div style="width:40px; text-align:center;">Predikat</div>
          </div>
          ${groupsHtml}
        </div>
        <div class="card" style="margin-bottom:14px;">
          <div class="fw-bold" style="color:var(--green); font-size:13px; margin-bottom:8px;">D. Catatan Perkembangan Akhlaqul Karimah</div>
          <textarea id="rcCatatan" rows="3" placeholder="Catatan dari guru pengajar..." style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:13px; font-family:inherit;" oninput="RC_onCatatanInput(this.value)">${escHtml(catatanText)}</textarea>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-green" id="rcSaveBtn" onclick="RC_simpan()">💾 Simpan Nilai</button>
          <button class="btn btn-outline" onclick="RC_downloadPDF()">📄 Download PDF (F5)</button>
        </div>`;
    }

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Raport Caberawit</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Tahun Ajaran ${escHtml(ta)}</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="form-row">
          <div class="form-group">
            <label>Kelas</label>
            <select id="rcKelasSel" onchange="RC_setKelas(this.value)">
              ${kelasList.map(k => `<option value="${k.id}" ${k.id===selectedKelasId?'selected':''}>${escHtml(k.nama_kelas)} (${escHtml(k.jenjang)})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Semester</label>
            <select id="rcSemesterSel" onchange="RC_setSemester(this.value)">
              <option value="1" ${semester===1?'selected':''}>Semester 1</option>
              <option value="2" ${semester===2?'selected':''}>Semester 2</option>
            </select>
          </div>
        </div>

        ${santriList.length ? `
        <div style="display:flex; align-items:center; gap:10px; margin-top:10px; padding-top:12px; border-top:1px solid var(--line); flex-wrap:wrap;">
          <button class="btn-icon" onclick="RC_prevSantri()" title="Generus sebelumnya" ${santriIdx<=0?'disabled':''} style="${santriIdx<=0?'opacity:.35; cursor:not-allowed;':''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style="flex:1; min-width:140px; text-align:center;">
            <div style="font-weight:800; font-size:14px; color:#111;">${escHtml(santri?.nama||'-')}</div>
            <div style="font-size:11px; color:var(--ink-soft); margin-top:1px;">Generus ke-${santriIdx+1} dari ${santriList.length} · ${escHtml(jenjang)} · Semester ${semester}</div>
          </div>
          <button class="btn-icon" onclick="RC_nextSantri()" title="Generus berikutnya" ${santriIdx>=santriList.length-1?'disabled':''} style="${santriIdx>=santriList.length-1?'opacity:.35; cursor:not-allowed;':''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>` : `<div style="font-size:12px; color:var(--ink-soft); margin-top:10px;">Belum ada santri di kelas ini.</div>`}
      </div>

      ${bodyHtml}
    `;
  }

  window.RC_setKelas = async (id) => {
    selectedKelasId = id;
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    await loadSantri();
    await loadMateriJikaPerlu();
    await loadNilaiCatatan();
    render();
  };
  window.RC_setSemester = async (val) => {
    semester = Number(val);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    await loadMateriJikaPerlu();
    await loadNilaiCatatan();
    render();
  };

  // Pindah santri: daftar materi sudah ada di memori, cuma nilai+catatan yang diambil ulang (cepat),
  // jadi tidak perlu tampilan spinner/pindah halaman — cukup terasa seperti form-nya "dikosongkan lalu diisi ulang".
  async function pindahSantri(newId) {
    selectedSantriId = newId;
    await loadNilaiCatatan();
    render();
  }
  window.RC_prevSantri = async () => {
    const idx = santriList.findIndex(s => s.id === selectedSantriId);
    if (idx > 0) await pindahSantri(santriList[idx-1].id);
  };
  window.RC_nextSantri = async () => {
    const idx = santriList.findIndex(s => s.id === selectedSantriId);
    if (idx < santriList.length - 1) await pindahSantri(santriList[idx+1].id);
  };

  window.RC_onNilaiInput = (el) => {
    const mid = el.dataset.mid;
    const skala = el.dataset.skala;
    const val = el.value === '' ? null : Number(el.value);
    nilaiMap[mid] = val;
    hasUnsaved = true;
    const pEl = document.getElementById('predikat-' + mid);
    if (pEl) pEl.textContent = hitungPredikat(val, skala);
  };
  window.RC_onCatatanInput = (val) => { catatanText = val; hasUnsaved = true; };

  window.RC_simpan = async () => {
    if (!selectedSantriId) return;
    const btn = document.getElementById('rcSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const rows = materiList
        .filter(m => nilaiMap[m.id] !== null && nilaiMap[m.id] !== undefined && nilaiMap[m.id] !== '')
        .map(m => ({
          santri_id: selectedSantriId,
          materi_raport_id: m.id,
          kelompok_id: myKelompokId,
          semester, tahun_ajaran: ta,
          nilai: nilaiMap[m.id],
          dibuat_oleh: u.id,
        }));
      if (rows.length) await SB.raportNilai.upsertBulk(rows);
      await SB.raportCatatan.upsert({
        santri_id: selectedSantriId, semester, tahun_ajaran: ta,
        kelompok_id: myKelompokId, catatan: catatanText || null, dibuat_oleh: u.id,
      });
      const santriNama = santriList.find(s=>s.id===selectedSantriId)?.nama || '';
      logActivity('ubah', 'Raport Caberawit', `Simpan nilai raport: ${santriNama} — Semester ${semester}`);
      hasUnsaved = false;

      const idx = santriList.findIndex(s => s.id === selectedSantriId);
      if (idx < santriList.length - 1) {
        await pindahSantri(santriList[idx+1].id);
        showToast('Tersimpan ✓ — lanjut ke generus berikutnya');
      } else {
        showToast('Nilai raport tersimpan ✓ (generus terakhir di kelas ini)');
      }
    } catch(e) { showToast('Gagal: ' + e.message, true); }
    finally { btn.disabled = false; btn.textContent = '💾 Simpan Nilai'; }
  };

  window.RC_downloadPDF = async () => {
    const kls = kelasList.find(k => k.id === selectedKelasId);
    const santri = santriList.find(s => s.id === selectedSantriId);
    const klp = (App.cache.kelompok||[]).find(k => k.id === myKelompokId);
    if (!santri || !materiList.length) { showToast('Data belum lengkap', true); return; }

    showToast('Menyiapkan PDF...');
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
      const fItal = await doc.embedFont(StandardFonts.HelveticaOblique);

      // F5 = 148mm x 210mm, potrait
      const PW = 419.5, PH = 595.3;
      const ML = 30, MR = 30, MT = 34, MB = 30;
      const GREEN = rgb(0.106, 0.227, 0.173);
      const GOLD  = rgb(0.757, 0.604, 0.294);
      const GRAY  = rgb(0.45, 0.42, 0.38);
      const WHITE = rgb(1,1,1);
      const LIGHT = rgb(0.91, 0.95, 0.91);
      const contentW = PW - ML - MR;

      let page, y;
      const addPage = () => { page = doc.addPage([PW, PH]); y = PH - MT; };
      addPage();

      const wrap = (text, maxW, size, font) => {
        const lines = [];
        String(text||'').split('\n').forEach(para => {
          const words = para.split(' ').filter(Boolean);
          let cur = '';
          if (!words.length) { lines.push(''); return; }
          for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (font.widthOfTextAtSize(test, size) > maxW) { if (cur) lines.push(cur); cur = w; }
            else cur = test;
          }
          if (cur) lines.push(cur);
        });
        return lines.length ? lines : [''];
      };
      const checkSpace = (need) => {
        if (y - need < MB) { addPage(); drawTableHeader(); }
      };

      // Header
      page.drawText('RAPORT GENERUS SIDOARJO UTARA', { x: ML, y, font: fBold, size: 11, color: GREEN });
      y -= 8;
      page.drawLine({ start:{x:ML,y}, end:{x:PW-MR,y}, thickness:1.2, color: GOLD });
      y -= 16;

      const infoRow = (label1, val1, label2, val2) => {
        page.drawText(label1, { x: ML, y, font: fReg, size: 8.5, color: rgb(0.15,0.15,0.15) });
        page.drawText(':', { x: ML+62, y, font: fReg, size: 8.5, color: rgb(0.15,0.15,0.15) });
        page.drawText(String(val1||'-'), { x: ML+70, y, font: fBold, size: 8.5, color: GREEN });
        if (label2) {
          const x2 = ML + 230;
          page.drawText(label2, { x: x2, y, font: fReg, size: 8.5, color: rgb(0.15,0.15,0.15) });
          page.drawText(':', { x: x2+42, y, font: fReg, size: 8.5, color: rgb(0.15,0.15,0.15) });
          page.drawText(String(val2||'-'), { x: x2+48, y, font: fBold, size: 8.5, color: GREEN });
        }
        y -= 13;
      };
      infoRow('Nama Generus', santri.nama, 'Kelompok', klp?.nama);
      infoRow('Kelas', kls?.jenjang, 'Desa', klp?.desa?.nama || klp?.desa_id);
      infoRow('Semester', semester, '', '');
      y -= 6;

      // Table header
      const COL_NO = 18, COL_NILAI = 34, COL_PRED = 34;
      const COL_TEKS = contentW - COL_NO - COL_NILAI - COL_PRED;
      const drawTableHeader = () => {
        page.drawRectangle({ x: ML, y: y-13, width: contentW, height: 15, color: GREEN });
        page.drawText('No', { x: ML+3, y: y-10, font: fBold, size: 7.5, color: WHITE });
        page.drawText('Materi Pembinaan', { x: ML+COL_NO+3, y: y-10, font: fBold, size: 7.5, color: WHITE });
        page.drawText('Nilai', { x: ML+COL_NO+COL_TEKS+3, y: y-10, font: fBold, size: 7.5, color: WHITE });
        page.drawText('Predikat', { x: ML+COL_NO+COL_TEKS+COL_NILAI+3, y: y-10, font: fBold, size: 7.5, color: WHITE });
        y -= 17;
      };
      drawTableHeader();

      // Group + rows
      const groups = [];
      let lastKey = null;
      materiList.forEach(m => {
        const key = m.section + '|' + (m.subsection||'');
        if (key !== lastKey) { groups.push({ section: m.section, subsection: m.subsection, items: [] }); lastKey = key; }
        groups[groups.length-1].items.push(m);
      });

      let lastSection = null;
      groups.forEach(g => {
        // Hitung tinggi baris item pertama supaya header (section/subsection) tidak
        // "kepotong" sendirian di akhir halaman tanpa isinya ikut pindah bareng.
        const firstItem = g.items[0];
        const firstLines = firstItem ? wrap(`1. ${firstItem.teks}`, COL_TEKS - 4, 7, fReg) : [''];
        const firstRowH = Math.max(10, firstLines.length * 8.5) + 2;

        const isNewSection = g.section !== lastSection;
        const sectionH = isNewSection ? 15 : 0;
        const subsectionH = g.subsection ? 12 : 0;
        checkSpace(sectionH + subsectionH + firstRowH);

        if (isNewSection) {
          page.drawRectangle({ x: ML, y: y-11, width: contentW, height: 13, color: LIGHT });
          page.drawText(SECTION_LABEL[g.section]||g.section, { x: ML+3, y: y-9, font: fBold, size: 8, color: GREEN });
          y -= 15;
          lastSection = g.section;
        }
        if (g.subsection) {
          page.drawText(g.subsection, { x: ML+2, y: y-8, font: fBold, size: 7.5, color: GREEN });
          y -= 12;
        }
        g.items.forEach((m, i) => {
          const nilai = nilaiMap[m.id];
          const predikat = hitungPredikat(nilai, m.skala);
          const lines = wrap(`${i+1}. ${m.teks}`, COL_TEKS - 4, 7, fReg);
          const rowH = Math.max(10, lines.length * 8.5);
          checkSpace(rowH + 2);
          lines.forEach((ln, li) => {
            page.drawText(ln, { x: ML+COL_NO+2, y: y - (li*8.5) - 7, font: fReg, size: 7, color: rgb(0.1,0.1,0.1) });
          });
          page.drawText(nilai!=null ? String(nilai) : '-', { x: ML+COL_NO+COL_TEKS+8, y: y-7, font: fReg, size: 7.5, color: rgb(0.1,0.1,0.1) });
          page.drawText(predikat||'-', { x: ML+COL_NO+COL_TEKS+COL_NILAI+8, y: y-7, font: fBold, size: 7.5, color: GOLD });
          page.drawLine({ start:{x:ML,y:y-rowH-1}, end:{x:PW-MR,y:y-rowH-1}, thickness:0.4, color: rgb(0.85,0.85,0.85) });
          y -= rowH + 2;
        });
      });

      // Catatan D
      checkSpace(50);
      y -= 6;
      page.drawText('D. Catatan Perkembangan Akhlaqul Karimah', { x: ML, y, font: fBold, size: 8.5, color: GREEN });
      y -= 12;
      const catatanLines = wrap(catatanText || '-', contentW - 4, 8, fReg);
      catatanLines.slice(0, 4).forEach(ln => { page.drawText(ln, { x: ML, y, font: fReg, size: 8, color: rgb(0.1,0.1,0.1) }); y -= 11; });

      // Tanda tangan
      checkSpace(90);
      y -= 10;
      const today = new Date();
      page.drawText(`Sidoarjo, ${today.getDate()} - ${today.getMonth()+1} - ${today.getFullYear()}`, { x: PW-MR-140, y, font: fReg, size: 7.5, color: rgb(0.2,0.2,0.2) });
      y -= 30;
      const sigColW = contentW / 3;
      ['PJP Kelompok','Wali KBM','Guru Kelas'].forEach((lbl, i) => {
        page.drawText(lbl, { x: ML + i*sigColW, y, font: fReg, size: 7.5, color: rgb(0.2,0.2,0.2) });
      });
      y -= 35;
      ['.......................','.......................','.......................'].forEach((lbl, i) => {
        page.drawText(lbl, { x: ML + i*sigColW, y, font: fReg, size: 7.5, color: rgb(0.2,0.2,0.2) });
      });
      y -= 18;
      page.drawText('Mengetahui, Orang Tua/Wali', { x: ML + sigColW, y, font: fReg, size: 7.5, color: rgb(0.2,0.2,0.2) });
      y -= 30;
      page.drawText('.......................', { x: ML + sigColW, y, font: fReg, size: 7.5, color: rgb(0.2,0.2,0.2) });

      // Legenda (halaman baru, ringkas)
      addPage();
      page.drawText('Keterangan Penilaian', { x: ML, y, font: fBold, size: 10, color: GREEN });
      y -= 16;
      page.drawText('Untuk Alim Faqih:', { x: ML, y, font: fBold, size: 8, color: GREEN });
      y -= 11;
      const legendAF = [
        ['A+','>96','Mampu Membaca/Menulis/Menghafal dengan benar tanpa dibantu'],
        ['A','90-95','Mampu dengan benar, 1-2 bantuan'],
        ['B+','86-89','Mampu, 2-3 bantuan, 1-2 kesalahan'],
        ['B','80-85','Mampu, 2-3 bantuan, beberapa kesalahan'],
        ['C+','76-79','Mampu, 4-5 bantuan, beberapa kesalahan'],
        ['C','70-75','Perlu bimbingan & pendampingan'],
      ];
      legendAF.forEach(([kode, rentang, ket]) => {
        page.drawText(kode, { x: ML, y, font: fBold, size: 7.5, color: GOLD });
        page.drawText(rentang, { x: ML+22, y, font: fReg, size: 7.5, color: rgb(0.2,0.2,0.2) });
        wrap(ket, contentW-95, 7, fReg).forEach((ln,li) => {
          page.drawText(ln, { x: ML+70, y: y-(li*9), font: fReg, size: 7, color: rgb(0.3,0.3,0.3) });
        });
        y -= 9 * Math.max(1, wrap(ket, contentW-95, 7, fReg).length) + 2;
      });
      y -= 8;
      page.drawText('Untuk Akhlaqul Karimah & Kemandirian:', { x: ML, y, font: fBold, size: 8, color: GREEN });
      y -= 11;
      const legendAK = [
        ['A+','>96','Selalu melakukan dengan baik tanpa diingatkan'],
        ['A','90-95','Selalu melakukan, sesekali diingatkan'],
        ['B+','86-89','Sering melakukan tanpa diingatkan'],
        ['B','80-85','Kadang-kadang melakukan jika diingatkan'],
        ['C','70-79','Mau melakukan jika diingatkan'],
        ['D','60-69','Belum mau melakukan, perlu bimbingan khusus'],
      ];
      legendAK.forEach(([kode, rentang, ket]) => {
        page.drawText(kode, { x: ML, y, font: fBold, size: 7.5, color: GOLD });
        page.drawText(rentang, { x: ML+22, y, font: fReg, size: 7.5, color: rgb(0.2,0.2,0.2) });
        wrap(ket, contentW-95, 7, fReg).forEach((ln,li) => {
          page.drawText(ln, { x: ML+70, y: y-(li*9), font: fReg, size: 7, color: rgb(0.3,0.3,0.3) });
        });
        y -= 9 * Math.max(1, wrap(ket, contentW-95, 7, fReg).length) + 2;
      });

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Raport_${(santri.nama||'').replace(/\s+/g,'_')}_Sem${semester}_${ta.replace('/','-')}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh');
    } catch(e) {
      showToast('Gagal membuat PDF: ' + e.message, true);
      console.error(e);
    }
  };

  render();
}

/* ===== PAGE: REKAP RAPORT CABERAWIT ===== */
async function renderRekapRaport() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const isAdmin = u.role === 'admin';
  const isDaerah = u.role === 'daerah';
  const isDesa = u.role === 'desa' || u.role === 'desa_view';
  const isKelompok = ['pjp_kelompok','wali_kbm','guru','kelompok'].includes(u.role);

  const SECTION_LABEL = { A: 'Akhlaqul Karimah', B: 'Alim Faqih', C: 'Kemandirian' };
  const taSekarang = getTahunAjaran();
  const taStartYear = parseInt(taSekarang.split('/')[0], 10);
  const taOptions = Array.from({length:5}, (_,i) => { const y = taStartYear - i; return `${y}/${y+1}`; });
  let ta = taSekarang;
  const nowMonth = currentMonthName();
  let semester = SEM1_MONTHS.includes(nowMonth) ? 1 : 2;

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const DESA_NAMA_MAP = await loadDesaMapSingkat();
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  // Tentukan cakupan kelompok
  let kelompokScope = [];
  if (isAdmin || isDaerah) kelompokScope = App.cache.kelompok || [];
  else if (isDesa) kelompokScope = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
  else if (isKelompok && u.kelompok_id) kelompokScope = (App.cache.kelompok||[]).filter(k => k.id === u.kelompok_id);

  async function loadData() {
    const klpIds = kelompokScope.map(k => k.id);
    const kelasRaw = await SB.kelas.getByKelompokIds(klpIds) || [];
    const kelasIds = kelasRaw.map(k => k.id);
    const santriRaw = await SB.santri.getByKelasIds(kelasIds) || [];
    const santriIds = santriRaw.map(s => s.id);

    const jenjangList = [...new Set(kelasRaw.map(k => k.jenjang).filter(Boolean))];
    const [nilaiRaw, materiRaw] = await Promise.all([
      SB.raportNilai.getBySantriIds(santriIds, semester, ta),
      SB.materiRaport.getByJenjangListSemester(jenjangList, semester),
    ]);

    const materiSectionMap = {};
    (materiRaw||[]).forEach(m => { materiSectionMap[m.id] = m.section; });

    const nilaiBySantri = {};
    (nilaiRaw||[]).forEach(n => { (nilaiBySantri[n.santri_id] ||= []).push(n); });

    // Hitung ringkasan per santri
    const santriSummary = {};
    santriRaw.forEach(s => {
      const rows = nilaiBySantri[s.id] || [];
      const bySection = { A: [], B: [], C: [] };
      rows.forEach(r => {
        const sec = materiSectionMap[r.materi_raport_id];
        if (sec && r.nilai != null) bySection[sec].push(Number(r.nilai));
      });
      const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
      const allVals = [...bySection.A, ...bySection.B, ...bySection.C];
      santriSummary[s.id] = {
        santri: s, kelas: kelasRaw.find(k=>k.id===s.kelas_id),
        totalDinilai: rows.length,
        rataRata: avg(allVals),
        perSection: { A: avg(bySection.A), B: avg(bySection.B), C: avg(bySection.C) },
      };
    });

    return { kelasRaw, santriRaw, santriSummary };
  }

  let { kelasRaw, santriRaw, santriSummary } = await loadData();

  function badgeNilai(v) {
    if (v == null) return '<span style="color:var(--ink-soft); font-size:11px;">belum ada</span>';
    const color = v >= 90 ? 'var(--green)' : v >= 80 ? '#2563eb' : v >= 70 ? '#ca8a04' : 'var(--rose)';
    return `<span style="font-weight:800; color:${color};">${v}</span>`;
  }

  function render() {
    let bodyHtml = '';

    if (isKelompok) {
      // ── Level Kelompok: grouped by kelas, klik santri untuk detail ──
      const byKelas = {};
      kelasRaw.forEach(k => { byKelas[k.id] = { kelas: k, list: [] }; });
      Object.values(santriSummary).forEach(sm => {
        if (sm.kelas && byKelas[sm.kelas.id]) byKelas[sm.kelas.id].list.push(sm);
      });

      const cards = Object.values(byKelas).filter(g => g.list.length).map(g => {
        const rows = g.list.map(sm => `
          <tr style="border-bottom:1px solid var(--line); cursor:pointer;" onclick="RR_toggleDetail('${sm.santri.id}')">
            <td style="padding:8px 10px; font-size:13px; font-weight:600; color:#111;">${escHtml(sm.santri.nama)} <span style="font-size:10px; color:var(--ink-soft);">▼</span></td>
            <td style="text-align:center; font-size:12px;">${sm.totalDinilai || '—'}</td>
            <td style="text-align:center;">${badgeNilai(sm.rataRata)}</td>
          </tr>
          <tr id="rr-detail-${sm.santri.id}" style="display:none; background:#f9f9f6;">
            <td colspan="3" style="padding:10px 16px;">
              <div style="display:flex; gap:18px; flex-wrap:wrap; margin-bottom:6px;">
                <div style="font-size:12px;"><span style="color:var(--ink-soft);">Akhlaqul Karimah:</span> ${badgeNilai(sm.perSection.A)}</div>
                <div style="font-size:12px;"><span style="color:var(--ink-soft);">Alim Faqih:</span> ${badgeNilai(sm.perSection.B)}</div>
                <div style="font-size:12px;"><span style="color:var(--ink-soft);">Kemandirian:</span> ${badgeNilai(sm.perSection.C)}</div>
              </div>
              <div style="font-size:11px; color:var(--ink-soft);">Untuk isi/edit nilai lengkap, buka menu <b style="color:var(--green);">Raport Caberawit</b>.</div>
            </td>
          </tr>`).join('');
        return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
          <div style="background:var(--green); padding:10px 16px;">
            <div style="font-weight:800; font-size:13.5px; color:#fff;">${escHtml(g.kelas.nama_kelas)} <span style="font-weight:500; font-size:11px; color:rgba(255,255,255,.8);">(${escHtml(g.kelas.jenjang)})</span></div>
          </div>
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--green-soft);">
              <th style="padding:6px 10px; text-align:left; font-size:11px; color:var(--green);">Nama</th>
              <th style="padding:6px 10px; text-align:center; font-size:11px; color:var(--green); width:80px;">Item Dinilai</th>
              <th style="padding:6px 10px; text-align:center; font-size:11px; color:var(--green); width:80px;">Rata-rata</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>`;
      }).join('');
      bodyHtml = cards || `<div class="card" style="text-align:center; padding:30px; color:var(--ink-soft); font-size:13px;">Belum ada santri Caberawit di kelompok ini.</div>`;

    } else if (isDesa) {
      // ── Level Desa: rekap per kelompok, rata-rata saja ──
      const rows = kelompokScope.map(klp => {
        const santriKlp = Object.values(santriSummary).filter(sm => sm.kelas && kelasRaw.find(k=>k.id===sm.kelas.id)?.kelompok_id === klp.id);
        const dinilai = santriKlp.filter(sm => sm.totalDinilai > 0);
        const avgAll = dinilai.length ? Math.round(dinilai.reduce((a,sm)=>a+(sm.rataRata||0),0)/dinilai.length) : null;
        const avgSec = sec => {
          const vals = dinilai.map(sm=>sm.perSection[sec]).filter(v=>v!=null);
          return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
        };
        return `<tr style="border-bottom:1px solid var(--line);">
          <td style="padding:8px 10px; font-size:13px; font-weight:600; color:#111;">${escHtml(klp.nama)}</td>
          <td style="text-align:center; font-size:12px;">${dinilai.length}/${santriKlp.length}</td>
          <td style="text-align:center;">${badgeNilai(avgAll)}</td>
          <td style="text-align:center; font-size:12px;">${badgeNilai(avgSec('A'))}</td>
          <td style="text-align:center; font-size:12px;">${badgeNilai(avgSec('B'))}</td>
          <td style="text-align:center; font-size:12px;">${badgeNilai(avgSec('C'))}</td>
        </tr>`;
      }).join('');
      bodyHtml = `<div class="card" style="padding:0; overflow:hidden;">
        <div class="table-wrap"><table style="width:100%; border-collapse:collapse; min-width:600px;">
          <thead><tr style="background:var(--green);">
            <th style="padding:8px 10px; text-align:left; font-size:11px; color:#fff;">Kelompok</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff;">Santri Dinilai</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff;">Rata² Keseluruhan</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff;">Akhlak</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff;">Alim Faqih</th>
            <th style="padding:8px 10px; text-align:center; font-size:11px; color:#fff;">Kemandirian</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;

    } else {
      // ── Level Daerah/Admin: grouped per desa, isi rata-rata per kelompok ──
      const byDesa = {};
      kelompokScope.forEach(klp => {
        const dn = klp.desa?.nama || DESA_NAMA_MAP[klp.desa_id] || klp.desa_id || '-';
        (byDesa[dn] ||= []).push(klp);
      });
      bodyHtml = Object.entries(byDesa).map(([dn, klpList]) => {
        const rows = klpList.map(klp => {
          const santriKlp = Object.values(santriSummary).filter(sm => sm.kelas && kelasRaw.find(k=>k.id===sm.kelas.id)?.kelompok_id === klp.id);
          const dinilai = santriKlp.filter(sm => sm.totalDinilai > 0);
          const avgAll = dinilai.length ? Math.round(dinilai.reduce((a,sm)=>a+(sm.rataRata||0),0)/dinilai.length) : null;
          return `<tr style="border-bottom:1px solid var(--line);">
            <td style="padding:6px 10px; font-size:12.5px; font-weight:600; color:#111;">${escHtml(klp.nama)}</td>
            <td style="text-align:center; font-size:12px;">${dinilai.length}/${santriKlp.length}</td>
            <td style="text-align:center;">${badgeNilai(avgAll)}</td>
          </tr>`;
        }).join('');
        return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
          <div style="background:var(--green); padding:9px 16px;">
            <div style="font-weight:800; font-size:13px; color:#fff;">🏘️ Desa ${escHtml(dn)}</div>
          </div>
          <div class="table-wrap"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--green-soft);">
              <th style="padding:6px 10px; text-align:left; font-size:11px; color:var(--green);">Kelompok</th>
              <th style="padding:6px 10px; text-align:center; font-size:11px; color:var(--green); width:100px;">Santri Dinilai</th>
              <th style="padding:6px 10px; text-align:center; font-size:11px; color:var(--green); width:90px;">Rata-rata</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>`;
      }).join('');
    }

    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rekap Raport Caberawit</h1>
          <p style="font-size:13px; color:var(--ink-soft); margin:4px 0 0;">Tahun Ajaran ${escHtml(ta)}</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <label style="font-size:12.5px; font-weight:700; color:var(--green);">Tahun Ajaran:</label>
        <select id="rrTaSel" onchange="RR_setTA(this.value)" style="max-width:160px;">
          ${taOptions.map(t => `<option value="${t}" ${t===ta?'selected':''}>${t}</option>`).join('')}
        </select>
        <label style="font-size:12.5px; font-weight:700; color:var(--green); margin-left:8px;">Semester:</label>
        <select id="rrSemesterSel" onchange="RR_setSemester(this.value)" style="max-width:160px;">
          <option value="1" ${semester===1?'selected':''}>Semester 1</option>
          <option value="2" ${semester===2?'selected':''}>Semester 2</option>
        </select>
      </div>

      ${bodyHtml}
    `;
  }

  window.RR_toggleDetail = (santriId) => {
    const el = document.getElementById('rr-detail-' + santriId);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
  };
  window.RR_setSemester = async (val) => {
    semester = Number(val);
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    const res = await loadData();
    kelasRaw = res.kelasRaw; santriRaw = res.santriRaw; santriSummary = res.santriSummary;
    render();
  };
  window.RR_setTA = async (val) => {
    ta = val;
    main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
    const res = await loadData();
    kelasRaw = res.kelasRaw; santriRaw = res.santriRaw; santriSummary = res.santriSummary;
    render();
  };

  render();
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

    if (isAdmin || u.role === 'daerah' || u.role === 'desa' || u.role === 'desa_view') {
      const DESA_NAMA_MAP = await loadDesaMap();
      const desaList = isAdmin || u.role === 'daerah'
        ? Object.entries(DESA_NAMA_MAP)
        : [[u.desa_id, DESA_NAMA_MAP[u.desa_id] || u.desa_id]];
      await Promise.all(desaList.map(async ([did, dNama]) => {
        const [p, p2] = await Promise.all([
          SB.musPeserta.getByDesa(dNama),
          SB.musPeserta.getByDesa(did),
        ]);
        const seen = new Set();
        const merged = [...(p||[]), ...(p2||[])].filter(x => { if(seen.has(x.id)) return false; seen.add(x.id); return true; });
        pengurusDesa[did] = { nama: dNama, list: merged };
      }));
    }

    if (isAdmin) {
      await Promise.all((App.cache.kelompok||[]).map(async klp => {
        pengurusKlp[klp.id] = await SB.musPeserta.getByKelompok(klp.id) || [];
      }));
    } else if (u.kelompok_id) {
      pengurusKlp[u.kelompok_id] = await SB.musPeserta.getByKelompok(u.kelompok_id) || [];
    } else if (u.role === 'desa' || u.role === 'desa_view') {
      const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === u.desa_id);
      await Promise.all(klpDesa.map(async klp => {
        pengurusKlp[klp.id] = await SB.musPeserta.getByKelompok(klp.id) || [];
      }));
    }
  } catch(e) { console.error(e); }

  function buildPengurusApproveFn(scopeType, scopeRef) {
    return async (data) => {
      const dapukan = data.dapukan || null;
      if (dapukan && DAPUKAN_SOLO.has(dapukan)) {
        let currentList = [];
        if (scopeType === 'kelompok') currentList = await SB.musPeserta.getByKelompok(scopeRef) || [];
        else if (scopeType === 'desa') currentList = await SB.musPeserta.getByDesa(scopeRef) || [];
        else currentList = await SB.musPeserta.getByDaerah() || [];
        if (currentList.some(p => p.jabatan === dapukan)) {
          showToast(`${dapukan} sudah ada orangnya — tolak dulu data ini atau cabut yang lama`, true);
          return false;
        }
      }
      const payload = { nama: (data.nama||'').trim() ? toTitleCase(data.nama) : '-', jabatan: dapukan, tgl_lahir: data.tgl_lahir || null, no_hp: data.no_hp || null, aktif: true };
      if (scopeType === 'kelompok') payload.kelompok_id = scopeRef;
      else if (scopeType === 'desa') payload.desa_id = scopeRef;
      else payload.level_daerah = true;
      await SB.musPeserta.insert(payload);
      return true;
    };
  }

  let pendingHtml = '';
  if (u.role === 'pjp_kelompok' && u.kelompok_id) {
    pendingHtml += await renderPendingSection('pengurus', 'kelompok', u.kelompok_id, FORM_CONFIGS.pengurus, buildPengurusApproveFn('kelompok', u.kelompok_id));
  }
  if (u.role === 'desa' && u.desa_id) {
    pendingHtml += await renderPendingSection('pengurus', 'desa', u.desa_id, FORM_CONFIGS.pengurus, buildPengurusApproveFn('desa', u.desa_id));
  }
  if (isAdmin || u.role === 'daerah') {
    pendingHtml += await renderPendingSection('pengurus', 'daerah', null, FORM_CONFIGS.pengurus, buildPengurusApproveFn('daerah', null));
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

  // Kelompokkan data pengurus jadi 3 kategori (4S / Unsur PPG / Tim 7) sesuai katalog dapukan.
  // Data lama yang jabatannya tidak cocok kategori manapun tetap ditampilkan di bagian "Lainnya".
  function renderDapukanSection(level, list, canEdit, scopeKey) {
    const catalog = DAPUKAN_CATALOG[level] || {};
    const byDapukan = {};
    list.forEach(p => { (byDapukan[p.jabatan] ||= []).push(p); });
    const known = new Set(Object.values(catalog).flat());

    const groupHtml = Object.entries(catalog).map(([grpName, dapukanList]) => `
      <div style="margin-bottom:14px;">
        <div style="font-weight:800; font-size:11.5px; color:var(--gold); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px;">${escHtml(grpName)}</div>
        <div style="border:1px solid var(--line); border-radius:8px; overflow:hidden;">
          ${dapukanList.map(dp => {
            const people = byDapukan[dp] || [];
            const isFull = DAPUKAN_SOLO.has(dp) && people.length >= 1;
            return `<div style="padding:8px 10px; border-bottom:1px solid var(--line); display:flex; align-items:flex-start; justify-content:space-between; gap:8px; flex-wrap:wrap;">
              <div style="flex:1; min-width:150px;">
                <div style="font-weight:700; font-size:12.5px; color:#111;">${escHtml(dp)}</div>
                ${people.length ? people.map(p => `
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:4px;">
                    <span style="font-size:12.5px; color:var(--ink-soft);">${escHtml(p.nama)}${p.tgl_lahir ? ` <span style="color:var(--ink-soft);">· ${hitungUsia(p.tgl_lahir)} th</span>` : ''}</span>
                    <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
                      ${waBtn(p)}
                      ${canEdit ? `
                      <button class="btn-icon" onclick="PGR_editSlot('${p.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                      <button class="btn-icon danger" onclick="PGR_hapus('${p.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>` : ''}
                    </div>
                  </div>`).join('') : `<div style="font-size:11.5px; color:var(--ink-soft); font-style:italic; margin-top:2px;">Belum diisi</div>`}
              </div>
              ${canEdit && !isFull ? `<button class="btn btn-outline btn-sm" style="font-size:11px;" data-scope="${escHtml(scopeKey)}" data-level="${escHtml(level)}" data-dapukan="${escHtml(dp)}" onclick="PGR_tambahDapukan(this.dataset.scope, this.dataset.level, this.dataset.dapukan)">+ Tambah</button>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');

    const lain = list.filter(p => !known.has(p.jabatan));
    const lainHtml = lain.length ? `
      <div>
        <div style="font-weight:800; font-size:11.5px; color:var(--rose); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px;">Lainnya (data lama)</div>
        <div style="border:1px solid var(--line); border-radius:8px; overflow:hidden;">
          ${lain.map(p => `<div style="padding:7px 10px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <div><span style="font-weight:700; font-size:12.5px;">${escHtml(p.nama)}</span> <span style="font-size:11px; color:var(--ink-soft);">— ${escHtml(p.jabatan||'-')}</span></div>
            ${canEdit ? `<button class="btn-icon danger" onclick="PGR_hapus('${p.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>` : ''}
          </div>`).join('')}
        </div>
      </div>` : '';

    return groupHtml + lainHtml;
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

  html += pendingHtml;

  // Pengurus Daerah
  if (isAdmin || u.role === 'daerah') {
    html += `<div class="card" style="margin-bottom:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <div class="fw-bold color-green" style="font-size:14px;">🏛️ Pengurus Daerah</div>
        ${isAdmin ? shareLinkButtonHtml('pengurus', 'daerah') : ''}
      </div>
      ${renderDapukanSection('daerah', pengurusDaerah, isAdmin, 'daerah|_')}
    </div>`;
  }

  // Pengurus Desa
  for (const [did, obj] of Object.entries(pengurusDesa)) {
    const canEdit = isAdmin || u.role === 'desa';
    html += `<div class="card" style="margin-bottom:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
        <div class="fw-bold color-green" style="font-size:14px;">🏘️ ${escHtml(obj.nama)}</div>
        ${u.role === 'desa' ? shareLinkButtonHtml('pengurus', 'desa_'+did) : ''}
      </div>
      ${renderDapukanSection('desa', obj.list, canEdit, 'desa|'+did)}
    </div>`;
  }

  // Pengurus Kelompok
  const allKlp = App.cache.kelompok || [];
  for (const [kid, list] of Object.entries(pengurusKlp)) {
    const klp = allKlp.find(k => k.id === kid);
    const canEdit = isAdmin || u.role === 'pjp_kelompok' || u.role === 'kelompok';
    html += `<div class="card" style="margin-bottom:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
        <div class="fw-bold color-green" style="font-size:14px;">👥 ${escHtml(klp?.nama||kid)} <span style="font-size:11px; color:var(--ink-soft);">(${escHtml(klp?.desa?.nama||'')})</span></div>
        ${u.role === 'pjp_kelompok' && kid === u.kelompok_id ? shareLinkButtonHtml('pengurus', kid) : ''}
      </div>
      ${renderDapukanSection('kelompok', list, canEdit, 'kelompok|'+kid)}
    </div>`;
  }

  main.innerHTML = html;

  // Handlers
  const allPengurusFlat = [
    ...pengurusDaerah,
    ...Object.values(pengurusDesa).flatMap(o => o.list),
    ...Object.values(pengurusKlp).flat(),
  ];

  window.PGR_tambahDapukan = (scopeKey, level, dapukan) => {
    openDapukanSlotModal(null, scopeKey, level, dapukan);
  };
  window.PGR_editSlot = (id) => {
    const p = allPengurusFlat.find(x => x.id === id);
    if (p) openDapukanSlotModal(p, null, null, p.jabatan);
  };
  window.PGR_hapus = async (id) => {
    if (!confirm('Hapus pengurus ini?')) return;
    await SB.musPeserta.softDelete(id);
    showToast('Pengurus dihapus');
    renderPengurus();
  };

  function openDapukanSlotModal(existing, scopeKey, level, dapukan) {
    let el = document.getElementById('dapukanSlotModal');
    if (!el) { el = document.createElement('div'); el.id = 'dapukanSlotModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
    el.innerHTML = `<div class="modal">
      <div class="modal-head"><h3 class="modal-title">${existing?'Edit':'Tambah'} — ${escHtml(dapukan)}</h3><button class="modal-close" onclick="closeModal('dapukanSlotModal')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Nama Lengkap *</label><input id="dsNama" value="${escHtml(existing?.nama||'')}"></div>
        <div class="form-group"><label>Tanggal Lahir</label><input type="date" id="dsTglLahir" value="${existing?.tgl_lahir||''}"></div>
        <div class="form-group"><label>No. HP / WhatsApp</label><input type="tel" inputmode="numeric" id="dsHp" value="${escHtml(existing?.no_hp||'')}" placeholder="Contoh: 081234567890" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal('dapukanSlotModal')">Batal</button>
        <button class="btn btn-green" id="dsSaveBtn">Simpan</button>
      </div>
    </div>`;

    document.getElementById('dsSaveBtn').onclick = async () => {
      const nama = document.getElementById('dsNama').value.trim();
      const tglLahir = document.getElementById('dsTglLahir').value || null;
      const noHp = document.getElementById('dsHp').value.trim();
      if (!nama) { showToast('Nama wajib diisi', true); return; }
      const btn = document.getElementById('dsSaveBtn');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        if (existing) {
          await SB.musPeserta.update(existing.id, { nama: toTitleCase(nama), tgl_lahir: tglLahir, no_hp: noHp || null });
        } else {
          const [scopeType, scopeRef] = scopeKey.split('|');
          // Re-cek slot solo (Kyai/KU) tepat sebelum simpan, jaga-jaga ada yang nambah barengan
          if (DAPUKAN_SOLO.has(dapukan)) {
            let currentList = [];
            if (scopeType === 'kelompok') currentList = await SB.musPeserta.getByKelompok(scopeRef) || [];
            else if (scopeType === 'desa') currentList = await SB.musPeserta.getByDesa(scopeRef) || [];
            else currentList = await SB.musPeserta.getByDaerah() || [];
            if (currentList.some(p => p.jabatan === dapukan)) {
              showToast(`${dapukan} sudah ada orangnya — hapus dulu yang lama kalau mau ganti`, true);
              btn.disabled = false; btn.textContent = 'Simpan';
              return;
            }
          }
          const payload = { nama: toTitleCase(nama), jabatan: dapukan, tgl_lahir: tglLahir, no_hp: noHp || null, aktif: true };
          if (scopeType === 'kelompok') payload.kelompok_id = scopeRef;
          else if (scopeType === 'desa') payload.desa_id = scopeRef;
          else payload.level_daerah = true;
          await SB.musPeserta.insert(payload);
        }
        logActivity(existing ? 'ubah' : 'tambah', 'Data Pengurus', `${dapukan}: ${nama}`);
        showToast('Tersimpan ✓');
        closeModal('dapukanSlotModal');
        renderPengurus();
      } catch(e) {
        showToast('Gagal: ' + e.message, true);
        btn.disabled = false; btn.textContent = 'Simpan';
      }
    };

    openModal('dapukanSlotModal');
  }
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

      // Urutkan: 4S dulu (sesuai urutan EMPAT_S), lalu Tim 7 (sesuai urutan TIM_7),
      // lalu sisanya (Unsur PPG/Pengurus Harian/Pengurus Bidang) — sort stabil jadi
      // urutan asli di dalam masing2 tingkatan tetap terjaga.
      function urutkanPengurus(list) {
        return [...list].sort((a, b) => {
          const rank = (j) => {
            const i4s = EMPAT_S.indexOf(j);
            if (i4s >= 0) return i4s; // 0..6
            const iTim7 = TIM_7.indexOf(j);
            if (iTim7 >= 0) return 100 + iTim7; // 100..106
            return 1000; // Unsur PPG / Harian / Bidang / lainnya, urutan asli dipertahankan
          };
          return rank(a.jabatan) - rank(b.jabatan);
        });
      }

      function drawSection(title, list) {
        checkY(30);
        page.drawRectangle({x:ML,y:y-4,width:W-ML-MR,height:18,color:GREEN});
        page.drawText(title, {x:ML+5,y,font:fBold,size:10,color:rgb(1,1,1)});
        y-=22;
        urutkanPengurus(list).forEach((p,i) => {
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
      for (const desaObj of Object.values(pengurusDesa)) {
        if (desaObj.list.length) drawSection('PENGURUS '+desaObj.nama.toUpperCase(), desaObj.list);
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
  kelompok_umum:{ label: 'Musyawarah Kelompok', icon: '🕌', warna: 'badge-green', roles: ['pjp_kelompok','kelompok','admin'] },
  pjp_desa:     { label: 'Musyawarah PJP Desa', icon: '🏘️', warna: 'badge-rose', roles: ['desa','desa_view','pjp_kelompok','admin'] },
  ppg_daerah:   { label: 'Musyawarah PPG Daerah', icon: '🏛️', warna: 'badge-gray', roles: ['daerah','desa','desa_view','admin'] },
};

// Level yang bisa DILIHAT per role (level saya dan di atas saya)
const MUSYAWARAH_VISIBLE = {
  guru:         ['guru_generus'],
  wali_kbm:     ['guru_generus'],
  kelompok:     ['guru_generus','unsur_5','kelompok_umum'],
  pjp_kelompok: ['guru_generus','unsur_5','kelompok_umum','pjp_desa'],
  desa:         ['guru_generus','unsur_5','pjp_desa'],
  desa_view:    ['guru_generus','unsur_5','pjp_desa'], // Pengelola Desa — sama kayak 'desa', tapi read-only (lihat MUSYAWARAH_CREATE)
  daerah:       ['guru_generus','unsur_5','pjp_desa','ppg_daerah'],
  admin:        ['guru_generus','unsur_5','kelompok_umum','pjp_desa','ppg_daerah'],
};

// Level yang bisa DIBUAT per role
const MUSYAWARAH_CREATE = {
  guru:         ['guru_generus'],
  wali_kbm:     ['guru_generus'],
  kelompok:     ['guru_generus','unsur_5','kelompok_umum'],
  pjp_kelompok: ['guru_generus','unsur_5','kelompok_umum'],
  desa:         ['pjp_desa'],
  desa_view:    [], // Pengelola Desa — read-only, gak bisa bikin notulensi baru
  daerah:       ['ppg_daerah'],
  admin:        ['guru_generus','unsur_5','kelompok_umum','pjp_desa','ppg_daerah'],
};

async function renderMusyawarah() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const role = u.role;
  const visibleLevels = MUSYAWARAH_VISIBLE[role] || [];
  const createLevels = MUSYAWARAH_CREATE[role] || [];

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';
  const DESA_NAMA_MUS = await loadDesaMap();

  // Load data musyawarah
  let allMusyawarah = [];
  try {
    if (role === 'admin' || role === 'daerah') {
      allMusyawarah = await SB.musyawarah.getAll();
    } else if (role === 'desa' || role === 'desa_view') {
      // Desa: musyawarah desa sendiri + kelompok di desa + ppg_daerah
      const desaId = u.desa_id;
      const desaMus = await SB.musyawarah.getByDesa(desaId) || [];
      if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
      const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === desaId);
      const klpMusResults = await Promise.all(klpDesa.map(k => SB.musyawarah.getByKelompok(k.id)));
      const klpMus = klpMusResults.filter(Boolean).flat();
      const daerahMus = await SB.musyawarah.getByLevel('ppg_daerah') || [];
      allMusyawarah = [...desaMus, ...klpMus, ...daerahMus];
    } else if (u.kelompok_id) {
      // Kelompok: musyawarah kelompok sendiri + PJP desa sendiri + ppg_daerah
      const klpMus = await SB.musyawarah.getByKelompok(u.kelompok_id) || [];
      if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
      const myKlp = (App.cache.kelompok||[]).find(k => k.id === u.kelompok_id);
      const myDesaId = myKlp?.desa_id || u.desa_id;
      // Hanya PJP Desa dari desa sendiri
      let desaMus = [];
      if (myDesaId) {
        const allDesaMus = await SB.musyawarah.getByLevel('pjp_desa') || [];
        desaMus = allDesaMus.filter(m => m.desa_id === myDesaId);
      }
      const daerahMus = await SB.musyawarah.getByLevel('ppg_daerah') || [];
      allMusyawarah = [...klpMus, ...desaMus, ...daerahMus];
    } else {
      allMusyawarah = await SB.musyawarah.getAll();
    }
    allMusyawarah = allMusyawarah.filter(m => visibleLevels.includes(m.level));
    const seen = new Set();
    allMusyawarah = allMusyawarah.filter(m => { if(seen.has(m.id)) return false; seen.add(m.id); return true; });
  } catch(e) { console.error(e); }

  // Pastikan kelompok cache sudah ready untuk renderPage
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();

  const nowMonth = currentMonthName();
  let filterLevel = 'semua';
  const KALENDER = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bulanSkrg = currentMonthName();
  const idxSkrg = KALENDER.indexOf(bulanSkrg);
  const bulanLalu = idxSkrg > 0 ? KALENDER[idxSkrg - 1] : null;
  let filterBulanSet = new Set([bulanSkrg]);
  if (bulanLalu) filterBulanSet.add(bulanLalu);
  let showAllBulan = false;

  // Auto-detect default level musyawarah berdasar role
  let defaultLevel = '';
  if (role === 'daerah') defaultLevel = 'ppg_daerah';
  else if (role === 'desa' || role === 'desa_view') defaultLevel = 'pjp_desa';
  else if (role === 'admin') defaultLevel = '';  // admin pilih sendiri
  // kelompok level → pilih antara guru_generus atau unsur_5

  function renderPage() {
    const taFilter = getTahunAjaran(); // misal "2026/2027"
    const filtered = allMusyawarah.filter(m => {
      const levelOk = filterLevel === 'semua' || m.level === filterLevel;
      const bulanOk = showAllBulan || filterBulanSet.has(m.bulan);
      // Filter tahun ajaran
      let tahunOk = true;
      if (m.tanggal) {
        const d = new Date(m.tanggal);
        const thn = d.getFullYear();
        const mTA = d.getMonth() >= 6 ? thn+'/'+(thn+1) : (thn-1)+'/'+thn;
        tahunOk = mTA === taFilter;
      }
      return levelOk && bulanOk && tahunOk;
    });

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
        // Kelompok: pilih dari semua level kelompok-tier yg boleh dibuat role ini
        // (createLevels sudah role-scoped lewat MUSYAWARAH_CREATE, gak perlu filter manual lagi)
        const opts = createLevels;
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
            <div id="musNotulensiStandar">
              <div style="margin-bottom:10px;">
                <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Pencapaian Materi</label>
                ${richTextEditorHtml('musPencapaianInline', '')}
              </div>
              <div style="margin-bottom:10px;">
                <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Kendala</label>
                ${richTextEditorHtml('musKendalaInline', '')}
              </div>
              <div style="margin-bottom:10px;">
                <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Solusi</label>
                ${richTextEditorHtml('musSolusiInline', '')}
              </div>
              <div style="margin-bottom:14px;">
                <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Tindak Lanjut</label>
                ${richTextEditorHtml('musTindakLanjutInline', '')}
              </div>
            </div>
            <div id="musNotulensiKelompokUmum" style="display:none; margin-bottom:14px;">
              <label style="font-size:12px; font-weight:700; color:var(--green); display:block; margin-bottom:5px;">Hasil Musyawarah</label>
              ${richTextEditorHtml('musHasilInline', '')}
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

    const klpMap = Object.fromEntries((App.cache.kelompok||[]).map(k => [k.id, k]));

    const daftarHtml = filtered.length ? filtered.map(m => {
      const cfg = MUSYAWARAH_LEVEL[m.level] || {};
      const bisa_edit = m.dibuat_oleh === u.id || role === 'admin';
      const klpObj = klpMap[m.kelompok_id];
      const klpNama = klpObj?.nama || '';
      const desaNama = klpObj?.desa?.nama || DESA_NAMA_MUS[klpObj?.desa_id] || DESA_NAMA_MUS[m.desa_id] || '';
      return `<div class="card" style="margin-bottom:12px; padding:16px;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge ${cfg.warna||'badge-gray'}">${cfg.icon||''} ${cfg.label||m.level}</span>
              <span style="font-size:12px; color:var(--ink-soft);">${fmtDateShort(m.tanggal)}</span>
            </div>
            <div style="font-size:12px; color:var(--ink-soft);">
              Bulan: <b>${escHtml(m.bulan||'')}</b>
              ${klpNama ? ' · 👥 '+escHtml(klpNama) : ''}
              ${desaNama ? ' · 🏘️ '+escHtml(desaNama) : ''}
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
          ${m.pencapaian ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--green); margin-bottom:3px;">${m.level==='kelompok_umum'?'Hasil Musyawarah':'Pencapaian Materi'}</div><div style="font-size:13px; color:var(--ink);">${contentToDisplayHtml(m.pencapaian)}</div></div>` : ''}
          ${m.kendala ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--rose); margin-bottom:3px;">Kendala</div><div style="font-size:13px; color:var(--ink);">${contentToDisplayHtml(m.kendala)}</div></div>` : ''}
          ${m.solusi ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--gold); margin-bottom:3px;">Solusi</div><div style="font-size:13px; color:var(--ink);">${contentToDisplayHtml(m.solusi)}</div></div>` : ''}
          ${m.tindak_lanjut ? `<div><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin-bottom:3px;">Tindak Lanjut</div><div style="font-size:13px; color:var(--ink);">${contentToDisplayHtml(m.tindak_lanjut)}</div></div>` : ''}
        </div>
      </div>`;
    }).join('') :
    `<div class="empty-state"><p class="empty-title">Belum ada notulensi</p><p class="empty-desc">Isi form di atas untuk menambahkan.</p></div>`;

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Musyawarah</h1>
      </div>
      ${formHtml}
      <div class="fw-bold color-green" style="font-size:14px; margin-bottom:8px;">Riwayat Notulensi</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
        ${levelTabs}
      </div>
      <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:14px; align-items:center;">
        <span style="font-size:11px; font-weight:700; color:var(--ink-soft); margin-right:4px;">Bulan:</span>
        ${KALENDER.map(b => {
          const hasMus = allMusyawarah.some(m => m.bulan === b);
          if (!hasMus) return '';
          const isActive = showAllBulan || filterBulanSet.has(b);
          return `<div onclick="MUS_toggleBulan('${b}')"
            style="padding:4px 10px; border-radius:16px; font-size:11px; font-weight:700; cursor:pointer;
              background:${isActive?'var(--green)':'var(--white)'};
              color:${isActive?'#fff':'var(--ink-soft)'};
              border:1.5px solid ${isActive?'var(--green)':'var(--line)'};">
            ${b.slice(0,3)}
          </div>`;
        }).join('')}
        <div onclick="MUS_toggleAllBulan()"
          style="padding:4px 10px; border-radius:16px; font-size:11px; font-weight:700; cursor:pointer;
            background:${showAllBulan?'var(--gold)':'var(--white)'};
            color:${showAllBulan?'#fff':'var(--ink-soft)'};
            border:1.5px solid ${showAllBulan?'var(--gold)':'var(--line)'};">
          Semua
        </div>
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
  window.MUS_toggleBulan = (b) => {
    showAllBulan = false;
    if (filterBulanSet.has(b)) filterBulanSet.delete(b);
    else filterBulanSet.add(b);
    if (filterBulanSet.size === 0) filterBulanSet.add(bulanSkrg);
    renderPage();
  };
  window.MUS_toggleAllBulan = () => {
    showAllBulan = !showAllBulan;
    renderPage();
  };

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
      const kelasMeta = await Promise.all(kelasList.map(async k => {
        const [ptList, sList] = await Promise.all([
          SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
          SB.santri.getByKelas(k.id),
        ]);
        return { k, ptBulan: ptList.filter(p => p.bulan === bulan), sList };
      }));
      const allPtIds = kelasMeta.flatMap(m => m.ptBulan.map(p => p.id));
      const allAbs = await SB.absensi.getByPertemuanIds(allPtIds);
      const absByPt = {};
      allAbs.forEach(a => { (absByPt[a.pertemuan_id] ||= []).push(a); });

      await Promise.all(kelasMeta.map(async ({ k, ptBulan, sList }) => {
        let H=0,I=0,S=0,A=0,slot=0;
        ptBulan.forEach(p => {
          const abs = absByPt[p.id] || [];
          sList.forEach(s => {
            const a = abs.find(x => x.santri_id === s.id);
            const st = a?.status || 'A';
            if(st==='H')H++; else if(st==='I')I++; else if(st==='S')S++; else A++;
            slot++;
          });
        });
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
      }));
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
        const klpStatsResults = await Promise.all(klpDesa.map(async klp => ({
          klp,
          rows: await hitungKelompokStats(klp.id, tampilBulan),
        })));
        for (const { klp, rows } of klpStatsResults) {
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
          const klpStatsResults2 = await Promise.all(klpDesa.map(async klp => ({
            klp,
            rows: await hitungKelompokStats(klp.id, tampilBulan),
          })));
          for (const { klp, rows } of klpStatsResults2) {
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

        // Fetch progress + kelas per kelompok (paralel)
        const klpMeta = await Promise.all(allKlp.map(async klp => {
          try {
            const [prog, kelasList] = await Promise.all([
              SB.progress.getByKelompok(klp.id, getTahunAjaran()),
              SB.kelas.getByKelompok(klp.id),
            ]);
            const materiCount = prog.filter(p => p.bulan === tampilBulan).length;
            // Target materi bulan ini = jumlah topik terjadwal di Kurikulum, DIHITUNG SEKALI
            // per kombinasi jenjang+semester yg ADA di kelompok ini (bukan per kelas — kalau
            // ada 2 kelas paralel di jenjang sama, targetnya jangan didobel).
            const col = tampilBulan.toLowerCase();
            const jenjangSemSet = new Set(kelasList.map(k => `${k.jenjang}|${k.semester}`));
            let materiTarget = 0;
            jenjangSemSet.forEach(js => {
              const [jenjang, semester] = js.split('|');
              materiTarget += (App.cache.materi||[]).filter(r =>
                r.jenjang === jenjang && String(r.semester) === String(semester) && r[col] && r[col].trim()
              ).length;
            });
            const pctMateri = materiTarget > 0 ? Math.round(materiCount/materiTarget*100) : null;
            const kelasMeta = await Promise.all(kelasList.map(async k => {
              const [ptList, sList] = await Promise.all([
                SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
                SB.santri.getByKelas(k.id),
              ]);
              return { k, ptBulan: ptList.filter(p => p.bulan === tampilBulan), sList };
            }));
            return { klp, materiCount, materiTarget, pctMateri, kelasMeta, ok: true };
          } catch(e) { return { klp, materiCount: 0, materiTarget: 0, pctMateri: null, kelasMeta: [], ok: false }; }
        }));

        // Satu kali fetch absensi untuk SEMUA pertemuan se-daerah (bukan per kelas per kelompok)
        const allPtIdsMus = klpMeta.flatMap(m => m.kelasMeta.flatMap(km => km.ptBulan.map(p => p.id)));
        const allAbsMus = await SB.absensi.getByPertemuanIds(allPtIdsMus);
        const absByPtMus = {};
        allAbsMus.forEach(a => { (absByPtMus[a.pertemuan_id] ||= []).push(a); });

        const klpData = {};
        klpMeta.forEach(({ klp, materiCount, materiTarget, pctMateri, kelasMeta, ok }) => {
          if (!ok) { klpData[klp.id] = { materi: 0, materiTarget: 0, pctMateri: null, pctHadir: null, kelasStats: [] }; return; }
          let totalH=0, totalSlot=0;
          const kelasStats = kelasMeta.map(({ k, ptBulan, sList }) => {
            let kH=0, kSlot=0;
            ptBulan.forEach(p => {
              const abs = absByPtMus[p.id] || [];
              sList.forEach(s => {
                const a = abs.find(x => x.santri_id === s.id);
                const st = a?.status || 'A';
                if (st==='H') { kH++; totalH++; }
                kSlot++; totalSlot++;
              });
            });
            return {
              nama: k.nama_kelas || k.jenjang,
              pctHadir: kSlot > 0 ? Math.round(kH/kSlot*100) : null,
              santri: sList.length,
              pertemuan: ptBulan.length,
            };
          });
          klpData[klp.id] = {
            materi: materiCount,
            materiTarget,
            pctMateri,
            pctHadir: totalSlot > 0 ? Math.round(totalH/totalSlot*100) : null,
            kelasStats,
          };
        });

        let daerahHtml = '';
        for (const [desaNama, klpList] of Object.entries(desaMap)) {
          const totalMateriCapai = klpList.reduce((n,k) => n + (klpData[k.id]?.materi||0), 0);
          const totalMateriTarget = klpList.reduce((n,k) => n + (klpData[k.id]?.materiTarget||0), 0);
          const avgMateriDesa = totalMateriTarget > 0 ? Math.round(totalMateriCapai/totalMateriTarget*100) : null;
          const hadirArr = klpList.map(k => klpData[k.id]?.pctHadir).filter(p => p !== null);
          const avgHadir = hadirArr.length ? Math.round(hadirArr.reduce((a,b)=>a+b,0)/hadirArr.length) : null;
          const desaElId = 'musRekapDesa_' + desaNama.replace(/\s/g,'_');

          let detailRows = klpList.map(klp => {
            const d = klpData[klp.id] || { materiTarget:0, pctMateri:null, pctHadir:null, kelasStats:[] };
            const kelasDetail = d.kelasStats.map(ks =>
              `<span style="font-size:10px; margin-left:8px; color:var(--ink-soft);">${escHtml(ks.nama)}: ${ks.pctHadir!==null?ks.pctHadir+'%':'-'}</span>`
            ).join('');
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 8px; font-size:11.5px; flex-wrap:wrap; gap:2px;">
              <span style="font-weight:600;">${escHtml(klp.nama)}</span>
              <span>
                ${pctBadge(d.pctHadir)} hadir · ${pctBadge(d.pctMateri)} materi
                ${kelasDetail}
              </span>
            </div>`;
          }).join('');

          daerahHtml += `
            <div style="border-bottom:1px solid var(--line); padding:8px 0;">
              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; cursor:pointer;" onclick="document.getElementById('${desaElId}').style.display = document.getElementById('${desaElId}').style.display==='none'?'block':'none'">
                <div style="font-weight:700; font-size:13px;">📍 ${escHtml(desaNama)} <span style="font-size:11px; color:var(--ink-soft);">(${klpList.length} klp)</span></div>
                <div style="font-size:12px;">
                  ${pctBadge(avgHadir)} hadir · ${pctBadge(avgMateriDesa)} materi
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
  let musInlineLevel = null;

  window.MUS_loadAbsensiInline = async (level) => {
    musInlineLevel = level;
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

    const DESA_NAMA_MAP = await loadDesaMap();
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
        // Data lama pakai NAMA desa, data baru (lewat Data Pengurus) pakai KODE (D1-D6) — cari dua-duanya
        const DESA_NAMA_MAP2 = await loadDesaMap();
        for (const [kode, nama] of Object.entries(DESA_NAMA_MAP2)) {
          const [dp1, dp2] = await Promise.all([SB.musPeserta.getByDesa(kode), SB.musPeserta.getByDesa(nama)]);
          allPeserta = [...allPeserta, ...(dp1||[]), ...(dp2||[])];
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

      } else if (level === 'guru_generus' || level === 'unsur_5' || level === 'kelompok_umum') {
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

    // Belum dipilih statusnya — user wajib isi manual per peserta

    MUS_renderAbsensiInline();
    absensiArea.style.display = 'block';
    notulensiArea.style.display = 'block';
    const notulensiStandar = document.getElementById('musNotulensiStandar');
    const notulensiKelompokUmum = document.getElementById('musNotulensiKelompokUmum');
    if (level === 'kelompok_umum') {
      notulensiStandar.style.display = 'none';
      notulensiKelompokUmum.style.display = 'block';
    } else {
      notulensiStandar.style.display = 'block';
      notulensiKelompokUmum.style.display = 'none';
    }
    saveBtn.style.display = 'block';
  };

  window.MUS_renderAbsensiInline = () => {
    const listEl = document.getElementById('musAbsensiList');
    const statsEl = document.getElementById('musAbsensiStats');
    if (!listEl) return;

    const totalH = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'H').length + musInlineTamu.filter(t => t.status === 'H').length;
    const totalI = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'I').length + musInlineTamu.filter(t => t.status === 'I').length;
    const totalS = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'S').length + musInlineTamu.filter(t => t.status === 'S').length;
    const totalA = musInlinePeserta.filter(p => musInlineAbsensi[p.id] === 'A').length + musInlineTamu.filter(t => t.status === 'A').length;
    const totalBelum = musInlinePeserta.filter(p => !musInlineAbsensi[p.id]).length + musInlineTamu.filter(t => !t.status).length;

    statsEl.innerHTML = `
      <span class="badge badge-green">Hadir: ${totalH}</span>
      <span class="badge badge-gold">Izin: ${totalI}</span>
      <span class="badge" style="background:#e3f0f7; color:#4da6c9;">Sakit: ${totalS}</span>
      <span class="badge badge-rose">Alpha: ${totalA}</span>
      ${totalBelum ? `<span class="badge" style="background:#f2f2f2; color:#888;">Belum Diisi: ${totalBelum}</span>` : ''}
      <span class="badge badge-gray">Total: ${musInlinePeserta.length + musInlineTamu.length}</span>`;

    // Kelompokkan peserta berdasarkan kelompok_id / desa_id / daerah
    if (!App.cache.kelompok) App.cache.kelompok = [];
    const groups = {};
    if (musInlineLevel === 'ppg_daerah') {
      // Khusus Musyawarah PPG Daerah: 3 bagian sesuai struktur Data Pengurus,
      // sudah terurut (Unsur Daerah -> Unsur Desa -> Unsur PPG)
      urutkanPesertaDaerah(musInlinePeserta).forEach(p => {
        const rank = rankPesertaDaerah(p);
        const groupKey = rank[0] === 0 ? '🏛️ Unsur Daerah'
          : rank[0] === 1 ? '🏘️ Unsur Desa'
          : rank[0] === 2 ? '📋 Unsur PPG'
          : '📌 Lainnya';
        (groups[groupKey] ||= []).push(p);
      });
    } else {
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
    }

    let html = '';
    for (const [group, members] of Object.entries(groups)) {
      if (Object.keys(groups).length > 1) {
        html += `<div style="font-size:12px; font-weight:700; color:var(--green); padding:8px 0 4px; border-bottom:2px solid var(--green); margin-top:8px;">${escHtml(group)} (${members.length})</div>`;
      }
      members.forEach(p => {
        const st = musInlineAbsensi[p.id] || null;
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
      const tSt = t.status || null;
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
        <div style="display:flex; gap:4px; align-items:center; flex-shrink:0;">
          ${['H','I','S','A'].map(s => `
            <button onclick="MUS_setTamuAbsInline(${i},'${s}')"
              style="width:28px; height:28px; border:2px solid ${tSt===s?(s==='H'?'var(--green)':s==='I'?'var(--gold)':s==='S'?'#4da6c9':'var(--rose)'):'var(--line)'}; border-radius:6px; background:${tSt===s?(s==='H'?'var(--green)':s==='I'?'var(--gold)':s==='S'?'#4da6c9':'var(--rose)'):'transparent'}; color:${tSt===s?'#fff':(s==='H'?'var(--green)':s==='I'?'var(--gold)':s==='S'?'#4da6c9':'var(--rose)')}; font-weight:800; font-size:10px; cursor:pointer;">
              ${s}
            </button>`).join('')}
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

  window.MUS_setTamuAbsInline = (idx, status) => {
    if (musInlineTamu[idx]) musInlineTamu[idx].status = status;
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

    const belumPeserta = musInlinePeserta.filter(p => !musInlineAbsensi[p.id]);
    const belumTamu = musInlineTamu.filter(t => !t.status);
    if (belumPeserta.length || belumTamu.length) {
      showToast(`Masih ada ${belumPeserta.length + belumTamu.length} peserta yang belum diisi kehadirannya`, true);
      return;
    }

    const btn = document.getElementById('musSaveInline');
    btn.disabled = true; btn.textContent = 'Menyimpan...';

    const data = {
      level, tanggal, bulan,
      tahun: new Date(tanggal).getFullYear(),
      pencapaian: level === 'kelompok_umum'
        ? (RTE_getHtml('musHasilInline') || null)
        : (RTE_getHtml('musPencapaianInline') || null),
      kendala: RTE_getHtml('musKendalaInline') || null,
      solusi: RTE_getHtml('musSolusiInline') || null,
      tindak_lanjut: RTE_getHtml('musTindakLanjutInline') || null,
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
          status: musInlineAbsensi[p.id],
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
            status: t.status,
          });
        }
      }

      showToast('Notulensi & absensi berhasil disimpan ✓');

      // Reset form
      ['musPencapaianInline','musKendalaInline','musSolusiInline','musTindakLanjutInline','musHasilInline'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
      });
      musInlineTamu = [];
      musInlinePeserta.forEach(p => { delete musInlineAbsensi[p.id]; });
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
      const fItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
      const fBoldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
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
        // Urutkan sama seperti Data Pengurus: 4S dulu, baru Tim 7, baru Unsur PPG/lainnya
        // (urutan asli di masing2 tingkatan tetap terjaga — sort stabil).
        function rankJabatan(j) {
          const i4s = EMPAT_S.indexOf(j);
          if (i4s >= 0) return i4s;
          const iTim7 = TIM_7.indexOf(j);
          if (iTim7 >= 0) return 100 + iTim7;
          return 1000;
        }
        const absUrut = [...absList].sort((a, b) => {
          const jabA = a.peserta_id ? (a.musyawarah_peserta?.jabatan||'') : (a.jabatan_tamu||'');
          const jabB = b.peserta_id ? (b.musyawarah_peserta?.jabatan||'') : (b.jabatan_tamu||'');
          return rankJabatan(jabA) - rankJabatan(jabB);
        });
        absUrut.forEach((a,i) => {
          checkY(14);
          const nama = a.peserta_id ? (a.musyawarah_peserta?.nama||'-') : (a.nama_tamu||'Tamu');
          const jab = a.peserta_id ? (a.musyawarah_peserta?.jabatan||'') : (a.jabatan_tamu||'Tamu');
          const st = a.status || '-';
          page.drawText((i+1)+'. '+nama+' ('+jab+') - '+st, {x:ML+4,y,font:fReg,size:9,color:rgb(0.1,0.1,0.1)});
          y-=13;
        });
        y-=6;
      }

      // Gambar 1 baris (array of {text,bold,italic}) ke PDF, word-wrap sambil GANTI FONT per
      // run kalau ada campuran bold/italic dalam 1 baris — bukan cuma teks polos 1 font lagi.
      function fontFor(bold, italic) {
        if (bold && italic) return fBoldItalic;
        if (bold) return fBold;
        if (italic) return fItalic;
        return fReg;
      }
      function drawRichLine(runs, size, indent) {
        let x = ML + indent;
        checkY(size + 4);
        runs.forEach(run => {
          const font = fontFor(run.bold, run.italic);
          const words = run.text.split(/(\s+)/); // pertahankan spasi sbg elemen sendiri
          words.forEach(w => {
            if (!w) return;
            const wWidth = font.widthOfTextAtSize(w, size);
            if (x + wWidth > W - MR && w.trim()) {
              y -= (size + 4); x = ML + indent; checkY(size + 4);
            }
            if (w.trim()) page.drawText(w, { x, y, font, size, color: rgb(0.15,0.15,0.15) });
            x += wWidth;
          });
        });
        y -= (size + 4);
      }

      const sections = [
        [m.level === 'kelompok_umum' ? 'HASIL MUSYAWARAH' : 'PENCAPAIAN MATERI', m.pencapaian],
        ['KENDALA', m.kendala],
        ['SOLUSI', m.solusi],
        ['TINDAK LANJUT', m.tindak_lanjut],
      ];
      sections.forEach(([title, text]) => {
        if (!text) return;
        checkY(30);
        page.drawText(title, {x:ML,y,font:fBold,size:10,color:GREEN}); y-=14;
        const richLines = htmlToPdfLines(contentToDisplayHtml(text));
        if (!richLines.length) { y -= 9; }
        richLines.forEach(runs => drawRichLine(runs, 9, 4));
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
      ${m?.level === 'kelompok_umum' ? `
      <div class="form-group">
        <label>Hasil Musyawarah</label>
        ${richTextEditorHtml('musPencapaian', contentToDisplayHtml(m?.pencapaian))}
      </div>
      <input type="hidden" id="musKendala" value="">
      <input type="hidden" id="musSolusi" value="">
      <input type="hidden" id="musTindakLanjut" value="">
      ` : `
      <div class="form-group">
        <label>Pencapaian Materi</label>
        ${richTextEditorHtml('musPencapaian', contentToDisplayHtml(m?.pencapaian))}
      </div>
      <div class="form-group">
        <label>Kendala</label>
        ${richTextEditorHtml('musKendala', contentToDisplayHtml(m?.kendala))}
      </div>
      <div class="form-group">
        <label>Solusi</label>
        ${richTextEditorHtml('musSolusi', contentToDisplayHtml(m?.solusi))}
      </div>
      <div class="form-group">
        <label>Tindak Lanjut</label>
        ${richTextEditorHtml('musTindakLanjut', contentToDisplayHtml(m?.tindak_lanjut))}
      </div>
      `}
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

    // Field ini bisa jadi editor kaya (contenteditable) ATAU input hidden biasa, tergantung
    // level (kelompok_umum vs standar) — baca dgn cara yg sesuai.
    function readMusField(id) {
      const el = document.getElementById(id);
      if (!el) return null;
      const val = el.isContentEditable ? RTE_getHtml(id) : el.value.trim();
      return val || null;
    }

    const data = {
      level, tanggal, bulan,
      tahun: new Date(tanggal).getFullYear(),
      peserta: document.getElementById('musPeserta').value.trim() || null,
      pencapaian: readMusField('musPencapaian'),
      kendala: readMusField('musKendala'),
      solusi: readMusField('musSolusi'),
      tindak_lanjut: readMusField('musTindakLanjut'),
      kelompok_id: u.kelompok_id || null,
      desa_id: u.desa_id || null,
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

// Urutan tampil peserta Musyawarah PPG Daerah di layar Absensi:
// 1. Unsur Daerah (4S)
// 2. Unsur Desa — Kyai, PJP KBM, PJP SarPras dari tiap desa (6 desa)
// 3. Unsur PPG — Pengurus Harian lalu Pengurus Bidang per bidang
// Yang jabatannya tidak cocok daftar ini (misal Tim 7) tetap muncul di akhir, urut abjad.
const DAERAH_4S_URUTAN = ['Kyai', 'Wakil Kyai', 'KU', 'Penulis KU', 'Penerobos', 'Mubalegh', 'Aghnia'];
const DESA_UNSUR_URUTAN = ['Kyai', 'PJP KBM', 'PJP SarPras'];
const PPG_URUTAN = [
  'Ketua PPG', 'Wakil Ketua', 'Sekretaris', 'Bendahara',
  'Kurikulum', 'Tenaga Pendidik', 'Seni & Olahraga', 'Kemandirian', 'Keputrian',
  'KMM Daerah', 'Tahfidz', 'Sarana dan Prasarana', 'Penggalang Dana', 'Bimbingan Konseling',
];
const DESA_URUTAN_MAP = {'D1':1,'D2':2,'D3':3,'D4':4,'D5':5,'D6':6,
  'Desa Barat 1':1,'Desa Barat 2':2,'Desa Tengah 1':3,'Desa Tengah 2':4,'Desa Timur 1':5,'Desa Timur 2':6};

function rankPesertaDaerah(p) {
  if (p.level_daerah) {
    const i = DAERAH_4S_URUTAN.indexOf(p.jabatan);
    if (i !== -1) return [0, i, 0];
    const j = PPG_URUTAN.indexOf(p.jabatan);
    if (j !== -1) return [2, j, 0];
    return [3, 1, 0]; // unsur daerah lain (Tim 7, dst)
  }
  if (p.desa_id) {
    const i = DESA_UNSUR_URUTAN.indexOf(p.jabatan);
    if (i !== -1) return [1, i, DESA_URUTAN_MAP[p.desa_id] || 99];
    return [3, 2, 0]; // unsur desa lain di luar Kyai/PJP KBM/PJP SarPras
  }
  return [3, 3, 0];
}
function urutkanPesertaDaerah(list) {
  return [...list].sort((a, b) => {
    const ra = rankPesertaDaerah(a), rb = rankPesertaDaerah(b);
    for (let i = 0; i < 3; i++) { if (ra[i] !== rb[i]) return ra[i] - rb[i]; }
    return (a.nama||'').localeCompare(b.nama||'');
  });
}

// Ambil Kyai/PJP KBM/PJP SarPras dari SEMUA desa (6), buat gabung ke Absensi Musyawarah Daerah
async function loadUnsurDesaUntukMusDaerah() {
  const DESA_NAMA_MAP = await loadDesaMap();
  const results = await Promise.all(Object.keys(DESA_NAMA_MAP).map(async did => {
    const [p1, p2] = await Promise.all([SB.musPeserta.getByDesa(did), SB.musPeserta.getByDesa(DESA_NAMA_MAP[did])]);
    const seen = new Set();
    return [...(p1||[]), ...(p2||[])].filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }));
  return results.flat().filter(p => DESA_UNSUR_URUTAN.includes(p.jabatan));
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
  const DESA_NAMA_MAP = await loadDesaMap();
  try {
    if (level === 'ppg_daerah') {
      const [unsurDaerah, unsurDesa] = await Promise.all([
        SB.musPeserta.getByDaerah(),
        loadUnsurDesaUntukMusDaerah(),
      ]);
      pesertaTetap = urutkanPesertaDaerah([...(unsurDaerah||[]), ...unsurDesa]);
    } else if (level === 'pjp_desa') {
      // User punya desa_id = D1, tapi peserta disimpan dengan desa_id = "Desa Barat 1"
      const desaId = u.desa_id || '';
      const desaNama = DESA_NAMA_MAP[desaId] || desaId;
      // Coba kedua format
      let p1 = await SB.musPeserta.getByDesa(desaId);
      let p2 = desaNama !== desaId ? await SB.musPeserta.getByDesa(desaNama) : [];
      // Sekalian tarik pengurus level KELOMPOK di desa ini juga — krn Konfigurasi Peserta
      // Musyawarah PJP Desa MEMANG nawarin pilihan dapukan dari kelompok2 di desa itu juga
      // (bukan cuma dapukan level desa doang), jadi daftar peserta di sini WAJIB sinkron.
      if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
      const klpDiDesaIni = (App.cache.kelompok||[]).filter(k => k.desa_id === desaId);
      const pKlpArrs = await Promise.all(klpDiDesaIni.map(klp => SB.musPeserta.getByKelompok(klp.id)));
      // Gabungkan dan dedup
      const seen = new Set();
      let semuaPesertaDesa = [...(p1||[]), ...(p2||[]), ...pKlpArrs.filter(Boolean).flat()].filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id); return true;
      });
      // Filter sesuai dapukan yg dicentang di Konfigurasi Peserta Musyawarah — SEBELUMNYA
      // gak pernah diterapkan sama sekali di sini, makanya SEMUA pengurus desa+kelompok
      // ikut kehitung "wajib hadir" walau konfigurasinya udah diatur.
      const konfigRes = await SB.musKonfig.get('pjp_desa', null, desaId);
      const dapukanWajibDesa = konfigRes?.[0]?.dapukan_wajib || [];
      pesertaTetap = dapukanWajibDesa.length
        ? semuaPesertaDesa.filter(p => dapukanWajibDesa.includes(p.jabatan))
        : semuaPesertaDesa; // belum dikonfigurasi sama sekali — tampilkan semua dulu
    } else if (level === 'kelompok_umum' && u.kelompok_id) {
      const [semuaPengurus, konfigRes] = await Promise.all([
        SB.musPeserta.getByKelompok(u.kelompok_id),
        SB.musKonfig.get('kelompok_umum', u.kelompok_id, null),
      ]);
      const dapukanWajib = konfigRes?.[0]?.dapukan_wajib || [];
      pesertaTetap = dapukanWajib.length
        ? (semuaPengurus||[]).filter(p => dapukanWajib.includes(p.jabatan))
        : (semuaPengurus||[]); // belum dikonfigurasi sama sekali — tampilkan semua dulu
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
      const status = absensiState[p.id] || null;
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

    const tamuRows = tamuList.map((t,i) => {
      const tSt = t.status || null;
      return `
      <tr>
        <td>
          <div style="font-weight:700; font-size:13px;">${escHtml(t.nama_tamu||'')}</div>
          <div style="font-size:11px; color:var(--ink-soft);">${escHtml(t.jabatan_tamu||'Tamu')}</div>
        </td>
        <td>${t.no_hp_tamu || '—'}</td>
        <td>
          <div style="display:flex; gap:5px; align-items:center;">
            ${['H','I','A'].map(st => `
              <button onclick="MABS_setTamuStatus('${t.id}','${st}')"
                style="width:30px; height:30px; border:2px solid ${tSt===st?(st==='H'?'var(--green)':st==='I'?'var(--gold)':'var(--rose)'):'var(--line)'}; border-radius:6px; background:${tSt===st?(st==='H'?'var(--green)':st==='I'?'var(--gold)':'var(--rose)'):'transparent'}; color:${tSt===st?'#fff':(st==='H'?'var(--green)':st==='I'?'var(--gold)':'var(--rose)')}; font-weight:800; font-size:11px; cursor:pointer;">
                ${st}
              </button>`).join('')}
            <button class="btn-icon danger" onclick="MABS_hapusTamu('${t.id}')" title="Hapus tamu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    const totalH = pesertaTetap.filter(p => absensiState[p.id]==='H').length + tamuList.filter(t=>t.status==='H').length;
    const totalI = pesertaTetap.filter(p => absensiState[p.id]==='I').length + tamuList.filter(t=>t.status==='I').length;
    const totalA = pesertaTetap.filter(p => absensiState[p.id]==='A').length + tamuList.filter(t=>t.status==='A').length;
    const totalBelum = pesertaTetap.filter(p => !absensiState[p.id]).length + tamuList.filter(t=>!t.status).length;

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
          ${totalBelum ? `<span class="badge" style="background:#f2f2f2; color:#888;">Belum Diisi: ${totalBelum}</span>` : ''}
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

  window.MABS_setTamuStatus = async (id, status) => {
    const t = tamuList.find(x => x.id === id);
    if (t) t.status = status;
    renderAbsensiModal();
    try { await SB.musAbsensi.update(id, { status }); } catch(e) { showToast('Gagal simpan status tamu: ' + e.message, true); }
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
        status: null,
      });
      if (res?.[0]) tamuList.push(res[0]);
      showToast('Tamu ditambahkan');
      renderAbsensiModal();
    } catch(e) { showToast('Gagal: ' + e.message, true); }
  };

  window.MABS_simpan = async () => {
    const belumPeserta = pesertaTetap.filter(p => !absensiState[p.id]);
    const belumTamu = tamuList.filter(t => !t.status);
    if (belumPeserta.length || belumTamu.length) {
      showToast(`Masih ada ${belumPeserta.length + belumTamu.length} peserta yang belum diisi kehadirannya`, true);
      return;
    }
    try {
      // Upsert absensi peserta tetap
      if (pesertaTetap.length) {
        const rows = pesertaTetap.map(p => ({
          musyawarah_id: musId,
          peserta_id: p.id,
          status: absensiState[p.id],
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



/* ===== PAGE: LIVE CHAT ===== */
async function renderLiveChat() {
  const main = document.getElementById('mainContent');
  const u = App.user;

  markChatAsRead();
  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div></div>';

  let messages = (await SB.chat.getRecent(100) || []).reverse(); // urut lama → baru

  const ROLE_SHORT = { admin:'Admin', daerah:'Daerah', desa:'Desa', pjp_kelompok:'PJP Klp', wali_kbm:'Wali KBM', guru:'Guru', kelompok:'Klp' };

  function fmtJam(iso) {
    return new Date(iso).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  }

  function bubbleHtml(m) {
    const mine = m.user_id === u.id;
    return `<div style="display:flex; flex-direction:column; align-items:${mine?'flex-end':'flex-start'}; margin-bottom:10px;">
      ${!mine ? `<div style="font-size:11px; font-weight:700; color:var(--green); margin-bottom:2px; margin-left:2px;">${escHtml(m.nama_lengkap)} <span style="font-weight:500; color:var(--ink-soft);">· ${escHtml(ROLE_SHORT[m.role]||m.role)}</span></div>` : ''}
      <div style="max-width:78%; padding:8px 12px; border-radius:14px; font-size:13.5px; line-height:1.45; word-break:break-word;
        background:${mine?'var(--green)':'#fff'}; color:${mine?'#fff':'#111'}; border:${mine?'none':'1px solid var(--line)'};
        border-bottom-right-radius:${mine?'4px':'14px'}; border-bottom-left-radius:${mine?'14px':'4px'};">
        ${escHtml(m.pesan)}
      </div>
      <div style="font-size:10px; color:var(--ink-soft); margin-top:2px; margin-${mine?'right':'left'}:2px;">${fmtJam(m.created_at)}</div>
    </div>`;
  }

  function render() {
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Live Chat</h1>
          <p style="font-size:12.5px; color:var(--ink-soft); margin:2px 0 0;">Ruang obrolan seluruh anggota PPG Sidoarjo Utara</p>
        </div>
      </div>
      <div class="card" style="display:flex; flex-direction:column; height:min(600px, 70vh); padding:0; overflow:hidden;">
        <div id="chatBox" style="flex:1; overflow-y:auto; padding:14px;">
          ${messages.length ? messages.map(bubbleHtml).join('') : '<div style="text-align:center; color:var(--ink-soft); font-size:13px; padding:30px;">Belum ada pesan. Jadilah yang pertama menyapa 👋</div>'}
        </div>
        <div style="display:flex; gap:8px; padding:12px; border-top:1px solid var(--line);">
          <input id="chatInput" placeholder="Tulis pesan..." maxlength="500"
            style="flex:1; padding:10px 14px; border:1.5px solid var(--line); border-radius:24px; font-size:13.5px;"
            onkeydown="if(event.key==='Enter'){CHAT_kirim();}">
          <button class="btn btn-green" style="border-radius:24px; padding:10px 20px;" onclick="CHAT_kirim()">Kirim</button>
        </div>
      </div>
    `;
    scrollBawah();
  }

  function scrollBawah() {
    const box = document.getElementById('chatBox');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function nearBottom() {
    const box = document.getElementById('chatBox');
    if (!box) return true;
    return box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  }

  window.CHAT_kirim = async () => {
    const input = document.getElementById('chatInput');
    const pesan = input.value.trim();
    if (!pesan) return;
    input.value = '';
    input.disabled = true;
    try {
      const res = await SB.chat.insert({
        user_id: u.id, nama_lengkap: u.nama_lengkap, role: u.role, pesan,
      });
      if (res?.[0]) messages.push(res[0]);
      markChatAsRead();
      render();
    } catch(e) {
      showToast('Gagal kirim: ' + e.message, true);
    } finally {
      input.disabled = false;
      document.getElementById('chatInput')?.focus();
    }
  };

  // Polling tiap 8 detik — HANYA selagi halaman ini terbuka. Otomatis berhenti
  // begitu pindah menu lain (dibersihkan di navigate()), supaya tidak membebani
  // halaman lain / jalan di background terus-menerus.
  async function pollBaru() {
    if (!messages.length) return;
    const lastTime = messages[messages.length-1].created_at;
    try {
      const baru = await SB.chat.getSince(lastTime);
      if (baru && baru.length) {
        const idsAda = new Set(messages.map(m=>m.id));
        const trulyBaru = baru.filter(m => !idsAda.has(m.id));
        if (trulyBaru.length) {
          const wasNearBottom = nearBottom();
          messages.push(...trulyBaru);
          markChatAsRead();
          render();
          if (wasNearBottom) scrollBawah();
        }
      }
    } catch(e) { /* diam-diam gagal, coba lagi di polling berikutnya */ }
  }

  render();
  App.chatInterval = setInterval(pollBaru, 8000);
}

/* ===== PAGE: PROFIL SAYA ===== */
async function renderProfilSaya() {
  const main = document.getElementById('mainContent');
  const u = App.user;

  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const klp = (App.cache.kelompok||[]).find(k => k.id === u.kelompok_id);
  const desaNama = klp?.desa?.nama || u.desa_id || '-';

  const STATUS_LABEL = { approved: 'Aktif', pending: 'Menunggu Persetujuan', rejected: 'Ditolak' };
  const STATUS_COLOR = { approved: 'var(--green)', pending: '#e6a817', rejected: 'var(--rose)' };

  const row = (label, value) => `
    <div style="display:flex; padding:11px 0; border-bottom:1px solid var(--line);">
      <div style="width:150px; flex-shrink:0; font-size:12.5px; color:var(--ink-soft); font-weight:600;">${escHtml(label)}</div>
      <div style="flex:1; font-size:13.5px; font-weight:700; color:#111;">${value}</div>
    </div>`;

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Profil Saya</h1>
    </div>

    <div class="card" style="max-width:520px;">
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px; padding-bottom:18px; border-bottom:1px solid var(--line);">
        <div style="width:56px; height:56px; border-radius:50%; background:var(--green); color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; font-family:var(--font-display); flex-shrink:0;">
          ${escHtml((u.nama_lengkap||'?').charAt(0).toUpperCase())}
        </div>
        <div>
          <div style="font-size:17px; font-weight:800; color:#111;">${escHtml(u.nama_lengkap)}</div>
          <div style="font-size:12.5px; color:var(--ink-soft);">${escHtml(ROLE_LABELS[u.role]||u.role)}</div>
        </div>
      </div>

      ${row('Username', escHtml(u.username))}
      ${row('Dapukan / Jabatan', escHtml(u.jabatan||'-'))}
      ${row('Level', escHtml(ROLE_LABELS[u.role]||u.role))}
      ${klp ? row('Kelompok', escHtml(klp.nama)) : ''}
      ${(klp || u.desa_id) ? row('Desa', escHtml(desaNama)) : ''}
      ${row('Status Akun', `<span style="color:${STATUS_COLOR[u.status]||'var(--ink-soft)'};">${escHtml(STATUS_LABEL[u.status]||u.status||'-')}</span>`)}
      ${row('Terdaftar Sejak', escHtml(fmtDateShort(u.created_at)))}

      <div style="margin-top:18px; padding-top:16px; border-top:1px solid var(--line); font-size:12px; color:var(--ink-soft);">
        Mau ganti password? Buka menu <b style="color:var(--green);">Pengaturan</b>.<br>
        Perlu koreksi data (nama/username/kelompok)? Hubungi admin.
      </div>
      <button class="btn btn-outline" style="margin-top:12px;" onclick="navigate('settings')">Buka Pengaturan</button>
    </div>
  `;
}


async function renderSettings() {
  const main = document.getElementById('mainContent');
  const u = App.user;
  const waNum = await SB.settings.get('admin_whatsapp');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Pengaturan</h1>
    </div>

    <div class="card" style="border:1.5px solid var(--green);">
      <div class="fw-bold" style="color:var(--green); font-size:15px; margin-bottom:8px;">🔑 Ganti Password</div>
      <div class="form-group" style="max-width:360px; margin-bottom:10px;">
        <label>Password Lama</label>
        <input type="password" id="pwOld" autocomplete="current-password">
      </div>
      <div class="form-group" style="max-width:360px; margin-bottom:10px;">
        <label>Password Baru</label>
        <input type="password" id="pwNew" autocomplete="new-password" placeholder="minimal 6 karakter">
      </div>
      <div class="form-group" style="max-width:360px; margin-bottom:14px;">
        <label>Konfirmasi Password Baru</label>
        <input type="password" id="pwConfirm" autocomplete="new-password">
      </div>
      <button class="btn btn-green" id="pwSaveBtn" onclick="SET_gantiPassword()">Simpan Password Baru</button>
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
        </button>
        <button style="padding:8px; border:1.5px solid var(--line); border-radius:8px; background:var(--white); cursor:pointer; font-size:12px; font-weight:600; color:var(--green); text-align:left;" onclick="SET_konfig('kelompok_umum')">
          🕌 Konfig Mus. Kelompok
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
      <p style="font-size:13px; color:var(--ink); margin:0 0 12px;">Pilih data mana yang ingin di-reset. Data master (desa, kelompok, materi, pengguna) <b>tidak</b> akan terhapus.</p>

      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
        <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#fde8e8; border-radius:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="rst_kbm" checked> <b>KBM</b> — Absensi, Jurnal, Pertemuan, Progress Materi
        </label>
        <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#fde8e8; border-radius:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="rst_mus"> <b>Musyawarah</b> — Notulensi, Peserta, Absensi Musyawarah
        </label>
        <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#fde8e8; border-radius:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="rst_penilaian"> <b>Penilaian Generus</b> — Semua data penilaian
        </label>
        <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#fde8e8; border-radius:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="rst_mtms"> <b>Data MT/MS</b> — Semua data muda tugas / muda setia
        </label>
        <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#fde8e8; border-radius:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="rst_sarpras"> <b>Data Sarpras</b> — Semua data sarana prasarana
        </label>
        <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#fde8e8; border-radius:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="rst_proker"> <b>Program Kerja</b> — Program, Laporan, Sumber Dana
        </label>
        <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#fde8e8; border-radius:8px; cursor:pointer; font-size:13px;">
          <input type="checkbox" id="rst_santri"> <b>Data Santri & Kelas</b> — Semua santri dan kelas (hati-hati!)
        </label>
      </div>

      <div style="background:var(--white); border-radius:var(--radius-sm); padding:10px 12px; margin-bottom:14px; font-size:12px; color:var(--green);">
        <b>Yang TIDAK akan dihapus:</b> Desa, Kelompok, Materi Kurikulum, Akun Pengguna, Konfigurasi Musyawarah
      </div>

      <button class="btn btn-danger" id="resetBtn" onclick="SET_resetData()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        Hapus Data Terpilih
      </button>
    </div>` : ''}
  `;

  window.SET_gantiPassword = async () => {
    const oldPw = document.getElementById('pwOld').value;
    const newPw = document.getElementById('pwNew').value;
    const confirmPw = document.getElementById('pwConfirm').value;

    if (!oldPw || !newPw || !confirmPw) { showToast('Semua kolom wajib diisi', true); return; }
    if (newPw.length < 6) { showToast('Password baru minimal 6 karakter', true); return; }
    if (newPw !== confirmPw) { showToast('Konfirmasi password tidak cocok', true); return; }

    const btn = document.getElementById('pwSaveBtn');
    btn.disabled = true; btn.textContent = 'Memproses...';
    try {
      const ok = await verifyPassword(oldPw, u.password_hash);
      if (!ok) { showToast('Password lama salah', true); return; }
      const newHash = await hashPassword(newPw);
      await SB.anggota.update(u.id, { password_hash: newHash });
      u.password_hash = newHash;
      App.user.password_hash = newHash;
      saveSession(App.user);
      document.getElementById('pwOld').value = '';
      document.getElementById('pwNew').value = '';
      document.getElementById('pwConfirm').value = '';
      showToast('Password berhasil diganti');
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
    } finally {
      btn.disabled = false; btn.textContent = 'Simpan Password Baru';
    }
  };

  window.SET_saveWa = async () => {
    const v = document.getElementById('waInput').value.trim();
    await SB.settings.set('admin_whatsapp', v);
    showToast('Nomor WhatsApp disimpan');
  };

  window.SET_resetData = async () => {
    const checks = {
      kbm: document.getElementById('rst_kbm')?.checked,
      mus: document.getElementById('rst_mus')?.checked,
      penilaian: document.getElementById('rst_penilaian')?.checked,
      mtms: document.getElementById('rst_mtms')?.checked,
      sarpras: document.getElementById('rst_sarpras')?.checked,
      proker: document.getElementById('rst_proker')?.checked,
      santri: document.getElementById('rst_santri')?.checked,
    };
    const selected = Object.entries(checks).filter(([,v]) => v).map(([k]) => k);
    if (!selected.length) { showToast('Pilih minimal 1 kategori', true); return; }

    const labels = {
      kbm: 'KBM (Absensi, Jurnal, Pertemuan, Progress)',
      mus: 'Musyawarah (Notulensi, Peserta, Absensi)',
      penilaian: 'Penilaian Generus',
      mtms: 'Data MT/MS',
      sarpras: 'Data Sarpras',
      proker: 'Program Kerja (Program, Laporan, Sumber Dana)',
      santri: 'Data Santri & Kelas (termasuk Raport Caberawit)',
    };

    const step1 = confirm(
      '⚠️ PERINGATAN!\n\nAnda akan menghapus:\n' +
      selected.map(k => '• ' + labels[k]).join('\n') +
      '\n\nData ini TIDAK BISA dikembalikan!\nLanjutkan?'
    );
    if (!step1) return;

    const step2 = prompt('Ketik HAPUS untuk konfirmasi:');
    if (step2 !== 'HAPUS') { showToast('Reset dibatalkan', true); return; }

    const btn = document.getElementById('resetBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Menghapus...'; }
    const DEL = (tbl) => sbFetch(tbl + '?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });

    try {
      showToast('Menghapus data...');
      let count = 0;

      if (checks.kbm) {
        await DEL('jurnal_materi'); await DEL('jurnal');
        await DEL('absensi'); await DEL('pertemuan'); await DEL('progress');
        count += 5;
      }
      if (checks.mus) {
        await DEL('musyawarah_absensi'); await DEL('musyawarah_peserta'); await DEL('musyawarah');
        count += 3;
      }
      if (checks.penilaian) {
        await DEL('penilaian');
        count += 1;
      }
      if (checks.mtms) {
        await DEL('mt_ms');
        count += 1;
      }
      if (checks.sarpras) {
        await DEL('sarpras');
        count += 1;
      }
      if (checks.proker) {
        await DEL('laporan_kegiatan'); await DEL('program_kerja'); await DEL('sumber_dana');
        count += 3;
      }
      if (checks.santri) {
        await DEL('raport_nilai'); await DEL('raport_catatan');
        await DEL('santri'); await DEL('kelas');
        count += 4;
      }

      App.cache = {};
      showToast(`✓ ${count} tabel berhasil di-reset`);
      setTimeout(() => renderSettings(), 1000);
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error('Reset error:', e);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Hapus Data Terpilih'; }
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
      // Juga ambil dapukan dari semua desa — data lama tersimpan pakai NAMA desa,
      // data baru (lewat Data Pengurus) pakai KODE desa (D1-D6). Cari dua-duanya.
      const DESA_NAMA_MAP = await loadDesaMap();
      const desaResults = await Promise.all(Object.entries(DESA_NAMA_MAP).flatMap(([kode, nama]) => [
        SB.musPeserta.getByDesa(kode), SB.musPeserta.getByDesa(nama),
      ]));
      const seenDesa = new Set();
      desaResults.filter(Boolean).flat().forEach(p => {
        if (seenDesa.has(p.id)) return;
        seenDesa.add(p.id);
        allPesertaForKonfig.push(p);
      });
    } else if (levelMus === 'pjp_desa') {
      // Hanya desa sendiri + kelompok di desa sendiri
      const myDesaId = desaId || u.desa_id;
      if (myDesaId) {
        const DESA_NAMA_MAP_K = await loadDesaMap();
        const desaNama = DESA_NAMA_MAP_K[myDesaId] || myDesaId;
        const dp1 = await SB.musPeserta.getByDesa(myDesaId) || [];
        const dp2 = desaNama !== myDesaId ? await SB.musPeserta.getByDesa(desaNama) || [] : [];
        allPesertaForKonfig = [...dp1, ...dp2];
        if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
        const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === myDesaId);
        await Promise.all(klpDesa.map(async klp => {
          const kp = await SB.musPeserta.getByKelompok(klp.id) || [];
          allPesertaForKonfig = [...allPesertaForKonfig, ...kp];
        }));
      }
    } else {
      // guru_generus / unsur_5 — hanya kelompok sendiri (cepat)
      if (kelompokId) {
        allPesertaForKonfig = await SB.musPeserta.getByKelompok(kelompokId) || [];
      } else {
        // Admin — load sampel 2 kelompok saja untuk daftar dapukan
        if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
        const sampleResults = await Promise.all((App.cache.kelompok||[]).slice(0, 2).map(klp => SB.musPeserta.getByKelompok(klp.id)));
        sampleResults.filter(Boolean).forEach(kp => { allPesertaForKonfig = [...allPesertaForKonfig, ...kp]; });
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
    const checkboxes = options.map((d, idx) => `
      <label id="konfigChk_${idx}" data-dapukan="${escHtml(d)}" style="display:flex; align-items:center; gap:8px; padding:8px 12px; border:1.5px solid ${selectedDapukan.has(d)?'var(--green)':'var(--line)'}; border-radius:8px; cursor:pointer; background:${selectedDapukan.has(d)?'var(--green-soft)':'var(--white)'}; transition:all .15s;" onclick="KONFIG_toggle(this)">
        <div class="konfig-check-box" style="width:20px; height:20px; border:2px solid ${selectedDapukan.has(d)?'var(--green)':'var(--line)'}; border-radius:4px; display:flex; align-items:center; justify-content:center; background:${selectedDapukan.has(d)?'var(--green)':'transparent'}; flex-shrink:0;">
          ${selectedDapukan.has(d) ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
        </div>
        <span class="konfig-check-label" style="font-size:13px; font-weight:${selectedDapukan.has(d)?'700':'500'}; color:${selectedDapukan.has(d)?'var(--green)':'var(--ink)'};">${escHtml(d)}</span>
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
        ${levelMus === 'ppg_daerah' ? `<button type="button" class="btn btn-outline btn-sm" style="margin-bottom:10px;" onclick="KONFIG_tambahDariDesa()">+ Tambah Dapukan dari Level Desa (Kyai, PJP KBM, PJP SarPras)</button>` : ''}
        <div id="konfigDipilihCount" style="font-size:12px; font-weight:700; color:var(--ink-soft); margin-bottom:8px;">Dipilih: ${selectedDapukan.size} dapukan</div>
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

  // Toggle SATU checkbox aja langsung di DOM-nya (gak render ulang seluruh modal) —
  // biar gak kerasa "kayak refresh" tiap kali centang. data-dapukan dibaca dari elemen-nya
  // sendiri (via `this`, bukan ditempel ke string onclick) — aman dari nama dapukan yang
  // ada tanda kutipnya (mis. "Tim Dhu'afa"), yg sebelumnya bikin tombolnya gak bisa diklik.
  window.KONFIG_toggle = (el) => {
    const dapukan = el.dataset.dapukan;
    if (selectedDapukan.has(dapukan)) selectedDapukan.delete(dapukan);
    else selectedDapukan.add(dapukan);
    const aktif = selectedDapukan.has(dapukan);

    el.style.borderColor = aktif ? 'var(--green)' : 'var(--line)';
    el.style.background = aktif ? 'var(--green-soft)' : 'var(--white)';
    const box = el.querySelector('.konfig-check-box');
    box.style.borderColor = aktif ? 'var(--green)' : 'var(--line)';
    box.style.background = aktif ? 'var(--green)' : 'transparent';
    box.innerHTML = aktif ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>' : '';
    const label = el.querySelector('.konfig-check-label');
    label.style.fontWeight = aktif ? '700' : '500';
    label.style.color = aktif ? 'var(--green)' : 'var(--ink)';

    const counter = document.getElementById('konfigDipilihCount');
    if (counter) counter.textContent = `Dipilih: ${selectedDapukan.size} dapukan`;
  };

  window.KONFIG_tambahDariDesa = () => {
    const targetDapukan = ['Kyai', 'PJP KBM', 'PJP SarPras'];
    const belumAda = targetDapukan.filter(d => !options.includes(d));
    targetDapukan.forEach(d => selectedDapukan.add(d));
    renderKonfig();
    if (belumAda.length) {
      showToast(`Ditambahkan ke pilihan ✓ (tapi ${belumAda.join(', ')} belum ada orangnya di Data Pengurus desa manapun, jadi belum muncul di daftar/absensi sampai diisi)`, true);
    } else {
      showToast('Kyai, PJP KBM, PJP SarPras ditambahkan ke pilihan ✓');
    }
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

  // Juga load kelas gabungan desa
  if (!App.cache.kelompok) App.cache.kelompok = await SB.kelompok.getAll();
  const myKlpObj = (App.cache.kelompok||[]).find(k => k.id === myKelompokId);
  let kelasGabungan = [];
  let progDataGabungan = [];
  if (myKlpObj?.desa_id) {
    kelasGabungan = (await SB.kelas.getByDesa(myKlpObj.desa_id)) || [];
    // Load progress untuk kelas gabungan (kelompok_id = kelompok pertama di desa)
    const klpDesaFirst = (App.cache.kelompok||[]).find(k => k.desa_id === myKlpObj.desa_id);
    if (klpDesaFirst) {
      progDataGabungan = await SB.progress.getByKelompok(klpDesaFirst.id, getTahunAjaran()) || [];
    }
  }

  const kelasList = sortKelas([...kelasListRaw, ...kelasGabungan]);

  // Load pertemuan, santri untuk semua kelas (masih ringan, 1 request per kelas)
  const kelasMeta = await Promise.all(kelasList.map(async k => {
    const [pertemuanList, santriListAll] = await Promise.all([
      SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
      SB.santri.getByKelas(k.id),
    ]);
    // Untuk kelas gabungan: filter santri hanya dari kelompok ini
    const santriList = k.desa_id
      ? santriListAll.filter(s => s.kelompok_asal_id === myKelompokId)
      : santriListAll;
    return { k, pertemuanList, santriList };
  }));

  // Satu kali fetch absensi untuk SEMUA pertemuan sekaligus (bukan satu per satu per pertemuan)
  const allPertemuanIds = kelasMeta.flatMap(m => m.pertemuanList.map(p => p.id));
  const allAbsensi = await SB.absensi.getByPertemuanIds(allPertemuanIds);
  const absensiByPertemuan = {};
  allAbsensi.forEach(a => {
    if (!absensiByPertemuan[a.pertemuan_id]) absensiByPertemuan[a.pertemuan_id] = [];
    absensiByPertemuan[a.pertemuan_id].push(a);
  });

  // Susun kelasData dari data yang sudah ada di memori — tidak ada fetch lagi di sini
  const kelasData = {};
  kelasMeta.forEach(({ k, pertemuanList, santriList }) => {
    const santriIds = new Set(santriList.map(s => s.id));
    const absensiAll = {};
    pertemuanList.forEach(p => {
      const absenAll = absensiByPertemuan[p.id] || [];
      absensiAll[p.id] = k.desa_id ? absenAll.filter(a => santriIds.has(a.santri_id)) : absenAll;
    });
    kelasData[k.id] = { kelas: k, pertemuanList, santriList, absensiAll, _isGabungan: !!k.desa_id };
  });

  const allProgData = [...progData, ...progDataGabungan];
  const progressSet = new Set(allProgData.map(p => p.materi_id + '|' + p.bulan));
  const allMonths = [...SEM1_MONTHS, ...SEM2_MONTHS];
  const nowMonth = currentMonthName();

  // State filter
  let selectedBulan = nowMonth;
  let viewMode = 'kelas'; // 'kelas' atau 'tingkatan'

  // Variabel closure untuk diakses fungsi PDF
  let lastKelasStats = [], lastTotalSantriAll = 0, lastTotalPertemuanAll = 0;
  let lastAvgHadir = null, lastAvgMateri = null, lastKelompokNama = '';

  function renderDashboard() {
    window._rekapKelasData = {}; // reset tiap render — nyimpen data per-kelas buat tombol Layar Penuh
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
      const namaKelas = (ks.kelas.nama_kelas || ks.kelas.jenjang) + (ks._isGabungan ? ' 🏘️' : '');

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

      const kUid = 'kk_' + ks.kelas.id;
      const daftarMateri = ks.materiTarget.map(m => ({ bab: m.bab, babTitle: m.bab_title, sub: m.sub, subTitle: m.sub_title, poin: m.poin, poinTitle: m.poin_title, selesai: progressSet.has(m.id+'|'+selectedBulan) }));
      window._rekapKelasData[kUid] = {
        nama: namaKelas, kelompokNama: lastKelompokNama || myKlpObj?.nama || '',
        santri: ks.totalSantri, pctHadir: ks.pctHadir, pctMateri: ks.pctMateri,
        materiCapai: ks.materiTercapai.length, materiTarget: ks.materiTarget.length, daftarMateri,
      };

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
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-outline btn-sm" data-kuid="${kUid}" onclick="REKAP_fullscreenKelas(this)">⛶ Layar Penuh</button>
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

        <!-- Detail materi per topik (collapsible) -->
        ${daftarMateri.length > 0 ? `
        <details>
          <summary style="cursor:pointer; font-size:13px; font-weight:700; color:var(--green); padding:8px 0; border-top:1px solid var(--line); list-style:none; display:flex; align-items:center; justify-content:space-between;">
            <span>📋 Detail Materi (${ks.materiTercapai.length}/${ks.materiTarget.length})</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <div style="margin-top:10px; font-size:12.5px;">
            ${daftarMateri.map(materiItemCompactHtml).join('')}
          </div>
        </details>` : ''}

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
  window.REKAP_fullscreenKelas = (btn) => {
    const k = window._rekapKelasData[btn.dataset.kuid];
    if (k) showFullscreenKelas(k);
  };

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
        const namaKelas = (ks.kelas.nama_kelas || ks.kelas.jenjang) + (ks._isGabungan ? ' (Gabungan)' : '');
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

  const myDesaNama = App.cache.rekapDesaId || null;
  const DESA_NAMA_MAP = await loadDesaMap();
  const myDesaId = u.desa_id || null;
  const desaFilterNama = myDesaNama || DESA_NAMA_MAP[myDesaId] || myDesaId;
  const kelompokDesa = (App.cache.kelompok||[]).filter(k =>
    (k.desa?.nama || k.desa_id) === desaFilterNama || k.desa_id === myDesaId
  );

  main.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner dark"></div><div style="margin-top:12px; color:var(--ink-soft); font-size:13px;">Memuat data rekap desa...</div></div>';

  // Load semua data paralel
  const allSantri = App.cache.allSantri || (App.cache.allSantri = await SB.santri.getAll());
  const nowMonth = currentMonthName();
  const semNow = SEM1_MONTHS.includes(nowMonth) ? SEM1_MONTHS : SEM2_MONTHS;
  let selectedBulan = nowMonth;

  // Tahap 1: satu kali fetch KELAS + PROGRESS untuk semua kelompok se-desa sekaligus
  const desaKlpIds = kelompokDesa.map(k => k.id);
  const [kelasRawDesa, progressRawDesa] = await Promise.all([
    SB.kelas.getByKelompokIds(desaKlpIds),
    SB.progress.getByKelompokIds(desaKlpIds, getTahunAjaran()),
  ]);
  const kelasByKlpDesa = {};
  kelasRawDesa.forEach(k => { (kelasByKlpDesa[k.kelompok_id] ||= []).push(k); });
  const progressByKlpDesa = {};
  progressRawDesa.forEach(p => { (progressByKlpDesa[p.kelompok_id] ||= []).push(p); });

  // Tahap 2: satu kali fetch PERTEMUAN + SANTRI untuk semua kelas se-desa sekaligus
  const desaKelasIds = kelasRawDesa.map(k => k.id);
  const [pertemuanRawDesa, santriKelasRawDesa] = await Promise.all([
    SB.pertemuan.getByKelasIds(desaKelasIds, getTahunAjaran()),
    SB.santri.getByKelasIds(desaKelasIds),
  ]);
  const pertemuanByKelasDesa = {};
  pertemuanRawDesa.forEach(p => { (pertemuanByKelasDesa[p.kelas_id] ||= []).push(p); });
  const santriByKelasDesa = {};
  santriKelasRawDesa.forEach(s => { (santriByKelasDesa[s.kelas_id] ||= []).push(s); });

  // Tahap 3: satu kali fetch absensi untuk SEMUA pertemuan se-desa
  const allAbsensiDesa = await SB.absensi.getByPertemuanIds(pertemuanRawDesa.map(p => p.id));
  const absensiByPertemuanDesa = {};
  allAbsensiDesa.forEach(a => { (absensiByPertemuanDesa[a.pertemuan_id] ||= []).push(a); });

  // Tahap 4: susun dari memori — tidak ada fetch lagi
  const kelompokMeta = kelompokDesa.map(klp => {
    const kelasList = sortKelas(kelasByKlpDesa[klp.id] || []);
    const progData = progressByKlpDesa[klp.id] || [];
    const progressSet = new Set(progData.map(p => p.materi_id + '|' + p.bulan));
    const kelasMeta = kelasList.map(k => ({
      k,
      pertemuanList: pertemuanByKelasDesa[k.id] || [],
      santriKelas: santriByKelasDesa[k.id] || [],
    }));
    return { klp, kelasList, kelasMeta, progressSet };
  });

  // Susun kelompokData dari data yang sudah ada di memori
  const kelompokData = {};
  kelompokMeta.forEach(({ klp, kelasList, kelasMeta, progressSet }) => {
    const kelasData = {};
    kelasMeta.forEach(({ k, pertemuanList, santriKelas }) => {
      const absensiAll = {};
      pertemuanList.forEach(p => { absensiAll[p.id] = absensiByPertemuanDesa[p.id] || []; });
      kelasData[k.id] = { kelas: k, pertemuanList, santriKelas, absensiAll };
    });
    kelompokData[klp.id] = { kelompok: klp, kelasList, kelasData, progressSet };
  });

  // Load kelas gabungan desa
  const desaIdForGabungan = myDesaId || Object.keys(DESA_NAMA_MAP).find(k => DESA_NAMA_MAP[k] === desaFilterNama);
  let kelasGabunganDesa = [];
  const gabunganData = {};
  if (desaIdForGabungan) {
    kelasGabunganDesa = sortKelas(await SB.kelas.getByDesa(desaIdForGabungan) || []);
    const gabunganMeta = await Promise.all(kelasGabunganDesa.map(async k => {
      const [pertemuanList, santriAll] = await Promise.all([
        SB.pertemuan.getByKelas(k.id, getTahunAjaran()),
        SB.santri.getByKelas(k.id),
      ]);
      return { k, pertemuanList, santriAll };
    }));
    const allPertemuanIdsGabungan = gabunganMeta.flatMap(m => m.pertemuanList.map(p => p.id));
    const allAbsensiGabungan = await SB.absensi.getByPertemuanIds(allPertemuanIdsGabungan);
    const absensiByPertemuanGabungan = {};
    allAbsensiGabungan.forEach(a => {
      if (!absensiByPertemuanGabungan[a.pertemuan_id]) absensiByPertemuanGabungan[a.pertemuan_id] = [];
      absensiByPertemuanGabungan[a.pertemuan_id].push(a);
    });
    gabunganMeta.forEach(({ k, pertemuanList, santriAll }) => {
      const absensiAll = {};
      pertemuanList.forEach(p => { absensiAll[p.id] = absensiByPertemuanGabungan[p.id] || []; });
      // Group santri by kelompok_asal_id
      const santriByKlp = {};
      santriAll.forEach(s => {
        const kid = s.kelompok_asal_id || 'unknown';
        if (!santriByKlp[kid]) santriByKlp[kid] = [];
        santriByKlp[kid].push(s);
      });
      gabunganData[k.id] = { kelas: k, pertemuanList, santriAll, santriByKlp, absensiAll };
    });
  }

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
      const daftarMateri = materiKelas.map(r => ({ bab: r.bab, babTitle: r.bab_title, sub: r.sub, subTitle: r.sub_title, poin: r.poin, poinTitle: r.poin_title, selesai: d.progressSet.has(r.id+'|'+bulan) }));
      const kMC = daftarMateri.filter(x => x.selesai).length;
      materiTarget += kMT;
      materiTercapai += kMC;
      perKelas.push({
        nama: k.nama_kelas || k.jenjang,
        santri: kd.santriKelas.length,
        pertemuan: perBulan.length,
        pctHadir: kSlot > 0 ? Math.round(kH/kSlot*100) : null,
        pctMateri: kMT > 0 ? Math.round(kMC/kMT*100) : null,
        materiCapai: kMC, materiTarget: kMT, daftarMateri,
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

    gabunganSectionHtml = buildGabunganSection(selectedBulan);

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

    window._rekapKelasData = {}; // reset — nyimpen data per-kelas buat tombol Layar Penuh
    // Tabel per kelompok (format rekap daerah, detail langsung terbuka)
    const klpRows = klpStats.map(({kelompok:klp, stats:s}, klpIdx) => {
      const kelasRows = (s?.perKelas||[]).map((k, ki) => {
        const kUid = 'rd_' + klpIdx + '_' + ki;
        window._rekapKelasData[kUid] = { nama: k.nama, kelompokNama: klp.nama, santri: k.santri, pctHadir: k.pctHadir, pctMateri: k.pctMateri, materiCapai: k.materiCapai, materiTarget: k.materiTarget, daftarMateri: k.daftarMateri };
        return `
        <tr style="background:var(--green-soft);">
          <td style="padding:4px 10px; font-size:11.5px; color:var(--ink-soft);">↳ ${escHtml(k.nama)}</td>
          <td style="text-align:center; font-size:11px;">${k.santri}</td>
          <td style="text-align:center; font-size:11px;">${k.pertemuan}x</td>
          <td style="padding:4px 10px;">${pctBar(s?.pctHadir!==undefined?k.pctHadir:null, 60)}</td>
          <td style="padding:4px 10px;">${pctBar(k.pctMateri, 60)}</td>
        </tr>
        <tr style="background:var(--green-soft);">
          <td colspan="5" style="padding:0 10px 6px 26px;">
            <div style="display:flex; gap:8px;">
              <button class="btn btn-outline btn-sm" style="font-size:10.5px; padding:3px 8px;" onclick="RD_toggleMateriList(this)">📋 Detail Materi (${k.materiCapai}/${k.materiTarget})</button>
              <button class="btn btn-outline btn-sm" style="font-size:10.5px; padding:3px 8px;" data-kuid="${kUid}" onclick="RD_fullscreenKelas(this)">⛶ Layar Penuh</button>
            </div>
            <div class="rda_materi_list" style="display:none; font-size:11px; padding:6px 10px; background:#fff; border:1px solid var(--line); border-radius:6px; margin-top:4px;">
              ${k.daftarMateri.length ? k.daftarMateri.map(materiItemCompactHtml).join('') : '<span style="color:var(--ink-soft);">Belum ada materi terjadwal bulan ini.</span>'}
            </div>
          </td>
        </tr>`;
      }).join('');

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
            <div style="font-weight:800; font-size:15px; color:#fff;">📍 ${escHtml(desaFilterNama)}</div>
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
          <p style="font-size:14px; font-weight:600; color:#111; margin:4px 0 0;">${escHtml(desaFilterNama)} · ${kelompokDesa.length} kelompok · Bulan ${selectedBulan} · TA ${getTahunAjaran()}</p>
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

      ${kelasGabunganDesa.length ? gabunganSectionHtml : ''}

      ${tabelHtml}
    `;
  }

  // ── Render kelas gabungan section ──
  function buildGabunganSection(bulan) {
    if (!kelasGabunganDesa.length) return '';
    const cards = kelasGabunganDesa.map(k => {
      const gd = gabunganData[k.id];
      if (!gd) return '';
      const perBulan = gd.pertemuanList.filter(p => p.bulan === bulan);
      const totalSantri = gd.santriAll.length;

      // Total stats
      let tH=0, tSlot=0;
      perBulan.forEach(p => {
        const absen = gd.absensiAll[p.id] || [];
        gd.santriAll.forEach(s => {
          const st = absen.find(x => x.santri_id === s.id)?.status || 'A';
          if (st==='H') tH++;
          tSlot++;
        });
      });
      const pctTotal = tSlot > 0 ? Math.round(tH/tSlot*100) : null;

      // Per kelompok breakdown
      const klpBreakdown = kelompokDesa.map(klp => {
        const santriKlp = gd.santriByKlp[klp.id] || [];
        if (!santriKlp.length) return '';
        let kH=0, kSlot=0;
        const santriIds = new Set(santriKlp.map(s=>s.id));
        perBulan.forEach(p => {
          const absen = gd.absensiAll[p.id] || [];
          santriKlp.forEach(s => {
            const st = absen.find(x => x.santri_id === s.id)?.status || 'A';
            if (st==='H') kH++;
            kSlot++;
          });
        });
        const pctK = kSlot > 0 ? Math.round(kH/kSlot*100) : null;
        return `<tr style="background:var(--green-soft);">
          <td style="padding:4px 10px; font-size:11.5px; color:var(--ink-soft);">↳ ${escHtml(klp.nama)}</td>
          <td style="text-align:center; font-size:11px;">${santriKlp.length}</td>
          <td style="text-align:center; font-size:11px;">${perBulan.length}x</td>
          <td style="padding:4px 10px;">${pctBar(pctK)}</td>
        </tr>`;
      }).join('');

      return `
        <tr style="border-bottom:2px solid var(--green-soft);">
          <td style="padding:7px 10px; font-size:13px; font-weight:700; color:var(--green);">🏘️ ${escHtml(k.nama_kelas || k.jenjang)}</td>
          <td style="text-align:center; font-size:12px; font-weight:700;">${totalSantri}</td>
          <td style="text-align:center; font-size:12px; font-weight:700;">${perBulan.length}x</td>
          <td style="padding:6px 10px;">${pctBar(pctTotal)}</td>
        </tr>
        ${klpBreakdown}`;
    }).join('');

    return `<div class="card" style="margin-bottom:14px; padding:0; overflow:hidden;">
      <div style="background:#2a7a4f; padding:10px 16px;">
        <div style="font-weight:800; font-size:14px; color:#fff;">🏘️ Kelas Gabungan</div>
        <div style="font-size:11px; color:rgba(255,255,255,.7);">Kelas yang digabung dari semua kelompok</div>
      </div>
      <div class="table-wrap">
        <table style="width:100%; border-collapse:collapse; min-width:400px;">
          <thead><tr style="background:#2a7a4f;">
            <th style="padding:7px 10px; text-align:left; font-size:11px; color:#fff;">Kelas / Kelompok</th>
            <th style="text-align:center; font-size:11px; color:#fff; padding:7px 4px;">Generus</th>
            <th style="text-align:center; font-size:11px; color:#fff; padding:7px 4px;">Pertemuan</th>
            <th style="font-size:11px; color:#fff; padding:7px 10px;">Kehadiran</th>
          </tr></thead>
          <tbody>${cards}</tbody>
        </table>
      </div>
    </div>`;
  }

  let gabunganSectionHtml = '';

  window.RD_setBulan = (b) => { selectedBulan = b; renderDashboard(); };
  window.RD_gantiDesa = () => { App.cache.rekapDesaId = null; renderRekapDesa(); };
  window.RD_toggleMateriList = (btn) => {
    const list = btn.parentElement.nextElementSibling;
    if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none';
  };
  window.RD_fullscreenKelas = (btn) => {
    const k = window._rekapKelasData[btn.dataset.kuid];
    if (k) showFullscreenKelas(k);
  };

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
      page.drawText((desaFilterNama||'') + '   |   Bulan: ' + selectedBulan + '   |   Dicetak: ' + new Date().toLocaleDateString('id-ID'),
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

  const allSantri = App.cache.allSantri || (App.cache.allSantri = await SB.santri.getAll());

  // Tahap 1: satu kali fetch KELAS + PROGRESS untuk SEMUA 31 kelompok sekaligus
  const allKlpIds = kelompokList.map(k => k.id);
  const [allKelasRaw, allProgressRaw] = await Promise.all([
    SB.kelas.getByKelompokIds(allKlpIds),
    SB.progress.getByKelompokIds(allKlpIds, getTahunAjaran()),
  ]);
  const kelasByKlp = {};
  allKelasRaw.forEach(k => { (kelasByKlp[k.kelompok_id] ||= []).push(k); });
  const progressByKlp = {};
  allProgressRaw.forEach(p => { (progressByKlp[p.kelompok_id] ||= []).push(p); });

  // Tahap 2: satu kali fetch PERTEMUAN + SANTRI untuk SEMUA kelas se-daerah sekaligus
  const allKelasIds = allKelasRaw.map(k => k.id);
  const [allPertemuanRaw, allSantriKelasRaw] = await Promise.all([
    SB.pertemuan.getByKelasIds(allKelasIds, getTahunAjaran()),
    SB.santri.getByKelasIds(allKelasIds),
  ]);
  const pertemuanByKelas = {};
  allPertemuanRaw.forEach(p => { (pertemuanByKelas[p.kelas_id] ||= []).push(p); });
  const santriByKelas = {};
  allSantriKelasRaw.forEach(s => { (santriByKelas[s.kelas_id] ||= []).push(s); });

  // Tahap 3: satu kali fetch ABSENSI untuk SEMUA pertemuan se-daerah sekaligus
  const allAbsensiDaerah = await SB.absensi.getByPertemuanIds(allPertemuanRaw.map(p => p.id));
  const absensiByPertemuanDaerah = {};
  allAbsensiDaerah.forEach(a => { (absensiByPertemuanDaerah[a.pertemuan_id] ||= []).push(a); });

  // Tahap 4: susun semuanya dari memori — tidak ada fetch lagi sama sekali di bawah ini
  const kelompokMeta = kelompokList.map(klp => {
    const kelasList = sortKelas(kelasByKlp[klp.id] || []);
    const progData = progressByKlp[klp.id] || [];
    const progressSet = new Set(progData.map(p => p.materi_id + '|' + p.bulan));
    const kelasMeta = kelasList.map(k => ({
      k,
      pertemuanList: pertemuanByKelas[k.id] || [],
      santriKelas: santriByKelas[k.id] || [],
    }));
    return { klp, kelasList, kelasMeta, progressSet };
  });

  const kelompokData = {};
  kelompokMeta.forEach(({ klp, kelasList, kelasMeta, progressSet }) => {
    const kelasData = {};
    kelasMeta.forEach(({ k, pertemuanList, santriKelas }) => {
      const absensiAll = {};
      pertemuanList.forEach(p => { absensiAll[p.id] = absensiByPertemuanDaerah[p.id] || []; });
      kelasData[k.id] = { kelas: k, pertemuanList, santriKelas, absensiAll };
    });
    kelompokData[klp.id] = { kelompok: klp, kelasList, kelasData, progressSet };
  });

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
      const daftarMateri = mk.map(r => ({ bab: r.bab, babTitle: r.bab_title, sub: r.sub, subTitle: r.sub_title, poin: r.poin, poinTitle: r.poin_title, selesai: d.progressSet.has(r.id+'|'+bulan) }));
      const kMateriCapai = daftarMateri.filter(x => x.selesai).length;
      materiTarget += kMateriTarget;
      materiTercapai += kMateriCapai;
      perKelas.push({
        nama: k.nama_kelas || k.jenjang,
        pertemuan: perBulan.length,
        santri: kd.santriKelas.length,
        pctHadir: kSlot > 0 ? Math.round(kH/kSlot*100) : null,
        pctMateri: kMateriTarget > 0 ? Math.round(kMateriCapai/kMateriTarget*100) : null,
        materiCapai: kMateriCapai, materiTarget: kMateriTarget, daftarMateri,
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
    window._rdaKelasData = {}; // reset tiap render — nyimpen data per-kelas buat tombol Layar Penuh
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
        const kelasDetail = (s?.perKelas||[]).map((k, ki) => {
          const kUid = uid + '_k' + ki;
          window._rdaKelasData[kUid] = { ...k, kelompokNama: klp.nama, desaNama };
          return `
          <tr class="kd_row" style="display:none; background:var(--green-soft);">
            <td style="padding:4px 10px; font-size:11.5px; color:var(--ink-soft);">↳ ${escHtml(k.nama)}</td>
            <td style="text-align:center; font-size:11px;">${k.santri}</td>
            <td style="text-align:center; font-size:11px;">${k.pertemuan}x</td>
            <td style="padding:4px 10px;">${pctBar(k.pctHadir)}</td>
            <td style="padding:4px 10px;">${pctBar(k.pctMateri)}</td>
          </tr>
          <tr class="kd_row" style="display:none;">
            <td colspan="5" style="padding:0 10px 6px 26px;">
              <div style="display:flex; gap:8px; margin-bottom:4px;">
                <button class="btn btn-outline btn-sm" style="font-size:10.5px; padding:3px 8px;" onclick="event.stopPropagation(); RDA_toggleMateriList(this)">📋 Detail Materi (${k.materiCapai}/${k.materiTarget})</button>
                <button class="btn btn-outline btn-sm" style="font-size:10.5px; padding:3px 8px;" data-kuid="${kUid}" onclick="event.stopPropagation(); RDA_fullscreenKelas(this)">⛶ Layar Penuh</button>
              </div>
              <div class="rda_materi_list" style="display:none; font-size:11px; padding:6px 10px; background:#fff; border:1px solid var(--line); border-radius:6px; margin-bottom:4px;">
                ${k.daftarMateri.length ? k.daftarMateri.map(materiItemCompactHtml).join('') : '<span style="color:var(--ink-soft);">Belum ada materi terjadwal bulan ini.</span>'}
              </div>
            </td>
          </tr>`;
        }).join('');

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
          <h1 class="page-title">Rekap KBM</h1>
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

  window.RDA_toggleMateriList = (btn) => {
    const list = btn.parentElement.nextElementSibling;
    if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none';
  };

  window.RDA_fullscreenKelas = (btn) => {
    const k = window._rdaKelasData[btn.dataset.kuid];
    if (k) showFullscreenKelas(k);
  };

  window.RDA_exitFullscreenKelas = hideFullscreenKelas;

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

  // Hitung suffix otomatis (A, B, C, ...) — cari huruf pertama yang BELUM dipakai,
  // bukan sekadar hitung jumlah kelas yang ada. Kalau cuma dihitung jumlahnya,
  // begitu ada kelas di tengah yang terhapus (misal Caberawit A hilang tapi B-G masih
  // ada), sistem salah kira huruf berikutnya itu H padahal masih ada slot G yang
  // sebenarnya sudah kepakai — ujungnya nabrak nama yang sudah ada dan gagal diam-diam.
  async function getNextSuffix(tipe) {
    const existing = await SB.kelas.getByKelompok(kelompokId) || [];
    const usedLetters = new Set(
      existing.filter(k => (k.nama_kelas||'').startsWith(tipe))
        .map(k => (k.nama_kelas||'').trim().slice(-1).toUpperCase())
    );
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const l of letters) { if (!usedLetters.has(l)) return l; }
    return letters[0];
  }

  // Default jenjang per tipe
  const TIPE_JENJANG = {
    'PAUD': 'PAUD TK',
    'CABERAWIT': 'SD 3',
    'PRA REMAJA': 'SMP 1',
    'REMAJA': 'SMA 1',
    'PRA NIKAH': 'PRA 1',
  };

  let el = document.getElementById('kelasModal');
  if (!el) { el = document.createElement('div'); el.id = 'kelasModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
  el.innerHTML = `<div class="modal">
    <div class="modal-head">
      <h3 class="modal-title">Tambah Kelas</h3>
      <button class="modal-close" onclick="closeModal('kelasModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;">
        <label>Kelas Usia *</label>
        <select id="kelasTipe" onchange="KLS_updatePreview()" style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--radius-sm); font-size:14px; font-weight:700;">
          <option value="PAUD">PAUD</option>
          <option value="CABERAWIT" selected>CABERAWIT</option>
          <option value="PRA REMAJA">PRA REMAJA</option>
          <option value="REMAJA">REMAJA</option>
          <option value="PRA NIKAH">PRA NIKAH</option>
        </select>
      </div>
      <div style="padding:12px 14px; background:var(--green-soft); border-radius:var(--radius-sm); margin-bottom:14px;">
        <div style="font-size:11px; color:var(--ink-soft); margin-bottom:4px;">Nama kelas yang akan dibuat:</div>
        <div id="kelasPreview" style="font-size:20px; font-weight:800; color:var(--green);">CABERAWIT A</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Jenjang Kurikulum</label>
          <select id="kelasJenjang">
            ${JENJANG_ORDER.map(j => `<option>${j}</option>`).join('')}
          </select>
          <div style="font-size:11px; color:var(--ink-soft); margin-top:4px;">Otomatis sesuai kelas usia. Ubah jika perlu.</div>
        </div>
        <div class="form-group">
          <label>Semester</label>
          <select id="kelasSem">
            <option value="1">Semester 1 (Jul – Des)</option>
            <option value="2">Semester 2 (Jan – Jun)</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal('kelasModal')">Batal</button>
      <button class="btn btn-green" id="kelasSaveBtn">Simpan Kelas</button>
    </div>
  </div>`;

  // Update preview dan jenjang saat tipe berubah
  window.KLS_updatePreview = async () => {
    const tipe = document.getElementById('kelasTipe').value;
    const suffix = await getNextSuffix(tipe);
    document.getElementById('kelasPreview').textContent = tipe + ' ' + suffix;
    // Auto set jenjang
    const jenjangDefault = TIPE_JENJANG[tipe] || 'SD 3';
    const jenjangSel = document.getElementById('kelasJenjang');
    for (let i = 0; i < jenjangSel.options.length; i++) {
      if (jenjangSel.options[i].value === jenjangDefault) { jenjangSel.selectedIndex = i; break; }
    }
  };

  // Initial preview
  KLS_updatePreview();

  document.getElementById('kelasSaveBtn').onclick = async () => {
    const tipe = document.getElementById('kelasTipe').value;
    const suffix = await getNextSuffix(tipe);
    const nama_kelas = tipe + ' ' + suffix;
    const jenjang = document.getElementById('kelasJenjang').value;
    const semester = parseInt(document.getElementById('kelasSem').value);
    const btn = document.getElementById('kelasSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await SB.kelas.insert({ kelompok_id: kelompokId, nama_kelas, jenjang, semester });
      showToast('Kelas ' + nama_kelas + ' berhasil ditambahkan');
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

function openAddKelasGabunganModal(desaId, desaNama, onSaved) {
  let el = document.getElementById('kelasGabModal');
  if (!el) { el = document.createElement('div'); el.id = 'kelasGabModal'; el.className = 'modal-overlay'; document.body.appendChild(el); }
  el.innerHTML = `<div class="modal">
    <div class="modal-head">
      <h3 class="modal-title">Buat Kelas Gabungan — ${escHtml(desaNama)}</h3>
      <button class="modal-close" onclick="closeModal('kelasGabModal')">✕</button>
    </div>
    <div class="modal-body">
      <div style="padding:10px 14px; background:var(--green-soft); border-radius:var(--radius-sm); font-size:13px; color:var(--green); margin-bottom:14px;">
        🏘️ Kelas gabungan desa — semua kelompok di ${escHtml(desaNama)} bisa mendaftarkan santrinya ke kelas ini.
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label>Nama Kelas *</label>
        <input id="kelasGabNama" placeholder="contoh: CABERAWIT, PRA REMAJA A">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Jenjang Kurikulum</label>
          <select id="kelasGabJenjang">${JENJANG_ORDER.map(j => `<option>${j}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label>Semester</label>
          <select id="kelasGabSem">
            <option value="1">Semester 1 (Jul – Des)</option>
            <option value="2">Semester 2 (Jan – Jun)</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal('kelasGabModal')">Batal</button>
      <button class="btn btn-green" id="kelasGabSaveBtn">Simpan Kelas Gabungan</button>
    </div>
  </div>`;

  document.getElementById('kelasGabSaveBtn').onclick = async () => {
    const nama_kelas = document.getElementById('kelasGabNama').value.trim().toUpperCase();
    const jenjang = document.getElementById('kelasGabJenjang').value;
    const semester = parseInt(document.getElementById('kelasGabSem').value);
    if (!nama_kelas) { showToast('Nama kelas wajib diisi', true); return; }
    const btn = document.getElementById('kelasGabSaveBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      // Untuk kelompok_id, pakai kelompok pertama di desa (agar valid)
      const klpDesa = (App.cache.kelompok||[]).filter(k => k.desa_id === desaId);
      const klpId = klpDesa.length ? klpDesa[0].id : desaId;
      await SB.kelas.insert({ kelompok_id: klpId, desa_id: desaId, nama_kelas, jenjang, semester });
      showToast('Kelas gabungan berhasil dibuat');
      closeModal('kelasGabModal');
      onSaved();
    } catch(e) {
      showToast('Gagal: ' + e.message, true);
      console.error('Insert kelas gabungan error:', e);
    }
    btn.disabled = false; btn.textContent = 'Simpan Kelas Gabungan';
  };
  openModal('kelasGabModal');
}

function openAddSantriModal(kelasId, existingSantri, onSaved, kelompokAsalId) {
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
          <label>No. HP Generus</label>
          <input type="tel" inputmode="numeric" id="strNoHp" value="${escHtml(s?.no_hp||'')}" placeholder="Kosongkan jika belum punya HP sendiri (misal Caberawit)" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
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
    const no_hp = document.getElementById('strNoHp').value.trim() || null;
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
      no_hp, nis, tingkatan, tingkatan_override
    };

    try {
      if (s) {
        await SB.santri.update(s.id, data);
        App.cache.allSantri = null;
        logActivity('ubah', 'Santri', `Mengubah data generus: ${data.nama}`);
        showToast('Data generus diperbarui');
      } else {
        const insertData = { ...data, kelas_id: kelasId, aktif: true };
        if (kelompokAsalId) insertData.kelompok_asal_id = kelompokAsalId;
        await SB.santri.insert(insertData);
        App.cache.allSantri = null;
        logActivity('tambah', 'Santri', `Menambah generus baru: ${data.nama}`);
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
    App.cache.allSantri = null;
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

  // Init — cek apakah ini link form publik (tanpa login) dulu, baru cek session
  showLoading(true);
  const urlParams = new URLSearchParams(window.location.search);
  const formJenis = urlParams.get('isi');
  const formKlp = urlParams.get('klp');
  const formLevel = urlParams.get('level'); // 'desa' | 'daerah' — kalau ada, override dari klp
  const formDesa = urlParams.get('desa');
  if (formJenis && (formKlp || formLevel)) {
    let scope;
    if (formLevel === 'daerah') scope = { type: 'daerah' };
    else if (formLevel === 'desa') scope = { type: 'desa', id: formDesa };
    else scope = { type: 'kelompok', id: formKlp };
    await renderPublicForm(formJenis, scope);
    showLoading(false);
    return;
  }
  const session = loadSession();
  if (session) {
    App.user = session;
    App.realUser = session; // identitas asli — jangan pernah diubah oleh impersonasi akses lintas
    if (!session.no_hp) showWajibNoHpModal(); else showShell();
  } else {
    showLogin();
  }
  showLoading(false);
});

/* ===== FLATPICKR — kalender modern, otomatis diaktifkan di semua input tanggal ===== */
function initFlatpickr(root) {
  if (!window.flatpickr) return;
  root.querySelectorAll('input[type="date"]:not([data-fp-init])').forEach(el => {
    el.setAttribute('data-fp-init', '1');
    window.flatpickr(el, {
      altInput: true,
      altFormat: 'j F Y',
      dateFormat: 'Y-m-d',
      locale: window.flatpickr.l10ns?.id || undefined,
      allowInput: true,
      disableMobile: true, // tetap pakai kalender custom meski di HP, bukan native
    });
  });
}
const _fpObserver = new MutationObserver(() => {
  initFlatpickr(document.body);
});
document.addEventListener('DOMContentLoaded', () => {
  _fpObserver.observe(document.body, { childList: true, subtree: true });
  initFlatpickr(document.body);
});

/* ===== PWA INSTALL PROMPT (Android/Chrome) ===== */
// iOS/Safari tidak menyediakan API ini sama sekali — di sana tetap manual lewat
// Share > Add to Home Screen, tidak ada cara mempersingkatnya.
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'none';
});

window.INSTALL_now = async () => {
  if (!_deferredInstallPrompt) return;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.disabled = true;
  _deferredInstallPrompt.prompt();
  await _deferredInstallPrompt.userChoice;
  _deferredInstallPrompt = null;
  if (btn) { btn.style.display = 'none'; btn.disabled = false; }
};

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
