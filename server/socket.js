import { Server } from 'socket.io';
import pool from './db.js';

let io;
const connectedUsers = new Map(); // userId -> socketId

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('authenticate', async (userId) => {
            if (userId) {
                connectedUsers.set(userId, socket.id);
                socket.userId = userId;
                console.log(`User ${userId} authenticated on socket ${socket.id}`);

                // Update last_seen
                await pool.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [userId]);

                // Broadcast online status
                io.emit('user_online', userId);
            }
        });

        socket.on('send_message', async (data) => {
            const { sender_id, receiver_id, message } = data;

            try {
                // Save to database
                const [result] = await pool.query(
                    'INSERT INTO messenger_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
                    [sender_id, receiver_id, message]
                );

                const newMessage = {
                    id: result.insertId,
                    sender_id: sender_id,
                    receiver_id: receiver_id,
                    message,
                    created_at: new Date().toISOString(),
                    is_read: 0
                };

                // Send to receiver if online
                const receiverSocketId = connectedUsers.get(receiver_id);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', newMessage);
                }

                // Send back to sender for confirmation
                socket.emit('message_sent', newMessage);

            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('error', 'Erro ao enviar mensagem');
            }
        });

        socket.on('typing', (data) => {
            const { sender_id, receiver_id } = data;
            const receiverSocketId = connectedUsers.get(receiver_id);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_typing', { sender_id });
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                console.log(`User ${socket.userId} disconnected`);
                io.emit('user_offline', socket.userId);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
