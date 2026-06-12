// views-benchmark.jsx — Benchmarking & ranking antar satker
function BenchmarkView({ model, openSatker }) {
  const { rows, cfg } = model;
  const f = EWS.fmt;
  const [metric, setMetric] = React.useState('score');

  const METRICS = {
    score: { label: 'Risk Score', get: (r) => r.st.score, fmt: (v) => Math.round(v), desc: 'Skor risiko komposit (0–100), semakin tinggi semakin berisiko' },
    dev: { label: 'Deviasi Kumulatif', get: (r) => r.st.devKumNow, fmt: (v) => f.pct(v), desc: 'Selisih realisasi terhadap RPD s.d. Mei — diurutkan dari yang paling menyimpang' },
    vol: { label: 'Volatilitas', get: (r) => r.st.vol, fmt: (v) => 'σ ' + f.num(v), desc: 'Standar deviasi deviasi bulanan — mengukur kestabilan eksekusi' },
    mape: { label: 'MAPE', get: (r) => r.st.mape, fmt: (v) => f.num(v) + '%', desc: 'Rata-rata error absolut forecast RPD terhadap realisasi' },
    q4: { label: 'Rasio Q4', get: (r) => r.st.q4Ratio, fmt: (v) => f.num(v, 0) + '%', desc: 'Proyeksi porsi serapan triwulan IV — di atas ' + cfg.q4 + '% = red flag back-loaded' },
  };
  const M = METRICS[metric];
  const sorted = [...rows].sort((a, b) => Math.abs(M.get(b)) - Math.abs(M.get(a)));
  const maxV = Math.max(...rows.map((r) => Math.abs(M.get(r)))) || 1;
  const tone = (r) => {
    if (metric === 'dev') return M.get(r) < -cfg.dev ? 'var(--risk)' : M.get(r) > cfg.dev ? 'var(--warn)' : 'var(--ok)';
    if (metric === 'q4') return M.get(r) > cfg.q4 ? 'var(--risk)' : 'var(--ok)';
    return r.st.level === 'merah' ? 'var(--risk)' : r.st.level === 'kuning' ? 'var(--warn)' : 'var(--ok)';
  };

  // Peer group per jenis satker
  const groups = {};
  rows.forEach((r) => (groups[r.s.grup] = groups[r.s.grup] || []).push(r));

  return (
    <div className="page" data-screen-label="Benchmarking Antar Satker">
      <Card
        title="Ranking Satker"
        sub={M.desc}
        right={<Segmented value={metric} onChange={setMetric} options={Object.keys(METRICS).map((id) => ({ id, label: METRICS[id].label }))} />}
      >
        <div className="rank-list">
          {sorted.map((r, i) => (
            <RankRow key={r.s.kode} rank={i + 1} label={r.s.nama} sub={r.s.kode + ' · ' + r.s.grup}
              value={M.get(r)} valueLabel={M.fmt(M.get(r))} max={maxV} tone={tone(r)}
              onClick={() => openSatker(r.s.kode)} />
          ))}
        </div>
      </Card>

      <h2 className="section-title">Perbandingan dengan Satker Sejenis</h2>
      <div className="peer-grid">
        {Object.entries(groups).map(([grup, list]) => {
          const avgDev = list.reduce((t, r) => t + r.st.devKumNow, 0) / list.length;
          const sortedAbs = [...list].sort((a, b) => Math.abs(a.st.devKumNow) - Math.abs(b.st.devKumNow));
          const best = sortedAbs[0], worst = sortedAbs[sortedAbs.length - 1];
          return (
            <Card key={grup} title={grup} sub={list.length + ' satker sejenis'}>
              <div className="peer-avg">
                <span className="peer-avg-label">Rata-rata deviasi kumulatif kelompok</span>
                <span className={'peer-avg-val ' + (avgDev < -cfg.dev ? 'tone-risk' : avgDev > cfg.dev ? 'tone-warn' : 'tone-ok')}>{f.pct(avgDev)}</span>
              </div>
              <ul className="peer-list">
                {list.map((r) => {
                  const gap = r.st.devKumNow - avgDev;
                  return (
                    <li key={r.s.kode}>
                      <button className="peer-name" onClick={() => openSatker(r.s.kode)}>{r.s.nama}</button>
                      <span className={'peer-dev ' + (Math.abs(r.st.devKumNow) > cfg.dev ? (r.st.devKumNow < 0 ? 'tone-risk' : 'tone-warn') : 'tone-ok')}>{f.pct(r.st.devKumNow)}</span>
                      <span className="peer-gap">{gap >= 0 ? '▲' : '▼'} {f.num(Math.abs(gap))} thd rerata</span>
                    </li>
                  );
                })}
              </ul>
              <p className="peer-note">
                Terbaik: <b>{best.s.nama}</b> · Perlu perhatian: <b>{worst.s.nama}</b>
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
window.BenchmarkView = BenchmarkView;
