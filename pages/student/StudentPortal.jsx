import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, ChevronRight, Lock, Tag, AlertCircle, Bell, BellOff } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays, differenceInCalendarDays } from 'date-fns';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { FeedbackModal } from '../../components/FeedbackModal';

const getStatusColor = (current, max) => {
  const percentage = current / max;
  if (percentage >= 1) return 'bg-red-100 text-red-800';
  if (percentage >= 0.8) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const DailyClassGroup = ({ date, modalityId, sessions, onBookSession }) => {
    const { modalities, getSessionBookingsCount, bookings, currentUser, bookingReleaseHour } = useStore();
    const modality = modalities.find(m => m.id === modalityId);
    
    const dateObj = new Date(sessions[0].startTime); 
    let dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateObj);
    
    const now = new Date();
    const isDayToday = isToday(dateObj);
    const isDayTomorrow = isTomorrow(dateObj);
    
    if (isDayToday) dateLabel = "Hoje";
    if (isDayTomorrow) dateLabel = "Amanhã";

    let isLocked = false;
    if (!isDayToday) { 
        if (now.getHours() < bookingReleaseHour) {
            isLocked = true;
        }
    }

    const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden mb-6 transition-all duration-300 ${isLocked ? 'border-orange-100' : 'border-gray-100 hover:shadow-md'}`}>
            <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 bg-gray-100 relative h-48 md:h-auto group overflow-hidden">
                    <img 
                        src={modality?.imageUrl} 
                        alt={modality?.name} 
                        className={`w-full h-full object-cover transition-transform duration-700 ${isLocked ? 'grayscale opacity-70' : 'group-hover:scale-110'}`} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded w-fit mb-2 uppercase tracking-wider ${isLocked ? 'bg-gray-500' : 'bg-indigo-600'}`}>
                            {modality?.name}
                        </span>
                        <h3 className="text-2xl font-bold capitalize mb-1 flex items-center gap-2">
                            {dateLabel}
                            {isLocked && <Lock className="w-4 h-4 text-orange-400" />}
                        </h3>
                        <p className="text-sm opacity-90 font-light flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(dateObj, "dd/MM/yyyy")}
                        </p>
                    </div>
                </div>

                <div className="md:w-2/3 p-4 md:p-6 bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Grade de Horários
                        </h4>
                        <div className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">
                            {sortedSessions.length} turmas
                        </div>
                    </div>
                    
                    {isLocked && (
                        <div className="mb-4 bg-orange-50 border border-orange-100 text-orange-800 text-sm p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-orange-100 p-2 rounded-lg">
                                <Lock className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <span className="font-bold block text-base">Agenda Bloqueada</span>
                                <span className="text-sm opacity-90">
                                    Os agendamentos para o dia seguinte só são permitidos após as <strong>{bookingReleaseHour.toString().padStart(2, '0')}:00</strong>.
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                        {sortedSessions.map(session => {
                            const currentBooked = getSessionBookingsCount(session.id);
                            const isFull = currentBooked >= session.capacity;
                            const isBookedByUser = bookings.some(b => b.sessionId === session.id && b.userId === currentUser?.id && b.status === 'CONFIRMED');

                            return (
                                <div key={session.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-4 
                                    ${isLocked ? 'bg-gray-50/50 border-gray-100 opacity-80' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-indigo-100 hover:shadow-sm'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`rounded-xl px-3 py-2 text-center min-w-[75px] shadow-sm border ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
                                            <span className={`block font-bold text-lg ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{format(new Date(session.startTime), 'HH:mm')}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <p className={`text-sm font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
                                                    {session.instructor}
                                                </p>
                                                {session.category && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${isLocked ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                                        {session.category}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${isLocked ? 'bg-gray-200 text-gray-400' : getStatusColor(currentBooked, session.capacity)}`}>
                                                    {currentBooked}/{session.capacity} inscritos
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => onBookSession(session)}
                                        disabled={isFull || isBookedByUser || isLocked}
                                        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                                            ${isBookedByUser 
                                                ? 'bg-green-100 text-green-700 cursor-default border border-green-200' 
                                                : isLocked
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                    : isFull 
                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300' 
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95'
                                            }`}
                                    >
                                        {isBookedByUser ? (
                                            <><CheckCircle className="w-4 h-4" /> Inscrito</>
                                        ) : isLocked ? (
                                            <><Lock className="w-3.5 h-3.5"/> Bloqueado</>
                                        ) : isFull ? (
                                            'Lotado'
                                        ) : (
                                            'Reservar Vaga'
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MyBookingCard = ({ session, bookingId, bookedAt, onRequestCancel }) => {
  const { modalities } = useStore();
  const modality = modalities.find(m => m.id === session.modalityId);
  const date = new Date(session.startTime);
  
  let dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  if (isToday(date)) dateLabel = "Hoje";
  if (isTomorrow(date)) dateLabel = "Amanhã";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="h-24 bg-gray-200 relative">
           <img src={modality?.imageUrl} alt={modality?.name} className="w-full h-full object-cover opacity-80" />
           <div className="absolute inset-0 bg-black/40 flex items-center px-4">
              <span className="text-white font-bold text-lg">{modality?.name}</span>
           </div>
      </div>
      
      <div className="p-4">
          <div className="flex justify-between items-start mb-3">
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <p className="text-indigo-600 text-xs font-bold uppercase tracking-wide">{dateLabel}</p>
                      {session.category && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 rounded uppercase border border-blue-200">{session.category}</span>
                      )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{format(date, 'HH:mm')}</h3>
              </div>
          </div>
          
          <div className="space-y-2 mb-4">
              <p className="text-gray-500 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" /> {session.durationMinutes} min
              </p>
              <p className="text-gray-500 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" /> Prof. {session.instructor}
              </p>
              {bookedAt && (
                   <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      Reservado: {format(new Date(bookedAt), "dd/MM HH:mm")}
                   </p>
              )}
          </div>

           <button 
           onClick={() => onRequestCancel && onRequestCancel(bookingId)}
           className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition flex items-center justify-center gap-2 text-sm"
         >
           <XCircle className="w-4 h-4" /> Cancelar
         </button>
      </div>
    </div>
  );
};

export const StudentPortal = () => {
  const { modalities, sessions, bookings, currentUser, cancelBooking, bookSession, notificationsEnabled, requestNotificationPermission } = useStore();
  const [activeTab, setActiveTab] = useState('browse');
  const [filterModality, setFilterModality] = useState('all');

  const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: null });
  const [confirmBookingModal, setConfirmBookingModal] = useState({ isOpen: false, session: null });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const myBookings = bookings.filter(b => b.userId === currentUser?.id);
  const now = new Date();

  const filteredSessions = sessions
    .filter(s => filterModality === 'all' || s.modalityId === filterModality)
    .filter(s => {
        const sessionDate = new Date(s.startTime);
        if (isToday(sessionDate) && isPast(sessionDate)) return false;
        if (isPast(sessionDate) && !isToday(sessionDate)) return false;
        return differenceInCalendarDays(sessionDate, now) <= 1 && differenceInCalendarDays(sessionDate, now) >= 0;
    })
    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupedSessions = filteredSessions.reduce((acc, session) => {
      const dateKey = format(new Date(session.startTime), 'yyyy-MM-dd');
      const groupKey = `${dateKey}_${session.modalityId}`;
      if (!acc[groupKey]) acc[groupKey] = { date: dateKey, modalityId: session.modalityId, sessions: [] };
      acc[groupKey].sessions.push(session);
      return acc;
  }, {});

  const groupedSessionList = Object.values(groupedSessions).sort((a, b) => a.date.localeCompare(b.date));
  
  const handleInitiateBooking = (session) => setConfirmBookingModal({ isOpen: true, session });

  const executeBooking = async () => {
    const session = confirmBookingModal.session;
    if (!session) return;
    setConfirmBookingModal({ isOpen: false, session: null });
    const success = await bookSession(session.id);
    if (success) {
        setFeedbackModal({ isOpen: true, type: 'success', title: 'Reserva Confirmada!', message: `Sua aula de ${modalities.find(m => m.id === session.modalityId)?.name || 'Esporte'} está agendada.` });
    } else {
        setFeedbackModal({ isOpen: true, type: 'error', title: 'Erro na Reserva', message: 'Não foi possível completar a reserva. Verifique se o horário de agendamento já foi liberado ou se a turma está cheia.' });
    }
  };

  const handleRequestCancel = (bookingId) => setCancelModal({ isOpen: true, bookingId });
  const confirmCancel = () => {
      if (cancelModal.bookingId) cancelBooking(cancelModal.bookingId);
      setCancelModal({ isOpen: false, bookingId: null });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <ConfirmationModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ ...cancelModal, isOpen: false })}
        onConfirm={confirmCancel}
        title="Cancelar Agendamento"
        message="Tem certeza que deseja cancelar sua presença nesta aula?"
      />

      <ConfirmationModal
        isOpen={confirmBookingModal.isOpen}
        onClose={() => setConfirmBookingModal({ isOpen: false, session: null })}
        onConfirm={executeBooking}
        title="Confirmar Reserva"
        message="Deseja confirmar sua presença nesta aula?"
      />

      <FeedbackModal 
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
      />

      {/* Banner de Notificações */}
      {!notificationsEnabled && (
          <div className="mb-6 bg-indigo-600 rounded-xl p-4 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="bg-white/20 p-2 rounded-full">
                      <Bell className="w-6 h-6" />
                  </div>
                  <div>
                      <h4 className="font-bold">Mantenha-se informado!</h4>
                      <p className="text-sm text-indigo-100">Ative as notificações para receber lembretes de aula e alertas de novas turmas.</p>
                  </div>
              </div>
              <button 
                  onClick={requestNotificationPermission}
                  className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-bold hover:bg-indigo-50 transition shadow-sm whitespace-nowrap"
              >
                  Ativar Notificações
              </button>
          </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Portal do Aluno</h1>
            <p className="text-gray-500 mt-1">Bem-vindo, {currentUser?.name}</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'browse' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}
            >
                Aulas Disponíveis
            </button>
            <button
                onClick={() => setActiveTab('my-bookings')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'my-bookings' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}
            >
                Meus Agendamentos
            </button>
        </div>
      </div>

      {activeTab === 'browse' && (
        <>
            <div className="mb-6 flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button onClick={() => setFilterModality('all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${filterModality === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Todas</button>
                {modalities.map(m => (
                    <button key={m.id} onClick={() => setFilterModality(m.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${filterModality === m.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{m.name}</button>
                ))}
            </div>

            <div className="space-y-6">
                {groupedSessionList.map((group) => (
                    <DailyClassGroup key={`${group.date}_${group.modalityId}`} date={group.date} modalityId={group.modalityId} sessions={group.sessions} onBookSession={handleInitiateBooking} />
                ))}
            </div>
        </>
      )}

      {activeTab === 'my-bookings' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myBookings.map(booking => {
                const session = sessions.find(s => s.id === booking.sessionId);
                if (!session) return null;
                return <MyBookingCard key={booking.id} session={session} bookingId={booking.id} bookedAt={booking.bookedAt} onRequestCancel={handleRequestCancel} />;
            })}
         </div>
      )}
    </div>
  );
};