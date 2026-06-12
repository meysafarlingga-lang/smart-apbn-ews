// app.jsx — Shell aplikasi Smart APBN Governance EWS
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dev": 5,
  "q4": 40,
  "w1": 50,
  "w2": 25,
  "w3": 25,
  "sedang": 35,
  "tinggi": 65,
  "accent": "#C9A227"
} /*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = React.useState('dashboard');
  const [sel, setSel] = React.useState(null);

  const cfg = React.useMemo(
    () => ({ dev: t.dev, q4: t.q4, w1: t.w1, w2: t.w2, w3: t.w3, sedang: t.sedang, tinggi: t.tinggi }),
    [t.dev, t.q4, t.w1, t.w2, t.w3, t.sedang, t.tinggi]
  );
  const model = React.useMemo(() => EWS.analytics.buildAll(cfg), [cfg]);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.accent]);

  const openSatker = (kode) => {setSel(kode);setView('detail');window.scrollTo(0, 0);};
  const nav = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'benchmark', label: 'Benchmarking' },
  { id: 'alerts', label: 'Pusat Alert' }];

  const alertCount = model.agg.alerts.filter((a) => a.severity === 'merah').length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Emblem />
            <div>
              <div className="brand-name">Smart APBN Governance</div>
              <div className="brand-sub">Early Warning System Pelaksanaan Anggaran</div>
            </div>
          </div>
          <div className="topbar-meta">
            <div className="meta-line">KPPN PALU · Kanwil DJPb Sulteng</div>
            <div className="meta-line dim">TA 2026 · Data s.d. Mei · Diperbarui 12 Juni 2026</div>
          </div>
        </div>
      </header>

      <nav className="navbar">
        <div className="navbar-inner">
          {nav.map((n) =>
          <button key={n.id} className={'nav-tab' + (view === n.id ? ' active' : '')}
          onClick={() => {setView(n.id);setSel(null);window.scrollTo(0, 0);}}>
              {n.label}
              {n.id === 'alerts' && alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
            </button>
          )}
        </div>
      </nav>

      <main className="main">
        {view === 'dashboard' && <DashboardView model={model} openSatker={openSatker} />}
        {view === 'benchmark' && <BenchmarkView model={model} openSatker={openSatker} />}
        {view === 'alerts' && <AlertsView model={model} openSatker={openSatker} />}
        {view === 'detail' && <DetailView model={model} kode={sel} onBack={() => setView('dashboard')} />}
      </main>

      <footer className="footer">Prototipe demonstrasi · Data simulasi (bukan data riil) · Analisis preskriptif: deviasi, volatilitas, MAE/MAPE, regresi linier, rule engine</footer>

      <TweaksPanel>
        <TweakSection label="Ambang Batas" />
        <TweakSlider label="Ambang deviasi" value={t.dev} min={3} max={10} step={1} unit="%" onChange={(v) => setTweak('dev', v)} />
        <TweakSlider label="Ambang rasio Q4" value={t.q4} min={30} max={50} step={1} unit="%" onChange={(v) => setTweak('q4', v)} />
        <TweakSection label="Bobot Risk Score" />
        <TweakSlider label="Bobot deviasi" value={t.w1} min={0} max={100} step={5} onChange={(v) => setTweak('w1', v)} />
        <TweakSlider label="Bobot volatilitas" value={t.w2} min={0} max={100} step={5} onChange={(v) => setTweak('w2', v)} />
        <TweakSlider label="Bobot error forecast" value={t.w3} min={0} max={100} step={5} onChange={(v) => setTweak('w3', v)} />
        <TweakSection label="Klasifikasi Skor" />
        <TweakSlider label="Batas risiko sedang" value={t.sedang} min={20} max={60} step={5} onChange={(v) => setTweak('sedang', v)} />
        <TweakSlider label="Batas risiko tinggi" value={t.tinggi} min={50} max={90} step={5} onChange={(v) => setTweak('tinggi', v)} />
        <TweakSection label="Tampilan" />
        <TweakColor label="Warna aksen" value={t.accent} options={['#C9A227', '#2C7A7B', '#2A6FDB']} onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);