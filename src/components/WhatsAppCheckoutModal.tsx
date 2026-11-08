import React, { useState, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  ExternalLink,
  Check,
  Package,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { FundingPackage, UserProfile } from '../types';

interface WhatsAppCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FundingPackage[];
  currentUser: UserProfile | null;
  masterPhone?: string;
  onToast: (msg: string) => void;
}

export const WhatsAppCheckoutModal: React.FC<WhatsAppCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  masterPhone = '(19) 98151-2030',
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  const totalBRL = useMemo(() => {
    return items.reduce((acc, pkg) => {
      const price = typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : pkg.valorTotalBRL;
      return acc + (price || 0);
    }, 0);
  }, [items]);

  // Mensagem padronizada conforme as especificações do prompt
  const messageText = useMemo(() => {
    const lines: string[] = ['Olá, Mestre! Quero adquirir estes itens:', ''];

    items.forEach((pkg) => {
      const price = (typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : pkg.valorTotalBRL)
        .toFixed(2)
        .replace('.', ',');

      // Regra de link da pasta: se houver link público cadastrado, exibe; caso contrário, proteção de acesso
      const driveInfo = pkg.linkDrive && pkg.linkDrive.trim()
        ? pkg.linkDrive.trim()
        : 'Pasta ainda não disponibilizada';

      lines.push(`${pkg.titulo} — R$ ${price} — ${driveInfo}`);
    });

    lines.push('');
    lines.push(`Total: R$ ${totalBRL.toFixed(2).replace('.', ',')}`);
    lines.push('');
    lines.push(`Nome: ${currentUser?.nome || ''}`);
    lines.push(`E-mail: ${currentUser?.email || ''}`);
    lines.push(`Telefone: ${currentUser?.telefone || ''}`);

    return lines.join('\n');
  }, [items, totalBRL, currentUser]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    onToast('Mensagem copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = (masterPhone || '5519981512030').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const encodedText = encodeURIComponent(messageText);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[88] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#39421b] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <MessageCircle className="w-5 h-5 text-[#a8d363]" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Finalizar Pedido pelo WhatsApp
              </h2>
              <p className="text-[11px] text-[#A69371]">
                Envie os detalhes da sua aquisição diretamente ao Mestre da mesa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A69371] hover:text-[#F8EDD5] rounded-xl hover:bg-[#39421b] transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-[#302414] space-y-4">
          
          {/* Resumo do Pedido */}
          <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-rpg text-xs font-bold uppercase tracking-wider text-[#71634D]">
                Itens Selecionados ({items.length})
              </span>
              <span className="font-mono text-base font-bold text-[#48551F]">
                Total: R$ {totalBRL.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="divide-y divide-[#E3D1AC] max-h-36 overflow-y-auto pr-1">
              {items.map((pkg) => {
                const price = typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : pkg.valorTotalBRL;
                return (
                  <div key={pkg.id} className="py-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#302414] truncate max-w-[70%]">
                      • {pkg.titulo}
                    </span>
                    <span className="font-mono font-bold text-[#302414]">
                      R$ {price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prévia da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#302414]">
                Prévia da Mensagem para o WhatsApp:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-[#48551F] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#48551F]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar texto'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={8}
              value={messageText}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl p-3 text-xs text-[#302414] font-mono leading-relaxed resize-none focus:outline-none select-text"
            />
          </div>

          {/* Aviso Importante de Fluxo */}
          <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-[11px] text-[#71634D] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#716016] shrink-0 mt-0.5" />
            <p>
              Abrir o WhatsApp não confirma o pagamento nem cria a aquisição automaticamente. Após o envio e a conferência do Pix pelo Mestre, ele registrará a liberação e os itens aparecerão no seu acervo em <strong>“Meus itens”</strong>.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#EDE2CA] border-t border-[#D6C296] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[#48551F]" /> : <Copy className="w-4 h-4 text-[#716016]" />}
            <span>{copied ? '✓ Mensagem Copiada!' : 'Copiar Mensagem'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir WhatsApp do Mestre</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
