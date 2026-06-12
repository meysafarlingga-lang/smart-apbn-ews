// views-alerts.jsx — Pusat alert & rekomendasi terpusat
function AlertCard({ rec, openSatker }) {
  return (
    <article className={'alert-card sev-' + rec.severity}>
      <header className="alert-head">
        <Pill level={rec.severity}>{rec.severity === 'merah' ? 'Merah' : rec.severity === 'kuning' ? 'Kuning' : rec.severity === 'hijau' ? 'Hijau' : 'Info'}</Pill>
        <Chip>{rec.kategori}</Chip>
        <button className="link-btn alert-satker" onClick={() => openSatker(rec.satker.kode)}>
          {rec.satker.nama} ({rec.satker.kode}) →
        </button>
      </header>
      <h4 className="alert-title">{rec.judul}</h4>
      <p className="alert-detail">{rec.detail}</p>
      {rec.langkah.length > 0 && (
        <ol className="alert-steps">
          {rec.langkah.map((l, i) => <li key={i}>{l}</li>)}
        </ol>
      )}
      {rec.basis && <p className="alert-basis">Smart engine · {rec.basis}</p>}
    </article>
  );
}

function AlertsView({ model, openSatker }) {
  const { agg } = model;
  const [filter, setFilter] = React.useState('semua');
  const alerts = agg.alerts.filter((a) => a.severity !== 'hijau');
  const counts = { merah: 0, kuning: 0, info: 0 };
  alerts.forEach((a) => counts[a.severity]++);
  const shown = filter === 'semua' ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="page page-narrow" data-screen-label="Pusat Alert & Rekomendasi">
      <div className="alert-summary">
        <Stat label="Alert Merah" value={counts.merah} tone="risk" sub="Butuh tindakan segera" />
        <Stat label="Alert Kuning" value={counts.kuning} tone="warn" sub="Perlu pemantauan ketat" />
        <Stat label="Catatan / Info" value={counts.info} sub="Anomali & pola perilaku" />
      </div>
      <div className="alert-filter">
        <Segmented value={filter} onChange={setFilter} options={[
          { id: 'semua', label: 'Semua (' + alerts.length + ')' },
          { id: 'merah', label: 'Merah (' + counts.merah + ')' },
          { id: 'kuning', label: 'Kuning (' + counts.kuning + ')' },
          { id: 'info', label: 'Info (' + counts.info + ')' },
        ]} />
      </div>
      <div className="alert-feed">
        {shown.map((rec) => <AlertCard key={rec.id} rec={rec} openSatker={openSatker} />)}
        {shown.length === 0 && <p className="empty">Tidak ada alert pada kategori ini.</p>}
      </div>
    </div>
  );
}
window.AlertsView = AlertsView;
