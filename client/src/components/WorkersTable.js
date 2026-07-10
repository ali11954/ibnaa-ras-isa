import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const WorkersTable = () => {
  const { user, token } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ regions: [], professions: [] });
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [profession, setProfession] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const fetchWorkers = useCallback(async () => {
    if (!token) { setBlocked(true); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, search, region, profession });
      const res = await axios.get(`/api/workers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setWorkers(res.data.data || []);
      setPagination(res.data.pagination || {});
      setFilters(res.data.filters || {});
      setBlocked(false);
    } catch (err) {
      if (err.response?.status === 403) setBlocked(true);
    }
    setLoading(false);
  }, [page, search, region, profession, token]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchWorkers(); };

  if (blocked) return (
    <section className="section" id="workers">
      <div className="section-header">
        <span className="section-badge">بيانات العمال</span>
        <h2 className="section-title">كشف <span className="gradient-text">العاملين</span></h2>
      </div>
      <div className="locked-content">
        <div className="locked-icon">&#128274;</div>
        <h3>هذه البيانات متاحة للمشتركين فقط</h3>
        <p>سجّل دخولك أو اشترك للوصول إلى بيانات العمال والأسر المحتاجة</p>
        <a href="#subscribe" className="btn-primary">اشترك الآن</a>
      </div>
    </section>
  );

  return (
    <section className="section" id="workers">
      <div className="section-header">
        <span className="section-badge">بيانات العمال</span>
        <h2 className="section-title">كشف <span className="gradient-text">العاملين</span></h2>
        <p className="section-desc">بيانات {pagination.total || 0} عامل</p>
      </div>
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="filters-form">
          <input type="text" placeholder="بحث بالاسم، الرقم الوطني، أو رقم الفرقة..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
          <select value={region} onChange={e => { setRegion(e.target.value); setPage(1); }}>
            <option value="">جميع المناطق</option>
            {(filters.regions || []).map(r => <option key={r.name} value={r.name}>{r.name} ({r.count})</option>)}
          </select>
          <select value={profession} onChange={e => { setProfession(e.target.value); setPage(1); }}>
            <option value="">جميع المهن</option>
            {(filters.professions || []).map(p => <option key={p.name} value={p.name}>{p.name} ({p.count})</option>)}
          </select>
          <button type="submit" className="btn-primary btn-sm">بحث</button>
        </form>
      </div>
      {loading ? <div className="spinner"></div> : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>#</th><th>الاسم</th><th>الرقم الوطني</th><th>العمر</th><th>الفئة</th><th>المنطقة</th><th>محل الميلاد</th><th>المهنة</th><th>الفرقة</th><th>ملاحظة</th></tr></thead>
              <tbody>{workers.map((w, i) => (
                <tr key={i}><td>{(page-1)*15+i+1}</td><td className="name-cell">{w.name}</td><td><code>{w.nationalId}</code></td><td>{w.age}</td><td><span className="badge badge-blue">{w.ageGroup}</span></td><td><span className="badge badge-green">{w.region}</span></td><td>{w.birthPlace}</td><td><span className="badge badge-purple">{w.profession}</span></td><td>{w.teamNumber}</td><td><span className="badge badge-orange">{w.note}</span></td></tr>
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
    </section>
  );
};

export default WorkersTable;