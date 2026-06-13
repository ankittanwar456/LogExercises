import { useMemo } from "react";
import { addDays, eachWeekOfInterval, endOfWeek, format, parseISO, startOfDay, subWeeks } from "date-fns";

interface HeatmapProps {
  /** Record of YYYY-MM-DD → intensity (e.g. exercise count) */
  counts: Record<string, number>;
  /** How many weeks back to show, default 26 (6 months) */
  weeks?: number;
}

const CELL = 14; // px
const GAP = 3; // px
const STEP = CELL + GAP;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function Heatmap({ counts, weeks = 26 }: HeatmapProps) {
  const { grid, monthLabels } = useMemo(() => {
    const today = startOfDay(new Date());
    const start = startOfDay(subWeeks(today, weeks - 1));

    const weekIntervals = eachWeekOfInterval({ start, end: today }, { weekStartsOn: 1 });

    const grid = weekIntervals.map((weekStart) =>
      Array.from({ length: 7 }).map((_, dayIdx) => {
        const date = addDays(weekStart, dayIdx);
        if (date > today) return null;
        const key = format(date, "yyyy-MM-dd");
        return { key, count: counts[key] ?? 0, date };
      })
    );

    // Month labels — find the first column of each new month
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    grid.forEach((week, col) => {
      const firstDay = week.find((d) => d !== null);
      if (!firstDay) return;
      const m = firstDay.date.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ col, label: format(firstDay.date, "MMM") });
        lastMonth = m;
      }
    });

    return { grid, monthLabels };
  }, [counts, weeks]);

  const totalCols = grid.length;
  const svgW = totalCols * STEP;
  const svgH = 7 * STEP + 16; // 16 for month labels on top

  const cellColor = (count: number) => {
    if (count === 0) return "#18181b"; // zinc-900
    if (count <= 2) return "#365314"; // lime-900
    if (count <= 4) return "#4d7c0f"; // lime-700
    return "#84cc16"; // lime-500
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <svg width={svgW} height={svgH} className="block">
        {/* Month labels */}
        {monthLabels.map(({ col, label }) => (
          <text
            key={col}
            x={col * STEP}
            y={10}
            fill="#52525b"
            fontSize={9}
            fontWeight="900"
            fontStyle="italic"
            fontFamily="inherit"
          >
            {label}
          </text>
        ))}

        {/* Day-of-week labels on the left — we render them at col -1 */}
        {DAY_LABELS.map((label, row) =>
          label ? (
            <text
              key={row}
              x={0}
              y={16 + row * STEP + CELL / 2}
              fill="#3f3f46"
              fontSize={8}
              fontWeight="900"
              fontStyle="italic"
              fontFamily="inherit"
              dominantBaseline="middle"
            >
              {label}
            </text>
          ) : null
        )}

        {/* Cells */}
        {grid.map((week, col) =>
          week.map((day, row) => {
            if (!day) return null;
            return (
              <rect
                key={day.key}
                x={col * STEP}
                y={16 + row * STEP}
                width={CELL}
                height={CELL}
                rx={3}
                fill={cellColor(day.count)}
              >
                <title>{`${day.key}: ${day.count > 0 ? `${day.count} exercises` : "Rest"}`}</title>
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}
