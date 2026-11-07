import React, { useState } from 'react';
import { FundingPackage, ADMIN_PASSWORD } from '../types';
import { X, CheckCircle2, Folder, KeyRound, AlertCircle } from 'lucide-react';

interface MoveToCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageItem: FundingPackage | null;
  onConfirmMove: (packageId: string, linkDrive: string) => void;
  onToast: (msg: string) => void;
}

export const MoveToCatalogModal: React.FC<MoveToCatalogModalProps> = ({
  isOpen,
  onClose,
  packageItem,
  onConfirmMove,
  onToast,
}) => {
  const [linkDrive, setLinkDrive] = useState(packageItem?.linkDrive || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (packageItem) {
      setLinkDrive(packageItem.linkDrive || '');
      setAdminPassword('');
      setErrorMsg('');
    }
  }, [packageItem, isOpen]);

  if (!isOpen || !packageItem) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== ADMIN_PASSWORD) {
      setErrorMsg('Senha do Mestre incorreta! Acesso negado.');
      return;
    }

    onConfirmMove(packageItem.id, linkDrive.trim());
    onToast(`Pacote "${packageItem.titulo}" movido para o Catálogo de Produtos!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#43aa6a]/70 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#173320] to-[#122015] border-b border-[#25462d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f4228] border border-[#43aa6a]/50 flex items-center justify-center text-[#6ee7b7]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
                Mover para o Catálogo de Produtos
              </h2>
              <p className="text-[11px] text-[#8a9d8c]">
                Finalizar vaquinha e disponibilizar no acervo do grupo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a8e7d] hover:text-[#f1ede4] hover:bg-[#1a2f20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          
          <div className="p-3.5 bg-[#0c150e] border border-[#203625] rounded-2xl space-y-2">
            <h3 className="font-bold text-[#f4ecd8] text-sm">{packageItem.titulo}</h3>
            <div className="flex items-center gap-3 text-[11px] text-[#a4b5a6]">
              <span>Valor: <strong className="text-[#d49e2a] font-mono">R$ {packageItem.valorTotalBRL.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Cotistas: <strong className="text-[#6ee7b7]">{packageItem.apoiadores.length} membros</strong></span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#a4b5a6] mb-1">
              Link da Pasta no Google Drive (para acesso dos membros):
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
              <input
                type="url"
                value={linkDrive}
                onChange={(e) => setLinkDrive(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
              />
            </div>
            <p className="text-[11px] text-[#7a8e7d] mt-1">
              Os membros poderão clicar no link do Drive diretamente pelo Catálogo para baixar os materiais.
            </p>
          </div>

          <div className="pt-2 border-t border-[#1f3524] space-y-1.5">
            <label className="block font-semibold text-[#d49e2a] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Senha do Mestre para confirmar finalização:</span>
            </label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Digite a senha de administrador..."
              className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
              autoFocus
            />
          </div>

          {errorMsg && (
            <p className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#8a9d8c] hover:text-[#f1ede4] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#43aa6a] hover:bg-[#52c27c] text-[#122015] font-bold shadow-lg shadow-black/40 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Mover para o Catálogo</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
