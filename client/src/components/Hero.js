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
        <span>⚡</span>
        <span>منصة البيانات الموحدة</span>
      </div>
      <h1>
        <span className="gradient-text">ابناء راس عيسى</span>
      </h1>
      <p>منصة متكاملة لعرض وإدارة البيانات في راس عيسى - الصليف. بيانات محدثة ودقيقة لاتخاذ القرارات.</p>
      <div className="hero-buttons">
        <a href="#tabs" className="btn-primary">عرض البيانات ↓</a>
        <a href="#tabs" className="btn-secondary">اشترك الآن</a>
      </div>
    </div>
  </section>
);

export default Hero;
