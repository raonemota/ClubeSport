import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { UserRole } from '../types.ts';
import { LogOut, User as UserIcon, Calendar, Trophy, List, Settings } from 'lucide-react';

// Using HashRouter for compatibility as requested, so we use plain <a> with # or buttons that change window.location.hash
// However, since we are inside a Router, we should use Link or useNavigate. 
// For this single file output, I will use window.location.hash for explicit simplicity if using HashRouter.
import { Link, useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) return null;

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={currentUser.role === UserRole.ADMIN ? '/admin' : '/student'} className="flex-shrink-0 font-bold text-xl tracking-wider flex items-center gap-2 text-indigo-400">
              <Trophy className="w-6 h-6" />
              ClubeSport
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {currentUser.role === UserRole.ADMIN ? (
                  <>
                    <Link to="/admin" className="hover:bg-slate-700 px-3 py-2 rounded-md text-sm font-medium">Painel</Link>
                  </>
                ) : (
                  <>
                    <Link to="/student" className="hover:bg-slate-700 px-3 py-2 rounded-md text-sm font-medium">Aulas Disponíveis</Link>
                    <Link to="/student/my-bookings" className="hover:bg-slate-700 px-3 py-2 rounded-md text-sm font-medium">Meus Agendamentos</Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to={currentUser.role === UserRole.ADMIN ? '/admin' : '/student/profile'} 
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
              title="Ir para o Perfil"
            >
              <div className="bg-slate-800 p-1.5 rounded-full">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="font-medium">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                    {currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Aluno'}
                </span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 p-2 rounded-full text-white transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};