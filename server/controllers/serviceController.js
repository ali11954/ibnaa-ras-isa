const Service = require('../models/Service');

const defaultServices = [
  { title: 'تطوير المواقع', description: 'تصميم وتطوير مواقع ويب احترافية بأحدث التقنيات', icon: 'FiGlobe', features: ['تصميم متجاوب', 'تحسين محركات البحث', 'أداء عالي'], price: 'تبدأ من 5,000 ر.س' },
  { title: 'تطبيقات الجوال', description: 'تطوير تطبيقات ذكية لنظامي iOS و Android', icon: 'FiSmartphone', features: ['واجهات سلسة', 'أداء متميز', 'دعم مستمر'], price: 'تبدأ من 8,000 ر.س' },
  { title: 'التسويق الرقمي', description: 'استراتيجيات تسويقية متكاملة لنمو أعمالك', icon: 'FiTrendingUp', features: ['إدارة الحملات', 'تحليل البيانات', 'تحسين التحويل'], price: 'تبدأ من 3,000 ر.س' },
  { title: 'التصميم الجرافيكي', description: 'تصميم هوية بصرية ومواد إعلانية جذابة', icon: 'FiPenTool', features: ['شعار احترافي', 'مواد تسويقية', 'هوية متكاملة'], price: 'تبدأ من 2,000 ر.س' },
  { title: 'الأمن السيبراني', description: 'حماية بياناتك وأنظمتك من التهديدات الإلكترونية', icon: 'FiShield', features: ['تقييم المخاطر', 'حلول الحماية', 'مراقبة مستمرة'], price: 'تبدأ من 4,000 ر.س' },
  { title: 'الاستشارات التقنية', description: 'استشارات تقنية متخصصة لتطوير أعمالك الرقمية', icon: 'FiAward', features: ['تحليل احتياجات', 'خطة عمل تقنية', 'دعم تنفيذي'], price: 'تبدأ من 1,500 ر.س' }
];

exports.getAll = async (req, res) => {
  try {
    const services = await Service.find({ active: true });
    if (services.length === 0) {
      const created = await Service.insertMany(defaultServices);
      return res.json(created);
    }
    res.json(services);
  } catch (err) {
    res.json(defaultServices.map((s, i) => ({ ...s, _id: String(i + 1) })));
  }
};

exports.create = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};