import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface ToastMessageItem {
  id: string;
  message: string;
}

interface ToastProps {
  message?: string | null;
  onClose?: () => void;
  toasts?: ToastMessageItem[];
  onRemoveToast?: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  onClose,
  toasts,
  onRemoveToast,
}) => {
  // Constrói lista de mensagens unificada
  const items: ToastMessageItem[] = [];
  if (toasts && toasts.length > 0) {
    items.push(...toasts);
  } else if (message) {
    items.push({ id: 'single-toast', message });
  }

  if (items.length === 0) return null;

  return (
    <div
      className="fixed top-18 sm:top-20 right-3 sm:right-6 z-[60] flex flex-col items-end gap-2 max-w-sm w-full pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto w-auto max-w-[calc(100vw-2rem)] flex items-center gap-2.5 bg-[#282D13]/95 text-[#F8EDD5] border border-[#C6AD78] px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 text-xs backdrop-blur-md"
        >
          <CheckCircle2 className="w-4 h-4 text-[#D4A538] shrink-0" />
          <span className="font-medium leading-snug break-words">{item.message}</span>
          <button
            type="button"
            onClick={() => {
              if (onRemoveToast && item.id !== 'single-toast') {
                onRemoveToast(item.id);
              } else if (onClose) {
                onClose();
              }
            }}
            className="ml-2 text-[#cfc4a6] hover:text-[#F8EDD5] p-0.5 rounded transition-colors cursor-pointer shrink-0"
            aria-label="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
