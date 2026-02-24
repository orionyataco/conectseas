import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile, Loader2, Minus, Maximize2 } from 'lucide-react';
import { useMessenger } from './MessengerContext';
import { getMessageHistory } from '../../services/api';
import { User } from '../../types';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setIsLoading(true);
        getMessageHistory(user.id, contact.id.toString()).then(data => {
            setMessages(data || []);
            setIsLoading(false);
            setTimeout(scrollToBottom, 100);
        });

        const handleReceiveMessage = (msg: any) => {
            if (msg.sender_id === contact.id || msg.receiver_id === contact.id) {
                // Check if message already exists (to avoid duplicates from optimistic update)
                setMessages(prev => {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                setTimeout(scrollToBottom, 100);
            }
        };

        const handleUserTyping = ({ sender_id }: { sender_id: number }) => {
            if (sender_id === contact.id) {
                setIsTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
            }
        };

        if (socket) {
            socket.on('receive_message', handleReceiveMessage);
            socket.on('user_typing', handleUserTyping);
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
                socket.off('user_typing', handleUserTyping);
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

        const tempId = Date.now();
        const messageData = {
            id: tempId,
            sender_id: user.id,
            receiver_id: contact.id,
            message: newMessage.trim(),
            created_at: new Date().toISOString()
        };

        socket.emit('send_message', messageData);
        setMessages(prev => [...prev, messageData]);
        setNewMessage('');
        setShowEmojiPicker(false);
        setTimeout(scrollToBottom, 50);
    };

    const handleKeyDown = () => {
        if (socket) {
            socket.emit('typing', { sender_id: user.id, receiver_id: contact.id });
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    if (isMinimized) {
        return (
            <div className="w-64 bg-white border border-slate-200 rounded-t-xl shadow-lg cursor-pointer" onClick={onToggleMinimize}>
                <div className="p-3 bg-blue-600 text-white rounded-t-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="relative shrink-0">
                            <img
                                src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                                alt={contact.name}
                                className="w-6 h-6 rounded-full object-cover border border-white/20"
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
        <div className="w-80 h-[450px] bg-white border border-slate-200 rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-blue-600 text-white rounded-t-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        <img
                            src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                            alt={contact.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-blue-400" size={24} />
                    </div>
                ) : messages.length > 0 ? (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl text-xs shadow-sm ${msg.sender_id === user.id
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                    }`}
                            >
                                <p className="leading-relaxed">{msg.message}</p>
                                <p className={`text-[9px] mt-1 opacity-60 ${msg.sender_id === user.id ? 'text-right' : 'text-left'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
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
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white relative">
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={false}
                            theme={Theme.LIGHT}
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
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Mensagem..."
                        className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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

