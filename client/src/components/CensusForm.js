import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const emptyFamily = {
  formNumber: '', familyNumber: '', visitDate: '', researcherName: '',
  governorate: '', directorate: '', isolation: '', village: '', neighborhood: '', street: '', houseNumber: '',
  headName: '', phone: '', currentFamilySize: 0, previousFamilySize: 0,
  maleCount: 0, femaleCount: 0, marriedCount: 0, deceasedCount: 0, migrantCount: 0,
  migrationDestination: '', residenceDate: '', previousResidence: '',
  previousGovernorate: '', previousDirectorate: '', previousIsolation: '', previousVillage: '',
  housingType: '', housingCondition: '', mainIncomeSource: '', otherIncomeSources: '',
  averageIncome: 0, financialStatus: '', notes: '',
};

const emptyMember = { seq: 1, name: '', gender: '', age: 0, relationship: '', parentName: '', maritalStatus: '', educationLevel: '', educationStatus: '', work: '', memberIncome: 0, healthStatus: '', chronicDisease: '', injury: '', disability: '', memberNotes: '' };
const emptyMigration = { migName: '', departureDate: '', migDestination: '', migReason: '', insideYemen: '', country: '', migNotes: '' };
const emptyDisease = { disName: '', chronicDisease: '', injuryType: '', disabilityType: '', injuryDate: '', needsTreatment: '', disNotes: '' };

const inputStyle = { width: '100%', padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' };
const labelStyle = { fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block', color: 'var(--gray-light)' };

export default function CensusForm({ onSave, onCancel, editData }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('family');
  const [saved, setSaved] = useState(!!editData);
  const [censusId, setCensusId] = useState(editData?._id || null);
  const [family, setFamily] = useState(editData || { ...emptyFamily });
  const [members, setMembers] = useState(editData?.members || []);
  const [housing, setHousing] = useState(editData?.housing || { type: '', ownership: '', moveDate: '', rooms: 0, electricity: '', water: '', sewage: '', internet: '', gas: '', housingNotes: '' });
  const [migration, setMigration] = useState(editData?.migration || []);
  const [diseases, setDiseases] = useState(editData?.diseases || []);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const saveFamily = async () => {
    if (!family.headName || !family.familyNumber) { toast.error('أدخل رقم الأسرة واسم رب الأسرة'); return; }
    if (!family.visitDate) { toast.error('أدخل تاريخ الزيارة'); return; }
    if (!family.governorate || !family.directorate) { toast.error('أدخل المحافظة والمديرية'); return; }
    if (!family.phone) { toast.error('أدخل رقم الهاتف'); return; }
    if (!family.currentFamilySize) { toast.error('أدخل عدد الأفراد الحالي'); return; }
    if (!family.housingType) { toast.error('اختر نوع السكن'); return; }
    if (!family.mainIncomeSource) { toast.error('أدخل مصدر الدخل الرئيسي'); return; }
    if (!family.averageIncome) { toast.error('أدخل متوسط الدخل'); return; }
    if (!family.financialStatus) { toast.error('اختر الحالة المادية'); return; }
    setSaving(true);
    try {
      if (censusId) {
        await axios.put(`/api/census/${censusId}`, family, { headers });
      } else {
        const res = await axios.post('/api/census', { ...family, members, housing, migration, diseases }, { headers });
        setCensusId(res.data._id);
      }
      setSaved(true);
      toast.success('تم حفظ بيانات الأسرة');
    } catch (err) { toast.error('خطأ في الحفظ'); }
    setSaving(false);
  };

  const saveMembers = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { members }, { headers });
      toast.success('تم حفظ أفراد الأسرة');
    } catch (err) { toast.error('خطأ في الحفظ'); }
    setSaving(false);
  };

  const saveHousing = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { housing }, { headers });
      toast.success('تم حفظ بيانات السكن');
    } catch (err) { toast.error('خطأ في الحفظ'); }
    setSaving(false);
  };

  const saveMigration = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { migration }, { headers });
      toast.success('تم حفظ بيانات الهجرة');
    } catch (err) { toast.error('خطأ في الحفظ'); }
    setSaving(false);
  };

  const saveDiseases = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { diseases }, { headers });
      toast.success('تم حفظ بيانات الأمراض');
    } catch (err) { toast.error('خطأ في الحفظ'); }
    setSaving(false);
  };

  const saveHandlers = { family: saveFamily, members: saveMembers, housing: saveHousing, migration: saveMigration, diseases: saveDiseases };

  const addMember = () => setMembers([...members, { ...emptyMember, seq: members.length + 1 }]);
  const updateMember = (i, key, val) => { const m = [...members]; m[i] = { ...m[i], [key]: val }; setMembers(m); };
  const removeMember = (i) => setMembers(members.filter((_, j) => j !== i));

  const addMigration = () => setMigration([...migration, { ...emptyMigration }]);
  const updateMigration = (i, key, val) => { const m = [...migration]; m[i] = { ...m[i], [key]: val }; setMigration(m); };
  const removeMigration = (i) => setMigration(migration.filter((_, j) => j !== i));

  const addDisease = () => setDiseases([...diseases, { ...emptyDisease }]);
  const updateDisease = (i, key, val) => { const d = [...diseases]; d[i] = { ...d[i], [key]: val }; setDiseases(d); };
  const removeDisease = (i) => setDiseases(diseases.filter((_, j) => j !== i));

  const fg = (label, content) => (
    <div className="form-group" style={{ marginBottom: '0.6rem' }}>
      <label style={labelStyle}>{label}</label>
      {content}
    </div>
  );

  const tabs = [
    { key: 'family', label: 'بيانات الأسرة', icon: '👨‍👩‍👧‍👦' },
    { key: 'members', label: 'أفراد الأسرة', icon: '👤', disabled: !saved },
    { key: 'housing', label: 'بيانات السكن', icon: '🏠', disabled: !saved },
    { key: 'migration', label: 'الهجرة', icon: '✈️', disabled: !saved },
    { key: 'diseases', label: 'الأمراض والإعاقات', icon: '🏥', disabled: !saved },
  ];

  return (
    <div style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(99,102,241,0.15)', paddingBottom: '0.8rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => !t.disabled && setTab(t.key)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid', borderColor: tab === t.key ? 'var(--primary)' : 'rgba(99,102,241,0.2)', background: tab === t.key ? 'rgba(99,102,241,0.2)' : 'transparent', color: t.disabled ? 'var(--gray)' : tab === t.key ? 'var(--primary-light)' : 'var(--gray-light)', cursor: t.disabled ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', fontWeight: '600', transition: 'all 0.2s', opacity: t.disabled ? 0.5 : 1 }}>
            {t.icon} {t.label} {t.disabled && !t.disabled ? '🔒' : ''}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {tab === 'family' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            {fg('رقم الاستمارة', <input style={inputStyle} value={family.formNumber} onChange={e => setFamily({ ...family, formNumber: e.target.value })} />)}
            {fg('رقم الأسرة *', <input style={inputStyle} value={family.familyNumber} onChange={e => setFamily({ ...family, familyNumber: e.target.value })} />)}
            {fg('تاريخ الزيارة *', <input type="date" style={inputStyle} value={family.visitDate} onChange={e => setFamily({ ...family, visitDate: e.target.value })} />)}
            {fg('اسم الباحث', <input style={inputStyle} value={family.researcherName} onChange={e => setFamily({ ...family, researcherName: e.target.value })} />)}
            {fg('المحافظة *', <input style={inputStyle} value={family.governorate} onChange={e => setFamily({ ...family, governorate: e.target.value })} />)}
            {fg('المديرية *', <input style={inputStyle} value={family.directorate} onChange={e => setFamily({ ...family, directorate: e.target.value })} />)}
            {fg('العزلة', <input style={inputStyle} value={family.isolation} onChange={e => setFamily({ ...family, isolation: e.target.value })} />)}
            {fg('القرية', <input style={inputStyle} value={family.village} onChange={e => setFamily({ ...family, village: e.target.value })} />)}
            {fg('الحي', <input style={inputStyle} value={family.neighborhood} onChange={e => setFamily({ ...family, neighborhood: e.target.value })} />)}
            {fg('الشارع', <input style={inputStyle} value={family.street} onChange={e => setFamily({ ...family, street: e.target.value })} />)}
            {fg('رقم المنزل', <input style={inputStyle} value={family.houseNumber} onChange={e => setFamily({ ...family, houseNumber: e.target.value })} />)}
            {fg('اسم رب الأسرة *', <input style={inputStyle} value={family.headName} onChange={e => setFamily({ ...family, headName: e.target.value })} />)}
            {fg('الهاتف *', <input type="tel" style={inputStyle} value={family.phone} onChange={e => setFamily({ ...family, phone: e.target.value })} />)}
            {fg('عدد الأسرة الحالي *', <input type="number" style={inputStyle} value={family.currentFamilySize} onChange={e => setFamily({ ...family, currentFamilySize: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد الأسرة السابق', <input type="number" style={inputStyle} value={family.previousFamilySize} onChange={e => setFamily({ ...family, previousFamilySize: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد الذكور *', <input type="number" style={inputStyle} value={family.maleCount} onChange={e => setFamily({ ...family, maleCount: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد الإناث *', <input type="number" style={inputStyle} value={family.femaleCount} onChange={e => setFamily({ ...family, femaleCount: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد المتزوجين', <input type="number" style={inputStyle} value={family.marriedCount} onChange={e => setFamily({ ...family, marriedCount: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد المتوفين', <input type="number" style={inputStyle} value={family.deceasedCount} onChange={e => setFamily({ ...family, deceasedCount: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد المهاجرين', <input type="number" style={inputStyle} value={family.migrantCount} onChange={e => setFamily({ ...family, migrantCount: parseInt(e.target.value) || 0 })} />)}
            {fg('جهة الهجرة', <input style={inputStyle} value={family.migrationDestination} onChange={e => setFamily({ ...family, migrationDestination: e.target.value })} />)}
            {fg('تاريخ السكن', <input style={inputStyle} value={family.residenceDate} onChange={e => setFamily({ ...family, residenceDate: e.target.value })} />)}
            {fg('مكان السكن السابق', <input style={inputStyle} value={family.previousResidence} onChange={e => setFamily({ ...family, previousResidence: e.target.value })} />)}
            {fg('المحافظة السابقة', <input style={inputStyle} value={family.previousGovernorate} onChange={e => setFamily({ ...family, previousGovernorate: e.target.value })} />)}
            {fg('المديرية السابقة', <input style={inputStyle} value={family.previousDirectorate} onChange={e => setFamily({ ...family, previousDirectorate: e.target.value })} />)}
            {fg('العزلة السابقة', <input style={inputStyle} value={family.previousIsolation} onChange={e => setFamily({ ...family, previousIsolation: e.target.value })} />)}
            {fg('القرية السابقة', <input style={inputStyle} value={family.previousVillage} onChange={e => setFamily({ ...family, previousVillage: e.target.value })} />)}
            {fg('نوع السكن *', <select style={inputStyle} value={family.housingType} onChange={e => setFamily({ ...family, housingType: e.target.value })}>
              <option value="">اختر</option>{['فيلا', 'شقة', 'غرفة', 'كوخ', 'مخيم', 'أخرى'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('حالة السكن', <select style={inputStyle} value={family.housingCondition} onChange={e => setFamily({ ...family, housingCondition: e.target.value })}>
              <option value="">اختر</option>{['جيد', 'متوسط', 'سيئ', 'مدمر'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('مصدر الدخل الرئيسي *', <input style={inputStyle} value={family.mainIncomeSource} onChange={e => setFamily({ ...family, mainIncomeSource: e.target.value })} />)}
            {fg('مصادر دخل أخرى', <input style={inputStyle} value={family.otherIncomeSources} onChange={e => setFamily({ ...family, otherIncomeSources: e.target.value })} />)}
            {fg('متوسط الدخل (ر.ي) *', <input type="number" style={inputStyle} value={family.averageIncome} onChange={e => setFamily({ ...family, averageIncome: parseInt(e.target.value) || 0 })} />)}
            {fg('الحالة المادية *', <select style={inputStyle} value={family.financialStatus} onChange={e => setFamily({ ...family, financialStatus: e.target.value })}>
              <option value="">اختر</option>{['جيد', 'متوسط', 'ضعيف', 'سيئ جداً'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              {fg('ملاحظات', <textarea style={{ ...inputStyle, minHeight: '60px' }} value={family.notes} onChange={e => setFamily({ ...family, notes: e.target.value })} />)}
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h4 style={{ margin: 0 }}>أفراد الأسرة ({members.length})</h4>
              <button className="btn-export" onClick={addMember} style={{ fontSize: '0.8rem' }}>+ إضافة فرد</button>
            </div>
            {members.map((m, i) => (
              <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>الفرد #{i + 1}</strong>
                  <button className="btn-reject" onClick={() => removeMember(i)} style={{ fontSize: '0.7rem' }}>✕ حذف</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group"><label style={labelStyle}>الاسم *</label><input style={inputStyle} value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} /></div>
                  <div className="form-group"><label style={labelStyle}>الجنس *</label><select style={inputStyle} value={m.gender} onChange={e => updateMember(i, 'gender', e.target.value)}>
                    <option value="">اختر</option><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option>
                  </select></div>
                  <div className="form-group"><label style={labelStyle}>العمر *</label><input type="number" style={inputStyle} value={m.age} onChange={e => updateMember(i, 'age', parseInt(e.target.value) || 0)} /></div>
                  <div className="form-group"><label style={labelStyle}>صلة القرابة *</label><input style={inputStyle} value={m.relationship} onChange={e => updateMember(i, 'relationship', e.target.value)} placeholder="ابن / زوجة..." /></div>
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
            {members.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا يوجد أفراد مسجلين. اضغط "إضافة فرد" للبدء.</p>}
          </div>
        )}

        {tab === 'housing' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            {fg('نوع السكن', <select style={inputStyle} value={housing.type} onChange={e => setHousing({ ...housing, type: e.target.value })}>
              <option value="">اختر</option>{['فيلا', 'شقة', 'غرفة', 'كوخ', 'مخيم', 'أخرى'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('ملكية / إيجار', <select style={inputStyle} value={housing.ownership} onChange={e => setHousing({ ...housing, ownership: e.target.value })}>
              <option value="">اختر</option>{['ملك', 'إيجار', 'استئجار', 'مجاني'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('تاريخ السكن', <input style={inputStyle} value={housing.moveDate} onChange={e => setHousing({ ...housing, moveDate: e.target.value })} />)}
            {fg('عدد الغرف', <input type="number" style={inputStyle} value={housing.rooms} onChange={e => setHousing({ ...housing, rooms: parseInt(e.target.value) || 0 })} />)}
            {fg('الكهرباء', <select style={inputStyle} value={housing.electricity} onChange={e => setHousing({ ...housing, electricity: e.target.value })}>
              <option value="">اختر</option>{['نعم', 'لا', 'شامل'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('المياه', <select style={inputStyle} value={housing.water} onChange={e => setHousing({ ...housing, water: e.target.value })}>
              <option value="">اختر</option>{['نعم', 'لا', 'شامل'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('الصرف الصحي', <select style={inputStyle} value={housing.sewage} onChange={e => setHousing({ ...housing, sewage: e.target.value })}>
              <option value="">اختر</option>{['نعم', 'لا', 'شامل'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('الإنترنت', <select style={inputStyle} value={housing.internet} onChange={e => setHousing({ ...housing, internet: e.target.value })}>
              <option value="">اختر</option>{['نعم', 'لا'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            {fg('الغاز', <select style={inputStyle} value={housing.gas} onChange={e => setHousing({ ...housing, gas: e.target.value })}>
              <option value="">اختر</option>{['نعم', 'لا'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>)}
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              {fg('ملاحظات السكن', <textarea style={{ ...inputStyle, minHeight: '60px' }} value={housing.housingNotes} onChange={e => setHousing({ ...housing, housingNotes: e.target.value })} />)}
            </div>
          </div>
        )}

        {tab === 'migration' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h4 style={{ margin: 0 }}>سجلات الهجرة ({migration.length})</h4>
              <button className="btn-export" onClick={addMigration} style={{ fontSize: '0.8rem' }}>+ إضافة سجل</button>
            </div>
            {migration.map((m, i) => (
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
            {migration.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا توجد سجلات هجرة.</p>}
          </div>
        )}

        {tab === 'diseases' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h4 style={{ margin: 0 }}>الأمراض والإعاقات ({diseases.length})</h4>
              <button className="btn-export" onClick={addDisease} style={{ fontSize: '0.8rem' }}>+ إضافة سجل</button>
            </div>
            {diseases.map((d, i) => (
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
            {diseases.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا توجد سجلات أمراض.</p>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(99,102,241,0.15)', paddingTop: '1rem' }}>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveHandlers[tab]} disabled={saving}>
          {saving ? 'جاري الحفظ...' : `حفظ ${tabs.find(t => t.key === tab)?.label || ''}`}
        </button>
        {saved && (
          <button className="btn-export" style={{ flex: 1, justifyContent: 'center' }} onClick={onSave}>تم واغلاق</button>
        )}
        <button className="btn-export" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );
}
