import React from 'react';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

const stats = [
  { number: 500, suffix: '+', label: 'مشروع مكتمل' },
  { number: 120, suffix: '+', label: 'عميل سعيد' },
  { number: 15, suffix: '+', label: 'سنة خبرة' },
  { number: 98, suffix: '%', label: 'نسبة الرضا' },
];

const Stats = () => {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <section className="stats-section" ref={ref}>
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div className="stat-item" key={i}>
            <div className="stat-number">
              <span className="gradient-text">
                {inView ? <CountUp end={stat.number} duration={2.5} suffix={stat.suffix} /> : '0' + stat.suffix}
              </span>
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Stats;