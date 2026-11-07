import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-[#142618] border border-[#d49e2a]/60 text-[#f4ecd8] px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200 text-xs">
      <CheckCircle2 className="w-4 h-4 text-[#d49e2a] shrink-0" />
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-[#738776] hover:text-[#f3efe6] p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
