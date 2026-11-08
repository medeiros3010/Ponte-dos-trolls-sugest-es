import React, { useState } from 'react';
import { FundingPackage, ADMIN_PASSWORD } from '../types';
import { X, CheckCircle2, Folder, KeyRound, DollarSign, AlertCircle } from 'lucide-react';

interface MoveToCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageItem: FundingPackage | null;
  onConfirmMove: (packageId: string, linkDrive: string, valorCatalogoBRL: number) => void;
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
  const [valorCatalogo, setValorCatalogo] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (packageItem) {
      setLinkDrive(packageItem.linkDrive || '');
      const suggestedCatalogVal = packageItem.valorCatalogoBRL || (packageItem.valorTotalBRL * 1.25);
      setValorCatalogo(suggestedCatalogVal.toFixed(2));
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

    const valorParsed = parseFloat(valorCatalogo.replace(',', '.'));
    if (isNaN(valorParsed) || valorParsed <= 0) {
      setErrorMsg('Informe um valor de catálogo válido em R$.');
      return;
    }

    onConfirmMove(packageItem.id, linkDrive.trim(), valorParsed);
    onToast(`Pacote "${packageItem.titulo}" movido para o Catálogo de Produtos com valor R$ ${valorParsed.toFixed(2)}!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-lg shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Mover para o Catálogo de Produtos
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Finalizar vaquinha e disponibilizar no acervo com valor de aquisição
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs text-[#302414]">
          
          <div className="p-3.5 bg-[#FBF4E4] border border-[#D6C296] rounded-2xl space-y-2">
            <h3 className="font-bold text-[#302414] text-sm font-rpg">{packageItem.titulo}</h3>
            <div className="flex items-center gap-3 text-[11px] text-[#71634D]">
              <span>Valor Original: <strong className="text-[#302414] font-mono">R$ {packageItem.valorTotalBRL.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Cotistas: <strong className="text-[#48551F]">{packageItem.apoiadores.length} membros</strong></span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#302414] mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-[#716016]" />
              <span>Valor do Pacote no Catálogo (R$) *:</span>
            </label>
            <input
              type="text"
              required
              value={valorCatalogo}
              onChange={(e) => setValorCatalogo(e.target.value)}
              placeholder="Ex: 120.00"
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono font-bold focus:outline-none focus:border-[#48551F]"
            />
            <p className="text-[11px] text-[#71634D] mt-1">
              O valor de aquisição no Catálogo normalmente possui acréscimo em relação ao rateio original.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#71634D] mb-1 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-[#71634D]" />
              <span>Link da Pasta no Google Drive (para acesso dos membros):</span>
            </label>
            <input
              type="url"
              value={linkDrive}
              onChange={(e) => setLinkDrive(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#302414] mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-[#716016]" />
              <span>Senha do Mestre para Confirmar:</span>
            </label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Digite a senha de administrador..."
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D6C296]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Confirmar Transferência
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
