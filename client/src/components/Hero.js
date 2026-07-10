import React from 'react';

const Hero = () => (
  <section className="hero" id="hero">
    <div className="hero-bg">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <div className="grid-bg"></div>
    </div>
    <div className="hero-content">
      <div className="hero-badge">
        <span>&#9889;</span>
        <span>منصة البيانات الموحدة</span>
      </div>
      <h1>
        منصة <span className="gradient-text">ابناء راس عيسى</span><br />
        لإدارة بيانات العمال والأسر المحتاجة
      </h1>
      <p>منصة متكاملة لعرض وإدارة بيانات العمال والفرق والأسر المحتاجة في راس عيسى - الصليف. بيانات محدثة ودقيقة لاتخاذ القرارات.</p>
      <div className="hero-buttons">
        <a href="#dashboard" className="btn-primary">عرض البيانات &#8595;</a>
        <a href="#subscribe" className="btn-secondary">اشترك الآن</a>
      </div>
    </div>
  </section>
);

export default Hero;