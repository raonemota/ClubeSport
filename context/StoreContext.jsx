
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole, BookingStatus } from '../types.js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_USERS, INITIAL_MODALITIES, INITIAL_SESSIONS, INITIAL_BOOKINGS } from '../services/mockData.js';
import { isSameDay, parseISO, addDays, format } from 'date-fns';

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
  
  const isUpdatingPassword = useRef(false);

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
      if (isUpdatingPassword.current) return;

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
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
        setCurrentUser({ ...data, planType: data.plan_type, modalityId: data.modality_id, mustChangePassword: data.must_change_password });
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchData = async () => {
    if (!supabase) return;
    try {
      const { data: mods } = await supabase.from('modalities').select('*');
      if (mods) setModalities(mods.map(m => ({ id: m.id, name: m.name, description: m.description, imageUrl: m.image_url })));
      
      const { data: sess } = await supabase.from('class_sessions').select('*');
      if (sess) setSessions(sess.map(s => ({ 
        id: s.id, 
        modalityId: s.modality_id, 
        instructor: s.instructor, 
        startTime: s.start_time, 
        duration_minutes: s.duration_minutes, 
        capacity: s.capacity, 
        category: s.category || '' 
      })));
      
      const { data: bks } = await supabase.from('bookings').select('*');
      if (bks) setBookings(bks.map(b => ({ id: b.id, sessionId: b.session_id, userId: b.user_id, status: b.status, bookedAt: b.booked_at })));
      
      const { data: usrs } = await supabase.from('profiles').select('*');
      if (usrs) setUsers(usrs.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, planType: u.plan_type, modalityId: u.modality_id, observation: u.observation, mustChangePassword: u.must_change_password })));
    } catch (err) {
      console.error("Erro ao carregar dados do banco:", err);
    }
  };

  const login = async (identifier, pass) => {
    if (!supabase) {
      const user = users.find(u => u.email === identifier || u.phone === identifier);
      if (user) { setCurrentUser(user); return true; }
      return false;
    }
    
    let emailToUse = identifier.trim();
    if (!emailToUse.includes('@')) {
        const { data } = await supabase.from('profiles').select('email').eq('phone', emailToUse).single();
        if (data) emailToUse = data.email;
        else return false;
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password: pass });
    return !error;
  };

  const logout = async () => { 
    setLoading(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      setCurrentUser(null);
      setLoading(false);
    }
  };

  const registerUser = async (userData, role = UserRole.STUDENT) => {
    if (!supabase) { 
      const newUser = { ...userData, id: Math.random().toString(36).substr(2, 9), role, mustChangePassword: true };
      setUsers([...users, newUser]); 
      return { success: true }; 
    }
    try {
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
      });
      const { data: authData, error: authError } = await tempClient.auth.signUp({ email: userData.email, password: userData.password });
      if (authError) return { success: false, error: authError.message };
      const newUserId = authData.user?.id;
      const payload = { 
        id: newUserId, 
        email: userData.email, 
        name: userData.name, 
        phone: userData.phone, 
        role: role, 
        modality_id: userData.modalityId || null,
        must_change_password: true 
      };
      const { error: profileError } = await supabase.from('profiles').insert([payload]);
      await fetchData(); 
      return { success: true };
    } catch (err) {
      return { success: false, error: "Falha inesperada." };
    }
  };

  const updatePassword = async (newPassword) => {
      if (!supabase) {
          const updatedUser = { ...currentUser, mustChangePassword: false };
          setCurrentUser(updatedUser);
          return true;
      }
      isUpdatingPassword.current = true;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { isUpdatingPassword.current = false; return false; }
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', currentUser.id);
      setCurrentUser({ ...currentUser, mustChangePassword: false });
      setTimeout(() => { isUpdatingPassword.current = false; }, 3000);
      return true;
  };

  const addSession = async (data) => {
    if (!supabase) {
      setSessions([...sessions, { ...data, id: Date.now().toString() }]);
    } else {
      await supabase.from('class_sessions').insert([{
        modality_id: data.modalityId,
        instructor: data.instructor,
        start_time: data.startTime,
        duration_minutes: data.durationMinutes,
        capacity: data.capacity,
        category: data.category
      }]);
    }
    fetchData();
  };

  const updateSession = async (id, data) => {
    if (!supabase) {
      setSessions(sessions.map(s => s.id === id ? { ...s, ...data } : s));
    } else {
      await supabase.from('class_sessions').update({
        modality_id: data.modalityId,
        instructor: data.instructor,
        start_time: data.startTime,
        duration_minutes: data.durationMinutes,
        capacity: data.capacity,
        category: data.category
      }).eq('id', id);
    }
    fetchData();
  };

  const addSessionsBatch = async (batchData) => {
    const { modalityId, instructor, startDate, endDate, times, daysOfWeek, capacity, category, durationMinutes } = batchData;
    const newSessions = [];
    let current = parseISO(startDate);
    const end = parseISO(endDate);

    while (current <= end) {
      const day = current.getDay();
      if (daysOfWeek.includes(day)) {
        times.forEach(time => {
          const [hours, minutes] = time.split(':');
          const sessionDate = new Date(current);
          sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          newSessions.push({
            modality_id: modalityId,
            instructor,
            start_time: sessionDate.toISOString(),
            duration_minutes: durationMinutes,
            capacity,
            category: category
          });
        });
      }
      current = addDays(current, 1);
    }

    if (!supabase) {
      const withIds = newSessions.map(s => ({
        ...s, 
        id: Math.random().toString(36).substr(2, 9), 
        modalityId: s.modality_id, 
        startTime: s.start_time, 
        duration_minutes: s.duration_minutes
      }));
      setSessions(prev => [...prev, ...withIds]);
    } else {
      const { error } = await supabase.from('class_sessions').insert(newSessions);
      if (error) {
          console.error("Erro ao criar lote:", error);
          alert(`Erro no banco: ${error.message}. Certifique-se de que a coluna 'category' foi criada.`);
      }
    }
    await fetchData();
  };

  const deleteSession = async (id) => {
    if (!supabase) setSessions(sessions.filter(s => s.id !== id));
    else await supabase.from('class_sessions').delete().eq('id', id);
    fetchData();
  };

  const deleteSessions = async (ids) => {
    if (!supabase) {
      setSessions(sessions.filter(s => !ids.includes(s.id)));
    } else {
      await supabase.from('class_sessions').delete().in('id', ids);
    }
    fetchData();
  };

  const deleteModality = async (id) => {
    if (!supabase) setModalities(modalities.filter(m => m.id !== id));
    else await supabase.from('modalities').delete().eq('id', id);
    fetchData();
  };

  const updateBookingStatus = async (id, status) => {
    try {
      if (!supabase) {
        setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
      } else {
        const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
        if (error) throw error;
      }
      await fetchData();
    } catch (err) {
      console.error("Erro ao atualizar status da reserva:", err);
      alert("Erro ao salvar no banco de dados. Verifique a conexão.");
    }
  };

  const getStudentStats = (userId) => {
    const userBookings = bookings.filter(b => b.userId === userId);
    return {
      total: userBookings.length,
      attended: userBookings.filter(b => b.status === BookingStatus.ATTENDED).length,
      missed: userBookings.filter(b => b.status === BookingStatus.MISSED).length,
      upcoming: userBookings.filter(b => b.status === BookingStatus.CONFIRMED).length
    };
  };

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  const getSessionBookingsCount = (sessionId) => {
    return bookings.filter(b => b.sessionId === sessionId && b.status === BookingStatus.CONFIRMED).length;
  };

  return (
    <StoreContext.Provider value={{
      currentUser, users, modalities, sessions, bookings, loading, bookingReleaseHour, notificationsEnabled,
      login, logout, addSession, updateSession, addSessionsBatch, deleteSession, deleteSessions, deleteModality, registerUser, updateBookingStatus, getStudentStats, requestNotificationPermission, getSessionBookingsCount, updatePassword,
      updateBookingReleaseHour: (h) => setBookingReleaseHour(parseInt(h)),
      addModality: async (d) => { if (!supabase) setModalities([...modalities, {...d, id: Date.now().toString()}]); else await supabase.from('modalities').insert([{name: d.name, description: d.description, image_url: d.imageUrl}]); fetchData(); },
      updateUser: async (id, upd) => { 
        if (!supabase) {
          setUsers(users.map(u => u.id === id ? {...u, ...upd} : u));
          if (currentUser?.id === id) setCurrentUser({...currentUser, ...upd});
        } else {
          const payload = {};
          if (upd.name !== undefined) payload.name = upd.name;
          if (upd.phone !== undefined) payload.phone = upd.phone;
          if (upd.email !== undefined) payload.email = upd.email;
          if (upd.planType !== undefined) payload.plan_type = upd.planType;
          if (upd.role !== undefined) payload.role = upd.role;
          if (upd.modalityId !== undefined) payload.modality_id = upd.modalityId;
          
          await supabase.from('profiles').update(payload).eq('id', id);
          if (currentUser?.id === id) await fetchUserProfile(id);
        }
        await fetchData(); 
        return true;
      },
      deleteUser: async (id) => { if (!supabase) setUsers(users.filter(u => u.id !== id)); else await supabase.from('profiles').update({role: UserRole.INACTIVE}).eq('id', id); fetchData(); },
      bookSession: async (sid) => { 
        if (!currentUser) return false;
        try {
          if (!supabase) { 
            setBookings([...bookings, {id: Date.now().toString(), sessionId: sid, userId: currentUser.id, status: BookingStatus.CONFIRMED, bookedAt: new Date().toISOString()}]); 
            return true; 
          }
          const { error } = await supabase.from('bookings').insert([{session_id: sid, user_id: currentUser.id, status: BookingStatus.CONFIRMED}]);
          if (error) throw error;
          await fetchData(); 
          return true;
        } catch (err) {
          console.error("Erro ao reservar aula:", err);
          return false;
        }
      },
      cancelBooking: async (bid) => {
        try {
          const status = BookingStatus.CANCELLED;
          if (!supabase) {
            setBookings(bookings.map(b => b.id === bid ? {...b, status} : b));
          } else {
            const { error } = await supabase.from('bookings').update({ status }).eq('id', bid);
            if (error) throw error;
          }
          await fetchData();
        } catch (err) {
          console.error("Erro ao cancelar reserva:", err);
          alert("Erro ao cancelar a reserva no servidor.");
        }
      }
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
