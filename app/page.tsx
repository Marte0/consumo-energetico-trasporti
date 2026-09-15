'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Route, Sparkles } from 'lucide-react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

type EnergyRow = { year: number; values: number[] };

const SOURCES = [
  { label: 'Benzina', short: 'BENZINA', color: '#ff9233', ink: '#6d2d00', image: 'Pompa di benzina' },
  { label: 'Diesel', short: 'DIESEL', color: '#804600', ink: '#ffd12e', image: 'Tanica di diesel' },
  { label: 'Carburanti per l’aviazione', short: 'AVIAZIONE', color: '#acb5f8', ink: '#142182', image: 'Aereo in volo' },
  { label: 'Elettricità · traffico privato', short: 'ELETTRICO AUTO', color: '#ffd12e', ink: '#6d4300', image: 'Auto elettrica' },
  { label: 'Elettricità · altri trasporti', short: 'ELETTRICO PUBBLICO', color: '#95d9e5', ink: '#005573', image: 'Treno elettrico' },
  { label: 'Gas e altre fonti', short: 'GAS + ALTRO', color: '#e5b2ff', ink: '#631f66', image: 'Serbatoio di gas' },
] as const;

const chartConfig = Object.fromEntries(SOURCES.map((source, index) => [String(index), { label: source.label, color: source.color }])) as ChartConfig;
const formatTJ = (value: number) => new Intl.NumberFormat('it-CH', { maximumFractionDigits: 0 }).format(value);

function parseRows(text: string): EnergyRow[] {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const cells = line.split(',');
    return { year: Number(cells[0]), values: cells.slice(1, 7).map((value) => Number(value) || 0) };
  }).filter((row) => Number.isFinite(row.year));
}

type SharedProps = {
  rows: EnergyRow[];
  index: number;
  setIndex: (index: number) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
};

function KitVersion({ rows, index, setIndex, playing, setPlaying }: SharedProps) {
  const row = rows[index];
  const [active, setActive] = useState<number | null>(null);
  const total = row.values.reduce((sum, value) => sum + value, 0);
  const chartData = row.values.map((value, sourceIndex) => ({ value, sourceIndex, percent: total ? (value / total) * 100 : 0 })).filter((item) => item.percent >= 1);

  return (
    <section className="kit-view" aria-labelledby="kit-title">
      <header className="kit-heading">
        <p>CONSUMO ENERGETICO DEI TRASPORTI</p>
        <h1 id="kit-title">SECONDO IL VETTORE ENERGETICO</h1>
      </header>

      <div className="kit-chart-area">
        <ChartContainer config={chartConfig} className="donut-container" initialDimension={{ width: 470, height: 470 }}>
          <PieChart accessibilityLayer>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="sourceIndex"
              cx="50%"
              cy="50%"
              innerRadius="42%"
              outerRadius="78%"
              cornerRadius={11}
              paddingAngle={2.2}
              stroke="none"
              animationDuration={520}
              animationEasing="ease-out"
              onMouseEnter={(_, chartIndex) => setActive(chartData[chartIndex].sourceIndex)}
              onMouseLeave={() => setActive(null)}
            >
              {chartData.map((item) => <Cell key={item.sourceIndex} fill={SOURCES[item.sourceIndex].color} opacity={active === null || active === item.sourceIndex ? 1 : 0.24} className="kit-sector" />)}
            </Pie>
            <Tooltip cursor={false} content={({ active: isOpen, payload }) => {
              if (!isOpen || !payload?.[0]) return null;
              const item = payload[0].payload as { value: number; sourceIndex: number; percent: number };
              return <div className="kit-tooltip"><b>{SOURCES[item.sourceIndex].label}</b><span>{formatTJ(item.value)} TJ · {item.percent.toFixed(1)}%</span></div>;
            }} />
          </PieChart>
        </ChartContainer>
        <div className="donut-center" aria-live="polite"><strong>{formatTJ(total)}</strong><span>TJ</span></div>
      </div>

      <div className="kit-timeline">
        <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Metti in pausa' : 'Riproduci gli anni'}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
        <label><input aria-label="Anno" type="range" min="0" max={rows.length - 1} value={index} onChange={(event) => setIndex(Number(event.target.value))} /><strong>{row.year}</strong></label>
      </div>

      <div className="kit-sources">
        {SOURCES.map((source, sourceIndex) => {
          const value = row.values[sourceIndex]; const percent = total ? (value / total) * 100 : 0;
          return <button key={source.label} className={active === sourceIndex ? 'is-active' : ''} onPointerEnter={() => setActive(sourceIndex)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(sourceIndex)} onBlur={() => setActive(null)} style={{ '--source': source.color, '--source-ink': source.ink } as React.CSSProperties}>
            <span className="kit-percent">{percent < 1 && value > 0 ? '<1' : Math.round(percent)}<small>%</small></span>
            <span className="image-placeholder">IMMAGINE:<br />{source.image}</span>
            <b>{source.short}</b><small>{formatTJ(value)} TJ</small>
          </button>;
        })}
      </div>
    </section>
  );
}

function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index]; const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function buildStreams(rows: EnergyRow[]) {
  const width = 1000; const height = 520; const top = 28; const bottom = 478;
  const totals = rows.map((row) => row.values.reduce((sum, value) => sum + value, 0));
  const maxTotal = Math.max(...totals) * 1.04;
  return SOURCES.map((_, sourceIndex) => {
    const upper: { x: number; y: number }[] = []; const lower: { x: number; y: number }[] = [];
    rows.forEach((row, rowIndex) => {
      const x = 24 + (rowIndex / (rows.length - 1)) * (width - 48);
      const before = row.values.slice(0, sourceIndex).reduce((sum, value) => sum + value, 0);
      const after = before + row.values[sourceIndex];
      upper.push({ x, y: top + (before / maxTotal) * (bottom - top) });
      lower.push({ x, y: top + (after / maxTotal) * (bottom - top) });
    });
    return `${smoothPath(upper)} ${smoothPath([...lower].reverse()).replace(/^M/, 'L')} Z`;
  });
}

function FlowVersion({ rows, index, setIndex, playing, setPlaying }: SharedProps) {
  const row = rows[index]; const [active, setActive] = useState<number | null>(null);
  const paths = useMemo(() => buildStreams(rows), [rows]);
  const x = 24 + (index / (rows.length - 1)) * 952;
  const total = row.values.reduce((sum, value) => sum + value, 0);
  const electric = row.values[3] + row.values[4];
  const firstElectric = rows[0].values[3] + rows[0].values[4];
  const electricDelta = firstElectric ? ((electric / firstElectric) - 1) * 100 : 0;

  return (
    <section className="flow-view" aria-labelledby="flow-title">
      <div className="flow-heading">
        <div><p>PROPOSTA 02 · DATA STORY</p><h1 id="flow-title">LE STRADE<br />DELL&apos;ENERGIA</h1></div>
        <p>Ventisei anni diventano un&apos;infrastruttura visiva: ogni corsia è un vettore, il suo spessore racconta quanto muove i trasporti.</p>
      </div>

      <div className="flow-chart">
        <div className="flow-year" aria-live="polite"><span>ANNO SELEZIONATO</span><strong>{row.year}</strong><small>{formatTJ(total)} TJ TOTALI</small></div>
        <svg viewBox="0 0 1000 520" preserveAspectRatio="none" role="img" aria-label={`Flusso del consumo energetico dei trasporti dal ${rows[0].year} al ${rows.at(-1)?.year}`}>
          <defs><filter id="road-shadow"><feDropShadow dx="0" dy="9" stdDeviation="8" floodOpacity=".2" /></filter></defs>
          {[0, 1, 2, 3, 4].map((grid) => <line key={grid} x1="24" x2="976" y1={28 + grid * 112.5} y2={28 + grid * 112.5} className="flow-grid" />)}
          <g filter="url(#road-shadow)">{paths.map((path, sourceIndex) => <path key={sourceIndex} d={path} fill={SOURCES[sourceIndex].color} opacity={active === null || active === sourceIndex ? 1 : .12} className="flow-stream" onPointerEnter={() => setActive(sourceIndex)} onPointerLeave={() => setActive(null)} onClick={() => setActive(active === sourceIndex ? null : sourceIndex)} />)}</g>
          <line x1={x} x2={x} y1="18" y2="492" className="flow-cursor" />
          <circle cx={x} cy="498" r="8" className="flow-cursor-dot" />
          <text x="24" y="514" className="flow-axis">{rows[0].year}</text><text x="976" y="514" textAnchor="end" className="flow-axis">{rows.at(-1)?.year}</text>
        </svg>
        <input className="flow-scrubber" aria-label="Esplora l'anno" type="range" min="0" max={rows.length - 1} value={index} onChange={(event) => setIndex(Number(event.target.value))} />
        <div className="flow-legend">{SOURCES.map((source, sourceIndex) => <button key={source.label} className={active === sourceIndex ? 'is-active' : ''} onClick={() => setActive(active === sourceIndex ? null : sourceIndex)}><i style={{ background: source.color }} /><span>{source.label}</span><b>{formatTJ(row.values[sourceIndex])}</b></button>)}</div>
      </div>

      <aside className="flow-aside">
        <button className="flow-play" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'FERMA IL TEMPO' : 'METTI IN MOTO'}</button>
        <div className="flow-stat"><span>ELETTRICITÀ</span><strong>{formatTJ(electric)} <small>TJ</small></strong><p>{electricDelta >= 0 ? '+' : ''}{electricDelta.toFixed(0)}% rispetto al 2000</p></div>
        <div className="flow-stat"><span>VETTORE PRINCIPALE</span><strong>{SOURCES[row.values.indexOf(Math.max(...row.values))].label}</strong><p>{((Math.max(...row.values) / total) * 100).toFixed(1)}% del totale</p></div>
        <div className="flow-note"><Route size={18} /><p>Clicca una corsia per seguirla lungo tutta la serie storica.</p></div>
      </aside>
    </section>
  );
}

export default function Home() {
  const [rows, setRows] = useState<EnergyRow[]>([]); const [mode, setMode] = useState<'kit' | 'flow'>('kit');
  const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(false);
  useEffect(() => { fetch('/data/trasporti-vettore-2000-2025.csv').then((response) => response.text()).then((text) => { const parsed = parseRows(text); setRows(parsed); setIndex(parsed.length - 1); }); }, []);
  useEffect(() => { if (!playing || !rows.length) return; const timer = window.setInterval(() => setIndex((current) => (current + 1) % rows.length), 720); return () => window.clearInterval(timer); }, [playing, rows.length]);
  return <main className={`app ${mode === 'kit' ? 'kit-theme' : 'flow-theme'}`}>
    <nav className="mode-switch" aria-label="Scegli l'infografica"><button className={mode === 'kit' ? 'active' : ''} onClick={() => setMode('kit')}><span>01</span> KIT 4</button><button className={mode === 'flow' ? 'active' : ''} onClick={() => setMode('flow')}><span>02</span> ENERGY ROADS <Sparkles size={13} /></button></nav>
    {!rows.length ? <div className="loading">CARICAMENTO DATI…</div> : mode === 'kit' ? <KitVersion rows={rows} index={index} setIndex={setIndex} playing={playing} setPlaying={setPlaying} /> : <FlowVersion rows={rows} index={index} setIndex={setIndex} playing={playing} setPlaying={setPlaying} />}
    <footer><span>CONSUMO ENERGETICO DEI TRASPORTI SECONDO IL VETTORE ENERGETICO</span><span>2000—2025 · TERAJOULE</span></footer>
  </main>;
}
