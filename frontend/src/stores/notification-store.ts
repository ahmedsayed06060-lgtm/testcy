import { create } from 'zustand';

export interface AppNotification { id: string; title: string; message: string; read: boolean; link?: string }
interface NotificationState { items: AppNotification[]; add: (item: AppNotification) => void; markAllRead: () => void }
export const useNotificationStore = create<NotificationState>((set) => ({
  items: [], add: (item) => set((state) => ({ items: [item, ...state.items].slice(0, 100) })),
  markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
}));
