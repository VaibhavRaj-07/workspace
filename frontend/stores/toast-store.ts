import { create } from 'zustand';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'merged';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, item] }));

    const duration = toast.duration || (toast.type === 'error' ? 6000 : 4000);
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);

    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'success' }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'error' }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'warning' }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'info' }),
  merged: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'merged' }),
};
