// Enum for User Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  INACTIVE = 'INACTIVE', // Used for soft delete workaround
}

export type PlanType = 'Wellhub' | 'Totalpass' | 'Mensalista' | 'Outro';

// User Collection (Mapped to 'profiles' table in Supabase)
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  planType?: PlanType;
  observation?: string;
  mustChangePassword?: boolean; // New field for first access check
}

// Modality Collection (Mapped to 'modalities' table)
export interface Modality {
  id: string;
  name: string;
  description: string;
  imageUrl: string; // mapped from image_url in DB
}

// Schedule/Class Collection (Mapped to 'class_sessions' table)
export interface ClassSession {
  id: string;
  modalityId: string; // mapped from modality_id
  instructor: string;
  startTime: string; // mapped from start_time (ISO String)
  durationMinutes: number; // mapped from duration_minutes
  capacity: number;
  category?: string; // New field: Subcategory/Level (e.g., "Iniciante", "Intermediário")
}

// Booking Collection (Mapped to 'bookings' table)
export interface Booking {
  id: string;
  sessionId: string; // mapped from session_id
  userId: string; // mapped from user_id
  status: 'CONFIRMED' | 'CANCELLED';
  bookedAt: string; // mapped from booked_at
}