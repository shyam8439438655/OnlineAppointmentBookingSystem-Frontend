export interface User {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'Patient' | 'Provider' | 'Admin';
  isActive: boolean;
  active?: boolean; // Jackson fallback
  profilePicUrl?: string;
  createdAt?: string;
  providerId?: string; // Optional for providers
}

export interface AuthResponse {
  message: string;
  token: string | null;
  userId?: string;
  role?: string;
  email?: string;
}

export interface Provider {
  providerId: string;
  userId: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  bio: string;
  clinicName: string;
  clinicAddress: string;
  avgRating: number;
  isVerified: boolean;
  verified?: boolean; // Jackson fallback
  isAvailable: boolean;
  available?: boolean; // Jackson fallback
  reviewCount?: number;
  createdAt: string;
  fullName?: string;
  email?: string;
}

export interface AvailabilitySlot {
  slotId: string;
  providerId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isBooked: boolean;
  booked?: boolean; // Jackson fallback
  isBlocked: boolean;
  blocked?: boolean; // Jackson fallback
  recurrence: string;
  createdAt: string;
}

export interface Appointment {
  appointmentId: string;
  patientId: string;
  providerId: string;
  slotId: string;
  serviceType: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-Show';
  notes: string;
  modeOfConsultation: 'In-Person' | 'Teleconsultation';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  paymentId: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Refunded' | 'Failed' | 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  mode: 'Card' | 'UPI' | 'Wallet' | 'Cash' | 'CARD' | 'CASH';
  transactionId: string;
  currency: string;
  paidAt: string;
  refundedAt: string;
  notes: string;
}

export interface Review {
  reviewId: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  rating: number;
  comment: string;
  reviewDate: string;
  isVerified: boolean;
  isAnonymous: boolean;
  isFlagged?: boolean;
  flagReason?: string;
}

export interface Notification {
  notificationId: string;
  recipientId: string;
  type: 'BOOKING' | 'REMINDER' | 'CANCELLATION' | 'PAYMENT' | 'FOLLOWUP';
  title: string;
  message: string;
  channel: 'APP' | 'EMAIL' | 'SMS';
  relatedId: string;
  relatedType: string;
  isRead: boolean;
  sentAt: string;
}

export interface MedicalRecord {
  recordId: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  attachmentUrl: string;
  followUpDate: string;
  createdAt: string;
  updatedAt: string;
}
