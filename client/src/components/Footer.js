import React, { useState, useEffect } from 'react';
import { FiArrowUp } from 'react-icons/fi';

const Footer = () => {
  const [showScroll, setShowScroll] = useState(false);
  useEffect(() => {
    const h = () => setShowScroll(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">ابناء راس عيسى</div>
            <p>منصة متكاملة للبيانات في راس عيسى - الصليف.</p>
          </div>
          <div className="footer-col">
            <h4>روابط سريعة</h4>
            <ul>
              <li><a href="#hero">الرئيسية</a></li>
              <li><a href="#dashboard">لوحة التحكم</a></li>
              <li><a href="#workers">بيانات العمال</a></li>
              <li><a href="#families">الأسر المحتاجة</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>الخدمات</h4>
            <ul>
              <li><a href="#workers">كشف العمال</a></li>
              <li><a href="#families">فرق العمل</a></li>
              <li><a href="#feedback">الملاحظات</a></li>
              <li><a href="#subscribe">الاشتراك</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>تواصل معنا</h4>
            <ul>
              <li><a href="#feedback">أرسل ملاحظاتك</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} ابناء راس عيسى. جميع الحقوق محفوظة.</span>
          <span style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--gray)' }}>تصميم وتطوير: <a href="https://alghithapp.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)', fontWeight: '600' }}>المصمم غيث</a></span>
        </div>
      </footer>
      <button className={`scroll-top ${showScroll ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><FiArrowUp /></button>
    </>
  );
};

export default Footer;