import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = ({ onNavigate }) => {
  const { token, hasPermission, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) { setBlocked(true); return; }
    setLoading(true);
    try {
      const res = await axios.get('/api/stats', { headers: { Authorization: `Bearer ${token}` } });
      setStats(res.data);
      setBlocked(false);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) setBlocked(true);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (blocked) return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">لوحة التحكم</span>
        <h2 className="section-title">نظرة <span className="gradient-text">عامة</span></h2>
      </div>
      <div className="locked-content">
        <div className="locked-icon">🔒</div>
        <h3>هذه البيانات متاحة للمشتركين فقط</h3>
        <p>سجّل دخولك أو اشترك للوصول إلى البيانات</p>
      </div>
    </div>
  );

  if (loading) return <div className="spinner"></div>;
  if (!stats) return null;

  const canWorkers = isAdmin || hasPermission('workers');
  const canFamilies = isAdmin || hasPermission('families');

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">لوحة التحكم</span>
        <h2 className="section-title">نظرة <span className="gradient-text">عامة</span></h2>
        <p className="section-desc">إحصائيات وبيانات محدثة</p>
      </div>

      <div className="stats-grid">
        {canWorkers && (
          <>
            <div className="stat-item clickable" onClick={() => onNavigate('workers')}>
              <div className="stat-number"><span className="gradient-text">{stats.totalWorkers || 0}</span></div>
              <div className="stat-label">إجمالي العمال</div>
              <div className="stat-action">عرض البيانات →</div>
            </div>
            <div className="stat-item clickable" onClick={() => onNavigate('workers')}>
              <div className="stat-number"><span className="gradient-text">{(stats.regions || []).length}</span></div>
              <div className="stat-label">عدد المناطق</div>
              <div className="stat-action">عرض البيانات →</div>
            </div>
            <div className="stat-item clickable" onClick={() => onNavigate('workers')}>
              <div className="stat-number"><span className="gradient-text">{stats.totalTeams || 0}</span></div>
              <div className="stat-label">عدد الفرق</div>
              <div className="stat-action">عرض البيانات →</div>
            </div>
          </>
        )}
        {canFamilies && (
          <div className="stat-item clickable" onClick={() => onNavigate('families')}>
            <div className="stat-number"><span className="gradient-text">{stats.totalFamilies || 0}</span></div>
            <div className="stat-label">كشف المساعدات</div>
            <div className="stat-action">عرض البيانات →</div>
          </div>
        )}
      </div>

      {canWorkers && (
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
        </div>
      )}
    </div>
  );
};

export default Dashboard;
