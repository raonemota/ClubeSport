
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, ChevronRight, Lock, Tag, AlertCircle, Bell, BellOff, ShieldAlert, Timer } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays, differenceInCalendarDays, isSameDay } from 'date-fns';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { FeedbackModal } from '../../components/FeedbackModal';
import { BookingStatus } from '../../types.js';

const getStatusColor = (current, max) => {
  const percentage = current / max;
  if (percentage >= 1) return 'bg-orange-100 text-orange-800';
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
    if (!isDayTomorrow || now.getHours() >= bookingReleaseHour) isLocked = false;
    else if (isDayTomorrow) isLocked = true;

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
                            const userBooking = bookings.find(b => b.sessionId === session.id && b.userId === currentUser?.id && b.status !== BookingStatus.CANCELLED);
                            const isBookedByUser = !!userBooking && userBooking.status === BookingStatus.CONFIRMED;
                            const isWaitlisted = !!userBooking && userBooking.status === BookingStatus.WAITLIST;
                            
                            return (
                                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-gray-50 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white border rounded-xl px-3 py-1 text-center min-w-[70px] font-bold">{format(new Date(session.startTime), 'HH:mm')}</div>
                                        <div>
                                            <p className="text-sm font-semibold">{session.instructor} {session.category && <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 rounded uppercase">{session.category}</span>}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(currentBooked, session.capacity)}`}>
                                                {isFull ? 'AULA LOTADA' : `${currentBooked}/${session.capacity} inscritos`}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                      onClick={() => onBookSession(session, isFull)} 
                                      disabled={isBookedByUser || isWaitlisted || isLocked} 
                                      className={`px-6 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2
                                        ${isBookedByUser ? 'bg-green-100 text-green-700' : 
                                          isWaitlisted ? 'bg-orange-100 text-orange-700' :
                                          isLocked ? 'bg-gray-200 text-gray-400' : 
                                          isFull ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100 shadow-lg' : 
                                          'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 shadow-lg'}`}
                                    >
                                        {isBookedByUser ? <><CheckCircle className="w-4 h-4" /> Confirmado</> : 
                                         isWaitlisted ? <><Timer className="w-4 h-4" /> Na Fila</> :
                                         isLocked ? 'Bloqueado' : 
                                         isFull ? 'Entrar na Fila' : 'Reservar'}
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
  const isWaitlisted = status === BookingStatus.WAITLIST;
  const cancelledByAdmin = status === 'CANCELLED_BY_ADMIN';

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: '2-digit' 
  }).format(date);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${isCancelled ? 'opacity-70 bg-gray-50/50' : ''} ${isWaitlisted ? 'border-orange-200 ring-2 ring-orange-50' : ''}`}>
      <div className="h-24 bg-gray-200 relative">
           <img src={modality?.imageUrl} className={`w-full h-full object-cover ${isCancelled ? 'grayscale' : ''}`} />
           <div className="absolute inset-0 bg-black/40 flex items-center px-4">
              <span className="text-white font-bold">{modality?.name}</span>
           </div>
           {(isCancelled || isWaitlisted) && (
               <div className="absolute top-2 right-2">
                   {isWaitlisted ? (
                      <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-md">
                        <Timer className="w-3 h-3" /> AGUARDANDO VAGA
                      </span>
                   ) : (
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-md">
                          {cancelledByAdmin ? <ShieldAlert className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          CANCELADO {cancelledByAdmin && 'PELA ADMIN'}
                      </span>
                   )}
               </div>
           )}
      </div>
      <div className="p-4">
          <div className="flex justify-between items-start mb-2">
              <div>
                  <p className="text-indigo-600 text-xs font-bold uppercase capitalize">{formattedDate}</p>
                  <h3 className={`text-2xl font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{format(date, 'HH:mm')}</h3>
              </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">{session.instructor} {session.category && `| ${session.category}`}</p>
          {!isCancelled ? (
            <button onClick={() => onRequestCancel(bookingId)} className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">Cancelar Presença</button>
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
  const [confirmBookingModal, setConfirmBookingModal] = useState({ isOpen: false, session: null, isWaitlist: false });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const myBookings = bookings
    .filter(b => b.userId === currentUser?.id)
    .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

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
    const isWaitlist = confirmBookingModal.isWaitlist;
    setConfirmBookingModal({ isOpen: false, session: null, isWaitlist: false });
    
    setFeedbackModal({ 
        isOpen: true, 
        type: success ? 'success' : 'error', 
        title: success ? (isWaitlist ? 'Entrou na Fila!' : 'Confirmado!') : 'Erro', 
        message: success 
            ? (isWaitlist ? 'Você será avisado se uma vaga abrir.' : 'Sua vaga foi reservada com sucesso.') 
            : 'Não foi possível completar a reserva.' 
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <ConfirmationModal isOpen={cancelModal.isOpen} onClose={() => setCancelModal({ ...cancelModal, isOpen: false })} onConfirm={() => { cancelBooking(cancelModal.bookingId); setCancelModal({ isOpen: false }); }} title="Cancelar" message="Confirmar cancelamento?" />
      <ConfirmationModal 
        isOpen={confirmBookingModal.isOpen} 
        onClose={() => setConfirmBookingModal({ isOpen: false, session: null, isWaitlist: false })} 
        onConfirm={executeBooking} 
        title={confirmBookingModal.isWaitlist ? "Entrar na Fila?" : "Reservar Aula?"} 
        message={confirmBookingModal.isWaitlist ? "Esta aula está lotada. Gostaria de entrar na lista de espera?" : "Deseja confirmar sua presença nesta aula?"} 
      />
      <FeedbackModal isOpen={feedbackModal.isOpen} onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })} type={feedbackModal.type} title={feedbackModal.title} message={feedbackModal.message} />
      
      {!notificationsEnabled && (
          <div className="mb-6 bg-indigo-600 rounded-xl p-4 text-white flex justify-between items-center shadow-lg animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-4"><Bell className="w-6 h-6 animate-bounce" /><div><h4 className="font-bold">Notificações</h4><p className="text-xs">Ative para ser avisado se sua vaga na fila for liberada.</p></div></div>
              <button onClick={requestNotificationPermission} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm active:scale-95 transition-all">Ativar</button>
          </div>
      )}
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Olá, {currentUser?.name.split(' ')[0]}</h1>
        <div className="flex bg-white rounded-lg p-1 border shadow-sm">
            <button onClick={() => setActiveTab('browse')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'browse' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500'}`}>Aulas</button>
            <button onClick={() => setActiveTab('my-bookings')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'my-bookings' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500'}`}>Minha Agenda</button>
        </div>
      </div>
      
      {activeTab === 'browse' ? (
        <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                <button onClick={() => setFilterModality('all')} className={`px-5 py-2 rounded-full text-xs font-bold border transition-all ${filterModality === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500'}`}>Ver Todas</button>
                {modalities.map(m => <button key={m.id} onClick={() => setFilterModality(m.id)} className={`px-5 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition-all ${filterModality === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600'}`}>{m.name}</button>)}
            </div>
            {Object.values(groupedSessions).length > 0 ? (
                Object.values(groupedSessions).map(group => (
                    <DailyClassGroup 
                        key={`${group.date}_${group.modalityId}`} 
                        date={group.date} 
                        modalityId={group.modalityId} 
                        sessions={group.sessions} 
                        onBookSession={(s, isFull) => setConfirmBookingModal({ isOpen: true, session: s, isWaitlist: isFull })} 
                    />
                ))
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-300">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-lg">Sem aulas para hoje ou amanhã.</p>
                    <p className="text-sm">Tente filtrar por outra modalidade.</p>
                </div>
            )}
        </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myBookings.map(b => {
                const session = sessions.find(s => s.id === b.sessionId);
                return session ? <MyBookingCard key={b.id} session={session} bookingId={b.id} bookedAt={b.bookedAt} status={b.status} onRequestCancel={(id) => setCancelModal({ isOpen: true, bookingId: id })} /> : null;
            })}
            {myBookings.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-300 border border-dashed rounded-3xl">
                    <Timer className="w-12 h-12 mx-auto mb-2 opacity-10" />
                    <p>Você não possui agendamentos ativos.</p>
                </div>
            )}
         </div>
      )}
    </div>
  );
};
