import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = ({ onNavigate }) => {
  const { isApproved } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!isApproved) return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">لوحة التحكم</span>
        <h2 className="section-title">نظرة <span className="gradient-text">عامة</span></h2>
      </div>
      <div className="locked-content">
        <div className="locked-icon">📊</div>
        <h3>لوحة التحكم متاحة للمشتركين فقط</h3>
        <p>سجّل دخولك أو اشترك لعرض الإحصائيات والرسوم البيانية</p>
        <a href="#subscribe" className="btn-primary" onClick={(e) => { e.preventDefault(); onNavigate('subscribe'); }}>اشترك الآن</a>
      </div>
    </div>
  );

  if (!stats) return <div className="spinner"></div>;

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">لوحة التحكم</span>
        <h2 className="section-title">نظرة <span className="gradient-text">عامة</span></h2>
        <p className="section-desc">إحصائيات وبيانات محدثة عن العمال والأسر المستفيدة</p>
      </div>

      <div className="stats-grid">
        <div className="stat-item clickable" onClick={() => onNavigate('workers')}>
          <div className="stat-number"><span className="gradient-text">{stats.totalWorkers || 0}</span></div>
          <div className="stat-label">إجمالي العمال</div>
          <div className="stat-action">عرض البيانات →</div>
        </div>
        <div className="stat-item clickable" onClick={() => onNavigate('families')}>
          <div className="stat-number"><span className="gradient-text">{stats.totalFamilies || 0}</span></div>
          <div className="stat-label">عدد الفرق</div>
          <div className="stat-action">عرض البيانات →</div>
        </div>
        <div className="stat-item clickable" onClick={() => onNavigate('workers')}>
          <div className="stat-number"><span className="gradient-text">{(stats.regions || []).length}</span></div>
          <div className="stat-label">عدد المناطق</div>
          <div className="stat-action">عرض البيانات →</div>
        </div>
        <div className="stat-item clickable" onClick={() => onNavigate('workers')}>
          <div className="stat-number"><span className="gradient-text">{(stats.professions || []).length}</span></div>
          <div className="stat-label">عدد المهن</div>
          <div className="stat-action">عرض البيانات →</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>التوزيع حسب المنطقة</h3>
          <div className="bar-chart">
            {(stats.regions || []).slice(0, 8).map((r, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{r.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(r.count / (stats.totalWorkers || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب المهنة</h3>
          <div className="bar-chart">
            {(stats.professions || []).slice(0, 8).map((p, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{p.name}</span>
                <div className="bar-track">
                  <div className="bar-fill accent" style={{ width: `${(p.count / (stats.totalWorkers || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب الفئة العمرية</h3>
          <div className="bar-chart">
            {(stats.ageGroups || []).map((a, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{a.name}</span>
                <div className="bar-track">
                  <div className="bar-fill pink" style={{ width: `${(a.count / (stats.totalWorkers || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{a.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب محل الميلاد</h3>
          <div className="bar-chart">
            {(stats.birthPlaces || []).slice(0, 8).map((b, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{b.name}</span>
                <div className="bar-track">
                  <div className="bar-fill green" style={{ width: `${(b.count / (stats.totalWorkers || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
