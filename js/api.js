/**
 * Lapisan komunikasi ke Google Apps Script (REST API).
 * POST memakai Content-Type text/plain agar browser tidak mengirim preflight CORS
 * (GAS tidak menjawab preflight). Isi body tetap JSON.
 */
const API_TIMEOUT_MS = 90000; // GAS kadang lambat saat "cold start"; PDF bisa butuh puluhan detik

async function panggilGAS(route, body) {
  if (typeof GAS_URL !== 'string' || !/^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(GAS_URL)) {
    throw new Error('Alamat API belum diatur. Isi GAS_URL di js/config.js dengan URL /exec dari Apps Script.');
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ route: route }, body || {})),
      redirect: 'follow',
      signal: ctl.signal
    });
    const teks = await res.text();
    let json;
    try { json = JSON.parse(teks); }
    catch (e) { throw new Error('Balasan server tidak terbaca. Pastikan Web App di-deploy dengan "Who has access: Anyone" dan URL /exec benar.'); }
    return json;
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('Server terlalu lama merespons. Coba lagi.');
    if (err instanceof TypeError) throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
