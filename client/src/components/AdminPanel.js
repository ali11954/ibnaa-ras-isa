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
  const [testEmail, setTestEmail] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [userPermissions, setUserPermissions] = useState({});
  const [subPermissions, setSubPermissions] = useState({});

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

  if (!isAdmin) return null;

  const pendingUsers = users.filter(u => !u.approved && u.role !== 'admin');
  const approvedUsers = users.filter(u => u.approved || u.role === 'admin');
  const pendingSubs = subscribers.filter(s => !s.approved);
  const approvedSubs = subscribers.filter(s => s.approved);

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
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'subscribers' && (
        <div className="admin-content">
          <h3>اشتراكات بانتظار الموافقة</h3>
          {pendingSubs.length === 0 ? <p className="empty-text">لا يوجد اشتراكات بانتظار</p> : (
            <div className="admin-grid">
              {pendingSubs.map(s => (
                <div className="admin-card pending" key={s._id}>
                  <div className="admin-card-header">
                    <div className="admin-avatar">&#9993;</div>
                    <div>
                      <strong>{s.name || s.email}</strong>
                      <span className="admin-email">{s.email}</span>
                      {s.phone && <span className="admin-email">هاتف: {s.phone}</span>}
                      <span className="admin-email">{new Date(s.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                  {s.reason && <p style={{color:'var(--gray-light)',fontSize:'0.85rem',margin:'0.5rem 0'}}>السبب: {s.reason}</p>}
                  {s.permissions && s.permissions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', margin: '0.3rem 0' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>:طلبات الصلاحيات</span>
                      {s.permissions.map(p => (
                        <span key={p} className="badge badge-orange" style={{ fontSize: '0.7rem' }}>{TAB_LABELS[p] || p}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ margin: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-light)' }}>تحديد الصلاحيات:</span>
                    <PermissionCheckboxes selected={subPermissions[s._id] || s.permissions || []} onChange={(p) => setSubPermissions({ ...subPermissions, [s._id]: p })} />
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn-approve" onClick={() => approveSubscriber(s._id)}>موافقة</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <h3 style={{ marginTop: '2rem' }}>المشتركون المعتمدون ({approvedSubs.length})</h3>
          <div className="admin-grid">
            {approvedSubs.map(s => (
              <div className="admin-card approved" key={s._id}>
                <div className="admin-card-header">
                  <div className="admin-avatar green">&#10003;</div>
                  <div>
                    <strong>{s.name || s.email}</strong>
                    <span className="admin-email">{s.email}</span>
                  </div>
                </div>
                {s.permissions && s.permissions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                    {s.permissions.map(p => (
                      <span key={p} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{TAB_LABELS[p] || p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
