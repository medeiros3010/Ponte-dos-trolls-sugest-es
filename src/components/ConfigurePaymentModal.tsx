import React, { useState, useEffect } from 'react';
import { FundingPackage, ADMIN_PASSWORD } from '../types';
import { getTodayISODate, formatDateDisplay } from '../utils/helpers';
import { X, DollarSign, Calendar, Key, FileText, Lock, AlertCircle, Users, CheckCircle2 } from 'lucide-react';

interface ConfigurePaymentModalProps {
  isOpen: boolean;
  pkg: FundingPackage | null;
  isStartingStage: boolean; // true se está transitando de COLETA para PAGAMENTO
  onClose: () => void;
  onConfirm: (params: {
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
  isStartingStage,
  onClose,
  onConfirm,
  onToast,
}) => {
  const [valorFinal, setValorFinal] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<string>('');
  const [chavePix, setChavePix] = useState<string>('');
  const [instrucoesPix, setInstrucoesPix] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = getTodayISODate();

  useEffect(() => {
    if (pkg && isOpen) {
      setErrorMsg('');
      setAdminPassword('');

      // Valor sugerido: se já tem valorFinal definido usa ele; senão divide total pelos cotistas atuais (ou mínimo)
      const cotistasCount = pkg.apoiadores?.length || 0;
      const divisor = cotistasCount > 0 ? cotistasCount : (pkg.minimoParticipantes || 35);
      const suggestedVal = pkg.valorFinalPorParticipante !== undefined
        ? pkg.valorFinalPorParticipante
        : Number(((pkg.valorTotalBRL || 0) / divisor).toFixed(2));

      setValorFinal(suggestedVal.toFixed(2));
      setDataPagamento(pkg.dataPagamento || '');
      setChavePix(pkg.chavePix || '');
      setInstrucoesPix(pkg.instrucoesPix || '');
    }
  }, [pkg, isOpen]);

  if (!isOpen || !pkg) return null;

  const cotistasCount = pkg.apoiadores?.length || 0;

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

    if (adminPassword !== ADMIN_PASSWORD) {
      setErrorMsg('Senha de administrador incorreta.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        valorFinalPorParticipante: parsedVal,
        dataPagamento: cleanDate,
        chavePix: cleanPix,
        instrucoesPix: instrucoesPix.trim() || undefined,
        iniciarEtapaPagamento: isStartingStage,
        adminPassword,
      });

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
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#122015] border-2 border-amber-500/70 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#211b0e] to-[#122015] border-b border-[#302410] flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
              Definir cobrança do financiamento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] hover:bg-[#1a2f20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Informações do Pacote */}
          <div className="p-3.5 rounded-2xl bg-[#0c150e] border border-[#203625] space-y-1">
            <span className="text-[10px] text-[#7a8e7d] uppercase tracking-wider font-semibold block">
              Pacote de Financiamento:
            </span>
            <span className="font-bold text-sm text-[#f4ecd8] block leading-tight">
              {pkg.titulo}
            </span>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#a4b5a6]">
              <Users className="w-3.5 h-3.5 text-[#d49e2a]" />
              <span>
                Cotistas confirmados na lista: <strong className="text-[#34d399] font-mono">{cotistasCount}</strong> participantes
              </span>
            </div>
          </div>

          {/* Campo: Valor final por participante */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#f4ecd8] flex items-center justify-between">
              <span>Valor final por participante (R$) *</span>
              <span className="text-[10px] text-[#d49e2a] font-normal">Valor exato de cobrança</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#d49e2a]">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="Ex: 10.86"
                value={valorFinal}
                onChange={(e) => setValorFinal(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#233a29] rounded-xl text-sm font-bold font-mono text-[#f4ecd8] focus:outline-none focus:border-amber-400"
              />
            </div>
            <p className="text-[10px] text-[#7a8e7d] leading-relaxed">
              * O valor inicial é apenas uma sugestão baseada no rateio atual. O Mestre deve conferir e definir o valor final exato a ser cobrado.
            </p>
          </div>

          {/* Campo: Data limite para pagamento */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#f4ecd8] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Data limite para pagamento *</span>
            </label>
            <input
              type="date"
              required
              min={isStartingStage ? today : undefined}
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full px-3 py-2 bg-[#0c150e] border border-[#233a29] rounded-xl text-xs font-mono text-[#f4ecd8] focus:outline-none focus:border-emerald-400"
            />
            <p className="text-[10px] text-[#7a8e7d]">
              Prazo máximo para os cotistas realizarem a transferência via Pix.
            </p>
          </div>

          {/* Campo: Chave Pix para pagamento */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#f4ecd8] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Chave Pix para pagamento *</span>
            </label>
            <input
              type="text"
              required
              placeholder="Telefone com DDD, CPF/CNPJ, E-mail ou chave aleatória..."
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              className="w-full px-3 py-2 bg-[#0c150e] border border-[#233a29] rounded-xl text-xs font-mono text-[#f4ecd8] placeholder-[#506352] focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-[#7a8e7d]">
              Aceita qualquer formato textual sem perda de zeros ou caracteres especiais.
            </p>
          </div>

          {/* Campo: Instruções adicionais do Mestre */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#8a9d8c] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#a4b5a6]" />
              <span>Instruções adicionais do Mestre (Opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Banco Inter / Titular: Fulano / Por favor envie comprovante se pagar por outra conta..."
              value={instrucoesPix}
              onChange={(e) => setInstrucoesPix(e.target.value)}
              className="w-full px-3 py-2 bg-[#0c150e] border border-[#233a29] rounded-xl text-xs text-[#f4ecd8] placeholder-[#506352] focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Senha do Mestre */}
          <div className="p-3 bg-[#0c150e] border border-[#27442d] rounded-xl space-y-1.5">
            <label className="block text-xs font-semibold text-[#f4ecd8] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#d49e2a]" />
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
              className="w-full bg-[#142318] border border-[#233a29] focus:border-[#d49e2a] rounded-lg px-3 py-2 text-xs text-[#f3efe6] font-mono focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#1f3524] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#16271a] hover:bg-[#1e3422] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#122015] bg-gradient-to-r from-[#d49e2a] to-[#e5b23d] hover:from-[#e5b23d] hover:to-[#f3c85f] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
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
