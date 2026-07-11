import React from 'react';

const COLORS = [
  '#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#3498db', '#e91e63', '#00bcd4',
  '#8bc34a', '#ff5722', '#607d8b', '#795548', '#cddc39',
];

function countBy(arr, key) {
  const map = {};
  arr.forEach(item => {
    const val = item[key] || 'غير محدد';
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function BarChart({ title, data, maxItems = 10, colors = COLORS }) {
  if (!data || data.length === 0) return null;
  const sliced = data.slice(0, maxItems);
  const maxCount = Math.max(...sliced.map(d => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h4>{title}</h4>
        <span className="chart-total">{total} سجل</span>
      </div>
      <div className="chart-bars">
        {sliced.map((item, i) => (
          <div className="chart-bar-row" key={item.name}>
            <span className="chart-label" title={item.name}>{item.name}</span>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill"
                style={{
                  width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                  backgroundColor: colors[i % colors.length],
                }}
              />
              <span className="chart-bar-count">{item.count}</span>
            </div>
            <span className="chart-bar-pct">
              {total > 0 ? Math.round((item.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ title, data, maxItems = 8, colors = COLORS }) {
  if (!data || data.length === 0) return null;
  const sliced = data.slice(0, maxItems);
  const total = data.reduce((s, d) => s + d.count, 0);
  const remaining = total - sliced.reduce((s, d) => s + d.count, 0);

  const segments = [];
  let cumulative = 0;
  sliced.forEach((item, i) => {
    const pct = total > 0 ? (item.count / total) * 100 : 0;
    segments.push({
      ...item,
      color: colors[i % colors.length],
      pct,
      offset: (cumulative / total) * 100,
    });
    cumulative += item.count;
  });
  if (remaining > 0) {
    segments.push({ name: 'أخرى', count: remaining, color: '#ccc', pct: (remaining / total) * 100, offset: (cumulative / total) * 100 });
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="chart-card donut-card">
      <div className="chart-header">
        <h4>{title}</h4>
        <span className="chart-total">{total} سجل</span>
      </div>
      <div className="donut-wrapper">
        <svg viewBox="0 0 160 160" className="donut-svg">
          {segments.map((seg, i) => {
            const dash = (seg.pct / 100) * circumference;
            const gap = circumference - dash;
            return (
              <circle
                key={i}
                cx="80" cy="80" r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="24"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-((seg.offset / 100) * circumference)}
                className="donut-segment"
              />
            );
          })}
        </svg>
      </div>
      <div className="donut-legend">
        {segments.slice(0, 6).map((seg, i) => (
          <div className="legend-item" key={i}>
            <span className="legend-dot" style={{ backgroundColor: seg.color }} />
            <span className="legend-label">{seg.name}</span>
            <span className="legend-value">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkersCharts({ workers }) {
  if (!workers || workers.length === 0) return null;

  const ageData = countBy(workers, 'ageGroup');
  const regionData = countBy(workers, 'region');
  const professionData = countBy(workers, 'profession');
  const teamData = countBy(workers, 'teamNumber');
  const birthPlaceData = countBy(workers, 'birthPlace');
  const noteData = countBy(workers, 'note');

  return (
    <div className="workers-charts">
      <div className="charts-grid">
        <DonutChart title="الفئات العمرية" data={ageData} />
        <BarChart title="المناطق" data={regionData} maxItems={8} />
        <BarChart title="المهن" data={professionData} maxItems={8} />
        <DonutChart title="أماكن الميلاد" data={birthPlaceData} />
        <BarChart title="الفرق" data={teamData.map(d => ({ name: `الفرقة ${d.name}`, count: d.count }))} maxItems={15} />
        <BarChart title="الملاحظات" data={noteData} maxItems={6} colors={['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c']} />
      </div>
    </div>
  );
}

export { BarChart, DonutChart };
