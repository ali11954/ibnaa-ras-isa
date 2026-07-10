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
  const [transferWorker, setTransferWorker] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferLog, setTransferLog] = useState([]);
  const [showLog, setShowLog] = useState(false);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 26, search, region, profession });
      if (team) params.append('team', team);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`/api/workers?${params}`, { headers });
      setWorkers(res.data.data || []);
      setPagination(res.data.pagination || {});
      setFilters(res.data.filters || {});
    } catch (err) {}
    setLoading(false);
  }, [page, search, region, profession, team, token]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchWorkers(); };

  const handleTransfer = async () => {
    if (!transferTo || !token) { toast.error('اختر الفرقة الجديدة'); return; }
    try {
      await axios.post(`/api/workers/${transferWorker._id}/transfer`, { toTeam: parseInt(transferTo) }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`تم نقل ${transferWorker.name} من فرقة ${transferWorker.teamNumber} إلى فرقة ${transferTo}`);
      setTransferWorker(null);
      setTransferTo('');
      fetchWorkers();
    } catch (err) { toast.error('خطأ في النقل'); }
  };

  const fetchTransferLog = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/transfer-log', { headers: { Authorization: `Bearer ${token}` } });
      setTransferLog(res.data || []);
    } catch (err) {}
  };

  const handleExport = (format, exportTeam) => {
    const url = `/api/export/workers?format=${format}${exportTeam ? `&team=${exportTeam}` : ''}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(url, { headers, responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = exportTeam ? `workers_team${exportTeam}.xlsx` : 'workers_all.xlsx';
        link.click();
      })
      .catch(() => toast.error('خطأ في التصدير'));
  };

  const handleExportPDF = (exportTeam) => {
    const workersToExport = exportTeam ? workers.filter(w => w.teamNumber === exportTeam) : workers;
    const printWindow = window.open('', '_blank');
    const teamLabel = exportTeam ? ` - فرقة ${exportTeam}` : '';
    printWindow.document.write(`
      <html><head><title>كشف العمال${teamLabel}</title>
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: right; font-size: 11px; }
        th { background: #eee; font-weight: bold; }
        h2 { text-align: center; }
      </style></head><body>
      <h2>ابناء راس عيسى - كشف العمال${teamLabel}</h2>
      <p>إجمالي العمال: ${workersToExport.length}</p>
      <table>
        <tr><th>#</th><th>الاسم</th><th>الرقم الوطني</th><th>العمر</th><th>الفئة</th><th>المنطقة</th><th>الميلاد</th><th>المهنة</th><th>الفرقة</th><th>ملاحظة</th></tr>
        ${workersToExport.map((w, i) => `<tr><td>${i+1}</td><td>${w.name}</td><td>${w.nationalId}</td><td>${w.age}</td><td>${w.ageGroup}</td><td>${w.region}</td><td>${w.birthPlace}</td><td>${w.profession}</td><td>${w.teamNumber}</td><td>${w.note}</td></tr>`).join('')}
      </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">بيانات العمال</span>
        <h2 className="section-title">كشف <span className="gradient-text">العمال</span></h2>
        <p className="section-desc">إجمالي {pagination.total || 0} عامل — {(filters.regions || []).length} منطقة</p>
      </div>

      <div className="workers-toolbar">
        <div className="toolbar-filters">
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
        </div>
        <div className="toolbar-actions">
          <button className="btn-export" onClick={() => handleExportPDF(team || null)}>📄 PDF</button>
          <button className="btn-export" onClick={() => handleExport('excel', team || null)}>📊 Excel</button>
          {isAdmin && <button className="btn-export" onClick={() => { setShowLog(!showLog); fetchTransferLog(); }}>📋 سجل النقل</button>}
        </div>
      </div>

      {showLog && (
        <div className="transfer-log-panel">
          <h3>سجل نقل العمال ({transferLog.length})</h3>
          {transferLog.length === 0 ? <p className="empty-text">لا يوجد سجل نقل</p> : (
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
          )}
        </div>
      )}

      {loading ? <div className="spinner"></div> : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead><tr>
                <th>#</th><th>الاسم</th><th>الرقم الوطني</th><th>العمر</th><th>الفئة</th><th>المنطقة</th><th>الميلاد</th><th>المهنة</th><th>الفرقة</th><th>ملاحظة</th>{isAdmin && <th>إجراء</th>}
              </tr></thead>
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
                  {isAdmin && (
                    <td><button className="btn-members" onClick={() => setTransferWorker(w)}>نقل ↻</button></td>
                  )}
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
                {Array.from({length:30}, (_,i)=>i+1).filter(t=>t!==transferWorker.teamNumber).map(t => (
                  <option key={t} value={t}>الفرقة {t}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={handleTransfer}>نقل العامل</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersTable;
