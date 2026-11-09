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
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { FundingPackage, UserProfile } from '../types';
import { apiRequestPackageAccess, getInitialBinId } from '../utils/cloudStorage';

interface WhatsAppCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FundingPackage[];
  currentUser: UserProfile | null;
  masterPhone?: string;
  binId?: string;
  onClearCart?: () => void;
  onRequestAccessSuccess?: () => void;
  onToast: (msg: string) => void;
}

interface CompletedOrderInfo {
  items: FundingPackage[];
  totalBRL: number;
  itemCount: number;
}

export const WhatsAppCheckoutModal: React.FC<WhatsAppCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  masterPhone = '(19) 98151-2030',
  binId,
  onClearCart,
  onRequestAccessSuccess,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [completedOrderInfo, setCompletedOrderInfo] = useState<CompletedOrderInfo | null>(null);

  const totalBRL = useMemo(() => {
    const totalCents = items.reduce((accCents, pkg) => {
      const price = typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : pkg.valorTotalBRL;
      return accCents + Math.round((price || 0) * 100);
    }, 0);
    return totalCents / 100;
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
        : 'Pasta disponibilizada após confirmação';

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
    try {
      navigator.clipboard.writeText(messageText);
      setCopied(true);
      onToast('Mensagem copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast('Não foi possível acessar a área de transferência. Selecione o texto abaixo para copiar.');
    }
  };

  const handleOpenWhatsApp = async () => {
    const cleanPhone = (masterPhone || '5519981512030').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const encodedText = encodeURIComponent(messageText);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodedText}`;

    // Requirement 4: Snapshot congelado antes de esvaziar o carrinho para evitar tela de sucesso zerada
    const snapshot: CompletedOrderInfo = {
      items: [...items],
      totalBRL: totalBRL,
      itemCount: items.length,
    };
    setCompletedOrderInfo(snapshot);

    // Requirement 3: Quando o usuário clicar em FINALIZAR,
    // o frontend faz Promise.all chamando o endpoint de request-access para cada pacote que está no carrinho.
    if (currentUser && !currentUser.isMaster && items.length > 0) {
      try {
        setIsSubmitting(true);
        const effectiveBin = binId || getInitialBinId();
        await Promise.all(
          items.map((pkg) =>
            apiRequestPackageAccess(effectiveBin, pkg.id, {
              memberId: currentUser.id,
              nome: currentUser.nome,
              telefone: currentUser.telefone,
              email: currentUser.email,
            })
          )
        );

        // Esvaziar carrinho após gravar o snapshot com segurança
        onClearCart?.();

        // Abrir WhatsApp em nova aba
        if (url.length > 2000) {
          try {
            navigator.clipboard.writeText(messageText);
            onToast('Mensagem copiada para a área de transferência! Cole no WhatsApp.');
          } catch {}
          window.open(`https://wa.me/${phoneWithCountry}`, '_blank', 'noopener,noreferrer');
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }

        // Exibir aviso/modal de sucesso
        setOrderSuccess(true);
        onRequestAccessSuccess?.();
      } catch (err: any) {
        console.error('Erro ao registrar solicitação de acesso:', err);
        onToast(err.message || 'Erro ao registrar solicitação. Abrindo WhatsApp...');
        window.open(url, '_blank', 'noopener,noreferrer');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Caso seja o próprio Mestre testando ou não autenticado
    onClearCart?.();
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleFinishAndClose = () => {
    setOrderSuccess(false);
    setCompletedOrderInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[88] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#39421b] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              {orderSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-[#a8d363]" />
              ) : (
                <MessageCircle className="w-5 h-5 text-[#a8d363]" />
              )}
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                {orderSuccess ? 'Solicitação Registrada!' : 'Finalizar Pedido pelo WhatsApp'}
              </h2>
              <p className="text-[11px] text-[#A69371]">
                {orderSuccess
                  ? 'Aguardando envio do comprovante Pix ao Mestre'
                  : 'Envie os detalhes da sua aquisição diretamente ao Mestre da mesa'}
              </p>
            </div>
          </div>
          <button
            onClick={handleFinishAndClose}
            className="p-1.5 text-[#A69371] hover:text-[#F8EDD5] rounded-xl hover:bg-[#39421b] transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {orderSuccess ? (
          /* TELA DE SUCESSO DO PEDIDO */
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-[#302414] space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#E3E8D0] border-2 border-[#8F9F5B] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9 text-[#48551F]" />
            </div>

            <div className="space-y-2">
              <h3 className="font-rpg text-xl font-bold text-[#302414]">
                Pedido registrado no sistema!
              </h3>
              <p className="text-xs sm:text-sm text-[#55482e] font-semibold max-w-md mx-auto leading-relaxed bg-[#FAF4E6] p-4 rounded-2xl border border-[#D6C296] shadow-xs">
                Lembre-se de enviar a mensagem no WhatsApp do Mestre com o comprovante para que ele libere seu acesso.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-left text-xs space-y-2">
              <span className="font-bold text-[#71634D] uppercase text-[10px] tracking-wider block">
                Itens Solicitados ({completedOrderInfo ? completedOrderInfo.itemCount : items.length}):
              </span>
              <ul className="divide-y divide-[#E3D1AC] max-h-36 overflow-y-auto pr-1">
                {(completedOrderInfo?.items || items).map((pkg) => (
                  <li key={pkg.id} className="py-1.5 flex items-center justify-between text-xs font-medium">
                    <span className="truncate max-w-[70%]">• {pkg.titulo}</span>
                    <span className="font-mono font-bold text-[#48551F]">
                      R$ {(typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : pkg.valorTotalBRL)
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-[#D6C296] flex items-center justify-between font-bold">
                <span>Total:</span>
                <span className="font-mono text-base font-bold text-[#48551F]">
                  R$ {(completedOrderInfo ? completedOrderInfo.totalBRL : totalBRL).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="w-full py-3.5 px-6 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                Entendido / Concluir
              </button>
            </div>
          </div>
        ) : (
          /* TELA PADRÃO DE PRÉVIA DO PEDIDO */
          <>
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
                  rows={7}
                  value={messageText}
                  className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl p-3 text-xs text-[#302414] font-mono leading-relaxed resize-none focus:outline-none select-text"
                />
              </div>

              {/* Aviso Importante de Fluxo */}
              <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-[11px] text-[#71634D] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#716016] shrink-0 mt-0.5" />
                <p>
                  Ao clicar em <strong>FINALIZAR</strong>, seu pedido é automaticamente gravado no sistema como solicitação de acesso e o carrinho é esvaziado. O acesso à pasta no Google Drive é liberado após o Mestre confirmar o recebimento do Pix.
                </p>
              </div>

            </div>

            {/* Footer Actions com o botão Primário FINALIZAR em Destaque Total */}
            <div className="p-4 sm:p-5 bg-[#EDE2CA] border-t border-[#D6C296] space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleOpenWhatsApp}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xl font-black transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span>REGISTRANDO PEDIDO...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-6 h-6 text-white" />
                    <span>FINALIZAR</span>
                    <ExternalLink className="w-5 h-5 text-emerald-200" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleFinishAndClose}
                  className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold cursor-pointer transition-colors"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-[#48551F]" /> : <Copy className="w-4 h-4 text-[#716016]" />}
                  <span>{copied ? '✓ Mensagem Copiada!' : 'Copiar Mensagem'}</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
