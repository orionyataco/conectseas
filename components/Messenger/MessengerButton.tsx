import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useMessenger } from './MessengerContext';
import MessengerPopup from './MessengerPopup.tsx';

const MessengerButton: React.FC = () => {
    const { unreadCount } = useMessenger();
    const [showPopup, setShowPopup] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setShowPopup(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={buttonRef}>
            <button
                onClick={() => setShowPopup(!showPopup)}
                className={`p-2 hover:bg-slate-100 rounded-full relative transition-colors ${showPopup ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`}
                title="Mensagens"
            >
                <MessageSquare size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                )}
            </button>

            {showPopup && <MessengerPopup onClose={() => setShowPopup(false)} />}
        </div>
    );
};

export default MessengerButton;
