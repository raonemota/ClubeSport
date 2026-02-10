import { createClient } from '@supabase/supabase-js';

// As chaves agora são carregadas das variáveis de ambiente
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// A chave ANON é pública intencionalmente no Supabase. 
// Ela é usada para identificar o usuário anônimo antes do login.
// O aviso do Vercel sobre "Exposed Key" é um falso positivo neste contexto.
// A segurança real vem das políticas RLS (Row Level Security) no banco de dados.
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

try {
  // Verifica se as variáveis de ambiente existem e são válidas
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('Variáveis de ambiente do Supabase não configuradas. O aplicativo rodará em modo Mock (Demonstração).');
  }
} catch (error) {
  console.warn('Erro ao inicializar Supabase. O aplicativo rodará em modo Mock (Demonstração).', error);
}

export const supabase = client;