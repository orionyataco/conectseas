
import React from 'react';
import { User, Folder, DriveFile } from '../types';
import api from '../services/api';
import {
  Folder as FolderIcon,
  FileText,
  Upload,
  Plus,
  ArrowLeft,
  Monitor,
  HardDrive,
  ChevronRight,
  Download,
  Trash2,
  File,
  Image,
  MoreVertical,
  X,
  Share2,
  Users as UsersIcon,
  Shield,
  ShieldCheck,
  Search,
  Clock,
  Star,
  RefreshCw,
  ArchiveX
} from 'lucide-react';

interface DirectoryProps {
  user: User | null;
  searchContext?: { type: string; id: string | number; folder_id?: number } | null;
  onClearContext?: () => void;
}

const Directory: React.FC<DirectoryProps> = ({ user, searchContext, onClearContext }) => {
  const [currentFolder, setCurrentFolder] = React.useState<Folder | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = React.useState('');
  const [folderHistory, setFolderHistory] = React.useState<Folder[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [files, setFiles] = React.useState<DriveFile[]>([]);
  const [unifiedItems, setUnifiedItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'all' | 'recent' | 'shared' | 'favorites' | 'trash'>('all');

  // Modals state
  const [showNewFolderModal, setShowNewFolderModal] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [sharingFolder, setSharingFolder] = React.useState<Folder | null>(null);
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [folderShares, setFolderShares] = React.useState<any[]>([]);
  const [shareLoading, setShareLoading] = React.useState(false);

  const [uploading, setUploading] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<{ url: string; name: string } | null>(null);
  const [storageStats, setStorageStats] = React.useState<{ used: number; quota: number } | null>(null);
  const [renamingItem, setRenamingItem] = React.useState<{ id: number, type: 'folder' | 'file', currentName: string } | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchContent();
    fetchStorageStats();
  }, [user, currentFolder, viewMode]);

  React.useEffect(() => {
    const handleSearchContext = async () => {
      if (!user || !searchContext) return;

      if (searchContext.type === 'folder' || searchContext.type === 'file') {
        const folderId = searchContext.type === 'folder' ? Number(searchContext.id) : Number(searchContext.folder_id);

        if (folderId) {
          try {
            // Fetch folder info to set as current
            const folderRes = await api.get(`/drive/folders/${folderId}?userId=${user.id}`);
            if (folderRes.data) {
              // For simplicity, we clear history when jumping from search
              // unless we implement a path fetcher
              setFolderHistory([{ id: 0, name: 'Meu Drive', user_id: 0, parent_id: null, created_at: '' } as any]);
              setCurrentFolder(folderRes.data);
              onClearContext?.();
            }
          } catch (e) {
            console.error('Failed to navigate to searched folder:', e);
          }
        }
      }
    };

    handleSearchContext();
  }, [searchContext, user]);

  const fetchContent = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (viewMode === 'all') {
        const parentId = currentFolder ? currentFolder.id : 'null';
        const foldersRes = await api.get(`/drive/folders?userId=${user.id}&parentId=${parentId}`);
        setFolders(foldersRes.data);
        const filesRes = await api.get(`/drive/files?userId=${user.id}&folderId=${parentId}`);
        setFiles(filesRes.data);
      } else {
        // For recent, shared, favorites, trash
        const res = await api.get(`/drive/${viewMode}?userId=${user.id}`);
        setUnifiedItems(res.data);
        setFolders([]);
        setFiles([]);
      }
    } catch (error) {
      console.error(`Failed to fetch ${viewMode} content:`, error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageStats = async () => {
    if (!user) return;
    try {
      const { getStorageStats } = await import('../services/api');
      const stats = await getStorageStats(user.id);
      setStorageStats(stats);
    } catch (e) {
      console.error('Failed to fetch storage stats:', e);
    }
  };

  const handleToggleFavorite = async (itemId: number, type: 'folder' | 'file', isFavorite: boolean) => {
    if (!user) return;
    try {
      await api.post(`/drive/${type}s/${itemId}/favorite`, {
        userId: user.id,
        is_favorite: !isFavorite
      });
      fetchContent();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setAllUsers(res.data);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  const fetchShares = async (folderId: number) => {
    try {
      const res = await api.get(`/drive/folders/${folderId}/shares`);
      setFolderShares(res.data);
    } catch (e) {
      console.error('Failed to fetch shares:', e);
    }
  };

  const handleShare = async (targetUserId: string, permission: 'READ' | 'WRITE') => {
    if (!user || !sharingFolder) return;
    setShareLoading(true);
    try {
      await api.post(`/drive/folders/${sharingFolder.id}/share`, {
        userId: user.id,
        targetUserId,
        permission
      });
      fetchShares(sharingFolder.id);
    } catch (e) {
      console.error('Failed to share:', e);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRemoveShare = async (targetUserId: string) => {
    if (!user || !sharingFolder) return;
    try {
      await api.delete(`/drive/folders/${sharingFolder.id}/shares/${targetUserId}?userId=${user.id}`);
      fetchShares(sharingFolder.id);
    } catch (e) {
      console.error('Failed to remove share:', e);
    }
  };

  const openShareModal = (folder: Folder) => {
    setSharingFolder(folder);
    setShowShareModal(true);
    fetchUsers();
    fetchShares(folder.id);
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    try {
      await api.post('/drive/folders', {
        userId: user.id,
        parentId: currentFolder?.id,
        name: newFolderName
      });

      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchContent();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!user) return;
    if (viewMode === 'trash') {
      if (!confirm('Excluir permanentemente esta pasta e todo seu conteúdo?')) return;
      try {
        await api.delete(`/drive/folders/${folderId}?userId=${user.id}`);
        fetchContent();
        fetchStorageStats();
      } catch (error) {
        console.error('Failed to permanent delete folder:', error);
      }
    } else {
      if (!confirm('Mover para a lixeira?')) return;
      try {
        await api.post(`/drive/folders/${folderId}/trash`, { userId: user.id });
        fetchContent();
      } catch (error) {
        console.error('Failed to trash folder:', error);
      }
    }
  };

  const handleRestore = async (id: number, type: 'folder' | 'file') => {
    if (!user) return;
    try {
      await api.post(`/drive/${type}s/${id}/restore`, { userId: user.id });
      fetchContent();
    } catch (error) {
      console.error('Failed to restore item:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);
    if (currentFolder) {
      formData.append('folderId', currentFolder.id.toString());
    }

    setUploading(true);
    try {
      await api.post('/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchContent();
      fetchStorageStats();
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!user) return;
    if (viewMode === 'trash') {
      if (!confirm('Excluir permanentemente este arquivo?')) return;
      try {
        await api.delete(`/drive/files/${fileId}?userId=${user.id}`);
        fetchContent();
        fetchStorageStats();
      } catch (error) {
        console.error('Failed to permanent delete file:', error);
      }
    } else {
      if (!confirm('Mover para a lixeira?')) return;
      try {
        await api.post(`/drive/files/${fileId}/trash`, { userId: user.id });
        fetchContent();
      } catch (error) {
        console.error('Failed to trash file:', error);
      }
    }
  };

  const navigateToFolder = (folder: Folder) => {
    if (currentFolder) {
      setFolderHistory([...folderHistory, currentFolder]);
    } else {
      setFolderHistory([{ id: 0, name: 'Meu Drive', user_id: 0, parent_id: null, created_at: '' } as any]);
    }
    setCurrentFolder(folder);
  };

  const navigateUp = () => {
    if (folderHistory.length === 0) {
      setCurrentFolder(null);
      return;
    }

    const newHistory = [...folderHistory];
    const parent = newHistory.pop();
    setFolderHistory(newHistory);
    setCurrentFolder(parent?.id === 0 ? null : parent || null);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolder(null); // Root
      setFolderHistory([]);
      return;
    }

    const targetFolder = folderHistory[index];
    if (targetFolder.id === 0) { // Root logic from history hack
      setCurrentFolder(null);
      setFolderHistory([]);
    } else {
      setCurrentFolder(targetFolder);
      setFolderHistory(folderHistory.slice(0, index));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image size={24} className="text-purple-500" />;
    if (type.includes('pdf')) return <FileText size={24} className="text-red-500" />;
    return <File size={24} className="text-blue-500" />;
  };

  const handleRename = async () => {
    if (!user || !renamingItem || !renameValue.trim()) return;
    try {
      const { renameFolder, renameFile } = await import('../services/api');
      if (renamingItem.type === 'folder') {
        await renameFolder(renamingItem.id, user.id, renameValue);
      } else {
        await renameFile(renamingItem.id, user.id, renameValue);
      }
      setRenamingItem(null);
      setRenameValue('');
      fetchContent();
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  };

  const handleFileClick = (file: DriveFile | any) => {
    const isImage = file.file_type?.includes('image') || file.item_type === 'image';
    if (isImage) {
      setPreviewImage({
        url: `/uploads/${file.filename}`,
        name: file.original_name || file.name
      });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 animate-fadeIn">
      {/* Sidebar Filters */}
      <aside className="lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 shrink-0">
        <button
          onClick={() => { setViewMode('all'); setCurrentFolder(null); setFolderHistory([]); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${viewMode === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <HardDrive size={20} />
          Meu Drive
        </button>
        <button
          onClick={() => setViewMode('recent')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${viewMode === 'recent' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Clock size={20} />
          Recentes
        </button>
        <button
          onClick={() => setViewMode('shared')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${viewMode === 'shared' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <UsersIcon size={20} />
          Compartilhados
        </button>
        <button
          onClick={() => setViewMode('favorites')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${viewMode === 'favorites' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Star size={20} />
          Favoritos
        </button>
        <button
          onClick={() => setViewMode('trash')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${viewMode === 'trash' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Trash2 size={20} />
          Lixeira
        </button>

        {/* Storage Usage Section */}
        {storageStats && (
          <div className="mt-auto pt-6 px-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Armazenamento</span>
              <span className="text-[10px] font-bold text-slate-600">
                {Math.round((storageStats.used / storageStats.quota) * 100)}%
              </span>
            </div>
            {/* Progress Bar Container: Blue background (empty) */}
            <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
              {/* Progress Bar: Red (filled) */}
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (storageStats.used / storageStats.quota) * 100)}%` }}
              />
            </div>
            <div className="mt-2">
              <p className="text-[10px] text-slate-500 font-medium">
                {formatSize(storageStats.used)} de {formatSize(storageStats.quota)}
              </p>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 space-y-6 flex flex-col min-w-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {viewMode === 'all' ? 'Meus Documentos' :
                viewMode === 'recent' ? 'Arquivos Recentes' :
                  viewMode === 'shared' ? 'Compartilhados Comigo' :
                    viewMode === 'trash' ? 'Lixeira' : 'Meus Favoritos'}
            </h1>
            <p className="text-slate-500">
              {viewMode === 'all' ? 'Gerencie seus arquivos e pastas pessoais.' :
                viewMode === 'recent' ? 'Documentos acessados ou modificados recentemente.' :
                  viewMode === 'shared' ? 'Pastas e registros que outros usuários compartilharam com você.' :
                    viewMode === 'favorites' ? 'Seus itens marcados como favoritos para acesso rápido.' :
                      'Itens excluídos. Você pode restaurá-los ou excluí-los permanentemente.'}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
              />
            </div>
            {viewMode === 'all' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  disabled={currentFolder !== null && (currentFolder as any).permission === 'READ'}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FolderIcon size={18} />
                  Nova Pasta
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || (currentFolder !== null && (currentFolder as any).permission === 'READ')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-70"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Upload size={18} />
                  )}
                  Upload Arquivo
                </button>
              </>
            )}
          </div>
        </header>

        {/* Breadcrumbs & Navigation - Only in 'all' view */}
        {viewMode === 'all' && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-2 text-sm overflow-x-auto">
            {currentFolder && (
              <button onClick={navigateUp} className="p-1 hover:bg-slate-100 rounded-lg mr-2">
                <ArrowLeft size={18} className="text-slate-500" />
              </button>
            )}

            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className={`flex items-center gap-2 font-semibold hover:text-blue-600 ${!currentFolder ? 'text-blue-600' : 'text-slate-600'}`}
            >
              <HardDrive size={18} />
              Meu Drive
            </button>

            {folderHistory.filter(f => f.id !== 0).map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight size={14} className="text-slate-400" />
                <button
                  onClick={() => navigateToBreadcrumb(index + 1)}
                  className="hover:text-blue-600 text-slate-600 font-medium whitespace-nowrap"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}

            {currentFolder && (
              <>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="font-bold text-slate-800 whitespace-nowrap">{currentFolder.name}</span>
              </>
            )}
          </div>
        )}

        {/* Content Grid */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (viewMode === 'all' && folders.length === 0 && files.length === 0) || (viewMode !== 'all' && unifiedItems.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <FolderIcon size={40} className="text-slate-300" />
              </div>
              <p>Nenhum item encontrado nesta visualização</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Manual Folders in 'all' view */}
              {viewMode === 'all' && folders.filter(f => f.name.toLowerCase().includes(localSearchQuery.toLowerCase())).map(folder => (
                <div
                  key={folder.id}
                  onDoubleClick={() => navigateToFolder(folder)}
                  className="group relative p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3"
                >
                  <FolderIcon size={48} className={`group-hover:text-blue-500 fill-blue-100 ${folder.user_id != user?.id ? 'text-indigo-400' : 'text-blue-400'}`} />
                  <div className="flex items-center gap-1 w-full justify-center">
                    {folder.user_id != user?.id && <UsersIcon size={12} className="text-indigo-400" />}
                    <span className="text-sm font-medium text-slate-700 truncate">{folder.name}</span>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/90 rounded p-1 shadow-sm">
                    {folder.user_id == user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(folder.id, 'folder', folder.is_favorite); }}
                        className={`p-1.5 rounded transition-colors ${folder.is_favorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                        title={folder.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star size={14} fill={folder.is_favorite ? "currentColor" : "none"} />
                      </button>
                    )}
                    {folder.user_id == user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingItem({ id: folder.id, type: 'folder', currentName: folder.name }); setRenameValue(folder.name); }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                        title="Renomear"
                      >
                        <Plus className="rotate-45" size={14} />
                      </button>
                    )}
                    {folder.user_id == user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openShareModal(folder); }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                        title="Compartilhar"
                      >
                        <Share2 size={14} />
                      </button>
                    )}
                    {folder.user_id == user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {!!folder.is_favorite && (
                    <div className="absolute top-2 left-2 text-amber-500">
                      <Star size={12} fill="currentColor" />
                    </div>
                  )}
                </div>
              ))}

              {/* Manual Files in 'all' view */}
              {viewMode === 'all' && files.filter(f => f.original_name.toLowerCase().includes(localSearchQuery.toLowerCase())).map(file => (
                <div
                  key={file.id}
                  className="group relative p-4 bg-white hover:shadow-md border border-slate-200 rounded-xl transition-all flex flex-col items-center justify-between text-center gap-3"
                >
                  <div
                    onClick={() => handleFileClick(file)}
                    className="flex-1 flex items-center justify-center w-full bg-slate-50 rounded-lg py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="w-full">
                    <p className="text-xs font-medium text-slate-700 truncate w-full mb-1" title={file.original_name}>
                      {file.original_name}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatSize(file.file_size)}</p>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/90 rounded p-1 shadow-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(file.id, 'file', file.is_favorite); }}
                      className={`p-1.5 rounded transition-colors ${file.is_favorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                      title={file.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Star size={14} fill={file.is_favorite ? "currentColor" : "none"} />
                    </button>
                    <a
                      href={`/uploads/${file.filename}`}
                      download={file.original_name}
                      className="p-1 hover:text-blue-600"
                      title="Baixar"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenamingItem({ id: file.id, type: 'file', currentName: file.original_name }); setRenameValue(file.original_name); }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                      title="Renomear"
                    >
                      <Plus className="rotate-45" size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-1 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {!!file.is_favorite && (
                    <div className="absolute top-2 left-2 text-amber-500">
                      <Star size={12} fill="currentColor" />
                    </div>
                  )}
                </div>
              ))}

              {/* Unified items in filtered views */}
              {viewMode !== 'all' && unifiedItems.filter(item => (item.name || item.original_name).toLowerCase().includes(localSearchQuery.toLowerCase())).map(item => (
                <div
                  key={`${item.item_type}-${item.id}`}
                  onDoubleClick={() => item.item_type === 'folder' ? (setViewMode('all'), navigateToFolder(item)) : null}
                  className="group relative p-4 bg-white hover:shadow-md border border-slate-200 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-between text-center gap-3"
                >
                  <div
                    onClick={() => item.item_type === 'file' ? handleFileClick(item) : null}
                    className={`flex-1 flex items-center justify-center w-full bg-slate-50 rounded-lg py-4 relative ${item.item_type === 'file' && item.file_type?.includes('image') ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`}
                  >
                    {item.item_type === 'folder' ? (
                      <FolderIcon size={48} className="text-blue-400 fill-blue-50" />
                    ) : (
                      getFileIcon(item.file_type)
                    )}
                    {!!item.is_favorite && (
                      <div className="absolute top-1 left-1 text-amber-500">
                        <Star size={14} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <p className="text-xs font-semibold text-slate-700 truncate w-full mb-1" title={item.name || item.original_name}>
                      {item.name || item.original_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.item_type === 'folder' ? 'Pasta' : formatSize(item.file_size)}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/90 rounded p-1 shadow-sm">
                    {viewMode === 'trash' ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestore(item.id, item.item_type); }}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          title="Restaurar"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); item.item_type === 'folder' ? handleDeleteFolder(item.id) : handleDeleteFile(item.id); }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Excluir Permanentemente"
                        >
                          <ArchiveX size={14} />
                        </button>
                      </>
                    ) : item.user_id == user?.id && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item.id, item.item_type, item.is_favorite); }}
                          className={`p-1 rounded transition-colors ${item.is_favorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                        >
                          <Star size={14} fill={item.is_favorite ? "currentColor" : "none"} />
                        </button>
                        {item.item_type === 'file' && (
                          <a
                            href={`/uploads/${item.filename}`}
                            download={item.original_name}
                            className="p-1 hover:text-blue-600"
                            title="Baixar"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); item.item_type === 'folder' ? handleDeleteFolder(item.id) : handleDeleteFile(item.id); }}
                          className="p-1 hover:text-red-600"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals relocated inside main content area to follow absolute positioning relative to container if needed, but fixed takes care of it */}
        {showNewFolderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Nova Pasta</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nome da pasta"
                autoFocus
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        )}

        {showShareModal && sharingFolder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl animate-fadeIn flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Compartilhar Pasta</h3>
                  <p className="text-sm text-slate-500">{sharingFolder.name}</p>
                </div>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
                {/* Search/Add User */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Adicionar novo usuário</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleShare(e.target.value, 'READ');
                          e.target.value = '';
                        }
                      }}
                      disabled={shareLoading}
                    >
                      <option value="">Selecione um usuário...</option>
                      {allUsers
                        .filter(u => u.id != user?.id && !folderShares.some(s => s.user_id == u.id))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* Current Shares */}
                <div className="flex-1 overflow-y-auto">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pessoas com acesso</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                          {user?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{user?.name} (Você)</p>
                          <p className="text-xs text-slate-500">Proprietário</p>
                        </div>
                      </div>
                    </div>

                    {folderShares.map(share => (
                      <div key={share.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          {share.user_avatar ? (
                            <img src={share.user_avatar} alt={share.user_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                              {share.user_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{share.user_name}</p>
                            <p className="text-xs text-slate-500">{share.user_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="text-xs font-semibold bg-white border border-slate-200 rounded p-1 outline-none"
                            value={share.permission}
                            onChange={(e) => handleShare(share.user_id.toString(), e.target.value as any)}
                          >
                            <option value="READ">Pode Ver</option>
                            <option value="WRITE">Pode Editar</option>
                          </select>
                          <button
                            onClick={() => handleRemoveShare(share.user_id.toString())}
                            className="p-1 hover:text-red-500"
                            title="Remover acesso"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        )}

        {renamingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Renomear {renamingItem.type === 'folder' ? 'Pasta' : 'Arquivo'}</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Novo nome"
                autoFocus
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                onKeyPress={(e) => e.key === 'Enter' && handleRename()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRenamingItem(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRename}
                  disabled={!renameValue.trim() || renameValue === renamingItem.currentName}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {
        previewImage && (
          <div
            className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] p-4 animate-fadeIn"
            onClick={() => setPreviewImage(null)}
          >
            <div className="absolute top-4 right-4 flex gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = previewImage.url;
                  link.download = previewImage.name;
                  link.click();
                }}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Download"
              >
                <Download size={24} />
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            <div className="max-w-full max-h-[80vh] flex items-center justify-center bg-transparent" onClick={(e) => e.stopPropagation()}>
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
              />
            </div>

            <div className="mt-6 text-white text-center">
              <h3 className="text-lg font-bold">{previewImage.name}</h3>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Directory;
