
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { format, isSameDay, parseISO, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, User, CheckCircle2, XCircle, Clock, Calendar as CalendarIcon, ClipboardList } from 'lucide-react';
import { BookingStatus } from '../../types.js';

export const TeacherPortal = () => {
  const { currentUser, sessions, modalities, bookings, users, updateBookingStatus } = useStore();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const mySessions = sessions.filter(s => 
    isSameDay(parseISO(s.startTime), viewDate) && 
    (s.instructor === currentUser?.name || true)
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const currentSession = sessions.find(s => s.id === selectedSessionId);
  const sessionBookings = bookings.filter(b => b.sessionId === selectedSessionId);

  const handleAttendance = async (bookingId, status) => {
    await updateBookingStatus(bookingId, status);
  };

  const formattedHeaderDate = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: '2-digit' 
  }).format(viewDate);

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Painel de Chamadas</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Controle de frequência e presença</p>
        </div>
        <div className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center justify-between sm:justify-start gap-4 shadow-md">
           <button onClick={() => setViewDate(addDays(viewDate, -1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft className="w-6 h-6 text-slate-400" /></button>
           <span className="font-black text-slate-800 text-sm uppercase tracking-widest min-w-[160px] text-center">{formattedHeaderDate}</span>
           <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight className="w-6 h-6 text-slate-400" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Minhas Aulas de Hoje</h3>
          {mySessions.map(session => {
            const modality = modalities.find(m => m.id === session.modalityId);
            const count = bookings.filter(b => b.sessionId === session.id && b.status !== BookingStatus.CANCELLED).length;
            const isSelected = selectedSessionId === session.id;
            return (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 transform hover:-translate-y-1 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-lg'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[11px] font-black px-3 py-1 rounded-lg uppercase tracking-tight ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{modality?.name}</span>
                  <span className="text-base font-black">{format(parseISO(session.startTime), 'HH:mm')}</span>
                </div>
                <p className="font-black text-lg uppercase truncate leading-tight mb-1">{session.category || 'Aula Geral'}</p>
                <p className={`text-xs font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{count} Alunos Inscritos</p>
              </button>
            );
          })}
          {mySessions.length === 0 && (
            <div className="bg-white p-16 rounded-2xl border-2 border-dashed border-slate-200 text-center shadow-inner">
              <p className="text-slate-300 text-xs font-black uppercase tracking-widest">Nenhuma aula para exibir</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {selectedSessionId ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 text-xl uppercase tracking-tight">Lista de Presença</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{format(parseISO(currentSession.startTime), 'HH:mm')} • {currentSession.category || 'Geral'}</p>
                </div>
                <div className="bg-white border border-slate-200 px-5 py-2 rounded-2xl shadow-sm text-center">
                   <p className="text-3xl font-black text-indigo-600 leading-none">{sessionBookings.length}</p>
                   <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">Total</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {sessionBookings.length > 0 ? (
                  sessionBookings.map(booking => {
                    const student = users.find(u => u.id === booking.userId);
                    const isAttended = booking.status === BookingStatus.ATTENDED;
                    const isMissed = booking.status === BookingStatus.MISSED;
                    return (
                      <div key={booking.id} className={`p-5 flex items-center justify-between transition-colors ${isMissed ? 'bg-red-50/20' : isAttended ? 'bg-green-50/10' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg ${isAttended ? 'bg-green-500' : isMissed ? 'bg-red-500' : 'bg-slate-300'}`}>
                            {student?.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`text-base font-black uppercase tracking-tight ${isMissed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{student?.name}</p>
                            <p className="text-xs text-slate-400 uppercase font-black tracking-widest mt-1">{student?.planType}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleAttendance(booking.id, BookingStatus.ATTENDED)}
                            className={`p-3 rounded-xl transition-all shadow-sm active:scale-90 ${isAttended ? 'bg-green-500 text-white shadow-green-200' : 'bg-slate-50 text-slate-300 hover:text-green-500 hover:bg-green-50'}`}
                            title="Presente"
                          >
                            <CheckCircle2 className="w-7 h-7" />
                          </button>
                          <button
                            onClick={() => handleAttendance(booking.id, BookingStatus.MISSED)}
                            className={`p-3 rounded-xl transition-all shadow-sm active:scale-90 ${isMissed ? 'bg-red-500 text-white shadow-red-200' : 'bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                            title="Faltou"
                          >
                            <XCircle className="w-7 h-7" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-24 text-center">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-100" />
                    <p className="font-black text-sm uppercase text-slate-300 tracking-widest">Nenhum aluno registrado</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-100 rounded-3xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-slate-400">
               <ClipboardList className="w-20 h-20 mb-4 opacity-10" />
               <p className="font-black text-xs uppercase tracking-widest text-center leading-relaxed">Selecione uma aula no menu lateral<br/>para iniciar a chamada da turma</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
