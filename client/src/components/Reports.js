import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b'];

function Reports() {
  const { token, isAdmin, hasPermission } = useAuth();
  const [reportType, setReportType] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', region: '', profession: '', team: '' });
  const [summary, setSummary] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const canWorkers = isAdmin || hasPermission('workers');
  const canFamilies = isAdmin || hasPermission('families');
  const canCensus = isAdmin || hasPermission('citizens');
  const locked = !canWorkers && !canFamilies && !canCensus;

  useEffect(() => {
    if (locked) return;
    if (!reportType) {
      if (canWorkers) setReportType('workers');
      else if (canFamilies) setReportType('families');
      else if (canCensus) setReportType('census');
    }
  }, [locked, canWorkers, canFamilies, canCensus, reportType]);

  useEffect(() => {
    if (!reportType || locked) return;
    let cancelled = false;
    setLoading(true);
    setSummary(null);

    const fetchAll = async () => {
      try {
        if (reportType === 'workers') {
          const [wRes, sRes] = await Promise.all([
            axios.get('/api/workers?limit=9999', { headers }),
            axios.get('/api/stats', { headers }),
          ]);
          if (!cancelled) {
            setData(Array.isArray(wRes.data) ? wRes.data : (wRes.data.workers || []));
            setSummary(sRes.data || null);
          }
        } else if (reportType === 'families') {
          const [fRes, sRes] = await Promise.all([
            axios.get('/api/families?limit=9999', { headers }),
            axios.get('/api/families/summary', { headers }),
          ]);
          if (!cancelled) {
            setData(Array.isArray(fRes.data) ? fRes.data : (fRes.data.families || []));
            setSummary(sRes.data || null);
          }
        } else {
          const [cRes, sRes] = await Promise.all([
            axios.get('/api/census?limit=9999', { headers }),
            axios.get('/api/census/summary', { headers }),
          ]);
          if (!cancelled) {
            setData(Array.isArray(cRes.data) ? cRes.data : (cRes.data.data || []));
            setSummary(sRes.data || null);
          }
        }
      } catch (err) {
        console.error('Report fetch error:', err);
        if (!cancelled) { setData([]); setSummary(null); }
      }
      if (!cancelled) setLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [reportType, token, locked]);

  const safeData = Array.isArray(data) ? data : [];

  const filtered = safeData.filter(item => {
    if (!item) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const name = (item.name || item.headName || '').toLowerCase();
      const village = (item.village || '').toLowerCase();
      const famNum = (item.familyNumber || '').toLowerCase();
      if (!name.includes(s) && !village.includes(s) && !famNum.includes(s)) return false;
    }
    if (filters.region && item.region !== filters.region) return false;
    if (filters.profession && item.profession !== filters.profession) return false;
    if (filters.team && String(item.teamNumber) !== String(filters.team)) return false;
    return true;
  });

  const regions = [...new Set(safeData.map(d => d.region).filter(Boolean))];
  const professions = [...new Set(safeData.map(d => d.profession).filter(Boolean))];
  const teams = [...new Set(safeData.map(d => d.teamNumber).filter(Boolean))].sort((a, b) => a - b);

  const charts = (() => {
    if (reportType === 'workers') {
      const rc = {}; filtered.forEach(w => { rc[w.region] = (rc[w.region] || 0) + 1; });
      const pc = {}; filtered.forEach(w => { pc[w.profession] = (pc[w.profession] || 0) + 1; });
      const ag = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
      filtered.forEach(w => { const a = w.age || 0; if (a <= 25) ag['18-25']++; else if (a <= 35) ag['26-35']++; else if (a <= 45) ag['36-45']++; else if (a <= 55) ag['46-55']++; else ag['56+']++; });
      return [{ title: 'التوزيع حسب المنطقة', data: rc }, { title: 'التوزيع حسب المهنة', data: pc }, { title: 'التوزيع حسب العمر', data: ag }];
    }
    if (reportType === 'families') {
      const tc = {}; filtered.forEach(f => { tc[`فرقة ${f.teamNumber}`] = (tc[`فرقة ${f.teamNumber}`] || 0) + 1; });
      return [{ title: 'التوزيع حسب الفرق', data: tc }];
    }
    const sc = {}; filtered.forEach(c => { sc[c.financialStatus || 'غير محدد'] = (sc[c.financialStatus || 'غير محدد'] || 0) + 1; });
    const hc = {}; filtered.forEach(c => { hc[c.housingType || 'غير محدد'] = (hc[c.housingType || 'غير محدد'] || 0) + 1; });
    return [{ title: 'الحالة المادية', data: sc }, { title: 'نوع السكن', data: hc }];
  })();

  const allVals = charts.flatMap(c => Object.values(c.data));
  const maxVal = allVals.length > 0 ? Math.max(...allVals, 1) : 1;

  const exportPDF = () => {
    const el = document.getElementById('report-print-area');
    if (!el) { toast.error('لا توجد بيانات'); return; }
    const w = window.open('', '_blank');
    const title = reportType === 'workers' ? 'كشف العمال' : reportType === 'families' ? 'كشف المساعدات' : 'إحصاء المواطنين';
    w.document.write(`<html dir="rtl"><head><title>تقرير ${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;direction:rtl;padding:2rem;color:#1e293b}h1{text-align:center;font-size:1.5rem;color:#4f46e5}h2{font-size:1rem;margin:1rem 0;border-bottom:2px solid #6366f1;padding-bottom:.3rem}.sub{text-align:center;color:#64748b;margin-bottom:1rem}table{width:100%;border-collapse:collapse;font-size:.75rem}th{background:#f1f5f9;padding:.4rem;border:1px solid #e2e8f0}td{padding:.3rem .4rem;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.bar{display:flex;align-items:center;gap:.4rem;margin:.2rem 0}.bar-t{flex:1;height:18px;background:#e2e8f0;border-radius:3px;overflow:hidden}.bar-f{height:100%;border-radius:3px}.bar-l{min-width:80px;font-size:.7rem}.bar-v{min-width:25px;font-size:.7rem;font-weight:700}.ft{text-align:center;margin-top:1.5rem;color:#94a3b8;font-size:.65rem;border-top:1px solid #e2e8f0;padding-top:.4rem}@media print{body{padding:1rem}}</style></head><body><h1>ابناء راس عيسى</h1><p class="sub">تقرير ${title} — ${new Date().toLocaleDateString('ar-SA')}</p>`);
    charts.forEach(c => {
      w.document.write(`<h2>${c.title}</h2>`);
      Object.entries(c.data).forEach(([k, v]) => {
        const p = Math.round((v / maxVal) * 100);
        const ci = Object.keys(c.data).indexOf(k) % COLORS.length;
        w.document.write(`<div class="bar"><span class="bar-l">${k}</span><div class="bar-t"><div class="bar-f" style="width:${p}%;background:${COLORS[ci]}"></div></div><span class="bar-v">${v}</span></div>`);
      });
    });
    w.document.write(`<h2>البيانات (${filtered.length})</h2><table><thead><tr>`);
    if (reportType === 'workers') w.document.write('<th>#</th><th>الاسم</th><th>العمر</th><th>المنطقة</th><th>المهنة</th><th>الفرقة</th>');
    else if (reportType === 'families') w.document.write('<th>#</th><th>الاسم</th><th>الفرقة</th><th>عدد الأفراد</th><th>المبلغ</th>');
    else w.document.write('<th>#</th><th>رب الأسرة</th><th>الرقم</th><th>القرية</th><th>الذكور</th><th>الإناث</th><th>الدخل</th>');
    w.document.write('</tr></thead><tbody>');
    filtered.forEach((item, i) => {
      w.document.write('<tr>');
      if (reportType === 'workers') w.document.write(`<td>${i+1}</td><td>${item.name||''}</td><td>${item.age||''}</td><td>${item.region||''}</td><td>${item.profession||''}</td><td>${item.teamNumber||''}</td>`);
      else if (reportType === 'families') w.document.write(`<td>${i+1}</td><td>${item.name||''}</td><td>${item.teamNumber||''}</td><td>${item.memberCount||0}</td><td>${(item.totalAmount||0).toLocaleString('ar-SA')}</td>`);
      else w.document.write(`<td>${i+1}</td><td>${item.headName||''}</td><td>${item.familyNumber||''}</td><td>${item.village||''}</td><td>${item.maleCount||0}</td><td>${item.femaleCount||0}</td><td>${(item.averageIncome||0).toLocaleString('ar-SA')}</td>`);
      w.document.write('</tr>');
    });
    w.document.write('</tbody></table><div class="ft">ابناء راس عيسى — الغيث لتصميم التطبيقات والأنظمة</div></body></html>');
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const exportExcel = () => {
    let csv = '\uFEFF';
    if (reportType === 'workers') { csv += 'الاسم,العمر,المنطقة,المهنة,الفرقة\n'; filtered.forEach(w2 => { csv += `${w2.name||''},${w2.age||''},${w2.region||''},${w2.profession||''},${w2.teamNumber||''}\n`; }); }
    else if (reportType === 'families') { csv += 'الاسم,الفرقة,عدد الأفراد,المبلغ\n'; filtered.forEach(f => { csv += `${f.name||''},${f.teamNumber||''},${f.memberCount||0},${f.totalAmount||0}\n`; }); }
    else { csv += 'رب الأسرة,الرقم,القرية,الذكور,الإناث,الدخل\n'; filtered.forEach(c => { csv += `${c.headName||''},${c.familyNumber||''},${c.village||''},${c.maleCount||0},${c.femaleCount||0},${c.averageIncome||0}\n`; }); }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report_${reportType}_${Date.now()}.csv`; a.click();
  };

  const selectBtn = (type, label) => (
    <button key={type} onClick={() => { setReportType(type); setFilters({ search: '', region: '', profession: '', team: '' }); }}
      style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid', borderColor: reportType === type ? 'var(--primary)' : 'rgba(99,102,241,0.2)', background: reportType === type ? 'rgba(99,102,241,0.2)' : 'transparent', color: reportType === type ? 'var(--primary-light)' : 'var(--gray-light)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: '600' }}>{label}</button>
  );

  const inputStyle = { padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' };

  if (locked) {
    return (
      <div className="tab-section">
        <div className="section-header">
          <span className="section-badge">التقارير</span>
          <h2 className="section-title">تقارير <span className="gradient-text">مميزة</span></h2>
        </div>
        <div className="locked-content">
          <div className="locked-icon">🔒</div>
          <h3>ليس لديك صلاحيات لعرض التقارير</h3>
          <p>تواصل مع المدير للحصول على الصلاحيات المناسبة</p>
        </div>
      </div>
    );
  }

  if (!reportType) return null;

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">التقارير</span>
        <h2 className="section-title">تقارير <span className="gradient-text">مميزة</span></h2>
        <p className="section-desc">تقارير شاملة مع رسوم بيانية وتصدير احترافي</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {canWorkers && selectBtn('workers', '👷 العمال')}
        {canFamilies && selectBtn('families', '👨‍👩‍👧‍👦 المساعدات')}
        {canCensus && selectBtn('census', '📋 التعداد')}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="بحث بالاسم، القرية، رقم الأسرة..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: '150px' }} />
        {reportType === 'workers' && <>
          <select value={filters.region} onChange={e => setFilters({ ...filters, region: e.target.value })} style={inputStyle}>
            <option value="">جميع المناطق</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.profession} onChange={e => setFilters({ ...filters, profession: e.target.value })} style={inputStyle}>
            <option value="">جميع المهن</option>{professions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.team} onChange={e => setFilters({ ...filters, team: e.target.value })} style={inputStyle}>
            <option value="">جميع الفرق</option>{teams.map(t => <option key={t} value={t}>فرقة {t}</option>)}
          </select>
        </>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <button className="btn-export" onClick={exportPDF}>📄 تصدير PDF</button>
        <button className="btn-export" onClick={exportExcel}>📊 تصدير Excel</button>
        <span style={{ marginRight: 'auto', color: 'var(--gray)', fontSize: '0.85rem' }}>{filtered.length} سجل</span>
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : (
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
                      <div style={{ flex: 1, height: '24px', background: 'rgba(99,102,241,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
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
                    {reportType === 'workers' && <><th>#</th><th>الاسم</th><th>العمر</th><th>المنطقة</th><th>المهنة</th><th>الفرقة</th></>}
                    {reportType === 'families' && <><th>#</th><th>رب الأسرة</th><th>الفرقة</th><th>عدد الأفراد</th><th>المبلغ</th><th>المستفيدون</th></>}
                    {reportType === 'census' && <><th>#</th><th>رب الأسرة</th><th>الرقم</th><th>القرية</th><th>الذكور</th><th>الإناث</th><th>الدخل</th><th>الحالة</th></>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((item, i) => (
                    <tr key={i}>
                      {reportType === 'workers' && <><td>{i + 1}</td><td>{item.name}</td><td>{item.age}</td><td>{item.region}</td><td>{item.profession}</td><td>{item.teamNumber}</td></>}
                      {reportType === 'families' && <><td>{i + 1}</td><td>{item.name}</td><td>{item.teamNumber}</td><td>{item.memberCount || 0}</td><td>{(item.totalAmount || 0).toLocaleString('ar-SA')}</td><td>{(item.beneficiaries || []).map(b => b.name).join(', ')}</td></>}
                      {reportType === 'census' && <><td>{i + 1}</td><td>{item.headName}</td><td>{item.familyNumber}</td><td>{item.village}</td><td>{item.maleCount}</td><td>{item.femaleCount}</td><td>{(item.averageIncome || 0).toLocaleString('ar-SA')}</td><td><span className={`badge ${item.financialStatus === 'جيد' ? 'badge-green' : 'badge-orange'}`}>{item.financialStatus || '—'}</span></td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
