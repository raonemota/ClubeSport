import { createClient, SupabaseClient } from '@supabase/supabase-js';

// SUBSTITUA COM SUAS CREDENCIAIS DO SUPABASE
export const SUPABASE_URL = 'https://upkcszhvapzfnreeyhom.supabase.co'; 
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwa2Nzemh2YXB6Zm5yZWV5aG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTE4NjUsImV4cCI6MjA4NTg4Nzg2NX0.G0MBPJTJDnHG2culp7AMkYA1-JyoZRy0gMZ5LAjaDtQ';

let client: SupabaseClient | null = null;

try {
  // Simple check to ensure URL is valid before attempting to create client
  if (SUPABASE_URL && SUPABASE_URL.startsWith('http') && !SUPABASE_URL.includes('SUA_URL')) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('Supabase URL inválida ou não configurada. O aplicativo rodará em modo Mock (Demonstração).');
  }
} catch (error) {
  console.warn('Erro ao inicializar Supabase. O aplicativo rodará em modo Mock (Demonstração).', error);
}

export const supabase = client;