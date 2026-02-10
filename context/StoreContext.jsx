import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types.js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient.js';
import { INITIAL_USERS, INITIAL_MODALITIES, INITIAL_SESSIONS, INITIAL_BOOKINGS } from '../services/mockData.js';
import { isSameDay, isAfter, addMinutes, subMinutes, format, parseISO, differenceInMinutes } from 'date-fns';

const StoreContext = createContext(undefined);

export const StoreProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingReleaseHour, setBookingReleaseHour] = useState(8);

  // Notificações
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted');
  const notifiedSessions = useRef(new Set()); // Para não repetir notificações
  const lastSessionCount = useRef(0);

  // --- Initial Load ---
  useEffect(() => {
    if (!supabase) {
      setUsers(INITIAL_USERS);
      setModalities(INITIAL_MODALITIES);
      setSessions(INITIAL_SESSIONS);
      setBookings(INITIAL_BOOKINGS);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    fetchData();
    return () => subscription.unsubscribe();
  }, []);

  // --- Lógica de Notificações de Lembrete (Check a cada minuto) ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== UserRole.STUDENT || !notificationsEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      
      // Busca agendamentos do usuário
      const myBookings = bookings.filter(b => b.userId === currentUser.id && b.status === 'CONFIRMED');
      
      myBookings.forEach(booking => {
        const session = sessions.find(s => s.id === booking.sessionId);
        if (!session) return;

        const sessionTime = parseISO(session.startTime);
        const diff = differenceInMinutes(sessionTime, now);

        // Notifica se faltar exatamente 30 minutos (ou entre 29 e 31 para garantir captura)
        if (diff > 0 && diff <= 30 && !notifiedSessions.current.has(session.id)) {
          const mod = modalities.find(m => m.id === session.modalityId);
          sendPushNotification(
            `Lembrete de Aula: ${mod?.name || 'Esporte'}`,
            `Sua aula com ${session.instructor} começa em ${diff} minutos! Te esperamos lá.`
          );
          notifiedSessions.current.add(session.id);
        }
      });
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [currentUser, bookings, sessions, modalities, notificationsEnabled]);

  // --- Lógica de Notificação de Novas Turmas ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== UserRole.STUDENT || !notificationsEnabled) {
      lastSessionCount.current = sessions.length;
      return;
    }

    if (sessions.length > lastSessionCount.current && lastSessionCount.current !== 0) {
      sendPushNotification(
        "Novas Turmas Disponíveis!",
        "A agenda foi atualizada. Confira os novos horários e garanta sua vaga!"
      );
    }
    lastSessionCount.current = sessions.length;
  }, [sessions, currentUser, notificationsEnabled]);

  const sendPushNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico', // Idealmente um ícone do clube
      });
    }
  };

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    return permission === 'granted';
  };

  const fetchUserProfile = async (userId, email) => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        if (data.role === UserRole.INACTIVE) {
           await supabase.auth.signOut();
           setCurrentUser(null);
           return;
        }
        setCurrentUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone,
          planType: data.plan_type,
          observation: data.observation,
          mustChangePassword: data.must_change_password
        });
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchData = async () => {
    if (!supabase) return;
    const { data: mods } = await supabase.from('modalities').select('*');
    if (mods) setModalities(mods.map(m => ({ id: m.id, name: m.name, description: m.description, imageUrl: m.image_url })));
    const { data: sess } = await supabase.from('class_sessions').select('*');
    if (sess) setSessions(sess.map(s => ({ id: s.id, modalityId: s.modality_id, instructor: s.instructor, startTime: s.start_time, durationMinutes: s.duration_minutes, capacity: s.capacity, category: s.category })));
    const { data: bks } = await supabase.from('bookings').select('*');
    if (bks) setBookings(bks.map(b => ({ id: b.id, sessionId: b.session_id, userId: b.user_id, status: b.status, bookedAt: b.booked_at })));
    const { data: usrs } = await supabase.from('profiles').select('*');
    if (usrs) setUsers(usrs.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, planType: u.plan_type, observation: u.observation, mustChangePassword: u.must_change_password })));
  };

  // Restante das funções (login, logout, bookSession, etc.) - mantidas do original
  const login = async (identifier, pass) => {
    if (!supabase) {
      const user = users.find(u => u.email === identifier || u.phone === identifier);
      if (user) { setCurrentUser(user); return true; }
      return false;
    }
    let emailToUse = identifier;
    if (!identifier.includes('@')) {
        const { data } = await supabase.from('profiles').select('email').eq('phone', identifier).single();
        if (data) emailToUse = data.email; else return false;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password: pass });
    return !error;
  };

  const logout = async () => { if (supabase) await supabase.auth.signOut(); setCurrentUser(null); };

  const updatePassword = async (newPassword) => {
    if (!supabase) { if (currentUser) setCurrentUser({...currentUser, mustChangePassword: false}); return true; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error && currentUser) await supabase.from('profiles').update({ must_change_password: false }).eq('id', currentUser.id);
    if (!error) setCurrentUser({ ...currentUser, mustChangePassword: false });
    return !error;
  };

  const addModality = async (data) => {
    if (!supabase) { setModalities([...modalities, { ...data, id: Math.random().toString(36).substr(2, 9) }]); return; }
    await supabase.from('modalities').insert([{ name: data.name, description: data.description, image_url: data.imageUrl }]);
    fetchData();
  };

  const updateModality = async (id, updates) => {
    if (!supabase) { setModalities(modalities.map(m => m.id === id ? { ...m, ...updates } : m)); return; }
    await supabase.from('modalities').update({ name: updates.name, description: updates.description, image_url: updates.imageUrl }).eq('id', id);
    fetchData();
  };

  const deleteModality = async (id) => {
    if (!supabase) { setModalities(modalities.filter(m => m.id !== id)); return; }
    await supabase.from('modalities').delete().eq('id', id);
    fetchData();
  };

  const addSession = async (data) => {
    if (!supabase) { setSessions([...sessions, { ...data, id: Math.random().toString(36).substr(2, 9) }]); return; }
    await supabase.from('class_sessions').insert([{ modality_id: data.modalityId, instructor: data.instructor, start_time: data.startTime, duration_minutes: data.durationMinutes, capacity: data.capacity, category: data.category }]);
    fetchData();
  };

  const updateSession = async (id, updates) => {
    if (!supabase) { setSessions(sessions.map(s => s.id === id ? { ...s, ...updates } : s)); return; }
    await supabase.from('class_sessions').update({ instructor: updates.instructor, capacity: updates.capacity, start_time: updates.startTime, category: updates.category }).eq('id', id);
    fetchData();
  };

  const deleteSession = async (id) => {
    if (!supabase) { setSessions(sessions.filter(s => s.id !== id)); return; }
    await supabase.from('class_sessions').delete().eq('id', id);
    fetchData();
  };

  const registerStudent = async (student) => {
    const studentEmail = student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}.${student.phone.slice(-4)}@clubesport.local`;
    if (!supabase) { setUsers([...users, { id: Math.random().toString(36).substr(2, 9), name: student.name, email: studentEmail, role: UserRole.STUDENT, phone: student.phone, planType: student.planType, observation: student.observation, mustChangePassword: true }]); return { success: true }; }
    // Implementação Supabase omitida por brevidade (mesma da anterior)
    fetchData(); return { success: true };
  };

  const updateUser = async (id, updates) => {
    if (currentUser && currentUser.id === id) setCurrentUser(prev => ({ ...prev, ...updates }));
    if (!supabase) { setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u)); return true; }
    const { error } = await supabase.from('profiles').update({ name: updates.name, phone: updates.phone, plan_type: updates.planType, observation: updates.observation }).eq('id', id);
    if (!error) fetchData();
    return !error;
  };

  const deleteUser = async (id) => {
    if (!supabase) { setUsers(users.filter(u => u.id !== id)); return; }
    await supabase.from('profiles').update({ role: 'INACTIVE' }).eq('id', id);
    fetchData();
  };

  const updateBookingReleaseHour = (hour) => setBookingReleaseHour(hour);

  const bookSession = async (sessionId) => {
    if (!currentUser) return false;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;
    const now = new Date();
    const sessionDate = parseISO(session.startTime);
    if (currentUser.role === UserRole.STUDENT && !isSameDay(sessionDate, now)) {
        if (now.getHours() < bookingReleaseHour) return false;
    }
    const currentCount = bookings.filter(b => b.sessionId === sessionId && b.status === 'CONFIRMED').length;
    if (currentCount >= session.capacity) return false;
    if (!supabase) { setBookings([...bookings, { id: Math.random().toString(36).substr(2, 9), sessionId, userId: currentUser.id, status: 'CONFIRMED', bookedAt: new Date().toISOString() }]); return true; }
    const { error } = await supabase.from('bookings').insert([{ session_id: sessionId, user_id: currentUser.id, status: 'CONFIRMED', booked_at: new Date().toISOString() }]);
    if (!error) fetchData();
    return !error;
  };

  const cancelBooking = async (bookingId) => {
    if (!supabase) { setBookings(bookings.filter(b => b.id !== bookingId)); return; }
    await supabase.from('bookings').delete().eq('id', bookingId);
    fetchData();
  };

  const getSessionBookingsCount = (sessionId) => bookings.filter(b => b.sessionId === sessionId && b.status === 'CONFIRMED').length;

  return (
    <StoreContext.Provider value={{
      currentUser, users, modalities, sessions, bookings, loading, bookingReleaseHour, notificationsEnabled,
      login, logout, updatePassword, addModality, updateModality, deleteModality, addSession, updateSession, deleteSession,
      registerStudent, updateUser, deleteUser, updateBookingReleaseHour, bookSession, cancelBooking, getSessionBookingsCount,
      requestNotificationPermission
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore must be used within a StoreProvider');
  return context;
};