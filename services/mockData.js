import { UserRole } from '../types.js';

export const INITIAL_USERS = [
  {
    id: '1',
    name: 'Admin Master',
    email: 'admin@clube.com',
    role: UserRole.ADMIN
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'aluno@clube.com',
    role: UserRole.STUDENT,
    phone: '11999998888',
    planType: 'Mensalista',
    observation: 'Prefere treinos pela manhã.'
  },
  {
    id: '3',
    name: 'Maria Oliveira',
    email: 'maria@clube.com',
    role: UserRole.STUDENT,
    phone: '11977776666',
    planType: 'Totalpass'
  }
];

export const INITIAL_MODALITIES = [
  {
    id: 'm1',
    name: 'Natação',
    description: 'Aulas de natação para todos os níveis na piscina semi-olímpica.',
    imageUrl: 'https://picsum.photos/400/200?random=1'
  },
  {
    id: 'm2',
    name: 'Futevôlei',
    description: 'Treino técnico e tático na quadra de areia.',
    imageUrl: 'https://picsum.photos/400/200?random=2'
  },
  {
    id: 'm3',
    name: 'Judô',
    description: 'Arte marcial focada em disciplina e técnica.',
    imageUrl: 'https://picsum.photos/400/200?random=3'
  }
];

// Gerar sessões para hoje e amanhã
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

export const INITIAL_SESSIONS = [
  {
    id: 's1',
    modalityId: 'm1',
    instructor: 'Prof. Carlos',
    startTime: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
    durationMinutes: 60,
    capacity: 5,
    category: 'Infantil'
  },
  {
    id: 's2',
    modalityId: 'm2',
    instructor: 'Prof. Ana',
    startTime: new Date(today.setHours(18, 0, 0, 0)).toISOString(),
    durationMinutes: 90,
    capacity: 10,
    category: 'Iniciante'
  },
  {
    id: 's4',
    modalityId: 'm2',
    instructor: 'Prof. Ana',
    startTime: new Date(today.setHours(19, 30, 0, 0)).toISOString(),
    durationMinutes: 90,
    capacity: 8,
    category: 'Intermediário'
  },
  {
    id: 's3',
    modalityId: 'm3',
    instructor: 'Sensei Yamamoto',
    startTime: new Date(tomorrow.setHours(18, 0, 0, 0)).toISOString(),
    durationMinutes: 60,
    capacity: 15
  }
];

export const INITIAL_BOOKINGS = [
  {
    id: 'b1',
    sessionId: 's1',
    userId: '3',
    status: 'CONFIRMED',
    bookedAt: new Date().toISOString()
  }
];