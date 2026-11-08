import React, { useState } from 'react';
import { FundingPackage, UserProfile } from '../types';
import { formatDateDisplay } from '../utils/helpers';
import { X, Copy, Check, Calendar, DollarSign, AlertCircle, ShieldAlert } from 'lucide-react';

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  pkg?: FundingPackage | null;
  packageItem?: FundingPackage | null;
  currentUser: UserProfile;
  onClose: () => void;
  onConfirmPayment: (pkgId: string, memberId: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export const PaymentInstructionsModal: React.FC<PaymentInstructionsModalProps> = ({
  isOpen,
  pkg,
  packageItem,
  currentUser,
  onClose,
  onConfirmPayment,
  onToast,
}) => {
  const currentPkg = packageItem || pkg;
  const [copiedPix, setCopiedPix] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentPkg) return null;

  const valorFinal = currentPkg.valorFinalPorParticipante || (currentPkg.valorTotalBRL / (currentPkg.apoiadores.length || currentPkg.minimoParticipantes || 1));
  const chavePix = currentPkg.chavePix || '';
  const isBillingConfigured = Boolean(chavePix);

  const handleCopyPix = () => {
    if (!chavePix) return;
    navigator.clipboard.writeText(chavePix);
    setCopiedPix(true);
    onToast('Chave Pix copiada para a área de transferência!');
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleExecutePaymentConfirmation = async () => {
    try {
      setIsSubmitting(true);
      await onConfirmPayment(currentPkg.id, currentUser.id);
      onToast('Pagamento informado com sucesso! O Mestre fará a conferência.');
      setShowConfirmDialog(false);
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Erro ao registrar confirmação de pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-[#d6be8c]" />
            <div>
              <h3 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5] leading-tight">
                Instruções de Pagamento Pix
              </h3>
              <p className="text-[11px] text-[#cfc4a6]">
                A Ponte dos Trolls · Vaquinhas & Rateios RPG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 text-[#302414]">
          {/* Nome do Financiamento */}
          <div className="p-3.5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] space-y-1">
            <span className="text-[10px] text-[#71634D] uppercase tracking-wider font-semibold block">
              Financiamento:
            </span>
            <span className="font-bold text-sm sm:text-base text-[#302414] block leading-tight font-rpg">
              {currentPkg.titulo}
            </span>
          </div>

          {!isBillingConfigured ? (
            <div className="p-4 rounded-2xl bg-[#FFF6DE] border border-[#D4A538] text-[#875508] space-y-2 text-center">
              <AlertCircle className="w-6 h-6 text-[#D4A538] mx-auto" />
              <p className="font-bold text-xs">
                A cobrança deste pacote ainda está sendo configurada pelo Mestre da Ponte.
              </p>
              <p className="text-[11px] text-[#71634D]">
                A chave Pix e o valor exato serão disponibilizados em breve. Por favor aguarde antes de realizar transferências.
              </p>
            </div>
          ) : (
            <>
              {/* Destaque do Valor e Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#EDE2CA] border border-[#C6AD78]">
                  <span className="text-[10px] text-[#716016] uppercase tracking-wider font-bold block">
                    Valor a Pagar:
                  </span>
                  <span className="font-mono text-2xl font-bold text-[#302414] mt-0.5 block">
                    R$ {valorFinal.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-[#71634D] block mt-0.5">
                    Valor exato da sua cota individual
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296]">
                  <span className="text-[10px] text-[#71634D] uppercase tracking-wider font-semibold block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#48551F]" />
                    <span>Pagar até:</span>
                  </span>
                  <span className="font-mono text-base font-bold text-[#302414] mt-1 block">
                    {formatDateDisplay(currentPkg.dataPagamento)}
                  </span>
                  <span className="text-[10px] text-[#71634D] block mt-0.5">
                    Evite atrasos para manter sua conta sem strikes!
                  </span>
                </div>
              </div>

              {/* Chave Pix & Ação de Copiar */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#716016] block">
                  Chave Pix do Rateio:
                </label>
                <div className="flex items-center justify-between gap-2 bg-[#FAF4E6] p-2.5 rounded-xl border border-[#C6AD78]">
                  <span className="font-mono text-xs font-semibold text-[#302414] select-all break-all">
                    {chavePix}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-3 py-1.5 rounded-lg bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPix ? 'Copiada!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Instruções do Mestre */}
              {currentPkg.instrucoesPix && (
                <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#71634D] block">
                    Instruções do Mestre:
                  </span>
                  <p className="text-xs text-[#302414] whitespace-pre-wrap leading-relaxed">
                    {currentPkg.instrucoesPix}
                  </p>
                </div>
              )}

              {/* Botão de Confirmação de Pagamento */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(true)}
                  className="w-full py-3 px-4 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Já realizei o Pix! Confirmar pagamento no site</span>
                </button>
              </div>
            </>
          )}

          {/* Diálogo de Confirmação Secundário */}
          {showConfirmDialog && (
            <div className="p-4 rounded-2xl bg-[#FFF6DE] border-2 border-[#D4A538] space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#D4A538] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-xs text-[#322105] block">
                    Você confirma que já realizou o Pix no seu banco?
                  </span>
                  <p className="text-[11px] text-[#71634D] leading-relaxed">
                    O Mestre da Ponte fará o batimento do comprovante com o extrato. Declarar pagamento sem ter feito o Pix acarreta advertência (strike).
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-3.5 py-1.5 bg-[#EADBBE] rounded-lg text-xs font-semibold text-[#302414]"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleExecutePaymentConfirmation}
                  className="px-4 py-1.5 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-lg text-xs font-bold shadow-sm"
                >
                  {isSubmitting ? 'Confirmando...' : 'Sim, Pix Realizado'}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
