import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NavigationState {
  activeSection: 'my-stuff' | 'layout-pick' | 'plan-picks';
  activeView: 'weekly' | 'monthly' | 'daily';
  currentDate: Date;
  setSection: (section: NavigationState['activeSection']) => void;
  setView: (view: NavigationState['activeView']) => void;
  setCurrentDate: (date: Date) => void;
  navigateDay: (direction: 'prev' | 'next') => void;
  navigateWeek: (direction: 'prev' | 'next') => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      activeSection: 'my-stuff',
      activeView: 'weekly',
      currentDate: new Date(),

      setSection: (section) => set({ activeSection: section }),

      setView: (view) => set({ activeView: view }),

      setCurrentDate: (date) => set({ currentDate: date }),

      navigateDay: (direction) =>
        set((state) => {
          const newDate = new Date(state.currentDate);
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
          return { currentDate: newDate };
        }),

      navigateWeek: (direction) =>
        set((state) => {
          const newDate = new Date(state.currentDate);
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
          return { currentDate: newDate };
        }),

      navigateMonth: (direction) =>
        set((state) => {
          const newDate = new Date(state.currentDate);
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
          return { currentDate: newDate };
        }),
    }),
    {
      name: 'bushybeaver-navigation',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Rehydrate the Date object
          if (parsed.state?.currentDate) {
            parsed.state.currentDate = new Date(parsed.state.currentDate);
          }
          return parsed;
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
