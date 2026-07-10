import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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
      const eRes = await axios.get('/api/email-status');
      setEmailStatus(eRes.data);
      const pendingFb = fRes.data.filter(f => f.status === 'pending');
      if (pendingFb.length > 0) setTab('feedback');
    } catch (err) {}
  }, [isAdmin, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const approveUser = async (id) => {
    await axios.post(`/api/admin/users/${id}/approve`, {}, { headers });
    toast.success('تمت الموافقة على المستخدم');
    loadData();
  };

  const rejectUser = async (id) => {
    await axios.post(`/api/admin/users/${id}/reject`, {}, { headers });
    toast.success('تم رفض المستخدم');
    loadData();
  };

  const approveSubscriber = async (id) => {
    await axios.post(`/api/admin/subscribers/${id}/approve`, {}, { headers });
    toast.success('تمت الموافقة على الاشتراك');
    loadData();
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
      await axios.post('/api/admin/email-config', { gmailPass }, { headers });
      toast.success('تم حفظ الإعدادات! أعد تشغيل الخادم');
      loadData();
    } catch (err) { toast.error('خطأ في الحفظ'); }
  };

  const sendTestEmail = async () => {
    try {
      await axios.post('/api/admin/test-email', { to: testEmail || ADMIN_EMAIL }, { headers });
      toast.success('تم إرسال إيميل تجريبي!');
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ في الإرسال'); }
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
                <div className="admin-card pending" key={u.id}>
                  <div className="admin-card-header">
                    <div className="admin-avatar">{u.name.charAt(0)}</div>
                    <div><strong>{u.name}</strong><span className="admin-email">{u.email || u.username}</span></div>
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn-approve" onClick={() => approveUser(u.id)}>موافقة</button>
                    <button className="btn-reject" onClick={() => rejectUser(u.id)}>رفض</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <h3 style={{ marginTop: '2rem' }}>المستخدمون المعتمدون</h3>
          <div className="admin-grid">
            {approvedUsers.map(u => (
              <div className="admin-card approved" key={u.id}>
                <div className="admin-card-header">
                  <div className="admin-avatar">{u.name.charAt(0)}</div>
                  <div><strong>{u.name}</strong><span className="admin-email">{u.username} {u.role === 'admin' ? '(مدير)' : ''}</span></div>
                </div>
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
                <div className="admin-card pending" key={s.id}>
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
                  <div className="admin-card-actions">
                    <button className="btn-approve" onClick={() => approveSubscriber(s.id)}>موافقة</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <h3 style={{ marginTop: '2rem' }}>المشتركون المعتمدون ({approvedSubs.length})</h3>
          <div className="admin-grid">
            {approvedSubs.map(s => (
              <div className="admin-card approved" key={s.id}>
                <div className="admin-card-header">
                  <div className="admin-avatar green">&#10003;</div>
                  <div><strong>{s.email}</strong></div>
                </div>
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
              <span style={{ marginRight: '0.5rem' }}>البريد: {emailStatus.adminEmail}</span>
            </div>
            <p className="form-subtitle" style={{ margin: '1rem 0' }}>
              لإرسال الإيميلات، تحتاج <b>كلمة مرور تطبيق Gmail</b>:
            </p>
            <ol style={{ color: 'var(--gray-light)', fontSize: '0.9rem', paddingRight: '1.2rem', marginBottom: '1rem' }}>
              <li>افتح <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Google App Passwords</a></li>
              <li>أنشئ كلمة مرور جديدة باسم "ابناء راس عيسى"</li>
              <li>انسخ كلمة المرور وضعها هنا</li>
            </ol>
            <div className="form-group">
              <label>كلمة مرور تطبيق Gmail</label>
              <input type="password" value={gmailPass} onChange={e => setGmailPass(e.target.value)} placeholder="abcdefghijklmnop" />
            </div>
            <button className="btn-primary" onClick={saveEmailConfig}>حفظ الإعدادات</button>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
              <h4 style={{ marginBottom: '0.8rem' }}>إرسال إيميل تجريبي</h4>
              <div className="form-group">
                <label>إرسال إلى</label>
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder={emailStatus.adminEmail} />
              </div>
              <button className="btn-primary btn-sm" onClick={sendTestEmail}>إرسال تجريبي</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminPanel;