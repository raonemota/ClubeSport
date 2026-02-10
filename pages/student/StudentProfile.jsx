import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { User, Shield, Key, UserCircle, Phone, CreditCard, Save, Edit2, X, Loader2 } from 'lucide-react';

export const StudentProfile = () => {
    const { currentUser, updatePassword, updateUser } = useStore();
    
    // States for Password Change
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPass, setLoadingPass] = useState(false);
    const [msgPass, setMsgPass] = useState(null);

    // States for Profile Edit
    const [isEditing, setIsEditing] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: currentUser?.name || '',
        phone: currentUser?.phone || ''
    });
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [msgProfile, setMsgProfile] = useState(null);

    if (!currentUser) return null;

    // --- Phone Mask Logic ---
    const handlePhoneChange = (e) => {
        let value = e.target.value;
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
        
        setProfileForm({ ...profileForm, phone: value });
    };

    // --- Profile Update Handlers ---
    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing: reset form
            setProfileForm({
                name: currentUser.name || '',
                phone: currentUser.phone || ''
            });
            setMsgProfile(null);
        }
        setIsEditing(!isEditing);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoadingProfile(true);
        setMsgProfile(null);

        try {
            const success = await updateUser(currentUser.id, {
                name: profileForm.name,
                phone: profileForm.phone
            });

            if (success) {
                setMsgProfile({ type: 'success', text: 'Perfil atualizado com sucesso!' });
                setIsEditing(false);
            } else {
                setMsgProfile({ type: 'error', text: 'Erro ao atualizar perfil.' });
            }
        } catch (error) {
            setMsgProfile({ type: 'error', text: 'Erro inesperado.' });
        } finally {
            setLoadingProfile(false);
        }
    };

    // --- Password Change Handler ---
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMsgPass(null);

        if (newPassword.length < 6) {
            setMsgPass({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMsgPass({ type: 'error', text: 'As senhas não conferem.' });
            return;
        }

        setLoadingPass(true);
        try {
            const success = await updatePassword(newPassword);
            if (success) {
                setMsgPass({ type: 'success', text: 'Senha atualizada com sucesso!' });
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setMsgPass({ type: 'error', text: 'Erro ao atualizar senha.' });
            }
        } catch (e) {
            setMsgPass({ type: 'error', text: 'Erro inesperado.' });
        } finally {
            setLoadingPass(false);
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
                        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserCircle className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-semibold text-indigo-900">Dados Pessoais</h3>
                            </div>
                            <button 
                                onClick={handleEditToggle}
                                className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-white text-indigo-600 hover:bg-indigo-100 shadow-sm'}`}
                                title={isEditing ? "Cancelar Edição" : "Editar Perfil"}
                            >
                                {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                        </div>
                        
                        <div className="p-6">
                            {msgProfile && (
                                <div className={`mb-4 text-sm p-3 rounded-md ${msgProfile.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {msgProfile.text}
                                </div>
                            )}

                            {isEditing ? (
                                <form onSubmit={handleProfileSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                            <input
                                                type="text"
                                                required
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                                className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                            <input
                                                type="text"
                                                required
                                                value={profileForm.phone}
                                                onChange={handlePhoneChange}
                                                maxLength={15}
                                                className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleEditToggle}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loadingProfile}
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                        <p className="text-xs text-gray-400 mt-1">*Para alterar seu plano ou observações, contate a secretaria.</p>
                                    </div>
                                </div>
                            )}
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

                                {msgPass && (
                                    <div className={`text-sm p-2 rounded ${msgPass.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {msgPass.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loadingPass || !newPassword}
                                    className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingPass ? 'Salvando...' : <><Save className="w-4 h-4" /> Atualizar Senha</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};