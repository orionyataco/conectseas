import { Server } from 'socket.io';
import pool from './db.js';

let io;
const connectedUsers = new Map(); // userId -> Set of socketIds

const updateActiveUsersLastSeen = async () => {
    if (connectedUsers.size === 0) return;
    try {
        const userIds = Array.from(connectedUsers.keys());
        await pool.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id IN (?)', [userIds]);
        // console.log(`Updated last_seen for active users: ${userIds.join(', ')}`);
    } catch (error) {
        console.error('Error updating active users last_seen:', error);
    }
};

// Update last_seen for all connected users every 4 minutes
setInterval(updateActiveUsersLastSeen, 4 * 60 * 1000);

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
                
                if (!connectedUsers.has(numericUserId)) {
                    connectedUsers.set(numericUserId, new Set());
                }
                connectedUsers.get(numericUserId).add(socket.id);
                
                socket.userId = numericUserId;

                // Join a room for this user to support multiple tabs/connections
                socket.join(`user_${numericUserId}`);

                console.log(`User ${numericUserId} authenticated on socket ${socket.id} (total sessions: ${connectedUsers.get(numericUserId).size})`);

                // Update last_seen immediately on auth
                await pool.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [numericUserId]);

                // Always broadcast online status (frontend will handle deduplication if already online)
                io.emit('user_online', numericUserId);

                // Join rooms for all projects the user is a member of
                const [memberships] = await pool.query('SELECT project_id FROM project_members WHERE user_id = ?', [numericUserId]);
                memberships.forEach(m => {
                    socket.join(`project_${m.project_id}`);
                    console.log(`User ${numericUserId} joined project room: project_${m.project_id}`);
                });
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

        socket.on('mark_read', async (data) => {
            const { sender_id, receiver_id } = data; // sender_id is the person who sent the messages being read
            try {
                await pool.query(
                    'UPDATE messenger_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
                    [Number(sender_id), Number(receiver_id)]
                );

                // Notify the sender that their messages were read
                io.to(`user_${sender_id}`).emit('messages_read', { reader_id: receiver_id });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId) {
                const userSockets = connectedUsers.get(socket.userId);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        connectedUsers.delete(socket.userId);
                        console.log(`User ${socket.userId} fully disconnected (all tabs closed)`);
                        io.emit('user_offline', socket.userId);
                    } else {
                        console.log(`User ${socket.userId} closed one tab (remaining tabs: ${userSockets.size})`);
                    }
                }
            }
        });

        // Add explicit project join/leave if needed
        socket.on('join_project', (projectId) => {
            socket.join(`project_${projectId}`);
            console.log(`Socket ${socket.id} explicitly joined project_${projectId}`);
        });

        socket.on('leave_project', (projectId) => {
            socket.leave(`project_${projectId}`);
            console.log(`Socket ${socket.id} left project_${projectId}`);
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
