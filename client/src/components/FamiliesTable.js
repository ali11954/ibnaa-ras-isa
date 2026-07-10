import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const FamiliesTable = () => {
  const { token, isAdmin } = useAuth();
  const [families, setFamilies] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newFamily, setNewFamily] = useState({ teamName:'', village:'', leader:'', status:'نشطة', reason:'', individualAmount:2000, totalAmount:50000, beneficiaries:[{name:'',amount:0}] });

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
    try {
      const res = await axios.get(`/api/teams/${teamNum}/members`, { headers: { Authorization: `Bearer ${token}` } });
      setTeamMembers(res.data.members || []);
    } catch (err) { setTeamMembers([]); }
    setMembersLoading(false);
  };

  const handleAddFamily = async () => {
    if (!newFamily.teamName) { toast.error('أدخل اسم الفرقة'); return; }
    const cleanedBens = newFamily.beneficiaries.filter(b => b.name.trim());
    try {
      await axios.post('/api/families', { ...newFamily, memberCount: 0, beneficiaries: cleanedBens }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تمت الإضافة');
      setShowAdd(false);
      setNewFamily({ teamName:'', village:'', leader:'', status:'نشطة', reason:'', individualAmount:2000, totalAmount:50000, beneficiaries:[{name:'',amount:0}] });
      fetchFamilies();
    } catch (err) { toast.error('خطأ'); }
  };

  const handleDeleteFamily = async (id, name) => {
    if (!window.confirm(`حذف ${name}؟`)) return;
    try {
      await axios.delete(`/api/families/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم الحذف');
      fetchFamilies();
    } catch (err) { toast.error('خطأ'); }
  };

  const addBeneficiaryField = () => {
    setNewFamily({ ...newFamily, beneficiaries: [...newFamily.beneficiaries, { name: '', amount: 0 }] });
  };

  const updateBeneficiary = (index, field, value) => {
    const updated = [...newFamily.beneficiaries];
    updated[index] = { ...updated[index], [field]: field === 'amount' ? parseInt(value) || 0 : value };
    setNewFamily({ ...newFamily, beneficiaries: updated });
  };

  const removeBeneficiary = (index) => {
    const updated = newFamily.beneficiaries.filter((_, i) => i !== index);
    setNewFamily({ ...newFamily, beneficiaries: updated.length ? updated : [{ name: '', amount: 0 }] });
  };

  const handlePrintFull = () => {
    const printWindow = window.open('', '_blank');
    const rows = families.map((f,i) => {
      const bens = (f.beneficiaries || []).map(b => `${b.name} (${b.amount?.toLocaleString('ar-SA') || 0} ر.ي)`).join('، ');
      const bensCount = (f.beneficiaries || []).length;
      return `<tr><td>${i+1}</td><td><strong>${f.teamName}</strong></td><td>${f.memberCount}</td><td>${f.leader}</td><td>${f.status}</td><td>${f.village}</td><td>${(f.individualAmount||0).toLocaleString('ar-SA')}</td><td>${(f.totalAmount||0).toLocaleString('ar-SA')}</td><td>${bens}</td><td>${bensCount}</td><td>${f.reason||''}</td></tr>`;
    }).join('');
    printWindow.document.write(`<html><head><title>كشف المساعدات</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px 8px;text-align:right;font-size:11px}th{background:#eee;font-weight:bold}h2{text-align:center}</style></head><body>
      <h2>ابناء راس عيسى - كشف المساعدات</h2>
      <p>إجمالي الفرق: ${families.length} | إجمالي المبالغ: ${families.reduce((s,f)=>s+f.totalAmount,0).toLocaleString('ar-SA')} ر.ي</p>
      <table><tr><th>#</th><th>الفرقة</th><th>العمال</th><th>القائد</th><th>الحالة</th><th>القرية</th><th>للفرد</th><th>الإجمالي</th><th>المستفيدون (المبلغ)</th><th>عدد المستفيدين</th><th>السبب</th></tr>${rows}</table>
      <br/><br/><div style="display:flex;justify-content:space-between"><div>توقيع المدير: __________</div><div>توقيع المحاسب: __________</div><div>التاريخ: __________</div></div>
      </body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  const handlePrintTeam = async (f) => {
    let members = teamMembers;
    if (expandedTeam !== f.teamNumber) {
      try {
        const res = await axios.get(`/api/teams/${f.teamNumber}/members`, { headers: { Authorization: `Bearer ${token}` } });
        members = res.data.members || [];
      } catch (err) { members = []; }
    }
    const bens = (f.beneficiaries || []).map(b => `<tr><td>${b.name}</td><td>${(b.amount||0).toLocaleString('ar-SA')} ر.ي</td></tr>`).join('');
    const benTotal = (f.beneficiaries || []).reduce((s,b) => s + (b.amount || 0), 0);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>${f.teamName}</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px 8px;text-align:right;font-size:12px}th{background:#eee;font-weight:bold}h2{text-align:center}h3{margin-top:15px}</style></head><body>
      <h2>ابناء راس عيسى - ${f.teamName}</h2>
      <table><tr><th>البيان</th><th>القيمة</th></tr>
      <tr><td>القائد</td><td>${f.leader}</td></tr>
      <tr><td>عدد الأعضاء</td><td>${f.memberCount}</td></tr>
      <tr><td>القرية</td><td>${f.village}</td></tr>
      <tr><td>الحالة</td><td>${f.status}</td></tr>
      <tr><td>المبلغ للفرد</td><td>${(f.individualAmount||0).toLocaleString('ar-SA')} ر.ي</td></tr>
      <tr><td>إجمالي المبلغ</td><td>${(f.totalAmount||0).toLocaleString('ar-SA')} ر.ي</td></tr>
      <tr><td>السبب</td><td>${f.reason||''}</td></tr></table>
      <h3>المستفيدون (${(f.beneficiaries||[]).length}) - الإجمالي: ${benTotal.toLocaleString('ar-SA')} ر.ي</h3>
      ${bens ? `<table><tr><th>اسم المستفيد</th><th>المبلغ</th></tr>${bens}</table>` : '<p>لا يوجد مستفيدون مسجلون</p>'}
      <h3>أعضاء الفرقة (${members.length})</h3>
      ${members.length ? `<table><tr><th>#</th><th>الاسم</th><th>المهنة</th><th>العمر</th><th>المنطقة</th></tr>
      ${members.map((m,j)=>`<tr><td>${j+1}</td><td>${m.name}</td><td>${m.profession}</td><td>${m.age}</td><td>${m.region}</td></tr>`).join('')}</table>` : '<p>جاري التحميل...</p>'}
      <br/><div style="display:flex;justify-content:space-between"><div>توقيع القائد: __________</div><div>توقيع المدير: __________</div><div>التاريخ: __________</div></div>
      </body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  if (blocked) return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">كشف المساعدات</span>
        <h2 className="section-title">كشف <span className="gradient-text">المساعدات</span></h2>
      </div>
      <div className="locked-content">
        <div className="locked-icon">🔒</div>
        <h3>هذه البيانات متاحة للمشتركين فقط</h3>
        <p>سجّل دخولك أو اشترك للوصول إلى كشف المساعدات</p>
      </div>
    </div>
  );

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">كشف المساعدات</span>
        <h2 className="section-title">كشف <span className="gradient-text">المساعدات</span></h2>
      </div>
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="filters-form">
          <input type="text" placeholder="بحث بالفرقة، القائد، المستفيد، أو القرية..." value={search} onChange={e=>setSearch(e.target.value)} className="search-input" />
          <button type="submit" className="btn-primary btn-sm">بحث</button>
        </form>
        <div className="toolbar-actions">
          {isAdmin && <button className="btn-export" onClick={() => setShowAdd(true)}>➕ إضافة فرقة</button>}
          <button className="btn-export" onClick={handlePrintFull}>🖨️ طباعة الكل</button>
        </div>
      </div>
      {loading ? <div className="spinner"></div> : (
        <>
          <div className="summary-cards">
            <div className="summary-card"><div className="summary-num">{pagination.total||0}</div><div className="summary-label">عدد الفرق</div></div>
            <div className="summary-card"><div className="summary-num">{families.reduce((s,f)=>s+f.memberCount,0)}</div><div className="summary-label">إجمالي العمال</div></div>
            <div className="summary-card"><div className="summary-num">{families.reduce((s,f)=>s+f.totalAmount,0).toLocaleString('ar-SA')} ر.ي</div><div className="summary-label">إجمالي المبالغ</div></div>
            <div className="summary-card"><div className="summary-num">{families.reduce((s,f)=>s+(f.beneficiaries||[]).length,0)}</div><div className="summary-label">إجمالي المستفيدين</div></div>
          </div>
          <div className="table-container">
            <table className="data-table families-table">
              <thead><tr><th>#</th><th>الفرقة</th><th>العمال</th><th>القائد</th><th>الحالة</th><th>القرية</th><th>للفرد (ر.ي)</th><th>الإجمالي (ر.ي)</th><th>المستفيدون</th><th>عدد</th><th>السبب</th><th>إجراءات</th></tr></thead>
              <tbody>{families.map((f,i) => {
                const bens = f.beneficiaries || [];
                return (
                  <React.Fragment key={f._id||i}>
                    <tr>
                      <td>{(page-1)*15+i+1}</td>
                      <td><strong>{f.teamName}</strong></td>
                      <td>{f.memberCount}</td>
                      <td className="name-cell">{f.leader}</td>
                      <td><span className={`badge ${f.status==='نشطة'?'badge-green':'badge-orange'}`}>{f.status}</span></td>
                      <td><span className="badge badge-blue">{f.village}</span></td>
                      <td>{(f.individualAmount||0).toLocaleString('ar-SA')}</td>
                      <td><strong>{(f.totalAmount||0).toLocaleString('ar-SA')}</strong></td>
                      <td className="beneficiary-cell">
                        {bens.length === 0 ? '—' : bens.length === 1 ? (
                          <span>{bens[0].name} <small>({(bens[0].amount||0).toLocaleString('ar-SA')} ر.ي)</small></span>
                        ) : (
                          <div>
                            <span className="beneficiary-main">{bens[0].name} <small>({(bens[0].amount||0).toLocaleString('ar-SA')} ر.ي)</small></span>
                            <span className="beneficiary-more">+{bens.length-1} آخر</span>
                          </div>
                        )}
                      </td>
                      <td><span className="badge badge-purple">{bens.length}</span></td>
                      <td><span className="badge badge-orange">{f.reason||''}</span></td>
                      <td>
                        <button className="btn-members" onClick={()=>toggleTeamMembers(f.teamNumber)} style={{fontSize:'0.7rem'}}>
                          {expandedTeam===f.teamNumber?'▲':'▼'} عمال
                        </button>
                        <button className="btn-export" onClick={()=>handlePrintTeam(f)} style={{fontSize:'0.7rem',marginLeft:'4px'}}>🖨️</button>
                        {isAdmin && <button className="btn-reject" onClick={()=>handleDeleteFamily(f._id,f.teamName)} style={{fontSize:'0.7rem',marginLeft:'4px'}}>✕</button>}
                      </td>
                    </tr>
                    {expandedTeam===f.teamNumber && (
                      <tr className="expanded-row"><td colSpan="12">
                        <div className="expanded-content">
                          <h4>عمال فرقة {f.teamName} ({teamMembers.length} عامل):</h4>
                          {membersLoading?<div className="spinner"></div>:(
                            <div className="members-grid">{teamMembers.map((m,j)=>(
                              <div className="member-card" key={j}>
                                <span className="member-num">{j+1}</span>
                                <div className="member-info"><strong>{m.name}</strong><span>{m.profession} - {m.age} سنة - {m.region}</span></div>
                              </div>
                            ))}</div>
                          )}
                          {bens.length > 0 && (
                            <div style={{marginTop:'10px'}}>
                              <h4>المستفيدون ({bens.length}):</h4>
                              <table className="data-table" style={{fontSize:'0.85rem'}}>
                                <thead><tr><th>اسم المستفيد</th><th>المبلغ (ر.ي)</th></tr></thead>
                                <tbody>{bens.map((b, j) => (
                                  <tr key={j}><td>{b.name}</td><td><strong>{(b.amount||0).toLocaleString('ar-SA')}</strong></td></tr>
                                ))}
                                <tr style={{fontWeight:'bold',background:'#f0f0f0'}}><td>الإجمالي</td><td>{bens.reduce((s,b)=>s+(b.amount||0),0).toLocaleString('ar-SA')} ر.ي</td></tr>
                                </tbody>
                              </table>
                            </div>
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

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            <h3>إضافة فرقة جديدة</h3>
            <div className="form-group"><label>اسم الفرقة *</label><input value={newFamily.teamName} onChange={e=>setNewFamily({...newFamily, teamName:e.target.value})} placeholder="الفرقة" /></div>
            <div className="form-group"><label>القائد</label><input value={newFamily.leader} onChange={e=>setNewFamily({...newFamily, leader:e.target.value})} /></div>
            <div className="form-group"><label>القرية</label><input value={newFamily.village} onChange={e=>setNewFamily({...newFamily, village:e.target.value})} /></div>
            <div className="form-group"><label>المبلغ للفرد (ر.ي)</label><input type="number" value={newFamily.individualAmount} onChange={e=>setNewFamily({...newFamily, individualAmount:parseInt(e.target.value)||0})} /></div>
            <div className="form-group"><label>السبب</label><input value={newFamily.reason} onChange={e=>setNewFamily({...newFamily, reason:e.target.value})} /></div>

            <div style={{marginTop:'10px',borderTop:'1px solid #ddd',paddingTop:'10px'}}>
              <label style={{fontWeight:'bold'}}>المستفيدون:</label>
              {newFamily.beneficiaries.map((b, idx) => (
                <div key={idx} style={{display:'flex',gap:'8px',marginTop:'6px',alignItems:'center'}}>
                  <input placeholder="اسم المستفيد" value={b.name} onChange={e=>updateBeneficiary(idx,'name',e.target.value)} style={{flex:2}} />
                  <input type="number" placeholder="المبلغ" value={b.amount||''} onChange={e=>updateBeneficiary(idx,'amount',e.target.value)} style={{flex:1}} />
                  <span style={{fontSize:'0.8rem',color:'#666'}}>ر.ي</span>
                  {newFamily.beneficiaries.length > 1 && <button type="button" className="btn-reject" onClick={()=>removeBeneficiary(idx)} style={{fontSize:'0.7rem',padding:'2px 6px'}}>✕</button>}
                </div>
              ))}
              <button type="button" className="btn-export" onClick={addBeneficiaryField} style={{marginTop:'8px',fontSize:'0.8rem'}}>+ إضافة مستفيد</button>
              <div style={{marginTop:'6px',fontSize:'0.85rem',color:'#666'}}>
                إجمالي المستفيدين: {newFamily.beneficiaries.reduce((s,b)=>s+(b.amount||0),0).toLocaleString('ar-SA')} ر.ي
              </div>
            </div>

            <button className="btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'12px'}} onClick={handleAddFamily}>إضافة</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamiliesTable;
