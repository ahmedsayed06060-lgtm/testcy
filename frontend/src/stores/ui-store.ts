import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  commandOpen: boolean;
  engagementFormOpen: boolean;
  jobFormOpen: boolean;
  toggleSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setEngagementFormOpen: (open: boolean) => void;
  setJobFormOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandOpen: false,
  engagementFormOpen: false,
  jobFormOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebar: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setEngagementFormOpen: (engagementFormOpen) => set({ engagementFormOpen }),
  setJobFormOpen: (jobFormOpen) => set({ jobFormOpen }),
}));
