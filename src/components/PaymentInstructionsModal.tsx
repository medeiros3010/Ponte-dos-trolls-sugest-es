import React, { useState } from 'react';
import { FundingPackage, UserProfile } from '../types';
import { formatDateDisplay } from '../utils/helpers';
import { X, Copy, Check, Calendar, DollarSign, Key, Phone, AlertCircle, Info, ShieldAlert } from 'lucide-react';

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  pkg: FundingPackage | null;
  currentUser: UserProfile;
  onClose: () => void;
  onConfirmPayment: (pkgId: string, memberId: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export const PaymentInstructionsModal: React.FC<PaymentInstructionsModalProps> = ({
  isOpen,
  pkg,
  currentUser,
  onClose,
  onConfirmPayment,
  onToast,
}) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !pkg) return null;

  const valorFinal = pkg.valorFinalPorParticipante || (pkg.valorTotalBRL / (pkg.apoiadores.length || pkg.minimoParticipantes || 1));
  const chavePix = pkg.chavePix || '';
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
    onToast('Seu número de telefone foi copiado!');
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  const handleTriggerConfirm = () => {
    setShowConfirmDialog(true);
  };

  const handleExecutePaymentConfirmation = async () => {
    try {
      setIsSubmitting(true);
      await onConfirmPayment(pkg.id, currentUser.id);
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
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/70 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1e3422] to-[#122015] border-b border-[#203625] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#d49e2a]">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8] leading-tight">
                Instruções de Pagamento Pix
              </h3>
              <p className="text-[11px] text-[#8a9d8c]">
                A Ponte dos Trolls · Vaquinhas & Rateios RPG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] hover:bg-[#1a2f20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Nome do Financiamento */}
          <div className="p-3.5 rounded-2xl bg-[#0c150e] border border-[#203625] space-y-1">
            <span className="text-[10px] text-[#7a8e7d] uppercase tracking-wider font-semibold block">
              Financiamento:
            </span>
            <span className="font-bold text-sm sm:text-base text-[#f4ecd8] block leading-tight">
              {pkg.titulo}
            </span>
          </div>

          {!isBillingConfigured ? (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2 text-center">
              <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
              <p className="font-bold text-xs">
                A cobrança deste pacote ainda está sendo configurada pelo Mestre da Ponte.
              </p>
              <p className="text-[11px] text-[#c7d5c9]">
                A chave Pix e o valor exato serão disponibilizados em breve. Por favor aguarde antes de realizar transferências.
              </p>
            </div>
          ) : (
            <>
              {/* Destaque do Valor e Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1a3320] to-[#0f1d13] border-2 border-[#d49e2a]/80 shadow-md">
                  <span className="text-[10px] text-[#d49e2a] uppercase tracking-wider font-bold block">
                    Valor a Pagar:
                  </span>
                  <span className="font-rpg text-xl sm:text-2xl font-bold text-[#fbbf24] mt-0.5 block">
                    R$ {valorFinal.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-[#8a9d8c] block mt-0.5">
                    Valor exato da sua cota individual
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0e1911] border border-[#203625]">
                  <span className="text-[10px] text-[#7a8e7d] uppercase tracking-wider font-semibold block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pagar até:</span>
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-[#f4ecd8] mt-1 block">
                    {formatDateDisplay(pkg.dataPagamento)}
                  </span>
                  <span className="text-[10px] text-[#8a9d8c] block mt-0.5">
                    Evite atrasos para não levar strikes!
                  </span>
                </div>
              </div>

              {/* Caixa da Chave Pix */}
              <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#233a29] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#f4ecd8] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chave Pix Oficial do Mestre:</span>
                  </span>
                  <span className="text-[10px] text-[#7a8e7d]">Destinatário oficial</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl bg-[#142318] border border-[#27442d] font-mono text-xs text-[#f3efe6] select-all break-all">
                    {chavePix}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-4 py-2.5 rounded-xl bg-[#1f3825] hover:bg-[#284a30] text-[#6ee7b7] border border-[#34d399]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4 text-[#34d399]" />
                        <span>Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar chave Pix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instruções Adicionais do Mestre */}
              {pkg.instrucoesPix && (
                <div className="p-3.5 rounded-2xl bg-[#101b13] border border-[#1e3422] space-y-1">
                  <span className="text-[10px] text-[#d49e2a] uppercase tracking-wider font-semibold block">
                    Observações do Mestre:
                  </span>
                  <p className="text-xs text-[#c7d5c9] leading-relaxed">
                    {pkg.instrucoesPix}
                  </p>
                </div>
              )}

              {/* Orientações Obrigatórias em Destaque */}
              <div className="p-4 rounded-2xl bg-[#142517] border-2 border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                  <Info className="w-4 h-4" />
                  <span>Orientações Importantes para Identificação:</span>
                </div>

                <div className="space-y-2 text-xs text-[#e2ece3]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#d49e2a] font-bold mt-0.5">•</span>
                    <p className="leading-relaxed">
                      <strong>Na descrição do Pix</strong>, informe seu número de telefone cadastrado no site para identificarmos seu pagamento:
                    </p>
                  </div>

                  {/* Seu Telefone Cadastrado com cópia */}
                  <div className="ml-4 p-2.5 rounded-xl bg-[#0c160f] border border-[#223d29] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-[#a4b5a6]">
                      <Phone className="w-3.5 h-3.5 text-[#d49e2a]" />
                      <span>Seu telefone:</span>
                      <strong className="text-[#f4ecd8] font-mono">
                        {currentUser.telefone || 'Não informado no perfil'}
                      </strong>
                    </div>
                    {currentUser.telefone && (
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="text-[10px] px-2 py-1 rounded bg-[#172c1c] text-[#6ee7b7] hover:bg-[#1f3d26] border border-[#27492f] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {copiedPhone ? <Check className="w-3 h-3 text-[#34d399]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPhone ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-[#d49e2a] font-bold mt-0.5">•</span>
                    <p className="leading-relaxed">
                      <strong>Depois de realizar o Pix</strong> no aplicativo do seu banco, volte aqui e confirme o pagamento clicando no botão abaixo.
                    </p>
                  </div>
                </div>

                <div className="pt-1 text-[10px] text-[#8a9d8c] italic border-t border-[#1f3724]">
                  * O site não realiza transferência bancária nem conexão automática com bancos. Este botão registra sua declaração para que o Mestre confira o extrato.
                </div>
              </div>

              {/* Botão de Ação Principal: Confirmar Pagamento Realizado */}
              {!showConfirmDialog ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTriggerConfirm}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d49e2a] to-[#e5b23d] hover:from-[#e5b23d] hover:to-[#f3c85f] text-[#122015] font-rpg text-sm sm:text-base font-bold shadow-xl shadow-amber-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Já fiz o Pix — confirmar pagamento</span>
                  </button>
                </div>
              ) : (
                /* Diálogo de Confirmação */
                <div className="p-4 rounded-2xl bg-[#261f0f] border-2 border-amber-500 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Você confirma que já realizou o Pix deste financiamento?</span>
                  </div>
                  <p className="text-[11px] text-[#d6dfd7] leading-relaxed">
                    Ao confirmar, seu status passará para "Pagamento Informado" na lista deste pacote com registro de data e hora. O Mestre irá conferir a entrada do valor.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDialog(false)}
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 text-xs text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#1a2f20] rounded-xl cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleExecutePaymentConfirmation}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs sm:text-sm font-bold bg-[#34d399] hover:bg-[#22c55e] text-[#0f2415] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{isSubmitting ? 'Confirmando...' : 'Sim, já realizei o Pix!'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
