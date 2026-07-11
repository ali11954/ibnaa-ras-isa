import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b', '#e11d48', '#0ea5e9'];

function Reports() {
  const { token, isAdmin, hasPermission } = useAuth();
  const [reportType, setReportType] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', region: '', profession: '', team: '' });
  const [summary, setSummary] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const headers = { Authorization: `Bearer ${token}` };
  const canWorkers = isAdmin || hasPermission('workers');
  const canFamilies = isAdmin || hasPermission('families');
  const canCensus = isAdmin || hasPermission('citizens');
  const locked = !canWorkers && !canFamilies && !canCensus;

  useEffect(() => {
    if (locked) return;
    if (!reportType) {
      if (canCensus) setReportType('census');
      else if (canWorkers) setReportType('workers');
      else if (canFamilies) setReportType('families');
    }
  }, [locked, canWorkers, canFamilies, canCensus, reportType]);

  const fetchData = useCallback(async () => {
    if (!reportType || locked) return;
    setLoading(true);
    setSummary(null);
    try {
      if (reportType === 'workers') {
        const [wRes, sRes] = await Promise.all([axios.get('/api/workers?limit=9999', { headers }), axios.get('/api/stats', { headers })]);
        setData(Array.isArray(wRes.data) ? wRes.data : (wRes.data.workers || []));
        setSummary(sRes.data || null);
      } else if (reportType === 'families') {
        const [fRes, sRes] = await Promise.all([axios.get('/api/families?limit=9999', { headers }), axios.get('/api/families/summary', { headers })]);
        setData(Array.isArray(fRes.data) ? fRes.data : (fRes.data.families || []));
        setSummary(sRes.data || null);
      } else {
        const [cRes, sRes] = await Promise.all([axios.get('/api/census?limit=9999', { headers }), axios.get('/api/census/summary', { headers })]);
        setData(Array.isArray(cRes.data) ? cRes.data : (cRes.data.data || []));
        setSummary(sRes.data || null);
      }
    } catch (err) { setData([]); setSummary(null); }
    setLoading(false);
  }, [reportType, token, locked, refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doRefresh = () => { setRefreshKey(k => k + 1); toast.success('جاري تحديث البيانات...'); };

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

  const censusStats = (() => {
    if (reportType !== 'census') return null;
    const d = filtered;
    let totalMale = 0, totalFemale = 0, totalPopulation = 0, totalIncome = 0, incomeCount = 0;
    let totalMarried = 0, totalDeceased = 0, totalMembers = 0, totalMigrants = 0;
    const villages = {}, financial = {}, housing = {}, education = {}, health = {};
    const income = {}, genderByVillage = {}, housingCond = {}, mainIncome = {};
    const relationships = {}, maritalStatus = {};

    d.forEach(c => {
      totalMale += c.maleCount || 0;
      totalFemale += c.femaleCount || 0;
      totalPopulation += (c.maleCount || 0) + (c.femaleCount || 0);
      totalMarried += c.marriedCount || 0;
      totalDeceased += c.deceasedCount || 0;
      totalMigrants += c.migrantCount || 0;
      if (c.averageIncome > 0) { totalIncome += c.averageIncome; incomeCount++; }
      const v = c.village || 'غير محدد';
      villages[v] = (villages[v] || 0) + 1;
      if (!genderByVillage[v]) genderByVillage[v] = { male: 0, female: 0 };
      genderByVillage[v].male += c.maleCount || 0;
      genderByVillage[v].female += c.femaleCount || 0;
      financial[c.financialStatus || 'غير محدد'] = (financial[c.financialStatus || 'غير محدد'] || 0) + 1;
      housing[c.housingType || 'غير محدد'] = (housing[c.housingType || 'غير محدد'] || 0) + 1;
      housingCond[c.housingCondition || 'غير محدد'] = (housingCond[c.housingCondition || 'غير محدد'] || 0) + 1;
      mainIncome[c.mainIncomeSource || 'غير محدد'] = (mainIncome[c.mainIncomeSource || 'غير محدد'] || 0) + 1;
      if (c.members && c.members.length > 0) {
        totalMembers += c.members.length;
        c.members.forEach(m => {
          education[m.educationLevel || 'غير محدد'] = (education[m.educationLevel || 'غير محدد'] || 0) + 1;
          health[m.healthStatus || 'غير محدد'] = (health[m.healthStatus || 'غير محدد'] || 0) + 1;
          relationships[m.relationship || 'غير محدد'] = (relationships[m.relationship || 'غير محدد'] || 0) + 1;
          maritalStatus[m.maritalStatus || 'غير محدد'] = (maritalStatus[m.maritalStatus || 'غير محدد'] || 0) + 1;
        });
      }
      const inc = c.averageIncome || 0;
      if (inc > 0) {
        let bracket = 'أقل من 50,000';
        if (inc >= 500000) bracket = '500,000+';
        else if (inc >= 300000) bracket = '300,000 - 500,000';
        else if (inc >= 200000) bracket = '200,000 - 300,000';
        else if (inc >= 100000) bracket = '100,000 - 200,000';
        else if (inc >= 50000) bracket = '50,000 - 100,000';
        income[bracket] = (income[bracket] || 0) + 1;
      }
    });

    return {
      totalForms: d.length, totalPopulation, totalMale, totalFemale,
      avgIncome: incomeCount > 0 ? Math.round(totalIncome / incomeCount) : 0,
      totalIncome, incomeCount, totalMarried, totalDeceased, totalMembers, totalMigrants,
      villages, financial, housing, housingCond, mainIncome, education, health,
      income, genderByVillage, relationships, maritalStatus,
      avgFamilySize: d.length > 0 ? Math.round(totalPopulation / d.length) : 0,
    };
  })();

  const buildChart = (data, title) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);
    return { title, entries, max };
  };

  const allCharts = (() => {
    if (reportType === 'census' && censusStats) {
      return [
        buildChart(censusStats.villages, 'التوزيع حسب القرية'),
        buildChart(censusStats.financial, 'الحالة المادية'),
        buildChart(censusStats.housing, 'نوع السكن'),
        buildChart(censusStats.housingCond, 'حالة السكن'),
        buildChart(censusStats.mainIncome, 'مصدر الدخل الرئيسي'),
        buildChart(censusStats.education, 'المستوى التعليمي'),
        buildChart(censusStats.health, 'الحالة الصحية'),
        buildChart(censusStats.relationships, 'صلى القرابة'),
        buildChart(censusStats.maritalStatus, 'الحالة الاجتماعية'),
        buildChart(censusStats.income, 'مستويات الدخل'),
      ];
    }
    if (reportType === 'workers') {
      const rc = {}, pc = {}, ag = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
      filtered.forEach(w => { rc[w.region] = (rc[w.region] || 0) + 1; pc[w.profession] = (pc[w.profession] || 0) + 1; const a = w.age || 0; if (a <= 25) ag['18-25']++; else if (a <= 35) ag['26-35']++; else if (a <= 45) ag['36-45']++; else if (a <= 55) ag['46-55']++; else ag['56+']++; });
      return [buildChart(rc, 'التوزيع حسب المنطقة'), buildChart(pc, 'التوزيع حسب المهنة'), buildChart(ag, 'التوزيع حسب العمر')];
    }
    const tc = {}; filtered.forEach(f => { tc[`فرقة ${f.teamNumber}`] = (tc[`فرقة ${f.teamNumber}`] || 0) + 1; });
    return [buildChart(tc, 'التوزيع حسب الفرق')];
  })();

  const inputStyle = { padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' };

  const statCard = (icon, label, value, color, sub) => (
    <div style={{ background: 'rgba(30,41,59,0.6)', border: `1px solid ${color}33`, borderRadius: '16px', padding: '1.2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '4rem', opacity: 0.05, color }}>{icon}</div>
      <div style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>{icon}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: '800', color, lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString('ar-SA') : value || 0}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--gray-light)', marginTop: '0.3rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );

  const chartBar = (key, val, max, colorIdx) => {
    const pct = max > 0 ? Math.round((val / max) * 100) : 0;
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <span style={{ minWidth: '90px', fontSize: '0.8rem', color: 'var(--gray-light)', textAlign: 'left' }}>{key}</span>
        <div style={{ flex: 1, height: '28px', background: 'rgba(99,102,241,0.06)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(135deg, ${COLORS[colorIdx % COLORS.length]}, ${COLORS[(colorIdx + 1) % COLORS.length]})`, borderRadius: '8px', transition: 'width 0.6s ease', display: 'flex', alignItems: 'center', justifyContent: pct > 20 ? 'flex-end' : 'flex-start', padding: '0 0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '700', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{val}</span>
          </div>
        </div>
        <span style={{ minWidth: '35px', fontSize: '0.75rem', fontWeight: '700', color: COLORS[colorIdx % COLORS.length], textAlign: 'right' }}>{pct}%</span>
      </div>
    );
  };

  const dualBarChart = (title, data1, label1, color1, data2, label2, color2) => {
    const keys = [...new Set([...Object.keys(data1), ...Object.keys(data2)])];
    return (
      <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>{title}</h3>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}><span style={{ width: 12, height: 12, background: color1, borderRadius: 3, display: 'inline-block' }} />{label1}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}><span style={{ width: 12, height: 12, background: color2, borderRadius: 3, display: 'inline-block' }} />{label2}</span>
        </div>
        {keys.map(k => {
          const v1 = data1[k] || 0, v2 = data2[k] || 0;
          const mx = Math.max(v1, v2, 1);
          return (
            <div key={k} style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-light)', marginBottom: '0.2rem' }}>{k}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2px' }}>
                <span style={{ minWidth: '30px', fontSize: '0.7rem', color: color1 }}>{v1}</span>
                <div style={{ flex: 1, height: '12px', background: 'rgba(99,102,241,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(v1 / mx) * 100}%`, height: '100%', background: color1, borderRadius: '4px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ minWidth: '30px', fontSize: '0.7rem', color: color2 }}>{v2}</span>
                <div style={{ flex: 1, height: '12px', background: 'rgba(99,102,241,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(v2 / mx) * 100}%`, height: '100%', background: color2, borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const exportPDF = () => {
    const el = document.getElementById('report-print-area');
    if (!el) { toast.error('لا توجد بيانات'); return; }
    const w = window.open('', '_blank');
    const title = reportType === 'workers' ? 'كشف العمال' : reportType === 'families' ? 'كشف المساعدات' : 'إحصاء المواطنين';
    w.document.write(`<html dir="rtl"><head><title>تقرير ${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;direction:rtl;padding:2rem;color:#1e293b}h1{text-align:center;font-size:1.5rem;color:#4f46e5}h2{font-size:1rem;margin:1rem 0;border-bottom:2px solid #6366f1;padding-bottom:.3rem}.sub{text-align:center;color:#64748b;margin-bottom:1rem}.cards{display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:1rem}.card{flex:1;min-width:120px;text-align:center;padding:1rem;background:#f1f5f9;border-radius:8px}.card .num{font-size:1.5rem;font-weight:800;color:#4f46e5}.card .lbl{font-size:.7rem;color:#64748b}table{width:100%;border-collapse:collapse;font-size:.75rem}th{background:#f1f5f9;padding:.4rem;border:1px solid #e2e8f0}td{padding:.3rem .4rem;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.bar{display:flex;align-items:center;gap:.4rem;margin:.2rem 0}.bar-t{flex:1;height:16px;background:#e2e8f0;border-radius:3px;overflow:hidden}.bar-f{height:100%;border-radius:3px}.bar-l{min-width:80px;font-size:.7rem}.bar-v{min-width:25px;font-size:.7rem;font-weight:700}.ft{text-align:center;margin-top:1.5rem;color:#94a3b8;font-size:.65rem;border-top:1px solid #e2e8f0;padding-top:.4rem}@media print{body{padding:1rem}}</style></head><body><h1>ابناء راس عيسى</h1><p class="sub">تقرير ${title} — ${new Date().toLocaleDateString('ar-SA')}</p>`);
    if (censusStats && reportType === 'census') {
      w.document.write(`<div class="cards">`);
      [['👥', 'إجمالي السكان', censusStats.totalPopulation], ['♂️', 'الذكور', censusStats.totalMale], ['♀️', 'الإناث', censusStats.totalFemale], ['💰', 'متوسط الدخل', censusStats.avgIncome.toLocaleString('ar-SA') + ' ر.ي'], ['🏠', 'عدد الأسر', censusStats.totalForms], ['💍', 'المتزوجون', censusStats.totalMarried]].forEach(([i, l, v]) => {
        w.document.write(`<div class="card"><div class="num">${typeof v === 'number' ? v.toLocaleString('ar-SA') : v}</div><div class="lbl">${i} ${l}</div></div>`);
      });
      w.document.write(`</div>`);
    }
    allCharts.forEach(c => {
      w.document.write(`<h2>${c.title}</h2>`);
      c.entries.forEach(([k, v], i) => {
        const p = Math.round((v / c.max) * 100);
        w.document.write(`<div class="bar"><span class="bar-l">${k}</span><div class="bar-t"><div class="bar-f" style="width:${p}%;background:${COLORS[i % COLORS.length]}"></div></div><span class="bar-v">${v}</span></div>`);
      });
    });
    w.document.write(`<h2>البيانات (${filtered.length})</h2><table><thead><tr>`);
    if (reportType === 'workers') w.document.write('<th>#</th><th>الاسم</th><th>العمر</th><th>المنطقة</th><th>المهنة</th><th>الفرقة</th>');
    else if (reportType === 'families') w.document.write('<th>#</th><th>الاسم</th><th>الفرقة</th><th>عدد الأفراد</th><th>المبلغ</th>');
    else w.document.write('<th>#</th><th>رب الأسرة</th><th>الرقم</th><th>القرية</th><th>الذكور</th><th>الإناث</th><th>الدخل</th><th>الحالة</th>');
    w.document.write('</tr></thead><tbody>');
    filtered.forEach((item, i) => {
      w.document.write('<tr>');
      if (reportType === 'workers') w.document.write(`<td>${i+1}</td><td>${item.name||''}</td><td>${item.age||''}</td><td>${item.region||''}</td><td>${item.profession||''}</td><td>${item.teamNumber||''}</td>`);
      else if (reportType === 'families') w.document.write(`<td>${i+1}</td><td>${item.name||''}</td><td>${item.teamNumber||''}</td><td>${item.memberCount||0}</td><td>${(item.totalAmount||0).toLocaleString('ar-SA')}</td>`);
      else w.document.write(`<td>${i+1}</td><td>${item.headName||''}</td><td>${item.familyNumber||''}</td><td>${item.village||''}</td><td>${item.maleCount||0}</td><td>${item.femaleCount||0}</td><td>${(item.averageIncome||0).toLocaleString('ar-SA')}</td><td>${item.financialStatus||'—'}</td>`);
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
    else { csv += 'رب الأسرة,الرقم,القرية,الذكور,الإناث,الدخل,الحالة,نوع السكن,حالة السكن,مصدر الدخل,مدخل البيانات\n'; filtered.forEach(c => { csv += `${c.headName||''},${c.familyNumber||''},${c.village||''},${c.maleCount||0},${c.femaleCount||0},${c.averageIncome||0},${c.financialStatus||''},${c.housingType||''},${c.housingCondition||''},${c.mainIncomeSource||''},${c.enteredByName||''}\n`; }); }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report_${reportType}_${Date.now()}.csv`; a.click();
  };

  const selectBtn = (type, label) => (
    <button key={type} onClick={() => { setReportType(type); setFilters({ search: '', region: '', profession: '', team: '' }); }}
      style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid', borderColor: reportType === type ? 'var(--primary)' : 'rgba(99,102,241,0.2)', background: reportType === type ? 'rgba(99,102,241,0.2)' : 'transparent', color: reportType === type ? 'var(--primary-light)' : 'var(--gray-light)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: '600' }}>{label}</button>
  );

  if (locked) return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">التقارير</span>
        <h2 className="section-title">تقارير <span className="gradient-text">مميزة</span></h2>
      </div>
      <div className="locked-content"><div className="locked-icon">🔒</div><h3>ليس لديك صلاحيات لعرض التقارير</h3><p>تواصل مع المدير للحصول على الصلاحيات المناسبة</p></div>
    </div>
  );
  if (!reportType) return null;

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">التقارير</span>
        <h2 className="section-title">تقارير <span className="gradient-text">شاملة</span></h2>
        <p className="section-desc">تقارير شاملة مع بطاقات ذكية ورسوم بيانية متقدمة</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {canCensus && selectBtn('census', '📋 التعداد')}
        {canWorkers && selectBtn('workers', '👷 العمال')}
        {canFamilies && selectBtn('families', '👨‍👩‍👧‍👦 المساعدات')}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="بحث بالاسم، القرية، رقم الأسرة..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: '150px' }} />
        {reportType === 'workers' && <>
          <select value={filters.region} onChange={e => setFilters({ ...filters, region: e.target.value })} style={inputStyle}><option value="">جميع المناطق</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select>
          <select value={filters.profession} onChange={e => setFilters({ ...filters, profession: e.target.value })} style={inputStyle}><option value="">جميع المهن</option>{professions.map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select value={filters.team} onChange={e => setFilters({ ...filters, team: e.target.value })} style={inputStyle}><option value="">جميع الفرق</option>{teams.map(t => <option key={t} value={t}>فرقة {t}</option>)}</select>
        </>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <button className="btn-export" onClick={exportPDF}>📄 تصدير PDF</button>
        <button className="btn-export" onClick={exportExcel}>📊 تصدير Excel</button>
        <button className="btn-primary" onClick={doRefresh} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>🔄 تحديث البيانات</button>
        <span style={{ marginRight: 'auto', color: 'var(--gray)', fontSize: '0.85rem' }}>{filtered.length} سجل — آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}</span>
      </div>

      {loading ? <div className="spinner"></div> : (
        <div id="report-print-area">
          {reportType === 'census' && censusStats && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
                {statCard('👥', 'إجمالي السكان', censusStats.totalPopulation, '#6366f1', `${censusStats.totalForms} أسرة`)}
                {statCard('♂️', 'الذكور', censusStats.totalMale, '#06b6d4', `${Math.round((censusStats.totalMale / Math.max(censusStats.totalPopulation, 1)) * 100)}%`)}
                {statCard('♀️', 'الإناث', censusStats.totalFemale, '#ec4899', `${Math.round((censusStats.totalFemale / Math.max(censusStats.totalPopulation, 1)) * 100)}%`)}
                {statCard('💰', 'متوسط الدخل', censusStats.avgIncome, '#f59e0b', 'ر.ي')}
                {statCard('🏠', 'عدد الأسر', censusStats.totalForms, '#10b981', `متوسط ${censusStats.avgFamilySize} فرد`)}
                {statCard('💍', 'المتزوجون', censusStats.totalMarried, '#8b5cf6')}
                {statCard('🕊️', 'المتوفون', censusStats.totalDeceased, '#ef4444')}
                {statCard('📊', 'إجمالي الأفراد', censusStats.totalMembers, '#14b8a6', 'في جميع الأسر')}
              </div>
              {dualBarChart('♂️♀️ توزيع الجنس حسب القرية',
                Object.fromEntries(Object.entries(censusStats.genderByVillage).map(([k, v]) => [k, v.male])), 'ذكور', '#06b6d4',
                Object.fromEntries(Object.entries(censusStats.genderByVillage).map(([k, v]) => [k, v.female])), 'إناث', '#ec4899'
              )}
            </>
          )}

          {allCharts.map((chart, ci) => (
            <div key={ci} className="chart-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>{chart.title}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: chart.entries.length > 6 ? '1fr 1fr' : '1fr', gap: '0.3rem' }}>
                {chart.entries.map(([key, val], i) => chartBar(key, val, chart.max, ci * 3 + i))}
              </div>
            </div>
          ))}

          <div className="chart-card">
            <h3>البيانات التفصيلية ({filtered.length} سجل)</h3>
            <div style={{ overflowX: 'auto', marginTop: '0.8rem' }}>
              <table className="data-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    {reportType === 'workers' && <><th>#</th><th>الاسم</th><th>العمر</th><th>المنطقة</th><th>المهنة</th><th>الفرقة</th></>}
                    {reportType === 'families' && <><th>#</th><th>رب الأسرة</th><th>الفرقة</th><th>عدد الأفراد</th><th>المبلغ</th><th>المستفيدون</th></>}
                    {reportType === 'census' && <><th>#</th><th>رب الأسرة</th><th>الرقم</th><th>القرية</th><th>الذكور</th><th>الإناث</th><th>الدخل</th><th>الحالة</th><th>السكن</th><th>مدخل البيانات</th></>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((item, i) => (
                    <tr key={i}>
                      {reportType === 'workers' && <><td>{i + 1}</td><td>{item.name}</td><td>{item.age}</td><td>{item.region}</td><td>{item.profession}</td><td>{item.teamNumber}</td></>}
                      {reportType === 'families' && <><td>{i + 1}</td><td>{item.name}</td><td>{item.teamNumber}</td><td>{item.memberCount || 0}</td><td>{(item.totalAmount || 0).toLocaleString('ar-SA')}</td><td>{(item.beneficiaries || []).map(b => b.name).join(', ')}</td></>}
                      {reportType === 'census' && <><td>{i + 1}</td><td>{item.headName}</td><td>{item.familyNumber}</td><td>{item.village}</td><td>{item.maleCount}</td><td>{item.femaleCount}</td><td>{(item.averageIncome || 0).toLocaleString('ar-SA')} ر.ي</td><td><span className={`badge ${item.financialStatus === 'جيدة' ? 'badge-green' : item.financialStatus === 'سيئة' ? 'badge-orange' : 'badge-blue'}`}>{item.financialStatus || '—'}</span></td><td>{item.housingType || '—'}</td><td style={{ color: '#10b981', fontSize: '0.75rem' }}>{item.enteredByName || '—'}</td></>}
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
