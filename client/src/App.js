import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import WorkersTable from './components/WorkersTable';
import FamiliesTable from './components/FamiliesTable';
import Feedback from './components/Feedback';
import Subscribe from './components/Subscribe';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        <Navbar />
        <Hero />
        <Dashboard />
        <WorkersTable />
        <FamiliesTable />
        <Feedback />
        <Subscribe />
        <AdminPanel />
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;