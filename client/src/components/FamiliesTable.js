import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const FamiliesTable = () => {
  const { token, isAdmin } = useAuth();
  const [families, setFamilies] = useState([]);
  const [allFamilies, setAllFamilies] = useState([]);
  const [summary, setSummary] = useState({ totalTeams: 0, totalWorkers: 0, totalAmount: 0, totalBens: 0 });
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const emptyBens = [{ name: '', amount: 0 }];
  const [newFamily, setNewFamily] = useState({ teamName:'', teamNumber:'', village:'', leader:'', status:'نشطة', reason:'', individualAmount:2000, totalAmount:50000, beneficiaries: [...emptyBens] });

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

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/families/summary', { headers: { Authorization: `Bearer ${token}` } });
      setSummary(res.data);
    } catch (err) {}
  }, [token]);

  const fetchAllForPrint = async () => {
    try {
      const res = await axios.get('/api/families?limit=9999', { headers: { Authorization: `Bearer ${token}` } });
      setAllFamilies(res.data.data || []);
      return res.data.data || [];
    } catch (err) { return []; }
  };

  useEffect(() => { fetchFamilies(); fetchSummary(); }, [fetchFamilies, fetchSummary]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchFamilies(); };

  const fetchTeamMembers = async (teamNum) => {
    setMembersLoading(true);
    try {
      const res = await axios.get(`/api/teams/${teamNum}/members`, { headers: { Authorization: `Bearer ${token}` } });
      setTeamMembers(res.data.members || []);
    } catch (err) { setTeamMembers([]); }
    setMembersLoading(false);
  };

  const toggleTeamMembers = async (teamNum) => {
    if (expandedTeam === teamNum) { setExpandedTeam(null); return; }
    setExpandedTeam(teamNum);
    await fetchTeamMembers(teamNum);
  };

  const resetForm = () => ({ teamName:'', teamNumber:'', village:'', leader:'', status:'نشطة', reason:'', individualAmount:2000, totalAmount:50000, beneficiaries:[{ name:'', amount:0 }] });

  const handleAddFamily = async () => {
    if (!newFamily.teamName || !newFamily.teamNumber) { toast.error('أدخل اسم الفرقة ورقمها'); return; }
    const cleanedBens = newFamily.beneficiaries.filter(b => b.name.trim());
    try {
      await axios.post('/api/families', { ...newFamily, memberCount: 0, teamNumber: parseInt(newFamily.teamNumber), beneficiaries: cleanedBens }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تمت الإضافة');
      setShowAdd(false);
      setNewFamily(resetForm());
      fetchFamilies(); fetchSummary();
    } catch (err) { toast.error('خطأ'); }
  };

  const handleEditFamily = async () => {
    if (!editingFamily.teamName || !editingFamily.teamNumber) { toast.error('أدخل اسم الفرقة ورقمها'); return; }
    const cleanedBens = editingFamily.beneficiaries.filter(b => b.name.trim());
    try {
      await axios.put(`/api/families/${editingFamily._id}`, { ...editingFamily, teamNumber: parseInt(editingFamily.teamNumber), beneficiaries: cleanedBens }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم التعديل');
      setEditingFamily(null);
      fetchFamilies(); fetchSummary();
    } catch (err) { toast.error('خطأ'); }
  };

  const handleDeleteFamily = async (id, name) => {
    if (!window.confirm(`حذف ${name}؟`)) return;
    try {
      await axios.delete(`/api/families/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم الحذف');
      fetchFamilies(); fetchSummary();
    } catch (err) { toast.error('خطأ'); }
  };

  const addBeneficiaryField = (setter, current) => {
    setter({ ...current, beneficiaries: [...current.beneficiaries, { name: '', amount: 0 }] });
  };

  const updateBeneficiary = (setter, current, index, field, value) => {
    const updated = [...current.beneficiaries];
    updated[index] = { ...updated[index], [field]: field === 'amount' ? parseInt(value) || 0 : value };
    setter({ ...current, beneficiaries: updated });
  };

  const removeBeneficiary = (setter, current, index) => {
    const updated = current.beneficiaries.filter((_, i) => i !== index);
    setter({ ...current, beneficiaries: updated.length ? updated : [{ name: '', amount: 0 }] });
  };

  const handlePrintFull = async () => {
    const data = allFamilies.length > 0 ? allFamilies : await fetchAllForPrint();
    if (data.length === 0) { toast.error('لا توجد بيانات للطباعة'); return; }
    const printWindow = window.open('', '_blank');
    const rows = data.map((f,i) => {
      const bens = (f.beneficiaries || []).map(b => `${b.name} (${(b.amount||0).toLocaleString('ar-SA')})`).join('، ');
      return `<tr><td>${i+1}</td><td><strong>${f.teamName}</strong></td><td>${f.memberCount}</td><td>${f.leader}</td><td>${f.status}</td><td>${f.village}</td><td>${(f.individualAmount||0).toLocaleString('ar-SA')}</td><td>${(f.totalAmount||0).toLocaleString('ar-SA')}</td><td>${bens}</td><td>${(f.beneficiaries||[]).length}</td><td>${f.reason||''}</td></tr>`;
    }).join('');
    printWindow.document.write(`<html><head><title>كشف المساعدات - الكل</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px 8px;text-align:right;font-size:11px}th{background:#eee;font-weight:bold}h2{text-align:center}@media print{.page-break{page-break-before:always}}</style></head><body>
      <h2>ابناء راس عيسى - كشف المساعدات</h2>
      <p>إجمالي الفرق: ${data.length} | إجمالي المبالغ: ${data.reduce((s,f)=>s+f.totalAmount,0).toLocaleString('ar-SA')} ر.ي</p>
      <table><tr><th>#</th><th>الفرقة</th><th>العمال</th><th>القائد</th><th>الحالة</th><th>القرية</th><th>للفرد</th><th>الإجمالي</th><th>المستفيدون</th><th>عدد</th><th>السبب</th></tr>${rows}</table>
      <br/><br/><div style="display:flex;justify-content:space-between"><div>توقيع المدير: __________</div><div>توقيع المحاسب: __________</div><div>التاريخ: __________</div></div>
      </body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  const handlePrintTeam = async (f) => {
    let members = [];
    try {
      const res = await axios.get(`/api/teams/${f.teamNumber}/members`, { headers: { Authorization: `Bearer ${token}` } });
      members = res.data.members || [];
    } catch (err) { members = []; }
    const bens = (f.beneficiaries || []).map(b => `<tr><td>${b.name}</td><td style="text-align:center">${(b.amount||0).toLocaleString('ar-SA')} ر.ي</td></tr>`).join('');
    const benTotal = (f.beneficiaries || []).reduce((s,b) => s + (b.amount || 0), 0);
    const memberRows = members.map((m,j) => `<tr><td style="text-align:center">${j+1}</td><td>${m.name}</td><td>${m.profession}</td><td style="text-align:center">${m.age}</td><td>${m.region}</td><td style="text-align:center;width:80px"></td></tr>`).join('');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>${f.teamName}</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px 8px;text-align:right;font-size:12px}th{background:#eee;font-weight:bold}h2{text-align:center}h3{margin-top:15px}</style></head><body>
      <h2>ابناء راس عيسى - ${f.teamName}</h2>
      <table><tr><th>البيان</th><th>القيمة</th></tr>
      <tr><td>القائد</td><td>${f.leader}</td></tr>
      <tr><td>عدد الأعضاء</td><td>${members.length}</td></tr>
      <tr><td>القرية</td><td>${f.village}</td></tr>
      <tr><td>الحالة</td><td>${f.status}</td></tr>
      <tr><td>المبلغ للفرد</td><td>${(f.individualAmount||0).toLocaleString('ar-SA')} ر.ي</td></tr>
      <tr><td>إجمالي المبلغ</td><td>${(f.totalAmount||0).toLocaleString('ar-SA')} ر.ي</td></tr>
      <tr><td>السبب</td><td>${f.reason||''}</td></tr></table>
      <h3>المستفيدون (${(f.beneficiaries||[]).length}) - الإجمالي: ${benTotal.toLocaleString('ar-SA')} ر.ي</h3>
      ${bens ? `<table><tr><th>اسم المستفيد</th><th>المبلغ</th></tr>${bens}</table>` : '<p>لا يوجد مستفيدون</p>'}
      <h3>أعضاء الفرقة (${members.length}) - المبلغ للفرد: ${(f.individualAmount||0).toLocaleString('ar-SA')} ر.ي</h3>
      <div style="background:#f0f8ff;border:1px solid #4a90d9;padding:10px;margin-bottom:10px;font-size:12px;border-radius:4px">
        <strong>إقرار:</strong> أنا الموقع أدناه أقر بدفع المبلغ المحدد وهو <strong>${(f.individualAmount||0).toLocaleString('ar-SA')} ر.يال يمني</strong> شهرياً كمساعدة للأسر المستحقة.</div>
      ${members.length ? `<table><tr><th>#</th><th>اسم العامل</th><th>المهنة</th><th>العمر</th><th>المنطقة</th><th style="width:100px">البصمة</th></tr>${memberRows}</table>` : '<p>لا يوجد أعضاء</p>'}
      <br/>
      <div style="display:flex;justify-content:space-between;margin-top:30px;font-size:12px">
        <div style="text-align:center;width:30%"><div>توقيع العامل: __________</div><div style="margin-top:5px;border-top:1px solid #333;padding-top:5px">البصمة: __________</div></div>
        <div style="text-align:center;width:30%"><div>توقيع القائد: __________</div><div style="margin-top:5px;border-top:1px solid #333;padding-top:5px">الاسم: ${f.leader}</div></div>
        <div style="text-align:center;width:30%"><div>توقيع المدير: __________</div><div style="margin-top:5px;border-top:1px solid #333;padding-top:5px">التاريخ: ____/____/____</div></div>
      </div></body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  if (blocked) return (
    <div className="tab-section">
      <div className="section-header"><span className="section-badge">كشف المساعدات</span><h2 className="section-title">كشف <span className="gradient-text">المساعدات</span></h2></div>
      <div className="locked-content"><div className="locked-icon">🔒</div><h3>هذه البيانات متاحة للمشتركين فقط</h3><p>سجّل دخولك أو اشترك للوصول</p></div>
    </div>
  );

  const FamilyForm = ({ data, setter, onSave, onCancel, title }) => (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h3>{title}</h3>
        <div className="form-grid">
          <div className="form-group"><label>اسم الفرقة *</label><input value={data.teamName} onChange={e=>setter({...data, teamName:e.target.value})} placeholder="الفرقة" /></div>
          <div className="form-group"><label>رقم الفرقة *</label><input type="number" value={data.teamNumber} onChange={e=>setter({...data, teamNumber:e.target.value})} placeholder="3" /></div>
          <div className="form-group"><label>القائد</label><input value={data.leader} onChange={e=>setter({...data, leader:e.target.value})} /></div>
          <div className="form-group"><label>القرية</label><input value={data.village} onChange={e=>setter({...data, village:e.target.value})} /></div>
          <div className="form-group"><label>الحالة</label><select value={data.status} onChange={e=>setter({...data, status:e.target.value})}><option value="نشطة">نشطة</option><option value="غير نشطة">غير نشطة</option></select></div>
          <div className="form-group"><label>المبلغ للفرد (ر.ي)</label><input type="number" value={data.individualAmount} onChange={e=>setter({...data, individualAmount:parseInt(e.target.value)||0})} /></div>
          <div className="form-group" style={{gridColumn:'span 2'}}><label>السبب</label><input value={data.reason} onChange={e=>setter({...data, reason:e.target.value})} /></div>
        </div>
        <div style={{marginTop:'10px',borderTop:'1px solid #ddd',paddingTop:'10px'}}>
          <label style={{fontWeight:'bold'}}>المستفيدون:</label>
          {data.beneficiaries.map((b, idx) => (
            <div key={idx} style={{display:'flex',gap:'8px',marginTop:'6px',alignItems:'center'}}>
              <input placeholder="اسم المستفيد" value={b.name} onChange={e=>updateBeneficiary(setter,data,idx,'name',e.target.value)} style={{flex:2}} />
              <input type="number" placeholder="المبلغ" value={b.amount||''} onChange={e=>updateBeneficiary(setter,data,idx,'amount',e.target.value)} style={{flex:1}} />
              <span style={{fontSize:'0.8rem',color:'#666'}}>ر.ي</span>
              {data.beneficiaries.length > 1 && <button type="button" className="btn-reject" onClick={()=>removeBeneficiary(setter,data,idx)} style={{fontSize:'0.7rem',padding:'2px 6px'}}>✕</button>}
            </div>
          ))}
          <button type="button" className="btn-export" onClick={()=>addBeneficiaryField(setter,data)} style={{marginTop:'8px',fontSize:'0.8rem'}}>+ إضافة مستفيد</button>
          <div style={{marginTop:'6px',fontSize:'0.85rem',color:'#666'}}>إجمالي: {data.beneficiaries.reduce((s,b)=>s+(b.amount||0),0).toLocaleString('ar-SA')} ر.ي</div>
        </div>
        <button className="btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'12px'}} onClick={onSave}>حفظ</button>
      </div>
    </div>
  );

  return (
    <div className="tab-section">
      <div className="section-header"><span className="section-badge">كشف المساعدات</span><h2 className="section-title">كشف <span className="gradient-text">المساعدات</span></h2></div>
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="filters-form">
          <input type="text" placeholder="بحث بالفرقة، القائد، المستفيد، أو القرية..." value={search} onChange={e=>setSearch(e.target.value)} className="search-input" />
          <button type="submit" className="btn-primary btn-sm">بحث</button>
        </form>
        <div className="toolbar-actions">
          {isAdmin && <button className="btn-export" onClick={() => { setNewFamily(resetForm()); setShowAdd(true); }}>➕ إضافة فرقة</button>}
          <button className="btn-export" onClick={handlePrintFull}>🖨️ طباعة الكل</button>
        </div>
      </div>
      {loading ? <div className="spinner"></div> : (
        <>
          <div className="summary-cards">
            <div className="summary-card"><div className="summary-num">{summary.totalTeams||0}</div><div className="summary-label">عدد الفرق</div></div>
            <div className="summary-card"><div className="summary-num">{summary.totalWorkers||0}</div><div className="summary-label">إجمالي العمال</div></div>
            <div className="summary-card"><div className="summary-num">{(summary.totalAmount||0).toLocaleString('ar-SA')} ر.ي</div><div className="summary-label">إجمالي المبالغ</div></div>
            <div className="summary-card"><div className="summary-num">{summary.totalBens||0}</div><div className="summary-label">إجمالي المستفيدين</div></div>
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
                          <div><span className="beneficiary-main">{bens[0].name} <small>({(bens[0].amount||0).toLocaleString('ar-SA')} ر.ي)</small></span><span className="beneficiary-more">+{bens.length-1} آخر</span></div>
                        )}
                      </td>
                      <td><span className="badge badge-purple">{bens.length}</span></td>
                      <td><span className="badge badge-orange">{f.reason||''}</span></td>
                      <td>
                        <button className="btn-members" onClick={()=>toggleTeamMembers(f.teamNumber)} style={{fontSize:'0.7rem'}}>{expandedTeam===f.teamNumber?'▲':'▼'} عمال</button>
                        <button className="btn-export" onClick={()=>handlePrintTeam(f)} style={{fontSize:'0.7rem',marginLeft:'4px'}}>🖨️</button>
                        {isAdmin && <button className="btn-edit" onClick={()=>setEditingFamily({...f, teamNumber:String(f.teamNumber)})} style={{fontSize:'0.7rem',marginLeft:'4px'}}>✏️</button>}
                        {isAdmin && <button className="btn-reject" onClick={()=>handleDeleteFamily(f._id,f.teamName)} style={{fontSize:'0.7rem',marginLeft:'4px'}}>✕</button>}
                      </td>
                    </tr>
                    {expandedTeam===f.teamNumber && (
                      <tr className="expanded-row"><td colSpan="12">
                        <div className="expanded-content">
                          <h4>عمال {f.teamName} - رقم الفرقة: {f.teamNumber} ({teamMembers.length} عامل):</h4>
                          {membersLoading?<div className="spinner"></div>:(
                            <div className="members-grid">{teamMembers.map((m,j)=>(
                              <div className="member-card" key={m._id||j}><span className="member-num">{j+1}</span><div className="member-info"><strong>{m.name}</strong><span>{m.profession} - {m.age} سنة - {m.region} - فرقة {m.teamNumber}</span></div></div>
                            ))}</div>
                          )}
                          {bens.length > 0 && (
                            <div style={{marginTop:'10px'}}>
                              <h4>المستفيدون ({bens.length}):</h4>
                              <table className="data-table" style={{fontSize:'0.85rem'}}><thead><tr><th>اسم المستفيد</th><th>المبلغ (ر.ي)</th></tr></thead>
                              <tbody>{bens.map((b, j) => (<tr key={j}><td>{b.name}</td><td><strong>{(b.amount||0).toLocaleString('ar-SA')}</strong></td></tr>))}
                              <tr style={{fontWeight:'bold',background:'#f0f0f0'}}><td>الإجمالي</td><td>{bens.reduce((s,b)=>s+(b.amount||0),0).toLocaleString('ar-SA')} ر.ي</td></tr></tbody></table>
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

      {showAdd && <FamilyForm data={newFamily} setter={setNewFamily} onSave={handleAddFamily} onCancel={()=>setShowAdd(false)} title="إضافة فرقة جديدة" />}
      {editingFamily && <FamilyForm data={editingFamily} setter={setEditingFamily} onSave={handleEditFamily} onCancel={()=>setEditingFamily(null)} title="تعديل بيانات الفرقة" />}
    </div>
  );
};

export default FamiliesTable;
