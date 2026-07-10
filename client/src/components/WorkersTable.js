import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const WorkersTable = () => {
  const { token, isAdmin } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ regions: [], professions: [] });
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [profession, setProfession] = useState('');
  const [team, setTeam] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [transferWorker, setTransferWorker] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferLog, setTransferLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newWorker, setNewWorker] = useState({ name:'', nationalId:'', age:'', region:'', birthPlace:'', currentPlace:'', profession:'', teamNumber:'', note:'', ageGroup:'' });

  const fetchWorkers = useCallback(async () => {
    if (!token) { setBlocked(true); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 26, search, region, profession });
      if (team) params.append('team', team);
      const res = await axios.get(`/api/workers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setWorkers(res.data.data || []);
      setPagination(res.data.pagination || {});
      setFilters(res.data.filters || {});
      setBlocked(false);
    } catch (err) { if (err.response?.status === 403) setBlocked(true); }
    setLoading(false);
  }, [page, search, region, profession, team, token]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchWorkers(); };

  const handleTransfer = async () => {
    if (!transferTo) { toast.error('اختر الفرقة الجديدة'); return; }
    try {
      await axios.post(`/api/workers/${transferWorker._id}/transfer`, { toTeam: parseInt(transferTo) }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`تم نقل ${transferWorker.name} من فرقة ${transferWorker.teamNumber} إلى فرقة ${transferTo}`);
      setTransferWorker(null); setTransferTo('');
      fetchWorkers();
    } catch (err) { toast.error('خطأ في النقل'); }
  };

  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.teamNumber) { toast.error('أدخل الاسم والفرقة'); return; }
    try {
      await axios.post('/api/workers', { ...newWorker, age: parseInt(newWorker.age), teamNumber: parseInt(newWorker.teamNumber) }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تمت إضافة العامل');
      setShowAdd(false);
      setNewWorker({ name:'', nationalId:'', age:'', region:'', birthPlace:'', currentPlace:'', profession:'', teamNumber:'', note:'', ageGroup:'' });
      fetchWorkers();
    } catch (err) { toast.error('خطأ في الإضافة'); }
  };

  const handleDeleteWorker = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${name}؟`)) return;
    try {
      await axios.delete(`/api/workers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم الحذف');
      fetchWorkers();
    } catch (err) { toast.error('خطأ في الحذف'); }
  };

  const fetchTransferLog = async () => {
    try {
      const res = await axios.get('/api/transfer-log', { headers: { Authorization: `Bearer ${token}` } });
      setTransferLog(res.data || []);
    } catch (err) {}
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>كشف العمال</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #333;padding:6px 8px;text-align:right;font-size:11px}th{background:#eee;font-weight:bold}h2{text-align:center}</style></head><body>
      <h2>ابناء راس عيسى - كشف العمال</h2>
      <p>إجمالي العمال: ${workers.length} | الصفحة ${page} من ${pagination.totalPages || 1}</p>
      <table><tr><th>#</th><th>الاسم</th><th>الرقم الوطني</th><th>العمر</th><th>الفئة</th><th>المنطقة</th><th>الميلاد</th><th>المهنة</th><th>الفرقة</th><th>ملاحظة</th></tr>
      ${workers.map((w,i)=>`<tr><td>${(page-1)*26+i+1}</td><td>${w.name}</td><td>${w.nationalId}</td><td>${w.age}</td><td>${w.ageGroup}</td><td>${w.region}</td><td>${w.birthPlace}</td><td>${w.profession}</td><td>${w.teamNumber}</td><td>${w.note}</td></tr>`).join('')}
      </table></body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams({ page: 1, limit: 9999, search, region, profession });
    if (team) params.append('team', team);
    axios.get(`/api/export/workers?${params}&format=excel`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = team ? `workers_team${team}.xlsx` : 'workers_all.xlsx';
        link.click();
      }).catch(() => toast.error('خطأ في التصدير'));
  };

  if (blocked) return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">بيانات العمال</span>
        <h2 className="section-title">كشف <span className="gradient-text">العمال</span></h2>
      </div>
      <div className="locked-content">
        <div className="locked-icon">🔒</div>
        <h3>هذه البيانات متاحة للمشتركين فقط</h3>
        <p>سجّل دخولك أو اشترك للوصول إلى بيانات العمال</p>
      </div>
    </div>
  );

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">بيانات العمال</span>
        <h2 className="section-title">كشف <span className="gradient-text">العمال</span></h2>
        <p className="section-desc">إجمالي {pagination.total || 0} عامل</p>
      </div>

      <div className="workers-toolbar">
        <form onSubmit={handleSearch} className="filters-form">
          <input type="text" placeholder="بحث بالاسم أو الرقم الوطني..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
          <select value={region} onChange={e => { setRegion(e.target.value); setPage(1); }}>
            <option value="">جميع المناطق</option>
            {(filters.regions || []).map(r => <option key={r.name} value={r.name}>{r.name} ({r.count})</option>)}
          </select>
          <select value={profession} onChange={e => { setProfession(e.target.value); setPage(1); }}>
            <option value="">جميع المهن</option>
            {(filters.professions || []).map(p => <option key={p.name} value={p.name}>{p.name} ({p.count})</option>)}
          </select>
          <select value={team} onChange={e => { setTeam(e.target.value); setPage(1); }}>
            <option value="">جميع الفرق</option>
            {Array.from({length:30}, (_,i)=>i+1).map(t => <option key={t} value={t}>الفرقة {t}</option>)}
          </select>
          <button type="submit" className="btn-primary btn-sm">بحث</button>
        </form>
        <div className="toolbar-actions">
          {isAdmin && <button className="btn-export" onClick={() => setShowAdd(true)}>➕ إضافة عامل</button>}
          <button className="btn-export" onClick={handleExportPDF}>📄 PDF</button>
          <button className="btn-export" onClick={handleExportExcel}>📊 Excel</button>
          {isAdmin && <button className="btn-export" onClick={() => { setShowLog(!showLog); fetchTransferLog(); }}>📋 سجل النقل</button>}
        </div>
      </div>

      {showLog && (
        <div className="transfer-log-panel">
          <h3>سجل نقل العمال ({transferLog.length})</h3>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>التاريخ</th><th>العامل</th><th>من فرقة</th><th>إلى فرقة</th><th>نقله</th></tr></thead>
              <tbody>{transferLog.map((log, i) => (
                <tr key={i}>
                  <td>{new Date(log.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td className="name-cell">{log.workerName}</td>
                  <td><span className="badge badge-orange">الفرقة {log.fromTeam}</span></td>
                  <td><span className="badge badge-green">الفرقة {log.toTeam}</span></td>
                  <td>{log.movedBy}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {loading ? <div className="spinner"></div> : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>#</th><th>الاسم</th><th>الرقم الوطني</th><th>العمر</th><th>الفئة</th><th>المنطقة</th><th>الميلاد</th><th>المهنة</th><th>الفرقة</th><th>ملاحظة</th>{isAdmin && <th>إجراء</th>}</tr></thead>
              <tbody>{workers.map((w, i) => (
                <tr key={w._id || i}>
                  <td>{(page-1)*26+i+1}</td>
                  <td className="name-cell">{w.name}</td>
                  <td><code>{w.nationalId}</code></td>
                  <td>{w.age}</td>
                  <td><span className="badge badge-blue">{w.ageGroup}</span></td>
                  <td><span className="badge badge-green">{w.region}</span></td>
                  <td>{w.birthPlace}</td>
                  <td><span className="badge badge-purple">{w.profession}</span></td>
                  <td><span className="badge badge-orange">الفرقة {w.teamNumber}</span></td>
                  <td><span className="badge badge-orange">{w.note}</span></td>
                  {isAdmin && <td>
                    <button className="btn-members" onClick={() => setTransferWorker(w)} style={{fontSize:'0.7rem'}}>نقل</button>
                    <button className="btn-reject" onClick={() => handleDeleteWorker(w._id, w.name)} style={{fontSize:'0.7rem',marginLeft:'4px'}}>حذف</button>
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="btn-page">السابق</button>
              <span className="page-info">صفحة {page} من {pagination.totalPages}</span>
              <button disabled={page>=pagination.totalPages} onClick={()=>setPage(p=>p+1)} className="btn-page">التالي</button>
            </div>
          )}
        </>
      )}

      {transferWorker && (
        <div className="modal-overlay" onClick={() => setTransferWorker(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setTransferWorker(null)}>✕</button>
            <h3>نقل عامل</h3>
            <div className="transfer-info">
              <p><strong>العامل:</strong> {transferWorker.name}</p>
              <p><strong>الفرقة:</strong> <span className="badge badge-orange">الفرقة {transferWorker.teamNumber}</span></p>
            </div>
            <div className="form-group">
              <label>الفرقة الجديدة</label>
              <select value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                <option value="">اختر الفرقة</option>
                {Array.from({length:30}, (_,i)=>i+1).filter(t=>t!==transferWorker.teamNumber).map(t => <option key={t} value={t}>الفرقة {t}</option>)}
              </select>
            </div>
            <button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={handleTransfer}>نقل</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            <h3>إضافة عامل جديد</h3>
            <div className="form-group"><label>الاسم *</label><input value={newWorker.name} onChange={e=>setNewWorker({...newWorker, name:e.target.value})} /></div>
            <div className="form-group"><label>الرقم الوطني</label><input value={newWorker.nationalId} onChange={e=>setNewWorker({...newWorker, nationalId:e.target.value})} /></div>
            <div className="form-group"><label>العمر</label><input type="number" value={newWorker.age} onChange={e=>setNewWorker({...newWorker, age:e.target.value})} /></div>
            <div className="form-group"><label>الفئة العمرية</label><input value={newWorker.ageGroup} onChange={e=>setNewWorker({...newWorker, ageGroup:e.target.value})} placeholder="25-34" /></div>
            <div className="form-group"><label>المنطقة</label><input value={newWorker.region} onChange={e=>setNewWorker({...newWorker, region:e.target.value})} /></div>
            <div className="form-group"><label>مكان الميلاد</label><input value={newWorker.birthPlace} onChange={e=>setNewWorker({...newWorker, birthPlace:e.target.value})} /></div>
            <div className="form-group"><label>المهنة</label><input value={newWorker.profession} onChange={e=>setNewWorker({...newWorker, profession:e.target.value})} /></div>
            <div className="form-group"><label>رقم الفرقة *</label><select value={newWorker.teamNumber} onChange={e=>setNewWorker({...newWorker, teamNumber:e.target.value})}>
              <option value="">اختر الفرقة</option>
              {Array.from({length:30}, (_,i)=>i+1).map(t=><option key={t} value={t}>الفرقة {t}</option>)}
            </select></div>
            <div className="form-group"><label>ملاحظة</label><input value={newWorker.note} onChange={e=>setNewWorker({...newWorker, note:e.target.value})} /></div>
            <button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={handleAddWorker}>إضافة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersTable;
