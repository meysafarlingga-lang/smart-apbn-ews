// views-dashboard.jsx — Dashboard utama (overview semua satker)
function DashboardView({ model, openSatker }) {
  const { agg, rows, cfg } = model;
  const D = EWS.data, f = EWS.fmt, R = D.REALIZED;

  // Insight otomatis: prediksi & red flag paling penting
  const insights = [];
  rows
    .filter((r) => Math.abs(r.st.predDev) > 4)
    .sort((a, b) => Math.abs(b.st.predDev) - Math.abs(a.st.predDev))
    .slice(0, 3)
    .forEach((r) =>
      insights.push({
        tone: Math.abs(r.st.predDev) > 2 * cfg.dev ? 'merah' : 'kuning',
        kode: r.s.kode,
        text: r.s.nama + ' berpotensi mengalami deviasi ' + f.pct(r.st.predDev, 0) + ' pada ' + D.MONTHS[R] + '.',
      })
    );
  rows
    .filter((r) => r.st.q4Ratio > cfg.q4)
    .slice(0, 2)
    .forEach((r) =>
      insights.push({
        tone: 'merah', kode: r.s.kode,
        text: r.s.nama + ' diproyeksikan menyerap ' + f.num(r.st.q4Ratio, 0) + '% anggaran di triwulan IV (ambang ' + cfg.q4 + '%).',
      })
    );
  rows
    .filter((r) => r.s.revisi <= 1 && Math.abs(r.st.devKumNow) > cfg.dev)
    .slice(0, 2)
    .forEach((r) =>
      insights.push({
        tone: 'kuning', kode: r.s.kode,
        text: r.s.nama + ' baru ' + r.s.revisi + '× merevisi RPD meski deviasi ' + f.pct(r.st.devKumNow, 0) + ' — potensi deviasi lanjutan tinggi.',
      })
    );

  const sorted = [...rows].sort((a, b) => b.st.score - a.st.score);

  return (
    <div className="page" data-screen-label="Dashboard Utama">
      <div className="stat-grid">
        <Stat label="Total Pagu (12 satker)" value={f.rp(agg.totalPagu)} sub={'DIPA TA ' + D.YEAR + ' · KPPN Mekarjaya'} />
        <Stat label="Realisasi s.d. Mei" value={f.rp(agg.totalReal)} sub={f.num((agg.totalReal / agg.totalPagu) * 100) + '% dari pagu'} />
        <Stat label="Deviasi Kumulatif Agregat" value={f.pct(agg.devKumNow)} tone={agg.devKumNow < -cfg.dev ? 'risk' : agg.devKumNow > cfg.dev ? 'warn' : 'ok'} sub={'Ambang ±' + cfg.dev + '%'} />
        <Stat label="Satker Risiko Tinggi" value={agg.counts.merah + ' dari ' + rows.length} tone={agg.counts.merah > 0 ? 'risk' : 'ok'} sub={agg.counts.kuning + ' satker risiko sedang'} />
      </div>

      <div className="grid-2">
        <Card title="RPD vs Realisasi Kumulatif" sub={'Agregat seluruh satker · garis putus = RPD · titik emas = prediksi ' + D.MONTHS[R]}>
          <LineKumulatif months={D.MONTHS} cumRpd={agg.cumRpd} cumReal={agg.cumReal} predCum={agg.predCum} />
        </Card>
        <Card title="Deviasi Bulanan Agregat" sub={'Pita hijau = zona aman ±' + cfg.dev + '%'}>
          <DevBars months={D.MONTHS.slice(0, R)} dev={agg.devBulanan} threshold={cfg.dev} />
        </Card>
      </div>

      <div className="grid-13">
        <Card title="Distribusi Risiko" sub="Berdasarkan risk score berbobot">
          <Donut counts={agg.counts} />
        </Card>
        <Card title="Insight Otomatis" sub="Dihasilkan mesin prediksi & rule engine — diurutkan dari yang paling mendesak">
          <ul className="insight-list">
            {insights.map((it, i) => (
              <li key={i} className="insight-item">
                <span className={'dot dot-' + it.tone}></span>
                <span className="insight-text">{it.text}</span>
                <button className="link-btn" onClick={() => openSatker(it.kode)}>Tindak lanjuti →</button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Daftar Satker" sub="Klik baris untuk membuka analisis lengkap & rencana mitigasi">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Satker</th>
                <th className="num">Pagu</th>
                <th className="num">Realisasi</th>
                <th className="num">Dev. Kumulatif</th>
                <th className="num">Prediksi {D.MONTHS[R]}</th>
                <th className="num">Volatilitas σ</th>
                <th>Pola</th>
                <th className="num">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ s, st }) => (
                <tr key={s.kode} onClick={() => openSatker(s.kode)}>
                  <td>
                    <div className="cell-name">{s.nama}</div>
                    <div className="cell-sub">{s.kode} · {s.kl}</div>
                  </td>
                  <td className="num">{f.rp(s.pagu)}</td>
                  <td className="num">
                    <div>{f.num(st.realPct)}%</div>
                    <div className="cell-sub">{f.rp(st.cumReal[R - 1])}</div>
                  </td>
                  <td className={'num strong ' + (st.devKumNow < -cfg.dev ? 'tone-risk' : st.devKumNow > cfg.dev ? 'tone-warn' : 'tone-ok')}>{f.pct(st.devKumNow)}</td>
                  <td className={'num ' + (Math.abs(st.predDev) > 4 ? 'tone-risk strong' : 'tone-ok')}>{f.pct(st.predDev)}</td>
                  <td className="num">{f.num(st.vol)}</td>
                  <td><Chip>{st.pattern}</Chip></td>
                  <td className="num">
                    <span className="score">{Math.round(st.score)}</span> <Pill level={st.level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
window.DashboardView = DashboardView;
