import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

const socket = io(SOCKET_URL);

socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('WebSocket disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('WebSocket connection error:', err.message);
});

export { socket };
