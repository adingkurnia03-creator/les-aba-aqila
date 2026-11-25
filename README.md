# Les Aba Aqila — Frontend

Frontend statis (HTML/CSS/JS murni) untuk aplikasi monitoring belajar Les Aba Aqila.
Backend berupa REST API di Google Apps Script. Semua komunikasi lewat `fetch()` (lihat `js/api.js`).

```
index.html        halaman tunggal (SPA)
css/style.css     seluruh gaya (tema terang/gelap)
js/config.js      ← satu-satunya berkas yang diedit: isi GAS_URL
js/api.js         pemanggil API (fetch, timeout, penanganan galat)
js/app.js         logika aplikasi
.nojekyll         agar GitHub Pages tidak memproses ulang berkas
```

Cara memasang: lihat **PANDUAN-INSTALASI.md**.
