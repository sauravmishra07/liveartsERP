/**
 * Chart.js wrappers for the dashboard.
 *
 * Three things worth knowing before editing:
 *
 * 1. Charts are driven imperatively via `useChart`, not react-chartjs-2. Under React 19
 *    StrictMode that wrapper double-mounts and leaves a destroyed chart bound to a live
 *    canvas (blank charts). A symmetric create-in-effect / destroy-in-cleanup pair is
 *    correct in both StrictMode and production.
 * 2. `animation: false` is deliberate, not laziness. StrictMode's create → destroy →
 *    create cycle leaves Chart.js's shared animator loop stalled, so the second instance
 *    never paints its first frame — charts render blank. Disabling the entry animation
 *    makes the first paint synchronous and behaves identically in dev and production.
 *    Hover/tooltip interactions are unaffected.
 * 3. Canvas cannot read CSS custom properties, so `useTokens` resolves the design-system
 *    vars to concrete colours and re-resolves when the `dark` class flips. Callers pass
 *    `var(--chart-N)` and this module resolves it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  LineController,
  BarController,
  DoughnutController,
  Filler,
  Tooltip,
  Legend,
);

const UI_FONT = "'Outfit', 'Segoe UI', system-ui, -apple-system, sans-serif";
const DISPLAY_FONT = "'Roboto Slab', Rockwell, Georgia, 'Times New Roman', serif";

ChartJS.defaults.font.family = UI_FONT;
ChartJS.defaults.font.size = 11;

/**
 * Value labels above each bar — the reference prints the figure on the bar rather
 * than making you read it off the axis.
 */
ChartJS.register({
  id: 'barValueLabels',
  afterDatasetsDraw(chart, _args, opts) {
    if (!opts?.enabled) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = `700 11px ${UI_FONT}`;
    ctx.fillStyle = opts.color;
    ctx.textAlign = 'center';
    chart.data.datasets.forEach((ds, di) => {
      if (!chart.isDatasetVisible(di)) return;
      chart.getDatasetMeta(di).data.forEach((bar, i) => {
        const v = ds.data[i];
        if (!v) return; // don't clutter the baseline with zeros
        ctx.fillText(opts.format ? opts.format(v) : v, bar.x, bar.y - 6);
      });
    });
    ctx.restore();
  },
});

/** Draws the total (or the hovered slice) in the doughnut hole. */
ChartJS.register({
  id: 'centerText',
  afterDraw(chart, _args, opts) {
    if (!opts?.enabled) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const i = chart.getActiveElements?.()[0]?.index;
    const value = i === undefined ? opts.total : chart.data.datasets[0].data[i];
    const label =
      i === undefined
        ? opts.label
        : `${Math.round((chart.data.datasets[0].data[i] / opts.total) * 100)}% ${chart.data.labels[i]}`;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = opts.valueColor;
    ctx.font = `750 24px ${DISPLAY_FONT}`; // display figures use the slab, as in the reference
    ctx.fillText(String(value ?? ''), x, y + 4);
    ctx.fillStyle = opts.labelColor;
    ctx.font = `600 9.5px ${UI_FONT}`;
    ctx.letterSpacing = '0.4px';
    ctx.fillText((label ?? '').toUpperCase(), x, y + 22);
    ctx.restore();
  },
});

const TOKENS = [
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6',
  '--border', '--muted-foreground', '--foreground', '--card', '--popover', '--muted',
];

/** Resolved design-system colours, kept in sync with the active theme. */
function useTokens() {
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(TOKENS.map((t) => [t, cs.getPropertyValue(t).trim()]));
  };
  const [tokens, setTokens] = useState(read);

  useEffect(() => {
    const ob = new MutationObserver(() => setTokens(read()));
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => ob.disconnect();
  }, []);

  return tokens;
}

/**
 * Creates the chart once and mutates it thereafter — recreating on every data change
 * would restart animations and thrash the canvas.
 */
function useChart(type, data, options) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    // Callers render <Empty/> instead of a canvas when there is no data.
    if (!canvasRef.current) return;
    const chart = new ChartJS(canvasRef.current, { type, data, options });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
    // Data/options are pushed by the effect below; only `type` warrants a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data = data;
    chart.options = options;
    chart.update();
  }, [data, options]);

  return canvasRef;
}

/** `var(--x)` → its resolved value; anything else passes through. */
function resolve(color, tokens, fallback) {
  if (!color) return fallback;
  const m = /^var\((--[\w-]+)\)$/.exec(color.trim());
  return m ? tokens[m[1]] || fallback : color;
}

function withAlpha(color, alpha) {
  const m = /^#([0-9a-f]{6})$/i.exec((color || '').trim());
  if (!m) return color;
  const int = parseInt(m[1], 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

const PALETTE_KEYS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6'];
const paletteAt = (i, tokens) => tokens[PALETTE_KEYS[i % PALETTE_KEYS.length]];

function tooltipStyle(tokens, format) {
  return {
    backgroundColor: tokens['--popover'],
    titleColor: tokens['--foreground'],
    bodyColor: tokens['--foreground'],
    borderColor: tokens['--border'],
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    boxPadding: 5,
    usePointStyle: true,
    titleFont: { weight: '600', size: 11.5 },
    bodyFont: { size: 11.5 },
    callbacks: format
      ? { label: (c) => ` ${c.dataset.label}: ${format(c.parsed.y ?? c.parsed)}` }
      : undefined,
  };
}

function legendStyle(tokens) {
  return {
    display: true,
    position: 'bottom',
    labels: {
      usePointStyle: true,
      pointStyle: 'circle',
      boxWidth: 7,
      boxHeight: 7,
      padding: 16,
      color: tokens['--muted-foreground'],
      font: { size: 11 },
    },
  };
}

/**
 * Rounds the axis ceiling up to a "nice" step so gridlines land on readable numbers
 * (25k, 50k, 1L…) instead of Chart.js's raw data max.
 */
export function niceStep(max, targetTicks = 5) {
  if (!max || max <= 0) return 1;
  const raw = max / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((s) => raw <= pow * s) ?? 10;
  return pow * step;
}

function scales(tokens, format, { stacked = false, yStep, ySuggestedMax } = {}) {
  return {
    x: {
      stacked,
      grid: { display: false },
      border: { color: tokens['--border'] },
      ticks: { color: tokens['--muted-foreground'], font: { size: 10.5 } },
    },
    y: {
      stacked,
      beginAtZero: true,
      ...(ySuggestedMax ? { suggestedMax: ySuggestedMax } : {}),
      grid: { color: tokens['--border'], drawTicks: false },
      border: { display: false, dash: [4, 4] },
      ticks: {
        color: tokens['--muted-foreground'],
        font: { size: 10.5 },
        padding: 8,
        ...(yStep ? { stepSize: yStep } : { maxTicksLimit: 5 }),
        callback: (v) => (format ? format(v) : v),
      },
    },
  };
}

function Empty({ height, className }) {
  return (
    <div className={cn('text-muted-foreground flex items-center justify-center text-sm', className)} style={{ height }}>
      No data for this period
    </div>
  );
}

/** Smooth multi-series area chart with gradient fills. */
export function AreaChart({ data = [], series = [], xKey = 'month', format, height = 280, yStep, className }) {
  const tokens = useTokens();

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d[xKey]),
      datasets: series.map((s, i) => {
        const color = resolve(s.color, tokens, paletteAt(i, tokens));
        return {
          label: s.label,
          data: data.map((d) => Number(d[s.key] || 0)),
          borderColor: color,
          borderWidth: s.emphasis ? 3 : 2.4,
          // Lower order paints last → the emphasised series stays readable when a
          // much larger series would otherwise sit on top of it.
          order: s.emphasis ? 0 : 1,
          tension: 0.4,
          fill: true,
          // Scriptable so the gradient rebuilds whenever the chart area resizes.
          backgroundColor: (ctx) => {
            const { chartArea, ctx: c } = ctx.chart;
            if (!chartArea) return withAlpha(color, 0.13);
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, withAlpha(color, 0.22));
            g.addColorStop(1, withAlpha(color, 0.02));
            return g;
          },
          // Hollow markers on every point, as in the reference line chart.
          pointRadius: 3.6,
          pointHoverRadius: 5.5,
          pointBackgroundColor: tokens['--card'],
          pointBorderColor: color,
          pointBorderWidth: 2.2,
          pointHoverBorderWidth: 2.6,
          pointHitRadius: 20,
        };
      }),
    }),
    [data, series, tokens, xKey],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: legendStyle(tokens), tooltip: tooltipStyle(tokens, format) },
      scales: scales(tokens, format, { yStep }),
    }),
    [tokens, format, yStep],
  );

  const ref = useChart('line', chartData, options);
  if (!data.length) return <Empty height={height} className={className} />;

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <canvas ref={ref} />
    </div>
  );
}

/** Grouped bars with rounded caps. */
export function BarChart({
  data = [],
  series = [],
  xKey = 'label',
  format,
  height = 280,
  stacked = false,
  valueLabels = false,
  className,
}) {
  const tokens = useTokens();

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d[xKey]),
      datasets: series.map((s, i) => {
        const color = resolve(s.color, tokens, paletteAt(i, tokens));
        return {
          label: s.label,
          data: data.map((d) => Number(d[s.key] || 0)),
          backgroundColor: color,
          hoverBackgroundColor: color,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 42,
        };
      }),
    }),
    [data, series, tokens, xKey],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      // Extra headroom so the value labels above the tallest bar aren't clipped.
      layout: { padding: { top: 18 } },
      plugins: {
        legend: series.length > 1 ? legendStyle(tokens) : { display: false },
        tooltip: tooltipStyle(tokens, format),
        barValueLabels: { enabled: valueLabels, color: tokens['--foreground'], format },
      },
      scales: scales(tokens, format, { stacked }),
    }),
    [tokens, format, series.length, stacked, valueLabels],
  );

  const ref = useChart('bar', chartData, options);
  if (!data.length) return <Empty height={height} className={className} />;

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <canvas ref={ref} />
    </div>
  );
}

/** Doughnut with centred total and an interactive value legend. */
export function DonutChart({ data = [], colors, centerLabel = 'Total', size = 200, className }) {
  const tokens = useTokens();
  const [hover, setHover] = useState(null);
  const total = data.reduce((s, d) => s + Number(d.count || 0), 0);

  const resolved = useMemo(
    () => data.map((_, i) => resolve(colors?.[i], tokens, paletteAt(i, tokens))),
    [data, colors, tokens],
  );

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [
        {
          data: data.map((d) => Number(d.count || 0)),
          backgroundColor: resolved,
          borderColor: tokens['--card'],
          borderWidth: 2,
          hoverOffset: 8,
          hoverBorderColor: tokens['--card'],
        },
      ],
    }),
    [data, resolved, tokens],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(tokens),
          callbacks: {
            label: (c) => ` ${c.label}: ${c.parsed} (${Math.round((c.parsed / (total || 1)) * 100)}%)`,
          },
        },
        centerText: {
          enabled: true,
          total,
          label: centerLabel,
          valueColor: tokens['--foreground'],
          labelColor: tokens['--muted-foreground'],
        },
      },
    }),
    [tokens, total, centerLabel],
  );

  const ref = useChart('doughnut', chartData, options);
  if (!total) return <Empty height={size} className={className} />;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4 sm:gap-6', className)}>
      {/* maxWidth keeps the donut inside very narrow cards instead of forcing a scrollbar. */}
      <div style={{ width: size, height: size, maxWidth: '100%' }} className="shrink-0">
        <canvas ref={ref} />
      </div>
      {/* Compact legend: swatch · label · count · share. Callers can pass a pre-computed
          `pct` (so the column sums to exactly 100); otherwise it's derived here. */}
      <div className="min-w-0 flex-1 basis-[150px] space-y-0.5">
        {data.map((d, i) => (
          <div
            key={d.label}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
              hover === i ? 'bg-secondary' : 'hover:bg-secondary/60',
            )}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: resolved[i] }} />
            <span className="flex-1 truncate text-[13px]">{d.label}</span>
            <b className="text-[13px] font-semibold tabular-nums">{d.count}</b>
            <span className="text-muted-foreground w-9 text-right text-[11.5px] tabular-nums">
              {d.pct ?? Math.round((Number(d.count || 0) / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked horizontal bars — CSS, not canvas: it doubles as a labelled list. */
export function RankedBars({ data = [], format = (v) => v, colors, className }) {
  const tokens = useTokens();
  if (!data.length) return <Empty height={140} className={className} />;
  const max = Math.max(...data.map((d) => Number(d.count || 0)), 1);
  return (
    <div className={cn('space-y-3', className)}>
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{d.label}</span>
            <span className="font-semibold tabular-nums">{format(d.count)}</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(Number(d.count || 0) / max) * 100}%`,
                background: resolve(colors?.[i], tokens, paletteAt(i, tokens)),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tiny inline trend for KPI cards — stays SVG: many instances, no axes needed. */
export function Sparkline({ values = [], color = 'var(--chart-1)', className }) {
  const tokens = useTokens();
  if (values.length < 2) return null;
  const stroke = resolve(color, tokens, paletteAt(0, tokens));
  const W = 90;
  const H = 26;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / span) * (H - 3) - 1.5}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-6 w-[70px]', className)} preserveAspectRatio="none">
      <path
        d={`M ${pts.join(' L ')}`}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
