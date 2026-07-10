import React from 'react';
import { FiTarget, FiUsers, FiZap, FiHeart } from 'react-icons/fi';

const features = [
  { icon: <FiTarget />, label: 'رؤية استراتيجية' },
  { icon: <FiUsers />, label: 'فريق متخصص' },
  { icon: <FiZap />, label: 'تنفيذ سريع' },
  { icon: <FiHeart />, label: 'دعم مستمر' },
];

const About = () => (
  <section className="section" id="about">
    <div className="about-grid">
      <div className="about-text">
        <span className="section-badge">من نحن</span>
        <h2>شريكك الرقمي <span className="gradient-text">للوصول للقمة</span></h2>
        <p>نحن فريق من المحترفين المتخصصين في الحلول الرقمية. نسعى لتقديم أفضل الحلول التقنية التي تساعد أعمالك على النمو والتطور في عالم التحول الرقمي.</p>
        <p>بخبرة تمتد لأكثر من 10 سنوات، نعمل مع أبرز الشركات لتحويل رؤيتهم الرقمية إلى واقع ملموس.</p>
        <div className="about-features">
          {features.map((f, i) => (
            <div className="about-feature" key={i}>
              <div className="about-feature-icon">{f.icon}</div>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="about-visual">
        <div className="glow"></div>
        <div className="card">
          <div className="big-number">+500</div>
          <div className="big-label">مشروع ناجح</div>
          <div className="mini-stats">
            <div className="mini-stat"><div className="num">+120</div><div className="label">عميل سعيد</div></div>
            <div className="mini-stat"><div className="num">+15</div><div className="label">سنة خبرة</div></div>
            <div className="mini-stat"><div className="num">98%</div><div className="label">نسبة الرضا</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default About;