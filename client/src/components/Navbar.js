import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a href="#hero" className="logo">ابناء راس عيسى</a>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}>
              {isDark ? '☀️' : '🌙'}
            </button>
            {user ? (
              <div className="user-menu">
                <span className="user-name">{user.name}</span>
                {isAdmin && <span className="admin-badge">مدير</span>}
                <button className="btn-secondary btn-sm" onClick={() => { logout(); toast.info('تم الخروج'); }}>خروج</button>
              </div>
            ) : (
              <button className="cta-btn" onClick={() => setShowModal('login')}>دخول</button>
            )}
          </div>
        </div>
      </nav>
      {showModal && <AuthModal type={showModal} onClose={() => setShowModal(null)} onSwitch={setShowModal} />}
    </>
  );
};

const AuthModal = ({ type, onClose, onSwitch }) => {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', phone: '' });
  const [resetForm, setResetForm] = useState({ email: '', code: '', newPassword: '' });
  const [otpForm, setOtpForm] = useState({ phone: '', code: '' });
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.username, form.password); toast.success('مرحباً!'); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'خطأ'); }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try { const r = await register(form); setSuccess(r.message); setForm({ username:'', password:'', name:'', email:'', phone:'' }); }
    catch (err) { setError(err.response?.data?.error || 'خطأ'); }
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetForm.email }) });
      setSuccess('تم إرسال الكود على بريدك'); setStep(2);
    } catch (err) { setError('خطأ'); }
    setLoading(false);
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/verify-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetForm.email, code: resetForm.code }) });
      const d = await r.json();
      if (r.ok) { setSuccess('تم التحقق'); setStep(3); }
      else setError(d.error);
    } catch (err) { setError('خطأ'); }
    setLoading(false);
  };

  const handleResetPass = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetForm.email, code: resetForm.code, newPassword: resetForm.newPassword }) });
      const d = await r.json();
      if (r.ok) { toast.success('تم تغيير كلمة المرور!'); onClose(); onSwitch('login'); }
      else setError(d.error);
    } catch (err) { setError('خطأ'); }
    setLoading(false);
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/login-phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpForm.phone }) });
      const d = await r.json();
      if (r.ok) { setSuccess(d.message); setStep(2); }
      else setError(d.error);
    } catch (err) { setError('خطأ'); }
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpForm.phone, code: otpForm.code }) });
      const d = await r.json();
      if (r.ok) {
        localStorage.setItem('token', d.token);
        toast.success('تم تسجيل الدخول بنجاح!');
        onClose();
        window.location.reload();
      }
      else setError(d.error);
    } catch (err) { setError('خطأ'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&#10005;</button>

        {type === 'login' && (
          <>
            <h3>تسجيل الدخول</h3>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group"><label>اسم المستخدم</label><input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
              <div className="form-group"><label>كلمة المرور</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              <button type="submit" className="btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'جاري...':'دخول'}</button>
            </form>
            <p className="switch-text"><button className="link-btn" onClick={() => {onSwitch('forgot'); setError(''); setSuccess(''); setStep(1);}}>نسيت كلمة المرور؟</button></p>
            <p className="switch-text"><button className="link-btn" onClick={() => {onSwitch('phone'); setError(''); setSuccess(''); setStep(1);}}>الدخول برقم الهاتف</button></p>
            <p className="switch-text">ليس لديك حساب؟ <button className="link-btn" onClick={() => {onSwitch('register'); setError('');}}>سجل الآن</button></p>
          </>
        )}

        {type === 'register' && (
          <>
            <h3>حساب جديد</h3>
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
            <form onSubmit={handleRegister}>
              <div className="form-group"><label>الاسم *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>اسم المستخدم *</label><input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
              <div className="form-group"><label>كلمة المرور *</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              <div className="form-group"><label>البريد الإلكتروني</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label>رقم الهاتف</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="77XXXXXXX" /></div>
              <button type="submit" className="btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'جاري...':'تسجيل'}</button>
            </form>
            <p className="switch-text">لديك حساب؟ <button className="link-btn" onClick={() => {onSwitch('login'); setError('');}}>دخول</button></p>
            <p className="note-text">حسابك في انتظار موافقة المدير</p>
          </>
        )}

        {type === 'forgot' && (
          <>
            <h3>نسيت كلمة المرور</h3>
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
            {step === 1 && (
              <form onSubmit={handleForgot}>
                <div className="form-group"><label>البريد الإلكتروني</label><input type="email" value={resetForm.email} onChange={e => setResetForm({...resetForm, email: e.target.value})} required placeholder="email@example.com" /></div>
                <button type="submit" className="btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'جاري...':'إرسال الكود'}</button>
              </form>
            )}
            {step === 2 && (
              <form onSubmit={handleVerifyReset}>
                <div className="form-group"><label>الكود المرسل على البريد</label><input type="text" value={resetForm.code} onChange={e => setResetForm({...resetForm, code: e.target.value})} required placeholder="123456" maxLength={6} /></div>
                <button type="submit" className="btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'جاري...':'تحقق'}</button>
              </form>
            )}
            {step === 3 && (
              <form onSubmit={handleResetPass}>
                <div className="form-group"><label>كلمة المرور الجديدة</label><input type="password" value={resetForm.newPassword} onChange={e => setResetForm({...resetForm, newPassword: e.target.value})} required minLength={6} /></div>
                <button type="submit" className="btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'جاري...':'تغيير كلمة المرور'}</button>
              </form>
            )}
            <p className="switch-text"><button className="link-btn" onClick={() => {onSwitch('login'); setError(''); setStep(1);}}>العودة لتسجيل الدخول</button></p>
          </>
        )}

        {type === 'phone' && (
          <>
            <h3>الدخول برقم الهاتف</h3>
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
            {step === 1 && (
              <form onSubmit={handlePhoneLogin}>
                <div className="form-group"><label>رقم الهاتف</label><input type="tel" value={otpForm.phone} onChange={e => setOtpForm({...otpForm, phone: e.target.value})} required placeholder="77XXXXXXX" /></div>
                <button type="submit" className="btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'جاري...':'إرسال الكود'}</button>
              </form>
            )}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <div className="form-group"><label>الكود المرسل</label><input type="text" value={otpForm.code} onChange={e => setOtpForm({...otpForm, code: e.target.value})} required placeholder="123456" maxLength={6} /></div>
                <button type="submit" className="btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'جاري...':'تحقق ودخول'}</button>
              </form>
            )}
            <p className="switch-text"><button className="link-btn" onClick={() => {onSwitch('login'); setError(''); setStep(1);}}>العودة لتسجيل الدخول</button></p>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;
