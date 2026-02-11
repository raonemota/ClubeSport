
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Plus, Trash2, Edit, Calendar, Dumbbell, Users, X, FileText, 
  GraduationCap, Phone, Mail, Clock, Filter, Save, Info, 
  AlertCircle, ShieldCheck, Key, Settings, ChevronDown, ChevronUp, UserX, UserCheck, Layers, CheckSquare, Square, Copy
} from 'lucide-react';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { UserRole, BookingStatus } from '../../types.js';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const AdminPanel = () => {
  const { 
    modalities, sessions, users, bookings, bookingReleaseHour, updateBookingReleaseHour,
    registerUser, updateUser, deleteUser, getStudentStats, addModality, deleteModality, addSession, updateSession, deleteSession,
    cancelBooking, addSessionsBatch, deleteSessions
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('reports');
  
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
  
  // Estado para Lote
  const [batchForm, setBatchForm] = useState({
    modalityId: '', instructor: '', startDate: '', endDate: '', 
    times: ['08:00'], daysOfWeek: [], capacity: 10, category: '', durationMinutes: 60
  });

  // Filtros da Grade
  const [scheduleFilterDate, setScheduleFilterDate] = useState('');
  const [scheduleFilterModality, setScheduleFilterModality] = useState('all');
  const [selectedSessionIds, setSelectedSessionIds] = useState(new Set());

  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportModality, setReportModality] = useState('all');
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  // Estado para Modal de Confirmação
  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    type: null, 
    id: null, 
    title: '', 
    message: '' 
  });

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
    openDeleteModal(
        'bulk_delete', 
        Array.from(selectedSessionIds), 
        'Excluir Selecionados', 
        `Deseja excluir permanentemente as ${selectedSessionIds.size} aulas selecionadas? Isso também removerá as reservas vinculadas.`
    );
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteModal;
    if (type === 'session') await deleteSession(id);
    else if (type === 'bulk_delete') {
        await deleteSessions(id);
        setSelectedSessionIds(new Set());
    }
    else if (type === 'modality') await deleteModality(id);
    else if (type === 'user') await deleteUser(id);
    else if (type === 'cancel_booking') await cancelBooking(id);
    
    setDeleteModal({ isOpen: false, type: null, id: null, title: '', message: '' });
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (batchForm.daysOfWeek.length === 0) {
        alert("Selecione pelo menos um dia da semana.");
        return;
    }
    setFormLoading(true);
    await addSessionsBatch(batchForm);
    setFormLoading(false);
    setShowSessionForm(false);
    setIsBatchMode(false);
    setBatchForm({
      modalityId: '', instructor: '', startDate: '', endDate: '', 
      times: ['08:00'], daysOfWeek: [], capacity: 10, category: '', durationMinutes: 60
    });
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

  const openDeleteModal = (type, id, title, message) => {
    setDeleteModal({ isOpen: true, type, id, title, message });
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!teacherForm.modalityId) {
        alert("Selecione uma modalidade para o professor.");
        return;
    }
    setFormLoading(true);
    if (editingTeacherId) {
      const success = await updateUser(editingTeacherId, teacherForm);
      if (success) resetTeacherForm();
    } else {
      const result = await registerUser(teacherForm, UserRole.TEACHER);
      if (result.success) resetTeacherForm();
      else alert("Erro: " + result.error);
    }
    setFormLoading(false);
  };

  const resetTeacherForm = () => {
    setTeacherForm({ name: '', phone: '', email: '', password: 'mudar@123', modalityId: '' });
    setEditingTeacherId(null);
    setShowTeacherForm(false);
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    const startTime = new Date(`${sessionForm.date}T${sessionForm.time}`).toISOString();
    
    if (editingSessionId) {
        await updateSession(editingSessionId, { ...sessionForm, startTime });
    } else {
        await addSession({ ...sessionForm, startTime });
    }
    
    setShowSessionForm(false);
    setEditingSessionId(null);
    setSessionForm({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' });
  };

  const getSessionStats = (sessionId) => {
      const sessionBookings = bookings.filter(b => b.sessionId === sessionId && b.status === BookingStatus.CONFIRMED);
      const totalCancelled = bookings.filter(b => b.sessionId === sessionId && b.status === BookingStatus.CANCELLED).length;
      return { total: sessionBookings.length, cancelled: totalCancelled };
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

  const WEEK_DAYS = [
    { label: 'Seg', val: 1 }, { label: 'Ter', val: 2 }, { label: 'Qua', val: 3 }, 
    { label: 'Qui', val: 4 }, { label: 'Sex', val: 5 }, { label: 'Sab', val: 6 }, { label: 'Dom', val: 0 }
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <ConfirmationModal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })} 
        onConfirm={handleConfirmDelete}
        title={deleteModal.title}
        message={deleteModal.message}
      />

      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Administrativo</h2>
        <NavButton tabId="reports" icon={FileText} label="Relatórios" />
        <NavButton tabId="teachers" icon={GraduationCap} label="Professores" />
        <NavButton tabId="students" icon={Users} label="Alunos" />
        <NavButton tabId="modalities" icon={Dumbbell} label="Modalidades" />
        <NavButton tabId="schedule" icon={Calendar} label="Grade Horária" />
        <NavButton tabId="settings" icon={Settings} label="Configurações" />
      </aside>

      <main className="flex-1 p-8">
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Grade Horária</h1>
                <p className="text-xs text-slate-400">Gerencie as janelas de aulas e horários.</p>
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingSessionId(null); setShowSessionForm(!showSessionForm); setIsBatchMode(true); }} 
                    className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-50 shadow-sm transition-all text-sm font-bold"
                  >
                    <Copy className="w-4 h-4" /> Criar em Lote
                  </button>
                  <button 
                    onClick={() => { setEditingSessionId(null); setShowSessionForm(!showSessionForm); setIsBatchMode(false); setSessionForm({ modalityId: '', instructor: '', date: '', time: '', durationMinutes: 60, capacity: 10, category: '' }); }} 
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" /> Nova Única
                  </button>
              </div>
            </div>

            {/* Filtros da Grade */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <input 
                        type="date" 
                        value={scheduleFilterDate} 
                        onChange={e => setScheduleFilterDate(e.target.value)}
                        className="border rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 border-slate-200"
                    />
                </div>
                <select 
                    value={scheduleFilterModality} 
                    onChange={e => setScheduleFilterModality(e.target.value)}
                    className="border border-slate-200 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 w-full md:w-48"
                >
                    <option value="all">Todas Modalidades</option>
                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                
                {selectedSessionIds.size > 0 && (
                    <div className="md:ml-auto flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                            {selectedSessionIds.size} selecionados
                        </span>
                        <button 
                            onClick={handleDeleteSelected}
                            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 flex items-center gap-1.5 shadow-sm"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                    </div>
                )}
            </div>

            {showSessionForm && (
              <div className={`bg-white p-6 rounded-xl border-2 ${editingSessionId ? 'border-orange-200 ring-2 ring-orange-50' : 'border-indigo-50'} shadow-xl animate-in slide-in-from-top-4`}>
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-indigo-900 flex items-center gap-2">
                        {isBatchMode ? <><Copy className="w-5 h-5 text-indigo-600" /> Criação em Lote</> : <><Calendar className="w-5 h-5 text-indigo-600" /> {editingSessionId ? 'Editar Aula' : 'Nova Aula Avulsa'}</>}
                    </h3>
                    <button onClick={() => { setShowSessionForm(false); setEditingSessionId(null); }} className="text-slate-400 hover:text-slate-600"><X /></button>
                 </div>

                 {isBatchMode ? (
                     <form onSubmit={handleBatchSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Modalidade</label>
                                <select 
                                    value={batchForm.modalityId} 
                                    onChange={e => setBatchForm({...batchForm, modalityId: e.target.value})} 
                                    className="w-full border rounded-lg p-2 text-sm" 
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Professor</label>
                                <select 
                                    value={batchForm.instructor} 
                                    onChange={e => setBatchForm({...batchForm, instructor: e.target.value})} 
                                    className="w-full border rounded-lg p-2 text-sm" 
                                    required
                                    disabled={!batchForm.modalityId}
                                >
                                    <option value="">{batchForm.modalityId ? 'Selecionar...' : 'Escolha modalidade'}</option>
                                    {teachers.filter(t => t.modalityId === batchForm.modalityId).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Data Início</label>
                                <input type="date" value={batchForm.startDate} onChange={e => setBatchForm({...batchForm, startDate: e.target.value})} className="w-full border rounded-lg p-2 text-sm" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Data Fim</label>
                                <input type="date" value={batchForm.endDate} onChange={e => setBatchForm({...batchForm, endDate: e.target.value})} className="w-full border rounded-lg p-2 text-sm" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Dias da Semana</label>
                            <div className="flex flex-wrap gap-2">
                                {WEEK_DAYS.map(day => (
                                    <button
                                        key={day.val}
                                        type="button"
                                        onClick={() => {
                                            const newDays = batchForm.daysOfWeek.includes(day.val) 
                                                ? batchForm.daysOfWeek.filter(d => d !== day.val)
                                                : [...batchForm.daysOfWeek, day.val];
                                            setBatchForm({...batchForm, daysOfWeek: newDays});
                                        }}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${batchForm.daysOfWeek.includes(day.val) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Horários (HH:mm)</label>
                             <div className="flex flex-wrap gap-2 items-center">
                                {batchForm.times.map((time, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-indigo-50 p-1 rounded-lg border border-indigo-100">
                                        <input 
                                            type="time" 
                                            value={time} 
                                            onChange={e => {
                                                const newTimes = [...batchForm.times];
                                                newTimes[idx] = e.target.value;
                                                setBatchForm({...batchForm, times: newTimes});
                                            }}
                                            className="bg-transparent text-sm font-bold text-indigo-700 focus:outline-none"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setBatchForm({...batchForm, times: batchForm.times.filter((_, i) => i !== idx)})}
                                            className="text-indigo-300 hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button" 
                                    onClick={() => setBatchForm({...batchForm, times: [...batchForm.times, '08:00']})}
                                    className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                            <input type="number" value={batchForm.capacity} onChange={e => setBatchForm({...batchForm, capacity: parseInt(e.target.value)})} className="border rounded-lg p-2 text-sm" placeholder="Capacidade" required />
                            <input type="text" value={batchForm.category} onChange={e => setBatchForm({...batchForm, category: e.target.value})} className="border rounded-lg p-2 text-sm" placeholder="Categoria (Iniciante, etc)" />
                            <div className="flex gap-2">
                                <button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                                    {formLoading ? 'Processando...' : 'Gerar Grade'}
                                </button>
                                <button type="button" onClick={() => setShowSessionForm(false)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg font-medium">Cancelar</button>
                            </div>
                        </div>
                     </form>
                 ) : (
                     <form onSubmit={handleSessionSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select value={sessionForm.modalityId} onChange={e => setSessionForm({...sessionForm, modalityId: e.target.value})} className="border rounded-lg p-2 text-sm" required>
                                <option value="">Modalidade...</option>
                                {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <input type="date" value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})} className="border rounded-lg p-2 text-sm" required />
                            <input type="time" value={sessionForm.time} onChange={e => setSessionForm({...sessionForm, time: e.target.value})} className="border rounded-lg p-2 text-sm" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select value={sessionForm.instructor} onChange={e => setSessionForm({...sessionForm, instructor: e.target.value})} className="border rounded-lg p-2 text-sm" required disabled={!sessionForm.modalityId}>
                                <option value="">{sessionForm.modalityId ? 'Professor...' : 'Escolha modalidade'}</option>
                                {teachers.filter(t => t.modalityId === sessionForm.modalityId).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                            <input type="number" value={sessionForm.capacity} onChange={e => setSessionForm({...sessionForm, capacity: parseInt(e.target.value)})} className="border rounded-lg p-2 text-sm" placeholder="Capacidade" required />
                            <input type="text" value={sessionForm.category} onChange={e => setSessionForm({...sessionForm, category: e.target.value})} className="border rounded-lg p-2 text-sm" placeholder="Categoria" />
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-4">
                            <button type="submit" className={`${editingSessionId ? 'bg-orange-600' : 'bg-indigo-600'} text-white px-6 py-2 rounded-lg font-bold shadow-md`}>
                                {editingSessionId ? 'Atualizar Aula' : 'Adicionar Única'}
                            </button>
                            <button type="button" onClick={() => { setShowSessionForm(false); setEditingSessionId(null); }} className="bg-slate-100 px-4 py-2 rounded-lg font-medium">Cancelar</button>
                        </div>
                     </form>
                 )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 font-bold text-slate-500">
                  <tr className="text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-4 text-left w-12">
                        <button onClick={selectAllFiltered} className="text-slate-400 hover:text-indigo-600 transition-colors">
                            {selectedSessionIds.size === filteredScheduleSessions.length && filteredScheduleSessions.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                    </th>
                    <th className="px-6 py-4 text-left">Data/Hora</th>
                    <th className="px-6 py-4 text-left">Modalidade</th>
                    <th className="px-6 py-4 text-left">Instrutor</th>
                    <th className="px-6 py-4 text-center">Vagas</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredScheduleSessions.map(s => {
                    const m = modalities.find(mod => mod.id === s.modalityId);
                    const isSelected = selectedSessionIds.has(s.id);
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition-colors text-sm ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                        <td className="px-6 py-4">
                            <button onClick={() => toggleSessionSelection(s.id)} className={`transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}>
                                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{format(parseISO(s.startTime), 'dd/MM HH:mm')}</td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col">
                                <span className="font-medium">{m?.name}</span>
                                {s.category && <span className="text-[10px] text-slate-400 font-bold uppercase">{s.category}</span>}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{s.instructor}</td>
                        <td className="px-6 py-4 text-center">
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{s.capacity}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
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
                                className="text-slate-300 hover:text-orange-500 transition-colors"
                                title="Editar Aula"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => openDeleteModal('session', s.id, 'Excluir Aula', `Deseja excluir a aula de ${m?.name} em ${format(parseISO(s.startTime), 'dd/MM HH:mm')}?`)} 
                                className="text-slate-300 hover:text-red-500 transition-colors"
                                title="Excluir Aula"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredScheduleSessions.length === 0 && (
                <div className="p-12 text-center text-slate-400 bg-slate-50/50">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-10" />
                    <p>Nenhuma aula encontrada para os filtros aplicados.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
             <h1 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h1>
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-700">Regras de Agendamento</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Hora de Liberação (Amanhã)</label>
                        <p className="text-xs text-slate-500 mb-4">Define a partir de qual hora as aulas do dia seguinte ficarão disponíveis para reserva pelos alunos.</p>
                        <div className="flex items-center gap-4">
                            <select 
                                value={bookingReleaseHour} 
                                onChange={(e) => updateBookingReleaseHour(e.target.value)}
                                className="border rounded-lg p-2 font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                            >
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                ))}
                            </select>
                            <span className="text-sm font-medium text-slate-400">Atualmente em: {bookingReleaseHour.toString().padStart(2, '0')}:00</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'modalities' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Modalidades Esportivas</h1>
              <button onClick={() => setShowModalityForm(!showModalityForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Nova Modalidade
              </button>
            </div>
            {showModalityForm && (
              <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2">
                <form onSubmit={handleModalitySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={modalityForm.name} onChange={e => setModalityForm({...modalityForm, name: e.target.value})} className="w-full border rounded-lg p-2" placeholder="Nome" required />
                    <input type="text" value={modalityForm.imageUrl} onChange={e => setModalityForm({...modalityForm, imageUrl: e.target.value})} className="w-full border rounded-lg p-2" placeholder="URL Imagem" />
                  </div>
                  <textarea value={modalityForm.description} onChange={e => setModalityForm({...modalityForm, description: e.target.value})} className="w-full border rounded-lg p-2" rows="2" placeholder="Descrição" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowModalityForm(false)} className="bg-slate-100 px-4 py-2 rounded-lg">Cancelar</button>
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Salvar</button>
                  </div>
                </form>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {modalities.map(modality => (
                <div key={modality.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col group">
                  <div className="h-32 bg-slate-200 relative">
                    {modality.imageUrl && <img src={modality.imageUrl} className="w-full h-full object-cover" />}
                    <button 
                      onClick={() => openDeleteModal('modality', modality.id, 'Excluir Modalidade', `Tem certeza que deseja excluir a modalidade "${modality.name}"? Isso pode afetar aulas agendadas.`)} 
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4"><h3 className="font-bold">{modality.name}</h3></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Professores</h1>
              <button 
                onClick={() => {
                  if(showTeacherForm && editingTeacherId) {
                    resetTeacherForm();
                  } else {
                    setShowTeacherForm(!showTeacherForm);
                  }
                }} 
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Novo
              </button>
            </div>
            {showTeacherForm && (
              <div className={`bg-white p-6 rounded-xl border shadow-sm animate-in slide-in-from-top-2 ${editingTeacherId ? 'border-orange-200 ring-2 ring-orange-50' : 'border-indigo-100'}`}>
                <form onSubmit={handleTeacherSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome</label>
                        <input type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Carlos Silva" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                        <input type="email" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="email@exemplo.com" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Telefone</label>
                        <input type="text" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: formatPhone(e.target.value)})} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="(00) 00000-0000" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modalidade Principal</label>
                        <select 
                            value={teacherForm.modalityId} 
                            onChange={e => setTeacherForm({...teacherForm, modalityId: e.target.value})} 
                            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" 
                            required
                        >
                            <option value="">Selecione...</option>
                            {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 md:col-span-2">
                        <button type="submit" disabled={formLoading} className={`${editingTeacherId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-lg text-sm font-bold flex-1 shadow-sm transition-colors`}>
                            {formLoading ? 'Processando...' : editingTeacherId ? 'Atualizar Dados' : 'Salvar Cadastro'}
                        </button>
                        <button type="button" onClick={resetTeacherForm} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            Cancelar
                        </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 font-bold text-slate-500 text-xs">
                        <tr><th className="px-6 py-4 text-left">Nome</th><th className="px-6 py-4 text-left">Modalidade</th><th className="px-6 py-4 text-left">Contato</th><th className="px-6 py-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {teachers.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 text-sm group">
                                <td className="px-6 py-4 font-medium text-slate-800">{t.name}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                                        {modalities.find(m => m.id === t.modalityId)?.name || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    <div className="flex flex-col text-[11px]">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {t.email}</span>
                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {t.phone}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => { setEditingTeacherId(t.id); setTeacherForm(t); setShowTeacherForm(true); }} 
                                        className="p-1.5 text-indigo-400 hover:text-indigo-600"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => openDeleteModal('user', t.id, 'Desativar Professor', `Deseja realmente desativar o acesso do professor ${t.name}?`)} 
                                        className="p-1.5 text-red-300 hover:text-red-500"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Alunos</h1>
              <button onClick={() => setShowStudentForm(!showStudentForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"><Plus className="w-4 h-4" /> Novo</button>
            </div>
            {showStudentForm && (
              <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2">
                <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="border rounded-lg p-2 text-sm" placeholder="Nome" required />
                  <input type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="border rounded-lg p-2 text-sm" placeholder="E-mail" required />
                  <input type="text" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: formatPhone(e.target.value)})} className="border rounded-lg p-2 text-sm" placeholder="Telefone" required />
                  <input type="text" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="border rounded-lg p-2 text-sm font-mono" required />
                  <div className="flex gap-2">
                    <button type="submit" disabled={formLoading} className="bg-indigo-600 text-white px-4 rounded-lg text-sm font-bold flex-1">{formLoading ? '...' : 'Salvar'}</button>
                    <button type="button" onClick={() => setShowStudentForm(false)} className="bg-slate-100 px-2 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                </form>
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 font-bold text-slate-500 text-xs text-left">
                        <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Contato</th><th className="px-6 py-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {students.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 text-sm">
                                <td className="px-6 py-4 font-medium">{s.name}</td>
                                <td className="px-6 py-4 text-slate-500">{s.email} | {s.phone}</td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => openDeleteModal('user', s.id, 'Desativar Aluno', `Deseja realmente desativar o acesso do aluno ${s.name}?`)} 
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-3">
                     <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-indigo-500" /> Data:
                     </label>
                     <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="flex items-center gap-3">
                     <label className="text-sm font-bold text-slate-600 flex items-center gap-1">
                        <Layers className="w-4 h-4 text-indigo-500" /> Modalidade:
                     </label>
                     <select 
                        value={reportModality} 
                        onChange={(e) => setReportModality(e.target.value)}
                        className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-w-[180px]"
                     >
                        <option value="all">Todas as Modalidades</option>
                        {modalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                     </select>
                </div>
            </div>
            
            <div className="space-y-4">
              {sessions
                .filter(s => {
                    const dateMatch = isSameDay(parseISO(s.startTime), parseISO(reportDate));
                    const modalityMatch = reportModality === 'all' || s.modalityId === reportModality;
                    return dateMatch && modalityMatch;
                })
                .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map(s => {
                  const stats = getSessionStats(s.id);
                  const isExpanded = expandedSessionId === s.id;
                  const sessionBookings = bookings.filter(b => b.sessionId === s.id);
                  
                  return (
                    <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div 
                        onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-black text-lg">
                            {format(parseISO(s.startTime), 'HH:mm')}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{modalities.find(m => m.id === s.modalityId)?.name}</h3>
                            <p className="text-xs text-slate-500 font-medium">{s.instructor} {s.category && `| ${s.category}`}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-indigo-600">{stats.total}/{s.capacity}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Reservas Ativas</p>
                          </div>
                          {stats.cancelled > 0 && (
                            <div className="text-center">
                              <p className="text-lg font-bold text-red-400">{stats.cancelled}</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Cancelados</p>
                            </div>
                          )}
                          {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t border-slate-100 animate-in slide-in-from-top-2">
                          <div className="divide-y divide-slate-100">
                            {sessionBookings.length > 0 ? (
                              sessionBookings.map(b => {
                                const student = users.find(u => u.id === b.userId);
                                const isCancelled = b.status === BookingStatus.CANCELLED;
                                return (
                                  <div key={b.id} className={`px-6 py-3 flex items-center justify-between ${isCancelled ? 'bg-red-50/20 grayscale opacity-60' : 'hover:bg-indigo-50/30'}`}>
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isCancelled ? 'bg-slate-300' : 'bg-indigo-500'}`}>
                                        {student?.name?.charAt(0)}
                                      </div>
                                      <div>
                                        <p className={`text-sm font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{student?.name}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                            <span className="font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{student?.planType || 'Mensalista'}</span>
                                            <span>{student?.phone}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      {!isCancelled && (
                                        <button 
                                          onClick={() => openDeleteModal('cancel_booking', b.id, 'Cancelar Reserva', `Deseja realmente remover a reserva do aluno ${student?.name}?`)}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                        >
                                          <UserX className="w-3.5 h-3.5" /> Cancelar Aluno
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-8 text-center text-slate-400 text-sm">
                                Nenhuma reserva registrada para este horário.
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
