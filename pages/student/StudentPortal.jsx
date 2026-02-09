import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, ChevronRight, Lock, Tag, AlertCircle } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays, differenceInCalendarDays } from 'date-fns';
import { ConfirmationModal } from '../../components/ConfirmationModal';

const getStatusColor = (current, max) => {
  const percentage = current / max;
  if (percentage >= 1) return 'bg-red-100 text-red-800';
  if (percentage >= 0.8) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const DailyClassGroup = ({ date, modalityId, sessions }) => {
    const { modalities, getSessionBookingsCount, bookSession, bookings, currentUser, bookingReleaseHour } = useStore();
    const modality = modalities.find(m => m.id === modalityId);
    
    const dateObj = new Date(sessions[0].startTime); 
    let dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateObj);
    
    const now = new Date();
    const isDayToday = isToday(dateObj);
    const isDayTomorrow = isTomorrow(dateObj);
    
    if (isDayToday) dateLabel = "Hoje";
    if (isDayTomorrow) dateLabel = "Amanhã";

    let isLocked = false;
    let lockReason = "";
    
    if (isDayTomorrow) {
        if (now.getHours() < bookingReleaseHour) {
            isLocked = true;
            lockReason = `Libera às ${bookingReleaseHour.toString().padStart(2, '0')}:00`;
        }
    }

    const handleBook = async (sessionId) => {
        const success = await bookSession(sessionId);
        if (success) {
            alert('Reserva confirmada!');
        } else {
            alert('Não foi possível realizar a reserva (Turma cheia ou já agendada).');
        }
    };

    const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 bg-gray-100 relative h-48 md:h-auto group">
                    <img 
                        src={modality?.imageUrl} 
                        alt={modality?.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
                        <span className="text-xs font-bold bg-indigo-600 px-2 py-1 rounded w-fit mb-2 uppercase tracking-wider">{modality?.name}</span>
                        <h3 className="text-2xl font-bold capitalize mb-1">{dateLabel}</h3>
                        <p className="text-sm opacity-90 font-light flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(dateObj, "dd/MM/yyyy")}
                        </p>
                    </div>
                </div>

                <div className="md:w-2/3 p-4 md:p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Horários Disponíveis
                        </h4>
                        <div className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">
                            {sortedSessions.length} turmas
                        </div>
                    </div>
                    
                    {isLocked && isDayTomorrow && (
                        <div className="mb-4 bg-orange-50 border border-orange-100 text-orange-800 text-sm p-3 rounded-lg flex items-start gap-2 animate-in fade-in">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block">Agendamento Bloqueado</span>
                                <span className="text-xs opacity-90">
                                    As reservas para amanhã abrem às <strong>{bookingReleaseHour.toString().padStart(2, '0')}:00</strong>.
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
                                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center min-w-[70px] shadow-sm">
                                            <span className="block font-bold text-gray-900 text-lg">{format(new Date(session.startTime), 'HH:mm')}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <p className="text-sm text-gray-700 font-medium">
                                                    {session.instructor}
                                                </p>
                                                {session.category && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                                        {session.category}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(currentBooked, session.capacity)}`}>
                                                    {currentBooked}/{session.capacity} vagas
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleBook(session.id)}
                                        disabled={isFull || isBookedByUser || isLocked}
                                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5
                                            ${isBookedByUser 
                                                ? 'bg-green-100 text-green-700 cursor-default border border-green-200' 
                                                : isLocked
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                    : isFull 
                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow active:scale-95'
                                            }`}
                                    >
                                        {isBookedByUser ? (
                                            <><CheckCircle className="w-4 h-4" /> Inscrito</>
                                        ) : isLocked ? (
                                            <><Lock className="w-3 h-3"/> {lockReason}</>
                                        ) : isFull ? (
                                            'Lotado'
                                        ) : (
                                            'Reservar'
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
  const { modalities, sessions, bookings, currentUser, cancelBooking } = useStore();
  const [activeTab, setActiveTab] = useState('browse');
  const [filterModality, setFilterModality] = useState('all');

  // Modal State
  const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: null });

  const myBookings = bookings.filter(b => b.userId === currentUser?.id);
  
  const now = new Date();

  // Filter sessions
  const filteredSessions = sessions
    .filter(s => filterModality === 'all' || s.modalityId === filterModality)
    .filter(s => {
        const sessionDate = new Date(s.startTime);
        
        if (isToday(sessionDate) && isPast(sessionDate)) {
             return false;
        }
        
        if (isPast(sessionDate) && !isToday(sessionDate)) {
            return false;
        }

        return differenceInCalendarDays(sessionDate, now) <= 1 && differenceInCalendarDays(sessionDate, now) >= 0;
    })
    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Group sessions
  const groupedSessions = filteredSessions.reduce((acc, session) => {
      const dateKey = format(new Date(session.startTime), 'yyyy-MM-dd');
      const groupKey = `${dateKey}_${session.modalityId}`;
      
      if (!acc[groupKey]) {
          acc[groupKey] = {
              date: dateKey,
              modalityId: session.modalityId,
              sessions: []
          };
      }
      acc[groupKey].sessions.push(session);
      return acc;
  }, {});

  const groupedSessionList = Object.values(groupedSessions).sort((a, b) => a.date.localeCompare(b.date));
  
  const handleRequestCancel = (bookingId) => {
      setCancelModal({ isOpen: true, bookingId });
  };

  const confirmCancel = () => {
      if (cancelModal.bookingId) {
          cancelBooking(cancelModal.bookingId);
      }
      setCancelModal({ isOpen: false, bookingId: null });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <ConfirmationModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ ...cancelModal, isOpen: false })}
        onConfirm={confirmCancel}
        title="Cancelar Agendamento"
        message="Tem certeza que deseja cancelar sua presença nesta aula? Essa ação liberará a vaga para outros alunos."
      />

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
                <button 
                    onClick={() => setFilterModality('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${filterModality === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    Todas as Modalidades
                </button>
                {modalities.map(m => (
                    <button 
                        key={m.id}
                        onClick={() => setFilterModality(m.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${filterModality === m.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        {m.name}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {groupedSessionList.map((group) => (
                    <DailyClassGroup 
                        key={`${group.date}_${group.modalityId}`} 
                        date={group.date}
                        modalityId={group.modalityId}
                        sessions={group.sessions}
                    />
                ))}
                
                {groupedSessionList.length === 0 && (
                    <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                        Nenhuma aula encontrada para Hoje ou Amanhã.
                        {(filteredSessions.length === 0 && sessions.length > 0) && (
                            <div className="mt-2 text-xs">
                                (As aulas futuras estarão visíveis quando chegarem na véspera).
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
      )}

      {activeTab === 'my-bookings' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myBookings.map(booking => {
                const session = sessions.find(s => s.id === booking.sessionId);
                if (!session) return null;
                return (
                    <MyBookingCard 
                        key={booking.id} 
                        session={session} 
                        bookingId={booking.id}
                        bookedAt={booking.bookedAt}
                        onRequestCancel={handleRequestCancel}
                    />
                );
            })}
             {myBookings.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                    Você ainda não agendou nenhuma aula.
                </div>
            )}
         </div>
      )}
    </div>
  );
};