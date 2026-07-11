import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiMail, FiCheck, FiPhone, FiUser, FiMessageSquare, FiLock } from 'react-icons/fi';

const Subscribe = () => {
  const [form, setForm] = useState({ name: '', username: '', password: '', email: '', phone: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.password || !form.email) { toast.error('يرجى إدخال جميع الحقول المطلوبة'); return; }
    if (form.username.length < 3) { toast.error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل'); return; }
    if (form.password.length < 4) { toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/subscribers/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { setDone(true); toast.success(data.message); }
      else { toast.error(data.error); }
    } catch (err) { toast.error('حدث خطأ'); }
    setLoading(false);
  };

  return (
    <div className="tab-section">
      <div className="section-header">
        <span className="section-badge">الاشتراك</span>
        <h2 className="section-title">اشترك في <span className="gradient-text">ابناء راس عيسى</span></h2>
        <p className="section-desc">سجل بياناتك للانضمام إلى المنصة. حسابك سيكون في انتظار موافقة المدير قبل التفعيل.</p>
      </div>

      {done ? (
        <div className="success-box">
          <div className="success-icon">✓</div>
          <h3>تم تسجيل اشتراكك!</h3>
          <p>حسابك في انتظار موافقة المدير. يمكنك تسجيل الدخول بعد التفعيل.</p>
        </div>
      ) : (
        <div className="subscribe-form-wrapper">
          <form onSubmit={handleSubmit} className="subscribe-form-col">
            <div className="form-group">
              <label><FiUser /> الاسم الكامل *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="أدخل اسمك الكامل" required />
            </div>
            <div className="form-group">
              <label><FiUser /> اسم المستخدم *</label>
              <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="اسم المستخدم للدخول" required />
            </div>
            <div className="form-group">
              <label><FiLock /> كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="كلمة المرور" required />
            </div>
            <div className="form-group">
              <label><FiMail /> البريد الإلكتروني *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="example@email.com" required />
            </div>
            <div className="form-group">
              <label><FiPhone /> رقم الهاتف</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="77XXXXXXX" />
            </div>
            <div className="form-group">
              <label><FiMessageSquare /> سبب الاشتراك</label>
              <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="لماذا تريد الاشتراك في المنصة؟" rows={3} />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'جاري التسجيل...' : <><FiCheck /> تسجيل الاشتراك</>}
            </button>
          </form>
          <p className="subscribe-note">سيقوم المدير بتحديد الصلاحيات المناسبة عند الموافقة على اشتراكك.</p>
        </div>
      )}
    </div>
  );
};

export default Subscribe;
