export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  INACTIVE = 'INACTIVE'
}

export enum PlanType {
  WELLHUB = 'Wellhub',
  TOTALPASS = 'Totalpass',
  MENSALISTA = 'Mensalista',
  OUTRO = 'Outro'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  planType?: string;
  observation?: string;
  mustChangePassword?: boolean;
}

export interface Modality {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface ClassSession {
  id: string;
  modalityId: string;
  instructor: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  category?: string;
}

export interface Booking {
  id: string;
  sessionId: string;
  userId: string;
  status: string;
  bookedAt: string;
}
