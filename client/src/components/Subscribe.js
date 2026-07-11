import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiMail, FiCheck, FiPhone, FiUser, FiMessageSquare } from 'react-icons/fi';
import { TAB_IDS, TAB_LABELS } from '../context/AuthContext';

const Subscribe = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '', permissions: [] });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const togglePermission = (tab) => {
    if (form.permissions.includes(tab)) {
      setForm({ ...form, permissions: form.permissions.filter(t => t !== tab) });
    } else {
      setForm({ ...form, permissions: [...form.permissions, tab] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('يرجى إدخال الاسم والبريد الإلكتروني'); return; }
    if (form.permissions.length === 0) { toast.error('اختر صلاحية واحدة على الأقل'); return; }
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
          <p>حسابك في انتظار موافقة المدير. سيتم إشعارك عند التفعيل.</p>
        </div>
      ) : (
        <div className="subscribe-form-wrapper">
          <form onSubmit={handleSubmit} className="subscribe-form-col">
            <div className="form-group">
              <label><FiUser /> الاسم الكامل *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="أدخل اسمك الكامل" required />
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
            <div className="form-group">
              <label>الصلاحيات المطلوبة *</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: '0.5rem' }}>حدد التبويبات التي تريد الوصول إليها:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {TAB_IDS.filter(t => t !== 'subscribe').map(tab => (
                  <label key={tab} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem', borderRadius: '10px', border: '1px solid', borderColor: form.permissions.includes(tab) ? 'var(--primary)' : 'rgba(99,102,241,0.2)', background: form.permissions.includes(tab) ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.5)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s' }}>
                    <input type="checkbox" checked={form.permissions.includes(tab)} onChange={() => togglePermission(tab)} style={{ accentColor: 'var(--primary)' }} />
                    {TAB_LABELS[tab]}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'جاري التسجيل...' : <><FiCheck /> تسجيل الاشتراك</>}
            </button>
          </form>
          <p className="subscribe-note">نحترم خصوصيتك. حسابك في انتظار موافقة المدير.</p>
        </div>
      )}
    </div>
  );
};

export default Subscribe;
