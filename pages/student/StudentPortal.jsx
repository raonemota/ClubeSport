
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, ChevronRight, Lock, Tag, AlertCircle, Bell, BellOff, ShieldAlert, Timer } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays, differenceInCalendarDays, isSameDay, parseISO } from 'date-fns';
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
    const { modalities, getSessionBookingsCount, getWaitlistCount, bookings, currentUser, bookingReleaseHour } = useStore();
    const modality = modalities.find(m => m.id === modalityId);
    
    // Parse seguro da data
    const dateObj = parseISO(sessions[0].startTime); 
    let dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateObj);
    
    const now = new Date();
    const isDayToday = isToday(dateObj);
    const isDayTomorrow = isTomorrow(dateObj);
    // Verifica se é uma data futura (depois de amanhã)
    const isFutureDate = !isDayToday && !isDayTomorrow && !isPast(dateObj);

    if (isDayToday) dateLabel = "Hoje";
    else if (isDayTomorrow) dateLabel = "Amanhã";

    // Lógica de Bloqueio de Agendamento
    let isLocked = false;
    let lockMessage = "";

    if (isDayToday) {
        isLocked = false;
    } else if (isDayTomorrow) {
        // Bloqueia amanhã se ainda não chegou a hora de liberação
        if (now.getHours() < bookingReleaseHour) {
             isLocked = true;
             lockMessage = `Inscrições abrem às ${bookingReleaseHour.toString().padStart(2, '0')}:00`;
        }
    } else if (isFutureDate) {
        // Bloqueia dias depois de amanhã
        isLocked = true;
        lockMessage = "Inscrições abrem no dia anterior";
    }

    const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden mb-6 ${isLocked ? 'border-orange-100 opacity-90' : 'border-slate-100'}`}>
            <div className="flex flex-col md:flex-row">
                <div className="md:w-72 bg-slate-100 relative h-40 md:h-auto overflow-hidden flex-shrink-0">
                    <img src={modality?.imageUrl} alt={modality?.name} className={`w-full h-full object-cover ${isLocked ? 'grayscale' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6 text-white">
                        <span className={`text-xs font-bold px-2 py-1 rounded w-fit mb-2 uppercase tracking-widest ${isLocked ? 'bg-slate-500' : 'bg-indigo-600'}`}>{modality?.name}</span>
                        <h3 className="text-2xl font-black capitalize flex items-center gap-2 leading-none">{dateLabel} {isLocked && <Lock className="w-5 h-5 text-orange-400" />}</h3>
                    </div>
                </div>
                <div className="flex-1 p-6 bg-white">
                    {isLocked && lockMessage && (
                        <div className="mb-4 bg-orange-50 text-orange-800 text-xs font-black p-3 rounded-xl border border-orange-100 uppercase tracking-widest text-center">{lockMessage}</div>
                    )}
                    <div className="space-y-3">
                        {sortedSessions.map(session => {
                            const currentBooked = getSessionBookingsCount(session.id);
                            const waitlistCount = getWaitlistCount(session.id);
                            const isFull = currentBooked >= session.capacity;
                            const userBooking = bookings.find(b => b.sessionId === session.id && b.userId === currentUser?.id && b.status !== BookingStatus.CANCELLED);
                            const isBookedByUser = !!userBooking && userBooking.status === BookingStatus.CONFIRMED;
                            const isWaitlisted = !!userBooking && userBooking.status === BookingStatus.WAITLIST;
                            
                            return (
                                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-slate-50 gap-4 border-slate-100 hover:border-indigo-100 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center min-w-[70px] font-black text-lg text-slate-800 shadow-sm">{format(parseISO(session.startTime), 'HH:mm')}</div>
                                        <div>
                                            <p className="text-base font-black text-slate-800 leading-tight">{session.instructor} {session.category && <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-lg uppercase font-black ml-2 tracking-tight">{session.category}</span>}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                                                <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest w-fit border shadow-sm ${getStatusColor(currentBooked, session.capacity)}`}>
                                                    {isFull ? 'ESGOTADO' : `${currentBooked}/${session.capacity} VAGAS`}
                                                </span>
                                                {isFull && waitlistCount > 0 && (
                                                    <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1">
                                                       <Timer className="w-4 h-4" /> {waitlistCount} na fila de espera
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                      onClick={() => onBookSession(session, isFull)} 
                                      disabled={isBookedByUser || isWaitlisted || isLocked} 
                                      className={`w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 uppercase tracking-widest shadow-md active:scale-95
                                        ${isBookedByUser ? 'bg-green-100 text-green-700 border border-green-200 shadow-none' : 
                                          isWaitlisted ? 'bg-orange-100 text-orange-700 border border-orange-200 shadow-none' :
                                          isLocked ? 'bg-slate-200 text-slate-400 shadow-none' : 
                                          isFull ? 'bg-orange-600 text-white hover:bg-orange-700' : 
                                          'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {isBookedByUser ? <><CheckCircle className="w-5 h-5" /> Confirmado</> : 
                                         isWaitlisted ? <><Timer className="w-5 h-5" /> Na Fila</> :
                                         isLocked ? 'Aguarde' : 
                                         isFull ? 'Fila de Espera' : 'Reservar Vaga'}
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

const MyBookingCard = ({ session, bookingId, status, onRequestCancel }) => {
  const { modalities } = useStore();
  const modality = modalities.find(m => m.id === session.modalityId);
  const date = parseISO(session.startTime);
  const isCancelled = status.includes('CANCELLED');
  const isWaitlisted = status === BookingStatus.WAITLIST;
  const hasPassed = isPast(date);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: '2-digit' 
  }).format(date);

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-300 ${isCancelled || hasPassed ? 'opacity-80 grayscale-[0.5]' : ''} ${isWaitlisted ? 'ring-2 ring-orange-100' : ''}`}>
      <div className="h-28 bg-slate-200 relative overflow-hidden">
           <img src={modality?.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
           <div className="absolute inset-0 bg-black/60 flex items-center px-6">
              <span className="text-white font-black text-base uppercase tracking-widest">{modality?.name}</span>
           </div>
           {(isCancelled || isWaitlisted || hasPassed) && (
               <div className="absolute top-3 right-3">
                   {isWaitlisted ? (
                      <span className="bg-orange-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl border border-orange-400">
                        <Timer className="w-4 h-4" /> FILA DE ESPERA
                      </span>
                   ) : isCancelled ? (
                      <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl border border-red-400">
                          <XCircle className="w-4 h-4" /> CANCELADO
                      </span>
                   ) : hasPassed && (
                      <span className="bg-slate-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl border border-slate-500">
                          <CheckCircle className="w-4 h-4" /> FINALIZADA
                      </span>
                   )}
               </div>
           )}
      </div>
      <div className="p-6">
          <div className="mb-4">
              <p className="text-indigo-600 text-xs font-black uppercase tracking-widest mb-1">{formattedDate}</p>
              <h3 className="text-2xl font-black text-slate-800 leading-none mb-2">{format(date, 'HH:mm')}</h3>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-tight">{session.instructor} {session.category && <span className="text-slate-300 mx-1">|</span>} {session.category}</p>
          </div>
          {!isCancelled ? (
            hasPassed ? (
               <div className="text-center p-3 rounded-xl bg-slate-100 text-xs text-slate-500 font-black uppercase tracking-widest border border-slate-200">Aula Finalizada</div>
            ) : (
               <button onClick={() => onRequestCancel(bookingId)} className="w-full py-3 bg-slate-50 border border-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-colors shadow-sm">Cancelar Presença</button>
            )
          ) : (
            <div className="text-center p-3 rounded-xl bg-slate-50 text-xs text-slate-400 font-black uppercase tracking-widest border border-slate-100 shadow-inner">Reserva Cancelada</div>
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
        const sDate = parseISO(s.startTime);
        // Exibe aulas de hoje e todas as datas futuras
        // 'isToday' garante que aulas de hoje (mesmo que a hora tenha passado) sejam exibidas
        // '!isPast' garante que qualquer data futura seja exibida
        return isToday(sDate) || !isPast(sDate);
    })
    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupedSessions = filteredSessions.reduce((acc, session) => {
      const groupKey = `${format(parseISO(session.startTime), 'yyyy-MM-dd')}_${session.modalityId}`;
      if (!acc[groupKey]) acc[groupKey] = { date: format(parseISO(session.startTime), 'yyyy-MM-dd'), modalityId: session.modalityId, sessions: [] };
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
        title: success ? (isWaitlist ? 'Fila de Espera!' : 'Aula Reservada!') : 'Ops!', 
        message: success 
            ? (isWaitlist ? 'Você entrou na fila e será avisado se houver vaga.' : 'Tudo certo! Sua vaga está confirmada.') 
            : 'Ocorreu um problema ao processar seu agendamento.' 
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <ConfirmationModal isOpen={cancelModal.isOpen} onClose={() => setCancelModal({ ...cancelModal, isOpen: false })} onConfirm={() => { cancelBooking(cancelModal.bookingId); setCancelModal({ isOpen: false }); }} title="Cancelar Presença" message="Tem certeza que deseja liberar sua vaga nesta aula? Outro aluno poderá ocupá-la." />
      <ConfirmationModal 
        isOpen={confirmBookingModal.isOpen} 
        onClose={() => setConfirmBookingModal({ isOpen: false, session: null, isWaitlist: false })} 
        onConfirm={executeBooking} 
        title={confirmBookingModal.isWaitlist ? "Entrar na Fila?" : "Confirmar Vaga?"} 
        message={confirmBookingModal.isWaitlist ? "A aula está cheia. Deseja ser avisado se alguém cancelar?" : "Confirma sua presença para esta aula?"} 
      />
      <FeedbackModal isOpen={feedbackModal.isOpen} onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })} type={feedbackModal.type} title={feedbackModal.title} message={feedbackModal.message} />
      
      {!notificationsEnabled && (
          <div className="mb-8 bg-indigo-600 rounded-2xl p-5 text-white flex flex-col sm:flex-row justify-between items-center shadow-xl animate-in slide-in-from-top duration-700 gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left"><Bell className="w-8 h-8 flex-shrink-0 text-indigo-200" /><div><p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Fique sabendo de tudo</p><p className="text-xs opacity-90 font-medium">Ative as notificações para saber quando sua vaga na fila for liberada.</p></div></div>
              <button onClick={requestNotificationPermission} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all w-full sm:w-auto">Ativar Alertas</button>
          </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">Olá, {currentUser?.name.split(' ')[0]}!</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Qual será o treino de hoje?</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-md w-full md:w-auto">
            <button onClick={() => setActiveTab('browse')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'browse' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Aulas Disponíveis</button>
            <button onClick={() => setActiveTab('my-bookings')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'my-bookings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Minha Agenda</button>
        </div>
      </div>
      
      {activeTab === 'browse' ? (
        <div className="space-y-6">
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                <button onClick={() => setFilterModality('all')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex-shrink-0 shadow-sm ${filterModality === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'}`}>Todas</button>
                {modalities.map(m => <button key={m.id} onClick={() => setFilterModality(m.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border whitespace-nowrap transition-all flex-shrink-0 shadow-sm ${filterModality === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'}`}>{m.name}</button>)}
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
                <div className="text-center py-28 bg-white rounded-2xl border border-dashed border-slate-200 shadow-inner">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-100" />
                    <p className="font-black text-slate-300 uppercase text-sm tracking-widest">Nenhuma aula disponível</p>
                    <p className="text-xs text-slate-400 mt-2">Aguarde a liberação de novos horários</p>
                </div>
            )}
        </div>
      ) : (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {myBookings.map(b => {
                const session = sessions.find(s => s.id === b.sessionId);
                return session ? <MyBookingCard key={b.id} session={session} bookingId={b.id} status={b.status} onRequestCancel={(id) => setCancelModal({ isOpen: true, bookingId: id })} /> : null;
            })}
            {myBookings.length === 0 && (
                <div className="col-span-full py-28 text-center bg-white border border-dashed border-slate-200 rounded-2xl shadow-inner">
                    <p className="font-black text-sm text-slate-300 uppercase tracking-widest">Sua agenda está vazia no momento</p>
                </div>
            )}
         </div>
      )}
    </div>
  );
};
