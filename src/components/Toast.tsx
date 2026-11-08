import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-[#282D13] border border-[#C6AD78] text-[#F8EDD5] px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200 text-xs">
      <CheckCircle2 className="w-4 h-4 text-[#D4A538] shrink-0" />
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-[#cfc4a6] hover:text-[#F8EDD5] p-0.5 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
