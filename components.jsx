// components.jsx — Komponen UI & chart SVG bersama
const { useState, useMemo } = React;

// ——— Primitif UI ———
function Card({ title, sub, right, children, className }) {
  return (
    <section className={'card' + (className ? ' ' + className : '')}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {right && <div className="card-right">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

function Pill({ level, children }) {
  const label = { merah: 'Risiko Tinggi', kuning: 'Risiko Sedang', hijau: 'Risiko Rendah', info: 'Info' };
  return <span className={'pill pill-' + level}>{children || label[level]}</span>;
}

function Chip({ children, tone }) {
  return <span className={'chip' + (tone ? ' chip-' + tone : '')}>{children}</span>;
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={'stat-value' + (tone ? ' tone-' + tone : '')}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function Emblem({ size }) {
  const s = size || 38;
  return (
    <div className="emblem" style={{ width: s, height: s }} aria-hidden="true">
      <div className="emblem-diamond"></div>
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={value === o.id}
          className={'seg-btn' + (value === o.id ? ' active' : '')}
          onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

// ——— Helper skala ———
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
const fmtAxis = (v) => (Math.abs(v) >= 1e9 ? EWS.fmt.num(v / 1e9, 0) + ' M' : EWS.fmt.num(v / 1e6, 0) + ' jt');

// ——— Grafik kumulatif RPD vs Realisasi + titik prediksi ———
function LineKumulatif({ months, cumRpd, cumReal, predCum, h }) {
  const W = 660, H = h || 230, padL = 52, padR = 16, padT = 14, padB = 26;
  const R = cumReal.length;
  const maxY = niceMax(Math.max(cumRpd[cumRpd.length - 1], predCum || 0) * 1.02);
  const x = (i) => padL + (i * (W - padL - padR)) / (months.length - 1);
  const y = (v) => padT + (1 - v / maxY) * (H - padT - padB);
  const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(v)).join(' ');
  const grid = [0.25, 0.5, 0.75, 1].map((g) => g * maxY);
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="chart" role="img" aria-label="Grafik kumulatif RPD vs realisasi">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} className="gridline"></line>
          <text x={padL - 6} y={y(g) + 3} className="axis" textAnchor="end">{fmtAxis(g)}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m} x={x(i)} y={H - 8} className="axis" textAnchor="middle">{m}</text>
      ))}
      <path d={path(cumRpd)} fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeDasharray="5 4"></path>
      <path d={path(cumReal)} fill="none" stroke="var(--navy)" strokeWidth="2.4"></path>
      {cumReal.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--navy)"></circle>)}
      {predCum != null && (
        <g>
          <line x1={x(R - 1)} y1={y(cumReal[R - 1])} x2={x(R)} y2={y(predCum)} stroke="var(--accent)" strokeWidth="2.2" strokeDasharray="4 4"></line>
          <circle cx={x(R)} cy={y(predCum)} r="4.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.2"></circle>
          <text x={x(R)} y={y(predCum) - 9} className="axis accent" textAnchor="middle">prediksi</text>
        </g>
      )}
    </svg>
  );
}

// ——— Bar bulanan berpasangan RPD vs Realisasi ———
function GroupedBars({ months, rpd, real, threshold }) {
  const W = 660, H = 210, padL = 52, padR = 10, padT = 12, padB = 26;
  const maxY = niceMax(Math.max(...rpd, ...real) * 1.05);
  const bw = (W - padL - padR) / months.length;
  const y = (v) => padT + (1 - v / maxY) * (H - padT - padB);
  const grid = [0.5, 1].map((g) => g * maxY);
  const barTone = (i) => {
    if (i >= real.length) return null;
    const d = ((real[i] - rpd[i]) / rpd[i]) * 100;
    return d < -threshold ? 'var(--risk)' : d > threshold ? 'var(--warn)' : 'var(--ok)';
  };
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="chart" role="img" aria-label="Bar RPD vs realisasi per bulan">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} className="gridline"></line>
          <text x={padL - 6} y={y(g) + 3} className="axis" textAnchor="end">{fmtAxis(g)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const cx = padL + i * bw;
        return (
          <g key={m}>
            <rect x={cx + bw * 0.16} width={bw * 0.3} y={y(rpd[i])} height={H - padB - y(rpd[i])} fill="var(--navy-100)" stroke="var(--line)" strokeWidth="0.5">
              <title>{'RPD ' + m + ': ' + EWS.fmt.rp(rpd[i])}</title>
            </rect>
            {i < real.length && (
              <rect x={cx + bw * 0.52} width={bw * 0.3} y={y(real[i])} height={H - padB - y(real[i])} fill={barTone(i)}>
                <title>{'Realisasi ' + m + ': ' + EWS.fmt.rp(real[i])}</title>
              </rect>
            )}
            <text x={cx + bw / 2} y={H - 8} className="axis" textAnchor="middle">{m}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ——— Bar divergen deviasi bulanan dengan pita ambang ———
function DevBars({ months, dev, threshold }) {
  const W = 660, H = 210, padL = 44, padR = 10, padT = 12, padB = 26;
  const maxAbs = niceMax(Math.max(threshold * 1.6, ...dev.map((d) => Math.abs(d))) * 1.1);
  const bw = (W - padL - padR) / months.length;
  const y = (v) => padT + (1 - (v + maxAbs) / (2 * maxAbs)) * (H - padT - padB);
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="chart" role="img" aria-label="Deviasi bulanan">
      <rect x={padL} y={y(threshold)} width={W - padL - padR} height={y(-threshold) - y(threshold)} fill="var(--ok-bg)"></rect>
      {[maxAbs, 0, -maxAbs].map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} className={g === 0 ? 'zeroline' : 'gridline'}></line>
          <text x={padL - 6} y={y(g) + 3} className="axis" textAnchor="end">{EWS.fmt.num(g, 0) + '%'}</text>
        </g>
      ))}
      {dev.map((d, i) => {
        const tone = d < -threshold ? 'var(--risk)' : d > threshold ? 'var(--warn)' : 'var(--ok)';
        const top = Math.min(y(0), y(d));
        return (
          <g key={i}>
            <rect x={padL + i * bw + bw * 0.26} width={bw * 0.48} y={top} height={Math.max(1.5, Math.abs(y(d) - y(0)))} fill={tone} rx="1.5">
              <title>{months[i] + ': ' + EWS.fmt.pct(d)}</title>
            </rect>
            <text x={padL + i * bw + bw / 2} y={H - 8} className="axis" textAnchor="middle">{months[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ——— Donut distribusi risiko ———
function Donut({ counts }) {
  const total = counts.merah + counts.kuning + counts.hijau || 1;
  const C = 2 * Math.PI * 42;
  let off = 0;
  const seg = (n, color, key) => {
    const len = (n / total) * C;
    const el = <circle key={key} cx="60" cy="60" r="42" fill="none" stroke={color} strokeWidth="16" strokeDasharray={len + ' ' + (C - len)} strokeDashoffset={-off} transform="rotate(-90 60 60)"></circle>;
    off += len;
    return el;
  };
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut" role="img" aria-label="Distribusi risiko satker">
        {seg(counts.merah, 'var(--risk)', 'm')}
        {seg(counts.kuning, 'var(--warn)', 'k')}
        {seg(counts.hijau, 'var(--ok)', 'h')}
        <text x="60" y="57" textAnchor="middle" className="donut-num">{total}</text>
        <text x="60" y="73" textAnchor="middle" className="donut-cap">satker</text>
      </svg>
      <ul className="legend">
        <li><i style={{ background: 'var(--risk)' }}></i>Tinggi <b>{counts.merah}</b></li>
        <li><i style={{ background: 'var(--warn)' }}></i>Sedang <b>{counts.kuning}</b></li>
        <li><i style={{ background: 'var(--ok)' }}></i>Rendah <b>{counts.hijau}</b></li>
      </ul>
    </div>
  );
}

// ——— Gauge risk score ———
function Gauge({ score, sedang, tinggi }) {
  const cx = 80, cy = 78, r = 58;
  const pt = (a) => [cx + r * Math.cos((Math.PI * a) / 180), cy - r * Math.sin((Math.PI * a) / 180)];
  const arc = (a0, a1) => {
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    return 'M ' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1;
  };
  const ang = (s) => 180 - s * 1.8;
  const needle = ang(Math.min(100, score));
  const [nx, ny] = [cx + (r - 14) * Math.cos((Math.PI * needle) / 180), cy - (r - 14) * Math.sin((Math.PI * needle) / 180)];
  return (
    <svg viewBox="0 0 160 96" className="gauge" role="img" aria-label={'Risk score ' + Math.round(score)}>
      <path d={arc(180, ang(sedang))} fill="none" stroke="var(--ok)" strokeWidth="11" strokeLinecap="round"></path>
      <path d={arc(ang(sedang), ang(tinggi))} fill="none" stroke="var(--warn)" strokeWidth="11"></path>
      <path d={arc(ang(tinggi), 0)} fill="none" stroke="var(--risk)" strokeWidth="11" strokeLinecap="round"></path>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth="2.6"></line>
      <circle cx={cx} cy={cy} r="4.5" fill="var(--text)"></circle>
      <text x={cx} y={cy - 18} textAnchor="middle" className="gauge-num">{Math.round(score)}</text>
    </svg>
  );
}

// ——— Bar ranking horizontal ———
function RankRow({ label, sub, value, valueLabel, max, tone, onClick, rank }) {
  return (
    <button className="rank-row" onClick={onClick}>
      <span className="rank-num">{rank}</span>
      <span className="rank-label">
        <span className="rank-name">{label}</span>
        {sub && <span className="rank-sub">{sub}</span>}
      </span>
      <span className="rank-bar"><i style={{ width: Math.max(2, (Math.abs(value) / max) * 100) + '%', background: tone }}></i></span>
      <span className="rank-val" style={{ color: tone }}>{valueLabel}</span>
    </button>
  );
}

Object.assign(window, {
  Card, Pill, Chip, Stat, Emblem, Segmented,
  LineKumulatif, GroupedBars, DevBars, Donut, Gauge, RankRow, niceMax,
});
