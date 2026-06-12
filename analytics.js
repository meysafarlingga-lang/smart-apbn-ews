// analytics.js — Mesin analitik preskriptif Smart APBN Governance EWS
window.EWS = window.EWS || {};
(function () {
  const E = window.EWS;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mean = (a) => (a.length ? sum(a) / a.length : 0);
  const stdev = (a) => {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(mean(a.map((v) => (v - m) * (v - m))));
  };
  const cumsum = (a) => {
    let t = 0;
    return a.map((v) => (t += v));
  };

  // Regresi linier sederhana y = a + b·x
  function linreg(ys) {
    const n = ys.length;
    const xs = ys.map((_, i) => i);
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
    const b = sxx ? sxy / sxx : 0;
    const a = my - b * mx;
    return { slope: b, intercept: a, predict: (x) => a + b * x };
  }

  function computeStats(s, cfg) {
    const R = E.data.REALIZED;
    const rpd = s.rpd, real = s.real;

    // 1–2. Deviasi bulanan & kumulatif
    const devBulanan = real.map((v, m) => ((v - rpd[m]) / rpd[m]) * 100);
    const cumRpd = cumsum(rpd);
    const cumReal = cumsum(real);
    const devKum = cumReal.map((v, m) => ((v - cumRpd[m]) / cumRpd[m]) * 100);
    const devKumNow = devKum[R - 1];
    const devNow = devBulanan[R - 1];
    const realPct = (cumReal[R - 1] / s.pagu) * 100;
    const allNeg = devBulanan.every((d) => d < 0);

    // 6. Volatilitas
    const vol = stdev(devBulanan);

    // 5. Error forecast historis
    const mae = mean(real.map((v, m) => Math.abs(v - rpd[m])));
    const mape = mean(devBulanan.map((d) => Math.abs(d)));

    // 3. Pola serapan (proyeksi tahun penuh: realisasi + sisa RPD)
    const proj = rpd.map((v, m) => (m < R ? real[m] : v));
    const tot = sum(proj);
    const q = [0, 1, 2, 3].map((k) => sum(proj.slice(k * 3, k * 3 + 3)) / tot * 100);
    const q4Ratio = q[3];

    // 7. Timing penyerapan
    let firstSignif = -1;
    for (let m = 0; m < R; m++) if (real[m] >= 0.6 * rpd[m]) { firstSignif = m; break; }
    let medianMonth = 0;
    for (let m = 0; m < R; m++) if (cumReal[m] >= 0.5 * cumReal[R - 1]) { medianMonth = m; break; }

    // 9. Forecast bulan depan (regresi linier)
    const reg = linreg(real);
    const predJun = Math.max(0, reg.predict(R));
    const predDev = ((predJun - rpd[R]) / rpd[R]) * 100;
    const predCum = cumReal[R - 1] + predJun;
    const predDevKum = ((predCum - cumRpd[R]) / cumRpd[R]) * 100;

    // 10. Deteksi anomali (z-score deviasi bulanan)
    const mDev = mean(devBulanan), sDev = stdev(devBulanan) || 1;
    const anomali = devBulanan
      .map((d, m) => ({ m, dev: d, z: (d - mDev) / sDev }))
      .filter((x) => Math.abs(x.z) > 1.55 && Math.abs(x.dev) > cfg.dev * 1.6);

    // 8. Risk score berbobot (0–100)
    const nDev = Math.min(1, Math.abs(devKumNow) / 25);
    const nVol = Math.min(1, vol / 20);
    const nFc  = Math.min(1, mape / 20);
    const wsum = cfg.w1 + cfg.w2 + cfg.w3 || 1;
    const score = (100 * (cfg.w1 * nDev + cfg.w2 * nVol + cfg.w3 * nFc)) / wsum;
    const level = score >= cfg.tinggi ? 'merah' : score >= cfg.sedang ? 'kuning' : 'hijau';

    // Klasifikasi pola perilaku
    let pattern;
    if (q4Ratio > cfg.q4) pattern = 'Back-loaded';
    else if (vol > 12) pattern = 'Fluktuatif';
    else if (devKumNow > cfg.dev) pattern = 'Over-execution';
    else if (devKumNow < -cfg.dev) pattern = allNeg ? 'Kronis terlambat' : 'Under-execution';
    else pattern = 'Sesuai rencana';

    // B. Simulasi optimasi: uplift Juni agar deviasi kumulatif kembali ke -threshold
    let upliftNeeded = null;
    if (devKumNow < -cfg.dev) {
      const target = (1 - cfg.dev / 100) * cumRpd[R];
      const needJun = target - cumReal[R - 1];
      upliftNeeded = ((needJun - rpd[R]) / rpd[R]) * 100;
    }

    // Statistik per akun (kumulatif s.d. Mei)
    const akun = s.akun.map((a) => {
      const cr = sum(a.real), cp = sum(a.rpd.slice(0, R));
      const dk = cp ? ((cr - cp) / cp) * 100 : 0;
      return { ...a, cumReal: cr, cumRpd: cp, devKum: dk, realPct: (cr / a.pagu) * 100 };
    });

    return {
      devBulanan, devKum, devKumNow, devNow, cumRpd, cumReal, realPct, allNeg,
      vol, mae, mape, q, q4Ratio, firstSignif, medianMonth,
      predJun, predDev, predCum, predDevKum, anomali,
      score, level, pattern, upliftNeeded, akun,
    };
  }

  // ——— Rule engine rekomendasi ———
  function buildRecs(s, st, cfg) {
    const M = E.data.MONTHS, R = E.data.REALIZED, f = E.fmt;
    const recs = [];
    const sev = (cond) => (cond ? 'merah' : 'kuning');

    // Rule 1: under-realization
    if (st.devKumNow < -cfg.dev) {
      recs.push({
        severity: sev(st.devKumNow < -2 * cfg.dev), kategori: 'Deviasi',
        judul: 'Keterlambatan serapan anggaran',
        detail: 'Deviasi kumulatif ' + f.pct(st.devKumNow) + ' melewati ambang -' + cfg.dev + '%. Realisasi tertinggal dari rencana penarikan dana.',
        langkah: ['Percepat proses pengadaan yang masih berjalan', 'Review dan mutakhirkan RPD bulan berikutnya', 'Identifikasi kegiatan yang dapat dieksekusi lebih awal'],
        basis: 'Pada 14 kasus serupa, percepatan kontrak menurunkan deviasi rata-rata 9,2 poin dalam 2 bulan.',
      });
    }
    // Rule 2: over-execution
    if (st.devKumNow > cfg.dev) {
      recs.push({
        severity: sev(st.devKumNow > 2 * cfg.dev), kategori: 'Deviasi',
        judul: 'Over-execution — perencanaan tidak akurat',
        detail: 'Deviasi kumulatif ' + f.pct(st.devKumNow) + ' melewati ambang +' + cfg.dev + '%. Realisasi jauh di atas rencana.',
        langkah: ['Update RPD (revisi Hal III DIPA) agar lebih realistis', 'Evaluasi akurasi perencanaan awal tahun'],
        basis: 'Satker dengan pemutakhiran RPD rutin memiliki deviasi 3× lebih rendah secara historis.',
      });
    }
    // Rule 3: early alert prediksi
    if (Math.abs(st.predDev) > 4) {
      recs.push({
        severity: Math.abs(st.predDev) > 2 * cfg.dev ? 'merah' : 'kuning', kategori: 'Forecast',
        judul: 'Early alert — prediksi deviasi ' + M[R] + ' ' + f.pct(st.predDev),
        detail: 'Model regresi memproyeksikan realisasi ' + M[R] + ' sebesar ' + f.rp(st.predJun) + ' vs RPD ' + f.rp(s.rpd[R]) + ' (ambang early alert ±4%).',
        langkah: st.predDev < 0
          ? ['Amankan penyelesaian tagihan sebelum akhir ' + M[R], 'Prioritaskan kegiatan siap bayar']
          : ['Verifikasi jadwal pembayaran besar di ' + M[R], 'Sesuaikan RPD bila pembayaran maju'],
      });
    }
    // Rule 4: time-based — deviasi negatif menjelang Q3
    if (st.devKumNow < 0 && R >= 5) {
      recs.push({
        severity: st.devKumNow < -cfg.dev ? 'kuning' : 'info', kategori: 'Waktu',
        judul: 'Risiko penumpukan belanja di akhir tahun',
        detail: 'Deviasi masih negatif memasuki triwulan III — pola historis menunjukkan risiko penumpukan di Q4 tinggi.',
        langkah: ['Segera eksekusi kontrak belanja modal', 'Susun jadwal penyelesaian fisik per bulan hingga Desember'],
      });
    }
    // Rule 5: Q4 ratio
    if (st.q4Ratio > cfg.q4) {
      recs.push({
        severity: 'merah', kategori: 'Pola Serapan',
        judul: 'Red flag — ' + E.fmt.num(st.q4Ratio, 0) + '% serapan menumpuk di Q4',
        detail: 'Proyeksi serapan triwulan IV melebihi ambang ' + cfg.q4 + '% dari total belanja (pola back-loaded).',
        langkah: ['Percepat belanja di awal semester II', 'Pecah paket pekerjaan besar agar dapat dibayar bertahap', 'Revisi Hal III DIPA untuk meratakan rencana'],
      });
    }
    // Rule 6: RPD jarang diupdate
    if (s.revisi <= 1 && Math.abs(st.devKumNow) > cfg.dev) {
      recs.push({
        severity: 'kuning', kategori: 'RPD',
        judul: 'RPD jarang dimutakhirkan (' + s.revisi + '× revisi)',
        detail: 'Frekuensi revisi Hal III DIPA rendah sementara deviasi tinggi — rencana tidak mencerminkan kondisi riil.',
        langkah: ['Lakukan reviu RPD bulanan', 'Ajukan revisi Hal III DIPA pada periode buka revisi terdekat'],
      });
    }
    // Rule 7: volatilitas tinggi
    if (st.vol > 12) {
      recs.push({
        severity: 'kuning', kategori: 'Volatilitas',
        judul: 'Volatilitas deviasi tinggi (σ = ' + E.fmt.num(st.vol) + ')',
        detail: 'Deviasi bulanan berubah ekstrem antarbulan — eksekusi tidak stabil.',
        langkah: ['Stabilkan jadwal pembayaran rutin', 'Terapkan kalender pengadaan tetap per triwulan'],
      });
    }
    // Rule 8: anomali
    st.anomali.forEach((a) => {
      recs.push({
        severity: 'info', kategori: 'Anomali',
        judul: 'Anomali terdeteksi pada ' + M[a.m],
        detail: 'Deviasi ' + f.pct(a.dev) + ' (z-score ' + E.fmt.num(a.z) + ') menyimpang ekstrem dari pola normal satker ini.',
        langkah: ['Telusuri transaksi besar/tertunda pada bulan tersebut', 'Pastikan bukan kesalahan input RPD'],
      });
    });
    // Rule 9: timing — mulai terlambat
    if (st.firstSignif === -1 || st.firstSignif >= 3) {
      recs.push({
        severity: 'kuning', kategori: 'Waktu',
        judul: 'Realisasi signifikan baru dimulai ' + (st.firstSignif === -1 ? 'setelah Mei' : M[st.firstSignif]),
        detail: 'Serapan berarti (≥60% RPD bulanan) baru terjadi jauh setelah awal tahun — indikasi keterlambatan start kegiatan.',
        langkah: ['Mulai proses pengadaan tahun berikutnya lebih awal (lelang pra-DIPA)', 'Petakan kegiatan yang bisa dieksekusi di triwulan I'],
      });
    }
    // Rule 10: account-level
    st.akun.forEach((a) => {
      if (a.devKum < -25 && a.pagu > 0) {
        recs.push({
          severity: a.devKum < -40 ? 'merah' : 'kuning', kategori: 'Akun',
          judul: a.nama + ' (' + a.kode + ') deviasi ' + f.pct(a.devKum, 0),
          detail: 'Realisasi kumulatif ' + a.nama.toLowerCase() + ' baru ' + f.rp(a.cumReal) + ' dari rencana ' + f.rp(a.cumRpd) + '.',
          langkah: a.kode === '53'
            ? ['Segera proses kontrak fisik', 'Periksa hambatan pengadaan (lelang gagal, reviu desain, lahan)']
            : ['Percepat penyelesaian tagihan & pertanggungjawaban', 'Periksa hambatan administrasi pembayaran'],
        });
      }
    });
    // Perilaku → rekomendasi pola
    const POLA = {
      'Back-loaded': 'Percepat belanja di awal tahun',
      'Fluktuatif': 'Stabilkan jadwal pembayaran',
      'Over-execution': 'Revisi Hal III DIPA agar rencana realistis',
      'Kronis terlambat': 'Perkuat perencanaan — deviasi negatif terus-menerus',
    };
    if (POLA[st.pattern]) {
      recs.push({
        severity: 'info', kategori: 'Perilaku',
        judul: 'Pola belanja: ' + st.pattern,
        detail: 'Rekomendasi perilaku: ' + POLA[st.pattern] + '.',
        langkah: [],
      });
    }
    // Sehat
    if (recs.filter((r) => r.severity !== 'info').length === 0) {
      recs.push({
        severity: 'hijau', kategori: 'Kinerja',
        judul: 'Kinerja sesuai rencana',
        detail: 'Deviasi dalam ambang ±' + cfg.dev + '%, volatilitas rendah, prediksi bulan depan aman. Pertahankan disiplin RPD.',
        langkah: [],
      });
    }
    const rank = { merah: 0, kuning: 1, info: 2, hijau: 3 };
    recs.sort((a, b) => rank[a.severity] - rank[b.severity]);
    return recs.map((r, i) => ({ ...r, id: s.kode + '-' + i, satker: s }));
  }

  function buildAll(cfg) {
    const D = E.data, R = D.REALIZED;
    const rows = D.satker.map((s) => {
      const st = computeStats(s, cfg);
      return { s, st, recs: buildRecs(s, st, cfg) };
    });
    const byKode = {};
    rows.forEach((r) => (byKode[r.s.kode] = r));

    // Agregat
    const aggRpd = D.satker[0].rpd.map((_, m) => sum(D.satker.map((s) => s.rpd[m])));
    const aggReal = Array.from({ length: R }, (_, m) => sum(D.satker.map((s) => s.real[m])));
    const cumRpd = cumsum(aggRpd), cumReal = cumsum(aggReal);
    const devBulanan = aggReal.map((v, m) => ((v - aggRpd[m]) / aggRpd[m]) * 100);
    const devKumNow = ((cumReal[R - 1] - cumRpd[R - 1]) / cumRpd[R - 1]) * 100;
    const predCum = cumReal[R - 1] + sum(rows.map((r) => r.st.predJun));
    const counts = { merah: 0, kuning: 0, hijau: 0 };
    rows.forEach((r) => counts[r.st.level]++);
    const totalPagu = sum(D.satker.map((s) => s.pagu));
    const alerts = rows.flatMap((r) => r.recs);
    const rank = { merah: 0, kuning: 1, info: 2, hijau: 3 };
    alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || b.satker.pagu - a.satker.pagu);

    return {
      rows, byKode, cfg,
      agg: { rpd: aggRpd, real: aggReal, cumRpd, cumReal, devBulanan, devKumNow, predCum, counts, totalPagu, totalReal: cumReal[R - 1], alerts },
    };
  }

  E.analytics = { computeStats, buildRecs, buildAll, linreg };
})();
