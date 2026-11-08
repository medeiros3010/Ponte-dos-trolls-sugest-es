import React, { useState } from 'react';
import { ItemRPG } from '../types';
import { generateWeeklyBulletin } from '../utils/helpers';
import { X, MessageSquareShare, Copy, Check, ExternalLink } from 'lucide-react';

interface WeeklyBulletinModalProps {
  isOpen: boolean;
  items: ItemRPG[];
  exchangeRate: number;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const WeeklyBulletinModal: React.FC<WeeklyBulletinModalProps> = ({
  isOpen,
  items,
  exchangeRate,
  onClose,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const bulletinText = React.useMemo(() => generateWeeklyBulletin(items, exchangeRate), [items, exchangeRate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(bulletinText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onToast('Boletim completo copiado para o WhatsApp!');
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(bulletinText);
    const link = document.createElement('a');
    link.href = `https://api.whatsapp.com/send?text=${encoded}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border-[#C6AD78]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#3a4419] text-[#F8EDD5] border border-[#C6AD78]">
              <MessageSquareShare className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-rpg text-[#F8EDD5]">
                Boletim da Fila de Compras para WhatsApp
              </h2>
              <p className="text-xs text-[#cfc4a6]">
                Texto formatado com emojis pronto para colar no grupo da Ponte dos Trolls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#cfc4a6] hover:text-[#F8EDD5] p-1.5 rounded-lg hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text Preview */}
        <div className="p-4 sm:p-6 space-y-4 flex-1">
          <pre className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl p-4 text-xs font-mono text-[#302414] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto select-all">
            {bulletinText}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#D6C296] bg-[#FBF4E4] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#48551F]" />
              <span>Abrir no WhatsApp</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] transition-colors shadow-sm cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
