
export enum UserRole {
  BUYER = 'Buyer',
  AP2 = 'AP2',
  KEUANGAN = 'Keuangan'
}

export enum SkbnStatus {
  DRAFT_CREATED = 'Draft SKBDN Created',
  DRAFT_REJECTED_BY_AP2 = 'Draft Rejected by AP2',
  DRAFT_APPROVED_BY_AP2 = 'Draft Approved by AP2',
  DRAFT_REJECTED_BY_KEUANGAN = 'Draft Rejected by Keuangan',
  DRAFT_VERIFIED = 'Draft SKBDN Verified',
  FINAL_SENT = 'Final SKBDN Sent',
  FINAL_REJECTED_BY_AP2 = 'Final Rejected by AP2',
  FINAL_APPROVED_BY_AP2 = 'Final Approved by AP2',
  FINAL_REJECTED_BY_KEUANGAN = 'Final Rejected by Keuangan',
  FINAL_VERIFIED = 'Final SKBDN Verified'
}

export interface User {
  id: string;
  nama: string;
  role: UserRole;
  email?: string;
  phone?: string;
}

export interface DatabaseUser {
  id: string;
  nama?: string;
  role?: string;
  email?: string;
  username?: string;
}

export interface AuthUser extends User {
  username: string;
  password: string;
}

export interface Skbn {
  id: string;
  nomor_skbn: string;
  tanggal: string;
  buyer: string;
  buyer_id?: string;
  buyer_email?: string;
  vendor: string;
  nilai?: number;
  keterangan: string;
  status: SkbnStatus;
  created_at: string;
  pdf_name?: string;
  pdf_data?: string; // Base64 encoded PDF string
  rejection_pdf_name?: string;
  rejection_pdf_data?: string; // Base64 encoded PDF string
  rejection_reason?: string;
}

export interface Approval {
  id: string;
  skbn_id: string;
  user_id: string;
  nama_approver: string;
  role: UserRole;
  status: 'Approved' | 'Rejected';
  catatan: string;
  approved_at: string;
  rejection_pdf_name?: string;
  rejection_pdf_data?: string;
}

export interface NotificationItem {
  id: string;
  recipient_role: UserRole;
  recipient_user_id?: string;
  skbn_id?: string;
  title: string;
  message: string;
  created_at: string;
  read_at?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}
