
import React from 'react';
import { useStore } from '../context/StoreContext';
import { UserRole } from '../types.js';
import { LogOut, User as UserIcon, Trophy, ClipboardCheck, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { currentUser, logout, loading } = useStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const roleLabels = {
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.TEACHER]: 'Professor',
    [UserRole.STUDENT]: 'Aluno'
  };

  const dashboardPath = {
    [UserRole.ADMIN]: '/admin',
    [UserRole.TEACHER]: '/teacher',
    [UserRole.STUDENT]: '/student'
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={dashboardPath[currentUser.role]} className="flex-shrink-0 font-bold text-xl tracking-wider flex items-center gap-2 text-indigo-400">
              <Trophy className="w-6 h-6" />
              ClubeSport
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {currentUser.role === UserRole.ADMIN && (
                   <Link to="/admin" className="hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium">Painel Admin</Link>
                )}
                {currentUser.role === UserRole.TEACHER && (
                   <Link to="/teacher" className="hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                     <ClipboardCheck className="w-4 h-4" /> Chamadas
                   </Link>
                )}
                {currentUser.role === UserRole.STUDENT && (
                  <>
                    <Link to="/student" className="hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium">Aulas</Link>
                    <Link to="/student/profile" className="hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium">Perfil</Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end leading-none mr-2 text-right">
              <span className="font-medium text-sm block truncate max-w-[120px]">{currentUser.name}</span>
              <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-tighter">{roleLabels[currentUser.role]}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="bg-slate-800 hover:bg-red-600 p-2 rounded-full text-white transition-all shadow-inner disabled:opacity-50"
              title="Sair"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
