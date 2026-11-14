# Laporan Audit Database Kitabah v2

- **Dijalankan**: 2026-11-14 03:57:49 UTC
- **Project**: `https://leastktlugjzupeohqag.supabase.co`
- **Mode**: READ-ONLY (hanya `GET`; tidak ada data yang diubah)
- **Tabel diperiksa**: 42 • **total baris**: 130.429

## Ringkasan temuan

| Pemeriksaan | Temuan |
| --- | --- |
| Tabel tidak bisa diakses / tidak ada | 0 |
| Tabel kosong | 4 |
| Jenis duplikat | 1 |
| Relasi yatim (tabel data) | 1 |
| Relasi yatim (tabel log — informatif) | 3 |
| Inkonsistensi | 4 |

## 1. Jumlah baris per tabel

| Tabel | Baris | Kolom |
| --- | ---: | ---: |
| `absensi` | 29.940 | 7 |
| `user_nav_log` | 23.898 | 3 |
| `jurnal_materi` | 17.041 | 5 |
| `activity_log` | 16.074 | 9 |
| `progress` | 8.117 | 7 |
| `pengajian_absensi` | 6.946 | 5 |
| `pertemuan` | 6.670 | 9 |
| `jurnal` | 6.584 | 6 |
| `jamaah` | 3.468 | 16 |
| `form_submissions` | 3.165 | 11 |
| `materi` | 1.552 | 23 |
| `santri` | 1.413 | 15 |
| `jamaah_keluarga` | 1.148 | 6 |
| `musyawarah_peserta` | 1.099 | 13 |
| `musyawarah_absensi` | 661 | 8 |
| `materi_raport` | 646 | 8 |
| `mt_ms` | 372 | 12 |
| `anggota` | 358 | 15 |
| `kelas` | 334 | 6 |
| `sarpras` | 266 | 8 |
| `fgd_bk` | 184 | 9 |
| `pengajian_pertemuan` | 113 | 11 |
| `chat_messages` | 90 | 6 |
| `pengajian_peserta_override` | 62 | 7 |
| `musyawarah` | 38 | 14 |
| `musyawarah_konfigurasi` | 34 | 8 |
| `kelompok` | 31 | 3 |
| `penilaian` | 31 | 11 |
| `program_kerja` | 26 | 12 |
| `guru_sekolah` | 20 | 13 |
| `sub_pengajian` | 14 | 4 |
| `penerobosan_laporan` | 10 | 29 |
| `konfirmasi_pendataan` | 8 | 7 |
| `desa` | 6 | 2 |
| `simpatisan` | 4 | 10 |
| `penerobosan_desa_laporan` | 3 | 19 |
| `proker_evaluasi` | 2 | 6 |
| `settings` | 1 | 2 |
| `laporan_kegiatan` | 0 | — |
| `raport_catatan` | 0 | — |
| `raport_nilai` | 0 | — |
| `sumber_dana` | 0 | — |

## 3. Tabel kosong (0 baris)

`laporan_kegiatan`, `raport_catatan`, `raport_nilai`, `sumber_dana`

## 4. Duplikat

### `santri` — nama santri dalam satu kelas
- 1 grup duplikat, 2 baris terlibat.

| Nilai | Jumlah | Contoh id |
| --- | ---: | --- |
| Aruni Meisya Uswatun Hasanah | NULL | 2 | 30fba708-797d-47c6-8d32-2cb6b8db325f, 4c53e2a6-d9b8-462e-8cc4-c78739798db2 |


## 5. Relasi yatim (FK menunjuk baris induk yang hilang)

### 5a. Perlu tindakan (tabel data)

| Tabel anak | Kolom | Induk | Baris yatim | Nilai hilang (unik) | Contoh nilai |
| --- | --- | --- | ---: | ---: | --- |
| `simpatisan` | `keluarga_dari_id` | `jamaah` | 1 | 1 | ab44eca4-1469-46a5-a5bc-2d9bd202b015 |

Contoh baris (anak -> nilai induk yang tidak ada):

- `simpatisan.keluarga_dari_id`: 83eb46a2-f936-4024-9d78-91db0f039dca -> ab44eca4-1469-46a5-a5bc-2d9bd202b015

### 5b. Informatif (tabel log)

Tabel log menyimpan `user_id` + nama/role secara denormalisasi, jadi kalau akun dihapus, baris log lama
tetap valid secara bisnis dan **tidak** perlu diperbaiki (kecuali Anda ingin membersihkan riwayat).

| Tabel anak | Kolom | Induk | Baris yatim | Nilai hilang (unik) | Contoh nilai |
| --- | --- | --- | ---: | ---: | --- |
| `activity_log` | `user_id` | `anggota` | 100 | 12 | 3ae5b8f9-103e-422c-9fb1-3cddb11b1d9b, 3bfd0fec-a2ec-4c19-a2fd-fbe7fbe17ac5, 1a81d6ad-f56e-4f1a-a3b0-06063920873f, 7c87301a-6b62-4fc1-b561-00b6947db433, e6d1504f-8f51-4403-90b1-7bbb3581869a |
| `chat_messages` | `user_id` | `anggota` | 1 | 1 | a29d8ee2-7e96-4a91-a5c0-0a0044ce3495 |
| `user_nav_log` | `user_id` | `anggota` | 315 | 11 | 1a81d6ad-f56e-4f1a-a3b0-06063920873f, c4ac0600-536d-4fc1-8dac-9e0a0764c698, 3bfd0fec-a2ec-4c19-a2fd-fbe7fbe17ac5, 3ae5b8f9-103e-422c-9fb1-3cddb11b1d9b, a29d8ee2-7e96-4a91-a5c0-0a0044ce3495 |


## 6. Inkonsistensi

| Jenis | Detail | Jumlah |
| --- | --- | ---: |
| nilai wajib kosong (NULL) | santri.kelas_id | 33 |
| santri aktif tanpa kelas | santri.aktif=true & kelas_id NULL | 33 |
| akun approved tanpa desa_id (informatif) | perlu dicek manual | 20 |
| akun desa/desa_view tanpa cakupan wilayah | desa_id & kelompok_id sama-sama NULL → dashboard/scope kosong | 4 |

## 7. Catatan & keterbatasan

- Audit memakai **publishable/anon key** dari `supabase.js`, jadi hanya yang lolos policy RLS yang terlihat. Data yang disembunyikan RLS tidak ikut diperiksa.
- Skema dibaca dari baris pertama tiap tabel; kalau semua baris bernilai `null` di kolom tertentu, kolom itu tetap terhitung (PostgREST selalu mengembalikan daftar kolom).
- `pertemuan` **boleh** punya beberapa baris di tanggal yang sama (ada kolom `pertemuan_ke`; UI menampilkan "ke-N (2× hari itu)"). Karena itu uji duplikatnya memakai `kelas_id + tanggal + pertemuan_ke`.
- Tabel log (`activity_log`, `user_nav_log`, `chat_messages`) sengaja menyimpan nama/role denormalisasi agar riwayat tetap terbaca walau akunnya sudah dihapus.
- Relasi FK yang tidak bisa dipetakan otomatis ke tabel induk (0 kolom) dilewati: —

---

_Dibuat otomatis oleh `scripts/audit-supabase.mjs` (`npm run audit`)._