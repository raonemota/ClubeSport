import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types.js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient.js';
import { INITIAL_USERS, INITIAL_MODALITIES, INITIAL_SESSIONS, INITIAL_BOOKINGS } from '../services/mockData.js';

const StoreContext = createContext(undefined);

export const StoreProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  // Configuração global: Horário de liberação da agenda de amanhã (Default: 08:00)
  const [bookingReleaseHour, setBookingReleaseHour] = useState(8);

  // --- Initial Load & Auth Listener ---
  useEffect(() => {
    if (!supabase) {
      // MOCK MODE INITIALIZATION
      setUsers(INITIAL_USERS);
      setModalities(INITIAL_MODALITIES);
      setSessions(INITIAL_SESSIONS);
      setBookings(INITIAL_BOOKINGS);
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    // Fetch Public Data
    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId, email) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        if (data.role === UserRole.INACTIVE) {
           await supabase.auth.signOut();
           setCurrentUser(null);
           alert('Esta conta foi desativada. Entre em contato com a administração.');
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
      } else {
        console.error("Profile not found");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!supabase) return;

    const { data: mods } = await supabase.from('modalities').select('*');
    if (mods) {
      setModalities(mods.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        imageUrl: m.image_url
      })));
    }

    const { data: sess } = await supabase.from('class_sessions').select('*');
    if (sess) {
      setSessions(sess.map(s => ({
        id: s.id,
        modalityId: s.modality_id,
        instructor: s.instructor,
        startTime: s.start_time,
        durationMinutes: s.duration_minutes,
        capacity: s.capacity,
        category: s.category
      })));
    }

    const { data: bks } = await supabase.from('bookings').select('*');
    if (bks) {
      setBookings(bks.map(b => ({
        id: b.id,
        sessionId: b.session_id,
        userId: b.user_id,
        status: b.status,
        bookedAt: b.booked_at
      })));
    }

    const { data: usrs } = await supabase.from('profiles').select('*');
    if (usrs) {
      const allUsers = usrs.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        planType: u.plan_type,
        observation: u.observation,
        mustChangePassword: u.must_change_password
      }));
      setUsers(allUsers.filter(u => u.role !== UserRole.INACTIVE));
    }
  };

  const login = async (email, pass) => {
    if (!supabase) {
      const user = INITIAL_USERS.find(u => u.email === email);
      if (user) {
        setCurrentUser(user);
        return true;
      }
      return false;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    
    if (error) return false;
    return true;
  };

  const logout = async () => {
    if (!supabase) {
      setCurrentUser(null);
      return;
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const updatePassword = async (newPassword) => {
    if (!supabase) {
      if (currentUser) {
          setCurrentUser({...currentUser, mustChangePassword: false});
      }
      return true;
    }
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("Erro ao atualizar senha:", error);
      return false;
    }

    if (currentUser) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', currentUser.id);
            
        if (!profileError) {
             setCurrentUser({ ...currentUser, mustChangePassword: false });
        }
    }
    return true;
  };

  const addModality = async (data) => {
    if (!supabase) {
      const newId = Math.random().toString(36).substr(2, 9);
      setModalities([...modalities, { ...data, id: newId }]);
      return;
    }

    const { error } = await supabase.from('modalities').insert([{
      name: data.name,
      description: data.description,
      image_url: data.imageUrl
    }]);
    
    if (!error) fetchData();
  };

  const updateModality = async (id, updates) => {
    if (!supabase) {
      setModalities(modalities.map(m => m.id === id ? { ...m, ...updates } : m));
      return;
    }

    const dbUpdates = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;

    const { error } = await supabase.from('modalities').update(dbUpdates).eq('id', id);
    if (!error) fetchData();
  };

  const deleteModality = async (id) => {
    if (!supabase) {
      setModalities(modalities.filter(m => m.id !== id));
      return;
    }

    const { error } = await supabase.from('modalities').delete().eq('id', id);
    if (!error) fetchData();
  };

  const addSession = async (data) => {
    if (!supabase) {
      const newId = Math.random().toString(36).substr(2, 9);
      setSessions([...sessions, { ...data, id: newId }]);
      return;
    }

    const { error } = await supabase.from('class_sessions').insert([{
      modality_id: data.modalityId,
      instructor: data.instructor,
      start_time: data.startTime,
      duration_minutes: data.durationMinutes,
      capacity: data.capacity,
      category: data.category
    }]);
    if (!error) fetchData();
  };

  const updateSession = async (id, updates) => {
    if (!supabase) {
      setSessions(sessions.map(s => s.id === id ? { ...s, ...updates } : s));
      return;
    }

    const dbUpdates = {};
    if (updates.instructor) dbUpdates.instructor = updates.instructor;
    if (updates.capacity) dbUpdates.capacity = updates.capacity;
    if (updates.startTime) dbUpdates.start_time = updates.startTime;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { error } = await supabase.from('class_sessions').update(dbUpdates).eq('id', id);
    if (!error) fetchData();
  };

  const deleteSession = async (id) => {
    if (!supabase) {
      setSessions(sessions.filter(s => s.id !== id));
      return;
    }

    const { error } = await supabase.from('class_sessions').delete().eq('id', id);
    if (!error) fetchData();
  };

  const registerStudent = async (student) => {
    const studentEmail = student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}.${student.phone.slice(-4)}@clubesport.local`;

    if (!supabase) {
      const newId = Math.random().toString(36).substr(2, 9);
      const newUser = {
        id: newId,
        name: student.name,
        email: studentEmail,
        role: UserRole.STUDENT,
        phone: student.phone,
        planType: student.planType,
        observation: student.observation,
        mustChangePassword: true
      };
      setUsers([...users, newUser]);
      return { success: true };
    }

    try {
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', studentEmail)
            .single();

        if (existingProfile) {
            if (existingProfile.role !== UserRole.INACTIVE) {
                 return { success: false, message: 'Usuário já está ativo no sistema.' };
            }

            const { error: updateError } = await supabase.from('profiles').update({
                name: student.name,
                phone: student.phone,
                plan_type: student.planType,
                observation: student.observation,
                role: 'STUDENT', 
            }).eq('id', existingProfile.id);

            if (updateError) {
                return { success: false, message: 'Erro ao reativar cadastro existente.' };
            }

            fetchData();
            return { success: true, message: 'Cadastro reativado com sucesso! (Senha anterior mantida)' };
        }

        const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false, 
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: 'student-register-temp' 
            }
        });

        const tempPassword = student.password || "mudar@123"; 
        
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: studentEmail,
            password: tempPassword,
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                return { 
                    success: false, 
                    message: 'Este e-mail já está cadastrado no sistema de login, mas não possui perfil. Por favor, utilize a função "Resetar Senha" ou contate o suporte.' 
                };
            }
            return { success: false, message: authError.message };
        }

        const newUserId = authData.user?.id;

        const { error: profileError } = await supabase.from('profiles').upsert([{
            id: newUserId,
            name: student.name,
            email: studentEmail,
            role: 'STUDENT',
            phone: student.phone,
            plan_type: student.planType,
            observation: student.observation,
            must_change_password: true 
        }]);

        if (profileError) {
            return { success: false, message: 'Erro ao criar perfil de dados: ' + profileError.message };
        }

        fetchData();
        return { success: true };

    } catch (e) {
        console.error("Erro inesperado durante o cadastro:", e);
        return { success: false, message: 'Erro inesperado.' };
    }
  };

  const updateUser = async (id, updates) => {
    if (!supabase) {
      setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
      return;
    }

    const dbUpdates = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.planType) dbUpdates.plan_type = updates.planType;
    if (updates.observation) dbUpdates.observation = updates.observation;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
    if (!error) fetchData();
  };

  const deleteUser = async (id) => {
    if (!supabase) {
        setUsers(users.filter(u => u.id !== id));
        return;
    }

    const { error } = await supabase.from('profiles').update({ role: 'INACTIVE' }).eq('id', id);
    if (!error) fetchData();
  };

  const resetUserPassword = async (email) => {
    if (!supabase) return true;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });

    if (error) {
        console.error("Erro ao enviar email de reset:", error);
        return false;
    }
    return true;
  };

  const updateBookingReleaseHour = (hour) => {
    setBookingReleaseHour(hour);
  };

  const bookSession = async (sessionId) => {
    if (!currentUser) return false;

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;
    const currentCount = bookings.filter(b => b.sessionId === sessionId && b.status === 'CONFIRMED').length;
    if (currentCount >= session.capacity) return false;

    if (!supabase) {
      const newId = Math.random().toString(36).substr(2, 9);
      setBookings([...bookings, {
        id: newId,
        sessionId,
        userId: currentUser.id,
        status: 'CONFIRMED',
        bookedAt: new Date().toISOString()
      }]);
      return true;
    }

    const { error } = await supabase.from('bookings').insert([{
      session_id: sessionId,
      user_id: currentUser.id,
      status: 'CONFIRMED',
      booked_at: new Date().toISOString()
    }]);

    if (error) return false;
    
    fetchData(); 
    return true;
  };

  const cancelBooking = async (bookingId) => {
    if (!supabase) {
      setBookings(bookings.filter(b => b.id !== bookingId));
      return;
    }

    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (!error) fetchData();
  };

  const getSessionBookingsCount = (sessionId) => {
    return bookings.filter(b => b.sessionId === sessionId && b.status === 'CONFIRMED').length;
  };

  return (
    <StoreContext.Provider value={{
      currentUser,
      users,
      modalities,
      sessions,
      bookings,
      loading,
      bookingReleaseHour,
      login,
      logout,
      updatePassword,
      addModality,
      updateModality,
      deleteModality,
      addSession,
      updateSession,
      deleteSession,
      registerStudent,
      updateUser,
      deleteUser,
      resetUserPassword,
      updateBookingReleaseHour,
      bookSession,
      cancelBooking,
      getSessionBookingsCount
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};