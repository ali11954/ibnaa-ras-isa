import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const DEFAULT_COLUMNS = {
  name: true, nationalId: true, age: true, ageGroup: true, region: true,
  birthPlace: true, profession: true, teamNumber: true, note: true,
};

const COL_LABELS = {
  name: 'الاسم', nationalId: 'الرقم الوطني', age: 'العمر', ageGroup: 'الفئة',
  region: 'المنطقة', birthPlace: 'الميلاد', profession: 'المهنة', teamNumber: 'الفرقة', note: 'ملاحظة',
};

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
  const [showCols, setShowCols] = useState(false);
  const [columns, setColumns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('workerCols')) || { ...DEFAULT_COLUMNS }; }
    catch { return { ...DEFAULT_COLUMNS }; }
  });
  const [newWorker, setNewWorker] = useState({
    name:'', nationalId:'', birthYear:'', age:'', ageGroup:'',
    region:'', birthPlace:'', currentPlace:'', profession:'',
    teamNumber:'', note:''
  });

  useEffect(() => { localStorage.setItem('workerCols', JSON.stringify(columns)); }, [columns]);

  const toggleCol = (key) => setColumns(prev => ({ ...prev, [key]: !prev[key] }));

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
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ في النقل'); }
  };

  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.teamNumber) { toast.error('أدخل الاسم ورقم الفرقة'); return; }
    try {
      await axios.post('/api/workers', {
        name: newWorker.name,
        nationalId: newWorker.nationalId,
        birthYear: parseInt(newWorker.birthYear) || 0,
        age: parseInt(newWorker.age) || 30,
        ageGroup: newWorker.ageGroup,
        region: newWorker.region,
        birthPlace: newWorker.birthPlace,
        currentPlace: newWorker.currentPlace,
        profession: newWorker.profession,
        teamNumber: parseInt(newWorker.teamNumber),
        note: newWorker.note,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تمت إضافة العامل');
      setShowAdd(false);
      setNewWorker({ name:'', nationalId:'', birthYear:'', age:'', ageGroup:'', region:'', birthPlace:'', currentPlace:'', profession:'', teamNumber:'', note:'' });
      fetchWorkers();
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ في الإضافة'); }
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
    const visibleCols = Object.keys(columns).filter(k => columns[k]);
    const colHeaders = visibleCols.map(k => COL_LABELS[k] || k).join('</th><th>');
    const colCells = (w) => visibleCols.map(k => {
      if (k === 'teamNumber') return `<td>الفرقة ${w[k]}</td>`;
      return `<td>${w[k] || ''}</td>`;
    }).join('');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>كشف العمال</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #333;padding:6px 8px;text-align:right;font-size:11px}th{background:#eee;font-weight:bold}h2{text-align:center}@media print{.no-print{display:none}}</style></head><body>
      <h2>ابناء راس عيسى - كشف العمال</h2>
      <p>إجمالي العمال: ${pagination.total || 0} | الصفحة ${page} من ${pagination.totalPages || 1}</p>
      <table><tr><th>#</th><th>${colHeaders}</th><th>البصمة</th></tr>
      ${workers.map((w,i)=>`<tr><td>${(page-1)*26+i+1}</td>${colCells(w)}<td style="width:80px"></td></tr>`).join('')}
      </table>
      <div style="background:#f0f8ff;border:1px solid #4a90d9;padding:10px;margin-top:15px;font-size:12px;border-radius:4px">
        <strong>إقرار:</strong> أنا الموقع أدناه أقر بأن جميع البيانات المذكورة أعلاه صحيحة وأتحمل المسؤولية الكاملة تجاهها.
      </div>
      <br/>
      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:12px">
        <div style="text-align:center;width:30%">
          <div>توقيع العامل: __________</div>
          <div style="margin-top:5px;border-top:1px solid #333;padding-top:5px">البصمة: __________</div>
        </div>
        <div style="text-align:center;width:30%">
          <div>توقيع المدير: __________</div>
          <div style="margin-top:5px;border-top:1px solid #333;padding-top:5px">التاريخ: ____/____/____</div>
        </div>
      </div>
      </body></html>`);
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

  const visCols = Object.keys(columns).filter(k => columns[k]);

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
          <button className="btn-export" onClick={() => setShowCols(!showCols)}>👁️ الأعمدة</button>
          {isAdmin && <button className="btn-export" onClick={() => { setShowLog(!showLog); fetchTransferLog(); }}>📋 سجل النقل</button>}
        </div>
      </div>

      {showCols && (
        <div className="columns-panel">
          <h4>إظهار/إخفاء الأعمدة:</h4>
          <div className="columns-grid">
            {Object.keys(DEFAULT_COLUMNS).map(key => (
              <label key={key} className="col-toggle">
                <input type="checkbox" checked={columns[key]} onChange={() => toggleCol(key)} />
                <span>{COL_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
              <thead><tr>
                <th>#</th>
                {columns.name && <th>الاسم</th>}
                {columns.nationalId && <th>الرقم الوطني</th>}
                {columns.age && <th>العمر</th>}
                {columns.ageGroup && <th>الفئة</th>}
                {columns.region && <th>المنطقة</th>}
                {columns.birthPlace && <th>الميلاد</th>}
                {columns.profession && <th>المهنة</th>}
                {columns.teamNumber && <th>الفرقة</th>}
                {columns.note && <th>ملاحظة</th>}
                <th>الإجراءات</th>
              </tr></thead>
              <tbody>{workers.map((w, i) => (
                <tr key={w._id || i}>
                  <td>{(page-1)*26+i+1}</td>
                  {columns.name && <td className="name-cell">{w.name}</td>}
                  {columns.nationalId && <td><code>{w.nationalId}</code></td>}
                  {columns.age && <td>{w.age}</td>}
                  {columns.ageGroup && <td><span className="badge badge-blue">{w.ageGroup}</span></td>}
                  {columns.region && <td><span className="badge badge-green">{w.region}</span></td>}
                  {columns.birthPlace && <td>{w.birthPlace}</td>}
                  {columns.profession && <td><span className="badge badge-purple">{w.profession}</span></td>}
                  {columns.teamNumber && <td><span className="badge badge-orange">الفرقة {w.teamNumber}</span></td>}
                  {columns.note && <td><span className="badge badge-orange">{w.note}</span></td>}
                  <td>
                    {isAdmin && <button className="btn-members" onClick={() => setTransferWorker(w)} style={{fontSize:'0.7rem'}}>نقل</button>}
                    {isAdmin && <button className="btn-reject" onClick={() => handleDeleteWorker(w._id, w.name)} style={{fontSize:'0.7rem',marginLeft:'4px'}}>حذف</button>}
                  </td>
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
              <p><strong>الفرقة الحالية:</strong> <span className="badge badge-orange">الفرقة {transferWorker.teamNumber}</span></p>
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
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            <h3>إضافة عامل جديد</h3>
            <div className="form-grid">
              <div className="form-group"><label>الاسم *</label><input value={newWorker.name} onChange={e=>setNewWorker({...newWorker, name:e.target.value})} placeholder="الاسم الكامل" /></div>
              <div className="form-group"><label>الرقم الوطني</label><input value={newWorker.nationalId} onChange={e=>setNewWorker({...newWorker, nationalId:e.target.value})} placeholder="الرقم الوطني" /></div>
              <div className="form-group"><label>سنة الميلاد</label><input type="number" value={newWorker.birthYear} onChange={e=>setNewWorker({...newWorker, birthYear:e.target.value})} placeholder="1990" /></div>
              <div className="form-group"><label>العمر</label><input type="number" value={newWorker.age} onChange={e=>setNewWorker({...newWorker, age:e.target.value})} placeholder="35" /></div>
              <div className="form-group"><label>الفئة العمرية</label><select value={newWorker.ageGroup} onChange={e=>setNewWorker({...newWorker, ageGroup:e.target.value})}>
                <option value="">اختر الفئة</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45-54">45-54</option>
                <option value="55-64">55-64</option>
                <option value="65+">65+</option>
              </select></div>
              <div className="form-group"><label>المنطقة</label><input value={newWorker.region} onChange={e=>setNewWorker({...newWorker, region:e.target.value})} placeholder="المنطقة" /></div>
              <div className="form-group"><label>مكان الميلاد</label><input value={newWorker.birthPlace} onChange={e=>setNewWorker({...newWorker, birthPlace:e.target.value})} placeholder="مكان الميلاد" /></div>
              <div className="form-group"><label>المكان الحالي</label><input value={newWorker.currentPlace} onChange={e=>setNewWorker({...newWorker, currentPlace:e.target.value})} placeholder="المكان الحالي" /></div>
              <div className="form-group"><label>المهنة</label><input value={newWorker.profession} onChange={e=>setNewWorker({...newWorker, profession:e.target.value})} placeholder="المهنة" /></div>
              <div className="form-group"><label>رقم الفرقة *</label><select value={newWorker.teamNumber} onChange={e=>setNewWorker({...newWorker, teamNumber:e.target.value})}>
                <option value="">اختر الفرقة</option>
                {Array.from({length:30}, (_,i)=>i+1).map(t=><option key={t} value={t}>الفرقة {t}</option>)}
              </select></div>
              <div className="form-group"><label>ملاحظة</label><input value={newWorker.note} onChange={e=>setNewWorker({...newWorker, note:e.target.value})} placeholder="ملاحظة" /></div>
            </div>
            <button className="btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'12px'}} onClick={handleAddWorker}>إضافة العامل</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersTable;
