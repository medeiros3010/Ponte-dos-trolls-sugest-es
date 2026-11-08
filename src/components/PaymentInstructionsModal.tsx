import React, { useState } from 'react';
import { FundingPackage, UserProfile } from '../types';
import { formatDateDisplay } from '../utils/helpers';
import {
  X,
  Copy,
  Check,
  Calendar,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Phone,
  Loader2,
} from 'lucide-react';

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
  const [step, setStep] = useState<'instrucoes' | 'confirmacao'>('instrucoes');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !currentPkg) return null;

  const valorFinal =
    currentPkg.valorFinalPorParticipante ||
    currentPkg.valorTotalBRL /
      (currentPkg.apoiadores?.length || currentPkg.minimoParticipantes || 1);
  const chavePix = currentPkg.chavePix || '';
  const isBillingConfigured = Boolean(chavePix);

  const handleCopyPix = () => {
    if (!chavePix) return;
    navigator.clipboard.writeText(chavePix);
    setCopiedPix(true);
    onToast('Chave Pix copiada para a área de transferência!');
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleCopyPhone = () => {
    if (!currentUser.telefone) return;
    navigator.clipboard.writeText(currentUser.telefone);
    setCopiedPhone(true);
    onToast('Telefone copiado para a área de transferência!');
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  const handleConfirmPaymentSubmission = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onConfirmPayment(currentPkg.id, currentUser.id);
      onToast('Pagamento informado com sucesso!');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao registrar pagamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-[#d6be8c]" />
            <div>
              <h3 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5] leading-tight">
                {step === 'instrucoes' ? 'Instruções de Pagamento Pix' : 'Confirmação de Pagamento'}
              </h3>
              <p className="text-[11px] text-[#cfc4a6]">
                A Ponte dos Trolls · Vaquinhas & Rateios RPG
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {step === 'instrucoes' ? (
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
                      className="px-3 py-1.5 rounded-lg bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-all"
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

                {/* Aviso fixo e destacado obrigatório */}
                <div className="p-3.5 rounded-2xl bg-[#FFF6DE] border-2 border-[#D4A538] space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-[#875508] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-[#5a3805] block">
                        Identificação obrigatória na transferência:
                      </span>
                      <p className="text-xs text-[#55482e] leading-relaxed font-medium">
                        Na descrição do Pix, coloque seu número de telefone cadastrado no site para identificarmos o pagamento.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FAF4E6] p-2.5 rounded-xl border border-[#C6AD78] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <Phone className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                      <span className="text-[#71634D] truncate">Seu telefone:</span>
                      <strong className="font-mono text-[#302414] truncate">
                        {currentUser.telefone || '(Nenhum telefone cadastrado)'}
                      </strong>
                    </div>
                    {currentUser.telefone && (
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="px-2.5 py-1 rounded-lg bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] font-semibold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                      >
                        {copiedPhone ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3 text-[#716016]" />}
                        <span>{copiedPhone ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Orientação final e Botão para avançar à confirmação curta */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-[#71634D] text-center font-medium">
                    Depois de fazer o Pix no aplicativo do banco, confirme aqui no site.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setStep('confirmacao');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Já fiz o Pix — confirmar pagamento</span>
                  </button>
                </div>
              </>
            )}

          </div>
        ) : (
          /* Confirmação Curta e Centralizada (substitui a tela inteira) */
          <div className="p-6 sm:p-8 text-center space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-[#EADBBE] border-2 border-[#C6AD78] flex items-center justify-center text-[#716016] mx-auto shadow-inner">
              <DollarSign className="w-7 h-7 text-[#48551F]" />
            </div>

            <h3 className="font-rpg text-lg sm:text-xl font-bold text-[#302414] leading-snug">
              Você confirma que já pagou este financiamento?
            </h3>

            {/* Nome do pacote destacado abaixo */}
            <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs font-semibold text-[#302414] max-w-sm mx-auto shadow-sm">
              <div className="text-xs font-bold text-[#302414] line-clamp-2">
                📦 {currentPkg.titulo}
              </div>
              <div className="text-[#71634D] font-mono mt-1 font-normal">
                Valor da sua cota: <strong className="text-[#302414]">R$ {valorFinal.toFixed(2).replace('.', ',')}</strong>
              </div>
            </div>

            <p className="text-xs text-[#71634D] leading-relaxed max-w-sm mx-auto">
              Esta confirmação é uma declaração sua para conferência pelo Mestre da Ponte.
            </p>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#fae5e5] border border-[#d69696] text-[#8b261b] text-xs text-left">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setErrorMessage('');
                  setStep('instrucoes');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] font-semibold text-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPaymentSubmission}
                className="px-6 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Sim, já paguei</span>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
