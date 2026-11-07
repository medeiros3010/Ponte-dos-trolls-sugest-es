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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#122015] border border-[#233a29] rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f3524] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#182b1d] text-[#43aa6a] border border-[#27442d]">
              <MessageSquareShare className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#f4ecd8]">
                Boletim da Fila de Compras para WhatsApp
              </h2>
              <p className="text-xs text-[#8a9d8c]">
                Texto formatado com emojis pronto para colar no grupo da Ponte dos Trolls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#738776] hover:text-[#f3efe6] p-1.5 rounded-lg hover:bg-[#182b1d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text Preview */}
        <div className="p-4 sm:p-6 space-y-4 flex-1">
          <pre className="w-full bg-[#0d160f] border border-[#1e3422] rounded-xl p-4 text-xs font-mono text-[#a8d5b5] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto select-all">
            {bulletinText}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1f3524] bg-[#0e1710]/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-[#c2cbbe] hover:text-[#f4ecd8] bg-[#16271a] hover:bg-[#1f3724] transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#182b1d] hover:bg-[#203a27] text-[#43aa6a] border border-[#27442d] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir no WhatsApp</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] transition-colors shadow-sm"
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
