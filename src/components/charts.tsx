'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
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
