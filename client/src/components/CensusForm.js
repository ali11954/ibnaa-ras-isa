import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const emptyForm = {
  formNumber: '', familyNumber: '', visitDate: '', researcherName: '',
  governorate: '', directorate: '', isolation: '', village: '', neighborhood: '', street: '', houseNumber: '',
  headName: '', phone: '', currentFamilySize: 0, previousFamilySize: 0,
  maleCount: 0, femaleCount: 0, marriedCount: 0, deceasedCount: 0, migrantCount: 0,
  migrationDestination: '', residenceDate: '', previousResidence: '',
  previousGovernorate: '', previousDirectorate: '', previousIsolation: '', previousVillage: '',
  housingType: '', housingCondition: '', mainIncomeSource: '', otherIncomeSources: '',
  averageIncome: 0, financialStatus: '', notes: '',
  members: [],
  housing: { type: '', ownership: '', moveDate: '', rooms: 0, electricity: '', water: '', sewage: '', internet: '', gas: '', housingNotes: '' },
  migration: [],
  diseases: [],
};

const emptyMember = { seq: 0, name: '', gender: '', age: 0, relationship: '', parentName: '', maritalStatus: '', educationLevel: '', educationStatus: '', work: '', memberIncome: 0, healthStatus: '', chronicDisease: '', injury: '', disability: '', memberNotes: '' };
const emptyMigration = { migName: '', departureDate: '', migDestination: '', migReason: '', insideYemen: '', country: '', migNotes: '' };
const emptyDisease = { disName: '', chronicDisease: '', injuryType: '', disabilityType: '', injuryDate: '', needsTreatment: '', disNotes: '' };

export default function CensusForm({ onSave, onCancel, editData }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('family');
  const [form, setForm] = useState(editData || { ...emptyForm });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setHousing = (key, val) => setForm(prev => ({ ...prev, housing: { ...prev.housing, [key]: val } }));

  const addMember = () => set('members', [...form.members, { ...emptyMember, seq: form.members.length + 1 }]);
  const updateMember = (i, key, val) => {
    const m = [...form.members]; m[i] = { ...m[i], [key]: val }; set('members', m);
  };
  const removeMember = (i) => set('members', form.members.filter((_, j) => j !== i));

  const addMigration = () => set('migration', [...form.migration, { ...emptyMigration }]);
  const updateMigration = (i, key, val) => {
    const m = [...form.migration]; m[i] = { ...m[i], [key]: val }; set('migration', m);
  };
  const removeMigration = (i) => set('migration', form.migration.filter((_, j) => j !== i));

  const addDisease = () => set('diseases', [...form.diseases, { ...emptyDisease }]);
  const updateDisease = (i, key, val) => {
    const d = [...form.diseases]; d[i] = { ...d[i], [key]: val }; set('diseases', d);
  };
  const removeDisease = (i) => set('diseases', form.diseases.filter((_, j) => j !== i));

  const handleSave = async () => {
    if (!form.headName || !form.familyNumber) { toast.error('أدخل رقم الأسرة واسم رب الأسرة'); return; }
    try {
      if (editData) {
        await axios.put(`/api/census/${editData._id}`, form, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('تم التعديل');
      } else {
        await axios.post('/api/census', form, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('تمت الإضافة');
      }
      onSave();
    } catch (err) { toast.error('خطأ في الحفظ'); }
  };

  const tabs = [
    { key: 'family', label: 'بيانات الأسرة', icon: '👨‍👩‍👧‍👦' },
    { key: 'members', label: 'أفراد الأسرة', icon: '👤' },
    { key: 'housing', label: 'بيانات السكن', icon: '🏠' },
    { key: 'migration', label: 'الهجرة', icon: '✈️' },
    { key: 'diseases', label: 'الأمراض والإعاقات', icon: '🏥' },
  ];

  const inputStyle = { width: '100%', padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block', color: 'var(--gray-light)' };
  const fieldGroup = (label, content) => (
    <div className="form-group" style={{ marginBottom: '0.6rem' }}>
      <label style={labelStyle}>{label}</label>
      {content}
    </div>
  );

  return (
    <div style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(99,102,241,0.15)', paddingBottom: '0.8rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid', borderColor: tab === t.key ? 'var(--primary)' : 'rgba(99,102,241,0.2)', background: tab === t.key ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t.key ? 'var(--primary-light)' : 'var(--gray-light)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', fontWeight: '600', transition: 'all 0.2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {tab === 'family' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            {fieldGroup('رقم الاستمارة', <input style={inputStyle} value={form.formNumber} onChange={e => set('formNumber', e.target.value)} />)}
            {fieldGroup('رقم الأسرة *', <input style={inputStyle} value={form.familyNumber} onChange={e => set('familyNumber', e.target.value)} />)}
            {fieldGroup('تاريخ الزيارة', <input type="date" style={inputStyle} value={form.visitDate} onChange={e => set('visitDate', e.target.value)} />)}
            {fieldGroup('اسم الباحث', <input style={inputStyle} value={form.researcherName} onChange={e => set('researcherName', e.target.value)} />)}
            {fieldGroup('المحافظة', <input style={inputStyle} value={form.governorate} onChange={e => set('governorate', e.target.value)} />)}
            {fieldGroup('المديرية', <input style={inputStyle} value={form.directorate} onChange={e => set('directorate', e.target.value)} />)}
            {fieldGroup('العزلة', <input style={inputStyle} value={form.isolation} onChange={e => set('isolation', e.target.value)} />)}
            {fieldGroup('القرية', <input style={inputStyle} value={form.village} onChange={e => set('village', e.target.value)} />)}
            {fieldGroup('الحي', <input style={inputStyle} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />)}
            {fieldGroup('الشارع', <input style={inputStyle} value={form.street} onChange={e => set('street', e.target.value)} />)}
            {fieldGroup('رقم المنزل', <input style={inputStyle} value={form.houseNumber} onChange={e => set('houseNumber', e.target.value)} />)}
            {fieldGroup('اسم رب الأسرة *', <input style={inputStyle} value={form.headName} onChange={e => set('headName', e.target.value)} />)}
            {fieldGroup('الهاتف', <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />)}
            {fieldGroup('عدد الأسرة الحالي', <input type="number" style={inputStyle} value={form.currentFamilySize} onChange={e => set('currentFamilySize', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('عدد الأسرة السابق', <input type="number" style={inputStyle} value={form.previousFamilySize} onChange={e => set('previousFamilySize', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('عدد الذكور', <input type="number" style={inputStyle} value={form.maleCount} onChange={e => set('maleCount', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('عدد الإناث', <input type="number" style={inputStyle} value={form.femaleCount} onChange={e => set('femaleCount', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('عدد المتزوجين', <input type="number" style={inputStyle} value={form.marriedCount} onChange={e => set('marriedCount', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('عدد المتوفين', <input type="number" style={inputStyle} value={form.deceasedCount} onChange={e => set('deceasedCount', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('عدد المهاجرين', <input type="number" style={inputStyle} value={form.migrantCount} onChange={e => set('migrantCount', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('جهة الهجرة', <input style={inputStyle} value={form.migrationDestination} onChange={e => set('migrationDestination', e.target.value)} />)}
            {fieldGroup('تاريخ السكن', <input style={inputStyle} value={form.residenceDate} onChange={e => set('residenceDate', e.target.value)} />)}
            {fieldGroup('مكان السكن السابق', <input style={inputStyle} value={form.previousResidence} onChange={e => set('previousResidence', e.target.value)} />)}
            {fieldGroup('المحافظة السابقة', <input style={inputStyle} value={form.previousGovernorate} onChange={e => set('previousGovernorate', e.target.value)} />)}
            {fieldGroup('المديرية السابقة', <input style={inputStyle} value={form.previousDirectorate} onChange={e => set('previousDirectorate', e.target.value)} />)}
            {fieldGroup('العزلة السابقة', <input style={inputStyle} value={form.previousIsolation} onChange={e => set('previousIsolation', e.target.value)} />)}
            {fieldGroup('القرية السابقة', <input style={inputStyle} value={form.previousVillage} onChange={e => set('previousVillage', e.target.value)} />)}
            {fieldGroup('نوع السكن', <select style={inputStyle} value={form.housingType} onChange={e => set('housingType', e.target.value)}>
              <option value="">اختر</option>
              {['فيلا', 'شقة', 'غرفة', 'كوخ', 'مخيم', 'أخرى'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('حالة السكن', <select style={inputStyle} value={form.housingCondition} onChange={e => set('housingCondition', e.target.value)}>
              <option value="">اختر</option>
              {['جيد', 'متوسط', 'سيئ', 'مدمر'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('مصدر الدخل الرئيسي', <input style={inputStyle} value={form.mainIncomeSource} onChange={e => set('mainIncomeSource', e.target.value)} />)}
            {fieldGroup('مصادر دخل أخرى', <input style={inputStyle} value={form.otherIncomeSources} onChange={e => set('otherIncomeSources', e.target.value)} />)}
            {fieldGroup('متوسط الدخل (ر.ي)', <input type="number" style={inputStyle} value={form.averageIncome} onChange={e => set('averageIncome', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('الحالة المادية', <select style={inputStyle} value={form.financialStatus} onChange={e => set('financialStatus', e.target.value)}>
              <option value="">اختر</option>
              {['جيد', 'متوسط', 'ضعيف', 'سيئ جداً'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              {fieldGroup('ملاحظات', <textarea style={{ ...inputStyle, minHeight: '60px' }} value={form.notes} onChange={e => set('notes', e.target.value)} />)}
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h4 style={{ margin: 0 }}>أفراد الأسرة ({form.members.length})</h4>
              <button className="btn-export" onClick={addMember} style={{ fontSize: '0.8rem' }}>+ إضافة فرد</button>
            </div>
            {form.members.map((m, i) => (
              <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>الفرد #{i + 1}</strong>
                  <button className="btn-reject" onClick={() => removeMember(i)} style={{ fontSize: '0.7rem' }}>✕ حذف</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group"><label style={labelStyle}>الاسم</label><input style={inputStyle} value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>الجنس</label><select style={inputStyle} value={m.gender} onChange={e => updateMember(i, 'gender', e.target.value)}>
                    <option value="">اختر</option><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option>
                  </select></div>
                  <div className="form-group"><label style={labelStyle}>العمر</label><input type="number" style={inputStyle} value={m.age} onChange={e => updateMember(i, 'age', parseInt(e.target.value) || 0)} /></div>
                  <div className="form-group"><label style={labelStyle}>صلة القرابة</label><input style={inputStyle} value={m.relationship} onChange={e => updateMember(i, 'relationship', e.target.value)} placeholder="ابن / زوجة..." /></div>
                  <div className="form-group"><label style={labelStyle}>اسم الأب/الأم</label><input style={inputStyle} value={m.parentName} onChange={e => updateMember(i, 'parentName', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>الحالة الاجتماعية</label><select style={inputStyle} value={m.maritalStatus} onChange={e => updateMember(i, 'maritalStatus', e.target.value)}>
                    <option value="">اختر</option><option value="أعزب">أعزب</option><option value="متزوج">متزوج</option><option value="مطلق">مطلق</option><option value="أرمل">أرمل</option>
                  </select></div>
                  <div className="form-group"><label style={labelStyle}>المستوى التعليمي</label><select style={inputStyle} value={m.educationLevel} onChange={e => updateMember(i, 'educationLevel', e.target.value)}>
                    <option value="">اختر</option><option value="أمي">أمي</option><option value="ابتدائي">ابتدائي</option><option value="متوسط">متوسط</option><option value="ثانوي">ثانوي</option><option value="جامعي">جامعي</option><option value="دراسات عليا">دراسات عليا</option>
                  </select></div>
                  <div className="form-group"><label style={labelStyle}>الحالة التعليمية</label><input style={inputStyle} value={m.educationStatus} onChange={e => updateMember(i, 'educationStatus', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>العمل</label><input style={inputStyle} value={m.work} onChange={e => updateMember(i, 'work', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>متوسط الدخل</label><input type="number" style={inputStyle} value={m.memberIncome} onChange={e => updateMember(i, 'memberIncome', parseInt(e.target.value) || 0)} /></div>
                  <div className="form-group"><label style={labelStyle}>الحالة الصحية</label><select style={inputStyle} value={m.healthStatus} onChange={e => updateMember(i, 'healthStatus', e.target.value)}>
                    <option value="">اختر</option><option value="سليم">سليم</option><option value="مريض">مريض</option><option value="إعاقة">إعاقة</option>
                  </select></div>
                  <div className="form-group"><label style={labelStyle}>مرض مزمن</label><input style={inputStyle} value={m.chronicDisease} onChange={e => updateMember(i, 'chronicDisease', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>إصابة</label><input style={inputStyle} value={m.injury} onChange={e => updateMember(i, 'injury', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>إعاقة</label><input style={inputStyle} value={m.disability} onChange={e => updateMember(i, 'disability', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>ملاحظات</label><input style={inputStyle} value={m.memberNotes} onChange={e => updateMember(i, 'memberNotes', e.target.value)} /></div>
                </div>
              </div>
            ))}
            {form.members.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا يوجد أفراد مسجلين. اضغط "إضافة فرد" للبدء.</p>}
          </div>
        )}

        {tab === 'housing' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            {fieldGroup('نوع السكن', <select style={inputStyle} value={form.housing.type} onChange={e => setHousing('type', e.target.value)}>
              <option value="">اختر</option>{['فيلا', 'شقة', 'غرفة', 'كوخ', 'مخيم', 'أخرى'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('ملكية / إيجار', <select style={inputStyle} value={form.housing.ownership} onChange={e => setHousing('ownership', e.target.value)}>
              <option value="">اختر</option>{['ملك', 'إيجار', 'استئجار', 'مجاني'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('تاريخ السكن', <input style={inputStyle} value={form.housing.moveDate} onChange={e => setHousing('moveDate', e.target.value)} />)}
            {fieldGroup('عدد الغرف', <input type="number" style={inputStyle} value={form.housing.rooms} onChange={e => setHousing('rooms', parseInt(e.target.value) || 0)} />)}
            {fieldGroup('الكهرباء', <select style={inputStyle} value={form.housing.electricity} onChange={e => setHousing('electricity', e.target.value)}>
              <option value="">اختر</option>{['نعم', 'لا', 'شامل'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('المياه', <select style={inputStyle} value={form.housing.water} onChange={e => setHousing('water', e.target.value)}>
              <option value="">اختر</option>{['نعم', 'لا', 'شامل'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('الصرف الصحي', <select style={inputStyle} value={form.housing.sewage} onChange={e => setHousing('sewage', e.target.value)}>
              <option value="">اختر</option>{['نعم', 'لا', 'شامل'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('الإنترنت', <select style={inputStyle} value={form.housing.internet} onChange={e => setHousing('internet', e.target.value)}>
              <option value="">اختر</option>{['نعم', 'لا'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fieldGroup('الغاز', <select style={inputStyle} value={form.housing.gas} onChange={e => setHousing('gas', e.target.value)}>
              <option value="">اختر</option>{['نعم', 'لا'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              {fieldGroup('ملاحظات السكن', <textarea style={{ ...inputStyle, minHeight: '60px' }} value={form.housing.housingNotes} onChange={e => setHousing('housingNotes', e.target.value)} />)}
            </div>
          </div>
        )}

        {tab === 'migration' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h4 style={{ margin: 0 }}>سجلات الهجرة ({form.migration.length})</h4>
              <button className="btn-export" onClick={addMigration} style={{ fontSize: '0.8rem' }}>+ إضافة سجل</button>
            </div>
            {form.migration.map((m, i) => (
              <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>سجل #{i + 1}</strong>
                  <button className="btn-reject" onClick={() => removeMigration(i)} style={{ fontSize: '0.7rem' }}>✕ حذف</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group"><label style={labelStyle}>الاسم</label><input style={inputStyle} value={m.migName} onChange={e => updateMigration(i, 'migName', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>تاريخ المغادرة</label><input style={inputStyle} value={m.departureDate} onChange={e => updateMigration(i, 'departureDate', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>جهة الهجرة</label><input style={inputStyle} value={m.migDestination} onChange={e => updateMigration(i, 'migDestination', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>سبب الهجرة</label><input style={inputStyle} value={m.migReason} onChange={e => updateMigration(i, 'migReason', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>داخل/خارج اليمن</label><select style={inputStyle} value={m.insideYemen} onChange={e => updateMigration(i, 'insideYemen', e.target.value)}>
                    <option value="">اختر</option><option value="داخل اليمن">داخل اليمن</option><option value="خارج اليمن">خارج اليمن</option>
                  </select></div>
                  <div className="form-group"><label style={labelStyle}>الدولة/المحافظة</label><input style={inputStyle} value={m.country} onChange={e => updateMigration(i, 'country', e.target.value)} /></div>
                </div>
              </div>
            ))}
            {form.migration.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا توجد سجلات هجرة.</p>}
          </div>
        )}

        {tab === 'diseases' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h4 style={{ margin: 0 }}>الأمراض والإعاقات ({form.diseases.length})</h4>
              <button className="btn-export" onClick={addDisease} style={{ fontSize: '0.8rem' }}>+ إضافة سجل</button>
            </div>
            {form.diseases.map((d, i) => (
              <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>سجل #{i + 1}</strong>
                  <button className="btn-reject" onClick={() => removeDisease(i)} style={{ fontSize: '0.7rem' }}>✕ حذف</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group"><label style={labelStyle}>الاسم</label><input style={inputStyle} value={d.disName} onChange={e => updateDisease(i, 'disName', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>مرض مزمن</label><input style={inputStyle} value={d.chronicDisease} onChange={e => updateDisease(i, 'chronicDisease', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>نوع الإصابة</label><input style={inputStyle} value={d.injuryType} onChange={e => updateDisease(i, 'injuryType', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>نوع الإعاقة</label><input style={inputStyle} value={d.disabilityType} onChange={e => updateDisease(i, 'disabilityType', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>تاريخ الإصابة</label><input style={inputStyle} value={d.injuryDate} onChange={e => updateDisease(i, 'injuryDate', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>يحتاج علاج</label><select style={inputStyle} value={d.needsTreatment} onChange={e => updateDisease(i, 'needsTreatment', e.target.value)}>
                    <option value="">اختر</option><option value="نعم">نعم</option><option value="لا">لا</option>
                  </select></div>
                </div>
              </div>
            ))}
            {form.diseases.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا توجد سجلات أمراض.</p>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(99,102,241,0.15)', paddingTop: '1rem' }}>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave}>{editData ? 'حفظ التعديلات' : 'حفظ الاستمارة'}</button>
        <button className="btn-export" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );
}
