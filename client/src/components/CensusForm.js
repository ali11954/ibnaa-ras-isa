import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const emptyFamily = {
  formNumber: '', familyNumber: '',
  visitDate: new Date().toISOString().split('T')[0],
  governorate: '', directorate: '', isolation: '', village: '', neighborhood: '', street: '', houseNumber: '',
  headName: '', birthDate: '', nationalId: '', idType: '', phone: '', currentFamilySize: 0,
  maleCount: 0, femaleCount: 0, marriedCount: 0, deceasedCount: 0,
  residenceDate: '',
  mainIncomeSource: '', otherIncomeSources: '',
  averageIncome: 0, financialStatus: '', notes: '',
};

const emptyMember = { seq: 1, name: '', gender: '', age: 0, birthDate: '', nationalId: '', idType: '', relationship: '', parentName: '', maritalStatus: '', familyStatus: 'يعيش مع العائلة', newFamilyNumber: '', spouseName: '', spouseFrom: 'خارج راس عيسى', spouseVillage: '', spouseSearch: '', spouseFamilyNumber: '', educationLevel: '', educationStatus: '', work: '', memberIncome: 0, healthStatus: '', chronicDisease: '', injury: '', disability: '', memberNotes: '' };
const emptyMigration = { migName: '', departureDate: '', migDestination: '', migReason: '', insideYemen: '', country: '', migNotes: '' };
const emptyDisease = { disName: '', chronicDisease: '', injuryType: '', disabilityType: '', injuryDate: '', needsTreatment: '', disNotes: '' };

const inputStyle = { width: '100%', padding: '0.5rem 0.8rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.85rem' };
const readOnlyStyle = { ...inputStyle, background: 'rgba(99,102,241,0.1)', cursor: 'not-allowed' };
const labelStyle = { fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block', color: 'var(--gray-light)' };

const LIST_KEYS = {
  governorate: 'المحافظة',
  directorate: 'المديرية',
  isolation: 'العزلة',
  village: 'القرية',
  neighborhood: 'الحي',
  mainIncomeSource: 'مصدر الدخل',
  financialStatus: 'الحالة المادية',
  housingType: 'نوع السكن',
  housingCondition: 'حالة السكن',
  relationship: 'صلة القرابة',
  maritalStatus: 'الحالة الاجتماعية',
  educationLevel: 'المستوى التعليمي',
  healthStatus: 'الحالة الصحية',
  educationStatus: 'الحالة التعليمية',
  otherIncomeSources: 'مصادر دخل أخرى',
  idType: 'نوع الهوية',
  spouseFrom: 'مصدر الزواج',
};

const DROPDOWN_FIELDS = ['governorate', 'directorate', 'isolation', 'village', 'neighborhood', 'mainIncomeSource', 'otherIncomeSources', 'financialStatus', 'housingType', 'housingCondition'];

const MEMBER_DROPDOWN_FIELDS = ['relationship', 'maritalStatus', 'educationLevel', 'educationStatus', 'healthStatus'];

export default function CensusForm({ onSave, onCancel, editData }) {
  const { token, isAdmin } = useAuth();
  const [tab, setTab] = useState('family');
  const [saved, setSaved] = useState(!!editData);
  const [censusId, setCensusId] = useState(editData?._id || null);
  const [family, setFamily] = useState({
    ...emptyFamily,
    ...editData,
    visitDate: editData?.visitDate || new Date().toISOString().split('T')[0],
  });
  const [members, setMembers] = useState(editData?.members || []);
  const [housing, setHousing] = useState(() => {
    const defaults = { housingType: '', ownership: '', moveDate: '', rooms: 0, electricity: '', water: '', sewage: '', internet: '', gas: '', housingNotes: '' };
    if (editData?.housing) return { ...defaults, ...editData.housing };
    return defaults;
  });
  const [migration, setMigration] = useState(editData?.migration || []);
  const [diseases, setDiseases] = useState(editData?.diseases || []);
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState({});
  const [newOption, setNewOption] = useState({});
  const [censusFamilies, setCensusFamilies] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get('/api/census-lists', { headers }).then(res => {
      const map = {};
      res.data.forEach(l => { map[l.key] = l.options || []; });
      setLists(map);
    }).catch(() => {});
    axios.get('/api/census?limit=9999', { headers }).then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setCensusFamilies(data);
    }).catch(() => {});
  }, [token]);

  const addOptionToList = async (key, value) => {
    if (!value || !value.trim()) return;
    try {
      await axios.post(`/api/census-lists/${key}/options`, { option: value.trim() }, { headers });
      setLists(prev => ({
        ...prev,
        [key]: prev[key] ? (prev[key].includes(value.trim()) ? prev[key] : [...prev[key], value.trim()]) : [value.trim()],
      }));
      setNewOption(prev => ({ ...prev, [key]: '' }));
      toast.success(`تمت إضافة "${value.trim()}"`);
    } catch (err) {
      toast.error('خطأ في الإضافة');
    }
  };

  const renderDropdown = (label, fieldKey, value, onChange, isMember = false) => {
    const options = lists[fieldKey] || [];
    return (
      <div className="form-group" style={{ marginBottom: '0.6rem' }}>
        <label style={labelStyle}>{label}</label>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <select style={{ ...inputStyle, flex: 1 }} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">اختر...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem' }}>
            <input
              type="text"
              placeholder={`إضافة ${label}...`}
              value={newOption[fieldKey] || ''}
              onChange={e => setNewOption(prev => ({ ...prev, [fieldKey]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOptionToList(fieldKey, newOption[fieldKey]); } }}
              style={{ ...inputStyle, flex: 1, fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
            />
            <button type="button" onClick={() => addOptionToList(fieldKey, newOption[fieldKey])}
              style={{ padding: '0.3rem 0.6rem', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>+</button>
          </div>
        )}
      </div>
    );
  };

  const saveFamily = async () => {
    if (!family.headName) { toast.error('أدخل اسم رب الأسرة'); return; }
    if (!family.governorate) { toast.error('اختر المحافظة'); return; }
    if (!family.phone) { toast.error('أدخل رقم الهاتف'); return; }
    if (!family.currentFamilySize) { toast.error('أدخل عدد الأفراد الحالي'); return; }
    if (!family.mainIncomeSource) { toast.error('اختر مصدر الدخل الرئيسي'); return; }
    if (!family.averageIncome) { toast.error('أدخل متوسط الدخل'); return; }
    if (!family.financialStatus) { toast.error('اختر الحالة المادية'); return; }
    setSaving(true);
    try {
      if (censusId) {
        const hasHousing = housing && Object.values(housing).some(v => v && v !== '' && v !== 0);
        await axios.put(`/api/census/${censusId}`, { ...family, ...(hasHousing ? { housing } : {}) }, { headers });
      } else {
        const res = await axios.post('/api/census', { ...family, members, housing, migration, diseases }, { headers });
        setCensusId(res.data._id);
      }
      setSaved(true);
      toast.success('تم حفظ بيانات الأسرة');
    } catch (err) {
      console.error('Census save error:', err);
      toast.error('خطأ في الحفظ: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  const saveMembers = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { members }, { headers });
      const marriedOut = members.filter(m => m.familyStatus === 'متزوج ومستقل');
      let created = 0;
      for (const m of marriedOut) {
        if (!m.name || !m.spouseName) continue;
        try {
          const newFamily = {
            headName: m.name,
            birthDate: m.birthDate || '',
            nationalId: m.nationalId || '',
            idType: m.idType || '',
            phone: '',
            currentFamilySize: 2,
            maleCount: m.gender === 'ذكر' ? 1 : 0,
            femaleCount: m.gender === 'أنثى' ? 1 : 0,
            marriedCount: 1,
            deceasedCount: 0,
            governorate: family.governorate,
            directorate: family.directorate,
            isolation: family.isolation,
            village: family.village,
            neighborhood: family.neighborhood,
            street: family.street,
            houseNumber: '',
            residenceDate: '',
            mainIncomeSource: m.work || '',
            otherIncomeSources: '',
            averageIncome: m.memberIncome || 0,
            financialStatus: '',
            notes: `أسرة جديدة مستقلة — رب الأسرة: ${m.name} — الزوجه: ${m.spouseName} — ابن/ابنة من الأسرة: ${family.headName} (${family.familyNumber})`,
            members: [
              {
                seq: 1, name: m.spouseName, gender: m.gender === 'ذكر' ? 'أنثى' : 'ذكر',
                age: 0, birthDate: '', nationalId: '', idType: '',
                relationship: 'زوجة', parentName: '', maritalStatus: 'متزوج',
                familyStatus: 'يعيش مع العائلة', newFamilyNumber: '', spouseName: m.name,
                spouseFrom: m.spouseFrom || '', spouseVillage: m.spouseVillage || '',
                educationLevel: '', educationStatus: '', work: '', memberIncome: 0,
                healthStatus: '', chronicDisease: '', injury: '', disability: '', memberNotes: '',
              },
            ],
          };
          await axios.post('/api/census', newFamily, { headers });
          created++;
        } catch (e) { console.error('Failed to create family for', m.name, e); }
      }
      if (created > 0) {
        toast.success(`تم حفظ الأفراد وإنشاء ${created} أسرة جديدة مستقلة`);
      } else {
        toast.success('تم حفظ أفراد الأسرة');
      }
    } catch (err) { toast.error('خطأ في الحفظ: ' + (err.response?.data?.error || err.message)); }
    setSaving(false);
  };

  const saveHousing = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { housing }, { headers });
      toast.success('تم حفظ بيانات السكن');
    } catch (err) { toast.error('خطأ في الحفظ: ' + (err.response?.data?.error || err.message)); }
    setSaving(false);
  };

  const saveMigration = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { migration }, { headers });
      toast.success('تم حفظ بيانات الهجرة');
    } catch (err) { toast.error('خطأ في الحفظ: ' + (err.response?.data?.error || err.message)); }
    setSaving(false);
  };

  const saveDiseases = async () => {
    if (!censusId) { toast.error('احفظ بيانات الأسرة أولاً'); return; }
    setSaving(true);
    try {
      await axios.put(`/api/census/${censusId}`, { diseases }, { headers });
      toast.success('تم حفظ بيانات الأمراض');
    } catch (err) { toast.error('خطأ في الحفظ: ' + (err.response?.data?.error || err.message)); }
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
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {tab === 'family' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            {censusId && fg('رقم الاستمارة', <input style={readOnlyStyle} value={family.formNumber} readOnly />)}
            {censusId && fg('رقم الأسرة', <input style={readOnlyStyle} value={family.familyNumber} readOnly />)}
            {fg('تاريخ الإدخال', <input style={readOnlyStyle} value={family.visitDate} readOnly />)}
            {renderDropdown('المحافظة *', 'governorate', family.governorate, v => setFamily({ ...family, governorate: v }))}
            {renderDropdown('المديرية *', 'directorate', family.directorate, v => setFamily({ ...family, directorate: v }))}
            {renderDropdown('العزلة', 'isolation', family.isolation, v => setFamily({ ...family, isolation: v }))}
            {renderDropdown('القرية', 'village', family.village, v => setFamily({ ...family, village: v }))}
            {renderDropdown('الحي', 'neighborhood', family.neighborhood, v => setFamily({ ...family, neighborhood: v }))}
            {fg('الشارع', <input style={inputStyle} value={family.street} onChange={e => setFamily({ ...family, street: e.target.value })} />)}
            {fg('رقم المنزل', <input style={inputStyle} value={family.houseNumber} onChange={e => setFamily({ ...family, houseNumber: e.target.value })} />)}
            {fg('اسم رب الأسرة *', <input style={inputStyle} value={family.headName} onChange={e => setFamily({ ...family, headName: e.target.value })} />)}
            {fg('تاريخ الميلاد', <input type="date" style={inputStyle} value={family.birthDate} onChange={e => setFamily({ ...family, birthDate: e.target.value })} />)}
            {renderDropdown('نوع الهوية', 'idType', family.idType, v => setFamily({ ...family, idType: v }))}
            {fg('رقم الهوية', <input style={inputStyle} value={family.nationalId} onChange={e => setFamily({ ...family, nationalId: e.target.value })} />)}
            {fg('الهاتف *', <input type="tel" style={inputStyle} value={family.phone} onChange={e => setFamily({ ...family, phone: e.target.value })} />)}
            {fg('عدد الأسرة الحالي *', <input type="number" style={inputStyle} value={family.currentFamilySize} onChange={e => setFamily({ ...family, currentFamilySize: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد الذكور *', <input type="number" style={inputStyle} value={family.maleCount} onChange={e => setFamily({ ...family, maleCount: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد الإناث *', <input type="number" style={inputStyle} value={family.femaleCount} onChange={e => setFamily({ ...family, femaleCount: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد المتزوجين', <input type="number" style={inputStyle} value={family.marriedCount} onChange={e => setFamily({ ...family, marriedCount: parseInt(e.target.value) || 0 })} />)}
            {fg('عدد المتوفين', <input type="number" style={inputStyle} value={family.deceasedCount} onChange={e => setFamily({ ...family, deceasedCount: parseInt(e.target.value) || 0 })} />)}
            {fg('تاريخ السكن', <input style={inputStyle} value={family.residenceDate} onChange={e => setFamily({ ...family, residenceDate: e.target.value })} />)}
            {renderDropdown('مصدر الدخل الرئيسي *', 'mainIncomeSource', family.mainIncomeSource, v => setFamily({ ...family, mainIncomeSource: v }))}
            {renderDropdown('مصادر دخل أخرى', 'otherIncomeSources', family.otherIncomeSources, v => setFamily({ ...family, otherIncomeSources: v }))}
            {fg('متوسط الدخل (ر.ي) *', <input type="number" style={inputStyle} value={family.averageIncome} onChange={e => setFamily({ ...family, averageIncome: parseInt(e.target.value) || 0 })} />)}
            {renderDropdown('الحالة المادية *', 'financialStatus', family.financialStatus, v => setFamily({ ...family, financialStatus: v }))}
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
            {members.map((m, i) => {
              const isChild = m.relationship === 'ابن' || m.relationship === 'ابنة';
              return (
              <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>الفرد #{i + 1}</strong>
                  <button className="btn-reject" onClick={() => removeMember(i)} style={{ fontSize: '0.7rem' }}>✕ حذف</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem', padding: '0.6rem', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.1)' }}>
                  {renderDropdown('صلة القرابة *', 'relationship', m.relationship, v => {
                    const updated = { ...m, relationship: v };
                    if (v === 'ابن' || v === 'ابنة') {
                      updated.parentName = family.headName || '';
                      updated.gender = v === 'ابن' ? 'ذكر' : 'أنثى';
                    } else if (v === 'زوجة') {
                      updated.gender = 'أنثى';
                      updated.maritalStatus = 'متزوج';
                      updated.parentName = '';
                    } else if (v === 'زوج') {
                      updated.gender = 'ذكر';
                      updated.maritalStatus = 'متزوج';
                      updated.parentName = '';
                    } else {
                      updated.parentName = '';
                    }
                    const newMembers = [...members];
                    newMembers[i] = updated;
                    setMembers(newMembers);
                  })}
                </div>

                {m.relationship && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div className="form-group">
                      <label style={labelStyle}>{isChild ? 'اسم الابن/الابنة *' : 'الاسم الكامل (رباعي) *'}</label>
                      <input style={inputStyle} value={m.name || ''} onChange={e => updateMember(i, 'name', e.target.value)} placeholder={isChild ? 'الاسم' : 'الاسم الرباعي الكامل'} />
                    </div>
                    <div className="form-group"><label style={labelStyle}>الجنس *</label>
                      <select style={inputStyle} value={m.gender} onChange={e => updateMember(i, 'gender', e.target.value)} disabled={isChild}>
                        <option value="">اختر</option><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option>
                      </select>
                    </div>
                    <div className="form-group"><label style={labelStyle}>العمر *</label>
                      <input type="number" style={readOnlyStyle} value={m.birthDate ? new Date().getFullYear() - new Date(m.birthDate).getFullYear() : (m.age || 0)} readOnly />
                    </div>
                    <div className="form-group"><label style={labelStyle}>تاريخ الميلاد</label>
                      <input type="date" style={inputStyle} value={m.birthDate || ''} onChange={e => {
                        const bd = e.target.value;
                        const age = bd ? new Date().getFullYear() - new Date(bd).getFullYear() : 0;
                        const updated = { ...m, birthDate: bd, age };
                        const newMembers = [...members];
                        newMembers[i] = updated;
                        setMembers(newMembers);
                      }} />
                    </div>
                    {renderDropdown('نوع الهوية', 'idType', m.idType, v => updateMember(i, 'idType', v), true)}
                    <div className="form-group"><label style={labelStyle}>رقم الهوية</label><input style={inputStyle} value={m.nationalId} onChange={e => updateMember(i, 'nationalId', e.target.value)} /></div>
                    <div className="form-group">
                      <label style={labelStyle}>{isChild ? 'اسم الاب/الأم' : 'اسم الأب/الأم'}</label>
                      {isChild ? (
                        <input style={readOnlyStyle} value={m.parentName || family.headName || ''} readOnly />
                      ) : (
                        <input style={inputStyle} value={m.parentName} onChange={e => updateMember(i, 'parentName', e.target.value)} />
                      )}
                    </div>
                    {renderDropdown('الحالة الاجتماعية', 'maritalStatus', m.maritalStatus, v => {
                      const updated = { ...m, maritalStatus: v };
                      if ((v === 'متزوج' || v === 'مزوج') && (isChild)) {
                        updated.familyStatus = 'متزوج ومستقل';
                      }
                      const newMembers = [...members];
                      newMembers[i] = updated;
                      setMembers(newMembers);
                    })}
                    {(m.maritalStatus === 'متزوج' || m.maritalStatus === 'مزوج') && (
                      <>
                        <div className="form-group">
                          <label style={labelStyle}>الزوج/ة من:* </label>
                          <select style={inputStyle} value={m.spouseFrom || 'خارج راس عيسى'} onChange={e => {
                            const updated = { ...m, spouseFrom: e.target.value, spouseName: '', spouseFamilyNumber: '' };
                            const newMembers = [...members];
                            newMembers[i] = updated;
                            setMembers(newMembers);
                          }}>
                            <option value="خارج راس عيسى">من خارج قرى راس عيسى</option>
                            <option value="من راس عيسى">من قرى راس عيسى</option>
                          </select>
                        </div>
                        {m.spouseFrom === 'من راس عيسى' ? (
                          <>
                            <div className="form-group">
                              <label style={labelStyle}>اختر القرية *</label>
                              <select style={inputStyle} value={m.spouseVillage || ''} onChange={e => {
                                const updated = { ...m, spouseVillage: e.target.value, spouseName: '', spouseFamilyNumber: '' };
                                const newMembers = [...members];
                                newMembers[i] = updated;
                                setMembers(newMembers);
                              }}>
                                <option value="">اختر القرية</option>
                                {[...new Set(censusFamilies.map(c => c.village).filter(Boolean))].sort().map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                            {m.spouseVillage && (
                              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>اختر الزوج/ة *</label>
                                <input type="text" style={{ ...inputStyle, marginBottom: '0.3rem' }} placeholder="ابحث بالاسم..." value={m.spouseSearch || ''} onChange={e => {
                                  const updated = { ...m, spouseSearch: e.target.value };
                                  const newMembers = [...members];
                                  newMembers[i] = updated;
                                  setMembers(newMembers);
                                }} />
                                <select style={inputStyle} value={m.spouseName || ''} onChange={e => {
                                  const selected = censusFamilies.find(c => c.headName === e.target.value && c.village === m.spouseVillage);
                                  const updated = { ...m, spouseName: e.target.value, spouseFamilyNumber: selected?.familyNumber || '' };
                                  const newMembers = [...members];
                                  newMembers[i] = updated;
                                  setMembers(newMembers);
                                }}>
                                  <option value="">اختر الفرد</option>
                                  {censusFamilies.filter(c => c.village === m.spouseVillage && c.headName !== family.headName).filter(c => {
                                    if (!m.spouseSearch) return true;
                                    return c.headName.includes(m.spouseSearch);
                                  }).map(c => (
                                    <option key={c._id} value={c.headName}>{c.headName} — {c.familyNumber}</option>
                                  ))}
                                </select>
                                {m.spouseName && (
                                  <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.2rem' }}>
                                    ✓ مرتبط بـ: {m.spouseName} ({m.spouseFamilyNumber})
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="form-group">
                            <label style={labelStyle}>اسم الزوج/الزوجة *</label>
                            <input style={inputStyle} value={m.spouseName || ''} onChange={e => updateMember(i, 'spouseName', e.target.value)} placeholder="الاسم الكامل للزوج/الزوجة" />
                          </div>
                        )}
                        <div className="form-group">
                          <label style={labelStyle}>حالة العائلة *</label>
                          <select style={inputStyle} value={m.familyStatus || 'يعيش مع العائلة'} onChange={e => updateMember(i, 'familyStatus', e.target.value)}>
                            <option value="يعيش مع العائلة">يعيش مع العائلة (لا يُحتسب كأسرة)</option>
                            <option value="متزوج ومستقل">متزوج ومستقل (أسرة جديدة)</option>
                          </select>
                        </div>
                        {m.familyStatus === 'متزوج ومستقل' && (
                          <div style={{ gridColumn: 'span 3', padding: '0.6rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.78rem' }}>
                            <div style={{ color: '#10b981', fontWeight: '700', marginBottom: '0.3rem' }}>🏠 سيتم إنشاء أسرة جديدة:</div>
                            <div style={{ color: 'var(--gray-light)' }}>
                              • رقم الأسرة: <strong style={{ color: '#10b981' }}>سيتم توليده تلقائيًا</strong> —
                              رب الأسرة: <strong style={{ color: '#fff' }}>{m.name}</strong> —
                              الزوجه: <strong style={{ color: '#fff' }}>{m.spouseName || '—'}</strong> —
                              القرية: <strong style={{ color: '#fff' }}>{family.village}</strong>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {renderDropdown('المستوى التعليمي', 'educationLevel', m.educationLevel, v => updateMember(i, 'educationLevel', v))}
                    {renderDropdown('الحالة التعليمية', 'educationStatus', m.educationStatus, v => updateMember(i, 'educationStatus', v))}
                    <div className="form-group"><label style={labelStyle}>العمل</label><input style={inputStyle} value={m.work} onChange={e => updateMember(i, 'work', e.target.value)} /></div>
                    <div className="form-group"><label style={labelStyle}>متوسط الدخل</label><input type="number" style={inputStyle} value={m.memberIncome} onChange={e => updateMember(i, 'memberIncome', parseInt(e.target.value) || 0)} /></div>
                    {renderDropdown('الحالة الصحية', 'healthStatus', m.healthStatus, v => updateMember(i, 'healthStatus', v))}
                    <div className="form-group"><label style={labelStyle}>مرض مزمن</label><input style={inputStyle} value={m.chronicDisease} onChange={e => updateMember(i, 'chronicDisease', e.target.value)} /></div>
                    <div className="form-group"><label style={labelStyle}>إصابة</label><input style={inputStyle} value={m.injury} onChange={e => updateMember(i, 'injury', e.target.value)} /></div>
                    <div className="form-group"><label style={labelStyle}>إعاقة</label><input style={inputStyle} value={m.disability} onChange={e => updateMember(i, 'disability', e.target.value)} /></div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}><label style={labelStyle}>ملاحظات</label><input style={inputStyle} value={m.memberNotes} onChange={e => updateMember(i, 'memberNotes', e.target.value)} /></div>
                  </div>
                )}
              </div>
              );
            })}
            {members.length === 0 && <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>لا يوجد أفراد مسجلين. اضغط "إضافة فرد" للبدء.</p>}
          </div>
        )}

        {tab === 'housing' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            {renderDropdown('نوع السكن', 'housingType', housing.housingType, v => setHousing({ ...housing, housingType: v }))}
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
