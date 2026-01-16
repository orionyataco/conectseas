
import React from 'react';
import { User, Folder, DriveFile } from '../types';
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
  X
} from 'lucide-react';

interface DirectoryProps {
  user: User | null;
}

const Directory: React.FC<DirectoryProps> = ({ user }) => {
  const [currentFolder, setCurrentFolder] = React.useState<Folder | null>(null);
  const [folderHistory, setFolderHistory] = React.useState<Folder[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [files, setFiles] = React.useState<DriveFile[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Modals state
  const [showNewFolderModal, setShowNewFolderModal] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchContent();
  }, [user, currentFolder]);

  const fetchContent = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const parentId = currentFolder ? currentFolder.id : 'null';

      // Fetch folders
      const foldersRes = await fetch(`http://localhost:3002/api/drive/folders?userId=${user.id}&parentId=${parentId}`);
      const foldersData = await foldersRes.json();
      setFolders(foldersData);

      // Fetch files
      const filesRes = await fetch(`http://localhost:3002/api/drive/files?userId=${user.id}&folderId=${parentId}`);
      const filesData = await filesRes.json();
      setFiles(filesData);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    try {
      await fetch('http://localhost:3002/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          parentId: currentFolder?.id,
          name: newFolderName
        })
      });

      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchContent();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!user || !confirm('Tem certeza? Isso excluirá a pasta e todo seu conteúdo.')) return;

    try {
      await fetch(`http://localhost:3002/api/drive/folders/${folderId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      fetchContent();
    } catch (error) {
      console.error('Failed to delete folder:', error);
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
      await fetch('http://localhost:3002/api/drive/upload', {
        method: 'POST',
        body: formData
      });
      fetchContent();
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!user || !confirm('Deseja excluir este arquivo?')) return;

    try {
      await fetch(`http://localhost:3002/api/drive/files/${fileId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      fetchContent();
    } catch (error) {
      console.error('Failed to delete file:', error);
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

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meus Documentos</h1>
          <p className="text-slate-500">Gerencie seus arquivos e pastas pessoais.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FolderIcon size={18} />
            Nova Pasta
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-70"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Upload size={18} />
            )}
            Upload Arquivo
          </button>
        </div>
      </header>

      {/* Breadcrumbs & Navigation */}
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
              onClick={() => navigateToBreadcrumb(index + 1)} // Adjusted index logic roughly
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

      {/* Content Grid */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <FolderIcon size={40} className="text-slate-300" />
            </div>
            <p>Esta pasta está vazia</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Folders */}
            {folders.map(folder => (
              <div
                key={folder.id}
                onDoubleClick={() => navigateToFolder(folder)}
                className="group relative p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3"
              >
                <FolderIcon size={48} className="text-blue-400 group-hover:text-blue-500 fill-blue-100" />
                <span className="text-sm font-medium text-slate-700 truncate w-full">{folder.name}</span>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                  className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Files */}
            {files.map(file => (
              <div
                key={file.id}
                className="group relative p-4 bg-white hover:shadow-md border border-slate-200 rounded-xl transition-all flex flex-col items-center justify-between text-center gap-3"
              >
                <div className="flex-1 flex items-center justify-center w-full bg-slate-50 rounded-lg py-4">
                  {getFileIcon(file.file_type)}
                </div>
                <div className="w-full">
                  <p className="text-xs font-medium text-slate-700 truncate w-full mb-1" title={file.original_name}>
                    {file.original_name}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatSize(file.file_size)}</p>
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/90 rounded p-1 shadow-sm">
                  <a
                    href={`http://localhost:3002/uploads/${file.filename}`}
                    download={file.original_name}
                    className="p-1 hover:text-blue-600"
                    title="Baixar"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-1 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
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
    </div>
  );
};

export default Directory;
