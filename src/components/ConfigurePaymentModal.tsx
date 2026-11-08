import React, { useState, useEffect } from 'react';
import { FundingPackage } from '../types';
import { getTodayISODate, formatDateDisplay } from '../utils/helpers';
import { X, DollarSign, Calendar, Key, FileText, Lock, AlertCircle, Users, CheckCircle2 } from 'lucide-react';

interface ConfigurePaymentModalProps {
  isOpen: boolean;
  pkg?: FundingPackage | null;
  packageItem?: FundingPackage | null;
  isStartingStage: boolean;
  onClose: () => void;
  onSaveConfig?: (params: {
    packageId: string;
    valorFinalPorParticipante: number;
    dataPagamento: string;
    chavePix: string;
    instrucoesPix?: string;
    iniciarEtapaPagamento: boolean;
    adminPassword: string;
  }) => Promise<void>;
  onConfirm?: (params: {
    valorFinalPorParticipante: number;
    dataPagamento: string;
    chavePix: string;
    instrucoesPix?: string;
    iniciarEtapaPagamento: boolean;
    adminPassword: string;
  }) => Promise<void>;
  onToast: (msg: string) => void;
}

export const ConfigurePaymentModal: React.FC<ConfigurePaymentModalProps> = ({
  isOpen,
  pkg,
  packageItem,
  isStartingStage,
  onClose,
  onSaveConfig,
  onConfirm,
  onToast,
}) => {
  const currentPkg = packageItem || pkg;
  const [valorFinal, setValorFinal] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<string>('');
  const [chavePix, setChavePix] = useState<string>('');
  const [instrucoesPix, setInstrucoesPix] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = getTodayISODate();

  useEffect(() => {
    if (currentPkg && isOpen) {
      setErrorMsg('');
      setAdminPassword('');

      const cotistasCount = currentPkg.apoiadores?.length || 0;
      const divisor = cotistasCount > 0 ? cotistasCount : (currentPkg.minimoParticipantes || 35);
      const suggestedVal = currentPkg.valorFinalPorParticipante !== undefined
        ? currentPkg.valorFinalPorParticipante
        : Number(((currentPkg.valorTotalBRL || 0) / divisor).toFixed(2));

      setValorFinal(suggestedVal.toFixed(2));
      setDataPagamento(currentPkg.dataPagamento || '');
      setChavePix(currentPkg.chavePix || '');
      setInstrucoesPix(currentPkg.instrucoesPix || '');
    }
  }, [currentPkg, isOpen]);

  if (!isOpen || !currentPkg) return null;

  const cotistasCount = currentPkg.apoiadores?.length || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedVal = parseFloat(valorFinal.replace(',', '.'));
    if (isNaN(parsedVal) || parsedVal <= 0) {
      setErrorMsg('Informe um valor final válido por participante maior que zero.');
      return;
    }

    const cleanDate = dataPagamento.trim();
    if (!cleanDate) {
      setErrorMsg('A data limite para pagamento é obrigatória.');
      return;
    }

    if (isStartingStage && cleanDate < today) {
      setErrorMsg('A data limite não pode ser anterior à data de hoje.');
      return;
    }

    const cleanPix = chavePix.trim();
    if (!cleanPix) {
      setErrorMsg('A chave Pix para pagamento é obrigatória.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onSaveConfig) {
        await onSaveConfig({
          packageId: currentPkg.id,
          valorFinalPorParticipante: parsedVal,
          dataPagamento: cleanDate,
          chavePix: cleanPix,
          instrucoesPix: instrucoesPix.trim() || undefined,
          iniciarEtapaPagamento: isStartingStage,
          adminPassword,
        });
      } else if (onConfirm) {
        await onConfirm({
          valorFinalPorParticipante: parsedVal,
          dataPagamento: cleanDate,
          chavePix: cleanPix,
          instrucoesPix: instrucoesPix.trim() || undefined,
          iniciarEtapaPagamento: isStartingStage,
          adminPassword,
        });
      }

      onToast(
        isStartingStage
          ? 'Cobrança definida e Processo de Pagamento iniciado com sucesso!'
          : 'Dados de cobrança e pagamento atualizados com sucesso!'
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar configurações de cobrança.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#d6be8c]" />
            <h3 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
              Definir Cobrança do Financiamento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 text-[#302414]">
          {/* Informações do Pacote */}
          <div className="p-3.5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] space-y-1">
            <span className="text-[10px] text-[#71634D] uppercase tracking-wider font-semibold block">
              Pacote de Financiamento:
            </span>
            <span className="font-bold text-sm text-[#302414] block leading-tight font-rpg">
              {currentPkg.titulo}
            </span>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#71634D]">
              <Users className="w-3.5 h-3.5 text-[#716016]" />
              <span>
                Cotistas confirmados: <strong className="text-[#48551F] font-mono">{cotistasCount}</strong> participantes
              </span>
            </div>
          </div>

          {/* Valor final por participante */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#302414] flex items-center justify-between">
              <span>Valor final por participante (R$) *</span>
              <span className="text-[10px] text-[#716016] font-normal">Valor exato de cobrança</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#716016]">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="Ex: 10.86"
                value={valorFinal}
                onChange={(e) => setValorFinal(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-sm font-bold font-mono text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>
            <p className="text-[10px] text-[#71634D] leading-relaxed">
              * O Mestre define o valor exato a ser cobrado de cada cotista para o fechamento da compra.
            </p>
          </div>

          {/* Data limite para pagamento */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#302414] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#48551F]" />
              <span>Data limite para pagamento *</span>
            </label>
            <input
              type="date"
              required
              min={isStartingStage ? today : undefined}
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs font-mono text-[#302414] focus:outline-none focus:border-[#48551F]"
            />
          </div>

          {/* Chave Pix para pagamento */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#302414] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#716016]" />
              <span>Chave Pix para pagamento *</span>
            </label>
            <input
              type="text"
              required
              placeholder="Telefone, CPF/CNPJ, E-mail ou chave aleatória..."
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs font-mono text-[#302414] focus:outline-none focus:border-[#48551F]"
            />
          </div>

          {/* Instruções adicionais */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#71634D] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#71634D]" />
              <span>Instruções adicionais do Mestre (Opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Banco Inter / Titular: Fulano / Por favor envie comprovante se pagar por outra conta..."
              value={instrucoesPix}
              onChange={(e) => setInstrucoesPix(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
            />
          </div>

          {/* Senha do Mestre */}
          <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-1.5">
            <label className="block text-xs font-semibold text-[#302414] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#716016]" />
              <span>Senha do Mestre para confirmar *</span>
            </label>
            <input
              type="password"
              required
              placeholder="Digite a senha de administrador..."
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] focus:border-[#48551F] rounded-lg px-3 py-2 text-xs text-[#302414] font-mono focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#D6C296] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#F8EDD5] bg-[#48551F] hover:bg-[#59672A] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isSubmitting
                  ? 'Salvando...'
                  : isStartingStage
                  ? 'Confirmar dados e iniciar pagamento'
                  : 'Salvar alterações de cobrança'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
