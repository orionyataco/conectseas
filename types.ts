
export enum UserRole {
  ADMIN = 'ADMIN',
  SERVIDOR = 'SERVIDOR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
  avatar?: string;
  nickname?: string;
  bio?: string;
  birth_date?: string;
  mobile_phone?: string;
  registration_number?: string;
  appointment_date?: string;
}


export interface Post {
  id: number;
  user_id: number;
  content: string;
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  like_count: number;
  comment_count: number;
  attachments?: PostAttachment[];
}

export interface PostAttachment {
  id: number;
  post_id: number;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  is_image: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
}

export interface Person {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  admissionDate: string;
}

export interface Event {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  event_time?: string;
  event_end_time?: string;
  meeting_link?: string;
  visibility: 'public' | 'private' | 'shared';
  shared_with?: string; // Comma separated IDs from SQLite
  event_type: 'meeting' | 'holiday' | 'birthday' | 'vacation' | 'other';
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_role?: string;
  author_avatar?: string;
}

export interface MuralItem {
  id: number;
  type: 'post' | 'event';
  content: string;
  data: Post | Event;
  created_at: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
}

export enum WorkflowType {
  TI = 'TI',
  URH = 'URH',
  PATRIMONIO = 'PATRIMONIO'
}

export interface Warning {
  id: number;
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  targetAudience: 'all' | 'servers' | 'admin';
  active: boolean;
  createdAt: string;
}
export interface Folder {
  id: number;
  user_id: number;
  parent_id: number | null;
  name: string;
  created_at: string;
}

export interface DriveFile {
  id: number;
  user_id: number;
  folder_id: number | null;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}
