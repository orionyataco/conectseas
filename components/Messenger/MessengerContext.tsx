import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { User } from '../../types';
import { getUnreadCount } from '../../services/api';

interface ActiveChat {
    contact: any;
    isMinimized: boolean;
}

interface MessengerContextType {
    socket: Socket | null;
    unreadCount: number;
    unreadPerUser: Record<number, number>;
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
    setUnreadPerUser: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    decrementUnreadCount: (amount?: number) => void;
    clearUserUnread: (userId: number) => void;
    activeChats: ActiveChat[];
    openChat: (contact: any) => void;
    closeChat: (contactId: number) => void;
    toggleMinimizeChat: (contactId: number) => void;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const MessengerProvider: React.FC<{ user: User; children: React.ReactNode }> = ({ user, children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadPerUser, setUnreadPerUser] = useState<Record<number, number>>({});
    const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);

    const activeChatsRef = React.useRef(activeChats);
    useEffect(() => {
        activeChatsRef.current = activeChats;
    }, [activeChats]);

    useEffect(() => {
        if (!user) return;

        const newSocket = io(window.location.origin.replace('3000', '3002').replace('5173', '3002'), {
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('Connected to messenger socket');
            newSocket.emit('authenticate', user.id);
        });

        newSocket.on('receive_message', (msg) => {
            // Only increment unread if chat with sender is not open or is minimized
            // Use ref to check current active chats without triggering effect re-run
            const senderId = Number(msg.sender_id);
            const currentUserId = Number(user.id);

            // Ignore if we sent the message ourselves (e.g., from another tab or back from server)
            if (senderId === currentUserId) return;

            const chatOpen = activeChatsRef.current.find(c => Number(c.contact.id) === senderId);

            if (!chatOpen || chatOpen.isMinimized) {
                setUnreadCount(prev => prev + 1);
                setUnreadPerUser(prev => ({
                    ...prev,
                    [senderId]: (prev[senderId] || 0) + 1
                }));
            }
        });

        setSocket(newSocket);

        // Initial unread count
        getUnreadCount(user.id).then(data => {
            if (data && typeof data.count === 'number') {
                setUnreadCount(data.count);
            }
        });

        return () => {
            newSocket.close();
        };
    }, [user.id]); // Only reconnect if user changes

    const decrementUnreadCount = (amount: number = 1) => {
        setUnreadCount(prev => Math.max(0, prev - amount));
    };

    const clearUserUnread = (userId: number) => {
        setUnreadPerUser(prev => {
            const count = prev[userId] || 0;
            if (count > 0) {
                decrementUnreadCount(count);
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            }
            return prev;
        });
    };

    const openChat = (contact: any) => {
        setActiveChats(prev => {
            const exists = prev.find(c => c.contact.id === contact.id);
            if (exists) {
                return prev.map(c => c.contact.id === contact.id ? { ...c, isMinimized: false } : c);
            }
            return [...prev, { contact, isMinimized: false }];
        });
    };

    const closeChat = (contactId: number) => {
        setActiveChats(prev => prev.filter(c => c.contact.id !== contactId));
    };

    const toggleMinimizeChat = (contactId: number) => {
        setActiveChats(prev => prev.map(c =>
            c.contact.id === contactId ? { ...c, isMinimized: !c.isMinimized } : c
        ));
    };

    return (
        <MessengerContext.Provider value={{
            socket,
            unreadCount,
            unreadPerUser,
            setUnreadCount,
            setUnreadPerUser,
            decrementUnreadCount,
            clearUserUnread,
            activeChats,
            openChat,
            closeChat,
            toggleMinimizeChat
        }}>
            {children}
        </MessengerContext.Provider>
    );
};

export const useMessenger = () => {
    const context = useContext(MessengerContext);
    if (context === undefined) {
        throw new Error('useMessenger must be used within a MessengerProvider');
    }
    return context;
};
