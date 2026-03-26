import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile, Loader2, Minus, Maximize2, Pencil, Trash2, Check, CheckCheck, Paperclip, Download, HardDrive, File as FileIcon } from 'lucide-react';
import { useMessenger } from './MessengerContext';
import { getMessageHistory, saveFileToDrive } from '../../services/api';
import { User } from '../../types';
import EmojiPicker, { Theme, EmojiClickData, EmojiStyle } from 'emoji-picker-react';
import LinkPreview from './LinkPreview';
import toast from 'react-hot-toast';

interface ChatWindowProps {
    user: User;
    contact: any;
    isMinimized: boolean;
    onClose: () => void;
    onToggleMinimize: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ user, contact, isMinimized, onClose, onToggleMinimize }) => {
    const { socket, clearUserUnread } = useMessenger();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // Resizing state
    const [size, setSize] = useState({ width: 320, height: 450 });
    const [isResizing, setIsResizing] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setIsLoading(true);
        getMessageHistory(contact.id.toString()).then(data => {
            setMessages(data || []);
            setIsLoading(false);
            setTimeout(scrollToBottom, 100);
        });

        const handleReceiveMessage = (msg: any) => {
            const msgSenderId = Number(msg.sender_id);
            const msgReceiverId = Number(msg.receiver_id);
            const contactId = Number(contact.id);
            const userId = Number(user.id);

            if (msgSenderId === contactId || msgReceiverId === contactId) {
                // If we are receiving a message from the contact and chat is active (not minimized), mark as read
                if (msgSenderId === contactId && !isMinimized && socket) {
                    socket.emit('mark_read', { sender_id: contactId, receiver_id: userId });
                }

                setMessages(prev => {
                    // 1. Check if message with this exact server ID already exists
                    if (prev.find(m => m.id === msg.id)) return prev;

                    // 2. If it's our own message, find the optimistic one and replace it
                    if (msgSenderId === userId) {
                        const optimisticIdx = prev.findLastIndex(m =>
                            Number(m.sender_id) === userId &&
                            m.message === msg.message &&
                            (typeof m.id === 'number' && m.id > 1000000000000) // Rough check for tempId (Date.now())
                        );

                        if (optimisticIdx !== -1) {
                            const newMessages = [...prev];
                            newMessages[optimisticIdx] = msg;
                            return newMessages;
                        }
                    }

                    return [...prev, msg];
                });
                setTimeout(scrollToBottom, 100);
            }
        };

        const handleMessagesRead = ({ reader_id }: { reader_id: number }) => {
            if (Number(reader_id) === Number(contact.id)) {
                setMessages(prev => prev.map(m =>
                    Number(m.receiver_id) === Number(reader_id) ? { ...m, is_read: 1 } : m
                ));
            }
        };

        const handleUserTyping = ({ sender_id }: { sender_id: number }) => {
            if (Number(sender_id) === Number(contact.id)) {
                setIsTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
            }
        };

        const handleMessageEdited = (msg: any) => {
            const msgSenderId = Number(msg.sender_id);
            const msgReceiverId = Number(msg.receiver_id);
            const contactId = Number(contact.id);

            if (msgSenderId === contactId || msgReceiverId === contactId) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message: msg.message, is_edited: 1 } : m));
            }
        };

        const handleMessageDeleted = (msg: any) => {
            const msgSenderId = Number(msg.sender_id);
            const msgReceiverId = Number(msg.receiver_id);
            const contactId = Number(contact.id);

            if (msgSenderId === contactId || msgReceiverId === contactId) {
                setMessages(prev => prev.filter(m => m.id !== msg.id));
            }
        };

        if (socket) {
            socket.on('receive_message', handleReceiveMessage);
            socket.on('message_sent', handleReceiveMessage);
            socket.on('user_typing', handleUserTyping);
            socket.on('message_edited', handleMessageEdited);
            socket.on('message_deleted', handleMessageDeleted);
            socket.on('messages_read', handleMessagesRead);
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            if (socket) {
                socket.off('receive_message', handleReceiveMessage);
                socket.off('message_sent', handleReceiveMessage);
                socket.off('user_typing', handleUserTyping);
                socket.off('message_edited', handleMessageEdited);
                socket.off('message_deleted', handleMessageDeleted);
                socket.off('messages_read', handleMessagesRead);
            }
            document.removeEventListener('mousedown', handleClickOutside);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [user, contact, socket]);

    useEffect(() => {
        if (!isMinimized) {
            clearUserUnread(contact.id);
        }
    }, [isMinimized, contact.id, clearUserUnread]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        if (editingMessageId) {
            socket.emit('edit_message', {
                message_id: editingMessageId,
                new_message: newMessage.trim(),
                sender_id: user.id,
                receiver_id: contact.id
            });
            setEditingMessageId(null);
        } else {
            const tempId = Date.now();
            const messageData = {
                id: tempId,
                sender_id: user.id,
                receiver_id: contact.id,
                message: newMessage.trim(),
                created_at: new Date().toISOString(),
                is_edited: 0
            };

            socket.emit('send_message', messageData);
            setMessages(prev => [...prev, messageData]);
        }

        setNewMessage('');
        setShowEmojiPicker(false);
        setTimeout(scrollToBottom, 50);
    };

    const startEditing = (msg: any) => {
        setEditingMessageId(msg.id);
        setNewMessage(msg.message);
    };

    const deleteMessage = (msgId: number) => {
        if (!socket) return;
        socket.emit('delete_message', {
            message_id: msgId,
            sender_id: user.id,
            receiver_id: contact.id
        });
        if (editingMessageId === msgId) {
            setEditingMessageId(null);
            setNewMessage('');
        }
    };

    const handleKeyDown = () => {
        if (socket) {
            socket.emit('typing', { sender_id: user.id, receiver_id: contact.id });
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !socket) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/messenger/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (data.url) {
                const messageData = {
                    sender_id: user.id,
                    receiver_id: contact.id,
                    message: '',
                    file_url: data.url,
                    file_name: data.name,
                    file_type: data.type,
                    file_size: data.size,
                    created_at: new Date().toISOString()
                };
                socket.emit('send_message', messageData);
                setMessages(prev => [...prev, { ...messageData, id: Date.now() }]);
                setTimeout(scrollToBottom, 50);
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            toast.error('Erro ao enviar arquivo');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveToDrive = async (msg: any) => {
        try {
            await saveFileToDrive({
                fileName: msg.file_name,
                fileUrl: msg.file_url,
                fileType: msg.file_type,
                fileSize: msg.file_size
            });
            toast.success('Arquivo salvo no seu diretório!');
        } catch (error) {
            toast.error('Erro ao salvar no diretório');
        }
    };

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !chatRef.current) return;
            
            const newWidth = Math.max(300, window.innerWidth - e.clientX);
            const newHeight = Math.max(300, window.innerHeight - e.clientY);
            
            // Adjust based on fixed positioning from bottom right
            // We want to calculate how far the mouse is from the bottom right corner
            // but the chat is pinned to bottom right.
            // Simplified: use delta or direct mouse position relative to window
            const rect = chatRef.current.getBoundingClientRect();
            const width = window.innerWidth - e.clientX;
            const height = window.innerHeight - e.clientY;
            
            setSize({
                width: Math.min(600, Math.max(300, width)),
                height: Math.min(800, Math.max(350, height))
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const renderMessageWithLinks = (text: string) => {
        if (!text) return null;
        
        const parts = text.split(urlRegex);
        const matches = text.match(urlRegex) || [];
        
        return (
            <>
                {parts.map((part, index) => {
                    if (urlRegex.test(part)) {
                        return (
                            <a 
                                key={index} 
                                href={part} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="underline hover:no-underline font-medium break-all"
                            >
                                {part}
                            </a>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
                {matches.length > 0 && <LinkPreview url={matches[0]} />}
            </>
        );
    };

    if (isMinimized) {
        return (
            <div className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-xl shadow-lg cursor-pointer" onClick={onToggleMinimize}>
                <div className="p-3 bg-blue-600 text-white rounded-t-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="relative shrink-0">
                            <img
                                src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                                alt={typeof contact.name === 'string' ? contact.name : "Contact"}
                                className="w-6 h-6 rounded-full object-cover border border-white/20"
                                onError={(e) => {
                                    const nameParam = typeof contact.name === 'string' ? encodeURIComponent(contact.name) : 'Contact';
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${nameParam}&background=random`;
                                }}
                            />
                            {contact.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-blue-600"></div>
                            )}
                        </div>
                        <span className="text-xs font-bold truncate">{contact.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} className="p-1 hover:bg-white/20 rounded transition-colors">
                            <Maximize2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-white/20 rounded transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={chatRef}
            style={{ width: `${size.width}px`, height: `${size.height}px` }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 relative"
        >
            {/* Resize Handle */}
            <div 
                className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50 hover:bg-blue-500/10 rounded-tl-2xl"
                onMouseDown={startResizing}
            ></div>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-blue-600 text-white rounded-t-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        <img
                            src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                            alt={typeof contact.name === 'string' ? contact.name : "Contact"}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                            onError={(e) => {
                                const nameParam = typeof contact.name === 'string' ? encodeURIComponent(contact.name) : 'Contact';
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${nameParam}&background=random`;
                            }}
                        />
                        {contact.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-blue-600"></div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold truncate max-w-[120px]">{contact.name}</h4>
                        <p className="text-[10px] text-blue-100 font-medium">
                            {isTyping ? 'digitando...' : (contact.isOnline ? 'Online agora' : 'Offline')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onToggleMinimize} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Minimizar">
                        <Minus size={18} />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Fechar">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-blue-400" size={24} />
                    </div>
                ) : messages.length > 0 ? (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex group ${Number(msg.sender_id) === Number(user.id) ? 'justify-end' : 'justify-start'}`}
                        >
                            {Number(msg.sender_id) === Number(user.id) && (
                                <div className="flex flex-col gap-1 items-end justify-center mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditing(msg)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                                        <Pencil size={12} />
                                    </button>
                                    <button onClick={() => deleteMessage(msg.id)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-600 transition-colors" title="Excluir">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl text-xs shadow-sm ${Number(msg.sender_id) === Number(user.id)
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                                    }`}
                            >
                                <div className="leading-relaxed break-words">
                                    {msg.file_url ? (
                                        <div className="flex flex-col gap-2 p-1 min-w-[150px]">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-2 bg-white/20 rounded-lg">
                                                    <FileIcon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold truncate text-[11px]">{msg.file_name}</p>
                                                    <p className="text-[9px] opacity-70">{(msg.file_size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <a 
                                                    href={msg.file_url} 
                                                    download={msg.file_name}
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-[10px] font-bold"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <Download size={12} />
                                                    Baixar
                                                </a>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSaveToDrive(msg);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-[10px] font-bold"
                                                >
                                                    <HardDrive size={12} />
                                                    Salvar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        renderMessageWithLinks(msg.message)
                                    )}
                                </div>
                                <div className={`flex items-center gap-1 mt-1 opacity-60 ${Number(msg.sender_id) === Number(user.id) ? 'justify-end' : 'justify-start'}`}>
                                    <span className="text-[9px]">
                                        {msg.is_edited ? '(Editado) ' : ''}{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {Number(msg.sender_id) === Number(user.id) && (
                                        <span className="scale-75">
                                            {msg.is_read ? <CheckCheck size={14} className="text-blue-200" /> : <Check size={14} />}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                            <Smile size={24} className="text-blue-200" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic">Comece uma conversa com {contact.name.split(' ')[0]}</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={false}
                            theme={Theme.LIGHT}
                            emojiStyle={EmojiStyle.NATIVE}
                            width={300}
                            height={400}
                        />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 rounded-full transition-all ${showEmojiPicker ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    >
                        <Smile size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={handleFileClick}
                        disabled={isUploading}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50"
                        title="Anexar arquivo"
                    >
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                    </button>
                    <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Mensagem..."
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md shadow-blue-100"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;

