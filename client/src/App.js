import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import WorkersTable from './components/WorkersTable';
import FamiliesTable from './components/FamiliesTable';
import CitizensStats from './components/CitizensStats';
import Feedback from './components/Feedback';
import Subscribe from './components/Subscribe';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';

const TAB_LIST = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
  { id: 'workers', label: 'كشف العمال', icon: '👷' },
  { id: 'families', label: 'كشف المساعدات', icon: '👨‍👩‍👧‍👦' },
  { id: 'citizens', label: 'إحصاء المواطنين', icon: '📋' },
  { id: 'feedback', label: 'الملاحظات', icon: '💬' },
  { id: 'subscribe', label: 'الاشتراك', icon: '✉️' },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { hasPermission, isAdmin } = useAuth();

  const visibleTabs = TAB_LIST.filter(tab => {
    if (tab.id === 'subscribe') return true;
    if (tab.id === 'feedback') return true;
    return isAdmin || hasPermission(tab.id);
  });

  const isTabVisible = visibleTabs.some(t => t.id === activeTab);

  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <Navbar />
      <Hero />

      <div className="main-tabs-container">
        <div className="tabs-wrapper">
          <div className="tabs-header">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="tab-content">
            {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
            {activeTab === 'workers' && isTabVisible && <WorkersTable />}
            {activeTab === 'families' && isTabVisible && <FamiliesTable />}
            {activeTab === 'citizens' && isTabVisible && <CitizensStats />}
            {activeTab === 'feedback' && <Feedback />}
            {activeTab === 'subscribe' && <Subscribe />}
          </div>
        </div>
      </div>

      <AdminPanel />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
