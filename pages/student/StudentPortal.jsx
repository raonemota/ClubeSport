
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, ChevronRight, Lock, Tag, AlertCircle, Bell, BellOff, ShieldAlert } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays, differenceInCalendarDays, isSameDay } from 'date-fns';
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
    // Lógica de bloqueio visual: Amanhã só libera se a hora atual for maior que a hora de liberação
    if (!isDayToday && now.getHours() < bookingReleaseHour) isLocked = true;

    const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden mb-6 ${isLocked ? 'border-orange-100' : 'border-gray-100'}`}>
            <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 bg-gray-100 relative h-48 md:h-auto overflow-hidden">
                    <img src={modality?.imageUrl} alt={modality?.name} className={`w-full h-full object-cover ${isLocked ? 'grayscale opacity-70' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6 text-white">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded w-fit mb-2 uppercase tracking-wider ${isLocked ? 'bg-gray-500' : 'bg-indigo-600'}`}>{modality?.name}</span>
                        <h3 className="text-2xl font-bold capitalize flex items-center gap-2">{dateLabel} {isLocked && <Lock className="w-4 h-4 text-orange-400" />}</h3>
                    </div>
                </div>
                <div className="md:w-2/3 p-6 bg-white flex flex-col">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4"><Clock className="w-4 h-4" /> Horários</h4>
                    {isLocked && (
                        <div className="mb-4 bg-orange-50 text-orange-800 text-sm p-3 rounded-lg border border-orange-100">Agendamentos bloqueados até às {bookingReleaseHour.toString().padStart(2, '0')}:00.</div>
                    )}
                    <div className="space-y-3">
                        {sortedSessions.map(session => {
                            const currentBooked = getSessionBookingsCount(session.id);
                            const isFull = currentBooked >= session.capacity;
                            const isBookedByUser = bookings.some(b => b.sessionId === session.id && b.userId === currentUser?.id && b.status === 'CONFIRMED');
                            return (
                                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-gray-50 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white border rounded-xl px-3 py-1 text-center min-w-[70px] font-bold">{format(new Date(session.startTime), 'HH:mm')}</div>
                                        <div>
                                            <p className="text-sm font-semibold">{session.instructor} {session.category && <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 rounded uppercase">{session.category}</span>}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(currentBooked, session.capacity)}`}>{currentBooked}/{session.capacity} inscritos</span>
                                        </div>
                                    </div>
                                    <button onClick={() => onBookSession(session)} disabled={isFull || isBookedByUser || isLocked} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${isBookedByUser ? 'bg-green-100 text-green-700' : isLocked || isFull ? 'bg-gray-200 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                        {isBookedByUser ? 'Confirmado' : isLocked ? 'Bloqueado' : isFull ? 'Esgotado' : 'Reservar'}
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

const MyBookingCard = ({ session, bookingId, bookedAt, status, onRequestCancel }) => {
  const { modalities } = useStore();
  const modality = modalities.find(m => m.id === session.modalityId);
  const date = new Date(session.startTime);
  const isCancelled = status.includes('CANCELLED');
  const cancelledByAdmin = status === 'CANCELLED_BY_ADMIN';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${isCancelled ? 'opacity-70 bg-gray-50/50' : ''}`}>
      <div className="h-24 bg-gray-200 relative">
           <img src={modality?.imageUrl} className={`w-full h-full object-cover ${isCancelled ? 'grayscale' : ''}`} />
           <div className="absolute inset-0 bg-black/40 flex items-center px-4">
              <span className="text-white font-bold">{modality?.name}</span>
           </div>
           {isCancelled && (
               <div className="absolute top-2 right-2">
                   <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-md">
                       {cancelledByAdmin ? <ShieldAlert className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                       CANCELADO {cancelledByAdmin && 'PELA ADMIN'}
                   </span>
               </div>
           )}
      </div>
      <div className="p-4">
          <div className="flex justify-between items-start mb-2">
              <div>
                  <p className="text-indigo-600 text-xs font-bold uppercase">{format(date, "EEEE, dd/MM", { locale: { code: 'pt-BR' } })}</p>
                  <h3 className={`text-2xl font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{format(date, 'HH:mm')}</h3>
              </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">{session.instructor} {session.category && `| ${session.category}`}</p>
          {!isCancelled ? (
            <button onClick={() => onRequestCancel(bookingId)} className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">Cancelar Presença</button>
          ) : (
            <div className="text-center p-2 rounded bg-gray-100 text-[11px] text-gray-500 font-medium">Agendamento removido do sistema</div>
          )}
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

  const myBookings = bookings
    .filter(b => b.userId === currentUser?.id)
    .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

  // Lógica de Filtro Estrito: Apenas Hoje e Amanhã
  const filteredSessions = sessions
    .filter(s => filterModality === 'all' || s.modalityId === filterModality)
    .filter(s => {
        const sDate = new Date(s.startTime);
        return isToday(sDate) || isTomorrow(sDate);
    })
    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupedSessions = filteredSessions.reduce((acc, session) => {
      const groupKey = `${format(new Date(session.startTime), 'yyyy-MM-dd')}_${session.modalityId}`;
      if (!acc[groupKey]) acc[groupKey] = { date: format(new Date(session.startTime), 'yyyy-MM-dd'), modalityId: session.modalityId, sessions: [] };
      acc[groupKey].sessions.push(session);
      return acc;
  }, {});

  const executeBooking = async () => {
    const success = await bookSession(confirmBookingModal.session.id);
    setConfirmBookingModal({ isOpen: false, session: null });
    setFeedbackModal({ isOpen: true, type: success ? 'success' : 'error', title: success ? 'Confirmado!' : 'Erro', message: success ? 'Sua vaga foi reservada.' : 'Não foi possível completar.' });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <ConfirmationModal isOpen={cancelModal.isOpen} onClose={() => setCancelModal({ ...cancelModal, isOpen: false })} onConfirm={() => { cancelBooking(cancelModal.bookingId); setCancelModal({ isOpen: false }); }} title="Cancelar" message="Confirmar cancelamento?" />
      <ConfirmationModal isOpen={confirmBookingModal.isOpen} onClose={() => setConfirmBookingModal({ isOpen: false, session: null })} onConfirm={executeBooking} title="Reservar" message="Confirmar presença?" />
      <FeedbackModal isOpen={feedbackModal.isOpen} onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })} type={feedbackModal.type} title={feedbackModal.title} message={feedbackModal.message} />
      {!notificationsEnabled && (
          <div className="mb-6 bg-indigo-600 rounded-xl p-4 text-white flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-4"><Bell className="w-6 h-6" /><div><h4 className="font-bold">Notificações</h4><p className="text-xs">Ative para receber lembretes.</p></div></div>
              <button onClick={requestNotificationPermission} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm">Ativar</button>
          </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Olá, {currentUser?.name.split(' ')[0]}</h1>
        <div className="flex bg-white rounded-lg p-1 border shadow-sm">
            <button onClick={() => setActiveTab('browse')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'browse' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Aulas</button>
            <button onClick={() => setActiveTab('my-bookings')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'my-bookings' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Meus Agendamentos</button>
        </div>
      </div>
      {activeTab === 'browse' ? (
        <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">{modalities.map(m => <button key={m.id} onClick={() => setFilterModality(m.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${filterModality === m.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600'}`}>{m.name}</button>)}<button onClick={() => setFilterModality('all')} className="px-4 py-1.5 rounded-full text-xs font-bold border bg-white">Ver Todas</button></div>
            {Object.values(groupedSessions).length > 0 ? (
                Object.values(groupedSessions).map(group => <DailyClassGroup key={`${group.date}_${group.modalityId}`} date={group.date} modalityId={group.modalityId} sessions={group.sessions} onBookSession={(s) => setConfirmBookingModal({ isOpen: true, session: s })} />)
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed text-slate-400">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Não há aulas disponíveis para Hoje ou Amanhã.</p>
                </div>
            )}
        </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myBookings.map(b => {
                const session = sessions.find(s => s.id === b.sessionId);
                return session ? <MyBookingCard key={b.id} session={session} bookingId={b.id} bookedAt={b.bookedAt} status={b.status} onRequestCancel={(id) => setCancelModal({ isOpen: true, bookingId: id })} /> : null;
            })}
            {myBookings.length === 0 && <p className="text-gray-500 text-center col-span-3">Você ainda não tem agendamentos.</p>}
         </div>
      )}
    </div>
  );
};
