
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { AdminPanel } from './pages/admin/AdminPanel';
import { StudentPortal } from './pages/student/StudentPortal';
import { StudentProfile } from './pages/student/StudentProfile';
import { TeacherPortal } from './pages/teacher/TeacherPortal';
import { ForcePasswordChange } from './pages/ForcePasswordChange';
import { UserRole } from './types.js';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, role }) => {
  const { currentUser } = useStore();
  const location = useLocation();

  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;

  if (role && currentUser.role !== role) {
    const dest = currentUser.role === UserRole.ADMIN ? '/admin' : currentUser.role === UserRole.TEACHER ? '/teacher' : '/student';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
};

const ConditionalNavbar = () => {
    const location = useLocation();
    const { currentUser } = useStore();
    if (location.pathname === '/' || location.pathname === '/change-password' || currentUser?.mustChangePassword) return null;
    return <Navbar />;
};

const AppContent = () => {
  const { loading } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-600 text-base font-bold uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <ConditionalNavbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/change-password" element={<ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role={UserRole.ADMIN}><AdminPanel /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute role={UserRole.TEACHER}><TeacherPortal /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute role={UserRole.STUDENT}><StudentPortal /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute role={UserRole.STUDENT}><StudentProfile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="bg-slate-900 text-slate-500 py-8 text-center text-sm font-medium">
          &copy; {new Date().getFullYear()} ClubeSport. Gestão Esportiva Inteligente.
        </footer>
      </div>
    </Router>
  );
};

const App = () => (
  <StoreProvider>
    <AppContent />
  </StoreProvider>
);

export default App;
