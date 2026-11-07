import React, { useState, useEffect } from 'react';
import { ItemRPG, ADMIN_PASSWORD } from '../types';
import { AlertTriangle, Trash2, X, Lock, AlertCircle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: ItemRPG | null;
  onConfirm: () => void;
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

  if (!isOpen || !item) return null;

  const handleConfirm = () => {
    if (password !== ADMIN_PASSWORD) {
      setErrorMessage('Senha incorreta! Digite a senha de administrador.');
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#122015] border border-[#3d2023] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2d1b1d] flex items-center justify-between bg-[#191012]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#2e1417] text-[#e06c75] border border-[#4d1f24]">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#f4ecd8]">
              Confirmar Exclusão
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-[#738776] hover:text-[#f4ecd8] p-1.5 rounded-lg hover:bg-[#201416] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs sm:text-sm text-[#c2cbbe]">
          <p>
            Tem certeza que deseja excluir o item{' '}
            <strong className="text-[#f4ecd8] font-bold">"{item.nome}"</strong>?
          </p>

          <div className="p-3 bg-[#0d160f] border border-[#203625] rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 text-[#8e9f90]">
              <span>Sistema:</span>
              <strong className="text-[#d49e2a]">{item.sistema}</strong>
            </div>
            <div className="flex items-center gap-2 text-[#8e9f90]">
              <span>Apoiadores:</span>
              <strong className="text-[#f4ecd8]">{item.apoiadores?.length || 0} pessoa(s)</strong>
            </div>
          </div>

          {/* Admin Password Input */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-[#f4ecd8] mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#e06c75]" />
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
              className="w-full bg-[#0d160f] border border-[#3d2023] focus:border-[#e06c75] rounded-xl px-3 py-2 text-xs text-[#f3efe6] font-mono focus:outline-none"
              autoFocus
            />
            {errorMessage && (
              <div className="mt-1.5 text-xs text-[#e06c75] font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#a37075]">
            Esta ação não poderá ser desfeita e removerá o item da lista e da nuvem imediatamente.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#2d1b1d] bg-[#140e10] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#1a251c] hover:bg-[#203223] transition-colors border border-[#273d2a] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#c53945] hover:bg-[#dc4452] transition-colors shadow-md shadow-black/40 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Sim, Excluir</span>
          </button>
        </div>

      </div>
    </div>
  );
};
