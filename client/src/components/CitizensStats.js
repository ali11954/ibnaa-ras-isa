import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import CensusForm from './CensusForm';

const CitizensStats = () => {
  const { token, isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('citizens');
  const [censusData, setCensusData] = useState([]);
  const [censusSummary, setCensusSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showCensusForm, setShowCensusForm] = useState(false);
  const [editingCensus, setEditingCensus] = useState(null);
  const [selectedCensus, setSelectedCensus] = useState(null);
  const [censusSearch, setCensusSearch] = useState('');
  const [censusPage, setCensusPage] = useState(1);
  const [censusPagination, setCensusPagination] = useState({});

  const fetchCensus = useCallback(async () => {
    if (!token) { setBlocked(true); return; }
    setLoading(true);
    try {
      const [censusRes, summaryRes] = await Promise.all([
        axios.get(`/api/census?page=${censusPage}&limit=10&search=${censusSearch}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/census/summary', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setCensusData(censusRes.data.data || []);
      setCensusPagination(censusRes.data.pagination || {});
      setCensusSummary(summaryRes.data);
      setBlocked(false);
    } catch (err) {
      if (err.response?.status === 403) setBlocked(true);
    }
    setLoading(false);
  }, [token, censusPage, censusSearch]);

  useEffect(() => { fetchCensus(); }, [fetchCensus]);

  const handleDeleteCensus = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الاستمارة؟')) return;
    try {
      await axios.delete(`/api/census/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم الحذف');
      fetchCensus();
    } catch (err) { toast.error('خطأ في الحذف'); }
  };

  const handleExportCensus = () => {
    axios.get('/api/export/census?format=excel', { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'census_data.xlsx';
        link.click();
      }).catch(() => toast.error('خطأ في التصدير'));
  };

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

  const censusStats = [
    { label: 'استمارات التعداد', value: censusSummary?.totalForms || 0, icon: '📋', color: '#4a90d9' },
    { label: 'إجمالي السكان', value: censusSummary?.totalPopulation || 0, icon: '👥', color: '#2ecc71' },
    { label: 'الذكور', value: censusSummary?.totalMales || 0, icon: '♂️', color: '#3498db' },
    { label: 'الإناث', value: censusSummary?.totalFemales || 0, icon: '♀️', color: '#e91e63' },
    { label: 'المهاجرون', value: censusSummary?.totalMigrants || 0, icon: '✈️', color: '#f39c12' },
    { label: 'المتوفون', value: censusSummary?.totalDeceased || 0, icon: '🕊️', color: '#9b59b6' },
    { label: 'متوسط الدخل', value: `${(censusSummary?.avgIncome || 0).toLocaleString('ar-SA')} ر.ي`, icon: '💰', color: '#1abc9c' },
  ];

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">إحصاء المواطنين</span>
        <h2 className="section-title">إحصاء <span className="gradient-text">المواطنين</span></h2>
        <p className="section-desc">التعداد السكاني الشامل لجميع الأسر في راس عيسى</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {censusStats.map((s, i) => (
          <div key={i} style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '16px', padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: s.color }}>{typeof s.value === 'number' ? s.value.toLocaleString('ar-SA') : s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-light)', marginTop: '0.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {canManage && <button className="btn-export" onClick={() => { setEditingCensus(null); setShowCensusForm(true); }}>➕ إضافة استمارة</button>}
        <button className="btn-export" onClick={handleExportCensus}>📊 تصدير Excel</button>
        <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
          <input type="text" placeholder="بحث بالاسم، القرية، رقم الأسرة..." value={censusSearch} onChange={e => setCensusSearch(e.target.value)}
            style={{ flex: 1, padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' }} />
          <button className="btn-primary btn-sm" onClick={() => { setCensusPage(1); fetchCensus(); }}>بحث</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {censusData.map((c, i) => (
          <div key={c._id || i} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '16px', padding: '1.2rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setSelectedCensus(selectedCensus?._id === c._id ? null : c)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🏠</span>
                  <strong style={{ fontSize: '1rem' }}>{c.headName}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray)', background: 'rgba(99,102,241,0.1)', padding: '0.15rem 0.5rem', borderRadius: '8px' }}>رقم {c.familyNumber}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--gray-light)' }}>
                  <span>📍 {c.village || 'غير محدد'}</span>
                  <span>🏛️ {c.directorate || 'غير محدد'}</span>
                  <span>👥 {c.currentFamilySize || 0} أفراد</span>
                  <span>♂️ {c.maleCount || 0} | ♀️ {c.femaleCount || 0}</span>
                  {c.averageIncome > 0 && <span>💰 {c.averageIncome.toLocaleString('ar-SA')} ر.ي</span>}
                  {c.enteredByName && <span style={{ color: '#10b981' }}>✍️ {c.enteredByName}</span>}
                </div>
              </div>
              {canManage && (
                <div style={{ display: 'flex', gap: '0.3rem' }} onClick={e => e.stopPropagation()}>
                  <button className="btn-edit" onClick={() => { setEditingCensus(c); setShowCensusForm(true); }} style={{ fontSize: '0.7rem' }}>✏️ تعديل</button>
                  <button className="btn-reject" onClick={() => handleDeleteCensus(c._id)} style={{ fontSize: '0.7rem' }}>✕ حذف</button>
                </div>
              )}
            </div>
            {selectedCensus?._id === c._id && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(99,102,241,0.15)', paddingTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', fontSize: '0.82rem' }}>
                  <div><strong>رقم الاستمارة:</strong> {c.formNumber || '—'}</div>
                  <div><strong>تاريخ الزيارة:</strong> {c.visitDate || '—'}</div>
                  <div><strong>الباحث:</strong> {c.researcherName || '—'}</div>
                  <div><strong>المحافظة:</strong> {c.governorate || '—'}</div>
                  <div><strong>العزلة:</strong> {c.isolation || '—'}</div>
                  <div><strong>الحي:</strong> {c.neighborhood || '—'}</div>
                  <div><strong>رقم المنزل:</strong> {c.houseNumber || '—'}</div>
                  <div><strong>الهاتف:</strong> {c.phone || '—'}</div>
                  <div><strong>المتزوجين:</strong> {c.marriedCount || 0}</div>
                  <div><strong>المتوفين:</strong> {c.deceasedCount || 0}</div>
                  <div><strong>المهاجرين:</strong> {c.migrantCount || 0}</div>
                  <div><strong>الحالة المادية:</strong> {c.financialStatus || '—'}</div>
                  <div><strong>مصدر الدخل:</strong> {c.mainIncomeSource || '—'}</div>
                  <div><strong>نوع السكن:</strong> {c.housingType || '—'}</div>
                  <div><strong>حالة السكن:</strong> {c.housingCondition || '—'}</div>
                  {c.enteredByName && <div style={{ color: '#10b981' }}><strong>entered by:</strong> {c.enteredByName}</div>}
                  {c.lastEditedByName && <div style={{ color: '#f59e0b' }}><strong>آخر تعديل:</strong> {c.lastEditedByName} — {c.lastEditedAt ? new Date(c.lastEditedAt).toLocaleDateString('ar-SA') : '—'}</div>}
                </div>
                {c.members && c.members.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>أفراد الأسرة ({c.members.length})</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.78rem' }}>
                        <thead><tr><th>#</th><th>الاسم</th><th>الجنس</th><th>العمر</th><th>القرابة</th><th>الحالة الاجتماعية</th><th>التعليم</th><th>العمل</th><th>الصحة</th></tr></thead>
                        <tbody>{c.members.map((m, j) => (
                          <tr key={j}>
                            <td>{j + 1}</td><td>{m.name}</td><td>{m.gender}</td><td>{m.age}</td>
                            <td>{m.relationship}</td><td>{m.maritalStatus}</td><td>{m.educationLevel}</td>
                            <td>{m.work}</td><td><span className={`badge ${m.healthStatus === 'سليم' ? 'badge-green' : 'badge-orange'}`}>{m.healthStatus}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
                {c.migration && c.migration.length > 0 && (
                  <div style={{ marginTop: '0.8rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>الهجرة ({c.migration.length})</h4>
                    {c.migration.map((m, j) => (
                      <div key={j} style={{ background: 'rgba(15,23,42,0.4)', padding: '0.5rem 0.8rem', borderRadius: '8px', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
                        {m.migName} — {m.migDestination} — {m.migReason} — {m.insideYemen}
                      </div>
                    ))}
                  </div>
                )}
                {c.diseases && c.diseases.length > 0 && (
                  <div style={{ marginTop: '0.8rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>الأمراض والإعاقات ({c.diseases.length})</h4>
                    {c.diseases.map((d, j) => (
                      <div key={j} style={{ background: 'rgba(15,23,42,0.4)', padding: '0.5rem 0.8rem', borderRadius: '8px', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
                        {d.disName} — {d.chronicDisease || d.injuryType || d.disabilityType} — يحتاج علاج: {d.needsTreatment}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {censusData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h3>لا توجد استمارات تعداد بعد</h3>
            <p>ابدأ بإضافة استمارة تعداد سكاني جديدة</p>
          </div>
        )}
      </div>

      {censusPagination.totalPages > 1 && (
        <div className="pagination" style={{ marginTop: '1.5rem' }}>
          <button disabled={censusPage <= 1} onClick={() => setCensusPage(p => p - 1)} className="btn-page">السابق</button>
          <span className="page-info">صفحة {censusPage} من {censusPagination.totalPages}</span>
          <button disabled={censusPage >= censusPagination.totalPages} onClick={() => setCensusPage(p => p + 1)} className="btn-page">التالي</button>
        </div>
      )}

      {showCensusForm && (
        <div className="modal-overlay" onClick={() => { setShowCensusForm(false); setEditingCensus(null); }}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowCensusForm(false); setEditingCensus(null); }}>✕</button>
            <h3 style={{ marginBottom: '1rem' }}>{editingCensus ? 'تعديل استمارة التعداد' : 'إضافة استمارة تعداد جديدة'}</h3>
            <CensusForm
              editData={editingCensus}
              onSave={() => { setShowCensusForm(false); setEditingCensus(null); fetchCensus(); }}
              onCancel={() => { setShowCensusForm(false); setEditingCensus(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizensStats;
