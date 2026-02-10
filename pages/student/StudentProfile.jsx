import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { User, Shield, Key, UserCircle, Phone, CreditCard, Save, Edit2, X, Loader2, Bell, BellOff } from 'lucide-react';

export const StudentProfile = () => {
    const { currentUser, updatePassword, updateUser, notificationsEnabled, requestNotificationPermission } = useStore();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPass, setLoadingPass] = useState(false);
    const [msgPass, setMsgPass] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: currentUser?.name || '', phone: currentUser?.phone || '' });
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [msgProfile, setMsgProfile] = useState(null);

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
        const success = await updateUser(currentUser.id, profileForm);
        setMsgProfile({ type: success ? 'success' : 'error', text: success ? 'Perfil atualizado!' : 'Erro ao atualizar.' });
        if (success) setIsEditing(false);
        setLoadingProfile(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6 || newPassword !== confirmPassword) {
            setMsgPass({ type: 'error', text: 'Verifique a senha informada.' });
            return;
        }
        setLoadingPass(true);
        const success = await updatePassword(newPassword);
        setMsgPass({ type: success ? 'success' : 'error', text: success ? 'Senha atualizada!' : 'Erro ao atualizar.' });
        setNewPassword(''); setConfirmPassword('');
        setLoadingPass(false);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-3"><UserCircle className="w-5 h-5 text-indigo-600" /><h3 className="font-semibold text-indigo-900">Dados Pessoais</h3></div>
                            <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-full ${isEditing ? 'text-red-600' : 'text-indigo-600'}`}>{isEditing ? <X /> : <Edit2 />}</button>
                        </div>
                        <div className="p-6">
                            {isEditing ? (
                                <form onSubmit={handleProfileSubmit} className="space-y-4">
                                    <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="block w-full border-gray-300 rounded-md p-2" />
                                    <input type="text" value={profileForm.phone} onChange={handlePhoneChange} className="block w-full border-gray-300 rounded-md p-2" />
                                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md">Salvar</button>
                                </form>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-xs text-gray-400 uppercase">Nome</p><p>{currentUser.name}</p></div>
                                    <div><p className="text-xs text-gray-400 uppercase">Email</p><p>{currentUser.email}</p></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bloco de Notificações no Perfil */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-3">
                            <Bell className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-blue-900">Notificações</h3>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">Alertas do Navegador</p>
                                    <p className="text-sm text-gray-500">Receba avisos de novas turmas e lembretes de aula.</p>
                                </div>
                                <button 
                                    onClick={requestNotificationPermission}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            {!notificationsEnabled && (
                                <p className="mt-4 text-xs text-orange-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Clique no botão para solicitar permissão ao navegador.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
                        <Shield className="w-5 h-5 text-orange-600 mb-4" />
                        <h3 className="font-semibold mb-4">Alterar Senha</h3>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova senha" className="w-full border-gray-300 rounded-md p-2 text-sm" />
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar" className="w-full border-gray-300 rounded-md p-2 text-sm" />
                            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm">Atualizar</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};