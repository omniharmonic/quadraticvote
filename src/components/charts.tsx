'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

// Palette pulled from the blueprint/graph-paper theme (globals.css).
const PALETTE = [
  '#c25227', // terracotta
  '#18385c', // blueprint
  '#586c48', // sage
  '#b2842e', // gold
  '#e69160', // terracotta-2
  '#345c8c', // blueprint-2
];
const INK = '#1a1814';
const INK_3 = '#6c604c';
const SELECTED = '#18385c';
const NOT_SELECTED = '#9e8e74';
const PAPER = '#f7f1e3';

function ChartTooltip({ active, payload, suffix }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div
      style={{ background: PAPER, border: `1px solid ${INK}`, color: INK }}
      className="px-2.5 py-1.5 font-mono text-[11px]"
    >
      <span className="text-ink">{p.name}</span>
      <span className="ml-2 tabular-nums text-ink-2">
        {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}
        {suffix ? ` ${suffix}` : ''}
      </span>
    </div>
  );
}

/**
 * Pie of how the pool is split across options (proportional results).
 */
export function AllocationPie({
  data,
  symbol,
}: {
  data: Array<{ title: string; allocation_amount: number }>;
  symbol?: string;
}) {
  const slices = data.filter((d) => d.allocation_amount > 0);
  if (slices.length === 0) return null;
  return (
    <div className="h-64 w-full" aria-label="Allocation by option, pie chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="allocation_amount"
            nameKey="title"
            innerRadius="45%"
            outerRadius="78%"
            paddingAngle={1}
            stroke={PAPER}
            strokeWidth={2}
          >
            {slices.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip suffix={symbol} />} />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: INK_3 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Pass/fail pie of selected vs not-selected counts (binary results).
 */
export function SelectionPie({
  selected,
  notSelected,
}: {
  selected: number;
  notSelected: number;
}) {
  const data = [
    { name: 'Selected', value: selected },
    { name: 'Not selected', value: notSelected },
  ].filter((d) => d.value > 0);
  if (data.length === 0) return null;
  return (
    <div className="h-56 w-full" aria-label="Selected versus not selected, pie chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="45%"
            outerRadius="78%"
            paddingAngle={1}
            stroke={PAPER}
            strokeWidth={2}
          >
            <Cell fill={SELECTED} />
            <Cell fill={NOT_SELECTED} />
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: INK_3 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Votes-per-option bar chart with the selection cutoff drawn in (binary).
 * Selected options are inked blue; the rest are muted.
 */
export function VotesBarChart({
  data,
  cutoff,
}: {
  data: Array<{ title: string; votes: number; selected: boolean }>;
  cutoff?: number;
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-72 w-full" aria-label="Votes per option, bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="title"
            tick={{ fontSize: 10, fill: INK_3, fontFamily: 'ui-monospace, monospace' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 10, fill: INK_3 }} />
          <Tooltip content={<ChartTooltip suffix="votes" />} cursor={{ fill: 'rgba(26,24,20,0.04)' }} />
          {cutoff != null && cutoff > 0 && (
            <ReferenceLine
              y={cutoff}
              stroke={INK}
              strokeDasharray="4 3"
              label={{ value: 'cutoff', position: 'right', fontSize: 10, fill: INK_3 }}
            />
          )}
          <Bar dataKey="votes" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.selected ? SELECTED : NOT_SELECTED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Waterfall of how the pool is drawn down option by option (proportional):
 * each bar starts where the previous left off, so the cumulative fill to the
 * pool total is visible. Implemented as a stacked bar with a transparent base.
 */
export function AllocationWaterfall({
  data,
  symbol,
}: {
  data: Array<{ title: string; allocation_amount: number }>;
  symbol?: string;
}) {
  const slices = data.filter((d) => d.allocation_amount > 0);
  if (slices.length === 0) return null;
  let running = 0;
  const rows = slices.map((d, i) => {
    const base = running;
    running += d.allocation_amount;
    return { title: d.title, base, amount: d.allocation_amount, _color: PALETTE[i % PALETTE.length] };
  });
  return (
    <div className="h-72 w-full" aria-label="Pool drawdown waterfall">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="title"
            tick={{ fontSize: 10, fill: INK_3, fontFamily: 'ui-monospace, monospace' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 10, fill: INK_3 }} />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const row = payload.find((p: any) => p.dataKey === 'amount')?.payload;
              if (!row) return null;
              return (
                <div style={{ background: PAPER, border: `1px solid ${INK}`, color: INK }} className="px-2.5 py-1.5 font-mono text-[11px]">
                  {row.title}: {symbol}
                  {row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              );
            }}
            cursor={{ fill: 'rgba(26,24,20,0.04)' }}
          />
          {/* transparent base stacks the visible bar up to its running total */}
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="amount" stackId="w" radius={[2, 2, 0, 0]}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r._color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const CLUSTER_COLORS = ['#18385c', '#c25227', '#586c48', '#b2842e'];

/**
 * Voter-similarity scatter: each dot is a ballot positioned by allocation
 * similarity (PCA), colored by cluster. Voters who allocated alike sit near
 * each other — an at-a-glance view of coalitions. Admin-only data.
 */
export function VoterClusterScatter({
  points,
}: {
  points: Array<{ id: string; x: number; y: number; cluster: number; total_credits: number }>;
}) {
  if (points.length === 0) return null;
  const byCluster = new Map<number, typeof points>();
  for (const p of points) {
    if (!byCluster.has(p.cluster)) byCluster.set(p.cluster, []);
    byCluster.get(p.cluster)!.push(p);
  }
  return (
    <div className="h-72 w-full" aria-label="Voter similarity clusters, scatter plot">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
          <XAxis type="number" dataKey="x" hide />
          <YAxis type="number" dataKey="y" hide />
          <ZAxis type="number" dataKey="total_credits" range={[40, 280]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div style={{ background: PAPER, border: `1px solid ${INK}`, color: INK }} className="px-2.5 py-1.5 font-mono text-[11px]">
                  {p.id} · {p.total_credits} cr · cluster {p.cluster + 1}
                </div>
              );
            }}
          />
          {Array.from(byCluster.entries()).map(([cluster, pts]) => (
            <Scatter
              key={cluster}
              name={`Cluster ${cluster + 1}`}
              data={pts}
              fill={CLUSTER_COLORS[cluster % CLUSTER_COLORS.length]}
              fillOpacity={0.7}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
