
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
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Painel de Chamadas</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gerencie a frequência dos seus alunos</p>
        </div>
        <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex items-center justify-between sm:justify-start gap-2 shadow-sm">
           <button onClick={() => setViewDate(addDays(viewDate, -1))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
           <span className="font-black text-slate-700 text-xs uppercase tracking-tighter min-w-[120px] text-center">{formattedHeaderDate}</span>
           <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Minhas Aulas</h3>
          {mySessions.map(session => {
            const modality = modalities.find(m => m.id === session.modalityId);
            const count = bookings.filter(b => b.sessionId === session.id && b.status !== BookingStatus.CANCELLED).length;
            const isSelected = selectedSessionId === session.id;
            return (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{modality?.name}</span>
                  <span className="text-[11px] font-black">{format(parseISO(session.startTime), 'HH:mm')}</span>
                </div>
                <p className="font-black text-sm uppercase truncate">{session.category || 'Aula Geral'}</p>
                <p className={`text-[10px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{count} Inscritos</p>
              </button>
            );
          })}
          {mySessions.length === 0 && (
            <div className="bg-white p-10 rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-slate-300 text-[10px] font-black uppercase">Nenhuma aula hoje</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {selectedSessionId ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-800 text-base uppercase">Chamada da Turma</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(parseISO(currentSession.startTime), 'HH:mm')} - {currentSession.category}</p>
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1 rounded-lg">
                   <p className="text-xl font-black text-indigo-600 leading-none">{sessionBookings.length}</p>
                   <p className="text-[8px] uppercase font-black text-slate-400">Total</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {sessionBookings.length > 0 ? (
                  sessionBookings.map(booking => {
                    const student = users.find(u => u.id === booking.userId);
                    const isAttended = booking.status === BookingStatus.ATTENDED;
                    const isMissed = booking.status === BookingStatus.MISSED;
                    return (
                      <div key={booking.id} className={`p-3 flex items-center justify-between ${isMissed ? 'bg-red-50/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-xs ${isAttended ? 'bg-green-500' : isMissed ? 'bg-red-500' : 'bg-slate-300'}`}>
                            {student?.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`text-sm font-black ${isMissed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{student?.name}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tight">{student?.planType}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAttendance(booking.id, BookingStatus.ATTENDED)}
                            className={`p-2 rounded-lg transition-all ${isAttended ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300 hover:text-green-500'}`}
                            title="Presente"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleAttendance(booking.id, BookingStatus.MISSED)}
                            className={`p-2 rounded-lg transition-all ${isMissed ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-300 hover:text-red-500'}`}
                            title="Faltou"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-16 text-center text-slate-200">
                    <p className="font-black text-xs uppercase">Sem alunos para esta aula</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-slate-300">
               <ClipboardList className="w-12 h-12 mb-2 opacity-20" />
               <p className="font-black text-[10px] uppercase tracking-widest">Selecione uma aula para iniciar a chamada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
