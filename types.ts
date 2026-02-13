
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
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
  vacation_status?: boolean;
  vacation_message?: string;
  vacation_start_date?: string;
  vacation_end_date?: string;
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
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriveFile {
  id: number;
  user_id: number;
  folder_id: number | null;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  visibility: 'public' | 'private' | 'team';
  color: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_avatar?: string;
  member_count?: number;
  task_count?: number;
  completed_tasks?: number;
  is_archived?: boolean;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  user_name?: string;
  user_avatar?: string;
  user_position?: string;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  assigned_to?: number;
  created_by: number;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assigned_name?: string;
  assigned_avatar?: string;
  creator_name?: string;
  comment_count?: number;
  attachment_count?: number;
  assignees?: { id: number; name: string; avatar: string }[];
  subtasks?: { id: number; title: string; is_completed: boolean }[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar: string;
  author_role: string;
}

export interface TecticTicket {
  id: number;
  user_id: number;
  assigned_to?: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  support_level: string;
  solution?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  requester_name?: string;
  requester_avatar?: string;
  requester_email?: string;
  requester_dept?: string;
  technician_name?: string;
  resolved_by?: number;
  resolver_name?: string;
  comments?: TecticComment[];
}

export interface TecticComment {
  id: number;
  ticket_id: number;
  user_id: number;
  comment: string;
  is_internal: boolean;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  user_role?: string;
}

export interface TecticFile {
  id: number;
  name: string;
  original_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mimetype: string;
  uploaded_by: number;
  created_at: string;
  uploader_name?: string;
}
export interface TecticKnowledge {
  id: number;
  title: string;
  content: string;
  category: string;
  tags?: string;
  author_id: number;
  author_name?: string;
  views: number;
  created_at: string;
  updated_at: string;
}
