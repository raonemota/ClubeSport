
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Plus, Trash2, Calendar, Dumbbell, Users, X, Edit2, FileText, ClipboardList, GraduationCap, Phone, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { UserRole, BookingStatus } from '../../types.js';

export const AdminPanel = () => {
  const { modalities, sessions, users, bookings, registerUser, updateUser, deleteUser, getStudentStats } = useStore();
  const [activeTab, setActiveTab] = useState('reports');
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: '', phone: '', email: '', mainModality: '' });
  const [reportSubTab, setReportSubTab] = useState('attendance'); // 'attendance' or 'students'

  const teachers = users.filter(u => u.role === UserRole.TEACHER);
  const students = users.filter(u => u.role === UserRole.STUDENT);

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    await registerUser(teacherForm, UserRole.TEACHER);
    setTeacherForm({ name: '', phone: '', email: '', mainModality: '' });
    setShowTeacherForm(false);
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
                <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Nome Completo</label>
                    <input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Prof. Carlos" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Telefone</label>
                    <input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="(00) 00000-0000" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">E-mail</label>
                    <input type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="professor@clube.com" required />
                  </div>
                  <div className="flex items-end gap-2">
                    <button type="submit" className="bg-indigo-600 text-white h-10 px-6 rounded-lg font-bold text-sm hover:bg-indigo-700 w-full transition-colors">Salvar Cadastro</button>
                    <button type="button" onClick={() => setShowTeacherForm(false)} className="bg-slate-100 text-slate-500 h-10 px-4 rounded-lg"><X /></button>
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
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <p className="text-slate-500 text-sm mb-4">Selecione uma aula no histórico para ver a lista de presença detalhada.</p>
                {/* Aqui ficaria a listagem de aulas já existente, filtrando presenças */}
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 font-bold text-slate-500">
                    <tr>
                      <th className="px-6 py-4 text-left uppercase tracking-tighter text-[10px]">Aluno</th>
                      <th className="px-6 py-4 text-center uppercase tracking-tighter text-[10px]">Total Agendamentos</th>
                      <th className="px-6 py-4 text-center uppercase tracking-tighter text-[10px]">Presenças (Check)</th>
                      <th className="px-6 py-4 text-center uppercase tracking-tighter text-[10px]">Faltas (F)</th>
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
                          <td className="px-6 py-4 text-center">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{stats.attended}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{stats.missed}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className={`h-full ${percent > 70 ? 'bg-green-500' : 'bg-orange-400'}`} style={{width: `${percent}%`}}></div>
                              </div>
                              <span className="font-bold text-xs">{percent}%</span>
                            </div>
                          </td>
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
