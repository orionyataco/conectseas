
import React from 'react';
import { Post, Comment, User, Event } from '../types';
import {
  getMuralFeed,
  createPost,
  deletePost,
  toggleLike,
  getLikedPosts,
  getComments,
  addComment,
  deleteComment,
  editPost,
  editComment
} from '../services/api';
import api from '../services/api';
import {
  Paperclip,
  Image as ImageIcon,
  Send,
  ThumbsUp,
  MessageCircle,
  MoreHorizontal,
  FileText,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Bold,
  Italic,
  Underline,
  Type,
  Strikethrough
} from 'lucide-react';

interface MuralProps {
  user: User | null;
}

const Mural: React.FC<MuralProps> = ({ user }) => {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isUrgent, setIsUrgent] = React.useState(false);
  const [likedPosts, setLikedPosts] = React.useState<number[]>([]);

  // Comments state
  const [expandedComments, setExpandedComments] = React.useState<number[]>([]);
  const [comments, setComments] = React.useState<{ [postId: number]: Comment[] }>({});
  const [newComment, setNewComment] = React.useState<{ [postId: number]: string }>({});

  // Edit states
  const [editingPost, setEditingPost] = React.useState<number | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [editingComment, setEditingComment] = React.useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'write' | 'preview'>('write');

  const [users, setUsers] = React.useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = React.useState('');
  const [showMentionList, setShowMentionList] = React.useState(false);
  const [mentionPosition, setMentionPosition] = React.useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = React.useState(-1);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadFeed();
    fetchUsers();
    if (user) {
      loadLikedPosts();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const loadFeed = async () => {
    try {
      const data = await getMuralFeed();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const loadLikedPosts = async () => {
    if (!user) return;
    try {
      const data = await getLikedPosts(user.id);
      setLikedPosts(data);
    } catch (error) {
      // Silent error
    }
  };

  const loadComments = async (postId: number) => {
    try {
      const data = await getComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const selectionStart = e.target.selectionStart;
    setNewPostContent(value);

    // Check for mention trigger
    const lastAtPos = value.lastIndexOf('@', selectionStart - 1);

    if (lastAtPos !== -1) {
      const textAfterAt = value.substring(lastAtPos + 1, selectionStart);
      // Only trigger if no spaces after @ or if it's the start of the text
      if (!textAfterAt.includes(' ') && (lastAtPos === 0 || value[lastAtPos - 1] === ' ' || value[lastAtPos - 1] === '\n')) {
        const rect = e.target.getBoundingClientRect();
        // Calculate rough position (approximation)
        // For a textarea, getting exact caret coordinates is complex without a library
        // We'll position it relatively for now
        setMentionPosition({
          top: 100, // Relative to container, we'll fix this in render
          left: 20
        });
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtPos);
        setShowMentionList(true);
        return;
      }
    }

    setShowMentionList(false);
  };

  const handleMentionSelect = (selectedUser: User) => {
    if (mentionStartIndex === -1) return;

    const before = newPostContent.substring(0, mentionStartIndex);
    const after = newPostContent.substring(textareaRef.current?.selectionStart || newPostContent.length);
    const newValue = `${before}@${selectedUser.name} ${after}`;

    setNewPostContent(newValue);
    setShowMentionList(false);
    setMentionStartIndex(-1);

    // Focus back
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionStartIndex + selectedUser.name.length + 2; // @ + name + space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = [...selectedFiles, ...newFiles];
      if (totalFiles.length > 5) {
        alert('Você pode anexar no máximo 5 arquivos.');
        setSelectedFiles(totalFiles.slice(0, 5));
      } else {
        setSelectedFiles(totalFiles);
      }
    }
  };

  const applyFormatting = (prefix: string, suffix: string, isEditing: boolean = false) => {
    const textarea = isEditing ? editTextareaRef.current : textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = isEditing ? editContent : newPostContent;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selected + suffix + after;
    if (isEditing) {
      setEditContent(newText);
    } else {
      setNewPostContent(newText);
    }

    // Focus back and set cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const renderPostContent = (content: string) => {
    // 1. Linkify URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let rendered = content.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">${url}</a>`;
    });

    // 2. Formatting
    rendered = rendered
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')                 // Italic
      .replace(/__(.*?)__/g, '<u>$1</u>')                   // Underline
      .replace(/~~(.*?)~~/g, '<del>$1</del>')               // Strikethrough
      .replace(/\n/g, '<br />');                             // New lines

    return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;

    const formData = new FormData();
    formData.append('content', newPostContent);
    formData.append('userId', user.id);
    formData.append('isUrgent', isUrgent.toString());

    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await createPost(formData);

      setNewPostContent('');
      setSelectedFiles([]);
      setIsUrgent(false);
      loadFeed();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleEditPost = async (postId: number) => {
    if (!user) return;

    try {
      await editPost(postId, user.id, editContent);
      setEditingPost(null);
      loadFeed();
    } catch (error) {
      console.error('Failed to edit post:', error);
    }
  };

  const handleDeletePost = async (e: React.MouseEvent, postId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !confirm('Deseja realmente excluir esta postagem?')) return;

    try {
      await deletePost(postId, user.id, user.role);
      loadFeed();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleToggleLike = async (postId: number) => {
    if (!user) return;

    try {
      const data = await toggleLike(postId, user.id);
      if (data.liked) {
        setLikedPosts([...likedPosts, postId]);
      } else {
        setLikedPosts(likedPosts.filter(id => id !== postId));
      }
      loadFeed();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleToggleComments = (postId: number) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments(expandedComments.filter(id => id !== postId));
    } else {
      setExpandedComments([...expandedComments, postId]);
      if (!comments[postId]) {
        loadComments(postId);
      }
    }
  };

  const handleAddComment = async (postId: number) => {
    if (!user || !newComment[postId]?.trim()) return;

    try {
      await addComment(postId, user.id, newComment[postId]);
      setNewComment({ ...newComment, [postId]: '' });
      loadComments(postId);
      loadFeed();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleEditComment = async (commentId: number, postId: number) => {
    if (!user) return;

    try {
      await editComment(commentId, user.id, editCommentContent);
      setEditingComment(null);
      loadComments(postId);
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteComment = async (e: React.MouseEvent, commentId: number, postId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !confirm('Deseja realmente excluir este comentário?')) return;

    try {
      await deleteComment(commentId, user.id, user.role);
      loadComments(postId);
      loadFeed();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Mural Interativo</h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-medium text-slate-500">Online</span>
        </div>
      </header>

      {/* New Post Creator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible relative z-30">
        <div className="flex border-b border-slate-100 px-4 pt-4">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'write' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Escrever
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Visualizar
          </button>
        </div>

        <div className="p-4 flex gap-4">
          <img src={user?.avatar || 'https://picsum.photos/seed/me/100'} className="w-12 h-12 rounded-full" alt="avatar" />
          <div className="flex-1 space-y-2">
            {activeTab === 'write' ? (
              <>
                <div className="flex items-center gap-1 mb-2">
                  <button onClick={() => applyFormatting('**', '**')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Negrito"><Bold size={16} /></button>
                  <button onClick={() => applyFormatting('*', '*')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Itálico"><Italic size={16} /></button>
                  <button onClick={() => applyFormatting('__', '__')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Sublinhado"><Underline size={16} /></button>
                  <button onClick={() => applyFormatting('~~', '~~')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Riscado"><Strikethrough size={16} /></button>
                </div>
                <div className="relative w-full">
                  <textarea
                    ref={textareaRef}
                    value={newPostContent}
                    onChange={handlePostChange}
                    onKeyDown={(e) => {
                      if (showMentionList) {
                        e.stopPropagation(); // Stop event bubbling to prevent parent handlers (if any)
                      }
                    }}
                    placeholder="Escreva um novo comunicado ou circular... Use @ para mencionar alguém"
                    className="w-full bg-transparent border-none outline-none resize-none min-h-[120px] text-slate-700 placeholder:text-slate-400"
                  />

                  {showMentionList && (
                    <div
                      className="absolute z-50 bg-white rounded-xl shadow-xl border border-slate-200 w-64 max-h-48 overflow-y-auto animate-fadeIn"
                      style={{ top: mentionPosition.top, left: mentionPosition.left }}
                    >
                      <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Mencionar usuário</p>
                      </div>
                      <div className="p-1">
                        {users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 ? (
                          <div className="p-3 text-sm text-slate-400 text-center italic">Nenhum usuário encontrado</div>
                        ) : (
                          users
                            .filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                            .map(u => (
                              <button
                                key={u.id}
                                onClick={() => handleMentionSelect(u)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition-colors text-left group"
                              >
                                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-8 h-8 rounded-full" alt="" />
                                <div>
                                  <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700">{u.name}</p>
                                  <p className="text-[10px] text-slate-400">{u.role}</p>
                                </div>
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="min-h-[148px] text-slate-700 prose-sm max-w-none">
                {newPostContent.trim() ? renderPostContent(newPostContent) : <p className="text-slate-400 italic">Nada para visualizar...</p>}
              </div>
            )}
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex gap-2 flex-wrap">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs">
                  <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                  <button onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors"
            >
              <Paperclip size={18} />
              <span className="hidden sm:inline">Anexo</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors"
            >
              <ImageIcon size={18} />
              <span className="hidden sm:inline">Foto</span>
            </button>
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded border-slate-300"
              />
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-slate-600 hidden sm:inline">Urgente</span>
            </label>
          </div>
          <button
            onClick={handleCreatePost}
            disabled={!newPostContent.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Publicar
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map(item => {
          // Check if this is an event or a post
          const isEvent = item.type === 'event';

          if (isEvent) {
            // Render Event Card
            const event = item as any;
            const eventTypeColors: Record<string, string> = {
              meeting: 'bg-blue-100 text-blue-700 border-blue-200',
              holiday: 'bg-red-100 text-red-700 border-red-200',
              birthday: 'bg-orange-100 text-orange-700 border-orange-200',
              vacation: 'bg-green-100 text-green-700 border-green-200',
              other: 'bg-purple-100 text-purple-700 border-purple-200'
            };
            const eventColor = eventTypeColors[event.event_type] || eventTypeColors.other;

            return (
              <article key={`event-${event.id}`} className="bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Calendar size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{event.author_name}</h4>
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Evento</span>
                        </div>
                        <p className="text-xs text-slate-500">{event.author_role} • {formatDate(event.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${eventColor} border rounded-xl p-4 mb-4`}>
                    <h3 className="font-bold text-lg mb-2">{event.content}</h3>
                    {event.description && (
                      <p className="text-sm mb-3 opacity-80">{event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span className="font-medium">
                          {event.event_date ? (() => {
                            const [y, m, d] = event.event_date.split('T')[0].split('-').map(Number);
                            return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                          })() : ''}
                          {event.event_end_date && (() => {
                            const [y, m, d] = event.event_end_date.split('T')[0].split('-').map(Number);
                            return ` - ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <span className="font-medium">
                          {event.event_time || 'O dia todo'}
                          {event.event_end_time ? ` - ${event.event_end_time}` : ''}
                        </span>
                      </div>
                      {event.meeting_link && (
                        <a
                          href={event.meeting_link.startsWith('http') ? event.meeting_link : `https://${event.meeting_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin size={14} />
                          Ingressar na Reunião
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 italic">
                    💡 Este é um evento público do calendário institucional
                  </div>
                </div>
              </article>
            );
          }

          // Render normal Post
          const post = item as Post;
          return (
            <article key={`post-${post.id}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={post.author_avatar || `https://picsum.photos/seed/${post.author_name}/100`} className="w-10 h-10 rounded-full" alt={post.author_name} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800">{post.author_name}</h4>
                        {post.is_urgent && (
                          <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Urgente</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{post.author_role} • {formatDate(post.created_at)}</p>
                    </div>
                  </div>

                  {user && (user.id === post.user_id.toString() || user.role === 'ADMIN') && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingPost(post.id);
                          setEditContent(post.content);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDeletePost(e, post.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {editingPost === post.id ? (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-1 mb-2">
                      <button onClick={() => applyFormatting('**', '**', true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Negrito"><Bold size={14} /></button>
                      <button onClick={() => applyFormatting('*', '*', true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Itálico"><Italic size={14} /></button>
                      <button onClick={() => applyFormatting('__', '__', true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Sublinhado"><Underline size={14} /></button>
                      <button onClick={() => applyFormatting('~~', '~~', true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Riscado"><Strikethrough size={14} /></button>
                    </div>
                    <textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl resize-none min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPost(post.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingPost(null)}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap post-content">
                    {renderPostContent(post.content)}
                  </div>
                )}

                {/* Images */}
                {post.attachments && post.attachments.some(a => a.is_image) && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 grid grid-cols-2 gap-2">
                    {post.attachments.filter(a => a.is_image).map(img => (
                      <img
                        key={img.id}
                        src={`/uploads/${img.filename}`}
                        className="w-full object-cover max-h-64"
                        alt={img.original_name}
                      />
                    ))}
                  </div>
                )}

                {/* File Attachments */}
                {post.attachments && post.attachments.some(a => !a.is_image) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {post.attachments.filter(a => !a.is_image).map(file => (
                      <a
                        key={file.id}
                        href={`/uploads/${file.filename}`}
                        download={file.original_name}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${file.file_type.includes('pdf') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{file.original_name}</p>
                            <p className="text-[10px] text-slate-500">{formatFileSize(file.file_size)}</p>
                          </div>
                        </div>
                        <Paperclip size={16} className="text-slate-400" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-2 transition-colors ${likedPosts.includes(post.id) ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                      <ThumbsUp size={18} fill={likedPosts.includes(post.id) ? 'currentColor' : 'none'} />
                      <span className="text-sm font-medium">{post.like_count}</span>
                    </button>
                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      <MessageCircle size={18} />
                      <span className="text-sm font-medium">{post.comment_count}</span>
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {expandedComments.includes(post.id) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    {comments[post.id]?.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <img src={comment.author_avatar || `https://picsum.photos/seed/${comment.author_name}/50`} className="w-8 h-8 rounded-full" alt={comment.author_name} />
                        <div className="flex-1">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-slate-800">{comment.author_name}</p>
                              {user && (user.id === comment.user_id.toString() || user.role === 'ADMIN') && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingComment(comment.id);
                                      setEditCommentContent(comment.content);
                                    }}
                                    className="text-slate-400 hover:text-blue-600"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteComment(e, comment.id, post.id)}
                                    className="text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {editingComment === comment.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditComment(comment.id, post.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingComment(null)}
                                    className="px-3 py-1 bg-slate-200 text-slate-600 rounded text-xs font-semibold hover:bg-slate-300"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-700">{comment.content}</p>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 ml-3">{formatDate(comment.created_at)}</p>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-3 pt-2">
                      <img src={user?.avatar || 'https://picsum.photos/seed/me/50'} className="w-8 h-8 rounded-full" alt="avatar" />
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newComment[post.id] || ''}
                          onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder="Escreva um comentário..."
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComment[post.id]?.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default Mural;
