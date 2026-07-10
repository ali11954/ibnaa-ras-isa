import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiStar } from 'react-icons/fi';

const defaultReviews = [
  { _id: '1', name: 'أحمد الشمري', rating: 5, service: 'تطوير المواقع', comment: 'تجربة رائعة! الفريق محترف جداً والنتائج فاقت توقعاتنا. أنصح الجميع بالتعامل معهم.', createdAt: '2025-12-01' },
  { _id: '2', name: 'سارة العتيبي', rating: 5, service: 'التسويق الرقمي', comment: 'حملاتنا التسويقية تحسنت بشكل ملحوظ بعد تعاملهم معنا. النتائج ممتازة والمتابعة مستمرة.', createdAt: '2025-11-15' },
  { _id: '3', name: 'محمد القحطاني', rating: 4, service: 'تطبيقات الجوال', comment: 'تطبيق ممتاز وسهل الاستخدام. فريق العمل كان متعاوناً ومبدعاً في التصميم.', createdAt: '2025-10-20' },
  { _id: '4', name: 'نورة الحربي', rating: 5, service: 'التصميم الجرافيكي', comment: 'الهوية البصرية التي صمموها لنا كانت مذهلة. إبداع واحترافية عالية.', createdAt: '2025-09-10' },
  { _id: '5', name: 'خالد المطيري', rating: 5, service: 'الأمن السيبراني', comment: 'حلول أمنية متقدمة وفريق تقني على أعلى مستوى. شكر لكم على الحماية المتميزة.', createdAt: '2025-08-05' },
  { _id: '6', name: 'فاطمة الزهراني', rating: 4, service: 'الاستشارات التقنية', comment: 'استشارات قيمة ساعدتنا في اتخاذ قرارات تقنية صحيحة. خبرة واسعة وفهم عميق للسوق.', createdAt: '2025-07-20' },
];

const services = ['تطوير المواقع', 'تطبيقات الجوال', 'التسويق الرقمي', 'التصميم الجرافيكي', 'الأمن السيبراني', 'الاستشارات التقنية'];

const Reviews = () => {
  const [reviews, setReviews] = useState(defaultReviews);
  const [formData, setFormData] = useState({ name: '', email: '', rating: 5, service: '', comment: '' });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => { if (data.length > 0) setReviews(data); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.comment || !formData.service) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const newReview = await res.json();
      setReviews([newReview, ...reviews]);
      setFormData({ name: '', email: '', rating: 5, service: '', comment: '' });
      setShowForm(false);
      toast.success('شكراً لك! تم إضافة مراجعتك بنجاح');
    } catch (err) {
      setReviews([{ ...formData, _id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'approved' }, ...reviews]);
      setFormData({ name: '', email: '', rating: 5, service: '', comment: '' });
      setShowForm(false);
      toast.success('شكراً لك! تم إضافة مراجعتك بنجاح');
    }
  };

  const renderStars = (rating) => (
    <div className="review-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`star ${i < rating ? '' : 'empty'}`}>{'\u2605'}</span>
      ))}
    </div>
  );

  return (
    <section className="section reviews-section" id="reviews">
      <div className="section-header">
        <span className="section-badge">آراء العملاء</span>
        <h2 className="section-title">ماذا يقول <span className="gradient-text">عملاؤنا</span></h2>
        <p className="section-desc">نفخر بثقة عملائنا ورضاهم عن خدماتنا المتميزة</p>
      </div>
      <div className="reviews-grid">
        {reviews.map((review) => (
          <div className="review-card" key={review._id}>
            {renderStars(review.rating)}
            <p className="review-comment">{review.comment}</p>
            <div className="review-author">
              <div className="review-avatar">{review.name.charAt(0)}</div>
              <div className="review-author-info">
                <h4>{review.name}</h4>
                <span>{new Date(review.createdAt).toLocaleDateString('ar-SA')}</span>
                <div className="review-service-tag">{review.service}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!showForm ? (
        <div style={{ textAlign: 'center' }}>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <FiStar /> أضف مراجعتك
          </button>
        </div>
      ) : (
        <div className="review-form-container">
          <h3>شاركنا رأيك</h3>
          <p className="form-subtitle">ملاحظاتك تساعدنا على التميز والتطوير المستمر</p>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>الاسم الكامل *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="أدخل اسمك" required />
              </div>
              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@email.com" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>الخدمة *</label>
                <select value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} required>
                  <option value="">اختر الخدمة</option>
                  {services.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>التقييم *</label>
                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" className={`star-btn ${star <= (hoveredStar || formData.rating) ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, rating: star })}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}>
                      {'\u2605'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>مراجعتك *</label>
              <textarea value={formData.comment} onChange={(e) => setFormData({ ...formData, comment: e.target.value })} placeholder="اكتب تجربتك معنا بالتفصيل..." required />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button type="submit" className="btn-primary">إرسال المراجعة</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default Reviews;