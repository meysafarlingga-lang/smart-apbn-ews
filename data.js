// data.js — Data dummy Smart APBN Governance EWS
// TA 2026 · Realisasi tersedia s.d. Mei 2026 · Bulan berjalan: Juni
window.EWS = window.EWS || {};
(function () {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const REALIZED = 5; // index 0..4 (Jan–Mei) sudah terealisasi

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Pola jadwal RPD (persen pagu per bulan, total 100)
  const SHARE = {
    linear:   [6, 7, 8, 8, 9, 9, 9, 9, 9, 9, 8, 9],
    standar:  [4, 6, 7, 8, 8, 9, 9, 9, 9, 10, 10, 11],
    backload: [2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 15, 17],
  };

  // Pola deviasi bulanan per arketipe perilaku (fraksi, Jan–Mei)
  const DEVP = {
    baik:       [ 0.02, -0.03,  0.03, -0.02,  0.02],
    moderat:    [-0.12, -0.16, -0.10, -0.14, -0.12],
    kronis:     [-0.22, -0.28, -0.20, -0.26, -0.24],
    late:       [-0.85, -0.70, -0.45, -0.15,  0.05],
    fluktuatif: [ 0.30, -0.38,  0.22, -0.34,  0.26],
    over:       [ 0.15,  0.22,  0.17,  0.20,  0.14],
  };

  // Multiplier sensitivitas deviasi per jenis belanja
  const AKUN = [
    { kode: '51', nama: 'Belanja Pegawai', mult: 0.12 },
    { kode: '52', nama: 'Belanja Barang',  mult: 0.85 },
    { kode: '53', nama: 'Belanja Modal',   mult: 1.60 },
  ];

  const DEFS = [
    { kode: '401877', nama: 'Pengadilan Negeri Sukamaju',           kl: 'Mahkamah Agung',         grup: 'Hukum & HAM',               pagu: 8.4e9,  arch: 'baik',       share: 'linear',   revisi: 5, split: [0.52, 0.40, 0.08] },
    { kode: '632011', nama: 'Polres Mekarjaya',                     kl: 'Polri',                  grup: 'Hukum & HAM',               pagu: 42.6e9, arch: 'baik',       share: 'standar',  revisi: 4, split: [0.61, 0.31, 0.08] },
    { kode: '416502', nama: 'Kantor Kemenag Kab. Sukamaju',         kl: 'Kementerian Agama',      grup: 'Layanan Publik',            pagu: 18.9e9, arch: 'moderat',    share: 'standar',  revisi: 2, split: [0.55, 0.38, 0.07] },
    { kode: '023145', nama: 'Balai Pelatihan Pertanian Tj. Harapan', kl: 'Kementerian Pertanian', grup: 'Pendidikan & Pelatihan',    pagu: 24.3e9, arch: 'late',       share: 'standar',  revisi: 1, split: [0.18, 0.42, 0.40] },
    { kode: '412775', nama: 'BPS Kabupaten Mekarjaya',              kl: 'BPS',                    grup: 'Layanan Publik',            pagu: 9.7e9,  arch: 'baik',       share: 'linear',   revisi: 4, split: [0.46, 0.50, 0.04] },
    { kode: '350441', nama: 'KPU Kabupaten Sukamaju',               kl: 'KPU',                    grup: 'Layanan Publik',            pagu: 11.2e9, arch: 'fluktuatif', share: 'standar',  revisi: 1, split: [0.30, 0.62, 0.08] },
    { kode: '660893', nama: 'Lapas Kelas IIB Tj. Harapan',          kl: 'Kemenkumham',            grup: 'Hukum & HAM',               pagu: 15.8e9, arch: 'baik',       share: 'linear',   revisi: 3, split: [0.44, 0.50, 0.06] },
    { kode: '248120', nama: 'Politeknik Negeri Mekarjaya',          kl: 'Kemendikbudristek',      grup: 'Pendidikan & Pelatihan',    pagu: 56.4e9, arch: 'kronis',     share: 'standar',  revisi: 1, split: [0.38, 0.34, 0.28] },
    { kode: '308217', nama: 'Kejaksaan Negeri Sukamaju',            kl: 'Kejaksaan RI',           grup: 'Hukum & HAM',               pagu: 12.1e9, arch: 'moderat',    share: 'standar',  revisi: 2, split: [0.57, 0.37, 0.06] },
    { kode: '537064', nama: 'Balai Jalan Wilayah Tirtagangga',      kl: 'Kementerian PUPR',       grup: 'Infrastruktur & Kesehatan', pagu: 88.5e9, arch: 'late',       share: 'backload', revisi: 0, split: [0.07, 0.18, 0.75] },
    { kode: '425990', nama: 'Kantor Pertanahan Kab. Mekarjaya',     kl: 'Kementerian ATR/BPN',    grup: 'Layanan Publik',            pagu: 14.6e9, arch: 'over',       share: 'linear',   revisi: 2, split: [0.49, 0.43, 0.08] },
    { kode: '671322', nama: 'RS Bhayangkara Tirtagangga',           kl: 'Polri',                  grup: 'Infrastruktur & Kesehatan', pagu: 31.9e9, arch: 'fluktuatif', share: 'standar',  revisi: 1, split: [0.35, 0.49, 0.16] },
  ];

  const rng = mulberry32(20260612);

  const satker = DEFS.map((d) => {
    const share = SHARE[d.share];
    const akun = AKUN.map((a, i) => {
      const pagu = d.pagu * d.split[i];
      const rpd = share.map((s) => (pagu * s) / 100);
      const real = [];
      for (let m = 0; m < REALIZED; m++) {
        const dev = Math.max(-0.97, DEVP[d.arch][m] * a.mult + (rng() - 0.5) * 0.03);
        real.push(Math.max(0, rpd[m] * (1 + dev)));
      }
      return { kode: a.kode, nama: a.nama, pagu, rpd, real };
    });
    const rpd = share.map((_, m) => akun.reduce((t, a) => t + a.rpd[m], 0));
    const real = Array.from({ length: REALIZED }, (_, m) => akun.reduce((t, a) => t + a.real[m], 0));
    return { ...d, akun, rpd, real };
  });

  // ——— Format helpers (id-ID) ———
  function rp(v, d) {
    const abs = Math.abs(v);
    const dec = d === undefined ? 1 : d;
    if (abs >= 1e12) return 'Rp' + (v / 1e12).toFixed(dec).replace('.', ',') + ' T';
    if (abs >= 1e9)  return 'Rp' + (v / 1e9).toFixed(dec).replace('.', ',') + ' M';
    if (abs >= 1e6)  return 'Rp' + Math.round(v / 1e6).toLocaleString('id-ID') + ' jt';
    return 'Rp' + Math.round(v).toLocaleString('id-ID');
  }
  function pct(v, d) {
    const dec = d === undefined ? 1 : d;
    return (v > 0 ? '+' : '') + v.toFixed(dec).replace('.', ',') + '%';
  }
  function num(v, d) {
    return v.toFixed(d === undefined ? 1 : d).replace('.', ',');
  }

  window.EWS.data = { MONTHS, REALIZED, YEAR: 2026, satker };
  window.EWS.fmt = { rp, pct, num };
})();
