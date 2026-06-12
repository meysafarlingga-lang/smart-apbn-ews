// views-detail.jsx — Analisis lengkap satu satker + what-if & rencana mitigasi
function WhatIfCard({ s, st, cfg }) {
  const f = EWS.fmt, D = EWS.data, R = D.REALIZED;
  const [uplift, setUplift] = React.useState(0);
  const baseJun = st.predJun;
  const adjJun = baseJun * (1 + uplift / 100);
  const cumRpd6 = st.cumRpd[R];
  const devKum6 = ((st.cumReal[R - 1] + adjJun - cumRpd6) / cumRpd6) * 100;
  const ikpa = Math.max(50, Math.min(100, 100 - Math.max(0, Math.abs(devKum6) - cfg.dev) * 2.5));
  // Skor risiko ulang dengan deviasi hasil simulasi
  const nDev = Math.min(1, Math.abs(devKum6) / 25);
  const wsum = cfg.w1 + cfg.w2 + cfg.w3 || 1;
  const score2 = (100 * (cfg.w1 * nDev + cfg.w2 * Math.min(1, st.vol / 20) + cfg.w3 * Math.min(1, st.mape / 20))) / wsum;
  const level2 = score2 >= cfg.tinggi ? 'merah' : score2 >= cfg.sedang ? 'kuning' : 'hijau';

  return (
    <Card title="Simulasi What-if & Optimasi" sub={'Geser untuk mensimulasikan percepatan/penundaan serapan ' + D.MONTHS[R] + ' terhadap baseline prediksi'}>
      <div className="whatif">
        <div className="whatif-slider">
          <label htmlFor={'wi-' + s.kode}>Penyesuaian serapan {D.MONTHS[R]}: <b>{f.pct(uplift, 0)}</b></label>
          <input id={'wi-' + s.kode} type="range" min="-30" max="60" step="5" value={uplift}
            onChange={(e) => setUplift(Number(e.target.value))} />
          <div className="whatif-scale"><span>Ditunda −30%</span><span>Baseline</span><span>Dipercepat +60%</span></div>
        </div>
        <div className="whatif-out">
          <div className="whatif-stat">
            <span className="stat-label">Realisasi {D.MONTHS[R]} (simulasi)</span>
            <span className="stat-value">{f.rp(adjJun)}</span>
          </div>
          <div className="whatif-stat">
            <span className="stat-label">Deviasi kumulatif s.d. {D.MONTHS[R]}</span>
            <span className={'stat-value ' + (devKum6 < -cfg.dev ? 'tone-risk' : devKum6 > cfg.dev ? 'tone-warn' : 'tone-ok')}>{f.pct(devKum6)}</span>
          </div>
          <div className="whatif-stat">
            <span className="stat-label">Indikasi nilai IKPA penyerapan</span>
            <span className={'stat-value ' + (ikpa >= 90 ? 'tone-ok' : ikpa >= 75 ? 'tone-warn' : 'tone-risk')}>{f.num(ikpa, 0)}</span>
          </div>
          <div className="whatif-stat">
            <span className="stat-label">Risk score hasil simulasi</span>
            <span className="stat-value">{Math.round(score2)} <Pill level={level2} /></span>
          </div>
        </div>
      </div>
      {st.upliftNeeded != null && (
        <p className="whatif-opt">
          Optimasi: agar deviasi kumulatif kembali ke ambang −{cfg.dev}%, realisasi {D.MONTHS[R]} perlu mencapai{' '}
          <b>RPD {f.pct(st.upliftNeeded, 0)}</b> (≈ {f.rp(s.rpd[R] * (1 + st.upliftNeeded / 100))}).
        </p>
      )}
    </Card>
  );
}

function DetailView({ model, kode, onBack }) {
  const f = EWS.fmt, D = EWS.data, R = D.REALIZED;
  const row = model.byKode[kode];
  if (!row) return <div className="page"><p className="empty">Satker tidak ditemukan.</p></div>;
  const { s, st, recs } = row;
  const cfg = model.cfg;
  const actions = recs.filter((r) => r.severity === 'merah' || r.severity === 'kuning');

  const komponen = [
    { label: 'Deviasi kumulatif', w: cfg.w1, n: Math.min(1, Math.abs(st.devKumNow) / 25), val: f.pct(st.devKumNow) },
    { label: 'Volatilitas', w: cfg.w2, n: Math.min(1, st.vol / 20), val: 'σ ' + f.num(st.vol) },
    { label: 'Error forecast (MAPE)', w: cfg.w3, n: Math.min(1, st.mape / 20), val: f.num(st.mape) + '%' },
  ];

  return (
    <div className="page" data-screen-label={'Detail Satker ' + s.nama}>
      <button className="back-btn" onClick={onBack}>← Kembali</button>

      <Card className="detail-head">
        <div className="detail-head-grid">
          <div>
            <h2 className="detail-name">{s.nama}</h2>
            <div className="detail-chips">
              <Chip>{s.kode}</Chip>
              <Chip>{s.kl}</Chip>
              <Chip>{s.grup}</Chip>
              <Chip tone={st.pattern === 'Sesuai rencana' ? 'ok' : 'warn'}>{st.pattern}</Chip>
            </div>
            <div className="detail-meta">
              <div><span>Pagu DIPA</span><b>{f.rp(s.pagu)}</b></div>
              <div><span>Realisasi s.d. Mei</span><b>{f.rp(st.cumReal[R - 1])} ({f.num(st.realPct)}%)</b></div>
              <div><span>Revisi Hal III DIPA</span><b>{s.revisi}× </b></div>
              <div><span>Median bulan serapan</span><b>{D.MONTHS[st.medianMonth]}</b></div>
            </div>
          </div>
          <div className="detail-gauge">
            <Gauge score={st.score} sedang={cfg.sedang} tinggi={cfg.tinggi} />
            <Pill level={st.level} />
            <ul className="komponen">
              {komponen.map((k) => (
                <li key={k.label}>
                  <span className="komp-label">{k.label} <em>bobot {k.w}</em></span>
                  <span className="komp-bar"><i style={{ width: k.n * 100 + '%' }}></i></span>
                  <span className="komp-val">{k.val}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="RPD vs Realisasi Kumulatif" sub={'Garis putus = RPD · titik emas = prediksi ' + D.MONTHS[R] + ' (regresi linier)'}>
          <LineKumulatif months={D.MONTHS} cumRpd={st.cumRpd} cumReal={st.cumReal} predCum={st.predCum} />
        </Card>
        <Card title="RPD vs Realisasi Bulanan" sub="Warna bar realisasi mengikuti status deviasi bulan tsb.">
          <GroupedBars months={D.MONTHS} rpd={s.rpd} real={s.real} threshold={cfg.dev} />
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Deviasi Bulanan" sub={'Pita hijau = zona aman ±' + cfg.dev + '%'}>
          <DevBars months={D.MONTHS.slice(0, R)} dev={st.devBulanan} threshold={cfg.dev} />
        </Card>
        <Card title="Forecast & Akurasi" sub="Prediksi bulan berjalan + error forecast historis (RPD sebagai forecast)">
          <div className="fc-grid">
            <div className="fc-stat"><span>Prediksi realisasi {D.MONTHS[R]}</span><b>{f.rp(st.predJun)}</b></div>
            <div className="fc-stat"><span>RPD {D.MONTHS[R]}</span><b>{f.rp(s.rpd[R])}</b></div>
            <div className="fc-stat"><span>Prediksi deviasi {D.MONTHS[R]}</span>
              <b className={Math.abs(st.predDev) > 4 ? 'tone-risk' : 'tone-ok'}>{f.pct(st.predDev)}</b></div>
            <div className="fc-stat"><span>MAE</span><b>{f.rp(st.mae)}</b></div>
            <div className="fc-stat"><span>MAPE</span><b>{f.num(st.mape)}%</b></div>
            <div className="fc-stat"><span>Rasio Q4 (proyeksi)</span>
              <b className={st.q4Ratio > cfg.q4 ? 'tone-risk' : 'tone-ok'}>{f.num(st.q4Ratio, 0)}%</b></div>
          </div>
          {Math.abs(st.predDev) > 4 && (
            <p className="fc-alert">Early alert aktif — prediksi deviasi melampaui ambang ±4%.</p>
          )}
          {st.anomali.length > 0 && (
            <p className="fc-anom">Anomali terdeteksi: {st.anomali.map((a) => D.MONTHS[a.m] + ' (' + f.pct(a.dev, 0) + ')').join(', ')}</p>
          )}
        </Card>
      </div>

      <WhatIfCard s={s} st={st} cfg={cfg} />

      <Card title="Analisis per Jenis Belanja" sub="Kumulatif s.d. Mei — rekomendasi tingkat akun dihasilkan otomatis">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Akun</th>
                <th className="num">Pagu</th>
                <th className="num">RPD s.d. Mei</th>
                <th className="num">Realisasi</th>
                <th className="num">Deviasi</th>
                <th>Rekomendasi</th>
              </tr>
            </thead>
            <tbody>
              {st.akun.map((a) => {
                const bad = a.devKum < -25;
                const rec = bad
                  ? (a.kode === '53' ? 'Segera proses kontrak fisik; periksa hambatan pengadaan' : 'Percepat penyelesaian tagihan & administrasi pembayaran')
                  : a.devKum > cfg.dev ? 'Mutakhirkan RPD akun ini' : 'Sesuai rencana';
                return (
                  <tr key={a.kode}>
                    <td><div className="cell-name">{a.nama}</div><div className="cell-sub">Akun {a.kode}</div></td>
                    <td className="num">{f.rp(a.pagu)}</td>
                    <td className="num">{f.rp(a.cumRpd)}</td>
                    <td className="num">{f.rp(a.cumReal)}</td>
                    <td className={'num strong ' + (a.devKum < -cfg.dev ? 'tone-risk' : a.devKum > cfg.dev ? 'tone-warn' : 'tone-ok')}>{f.pct(a.devKum)}</td>
                    <td className={bad ? 'tone-risk' : ''}>{rec}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Rencana Mitigasi Risiko Otomatis" sub="Langkah konkret hasil rule engine — urut prioritas">
        {actions.length === 0 ? (
          <p className="empty">Tidak ada tindakan mendesak — kinerja dalam ambang aman.</p>
        ) : (
          <div className="mitigasi">
            {actions.map((r) => (
              <div key={r.id} className={'mit-block sev-' + r.severity}>
                <div className="mit-head">
                  <Pill level={r.severity}>{r.severity === 'merah' ? 'Prioritas 1' : 'Prioritas 2'}</Pill>
                  <Chip>{r.kategori}</Chip>
                  <span className="mit-title">{r.judul}</span>
                </div>
                <ol className="alert-steps">
                  {r.langkah.map((l, i) => <li key={i}>{l}</li>)}
                </ol>
                {r.basis && <p className="alert-basis">Smart engine · {r.basis}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
window.DetailView = DetailView;
window.WhatIfCard = WhatIfCard;
