import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { AdminPanel } from './pages/admin/AdminPanel';
import { StudentPortal } from './pages/student/StudentPortal';
import { StudentProfile } from './pages/student/StudentProfile';
import { ForcePasswordChange } from './pages/ForcePasswordChange';
import { UserRole } from './types';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode, role?: UserRole }> = ({ children, role }) => {
  const { currentUser } = useStore();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // 1. Check Forced Password Change Logic
  // If user must change password AND is not currently on the change-password page
  if (currentUser.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // If user does NOT need to change password BUT is on the change-password page, redirect out
  if (!currentUser.mustChangePassword && location.pathname === '/change-password') {
     return <Navigate to={currentUser.role === UserRole.ADMIN ? '/admin' : '/student'} replace />;
  }

  // 2. Role Check (only if not in forced password mode)
  if (role && currentUser.role !== role) {
    return <Navigate to={currentUser.role === UserRole.ADMIN ? '/admin' : '/student'} replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Navbar should hide if forcing password change */}
        <ConditionalNavbar />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Login />} />
            
            {/* Force Password Change Route */}
            <Route 
                path="/change-password" 
                element={
                    <ProtectedRoute>
                        <ForcePasswordChange />
                    </ProtectedRoute>
                } 
            />

            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute role={UserRole.ADMIN}>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />

            {/* Student Routes */}
            <Route 
              path="/student" 
              element={
                <ProtectedRoute role={UserRole.STUDENT}>
                  <StudentPortal />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/my-bookings" 
              element={
                <ProtectedRoute role={UserRole.STUDENT}>
                  <StudentPortal /> 
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/profile" 
              element={
                <ProtectedRoute role={UserRole.STUDENT}>
                  <StudentProfile />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        <footer className="bg-slate-900 text-slate-400 py-6 text-center text-sm">
          &copy; {new Date().getFullYear()} ClubeSport. Todos os direitos reservados.
        </footer>
      </div>
    </Router>
  );
};

// Helper component to hide Navbar on login and forced password pages
const ConditionalNavbar = () => {
    const location = useLocation();
    const { currentUser } = useStore();
    
    // Don't show navbar on login
    if (location.pathname === '/') return null;
    
    // Don't show navbar on forced password change
    if (location.pathname === '/change-password') return null;

    // Don't show navbar if user must change password (double safety)
    if (currentUser?.mustChangePassword) return null;

    return <Navbar />;
};

const App = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;