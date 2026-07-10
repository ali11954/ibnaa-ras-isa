import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const FamiliesTable = () => {
  const { token } = useAuth();
  const [families, setFamilies] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const fetchFamilies = useCallback(async () => {
    if (!token) { setBlocked(true); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, search });
      const res = await axios.get(`/api/families?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setFamilies(res.data.data || []);
      setPagination(res.data.pagination || {});
      setBlocked(false);
    } catch (err) { if (err.response?.status === 403) setBlocked(true); }
    setLoading(false);
  }, [page, search, token]);

  useEffect(() => { fetchFamilies(); }, [fetchFamilies]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchFamilies(); };

  const toggleTeamMembers = async (teamNum) => {
    if (expandedTeam === teamNum) { setExpandedTeam(null); return; }
    setExpandedTeam(teamNum); setMembersLoading(true);
    try { const res = await axios.get(`/api/teams/${teamNum}/members`, { headers: { Authorization: `Bearer ${token}` } }); setTeamMembers(res.data.members || []); }
    catch (err) { setTeamMembers([]); }
    setMembersLoading(false);
  };

  if (blocked) return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">الأسر المستفيدة</span>
        <h2 className="section-title">فرق <span className="gradient-text">العمل</span></h2>
      </div>
      <div className="locked-content">
        <div className="locked-icon">🔒</div>
        <h3>هذه البيانات متاحة للمشتركين فقط</h3>
        <p>سجّل دخولك أو اشترك للوصول إلى بيانات الأسر المستفيدة</p>
        <a href="#subscribe" className="btn-primary">اشترك الآن</a>
      </div>
    </div>
  );

  const totalAmount = families.reduce((s,f)=>s+(f.totalAmount||0),0);
  const totalBens = families.reduce((s,f)=>s+(f.beneficiaries?f.beneficiaries.length:1),0);

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">الأسر المستفيدة</span>
        <h2 className="section-title">فرق <span className="gradient-text">العمل</span></h2>
      </div>
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="filters-form">
          <input type="text" placeholder="بحث بالفرقة، القائد، المستفيد، أو القرية..." value={search} onChange={e=>setSearch(e.target.value)} className="search-input" />
          <button type="submit" className="btn-primary btn-sm">بحث</button>
        </form>
      </div>
      {loading ? <div className="spinner"></div> : (
        <>
          <div className="summary-cards">
            <div className="summary-card"><div className="summary-num">{pagination.total||0}</div><div className="summary-label">عدد الفرق</div></div>
            <div className="summary-card"><div className="summary-num">{totalBens}</div><div className="summary-label">عدد المستفيدين</div></div>
            <div className="summary-card"><div className="summary-num">{totalAmount.toLocaleString('ar-SA')}</div><div className="summary-label">إجمالي المبالغ (ر.س)</div></div>
          </div>
          <div className="table-container">
            <table className="data-table families-table">
              <thead><tr><th>#</th><th>الفرقة</th><th>عدد الأعضاء</th><th>القائد</th><th>الحالة</th><th>القرية</th><th>المبلغ (للفرد)</th><th>إجمالي المبلغ</th><th>المستفيدون</th><th>عدد المستفيدين</th><th>السبب</th><th>الأعضاء</th></tr></thead>
              <tbody>{families.map((f,i) => {
                const bens = f.beneficiaries||[f.beneficiary||'—'];
                const hasMultiple = bens.length>1;
                return (
                  <React.Fragment key={i}>
                    <tr>
                      <td>{(page-1)*15+i+1}</td>
                      <td><strong>{f.teamName}</strong></td>
                      <td>{f.memberCount}</td>
                      <td className="name-cell">{f.leader}</td>
                      <td><span className={`badge ${f.status==='نشطة'?'badge-green':'badge-orange'}`}>{f.status}</span></td>
                      <td><span className="badge badge-blue">{f.village}</span></td>
                      <td>{(f.individualAmount||0).toLocaleString('ar-SA')} ر.س</td>
                      <td><strong>{(f.totalAmount||0).toLocaleString('ar-SA')} ر.س</strong></td>
                      <td className="beneficiary-cell">{hasMultiple ? (<div><span className="beneficiary-main">{bens[0]}</span><span className="beneficiary-more">+{bens.length-1} آخر</span></div>) : bens[0]||'—'}</td>
                      <td><span className="badge badge-purple">{bens.length}</span></td>
                      <td><span className="badge badge-orange">{f.reason}</span></td>
                      <td><button className="btn-members" onClick={()=>toggleTeamMembers(f.id)}>{expandedTeam===f.id?'▲ إخفاء':`▼ ${f.memberCount} عضو`}</button></td>
                    </tr>
                    {expandedTeam===f.id && (
                      <tr className="expanded-row"><td colSpan="12">
                        <div className="expanded-content">
                          <h4>أعضاء {f.teamName} ({teamMembers.length}):</h4>
                          {membersLoading?<div className="spinner"></div>:(
                            <div className="members-grid">{teamMembers.map((m,j)=>(
                              <div className="member-card" key={j}>
                                <span className="member-num">{j+1}</span>
                                <div className="member-info"><strong>{m.name}</strong><span>{m.profession} - {m.age} سنة - {m.region}</span></div>
                              </div>
                            ))}</div>
                          )}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}</tbody>
            </table>
          </div>
          {pagination.totalPages>1 && (
            <div className="pagination">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="btn-page">السابق</button>
              <span className="page-info">صفحة {page} من {pagination.totalPages}</span>
              <button disabled={page>=pagination.totalPages} onClick={()=>setPage(p=>p+1)} className="btn-page">التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FamiliesTable;
