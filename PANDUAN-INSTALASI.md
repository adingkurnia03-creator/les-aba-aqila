# Panduan Instalasi — Les Aba Aqila

Aplikasi ini terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Tempat | Berkas |
|---|---|---|
| **Backend** (database + logika + email + PDF) | Google Apps Script | `Kode.gs`, `appsscript.json` (dikirim terpisah, **tidak ada di ZIP ini**) |
| **Frontend** (tampilan) | GitHub Pages | isi ZIP ini |

Pasang **backend dulu**, karena Anda butuh alamat `/exec`-nya untuk frontend.

---

## BAGIAN A — Backend (Google Apps Script)

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `Les Aba Aqila API`.
2. Ganti seluruh isi `Code.gs` dengan isi berkas **`Kode.gs`**. Ubah nama berkas menjadi `Kode`.
3. Buka **Project Settings** (ikon roda gigi) → centang **Show "appsscript.json" manifest file in editor**. Kembali ke Editor, buka `appsscript.json`, ganti isinya dengan berkas **`appsscript.json`** yang dikirim.
4. Pilih fungsi **`setupAppEnvironment`** di menu dropdown → **▶ Run** (jalankan **sekali saja**).
   - Klik *Review permissions* → pilih akun Anda → *Advanced* → *Go to … (unsafe)* → *Allow*.
   - Buka **Execution log**. Catat baris **`🔑 PIN Admin (CATAT SEKARANG…)`**. PIN ini hanya tampil sekali. Lupa PIN? Jalankan `resetPinAdmin`.
   - Cek Google Drive: folder **Les Aba Aqila** (berisi spreadsheet database dan subfolder) sudah terbuat.
5. Jalankan fungsi **`setupTriggers`** sekali (memasang email pengingat, laporan tertunda, dan cadangan mingguan).
6. **Deploy → New deployment** → ikon roda gigi → **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Klik **Deploy**, lalu **salin URL Web App** (berakhiran `/exec`).
7. Uji: tempel URL itu di browser. Harus tampil JSON seperti `{"success":true,...,"message":"API Les Aba Aqila aktif."}`.

**Mengubah kode di kemudian hari:** *Deploy → Manage deployments → ikon pensil → Version: New version → Deploy*. Cara ini **mempertahankan URL yang sama**. Jangan pilih *New deployment* lagi, karena URL-nya berubah dan frontend harus diedit ulang.

---

## BAGIAN B — Frontend (GitHub Pages)

> **Folder kerja Anda = folder hasil ekstrak ZIP ini**, yaitu folder yang **langsung** berisi `index.html`, `css`, dan `js`. Di folder inilah perintah `git init` dijalankan. Jangan masuk lebih dalam dan jangan naik satu level.

### B1. Isi alamat backend (WAJIB sebelum push)
Buka `js/config.js` dengan Notepad dan ganti `ISI_URL_EXEC_DI_SINI` dengan URL `/exec` dari langkah A6:
```js
const GAS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```
Simpan. (Alamat ini memang publik dan aman. Data tetap dilindungi email + PIN.)

### B2. Pasang Git (sekali saja)
- **Windows:** unduh dari <https://git-scm.com/download/win>, install dengan pengaturan bawaan, lalu buka **PowerShell**.
- **Mac:** buka Terminal, ketik `git --version` (macOS akan menawarkan instalasi).
- Cek: `git --version`

### B3. Identitas Git (sekali saja)
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@akun-github-anda.com"
```

### B4. Buat repository di GitHub
Login ke <https://github.com> → tombol **+** → **New repository** → beri nama (mis. `les-aba-aqila`) → pilih **Public** → **jangan** centang README/.gitignore/license → **Create repository**.

### B5. Masuk ke folder dan periksa isinya
Di File Explorer buka folder hasil ekstrak, klik address bar, ketik `powershell`, tekan Enter. Lalu:
```powershell
dir
```
Harus terlihat **`index.html`**, folder **`css`**, dan folder **`js`**. Jika yang terlihat folder lain (mis. `frontend`), Anda satu level terlalu tinggi, jadi masuk dulu ke folder yang berisi `index.html`. **Jangan lanjut sebelum `index.html` terlihat.**

### B6. Push pertama
Jalankan satu per satu:
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
(Ganti `USERNAME` dan `NAMA-REPO`. Ada **titik** di akhir `git add .`.)

Saat diminta *Password*, tempel **Personal Access Token**, bukan password akun. Saat menempel, layar terlihat kosong. Itu normal, lalu tekan Enter. Cara membuat token:
1. <https://github.com/settings/tokens> → **Generate new token (classic)**
2. Centang scope **repo** → **Generate token** → salin (`ghp_…`, hanya tampil sekali).

Alternatif tanpa terminal: **GitHub Desktop** (<https://desktop.github.com>) → *Add Local Repository* → pilih folder → *Publish repository*.

### B7. Aktifkan GitHub Pages
Repo di GitHub → **Settings → Pages** → *Source*: **Deploy from a branch** → *Branch*: **main** · **/ (root)** → **Save**. Tunggu 1–2 menit; muncul alamat `https://USERNAME.github.io/NAMA-REPO/`. Centang **Enforce HTTPS**.

### B8. Update di kemudian hari
Setelah mengedit berkas (mis. `js/config.js`), dari folder yang sama:
```bash
git add .
git commit -m "Update"
git push
```
Jika tampilan lama masih muncul, tekan **Ctrl+Shift+R**.

---

## BAGIAN C — Setelah online

1. Buka alamat GitHub Pages → masuk dengan **email akun Google yang menjalankan setup** + **PIN Admin** dari langkah A4.
2. **Pengaturan → Umum**: isi *Alamat situs aplikasi* dengan alamat GitHub Pages (dipakai tombol "Buka Aplikasi" di email).
3. **Hapus/ganti data contoh** (siswa, guru, dan akun `@example.com`). Email ke alamat `@example.com` otomatis dilewati.
4. **Pengaturan → Pengguna**: buat/ubah akun guru dan wali, lalu **isi PIN** masing-masing (min. 6 karakter) dan berikan secara pribadi. Akun tanpa PIN tidak bisa masuk.
5. Uji per peran: wali tidak melihat siswa lain; guru tidak bisa mengubah pembayaran.

## Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| Layar *"Alamat API belum diatur"* | `js/config.js` belum diisi → isi, `git add . && git commit -m fix && git push` |
| *"Balasan server tidak terbaca"* | Deployment bukan *Anyone*, atau URL bukan `/exec` → deploy ulang sesuai A6 |
| Perubahan kode backend tidak berlaku | Belum *New version* di *Manage deployments* (A7) |
| Halaman 404 di GitHub Pages | `index.html` tidak di root repo → folder yang di-`git init` salah (B5). Di repo GitHub, `index.html` harus terlihat langsung di halaman depan |
| Halaman tanpa warna/tata letak | Folder `css/` atau `js/` tidak ikut ter-push (jangan upload lewat tombol "Upload files" di web GitHub) |
| *"Terlalu banyak percobaan"* saat login | 5 PIN salah → tunggu 15 menit |
| Lupa PIN Admin | Jalankan `resetPinAdmin` di editor Apps Script |
| Respons pertama lambat (±5–10 dtk) | Normal: Apps Script "bangun" dulu |
| Email tidak terkirim | Cek **Pengaturan → Umum → Log email**; kuota Gmail biasa ±100 penerima/hari |
