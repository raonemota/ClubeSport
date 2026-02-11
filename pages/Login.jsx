
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types.js';
import { Trophy, Lock, Mail, Info, Loader2 } from 'lucide-react';

export const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginProcessLoading, setLoginProcessLoading] = useState(false);
  
  const { login, currentUser, loading: storeLoading } = useStore();
  const navigate = useNavigate();

  // Redirect if already logged in and NOT in a loading state
  React.useEffect(() => {
    if (currentUser && !storeLoading) {
      const dest = currentUser.role === UserRole.ADMIN ? '/admin' : currentUser.role === UserRole.TEACHER ? '/teacher' : '/student';
      navigate(dest, { replace: true });
    }
  }, [currentUser, storeLoading, navigate]);

  const handleIdentifierChange = (e) => {
    let value = e.target.value;
    
    // Se o usuário estiver digitando apenas números, assumimos que é um telefone e aplicamos a máscara
    const isPhone = /^[0-9()-\s]*$/.test(value);
    
    if (isPhone && value.length > 0) {
        value = value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
        } else if (value.length > 0) {
            value = value.replace(/^(\d*)/, "($1");
        }
    }

    setIdentifier(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginProcessLoading(true);
    
    try {
      const success = await login(identifier, password);
      if (!success) {
        setError('Falha no login. Verifique suas credenciais.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setLoginProcessLoading(false);
    }
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="mx-auto bg-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">ClubeSport</h2>
          <p className="text-slate-400">Área de Membros</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-200">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email ou Telefone</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="email@exemplo.com ou (71) 98878-3622"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginProcessLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
          >
            {loginProcessLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="mt-4 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <div className="flex gap-3">
                <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div className="text-xs text-indigo-800">
                    <p className="font-bold mb-1">Primeiro Acesso?</p>
                    <p>Utilize o email ou telefone cadastrado na secretaria e a senha padrão fornecida (ex: <strong>mudar@123</strong>). Você poderá alterar sua senha após o login.</p>
                </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
