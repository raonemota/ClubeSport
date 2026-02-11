
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { format, isSameDay, parseISO, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, User, CheckCircle2, XCircle, Clock, Calendar as CalendarIcon, ClipboardList } from 'lucide-react';
import { BookingStatus } from '../../types.js';

export const TeacherPortal = () => {
  const { currentUser, sessions, modalities, bookings, users, updateBookingStatus } = useStore();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Filtrar aulas do professor (ou todas se for demo)
  const mySessions = sessions.filter(s => 
    isSameDay(parseISO(s.startTime), viewDate) && 
    (s.instructor === currentUser?.name || true) // Mock logic
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const currentSession = sessions.find(s => s.id === selectedSessionId);
  const sessionBookings = bookings.filter(b => b.sessionId === selectedSessionId);

  const handleAttendance = async (bookingId, status) => {
    await updateBookingStatus(bookingId, status);
  };

  // Usando Intl para formatar a data do topo
  const formattedHeaderDate = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: '2-digit' 
  }).format(viewDate);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Olá, {currentUser?.name}</h1>
          <p className="text-slate-500 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Controle de Frequência e Chamadas</p>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
           <button onClick={() => setViewDate(addDays(viewDate, -1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft /></button>
           <span className="font-bold text-slate-700 min-w-[140px] text-center capitalize">{formattedHeaderDate}</span>
           <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">Aulas Programadas</h3>
          {mySessions.map(session => {
            const modality = modalities.find(m => m.id === session.modalityId);
            const count = bookings.filter(b => b.sessionId === session.id && b.status !== BookingStatus.CANCELLED_BY_STUDENT).length;
            const isSelected = selectedSessionId === session.id;
            return (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg ring-4 ring-indigo-100' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{modality?.name}</span>
                  <span className="flex items-center gap-1 text-sm font-bold"><Clock className="w-3 h-3" /> {format(parseISO(session.startTime), 'HH:mm')}</span>
                </div>
                <p className={`font-bold text-lg leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{session.category || 'Aula Geral'}</p>
                <p className={`text-xs mt-1 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{count} Alunos Inscritos</p>
              </button>
            );
          })}
          {mySessions.length === 0 && (
            <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm italic">Nenhuma aula encontrada para esta data.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedSessionId ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 text-xl">Lista de Presença</h3>
                  <p className="text-xs text-slate-500 font-medium">Confirme quem compareceu à aula hoje.</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-black text-indigo-600 leading-none">{sessionBookings.length}</p>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Total Alunos</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {sessionBookings.length > 0 ? (
                  sessionBookings.map(booking => {
                    const student = users.find(u => u.id === booking.userId);
                    const isAttended = booking.status === BookingStatus.ATTENDED;
                    const isMissed = booking.status === BookingStatus.MISSED;
                    return (
                      <div key={booking.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${isMissed ? 'bg-red-50/30' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isAttended ? 'bg-green-500' : isMissed ? 'bg-red-500' : 'bg-slate-300'}`}>
                            {student?.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-bold ${isMissed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{student?.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">{student?.planType || 'Mensalista'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAttendance(booking.id, BookingStatus.ATTENDED)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isAttended ? 'bg-green-500 text-white border-green-500 shadow-sm shadow-green-200' : 'bg-white text-slate-400 border-slate-200 hover:border-green-400 hover:text-green-500'}`}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Presença
                          </button>
                          <button
                            onClick={() => handleAttendance(booking.id, BookingStatus.MISSED)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isMissed ? 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-200' : 'bg-white text-slate-400 border-slate-200 hover:border-red-400 hover:text-red-500'}`}
                          >
                            <XCircle className="w-4 h-4" /> Falta
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p>Nenhum aluno agendado para esta aula.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-slate-400">
               <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
               <h3 className="font-bold text-lg">Chamada do Dia</h3>
               <p className="max-w-[280px] text-center text-sm">Selecione uma aula ao lado para visualizar os alunos e marcar a presença.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
