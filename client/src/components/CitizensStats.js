import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CitizensStats = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) { setBlocked(true); return; }
    setLoading(true);
    try {
      const res = await axios.get('/api/citizen-stats', { headers: { Authorization: `Bearer ${token}` } });
      setStats(res.data);
      setBlocked(false);
    } catch (err) {
      if (err.response?.status === 403) setBlocked(true);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (blocked) return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">إحصاء المواطنين</span>
        <h2 className="section-title">إحصاء <span className="gradient-text">المواطنين</span></h2>
      </div>
      <div className="locked-content">
        <div className="locked-icon">🔒</div>
        <h3>هذه البيانات متاحة للمشتركين فقط</h3>
        <p>سجّل دخولك أو اشترك للوصول إلى إحصاء المواطنين</p>
        <a href="#subscribe" className="btn-primary" onClick={(e) => { e.preventDefault(); document.querySelector('[data-tab="subscribe"]')?.click(); }}>اشترك الآن</a>
      </div>
    </div>
  );

  if (loading) return <div className="spinner"></div>;

  if (!stats) return null;

  const totalCitizens = stats.totalCitizens || 0;
  const regions = stats.regions || [];
  const professions = stats.professions || [];
  const ageGroups = stats.ageGroups || [];
  const teams = stats.teams || [];
  const villages = stats.villages || [];

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">إحصاء المواطنين</span>
        <h2 className="section-title">إحصاء <span className="gradient-text">المواطنين</span></h2>
        <p className="section-desc">إحصائيات شاملة لبيانات المواطنين في راس عيسى</p>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-number"><span className="gradient-text">{totalCitizens}</span></div>
          <div className="stat-label">إجمالي المواطنين</div>
        </div>
        <div className="stat-item">
          <div className="stat-number"><span className="gradient-text">{regions.length}</span></div>
          <div className="stat-label">عدد المناطق</div>
        </div>
        <div className="stat-item">
          <div className="stat-number"><span className="gradient-text">{professions.length}</span></div>
          <div className="stat-label">عدد المهن</div>
        </div>
        <div className="stat-item">
          <div className="stat-number"><span className="gradient-text">{villages.length}</span></div>
          <div className="stat-label">عدد القرى</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>التوزيع حسب المنطقة</h3>
          <div className="bar-chart">
            {regions.slice(0, 8).map((r, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{r.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(r.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب المهنة</h3>
          <div className="bar-chart">
            {professions.slice(0, 8).map((p, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{p.name}</span>
                <div className="bar-track">
                  <div className="bar-fill accent" style={{ width: `${(p.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب الفئة العمرية</h3>
          <div className="bar-chart">
            {ageGroups.map((a, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{a.name}</span>
                <div className="bar-track">
                  <div className="bar-fill pink" style={{ width: `${(a.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{a.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب القرية</h3>
          <div className="bar-chart">
            {villages.slice(0, 8).map((v, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{v.name}</span>
                <div className="bar-track">
                  <div className="bar-fill green" style={{ width: `${(v.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {teams.length > 0 && (
        <div className="chart-card" style={{ marginTop: '1.5rem' }}>
          <h3>فرق العمل ({teams.length} فرقة)</h3>
          <div className="bar-chart">
            {teams.slice(0, 15).map((t, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">فرقة {t.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(t.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizensStats;
