
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
    if (!isDayTomorrow || now.getHours() >= bookingReleaseHour) isLocked = false;
    else if (isDayTomorrow) isLocked = true;

    const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden mb-4 ${isLocked ? 'border-orange-100 opacity-80' : 'border-slate-100'}`}>
            <div className="flex flex-col md:flex-row">
                <div className="md:w-64 bg-slate-100 relative h-32 md:h-auto overflow-hidden flex-shrink-0">
                    <img src={modality?.imageUrl} alt={modality?.name} className={`w-full h-full object-cover ${isLocked ? 'grayscale' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4 text-white">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit mb-1 uppercase tracking-widest ${isLocked ? 'bg-slate-500' : 'bg-indigo-600'}`}>{modality?.name}</span>
                        <h3 className="text-xl font-bold capitalize flex items-center gap-1.5 leading-none">{dateLabel} {isLocked && <Lock className="w-3.5 h-3.5 text-orange-400" />}</h3>
                    </div>
                </div>
                <div className="flex-1 p-4 bg-white">
                    {isLocked && (
                        <div className="mb-3 bg-orange-50 text-orange-800 text-[10px] font-bold p-2 rounded-lg border border-orange-100 uppercase tracking-widest text-center">Inscrições abrem às {bookingReleaseHour.toString().padStart(2, '0')}:00</div>
                    )}
                    <div className="space-y-2">
                        {sortedSessions.map(session => {
                            const currentBooked = getSessionBookingsCount(session.id);
                            const isFull = currentBooked >= session.capacity;
                            const userBooking = bookings.find(b => b.sessionId === session.id && b.userId === currentUser?.id && b.status !== BookingStatus.CANCELLED);
                            const isBookedByUser = !!userBooking && userBooking.status === BookingStatus.CONFIRMED;
                            const isWaitlisted = !!userBooking && userBooking.status === BookingStatus.WAITLIST;
                            
                            return (
                                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-slate-50 gap-3 border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-center min-w-[60px] font-black text-slate-800">{format(new Date(session.startTime), 'HH:mm')}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 leading-tight">{session.instructor} {session.category && <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 rounded uppercase font-black ml-1">{session.category}</span>}</p>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${getStatusColor(currentBooked, session.capacity)}`}>
                                                {isFull ? 'ESGOTADO' : `${currentBooked}/${session.capacity} VAGAS`}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                      onClick={() => onBookSession(session, isFull)} 
                                      disabled={isBookedByUser || isWaitlisted || isLocked} 
                                      className={`w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 uppercase tracking-widest
                                        ${isBookedByUser ? 'bg-green-100 text-green-700 border border-green-200' : 
                                          isWaitlisted ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                          isLocked ? 'bg-slate-200 text-slate-400' : 
                                          isFull ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-md' : 
                                          'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}
                                    >
                                        {isBookedByUser ? <><CheckCircle className="w-4 h-4" /> CONFIRMADO</> : 
                                         isWaitlisted ? <><Timer className="w-4 h-4" /> NA FILA</> :
                                         isLocked ? 'BLOQUEADO' : 
                                         isFull ? 'ENTRAR NA FILA' : 'RESERVAR'}
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
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${isCancelled ? 'opacity-60 grayscale' : ''} ${isWaitlisted ? 'ring-1 ring-orange-200' : ''}`}>
      <div className="h-20 bg-slate-200 relative">
           <img src={modality?.imageUrl} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-black/50 flex items-center px-4">
              <span className="text-white font-black text-sm uppercase tracking-widest">{modality?.name}</span>
           </div>
           {(isCancelled || isWaitlisted) && (
               <div className="absolute top-2 right-2">
                   {isWaitlisted ? (
                      <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                        <Timer className="w-3 h-3" /> LISTA DE ESPERA
                      </span>
                   ) : (
                      <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                          <XCircle className="w-3 h-3" /> CANCELADO
                      </span>
                   )}
               </div>
           )}
      </div>
      <div className="p-4">
          <div className="mb-3">
              <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">{formattedDate}</p>
              <h3 className="text-xl font-black text-slate-800">{format(date, 'HH:mm')}</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase">{session.instructor} {session.category && `| ${session.category}`}</p>
          </div>
          {!isCancelled ? (
            <button onClick={() => onRequestCancel(bookingId)} className="w-full py-2 bg-slate-50 border border-red-100 text-red-600 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors">Cancelar Vaga</button>
          ) : (
            <div className="text-center p-2 rounded-lg bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-widest border border-slate-100">Agendamento Removido</div>
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
        title: success ? (isWaitlist ? 'Fila de Espera!' : 'Aula Reservada!') : 'Erro', 
        message: success 
            ? (isWaitlist ? 'Você entrou na fila e será avisado se houver vaga.' : 'Tudo certo! Vaga confirmada com sucesso.') 
            : 'Ocorreu um problema ao tentar processar seu agendamento.' 
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <ConfirmationModal isOpen={cancelModal.isOpen} onClose={() => setCancelModal({ ...cancelModal, isOpen: false })} onConfirm={() => { cancelBooking(cancelModal.bookingId); setCancelModal({ isOpen: false }); }} title="Cancelar Presença" message="Tem certeza que deseja liberar sua vaga nesta aula? Outro aluno poderá ocupá-la." />
      <ConfirmationModal 
        isOpen={confirmBookingModal.isOpen} 
        onClose={() => setConfirmBookingModal({ isOpen: false, session: null, isWaitlist: false })} 
        onConfirm={executeBooking} 
        title={confirmBookingModal.isWaitlist ? "Entrar na Fila?" : "Confirmar Agendamento?"} 
        message={confirmBookingModal.isWaitlist ? "A aula está cheia. Deseja ser avisado se alguém cancelar?" : "Confirma sua presença para esta aula?"} 
      />
      <FeedbackModal isOpen={feedbackModal.isOpen} onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })} type={feedbackModal.type} title={feedbackModal.title} message={feedbackModal.message} />
      
      {!notificationsEnabled && (
          <div className="mb-6 bg-indigo-600 rounded-xl p-3 text-white flex justify-between items-center shadow-lg animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3"><Bell className="w-5 h-5 flex-shrink-0" /><div><p className="text-[11px] font-black uppercase tracking-widest">Ative as Notificações</p><p className="text-[10px] opacity-90">Saiba instantaneamente se sua vaga na fila abrir.</p></div></div>
              <button onClick={requestNotificationPermission} className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg font-black text-[10px] uppercase shadow-md active:scale-95 transition-all">Ativar</button>
          </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Olá, {currentUser?.name.split(' ')[0]}!</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">O que vamos treinar hoje?</p>
        </div>
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm w-full sm:w-auto">
            <button onClick={() => setActiveTab('browse')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'browse' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>Aulas</button>
            <button onClick={() => setActiveTab('my-bookings')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'my-bookings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>Minha Agenda</button>
        </div>
      </div>
      
      {activeTab === 'browse' ? (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button onClick={() => setFilterModality('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${filterModality === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>Todas</button>
                {modalities.map(m => <button key={m.id} onClick={() => setFilterModality(m.id)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all flex-shrink-0 ${filterModality === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>{m.name}</button>)}
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
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-slate-100" />
                    <p className="font-black text-slate-300 uppercase text-xs tracking-widest">Sem horários disponíveis no momento</p>
                </div>
            )}
        </div>
      ) : (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBookings.map(b => {
                const session = sessions.find(s => s.id === b.sessionId);
                return session ? <MyBookingCard key={b.id} session={session} bookingId={b.id} bookedAt={b.bookedAt} status={b.status} onRequestCancel={(id) => setCancelModal({ isOpen: true, bookingId: id })} /> : null;
            })}
            {myBookings.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-300 border border-dashed border-slate-200 rounded-xl">
                    <p className="font-black text-xs uppercase tracking-widest">Sua agenda está vazia</p>
                </div>
            )}
         </div>
      )}
    </div>
  );
};
