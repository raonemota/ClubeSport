
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
        className={`w-full group flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-all relative
          ${isActive 
            ? 'bg-indigo-600 text-white shadow-md' 
            : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        title={isSidebarCollapsed ? label : ''}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          {label}
        </span>
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
      <div className="md:hidden fixed bottom-6 right-6 z-[60]">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl active:scale-95 transition-all flex items-center justify-center"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
      </div>

      {/* Sidebar Retrátil / Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-[50] md:relative
        bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        h-full
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50">
          <div className={`flex items-center gap-2 transition-all ${isSidebarCollapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto'}`}>
             <ShieldCheck className="w-6 h-6 text-indigo-600" />
             <span className="font-black text-slate-800 text-lg tracking-tight">CLUBE</span>
          </div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
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

      {/* Conteúdo Principal Dinâmico */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-4 md:p-6 lg:p-8">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
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
                className="w-full md:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg font-bold hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-5 h-5" /> Novo Cadastro
              </button>
           )}
        </header>

        {/* TAB: RELATÓRIOS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Dia</label>
                     <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                </div>
                <div className="flex-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Modalidade</label>
                     <select 
                        value={reportModality} 
                        onChange={(e) => setReportModality(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                     >
                        <option value="all">Todas</option>
                        {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                     </select>
                </div>
            </div>
            
            <div className="space-y-4">
              {sessions
                .filter(s => isSameDay(parseISO(s.startTime), parseISO(reportDate)) && (reportModality === 'all' || s.modalityId === reportModality))
                .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map(s => {
                  const stats = getSessionStats(s.id);
                  const isExpanded = expandedSessionId === s.id;
                  const confirmedBookings = bookings.filter(b => b.sessionId === s.id && b.status !== BookingStatus.WAITLIST);
                  const waitlistBookings = bookings.filter(b => b.sessionId === s.id && b.status === BookingStatus.WAITLIST);
                  const modality = modalities.find(m => m.id === s.modalityId);
                  
                  return (
                    <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      <div onClick={() => setExpandedSessionId(isExpanded ? null : s.id)} className="p-4 flex items-center justify-between gap-4 cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="bg-indigo-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg">{format(parseISO(s.startTime), 'HH:mm')}</div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-base leading-none">{modality?.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{s.instructor} {s.category && `| ${s.category}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-black text-indigo-600 leading-none">{stats.total}/{s.capacity}</p>
                            <p className="text-[9px] uppercase font-bold text-slate-400 mt-1">Vagas</p>
                          </div>
                          {stats.waitlist > 0 && (
                            <div className="text-center hidden sm:block">
                              <p className="text-lg font-black text-orange-500 leading-none">{stats.waitlist}</p>
                              <p className="text-[9px] uppercase font-bold text-slate-400 mt-1">Fila</p>
                            </div>
                          )}
                          <div className={`p-1 rounded-lg ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}>
                             {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-slate-100 p-3">
                            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                                {confirmedBookings.length > 0 ? confirmedBookings.map(b => {
                                    const student = users.find(u => u.id === b.userId);
                                    return (
                                        <div key={b.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">{student?.name?.charAt(0)}</div>
                                                <div><p className="text-sm font-bold text-slate-800">{student?.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{student?.planType}</p></div>
                                            </div>
                                            <button onClick={() => openDeleteModal('cancel_booking', b.id, 'Remover Aluno', `Deseja remover ${student?.name} desta aula?`)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><UserX className="w-4 h-4" /></button>
                                        </div>
                                    );
                                }) : <p className="p-8 text-center text-slate-300 font-bold uppercase text-[10px]">Sem alunos confirmados</p>}
                            </div>
                            
                            {waitlistBookings.length > 0 && (
                                <div className="mt-4 bg-orange-50/50 rounded-lg border border-orange-100 overflow-hidden">
                                    <p className="px-4 py-2 text-[9px] font-black text-orange-400 uppercase border-b border-orange-100">Lista de Espera</p>
                                    <div className="divide-y divide-orange-50">
                                        {waitlistBookings.map((b, idx) => {
                                            const student = users.find(u => u.id === b.userId);
                                            return (
                                                <div key={b.id} className="px-4 py-2 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700">#{idx+1} {student?.name}</span>
                                                    <button onClick={() => openDeleteModal('cancel_booking', b.id, 'Remover da Fila', 'Remover este aluno da lista de espera?')} className="text-red-400 p-1"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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
          <div className="space-y-4">
             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <input type="date" value={scheduleFilterDate} onChange={e => setScheduleFilterDate(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0" />
                </div>
                {selectedSessionIds.size > 0 && (
                    <div className="md:ml-auto flex items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex-grow text-center">{selectedSessionIds.size} SELECIONADOS</span>
                        <button onClick={handleDeleteSelected} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md">EXCLUIR</button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="px-4 py-4 text-left w-10"><button onClick={selectAllFiltered}>{selectedSessionIds.size === filteredScheduleSessions.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</button></th>
                                <th className="px-4 py-4 text-left">Horário</th>
                                <th className="px-4 py-4 text-left">Aula</th>
                                <th className="px-4 py-4 text-center">Capacidade</th>
                                <th className="px-4 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredScheduleSessions.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3"><button onClick={() => toggleSessionSelection(s.id)} className={selectedSessionIds.has(s.id) ? 'text-indigo-600' : 'text-slate-200'}>{selectedSessionIds.has(s.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</button></td>
                                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{format(parseISO(s.startTime), 'HH:mm')} <span className="text-[10px] text-slate-400 font-medium block">{format(parseISO(s.startTime), 'dd/MM')}</span></td>
                                    <td className="px-4 py-3"><p className="text-sm font-bold text-slate-700">{modalities.find(m => m.id === s.modalityId)?.name}</p><p className="text-[10px] text-indigo-500 font-bold uppercase">{s.instructor}</p></td>
                                    <td className="px-4 py-3 text-center"><span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{s.capacity} VAGAS</span></td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                                        <button onClick={() => { setEditingSessionId(s.id); setShowSessionForm(true); }} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => openDeleteModal('session', s.id, 'Excluir Aula', 'Confirmar exclusão desta aula?')} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredScheduleSessions.length === 0 && <div className="p-12 text-center text-slate-300 font-bold text-xs uppercase">Nenhuma aula para os filtros selecionados</div>}
             </div>
          </div>
        )}

        {/* TAB: PROFESSORES */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            {showTeacherForm && (
                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-xl relative animate-in slide-in-from-top-4">
                    <button onClick={() => setShowTeacherForm(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-50 p-1 rounded-lg"><X /></button>
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-indigo-600" /> {editingTeacherId ? 'Editar Professor' : 'Novo Professor'}</h3>
                    <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nome</label><input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Modalidade</label><select value={teacherForm.modalityId} onChange={e => setTeacherForm({...teacherForm, modalityId: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required><option value="">Selecione...</option>{modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</label><input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: formatPhone(e.target.value)})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Email</label><input type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-2"><button type="submit" className="w-full md:w-auto bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-black shadow-md">SALVAR</button></div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><tr><th className="px-6 py-4 text-left">Professor</th><th className="px-6 py-4 text-left">Modalidade</th><th className="px-6 py-4 text-left">Contato</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {teachers.map(t => (
                                <tr key={t.id} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 text-sm">{t.name}</td>
                                    <td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase">{modalities.find(m => m.id === t.modalityId)?.name || 'N/A'}</span></td>
                                    <td className="px-6 py-4"><div className="flex flex-col text-[11px] text-slate-400 font-medium"><span>{t.email}</span><span>{t.phone}</span></div></td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                                        <button onClick={() => { setEditingTeacherId(t.id); setTeacherForm(t); setShowTeacherForm(true); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => openDeleteModal('user', t.id, 'Excluir Professor', `Deseja remover ${t.name} do sistema?`)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

        {/* TAB: ALUNOS */}
        {activeTab === 'students' && (
          <div className="space-y-6">
             {showStudentForm && (
                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-xl relative animate-in slide-in-from-top-4">
                    <button onClick={() => setShowStudentForm(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-50 p-1 rounded-lg"><X /></button>
                    <h3 className="text-lg font-black text-slate-800 mb-4">Novo Aluno</h3>
                    <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Nome</label><input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Email</label><input type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</label><input type="text" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: formatPhone(e.target.value)})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Plano</label><select value={studentForm.planType} onChange={e => setStudentForm({...studentForm, planType: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold"><option value="Mensalista">Mensalista</option><option value="Totalpass">Totalpass</option><option value="Wellhub">Wellhub</option></select></div>
                        <div className="md:col-span-2 flex justify-end pt-2"><button type="submit" className="w-full md:w-auto bg-indigo-600 text-white px-10 py-2.5 rounded-lg font-black shadow-md">CADASTRAR</button></div>
                    </form>
                </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><tr><th className="px-6 py-4 text-left">Aluno</th><th className="px-6 py-4 text-left">WhatsApp</th><th className="px-6 py-4 text-center">Plano</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {students.map(s => (
                                <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 text-sm">{s.name} <span className="text-[10px] text-slate-400 block font-normal">{s.email}</span></td>
                                    <td className="px-6 py-4 text-xs font-bold text-indigo-600">{s.phone}</td>
                                    <td className="px-6 py-4 text-center"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg uppercase text-slate-600">{s.planType}</span></td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                                        <button onClick={() => { setEditingStudentId(s.id); setStudentForm(s); setShowStudentForm(true); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => openDeleteModal('user', s.id, 'Excluir Aluno', `Deseja desativar o acesso de ${s.name}?`)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

        {/* TAB: MODALIDADES */}
        {activeTab === 'modalities' && (
          <div className="space-y-6">
            {showModalityForm && (
                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-xl relative animate-in slide-in-from-top-4">
                    <button onClick={() => setShowModalityForm(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-50 p-1 rounded-lg"><X /></button>
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Dumbbell className="w-5 h-5 text-indigo-600" /> Nova Modalidade</h3>
                    <form onSubmit={handleModalitySubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Título</label><input type="text" value={modalityForm.name} onChange={e => setModalityForm({...modalityForm, name: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Link da Imagem</label><input type="text" value={modalityForm.imageUrl} onChange={e => setModalityForm({...modalityForm, imageUrl: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold" required /></div>
                            <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Descrição</label><textarea value={modalityForm.description} onChange={e => setModalityForm({...modalityForm, description: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm font-bold h-24" required /></div>
                        </div>
                        <div className="flex justify-end"><button type="submit" className="w-full md:w-auto bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-black shadow-md">CRIAR</button></div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modalities.map(m => (
                    <div key={m.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <div className="h-32 relative overflow-hidden">
                            <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute top-2 right-2">
                                <button onClick={() => openDeleteModal('modality', m.id, 'Excluir Modalidade', `Remover permanentemente ${m.name}?`)} className="bg-white/90 backdrop-blur p-2 rounded-lg text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-black text-slate-800 text-base">{m.name}</h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{m.description}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB: AJUSTES */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-6">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-black text-slate-800">Regras de Negócio</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Liberação de Vagas (Amanhã)</label>
                        <p className="text-xs text-slate-400 mb-4 font-medium leading-relaxed">As aulas de amanhã ficarão visíveis para os alunos apenas após este horário hoje.</p>
                        <div className="flex items-center gap-4">
                            <select 
                                value={bookingReleaseHour} 
                                onChange={(e) => updateBookingReleaseHour(e.target.value)}
                                className="bg-slate-50 border-slate-200 rounded-lg px-4 py-2 font-black text-indigo-600 focus:ring-2 focus:ring-indigo-100"
                            >
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                ))}
                            </select>
                            <span className="text-xs font-bold text-slate-500">Horário Local (Brasília)</span>
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
