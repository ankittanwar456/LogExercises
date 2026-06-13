import { motion } from "motion/react";

interface BarData {
  label: string;
  value: number;
  sublabel?: string;
}

interface BarChartProps {
  data: BarData[];
  color?: string;
  formatValue?: (v: number) => string;
  maxBars?: number;
}

export default function BarChart({ data, color = "#84cc16", formatValue = (v) => String(v), maxBars = 10 }: BarChartProps) {
  const displayed = data.slice(0, maxBars);
  const maxValue = Math.max(...displayed.map((d) => d.value), 1);

  if (displayed.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-700 text-[10px] font-black uppercase tracking-widest italic h-16">
        No data yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayed.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic w-20 shrink-0 truncate">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-zinc-950 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: "0%" }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] font-black italic text-zinc-400 w-16 text-right shrink-0">
            {item.sublabel ?? formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
