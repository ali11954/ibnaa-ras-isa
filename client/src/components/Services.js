import React, { useState, useEffect } from 'react';
import { FiGlobe, FiSmartphone, FiTrendingUp, FiPenTool, FiShield, FiAward } from 'react-icons/fi';

const iconMap = { FiGlobe, FiSmartphone, FiTrendingUp, FiPenTool, FiShield, FiAward };

const defaultServices = [
  { title: 'تطوير المواقع', description: 'تصميم وتطوير مواقع ويب احترافية بأحدث التقنيات', icon: 'FiGlobe', features: ['تصميم متجاوب', 'تحسين محركات البحث', 'أداء عالي'], price: 'تبدأ من 5,000 ر.س' },
  { title: 'تطبيقات الجوال', description: 'تطوير تطبيقات ذكية لنظامي iOS و Android', icon: 'FiSmartphone', features: ['واجهات سلسة', 'أداء متميز', 'دعم مستمر'], price: 'تبدأ من 8,000 ر.س' },
  { title: 'التسويق الرقمي', description: 'استراتيجيات تسويقية متكاملة لنمو أعمالك', icon: 'FiTrendingUp', features: ['إدارة الحملات', 'تحليل البيانات', 'تحسين التحويل'], price: 'تبدأ من 3,000 ر.س' },
  { title: 'التصميم الجرافيكي', description: 'تصميم هوية بصرية ومواد إعلانية جذابة', icon: 'FiPenTool', features: ['شعار احترافي', 'مواد تسويقية', 'هوية متكاملة'], price: 'تبدأ من 2,000 ر.س' },
  { title: 'الأمن السيبراني', description: 'حماية بياناتك وأنظمتك من التهديدات الإلكترونية', icon: 'FiShield', features: ['تقييم المخاطر', 'حلول الحماية', 'مراقبة مستمرة'], price: 'تبدأ من 4,000 ر.س' },
  { title: 'الاستشارات التقنية', description: 'استشارات تقنية متخصصة لتطوير أعمالك الرقمية', icon: 'FiAward', features: ['تحليل احتياجات', 'خطة عمل تقنية', 'دعم تنفيذي'], price: 'تبدأ من 1,500 ر.س' }
];

const Services = () => {
  const [services, setServices] = useState(defaultServices);

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => { if (data.length > 0) setServices(data); })
      .catch(() => {});
  }, []);

  return (
    <section className="section" id="services">
      <div className="section-header">
        <span className="section-badge">خدماتنا</span>
        <h2 className="section-title">حلول رقمية <span className="gradient-text">متكاملة</span></h2>
        <p className="section-desc">نقدم مجموعة شاملة من الخدمات الرقمية المتميزة لنجاح أعمالك</p>
      </div>
      <div className="services-grid">
        {services.map((service, index) => {
          const IconComp = iconMap[service.icon] || FiGlobe;
          return (
            <div className="service-card" key={index}>
              <div className="service-icon"><IconComp /></div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ul className="service-features">
                {(service.features || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <div className="service-price">{service.price}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Services;