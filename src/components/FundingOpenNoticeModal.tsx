import React, { useState } from 'react';
import { FundingPackage } from '../types';
import { X, Copy, Check, Share2, Megaphone, AlertTriangle } from 'lucide-react';
import { generateFundingOpenAnnouncement, validateFundingOpenInfo } from '../utils/helpers';

interface FundingOpenNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageItem: FundingPackage | null;
  onToast: (msg: string) => void;
}

export const FundingOpenNoticeModal: React.FC<FundingOpenNoticeModalProps> = ({
  isOpen,
  onClose,
  packageItem,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !packageItem) return null;

  const fullMessage = generateFundingOpenAnnouncement(packageItem);
  const missingInfo = validateFundingOpenInfo(packageItem);

  const handleCopy = async () => {
    try {
      if (missingInfo.length > 0) {
        onToast(`Atenção: ${missingInfo.join(', ')} pendente(s) no cadastro deste financiamento.`);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullMessage);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullMessage;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      onToast('Divulgação de financiamento aberto copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
      onToast('Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="parchment-card w-full max-w-xl shadow-2xl flex flex-col overflow-hidden border-[#C6AD78] max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#d4a538]">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Divulgação — Financiamento Aberto
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Mensagem oficial pronta para divulgação e atração de cotistas no WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs text-[#302414]">
          
          {missingInfo.length > 0 && (
            <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/60 text-[#78350F] text-[11px] flex items-start gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Informação(ões) pendente(s) no cadastro:</p>
                <p className="leading-relaxed">
                  {missingInfo.join(', ')}. Recomendamos editar o pacote para preencher essas informações antes de divulgar.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-[#302414] text-xs flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#48551F]" />
                <span>Prévia da Mensagem (Formato WhatsApp):</span>
              </label>
              <span className="text-[10px] text-[#71634D]">Cálculo do teto individual com arredondamento para cima</span>
            </div>

            <div className="p-4 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl font-mono text-[11.5px] leading-relaxed text-[#2c2214] whitespace-pre-wrap select-all shadow-inner max-h-72 overflow-y-auto">
              {fullMessage}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#EDE2CA] border-t border-[#D6C296] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Fechar
          </button>
          
          <button
            type="button"
            onClick={handleCopy}
            className="px-5 py-2.5 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#a8d363]" />
                <span>Divulgação Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Divulgação</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
