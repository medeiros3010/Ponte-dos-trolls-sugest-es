import React, { useState } from 'react';
import { FundingPackage, UserProfile, FundingStage, ADMIN_PASSWORD } from '../types';
import { ArrowLeft, Flame, Plus, ExternalLink, Users, Check, UserPlus, CheckCircle2, Edit2, Trash2, Calendar, AlertTriangle, Copy, ShieldAlert, Lock, Unlock, CreditCard, Clock, Image as ImageIcon, CheckCircle, AlertCircle, KeyRound, X, Key, Info, HelpCircle } from 'lucide-react';
import { formatDateDisplay, extractPaidMemberEmails } from '../utils/helpers';
import { EditPackageImageModal } from './EditPackageImageModal';
import { ConfigurePaymentModal } from './ConfigurePaymentModal';
import { PaymentInstructionsModal } from './PaymentInstructionsModal';

interface FinanciamentoViewProps {
  packages: FundingPackage[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onGoHome: () => void;
  onOpenCreatePackage: () => void;
  onEditPackage: (pkg: FundingPackage) => void;
  onDeletePackage: (pkg: FundingPackage) => void;
  onMoveToCatalog: (pkg: FundingPackage) => void;
  onToggleSupport: (packageId: string) => void;
  onUpdateStage: (packageId: string, etapa: FundingStage, adminPassword?: string) => Promise<void>;
  onConfigurePayment: (params: {
    packageId: string;
    valorFinalPorParticipante: number;
    dataPagamento: string;
    chavePix: string;
    instrucoesPix?: string;
    iniciarEtapaPagamento: boolean;
    adminPassword: string;
  }) => Promise<void>;
  onUpdatePackageImage: (packageId: string, newImageUrl: string, adminPassword?: string) => Promise<void>;
  onUpdatePayment: (packageId: string, memberId: string, informouPagamento: boolean) => Promise<void>;
  onToast: (msg: string) => void;
}

export const FinanciamentoView: React.FC<FinanciamentoViewProps> = ({
  packages,
  allUsers,
  currentUser,
  onGoHome,
  onOpenCreatePackage,
  onEditPackage,
  onDeletePackage,
  onMoveToCatalog,
  onToggleSupport,
  onUpdateStage,
  onConfigurePayment,
  onUpdatePackageImage,
  onUpdatePayment,
  onToast,
}) => {
  const isMaster = Boolean(currentUser.isMaster);
  const openPackages = packages.filter((p) => p.status === 'Financiamento');

  // Commitment Confirmation Modal state (for entering a vaquinha)
  const [packageToCommit, setPackageToCommit] = useState<FundingPackage | null>(null);

  // Modais de Imagem e Cobrança
  const [imageEditPkg, setImageEditPkg] = useState<FundingPackage | null>(null);
  const [configPaymentState, setConfigPaymentState] = useState<{ pkg: FundingPackage; isStartingStage: boolean } | null>(null);
  const [paymentInstructionsPkg, setPaymentInstructionsPkg] = useState<FundingPackage | null>(null);

  // Stage Switcher Modal state (for Reopening Coleta)
  const [reopenColetaPkg, setReopenColetaPkg] = useState<FundingPackage | null>(null);
  const [stageAdminPassword, setStageAdminPassword] = useState('');
  const [stageError, setStageError] = useState('');
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  // Member Payment Declaration Confirmation Modal
  const [paymentConfirmPkg, setPaymentConfirmPkg] = useState<{ pkg: FundingPackage; memberId: string; informou: boolean; memberName: string } | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Copied Pix Feedback per package card
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  const handleCopyPixKey = (pkg: FundingPackage) => {
    if (!pkg.chavePix) return;
    navigator.clipboard.writeText(pkg.chavePix);
    setCopiedPixId(pkg.id);
    onToast('Chave Pix copiada com sucesso!');
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  // Join/Leave handler
  const handleParticipateClick = (pkg: FundingPackage) => {
    if (pkg.etapaFinanciamento === 'PAGAMENTO' && !isMaster) {
      onToast('A lista deste financiamento está travada para cobrança (Processo de Pagamento). Apenas o Mestre pode autorizar alterações.');
      return;
    }

    const isUserSupporting = (pkg.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    );

    if (isUserSupporting) {
      onToggleSupport(pkg.id);
    } else {
      setPackageToCommit(pkg);
    }
  };

  const handleConfirmCommitment = () => {
    if (!packageToCommit) return;
    onToggleSupport(packageToCommit.id);
    onToast(`Você assumiu o compromisso e entrou no rateio de "${packageToCommit.titulo}"!`);
    setPackageToCommit(null);
  };

  // Copy emails of participants who informed payment
  const handleCopyPaidEmails = (pkg: FundingPackage) => {
    const result = extractPaidMemberEmails(pkg, allUsers);

    if (result.validEmails.length === 0) {
      if (result.totalWithPaymentInformed === 0) {
        onToast('Nenhum participante informou pagamento neste pacote ainda.');
      } else {
        onToast(`Atenção: Os ${result.totalWithPaymentInformed} participantes que informaram pagamento estão com e-mails incompletos.`);
      }
      return;
    }

    navigator.clipboard.writeText(result.clipboardText);

    if (result.missingOrInvalidMembers.length > 0) {
      onToast(
        `Copiados ${result.validEmails.length} e-mails! Atenção: ${result.missingOrInvalidMembers.join(
          ', '
        )} precisa(m) corrigir o cadastro.`
      );
    } else {
      onToast(`Copiados ${result.validEmails.length} e-mails para o Google Drive!`);
    }
  };

  // Master Stage Switch Handler: se for para PAGAMENTO abre o ConfigurePaymentModal (Requirement 4)
  const handleStageButtonClick = (pkg: FundingPackage) => {
    if (pkg.etapaFinanciamento === 'COLETA') {
      setConfigPaymentState({ pkg, isStartingStage: true });
    } else {
      // Reabrir Coleta de Membros
      setReopenColetaPkg(pkg);
      setStageAdminPassword('');
      setStageError('');
    }
  };

  const handleConfirmReopenColeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stageAdminPassword !== ADMIN_PASSWORD) {
      setStageError('Senha do Mestre incorreta! Acesso negado.');
      return;
    }

    if (!reopenColetaPkg) return;

    try {
      setIsUpdatingStage(true);
      await onUpdateStage(reopenColetaPkg.id, 'COLETA', stageAdminPassword);
      onToast('Coleta de membros reaberta! A lista de participantes voltou a ficar liberada.');
      setReopenColetaPkg(null);
    } catch (err: any) {
      setStageError(err.message || 'Erro ao reabrir etapa');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  // Payment declaration trigger
  const handleTriggerPaymentDeclaration = (pkg: FundingPackage, memberId: string, currentInformed: boolean, memberName: string) => {
    if (!isMaster && memberId !== currentUser.id) {
      onToast('Você só pode declarar o seu próprio pagamento.');
      return;
    }

    setPaymentConfirmPkg({
      pkg,
      memberId,
      informou: !currentInformed,
      memberName,
    });
  };

  const handleConfirmPaymentDeclaration = async () => {
    if (!paymentConfirmPkg) return;
    try {
      setIsUpdatingPayment(true);
      await onUpdatePayment(
        paymentConfirmPkg.pkg.id,
        paymentConfirmPkg.memberId,
        paymentConfirmPkg.informou
      );

      if (paymentConfirmPkg.informou) {
        onToast(`Pagamento de ${paymentConfirmPkg.memberName} registrado com sucesso!`);
      } else {
        onToast(`Declaração de pagamento de ${paymentConfirmPkg.memberName} desfeita.`);
      }
      setPaymentConfirmPkg(null);
    } catch (err: any) {
      onToast(err.message || 'Erro ao atualizar pagamento');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Top Bar com Voltar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1f3524]">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#142318] hover:bg-[#1a2f20] text-[#d49e2a] hover:text-[#f4ecd8] border border-[#27442d] text-xs font-semibold transition-all hover:-translate-x-0.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Menu Inicial</span>
        </button>

        <div className="flex items-center gap-2">
          {isMaster && (
            <button
              onClick={onOpenCreatePackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Criar Pacote de Financiamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Título da Seção */}
      <div className="mb-6 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e5b23d] uppercase tracking-wider">
          <Flame className="w-4 h-4 animate-pulse text-[#d49e2a]" />
          <span>Vaquinhas Abertas & Rateio Ativo</span>
        </div>
        <h1 className="font-rpg text-2xl sm:text-3xl font-bold text-[#f4ecd8]">
          Financiamento em Andamento
        </h1>
        <p className="text-xs sm:text-sm text-[#8a9d8c]">
          Pacotes oficiais consolidados pelo Mestre da Ponte. Acompanhe as etapas de coleta e pagamento, consulte a chave Pix oficial e confirme suas transferências!
        </p>
      </div>

      {/* Lista de Pacotes */}
      {openPackages.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#1f3524] rounded-3xl bg-[#0c150e]/60">
          <div className="w-16 h-16 rounded-full bg-[#182c1d] border border-[#27442d] flex items-center justify-center mx-auto mb-3 text-2xl">
            🔥
          </div>
          <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
            Nenhum pacote em financiamento no momento
          </h3>
          <p className="text-xs text-[#8a9d8c] mt-1 max-w-md mx-auto">
            {isMaster
              ? 'Como Mestre da Ponte, você pode clicar no botão acima "Criar Pacote de Financiamento" para agrupar as sugestões da galera em uma vaquinha.'
              : 'O Mestre da Ponte ainda não abriu novas vaquinhas. Você pode acessar a tela de "Sugerir Compras" para enviar novas ideias!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {openPackages.map((pkg) => {
            const apoiadores = pkg.apoiadores || [];
            const count = apoiadores.length;
            const valorTotal = pkg.valorTotalBRL || 0;
            const minimo = pkg.minimoParticipantes || 35;
            const valorMaximoPorPessoa = pkg.valorMaximoPorPessoa || (valorTotal / minimo);

            const isPagamentoStage = pkg.etapaFinanciamento === 'PAGAMENTO';

            // User support and payment check
            const isUserSupporting = apoiadores.some(
              (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
            );

            const userSupporterRecord = apoiadores.find(
              (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
            );

            const pagamentosMap = pkg.pagamentos || {};
            const userPaymentInfo = userSupporterRecord ? pagamentosMap[userSupporterRecord.id] : undefined;

            const userPaidInformed = Boolean(
              userPaymentInfo?.informouPagamento || userSupporterRecord?.pagamentoInformado
            );

            const userPayDate = userPaymentInfo?.dataPagamentoInformado || userSupporterRecord?.dataPagamentoInformado;

            // Totals
            const informedCount = apoiadores.filter((ap) => {
              const pInfo = pagamentosMap[ap.id];
              return Boolean(pInfo?.informouPagamento || ap.pagamentoInformado);
            }).length;

            const pendingCount = Math.max(0, count - informedCount);

            // Final billing amount defined by Master or estimated
            const valorFinalCobrado = typeof pkg.valorFinalPorParticipante === 'number'
              ? pkg.valorFinalPorParticipante
              : valorMaximoPorPessoa;

            const isBillingReady = Boolean(pkg.chavePix);

            return (
              <div
                key={pkg.id}
                className="bg-[#122015] border-2 border-[#1f3524] rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 transition-all hover:border-[#2f5539]"
              >
                {/* ==================== 1. TARJA DA ETAPA DE FINANCIAMENTO ==================== */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${
                    isPagamentoStage
                      ? 'bg-gradient-to-r from-[#2a1e0b] via-[#1c1407] to-[#201708] border-amber-500/80 text-amber-300'
                      : 'bg-gradient-to-r from-[#142c1c] via-[#0e2115] to-[#12281b] border-emerald-500/70 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isPagamentoStage
                          ? 'bg-amber-950/90 border-amber-500/60 text-amber-400'
                          : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                      }`}
                    >
                      {isPagamentoStage ? <Lock className="w-5 h-5" /> : <Flame className="w-5 h-5 animate-pulse" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold opacity-80">
                          Etapa do Financiamento:
                        </span>
                      </div>
                      <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8] tracking-wide">
                        {isPagamentoStage
                          ? 'PROCESSO DE PAGAMENTO'
                          : 'EM PROCESSO DE COLETA DE MEMBROS'}
                      </h3>
                      <p className="text-[11px] text-[#c7d5c9] mt-0.5">
                        {isPagamentoStage
                          ? '🔒 A lista de participantes foi travada para cobrança. Realize o Pix e informe o pagamento!'
                          : '📢 Aberto para qualquer membro entrar ou sair da lista de rateio.'}
                      </p>
                    </div>
                  </div>

                  {/* Ações da Etapa para o Mestre */}
                  {isMaster && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {isPagamentoStage && (
                        <button
                          type="button"
                          onClick={() => setConfigPaymentState({ pkg, isStartingStage: false })}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#211606] hover:bg-[#33230a] border border-amber-500/50 text-amber-300 transition-colors cursor-pointer"
                          title="Editar chave Pix, valor final ou data de pagamento"
                        >
                          {isBillingReady ? 'Editar dados de pagamento' : 'Configurar dados de pagamento'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStageButtonClick(pkg)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
                          isPagamentoStage
                            ? 'bg-[#1b2b1e] hover:bg-[#253d2b] border-[#386b40] text-[#86efac]'
                            : 'bg-gradient-to-r from-[#d49e2a] to-[#e5b23d] hover:from-[#e5b23d] hover:to-[#f3c85f] text-[#122015] font-extrabold border-amber-400'
                        }`}
                      >
                        {isPagamentoStage ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        <span>
                          {isPagamentoStage
                            ? 'Reabrir Coleta de Membros'
                            : 'Avançar para Processo de Pagamento'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Header do Card com Capa e Título */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  
                  {/* Capa do Pacote com Ação de Editar Imagem (Requirement 3) */}
                  <div className="relative group/capa w-full sm:w-32 aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-[#0c150e] border border-[#203625] flex items-center justify-center shrink-0">
                    {pkg.imageUrl ? (
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.titulo}
                        className="w-full h-full object-contain p-1.5"
                      />
                    ) : (
                      <div className="text-center p-2 text-[#7a8e7d]">
                        <span className="text-2xl block mb-1">🔥</span>
                        <span className="text-[9px] font-rpg font-bold">Ponte dos Trolls</span>
                      </div>
                    )}

                    {isMaster && (
                      <button
                        type="button"
                        onClick={() => setImageEditPkg(pkg)}
                        className="absolute inset-0 bg-black/70 opacity-0 group-hover/capa:opacity-100 flex flex-col items-center justify-center gap-1 text-[10px] text-[#f4ecd8] font-semibold transition-opacity cursor-pointer p-1 text-center"
                        title="Editar imagem da capa"
                      >
                        <ImageIcon className="w-4 h-4 text-[#d49e2a]" />
                        <span>Editar Capa</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1c3222] text-[#d49e2a] border border-[#d49e2a]/30">
                        {pkg.sistema || 'Foundry VTT Geral'}
                      </span>
                      {pkg.tipo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1a3321] text-[#86efac] border border-[#22c55e]/30">
                          {pkg.tipo}
                        </span>
                      )}
                      <span className="text-[11px] text-[#7a8e7d]">
                        Aberto em {formatDateDisplay(pkg.criadoEm)}
                      </span>
                    </div>
                    <h2 className="font-rpg text-xl sm:text-2xl font-bold text-[#f4ecd8] leading-tight">
                      {pkg.titulo}
                    </h2>
                  </div>

                  {/* Ações de Mestre */}
                  {isMaster && (
                    <div className="flex flex-wrap items-center gap-1.5 bg-[#0e1911] p-1.5 rounded-xl border border-[#203625]">
                      <button
                        onClick={() => setImageEditPkg(pkg)}
                        className="p-1.5 text-[#d49e2a] hover:text-[#f4ecd8] hover:bg-[#1a2f20] rounded-lg transition-colors cursor-pointer"
                        title="Editar Imagem da Capa"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onMoveToCatalog(pkg)}
                        className="px-2.5 py-1 text-xs font-bold bg-[#1d3d25] hover:bg-[#275232] text-[#6ee7b7] border border-[#34d399]/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mover este pacote concluído para o Catálogo do Drive"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mover para Catálogo</span>
                      </button>
                      <button
                        onClick={() => onEditPackage(pkg)}
                        className="p-1.5 text-[#a4b5a6] hover:text-[#f4ecd8] hover:bg-[#1a2f20] rounded-lg transition-colors cursor-pointer"
                        title="Editar pacote"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePackage(pkg)}
                        className="p-1.5 text-[#a4b5a6] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Excluir pacote"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ==================== 2. BLOCO DE COBRANÇA EM GRANDE DESTAQUE (Requirement 5) ==================== */}
                {isPagamentoStage && (
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1b170c] via-[#141007] to-[#0f0c05] border-2 border-amber-500/80 shadow-2xl space-y-4 animate-in fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <Key className="w-4 h-4" />
                        <span>Dados Oficiais para Pagamento Pix:</span>
                      </div>
                      {!isBillingReady && isMaster && (
                        <button
                          type="button"
                          onClick={() => setConfigPaymentState({ pkg, isStartingStage: false })}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#122015] font-bold text-xs cursor-pointer"
                        >
                          Configurar Cobrança Agora
                        </button>
                      )}
                    </div>

                    {!isBillingReady ? (
                      <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
                        ⚠️ O Mestre ainda não definiu a chave Pix deste financiamento. Aguarde a liberação antes de efetuar transferências.
                      </div>
                    ) : (
                      <>
                        {/* Grade: Valor por participante + Prazo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* VALOR A PAGAR POR PARTICIPANTE */}
                          <div className="p-3.5 rounded-2xl bg-[#0c160f]/90 border border-amber-500/40">
                            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block">
                              VALOR A PAGAR POR PARTICIPANTE:
                            </span>
                            <span className="font-rpg text-2xl sm:text-3xl font-extrabold text-[#fbbf24] mt-0.5 block">
                              R$ {valorFinalCobrado.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[10px] text-[#8a9d8c] block mt-1">
                              Valor final fixado para cada um dos {count} participantes
                            </span>
                          </div>

                          {/* PAGAR ATÉ */}
                          <div className="p-3.5 rounded-2xl bg-[#0c160f]/90 border border-amber-500/40">
                            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              <span>PAGAR ATÉ:</span>
                            </span>
                            <span className="font-mono text-xl sm:text-2xl font-bold text-[#f4ecd8] mt-0.5 block">
                              {formatDateDisplay(pkg.dataPagamento)}
                            </span>
                            <span className="text-[10px] text-[#8a9d8c] block mt-1">
                              Prazo final para envio do Pix sem strikes
                            </span>
                          </div>
                        </div>

                        {/* Caixa da Chave Pix com Copiar */}
                        <div className="p-3.5 rounded-2xl bg-[#0c160f] border border-[#27442d] space-y-1.5">
                          <span className="text-[11px] font-semibold text-[#f4ecd8] block">
                            Chave Pix:
                          </span>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="flex-1 px-3 py-2 rounded-xl bg-[#142318] border border-[#27442d] font-mono text-xs text-[#f3efe6] select-all break-all">
                              {pkg.chavePix}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyPixKey(pkg)}
                              className="px-3.5 py-2 rounded-xl bg-[#233f2a] hover:bg-[#2c5236] text-[#6ee7b7] border border-[#34d399]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                            >
                              {copiedPixId === pkg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[#34d399]" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar chave Pix</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Instruções adicionais do Mestre */}
                        {pkg.instrucoesPix && (
                          <div className="p-3 rounded-xl bg-[#121c13] border border-[#1e3422] text-xs space-y-0.5">
                            <span className="text-[10px] text-[#d49e2a] uppercase font-bold block">
                              Instruções do Mestre:
                            </span>
                            <p className="text-[#c7d5c9] leading-relaxed">
                              {pkg.instrucoesPix}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Itens Inclusos com Miniaturas */}
                {pkg.itens && pkg.itens.length > 0 ? (
                  <div className="p-4 rounded-2xl bg-[#0c150e]/80 border border-[#1f3524] space-y-2.5">
                    <span className="text-[11px] font-bold text-[#d49e2a] uppercase tracking-wider block">
                      Itens inclusos no pacote ({pkg.itens.length}):
                    </span>
                    <div className="divide-y divide-[#182a1c]">
                      {pkg.itens.map((it) => (
                        <div key={it.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#16271a] border border-[#233f2a] flex items-center justify-center shrink-0">
                              {it.imageUrl ? (
                                <img src={it.imageUrl} alt={it.nome} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px]">📜</span>
                              )}
                            </div>

                            <span className="font-semibold text-[#f4ecd8]">{it.nome}</span>
                            <span className="text-[10px] bg-[#1a3321] text-[#a4b5a6] px-1.5 py-0.2 rounded border border-[#25462e]">
                              {it.sistema}
                            </span>
                            {it.tipo && (
                              <span className="text-[10px] bg-[#142618] text-[#86efac] px-1.5 py-0.2 rounded border border-[#22c55e]/20">
                                {it.tipo}
                              </span>
                            )}
                            {it.link && (
                              <a
                                href={it.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#6ee7b7] hover:underline flex items-center gap-0.5"
                                title="Ver link do produto"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#d49e2a]">
                            R$ {it.precoBRL.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  pkg.itensInclusos && pkg.itensInclusos.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#0c150e]/80 border border-[#1f3524] space-y-2">
                      <span className="text-[11px] font-bold text-[#d49e2a] uppercase tracking-wider block">
                        Itens inclusos neste pacote:
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#d1d5db]">
                        {pkg.itensInclusos.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#d49e2a] font-bold mt-0.5">✦</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}

                {/* Descrição */}
                {pkg.descricao && (
                  <p className="text-xs text-[#8a9d8c] leading-relaxed">
                    {pkg.descricao}
                  </p>
                )}

                {/* Box de Informações Financeiras Gerais (Quando em Coleta) */}
                {!isPagamentoStage && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#122015] border border-[#203625]">
                    <div>
                      <span className="text-[10px] text-[#7a8e7d] uppercase tracking-wider font-semibold block">
                        Valor Total do Pacote
                      </span>
                      <span className="font-mono text-lg sm:text-xl font-bold text-[#f4ecd8]">
                        R$ {valorTotal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#7a8e7d] uppercase tracking-wider font-semibold block">
                        Participantes Mínimos
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-[#6ee7b7] flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#34d399]" />
                        <span>{count} / {minimo}</span>
                      </span>
                    </div>

                    <div className="bg-gradient-to-r from-[#21351d] to-[#172b1a] p-3 rounded-xl border-2 border-[#d49e2a] shadow-md">
                      <span className="text-[10px] text-[#d49e2a] uppercase tracking-wider font-bold block">
                        Valor Estimado Máx / Pessoa:
                      </span>
                      <span className="font-rpg text-lg sm:text-xl font-bold text-[#fbbf24]">
                        R$ {valorMaximoPorPessoa.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                )}

                {/* ==================== 3. SEÇÃO DE PARTICIPANTES & PAGAMENTOS ==================== */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-[#a4b5a6] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#d49e2a]" />
                        <span>Lista de Participantes ({count}):</span>
                      </span>
                      {/* Contagem clara de pagamentos */}
                      <div className="flex items-center gap-3 text-[11px] text-[#8e9f90]">
                        <span>Total: <strong className="text-[#f4ecd8] font-mono">{count}</strong></span>
                        <span>·</span>
                        <span>Pagamento Informado: <strong className="text-[#34d399] font-mono">{informedCount}</strong></span>
                        <span>·</span>
                        <span>Pendentes: <strong className="text-amber-400 font-mono">{pendingCount}</strong></span>
                      </div>
                    </div>

                    {/* Botão exclusivo do Mestre: Copiar E-mails */}
                    {isMaster && (
                      <button
                        type="button"
                        onClick={() => handleCopyPaidEmails(pkg)}
                        className="px-3 py-1.5 rounded-xl bg-[#1b3322] hover:bg-[#254930] border border-[#34d399]/40 text-[#6ee7b7] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copiar e-mails de quem informou pagamento (1 por linha) para colar no Drive"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar e-mails de quem informou pagamento</span>
                      </button>
                    )}
                  </div>

                  {/* Destaque do Botão "PAGAR" para o Membro Participante com Pagamento Pendente (Requirement 6) */}
                  {isPagamentoStage && isUserSupporting && userSupporterRecord && (
                    <div className="p-4 rounded-2xl bg-[#142618] border-2 border-[#34d399]/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                      <div className="space-y-0.5 text-center sm:text-left">
                        <span className="text-xs font-bold text-[#f4ecd8] flex items-center justify-center sm:justify-start gap-1.5">
                          <CreditCard className="w-4 h-4 text-[#34d399]" />
                          <span>Sua Situação neste Financiamento:</span>
                        </span>
                        <p className="text-[11px] text-[#c7d5c9]">
                          {userPaidInformed
                            ? `Você declarou o pagamento em ${userPayDate ? formatDateDisplay(userPayDate.split('T')[0]) : 'data recente'}. O Mestre fará a conferência no extrato.`
                            : 'Você faz parte deste rateio. Realize o Pix e confirme seu pagamento!'}
                        </p>
                      </div>

                      {userPaidInformed ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-[#1a3824] text-[#6ee7b7] border border-[#34d399]/50 text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-[#34d399] stroke-[3]" />
                            <span>Pagamento informado</span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleTriggerPaymentDeclaration(
                                pkg,
                                userSupporterRecord.id,
                                userPaidInformed,
                                userSupporterRecord.nome
                              )
                            }
                            className="px-2.5 py-1.5 rounded-xl text-[11px] text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#122216] border border-[#25422d] transition-colors cursor-pointer"
                            title="Desfazer declaração de pagamento"
                          >
                            Desfazer
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPaymentInstructionsPkg(pkg)}
                          className="w-full sm:w-auto px-6 py-3 rounded-2xl font-rpg text-sm font-extrabold bg-gradient-to-r from-[#d49e2a] via-[#e5b23d] to-[#d49e2a] hover:from-[#e5b23d] hover:to-[#f3c85f] text-[#122015] shadow-xl shadow-amber-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 stroke-[2.5]" />
                          <span>PAGAR</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Grid de Participantes com Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-[#0c150e]/90 rounded-2xl border border-[#1f3524]">
                    {count === 0 ? (
                      <span className="text-xs text-[#7a8e7d] italic col-span-3 py-2 text-center">
                        Nenhum participante ainda. Seja o primeiro a apoiar este pacote!
                      </span>
                    ) : (
                      apoiadores.map((ap) => {
                        const pInfo = pagamentosMap[ap.id];
                        const isPaid = Boolean(pInfo?.informouPagamento || ap.pagamentoInformado);
                        const isSelf = currentUser && (currentUser.id === ap.id || currentUser.nome.toLowerCase() === ap.nome.toLowerCase());

                        // Resolve o nome mais recente pelo cadastro de usuários
                        const matchedUser = allUsers.find(u => u.id === ap.id);
                        const displayName = matchedUser?.nome || ap.nome;

                        return (
                          <div
                            key={ap.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                              isPaid
                                ? 'bg-[#13281a] border-emerald-500/40'
                                : 'bg-[#101b13] border-[#1d3322]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-5 h-5 rounded-full bg-[#1b3120] border border-[#2a4d32] text-[10px] flex items-center justify-center text-[#d49e2a] font-bold shrink-0">
                                {isPaid ? '✓' : '•'}
                              </span>
                              <div className="truncate">
                                <span className="font-semibold text-[#f4ecd8] truncate block">
                                  {displayName}
                                  {isSelf && (
                                    <span className="ml-1 text-[10px] text-[#d49e2a] font-normal">(Você)</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isPaid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  Informado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1d271f] text-[#8e9f90] border border-[#273d2c]">
                                  Pendente
                                </span>
                              )}

                              {/* Mestre pode alterar declaração de qualquer participante */}
                              {isMaster && isPagamentoStage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTriggerPaymentDeclaration(
                                      pkg,
                                      ap.id,
                                      isPaid,
                                      displayName
                                    )
                                  }
                                  className="text-[10px] text-[#a4b5a6] hover:text-[#f4ecd8] px-2 py-0.5 rounded bg-[#172b1c] border border-[#27442d] hover:border-[#388554] cursor-pointer"
                                  title="Alterar status de pagamento deste participante"
                                >
                                  {isPaid ? 'Desmarcar' : 'Marcar'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ==================== 4. BARRA DE AÇÕES (Requirement 2: Anúncio de WhatsApp Removido) ==================== */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#1f3524]">
                    {/* Botão de Participar / Sair da Vaquinha */}
                    {isPagamentoStage && !isMaster ? (
                      <span className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a2b1e] border border-[#28492f] text-[#a4b5a6] inline-flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Lista travada (Processo de Pagamento)</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleParticipateClick(pkg)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                          isUserSupporting
                            ? 'bg-[#1c3825] hover:bg-[#254d31] text-[#6ee7b7] border border-[#34d399]/50 shadow-[#34d399]/10'
                            : 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-[#d49e2a]/20 hover:scale-[1.02]'
                        }`}
                      >
                        {isUserSupporting ? (
                          <>
                            <Check className="w-4 h-4 text-[#34d399] stroke-[3]" />
                            <span>Participando da Vaquinha (Clique para Sair)</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 stroke-[2.5]" />
                            <span>Participar deste Financiamento</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ==================== MODAL DE CONFIGURAR COBRANÇA (MESTRE - Requirement 4) ==================== */}
      {configPaymentState && (
        <ConfigurePaymentModal
          isOpen={Boolean(configPaymentState)}
          pkg={configPaymentState.pkg}
          isStartingStage={configPaymentState.isStartingStage}
          onClose={() => setConfigPaymentState(null)}
          onConfirm={async (params) => {
            await onConfigurePayment({
              packageId: configPaymentState.pkg.id,
              ...params,
            });
          }}
          onToast={onToast}
        />
      )}

      {/* ==================== MODAL DE INSTRUÇÕES DE PAGAMENTO (MEMBRO - Requirement 6) ==================== */}
      {paymentInstructionsPkg && (
        <PaymentInstructionsModal
          isOpen={Boolean(paymentInstructionsPkg)}
          pkg={paymentInstructionsPkg}
          currentUser={currentUser}
          onClose={() => setPaymentInstructionsPkg(null)}
          onConfirmPayment={async (pkgId, memberId) => {
            await onUpdatePayment(pkgId, memberId, true);
          }}
          onToast={onToast}
        />
      )}

      {/* ==================== MODAL DE EDITAR CAPA DO PACOTE (MESTRE - Requirement 3) ==================== */}
      {imageEditPkg && (
        <EditPackageImageModal
          isOpen={Boolean(imageEditPkg)}
          pkg={imageEditPkg}
          onClose={() => setImageEditPkg(null)}
          onSave={async (packageId, newImageUrl, adminPassword) => {
            await onUpdatePackageImage(packageId, newImageUrl, adminPassword);
          }}
          onToast={onToast}
        />
      )}

      {/* ==================== MODAL DE REABRIR COLETA (MESTRE) ==================== */}
      {reopenColetaPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-emerald-500/70 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#142c1c] to-[#122015] border-b border-[#203625] flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Unlock className="w-5 h-5" />
                <h3 className="font-rpg text-base font-bold text-[#f4ecd8]">
                  Reabrir Coleta de Membros
                </h3>
              </div>
              <button
                onClick={() => setReopenColetaPkg(null)}
                className="p-1 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReopenColeta} className="p-5 space-y-4 text-xs">
              <p className="text-[#c7d5c9] leading-relaxed">
                Ao reabrir a etapa de coleta, novos membros poderão novamente entrar e sair livremente da lista de participantes deste pacote.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#f4ecd8] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#d49e2a]" />
                  <span>Senha do Mestre para confirmar:</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Digite a senha de administrador..."
                  value={stageAdminPassword}
                  onChange={(e) => {
                    setStageAdminPassword(e.target.value);
                    if (stageError) setStageError('');
                  }}
                  className="w-full bg-[#0c150e] border border-[#233a29] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-[#f3efe6] font-mono focus:outline-none"
                />
              </div>

              {stageError && (
                <div className="text-xs text-red-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{stageError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f3524]">
                <button
                  type="button"
                  onClick={() => setReopenColetaPkg(null)}
                  disabled={isUpdatingStage}
                  className="px-4 py-2 text-xs text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#16271a] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStage}
                  className="px-4 py-2 text-xs font-bold text-[#122015] bg-[#34d399] hover:bg-[#22c55e] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStage ? 'Reabrindo...' : 'Confirmar Reabertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Participação */}
      {packageToCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-[#d49e2a]/70 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#211b0e] to-[#122015] border-b border-[#302410] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#d49e2a]">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-rpg text-base font-bold text-[#f4ecd8]">
                  Confirmar Participação no Rateio
                </h3>
              </div>
              <button
                onClick={() => setPackageToCommit(null)}
                className="p-1 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#c7d5c9] leading-relaxed">
                Você está entrando na lista de cotistas de <strong>{packageToCommit.titulo}</strong>.
              </p>
              <div className="p-3 rounded-xl bg-[#0c150e] border border-[#203625] space-y-1">
                <span className="text-[10px] text-[#7a8e7d] uppercase font-bold block">
                  Compromisso Financeiro:
                </span>
                <span className="text-sm font-bold text-[#d49e2a]">
                  Estimativa máxima: R$ {(packageToCommit.valorMaximoPorPessoa || (packageToCommit.valorTotalBRL / (packageToCommit.minimoParticipantes || 1))).toFixed(2).replace('.', ',')}
                </span>
                <p className="text-[10px] text-[#8a9d8c] pt-0.5">
                  Ao atingir a meta e entrar em Processo de Pagamento, todos os membros da lista devem efetuar a transferência no prazo.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f3524]">
                <button
                  type="button"
                  onClick={() => setPackageToCommit(null)}
                  className="px-4 py-2 text-xs text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#16271a] rounded-xl cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCommitment}
                  className="px-4 py-2 text-xs font-bold text-[#122015] bg-[#d49e2a] hover:bg-[#e5b23d] rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Confirmar e Entrar na Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Declaração de Pagamento */}
      {paymentConfirmPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-amber-500/70 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#211b0e] to-[#122015] border-b border-[#302410] flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-rpg text-base font-bold text-[#f4ecd8]">
                  {paymentConfirmPkg.informou ? 'Confirmar Pagamento Realizado' : 'Desfazer Declaração de Pagamento'}
                </h3>
              </div>
              <button
                onClick={() => setPaymentConfirmPkg(null)}
                className="p-1 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#c7d5c9] leading-relaxed">
                {paymentConfirmPkg.informou ? (
                  <>
                    Você confirma que o participante <strong>{paymentConfirmPkg.memberName}</strong> já efetuou a transferência/PIX para este pacote?
                  </>
                ) : (
                  <>
                    Deseja realmente desmarcar o status de pagamento de <strong>{paymentConfirmPkg.memberName}</strong> e retornar para pendente?
                  </>
                )}
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f3524]">
                <button
                  type="button"
                  onClick={() => setPaymentConfirmPkg(null)}
                  disabled={isUpdatingPayment}
                  className="px-4 py-2 text-xs text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#16271a] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPaymentDeclaration}
                  disabled={isUpdatingPayment}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                    paymentConfirmPkg.informou
                      ? 'bg-[#34d399] hover:bg-[#22c55e] text-[#0f2415]'
                      : 'bg-amber-500 hover:bg-amber-400 text-[#122015]'
                  }`}
                >
                  {isUpdatingPayment ? 'Salvando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
