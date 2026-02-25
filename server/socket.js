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
                const numericUserId = Number(userId);
                connectedUsers.set(numericUserId, socket.id);
                socket.userId = numericUserId;

                // Join a room for this user to support multiple tabs/connections
                socket.join(`user_${numericUserId}`);

                console.log(`User ${numericUserId} authenticated on socket ${socket.id} and joined room user_${numericUserId}`);

                // Update last_seen
                await pool.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [numericUserId]);

                // Broadcast online status
                io.emit('user_online', numericUserId);
            }
        });

        socket.on('send_message', async (data) => {
            const { sender_id, receiver_id, message } = data;
            const numericSenderId = Number(sender_id);
            const numericReceiverId = Number(receiver_id);

            try {
                // Save to database
                const [result] = await pool.query(
                    'INSERT INTO messenger_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
                    [numericSenderId, numericReceiverId, message]
                );

                const newMessage = {
                    id: result.insertId,
                    sender_id: numericSenderId,
                    receiver_id: numericReceiverId,
                    message,
                    created_at: new Date().toISOString(),
                    is_read: 0
                };

                // Send to all receiver's connections (rooms support multi-tab)
                io.to(`user_${numericReceiverId}`).emit('receive_message', newMessage);

                // Send back to all sender's connections for confirmation/sync across tabs
                io.to(`user_${numericSenderId}`).emit('message_sent', newMessage);

            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('error', 'Erro ao enviar mensagem');
            }
        });

        socket.on('edit_message', async (data) => {
            const { message_id, new_message, sender_id, receiver_id } = data;
            const numericSenderId = Number(sender_id);
            const numericReceiverId = Number(receiver_id);
            try {
                // Ensure only the sender can edit
                const [result] = await pool.query(
                    'UPDATE messenger_messages SET message = ?, is_edited = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ?',
                    [new_message, message_id, numericSenderId]
                );

                if (result.affectedRows > 0) {
                    const editedMessageResponse = {
                        id: message_id,
                        sender_id: numericSenderId,
                        receiver_id: numericReceiverId,
                        message: new_message,
                        is_edited: 1
                    };

                    io.to(`user_${numericReceiverId}`).emit('message_edited', editedMessageResponse);
                    io.to(`user_${numericSenderId}`).emit('message_edited', editedMessageResponse);
                }
            } catch (error) {
                console.error('Error editing message:', error);
                socket.emit('error', 'Erro ao editar mensagem');
            }
        });

        socket.on('delete_message', async (data) => {
            const { message_id, sender_id, receiver_id } = data;
            const numericSenderId = Number(sender_id);
            const numericReceiverId = Number(receiver_id);
            try {
                const [result] = await pool.query(
                    'UPDATE messenger_messages SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ?',
                    [message_id, numericSenderId]
                );

                if (result.affectedRows > 0) {
                    const deletedMessageResponse = {
                        id: message_id,
                        sender_id: numericSenderId,
                        receiver_id: numericReceiverId,
                        is_deleted: 1
                    };

                    io.to(`user_${numericReceiverId}`).emit('message_deleted', deletedMessageResponse);
                    io.to(`user_${numericSenderId}`).emit('message_deleted', deletedMessageResponse);
                }
            } catch (error) {
                console.error('Error deleting message:', error);
                socket.emit('error', 'Erro ao apagar mensagem');
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
