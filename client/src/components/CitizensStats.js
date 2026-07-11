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
        <p className="section-desc">إحصائيات شاملة لبيانات العمال والفرق في راس عيسى</p>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-number"><span className="gradient-text">{totalCitizens}</span></div>
          <div className="stat-label">إجمالي العمال</div>
        </div>
        <div className="stat-item">
          <div className="stat-number"><span className="gradient-text">{teams.length}</span></div>
          <div className="stat-label">عدد الفرق</div>
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
        <div className="stat-item">
          <div className="stat-number"><span className="gradient-text">{ageGroups.length}</span></div>
          <div className="stat-label">الفئات العمرية</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>التوزيع حسب المنطقة ({regions.length} منطقة)</h3>
          <div className="bar-chart">
            {regions.slice(0, 10).map((r, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{r.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(r.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{r.count} ({Math.round((r.count / (totalCitizens || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب المهنة ({professions.length} مهنة)</h3>
          <div className="bar-chart">
            {professions.slice(0, 10).map((p, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{p.name}</span>
                <div className="bar-track">
                  <div className="bar-fill accent" style={{ width: `${(p.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{p.count} ({Math.round((p.count / (totalCitizens || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب الفئة العمرية ({ageGroups.length} فئة)</h3>
          <div className="bar-chart">
            {ageGroups.map((a, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{a.name || 'غير محدد'}</span>
                <div className="bar-track">
                  <div className="bar-fill pink" style={{ width: `${(a.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{a.count} ({Math.round((a.count / (totalCitizens || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>التوزيع حسب القرية ({villages.length} قرية)</h3>
          <div className="bar-chart">
            {villages.slice(0, 10).map((v, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{v.name}</span>
                <div className="bar-track">
                  <div className="bar-fill green" style={{ width: `${(v.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{v.count} ({Math.round((v.count / (totalCitizens || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {teams.length > 0 && (
        <div className="chart-card" style={{ marginTop: '1.5rem' }}>
          <h3>عدد العمال في كل فرقة ({teams.length} فرقة)</h3>
          <div className="bar-chart">
            {teams.map((t, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">الفرقة {t.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(t.count / (totalCitizens || 1)) * 100}%` }}></div>
                </div>
                <span className="bar-value">{t.count} عامل</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizensStats;
