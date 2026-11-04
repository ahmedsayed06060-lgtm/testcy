'use client';

import { io, type Socket } from 'socket.io-client';
import { useNotificationStore } from '@/stores/notification-store';

let socket: Socket | null = null;
export function connectNotifications(accessToken: string) {
  if (!process.env.NEXT_PUBLIC_API_URL || socket?.connected) return socket;
  const endpoint = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
  socket = io(endpoint, { path: '/ws/notifications', auth: { token: accessToken }, transports: ['websocket'], withCredentials: true });
  socket.on('notification', (item) => useNotificationStore.getState().add(item));
  return socket;
}
export function disconnectNotifications() { socket?.disconnect(); socket = null; }
