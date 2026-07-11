import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b'];

const Reports = () => {
  const { token, isAdmin, hasPermission } = useAuth();
  const [reportType, setReportType] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ region: '', profession: '', team: '', search: '' });
  const [summary, setSummary] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const canWorkers = isAdmin || hasPermission('workers');
  const canFamilies = isAdmin || hasPermission('families');
  const canCensus = isAdmin || hasPermission('citizens');

  const availableTypes = [
    canWorkers && { key: 'workers', label: '👷 العمال' },
    canFamilies && { key: 'families', label: '👨‍👩‍👧‍👦 المساعدات' },
    canCensus && { key: 'census', label: '📋 التعداد' },
  ].filter(Boolean);

  useEffect(() => {
    if (availableTypes.length > 0 && !reportType) {
      setReportType(availableTypes[0].key);
    }
  });

  const fetchData = useCallback(async () => {
    if (!reportType || availableTypes.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      if (reportType === 'workers' && canWorkers) {
        const res = await axios.get('/api/workers?limit=9999', { headers });
        setData(res.data.workers || res.data || []);
        const statsRes = await axios.get('/api/stats', { headers });
        setSummary(statsRes.data);
      } else if (reportType === 'families' && canFamilies) {
        const res = await axios.get('/api/families?limit=9999', { headers });
        setData(res.data.families || res.data || []);
        const sumRes = await axios.get('/api/families/summary', { headers });
        setSummary(sumRes.data);
      } else if (reportType === 'census' && canCensus) {
        const res = await axios.get('/api/census?limit=9999', { headers });
        setData(res.data.data || res.data || []);
        const sumRes = await axios.get('/api/census/summary', { headers });
        setSummary(sumRes.data);
      } else {
        setData([]);
        setSummary(null);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [reportType, token, canWorkers, canFamilies, canCensus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter(item => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const name = item.name || item.headName || '';
      if (!name.toLowerCase().includes(s)) return false;
    }
    if (filters.region && item.region !== filters.region) return false;
    if (filters.profession && item.profession !== filters.profession) return false;
    if (filters.team && String(item.teamNumber) !== String(filters.team)) return false;
    return true;
  });

  const regions = [...new Set(data.map(d => d.region).filter(Boolean))];
  const professions = [...new Set(data.map(d => d.profession).filter(Boolean))];
  const teams = [...new Set(data.map(d => d.teamNumber).filter(Boolean))].sort((a, b) => a - b);

  const getChartData = () => {
    if (reportType === 'workers') {
      const regionCounts = {};
      filtered.forEach(w => { regionCounts[w.region] = (regionCounts[w.region] || 0) + 1; });
      const professionCounts = {};
      filtered.forEach(w => { professionCounts[w.profession] = (professionCounts[w.profession] || 0) + 1; });
      const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
      filtered.forEach(w => {
        const age = w.age || 0;
        if (age <= 25) ageGroups['18-25']++;
        else if (age <= 35) ageGroups['26-35']++;
        else if (age <= 45) ageGroups['36-45']++;
        else if (age <= 55) ageGroups['46-55']++;
        else ageGroups['56+']++;
      });
      return [
        { title: 'التوزيع حسب المنطقة', data: regionCounts },
        { title: 'التوزيع حسب المهنة', data: professionCounts },
        { title: 'التوزيع حسب العمر', data: ageGroups },
      ];
    }
    if (reportType === 'families') {
      const teamCounts = {};
      filtered.forEach(f => { teamCounts[`فرقة ${f.teamNumber}`] = (teamCounts[`فرقة ${f.teamNumber}`] || 0) + 1; });
      return [
        { title: 'التوزيع حسب الفرق', data: teamCounts },
      ];
    }
    if (reportType === 'census') {
      const statusCounts = {};
      filtered.forEach(c => { statusCounts[c.financialStatus || 'غير محدد'] = (statusCounts[c.financialStatus || 'غير محدد'] || 0) + 1; });
      const housingCounts = {};
      filtered.forEach(c => { housingCounts[c.housingType || 'غير محدد'] = (housingCounts[c.housingType || 'غير محدد'] || 0) + 1; });
      return [
        { title: 'التوزيع حسب الحالة المادية', data: statusCounts },
        { title: 'التوزيع حسب نوع السكن', data: housingCounts },
      ];
    }
    return [];
  };

  const charts = getChartData();
  const maxVal = Math.max(...charts.flatMap(c => Object.values(c.data)), 1);

  const exportPDF = () => {
    const printContent = document.getElementById('report-print-area');
    if (!printContent) { toast.error('لا توجد بيانات للتصدير'); return; }
    const w = window.open('', '_blank');
    w.document.write(`
      <html dir="rtl"><head><title>تقرير ${reportType === 'workers' ? 'العمال' : reportType === 'families' ? 'المساعدات' : 'التعداد'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; padding: 2rem; color: #1e293b; }
        h1 { text-align: center; font-size: 1.5rem; margin-bottom: 0.5rem; color: #4f46e5; }
        h2 { font-size: 1.1rem; margin: 1rem 0 0.5rem; color: #334155; border-bottom: 2px solid #6366f1; padding-bottom: 0.3rem; }
        .subtitle { text-align: center; color: #64748b; margin-bottom: 1rem; font-size: 0.85rem; }
        .stats { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .stat { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.8rem 1.2rem; text-align: center; min-width: 120px; }
        .stat .num { font-size: 1.5rem; font-weight: 800; color: #4f46e5; }
        .stat .lbl { font-size: 0.75rem; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.8rem; }
        th { background: #f1f5f9; color: #334155; padding: 0.5rem; border: 1px solid #e2e8f0; font-weight: 700; }
        td { padding: 0.4rem 0.5rem; border: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .chart-bar { display: flex; align-items: center; gap: 0.5rem; margin: 0.3rem 0; }
        .chart-bar-track { flex: 1; height: 20px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .chart-bar-fill { height: 100%; border-radius: 4px; }
        .chart-bar-label { min-width: 100px; font-size: 0.75rem; }
        .chart-bar-value { min-width: 30px; font-size: 0.75rem; font-weight: 700; }
        .footer { text-align: center; margin-top: 2rem; color: #94a3b8; font-size: 0.7rem; border-top: 1px solid #e2e8f0; padding-top: 0.5rem; }
        @media print { body { padding: 1rem; } }
      </style></head><body>
      <h1>ابناء راس عيسى</h1>
      <p class="subtitle">تقرير ${reportType === 'workers' ? 'كشف العمال' : reportType === 'families' ? 'كشف المساعدات' : 'إحصاء المواطنين'} — ${new Date().toLocaleDateString('ar-SA')}</p>
    `);
    charts.forEach(chart => {
      w.document.write(`<h2>${chart.title}</h2>`);
      Object.entries(chart.data).forEach(([key, val]) => {
        const pct = Math.round((val / maxVal) * 100);
        const color = COLORS[Object.keys(chart.data).indexOf(key) % COLORS.length];
        w.document.write(`<div class="chart-bar"><span class="chart-bar-label">${key}</span><div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="chart-bar-value">${val}</span></div>`);
      });
    });
    w.document.write(`<h2>البيانات التفصيلية (${filtered.length} سجل)</h2>`);
    if (reportType === 'workers') {
      w.document.write('<table><thead><tr><th>#</th><th>الاسم</th><th>العمر</th><th>المنطقة</th><th>المهنة</th><th>الفرقة</th><th>الحالة</th></tr></thead><tbody>');
      filtered.forEach((w2, i) => { w.document.write(`<tr><td>${i+1}</td><td>${w2.name}</td><td>${w2.age}</td><td>${w2.region}</td><td>${w2.profession}</td><td>${w2.teamNumber}</td><td>${w2.status || 'نشط'}</td></tr>`); });
      w.document.write('</tbody></table>');
    } else if (reportType === 'families') {
      w.document.write('<table><thead><tr><th>#</th><th>اسم رب الأسرة</th><th>الفرقة</th><th>عدد الأفراد</th><th>المبلغ</th><th>المستفيدون</th></tr></thead><tbody>');
      filtered.forEach((f, i) => {
        const bens = (f.beneficiaries || []).map(b => `${b.name} (${b.amount})`).join(', ');
        w.document.write(`<tr><td>${i+1}</td><td>${f.name}</td><td>${f.teamNumber}</td><td>${f.memberCount || 0}</td><td>${(f.totalAmount || 0).toLocaleString('ar-SA')}</td><td>${bens}</td></tr>`);
      });
      w.document.write('</tbody></table>');
    } else {
      w.document.write('<table><thead><tr><th>#</th><th>رب الأسرة</th><th>الرقم</th><th>القرية</th><th>الذكور</th><th>الإناث</th><th>الدخل</th></tr></thead><tbody>');
      filtered.forEach((c, i) => { w.document.write(`<tr><td>${i+1}</td><td>${c.headName}</td><td>${c.familyNumber}</td><td>${c.village}</td><td>${c.maleCount}</td><td>${c.femaleCount}</td><td>${(c.averageIncome||0).toLocaleString('ar-SA')}</td></tr>`); });
      w.document.write('</tbody></table>');
    }
    w.document.write('<div class="footer">ابناء راس عيسى — تصميم وتطوير: المصمم غيث — alghithapp.netlify.app</div>');
    w.document.write('</body></html>');
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  const exportExcel = () => {
    let csv = '\uFEFF';
    if (reportType === 'workers') {
      csv += 'الاسم,العمر,المنطقة,المهنة,الفرقة,الحالة\n';
      filtered.forEach(w2 => { csv += `${w2.name},${w2.age},${w2.region},${w2.profession},${w2.teamNumber},${w2.status||'نشط'}\n`; });
    } else if (reportType === 'families') {
      csv += 'اسم رب الأسرة,الفرقة,عدد الأفراد,المبلغ,المستفيدون\n';
      filtered.forEach(f => {
        const bens = (f.beneficiaries||[]).map(b=>`${b.name}(${b.amount})`).join('; ');
        csv += `${f.name},${f.teamNumber},${f.memberCount||0},${f.totalAmount||0},"${bens}"\n`;
      });
    } else {
      csv += 'رب الأسرة,الرقم,القرية,المديرية,الذكور,الإناث,الدخل,الحالة المادية\n';
      filtered.forEach(c => { csv += `${c.headName},${c.familyNumber},${c.village},${c.directorate},${c.maleCount},${c.femaleCount},${c.averageIncome||0},${c.financialStatus||''}\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${reportType}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">التقارير</span>
        <h2 className="section-title">تقارير <span className="gradient-text">مميزة</span></h2>
        <p className="section-desc">تقارير شاملة مع رسوم بيانية وتصدير احترافي</p>
      </div>

      {availableTypes.length === 0 ? (
        <div className="locked-content">
          <div className="locked-icon">🔒</div>
          <h3>ليس لديك صلاحيات لعرض التقارير</h3>
          <p>تواصل مع المدير للحصول على الصلاحيات المناسبة</p>
        </div>
      ) : (<>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {availableTypes.map(t => (
              <button key={t.key} onClick={() => setReportType(t.key)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid', borderColor: reportType === t.key ? 'var(--primary)' : 'rgba(99,102,241,0.2)', background: reportType === t.key ? 'rgba(99,102,241,0.2)' : 'transparent', color: reportType === t.key ? 'var(--primary-light)' : 'var(--gray-light)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: '600', transition: 'all 0.2s' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="بحث بالاسم..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
              style={{ flex: 1, minWidth: '150px', padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' }} />
            {reportType === 'workers' && (
              <>
                <select value={filters.region} onChange={e => setFilters({ ...filters, region: e.target.value })}
                  style={{ padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                  <option value="">جميع المناطق</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filters.profession} onChange={e => setFilters({ ...filters, profession: e.target.value })}
                  style={{ padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                  <option value="">جميع المهن</option>
                  {professions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={filters.team} onChange={e => setFilters({ ...filters, team: e.target.value })}
                  style={{ padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                  <option value="">جميع الفرق</option>
                  {teams.map(t => <option key={t} value={t}>فرقة {t}</option>)}
                </select>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button className="btn-export" onClick={exportPDF}>📄 تصدير PDF</button>
            <button className="btn-export" onClick={exportExcel}>📊 تصدير Excel</button>
            <span style={{ marginRight: 'auto', color: 'var(--gray)', fontSize: '0.85rem', alignSelf: 'center' }}>{filtered.length} سجل</span>
          </div>

          {loading ? <div className="spinner"></div> : (
            <div id="report-print-area">
              {charts.map((chart, ci) => (
                <div key={ci} className="chart-card" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>{chart.title}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: Object.keys(chart.data).length > 6 ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                    {Object.entries(chart.data).sort((a, b) => b[1] - a[1]).map(([key, val], i) => {
                      const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ minWidth: '100px', fontSize: '0.8rem', color: 'var(--gray-light)' }}>{key}</span>
                          <div style={{ flex: 1, height: '24px', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: '6px', transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.3rem' }}>
                              {pct > 15 && <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: '700' }}>{val}</span>}
                            </div>
                          </div>
                          {pct <= 15 && <span style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS[i % COLORS.length] }}>{val}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {reportType === 'workers' && summary && (
                <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
                  <h3>ملخص البيانات</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginTop: '0.8rem' }}>
                    {[
                      { label: 'إجمالي العمال', value: summary.totalWorkers, color: '#6366f1' },
                      { label: 'عدد الفرق', value: summary.totalTeams, color: '#10b981' },
                      { label: 'عدد المناطق', value: (summary.regions || []).length, color: '#06b6d4' },
                      { label: 'عدد المهن', value: (summary.professions || []).length, color: '#f59e0b' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: s.color }}>{s.value?.toLocaleString('ar-SA') || 0}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="chart-card">
                <h3>البيانات التفصيلية ({filtered.length} سجل)</h3>
                <div style={{ overflowX: 'auto', marginTop: '0.8rem' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        {reportType === 'workers' && <><th>#</th><th>الاسم</th><th>العمر</th><th>المنطقة</th><th>المهنة</th><th>الفرقة</th><th>الحالة</th></>}
                        {reportType === 'families' && <><th>#</th><th>رب الأسرة</th><th>الفرقة</th><th>عدد الأفراد</th><th>المبلغ</th><th>المستفيدون</th></>}
                        {reportType === 'census' && <><th>#</th><th>رب الأسرة</th><th>الرقم</th><th>القرية</th><th>الذكور</th><th>الإناث</th><th>الدخل</th><th>الحالة</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 50).map((item, i) => (
                        <tr key={i}>
                          {reportType === 'workers' && <>
                            <td>{i + 1}</td><td>{item.name}</td><td>{item.age}</td><td>{item.region}</td>
                            <td>{item.profession}</td><td>{item.teamNumber}</td>
                            <td><span className={`badge ${item.status === 'نشط' ? 'badge-green' : 'badge-orange'}`}>{item.status || 'نشط'}</span></td>
                          </>}
                          {reportType === 'families' && <>
                            <td>{i + 1}</td><td>{item.name}</td><td>{item.teamNumber}</td>
                            <td>{item.memberCount || 0}</td><td>{(item.totalAmount || 0).toLocaleString('ar-SA')}</td>
                            <td>{(item.beneficiaries || []).map(b => b.name).join(', ')}</td>
                          </>}
                          {reportType === 'census' && <>
                            <td>{i + 1}</td><td>{item.headName}</td><td>{item.familyNumber}</td>
                            <td>{item.village}</td><td>{item.maleCount}</td><td>{item.femaleCount}</td>
                            <td>{(item.averageIncome || 0).toLocaleString('ar-SA')}</td>
                            <td><span className={`badge ${item.financialStatus === 'جيد' ? 'badge-green' : item.financialStatus === 'ضعيف' ? 'badge-orange' : 'badge-blue'}`}>{item.financialStatus || '—'}</span></td>
                          </>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>)}
      </div>
    );
};

export default Reports;
