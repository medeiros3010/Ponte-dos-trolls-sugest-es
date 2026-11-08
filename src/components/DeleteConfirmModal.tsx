import React, { useState, useEffect } from 'react';
import { ItemRPG } from '../types';
import { AlertTriangle, Trash2, X, Lock, AlertCircle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: ItemRPG | null;
  onConfirm: (adminPassword?: string) => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  onConfirm,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMessage('');
    }
  }, [isOpen, item]);

  const handleConfirm = () => {
    if (!password.trim()) {
      setErrorMessage('Digite a senha de administrador.');
      return;
    }
    onConfirm(password.trim());
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="parchment-card border-2 border-[#8b261b]/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#3f471e] flex items-center justify-between bg-[#282D13] text-[#F8EDD5]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#3a4419] text-[#F8EDD5] border border-[#C6AD78]">
              <AlertTriangle className="w-5 h-5 text-[#f4ecd8]" />
            </span>
            <h2 className="text-base sm:text-lg font-bold font-rpg text-[#F8EDD5]">
              Confirmar Exclusão
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-[#cfc4a6] hover:text-[#F8EDD5] p-1.5 rounded-lg hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs sm:text-sm text-[#302414]">
          <p>
            Tem certeza que deseja excluir o item{' '}
            <strong className="text-[#302414] font-bold">"{item.nome}"</strong>?
          </p>

          <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 text-[#71634D]">
              <span>Sistema:</span>
              <strong className="text-[#302414] font-semibold">{item.sistema}</strong>
            </div>
            <div className="flex items-center gap-2 text-[#71634D]">
              <span>Apoiadores:</span>
              <strong className="text-[#302414] font-semibold">{item.apoiadores?.length || 0} pessoa(s)</strong>
            </div>
          </div>

          {/* Admin Password Input */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-[#302414] mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#8b261b]" />
              <span>Digite a senha de administrador para excluir:</span>
            </label>
            <input
              type="password"
              placeholder="Senha do admin..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] focus:border-[#8b261b] rounded-xl px-3 py-2 text-xs text-[#302414] font-mono focus:outline-none"
              autoFocus
            />
            {errorMessage && (
              <div className="mt-1.5 text-xs text-[#8b261b] font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#8b261b]">
            Esta ação não poderá ser desfeita e removerá o item da lista e da nuvem imediatamente.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#D6C296] bg-[#FBF4E4] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] transition-colors border border-[#C6AD78] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#8b261b] hover:bg-[#a12e20] transition-colors shadow-sm active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Sim, Excluir</span>
          </button>
        </div>

      </div>
    </div>
  );
};
