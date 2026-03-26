import React from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  editComment,
  getUsers
} from '../services/api';
import api from '../services/api';
import {
  Paperclip,
  Image as ImageIcon,
  Send,
  Smile,
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
  Strikethrough,
  Link as LinkIcon,
  Globe,
  Cake,
  Award as AwardIcon,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';

interface MuralProps {
  user: User | null;
}

const Mural: React.FC<MuralProps> = ({ user }) => {
  const queryClient = useQueryClient();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isUrgent, setIsUrgent] = React.useState(false);
  const [likedPosts, setLikedPosts] = React.useState<number[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [previewItem, setPreviewItem] = React.useState<{ url: string; name: string } | null>(null);
  const [previewGallery, setPreviewGallery] = React.useState<{ items: { url: string; name: string }[]; currentIndex: number } | null>(null);

  // Link preview state
  const [linkPreview, setLinkPreview] = React.useState<{ title: string | null; description: string | null; image: string | null; siteName: string | null; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [detectedUrl, setDetectedUrl] = React.useState<string | null>(null);
  const [includePreviewText, setIncludePreviewText] = React.useState(true);
  const [includePreviewImage, setIncludePreviewImage] = React.useState(true);
  const linkPreviewDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);

  // Queries
  const { data: feedData } = useQuery({
    queryKey: ['muralFeed'],
    queryFn: getMuralFeed
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });

  const { data: likedPostsData } = useQuery({
    queryKey: ['likedPosts'],
    queryFn: () => getLikedPosts(),
    enabled: !!user?.id
  });

  React.useEffect(() => {
    if (feedData && Array.isArray(feedData)) {
      setPosts(feedData);
    } else if (feedData) {
      console.warn('feedData is not an array:', feedData);
      setPosts([]);
    }
  }, [feedData]);

  React.useEffect(() => {
    if (usersData && Array.isArray(usersData)) {
      setUsers(usersData);
    } else if (usersData) {
      console.warn('usersData is not an array:', usersData);
      setUsers([]);
    }
  }, [usersData]);

  React.useEffect(() => {
    if (likedPostsData && Array.isArray(likedPostsData)) {
      setLikedPosts(likedPostsData);
    } else if (likedPostsData) {
      console.warn('likedPostsData is not an array:', likedPostsData);
      setLikedPosts([]);
    }
  }, [likedPostsData]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for image gallery
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewGallery) return;
      if (e.key === 'ArrowLeft') {
        setPreviewGallery(prev => prev ? { ...prev, currentIndex: Math.max(0, Math.min(prev.currentIndex - 1, prev.items.length - 1)) } : null);
      } else if (e.key === 'ArrowRight') {
        setPreviewGallery(prev => prev ? { ...prev, currentIndex: Math.max(0, Math.min(prev.currentIndex + 1, prev.items.length - 1)) } : null);
      } else if (e.key === 'Escape') {
        setPreviewGallery(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewGallery]);

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muralFeed'] });
      toast.success('Postagem criada!');
    },
    onError: () => toast.error('Erro ao criar postagem')
  });

  const editPostMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: number, content: string }) => editPost(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muralFeed'] });
      toast.success('Postagem atualizada');
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muralFeed'] });
      toast.success('Postagem removida');
    }
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (postId: number) => toggleLike(postId),
    onSuccess: (data, postId) => {
      queryClient.invalidateQueries({ queryKey: ['muralFeed'] });
      queryClient.invalidateQueries({ queryKey: ['likedPosts'] });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, comment }: { postId: number, comment: string }) => addComment(postId, comment),
    onSuccess: (data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['muralFeed'] });
      loadComments(postId);
      toast.success('Comentário enviado');
    }
  });

  const loadFeed = () => {
    queryClient.invalidateQueries({ queryKey: ['muralFeed'] });
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

    // Detect URL for link preview
    const urlRegex = /https?:\/\/[^\s]{4,}/g;
    const urls = value.match(urlRegex);
    const firstUrl = urls ? urls[0] : null;

    if (firstUrl && firstUrl !== detectedUrl) {
      setDetectedUrl(firstUrl);
      if (linkPreviewDebounce.current) clearTimeout(linkPreviewDebounce.current);
      linkPreviewDebounce.current = setTimeout(async () => {
        setPreviewLoading(true);
        try {
          const res = await api.get(`/mural/link-preview?url=${encodeURIComponent(firstUrl)}`);
          setLinkPreview(res.data);
        } catch {
          setLinkPreview(null);
        } finally {
          setPreviewLoading(false);
        }
      }, 800);
    } else if (!firstUrl && detectedUrl) {
      setDetectedUrl(null);
      setLinkPreview(null);
      if (linkPreviewDebounce.current) clearTimeout(linkPreviewDebounce.current);
    }

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

  const clearLinkPreview = () => {
    setLinkPreview(null);
    setDetectedUrl(null);
    if (linkPreviewDebounce.current) clearTimeout(linkPreviewDebounce.current);
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
        toast.error('Você pode anexar no máximo 5 arquivos.');
        setSelectedFiles(totalFiles.slice(0, 5));
      } else {
        setSelectedFiles(totalFiles);
      }
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newPostContent;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newValue = before + emojiData.emoji + after;
    setNewPostContent(newValue);

    // Focus back and set cursor
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emojiData.emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
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
    // 0. Extract markdown images ![alt](url) and remove them from the main text
    //    so they don't get linkified (which would break the <img> src attribute)
    const extractedImages: string[] = [];
    let rendered = content.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_, _alt, src) => {
      extractedImages.push(src);
      return ''; // Remove from text flow
    });

    // 1. Linkify plain URLs in the remaining text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    rendered = rendered.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">${url}</a>`;
    });

    // 2. Markdown formatting
    rendered = rendered
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/\n/g, '<br />');

    // 3. Append images at the end, safely separate from linkification
    extractedImages.forEach(src => {
      rendered += `<br/><img src="${src}" alt="preview" class="rounded-xl max-w-full mt-2 mb-1 border border-slate-100" style="max-height:320px;object-fit:cover" />`;
    });

    return (
      <div
        dangerouslySetInnerHTML={{ __html: rendered }}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            const container = target.closest('.post-content');
            if (container) {
              const allImages = Array.from(container.querySelectorAll('img'));
              const items = allImages.map(imgEl => ({
                url: imgEl.src,
                name: imgEl.alt || 'Imagem do Mural'
              }));
              const clickedIndex = allImages.indexOf(img);
              if (items.length > 0) {
                setPreviewGallery({
                  items,
                  currentIndex: clickedIndex !== -1 ? clickedIndex : 0
                });
              }
            } else {
              setPreviewItem({
                url: img.src,
                name: img.alt || 'Imagem do Mural'
              });
            }
          }
        }}
      />
    );
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;

    const formData = new FormData();

    // Build content, optionally appending link preview text and/or image
    let content = newPostContent;
    if (linkPreview) {
      if (includePreviewText) {
        const parts: string[] = [];
        if (linkPreview.title) parts.push(`\n\n🔗 **${linkPreview.title}**`);
        if (linkPreview.description) parts.push(linkPreview.description);
        content += parts.join('\n');
      }
      if (includePreviewImage && linkPreview.image) {
        content += `\n![preview](${linkPreview.image})`;
      }
    }

    formData.append('content', content);
    formData.append('isUrgent', isUrgent.toString());

    selectedFiles.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      await createPost(formData);

      setNewPostContent('');
      setSelectedFiles([]);
      setIsUrgent(false);
      clearLinkPreview();
      loadFeed();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleEditPost = async (postId: number) => {
    if (!user) return;

    try {
      await editPost(postId, editContent);
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
      await deletePost(postId);
      loadFeed();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleToggleLike = async (postId: number) => {
    if (!user) return;

    try {
      const data = await toggleLike(postId);
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
      await addComment(postId, newComment[postId]);
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
      await editComment(commentId, editCommentContent);
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
      await deleteComment(commentId);
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

  const getBirthdayPeople = () => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    return users.filter(u => {
      if (!u.birth_date) return false;
      const bMonth = new Date(u.birth_date).getUTCMonth() + 1;
      return bMonth === currentMonth;
    }).sort((a, b) => {
      const dayA = new Date(a.birth_date!).getUTCDate();
      const dayB = new Date(b.birth_date!).getUTCDate();
      return dayA - dayB;
    });
  };

  const getWorkAnniversaries = () => {
    const today = new Date();
    const currentMonth = today.getUTCMonth() + 1;
    return users.filter(u => {
      if (!u.appointment_date) return false;
      const aMonth = new Date(u.appointment_date).getUTCMonth() + 1;
      return aMonth === currentMonth;
    }).map(u => {
      const appDate = new Date(u.appointment_date!);
      let years = today.getUTCFullYear() - appDate.getUTCFullYear();
      // Only show if it's at least 1 year
      return { user: u, years };
    }).filter(item => item.years > 0)
      .sort((a, b) => {
        const dayA = new Date(a.user.appointment_date!).getUTCDate();
        const dayB = new Date(b.user.appointment_date!).getUTCDate();
        return dayA - dayB;
      });
  };

  const birthdayPeople = getBirthdayPeople();
  const workAnniversaries = getWorkAnniversaries();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Mural Interativo</h1>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8 animate-fadeIn">

      {/* New Post Creator */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-visible relative z-30">
        <div className="flex border-b border-slate-100 dark:border-slate-700 px-4 pt-4">
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
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Me')}&background=random`} 
            className="w-12 h-12 rounded-full" 
            alt="avatar"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Me')}&background=random`;
            }}
          />
          <div className="flex-1 space-y-2">
            {activeTab === 'write' ? (
              <>
                <div className="flex items-center gap-1 mb-2">
                  <button onClick={() => applyFormatting('**', '**')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Negrito"><Bold size={16} /></button>
                  <button onClick={() => applyFormatting('*', '*')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Itálico"><Italic size={16} /></button>
                  <button onClick={() => applyFormatting('__', '__')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Sublinhado"><Underline size={16} /></button>
                  <button onClick={() => applyFormatting('~~', '~~')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Riscado"><Strikethrough size={16} /></button>
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-1.5 rounded transition-colors ${showEmojiPicker ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                      title="Emojis"
                    >
                      <Smile size={16} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-2 z-[60]">
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          autoFocusSearch={false}
                          theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                          width={300}
                          height={400}
                        />
                      </div>
                    )}
                  </div>
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
                    className="w-full bg-transparent border-none outline-none resize-none min-h-[120px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                  />

                  {showMentionList && (
                    <div
                      className="absolute z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-64 max-h-48 overflow-y-auto animate-fadeIn"
                      style={{ top: mentionPosition.top, left: mentionPosition.left }}
                    >
                      <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mencionar usuário</p>
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
                                className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-left group"
                              >
                                <img 
                                  src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                                  className="w-8 h-8 rounded-full" 
                                  alt="" 
                                  onError={(e) => {
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`;
                                  }}
                                />
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
                {newPostContent.trim() ? renderPostContent(newPostContent) : <p className="text-slate-400 dark:text-slate-500 italic">Nada para visualizar...</p>}
              </div>
            )}
          </div>
        </div>

        {/* Link Preview Card */}
        {(previewLoading || linkPreview) && (
          <div className="px-4 pb-3">
            {previewLoading ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 animate-pulse flex items-center gap-3">
                <Globe size={20} className="text-slate-300" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2 bg-slate-200 rounded w-full" />
                </div>
              </div>
            ) : linkPreview && (
              <div className="border border-blue-200 dark:border-blue-900/40 rounded-xl overflow-hidden bg-blue-50/30 dark:bg-blue-900/20 relative">
                <button
                  onClick={clearLinkPreview}
                  className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 shadow-sm z-10"
                >
                  <X size={14} />
                </button>

                <div className="flex gap-0">
                  {linkPreview.image && (
                    <div className="w-28 min-h-[90px] flex-shrink-0 overflow-hidden">
                      <img
                        src={linkPreview.image}
                        alt={linkPreview.title || ''}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wide">
                      <LinkIcon size={10} />
                      {linkPreview.siteName || new URL(linkPreview.url).hostname}
                    </div>
                    {linkPreview.title && <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mb-1">{linkPreview.title}</p>}
                    {linkPreview.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{linkPreview.description}</p>}
                  </div>
                </div>

                <div className="border-t border-blue-100 dark:border-blue-900/40 px-3 py-2 bg-white dark:bg-slate-800 flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Incluir na postagem:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePreviewText}
                      onChange={e => setIncludePreviewText(e.target.checked)}
                      className="rounded text-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Texto</span>
                  </label>
                  {linkPreview.image && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includePreviewImage}
                        onChange={e => setIncludePreviewImage(e.target.checked)}
                        className="rounded text-blue-600 w-3.5 h-3.5"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Imagem</span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
              <article key={`event-${event.id}`} className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Calendar size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100">{event.author_name}</h4>
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Evento</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{event.author_role} • {formatDate(event.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${eventColor} dark:bg-slate-900/40 dark:text-slate-100 border dark:border-slate-700 rounded-xl p-4 mb-4`}>
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

                  <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                    💡 Este é um evento público do calendário institucional
                  </div>
                </div>
              </article>
            );
          }

          // Render normal Post
          const post = item as Post;
          return (
            <article key={`post-${post.id}`} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={post.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=random`} 
                      className="w-10 h-10 rounded-full" 
                      alt={post.author_name} 
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=random`;
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{post.author_name}</h4>
                        {!!post.is_urgent && (
                          <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Urgente</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{post.author_role} • {formatDate(post.created_at)}</p>
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
                      <button onClick={() => applyFormatting('**', '**', true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Negrito"><Bold size={14} /></button>
                      <button onClick={() => applyFormatting('*', '*', true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Itálico"><Italic size={14} /></button>
                      <button onClick={() => applyFormatting('__', '__', true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Sublinhado"><Underline size={14} /></button>
                      <button onClick={() => applyFormatting('~~', '~~', true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="Riscado"><Strikethrough size={14} /></button>
                    </div>
                    <textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-300"
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
                  <div className="text-slate-700 dark:text-slate-200 leading-relaxed mb-4 whitespace-pre-wrap post-content">
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
                        className="w-full object-cover max-h-64 cursor-pointer"
                        alt={img.original_name}
                        onDoubleClick={() => {
                          const images = post.attachments?.filter(a => a.is_image).map(a => ({
                            url: `/uploads/${a.filename}`,
                            name: a.original_name
                          })) || [];
                          const currentIndex = images.findIndex(i => i.url === `/uploads/${img.filename}`);
                          if (images.length > 0) {
                            setPreviewGallery({
                              items: images,
                              currentIndex: Math.max(0, currentIndex)
                            });
                          }
                        }}
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
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${file.file_type.includes('pdf') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{file.original_name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatFileSize(file.file_size)}</p>
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
                        <img 
                          src={comment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=random`} 
                          className="w-8 h-8 rounded-full" 
                          alt={comment.author_name} 
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=random`;
                          }}
                        />
                        <div className="flex-1">
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{comment.author_name}</p>
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
                               <p className="text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
                            )}
                          </div>
                           <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-3">{formatDate(comment.created_at)}</p>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-3 pt-2">
                      <img 
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Me')}&background=random`} 
                        className="w-8 h-8 rounded-full" 
                        alt="avatar"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Me')}&background=random`;
                        }}
                      />
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newComment[post.id] || ''}
                          onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder="Escreva um comentário..."
                          className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
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

        {/* Sidebar Cards */}
        <aside className="lg:w-80 space-y-6">
          {/* Birthdays Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-pink-50 to-white dark:from-pink-900/10 dark:to-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <Cake size={20} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Aniversariantes do Mês</h3>
            </div>
            <div className="p-4 space-y-4">
              {birthdayPeople.length > 0 ? (
                birthdayPeople.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <img
                      src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`}
                      className="w-10 h-10 rounded-full object-cover border border-slate-100"
                      alt={u.name}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{u.nickname || u.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Dia {new Date(u.birth_date!).getUTCDate()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4 italic">Nenhum aniversariante este mês</p>
              )}
            </div>
          </div>

          {/* Work Anniversaries Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/10 dark:to-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-white dark:bg-slate-700 text-yellow-600 dark:text-yellow-400 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <AwardIcon size={20} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Tempo de Casa</h3>
            </div>
            <div className="p-4 space-y-4">
              {workAnniversaries.length > 0 ? (
                workAnniversaries.map(item => (
                  <div key={item.user.id} className="flex items-center gap-3">
                    <img
                      src={item.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user.name)}&background=random`}
                      className="w-10 h-10 rounded-full object-cover border border-slate-100"
                      alt={item.user.name}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.user.nickname || item.user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item.years} {item.years === 1 ? 'ano' : 'anos'} de casa • Dia {new Date(item.user.appointment_date!).getUTCDate()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4 italic">Sem aniversários de admissão este mês</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] p-4 animate-fadeIn"
          onClick={() => setPreviewItem(null)}
        >
          <div className="absolute top-4 right-4 flex gap-4 z-[110]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = previewItem.url;
                link.download = previewItem.name;
                link.click();
              }}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Download"
            >
              <Download size={24} />
            </button>
            <button
              onClick={() => setPreviewItem(null)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          <div
            className="w-full max-w-5xl h-[85vh] flex items-center justify-center bg-transparent rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewItem.url}
              alt={previewItem.name}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            />
          </div>

          <div className="mt-6 text-white text-center">
            <h3 className="text-lg font-bold">{previewItem.name}</h3>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {previewGallery && previewGallery.items.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] p-4 animate-fadeIn user-select-none"
          onClick={() => setPreviewGallery(null)}
        >
          <div className="absolute top-4 right-4 flex gap-4 z-[110]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = previewGallery.items[previewGallery.currentIndex].url;
                link.download = previewGallery.items[previewGallery.currentIndex].name;
                link.click();
              }}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Download"
            >
              <Download size={24} />
            </button>
            <button
              onClick={() => setPreviewGallery(null)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          <div
            className="w-full max-w-6xl h-[85vh] flex items-center justify-center bg-transparent rounded-lg overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gallery Navigation Controls */}
            {previewGallery.items.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewGallery(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null);
                  }}
                  disabled={previewGallery.currentIndex === 0}
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-[110]"
                  title="Anterior (Seta Esquerda)"
                >
                  <ChevronLeft size={32} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewGallery(prev => prev ? { ...prev, currentIndex: Math.min(prev.items.length - 1, prev.currentIndex + 1) } : null);
                  }}
                  disabled={previewGallery.currentIndex === previewGallery.items.length - 1}
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-[110]"
                  title="Próxima (Seta Direita)"
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}

            <img
              src={previewGallery.items[previewGallery.currentIndex].url}
              alt={previewGallery.items[previewGallery.currentIndex].name}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg select-none"
            />
          </div>

          <div className="mt-6 text-white text-center">
            <h3 className="text-lg font-bold">{previewGallery.items[previewGallery.currentIndex].name}</h3>
            {previewGallery.items.length > 1 && (
              <p className="text-sm text-slate-400 mt-1 font-medium">
                {previewGallery.currentIndex + 1} de {previewGallery.items.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Mural;
