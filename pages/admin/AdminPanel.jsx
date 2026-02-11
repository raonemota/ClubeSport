
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Plus, Trash2, Edit, Calendar, Dumbbell, Users, X, FileText, 
  GraduationCap, Phone, Mail, Clock, Filter, Save, Info, 
  AlertCircle, ShieldCheck, Key, Settings, ChevronDown, ChevronUp, UserX, UserCheck, Layers, CheckSquare, Square, Copy, Menu, ChevronLeft, ChevronRight, Timer, LayoutDashboard
} from 'lucide-react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { UserRole, BookingStatus } from '../../types.js';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const AdminPanel = () => {
  const { 
    modalities, sessions, users, bookings, bookingReleaseHour, updateBookingReleaseHour,
    registerUser, updateUser, deleteUser, getStudentStats, addModality, deleteModality, addSession, updateSession, deleteSession,
    cancelBooking, addSessionsBatch, deleteSessions, updateBookingStatus
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('reports');
  
  // Controle do Menu Retrátil
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // States para Formulários
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: '', phone: '', email: '', password: 'mudar@123', modalityId: '' });
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', email: '', password: 'mudar@123', planType: 'Mensalista' });
  const [formLoading, setFormLoading] = useState(false);
  
  const [showModalityForm, setShowModalityForm] = useState(false);
  const [modalityForm, setModalityForm] = useState({ name: '', description: '', imageUrl: '' });

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [sessionForm, setSessionForm] = useState({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' });
  
  const [batchForm, setBatchForm] = useState({
    modalityId: '', instructor: '', startDate: '', endDate: '', 
    times: ['08:00'], daysOfWeek: [], capacity: 10, category: '', durationMinutes: 60
  });

  const [scheduleFilterDate, setScheduleFilterDate] = useState('');
  const [scheduleFilterModality, setScheduleFilterModality] = useState('all');
  const [selectedSessionIds, setSelectedSessionIds] = useState(new Set());

  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportModality, setReportModality] = useState('all');
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });

  const teachers = users.filter(u => u.role === UserRole.TEACHER);
  const students = users.filter(u => u.role === UserRole.STUDENT);

  const filteredScheduleSessions = useMemo(() => {
    return sessions.filter(s => {
      const dateMatch = !scheduleFilterDate || isSameDay(parseISO(s.startTime), parseISO(scheduleFilterDate));
      const modalityMatch = scheduleFilterModality === 'all' || s.modalityId === scheduleFilterModality;
      return dateMatch && modalityMatch;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [sessions, scheduleFilterDate, scheduleFilterModality]);

  const toggleSessionSelection = (id) => {
    const newSelection = new Set(selectedSessionIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedSessionIds(newSelection);
  };

  const selectAllFiltered = () => {
    if (selectedSessionIds.size === filteredScheduleSessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(filteredScheduleSessions.map(s => s.id)));
    }
  };

  const handleDeleteSelected = () => {
    openDeleteModal('bulk_delete', Array.from(selectedSessionIds), 'Excluir Selecionados', `Deseja excluir permanentemente as ${selectedSessionIds.size} aulas selecionadas?`);
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteModal;
    if (type === 'session') await deleteSession(id);
    else if (type === 'bulk_delete') { await deleteSessions(id); setSelectedSessionIds(new Set()); }
    else if (type === 'modality') await deleteModality(id);
    else if (type === 'user') await deleteUser(id);
    else if (type === 'cancel_booking') await cancelBooking(id);
    setDeleteModal({ isOpen: false, type: null, id: null, title: '', message: '' });
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    await addSessionsBatch(batchForm);
    setFormLoading(false);
    setShowSessionForm(false);
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    const startTime = new Date(`${sessionForm.date}T${sessionForm.time}`).toISOString();
    if (editingSessionId) await updateSession(editingSessionId, { ...sessionForm, startTime });
    else await addSession({ ...sessionForm, startTime });
    setShowSessionForm(false);
    setEditingSessionId(null);
  };

  const openDeleteModal = (type, id, title, message) => setDeleteModal({ isOpen: true, type, id, title, message });

  const NavButton = ({ tabId, icon: Icon, label }) => {
    const isActive = activeTab === tabId;
    return (
      <button
        onClick={() => { setActiveTab(tabId); setIsMobileMenuOpen(false); }}
        className={`w-full group flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all relative
          ${isActive 
            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
            : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        title={isSidebarCollapsed ? label : ''}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          {label}
        </span>
        {isActive && isSidebarCollapsed && (
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-600 rounded-l-full" />
        )}
      </button>
    );
  };

  const getSessionStats = (sessionId) => {
      const confirmed = bookings.filter(b => b.sessionId === sessionId && b.status === BookingStatus.CONFIRMED).length;
      const waitlist = bookings.filter(b => b.sessionId === sessionId && b.status === BookingStatus.WAITLIST).length;
      const cancelled = bookings.filter(b => b.sessionId === sessionId && (b.status === BookingStatus.CANCELLED || b.status === 'CANCELLED_BY_ADMIN')).length;
      return { total: confirmed, waitlist, cancelled };
  };

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-x-hidden">
      <ConfirmationModal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })} 
        onConfirm={handleConfirmDelete}
        title={deleteModal.title}
        message={deleteModal.message}
      />

      {/* Botão de Menu Flutuante (Mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
      </div>

      {/* Backdrop Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[40] md:hidden transition-opacity animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Retrátil / Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-[45] md:relative
        bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'w-20' : 'w-72'}
        h-full
      `}>
        {/* Logo / Header Sidebar */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto'}`}>
             <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <ShieldCheck className="w-5 h-5 text-white" />
             </div>
             <span className="font-black text-slate-800 tracking-tighter text-xl">DASHBOARD</span>
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
             <X className="w-6 h-6" />
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          <p className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4 ${isSidebarCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
             Principal
          </p>
          <NavButton tabId="reports" icon={FileText} label="Relatórios" />
          <NavButton tabId="schedule" icon={Calendar} label="Grade Horária" />
          
          <div className="py-4">
             <div className="border-t border-slate-100" />
          </div>
          
          <p className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4 ${isSidebarCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
             Gestão
          </p>
          <NavButton tabId="teachers" icon={GraduationCap} label="Professores" />
          <NavButton tabId="students" icon={Users} label="Alunos" />
          <NavButton tabId="modalities" icon={Dumbbell} label="Modalidades" />
          
          <div className="py-4">
             <div className="border-t border-slate-100" />
          </div>
          <NavButton tabId="settings" icon={Settings} label="Ajustes" />
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-50">
           <div className={`bg-slate-50 rounded-2xl p-4 transition-all duration-300 ${isSidebarCollapsed ? 'items-center px-0' : 'items-start'}`}>
              <LayoutDashboard className={`w-5 h-5 text-indigo-400 mb-2 ${isSidebarCollapsed ? 'mx-auto' : ''}`} />
              {!isSidebarCollapsed && (
                <>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Versão Sistema</p>
                  <p className="text-xs font-bold text-slate-600">v2.5.4 Build 88</p>
                </>
              )}
           </div>
        </div>
      </aside>

      {/* Conteúdo Principal Dinâmico */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-4 md:p-8 lg:p-10">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="animate-in slide-in-from-left duration-500">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {activeTab === 'reports' && 'Relatórios Gerenciais'}
                {activeTab === 'schedule' && 'Grade de Horários'}
                {activeTab === 'teachers' && 'Gestão de Professores'}
                {activeTab === 'students' && 'Gestão de Alunos'}
                {activeTab === 'modalities' && 'Modalidades Ativas'}
                {activeTab === 'settings' && 'Ajustes do App'}
              </h1>
              <p className="text-slate-400 font-medium text-sm md:text-base">Bem-vindo ao painel administrativo do ClubeSport.</p>
           </div>
           
           {activeTab === 'schedule' && (
              <div className="flex gap-2 w-full md:w-auto animate-in slide-in-from-right duration-500">
                  <button 
                    onClick={() => { setEditingSessionId(null); setShowSessionForm(true); setIsBatchMode(true); }} 
                    className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm transition-all font-bold text-sm"
                  >
                    <Copy className="w-4 h-4" /> Em Lote
                  </button>
                  <button 
                    onClick={() => { setEditingSessionId(null); setShowSessionForm(true); setIsBatchMode(false); setSessionForm({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' }); }} 
                    className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" /> Nova Aula
                  </button>
              </div>
           )}
        </header>

        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* Filtros */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <input 
                        type="date" 
                        value={scheduleFilterDate} 
                        onChange={e => setScheduleFilterDate(e.target.value)}
                        className="bg-transparent border-none p-0 text-sm focus:ring-0 font-bold text-slate-700"
                    />
                </div>
                <select 
                    value={scheduleFilterModality} 
                    onChange={e => setScheduleFilterModality(e.target.value)}
                    className="border-slate-100 bg-slate-50 rounded-2xl px-4 py-2.5 text-sm focus:ring-indigo-500 w-full md:w-56 font-bold text-slate-600"
                >
                    <option value="all">Todas Modalidades</option>
                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                
                {selectedSessionIds.size > 0 && (
                    <div className="md:ml-auto flex items-center gap-3 w-full md:w-auto animate-in zoom-in duration-300">
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-2xl border border-indigo-100 flex-1 md:flex-none text-center">
                            {selectedSessionIds.size} SELECIONADOS
                        </span>
                        <button 
                            onClick={handleDeleteSelected}
                            className="bg-red-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black hover:bg-red-600 flex items-center justify-center gap-2 shadow-lg shadow-red-100 flex-1 md:flex-none"
                        >
                            <Trash2 className="w-4 h-4" /> EXCLUIR
                        </button>
                    </div>
                )}
            </div>

            {showSessionForm && (
              <div className="bg-white p-8 rounded-3xl border-2 border-indigo-50 shadow-2xl animate-in slide-in-from-top-4 duration-500 relative">
                 <button onClick={() => setShowSessionForm(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><X /></button>
                 <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                    {isBatchMode ? <><Copy className="w-6 h-6 text-indigo-600" /> Planejamento em Lote</> : <><Calendar className="w-6 h-6 text-indigo-600" /> {editingSessionId ? 'Editar Sessão' : 'Nova Sessão Avulsa'}</>}
                 </h3>

                 {isBatchMode ? (
                   <form onSubmit={handleBatchSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">Modalidade</label>
                              <select 
                                  value={batchForm.modalityId} 
                                  onChange={e => setBatchForm({...batchForm, modalityId: e.target.value})} 
                                  className="w-full border-slate-100 bg-slate-50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 font-bold" 
                                  required
                              >
                                  <option value="">Selecione...</option>
                                  {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">Professor</label>
                              <select 
                                  value={batchForm.instructor} 
                                  onChange={e => setBatchForm({...batchForm, instructor: e.target.value})} 
                                  className="w-full border-slate-100 bg-slate-50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 font-bold" 
                                  required
                                  disabled={!batchForm.modalityId}
                              >
                                  <option value="">{batchForm.modalityId ? 'Selecionar...' : 'Aguardando modalidade'}</option>
                                  {teachers.filter(t => t.modalityId === batchForm.modalityId).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">Início</label>
                              <input type="date" value={batchForm.startDate} onChange={e => setBatchForm({...batchForm, startDate: e.target.value})} className="w-full border-slate-100 bg-slate-50 rounded-2xl p-3.5 text-sm font-bold" required />
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">Fim</label>
                              <input type="date" value={batchForm.endDate} onChange={e => setBatchForm({...batchForm, endDate: e.target.value})} className="w-full border-slate-100 bg-slate-50 rounded-2xl p-3.5 text-sm font-bold" required />
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-8">
                         <button type="button" onClick={() => setShowSessionForm(false)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                         <button type="submit" disabled={formLoading} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700">
                           {formLoading ? 'Gerando...' : 'GERAR GRADE'}
                         </button>
                      </div>
                   </form>
                 ) : (
                    <form onSubmit={handleSessionSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <select value={sessionForm.modalityId} onChange={e => setSessionForm({...sessionForm, modalityId: e.target.value})} className="w-full border-slate-100 bg-slate-50 rounded-2xl p-3.5 text-sm font-bold" required>
                              <option value="">Modalidade...</option>
                              {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          <input type="date" value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})} className="w-full border-slate-100 bg-slate-50 rounded-2xl p-3.5 text-sm font-bold" required />
                          <input type="time" value={sessionForm.time} onChange={e => setSessionForm({...sessionForm, time: e.target.value})} className="w-full border-slate-100 bg-slate-50 rounded-2xl p-3.5 text-sm font-bold" required />
                      </div>
                      <div className="flex justify-end gap-3">
                         <button type="button" onClick={() => setShowSessionForm(false)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                         <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100">SALVAR</button>
                      </div>
                    </form>
                 )}
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50">
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-8 py-6 text-left w-12">
                          <button onClick={selectAllFiltered} className="text-slate-300 hover:text-indigo-600">
                              {selectedSessionIds.size === filteredScheduleSessions.length && filteredScheduleSessions.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>
                      </th>
                      <th className="px-6 py-6 text-left">Horário</th>
                      <th className="px-6 py-6 text-left">Atividade</th>
                      <th className="px-6 py-6 text-left hidden lg:table-cell">Professor</th>
                      <th className="px-6 py-6 text-center">Inscritos</th>
                      <th className="px-8 py-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredScheduleSessions.map(s => {
                      const m = modalities.find(mod => mod.id === s.modalityId);
                      const isSelected = selectedSessionIds.has(s.id);
                      return (
                        <tr key={s.id} className={`hover:bg-indigo-50/30 transition-colors text-sm ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-8 py-5">
                              <button onClick={() => toggleSessionSelection(s.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-200 hover:text-indigo-400'}`}>
                                  {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </button>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex flex-col">
                               <span className="font-black text-slate-900 text-base">{format(parseISO(s.startTime), 'HH:mm')}</span>
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{format(parseISO(s.startTime), 'dd MMM')}</span>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                              <div className="flex flex-col">
                                  <span className="font-bold text-slate-700">{m?.name}</span>
                                  {s.category && <span className="text-[9px] text-indigo-500 font-black uppercase bg-indigo-50 px-2 py-0.5 rounded-lg w-fit mt-1">{s.category}</span>}
                              </div>
                          </td>
                          <td className="px-6 py-5 text-slate-500 hidden lg:table-cell font-medium">{s.instructor}</td>
                          <td className="px-6 py-5 text-center">
                              <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl text-xs">{s.capacity} VAGAS</span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => {
                                      setEditingSessionId(s.id);
                                      const d = parseISO(s.startTime);
                                      setSessionForm({
                                          modalityId: s.modalityId,
                                          instructor: s.instructor,
                                          date: format(d, 'yyyy-MM-dd'),
                                          time: format(d, 'HH:mm'),
                                          durationMinutes: s.duration_minutes,
                                          capacity: s.capacity,
                                          category: s.category || ''
                                      });
                                      setIsBatchMode(false);
                                      setShowSessionForm(true);
                                  }} 
                                  className="p-2.5 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => openDeleteModal('session', s.id, 'Excluir Aula', `Confirmar exclusão desta aula?`)} 
                                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredScheduleSessions.length === 0 && (
                <div className="py-24 text-center">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-100" />
                    <p className="font-bold text-slate-300">Nenhum registro para esta data ou filtro.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center gap-8">
                <div className="flex flex-col gap-2 flex-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Filtrar por Dia
                     </label>
                     <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100" />
                </div>

                <div className="flex flex-col gap-2 flex-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" /> Por Modalidade
                     </label>
                     <select 
                        value={reportModality} 
                        onChange={(e) => setReportModality(e.target.value)}
                        className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100"
                     >
                        <option value="all">Todas</option>
                        {modalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                     </select>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {sessions
                .filter(s => isSameDay(parseISO(s.startTime), parseISO(reportDate)) && (reportModality === 'all' || s.modalityId === reportModality))
                .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map(s => {
                  const stats = getSessionStats(s.id);
                  const isExpanded = expandedSessionId === s.id;
                  const confirmedBookings = bookings.filter(b => b.sessionId === s.id && b.status !== BookingStatus.WAITLIST);
                  const waitlistBookings = bookings.filter(b => b.sessionId === s.id && b.status === BookingStatus.WAITLIST).sort((a,b) => new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime());
                  const modality = modalities.find(m => m.id === s.modalityId);
                  
                  return (
                    <div key={s.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-indigo-100">
                      <div 
                        onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                        className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
                      >
                        <div className="flex items-center gap-6">
                          <div className="bg-indigo-600 text-white w-16 h-16 rounded-[1.25rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-100">
                            {format(parseISO(s.startTime), 'HH:mm')}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-xl leading-none">{modality?.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.instructor}</span>
                                {s.category && <span className="w-1 h-1 bg-slate-200 rounded-full" />}
                                {s.category && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{s.category}</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between md:justify-end gap-10 border-t md:border-t-0 pt-6 md:pt-0">
                          <div className="text-center">
                            <p className="text-2xl font-black text-indigo-600 leading-none">{stats.total}/{s.capacity}</p>
                            <p className="text-[10px] uppercase font-black text-slate-400 mt-1">Presenças</p>
                          </div>
                          {stats.waitlist > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-black text-orange-500 leading-none">{stats.waitlist}</p>
                              <p className="text-[10px] uppercase font-black text-slate-400 mt-1">NaFila</p>
                            </div>
                          )}
                          <div className={`p-2.5 rounded-2xl transition-all ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                             {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500">
                          <div className="p-4 md:p-6 space-y-6">
                            {/* Alunos Confirmados */}
                            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase px-6 py-4 bg-slate-50/50 border-b border-slate-50 tracking-widest">Inscritos com Vaga</h4>
                                <div className="divide-y divide-slate-50">
                                    {confirmedBookings.length > 0 ? confirmedBookings.map(b => {
                                        const student = users.find(u => u.id === b.userId);
                                        const isCancelled = b.status.includes('CANCELLED');
                                        return (
                                            <div key={b.id} className={`px-6 py-4 flex items-center justify-between transition-all ${isCancelled ? 'grayscale opacity-50 bg-red-50/10' : 'hover:bg-slate-50'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white ${isCancelled ? 'bg-slate-400' : 'bg-indigo-500'}`}>
                                                      {student?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                      <p className={`text-sm font-black ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>{student?.name}</p>
                                                      <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{student?.planType}</span>
                                                    </div>
                                                </div>
                                                {!isCancelled && (
                                                  <button onClick={() => updateBookingStatus(b.id, BookingStatus.CANCELLED)} className="p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all">
                                                    <UserX className="w-5 h-5" />
                                                  </button>
                                                )}
                                            </div>
                                        );
                                    }) : <p className="p-10 text-center text-sm text-slate-300 font-bold uppercase tracking-widest">Nenhuma vaga preenchida</p>}
                                </div>
                            </div>

                            {/* Lista de Espera */}
                            {waitlistBookings.length > 0 && (
                                <div className="bg-orange-50/30 rounded-[1.5rem] border border-orange-100/50 overflow-hidden">
                                    <h4 className="text-[10px] font-black text-orange-400 uppercase px-6 py-4 border-b border-orange-50 flex items-center gap-2 tracking-widest">
                                      <Timer className="w-3.5 h-3.5" /> Fila de Espera Automática
                                    </h4>
                                    <div className="divide-y divide-orange-50">
                                        {waitlistBookings.map((b, idx) => {
                                            const student = users.find(u => u.id === b.userId);
                                            return (
                                                <div key={b.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/80 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-orange-600 bg-orange-100/80">#{idx + 1}</div>
                                                        <div>
                                                          <p className="text-sm font-black text-slate-800">{student?.name}</p>
                                                          <p className="text-[10px] text-orange-400 font-black">{student?.phone}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => updateBookingStatus(b.id, BookingStatus.CANCELLED)} className="p-2.5 rounded-xl text-red-400 hover:bg-red-50 transition-all">
                                                      <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
