import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Feedback = () => {
  const { user, token, isApproved } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchMyFeedbacks = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/feedback', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMyFeedbacks(Array.isArray(data) ? data : []);
    } catch (err) {}
    setLoadingHistory(false);
  };

  useEffect(() => { fetchMyFeedbacks(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message) { toast.error('يرجى إدخال الرسالة'); return; }
    setLoading(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message, subject }),
      });
      setMessage(''); setSubject('');
      setSubmitted(true);
      fetchMyFeedbacks();
      toast.success('تم إرسال ملاحظتك! سيتم مراجعتها من قبل الإدارة.');
    } catch (err) {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
    setLoading(false);
  };

  const statusLabel = (s) => {
    if (s === 'replied') return { text: 'تم الرد', cls: 'badge-green' };
    if (s === 'approved') return { text: 'معتمدة', cls: 'badge-blue' };
    return { text: 'بانتظار المراجعة', cls: 'badge-orange' };
  };

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">الملاحظات والمقترحات</span>
        <h2 className="section-title">شاركنا <span className="gradient-text">ملاحظاتك</span></h2>
        <p className="section-desc">نرحب بكل ملاحظاتكم ومقترحاتكم لتحسين الخدمات.</p>
      </div>

      {!isApproved && (
        <div className="locked-content">
          <div className="locked-icon">📝</div>
          <h3>الملاحظات متاحة للمشتركين فقط</h3>
          <p>سجّل دخولك أو اشترك لإرسال ملاحظاتك ومتابعة الردود</p>
          <a href="#subscribe" className="btn-primary">اشترك الآن</a>
        </div>
      )}

      {isApproved && user && myFeedbacks.length > 0 && (
        <div className="my-feedbacks">
          <h3>ملاحظاتي ({myFeedbacks.length})</h3>
          {myFeedbacks.map(fb => {
            const st = statusLabel(fb.status);
            return (
              <div key={fb.id} className="my-feedback-card">
                <div className="my-fb-header">
                  {fb.subject && <strong>{fb.subject}</strong>}
                  <span className={`badge ${st.cls}`}>{st.text}</span>
                </div>
                <p className="my-fb-message">{fb.message}</p>
                <span className="my-fb-date">{new Date(fb.createdAt).toLocaleDateString('ar-SA')}</span>
                {fb.adminReply && (
                  <div className="my-fb-reply">
                    <span className="reply-label">رد الإدارة:</span>
                    <p>{fb.adminReply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isApproved && (
      <div className="feedback-container-center">
        {submitted ? (
          <div className="success-box">
            <div className="success-icon">✓</div>
            <h3>تم إرسال ملاحظتك بنجاح!</h3>
            <p>شكراً لك. ستتم مراجعة ملاحظتك من قبل الإدارة والرد عليها قريباً.</p>
            <button className="btn-primary" onClick={() => setSubmitted(false)}>إرسال ملاحظة أخرى</button>
          </div>
        ) : (
          <div className="feedback-form-container">
            <h3>أرسل ملاحظتك</h3>
            {user && <p className="form-subtitle">مرحباً {user.name} — ملاحظاتك ستُظهر باسم حسابك</p>}
            {!user && <p className="form-subtitle">سجّل دخولك لتظهر ملاحظتك باسم حسابك</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label><FiMessageSquare /> الموضوع</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="موضوع الملاحظة" />
              </div>
              <div className="form-group">
                <label><FiMessageSquare /> ملاحظتك *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب ملاحظتك أو مقترحك هنا..." required rows={5} />
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'جاري الإرسال...' : <><FiSend /> إرسال الملاحظة</>}
              </button>
            </form>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default Feedback;
