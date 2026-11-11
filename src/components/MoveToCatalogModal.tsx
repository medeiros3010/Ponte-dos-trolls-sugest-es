import React, { useState, useEffect, useMemo } from 'react';
import { FundingPackage, UserProfile } from '../types';
import { X, CheckCircle2, Folder, KeyRound, DollarSign, AlertTriangle, AlertCircle, Calendar, Users, Loader2 } from 'lucide-react';
import { formatDateDisplay } from '../utils/helpers';

interface MoveToCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageItem: FundingPackage | null;
  allUsers?: UserProfile[];
  onConfirmMove: (packageId: string, linkDrive: string, valorCatalogoBRL: number) => Promise<void> | void;
  onToast: (msg: string) => void;
}

export const MoveToCatalogModal: React.FC<MoveToCatalogModalProps> = ({
  isOpen,
  onClose,
  packageItem,
  allUsers = [],
  onConfirmMove,
  onToast,
}) => {
  const [linkDrive, setLinkDrive] = useState(packageItem?.linkDrive || '');
  const [valorCatalogo, setValorCatalogo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPendingCheckbox, setConfirmPendingCheckbox] = useState(false);

  useEffect(() => {
    if (packageItem && isOpen) {
      setLinkDrive(packageItem.linkDrive || '');
      const suggestedCatalogVal = packageItem.valorCatalogoBRL || (packageItem.valorTotalBRL * 1.25);
      setValorCatalogo(suggestedCatalogVal.toFixed(2));
      setErrorMsg('');
      setIsSubmitting(false);
      setConfirmPendingCheckbox(false);
    }
  }, [packageItem, isOpen]);

  // Status de pagamento dos participantes
  const { totalSupporters, paidSupporters, pendingSupporters } = useMemo(() => {
    if (!packageItem) {
      return { totalSupporters: 0, paidSupporters: [], pendingSupporters: [] };
    }
    const apoiadores = packageItem.apoiadores || [];
    const paid: { id: string; name: string }[] = [];
    const pending: { id: string; name: string }[] = [];

    for (const ap of apoiadores) {
      const userMatch = allUsers.find(
        (u) => u.id === ap.id || u.nome.trim().toLowerCase() === ap.nome.trim().toLowerCase()
      );
      const name = userMatch?.nome || ap.nome;
      const paymentInfo = packageItem.pagamentos && packageItem.pagamentos[ap.id];
      const hasInformed = Boolean(paymentInfo?.informouPagamento || ap.pagamentoInformado);

      if (hasInformed) {
        paid.push({ id: ap.id, name });
      } else {
        pending.push({ id: ap.id, name });
      }
    }

    return {
      totalSupporters: apoiadores.length,
      paidSupporters: paid,
      pendingSupporters: pending,
    };
  }, [packageItem, allUsers]);

  if (!isOpen || !packageItem) return null;

  const hasPending = pendingSupporters.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const valorParsed = parseFloat(valorCatalogo.replace(',', '.'));
    if (isNaN(valorParsed) || valorParsed <= 0) {
      setErrorMsg('Informe um valor de catálogo válido em R$.');
      return;
    }

    if (hasPending && !confirmPendingCheckbox) {
      setErrorMsg('Confirme explicitamente que está ciente dos participantes com pagamento pendente.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onConfirmMove(packageItem.id, linkDrive.trim(), valorParsed);
      onToast(`Pacote "${packageItem.titulo}" finalizado e transferido para o Catálogo!`);
      onClose();
    } catch (err: any) {
      console.error('Erro ao mover pacote para o catálogo:', err);
      setErrorMsg(err.message || 'Falha ao finalizar o pacote. Verifique a senha e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-lg shadow-2xl flex flex-col overflow-hidden border-[#C6AD78] max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <CheckCircle2 className="w-4 h-4 text-[#a8d363]" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Finalizar e Mover para o Catálogo
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Conclui o financiamento e disponibiliza o material no acervo de produtos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs text-[#302414] overflow-y-auto flex-1">
          
          {/* Resumo do Pacote */}
          <div className="p-3.5 bg-[#FBF4E4] border border-[#D6C296] rounded-2xl space-y-2">
            <h3 className="font-bold text-[#302414] text-sm font-rpg">{packageItem.titulo}</h3>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#71634D]">
              <span>Valor Total: <strong className="text-[#302414] font-mono">R$ {packageItem.valorTotalBRL.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Cotistas: <strong className="text-[#48551F]">{totalSupporters} membros</strong></span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#716016]" />
                <span>Aquisição: <strong className="text-[#302414]">{packageItem.dataPagamento ? formatDateDisplay(packageItem.dataPagamento) : 'Hoje'}</strong></span>
              </span>
            </div>
          </div>

          {/* Resumo dos Status de Pagamento */}
          <div className="p-3.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#302414] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#716016]" />
                <span>Status de Pagamento dos Participantes:</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-[#48551F]">
                {paidSupporters.length} / {totalSupporters} informados
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11.5px]">
              <div className="p-2 rounded-xl bg-[#dbe9c8]/70 border border-[#a4cb88] text-[#2f5c1a]">
                <span className="block text-[10px] uppercase font-bold tracking-wider">Pagamento Informado</span>
                <strong className="text-sm font-mono font-bold">{paidSupporters.length}</strong> cotistas
                <p className="text-[10px] text-[#406828] mt-0.5">Declaração de comprovante enviada</p>
              </div>

              <div className={`p-2 rounded-xl border ${hasPending ? 'bg-[#FEE2E2]/70 border-[#FCA5A5] text-[#991B1B]' : 'bg-[#EDE2CA] border-[#D6C296] text-[#71634D]'}`}>
                <span className="block text-[10px] uppercase font-bold tracking-wider">Pagamento Pendente</span>
                <strong className="text-sm font-mono font-bold">{pendingSupporters.length}</strong> cotistas
                <p className="text-[10px] mt-0.5">{hasPending ? 'Ainda não informaram Pix' : 'Nenhuma pendência'}</p>
              </div>
            </div>
          </div>

          {/* Alerta Destacado de Pendências */}
          {hasPending && (
            <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border-2 border-[#EF4444] text-[#991B1B] space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-[#DC2626] mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-[#991B1B]">
                    Atenção: este financiamento ainda possui {pendingSupporters.length} {pendingSupporters.length === 1 ? 'participante' : 'participantes'} com pagamento pendente.
                  </h4>
                  <p className="text-[11px] text-[#B91C1C] mt-1 leading-relaxed">
                    Os participantes com pendência <strong>não serão marcados como pagos</strong> nem terão acesso liberado no Google Drive até que a pendência seja regularizada. O histórico é preservado.
                  </p>
                </div>
              </div>

              {/* Lista dos nomes dos membros pendentes */}
              <div className="bg-white/80 border border-[#FCA5A5] rounded-xl p-2.5 max-h-24 overflow-y-auto">
                <span className="block text-[10.5px] font-bold text-[#7F1D1D] mb-1">
                  Membros pendentes ({pendingSupporters.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {pendingSupporters.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#991B1B] border border-[#F87171] text-[10.5px] font-semibold"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Checkbox de Confirmação Explícita do Mestre */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmPendingCheckbox}
                  onChange={(e) => setConfirmPendingCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-[#EF4444] text-[#DC2626] focus:ring-[#DC2626] cursor-pointer"
                />
                <span className="text-[11px] font-bold text-[#7F1D1D] leading-tight">
                  Confirmo que estou finalizando a compra ciente das {pendingSupporters.length} {pendingSupporters.length === 1 ? 'pendência não quitada' : 'pendências não quitadas'}.
                </span>
              </label>
            </div>
          )}

          {/* Valor de Catálogo */}
          <div>
            <label className="block font-semibold text-[#302414] mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-[#716016]" />
              <span>Valor do Pacote no Catálogo (R$) *:</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={valorCatalogo}
              onChange={(e) => setValorCatalogo(e.target.value)}
              placeholder="Ex: 120.00"
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono font-bold focus:outline-none focus:border-[#48551F] disabled:opacity-50"
            />
            <p className="text-[11px] text-[#71634D] mt-1">
              O valor de aquisição no Catálogo normalmente possui acréscimo em relação ao rateio original.
            </p>
          </div>

          {/* Link Drive */}
          <div>
            <label className="block font-semibold text-[#71634D] mb-1 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-[#71634D]" />
              <span>Link da Pasta no Google Drive (para acesso dos membros):</span>
            </label>
            <input
              type="url"
              disabled={isSubmitting}
              value={linkDrive}
              onChange={(e) => setLinkDrive(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F] disabled:opacity-50"
            />
            <p className="text-[10.5px] text-[#71634D] mt-1">
              Se ainda não tiver o link pronto, você poderá cadastrá-lo ou editá-lo depois no Catálogo.
            </p>
          </div>


          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#D6C296]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 text-center"
            >
              Voltar e revisar
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || (hasPending && !confirmPendingCheckbox)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                hasPending
                  ? 'bg-[#B91C1C] hover:bg-[#991B1B] text-[#FEE2E2]'
                  : 'bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finalizando...</span>
                </>
              ) : hasPending ? (
                <span>Finalizar com pendências</span>
              ) : (
                <span>Finalizar e mover para o catálogo</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
