
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole, BookingStatus } from '../types.js';
import { supabase } from '../lib/supabaseClient.js';
import { INITIAL_USERS, INITIAL_MODALITIES, INITIAL_SESSIONS, INITIAL_BOOKINGS } from '../services/mockData.js';
import { isSameDay, parseISO, differenceInMinutes } from 'date-fns';

const StoreContext = createContext(undefined);

export const StoreProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingReleaseHour, setBookingReleaseHour] = useState(8);

  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted');
  const notifiedSessions = useRef(new Set());
  const lastSessionCount = useRef(0);

  useEffect(() => {
    if (!supabase) {
      setUsers(INITIAL_USERS);
      setModalities(INITIAL_MODALITIES);
      setSessions(INITIAL_SESSIONS);
      setBookings(INITIAL_BOOKINGS);
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn("Erro ao recuperar sessão, limpando dados locais:", error.message);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (session) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro inesperado na inicialização:", err);
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setLoading(false);
      } else if (session) {
        if (!currentUser || currentUser.id !== session.user.id) {
            await fetchUserProfile(session.user.id);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    fetchData();
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        if (data.role === UserRole.INACTIVE) {
           await supabase.auth.signOut();
           setCurrentUser(null);
           return;
        }
        setCurrentUser({ ...data, planType: data.plan_type, mustChangePassword: data.must_change_password });
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

  const addSession = async (data) => {
    if (!supabase) { setSessions([...sessions, { ...data, id: Math.random().toString(36).substr(2, 9) }]); return; }
    await supabase.from('class_sessions').insert([{ modality_id: data.modalityId, instructor: data.instructor, start_time: data.startTime, duration_minutes: data.durationMinutes, capacity: data.capacity, category: data.category }]);
    fetchData();
  };

  const deleteSession = async (sessionId) => {
    if (!supabase) { setSessions(sessions.filter(s => s.id !== sessionId)); return; }
    await supabase.from('class_sessions').delete().eq('id', sessionId);
    fetchData();
  };

  const deleteModality = async (modalityId) => {
    if (!supabase) { setModalities(modalities.filter(m => m.id !== modalityId)); return; }
    await supabase.from('modalities').delete().eq('id', modalityId);
    fetchData();
  };

  const registerUser = async (userData, role = UserRole.STUDENT) => {
    if (!supabase) { 
      const newUser = { ...userData, id: Math.random().toString(36).substr(2, 9), role, mustChangePassword: true };
      setUsers([...users, newUser]); 
      return { success: true }; 
    }
    
    try {
      // Importante: role deve ser passado exatamente como o banco espera (Case Sensitive)
      // Se profiles_role_check falha, significa que 'TEACHER' não está na lista permitida do banco.
      const payload = {
        id: crypto.randomUUID(),
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: role,
        must_change_password: true
      };

      const { error } = await supabase.from('profiles').insert([payload]);

      if (error) {
        console.error("Erro crítico no registerUser:", error);
        return { success: false, error: error.message };
      }

      await fetchData(); 
      return { success: true };
    } catch (err) {
      console.error("Exceção no registerUser:", err);
      return { success: false, error: "Ocorreu uma falha no processamento do registro." };
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    if (!supabase) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status } : b));
      return true;
    }
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
    if (!error) fetchData();
    return !error;
  };

  const getStudentStats = (studentId) => {
    const studentBookings = bookings.filter(b => b.userId === studentId);
    return {
      total: studentBookings.length,
      attended: studentBookings.filter(b => b.status === BookingStatus.ATTENDED).length,
      missed: studentBookings.filter(b => b.status === BookingStatus.MISSED).length,
      pending: studentBookings.filter(b => b.status === BookingStatus.CONFIRMED).length
    };
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  const getSessionBookingsCount = (sessionId) => {
    return bookings.filter(b => b.sessionId === sessionId && b.status !== BookingStatus.CANCELLED_BY_STUDENT && b.status !== BookingStatus.CANCELLED_BY_ADMIN).length;
  };

  return (
    <StoreContext.Provider value={{
      currentUser, users, modalities, sessions, bookings, loading, bookingReleaseHour, notificationsEnabled,
      login, logout, addSession, deleteSession, deleteModality, registerUser, updateBookingStatus, getStudentStats, requestNotificationPermission, getSessionBookingsCount,
      addModality: async (d) => { if (!supabase) setModalities([...modalities, {...d, id: Date.now().toString()}]); else await supabase.from('modalities').insert([{name: d.name, description: d.description, image_url: d.imageUrl}]); fetchData(); },
      updateUser: async (id, upd) => { if (!supabase) setUsers(users.map(u => u.id === id ? {...u, ...upd} : u)); else await supabase.from('profiles').update({name: upd.name, phone: upd.phone, plan_type: upd.planType, role: upd.role}).eq('id', id); fetchData(); },
      deleteUser: async (id) => { if (!supabase) setUsers(users.filter(u => u.id !== id)); else await supabase.from('profiles').update({role: UserRole.INACTIVE}).eq('id', id); fetchData(); },
      bookSession: async (sid) => { 
        if (!currentUser) return false;
        if (!supabase) { setBookings([...bookings, {id: Date.now().toString(), sessionId: sid, userId: currentUser.id, status: BookingStatus.CONFIRMED, bookedAt: new Date().toISOString()}]); return true; }
        await supabase.from('bookings').insert([{session_id: sid, user_id: currentUser.id, status: BookingStatus.CONFIRMED}]); fetchData(); return true;
      },
      cancelBooking: async (bid, isAdmin) => {
        const status = isAdmin ? BookingStatus.CANCELLED_BY_ADMIN : BookingStatus.CANCELLED_BY_STUDENT;
        if (!supabase) setBookings(bookings.map(b => b.id === bid ? {...b, status} : b));
        else await supabase.from('bookings').update({status}).eq('id', bid);
        fetchData();
      },
      updatePassword: async (newPassword) => {
          if (!supabase) return true;
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (!error) {
              await supabase.from('profiles').update({ must_change_password: false }).eq('id', currentUser.id);
              setCurrentUser({ ...currentUser, mustChangePassword: false });
          }
          return !error;
      }
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
