import React from 'react';
import { useDataStore } from '../store/data';

export function Toasts() {
  const { toasts, removeToast } = useDataStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded border shadow-lg flex justify-between items-start gap-4 transition-all transform translate-y-0 opacity-100 ${
            toast.type === 'success'
              ? 'bg-primary text-surface border-primary-dark'
              : toast.type === 'error'
              ? 'bg-copper text-surface border-copper'
              : 'bg-surface-container text-on-surface border-outline-variant'
          }`}
        >
          <div>
            <h4 className="font-bold text-sm leading-tight mb-1">{toast.title}</h4>
            <p className="text-xs opacity-90">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-xs opacity-75 hover:opacity-100 material-symbols-outlined"
          >
            close
          </button>
        </div>
      ))}
    </div>
  );
}
