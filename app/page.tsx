'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Sparkles } from 'lucide-react';

type EnergyRow = { year: number; values: number[] };

const SOURCES = [
  { label: 'Altre rinnovabili', short: 'ALTRO', color: '#d9a7ef', ink: '#5c2068' },
  { label: 'Biocarburanti', short: 'BIO', color: '#1f765c', ink: '#ffffff' },
  { label: 'Solare', short: 'SOLARE', color: '#ffd42f', ink: '#6f4200' },
  { label: 'Eolica', short: 'EOLICA', color: '#aab7ff', ink: '#18227f' },
  { label: 'Idroelettrica', short: 'IDRICA', color: '#8fd9e7', ink: '#064f67' },
  { label: 'Nucleare', short: 'NUCLEARE', color: '#b9d64a', ink: '#235b38' },
  { label: 'Gas', short: 'GAS', color: '#f5abc9', ink: '#7b1644' },
  { label: 'Carbone', short: 'CARBONE', color: '#83501c', ink: '#fff0d5' },
  { label: 'Petrolio', short: 'PETROLIO', color: '#ff8e3a', ink: '#732800' },
] as const;

function parseRows(text: string): EnergyRow[] {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const cells = line.split(',');
    return { year: Number(cells[2]), values: cells.slice(3, 12).map((value) => Number(value) || 0) };
  }).filter((row) => Number.isFinite(row.year));
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
}

function donutPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const a = polar(cx, cy, outer, end); const b = polar(cx, cy, outer, start);
  const c = polar(cx, cy, inner, start); const d = polar(cx, cy, inner, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 0 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 1 ${d.x} ${d.y} Z`;
}

function KitDonut({ row, active, onActive }: { row: EnergyRow; active: number | null; onActive: (value: number | null) => void }) {
  const total = row.values.reduce((a, b) => a + b, 0); let angle = 0;
  const arcs = row.values.map((value, index) => { const start = angle; angle += total ? (value / total) * 360 : 0; return { start, end: angle, value, index }; });
  return (
    <svg className="kit-donut" viewBox="0 0 520 520" role="img" aria-label={`Mix energetico svizzero nel ${row.year}, totale ${total.toFixed(1)} terawattora`}>
      <defs><filter id="hard-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="-5" dy="6" stdDeviation="0" floodColor="#2b1609" floodOpacity=".9" /></filter></defs>
      <g filter="url(#hard-shadow)">{arcs.filter((arc) => arc.value > 0).map((arc) => (
        <path key={arc.index} d={donutPath(260, 260, active === arc.index ? 218 : 203, 105, arc.start + 1.3, arc.end - 1.3)} fill={SOURCES[arc.index].color} opacity={active === null || active === arc.index ? 1 : 0.25} className="donut-slice" onPointerEnter={() => onActive(arc.index)} onPointerLeave={() => onActive(null)} />
      ))}</g>
      <text x="260" y="245" textAnchor="middle" className="donut-total">{Math.round(total)}</text>
      <text x="260" y="286" textAnchor="middle" className="donut-unit">TWh</text>
    </svg>
  );
}

function Trend({ rows, index }: { rows: EnergyRow[]; index: number }) {
  if (rows.length < 2) return null;
  const values = rows.map((row) => row.values[index]); const max = Math.max(...values, 1);
  const points = values.map((value, i) => `${(i / (values.length - 1)) * 100},${38 - (value / max) * 32}`).join(' ');
  return <svg className="mini-trend" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /></svg>;
}

type ViewProps = { rows: EnergyRow[]; index: number; setIndex: (index: number) => void; playing: boolean; setPlaying: (playing: boolean) => void };

function KitProposal({ rows, index, setIndex, playing, setPlaying }: ViewProps) {
  const [active, setActive] = useState<number | null>(null); const row = rows[index];
  const total = row.values.reduce((a, b) => a + b, 0);
  return <section className="proposal kit-proposal" aria-labelledby="kit-title">
    <div className="proposal-copy"><p className="eyebrow">PROPOSTA 01 · FAMILIARE</p><h1 id="kit-title">L&apos;energia svizzera<br />cambia forma.</h1><p>Un&apos;evoluzione diretta del kit 4: stesso calore editoriale, ma con più contesto, confronto e precisione.</p></div>
    <div className="kit-stage"><div className="chart-wrap"><KitDonut row={row} active={active} onActive={setActive} /></div><div className="year-block"><span>ANNO</span><strong>{row.year}</strong></div></div>
    <div className="time-control"><button className="play-button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Metti in pausa' : 'Riproduci gli anni'}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><input aria-label="Anno" type="range" min="0" max={rows.length - 1} value={index} onChange={(event) => setIndex(Number(event.target.value))} /><div className="range-labels"><span>{rows[0].year}</span><span>{rows.at(-1)?.year}</span></div></div>
    <div className="source-strip">{SOURCES.map((source, sourceIndex) => { const value = row.values[sourceIndex]; const percent = total ? (value / total) * 100 : 0; return <button key={source.label} className="source-item" style={{ '--source': source.color, '--source-ink': source.ink } as React.CSSProperties} onPointerEnter={() => setActive(sourceIndex)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(sourceIndex)} onBlur={() => setActive(null)}><span className="source-bubble">{percent < 1 && value > 0 ? '<1' : Math.round(percent)}<small>%</small></span><span className="source-name">{source.short}</span><span className="source-value">{value.toFixed(1)} TWh</span></button>; })}</div>
  </section>;
}

function ArtisticProposal({ rows, index, setIndex, playing, setPlaying }: ViewProps) {
  const row = rows[index]; const [active, setActive] = useState(8);
  const maxValue = Math.max(...rows.flatMap((item) => item.values), 1); const total = row.values.reduce((a, b) => a + b, 0);
  const renewable = [0, 1, 2, 3, 4].reduce((sum, sourceIndex) => sum + row.values[sourceIndex], 0); const renewalShare = total ? (renewable / total) * 100 : 0;
  return <section className="proposal artistic-proposal" aria-labelledby="art-title">
    <div className="art-topline"><div><p className="eyebrow">PROPOSTA 02 · SPERIMENTALE</p><h1 id="art-title">Energy<br />playground</h1></div><p className="art-intro">Ogni fonte è un corpo elastico: più energia consuma, più spazio reclama. Trascina il tempo e guarda il sistema respirare.</p></div>
    <div className="playground" role="img" aria-label={`Campi energetici svizzeri nel ${row.year}`}><div className="year-ghost" aria-hidden="true">{row.year}</div><div className="orbit orbit-a" /><div className="orbit orbit-b" />
      {SOURCES.map((source, sourceIndex) => { const value = row.values[sourceIndex]; const size = 58 + Math.sqrt(value / maxValue) * 210; const angle = (sourceIndex / SOURCES.length) * Math.PI * 2 - Math.PI / 2; const rx = 34 + (sourceIndex % 3) * 5; const ry = 29 + ((sourceIndex + 1) % 3) * 5; const left = 50 + Math.cos(angle) * rx; const top = 50 + Math.sin(angle) * ry; return <button className={`energy-orb orb-${sourceIndex} ${active === sourceIndex ? 'is-active' : ''}`} key={source.label} style={{ width: size, height: size, left: `${left}%`, top: `${top}%`, '--orb': source.color, '--delay': `${sourceIndex * -0.35}s` } as React.CSSProperties} onClick={() => setActive(sourceIndex)} aria-label={`${source.label}: ${value.toFixed(1)} terawattora`}><span>{source.short}</span><strong>{value.toFixed(1)}</strong><small>TWh</small></button>; })}
      <div className="art-readout" aria-live="polite"><span>{SOURCES[active].label}</span><strong>{row.values[active].toFixed(1)} <small>TWh</small></strong><Trend rows={rows.slice(0, index + 1)} index={active} /></div>
    </div>
    <div className="art-controls"><button className="art-play" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'PAUSA' : 'PLAY'}</button><label><span>VIAGGIA NEL TEMPO</span><strong>{row.year}</strong><input aria-label="Anno" type="range" min="0" max={rows.length - 1} value={index} onChange={(event) => setIndex(Number(event.target.value))} /></label><div className="renewable-meter"><span>RINNOVABILI</span><strong>{renewalShare.toFixed(0)}%</strong><i style={{ width: `${renewalShare}%` }} /></div></div>
  </section>;
}

export default function Home() {
  const [rows, setRows] = useState<EnergyRow[]>([]); const [proposal, setProposal] = useState<'kit' | 'art'>('kit'); const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false);
  useEffect(() => { fetch('/data/switzerland-energy.csv').then((response) => response.text()).then((text) => { const parsed = parseRows(text); setRows(parsed); setIndex(Math.max(0, parsed.length - 1)); }); }, []);
  useEffect(() => { if (!playing || !rows.length) return; const timer = window.setInterval(() => setIndex((current) => (current + 1) % rows.length), 650); return () => window.clearInterval(timer); }, [playing, rows.length]);
  const currentYear = useMemo(() => rows[index]?.year ?? '—', [rows, index]);
  return <main className={proposal === 'kit' ? 'app kit-theme' : 'app art-theme'}><header className="site-header"><a className="brand" href="#" aria-label="Energy Atlas, torna all'inizio"><span>EA</span><b>ENERGY<br />ATLAS</b></a><nav aria-label="Scegli proposta"><button className={proposal === 'kit' ? 'active' : ''} onClick={() => setProposal('kit')}><span>01</span> Evoluzione kit 4</button><button className={proposal === 'art' ? 'active' : ''} onClick={() => setProposal('art')}><span>02</span> Energy playground <Sparkles size={14} /></button></nav><div className="header-year">SVIZZERA · {currentYear}</div></header>
    {!rows.length ? <div className="loading">Sto accendendo i dati…</div> : proposal === 'kit' ? <KitProposal rows={rows} index={index} setIndex={setIndex} playing={playing} setPlaying={setPlaying} /> : <ArtisticProposal rows={rows} index={index} setIndex={setIndex} playing={playing} setPlaying={setPlaying} />}
    <footer><span>DATI: ENERGY INSTITUTE (2024) · OUR WORLD IN DATA</span><span>1965—2023 · CONSUMO DI ENERGIA PRIMARIA</span></footer></main>;
}
