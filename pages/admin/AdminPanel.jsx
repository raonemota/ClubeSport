
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Plus, Trash2, Calendar, Dumbbell, Users, X, FileText, GraduationCap, Phone, Mail, Clock, Filter, Save, Info, AlertCircle, ShieldCheck, Key } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { UserRole, BookingStatus } from '../../types.js';

export const AdminPanel = () => {
  const { modalities, sessions, users, bookings, registerUser, deleteUser, getStudentStats, addModality, deleteModality, addSession, deleteSession } = useStore();
  const [activeTab, setActiveTab] = useState('reports');
  
  // States para Formulários
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  
  const [teacherForm, setTeacherForm] = useState({ name: '', phone: '', email: '', password: 'mudar@123' });
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', email: '', password: 'mudar@123', planType: 'Mensalista' });
  
  const [formLoading, setFormLoading] = useState(false);
  
  const [showModalityForm, setShowModalityForm] = useState(false);
  const [modalityForm, setModalityForm] = useState({ name: '', description: '', imageUrl: '' });

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' });

  const [reportSubTab, setReportSubTab] = useState('attendance');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  const teachers = users.filter(u => u.role === UserRole.TEACHER);
  const students = users.filter(u => u.role === UserRole.STUDENT);

  const formatPhone = (value) => {
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length === 11) return value.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (value.length > 6) return value.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (value.length > 2) return value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    if (value.length > 0) return value.replace(/^(\d*)/, "($1");
    return value;
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const result = await registerUser(teacherForm, UserRole.TEACHER);
    if (result.success) {
      setTeacherForm({ name: '', phone: '', email: '', password: 'mudar@123' });
      setShowTeacherForm(false);
    } else {
      alert("Erro ao cadastrar: " + result.error);
    }
    setFormLoading(false);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const result = await registerUser(studentForm, UserRole.STUDENT);
    if (result.success) {
      setStudentForm({ name: '', phone: '', email: '', password: 'mudar@123', planType: 'Mensalista' });
      setShowStudentForm(false);
    } else {
      alert("Erro ao cadastrar: " + result.error);
    }
    setFormLoading(false);
  };

  const handleModalitySubmit = async (e) => {
    e.preventDefault();
    await addModality(modalityForm);
    setModalityForm({ name: '', description: '', imageUrl: '' });
    setShowModalityForm(false);
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    const startTime = new Date(`${sessionForm.date}T${sessionForm.time}`).toISOString();
    await addSession({ ...sessionForm, startTime });
    setSessionForm({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' });
    setShowSessionForm(false);
  };

  const getSessionStats = (sessionId) => {
      const sessionBookings = bookings.filter(b => b.sessionId === sessionId && b.status !== BookingStatus.CANCELLED_BY_STUDENT && b.status !== BookingStatus.CANCELLED_BY_ADMIN);
      const attended = sessionBookings.filter(b => b.status === BookingStatus.ATTENDED).length;
      const missed = sessionBookings.filter(b => b.status === BookingStatus.MISSED).length;
      const confirmed = sessionBookings.filter(b => b.status === BookingStatus.CONFIRMED).length;
      return { total: sessionBookings.length, attended, missed, confirmed };
  };

  const NavButton = ({ tabId, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-3 ${activeTab === tabId ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Administrativo</h2>
        <NavButton tabId="reports" icon={FileText} label="Relatórios" />
        <NavButton tabId="teachers" icon={GraduationCap} label="Professores" />
        <NavButton tabId="students" icon={Users} label="Alunos" />
        <NavButton tabId="modalities" icon={Dumbbell} label="Modalidades" />
        <NavButton tabId="schedule" icon={Calendar} label="Grade Horária" />
      </aside>

      <main className="flex-1 p-8">
        {/* --- ABA MODALIDADES --- */}
        {activeTab === 'modalities' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Modalidades Esportivas</h1>
              <button onClick={() => setShowModalityForm(!showModalityForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Nova Modalidade
              </button>
            </div>

            {showModalityForm && (
              <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <form onSubmit={handleModalitySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500">Nome da Modalidade</label>
                       <input type="text" value={modalityForm.name} onChange={e => setModalityForm({...modalityForm, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Natação" required />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500">URL da Imagem</label>
                       <input type="text" value={modalityForm.imageUrl} onChange={e => setModalityForm({...modalityForm, imageUrl: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">Descrição</label>
                     <textarea value={modalityForm.description} onChange={e => setModalityForm({...modalityForm, description: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" rows="2" placeholder="Breve descrição..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowModalityForm(false)} className="bg-slate-100 text-slate-500 px-4 py-2 rounded-lg">Cancelar</button>
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">Salvar</button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modalities.map(modality => (
                <div key={modality.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group">
                  <div className="h-32 bg-slate-200 relative overflow-hidden">
                    {modality.imageUrl ? (
                      <img src={modality.imageUrl} alt={modality.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400"><Dumbbell className="w-8 h-8" /></div>
                    )}
                    <button onClick={() => deleteModality(modality.id)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 hover:text-red-700 hover:bg-white transition-all shadow-sm opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4 flex-grow">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{modality.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-3">{modality.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- ABA GRADE HORÁRIA --- */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Grade Horária</h1>
              <button onClick={() => setShowSessionForm(!showSessionForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
                <Plus className="w-4 h-4" /> Nova Aula
              </button>
            </div>

            {showSessionForm && (
              <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                 <form onSubmit={handleSessionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Modalidade</label>
                      <select value={sessionForm.modalityId} onChange={e => setSessionForm({...sessionForm, modalityId: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white" required>
                        <option value="">Selecione...</option>
                        {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Data</label>
                      <input type="date" value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Hora</label>
                      <input type="time" value={sessionForm.time} onChange={e => setSessionForm({...sessionForm, time: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Instrutor</label>
                        <input type="text" value={sessionForm.instructor} onChange={e => setSessionForm({...sessionForm, instructor: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Nome do Professor" required />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Capacidade</label>
                        <input type="number" value={sessionForm.capacity} onChange={e => setSessionForm({...sessionForm, capacity: parseInt(e.target.value)})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" min="1" required />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Categoria (Opcional)</label>
                        <input type="text" value={sessionForm.category} onChange={e => setSessionForm({...sessionForm, category: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Iniciante" />
                     </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowSessionForm(false)} className="bg-slate-100 text-slate-500 px-4 py-2 rounded-lg">Cancelar</button>
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">Adicionar Aula</button>
                  </div>
                 </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left">Data / Hora</th>
                    <th className="px-6 py-4 text-left">Modalidade</th>
                    <th className="px-6 py-4 text-left">Instrutor / Categoria</th>
                    <th className="px-6 py-4 text-center">Vagas</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sessions
                    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map(session => {
                      const modality = modalities.find(m => m.id === session.modalityId);
                      return (
                        <tr key={session.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                             <div className="font-bold text-slate-800">{format(parseISO(session.startTime), 'dd/MM/yyyy')}</div>
                             <div className="text-xs text-slate-500 font-medium">{format(parseISO(session.startTime), 'HH:mm')}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">{modality?.name}</td>
                          <td className="px-6 py-4">
                             <div className="text-slate-900">{session.instructor}</div>
                             {session.category && <span className="text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">{session.category}</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">{session.capacity}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => deleteSession(session.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                  })}
                  {sessions.length === 0 && (
                     <tr><td colSpan="5" className="text-center py-12 text-slate-400">Nenhuma aula cadastrada na grade.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA PROFESSORES --- */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Gestão de Professores</h1>
              <button onClick={() => setShowTeacherForm(!showTeacherForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
                <Plus className="w-4 h-4" /> Novo Professor
              </button>
            </div>

            {showTeacherForm && (
              <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                    <input type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                    <input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: formatPhone(e.target.value)})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="(00) 00000-0000" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Senha Inicial</label>
                    <div className="relative">
                      <Key className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                      <input type="text" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} className="w-full border rounded-lg pl-8 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <button 
                        type="submit" 
                        disabled={formLoading}
                        className="bg-indigo-600 text-white h-10 px-6 rounded-lg font-bold text-sm hover:bg-indigo-700 w-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {formLoading ? '...' : <Save className="w-4 h-4" />} Salvar
                    </button>
                    <button type="button" onClick={() => setShowTeacherForm(false)} className="bg-slate-100 text-slate-500 h-10 px-4 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left">Professor</th>
                    <th className="px-6 py-4 text-left">Contato</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teachers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{t.name}</td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {t.phone}</span>
                          <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /> {t.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => deleteUser(t.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr><td colSpan="3" className="text-center py-8 text-slate-400">Nenhum professor cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA ALUNOS --- */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Gestão de Alunos</h1>
              <button onClick={() => setShowStudentForm(!showStudentForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Novo Aluno
              </button>
            </div>

            {showStudentForm && (
              <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                    <input type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                    <input type="text" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: formatPhone(e.target.value)})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="(00) 00000-0000" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Senha Inicial</label>
                    <div className="relative">
                      <Key className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                      <input type="text" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="w-full border rounded-lg pl-8 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <button 
                        type="submit" 
                        disabled={formLoading}
                        className="bg-indigo-600 text-white h-10 px-6 rounded-lg font-bold text-sm hover:bg-indigo-700 w-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {formLoading ? '...' : <Save className="w-4 h-4" />} Salvar
                    </button>
                    <button type="button" onClick={() => setShowStudentForm(false)} className="bg-slate-100 text-slate-500 h-10 px-4 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left">Aluno</th>
                    <th className="px-6 py-4 text-left">Contato</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-400">ID: {s.id.substring(0,6)}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /> {s.email}</span>
                          <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {s.phone || 'Sem telefone'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => deleteUser(s.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan="3" className="text-center py-12 text-slate-400">Nenhum aluno encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA RELATÓRIOS --- */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>
              <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setReportSubTab('attendance')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${reportSubTab === 'attendance' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Presença por Aula</button>
                <button onClick={() => setReportSubTab('students')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${reportSubTab === 'students' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Desempenho de Alunos</button>
              </div>
            </div>

            {reportSubTab === 'attendance' ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <Filter className="w-5 h-5 text-slate-400" />
                    <div className="flex items-center gap-2">
                         <label className="text-sm font-bold text-slate-600">Filtrar por Data:</label>
                         <input 
                            type="date" 
                            value={reportDate} 
                            onChange={(e) => setReportDate(e.target.value)} 
                            className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                         />
                    </div>
                </div>
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 font-bold text-slate-500">
                      <tr>
                        <th className="px-6 py-4 text-left">Hora</th>
                        <th className="px-6 py-4 text-left">Modalidade & Instrutor</th>
                        <th className="px-6 py-4 text-center">Inscritos</th>
                        <th className="px-6 py-4 text-center">Frequência</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sessions
                          .filter(session => isSameDay(parseISO(session.startTime), parseISO(reportDate)))
                          .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                          .map(session => {
                              const modality = modalities.find(m => m.id === session.modalityId);
                              const stats = getSessionStats(session.id);
                              const attendanceRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;
                              
                              return (
                                  <tr key={session.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-slate-700 flex items-center gap-2">
                                              <Clock className="w-4 h-4 text-slate-400" />
                                              {format(parseISO(session.startTime), 'HH:mm')} 
                                          </div>
                                          <div className="text-xs text-slate-400 pl-6">
                                              {session.durationMinutes} min
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="font-medium text-slate-900">{modality?.name || 'Geral'}</div>
                                          <div className="text-xs text-slate-500">{session.instructor}</div>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <span className="font-bold text-slate-700">{stats.total}</span>
                                          <span className="text-slate-400 text-xs">/{session.capacity}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col gap-1">
                                              <div className="flex text-xs justify-between font-medium">
                                                  <span className="text-green-600">{stats.attended} Presenças</span>
                                                  <span className="text-red-500">{stats.missed} Faltas</span>
                                              </div>
                                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                  <div className="bg-green-500 h-full" style={{ width: `${attendanceRate}%` }}></div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          {stats.confirmed > 0 && stats.attended === 0 && stats.missed === 0 ? (
                                               <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold uppercase">Aguardando Chamada</span>
                                          ) : stats.total === 0 ? (
                                               <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">Sem Alunos</span>
                                          ) : (
                                               <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Finalizada</span>
                                          )}
                                      </td>
                                  </tr>
                              );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 font-bold text-slate-500">
                    <tr>
                      <th className="px-6 py-4 text-left uppercase tracking-tighter text-[10px]">Aluno</th>
                      <th className="px-6 py-4 text-center uppercase tracking-tighter text-[10px]">Total Agendamentos</th>
                      <th className="px-6 py-4 text-center uppercase tracking-tighter text-[10px]">Presenças</th>
                      <th className="px-6 py-4 text-center uppercase tracking-tighter text-[10px]">Faltas</th>
                      <th className="px-6 py-4 text-center uppercase tracking-tighter text-[10px]">Aproveitamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {students.map(s => {
                      const stats = getStudentStats(s.id);
                      const percent = stats.total > 0 ? Math.round((stats.attended / (stats.attended + stats.missed || 1)) * 100) : 0;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                          <td className="px-6 py-4 text-center text-slate-600 font-bold">{stats.total}</td>
                          <td className="px-6 py-4 text-center text-green-600 font-bold">{stats.attended}</td>
                          <td className="px-6 py-4 text-center text-red-600 font-bold">{stats.missed}</td>
                          <td className="px-6 py-4 text-center font-bold">{percent}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
