import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiMail, FiPhone, FiMapPin, FiClock } from 'react-icons/fi';

const contactInfo = [
  { icon: <FiMail />, title: 'البريد الإلكتروني', text: 'info@mutawifa.sa' },
  { icon: <FiPhone />, title: 'الهاتف', text: '+966 50 123 4567' },
  { icon: <FiMapPin />, title: 'الموقع', text: 'الرياض، المملكة العربية السعودية' },
  { icon: <FiClock />, title: 'ساعات العمل', text: 'الأحد - الخميس: 9 صباحاً - 6 مساءً' },
];

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch (err) {}
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    toast.success('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً');
  };

  return (
    <section className="section" id="contact">
      <div className="section-header">
        <span className="section-badge">تواصل معنا</span>
        <h2 className="section-title">نحن هنا <span className="gradient-text">لمساعدتك</span></h2>
        <p className="section-desc">تواصل معنا ودعنا نساعدك في تحقيق أهدافك الرقمية</p>
      </div>
      <div className="contact-grid">
        <div className="contact-info">
          <h2>لنبدأ مشروعك <span className="gradient-text">الرقمي</span></h2>
          <p>يسعدنا تلقي استفساراتك ومساعدتك في كل ما يتعلق بمشاريعك الرقمية. تواصل معنا الآن.</p>
          {contactInfo.map((item, i) => (
            <div className="contact-item" key={i}>
              <div className="contact-item-icon">{item.icon}</div>
              <div><h4>{item.title}</h4><p>{item.text}</p></div>
            </div>
          ))}
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>الاسم *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسمك" required />
            </div>
            <div className="form-group">
              <label>البريد الإلكتروني *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@email.com" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>الهاتف</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+966 5X XXX XXXX" />
            </div>
            <div className="form-group">
              <label>الموضوع</label>
              <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="موضوع الرسالة" />
            </div>
          </div>
          <div className="form-group">
            <label>الرسالة *</label>
            <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="اكتب رسالتك هنا..." required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>إرسال الرسالة</button>
        </form>
      </div>
    </section>
  );
};

export default Contact;