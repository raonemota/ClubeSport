import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabaseClient.js';
import { Plus, Trash2, Calendar, Dumbbell, Users, Repeat, X, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit2, Save, Upload, Loader2, Search, UserPlus, Phone, Key, Settings, FileText, ClipboardList, Filter } from 'lucide-react';
import { format, addDays, getDay, isSameDay, parseISO } from 'date-fns';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { UserRole } from '../../types.js';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
];

export const AdminPanel = () => {
  const { 
      modalities, sessions, users, bookings, bookingReleaseHour,
      addModality, updateModality, deleteModality, 
      addSession, updateSession, deleteSession, 
      registerStudent, updateUser, deleteUser, resetUserPassword, updateBookingReleaseHour,
      getSessionBookingsCount 
    } = useStore();
  
  const [activeTab, setActiveTab] = useState('modalities');

  // Confirmation Modal State
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // --- State for Modalities ---
  const [editingModalityId, setEditingModalityId] = useState(null);
  const [formModName, setFormModName] = useState('');
  const [formModDesc, setFormModDesc] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // --- State for Bulk Generator ---
  const [newSessionModalityId, setNewSessionModalityId] = useState('');
  const [newSessionInstructor, setNewSessionInstructor] = useState('');
  const [newSessionCategory, setNewSessionCategory] = useState('');
  const [newSessionStartDate, setNewSessionStartDate] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [newSessionCapacity, setNewSessionCapacity] = useState('10');
  const [selectedDays, setSelectedDays] = useState([]);
  const [weeksToRepeat, setWeeksToRepeat] = useState('4');

  // --- State for Daily Manager (View/Edit) ---
  const [viewDate, setViewDate] = useState(new Date());
  const [viewModalityId, setViewModalityId] = useState('all');
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editForm, setEditForm] = useState({ time: '', instructor: '', capacity: '', category: '' });

  // --- State for Students ---
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentForm, setStudentForm] = useState({
      name: '',
      phone: '',
      planType: 'Mensalista',
      observation: '',
      email: '',
      password: ''
  });
  const [studentSearch, setStudentSearch] = useState('');

  // --- State for Reports ---
  const [reportDate, setReportDate] = useState(new Date());
  const [reportModalityId, setReportModalityId] = useState('all');
  const [collapsedReports, setCollapsedReports] = useState(new Set());

  const closeConfirmation = () => setConfirmation({ ...confirmation, isOpen: false });

  // --- Modality Actions ---
  
  const startEditingModality = (modality) => {
    setEditingModalityId(modality.id);
    setFormModName(modality.name);
    setFormModDesc(modality.description);
    setImageFile(null); 
    
    const fileInput = document.getElementById('modality-image-input');
    if (fileInput) fileInput.value = '';
  };

  const cancelEditingModality = () => {
    setEditingModalityId(null);
    setFormModName('');
    setFormModDesc('');
    setImageFile(null);
    
    const fileInput = document.getElementById('modality-image-input');
    if (fileInput) fileInput.value = '';
  };

  const handleModalityFormSubmit = async (e) => {
    e.preventDefault();
    if (!formModName) return;
    
    setUploading(true);
    
    try {
        let finalImageUrl = undefined;

        if (imageFile) {
            if (supabase) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('modality-images')
                    .upload(fileName, imageFile);

                if (uploadError) {
                    console.error('Erro no upload:', uploadError);
                    alert('Erro ao fazer upload da imagem. A operação continuará com a imagem antiga ou padrão.');
                } else {
                    const { data } = supabase.storage
                        .from('modality-images')
                        .getPublicUrl(fileName);
                    finalImageUrl = data.publicUrl;
                }
            } else {
                alert('Modo de demonstração: Upload de arquivo simulado.');
                finalImageUrl = `https://picsum.photos/400/200?random=${Date.now()}`;
            }
        }

        if (editingModalityId) {
            await updateModality(editingModalityId, {
                name: formModName,
                description: formModDesc,
                imageUrl: finalImageUrl 
            });
            alert('Modalidade atualizada com sucesso!');
        } else {
            await addModality({
                name: formModName,
                description: formModDesc,
                imageUrl: finalImageUrl || `https://picsum.photos/400/200?random=${Date.now()}`
            });
        }

        cancelEditingModality();

    } catch (error) {
        console.error(error);
        alert('Ocorreu um erro ao salvar a modalidade.');
    } finally {
        setUploading(false);
    }
  };

  const requestDeleteModality = (id) => {
    setConfirmation({
        isOpen: true,
        title: 'Excluir Modalidade',
        message: 'Tem certeza que deseja excluir esta modalidade? Todas as aulas futuras associadas também serão removidas.',
        onConfirm: () => deleteModality(id)
    });
  };

  // --- Bulk Generator Actions ---
  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
        setSelectedDays(selectedDays.filter(d => d !== dayId));
    } else {
        setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleAddTime = () => {
    if (timeInput && !selectedTimes.includes(timeInput)) {
        const sortedTimes = [...selectedTimes, timeInput].sort();
        setSelectedTimes(sortedTimes);
        setTimeInput('');
    }
  };

  const removeTime = (timeToRemove) => {
      setSelectedTimes(selectedTimes.filter(t => t !== timeToRemove));
  };

  const handleAddSessions = (e) => {
    e.preventDefault();
    if (!newSessionModalityId || !newSessionStartDate || selectedTimes.length === 0 || selectedDays.length === 0) {
        alert("Preencha todos os campos obrigatórios, selecione dias e adicione horários.");
        return;
    }

    const startDate = new Date(`${newSessionStartDate}T00:00:00`);
    const durationWeeks = parseInt(weeksToRepeat) || 1;
    const totalSessions = durationWeeks * selectedDays.length * selectedTimes.length;
    
    if (totalSessions > 50) {
        setConfirmation({
            isOpen: true,
            title: 'Confirmar Geração em Lote',
            message: `Você está prestes a criar ${totalSessions} aulas. Deseja continuar?`,
            onConfirm: () => generateSessions(startDate, durationWeeks)
        });
    } else {
        generateSessions(startDate, durationWeeks);
    }
  };

  const generateSessions = (startDate, durationWeeks) => {
    for (let i = 0; i < durationWeeks * 7; i++) {
        const currentDate = addDays(startDate, i);
        const dayOfWeek = getDay(currentDate);

        if (selectedDays.includes(dayOfWeek)) {
            selectedTimes.forEach(timeStr => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const sessionDate = new Date(currentDate);
                sessionDate.setHours(hours, minutes, 0, 0);

                addSession({
                    modalityId: newSessionModalityId,
                    instructor: newSessionInstructor,
                    startTime: sessionDate.toISOString(),
                    durationMinutes: 60,
                    capacity: parseInt(newSessionCapacity),
                    category: newSessionCategory || undefined
                });
            });
        }
    }
  };

  // --- Daily Manager Actions ---
  const requestDeleteSession = (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Cancelar Aula',
      message: 'Tem certeza que deseja remover esta aula da grade? Os alunos inscritos perderão o agendamento.',
      onConfirm: () => deleteSession(id)
    });
  };

  const startEditing = (session) => {
      setEditingSessionId(session.id);
      setEditForm({
          time: format(new Date(session.startTime), 'HH:mm'),
          instructor: session.instructor,
          capacity: session.capacity.toString(),
          category: session.category || ''
      });
  };

  const cancelEditing = () => {
      setEditingSessionId(null);
  };

  const saveEditing = (originalSession) => {
      const [hours, minutes] = editForm.time.split(':').map(Number);
      const originalDate = new Date(originalSession.startTime);
      const newDate = new Date(originalDate);
      newDate.setHours(hours, minutes, 0, 0);

      updateSession(originalSession.id, {
          instructor: editForm.instructor,
          capacity: parseInt(editForm.capacity),
          startTime: newDate.toISOString(),
          category: editForm.category || undefined
      });
      setEditingSessionId(null);
  };

  // --- Student Actions ---
  const startEditingStudent = (student) => {
      setEditingStudentId(student.id);
      setStudentForm({
          name: student.name,
          phone: student.phone || '',
          planType: student.planType || 'Mensalista',
          observation: student.observation || '',
          email: student.email,
          password: ''
      });
      setShowStudentForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestDeleteStudent = (student) => {
      setConfirmation({
          isOpen: true,
          title: 'Excluir Aluno',
          message: `Tem certeza que deseja excluir o aluno ${student.name}? Todo o histórico de agendamentos será mantido para fins de registro, mas o aluno não terá mais acesso.`,
          onConfirm: () => {
              deleteUser(student.id);
          }
      });
  };

  const requestResetPassword = (student) => {
      setConfirmation({
          isOpen: true,
          title: 'Redefinir Senha',
          message: `Deseja enviar um e-mail de redefinição de senha para ${student.email}?`,
          onConfirm: async () => {
              const success = await resetUserPassword(student.email);
              if (success) {
                  alert(`Email de redefinição enviado para ${student.email}`);
              } else {
                  alert('Erro ao enviar email. Verifique se o sistema está configurado corretamente.');
              }
          }
      });
  };

  const cancelEditingStudent = () => {
      setEditingStudentId(null);
      setStudentForm({ name: '', phone: '', planType: 'Mensalista', observation: '', email: '', password: '' });
      setShowStudentForm(false);
  };

  const handleRegisterStudent = async (e) => {
      e.preventDefault();
      setUploading(true);
      try {
          if (editingStudentId) {
              await updateUser(editingStudentId, {
                  name: studentForm.name,
                  phone: studentForm.phone,
                  planType: studentForm.planType,
                  observation: studentForm.observation
              });
              alert('Dados do aluno atualizados com sucesso!');
              cancelEditingStudent();
          } else {
              const result = await registerStudent({
                  name: studentForm.name,
                  phone: studentForm.phone,
                  planType: studentForm.planType,
                  observation: studentForm.observation,
                  email: studentForm.email || undefined,
                  password: studentForm.password || undefined
              });

              if (result.success) {
                  alert(result.message || 'Aluno cadastrado com sucesso!');
                  setStudentForm({ name: '', phone: '', planType: 'Mensalista', observation: '', email: '', password: '' });
                  setShowStudentForm(false);
              } else {
                  alert(result.message || 'Erro ao cadastrar aluno.');
              }
          }
      } finally {
          setUploading(false);
      }
  };

  const dailySessions = sessions.filter(s => {
      const isSameDate = isSameDay(new Date(s.startTime), viewDate);
      const isSameModality = viewModalityId === 'all' || s.modalityId === viewModalityId;
      return isSameDate && isSameModality;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const filteredStudents = users.filter(u => 
      u.role === UserRole.STUDENT && 
      (u.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
       u.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
       u.phone?.includes(studentSearch))
  );

  // --- Report Helpers ---
  const reportSessions = sessions.filter(s => {
      const isDateMatch = isSameDay(new Date(s.startTime), reportDate);
      const isModalityMatch = reportModalityId === 'all' || s.modalityId === reportModalityId;
      return isDateMatch && isModalityMatch;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const toggleReportCollapse = (sessionId) => {
      const newSet = new Set(collapsedReports);
      if (newSet.has(sessionId)) {
          newSet.delete(sessionId);
      } else {
          newSet.add(sessionId);
      }
      setCollapsedReports(newSet);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <ConfirmationModal 
        isOpen={confirmation.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
        <p className="text-gray-500 mt-2">Gerencie modalidades, grade horária e alunos do clube.</p>
      </div>

      <div className="border-b border-gray-200 mb-8 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('modalities')}
            className={`${activeTab === 'modalities' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Dumbbell className="w-4 h-4" />
            Modalidades
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`${activeTab === 'schedule' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Calendar className="w-4 h-4" />
            Grade Horária
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`${activeTab === 'students' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Users className="w-4 h-4" />
            Alunos
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`${activeTab === 'reports' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            Relatórios
          </button>
        </nav>
      </div>

      {activeTab === 'modalities' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {editingModalityId ? 'Editar Modalidade' : 'Nova Modalidade'}
                </h3>
                {editingModalityId && (
                    <button 
                        onClick={cancelEditingModality}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                    >
                        <X className="w-3 h-3" /> Cancelar
                    </button>
                )}
            </div>
            
            <form onSubmit={handleModalityFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Esporte</label>
                <input
                  type="text"
                  value={formModName}
                  onChange={(e) => setFormModName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Natação"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={formModDesc}
                  onChange={(e) => setFormModDesc(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Descrição breve..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingModalityId ? 'Alterar Capa (Opcional)' : 'Imagem de Capa'}
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors relative">
                    <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                            <label htmlFor="modality-image-input" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                <span>Upload de arquivo</span>
                                <input 
                                    id="modality-image-input" 
                                    name="modality-image-input" 
                                    type="file" 
                                    className="sr-only" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setImageFile(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                            <p className="pl-1">ou arraste</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF até 5MB</p>
                    </div>
                </div>
                {imageFile && (
                    <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                        <span className="font-medium">Selecionado:</span> {imageFile.name}
                    </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={uploading}
                className={`w-full flex items-center justify-center gap-2 text-white px-4 py-2 rounded-md transition disabled:opacity-50 ${editingModalityId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {uploading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                ) : editingModalityId ? (
                    <>
                        <Save className="w-4 h-4" /> Salvar Alterações
                    </>
                ) : (
                    <>
                        <Plus className="w-4 h-4" /> Criar Modalidade
                    </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modalities.map(modality => (
              <div key={modality.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col transition-all ${editingModalityId === modality.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-100'}`}>
                <div className="h-32 bg-gray-200 relative">
                    <img src={modality.imageUrl} alt={modality.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                        <button 
                            onClick={() => startEditingModality(modality)}
                            className="bg-white/90 p-1.5 rounded-full text-indigo-600 hover:bg-indigo-50 transition shadow-sm"
                            title="Editar modalidade"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => requestDeleteModality(modality.id)}
                            className="bg-white/90 p-1.5 rounded-full text-red-600 hover:bg-red-50 transition shadow-sm"
                            title="Excluir modalidade"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-4 flex-1">
                  <h3 className="font-bold text-gray-900">{modality.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{modality.description}</p>
                </div>
              </div>
            ))}
            {modalities.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhuma modalidade cadastrada.
                </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" /> Regra de Liberação
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Liberar agenda do dia seguinte às:
                        </label>
                        <select 
                            value={bookingReleaseHour} 
                            onChange={(e) => updateBookingReleaseHour(parseInt(e.target.value))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {Array.from({ length: 24 }).map((_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Os alunos só poderão reservar aulas para "Amanhã" após o horário definido. Aulas do dia atual ("Hoje") estão sempre liberadas.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-indigo-600" /> Gerador em Lote
                </h3>
                <form onSubmit={handleAddSessions} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Modalidade</label>
                    <select
                    value={newSessionModalityId}
                    onChange={(e) => setNewSessionModalityId(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                    <option value="">Selecione...</option>
                    {modalities.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Início (Data Base)</label>
                    <input
                    type="date"
                    value={newSessionStartDate}
                    onChange={(e) => setNewSessionStartDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Horários das Aulas</label>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="time"
                            value={timeInput}
                            onChange={(e) => setTimeInput(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button 
                            type="button" 
                            onClick={handleAddTime}
                            className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md hover:bg-indigo-200"
                        >
                            Adicionar
                        </button>
                    </div>
                    {selectedTimes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 p-2 bg-gray-50 rounded-md">
                            {selectedTimes.map(time => (
                                <span key={time} className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-md text-sm text-gray-700">
                                    <Clock className="w-3 h-3 text-indigo-500" />
                                    {time}
                                    <button type="button" onClick={() => removeTime(time)} className="text-red-400 hover:text-red-600">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dias da Semana</label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                type="button"
                                key={day.id}
                                onClick={() => toggleDay(day.id)}
                                className={`w-9 h-9 rounded-full text-xs font-bold transition-colors ${
                                    selectedDays.includes(day.id) 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Repetir (Semanas)</label>
                    <input
                    type="number"
                    min="1"
                    max="52"
                    value={weeksToRepeat}
                    onChange={(e) => setWeeksToRepeat(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Instrutor</label>
                        <input
                        type="text"
                        value={newSessionInstructor}
                        onChange={(e) => setNewSessionInstructor(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Vagas</label>
                        <input
                        type="number"
                        min="1"
                        value={newSessionCapacity}
                        onChange={(e) => setNewSessionCapacity(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Categoria/Nível (Opcional)</label>
                    <input
                        type="text"
                        placeholder="Ex: Iniciante"
                        value={newSessionCategory}
                        onChange={(e) => setNewSessionCategory(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
                >
                    <Plus className="w-4 h-4" /> Gerar Aulas
                </button>
                </form>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                        <button 
                            onClick={() => setViewDate(addDays(viewDate, -1))}
                            className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-4 py-1 text-center min-w-[150px]">
                            <span className="block text-sm font-bold text-gray-900 capitalize">
                                {new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(viewDate)}
                            </span>
                            <span className="block text-xs text-gray-500">
                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(viewDate)}
                            </span>
                        </div>
                        <button 
                            onClick={() => setViewDate(addDays(viewDate, 1))}
                            className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <select
                        value={viewModalityId}
                        onChange={(e) => setViewModalityId(e.target.value)}
                        className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="all">Todas as Modalidades</option>
                        {modalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div className="p-6">
                     <div className="space-y-4">
                        {dailySessions.map(session => {
                            const modality = modalities.find(m => m.id === session.modalityId);
                            const bookedCount = getSessionBookingsCount(session.id);
                            const isEditing = editingSessionId === session.id;

                            if (isEditing) {
                                return (
                                    <div key={session.id} className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Horário</label>
                                                <input 
                                                    type="time" 
                                                    value={editForm.time}
                                                    onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                                                    className="mt-1 block w-full text-sm rounded-md border-gray-300"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Instrutor</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm.instructor}
                                                    onChange={(e) => setEditForm({...editForm, instructor: e.target.value})}
                                                    className="mt-1 block w-full text-sm rounded-md border-gray-300"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Vagas Totais</label>
                                                <input 
                                                    type="number" 
                                                    value={editForm.capacity}
                                                    onChange={(e) => setEditForm({...editForm, capacity: e.target.value})}
                                                    className="mt-1 block w-full text-sm rounded-md border-gray-300"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Categoria (Opcional)</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm.category}
                                                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                                    placeholder="Ex: Iniciante"
                                                    className="mt-1 block w-full text-sm rounded-md border-gray-300"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={cancelEditing}
                                                className="px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded border border-gray-300 hover:bg-gray-50"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={() => saveEditing(session)}
                                                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 flex items-center gap-1"
                                            >
                                                <Save className="w-3 h-3" /> Salvar
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={session.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="bg-gray-50 text-gray-900 p-3 rounded-lg text-center min-w-[70px]">
                                            <span className="block text-xl font-bold">{format(new Date(session.startTime), 'HH:mm')}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900">{modality?.name || 'Desconhecido'}</h4>
                                                {session.category && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                        {session.category}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {session.instructor}</span>
                                                <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                                                <span>{bookedCount}/{session.capacity} Inscritos</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 self-end sm:self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => startEditing(session)}
                                            className="text-gray-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition"
                                            title="Editar Aula"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => requestDeleteSession(session.id)}
                                            className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                                            title="Cancelar Aula"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {dailySessions.length === 0 && (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <p>Nenhuma aula agendada para este dia.</p>
                                <p className="text-sm mt-1">Use o gerador ao lado para adicionar aulas.</p>
                            </div>
                        )}
                     </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
          <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="relative max-w-sm w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                          type="text"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Buscar aluno por nome, email..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                      />
                  </div>
                  <button
                      onClick={() => setShowStudentForm(!showStudentForm)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
                  >
                      {showStudentForm ? (
                          <>
                              <X className="w-4 h-4 mr-2" /> Fechar Formulário
                          </>
                      ) : (
                          <>
                              <UserPlus className="w-4 h-4 mr-2" /> {editingStudentId ? 'Editar Aluno' : 'Cadastrar Aluno'}
                          </>
                      )}
                  </button>
              </div>

              {showStudentForm && (
                  <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6 animate-in slide-in-from-top-4 duration-300 relative">
                      {editingStudentId && (
                         <div className="absolute top-4 right-4">
                             <button onClick={cancelEditingStudent} className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
                                 <X className="w-4 h-4" /> Cancelar Edição
                             </button>
                         </div>
                      )}
                      <h3 className="text-lg font-bold text-gray-900 mb-4">{editingStudentId ? 'Editar Aluno' : 'Novo Cadastro'}</h3>
                      <form onSubmit={handleRegisterStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                              <input
                                  type="text"
                                  required
                                  value={studentForm.name}
                                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Telefone</label>
                              <input
                                  type="text"
                                  required
                                  placeholder="(00) 00000-0000"
                                  value={studentForm.phone}
                                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Email {editingStudentId ? '(Apenas Leitura)' : '(Opcional)'}</label>
                              <input
                                  type="email"
                                  value={studentForm.email}
                                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                                  placeholder="Para login futuro"
                                  readOnly={!!editingStudentId}
                                  className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 ${editingStudentId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Tipo de Plano</label>
                              <select
                                  value={studentForm.planType}
                                  onChange={(e) => setStudentForm({ ...studentForm, planType: e.target.value })}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                  <option value="Wellhub">Wellhub (Gympass)</option>
                                  <option value="Totalpass">Totalpass</option>
                                  <option value="Mensalista">Mensalista</option>
                                  <option value="Outro">Outro</option>
                              </select>
                          </div>
                          
                          {!editingStudentId && (
                              <div className="md:col-span-1">
                                  <label className="block text-sm font-medium text-gray-700">Senha Inicial</label>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                          <Key className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <input
                                          type="text"
                                          value={studentForm.password}
                                          onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                                          placeholder="Padrão: mudar@123"
                                          className="mt-1 block w-full pl-10 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                      />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Se vazio, será "mudar@123"</p>
                              </div>
                          )}

                          <div className={!editingStudentId ? "md:col-span-1" : "md:col-span-2"}>
                              <label className="block text-sm font-medium text-gray-700">Observação</label>
                              <textarea
                                  rows={!editingStudentId ? 1 : 2}
                                  value={studentForm.observation}
                                  onChange={(e) => setStudentForm({ ...studentForm, observation: e.target.value })}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Restrições médicas, preferências, etc."
                              />
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                              <button
                                  type="submit"
                                  disabled={uploading}
                                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingStudentId ? 'Atualizar Dados' : 'Salvar Aluno'}
                              </button>
                          </div>
                      </form>
                  </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {filteredStudents.map((student) => (
                                  <tr key={student.id} className="hover:bg-gray-50 transition">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                  {student.name.charAt(0).toUpperCase()}
                                              </div>
                                              <div className="ml-4">
                                                  <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                  <div className="text-xs text-gray-500">{student.email}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                              ${student.planType === 'Wellhub' ? 'bg-red-100 text-red-800' : 
                                                student.planType === 'Totalpass' ? 'bg-green-100 text-green-800' : 
                                                student.planType === 'Mensalista' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                              {student.planType || 'N/A'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-900 flex items-center gap-1">
                                              <Phone className="w-3 h-3 text-gray-400" /> 
                                              {student.phone || '-'}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="text-sm text-gray-500 max-w-xs truncate" title={student.observation}>
                                              {student.observation || '-'}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => requestResetPassword(student)}
                                                className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 transition"
                                                title="Redefinir Senha"
                                            >
                                                <Key className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => startEditingStudent(student)}
                                                className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition"
                                                title="Editar aluno"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => requestDeleteStudent(student)}
                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition"
                                                title="Excluir aluno"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                      </td>
                                  </tr>
                              ))}
                              {filteredStudents.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                          Nenhum aluno encontrado.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'reports' && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4 mb-6">
                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Dia</label>
                            <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setReportDate(addDays(reportDate, -1))}
                                        className="p-2 hover:bg-gray-100 rounded-lg border border-gray-300"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <input 
                                        type="date" 
                                        value={format(reportDate, 'yyyy-MM-dd')}
                                        onChange={(e) => setReportDate(parseISO(e.target.value))}
                                        className="block border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-900"
                                    />
                                    <button 
                                        onClick={() => setReportDate(addDays(reportDate, 1))}
                                        className="p-2 hover:bg-gray-100 rounded-lg border border-gray-300"
                                    >
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                    </button>
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar Modalidade</label>
                             <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Filter className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={reportModalityId}
                                    onChange={(e) => setReportModalityId(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    <option value="all">Todas as Modalidades</option>
                                    {modalities.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                             </div>
                        </div>
                      </div>
                      <div className="text-right">
                            <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Total de Aulas</span>
                            <div className="text-2xl font-bold text-gray-900">{reportSessions.length}</div>
                      </div>
                  </div>

                  <div className="space-y-6">
                      {reportSessions.map(session => {
                          const modality = modalities.find(m => m.id === session.modalityId);
                          const sessionBookings = bookings.filter(b => b.sessionId === session.id && b.status === 'CONFIRMED');
                          const isCollapsed = collapsedReports.has(session.id);
                          
                          return (
                              <div key={session.id} className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200">
                                  <div 
                                    className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                    onClick={() => toggleReportCollapse(session.id)}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold">
                                              {format(new Date(session.startTime), 'HH:mm')}
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900">{modality?.name}</h3>
                                                {session.category && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide border border-blue-200">
                                                        {session.category}
                                                    </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-gray-500">Instrutor: {session.instructor}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-sm font-medium text-gray-600">
                                            {sessionBookings.length} / {session.capacity} Alunos
                                        </div>
                                        <div className="text-gray-400">
                                            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                                        </div>
                                      </div>
                                  </div>
                                  
                                  {!isCollapsed && (
                                    <div className="overflow-x-auto animate-in fade-in duration-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-white">
                                                <tr>
                                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Aluno</th>
                                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plano</th>
                                                    <th className="px-6 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Reserva Feita em</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {sessionBookings.map(booking => {
                                                    const user = users.find(u => u.id === booking.userId);
                                                    return (
                                                        <tr key={booking.id}>
                                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {user?.name || 'Usuário Removido'}
                                                            </td>
                                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                                    ${user?.planType === 'Wellhub' ? 'bg-red-100 text-red-800' : 
                                                                        user?.planType === 'Totalpass' ? 'bg-green-100 text-green-800' : 
                                                                        user?.planType === 'Mensalista' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                    {user?.planType || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                                                                {format(new Date(booking.bookedAt), "dd/MM 'às' HH:mm")}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {sessionBookings.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400 italic">
                                                            Nenhum aluno inscrito nesta aula.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                  )}
                              </div>
                          );
                      })}
                      
                      {reportSessions.length === 0 && (
                          <div className="text-center py-12">
                              <div className="mx-auto h-12 w-12 text-gray-300">
                                  <ClipboardList className="h-full w-full" />
                              </div>
                              <h3 className="mt-2 text-sm font-medium text-gray-900">Sem atividades</h3>
                              <p className="mt-1 text-sm text-gray-500">Não há aulas encontradas com os filtros selecionados.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};