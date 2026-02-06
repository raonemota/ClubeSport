import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, Modality, ClassSession, Booking, UserRole, PlanType } from '../types';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient';
import { INITIAL_USERS, INITIAL_MODALITIES, INITIAL_SESSIONS, INITIAL_BOOKINGS } from '../services/mockData';

interface StoreContextType {
  currentUser: User | null;
  users: User[]; // Used for simple admin views
  modalities: Modality[];
  sessions: ClassSession[];
  bookings: Booking[];
  loading: boolean;
  bookingReleaseHour: number; // Hora do dia (0-23) para liberar agenda de amanhã
  
  // Actions
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  
  // Admin Actions
  addModality: (modality: Omit<Modality, 'id'>) => Promise<void>;
  updateModality: (id: string, updates: Partial<Modality>) => Promise<void>;
  deleteModality: (id: string) => Promise<void>;
  addSession: (session: Omit<ClassSession, 'id'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<ClassSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  registerStudent: (student: { name: string, phone: string, planType: PlanType, observation: string, email?: string, password?: string }) => Promise<{ success: boolean, message?: string }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (email: string) => Promise<boolean>;
  updateBookingReleaseHour: (hour: number) => void;
  
  // Student Actions
  bookSession: (sessionId: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => Promise<void>;
  
  // Helpers
  getSessionBookingsCount: (sessionId: string) => number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Configuração global: Horário de liberação da agenda de amanhã (Default: 08:00)
  // Em um app real, isso viria de uma tabela 'settings' no banco.
  const [bookingReleaseHour, setBookingReleaseHour] = useState<number>(8);

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
        fetchUserProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user.id, session.user.email!);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    // Fetch Public Data
    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, email: string) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        // Prevent login if inactive (using role check instead of is_active column)
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
          role: data.role as UserRole,
          phone: data.phone,
          planType: data.plan_type,
          observation: data.observation,
          mustChangePassword: data.must_change_password // Read from DB
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

    // Fetch Modalities
    const { data: mods } = await supabase.from('modalities').select('*');
    if (mods) {
      setModalities(mods.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        imageUrl: m.image_url
      })));
    }

    // Fetch Sessions
    const { data: sess } = await supabase.from('class_sessions').select('*');
    if (sess) {
      setSessions(sess.map(s => ({
        id: s.id,
        modalityId: s.modality_id,
        instructor: s.instructor,
        startTime: s.start_time,
        durationMinutes: s.duration_minutes,
        capacity: s.capacity,
        category: s.category // Mapped from DB
      })));
    }

    // Fetch Bookings
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

    // Fetch Users (for Admin View)
    const { data: usrs } = await supabase.from('profiles').select('*');
    if (usrs) {
      const allUsers = usrs.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        phone: u.phone,
        planType: u.plan_type,
        observation: u.observation,
        mustChangePassword: u.must_change_password
      }));
      // Only show active users in the main list
      setUsers(allUsers.filter(u => u.role !== UserRole.INACTIVE));
    }
  };

  // --- Auth Logic ---

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (!supabase) {
      // Mock Login
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
    
    if (error) {
      console.error(error);
      return false;
    }
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

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    if (!supabase) {
      // Mock mode
      if (currentUser) {
          setCurrentUser({...currentUser, mustChangePassword: false});
      }
      return true;
    }
    
    // 1. Update Auth Password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("Erro ao atualizar senha:", error);
      return false;
    }

    // 2. Update Profile flag (must_change_password -> false)
    if (currentUser) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', currentUser.id);
            
        if (profileError) {
             console.error("Senha atualizada, mas erro ao atualizar flag do perfil:", profileError);
             // We don't return false here because the password WAS changed
        } else {
             // Update local state immediately
             setCurrentUser({ ...currentUser, mustChangePassword: false });
        }
    }

    return true;
  };

  // --- Admin Logic ---

  const addModality = async (data: Omit<Modality, 'id'>) => {
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

  const updateModality = async (id: string, updates: Partial<Modality>) => {
    if (!supabase) {
      setModalities(modalities.map(m => m.id === id ? { ...m, ...updates } : m));
      return;
    }

    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;

    const { error } = await supabase.from('modalities').update(dbUpdates).eq('id', id);
    if (!error) fetchData();
  };

  const deleteModality = async (id: string) => {
    if (!supabase) {
      setModalities(modalities.filter(m => m.id !== id));
      return;
    }

    const { error } = await supabase.from('modalities').delete().eq('id', id);
    if (!error) fetchData();
  };

  const addSession = async (data: Omit<ClassSession, 'id'>) => {
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
      category: data.category // Save Category
    }]);
    if (!error) fetchData();
  };

  const updateSession = async (id: string, updates: Partial<ClassSession>) => {
    if (!supabase) {
      setSessions(sessions.map(s => s.id === id ? { ...s, ...updates } : s));
      return;
    }

    // Map camelCase to snake_case for DB
    const dbUpdates: any = {};
    if (updates.instructor) dbUpdates.instructor = updates.instructor;
    if (updates.capacity) dbUpdates.capacity = updates.capacity;
    if (updates.startTime) dbUpdates.start_time = updates.startTime;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { error } = await supabase.from('class_sessions').update(dbUpdates).eq('id', id);
    if (!error) fetchData();
  };

  const deleteSession = async (id: string) => {
    if (!supabase) {
      setSessions(sessions.filter(s => s.id !== id));
      return;
    }

    const { error } = await supabase.from('class_sessions').delete().eq('id', id);
    if (!error) fetchData();
  };

  const registerStudent = async (student: { name: string, phone: string, planType: PlanType, observation: string, email?: string, password?: string }) => {
    // Generate a placeholder email if none provided
    const studentEmail = student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}.${student.phone.slice(-4)}@clubesport.local`;

    if (!supabase) {
      // Mock Mode
      const newId = Math.random().toString(36).substr(2, 9);
      const newUser: User = {
        id: newId,
        name: student.name,
        email: studentEmail,
        role: UserRole.STUDENT,
        phone: student.phone,
        planType: student.planType,
        observation: student.observation,
        mustChangePassword: true // Mock default
      };
      setUsers([...users, newUser]);
      return { success: true };
    }

    try {
        // 1. Check if user already exists in profiles (Soft Deleted check via ROLE)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', studentEmail)
            .single();

        // If profile exists...
        if (existingProfile) {
            // ... and is NOT inactive, return error
            if (existingProfile.role !== UserRole.INACTIVE) {
                 return { success: false, message: 'Usuário já está ativo no sistema.' };
            }

            // ... and is inactive, REACTIVATE by setting role back to STUDENT
            const { error: updateError } = await supabase.from('profiles').update({
                name: student.name,
                phone: student.phone,
                plan_type: student.planType,
                observation: student.observation,
                role: 'STUDENT', // Reactivate!
                // We do NOT force password change on reactivation unless requested, 
                // but admins can use Reset Password for that.
            }).eq('id', existingProfile.id);

            if (updateError) {
                console.error("Erro ao reativar aluno:", updateError);
                return { success: false, message: 'Erro ao reativar cadastro existente.' };
            }

            fetchData();
            return { success: true, message: 'Cadastro reativado com sucesso! (Senha anterior mantida)' };
        }

        // 2. If no profile exists, create new Auth User
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
            console.error('Falha ao criar usuário de autenticação:', authError.message);
            
            // Handle specific "Zombie" case (Auth exists but no Profile)
            if (authError.message.includes('already registered')) {
                return { 
                    success: false, 
                    message: 'Este e-mail já está cadastrado no sistema de login, mas não possui perfil. Por favor, utilize a função "Resetar Senha" ou contate o suporte.' 
                };
            }
            return { success: false, message: authError.message };
        }

        const newUserId = authData.user?.id;

        if (!newUserId) {
            console.error('ID do usuário não retornado pelo Auth.');
            return { success: false, message: 'Erro interno ao gerar ID.' };
        }

        // Insert new profile
        const { error: profileError } = await supabase.from('profiles').upsert([{
            id: newUserId,
            name: student.name,
            email: studentEmail,
            role: 'STUDENT',
            phone: student.phone,
            plan_type: student.planType,
            observation: student.observation,
            must_change_password: true // Force password change on first login
        }]);

        if (profileError) {
            console.error('Erro ao inserir perfil no banco de dados:', profileError);
            return { success: false, message: 'Erro ao criar perfil de dados: ' + profileError.message };
        }

        fetchData();
        return { success: true };

    } catch (e) {
        console.error("Erro inesperado durante o cadastro:", e);
        return { success: false, message: 'Erro inesperado.' };
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    if (!supabase) {
      setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
      return;
    }

    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.planType) dbUpdates.plan_type = updates.planType;
    if (updates.observation) dbUpdates.observation = updates.observation;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
    if (!error) fetchData();
  };

  const deleteUser = async (id: string) => {
    if (!supabase) {
        setUsers(users.filter(u => u.id !== id));
        return;
    }

    // SOFT DELETE WORKAROUND: Change role to 'INACTIVE' instead of using missing 'is_active' column
    const { error } = await supabase.from('profiles').update({ role: 'INACTIVE' }).eq('id', id);
    if (!error) fetchData();
  };

  const resetUserPassword = async (email: string): Promise<boolean> => {
    if (!supabase) {
        // Mock mode
        return true;
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Redirect back to app after click
    });

    if (error) {
        console.error("Erro ao enviar email de reset:", error);
        return false;
    }
    return true;
  };

  // --- Admin Config Logic ---
  const updateBookingReleaseHour = (hour: number) => {
    setBookingReleaseHour(hour);
    // Em um cenário real, aqui salvaríamos no banco de dados
  };

  // --- Student Logic ---

  const bookSession = async (sessionId: string): Promise<boolean> => {
    if (!currentUser) return false;

    // Optimistic / Mock check
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

    if (error) {
      console.error(error);
      return false;
    }
    
    fetchData(); // Sync
    return true;
  };

  const cancelBooking = async (bookingId: string) => {
    if (!supabase) {
      setBookings(bookings.filter(b => b.id !== bookingId));
      return;
    }

    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (!error) fetchData();
  };

  // --- Helpers ---
  const getSessionBookingsCount = (sessionId: string) => {
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