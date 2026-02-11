
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Plus, Trash2, Edit, Calendar, Dumbbell, Users, X, FileText, 
  GraduationCap, Phone, Mail, Clock, Filter, Save, Info, 
  AlertCircle, ShieldCheck, Key, Settings, ChevronDown, ChevronUp, UserX, UserCheck, Layers, CheckSquare, Square, Copy, Menu, ChevronLeft, ChevronRight, Timer, LayoutDashboard, Search, Camera
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
  const [editingStudentId, setEditingStudentId] = useState(null);
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

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    if (editingTeacherId) {
        await updateUser(editingTeacherId, teacherForm);
    } else {
        await registerUser(teacherForm, UserRole.TEACHER);
    }
    setFormLoading(false);
    setShowTeacherForm(false);
    setEditingTeacherId(null);
    setTeacherForm({ name: '', phone: '', email: '', password: 'mudar@123', modalityId: '' });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    if (editingStudentId) {
        await updateUser(editingStudentId, studentForm);
    } else {
        await registerUser(studentForm, UserRole.STUDENT);
    }
    setFormLoading(false);
    setShowStudentForm(false);
    setEditingStudentId(null);
    setStudentForm({ name: '', phone: '', email: '', password: 'mudar@123', planType: 'Mensalista' });
  };

  const handleModalitySubmit = async (e) => {
    e.preventDefault();
    await addModality(modalityForm);
    setShowModalityForm(false);
    setModalityForm({ name: '', description: '', imageUrl: '' });
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

  const formatPhone = (value) => {
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length === 11) return value.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (value.length > 6) return value.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (value.length > 2) return value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    if (value.length > 0) return value.replace(/^(\d*)/, "($1");
    return value;
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
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto'}`}>
             <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <ShieldCheck className="w-5 h-5 text-white" />
             </div>
             <span className="font-black text-slate-800 tracking-tighter text-xl">DASHBOARD</span>
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2 hover:bg-slate-100 rounded-xl text-slate-400">
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          <NavButton tabId="reports" icon={FileText} label="Relatórios" />
          <NavButton tabId="schedule" icon={Calendar} label="Grade Horária" />
          <NavButton tabId="teachers" icon={GraduationCap} label="Professores" />
          <NavButton tabId="students" icon={Users} label="Alunos" />
          <NavButton tabId="modalities" icon={Dumbbell} label="Modalidades" />
          <NavButton tabId="settings" icon={Settings} label="Ajustes" />
        </nav>
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
           </div>
           
           {(activeTab === 'teachers' || activeTab === 'students' || activeTab === 'modalities') && (
              <button 
                onClick={() => {
                    if (activeTab === 'teachers') { setEditingTeacherId(null); setShowTeacherForm(true); }
                    if (activeTab === 'students') { setEditingStudentId(null); setShowStudentForm(true); }
                    if (activeTab === 'modalities') setShowModalityForm(true);
                }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-indigo-100 font-bold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" /> Novo Cadastro
              </button>
           )}
        </header>

        {/* TAB: RELATÓRIOS */}
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
                        {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                    <div key={s.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-lg">
                      <div onClick={() => setExpandedSessionId(isExpanded ? null : s.id)} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer">
                        <div className="flex items-center gap-6">
                          <div className="bg-indigo-600 text-white w-16 h-16 rounded-[1.25rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-100">{format(parseISO(s.startTime), 'HH:mm')}</div>
                          <div>
                            <h3 className="font-black text-slate-800 text-xl leading-none">{modality?.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">{s.instructor}</span>
                                {s.category && <span className="text-[10px] font-black text-indigo-500 uppercase">| {s.category}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-10">
                          <div className="text-center">
                            <p className="text-2xl font-black text-indigo-600 leading-none">{stats.total}/{s.capacity}</p>
                            <p className="text-[10px] uppercase font-black text-slate-400 mt-1">Presenças</p>
                          </div>
                          {stats.waitlist > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-black text-orange-500 leading-none">{stats.waitlist}</p>
                              <p className="text-[10px] uppercase font-black text-slate-400 mt-1">Fila</p>
                            </div>
                          )}
                          <div className={`p-2.5 rounded-2xl transition-all ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                             {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500 p-6">
                            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                                {confirmedBookings.length > 0 ? confirmedBookings.map(b => {
                                    const student = users.find(u => u.id === b.userId);
                                    return (
                                        <div key={b.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">{student?.name?.charAt(0)}</div>
                                                <div><p className="text-sm font-black text-slate-800">{student?.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{student?.planType}</p></div>
                                            </div>
                                            <button onClick={() => updateBookingStatus(b.id, BookingStatus.CANCELLED)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl"><UserX className="w-5 h-5" /></button>
                                        </div>
                                    );
                                }) : <p className="p-10 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Nenhuma presença registrada</p>}
                            </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB: GRADE HORÁRIA */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-in fade-in duration-700">
             {/* Conteúdo de Grade Horária restaurado aqui */}
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-50">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-8 py-6 text-left w-12"><button onClick={selectAllFiltered} className="text-slate-300">{selectedSessionIds.size === filteredScheduleSessions.length ? <CheckSquare /> : <Square />}</button></th>
                                <th className="px-6 py-6 text-left">Horário</th>
                                <th className="px-6 py-6 text-left">Atividade</th>
                                <th className="px-6 py-6 text-center">Vagas</th>
                                <th className="px-8 py-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredScheduleSessions.map(s => (
                                <tr key={s.id} className="hover:bg-indigo-50/30">
                                    <td className="px-8 py-5"><button onClick={() => toggleSessionSelection(s.id)} className={selectedSessionIds.has(s.id) ? 'text-indigo-600' : 'text-slate-200'}>{selectedSessionIds.has(s.id) ? <CheckSquare /> : <Square />}</button></td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 text-base">{format(parseISO(s.startTime), 'HH:mm')}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(s.startTime), 'dd MMM')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{modalities.find(m => m.id === s.modalityId)?.name}</span>
                                            <span className="text-[10px] text-indigo-500 font-black uppercase">{s.instructor}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center font-black text-indigo-600 bg-indigo-50/50 rounded-xl">{s.capacity}</td>
                                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                                        <button onClick={() => { setEditingSessionId(s.id); setShowSessionForm(true); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit className="w-5 h-5" /></button>
                                        <button onClick={() => openDeleteModal('session', s.id, 'Excluir Aula', 'Confirmar exclusão?')} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
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
          <div className="space-y-6 animate-in fade-in duration-700">
            {showTeacherForm && (
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-50 shadow-2xl relative">
                    <button onClick={() => setShowTeacherForm(false)} className="absolute top-6 right-6 text-slate-400 hover:bg-slate-50 p-2 rounded-xl"><X /></button>
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><GraduationCap className="text-indigo-600" /> {editingTeacherId ? 'Editar Professor' : 'Novo Professor'}</h3>
                    <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nome Completo</label><input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Modalidade Principal</label><select value={teacherForm.modalityId} onChange={e => setTeacherForm({...teacherForm, modalityId: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" required><option value="">Selecione...</option>{modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</label><input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: formatPhone(e.target.value)})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Email</label><input type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" required /></div>
                        <div className="md:col-span-2 flex justify-end gap-3"><button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100">SALVAR PROFESSOR</button></div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-50">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase"><tr><th className="px-8 py-6 text-left">Instrutor</th><th className="px-6 py-6 text-left">Modalidade</th><th className="px-6 py-6 text-left">Contato</th><th className="px-8 py-6 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {teachers.map(t => (
                            <tr key={t.id} className="hover:bg-indigo-50/30">
                                <td className="px-8 py-5 font-black text-slate-800">{t.name}</td>
                                <td className="px-6 py-5"><span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl text-xs font-bold uppercase">{modalities.find(m => m.id === t.modalityId)?.name || 'N/A'}</span></td>
                                <td className="px-6 py-5"><div className="flex flex-col text-xs text-slate-400"><span>{t.email}</span><span>{t.phone}</span></div></td>
                                <td className="px-8 py-5 text-right"><button onClick={() => { setEditingTeacherId(t.id); setTeacherForm(t); setShowTeacherForm(true); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit className="w-5 h-5" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* TAB: ALUNOS */}
        {activeTab === 'students' && (
          <div className="space-y-6 animate-in fade-in duration-700">
             {showStudentForm && (
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-50 shadow-2xl relative">
                    <button onClick={() => setShowStudentForm(false)} className="absolute top-6 right-6 text-slate-400 hover:bg-slate-50 p-2 rounded-xl"><X /></button>
                    <h3 className="text-xl font-black text-slate-800 mb-6">Novo Aluno</h3>
                    <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nome Completo</label><input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Email</label><input type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Telefone</label><input type="text" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: formatPhone(e.target.value)})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Plano</label><select value={studentForm.planType} onChange={e => setStudentForm({...studentForm, planType: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold"><option value="Mensalista">Mensalista</option><option value="Totalpass">Totalpass</option><option value="Wellhub">Wellhub</option></select></div>
                        <div className="md:col-span-2 flex justify-end"><button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black">CADASTRAR ALUNO</button></div>
                    </form>
                </div>
            )}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-50">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase"><tr><th className="px-8 py-6 text-left">Aluno</th><th className="px-6 py-6 text-left">Email</th><th className="px-6 py-6 text-center">Plano</th><th className="px-8 py-6 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {students.map(s => (
                            <tr key={s.id} className="hover:bg-indigo-50/30">
                                <td className="px-8 py-5 font-black text-slate-800">{s.name}</td>
                                <td className="px-6 py-5 text-sm text-slate-500">{s.email}</td>
                                <td className="px-6 py-5 text-center"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg uppercase">{s.planType}</span></td>
                                <td className="px-8 py-5 text-right"><button onClick={() => { setEditingStudentId(s.id); setStudentForm(s); setShowStudentForm(true); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit className="w-5 h-5" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* TAB: MODALIDADES */}
        {activeTab === 'modalities' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            {showModalityForm && (
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-50 shadow-2xl relative">
                    <button onClick={() => setShowModalityForm(false)} className="absolute top-6 right-6 text-slate-400 hover:bg-slate-50 p-2 rounded-xl"><X /></button>
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Dumbbell className="text-indigo-600" /> Nova Modalidade</h3>
                    <form onSubmit={handleModalitySubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nome da Atividade</label><input type="text" value={modalityForm.name} onChange={e => setModalityForm({...modalityForm, name: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" placeholder="Ex: Beach Tennis" required /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">URL da Imagem</label><input type="text" value={modalityForm.imageUrl} onChange={e => setModalityForm({...modalityForm, imageUrl: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold" placeholder="https://imagem.jpg" required /></div>
                            <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Descrição</label><textarea value={modalityForm.description} onChange={e => setModalityForm({...modalityForm, description: e.target.value})} className="w-full border-none bg-slate-50 rounded-2xl p-4 font-bold h-32" placeholder="Conte mais sobre a atividade..." required /></div>
                        </div>
                        <div className="flex justify-end"><button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100">CRIAR MODALIDADE</button></div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modalities.map(m => (
                    <div key={m.id} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                        <div className="h-48 relative overflow-hidden">
                            <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => openDeleteModal('modality', m.id, 'Excluir Modalidade', `Deseja excluir ${m.name}?`)} className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-8">
                            <h3 className="text-xl font-black text-slate-800 mb-2">{m.name}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{m.description}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB: AJUSTES */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8 animate-in fade-in duration-700">
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex items-center gap-3">
                    <Clock className="w-7 h-7 text-indigo-600" />
                    <div><h3 className="font-black text-slate-800 text-xl">Regras de Agendamento</h3><p className="text-xs text-slate-400 font-bold uppercase">Configure o comportamento automático</p></div>
                </div>
                <div className="p-8 space-y-8">
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-2">Hora de Liberação para Amanhã</label>
                        <p className="text-xs text-slate-400 mb-6 font-medium">Os alunos só verão as aulas do dia seguinte após este horário hoje.</p>
                        <div className="flex items-center gap-6">
                            <select 
                                value={bookingReleaseHour} 
                                onChange={(e) => updateBookingReleaseHour(e.target.value)}
                                className="bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-indigo-600 text-lg focus:ring-4 focus:ring-indigo-50"
                            >
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                ))}
                            </select>
                            <div className="flex-1 bg-indigo-50 p-4 rounded-2xl border border-indigo-100/50">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Status Atual</p>
                                <p className="text-sm font-bold text-indigo-700">Liberação automática às {bookingReleaseHour.toString().padStart(2, '0')}:00</p>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};
