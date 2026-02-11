
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { User, Shield, Key, UserCircle, Phone, CreditCard, Save, Edit2, X, Loader2, Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';

export const StudentProfile = () => {
    const { currentUser, updatePassword, updateUser, notificationsEnabled, requestNotificationPermission } = useStore();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPass, setLoadingPass] = useState(false);
    const [msgPass, setMsgPass] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [msgProfile, setMsgProfile] = useState(null);

    useEffect(() => {
        if (currentUser) {
            setProfileForm({ name: currentUser.name, phone: currentUser.phone || '' });
        }
    }, [currentUser, isEditing]);

    if (!currentUser) return null;

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
        else if (value.length > 0) value = value.replace(/^(\d*)/, "($1");
        setProfileForm({ ...profileForm, phone: value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoadingProfile(true);
        setMsgProfile(null);
        const success = await updateUser(currentUser.id, profileForm);
        setMsgProfile({ type: success ? 'success' : 'error', text: success ? 'Perfil atualizado com sucesso!' : 'Erro ao atualizar dados.' });
        if (success) {
            setTimeout(() => {
                setIsEditing(false);
                setMsgProfile(null);
            }, 2000);
        }
        setLoadingProfile(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMsgPass(null);
        if (newPassword.length < 6 || newPassword !== confirmPassword) {
            setMsgPass({ type: 'error', text: 'Senhas não conferem ou são muito curtas.' });
            return;
        }
        setLoadingPass(true);
        const success = await updatePassword(newPassword);
        setMsgPass({ type: success ? 'success' : 'error', text: success ? 'Senha atualizada!' : 'Erro ao atualizar.' });
        if (success) {
            setNewPassword(''); 
            setConfirmPassword('');
        }
        setLoadingPass(false);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Meu Perfil</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    {/* Dados Pessoais */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserCircle className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-semibold text-indigo-900">Dados Pessoais</h3>
                            </div>
                            <button 
                                onClick={() => setIsEditing(!isEditing)} 
                                className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                                title={isEditing ? "Cancelar Edição" : "Editar Dados"}
                            >
                                {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="p-6">
                            {msgProfile && (
                                <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 border ${msgProfile.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                    {msgProfile.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {msgProfile.text}
                                </div>
                            )}

                            {isEditing ? (
                                <form onSubmit={handleProfileSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                            <input 
                                                type="text" 
                                                value={profileForm.name} 
                                                onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                                                className="block w-full border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 border shadow-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                                            <input 
                                                type="text" 
                                                value={profileForm.phone} 
                                                onChange={handlePhoneChange} 
                                                placeholder="(00) 00000-0000"
                                                className="block w-full border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 border shadow-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsEditing(false)} 
                                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={loadingProfile}
                                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50"
                                        >
                                            {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Nome</p>
                                        <p className="text-gray-900 font-medium">{currentUser.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Email</p>
                                        <p className="text-gray-900 font-medium">{currentUser.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Telefone</p>
                                        <p className="text-indigo-600 font-bold">{currentUser.phone || <span className="text-gray-300 font-normal">Não informado</span>}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notificações */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-3">
                            <Bell className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-blue-900">Notificações</h3>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">Alertas do Navegador</p>
                                    <p className="text-sm text-gray-500">Receba lembretes de aula e avisos importantes.</p>
                                </div>
                                <button 
                                    onClick={requestNotificationPermission}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alterar Senha */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
                        <div className="flex items-center gap-2 mb-6">
                             <Shield className="w-5 h-5 text-orange-600" />
                             <h3 className="font-bold text-gray-900">Segurança</h3>
                        </div>
                        
                        {msgPass && (
                            <div className={`mb-4 p-3 rounded-lg text-xs border ${msgPass.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                {msgPass.text}
                            </div>
                        )}

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nova Senha</label>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    placeholder="Mín. 6 caracteres" 
                                    className="w-full border-gray-200 rounded-lg p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Confirmar Senha</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={e => setConfirmPassword(e.target.value)} 
                                    placeholder="Repita a nova senha" 
                                    className="w-full border-gray-200 rounded-lg p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500" 
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={loadingPass}
                                className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loadingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                Alterar Senha
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                         <p className="text-xs text-gray-400 mb-2">Tipo de Plano</p>
                         <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                             <CreditCard className="w-3 h-3" />
                             {currentUser.planType || 'Padrão'}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
