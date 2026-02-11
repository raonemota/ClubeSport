
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Plus, Trash2, Edit, Calendar, Dumbbell, Users, X, FileText, 
  GraduationCap, Phone, Mail, Clock, Filter, Save, Info, 
  AlertCircle, ShieldCheck, Key, Settings, ChevronDown, ChevronUp, UserX, UserCheck, Layers, CheckSquare, Square, Copy, Menu, ChevronLeft, ChevronRight, Timer, LayoutDashboard, Search, Camera, ListPlus, CalendarDays, Loader2, UserCircle
} from 'lucide-react';
import { format, parseISO, isSameDay, addDays, startOfDay, endOfDay } from 'date-fns';
import { UserRole, BookingStatus } from '../../types.js';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const AdminPanel = () => {
  const { 
    modalities, sessions, users, bookings, bookingReleaseHour, updateBookingReleaseHour,
    registerUser, updateUser, deleteUser, addModality, updateModality, deleteModality, addSession, updateSession, deleteSession,
    cancelBooking, addSessionsBatch, deleteSessions, updateBookingStatus, getSessionBookingsCount, getWaitlistCount
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
  const [editingModalityId, setEditingModalityId] = useState(null);
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
  
  // Filtros de Relatório
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
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

  // Lógica de filtragem para o relatório
  const filteredReportSessions = useMemo(() => {
    return sessions.filter(s => {
        const sessionTime = parseISO(s.startTime);
        const modalityMatch = reportModality === 'all' || s.modalityId === reportModality;
        
        let dateMatch = false;
        const todayStart = startOfDay(new Date());

        if (reportStartDate && reportEndDate) {
            const start = startOfDay(parseISO(reportStartDate));
            const end = endOfDay(parseISO(reportEndDate));
            dateMatch = sessionTime >= start && sessionTime <= end;
        } else if (reportStartDate) {
            const start = startOfDay(parseISO(reportStartDate));
            dateMatch = sessionTime >= start;
        } else if (reportEndDate) {
            const end = endOfDay(parseISO(reportEndDate));
            dateMatch = sessionTime <= end;
        } else {
            // Caso padrão: Do dia atual em diante
            dateMatch = sessionTime >= todayStart;
        }

        return modalityMatch && dateMatch;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [sessions, reportStartDate, reportEndDate, reportModality]);

  // Handlers para Professores
  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    if (editingTeacherId) await updateUser(editingTeacherId, teacherForm);
    else await registerUser(teacherForm, UserRole.TEACHER);
    setFormLoading(false);
    setShowTeacherForm(false);
    setEditingTeacherId(null);
    setTeacherForm({ name: '', phone: '', email: '', password: 'mudar@123', modalityId: '' });
  };

  // Handlers para Alunos
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    if (editingStudentId) await updateUser(editingStudentId, studentForm);
    else await registerUser(studentForm, UserRole.STUDENT);
    setFormLoading(false);
    setShowStudentForm(false);
    setEditingStudentId(null);
    setStudentForm({ name: '', phone: '', email: '', password: 'mudar@123', planType: 'Mensalista' });
  };

  // Handler para Modalidades
  const handleModalitySubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    if (editingModalityId) {
      await updateModality(editingModalityId, modalityForm);
    } else {
      await addModality(modalityForm);
    }
    setFormLoading(false);
    setShowModalityForm(false);
    setEditingModalityId(null);
    setModalityForm({ name: '', description: '', imageUrl: '' });
  };

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
    try {
      const startTime = new Date(`${sessionForm.date}T${sessionForm.time}`).toISOString();
      const payload = { ...sessionForm, startTime };
      
      if (editingSessionId) {
        await updateSession(editingSessionId, payload);
      } else {
        await addSession(payload);
      }
      setShowSessionForm(false);
      setEditingSessionId(null);
      setSessionForm({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' });
    } catch (err) {
      console.error("Erro ao salvar sessão:", err);
    } finally {
      setFormLoading(false);
    }
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

  const formatPhone = (value) => {
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length === 11) return value.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (value.length > 6) return value.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (value.length > 2) return value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    return value;
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
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-50">
          <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}><ShieldCheck className="w-7 h-7 text-indigo-600" /><span className="font-black text-slate-800 text-xl tracking-tight uppercase">Clube</span></div>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2 hover:bg-slate-100 rounded-lg text-slate-400">{isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}</button>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto no-scrollbar">
          <NavButton tabId="reports" icon={FileText} label="Relatórios" />
          <NavButton tabId="schedule" icon={Calendar} label="Grade Horária" />
          <NavButton tabId="teachers" icon={GraduationCap} label="Professores" />
          <NavButton tabId="students" icon={Users} label="Alunos" />
          <NavButton tabId="modalities" icon={Dumbbell} label="Modalidades" />
          <NavButton tabId="settings" icon={Settings} label="Ajustes" />
        </nav>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                {activeTab === 'reports' && 'Relatórios Gerenciais'}
                {activeTab === 'schedule' && 'Gestão da Grade'}
                {activeTab === 'teachers' && 'Professores'}
                {activeTab === 'students' && 'Alunos'}
                {activeTab === 'modalities' && 'Modalidades'}
                {activeTab === 'settings' && 'Ajustes'}
              </h1>
           </div>
           
           <div className="flex gap-3 w-full md:w-auto">
              {activeTab === 'schedule' && (
                <button 
                  onClick={() => { setShowSessionForm(true); setEditingSessionId(null); setSessionForm({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' }); }} 
                  className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg font-black hover:bg-indigo-700 transition-all uppercase tracking-wider text-sm"
                >
                  <Plus className="w-5 h-5" /> Configurar Grade
                </button>
              )}
              {(activeTab === 'teachers' || activeTab === 'students' || activeTab === 'modalities') && (
                <button onClick={() => { if (activeTab === 'teachers') { setShowTeacherForm(true); setEditingTeacherId(null); setTeacherForm({ name: '', phone: '', email: '', password: 'mudar@123', modalityId: '' }); } if (activeTab === 'students') { setShowStudentForm(true); setEditingStudentId(null); setStudentForm({ name: '', phone: '', email: '', password: 'mudar@123', planType: 'Mensalista' }); } if (activeTab === 'modalities') { setShowModalityForm(true); setEditingModalityId(null); setModalityForm({ name: '', description: '', imageUrl: '' }); } }} className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg font-black hover:bg-indigo-700 transition-all uppercase tracking-wider text-sm"><Plus className="w-5 h-5" /> Novo Cadastro</button>
              )}
           </div>
        </header>

        {/* TAB: GRADE HORÁRIA */}
        {activeTab === 'schedule' && showSessionForm && (
           /* ... (código existente inalterado para manter consistência) ... */
          <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-2xl mb-8 relative animate-in slide-in-from-top-4">
              <button onClick={() => setShowSessionForm(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 transition-colors"><X className="w-6 h-6" /></button>
              {!editingSessionId && (
                <div className="flex bg-slate-100 p-1.5 rounded-xl w-fit mb-8">
                    <button onClick={() => setIsBatchMode(false)} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${!isBatchMode ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>Aula Individual</button>
                    <button onClick={() => setIsBatchMode(true)} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isBatchMode ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>Criação em Lote</button>
                </div>
              )}
              <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                {isBatchMode ? <><CalendarDays className="w-6 h-6 text-indigo-600"/> Planejamento Recorrente</> : <><Clock className="w-6 h-6 text-indigo-600"/> {editingSessionId ? 'Editar Sessão' : 'Nova Sessão Única'}</>}
              </h3>
              <form onSubmit={isBatchMode ? handleBatchSubmit : handleSessionSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Modalidade</label><select value={isBatchMode ? batchForm.modalityId : sessionForm.modalityId} onChange={e => isBatchMode ? setBatchForm({...batchForm, modalityId: e.target.value}) : setSessionForm({...sessionForm, modalityId: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold focus:ring-2 focus:ring-indigo-500" required><option value="">Selecione...</option>{modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                  <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Professor</label><select value={isBatchMode ? batchForm.instructor : sessionForm.instructor} onChange={e => isBatchMode ? setBatchForm({...batchForm, instructor: e.target.value}) : setSessionForm({...sessionForm, instructor: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold focus:ring-2 focus:ring-indigo-500" required><option value="">Selecione...</option>{teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select></div>
                  <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Capacidade / Categoria</label><div className="flex gap-3"><input type="number" value={isBatchMode ? batchForm.capacity : sessionForm.capacity} onChange={e => isBatchMode ? setBatchForm({...batchForm, capacity: parseInt(e.target.value)}) : setSessionForm({...sessionForm, capacity: parseInt(e.target.value)})} className="w-24 bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold" /><input type="text" placeholder="Ex: Kids" value={isBatchMode ? batchForm.category : sessionForm.category} onChange={e => isBatchMode ? setBatchForm({...batchForm, category: e.target.value}) : setSessionForm({...sessionForm, category: e.target.value})} className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold" /></div></div>
                  {!isBatchMode ? (<div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Data / Horário</label><div className="flex gap-3"><input type="date" value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})} className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold" required /><input type="time" value={sessionForm.time} onChange={e => setSessionForm({...sessionForm, time: e.target.value})} className="w-28 bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold" required /></div></div>) : (<><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Período</label><div className="flex gap-3"><input type="date" value={batchForm.startDate} onChange={e => setBatchForm({...batchForm, startDate: e.target.value})} className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold" required /><input type="date" value={batchForm.endDate} onChange={e => setBatchForm({...batchForm, endDate: e.target.value})} className="flex-1 bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold" required /></div></div><div className="lg:col-span-2 space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Dias da Semana</label><div className="flex gap-3">{daysLabels.map(day => (<button key={day.id} type="button" onClick={() => toggleDayOfWeek(day.id)} className={`w-12 h-12 rounded-xl font-black text-sm transition-all border ${batchForm.daysOfWeek.includes(day.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}>{day.label}</button>))}</div></div><div className="lg:col-span-2 space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Horários</label><input type="text" placeholder="08:00, 10:30, 14:00" value={batchForm.timesString} onChange={e => setBatchForm({...batchForm, timesString: e.target.value})} className="w-full bg-slate-50 border-slate-200 rounded-xl p-4 text-base font-bold" required /></div></>)}
                  <div className="lg:col-span-4 flex justify-end items-center gap-6 pt-6 border-t border-slate-100"><button type="button" onClick={() => setShowSessionForm(false)} className="text-slate-500 font-black text-sm uppercase tracking-widest px-6 py-2">Cancelar</button><button type="submit" disabled={formLoading} className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-black shadow-xl uppercase tracking-widest">{formLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-6 h-6"/>} {editingSessionId ? 'Atualizar Aula' : 'Gerar Grade'}</button></div>
              </form>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200"><Filter className="w-5 h-5 text-slate-400" /><input type="date" value={scheduleFilterDate} onChange={e => setScheduleFilterDate(e.target.value)} className="bg-transparent border-none p-0 text-sm font-black text-slate-700 focus:ring-0" /></div>
                <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200"><Dumbbell className="w-5 h-5 text-slate-400" /><select value={scheduleFilterModality} onChange={e => setScheduleFilterModality(e.target.value)} className="bg-transparent border-none p-0 text-sm font-black text-slate-700 focus:ring-0"><option value="all">Todas Modalidades</option>{modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50 text-xs font-black uppercase text-slate-500 tracking-widest"><tr><th className="px-6 py-5 text-left w-12"><button onClick={selectAllFiltered}>{selectedSessionIds.size === filteredScheduleSessions.length ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6 text-slate-200" />}</button></th><th className="px-6 py-5 text-left">Início</th><th className="px-6 py-5 text-left">Modalidade / Professor</th><th className="px-6 py-5 text-center">Vagas</th><th className="px-6 py-5 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{filteredScheduleSessions.map(s => { const currentCount = getSessionBookingsCount(s.id); const waitlistCount = getWaitlistCount(s.id); return (<tr key={s.id} className={`hover:bg-indigo-50/30 transition-colors ${selectedSessionIds.has(s.id) ? 'bg-indigo-50/50' : ''}`}><td className="px-6 py-5"><button onClick={() => toggleSessionSelection(s.id)} className={selectedSessionIds.has(s.id) ? 'text-indigo-600' : 'text-slate-300'}>{selectedSessionIds.has(s.id) ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}</button></td><td className="px-6 py-5 text-base font-black text-slate-900"><span className="text-indigo-600">{format(parseISO(s.startTime), 'HH:mm')}</span><span className="text-xs text-slate-400 block font-bold mt-1 uppercase">{format(parseISO(s.startTime), 'dd MMM yyyy')}</span></td><td className="px-6 py-5"><div className="flex items-center gap-3"><p className="text-base font-black text-slate-800">{modalities.find(m => m.id === s.modalityId)?.name}</p>{s.category && <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-black uppercase">{s.category}</span>}</div><p className="text-xs text-indigo-500 font-bold uppercase mt-1 tracking-widest">{s.instructor}</p></td><td className="px-6 py-5 text-center"><div className="flex flex-col items-center gap-1.5"><span className={`text-sm font-black px-4 py-1.5 rounded-full border ${currentCount >= s.capacity ? 'bg-red-50 text-red-600 border-red-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{currentCount}/{s.capacity}</span>{waitlistCount > 0 && (<span className="text-[11px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> +{waitlistCount} na fila</span>)}</div></td><td className="px-6 py-5 text-right flex justify-end gap-3"><button onClick={() => { setEditingSessionId(s.id); setShowSessionForm(true); setIsBatchMode(false); setSessionForm({ modalityId: s.modalityId, instructor: s.instructor, date: format(parseISO(s.startTime), 'yyyy-MM-dd'), time: format(parseISO(s.startTime), 'HH:mm'), capacity: s.capacity, category: s.category || '', durationMinutes: s.duration_minutes || 60 }); }} className="p-2.5 text-slate-400 hover:text-indigo-600"><Edit className="w-5 h-5" /></button><button onClick={() => openDeleteModal('session', s.id, 'Excluir Aula', 'Deseja remover esta aula permanentemente?')} className="p-2.5 text-slate-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button></td></tr>); })}</tbody>
                </table>
            </div>
          </div>
        )}

        {/* TAB: RELATÓRIOS (ATUALIZADA) */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
             {/* Painel de Filtros Avançados */}
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <label className="text-xs font-black text-slate-500 uppercase block mb-2 tracking-widest">Período: Início</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                        type="date" 
                        value={reportStartDate} 
                        onChange={(e) => setReportStartDate(e.target.value)} 
                        className="w-full bg-slate-50 border-slate-200 rounded-xl pl-12 pr-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-black text-slate-500 uppercase block mb-2 tracking-widest">Período: Fim</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                        type="date" 
                        value={reportEndDate} 
                        onChange={(e) => setReportEndDate(e.target.value)} 
                        className="w-full bg-slate-50 border-slate-200 rounded-xl pl-12 pr-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-black text-slate-500 uppercase block mb-2 tracking-widest">Filtrar por Modalidade</label>
                  <div className="relative">
                    <Dumbbell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <select 
                        value={reportModality} 
                        onChange={(e) => setReportModality(e.target.value)} 
                        className="w-full bg-slate-50 border-slate-200 rounded-xl pl-12 pr-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    >
                        <option value="all">Todas as Modalidades</option>
                        {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                {!reportStartDate && !reportEndDate && (
                    <div className="lg:self-end pb-1">
                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 uppercase tracking-widest flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5" /> Exibindo Hoje em diante
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              {filteredReportSessions.length > 0 ? filteredReportSessions.map(s => {
                  const confirmedCount = getSessionBookingsCount(s.id);
                  const waitlistCount = getWaitlistCount(s.id);
                  const isExpanded = expandedSessionId === s.id;
                  
                  // Agrupando reservas por status
                  const confirmedBookings = bookings.filter(b => b.sessionId === s.id && (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ATTENDED));
                  const waitlistedBookings = bookings.filter(b => b.sessionId === s.id && b.status === BookingStatus.WAITLIST);
                  
                  return (
                    <div key={s.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md">
                      <div 
                        onClick={() => setExpandedSessionId(isExpanded ? null : s.id)} 
                        className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-6">
                          <div className="bg-indigo-600 text-white w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shadow-xl">
                            <span className="text-base leading-none">{format(parseISO(s.startTime), 'HH:mm')}</span>
                            <span className="text-[10px] uppercase opacity-80 mt-1">{format(parseISO(s.startTime), 'dd/MM')}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{modalities.find(m => m.id === s.modalityId)?.name}</h3>
                                {s.category && (
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">{s.category}</span>
                                )}
                            </div>
                            <p className="text-xs text-indigo-500 font-bold uppercase mt-1.5 tracking-widest flex items-center gap-2">
                                <UserCircle className="w-4 h-4" /> {s.instructor}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <p className={`text-2xl font-black leading-none ${confirmedCount >= s.capacity ? 'text-red-500' : 'text-indigo-600'}`}>{confirmedCount}/{s.capacity}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-widest">Ocupação</p>
                          </div>
                          
                          {waitlistCount > 0 && (
                            <div className="text-center px-4 border-l border-slate-100">
                                <p className="text-2xl font-black text-orange-500 leading-none">{waitlistCount}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-widest">Em Fila</p>
                            </div>
                          )}

                          <div className="p-2 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-white border-t border-slate-100 p-8 space-y-6 animate-in slide-in-from-top-2">
                            {/* Alunos Confirmados */}
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-green-500" /> Alunos com Vaga Garantida ({confirmedBookings.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {confirmedBookings.length > 0 ? confirmedBookings.map(b => {
                                        const student = users.find(u => u.id === b.userId);
                                        return (
                                            <div key={b.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                              <div>
                                                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{student?.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" /> Reservou às {format(parseISO(b.bookedAt), 'HH:mm')} do dia {format(parseISO(b.bookedAt), 'dd/MM')}
                                                </p>
                                              </div>
                                              <button 
                                                onClick={() => openDeleteModal('cancel_booking', b.id, 'Remover Aluno', `Remover ${student?.name} da lista? Se houver fila, o próximo será promovido.`)} 
                                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-2 transition-all"
                                              >
                                                <X className="w-5 h-5"/>
                                              </button>
                                            </div>
                                        );
                                    }) : (
                                      <p className="col-span-full py-6 text-center text-xs font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-50 rounded-2xl">Não há inscritos</p>
                                    )}
                                </div>
                            </div>

                            {/* Fila de Espera */}
                            {waitlistedBookings.length > 0 && (
                                <div className="pt-6 border-t border-slate-50">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-orange-500" /> Alunos na Fila de Espera ({waitlistedBookings.length})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {waitlistedBookings.map((b, index) => {
                                            const student = users.find(u => u.id === b.userId);
                                            return (
                                                <div key={b.id} className="bg-orange-50/30 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
                                                  <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase">#{index + 1}</span>
                                                        <p className="text-sm font-black text-orange-800 uppercase tracking-tight">{student?.name}</p>
                                                    </div>
                                                    <p className="text-[10px] text-orange-400 font-bold flex items-center gap-1 mt-1">
                                                        <Clock className="w-3 h-3" /> Entrou na fila às {format(parseISO(b.bookedAt), 'HH:mm')}
                                                    </p>
                                                  </div>
                                                  <button onClick={() => cancelBooking(b.id)} className="text-orange-200 hover:text-orange-600 p-2 transition-all">
                                                    <X className="w-5 h-5"/>
                                                  </button>
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
              }) : (
                <div className="text-center py-24 bg-white rounded-3xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center">
                    <FileText className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="font-black text-slate-300 uppercase tracking-widest text-sm">Nenhuma aula encontrada para este período</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ... (restante do componente AdminPanel permanece inalterado) ... */}
        {activeTab === 'teachers' && ( /* ... */ <div className="space-y-6">{showTeacherForm && (<div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-xl relative animate-in slide-in-from-top-4"><button onClick={() => setShowTeacherForm(false)} className="absolute top-6 right-6 text-slate-400 p-2"><X className="w-6 h-6" /></button><h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><GraduationCap className="w-6 h-6 text-indigo-600" /> {editingTeacherId ? 'Editar Professor' : 'Novo Professor'}</h3><form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nome</label><input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Modalidade Principal</label><select value={teacherForm.modalityId} onChange={e => setTeacherForm({...teacherForm, modalityId: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required><option value="">Selecione...</option>{modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">WhatsApp</label><input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: formatPhone(e.target.value)})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Email (Login)</label><input type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div><div className="md:col-span-2 flex justify-end gap-4 pt-6 border-t border-slate-100"><button type="submit" disabled={formLoading} className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2 uppercase tracking-widest">{formLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-6 h-6"/>} Salvar Professor</button></div></form></div>)}<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50/50 text-xs font-black text-slate-500 uppercase tracking-widest"><tr><th className="px-6 py-5 text-left">Professor</th><th className="px-6 py-5 text-left">Modalidade</th><th className="px-6 py-5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{teachers.map(t => (<tr key={t.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-black text-slate-800 text-base">{t.name}</td><td className="px-6 py-5"><span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{modalities.find(m => m.id === t.modalityId)?.name || 'N/A'}</span></td><td className="px-6 py-5 text-right flex justify-end gap-3"><button onClick={() => { setEditingTeacherId(t.id); setTeacherForm(t); setShowTeacherForm(true); }} className="p-2.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all shadow-sm"><Edit className="w-5 h-5" /></button><button onClick={() => openDeleteModal('user', t.id, 'Excluir Professor', `Remover professor ${t.name}?`)} className="p-2.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button></td></tr>))}</tbody></table></div></div>)}
        {activeTab === 'students' && ( /* ... */ <div className="space-y-6">{showStudentForm && (<div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-xl relative animate-in slide-in-from-top-4"><button onClick={() => setShowStudentForm(false)} className="absolute top-6 right-6 text-slate-400 p-2"><X className="w-6 h-6" /></button><h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><Users className="w-6 h-6 text-indigo-600" /> {editingStudentId ? 'Editar Aluno' : 'Novo Aluno'}</h3><form onSubmit={handleStudentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nome</label><input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Email (Login)</label><input type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">WhatsApp</label><input type="text" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: formatPhone(e.target.value)})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Plano</label><select value={studentForm.planType} onChange={e => setStudentForm({...studentForm, planType: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold"><option value="Mensalista">Mensalista</option><option value="Totalpass">Totalpass</option><option value="Wellhub">Wellhub</option></select></div><div className="md:col-span-2 flex justify-end pt-6 border-t border-slate-100"><button type="submit" disabled={formLoading} className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2 uppercase tracking-widest">{formLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-6 h-6"/>} {editingStudentId ? 'Atualizar Cadastro' : 'Cadastrar Aluno'}</button></div></form></div>)}<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50/50 text-xs font-black text-slate-500 uppercase tracking-widest"><tr><th className="px-6 py-5 text-left">Aluno</th><th className="px-6 py-5 text-center">Plano</th><th className="px-6 py-5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map(s => (<tr key={s.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-black text-slate-800 text-base">{s.name}</td><td className="px-6 py-5 text-center text-xs font-black uppercase text-slate-600 tracking-widest">{s.planType}</td><td className="px-6 py-5 text-right flex justify-end gap-3"><button onClick={() => { setEditingStudentId(s.id); setStudentForm(s); setShowStudentForm(true); }} className="p-2.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all shadow-sm"><Edit className="w-5 h-5" /></button><button onClick={() => openDeleteModal('user', s.id, 'Excluir Aluno', `Remover aluno ${s.name}?`)} className="p-2.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button></td></tr>))}</tbody></table></div></div>)}
        {activeTab === 'modalities' && ( /* ... */ <div className="space-y-8">{showModalityForm && (<div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-xl relative animate-in slide-in-from-top-4"><button onClick={() => setShowModalityForm(false)} className="absolute top-6 right-6 text-slate-400 p-2"><X className="w-6 h-6" /></button><h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><Dumbbell className="w-6 h-6 text-indigo-600" /> {editingModalityId ? 'Editar Modalidade' : 'Nova Modalidade'}</h3><form onSubmit={handleModalitySubmit} className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Título da Atividade</label><input type="text" value={modalityForm.name} onChange={e => setModalityForm({...modalityForm, name: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Link da Imagem</label><input type="text" value={modalityForm.imageUrl} onChange={e => setModalityForm({...modalityForm, imageUrl: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-xl p-4 text-base font-bold" required /></div></div><div className="flex justify-end pt-6 border-t border-slate-100"><button type="submit" disabled={formLoading} className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2 uppercase tracking-widest">{formLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-6 h-6"/>} {editingModalityId ? 'Atualizar Modalidade' : 'Criar Modalidade'}</button></div></form></div>)}<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">{modalities.map(m => (<div key={m.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group hover:shadow-xl transition-all duration-300"><div className="h-44 relative overflow-hidden"><img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/><div className="absolute top-3 right-3 flex gap-2"><button onClick={() => { setEditingModalityId(m.id); setModalityForm({ name: m.name, imageUrl: m.imageUrl, description: m.description || '' }); setShowModalityForm(true); }} className="bg-white/95 p-3 rounded-xl text-indigo-600 shadow-xl hover:bg-indigo-600 hover:text-white transition-all transform hover:-translate-y-0.5"><Edit className="w-5 h-5" /></button><button onClick={() => openDeleteModal('modality', m.id, 'Excluir Modalidade', `Remover modalidade ${m.name}?`)} className="bg-white/95 p-3 rounded-xl text-red-500 shadow-xl hover:bg-red-500 hover:text-white transition-all transform hover:-translate-y-0.5"><Trash2 className="w-5 h-5" /></button></div></div><div className="p-6"><h3 className="font-black text-slate-800 text-base uppercase tracking-widest leading-none">{m.name}</h3></div></div>))}</div></div>)}
        {activeTab === 'settings' && ( /* ... */ <div className="max-w-2xl space-y-8"><div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"><div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex items-center gap-4"><Settings className="w-6 h-6 text-indigo-600" /><h3 className="font-black text-slate-800 uppercase tracking-widest text-base">Regras do Sistema</h3></div><div className="p-8 space-y-6"><div><label className="block text-xs font-black text-slate-500 uppercase mb-3 tracking-widest">Horário de Liberação de Vagas (Dia Seguinte)</label><select value={bookingReleaseHour} onChange={(e) => updateBookingReleaseHour(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-xl px-6 py-4 font-black text-lg text-indigo-600 transition-all focus:ring-2 focus:ring-indigo-500">{Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}</select><p className="mt-3 text-sm text-slate-400 font-medium">Define em que hora o sistema abre as reservas para as aulas de amanhã.</p></div></div></div></div>)}
      </main>
    </div>
  );
};
