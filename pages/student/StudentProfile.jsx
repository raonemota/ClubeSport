import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { User, Shield, Key, UserCircle, Phone, CreditCard, Save } from 'lucide-react';

export const StudentProfile = () => {
    const { currentUser, updatePassword } = useStore();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    if (!currentUser) return null;

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMsg(null);

        if (newPassword.length < 6) {
            setMsg({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMsg({ type: 'error', text: 'As senhas não conferem.' });
            return;
        }

        setLoading(true);
        try {
            const success = await updatePassword(newPassword);
            if (success) {
                setMsg({ type: 'success', text: 'Senha atualizada com sucesso!' });
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setMsg({ type: 'error', text: 'Erro ao atualizar senha.' });
            }
        } catch (e) {
            setMsg({ type: 'error', text: 'Erro inesperado.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
            <p className="text-gray-500 mb-8">Gerencie suas informações e segurança.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Info Card */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center gap-3">
                            <UserCircle className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-semibold text-indigo-900">Dados Pessoais</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Nome Completo</label>
                                <div className="font-medium text-gray-900">{currentUser.name}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email</label>
                                <div className="font-medium text-gray-900">{currentUser.email}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Telefone</label>
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {currentUser.phone || 'Não informado'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Tipo de Plano</label>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${currentUser.planType === 'Wellhub' ? 'bg-red-100 text-red-800' : 
                                          currentUser.planType === 'Totalpass' ? 'bg-green-100 text-green-800' : 
                                          currentUser.planType === 'Mensalista' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {currentUser.planType || 'Padrão'}
                                    </span>
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Observações Médicas/Técnicas</label>
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {currentUser.observation || 'Nenhuma observação registrada.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Card */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-3">
                            <Shield className="w-5 h-5 text-orange-600" />
                            <h3 className="font-semibold text-orange-900">Segurança</h3>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                                            placeholder="Repita a senha"
                                        />
                                    </div>
                                </div>

                                {msg && (
                                    <div className={`text-sm p-2 rounded ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {msg.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !newPassword}
                                    className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Salvando...' : <><Save className="w-4 h-4" /> Atualizar Senha</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};