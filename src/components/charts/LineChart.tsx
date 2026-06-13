import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface DataPoint {
  x: string; // label (date string or any)
  y: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  yLabel?: string;
  color?: string;
  formatY?: (v: number) => string;
  formatX?: (v: string) => string;
}

// All padding values are in real CSS pixels
const PAD_TOP = 12;
const PAD_RIGHT = 12;
const PAD_BOTTOM = 26;
const PAD_LEFT = 48; // enough room for Y labels

const FONT_SIZE = 11; // px — rendered 1:1, no squash

export default function LineChart({
  data,
  height = 180,
  yLabel,
  color = "#84cc16",
  formatY = (v) => String(v),
  formatX = (v) => v,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Measure container width and keep it updated
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(w);
    });
    obs.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => obs.disconnect();
  }, []);

  const innerW = Math.max(width - PAD_LEFT - PAD_RIGHT, 0);
  const innerH = Math.max(height - PAD_TOP - PAD_BOTTOM, 0);

  const { minY, maxY, points, pathD, totalLength } = useMemo(() => {
    if (data.length === 0 || innerW === 0)
      return { minY: 0, maxY: 0, points: [], pathD: "", totalLength: 0 };

    const ys = data.map((d) => d.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeY = maxY - minY || 1;

    const pts = data.map((d, i) => {
      const cx = PAD_LEFT + (i / Math.max(data.length - 1, 1)) * innerW;
      const cy = PAD_TOP + (1 - (d.y - minY) / rangeY) * innerH;
      return { cx, cy, label: d.x, value: d.y };
    });

    const pathD =
      pts.length === 1
        ? `M ${pts[0].cx} ${pts[0].cy}`
        : pts.map((p, i) => (i === 0 ? `M ${p.cx} ${p.cy}` : `L ${p.cx} ${p.cy}`)).join(" ");

    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].cx - pts[i - 1].cx;
      const dy = pts[i].cy - pts[i - 1].cy;
      totalLength += Math.hypot(dx, dy);
    }

    return { minY, maxY, points: pts, pathD, totalLength };
  }, [data, innerW, innerH]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-zinc-700 text-[10px] font-black uppercase tracking-widest italic"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD_TOP + (1 - t) * innerH,
    label: formatY(Math.round((minY + t * (maxY - minY)) * 10) / 10),
  }));

  // X axis — show at most 4 labels spread evenly
  const maxXLabels = 4;
  const xStep = Math.max(1, Math.ceil((data.length - 1) / (maxXLabels - 1)));
  const xLabels = data
    .map((d, i) => ({ i, label: formatX(d.x) }))
    .filter((_, i) => i === 0 || i === data.length - 1 || i % xStep === 0)
    .slice(0, maxXLabels);

  return (
    <div ref={containerRef} style={{ height }} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          {yTicks.map((t) => (
            <line
              key={t.label + "-grid"}
              x1={PAD_LEFT}
              x2={width - PAD_RIGHT}
              y1={t.y}
              y2={t.y}
              stroke="#27272a"
              strokeWidth={1}
            />
          ))}

          {/* Y axis labels */}
          {yTicks.map((t) => (
            <text
              key={t.label + "-y"}
              x={PAD_LEFT - 6}
              y={t.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#71717a"
              fontSize={FONT_SIZE}
              fontWeight="700"
              fontStyle="italic"
              fontFamily="inherit"
            >
              {t.label}
            </text>
          ))}

          {/* Optional Y axis unit label */}
          {yLabel && (
            <text
              x={PAD_LEFT - 6}
              y={PAD_TOP - 4}
              textAnchor="end"
              fill="#3f3f46"
              fontSize={FONT_SIZE - 1}
              fontWeight="900"
              fontStyle="italic"
              fontFamily="inherit"
            >
              {yLabel}
            </text>
          )}

          {/* X axis labels */}
          {xLabels.map(({ i, label }) => (
            <text
              key={i}
              x={PAD_LEFT + (i / Math.max(data.length - 1, 1)) * innerW}
              y={height - 4}
              textAnchor="middle"
              fill="#71717a"
              fontSize={FONT_SIZE}
              fontWeight="700"
              fontStyle="italic"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* Animated line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ strokeDasharray: totalLength, strokeDashoffset: totalLength }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />

          {/* Dots */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={data.length > 20 ? 2.5 : 4}
              fill={color}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.02, duration: 0.2 }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
