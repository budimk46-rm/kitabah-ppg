// ============ APP.JS - Kitabah v2 Main Logic ============

// State Aplikasi
let currentUser = null;
let currentKelompokId = null;

// Jalankan saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Event Listener Form Tambah Kelas
  const formKelas = document.getElementById('formTambahKelas');
  if (formKelas) {
    formKelas.addEventListener('submit', handleTambahKelas);
  }

  // Load data awal jika ada kelompok yang terpilih
  const selectKelompok = document.getElementById('selectKelompokFilter');
  if (selectKelompok) {
    selectKelompok.addEventListener('change', (e) => {
      currentKelompokId = e.target.value;
      loadDaftarKelas(currentKelompokId);
    });
  }
}

// ============ MODUL KELOLA KELAS GENERUS ============

/**
 * Memuat dan menampilkan daftar kelas berdasarkan kelompok
 */
async function loadDaftarKelas(kelompokId) {
  const tableBody = document.getElementById('tabelKelasBody');
  if (!tableBody) return;

  if (!kelompokId) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Pilih kelompok terlebih dahulu.</td></tr>';
    return;
  }

  try {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Memuat data...</td></tr>';
    
    // Ambil data kelas dari Supabase
    const listKelas = await SB.kelas.getByKelompok(kelompokId);

    if (!listKelas || listKelas.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada kelas di kelompok ini.</td></tr>';
      return;
    }

    // Render tabel
    tableBody.innerHTML = listKelas.map((kelas, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><strong>${escapeHtml(kelas.nama_kelas)}</strong></td>
        <td><span class="badge bg-info text-dark">${escapeHtml(kelas.jenjang)}</span></td>
        <td class="text-center">Semester ${kelas.semester}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-danger" onclick="handleHapusKelas('${kelas.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Gagal memuat kelas:', err);
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat data: ${err.message}</td></tr>`;
  }
}

/**
 * Menangani penambahan kelas baru (termasuk jenjang PAUD/TK)
 */
async function handleTambahKelas(event) {
  event.preventDefault();

  const kelompokId = document.getElementById('selectKelompokModal') ? document.getElementById('selectKelompokModal').value : currentKelompokId;
  const namaKelas = document.getElementById('inputNamaKelas').value.trim();
  const jenjang = document.getElementById('selectJenjangKelas').value; // Menampung 'PAUD/TK', 'SD 1', dll.
  const semester = parseInt(document.getElementById('selectSemesterKelas').value, 10);

  if (!kelompokId) {
    alert('Pilih kelompok terlebih dahulu!');
    return;
  }

  if (!namaKelas || !jenjang) {
    alert('Mohon lengkapi nama kelas dan pilihan jenjang!');
    return;
  }

  try {
    // Simpan ke database via SB Client
    await SB.kelas.insert({
      kelompok_id: kelompokId,
      nama_kelas: namaKelas,
      jenjang: jenjang, // Pilihan PAUD/TK tersimpan di sini
      semester: semester
    });

    alert(`Kelas "${namaKelas}" (${jenjang}) berhasil ditambahkan!`);
    
    // Reset form & tutup modal jika ada
    document.getElementById('formTambahKelas').reset();
    const modalEl = document.getElementById('modalTambahKelas');
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    // Reload tabel kelas
    loadDaftarKelas(kelompokId);

  } catch (err) {
    console.error('Gagal menambah kelas:', err);
    alert('Gagal menambah kelas: ' + err.message);
  }
}

/**
 * Menangani penghapusan kelas
 */
async function handleHapusKelas(kelasId) {
  if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;

  try {
    await SB.kelas.delete(kelasId);
    alert('Kelas berhasil dihapus.');
    if (currentKelompokId) {
      loadDaftarKelas(currentKelompokId);
    }
  } catch (err) {
    console.error('Gagal menghapus kelas:', err);
    alert('Gagal menghapus kelas: ' + err.message);
  }
}

// Utility: Mencegah XSS Injection
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
