import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth, TAB_IDS, TAB_LABELS } from '../context/AuthContext';
import axios from 'axios';

const PermissionCheckboxes = ({ selected, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0' }}>
    {TAB_IDS.map(tab => (
      <label key={tab} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', background: 'rgba(99,102,241,0.08)', padding: '0.3rem 0.6rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid', borderColor: selected.includes(tab) ? 'var(--primary)' : 'rgba(99,102,241,0.15)' }}>
        <input type="checkbox" checked={selected.includes(tab)} onChange={() => {
          if (selected.includes(tab)) onChange(selected.filter(t => t !== tab));
          else onChange([...selected, tab]);
        }} style={{ accentColor: 'var(--primary)' }} />
        {TAB_LABELS[tab]}
      </label>
    ))}
  </div>
);

const AdminPanel = () => {
  const { user, isAdmin, token } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [emailStatus, setEmailStatus] = useState({ configured: false });
  const [gmailPass, setGmailPass] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [userPermissions, setUserPermissions] = useState({});
  const [subPermissions, setSubPermissions] = useState({});
  const [editingSub, setEditingSub] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', reason: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [censusLists, setCensusLists] = useState([]);
  const [newListKey, setNewListKey] = useState('');
  const [newListLabel, setNewListLabel] = useState('');
  const [newOptionText, setNewOptionText] = useState({});

  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', phone: '' });
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [uRes, sRes, fRes] = await Promise.all([
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/subscribers', { headers }),
        axios.get('/api/feedback', { headers })
      ]);
      setUsers(uRes.data);
      setSubscribers(sRes.data);
      setFeedbacks(fRes.data);
      const initSubPerms = {};
      sRes.data.forEach(s => { initSubPerms[s._id] = s.permissions || []; });
      setSubPermissions(prev => ({ ...initSubPerms, ...prev }));
      const initUserPerms = {};
      uRes.data.forEach(u => { initUserPerms[u._id] = u.permissions || []; });
      setUserPermissions(prev => ({ ...initUserPerms, ...prev }));
      try {
        const eRes = await axios.get('/api/email-config/status', { headers });
        setEmailStatus(eRes.data);
      } catch {}
      try {
        const cRes = await axios.get('/api/census-lists', { headers });
        setCensusLists(cRes.data);
      } catch {}
      const pendingFb = fRes.data.filter(f => f.status === 'pending');
      if (pendingFb.length > 0) setTab('feedback');
    } catch (err) {}
  }, [isAdmin, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const approveUser = async (id) => {
    const permissions = userPermissions[id] || [];
    const userItem = users.find(u => u._id === id);
    const finalPerms = permissions.length > 0 ? permissions : (userItem?.permissions || []);
    if (finalPerms.length === 0) { toast.error('اختر صلاحية واحدة على الأقل'); return; }
    await axios.post(`/api/admin/approve/${id}`, { permissions: finalPerms }, { headers });
    toast.success('تمت الموافقة على المستخدم');
    loadData();
  };

  const rejectUser = async (id) => {
    await axios.post(`/api/admin/reject/${id}`, {}, { headers });
    toast.success('تم رفض المستخدم');
    loadData();
  };

  const startEditUser = (u) => {
    setEditingUser(u._id);
    setEditUserForm({ name: u.name || '', email: u.email || '', phone: u.phone || '' });
  };

  const saveEditUser = async (id) => {
    try {
      await axios.put(`/api/admin/users/${id}`, editUserForm, { headers });
      toast.success('تم تحديث بيانات المستخدم');
      setEditingUser(null);
      loadData();
    } catch (err) {
      toast.error('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const saveUserPermissions = async (id) => {
    try {
      const permissions = userPermissions[id] || [];
      await axios.put(`/api/admin/users/${id}/permissions`, { permissions }, { headers });
      toast.success('تم تحديث الصلاحيات');
      loadData();
    } catch (err) {
      toast.error('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`/api/admin/users/${id}`, { headers });
      toast.success('تم حذف المستخدم');
      setConfirmDeleteUser(null);
      loadData();
    } catch (err) {
      toast.error('خطأ: ' + (err.response?.data?.error || err.message));
    }
  };

  const approveSubscriber = async (id) => {
    const permissions = subPermissions[id] || [];
    const sub = subscribers.find(s => s._id === id);
    const finalPerms = permissions.length > 0 ? permissions : (sub?.permissions || []);
    if (finalPerms.length === 0) { toast.error('اختر صلاحية واحدة على الأقل'); return; }
    try {
      await axios.post(`/api/subscribers/${id}/approve`, { permissions: finalPerms }, { headers });
      toast.success('تمت الموافقة على الاشتراك');
      loadData();
    } catch (err) {
      toast.error('خطأ في الموافقة: ' + (err.response?.data?.error || err.message));
    }
  };

  const startEditSub = (s) => {
    setEditingSub(s._id);
    setEditForm({ name: s.name || '', email: s.email || '', phone: s.phone || '', reason: s.reason || '' });
  };

  const saveEditSub = async (id) => {
    try {
      await axios.put(`/api/subscribers/${id}`, editForm, { headers });
      toast.success('تم تحديث بيانات المشترك');
      setEditingSub(null);
      loadData();
    } catch (err) {
      toast.error('خطأ في التحديث: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteSub = async (id) => {
    try {
      await axios.delete(`/api/subscribers/${id}`, { headers });
      toast.success('تم حذف المشترك بنجاح');
      setConfirmDelete(null);
      loadData();
    } catch (err) {
      toast.error('خطأ في الحذف: ' + (err.response?.data?.error || err.message));
    }
  };

  const saveSubPermissions = async (id) => {
    try {
      const permissions = subPermissions[id] || [];
      await axios.put(`/api/subscribers/${id}/permissions`, { permissions }, { headers });
      toast.success('تم تحديث الصلاحيات');
      loadData();
    } catch (err) {
      toast.error('خطأ في تحديث الصلاحيات: ' + (err.response?.data?.error || err.message));
    }
  };

  const replyFeedback = async (id) => {
    if (!replyText[id]) return;
    await axios.post(`/api/feedback/${id}/reply`, { reply: replyText[id] }, { headers });
    toast.success('تم إرسال الرد');
    setReplyText({ ...replyText, [id]: '' });
    loadData();
  };

  const approveFeedback = async (id) => {
    await axios.post(`/api/feedback/${id}/approve`, {}, { headers });
    toast.success('تمت الموافقة على الملاحظة');
    loadData();
  };

  const saveEmailConfig = async () => {
    try {
      await axios.post('/api/email-config', { smtpPass: gmailPass }, { headers });
      toast.success('تم حفظ الإعدادات!');
      loadData();
    } catch (err) { toast.error('خطأ في الحفظ'); }
  };

  const addCensusList = async () => {
    if (!newListKey.trim() || !newListLabel.trim()) { toast.error('أدخل المفتاح والاسم'); return; }
    try {
      await axios.post('/api/census-lists', { key: newListKey.trim(), label: newListLabel.trim(), options: [] }, { headers });
      toast.success('تمت إضافة القائمة');
      setNewListKey(''); setNewListLabel('');
      loadData();
    } catch (err) { toast.error('خطأ: ' + (err.response?.data?.error || err.message)); }
  };

  const addOptionToList = async (key) => {
    const text = (newOptionText[key] || '').trim();
    if (!text) return;
    try {
      await axios.post(`/api/census-lists/${key}/options`, { option: text }, { headers });
      toast.success(`تمت إضافة "${text}"`);
      setNewOptionText(prev => ({ ...prev, [key]: '' }));
      loadData();
    } catch (err) { toast.error('خطأ'); }
  };

  const removeOptionFromList = async (key, option) => {
    try {
      await axios.delete(`/api/census-lists/${key}/options/${encodeURIComponent(option)}`, { headers });
      toast.success(`تم حذف "${option}"`);
      loadData();
    } catch (err) { toast.error('خطأ'); }
  };

  const deleteCensusList = async (key) => {
    try {
      await axios.delete(`/api/census-lists/${key}`, { headers });
      toast.success('تم حذف القائمة');
      loadData();
    } catch (err) { toast.error('خطأ'); }
  };

  if (!isAdmin) return null;

  const pendingUsers = users.filter(u => !u.approved && u.role !== 'admin');
  const approvedUsers = users.filter(u => u.approved || u.role === 'admin');
  const pendingSubs = subscribers.filter(s => !s.approved);
  const approvedSubs = subscribers.filter(s => s.approved);

  const subCard = (s, isPending) => (
    <div className={`admin-card ${isPending ? 'pending' : 'approved'}`} key={s._id}>
      {editingSub === s._id ? (
        <div style={{ padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="الاسم" style={{ padding: '0.4rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
            <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="البريد الإلكتروني" style={{ padding: '0.4rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
            <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="الهاتف" style={{ padding: '0.4rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
            <input type="text" value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} placeholder="السبب" style={{ padding: '0.4rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <button className="btn-approve" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }} onClick={() => saveEditSub(s._id)}>💾 حفظ</button>
            <button className="btn-reject" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }} onClick={() => setEditingSub(null)}>✕ إلغاء</button>
          </div>
        </div>
      ) : (
        <>
          <div className="admin-card-header">
            <div className="admin-avatar">{isPending ? '✉' : '✓'}</div>
            <div style={{ flex: 1 }}>
              <strong>{s.name || s.email}</strong>
              <span className="admin-email">{s.email}</span>
              {s.phone && <span className="admin-email">هاتف: {s.phone}</span>}
              <span className="admin-email">{new Date(s.createdAt).toLocaleDateString('ar-SA')}</span>
              {s.reason && <span className="admin-email">السبب: {s.reason}</span>}
            </div>
          </div>

          {s.permissions && s.permissions.length > 0 && !isPending && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
              {s.permissions.map(p => (
                <span key={p} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{TAB_LABELS[p] || p}</span>
              ))}
            </div>
          )}

          {isPending && s.permissions && s.permissions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', margin: '0.3rem 0' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>طلبات الصلاحيات:</span>
              {s.permissions.map(p => (
                <span key={p} className="badge badge-orange" style={{ fontSize: '0.7rem' }}>{TAB_LABELS[p] || p}</span>
              ))}
            </div>
          )}

          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-light)' }}>الصلاحيات:</span>
            <PermissionCheckboxes
              selected={subPermissions[s._id] || s.permissions || []}
              onChange={(p) => setSubPermissions({ ...subPermissions, [s._id]: p })}
            />
          </div>

          <div className="admin-card-actions" style={{ flexWrap: 'wrap', gap: '0.3rem' }}>
            {isPending && (
              <button className="btn-approve" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }} onClick={() => approveSubscriber(s._id)}>✓ موافقة</button>
            )}
            {!isPending && (
              <button className="btn-approve" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: '#10b981' }} onClick={() => saveSubPermissions(s._id)}>🔐 حفظ الصلاحيات</button>
            )}
            <button className="btn-reject" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: '#3b82f6' }} onClick={() => startEditSub(s)}>✏️ تعديل</button>
            <button className="btn-reject" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: '#ef4444' }} onClick={() => setConfirmDelete(s._id)}>🗑️ حذف</button>
          </div>

          {confirmDelete === s._id && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: '0 0 0.5rem 0' }}>⚠️ هل أنت متأكد من حذف هذا المشترك "{s.name || s.email}"?</p>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button className="btn-reject" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: '#ef4444' }} onClick={() => deleteSub(s._id)}>نعم، احذف</button>
                <button className="btn-approve" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: '#64748b' }} onClick={() => setConfirmDelete(null)}>إلغاء</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <section className="section" id="admin">
      <div className="section-header">
        <span className="section-badge">لوحة الإدارة</span>
        <h2 className="section-title">إدارة <span className="gradient-text">المنصة</span></h2>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          المستخدمون ({pendingUsers.length} بانتظار)
        </button>
        <button className={`admin-tab ${tab === 'subscribers' ? 'active' : ''}`} onClick={() => setTab('subscribers')}>
          المشتركون ({pendingSubs.length} بانتظار)
        </button>
        <button className={`admin-tab ${tab === 'censusLists' ? 'active' : ''}`} onClick={() => setTab('censusLists')}>
          قوائم التعداد ({censusLists.length})
        </button>
        <button className={`admin-tab ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>
          الملاحظات ({feedbacks.length})
        </button>
        <button className={`admin-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>
          البريد الإلكتروني {emailStatus.configured ? '✅' : '⚠️'}
        </button>
      </div>

      {tab === 'users' && (
        <div className="admin-content">
          <h3>المستخدمون المنتظرون</h3>
          {pendingUsers.length === 0 ? <p className="empty-text">لا يوجد مستخدمون بانتظار الموافقة</p> : (
            <div className="admin-grid">
              {pendingUsers.map(u => (
                <div className="admin-card pending" key={u._id}>
                  <div className="admin-card-header">
                    <div className="admin-avatar">{u.name.charAt(0)}</div>
                    <div><strong>{u.name}</strong><span className="admin-email">{u.email || u.username}</span></div>
                  </div>
                  <div style={{ margin: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-light)' }}>تحديد الصلاحيات:</span>
                    <PermissionCheckboxes selected={userPermissions[u._id] || []} onChange={(p) => setUserPermissions({ ...userPermissions, [u._id]: p })} />
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn-approve" onClick={() => approveUser(u._id)}>موافقة</button>
                    <button className="btn-reject" onClick={() => rejectUser(u._id)}>رفض</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <h3 style={{ marginTop: '2rem' }}>المستخدمون المعتمدون</h3>
          <div className="admin-grid">
            {approvedUsers.map(u => (
              <div className="admin-card approved" key={u._id}>
                {editingUser === u._id ? (
                  <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input type="text" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} placeholder="الاسم" style={{ padding: '0.4rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
                      <input type="email" value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} placeholder="البريد الإلكتروني" style={{ padding: '0.4rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
                      <input type="text" value={editUserForm.phone} onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })} placeholder="الهاتف" style={{ padding: '0.4rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <button className="btn-approve" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }} onClick={() => saveEditUser(u._id)}>💾 حفظ</button>
                      <button className="btn-reject" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }} onClick={() => setEditingUser(null)}>✕ إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="admin-card-header">
                      <div className="admin-avatar">{u.name.charAt(0)}</div>
                      <div>
                        <strong>{u.name}</strong>
                        <span className="admin-email">{u.username} {u.role === 'admin' ? '(مدير)' : ''}</span>
                      </div>
                    </div>
                    {u.permissions && u.permissions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                        {u.permissions.map(p => (
                          <span key={p} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{TAB_LABELS[p] || p}</span>
                        ))}
                      </div>
                    )}
                    {u.role !== 'admin' && (
                      <>
                        <div style={{ margin: '0.5rem 0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-light)' }}>الصلاحيات:</span>
                          <PermissionCheckboxes selected={userPermissions[u._id] || u.permissions || []} onChange={(p) => setUserPermissions({ ...userPermissions, [u._id]: p })} />
                        </div>
                        <div className="admin-card-actions" style={{ flexWrap: 'wrap', gap: '0.3rem' }}>
                          <button className="btn-approve" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: '#10b981' }} onClick={() => saveUserPermissions(u._id)}>🔐 حفظ الصلاحيات</button>
                          <button className="btn-reject" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: '#3b82f6' }} onClick={() => startEditUser(u)}>✏️ تعديل</button>
                          <button className="btn-reject" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: '#ef4444' }} onClick={() => setConfirmDeleteUser(u._id)}>🗑️ حذف</button>
                        </div>
                        {confirmDeleteUser === u._id && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: '0 0 0.5rem 0' }}>⚠️ هل أنت متأكد من حذف "{u.name}"?</p>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button className="btn-reject" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: '#ef4444' }} onClick={() => deleteUser(u._id)}>نعم، احذف</button>
                              <button className="btn-approve" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: '#64748b' }} onClick={() => setConfirmDeleteUser(null)}>إلغاء</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'subscribers' && (
        <div className="admin-content">
          <h3>اشتراكات بانتظار الموافقة ({pendingSubs.length})</h3>
          {pendingSubs.length === 0 ? <p className="empty-text">لا يوجد اشتراكات بانتظار</p> : (
            <div className="admin-grid">
              {pendingSubs.map(s => subCard(s, true))}
            </div>
          )}
          <h3 style={{ marginTop: '2rem' }}>المشتركون المعتمدون ({approvedSubs.length})</h3>
          <div className="admin-grid">
            {approvedSubs.length === 0 ? <p className="empty-text">لا يوجد مشتركون معتمدون</p> : (
              approvedSubs.map(s => subCard(s, false))
            )}
          </div>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="admin-content">
          <h3>الملاحظات الواردة</h3>
          {feedbacks.length === 0 ? <p className="empty-text">لا توجد ملاحظات</p> : (
            <div className="feedback-admin-list">
              {feedbacks.map(fb => (
                <div className={`feedback-admin-card ${fb.status}`} key={fb.id}>
                  <div className="feedback-header">
                    <div className="feedback-avatar">{fb.name.charAt(0)}</div>
                    <div>
                      <strong>{fb.name}</strong>
                      <span className="feedback-date">{new Date(fb.createdAt).toLocaleDateString('ar-SA')} - {fb.email}</span>
                    </div>
                    <span className={`badge ${fb.status === 'replied' ? 'badge-green' : fb.status === 'approved' ? 'badge-blue' : 'badge-orange'}`}>
                      {fb.status === 'replied' ? 'تم الرد' : fb.status === 'approved' ? 'معتمد' : 'جديد'}
                    </span>
                  </div>
                  {fb.subject && <div className="feedback-subject">{fb.subject}</div>}
                  <p className="feedback-message">{fb.message}</p>
                  {fb.adminReply && (
                    <div className="admin-reply">
                      <strong>رد الإدارة:</strong>
                      <p>{fb.adminReply}</p>
                    </div>
                  )}
                  <div className="feedback-actions">
                    {!fb.adminReply && (
                      <div className="reply-form">
                        <input type="text" placeholder="اكتب ردك..." value={replyText[fb.id] || ''} onChange={e => setReplyText({ ...replyText, [fb.id]: e.target.value })} />
                        <button className="btn-primary btn-sm" onClick={() => replyFeedback(fb.id)}>إرسال الرد</button>
                      </div>
                    )}
                    {fb.status === 'pending' && (
                      <button className="btn-approve btn-sm" onClick={() => approveFeedback(fb.id)}>اعتماد الملاحظة</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'censusLists' && (
        <div className="admin-content">
          <h3>قوائم التعداد القابلة للتعديل</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray-light)', marginBottom: '1rem' }}>هذه القوائم تظهر في استمارات التعداد كقوائم منسدلة. المدير يمكنه إضافة خيارات جديدة أو حذفها.</p>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <input type="text" placeholder="المفتاح (مثل: governorate)" value={newListKey} onChange={e => setNewListKey(e.target.value)}
              style={{ padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem', flex: 1 }} />
            <input type="text" placeholder="الاسم (مثل: المحافظة)" value={newListLabel} onChange={e => setNewListLabel(e.target.value)}
              style={{ padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem', flex: 1 }} />
            <button className="btn-approve" onClick={addCensusList}>+ إضافة قائمة</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
            {censusLists.map(list => (
              <div key={list._id} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{list.label}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray)', marginRight: '0.5rem' }}>({list.key}) — {list.options.length} خيار</span>
                  </div>
                  <button className="btn-reject" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: '#ef4444' }} onClick={() => deleteCensusList(list.key)}>🗑️ حذف</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  {list.options.map(opt => (
                    <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.78rem', color: 'var(--gray-light)' }}>
                      {opt}
                      <button onClick={() => removeOptionFromList(list.key, opt)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: 0, lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                  {list.options.length === 0 && <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>لا توجد خيارات بعد</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <input type="text" placeholder={`إضافة خيار لـ ${list.label}...`} value={newOptionText[list.key] || ''}
                    onChange={e => setNewOptionText(prev => ({ ...prev, [list.key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addOptionToList(list.key); }}
                    style={{ flex: 1, padding: '0.3rem 0.6rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem' }} />
                  <button onClick={() => addOptionToList(list.key)} style={{ padding: '0.3rem 0.6rem', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="admin-content">
          <h3>إعدادات البريد الإلكتروني</h3>
          <div className="email-config-card">
            <div className="email-status">
              <span className={`badge ${emailStatus.configured ? 'badge-green' : 'badge-orange'}`}>
                {emailStatus.configured ? 'مفعل' : 'غير مفعل'}
              </span>
            </div>
            <p className="form-subtitle" style={{ margin: '1rem 0' }}>
              لإرسال الإيميلات، تحتاج <b>كلمة مرور تطبيق Gmail</b>:
            </p>
            <div className="form-group">
              <label>كلمة مرور تطبيق Gmail</label>
              <input type="password" value={gmailPass} onChange={e => setGmailPass(e.target.value)} placeholder="abcdefghijklmnop" />
            </div>
            <button className="btn-primary" onClick={saveEmailConfig}>حفظ الإعدادات</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminPanel;
