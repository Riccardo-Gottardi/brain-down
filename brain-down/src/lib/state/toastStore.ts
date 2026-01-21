import { writable, derived } from 'svelte/store';
import type { Toast, ToastType } from './types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ToastState {
  toasts: Toast[];
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

const TOAST_DURATION = 5000; // 5 seconds default

function createToastStore() {
  const { subscribe, update } = writable<ToastState>({ toasts: [] });

  let idCounter = 0;

  function add(message: string, type: ToastType = 'info', duration: number = TOAST_DURATION): string {
    const id = `toast-${++idCounter}`;
    
    const toast: Toast = {
      id,
      message,
      type,
      duration,
    };

    update(state => ({
      toasts: [...state.toasts, toast]
    }));

    // Auto-dismiss after duration (unless duration is 0 for persistent toasts)
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }

    return id;
  }

  function dismiss(id: string) {
    update(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  }

  function clear() {
    update(() => ({ toasts: [] }));
  }

  // Convenience methods for different toast types
  function info(message: string, duration?: number) {
    return add(message, 'info', duration);
  }

  function success(message: string, duration?: number) {
    return add(message, 'success', duration);
  }

  function warning(message: string, duration?: number) {
    return add(message, 'warning', duration);
  }

  function error(message: string, duration?: number) {
    return add(message, 'error', duration);
  }

  return {
    subscribe,
    add,
    dismiss,
    clear,
    info,
    success,
    warning,
    error,
  };
}

export const toastStore = createToastStore();

// Derived store for easy access to toasts array
export const toasts = derived(toastStore, $store => $store.toasts);