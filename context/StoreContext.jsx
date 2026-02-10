
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole, BookingStatus } from '../types.js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
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
        // Apenas busca o perfil se o usuário mudou ou se ainda não temos usuário carregado
        // Isso evita sobrescrever o estado local durante operações sensíveis como troca de senha
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
    if (sess) setSessions(sess.map(s => ({ id: s.id, modalityId: s.modality_id, instructor: s.instructor, startTime: s.start_time, duration_minutes: s.duration_minutes, capacity: s.capacity, category: s.category })));
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
    
    let emailToUse = identifier.trim();
    
    if (!emailToUse.includes('@')) {
        const { data } = await supabase.from('profiles').select('email').eq('phone', emailToUse).single();
        if (data) {
            emailToUse = data.email;
        } else {
            console.warn("Login: Telefone não encontrado no cadastro.");
            return false;
        }
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password: pass });
    
    if (error) {
        console.error("Erro no login:", error.message);
    }
    
    return !error;
  };

  const logout = async () => { if (supabase) await supabase.auth.signOut(); setCurrentUser(null); };

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

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) return { success: false, error: authError.message };

      const newUserId = authData.user?.id;
      if (!newUserId) return { success: false, error: "Usuário criado, mas ID não retornado." };

      const payload = {
        id: newUserId,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: role,
        must_change_password: true
      };

      const { error: profileError } = await supabase.from('profiles').insert([payload]);

      if (profileError) {
        if (profileError.code === '23505') {
             const { error: updateError } = await supabase.from('profiles').update(payload).eq('email', userData.email);
             if (updateError) return { success: false, error: updateError.message };
        } else {
             return { success: false, error: profileError.message };
        }
      }

      await fetchData(); 
      return { success: true };

    } catch (err) {
      console.error("Exceção no registro:", err);
      return { success: false, error: "Falha inesperada no processamento." };
    }
  };

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

  // --- LÓGICA DE ATUALIZAÇÃO DE SENHA CORRIGIDA ---
  const updatePassword = async (newPassword) => {
      console.log("Iniciando updatePassword...");
      if (!supabase) {
          const updatedUser = { ...currentUser, mustChangePassword: false };
          setCurrentUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
          return true;
      }
      
      // 1. Atualizar Auth do Supabase
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
          console.error("Erro FATAL ao atualizar senha no Auth:", error.message);
          return false;
      }

      console.log("Senha Auth atualizada. Atualizando perfil...");

      // 2. Atualizar tabela de Profiles (DB)
      // Fazemos isso independente do sucesso do passo 1 para garantir consistência
      const { error: profileError } = await supabase.from('profiles')
          .update({ must_change_password: false })
          .eq('id', currentUser.id);

      if (profileError) {
          console.warn("Aviso: Erro ao atualizar flag no perfil (pode ser RLS), mas a senha foi trocada.", profileError.message);
      } else {
          console.log("Perfil DB atualizado.");
      }
      
      // 3. ATUALIZAÇÃO OTIMISTA DO ESTADO LOCAL (CRÍTICO)
      // Forçamos o estado local imediatamente para permitir a navegação no ProtectedRoute
      setCurrentUser(prev => {
          const newState = { ...prev, mustChangePassword: false };
          console.log("Estado local currentUser atualizado manualmente para:", newState);
          return newState;
      });

      // 4. Forçar refresh silencioso para garantir sincronia futura
      // Não usamos await aqui para não travar a UI
      fetchUserProfile(currentUser.id).catch(err => console.error("Erro no refresh de fundo:", err));

      return true;
  };

  return (
    <StoreContext.Provider value={{
      currentUser, users, modalities, sessions, bookings, loading, bookingReleaseHour, notificationsEnabled,
      login, logout, addSession, deleteSession, deleteModality, registerUser, updateBookingStatus, getStudentStats, requestNotificationPermission, getSessionBookingsCount, updatePassword,
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
      }
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
