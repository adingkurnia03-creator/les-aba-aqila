/**
 * ============================================================
 * LES ABA AQILA — Frontend (JavaScript.html)
 * SPA statis (GitHub Pages). Semua data lewat fetch() ke GAS REST API (lihat js/api.js).
 * Hak akses dicek ulang di server; sini hanya mengatur tampilan.
 * ============================================================
 */

// ════════════════════════════════════════════════════════
// BAGIAN 1: STATE & UTILITAS
// ════════════════════════════════════════════════════════
const App = { token: null, user: null, config: {}, today: '', page: 'beranda', nav: {}, navId: 0, ref: null, charts: {}, thumbs: {}, state: {} };
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_LES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const tgl = t => { if (!t) return ''; const p = String(t).split('-'); return +p[2] + ' ' + BLN[+p[1] - 1].slice(0, 3) + ' ' + p[0]; };
const hariDari = t => { const p = String(t).split('-').map(Number); return HARI[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()]; };
const tglPanjang = t => hariDari(t) + ', ' + tgl(t);
const blnLabel = (m, y) => BLN[m - 1] + ' ' + y;
const pad = n => (n < 10 ? '0' : '') + n;
const vivo = () => { const id = App.navId; return () => id === App.navId; };

function sapaan() {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';
}
function tambahBulan(val, n) { // val 'YYYY-MM'
  let [y, m] = val.split('-').map(Number); m += n;
  while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; }
  return y + '-' + pad(m);
}
function opsiBulan(n) { // n bulan terakhir (terbaru dulu)
  const now = App.today.slice(0, 7), out = [];
  for (let i = 0; i < n; i++) { const v = tambahBulan(now, -i), [y, m] = v.split('-').map(Number); out.push({ v: v, t: blnLabel(m, y) }); }
  return out;
}

// ════════════════════════════════════════════════════════
// BAGIAN 2: PANGGILAN SERVER
// ════════════════════════════════════════════════════════
async function api(action, payload) {
  const res = await panggilGAS('api', { token: App.token, action: action, data: payload || {} });
  if (res && res.success) return res;
  if (res && res.data && res.data.needLogin) sesiHabis();
  throw new Error((res && res.message) || 'Permintaan gagal.');
}
function sesiHabis() {
  App.token = null;
  try { sessionStorage.removeItem('laa_token'); } catch (e) { /* abaikan */ }
  tampilLogin('Sesi berakhir. Silakan masuk kembali.');
}

// ════════════════════════════════════════════════════════
// BAGIAN 3: TEMA, TOAST, MODAL
// ════════════════════════════════════════════════════════
function terapkanTema(t) {
  document.documentElement.setAttribute('data-theme', t);
  const b = $('#btnTema i'); if (b) b.className = 'bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars');
}
function ubahTema() {
  const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('laa_tema', n); } catch (e) { /* abaikan */ }
  terapkanTema(n);
  if (!$('#appShell').classList.contains('d-none')) navigateTo(App.page, App.nav); // gambar ulang grafik
}
function toast(pesan, tipe) {
  const el = $('#appToast'); tipe = tipe || 'info';
  el.className = 'toast app-toast t-' + tipe;
  $('#toastIkon').className = 'bi ' + (tipe === 'ok' ? 'bi-check-circle-fill' : tipe === 'err' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill');
  $('#toastPesan').textContent = pesan;
  bootstrap.Toast.getOrCreateInstance(el, { delay: tipe === 'err' ? 6000 : 3500 }).show();
}
const modalShow = id => bootstrap.Modal.getOrCreateInstance($('#' + id)).show();
const modalHide = id => bootstrap.Modal.getOrCreateInstance($('#' + id)).hide();

let formHandler = null;
function bukaForm(o) {
  $('#formJudul').textContent = o.judul;
  $('#formBody').innerHTML = o.html;
  $('#formSimpan').textContent = o.simpan || 'Simpan';
  $('#formModalForm').classList.remove('was-validated');
  formHandler = o.onSubmit;
  modalShow('modalForm');
  if (o.setup) o.setup($('#formBody'));
}
function dataForm(form) {
  const o = {};
  Array.from(form.elements).forEach(el => {
    if (!el.name) return;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else if (el.type !== 'file') o[el.name] = el.value;
  });
  return o;
}
function konfirmasi(pesan, judul) {
  return new Promise(resolve => {
    $('#konfJudul').textContent = judul || 'Konfirmasi';
    $('#konfPesan').textContent = pesan;
    let ya = false;
    $('#konfYa').onclick = () => { ya = true; modalHide('modalKonfirmasi'); };
    $('#modalKonfirmasi').addEventListener('hidden.bs.modal', () => resolve(ya), { once: true });
    modalShow('modalKonfirmasi');
  });
}
async function denganLoading(btn, fn) {
  if (!btn) return fn();
  const html = btn.innerHTML; btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>Memproses…</span>';
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}

// ════════════════════════════════════════════════════════
// BAGIAN 4: KOMPONEN TAMPILAN
// ════════════════════════════════════════════════════════
function fld(o) {
  const id = 'f_' + o.name, v = o.value == null ? '' : o.value;
  if (o.type === 'checkbox') {
    return '<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="' + id + '" name="' + o.name + '"' + (v ? ' checked' : '') + '><label class="form-check-label" for="' + id + '">' + esc(o.label) + '</label>' + (o.help ? '<div class="form-text">' + esc(o.help) + '</div>' : '') + '</div>';
  }
  let inp;
  if (o.type === 'select') {
    inp = '<select class="form-select" id="' + id + '" name="' + o.name + '"' + (o.req ? ' required' : '') + '>' + o.opts.map(x => '<option value="' + esc(x.v) + '"' + (String(x.v) === String(v) ? ' selected' : '') + '>' + esc(x.t) + '</option>').join('') + '</select>';
  } else if (o.type === 'textarea') {
    inp = '<textarea class="form-control" id="' + id + '" name="' + o.name + '" rows="3" maxlength="' + (o.max || 1000) + '"' + (o.req ? ' required' : '') + '>' + esc(v) + '</textarea>';
  } else {
    inp = '<input class="form-control" type="' + (o.type || 'text') + '" id="' + id + '" name="' + o.name + '" value="' + esc(v) + '"' + (o.req ? ' required' : '') + (o.list ? ' list="' + o.list + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' ' + (o.attrs || '') + '>';
  }
  return '<div class="mb-3"><label class="form-label" for="' + id + '">' + esc(o.label) + (o.req ? ' <span class="text-danger" aria-hidden="true">*</span>' : '') + '</label>' + inp + (o.help ? '<div class="form-text">' + esc(o.help) + '</div>' : '') + '</div>';
}
const chipStatus = s => '<span class="chip chip-' + String(s).toLowerCase() + '">' + (s === 'Hadir' ? '<i class="bi bi-check2"></i>' : '') + esc(s) + '</span>';
const chipLunas = l => l ? '<span class="chip chip-lunas"><i class="bi bi-check-circle"></i>Lunas <b>✔</b></span>' : '<span class="chip chip-belum"><i class="bi bi-x-circle"></i>Belum lunas</span>';
const kosong = (ikon, teks) => '<div class="empty"><i class="bi bi-' + ikon + '"></i><div>' + esc(teks) + '</div></div>';
const skeleton = () => '<div class="skeleton mb-3" style="height:150px"></div><div class="skeleton mb-3" style="height:110px"></div><div class="skeleton" style="height:110px"></div>';
const errorBox = m => '<div class="card-app card-pad text-center"><i class="bi bi-exclamation-triangle fs-2 text-danger"></i><p class="mt-2 mb-3">' + esc(m) + '</p><button class="btn btn-pill btn-tonal" data-act="muatHalaman">Coba lagi</button></div>';

function ring(persen, size, stroke) {
  size = size || 150; stroke = stroke || 14;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, persen)) / 100), m = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Kehadiran ' + persen + ' persen"><circle cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke="var(--sky)" stroke-width="' + stroke + '"/><circle cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke="var(--primary)" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '"/></svg>';
}
function ikonMapel(m) {
  const s = String(m).toLowerCase();
  return s.includes('mat') ? 'calculator' : s.includes('indo') ? 'book' : s.includes('ingg') ? 'translate' : s.includes('ipa') || s.includes('sains') ? 'beaker' : s.includes('ips') ? 'globe-asia-australia' : 'journal-text';
}
function ilustrasi() {
  return '<svg width="200" height="170" viewBox="0 0 200 170" role="img" aria-label="Ilustrasi buku, pensil, dan bintang"><circle cx="100" cy="88" r="72" fill="var(--surface)" opacity=".7"/><rect x="48" y="62" width="104" height="72" rx="10" fill="#0058bc"/><rect x="56" y="70" width="88" height="56" rx="6" fill="#ffffff"/><path d="M100 70v56" stroke="#bfdbfe" stroke-width="3"/><path d="M66 84h26M66 96h26M66 108h20M108 84h26M108 96h26M108 108h16" stroke="#93c5fd" stroke-width="4" stroke-linecap="round"/><path d="M150 40l22 22-8 26-26-8z" fill="#f59e0b" transform="rotate(18 150 60)"/><path d="M40 40l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#a855f7"/><path d="M162 112l4 8 9 1-6 6 2 9-9-5-8 5 2-9-6-6 9-1z" fill="#22c55e"/></svg>';
}
async function getRef() { if (!App.ref) App.ref = (await api('ref')).data; return App.ref; }
const opsiSiswa = (list, semua) => (semua ? [{ v: '', t: semua }] : []).concat(list.map(s => ({ v: s.id_siswa, t: s.nama + (s.kelas ? ' — ' + s.kelas : '') })));
const adalahStaf = () => App.user.peran !== 'Wali';

// Foto: dimuat malas (lazy) lewat server agar Drive tidak perlu dibagikan publik
async function fotoSrc(id, ukuran) {
  const k = id + ':' + ukuran;
  if (App.thumbs[k]) return App.thumbs[k];
  const r = await api('fotoData', { id_foto: id, ukuran: ukuran });
  return (App.thumbs[k] = 'data:' + r.data.mime + ';base64,' + r.data.base64);
}
async function muatFotoLazy() {
  const el = $$('[data-foto-id]').filter(e => !e.dataset.done);
  const ok = vivo();
  let i = 0;
  const kerja = async () => {
    while (i < el.length && ok()) {
      const e = el[i++]; e.dataset.done = '1';
      try { const src = await fotoSrc(e.dataset.fotoId, 'kecil'); if (ok()) e.innerHTML = '<img src="' + src + '" alt="' + esc(e.dataset.alt || 'Foto kegiatan') + '" loading="lazy">'; }
      catch (err) { e.innerHTML = '<i class="bi bi-image fs-3"></i>'; }
    }
  };
  await Promise.all([kerja(), kerja()]);
}
function buatChart(id, cfg) {
  const el = document.getElementById(id); if (!el || typeof Chart === 'undefined') return;
  if (App.charts[id]) App.charts[id].destroy();
  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
  Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-2').trim() || '#475569';
  App.charts[id] = new Chart(el, cfg);
}
function hancurkanChart() { Object.keys(App.charts).forEach(k => { try { App.charts[k].destroy(); } catch (e) { /* abaikan */ } }); App.charts = {}; }
function b64ToBlob(b64, mime) { const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime }); }
function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function kompresGambar(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const sk = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * sk), h = Math.round(img.naturalHeight * sk);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
      let q = 0.82;
      const coba = () => cv.toBlob(b => {
        if (!b) return reject(new Error('Gagal memproses gambar.'));
        if (b.size > 4.5 * 1024 * 1024 && q > 0.4) { q -= 0.15; return coba(); }
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1]);
        fr.onerror = () => reject(new Error('Gagal membaca gambar.'));
        fr.readAsDataURL(b);
      }, 'image/jpeg', q);
      coba();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Berkas bukan gambar yang valid.')); };
    img.src = url;
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 5: BOOT, LOGIN, NAVIGASI
// ════════════════════════════════════════════════════════
const NAV = [
  { id: 'beranda', label: 'Beranda', ikon: 'house-door-fill', peran: ['Admin', 'Guru', 'Wali'] },
  { id: 'absensi', label: 'Absensi', labelWali: 'Kehadiran', ikon: 'journal-check', peran: ['Admin', 'Guru', 'Wali'] },
  { id: 'perkembangan', label: 'Perkembangan', ikon: 'graph-up-arrow', peran: ['Admin', 'Guru', 'Wali'] },
  { id: 'jadwal', label: 'Jadwal & Materi', labelPendek: 'Jadwal', ikon: 'calendar-week', peran: ['Admin', 'Guru', 'Wali'] },
  { id: 'siswa', label: 'Cari Siswa', ikon: 'people', peran: ['Admin', 'Guru'] },
  { id: 'pembayaran', label: 'Pembayaran', ikon: 'cash-coin', peran: ['Admin', 'Guru', 'Wali'] },
  { id: 'galeri', label: 'Galeri Foto', ikon: 'images', peran: ['Admin', 'Guru', 'Wali'] },
  { id: 'laporan', label: 'Laporan PDF', ikon: 'file-earmark-pdf', peran: ['Admin', 'Guru', 'Wali'] },
  { id: 'pengaturan', label: 'Pengaturan', ikon: 'gear', peran: ['Admin', 'Guru'] }
];
const navUser = () => NAV.filter(n => n.peran.includes(App.user.peran)).map(n => Object.assign({}, n, { t: (App.user.peran === 'Wali' && n.labelWali) || n.label }));

function sembunyikanOverlay() { const o = $('#loadingOverlay'); o.style.opacity = '0'; setTimeout(() => { o.style.display = 'none'; }, 300); }
function tampilkan(id) { ['viewLogin', 'viewDenied', 'appShell'].forEach(x => $('#' + x).classList.toggle('d-none', x !== id)); sembunyikanOverlay(); }
function tampilLogin(pesan) { $('#loginPesan').textContent = pesan || 'Masuk dengan email dan PIN yang diberikan Admin.'; tampilkan('viewLogin'); }
function tampilDitolak(pesan) { $('#deniedPesan').textContent = pesan; tampilkan('viewDenied'); }

async function mulai() {
  let res;
  try { res = await panggilGAS('mulai', { token: App.token }); }
  catch (err) { tampilDitolak('Gagal menghubungi server: ' + err.message); return; }
  if (res.success) { App.user = res.data.user; App.config = res.data.config; App.today = res.data.today; masukAplikasi(); }
  else if (res.data && res.data.needLogin) tampilLogin(res.message && res.message.indexOf('Silakan') !== 0 ? res.message : '');
  else tampilDitolak(res.message);
}

function masukAplikasi() {
  const nama = App.config.namaApp || 'Les Aba Aqila';
  document.title = nama;
  $('#brandName').textContent = nama; $('#brandNameMobile').textContent = nama;
  $('#menuNama').textContent = App.user.nama; $('#menuPeran').textContent = App.user.peran === 'Wali' ? 'Wali Murid' : App.user.peran;
  $('#menuKeluar').parentElement.classList.toggle('d-none', !App.token);
  const nv = navUser();
  $('#sidebarNav').innerHTML = nv.map(n => '<button class="nav-item-app" data-act="nav" data-page="' + n.id + '"><i class="bi bi-' + n.ikon + '"></i><span>' + esc(n.t) + '</span></button>').join('');
  const utama = nv.slice(0, 4);
  $('#bottomNav').innerHTML = utama.map(n => '<button class="bn-item" data-act="nav" data-page="' + n.id + '"><i class="bi bi-' + n.ikon + '"></i><span>' + esc(n.labelPendek || n.t) + '</span></button>').join('') +
    '<button class="bn-item" data-act="lainnya" aria-label="Menu lainnya"><i class="bi bi-grid"></i><span>Lainnya</span></button>';
  $('#sheetLainnyaIsi').innerHTML = nv.slice(4).map(n => '<button class="sheet-item" data-act="nav" data-page="' + n.id + '"><i class="bi bi-' + n.ikon + '"></i><span>' + esc(n.t) + '</span></button>').join('') +
    '<button class="sheet-item" data-act="tema"><i class="bi bi-moon-stars"></i><span>Mode gelap</span></button>' +
    (App.token ? '<button class="sheet-item" data-act="keluar"><i class="bi bi-box-arrow-right"></i><span>Keluar</span></button>' : '');
  tampilkan('appShell');
  navigateTo('beranda');
}

async function navigateTo(page, opts) {
  opts = opts || {};
  App.page = page; App.nav = opts; const id = ++App.navId;
  const info = navUser().find(n => n.id === page);
  $$('[data-act="nav"]').forEach(b => { const on = b.dataset.page === page; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#pageTitleMobile').textContent = info ? info.t : '';
  const off = $('#sheetLainnya'); if (off.classList.contains('show')) bootstrap.Offcanvas.getOrCreateInstance(off).hide();
  hancurkanChart();
  const c = $('#app-container'); c.innerHTML = skeleton();
  window.scrollTo(0, 0);
  try { await PAGES[page](opts); }
  catch (e) { if (id === App.navId) c.innerHTML = errorBox(e.message); }
}

// ════════════════════════════════════════════════════════
// BAGIAN 6: HALAMAN — BERANDA
// ════════════════════════════════════════════════════════
async function pgBeranda() {
  const ok = vivo(), d = (await api('beranda')).data;
  if (!ok()) return;
  $('#app-container').innerHTML = d.peran === 'Wali' ? berandaWali(d) : berandaStaf(d);
  muatFotoLazy();
}
function kartuJadwal(j) {
  if (!j) return '<div class="card-app card-pad"><div class="kicker mb-1">Jadwal</div>' + kosong('calendar-x', 'Belum ada jadwal les.') + '</div>';
  const p = j.tanggal.split('-'), mapel = j.items.map(i => i.mapel).join(' & '), a = j.items[0], z = j.items[j.items.length - 1];
  return '<div class="jadwal-hari"><div class="tgl-badge"><small>' + esc(j.hari.slice(0, 3).toUpperCase()) + '</small><strong>' + +p[2] + '</strong></div><div><div class="kicker">' + (j.hariIni ? 'Jadwal hari ini' : 'Jadwal berikutnya') + '</div><div class="fw-bold">' + esc(mapel) + '</div><small class="text-muted">' + esc(a.jam_mulai.replace(':', '.')) + ' - ' + esc(z.jam_selesai.replace(':', '.')) + ' WIB' + (a.guru ? ' • ' + esc(a.guru) : '') + '</small></div></div>';
}
function listAktivitas(a) {
  if (!a.length) return '<div class="card-app card-pad">' + kosong('chat-square-text', 'Belum ada aktivitas.') + '</div>';
  return a.map(x => x.tipe === 'foto'
    ? '<div class="card-app aktivitas-item mb-2"><span class="aktivitas-ico foto"><i class="bi bi-camera"></i></span><div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between gap-2"><strong>' + esc(x.judul) + '</strong><small class="text-muted">' + esc(tglPanjang(x.tanggal)) + '</small></div><div class="text-2 mb-2" style="color:var(--text-2)">' + esc(x.teks) + '</div><button class="foto-thumb rounded-3" style="aspect-ratio:16/9;max-width:420px" data-act="fotoLihat" data-id="' + esc(x.id_foto) + '" data-foto-id="' + esc(x.id_foto) + '" data-alt="' + esc(x.teks) + '" aria-label="Lihat foto"><i class="bi bi-image fs-3"></i></button></div></div>'
    : '<div class="card-app aktivitas-item mb-2"><span class="aktivitas-ico"><i class="bi bi-pencil-square"></i></span><div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between gap-2 flex-wrap"><strong>' + esc(x.judul) + '</strong><small class="text-muted">' + esc(tglPanjang(x.tanggal)) + '</small></div><div style="color:var(--text-2)">' + esc(x.teks || '—') + '</div></div><span class="chip chip-info align-self-start">' + esc(x.nilai) + '</span></div>').join('');
}
function berandaWali(d) {
  const h = d.kehadiran.ringkas, bln = blnLabel(d.bulan, d.tahun);
  const sesi = d.kehadiran.sesi.length ? d.kehadiran.sesi.map(s => '<div class="sesi-dot sesi-' + s.status.toLowerCase() + '"><i class="bi bi-' + (s.status === 'Hadir' ? 'check-lg' : s.status === 'Izin' ? 'envelope' : s.status === 'Sakit' ? 'heart-pulse' : 'x-lg') + '"></i><span>' + esc(s.hari.slice(0, 3)) + '</span></div>').join('') : '<small class="text-muted">Belum ada sesi tercatat.</small>';
  const bay = d.pembayaran;
  const mapel = d.mapel.length ? '<div class="grid-mapel">' + d.mapel.slice(0, 4).map((m, i) => '<div class="card-app mapel-card tone-' + (i % 4) + '"><div class="mapel-top"><span class="mapel-ico"><i class="bi bi-' + ikonMapel(m.mapel) + '"></i></span><div><div class="fw-bold">' + esc(m.mapel) + '</div><small class="text-muted">Terakhir: ' + esc(tgl(m.tanggal)) + '</small></div><span class="nilai-badge">' + esc(m.nilai) + '</span></div><div class="bar" role="progressbar" aria-valuenow="' + esc(m.nilai) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Nilai ' + esc(m.mapel) + '"><span style="width:' + Math.max(0, Math.min(100, m.nilai)) + '%"></span></div><small style="color:var(--text-2)">' + esc(m.catatan || '—') + '</small></div>').join('') + '</div>' : '<div class="card-app card-pad">' + kosong('graph-up', 'Belum ada nilai tercatat.') + '</div>';
  return '<div class="grid-beranda">' +
    '<div class="gb-hero"><section class="hero"><div><span class="chip chip-profil">' + esc(d.siswa.nama) + ' • ' + esc(d.siswa.kelas) + '</span><h1>' + sapaan() + ',<br>Bunda/Ayah &amp; Ananda! 👋</h1><p>Pantau kehadiran, nilai tugas, dan catatan perkembangan belajar dengan mudah dan transparan.</p><div class="hero-actions"><button class="btn btn-pill btn-primary-app" data-act="nav" data-page="laporan"><i class="bi bi-file-earmark-pdf"></i>Lihat Laporan PDF</button><button class="btn btn-pill btn-white" data-act="nav" data-page="absensi"><i class="bi bi-journal-check"></i>Lihat Kehadiran</button></div></div><div class="hero-art">' + ilustrasi() + '</div></section></div>' +
    '<div class="gb-side">' +
      '<section class="card-app card-pad"><div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h6 fw-bold mb-0">Kehadiran Bulan Ini</h2><span class="chip chip-info">' + esc(bln) + '</span></div><div class="ring-wrap">' + ring(h.persen) + '<div class="ring-center"><strong>' + h.persen + '%</strong><small>' + h.hadir + ' / ' + h.total + ' sesi</small></div></div><div class="sesi-row">' + sesi + '</div></section>' +
      '<section class="card-app card-pad"><div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h6 fw-bold mb-0">Status Pembayaran</h2>' + chipLunas(bay.lunas) + '</div><div class="jadwal-hari mb-3"><div class="flex-grow-1"><div class="fw-bold">SPP ' + esc(bln) + '</div><small class="text-muted">' + (bay.lunas ? 'Dicatat oleh ' + esc(bay.oleh) + ' • ' + esc(tgl(bay.tanggal_lunas)) : 'Belum tercatat lunas') + '</small></div><i class="bi bi-cash-coin fs-3" style="color:var(--green-ink)"></i></div><button class="btn btn-pill btn-tonal w-100" data-act="nav" data-page="pembayaran">Lihat Riwayat Pembayaran</button></section>' +
      kartuJadwal(d.jadwal) +
    '</div>' +
    '<div class="gb-main"><div class="section-head"><div><div class="kicker">Ringkasan akademik</div><h2>Perkembangan Mata Pelajaran</h2></div><button class="link-btn" data-act="nav" data-page="perkembangan">Lihat Semua <i class="bi bi-arrow-right"></i></button></div>' + mapel +
    '<div class="section-head"><div><div class="kicker">Catatan guru</div><h2>Aktivitas &amp; Catatan Terbaru</h2></div></div>' + listAktivitas(d.aktivitas) + '</div></div>';
}
function berandaStaf(d) {
  const s = d.stat, guru = d.peran === 'Guru';
  const stat = (ikon, angka, label) => '<div class="card-app stat-card"><span class="ico"><i class="bi bi-' + ikon + '"></i></span><div class="angka">' + angka + '</div><small>' + label + '</small></div>';
  const per = d.perhatian.length ? d.perhatian.map(p => '<div class="d-flex justify-content-between align-items-center py-2 border-bottom"><div><div class="fw-bold">' + esc(p.nama) + '</div><small class="text-muted">' + esc(p.kelas) + '</small></div><span class="chip chip-belum">' + p.persen + '%</span></div>').join('') : '<small class="text-muted">Semua siswa kehadirannya baik bulan ini 🎉</small>';
  return '<div class="grid-beranda">' +
    '<div class="gb-hero"><section class="hero"><div><span class="chip chip-profil">' + (guru ? 'Guru' : 'Admin') + ' • ' + esc(App.user.nama) + '</span><h1>' + sapaan() + ',<br>' + esc(App.user.nama) + '! 👋</h1><p>Isi absensi, catat perkembangan, dan pantau pembayaran dalam beberapa ketukan.</p><div class="hero-actions"><button class="btn btn-pill btn-primary-app" data-act="nav" data-page="absensi"><i class="bi bi-journal-check"></i>Isi Absensi</button><button class="btn btn-pill btn-white" data-act="perkTambah"><i class="bi bi-plus-lg"></i>Tambah Catatan</button></div></div><div class="hero-art">' + ilustrasi() + '</div></section></div>' +
    '<div class="gb-side">' + kartuJadwal(d.jadwal) +
      '<section class="card-app card-pad"><h2 class="h6 fw-bold mb-3">Perlu perhatian <small class="text-muted fw-normal">(hadir &lt; 75% bulan ini)</small></h2>' + per + '</section></div>' +
    '<div class="gb-main"><div class="stat-grid">' +
      stat('people', s.totalSiswa, guru ? 'Siswa bimbingan' : 'Siswa aktif') +
      stat('journal-check', s.absensiTerisi + '/' + s.absensiTotal, 'Absensi hari ini') +
      stat('pencil-square', s.catatanMinggu, 'Catatan 7 hari terakhir') +
      stat('cash-coin', s.belumLunas, 'Belum lunas ' + esc(blnLabel(d.bulan, d.tahun))) + '</div>' +
    '<div class="section-head"><div><div class="kicker">Catatan guru</div><h2>Aktivitas Terbaru</h2></div></div>' + listAktivitas(d.aktivitas) + '</div></div>';
}

// ════════════════════════════════════════════════════════
// BAGIAN 7: HALAMAN — ABSENSI (form + rekap/grafik)
// ════════════════════════════════════════════════════════
const kepalaHalaman = (judul, aksi) => '<div class="page-head"><h1>' + esc(judul) + '</h1><div class="d-flex flex-wrap gap-2 no-print">' + (aksi || '') + '</div></div>';

async function pgAbsensi(opts) {
  const staf = adalahStaf(), tab = opts.tab || (staf ? 'isi' : 'rekap');
  const tabs = staf ? '<div class="seg mb-3" role="tablist"><button class="' + (tab === 'isi' ? 'active' : '') + '" data-act="setTab" data-tab="isi" role="tab">Isi Absensi</button><button class="' + (tab === 'rekap' ? 'active' : '') + '" data-act="setTab" data-tab="rekap" role="tab">Grafik & Rekap</button></div>' : '';
  $('#app-container').innerHTML = kepalaHalaman(staf ? 'Absensi' : 'Kehadiran') + tabs + '<div id="absBody">' + skeleton() + '</div>';
  if (tab === 'isi') await absensiIsi(opts); else await absensiRekap(opts);
}
async function absensiIsi(opts) {
  const ok = vivo(), tanggal = (opts && opts.tanggal) || App.today;
  const d = (await api('absensiForm', { tanggal: tanggal })).data;
  if (!ok()) return;
  App.state.abs = { tanggal: d.tanggal };
  const baris = d.daftar.length ? d.daftar.map(s => '<div class="absen-row"><div><div class="absen-nama">' + esc(s.nama) + '</div><small class="text-muted">' + esc(s.kelas) + '</small></div><div class="absen-opts" role="radiogroup" aria-label="Status ' + esc(s.nama) + '">' +
    ['Hadir', 'Izin', 'Sakit', 'Alpa'].map(st => '<label class="absen-opt"><input type="radio" name="st_' + esc(s.id_siswa) + '" value="' + st + '"' + (s.status === st ? ' checked' : '') + '><span class="s-' + st.toLowerCase() + '">' + st + '</span></label>').join('') + '</div></div>').join('') : kosong('people', 'Belum ada siswa aktif.');
  $('#absBody').innerHTML = '<div class="card-app card-pad mb-3"><div class="row g-3 align-items-end"><div class="col-12 col-sm-6 col-md-4"><label class="form-label" for="absTanggal">Tanggal les</label><input type="date" class="form-control" id="absTanggal" value="' + esc(d.tanggal) + '" max="' + esc(App.today) + '" data-onchange="absTanggal"></div><div class="col-12 col-sm-6 col-md-8 d-flex align-items-center justify-content-between gap-2"><div><strong>' + esc(d.hari) + '</strong>, ' + esc(tgl(d.tanggal)) + '</div><button class="btn btn-pill btn-tonal btn-sm-pill" data-act="absSemuaHadir"><i class="bi bi-check2-all"></i>Semua Hadir</button></div></div></div>' +
    '<div class="card-app" id="absList" data-id-list="' + esc(d.daftar.map(s => s.id_siswa).join(',')) + '">' + baris + '</div>' +
    '<div class="card-app sticky-save"><div><strong id="absHitung">0</strong> <span class="text-muted">dari ' + d.daftar.length + ' siswa ditandai</span></div><button class="btn btn-pill btn-primary-app" data-act="absSimpan"><i class="bi bi-save2"></i>Simpan Absensi</button></div>';
  hitungAbsen();
}
function hitungAbsen() { const n = $$('#absList input:checked').length, el = $('#absHitung'); if (el) el.textContent = n; }
async function absensiRekap(opts) {
  const ok = vivo(), ref = await getRef(); if (!ok()) return;
  const daftar = ref.siswa;
  if (!daftar.length) { $('#absBody').innerHTML = '<div class="card-app card-pad">' + kosong('people', 'Belum ada siswa yang dapat Anda lihat.') + '</div>'; return; }
  const staf = adalahStaf();
  const id = (opts && opts.id_siswa) || (App.state.rekap && App.state.rekap.id) || daftar[0].id_siswa;
  const bln = (opts && opts.bln) || (App.state.rekap && App.state.rekap.bln) || App.today.slice(0, 7);
  App.state.rekap = { id: id, bln: bln };
  const [y, m] = bln.split('-').map(Number);
  const d = (await api('absensiRekap', { id_siswa: id, bulan: m, tahun: y })).data;
  if (!ok()) return;
  const r = d.ringkas;
  const pilih = '<div class="card-app card-pad mb-3"><div class="row g-3">' + (staf ? '<div class="col-12 col-md-6"><label class="form-label" for="rekapSiswa">Siswa</label><select class="form-select" id="rekapSiswa" data-onchange="rekapPilih">' + opsiSiswa(daftar).map(o => '<option value="' + esc(o.v) + '"' + (o.v === id ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select></div>' : '<div class="col-12 col-md-6"><div class="kicker">Siswa</div><div class="fw-bold fs-5">' + esc(d.siswa.nama) + '</div></div>') + '<div class="col-12 col-md-6"><label class="form-label" for="rekapBulan">Bulan</label><input type="month" class="form-control" id="rekapBulan" value="' + esc(bln) + '" max="' + esc(App.today.slice(0, 7)) + '" data-onchange="rekapPilih"></div></div></div>';
  const tabel = d.daftar.length ? '<table class="tabel-app"><thead><tr><th>Tanggal</th><th>Hari</th><th>Status</th></tr></thead><tbody>' + d.daftar.map(x => '<tr><td data-label="Tanggal">' + esc(tgl(x.tanggal)) + '</td><td data-label="Hari">' + esc(x.hari) + '</td><td data-label="Status">' + chipStatus(x.status) + '</td></tr>').join('') + '</tbody></table>' : kosong('calendar-x', 'Belum ada absensi pada bulan ini.');
  $('#absBody').innerHTML = pilih + '<div class="row g-3"><div class="col-12 col-lg-5"><section class="card-app card-pad h-100"><h2 class="h6 fw-bold">Persentase kehadiran — ' + esc(blnLabel(m, y)) + '</h2><div class="ring-wrap my-3">' + ring(r.persen) + '<div class="ring-center"><strong>' + r.persen + '%</strong><small>' + r.hadir + ' / ' + r.total + ' pertemuan</small></div></div><div class="d-flex flex-wrap gap-2 justify-content-center">' + chipStatus('Hadir').replace('Hadir', 'Hadir ' + r.hadir) + '<span class="chip chip-izin">Izin ' + r.izin + '</span><span class="chip chip-sakit">Sakit ' + r.sakit + '</span><span class="chip chip-alpa">Alpa ' + r.alpa + '</span></div><div class="chart-box mt-3"><canvas id="chDonat" role="img" aria-label="Diagram status kehadiran bulan ini"></canvas></div></section></div>' +
    '<div class="col-12 col-lg-7"><section class="card-app card-pad h-100"><h2 class="h6 fw-bold">Tren 6 bulan terakhir</h2><div class="chart-box"><canvas id="chBatang" role="img" aria-label="Grafik batang persentase kehadiran per bulan"></canvas></div><p class="text-muted small mt-2 mb-0">Persentase = jumlah Hadir ÷ jumlah pertemuan × 100%.</p></section></div></div>' +
    '<div class="section-head"><h2>Riwayat ' + esc(blnLabel(m, y)) + '</h2></div><div class="card-app">' + tabel + '</div>';
  const w = { Hadir: '#22c55e', Izin: '#f59e0b', Sakit: '#38bdf8', Alpa: '#ef4444' };
  if (r.total) buatChart('chDonat', { type: 'doughnut', data: { labels: ['Hadir', 'Izin', 'Sakit', 'Alpa'], datasets: [{ data: [r.hadir, r.izin, r.sakit, r.alpa], backgroundColor: [w.Hadir, w.Izin, w.Sakit, w.Alpa], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } } });
  buatChart('chBatang', { type: 'bar', data: { labels: d.perBulan.map(b => b.label), datasets: [{ label: 'Kehadiran (%)', data: d.perBulan.map(b => b.persen), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-2').trim(), borderRadius: 10, maxBarThickness: 44 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(148,163,184,.25)' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y + '% (' + d.perBulan[c.dataIndex].total + ' pertemuan)' } } } } });
}

// ════════════════════════════════════════════════════════
// BAGIAN 8: HALAMAN — PERKEMBANGAN
// ════════════════════════════════════════════════════════
async function pgPerkembangan(opts) {
  const ok = vivo(), staf = adalahStaf(), ref = await getRef(); if (!ok()) return;
  const f = App.state.perkFilter = Object.assign({ id_siswa: '', mapel: '' }, opts.reset ? {} : App.state.perkFilter);
  const list = (await api('perkembanganList', { id_siswa: f.id_siswa, mata_pelajaran: f.mapel })).data;
  if (!ok()) return;
  App.state.perk = { list: list };
  const filt = '<div class="card-app card-pad mb-3 no-print"><div class="row g-3">' + (staf ? '<div class="col-12 col-md-6"><label class="form-label" for="pkSiswa">Siswa</label><select class="form-select" id="pkSiswa" data-onchange="perkFilter">' + opsiSiswa(ref.siswa, 'Semua siswa').map(o => '<option value="' + esc(o.v) + '"' + (o.v === f.id_siswa ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select></div>' : '') + '<div class="col-12 ' + (staf ? 'col-md-6' : '') + '"><label class="form-label" for="pkMapel">Mata pelajaran</label><select class="form-select" id="pkMapel" data-onchange="perkFilter">' + [{ v: '', t: 'Semua mata pelajaran' }].concat(ref.mapel.map(m => ({ v: m, t: m }))).map(o => '<option value="' + esc(o.v) + '"' + (o.v === f.mapel ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select></div></div></div>';
  const kartu = list.length ? list.map((p, i) => '<article class="card-app card-pad mb-2 tone-' + (i % 4) + '"><div class="d-flex gap-3"><span class="mapel-ico"><i class="bi bi-' + ikonMapel(p.mata_pelajaran) + '"></i></span><div class="flex-grow-1 min-w-0"><div class="d-flex justify-content-between align-items-start gap-2 flex-wrap"><div><div class="fw-bold">' + esc(p.mata_pelajaran) + (staf ? ' <span class="text-muted fw-normal">• ' + esc(p.nama_siswa) + '</span>' : '') + '</div><small class="text-muted">' + esc(tglPanjang(p.tanggal_minggu)) + (p.nama_guru ? ' • ' + esc(p.nama_guru) : '') + '</small></div><span class="nilai-badge" style="margin-left:0">' + esc(p.nilai) + '</span></div><p class="mt-2 mb-2" style="color:var(--text-2)">' + esc(p.catatan || '—') + '</p>' + (staf ? '<div class="d-flex flex-wrap gap-2 align-items-center no-print"><span class="chip ' + (p.status_dikirim === 'terkirim' ? 'chip-lunas' : p.status_dikirim === 'gagal' ? 'chip-belum' : 'chip-netral') + '"><i class="bi bi-envelope"></i>Email: ' + esc(p.status_dikirim) + '</span><span class="flex-grow-1"></span>' + (p.bisa_ubah ? '<button class="btn btn-pill btn-ghost btn-sm-pill" data-act="perkEdit" data-id="' + esc(p.id_catatan) + '"><i class="bi bi-pencil"></i>Ubah</button>' : '') + (p.bisa_hapus ? '<button class="btn btn-pill btn-ghost btn-sm-pill" data-act="perkHapus" data-id="' + esc(p.id_catatan) + '"><i class="bi bi-trash"></i>Hapus</button>' : '') + '</div>' : '') + '</div></div></article>').join('') : '<div class="card-app card-pad">' + kosong('graph-up', 'Belum ada catatan perkembangan.') + '</div>';
  $('#app-container').innerHTML = kepalaHalaman('Perkembangan', staf ? '<button class="btn btn-pill btn-primary-app" data-act="perkTambah"><i class="bi bi-plus-lg"></i>Tambah Catatan</button>' : '') + filt + kartu;
}
async function formCatatan(item) {
  const ref = await getRef(), baru = !item;
  if (!ref.siswa.length) return toast('Belum ada siswa yang dapat Anda beri catatan. Pastikan Anda terdaftar sebagai pembimbing.', 'err');
  const v = item || { tanggal_minggu: App.today, id_siswa: (App.state.perkFilter && App.state.perkFilter.id_siswa) || '', mata_pelajaran: '', nilai: '', catatan: '' };
  bukaForm({
    judul: baru ? 'Tambah catatan perkembangan' : 'Ubah catatan', simpan: 'Simpan Catatan',
    html: fld({ name: 'id_siswa', label: 'Siswa', type: 'select', req: true, value: v.id_siswa, opts: opsiSiswa(ref.siswa, 'Pilih siswa…') }) +
      '<datalist id="dlMapel">' + ref.mapel.map(m => '<option value="' + esc(m) + '">').join('') + '</datalist>' +
      '<div class="row"><div class="col-sm-6">' + fld({ name: 'tanggal_minggu', label: 'Tanggal / minggu', type: 'date', req: true, value: v.tanggal_minggu, attrs: 'max="' + esc(App.today) + '"' }) + '</div><div class="col-sm-6">' + fld({ name: 'mata_pelajaran', label: 'Mata pelajaran', req: true, value: v.mata_pelajaran, list: 'dlMapel', attrs: 'maxlength="60"' }) + '</div></div>' +
      fld({ name: 'nilai', label: 'Nilai (0–100)', type: 'number', req: true, value: v.nilai, attrs: 'min="0" max="100" step="0.1" inputmode="decimal"' }) +
      fld({ name: 'catatan', label: 'Catatan perkembangan', type: 'textarea', value: v.catatan, help: 'Tulis hal yang sudah baik dan yang perlu dilatih di rumah.' }) +
      (baru ? fld({ name: 'kirim_email', label: 'Kirim email ke wali murid sekarang', type: 'checkbox', value: true, help: 'Bila tidak dicentang, email dikirim otomatis nanti sore.' }) : ''),
    onSubmit: async d => { d.id_catatan = baru ? '' : item.id_catatan; const r = await api('perkembanganSimpan', d); toast(r.message, 'ok'); navigateTo('perkembangan', { }); }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 9: HALAMAN — CARI SISWA & DATA SISWA
// ════════════════════════════════════════════════════════
async function pgSiswa(opts) {
  const ok = vivo(), admin = App.user.peran === 'Admin';
  const list = (await api('siswaList')).data; if (!ok()) return;
  App.state.siswa = { list: list, q: opts.q || '' };
  $('#app-container').innerHTML = kepalaHalaman('Cari Siswa', admin ? '<button class="btn btn-pill btn-primary-app" data-act="siswaTambah"><i class="bi bi-plus-lg"></i>Tambah Siswa</button>' : '') +
    '<div class="search-pill mb-3 no-print" style="max-width:none"><i class="bi bi-search"></i><input type="search" id="siswaCari" placeholder="Ketik nama, kelas, atau wali…" aria-label="Cari siswa" value="' + esc(App.state.siswa.q) + '" data-oninput="siswaCari"></div><div class="card-app" id="siswaTabel"></div>';
  renderSiswaTabel();
}
function renderSiswaTabel() {
  const s = App.state.siswa, q = s.q.trim().toLowerCase(), admin = App.user.peran === 'Admin';
  const rows = s.list.filter(x => !q || [x.nama, x.kelas, x.nama_wali, x.pembimbing].join(' ').toLowerCase().includes(q));
  const el = $('#siswaTabel'); if (!el) return;
  if (!rows.length) { el.innerHTML = kosong('search', 'Tidak ada siswa yang cocok.'); return; }
  el.innerHTML = '<table class="tabel-app"><thead><tr><th>Nama</th><th>Kelas</th><th>Wali</th><th>Pembimbing</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(x =>
    '<tr><td class="judul" data-label="Nama">' + esc(x.nama) + '</td><td data-label="Kelas">' + esc(x.kelas) + '</td><td data-label="Wali">' + esc(x.nama_wali || '—') + '</td><td data-label="Pembimbing">' + esc(x.pembimbing || '—') + '</td><td data-label="Status"><span class="chip ' + (x.status === 'Aktif' ? 'chip-lunas' : 'chip-netral') + '">' + esc(x.status) + '</span></td><td class="aksi">' +
    ((admin || x.dibimbing_saya) ? '<button class="btn btn-pill btn-tonal btn-sm-pill" data-act="siswaLaporan" data-id="' + esc(x.id_siswa) + '"><i class="bi bi-file-earmark-text"></i>Laporan</button>' : '') +
    (admin ? '<button class="btn btn-pill btn-ghost btn-sm-pill" data-act="siswaEdit" data-id="' + esc(x.id_siswa) + '"><i class="bi bi-pencil"></i>Ubah</button><button class="btn btn-pill btn-ghost btn-sm-pill" data-act="siswaHapus" data-id="' + esc(x.id_siswa) + '" aria-label="Hapus ' + esc(x.nama) + '"><i class="bi bi-trash"></i></button>' : '') + '</td></tr>').join('') + '</tbody></table>';
}
async function formSiswa(item) {
  const ref = await getRef(), baru = !item, v = item || { nama: '', kelas: '', nama_wali: '', email_wali: '', id_guru_pembimbing: '', status: 'Aktif' };
  bukaForm({
    judul: baru ? 'Tambah siswa' : 'Ubah siswa',
    html: fld({ name: 'nama', label: 'Nama siswa', req: true, value: v.nama, attrs: 'maxlength="80" autocomplete="off"' }) + fld({ name: 'kelas', label: 'Kelas', value: v.kelas, ph: 'Contoh: Kelas 5 SD' }) + fld({ name: 'nama_wali', label: 'Nama wali murid', value: v.nama_wali }) + fld({ name: 'email_wali', label: 'Email wali (penerima laporan)', type: 'email', value: v.email_wali }) +
      fld({ name: 'id_guru_pembimbing', label: 'Guru pembimbing', type: 'select', value: v.id_guru_pembimbing, opts: [{ v: '', t: '— belum ada —' }].concat((ref.guru || []).map(g => ({ v: g.id, t: g.nama }))) }) +
      fld({ name: 'status', label: 'Status', type: 'select', value: v.status, opts: [{ v: 'Aktif', t: 'Aktif' }, { v: 'Nonaktif', t: 'Nonaktif' }] }) +
      (baru || !v.ada_akun ? fld({ name: 'buat_akun', label: 'Buatkan akun login untuk wali (pakai email di atas)', type: 'checkbox', value: baru }) : ''),
    onSubmit: async d => { d.id_siswa = baru ? '' : item.id_siswa; const r = await api('siswaSimpan', d); App.ref = null; toast(r.message, 'ok'); navigateTo('siswa', { q: App.state.siswa ? App.state.siswa.q : '' }); }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 10: HALAMAN — JADWAL & MATERI
// ════════════════════════════════════════════════════════
async function pgJadwal(opts) {
  const tab = opts.tab || 'jadwal', staf = adalahStaf(), admin = App.user.peran === 'Admin';
  const tabs = '<div class="seg mb-3 no-print" role="tablist"><button class="' + (tab === 'jadwal' ? 'active' : '') + '" data-act="setTab" data-tab="jadwal" role="tab">Jadwal Les</button><button class="' + (tab === 'materi' ? 'active' : '') + '" data-act="setTab" data-tab="materi" role="tab">Materi Belajar</button></div>';
  const ok = vivo();
  if (tab === 'jadwal') {
    const list = (await api('jadwalList')).data; if (!ok()) return;
    App.state.jadwal = { list: list };
    const per = {}; list.forEach(j => { (per[j.hari] = per[j.hari] || []).push(j); });
    const hari = HARI_LES.filter(h => per[h]);
    const kartu = hari.length ? '<div class="row g-3">' + hari.map(h => '<div class="col-12 col-md-6 col-xl-4"><section class="card-app card-pad hari-card h-100"><h3>' + esc(h) + '</h3>' + per[h].map(j => '<div class="jadwal-item"><span class="jam">' + esc(j.jam_mulai) + '–' + esc(j.jam_selesai) + '</span><div class="flex-grow-1"><div class="fw-bold">' + esc(j.mata_pelajaran) + '</div><small class="text-muted">' + esc(j.guru || '—') + '</small></div>' + (admin ? '<button class="icon-btn" style="width:36px;height:36px" data-act="jadwalEdit" data-id="' + esc(j.id_jadwal) + '" aria-label="Ubah jadwal"><i class="bi bi-pencil"></i></button><button class="icon-btn" style="width:36px;height:36px" data-act="jadwalHapus" data-id="' + esc(j.id_jadwal) + '" aria-label="Hapus jadwal"><i class="bi bi-trash"></i></button>' : '') + '</div>').join('') + '</section></div>').join('') + '</div>' : '<div class="card-app card-pad">' + kosong('calendar-x', 'Belum ada jadwal les.') + '</div>';
    $('#app-container').innerHTML = kepalaHalaman('Jadwal & Materi', admin ? '<button class="btn btn-pill btn-primary-app" data-act="jadwalTambah"><i class="bi bi-plus-lg"></i>Tambah Jadwal</button>' : '') + tabs + kartu;
  } else {
    const list = (await api('materiList')).data; if (!ok()) return;
    App.state.materi = { list: list, q: opts.q || '' };
    $('#app-container').innerHTML = kepalaHalaman('Jadwal & Materi', staf ? '<button class="btn btn-pill btn-primary-app" data-act="materiTambah"><i class="bi bi-plus-lg"></i>Tambah Materi</button>' : '') + tabs +
      '<div class="search-pill mb-3" style="max-width:none"><i class="bi bi-search"></i><input type="search" id="materiCari" placeholder="Cari judul atau mata pelajaran…" aria-label="Cari materi" value="' + esc(App.state.materi.q) + '" data-oninput="materiCari"></div><div id="materiGrid"></div>';
    renderMateri();
  }
}
function renderMateri() {
  const s = App.state.materi, q = s.q.trim().toLowerCase(), el = $('#materiGrid'); if (!el) return;
  const rows = s.list.filter(m => !q || [m.judul, m.mata_pelajaran, m.deskripsi].join(' ').toLowerCase().includes(q));
  el.innerHTML = rows.length ? '<div class="row g-3">' + rows.map(m => '<div class="col-12 col-md-6 col-xl-4"><article class="card-app materi-card"><div class="d-flex justify-content-between gap-2"><span class="chip chip-ungu">' + esc(m.mata_pelajaran) + '</span><small class="text-muted">' + esc(tgl(m.tanggal)) + '</small></div><h3 class="h6 fw-bold mb-0">' + esc(m.judul) + '</h3><p class="mb-0 flex-grow-1" style="color:var(--text-2)">' + esc(m.deskripsi || '—') + '</p><small class="text-muted">' + esc(m.guru || '') + '</small><div class="d-flex flex-wrap gap-2 mt-1">' + (m.link_berkas ? '<a class="btn btn-pill btn-tonal btn-sm-pill" href="' + esc(m.link_berkas) + '" target="_blank" rel="noopener noreferrer"><i class="bi bi-box-arrow-up-right"></i>Buka berkas</a>' : '') + (m.bisa_ubah ? '<button class="btn btn-pill btn-ghost btn-sm-pill" data-act="materiEdit" data-id="' + esc(m.id_materi) + '"><i class="bi bi-pencil"></i>Ubah</button>' : '') + (m.bisa_hapus ? '<button class="btn btn-pill btn-ghost btn-sm-pill" data-act="materiHapus" data-id="' + esc(m.id_materi) + '" aria-label="Hapus materi"><i class="bi bi-trash"></i></button>' : '') + '</div></article></div>').join('') + '</div>' : '<div class="card-app card-pad">' + kosong('journal-bookmark', 'Belum ada materi.') + '</div>';
}
async function formJadwal(item) {
  const ref = await getRef(), baru = !item, v = item || { hari: 'Senin', jam_mulai: '15:30', jam_selesai: '17:00', mata_pelajaran: '', id_guru: '' };
  bukaForm({
    judul: baru ? 'Tambah jadwal' : 'Ubah jadwal',
    html: fld({ name: 'hari', label: 'Hari', type: 'select', req: true, value: v.hari, opts: HARI_LES.map(h => ({ v: h, t: h })) }) +
      '<div class="row"><div class="col-6">' + fld({ name: 'jam_mulai', label: 'Jam mulai', type: 'time', req: true, value: v.jam_mulai }) + '</div><div class="col-6">' + fld({ name: 'jam_selesai', label: 'Jam selesai', type: 'time', req: true, value: v.jam_selesai }) + '</div></div>' +
      '<datalist id="dlMapel">' + ref.mapel.map(m => '<option value="' + esc(m) + '">').join('') + '</datalist>' +
      fld({ name: 'mata_pelajaran', label: 'Mata pelajaran', req: true, value: v.mata_pelajaran, list: 'dlMapel' }) +
      fld({ name: 'id_guru', label: 'Guru pengajar', type: 'select', value: v.id_guru, opts: [{ v: '', t: '— belum ditentukan —' }].concat((ref.guru || []).map(g => ({ v: g.id, t: g.nama }))) }),
    onSubmit: async d => { d.id_jadwal = baru ? '' : item.id_jadwal; const r = await api('jadwalSimpan', d); toast(r.message, 'ok'); navigateTo('jadwal', { tab: 'jadwal' }); }
  });
}
async function formMateri(item) {
  const ref = await getRef(), baru = !item, v = item || { judul: '', mata_pelajaran: '', deskripsi: '', tanggal: App.today, link_berkas: '', id_guru: '' };
  bukaForm({
    judul: baru ? 'Tambah materi' : 'Ubah materi',
    html: fld({ name: 'judul', label: 'Judul materi', req: true, value: v.judul, attrs: 'maxlength="120"' }) + '<datalist id="dlMapel">' + ref.mapel.map(m => '<option value="' + esc(m) + '">').join('') + '</datalist>' +
      fld({ name: 'mata_pelajaran', label: 'Mata pelajaran', req: true, value: v.mata_pelajaran, list: 'dlMapel' }) + fld({ name: 'deskripsi', label: 'Deskripsi', type: 'textarea', value: v.deskripsi }) +
      fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: v.tanggal }) +
      fld({ name: 'link_berkas', label: 'Tautan berkas (opsional)', type: 'url', value: v.link_berkas, ph: 'https://drive.google.com/…', help: 'Tempel tautan berkas dari Google Drive / situs lain.' }) +
      (baru && App.user.peran === 'Admin' ? fld({ name: 'id_guru', label: 'Guru pembuat', type: 'select', value: '', opts: [{ v: '', t: '— tidak ditentukan —' }].concat((ref.guru || []).map(g => ({ v: g.id, t: g.nama }))) }) : ''),
    onSubmit: async d => { d.id_materi = baru ? '' : item.id_materi; const r = await api('materiSimpan', d); toast(r.message, 'ok'); navigateTo('jadwal', { tab: 'materi' }); }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 11: HALAMAN — PEMBAYARAN
// ════════════════════════════════════════════════════════
async function pgPembayaran(opts) {
  const ok = vivo(), bln = opts.bln || (App.state.bayarBln) || App.today.slice(0, 7);
  App.state.bayarBln = bln;
  const [y, m] = bln.split('-').map(Number);
  const d = (await api('pembayaranList', { bulan: m, tahun: y })).data; if (!ok()) return;
  if (d.mode === 'wali') {
    $('#app-container').innerHTML = kepalaHalaman('Pembayaran') + '<div class="card-app card-pad mb-3"><div class="kicker">Siswa</div><div class="fw-bold fs-5">' + esc(d.siswa.nama) + '</div><small class="text-muted">' + esc(d.siswa.kelas) + '</small></div><div class="card-app">' + d.riwayat.map(r => '<div class="bayar-row"><div><div class="fw-bold">SPP ' + esc(blnLabel(r.bulan, r.tahun)) + '</div><small class="text-muted">' + (r.lunas ? 'Dicatat oleh ' + esc(r.oleh) + ' • ' + esc(tgl(r.tanggal_lunas)) : 'Belum tercatat lunas') + '</small></div>' + chipLunas(r.lunas) + '</div>').join('') + '</div>';
    return;
  }
  const pers = d.ringkas.total ? Math.round(d.ringkas.lunas * 100 / d.ringkas.total) : 0;
  $('#app-container').innerHTML = kepalaHalaman('Pembayaran') + '<div class="card-app card-pad mb-3"><div class="row g-3 align-items-end"><div class="col-12 col-md-4"><label class="form-label" for="bayarBulan">Bulan</label><input type="month" class="form-control" id="bayarBulan" value="' + esc(bln) + '" data-onchange="bayarBulan"></div><div class="col-12 col-md-8"><div class="d-flex justify-content-between mb-1"><strong>' + d.ringkas.lunas + ' dari ' + d.ringkas.total + ' siswa lunas</strong><span class="text-muted">' + pers + '%</span></div><div class="progress-app" role="progressbar" aria-valuenow="' + pers + '" aria-valuemin="0" aria-valuemax="100" aria-label="Persentase lunas"><span style="width:' + pers + '%"></span></div></div></div></div>' +
    '<div class="card-app">' + (d.daftar.length ? d.daftar.map(s => '<div class="bayar-row"><div class="min-w-0"><div class="fw-bold">' + esc(s.nama) + '</div><small class="text-muted">' + esc(s.kelas) + (s.lunas ? ' • ' + esc(tgl(s.tanggal_lunas)) + ' • ' + esc(s.oleh) : '') + '</small></div><div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">' + chipLunas(s.lunas) + (d.bisa_ubah ? '<button class="btn btn-pill ' + (s.lunas ? 'btn-ghost' : 'btn-primary-app') + ' btn-sm-pill" data-act="bayar" data-id="' + esc(s.id_siswa) + '" data-lunas="' + (s.lunas ? 0 : 1) + '">' + (s.lunas ? 'Batalkan' : 'Tandai lunas ✔') + '</button>' : '') + '</div></div>').join('') : kosong('people', 'Belum ada siswa aktif.')) + '</div>';
}

// ════════════════════════════════════════════════════════
// BAGIAN 12: HALAMAN — GALERI FOTO
// ════════════════════════════════════════════════════════
async function pgGaleri() {
  const ok = vivo(), staf = adalahStaf();
  const list = (await api('fotoList')).data; if (!ok()) return;
  App.state.foto = { list: list };
  $('#app-container').innerHTML = kepalaHalaman('Galeri Foto', staf ? '<button class="btn btn-pill btn-primary-app" data-act="fotoTambah"><i class="bi bi-camera"></i>Unggah Foto</button>' : '') +
    (list.length ? '<div class="foto-grid">' + list.map(f => '<article class="card-app foto-item"><button class="foto-thumb" data-act="fotoLihat" data-id="' + esc(f.id_foto) + '" data-foto-id="' + esc(f.id_foto) + '" data-alt="' + esc(f.keterangan) + '" aria-label="Lihat foto: ' + esc(f.keterangan || 'kegiatan') + '"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span></button><div class="foto-meta"><div class="fw-bold">' + esc(f.keterangan || 'Tanpa keterangan') + '</div><small class="text-muted">' + esc(tgl(f.tanggal)) + ' • ' + esc(f.oleh) + '</small>' + ((f.bisa_ubah || f.bisa_hapus) ? '<div class="d-flex gap-1 mt-2">' + (f.bisa_ubah ? '<button class="btn btn-pill btn-ghost btn-sm-pill" data-act="fotoEdit" data-id="' + esc(f.id_foto) + '"><i class="bi bi-pencil"></i>Ubah</button>' : '') + (f.bisa_hapus ? '<button class="btn btn-pill btn-ghost btn-sm-pill" data-act="fotoHapus" data-id="' + esc(f.id_foto) + '" aria-label="Hapus foto"><i class="bi bi-trash"></i></button>' : '') + '</div>' : '') + '</div></article>').join('') + '</div>' : '<div class="card-app card-pad">' + kosong('images', 'Belum ada foto kegiatan.') + '</div>');
  muatFotoLazy();
}
async function lihatFoto(id) {
  const f = (App.state.foto && App.state.foto.list.find(x => x.id_foto === id)) || {};
  $('#fotoJudul').textContent = f.keterangan || 'Foto kegiatan';
  $('#fotoIsi').innerHTML = '<div class="py-5"><span class="spinner-border" aria-hidden="true"></span></div>';
  const dl = $('#fotoUnduh'); dl.classList.add('disabled'); dl.removeAttribute('href');
  modalShow('modalFoto');
  try {
    const src = await fotoSrc(id, 'besar');
    $('#fotoIsi').innerHTML = '<img class="preview-img" src="' + src + '" alt="' + esc(f.keterangan || 'Foto kegiatan') + '">';
    dl.href = src; dl.download = 'foto-kegiatan-' + id + '.jpg'; dl.classList.remove('disabled');
  } catch (e) { $('#fotoIsi').innerHTML = kosong('exclamation-triangle', e.message); }
}
function formFotoBaru() {
  bukaForm({
    judul: 'Unggah foto kegiatan', simpan: 'Unggah',
    html: '<div class="mb-3"><label class="form-label" for="fotoFile">Foto <span class="text-danger" aria-hidden="true">*</span></label><input class="form-control" type="file" id="fotoFile" accept="image/*" required><div class="form-text">Foto dikompres otomatis (maks. 5 MB).</div><div id="fotoPrev" class="mt-2"></div></div>' + fld({ name: 'keterangan', label: 'Keterangan', value: '', attrs: 'maxlength="200"' }) + fld({ name: 'tanggal', label: 'Tanggal kegiatan', type: 'date', req: true, value: App.today, attrs: 'max="' + esc(App.today) + '"' }),
    setup: root => { $('#fotoFile', root).addEventListener('change', e => { const f = e.target.files[0], p = $('#fotoPrev', root); if (f) { const u = URL.createObjectURL(f); p.innerHTML = '<img class="preview-img" style="max-height:180px" src="' + u + '" alt="Pratinjau foto">'; } else p.innerHTML = ''; }); },
    onSubmit: async d => {
      const file = $('#fotoFile').files[0]; if (!file) throw new Error('Pilih foto terlebih dahulu.');
      d.base64 = await kompresGambar(file); d.nama = file.name; d.mime = 'image/jpeg';
      const r = await api('fotoUnggah', d); toast(r.message, 'ok'); navigateTo('galeri');
    }
  });
}

// ════════════════════════════════════════════════════════
// BAGIAN 13: HALAMAN — LAPORAN PDF
// ════════════════════════════════════════════════════════
async function pgLaporan(opts) {
  const ok = vivo(), ref = await getRef(); if (!ok()) return;
  if (!ref.siswa.length) { $('#app-container').innerHTML = kepalaHalaman('Laporan PDF') + '<div class="card-app card-pad">' + kosong('people', 'Belum ada siswa yang dapat Anda lihat.') + '</div>'; return; }
  const sel = App.state.lap = { id: opts.idSiswa || (App.state.lap && App.state.lap.id) || ref.siswa[0].id_siswa, per: opts.per !== undefined ? opts.per : ((App.state.lap && App.state.lap.per) || '') };
  if (!ref.siswa.some(s => s.id_siswa === sel.id)) sel.id = ref.siswa[0].id_siswa;
  const bulan = sel.per ? Number(sel.per.split('-')[1]) : 0, tahun = sel.per ? Number(sel.per.split('-')[0]) : 0;
  const L = (await api('laporanRingkas', { id_siswa: sel.id, bulan: bulan, tahun: tahun })).data; if (!ok()) return;
  const staf = adalahStaf();
  const ctrl = '<div class="card-app card-pad mb-3 no-print"><div class="row g-3 align-items-end">' + (staf ? '<div class="col-12 col-md-5"><label class="form-label" for="lapSiswa">Siswa</label><select class="form-select" id="lapSiswa" data-onchange="laporanPilih">' + opsiSiswa(ref.siswa).map(o => '<option value="' + esc(o.v) + '"' + (o.v === sel.id ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select></div>' : '') + '<div class="col-12 ' + (staf ? 'col-md-3' : 'col-md-5') + '"><label class="form-label" for="lapPer">Periode</label><select class="form-select" id="lapPer" data-onchange="laporanPilih">' + [{ v: '', t: 'Semua periode' }].concat(opsiBulan(12)).map(o => '<option value="' + esc(o.v) + '"' + (o.v === sel.per ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select></div><div class="col-12 col-md-4 d-flex gap-2"><button class="btn btn-pill btn-primary-app flex-grow-1" data-act="pdf"><i class="bi bi-download"></i>Unduh PDF</button><button class="btn btn-pill btn-tonal" data-act="cetak"><i class="bi bi-printer"></i>Cetak</button></div></div></div>';
  $('#app-container').innerHTML = kepalaHalaman('Laporan PDF') + ctrl + laporanHtml(L);
}
function laporanHtml(L) {
  const a = L.absensi.ringkas;
  return '<article class="laporan-sheet"><div class="d-flex justify-content-between align-items-start flex-wrap gap-2"><div><div class="fw-bold fs-4" style="color:var(--primary)">' + esc(App.config.namaApp || 'Les Aba Aqila') + '</div><div class="text-muted">Laporan Perkembangan Belajar</div></div><div class="text-end text-muted small">Periode: <b>' + esc(L.periode.label) + '</b><br>Dibuat: ' + esc(L.dibuat) + '</div></div>' +
    '<div class="identitas"><div><small>Nama</small><b>' + esc(L.siswa.nama) + '</b></div><div><small>Kelas</small><b>' + esc(L.siswa.kelas) + '</b></div><div><small>Wali murid</small><b>' + esc(L.siswa.nama_wali || '—') + '</b></div><div><small>Pembimbing</small><b>' + esc(L.siswa.pembimbing) + '</b></div></div>' +
    '<h2>Rekap Kehadiran</h2><div class="scroll-x"><table><thead><tr><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpa</th><th>Pertemuan</th><th>Persentase hadir</th></tr></thead><tbody><tr><td>' + a.hadir + '</td><td>' + a.izin + '</td><td>' + a.sakit + '</td><td>' + a.alpa + '</td><td>' + a.total + '</td><td><b>' + a.persen + '%</b></td></tr></tbody></table></div>' +
    '<h2>Nilai per Mata Pelajaran</h2>' + (L.nilai.length ? '<div class="scroll-x"><table><thead><tr><th>Mata pelajaran</th><th>Rata-rata</th><th>Terakhir</th><th>Jumlah</th></tr></thead><tbody>' + L.nilai.map(n => '<tr><td>' + esc(n.mapel) + '</td><td>' + n.rata + '</td><td>' + n.terakhir + '</td><td>' + n.jumlah + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="text-muted">Belum ada nilai pada periode ini.</p>') +
    '<h2>Catatan Perkembangan</h2>' + (L.catatan.length ? '<div class="scroll-x"><table><thead><tr><th>Tanggal</th><th>Mapel</th><th>Nilai</th><th>Catatan guru</th></tr></thead><tbody>' + L.catatan.map(c => '<tr><td style="white-space:nowrap">' + esc(tgl(c.tanggal)) + '</td><td>' + esc(c.mapel) + '</td><td>' + c.nilai + '</td><td>' + esc(c.catatan) + (c.guru ? '<br><i class="text-muted">— ' + esc(c.guru) + '</i>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="text-muted">Belum ada catatan pada periode ini.</p>') +
    '<h2>Status Pembayaran</h2><div class="scroll-x"><table><thead><tr><th>Bulan</th><th>Status</th></tr></thead><tbody>' + L.pembayaran.map(b => '<tr><td>' + esc(b.label) + '</td><td><b style="color:' + (b.lunas ? 'var(--green-ink)' : 'var(--coral-ink)') + '">' + (b.lunas ? '✔ Lunas' : 'Belum lunas') + '</b></td></tr>').join('') + '</tbody></table></div></article>';
}

// ════════════════════════════════════════════════════════
// BAGIAN 14: HALAMAN — PENGATURAN (Admin) / PROFIL (Guru)
// ════════════════════════════════════════════════════════
async function pgPengaturan(opts) {
  const ok = vivo();
  if (App.user.peran !== 'Admin') {
    const g = (await api('guruList')).data; if (!ok()) return;
    const me = g[0];
    $('#app-container').innerHTML = kepalaHalaman('Pengaturan') + '<div class="card-app card-pad"><div class="kicker mb-2">Profil guru</div>' + (me ? '<div class="fw-bold fs-5">' + esc(me.nama) + '</div><div class="text-muted">' + esc(me.email) + '</div><div class="text-muted">' + esc(me.no_hp || '—') + '</div>' : '<p class="mb-0">Akun Anda belum ditautkan ke data guru. Hubungi Admin agar dapat mengisi catatan perkembangan.</p>') + '</div>';
    return;
  }
  const tab = opts.tab || 'pengguna';
  const tabs = '<div class="seg mb-3" role="tablist">' + [['pengguna', 'Pengguna'], ['guru', 'Guru'], ['umum', 'Umum']].map(t => '<button class="' + (tab === t[0] ? 'active' : '') + '" data-act="setTab" data-tab="' + t[0] + '" role="tab">' + t[1] + '</button>').join('') + '</div>';
  let isi = '';
  if (tab === 'pengguna') {
    const [pg, ref] = await Promise.all([api('penggunaList'), getRef()]); if (!ok()) return;
    App.state.pengguna = { list: pg.data };
    const sm = {}; (ref.siswa || []).forEach(s => { sm[s.id_siswa] = s.nama; });
    isi = '<div class="d-flex justify-content-end mb-2"><button class="btn btn-pill btn-primary-app" data-act="penggunaTambah"><i class="bi bi-person-plus"></i>Tambah Akun</button></div><div class="card-app"><table class="tabel-app"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th>PIN</th><th></th></tr></thead><tbody>' + pg.data.map(u => '<tr><td class="judul" data-label="Nama">' + esc(u.nama) + (u.peran === 'Wali' && sm[u.id_siswa] ? '<br><small class="text-muted fw-normal">Wali ' + esc(sm[u.id_siswa]) + '</small>' : '') + '</td><td data-label="Email">' + esc(u.email) + '</td><td data-label="Peran"><span class="chip chip-info">' + esc(u.peran) + '</span></td><td data-label="Status"><span class="chip ' + (u.status_aktif === 'Aktif' ? 'chip-lunas' : 'chip-netral') + '">' + esc(u.status_aktif) + '</span></td><td data-label="PIN">' + (u.punya_pin ? 'Sudah diatur' : '<span class="text-muted">Belum</span>') + '</td><td class="aksi"><button class="btn btn-pill btn-ghost btn-sm-pill" data-act="penggunaEdit" data-id="' + esc(u.email) + '"><i class="bi bi-pencil"></i>Ubah</button><button class="btn btn-pill btn-ghost btn-sm-pill" data-act="penggunaHapus" data-id="' + esc(u.email) + '" aria-label="Hapus akun"><i class="bi bi-trash"></i></button></td></tr>').join('') + '</tbody></table></div>';
  } else if (tab === 'guru') {
    const g = (await api('guruList')).data; if (!ok()) return;
    App.state.guru = { list: g };
    isi = '<div class="d-flex justify-content-end mb-2"><button class="btn btn-pill btn-primary-app" data-act="guruTambah"><i class="bi bi-plus-lg"></i>Tambah Guru</button></div><div class="card-app">' + (g.length ? '<table class="tabel-app"><thead><tr><th>Nama</th><th>Email</th><th>No. HP</th><th>Akun</th><th></th></tr></thead><tbody>' + g.map(x => '<tr><td class="judul" data-label="Nama">' + esc(x.nama) + '</td><td data-label="Email">' + esc(x.email) + '</td><td data-label="No. HP">' + esc(x.no_hp || '—') + '</td><td data-label="Akun"><span class="chip ' + (x.ada_akun ? 'chip-lunas' : 'chip-netral') + '">' + (x.ada_akun ? 'Ada' : 'Belum') + '</span></td><td class="aksi"><button class="btn btn-pill btn-ghost btn-sm-pill" data-act="guruEdit" data-id="' + esc(x.id_guru) + '"><i class="bi bi-pencil"></i>Ubah</button><button class="btn btn-pill btn-ghost btn-sm-pill" data-act="guruHapus" data-id="' + esc(x.id_guru) + '" aria-label="Hapus guru"><i class="bi bi-trash"></i></button></td></tr>').join('') + '</tbody></table>' : kosong('person-badge', 'Belum ada guru.')) + '</div>';
  } else {
    const [c, lg] = await Promise.all([api('configGet'), api('logEmail')]); if (!ok()) return;
    const cf = c.data, wajibTrig = ['jalankanPengingatPembayaran', 'kirimLaporanTertunda', 'cadanganMingguan'];
    isi = '<div class="row g-3"><div class="col-12 col-lg-6"><form class="card-app card-pad" data-submit="simpanConfig"><h2 class="h6 fw-bold mb-3">Pengaturan aplikasi</h2>' + fld({ name: 'namaApp', label: 'Nama aplikasi', req: true, value: cf.namaApp, attrs: 'maxlength="60"' }) + fld({ name: 'tanggalPengingat', label: 'Tanggal pengingat pembayaran tiap bulan', type: 'number', req: true, value: cf.tanggalPengingat, attrs: 'min="1" max="28"', help: 'Email pengingat dikirim otomatis pukul 08.00 pada tanggal ini bagi wali yang belum tercatat lunas.' }) + fld({ name: 'urlAplikasi', label: 'Alamat situs aplikasi (untuk tombol di email)', type: 'url', value: cf.urlAplikasi, ph: 'https://username.github.io/nama-repo/', help: 'Alamat GitHub Pages Anda. Dipakai sebagai tombol "Buka Aplikasi" di email ke wali.' }) + '<button class="btn btn-pill btn-primary-app" type="submit"><i class="bi bi-save2"></i>Simpan</button></form></div>' +
      '<div class="col-12 col-lg-6"><section class="card-app card-pad h-100"><h2 class="h6 fw-bold mb-3">Status sistem</h2><ul class="list-unstyled mb-3">' + wajibTrig.map(t => '<li class="mb-1"><span class="chip ' + (cf.trigger.includes(t) ? 'chip-lunas' : 'chip-belum') + '">' + (cf.trigger.includes(t) ? '✔ Aktif' : 'Belum dipasang') + '</span> <span class="ms-1">' + esc(t) + '</span></li>').join('') + '</ul>' + (cf.trigger.length < 3 ? '<p class="small text-muted">Jalankan <code>setupTriggers()</code> sekali dari editor Apps Script untuk memasang pemicu.</p>' : '') + '<p class="small mb-3">Sisa kuota email hari ini: <b>' + (cf.kuotaEmail == null ? '—' : cf.kuotaEmail) + '</b></p><button class="btn btn-pill btn-tonal" data-act="pengingat"><i class="bi bi-envelope-paper"></i>Kirim pengingat pembayaran sekarang</button></section></div></div>' +
      '<div class="section-head"><h2>Log email terakhir</h2></div><div class="card-app">' + (lg.data.length ? '<table class="tabel-app"><thead><tr><th>Waktu</th><th>Jenis</th><th>Penerima</th><th>Status</th></tr></thead><tbody>' + lg.data.map(l => '<tr><td data-label="Waktu">' + esc(l.waktu) + '</td><td data-label="Jenis">' + esc(l.jenis) + '</td><td data-label="Penerima">' + esc(l.penerima) + '</td><td data-label="Status"><span class="chip ' + (l.status_kirim === 'terkirim' ? 'chip-lunas' : l.status_kirim.indexOf('gagal') === 0 ? 'chip-belum' : 'chip-netral') + '">' + esc(l.status_kirim) + '</span></td></tr>').join('') + '</tbody></table>' : kosong('envelope', 'Belum ada email terkirim.')) + '</div>';
  }
  $('#app-container').innerHTML = kepalaHalaman('Pengaturan') + tabs + isi;
}
async function formPengguna(item) {
  const ref = await getRef(), baru = !item, v = item || { email: '', nama: '', peran: 'Guru', status_aktif: 'Aktif', id_siswa: '' };
  bukaForm({
    judul: baru ? 'Tambah akun' : 'Ubah akun',
    html: fld({ name: 'email', label: 'Email (akun Gmail)', type: 'email', req: true, value: v.email }) + fld({ name: 'nama', label: 'Nama', req: true, value: v.nama }) +
      fld({ name: 'peran', label: 'Peran', type: 'select', req: true, value: v.peran, opts: [{ v: 'Admin', t: 'Admin' }, { v: 'Guru', t: 'Guru' }, { v: 'Wali', t: 'Wali Murid' }] }) +
      '<div id="wrapSiswa">' + fld({ name: 'id_siswa', label: 'Siswa (untuk Wali Murid)', type: 'select', value: v.id_siswa, opts: opsiSiswa(ref.siswa, 'Pilih siswa…') }) + '</div>' +
      fld({ name: 'status_aktif', label: 'Status', type: 'select', value: v.status_aktif, opts: [{ v: 'Aktif', t: 'Aktif' }, { v: 'Nonaktif', t: 'Nonaktif' }] }) +
      fld({ name: 'pin', label: baru ? 'PIN masuk (min. 6 karakter)' : 'PIN baru (kosongkan bila tidak diubah)', type: 'password', value: '', attrs: 'minlength="6" maxlength="20" autocomplete="new-password"', help: 'PIN dipakai untuk masuk ke aplikasi. Bagikan PIN kepada pemilik akun secara pribadi.' }),
    setup: root => { const p = $('#f_peran', root), w = $('#wrapSiswa', root); const t = () => { w.classList.toggle('d-none', p.value !== 'Wali'); }; p.addEventListener('change', t); t(); },
    onSubmit: async d => { d.email_lama = baru ? '' : item.email; const r = await api('penggunaSimpan', d); toast(r.message, 'ok'); navigateTo('pengaturan', { tab: 'pengguna' }); }
  });
}
function formGuru(item) {
  const baru = !item, v = item || { nama: '', email: '', no_hp: '' };
  bukaForm({
    judul: baru ? 'Tambah guru' : 'Ubah guru',
    html: fld({ name: 'nama', label: 'Nama guru', req: true, value: v.nama }) + fld({ name: 'email', label: 'Email', type: 'email', req: true, value: v.email }) + fld({ name: 'no_hp', label: 'No. HP', type: 'tel', value: v.no_hp }) + (baru || !v.ada_akun ? fld({ name: 'buat_akun', label: 'Buatkan akun login Guru', type: 'checkbox', value: baru }) : ''),
    onSubmit: async d => { d.id_guru = baru ? '' : item.id_guru; const r = await api('guruSimpan', d); App.ref = null; toast(r.message, 'ok'); navigateTo('pengaturan', { tab: 'guru' }); }
  });
}

const PAGES = { beranda: pgBeranda, absensi: pgAbsensi, perkembangan: pgPerkembangan, siswa: pgSiswa, jadwal: pgJadwal, pembayaran: pgPembayaran, galeri: pgGaleri, laporan: pgLaporan, pengaturan: pgPengaturan };

// ════════════════════════════════════════════════════════
// BAGIAN 15: AKSI (delegasi klik) & PENGENDALI EVENT
// ════════════════════════════════════════════════════════
const cari = (list, key, id) => list.find(x => x[key] === id);
const hapusDengan = async (pesan, aksi, payload, kembali) => { if (!(await konfirmasi(pesan, 'Hapus data'))) return; try { const r = await api(aksi, payload); App.ref = null; toast(r.message, 'ok'); kembali(); } catch (e) { toast(e.message, 'err'); } };

const Actions = {
  nav: d => navigateTo(d.page),
  lainnya: () => bootstrap.Offcanvas.getOrCreateInstance($('#sheetLainnya')).show(),
  tema: () => ubahTema(),
  muatUlang: () => location.reload(),
  muatHalaman: () => navigateTo(App.page, App.nav),
  keluar: async () => { try { await panggilGAS('keluar', { token: App.token }); } catch (e) { /* tetap keluar di sisi klien */ } sesiHabis(); },
  setTab: d => navigateTo(App.page, Object.assign({}, App.nav, { tab: d.tab })),

  absSemuaHadir: () => { $$('#absList .absen-opt input[value="Hadir"]').forEach(i => { i.checked = true; }); hitungAbsen(); },
  absSimpan: async (d, el) => {
    const ids = ($('#absList').dataset.idList || '').split(',').filter(Boolean), items = [];
    ids.forEach(id => { const c = $('#absList input[name="st_' + id + '"]:checked'); if (c) items.push({ id_siswa: id, status: c.value }); });
    if (!items.length) return toast('Tandai minimal satu siswa terlebih dahulu.', 'err');
    try { await denganLoading(el, async () => { const r = await api('absensiSimpan', { tanggal: App.state.abs.tanggal, items: items }); toast(r.message + (items.length < ids.length ? ' ' + (ids.length - items.length) + ' siswa belum ditandai.' : ''), 'ok'); }); } catch (e) { toast(e.message, 'err'); }
  },

  perkTambah: () => formCatatan(null),
  perkEdit: d => { const it = cari(App.state.perk.list, 'id_catatan', d.id); if (it) formCatatan(it); },
  perkHapus: d => hapusDengan('Hapus catatan perkembangan ini?', 'perkembanganHapus', { id_catatan: d.id }, () => navigateTo('perkembangan', {})),

  siswaTambah: () => formSiswa(null),
  siswaEdit: d => formSiswa(cari(App.state.siswa.list, 'id_siswa', d.id)),
  siswaHapus: d => hapusDengan('Hapus siswa ini? (hanya bisa bila belum punya riwayat data)', 'siswaHapus', { id_siswa: d.id }, () => navigateTo('siswa', { q: App.state.siswa.q })),
  siswaLaporan: d => navigateTo('laporan', { idSiswa: d.id }),

  jadwalTambah: () => formJadwal(null),
  jadwalEdit: d => formJadwal(cari(App.state.jadwal.list, 'id_jadwal', d.id)),
  jadwalHapus: d => hapusDengan('Hapus jadwal ini?', 'jadwalHapus', { id_jadwal: d.id }, () => navigateTo('jadwal', { tab: 'jadwal' })),
  materiTambah: () => formMateri(null),
  materiEdit: d => formMateri(cari(App.state.materi.list, 'id_materi', d.id)),
  materiHapus: d => hapusDengan('Hapus materi ini?', 'materiHapus', { id_materi: d.id }, () => navigateTo('jadwal', { tab: 'materi' })),

  bayar: async (d, el) => {
    const [y, m] = App.state.bayarBln.split('-').map(Number);
    try { await denganLoading(el, async () => { const r = await api('pembayaranSet', { id_siswa: d.id, bulan: m, tahun: y, lunas: d.lunas === '1' }); toast(r.message, 'ok'); }); navigateTo('pembayaran', { bln: App.state.bayarBln }); } catch (e) { toast(e.message, 'err'); }
  },

  fotoTambah: () => formFotoBaru(),
  fotoLihat: d => lihatFoto(d.id),
  fotoEdit: d => { const f = cari(App.state.foto.list, 'id_foto', d.id); bukaForm({ judul: 'Ubah keterangan foto', html: fld({ name: 'keterangan', label: 'Keterangan', value: f.keterangan, attrs: 'maxlength="200"' }) + fld({ name: 'tanggal', label: 'Tanggal', type: 'date', req: true, value: f.tanggal }), onSubmit: async x => { x.id_foto = f.id_foto; const r = await api('fotoUbah', x); toast(r.message, 'ok'); navigateTo('galeri'); } }); },
  fotoHapus: d => hapusDengan('Hapus foto ini dari galeri dan Drive?', 'fotoHapus', { id_foto: d.id }, () => navigateTo('galeri')),

  pdf: async (d, el) => {
    const s = App.state.lap, bulan = s.per ? Number(s.per.split('-')[1]) : 0, tahun = s.per ? Number(s.per.split('-')[0]) : 0;
    try { await denganLoading(el, async () => { const r = await api('laporanPdf', { id_siswa: s.id, bulan: bulan, tahun: tahun }); unduhBlob(b64ToBlob(r.data.base64, 'application/pdf'), r.data.nama); toast('PDF berhasil dibuat dan tersimpan di Drive.', 'ok'); }); } catch (e) { toast(e.message, 'err'); }
  },
  cetak: () => window.print(),

  penggunaTambah: () => formPengguna(null),
  penggunaEdit: d => formPengguna(cari(App.state.pengguna.list, 'email', d.id)),
  penggunaHapus: d => hapusDengan('Hapus akun ' + d.id + '?', 'penggunaHapus', { email: d.id }, () => navigateTo('pengaturan', { tab: 'pengguna' })),
  guruTambah: () => formGuru(null),
  guruEdit: d => formGuru(cari(App.state.guru.list, 'id_guru', d.id)),
  guruHapus: d => hapusDengan('Hapus guru ini?', 'guruHapus', { id_guru: d.id }, () => navigateTo('pengaturan', { tab: 'guru' })),
  pengingat: async (d, el) => { if (!(await konfirmasi('Kirim email pengingat ke wali yang belum tercatat lunas bulan ini?', 'Kirim pengingat'))) return; try { await denganLoading(el, async () => { const r = await api('pengingatSekarang'); toast(r.message, 'ok'); }); navigateTo('pengaturan', { tab: 'umum' }); } catch (e) { toast(e.message, 'err'); } }
};

const Perubahan = {
  absTanggal: el => { if (el.value) navigateTo('absensi', { tab: 'isi', tanggal: el.value }); },
  rekapPilih: () => { const s = $('#rekapSiswa'), b = $('#rekapBulan'); if (b && !b.value) return; navigateTo('absensi', { tab: 'rekap', id_siswa: s ? s.value : undefined, bln: b.value }); },
  perkFilter: () => { const s = $('#pkSiswa'), m = $('#pkMapel'); App.state.perkFilter = { id_siswa: s ? s.value : '', mapel: m.value }; navigateTo('perkembangan', {}); },
  bayarBulan: el => { if (el.value) navigateTo('pembayaran', { bln: el.value }); },
  laporanPilih: () => { const s = $('#lapSiswa'), p = $('#lapPer'); navigateTo('laporan', { idSiswa: s ? s.value : App.state.lap.id, per: p.value }); },
  siswaCari: el => { App.state.siswa.q = el.value; renderSiswaTabel(); },
  materiCari: el => { App.state.materi.q = el.value; renderMateri(); }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled || el.classList.contains('disabled')) return;
  const fn = Actions[el.dataset.act]; if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset && el.dataset.onchange && Perubahan[el.dataset.onchange]) Perubahan[el.dataset.onchange](el);
  if (el.matches && el.matches('#absList input[type="radio"]')) hitungAbsen();
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.oninput && Perubahan[el.dataset.oninput]) Perubahan[el.dataset.oninput](el); });
document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.dataset && f.dataset.submit === 'simpanConfig') {
    e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
    const btn = f.querySelector('[type="submit"]');
    try { await denganLoading(btn, async () => { const r = await api('configSet', dataForm(f)); App.config.namaApp = dataForm(f).namaApp; toast(r.message, 'ok'); }); } catch (err) { toast(err.message, 'err'); }
  }
});
$('#formModalForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (!f.checkValidity()) { f.classList.add('was-validated'); f.reportValidity(); return; }
  const btn = $('#formSimpan'), lbl = btn.textContent;
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Menyimpan…';
  try { await formHandler(dataForm(f)); modalHide('modalForm'); }
  catch (err) { toast(err.message, 'err'); }
  finally { btn.disabled = false; btn.textContent = lbl; }
});
function cariGlobal(q) {
  q = (q || '').trim();
  if (adalahStaf()) navigateTo('siswa', { q: q }); else navigateTo('jadwal', { tab: 'materi', q: q });
}
$('#formCari').addEventListener('submit', e => { e.preventDefault(); cariGlobal($('#inputCari').value); });
$('#formCariMobile').addEventListener('submit', e => { e.preventDefault(); cariGlobal($('#inputCariMobile').value); $('#inputCariMobile').blur(); });
$('#formLogin').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#btnLogin'), email = $('#loginEmail').value, pin = $('#loginPin').value, lbl = btn.textContent;
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Memeriksa…';
  try {
    const res = await panggilGAS('login', { email: email, pin: pin });
    if (!res.success) { $('#loginPesan').textContent = res.message; return; }
    App.token = res.data.token; try { sessionStorage.setItem('laa_token', App.token); } catch (x) { /* abaikan */ }
    $('#loginPin').value = ''; mulai();
  } catch (err) { $('#loginPesan').textContent = 'Gagal menghubungi server: ' + err.message; }
  finally { btn.disabled = false; btn.textContent = lbl; }
});

// ════════════════════════════════════════════════════════
// BAGIAN 16: INISIALISASI
// ════════════════════════════════════════════════════════
(function init() {
  let tema = 'light';
  try { tema = localStorage.getItem('laa_tema') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { /* abaikan */ }
  terapkanTema(tema);
  try { App.token = sessionStorage.getItem('laa_token'); } catch (e) { /* abaikan */ }
  mulai();
})();
