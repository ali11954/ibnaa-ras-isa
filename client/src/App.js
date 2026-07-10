import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
    { id: 'workers', label: 'كشف العمال', icon: '👷' },
    { id: 'families', label: 'كشف المساعدات', icon: '👨‍👩‍👧‍👦' },
    { id: 'citizens', label: 'إحصاء المواطنين', icon: '📋' },
    { id: 'feedback', label: 'الملاحظات', icon: '💬' },
    { id: 'subscribe', label: 'الاشتراك', icon: '✉️' },
  ];

  return (
    <AuthProvider>
      <div className="App">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        <Navbar />
        <Hero />

        <div className="main-tabs-container">
          <div className="tabs-wrapper">
            <div className="tabs-header">
              {tabs.map(tab => (
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
              {activeTab === 'workers' && <WorkersTable />}
              {activeTab === 'families' && <FamiliesTable />}
              {activeTab === 'citizens' && <CitizensStats />}
              {activeTab === 'feedback' && <Feedback />}
              {activeTab === 'subscribe' && <Subscribe />}
            </div>
          </div>
        </div>

        <AdminPanel />
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
