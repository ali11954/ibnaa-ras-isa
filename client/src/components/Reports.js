import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b', '#e11d48', '#0ea5e9'];

function Reports() {
  const { token, user, isAdmin, hasPermission } = useAuth();
  const canExport = isAdmin || user?.username === 'esa';
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
    if (filters.village && item.village !== filters.village) return false;
    if (filters.profession && item.profession !== filters.profession) return false;
    if (filters.team && String(item.teamNumber) !== String(filters.team)) return false;
    return true;
  });

  const regions = [...new Set(safeData.map(d => d.region || d.village).filter(Boolean))];
  const professions = [...new Set(safeData.map(d => d.profession).filter(Boolean))];
  const teams = [...new Set(safeData.map(d => d.teamNumber).filter(Boolean))].sort((a, b) => a - b);

  const censusStats = (() => {
    if (reportType !== 'census') return null;
    const d = filtered;
    let totalMale = 0, totalFemale = 0, totalPopulation = 0, totalIncome = 0, incomeCount = 0;
    let totalMarried = 0, totalDeceased = 0, totalMembers = 0, totalMigrants = 0;
    const emptyVillage = () => ({ families: 0, population: 0, male: 0, female: 0, married: 0, deceased: 0, members: 0, totalIncome: 0, incomeCount: 0, financial: {}, housing: {}, housingCond: {}, mainIncome: {}, education: {}, health: {}, relationships: {}, maritalStatus: {} });
    const villages = {}, financial = {}, housing = {}, education = {}, health = {};
    const income = {}, genderByVillage = {}, housingCond = {}, mainIncome = {};
    const relationships = {}, maritalStatus = {};
    const villageComparison = {};
    const crossVillage = {
      educationByVillage: {}, healthByVillage: {}, relationshipsByVillage: {},
      maritalStatusByVillage: {}, financialByVillage: {}, housingByVillage: {},
      housingCondByVillage: {}, mainIncomeByVillage: {}, incomeByVillage: {},
    };

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
      if (!villageComparison[v]) villageComparison[v] = emptyVillage();
      const vc = villageComparison[v];
      vc.families += 1;
      vc.population += (c.maleCount || 0) + (c.femaleCount || 0);
      vc.male += c.maleCount || 0;
      vc.female += c.femaleCount || 0;
      vc.married += c.marriedCount || 0;
      vc.deceased += c.deceasedCount || 0;
      if (c.averageIncome > 0) { vc.totalIncome += c.averageIncome; vc.incomeCount += 1; }
      const fKey = c.financialStatus || 'غير محدد';
      vc.financial[fKey] = (vc.financial[fKey] || 0) + 1;
      financial[fKey] = (financial[fKey] || 0) + 1;
      if (!crossVillage.financialByVillage[fKey]) crossVillage.financialByVillage[fKey] = {};
      crossVillage.financialByVillage[fKey][v] = (crossVillage.financialByVillage[fKey][v] || 0) + 1;
      const hKey = (c.housing?.housingType) || 'غير محدد';
      vc.housing[hKey] = (vc.housing[hKey] || 0) + 1;
      housing[hKey] = (housing[hKey] || 0) + 1;
      if (!crossVillage.housingByVillage[hKey]) crossVillage.housingByVillage[hKey] = {};
      crossVillage.housingByVillage[hKey][v] = (crossVillage.housingByVillage[hKey][v] || 0) + 1;
      const hcKey = (c.housing?.housingCondition) || 'غير محدد';
      vc.housingCond[hcKey] = (vc.housingCond[hcKey] || 0) + 1;
      housingCond[hcKey] = (housingCond[hcKey] || 0) + 1;
      if (!crossVillage.housingCondByVillage[hcKey]) crossVillage.housingCondByVillage[hcKey] = {};
      crossVillage.housingCondByVillage[hcKey][v] = (crossVillage.housingCondByVillage[hcKey][v] || 0) + 1;
      const miKey = c.mainIncomeSource || 'غير محدد';
      vc.mainIncome[miKey] = (vc.mainIncome[miKey] || 0) + 1;
      mainIncome[miKey] = (mainIncome[miKey] || 0) + 1;
      if (!crossVillage.mainIncomeByVillage[miKey]) crossVillage.mainIncomeByVillage[miKey] = {};
      crossVillage.mainIncomeByVillage[miKey][v] = (crossVillage.mainIncomeByVillage[miKey][v] || 0) + 1;
      const inc = c.averageIncome || 0;
      if (inc > 0) {
        let bracket = 'أقل من 50,000';
        if (inc >= 500000) bracket = '500,000+';
        else if (inc >= 300000) bracket = '300,000 - 500,000';
        else if (inc >= 200000) bracket = '200,000 - 300,000';
        else if (inc >= 100000) bracket = '100,000 - 200,000';
        else if (inc >= 50000) bracket = '50,000 - 100,000';
        income[bracket] = (income[bracket] || 0) + 1;
        if (!crossVillage.incomeByVillage[bracket]) crossVillage.incomeByVillage[bracket] = {};
        crossVillage.incomeByVillage[bracket][v] = (crossVillage.incomeByVillage[bracket][v] || 0) + 1;
      }
      if (c.members && c.members.length > 0) {
        totalMembers += c.members.length;
        vc.members += c.members.length;
        c.members.forEach(m => {
          const eKey = m.educationLevel || 'غير محدد';
          vc.education[eKey] = (vc.education[eKey] || 0) + 1;
          education[eKey] = (education[eKey] || 0) + 1;
          if (!crossVillage.educationByVillage[eKey]) crossVillage.educationByVillage[eKey] = {};
          crossVillage.educationByVillage[eKey][v] = (crossVillage.educationByVillage[eKey][v] || 0) + 1;
          const hsKey = m.healthStatus || 'غير محدد';
          vc.health[hsKey] = (vc.health[hsKey] || 0) + 1;
          health[hsKey] = (health[hsKey] || 0) + 1;
          if (!crossVillage.healthByVillage[hsKey]) crossVillage.healthByVillage[hsKey] = {};
          crossVillage.healthByVillage[hsKey][v] = (crossVillage.healthByVillage[hsKey][v] || 0) + 1;
          const rKey = m.relationship || 'غير محدد';
          vc.relationships[rKey] = (vc.relationships[rKey] || 0) + 1;
          relationships[rKey] = (relationships[rKey] || 0) + 1;
          if (!crossVillage.relationshipsByVillage[rKey]) crossVillage.relationshipsByVillage[rKey] = {};
          crossVillage.relationshipsByVillage[rKey][v] = (crossVillage.relationshipsByVillage[rKey][v] || 0) + 1;
          const msKey = m.maritalStatus || 'غير محدد';
          vc.maritalStatus[msKey] = (vc.maritalStatus[msKey] || 0) + 1;
          maritalStatus[msKey] = (maritalStatus[msKey] || 0) + 1;
          if (!crossVillage.maritalStatusByVillage[msKey]) crossVillage.maritalStatusByVillage[msKey] = {};
          crossVillage.maritalStatusByVillage[msKey][v] = (crossVillage.maritalStatusByVillage[msKey][v] || 0) + 1;
        });
      }
    });

    return {
      totalForms: d.length, totalPopulation, totalMale, totalFemale,
      avgIncome: incomeCount > 0 ? Math.round(totalIncome / incomeCount) : 0,
      totalIncome, incomeCount, totalMarried, totalDeceased, totalMembers, totalMigrants,
      villages, financial, housing, housingCond, mainIncome, education, health,
      income, genderByVillage, relationships, maritalStatus, villageComparison, crossVillage,
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

  const villageNames = censusStats ? Object.keys(censusStats.villages).sort() : [];
  const VILLAGE_COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b', '#e11d48', '#0ea5e9'];

  const crossVillageChart = (title, crossData, icon) => {
    const categories = Object.keys(crossData).sort((a, b) => {
      const totalA = Object.values(crossData[a]).reduce((s, v) => s + v, 0);
      const totalB = Object.values(crossData[b]).reduce((s, v) => s + v, 0);
      return totalB - totalA;
    });
    const allVillageNames = [...new Set(categories.flatMap(c => Object.keys(crossData[c])))].sort();
    const grandMax = Math.max(...categories.flatMap(c => allVillageNames.map(v => crossData[c][v] || 0)), 1);
    return (
      <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.3rem' }}>{icon}</span>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--gray)', background: 'rgba(99,102,241,0.08)', padding: '0.2rem 0.6rem', borderRadius: '10px' }}>{categories.length} فئة — {allVillageNames.length} قرية</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
          {allVillageNames.map((v, i) => (
            <span key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: `${VILLAGE_COLORS[i % VILLAGE_COLORS.length]}15`, border: `1px solid ${VILLAGE_COLORS[i % VILLAGE_COLORS.length]}30` }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: VILLAGE_COLORS[i % VILLAGE_COLORS.length], display: 'inline-block' }} />
              {v}
            </span>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', right: 0, background: 'rgba(15,23,42,0.95)', padding: '0.5rem 0.8rem', textAlign: 'right', fontWeight: '700', color: 'var(--gray-light)', borderBottom: '2px solid rgba(99,102,241,0.2)', zIndex: 2, minWidth: '100px' }}>{title.replace('📊 ', '').replace('📈 ', '').replace('🏥 ', '').replace('💍 ', '').replace('🏠 ', '').replace('💰 ', '').replace('👨‍👩‍👧‍👦 ', '').replace('❤️ ', '')}</th>
                {allVillageNames.map((v, i) => (
                  <th key={v} style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: '700', color: VILLAGE_COLORS[i % VILLAGE_COLORS.length], borderBottom: '2px solid rgba(99,102,241,0.2)', minWidth: '65px' }}>{v}</th>
                ))}
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: '700', color: '#fff', borderBottom: '2px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.15)', minWidth: '50px' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, ci) => {
                const rowTotal = allVillageNames.reduce((s, v) => s + (crossData[cat][v] || 0), 0);
                return (
                  <tr key={cat} style={{ background: ci % 2 === 0 ? 'rgba(99,102,241,0.02)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem 0.8rem', fontWeight: '700', position: 'sticky', right: 0, background: ci % 2 === 0 ? 'rgba(15,23,42,0.97)' : 'rgba(15,23,42,0.92)', zIndex: 1, borderBottom: '1px solid rgba(99,102,241,0.08)' }}>{cat}</td>
                    {allVillageNames.map((v, vi) => {
                      const val = crossData[cat][v] || 0;
                      const pct = rowTotal > 0 ? Math.round((val / rowTotal) * 100) : 0;
                      return (
                        <td key={v} style={{ padding: '0.4rem 0.6rem', textAlign: 'center', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                          {val > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontWeight: '800', color: VILLAGE_COLORS[vi % VILLAGE_COLORS.length], fontSize: '0.85rem' }}>{val}</span>
                              <div style={{ width: '90%', height: '6px', background: 'rgba(99,102,241,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: VILLAGE_COLORS[vi % VILLAGE_COLORS.length], borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.6rem', color: 'var(--gray)' }}>{pct}%</span>
                            </div>
                          ) : <span style={{ color: 'var(--gray)', fontSize: '0.7rem' }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: '800', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.08)', color: '#fff' }}>{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
    else { csv += 'رب الأسرة,الرقم,القرية,الذكور,الإناث,الدخل,الحالة,نوع السكن,حالة السكن,مصدر الدخل,مدخل البيانات\n'; filtered.forEach(c => { csv += `${c.headName||''},${c.familyNumber||''},${c.village||''},${c.maleCount||0},${c.femaleCount||0},${c.averageIncome||0},${c.financialStatus||''},${c.housing?.housingType||''},${c.housing?.housingCondition||''},${c.mainIncomeSource||''},${c.enteredByName||''}\n`; }); }
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
        {canCensus && selectBtn('members', '👤 أفراد الأسرة')}
        {canWorkers && selectBtn('workers', '👷 العمال')}
        {canFamilies && selectBtn('families', '👨‍👩‍👧‍👦 المساعدات')}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="بحث بالاسم، القرية، رقم الأسرة..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: '150px' }} />
        {reportType === 'census' && (
          <select value={filters.village || ''} onChange={e => setFilters({ ...filters, village: e.target.value })} style={{ ...inputStyle, minWidth: '120px' }}>
            <option value="">جميع القرى</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {reportType === 'workers' && <>
          <select value={filters.region} onChange={e => setFilters({ ...filters, region: e.target.value })} style={inputStyle}><option value="">جميع المناطق</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select>
          <select value={filters.profession} onChange={e => setFilters({ ...filters, profession: e.target.value })} style={inputStyle}><option value="">جميع المهن</option>{professions.map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select value={filters.team} onChange={e => setFilters({ ...filters, team: e.target.value })} style={inputStyle}><option value="">جميع الفرق</option>{teams.map(t => <option key={t} value={t}>فرقة {t}</option>)}</select>
        </>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        {canExport && <button className="btn-export" onClick={exportPDF}>📄 تصدير PDF</button>}
        {canExport && <button className="btn-export" onClick={exportExcel}>📊 تصدير Excel</button>}
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

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', padding: '1rem 1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(236,72,153,0.1))', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <span style={{ fontSize: '2rem' }}>🏘️</span>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', background: 'linear-gradient(135deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>مقارنة شاملة بين القرى</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray)', margin: 0 }}>{Object.keys(censusStats.villageComparison).length} قرية — جميع البيانات مقارنة</p>
                  </div>
                </div>

                {Object.entries(censusStats.villageComparison).sort((a, b) => b[1].population - a[1].population).map(([village, vc], vi) => {
                  const avgInc = vc.incomeCount > 0 ? Math.round(vc.totalIncome / vc.incomeCount) : 0;
                  const topFinancial = Object.entries(vc.financial).sort((a, b) => b[1] - a[1])[0];
                  const topHousing = Object.entries(vc.housing).sort((a, b) => b[1] - a[1])[0];
                  const topIncome = Object.entries(vc.mainIncome).sort((a, b) => b[1] - a[1])[0];
                  const topEdu = Object.entries(vc.education).sort((a, b) => b[1] - a[1])[0];
                  const topHealth = Object.entries(vc.health).sort((a, b) => b[1] - a[1])[0];
                  const gradientColors = [
                    'linear-gradient(135deg, #6366f1, #818cf8)',
                    'linear-gradient(135deg, #ec4899, #f472b6)',
                    'linear-gradient(135deg, #06b6d4, #22d3ee)',
                    'linear-gradient(135deg, #10b981, #34d399)',
                    'linear-gradient(135deg, #f59e0b, #fbbf24)',
                  ];
                  const colorIdx = vi % gradientColors.length;

                  return (
                    <div key={village} style={{ marginBottom: '1.5rem', borderRadius: '20px', border: '1px solid rgba(99,102,241,0.15)', overflow: 'hidden', background: 'rgba(15,23,42,0.4)' }}>
                      <div style={{ background: gradientColors[colorIdx], padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>{vi + 1}</div>
                          <div>
                            <h4 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>{village}</h4>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>{vc.families} أسرة — {vc.members} فرد</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                          {[['👥', vc.population, 'سكان'], ['♂️', vc.male, 'ذكور'], ['♀️', vc.female, 'إناث'], ['💰', avgInc.toLocaleString('ar-SA'), 'ر.ي دخل']].map(([icon, val, lbl]) => (
                            <div key={lbl} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '0.4rem 0.8rem', minWidth: '70px' }}>
                              <div style={{ fontSize: '1.1rem' }}>{icon}</div>
                              <div style={{ fontSize: '1rem', fontWeight: '800', color: 'white' }}>{val}</div>
                              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)' }}>{lbl}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(99,102,241,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>📊 الحالة المادية</div>
                            {Object.entries(vc.financial).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(99,102,241,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / vc.families) * 100)}%`, height: '100%', background: k === 'جيدة' ? '#10b981' : k === 'سيئة' ? '#ef4444' : '#f59e0b', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6366f1' }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(236,72,153,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(236,72,153,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>🏠 نوع السكن</div>
                            {Object.entries(vc.housing).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(236,72,153,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / vc.families) * 100)}%`, height: '100%', background: '#ec4899', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#ec4899' }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(6,182,212,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(6,182,212,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>💰 مصدر الدخل</div>
                            {Object.entries(vc.mainIncome).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(6,182,212,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / vc.families) * 100)}%`, height: '100%', background: '#06b6d4', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#06b6d4' }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(16,185,129,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(16,185,129,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>🎓 المستوى التعليمي</div>
                            {Object.entries(vc.education).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(16,185,129,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / Math.max(vc.members, 1)) * 100)}%`, height: '100%', background: '#10b981', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#10b981' }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(139,92,246,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(139,92,246,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>❤️ الحالة الصحية</div>
                            {Object.entries(vc.health).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(139,92,246,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / Math.max(vc.members, 1)) * 100)}%`, height: '100%', background: '#8b5cf6', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#8b5cf6' }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(245,158,11,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(245,158,11,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>💍 الحالة الاجتماعية</div>
                            {Object.entries(vc.maritalStatus).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(245,158,11,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / Math.max(vc.members, 1)) * 100)}%`, height: '100%', background: '#f59e0b', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#f59e0b' }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>👨‍👩‍👧 صلة القرابة</div>
                            {Object.entries(vc.relationships).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / Math.max(vc.members, 1)) * 100)}%`, height: '100%', background: '#ef4444', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#ef4444' }}>{v}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(20,184,166,0.05)', borderRadius: '12px', padding: '0.8rem', border: '1px solid rgba(20,184,166,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gray-light)', marginBottom: '0.5rem' }}>🏠 حالة السكن</div>
                            {Object.entries(vc.housingCond).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '10px', background: 'rgba(20,184,166,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round((v / vc.families) * 100)}%`, height: '100%', background: '#14b8a6', borderRadius: '5px' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--gray-light)', minWidth: '60px' }}>{k}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#14b8a6' }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                          {[
                            ['💍 متزوجون', vc.married, '#8b5cf6'],
                            ['🕊️ متوفون', vc.deceased, '#ef4444'],
                            ['♂️ ذكور', vc.male, '#06b6d4'],
                            ['♀️ إناث', vc.female, '#ec4899'],
                          ].map(([lbl, val, color]) => (
                            <div key={lbl} style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '10px', background: `${color}10`, border: `1px solid ${color}20` }}>
                              <div style={{ fontSize: '1rem', fontWeight: '800', color }}>{val}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--gray)' }}>{lbl}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {reportType === 'census' && censusStats && (
            <>
              {crossVillageChart('📊 المستوى التعليمي حسب القرية', censusStats.crossVillage.educationByVillage, '🎓')}
              {crossVillageChart('❤️ الحالة الصحية حسب القرية', censusStats.crossVillage.healthByVillage, '🏥')}
              {crossVillageChart('👨‍👩‍👧 صلة القرابة حسب القرية', censusStats.crossVillage.relationshipsByVillage, '🔗')}
              {crossVillageChart('💍 الحالة الاجتماعية حسب القرية', censusStats.crossVillage.maritalStatusByVillage, '💒')}
              {crossVillageChart('📊 الحالة المادية حسب القرية', censusStats.crossVillage.financialByVillage, '💰')}
              {crossVillageChart('🏠 نوع السكن حسب القرية', censusStats.crossVillage.housingByVillage, '🏘️')}
              {crossVillageChart('🏠 حالة السكن حسب القرية', censusStats.crossVillage.housingCondByVillage, '🏗️')}
              {crossVillageChart('💰 مصدر الدخل الرئيسي حسب القرية', censusStats.crossVillage.mainIncomeByVillage, '💵')}
              {crossVillageChart('💰 مستويات الدخل حسب القرية', censusStats.crossVillage.incomeByVillage, '📈')}
            </>
          )}

          {reportType === 'members' && (
            <div>
              {(() => {
                const allMembers = [];
                filtered.forEach(c => {
                  if (c.members && c.members.length > 0) {
                    c.members.forEach(m => {
                      allMembers.push({ ...m, headName: c.headName, village: c.village, familyNumber: c.familyNumber, phone: c.phone });
                    });
                  }
                });
                const memberStats = { total: allMembers.length, male: 0, female: 0, children: 0, wives: 0, education: {}, health: {}, relationships: {} };
                allMembers.forEach(m => {
                  if (m.gender === 'ذكر') memberStats.male++;
                  else memberStats.female++;
                  if (m.relationship === 'ابن' || m.relationship === 'ابنة') memberStats.children++;
                  if (m.relationship === 'زوجة') memberStats.wives++;
                  memberStats.education[m.educationLevel || 'غير محدد'] = (memberStats.education[m.educationLevel || 'غير محدد'] || 0) + 1;
                  memberStats.health[m.healthStatus || 'غير محدد'] = (memberStats.health[m.healthStatus || 'غير محدد'] || 0) + 1;
                  memberStats.relationships[m.relationship || 'غير محدد'] = (memberStats.relationships[m.relationship || 'غير محدد'] || 0) + 1;
                });
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
                      {statCard('👥', 'إجمالي الأفراد', memberStats.total, '#6366f1')}
                      {statCard('♂️', 'الذكور', memberStats.male, '#06b6d4')}
                      {statCard('♀️', 'الإناث', memberStats.female, '#ec4899')}
                      {statCard('👶', 'الأبناء', memberStats.children, '#10b981')}
                      {statCard('💍', 'الزوجات', memberStats.wives, '#8b5cf6')}
                      {statCard('🏥', 'المرضى', allMembers.filter(m => m.healthStatus === 'مريض').length, '#ef4444')}
                      {statCard('🎓', 'جامعي', allMembers.filter(m => m.educationLevel === 'جامعي').length, '#f59e0b', 'مستوى تعليمي')}
                      {statCard('💼', ' العاملون', allMembers.filter(m => m.work && m.work.trim()).length, '#14b8a6')}
                    </div>

                    <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ marginBottom: '0.8rem' }}>📋 قائمة الأفراد حسب الأسرة</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '0.75rem' }}>
                          <thead>
                            <tr>
                              <th style={{ position: 'sticky', right: 0, background: 'rgba(30,41,59,0.95)', zIndex: 1 }}>#</th>
                              <th>الاسم</th>
                              <th>صلة القرابة</th>
                              <th>الجنس</th>
                              <th>العمر</th>
                              <th>تاريخ الميلاد</th>
                              <th>رقم الهوية</th>
                              <th>نوع الهوية</th>
                              <th>اسم الأب</th>
                              <th>الحالة الاجتماعية</th>
                              <th>المستوى التعليمي</th>
                              <th>الحالة الصحية</th>
                              <th>العمل</th>
                              <th>الدخل</th>
                              <th>رب الأسرة</th>
                              <th>القرية</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allMembers.map((m, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(99,102,241,0.02)' : 'transparent' }}>
                                <td style={{ position: 'sticky', right: 0, background: i % 2 === 0 ? 'rgba(30,41,59,0.97)' : 'rgba(30,41,59,0.92)', zIndex: 1 }}>{i + 1}</td>
                                <td style={{ fontWeight: '700' }}>{m.name || '—'}</td>
                                <td><span className={`badge ${m.relationship === 'ابن' || m.relationship === 'ابنة' ? 'badge-blue' : m.relationship === 'زوجة' ? 'badge-green' : 'badge-orange'}`}>{m.relationship || '—'}</span></td>
                                <td style={{ color: m.gender === 'ذكر' ? '#06b6d4' : '#ec4899', fontWeight: '700' }}>{m.gender || '—'}</td>
                                <td>{m.age || '—'}</td>
                                <td>{m.birthDate || '—'}</td>
                                <td style={{ fontFamily: 'monospace' }}>{m.nationalId || '—'}</td>
                                <td>{m.idType || '—'}</td>
                                <td>{m.parentName || '—'}</td>
                                <td><span className={`badge ${m.maritalStatus === 'متزوج' ? 'badge-green' : m.maritalStatus === 'أعزب' ? 'badge-blue' : 'badge-orange'}`}>{m.maritalStatus || '—'}</span></td>
                                <td><span className={`badge ${m.educationLevel === 'جامعي' ? 'badge-green' : m.educationLevel === 'ثانوي' ? 'badge-blue' : 'badge-orange'}`}>{m.educationLevel || '—'}</span></td>
                                <td><span className={`badge ${m.healthStatus === 'سليم' ? 'badge-green' : m.healthStatus === 'مريض' ? 'badge-orange' : 'badge-blue'}`}>{m.healthStatus || '—'}</span></td>
                                <td>{m.work || '—'}</td>
                                <td style={{ fontWeight: '700', color: '#f59e0b' }}>{m.memberIncome ? `${m.memberIncome.toLocaleString('ar-SA')} ر.ي` : '—'}</td>
                                <td style={{ fontSize: '0.7rem' }}>{m.headName || '—'}</td>
                                <td>{m.village || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {allMembers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا يوجد أفراد مسجلين في التعداد.</p>}
                    </div>
                  </>
                );
              })()}
            </div>
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
                      {reportType === 'census' && <><td>{i + 1}</td><td>{item.headName}</td><td>{item.familyNumber}</td><td>{item.village}</td><td>{item.maleCount}</td><td>{item.femaleCount}</td><td>{(item.averageIncome || 0).toLocaleString('ar-SA')} ر.ي</td><td><span className={`badge ${item.financialStatus === 'جيدة' ? 'badge-green' : item.financialStatus === 'سيئة' ? 'badge-orange' : 'badge-blue'}`}>{item.financialStatus || '—'}</span></td><td>{item.housing?.housingType || '—'}</td><td style={{ color: '#10b981', fontSize: '0.75rem' }}>{item.enteredByName || '—'}</td></>}
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
