
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Plus, Trash2, Edit, Calendar, Dumbbell, Users, X, FileText, 
  GraduationCap, Phone, Mail, Clock, Filter, Save, Info, 
  AlertCircle, ShieldCheck, Key, Settings, ChevronDown, ChevronUp, UserX, UserCheck, Layers, CheckSquare, Square, Copy, Menu, ChevronLeft, ChevronRight, Timer, LayoutDashboard, Search, Camera, ListPlus, CalendarDays
} from 'lucide-react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { UserRole, BookingStatus } from '../../types.js';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const AdminPanel = () => {
  const { 
    modalities, sessions, users, bookings, bookingReleaseHour, updateBookingReleaseHour,
    registerUser, updateUser, deleteUser, addModality, deleteModality, addSession, updateSession, deleteSession,
    cancelBooking, addSessionsBatch, deleteSessions, updateBookingStatus
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('reports');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // States para Formulários
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [showModalityForm, setShowModalityForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [isBatchMode, setIsBatchMode] = useState(false);

  const [teacherForm, setTeacherForm] = useState({ name: '', phone: '', email: '', password: 'mudar@123', modalityId: '' });
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', email: '', password: 'mudar@123', planType: 'Mensalista' });
  const [modalityForm, setModalityForm] = useState({ name: '', description: '', imageUrl: '' });
  
  const [sessionForm, setSessionForm] = useState({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' });
  const [batchForm, setBatchForm] = useState({
    modalityId: '', instructor: '', startDate: '', endDate: '', 
    timesString: '08:00', daysOfWeek: [1,2,3,4,5], capacity: 10, category: '', durationMinutes: 60
  });

  const [formLoading, setFormLoading] = useState(false);
  const [scheduleFilterDate, setScheduleFilterDate] = useState('');
  const [scheduleFilterModality, setScheduleFilterModality] = useState('all');
  const [selectedSessionIds, setSelectedSessionIds] = useState(new Set());
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportModality, setReportModality] = useState('all');
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: '', message: '' });

  const teachers = useMemo(() => users.filter(u => u.role === UserRole.TEACHER), [users]);
  const students = useMemo(() => users.filter(u => u.role === UserRole.STUDENT), [users]);

  const filteredScheduleSessions = useMemo(() => {
    return sessions.filter(s => {
      const dateMatch = !scheduleFilterDate || isSameDay(parseISO(s.startTime), parseISO(scheduleFilterDate));
      const modalityMatch = scheduleFilterModality === 'all' || s.modalityId === scheduleFilterModality;
      return dateMatch && modalityMatch;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [sessions, scheduleFilterDate, scheduleFilterModality]);

  const toggleDayOfWeek = (day) => {
    const newDays = batchForm.daysOfWeek.includes(day)
      ? batchForm.daysOfWeek.filter(d => d !== day)
      : [...batchForm.daysOfWeek, day];
    setBatchForm({ ...batchForm, daysOfWeek: newDays });
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const timesArray = batchForm.timesString.split(',').map(t => t.trim()).filter(t => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));
    
    if (timesArray.length === 0) {
      alert("Por favor, insira pelo menos um horário válido no formato HH:MM (ex: 08:00, 09:30)");
      setFormLoading(false);
      return;
    }

    await addSessionsBatch({ ...batchForm, times: timesArray });
    setFormLoading(false);
    setShowSessionForm(false);
    setBatchForm({ modalityId: '', instructor: '', startDate: '', endDate: '', timesString: '08:00', daysOfWeek: [1,2,3,4,5], capacity: 10, category: '', durationMinutes: 60 });
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const startTime = new Date(`${sessionForm.date}T${sessionForm.time}`).toISOString();
    if (editingSessionId) await updateSession(editingSessionId, { ...sessionForm, startTime });
    else await addSession({ ...sessionForm, startTime });
    setFormLoading(false);
    setShowSessionForm(false);
    setEditingSessionId(null);
  };

  const toggleSessionSelection = (id) => {
    const newSelection = new Set(selectedSessionIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedSessionIds(newSelection);
  };

  const selectAllFiltered = () => {
    if (selectedSessionIds.size === filteredScheduleSessions.length) setSelectedSessionIds(new Set());
    else setSelectedSessionIds(new Set(filteredScheduleSessions.map(s => s.id)));
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

  const openDeleteModal = (type, id, title, message) => setDeleteModal({ isOpen: true, type, id, title, message });

  const NavButton = ({ tabId, icon: Icon, label }) => {
    const isActive = activeTab === tabId;
    return (
      <button
        onClick={() => { setActiveTab(tabId); setIsMobileMenuOpen(false); }}
        className={`w-full group flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-all
          ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          {label}
        </span>
      </button>
    );
  };

  const getSessionStats = (sessionId) => {
      const confirmed = bookings.filter(b => b.sessionId === sessionId && b.status === BookingStatus.CONFIRMED).length;
      return { total: confirmed };
  };

  const daysLabels = [
    { id: 0, label: 'D' }, { id: 1, label: 'S' }, { id: 2, label: 'T' }, 
    { id: 3, label: 'Q' }, { id: 4, label: 'Q' }, { id: 5, label: 'S' }, { id: 6, label: 'S' }
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-x-hidden">
      <ConfirmationModal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })} 
        onConfirm={handleConfirmDelete}
        title={deleteModal.title}
        message={deleteModal.message}
      />

      <div className="md:hidden fixed bottom-6 right-6 z-[60]">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl active:scale-95 transition-all">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-[50] md:relative bg-white border-r border-slate-200 transition-all duration-300 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isSidebarCollapsed ? 'w-16' : 'w-64'} h-full`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50">
          <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}><ShieldCheck className="w-6 h-6 text-indigo-600" /><span className="font-black text-slate-800 text-lg tracking-tight">CLUBE</span></div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">{isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}</button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavButton tabId="reports" icon={FileText} label="Relatórios" />
          <NavButton tabId="schedule" icon={Calendar} label="Grade Horária" />
          <NavButton tabId="teachers" icon={GraduationCap} label="Professores" />
          <NavButton tabId="students" icon={Users} label="Alunos" />
          <NavButton tabId="modalities" icon={Dumbbell} label="Modalidades" />
          <NavButton tabId="settings" icon={Settings} label="Ajustes" />
        </nav>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-4 md:p-6">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                {activeTab === 'reports' && 'Relatórios Gerenciais'}
                {activeTab === 'schedule' && 'Gestão da Grade'}
                {activeTab === 'teachers' && 'Professores'}
                {activeTab === 'students' && 'Alunos'}
                {activeTab === 'modalities' && 'Modalidades'}
                {activeTab === 'settings' && 'Ajustes'}
              </h1>
           </div>
           
           <div className="flex gap-2 w-full md:w-auto">
              {activeTab === 'schedule' && (
                <button 
                  onClick={() => { setShowSessionForm(true); setEditingSessionId(null); }} 
                  className="w-full md:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg font-bold hover:bg-indigo-700 transition-all"
                >
                  <Plus className="w-5 h-5" /> Configurar Grade
                </button>
              )}
              {(activeTab === 'teachers' || activeTab === 'students' || activeTab === 'modalities') && (
                <button onClick={() => { if (activeTab === 'teachers') setShowTeacherForm(true); if (activeTab === 'students') setShowStudentForm(true); if (activeTab === 'modalities') setShowModalityForm(true); }} className="w-full md:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg font-bold hover:bg-indigo-700 transition-all"><Plus className="w-5 h-5" /> Novo Cadastro</button>
              )}
           </div>
        </header>

        {/* TAB: GRADE HORÁRIA - FORMULÁRIO MODERNO (INDIVIDUAL E LOTE) */}
        {activeTab === 'schedule' && showSessionForm && (
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-2xl mb-8 relative animate-in slide-in-from-top-4">
              <button onClick={() => setShowSessionForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"><X /></button>
              
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-6">
                  <button onClick={() => setIsBatchMode(false)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${!isBatchMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Aula Individual</button>
                  <button onClick={() => setIsBatchMode(true)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isBatchMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Criação em Lote</button>
              </div>

              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                {isBatchMode ? <><CalendarDays className="w-5 h-5 text-indigo-600"/> Planejamento Recorrente</> : <><Clock className="w-5 h-5 text-indigo-600"/> {editingSessionId ? 'Editar Sessão' : 'Nova Sessão Única'}</>}
              </h3>

              <form onSubmit={isBatchMode ? handleBatchSubmit : handleSessionSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modalidade</label>
                      <select 
                        value={isBatchMode ? batchForm.modalityId : sessionForm.modalityId} 
                        onChange={e => isBatchMode ? setBatchForm({...batchForm, modalityId: e.target.value}) : setSessionForm({...sessionForm, modalityId: e.target.value})} 
                        className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                        required
                      >
                          <option value="">Selecione...</option>
                          {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                  </div>
                  
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor</label>
                      <select 
                        value={isBatchMode ? batchForm.instructor : sessionForm.instructor} 
                        onChange={e => isBatchMode ? setBatchForm({...batchForm, instructor: e.target.value}) : setSessionForm({...sessionForm, instructor: e.target.value})} 
                        className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                        required
                      >
                        <option value="">Selecione...</option>
                        {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                  </div>

                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidade / Categoria</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          placeholder="Vagas" 
                          value={isBatchMode ? batchForm.capacity : sessionForm.capacity} 
                          onChange={e => isBatchMode ? setBatchForm({...batchForm, capacity: parseInt(e.target.value)}) : setSessionForm({...sessionForm, capacity: parseInt(e.target.value)})} 
                          className="w-20 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" 
                        />
                        <input 
                          type="text" 
                          placeholder="Ex: Kids" 
                          value={isBatchMode ? batchForm.category : sessionForm.category} 
                          onChange={e => isBatchMode ? setBatchForm({...batchForm, category: e.target.value}) : setSessionForm({...sessionForm, category: e.target.value})} 
                          className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" 
                        />
                      </div>
                  </div>

                  {!isBatchMode ? (
                    <>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Horário</label>
                          <div className="flex gap-2">
                            <input type="date" value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})} className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" required />
                            <input type="time" value={sessionForm.time} onChange={e => setSessionForm({...sessionForm, time: e.target.value})} className="w-24 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" required />
                          </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</label>
                          <div className="flex gap-2">
                            <input type="date" value={batchForm.startDate} onChange={e => setBatchForm({...batchForm, startDate: e.target.value})} className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" required />
                            <input type="date" value={batchForm.endDate} onChange={e => setBatchForm({...batchForm, endDate: e.target.value})} className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" required />
                          </div>
                      </div>
                      
                      <div className="lg:col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dias da Semana</label>
                          <div className="flex gap-2">
                              {daysLabels.map(day => (
                                <button 
                                  key={day.id} 
                                  type="button" 
                                  onClick={() => toggleDayOfWeek(day.id)}
                                  className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${batchForm.daysOfWeek.includes(day.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                                >
                                  {day.label}
                                </button>
                              ))}
                          </div>
                      </div>

                      <div className="lg:col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Horários <Info className="w-3 h-3" title="Separe por vírgula para múltiplos horários"/></label>
                          <input 
                            type="text" 
                            placeholder="08:00, 10:30, 14:00" 
                            value={batchForm.timesString} 
                            onChange={e => setBatchForm({...batchForm, timesString: e.target.value})} 
                            className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" 
                            required 
                          />
                      </div>
                    </>
                  )}
                  
                  <div className="lg:col-span-4 flex justify-end items-center gap-4 pt-4 border-t border-slate-50">
                      <button type="button" onClick={() => setShowSessionForm(false)} className="text-slate-400 font-bold text-xs uppercase tracking-widest px-4 py-2">Cancelar</button>
                      <button type="submit" disabled={formLoading} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
                        {formLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-5 h-5"/>}
                        {editingSessionId ? 'ATUALIZAR' : 'GERAR GRADE'}
                      </button>
                  </div>
              </form>
          </div>
        )}

        {/* TAB: GRADE HORÁRIA - TABELA E FILTROS */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <input type="date" value={scheduleFilterDate} onChange={e => setScheduleFilterDate(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0" />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <Dumbbell className="w-4 h-4 text-slate-400" />
                    <select value={scheduleFilterModality} onChange={e => setScheduleFilterModality(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0">
                      <option value="all">Todas Modalidades</option>
                      {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                {selectedSessionIds.size > 0 && (
                  <div className="md:ml-auto flex items-center gap-2 w-full md:w-auto">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 flex-grow text-center">{selectedSessionIds.size} SELECIONADOS</span>
                    <button onClick={() => openDeleteModal('bulk_delete', Array.from(selectedSessionIds), 'Excluir Selecionados', `Deseja excluir ${selectedSessionIds.size} aulas?`)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-red-600">EXCLUIR</button>
                  </div>
                )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                          <tr>
                            <th className="px-6 py-4 text-left w-10">
                              <button onClick={selectAllFiltered}>{selectedSessionIds.size === filteredScheduleSessions.length ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-200" />}</button>
                            </th>
                            <th className="px-6 py-4 text-left">Início</th>
                            <th className="px-6 py-4 text-left">Modalidade / Professor</th>
                            <th className="px-6 py-4 text-center">Vagas</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredScheduleSessions.map(s => (
                                <tr key={s.id} className={`hover:bg-indigo-50/30 transition-colors ${selectedSessionIds.has(s.id) ? 'bg-indigo-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                      <button onClick={() => toggleSessionSelection(s.id)} className={selectedSessionIds.has(s.id) ? 'text-indigo-600' : 'text-slate-200'}>
                                        {selectedSessionIds.has(s.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                      </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-slate-900">
                                      <span className="text-indigo-600">{format(parseISO(s.startTime), 'HH:mm')}</span>
                                      <span className="text-[10px] text-slate-400 block font-bold mt-0.5">{format(parseISO(s.startTime), 'dd/MM/yyyy')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-slate-700">{modalities.find(m => m.id === s.modalityId)?.name}</p>
                                        {s.category && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">{s.category}</span>}
                                      </div>
                                      <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1">{s.instructor}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">{s.capacity}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                      <button onClick={() => { setEditingSessionId(s.id); setShowSessionForm(true); setIsBatchMode(false); setSessionForm({ modalityId: s.modalityId, instructor: s.instructor, date: format(parseISO(s.startTime), 'yyyy-MM-dd'), time: format(parseISO(s.startTime), 'HH:mm'), capacity: s.capacity, category: s.category || '' }); }} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                      <button onClick={() => openDeleteModal('session', s.id, 'Excluir Aula', 'Deseja remover esta aula da grade permanentemente?')} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

        {/* TAB: PROFESSORES */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            {showTeacherForm && (
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl relative animate-in slide-in-from-top-4">
                    <button onClick={() => setShowTeacherForm(false)} className="absolute top-4 right-4 text-slate-400 p-1"><X /></button>
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-indigo-600" /> {editingTeacherId ? 'Editar Professor' : 'Novo Professor'}</h3>
                    <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</label><input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-3 text-sm font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modalidade Principal</label><select value={teacherForm.modalityId} onChange={e => setTeacherForm({...teacherForm, modalityId: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-3 text-sm font-bold" required><option value="">Selecione...</option>{modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</label><input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: formatPhone(e.target.value)})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-3 text-sm font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Login)</label><input type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-3 text-sm font-bold" required /></div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-50"><button type="submit" className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black shadow-md hover:bg-indigo-700">SALVAR</button></div>
                    </form>
                </div>
            )}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><tr><th className="px-6 py-4 text-left">Professor</th><th className="px-6 py-4 text-left">Modalidade</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {teachers.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-black text-slate-800 text-sm">{t.name}</td><td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{modalities.find(m => m.id === t.modalityId)?.name || 'N/A'}</span></td><td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={() => { setEditingTeacherId(t.id); setTeacherForm(t); setShowTeacherForm(true); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit className="w-4 h-4" /></button><button onClick={() => openDeleteModal('user', t.id, 'Excluir Professor', `Remover professor ${t.name}?`)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* TAB: RELATÓRIOS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Filtrar por Dia</label>
                  <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Filtrar por Modalidade</label>
                  <select value={reportModality} onChange={(e) => setReportModality(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold">
                    <option value="all">Todas as Modalidades</option>
                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.filter(s => isSameDay(parseISO(s.startTime), parseISO(reportDate)) && (reportModality === 'all' || s.modalityId === reportModality)).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(s => {
                  const stats = getSessionStats(s.id);
                  const isExpanded = expandedSessionId === s.id;
                  const confirmedBookings = bookings.filter(b => b.sessionId === s.id && b.status !== BookingStatus.WAITLIST);
                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div onClick={() => setExpandedSessionId(isExpanded ? null : s.id)} className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-4">
                          <div className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-lg">{format(parseISO(s.startTime), 'HH:mm')}</div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm leading-none uppercase">{modalities.find(m => m.id === s.modalityId)?.name}</h3>
                            <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1.5">{s.instructor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-black text-indigo-600 leading-none">{stats.total}/{s.capacity}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Alunos</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-slate-100 p-4 space-y-2 max-h-60 overflow-y-auto">
                            {confirmedBookings.length > 0 ? confirmedBookings.map(b => {
                                const student = users.find(u => u.id === b.userId);
                                return (
                                    <div key={b.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                      <span className="text-xs font-black text-slate-700 uppercase">{student?.name}</span>
                                      <button onClick={() => openDeleteModal('cancel_booking', b.id, 'Remover Aluno', `Remover ${student?.name} da lista desta aula?`)} className="text-red-400 hover:text-red-600 p-1.5 transition-colors"><X className="w-4 h-4"/></button>
                                    </div>
                                );
                            }) : (
                              <p className="text-center text-[10px] font-black text-slate-300 uppercase py-4">Nenhum aluno inscrito</p>
                            )}
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>
          </div>
        )}

        {/* ... Resto das abas mantido ... */}
      </main>
    </div>
  );
};
