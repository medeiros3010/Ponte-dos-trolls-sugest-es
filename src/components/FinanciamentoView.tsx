import React, { useState } from 'react';
import {
  FundingPackage,
  UserProfile,
  FundingStage,
  ADMIN_PASSWORD,
} from '../types';
import {
  Plus,
  ExternalLink,
  Users,
  Check,
  Edit2,
  Trash2,
  Calendar,
  Copy,
  CreditCard,
  Image as ImageIcon,
  CheckCircle2,
  Coins,
  ChevronDown,
  X,
  Mail,
  Tag,
  ArrowRight,
  ShieldCheck,
  FolderUp,
  Loader2,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatDateDisplay, extractPaidMemberEmails } from '../utils/helpers';
import { EditPackageImageModal } from './EditPackageImageModal';
import { ConfigurePaymentModal } from './ConfigurePaymentModal';
import { PaymentInstructionsModal } from './PaymentInstructionsModal';
import { FundingParticipantsModal } from './FundingParticipantsModal';
import { PageBanner } from './PageBanner';

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

  // Participants Inspection Modal state
  const [viewingParticipantsPkg, setViewingParticipantsPkg] = useState<FundingPackage | null>(null);

  // Card Menu Dropdown State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Member Payment Declaration Confirmation Modal
  const [paymentConfirmPkg, setPaymentConfirmPkg] = useState<{
    pkg: FundingPackage;
    memberId: string;
    informou: boolean;
    memberName: string;
  } | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Copied Pix Feedback per package card
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Undo Payment State (Informei por engano — desfazer)
  const [undoPaymentPkg, setUndoPaymentPkg] = useState<FundingPackage | null>(null);
  const [isUndoingPayment, setIsUndoingPayment] = useState(false);
  const [undoLockedInfo, setUndoLockedInfo] = useState<{ pkg: FundingPackage; reason: string } | null>(null);

  const handleRequestUndoPayment = (pkg: FundingPackage) => {
    // Se o acesso já foi liberado no drive ou se o pacote foi para o Catálogo, orienta a falar com o Mestre
    const isAccessReleased = pkg.status === 'Catálogo' || Boolean(pkg.linkDrive && pkg.linkDrive.trim());
    if (isAccessReleased) {
      setUndoLockedInfo({
        pkg,
        reason: 'O acesso aos materiais deste financiamento já foi disponibilizado pelo Mestre ou o pacote foi finalizado. Para manter a segurança e o controle administrativo, qualquer alteração posterior deve ser solicitada diretamente ao Mestre da Ponte.',
      });
      return;
    }
    setUndoPaymentPkg(pkg);
  };

  const handleConfirmUndoPayment = async () => {
    if (!undoPaymentPkg) return;
    try {
      setIsUndoingPayment(true);
      await onUpdatePayment(undoPaymentPkg.id, currentUser.id, false);
      onToast('Declaração de pagamento desfeita com sucesso. Situação alterada para Pendente.');
      setUndoPaymentPkg(null);
    } catch (err: any) {
      onToast(err?.message || 'Erro ao desfazer pagamento.');
    } finally {
      setIsUndoingPayment(false);
    }
  };

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
      onToast(`Você retirou sua participação de "${pkg.titulo}".`);
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

  const handleTogglePaymentStatus = (pkg: FundingPackage, memberId: string, currentStatus: boolean, memberName: string) => {
    if (!isMaster) return;
    setPaymentConfirmPkg({
      pkg,
      memberId,
      informou: !currentStatus,
      memberName,
    });
  };

  const handleConfirmTogglePayment = async () => {
    if (!paymentConfirmPkg) return;
    try {
      setIsUpdatingPayment(true);
      await onUpdatePayment(paymentConfirmPkg.pkg.id, paymentConfirmPkg.memberId, paymentConfirmPkg.informou);
      onToast(`Status de pagamento de ${paymentConfirmPkg.memberName} atualizado para: ${paymentConfirmPkg.informou ? 'PAGO' : 'PENDENTE'}`);
      setPaymentConfirmPkg(null);
    } catch (err: any) {
      onToast('Erro ao atualizar status de pagamento');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Banner Superior com Arte dos Trolls (Fiel ao Print 3 / image_dc50d762.png) */}
      <PageBanner
        title="Juntos, a próxima aventura"
      />

      {/* Cabeçalho da Seção: Título à Esquerda + Botão Criar Financiamento à Direita */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <Coins className="w-6 h-6 text-[#716016] shrink-0" />
          <h2 className="font-rpg text-xl sm:text-2xl font-bold text-[#302414]">
            Financiamentos em andamento
          </h2>
        </div>

        {isMaster && (
          <button
            onClick={onOpenCreatePackage}
            className="px-4 py-2.5 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Criar financiamento</span>
          </button>
        )}
      </div>

      {/* Lista de Financiamentos (Grid de 2 Colunas Amplo, Fiel ao Print 3) */}
      {openPackages.length === 0 ? (
        <div className="parchment-card p-12 text-center my-6">
          <Coins className="w-12 h-12 text-[#716016] mx-auto mb-3 opacity-60" />
          <h3 className="font-rpg text-lg font-bold text-[#302414]">
            Nenhum financiamento em andamento
          </h3>
          <p className="text-xs text-[#71634D] max-w-sm mx-auto mt-1 mb-4">
            No momento não há pacotes abertos para adesão ou pagamento. Novas vaquinhas serão abertas pelo Mestre em breve!
          </p>
          {isMaster && (
            <button
              onClick={onOpenCreatePackage}
              className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Criar o primeiro financiamento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {openPackages.map((pkg) => {
            const isColeta = (pkg.etapaFinanciamento || 'COLETA') === 'COLETA';
            const apoiadores = pkg.apoiadores || [];
            const isUserParticipant = apoiadores.some(
              (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
            );

            // Cálculos
            const totalCotistas = apoiadores.length;
            const metaMinima = pkg.minimoParticipantes || 35;
            const progressoPct = Math.min(100, Math.round((totalCotistas / metaMinima) * 100));

            const cotaEstimada = totalCotistas > 0
              ? pkg.valorTotalBRL / Math.max(totalCotistas, metaMinima)
              : pkg.valorTotalBRL / metaMinima;

            const cotaReal = totalCotistas > 0 ? pkg.valorTotalBRL / totalCotistas : pkg.valorTotalBRL;

            const valorFinalCobrado = typeof pkg.valorFinalPorParticipante === 'number'
              ? pkg.valorFinalPorParticipante
              : cotaReal;

            // Participantes pagamentos
            const totalPagos = apoiadores.filter((ap) => {
              const info = pkg.pagamentos && pkg.pagamentos[ap.id];
              return Boolean(info?.informouPagamento || ap.pagamentoInformado);
            }).length;
            const totalPendentes = Math.max(0, totalCotistas - totalPagos);

            return (
              <div
                key={pkg.id}
                className="parchment-card overflow-hidden flex flex-col border-[#C6AD78] shadow-sm hover:shadow-md transition-shadow"
              >
                {/* RIBBON SUPERIOR DA ETAPA (Fiel ao Print 3) */}
                <div
                  className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider ${
                    isColeta
                      ? 'bg-[#D4A538] text-[#322105]'
                      : 'bg-[#384518] text-[#F8EDD5]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isColeta ? (
                      <>
                        <Users className="w-4 h-4" />
                        <span>EM COLETA DE MEMBROS</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-[#a8d363]" />
                        <span>PROCESSO DE PAGAMENTO</span>
                      </>
                    )}
                  </div>

                  {/* Ações do Mestre no Ribbon */}
                  {isMaster && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditPackage(pkg)}
                        className="p-1 rounded hover:bg-black/15 transition-colors cursor-pointer"
                        title="Editar detalhes do pacote"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* 3 Pontos Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === pkg.id ? null : pkg.id)}
                          className="p-1 rounded hover:bg-black/15 transition-colors cursor-pointer"
                          title="Opções do Mestre"
                        >
                          <span className="text-xs font-bold leading-none px-0.5">⋮</span>
                        </button>

                        {activeMenuId === pkg.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-56 bg-[#F8EDD5] text-[#302414] rounded-xl shadow-xl border border-[#C6AD78] py-1.5 z-50 normal-case tracking-normal font-normal animate-in fade-in-50"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setConfigPaymentState({ pkg, isStartingStage: isColeta });
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-[#48551F]" />
                              <span>{isColeta ? 'Iniciar Etapa de Pagamento' : 'Editar Cobrança / Pix'}</span>
                            </button>

                            {!isColeta && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setReopenColetaPkg(pkg);
                                  setStageAdminPassword('');
                                  setStageError('');
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5 text-[#716016]" />
                                <span>Reabrir Coleta de Membros</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onMoveToCatalog(pkg);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                            >
                              <FolderUp className="w-3.5 h-3.5 text-[#48551F]" />
                              <span>Transferir para o Catálogo</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleCopyPaidEmails(pkg);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#716016]" />
                              <span>Copiar E-mails Pagos</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setImageEditPkg(pkg);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-[#48551F]" />
                              <span>Alterar Imagem da Capa</span>
                            </button>

                            <div className="border-t border-[#D6C296] my-1" />

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeletePackage(pkg);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 text-[#8b261b] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#8b261b]" />
                              <span>Excluir Financiamento</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Banner de Capa */}
                <div className="relative aspect-[21/8] bg-[#282D13] overflow-hidden">
                  {pkg.imageUrl ? (
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#8c9c64] bg-[#222710]">
                      <Coins className="w-10 h-10 opacity-70" />
                    </div>
                  )}
                </div>

                {/* Corpo do Card */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  
                  {/* Seção 1: Título, Badges e Itens Inclusos */}
                  <div>
                    <h3 className="font-rpg text-xl font-bold text-[#302414] leading-snug">
                      {pkg.titulo}
                    </h3>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 mb-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDE2CA] text-[#55482e] border border-[#D5C49F]">
                        {pkg.sistema || 'Foundry VTT Geral'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5DBC1] text-[#55482e] border border-[#D5C49F]">
                        {pkg.tipo || 'Material para VTT'}
                      </span>
                    </div>

                    {/* Itens Inclusos */}
                    <p className="text-xs text-[#71634D] leading-relaxed">
                      <strong className="text-[#302414]">
                        📦 {pkg.itens?.length || pkg.itensInclusos?.length || 1} itens inclusos:
                      </strong>{' '}
                      {pkg.itens && pkg.itens.length > 0
                        ? pkg.itens.map((i) => i.nome).join(' · ')
                        : pkg.itensInclusos?.join(' · ') || 'Módulos e compêndios digitais'}
                    </p>
                  </div>

                  {/* CASO 1: ETAPA DE COLETA DE MEMBROS (Fiel ao Cartão Esquerdo de image_dc50d762.png) */}
                  {isColeta && (
                    <>
                      {/* Progresso de Adesão */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setViewingParticipantsPkg(pkg)}
                            className="font-semibold text-[#302414] hover:text-[#48551F] flex items-center gap-1.5 cursor-pointer group text-left transition-colors"
                            title="Clique para ver a lista de participantes com ranks RPG"
                          >
                            <Users className="w-3.5 h-3.5 text-[#716016] group-hover:scale-110 transition-transform" />
                            <span>
                              <strong>{totalCotistas}</strong> de {metaMinima} participantes
                            </span>
                            <span className="text-[11px] text-[#48551F] font-bold underline underline-offset-2 ml-1">
                              · Ver lista
                            </span>
                          </button>
                          <span className="text-[#71634D]">
                            Total do pacote:{' '}
                            <strong className="text-[#302414] font-mono">
                              R$ {pkg.valorTotalBRL.toFixed(2).replace('.', ',')}
                            </strong>
                          </span>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="h-2.5 w-full bg-[#E5DBC1] rounded-full overflow-hidden border border-[#D5C49F]">
                          <div
                            className="h-full bg-[#48551F] rounded-full transition-all duration-300"
                            style={{ width: `${progressoPct}%` }}
                          />
                        </div>
                      </div>

                      {/* 2 Caixas de Destaque: Cota Estimada & Prazo de Adesão */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {/* Caixa 1: Cota Estimada */}
                        <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296]">
                          <div className="flex items-center gap-1.5 text-xs text-[#71634D] mb-1">
                            <Tag className="w-3.5 h-3.5 text-[#716016]" />
                            <span>Cota estimada</span>
                          </div>
                          <span className="font-mono text-xl font-bold text-[#302414]">
                            R$ {cotaEstimada.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        {/* Caixa 2: Adesões até */}
                        <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296]">
                          <div className="flex items-center gap-1.5 text-xs text-[#71634D] mb-1">
                            <Calendar className="w-3.5 h-3.5 text-[#716016]" />
                            <span>Adesões até</span>
                          </div>
                          <span className="font-mono text-base font-bold text-[#302414] block">
                            {formatDateDisplay(pkg.dataFinalizar) || 'Em breve'}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação na Coleta */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#D6C296]">
                        {isUserParticipant ? (
                          <button
                            onClick={() => handleParticipateClick(pkg)}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-[#dbe6c2] hover:bg-[#cfdcaf] text-[#354817] border border-[#8ea259] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Você está na lista (Sair)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleParticipateClick(pkg)}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            <Users className="w-4 h-4" />
                            <span>Participar</span>
                          </button>
                        )}

                        {isMaster && (
                          <button
                            onClick={() => setConfigPaymentState({ pkg, isStartingStage: true })}
                            className="py-2.5 px-4 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-xs font-bold text-[#302414] flex items-center gap-1.5 cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4 text-[#716016]" />
                            <span>Iniciar pagamento</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* CASO 2: ETAPA DE PROCESSO DE PAGAMENTO (Fiel ao Cartão Direito de image_dc50d762.png) */}
                  {!isColeta && (
                    <>
                      {/* Caixa de Destaque do Pagamento: Valor Final + Prazo */}
                      <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] flex items-center justify-between gap-4">
                        <div>
                          <span className="font-mono text-2xl sm:text-3xl font-bold text-[#302414]">
                            R$ {valorFinalCobrado.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-xs text-[#71634D] block mt-0.5">
                            por participante
                          </span>
                        </div>

                        <div className="text-right border-l border-[#D6C296] pl-4">
                          <span className="text-xs text-[#71634D] flex items-center justify-end gap-1 mb-0.5">
                            <Calendar className="w-3.5 h-3.5 text-[#716016]" />
                            <span>Pagar até</span>
                          </span>
                          <span className="font-mono text-sm sm:text-base font-bold text-[#302414]">
                            {formatDateDisplay(pkg.dataPagamento) || 'Definir'}
                          </span>
                        </div>
                      </div>

                      {/* Linha do Pix + Botão PAGAR */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#EDE2CA] border border-[#C6AD78]">
                        {/* Chave Pix e Copiar */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-[#716016] font-bold">💠</span>
                          <div className="truncate">
                            <span className="text-[10px] uppercase font-bold text-[#71634D] block">
                              Chave Pix:
                            </span>
                            <span className="font-mono text-xs font-semibold text-[#302414] select-all truncate block">
                              {pkg.chavePix || 'Chave Pix não informada'}
                            </span>
                          </div>
                          {pkg.chavePix && (
                            <button
                              onClick={() => handleCopyPixKey(pkg)}
                              className="p-1 text-[#71634D] hover:text-[#302414] cursor-pointer"
                              title="Copiar Chave Pix"
                            >
                              {copiedPixId === pkg.id ? (
                                <Check className="w-3.5 h-3.5 text-[#48551F]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Botão PAGAR / Pagamento informado & Desfazer */}
                        {(() => {
                          const paymentInfo = pkg.pagamentos && pkg.pagamentos[currentUser.id];
                          const participantRecord = (pkg.apoiadores || []).find(
                            (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
                          );
                          const userHasPaid = Boolean(paymentInfo?.informouPagamento || participantRecord?.pagamentoInformado);

                          if (userHasPaid) {
                            return (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88] text-xs font-bold shadow-sm">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Pagamento informado</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRequestUndoPayment(pkg)}
                                  className="text-[11px] text-[#875508] hover:text-[#5a3805] underline underline-offset-2 cursor-pointer font-medium"
                                  title="Clique caso tenha informado o pagamento por engano"
                                >
                                  Informei por engano — desfazer
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col items-end">
                              <button
                                onClick={() => setPaymentInstructionsPkg(pkg)}
                                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>PAGAR</span>
                              </button>
                              <span className="text-[10px] text-[#71634D] italic mt-1 text-center sm:text-right">
                                Confirme no site após fazer o Pix.
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Lista de Apoiadores e Situação de Pagamento (Fiel ao Print 3) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs pb-0.5">
                          <span className="font-bold text-[#302414] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#716016]" />
                            <span>Participantes ({apoiadores.length}):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingParticipantsPkg(pkg)}
                            className="text-[11px] text-[#48551F] hover:underline font-bold cursor-pointer"
                          >
                            Ver lista completa · Ranks
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {apoiadores.map((ap) => {
                          const paymentInfo = pkg.pagamentos && pkg.pagamentos[ap.id];
                          const hasPaid = Boolean(paymentInfo?.informouPagamento || ap.pagamentoInformado);

                          return (
                            <div
                              key={ap.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#FBF4E4] border border-[#D6C296] text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-[#71634D]">👤</span>
                                <span className="font-medium text-[#302414] truncate">
                                  {ap.nome}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {hasPaid ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88] flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Pagamento informado</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#fae8b4] text-[#875508] border border-[#e3c578]">
                                    Pendente
                                  </span>
                                )}

                                {isMaster && (
                                  <button
                                    onClick={() => handleTogglePaymentStatus(pkg, ap.id, hasPaid, ap.nome)}
                                    className="p-1 text-[#71634D] hover:text-[#48551F] cursor-pointer"
                                    title="Alterar status de pagamento do membro"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                      {/* Rodapé da Etapa: Resumo dos Pagos + Copiar E-mails */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D6C296] text-xs">
                        <span className="text-[#71634D] font-medium">
                          <strong className="text-[#302414] font-mono">{totalPagos}</strong> informados ·{' '}
                          <strong className="text-[#875508] font-mono">{totalPendentes}</strong> pendentes
                        </span>

                        <button
                          onClick={() => handleCopyPaidEmails(pkg)}
                          className="px-3 py-1.5 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-[#302414] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Copiar lista de e-mails de quem já pagou para liberar acesso no Google Drive"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#716016]" />
                          <span>Copiar e-mails</span>
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== MODAIS DE FINANCIAMENTO ==================== */}

      {/* Modal de Confirmação de Participação / Adesão */}
      {packageToCommit && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-lg font-bold text-[#302414] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#48551F]" />
                <span>Confirmar Participação</span>
              </h3>
              <button
                onClick={() => setPackageToCommit(null)}
                className="p-1 text-[#71634D] hover:text-[#302414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#71634D] leading-relaxed">
              Você está prestes a entrar no rateio oficial de <strong className="text-[#302414]">"{packageToCommit.titulo}"</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs space-y-1.5">
              <p className="text-[#71634D]">
                Total do pacote: <strong className="text-[#302414]">R$ {packageToCommit.valorTotalBRL.toFixed(2)}</strong>
              </p>
              <p className="text-[#71634D]">
                Participantes atuais: <strong className="text-[#302414]">{(packageToCommit.apoiadores || []).length} pessoas</strong>
              </p>
              <p className="text-[11px] text-[#716016] font-medium pt-1">
                ⚠️ Compromisso de honra da comunidade: ao colocar seu nome, você se compromete a efetuar o Pix quando o Mestre abrir o pagamento.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPackageToCommit(null)}
                className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCommitment}
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Confirmar e Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reabertura de Coleta (Mestre) */}
      {reopenColetaPkg && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReopenColeta}
            className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-base font-bold text-[#302414] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#716016]" />
                <span>Reabrir Coleta de Membros</span>
              </h3>
              <button
                type="button"
                onClick={() => setReopenColetaPkg(null)}
                className="p-1 text-[#71634D] hover:text-[#302414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#71634D]">
              Tem certeza que deseja reabrir a fase de coleta para o pacote <strong>"{reopenColetaPkg.titulo}"</strong>? A lista de participantes voltará a aceitar novas adesões e desistências.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">Senha do Mestre:</label>
              <input
                type="password"
                required
                value={stageAdminPassword}
                onChange={(e) => setStageAdminPassword(e.target.value)}
                placeholder="Digite a senha de administrador"
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            {stageError && (
              <p className="text-xs text-[#8b261b] font-medium">{stageError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReopenColetaPkg(null)}
                className="px-3.5 py-2 bg-[#EADBBE] rounded-xl text-xs font-semibold text-[#302414]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdatingStage}
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold cursor-pointer"
              >
                {isUpdatingStage ? 'Reabrindo...' : 'Reabrir Coleta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Confirmação de Alteração de Pagamento de Membro (Mestre) */}
      {paymentConfirmPkg && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="parchment-card w-full max-w-sm p-5 space-y-3.5 shadow-2xl animate-in fade-in-50">
            <h3 className="font-rpg text-base font-bold text-[#302414]">
              Alterar Situação de Pagamento
            </h3>
            <p className="text-xs text-[#71634D]">
              Alterar o status de <strong>{paymentConfirmPkg.memberName}</strong> para{' '}
              <strong className={paymentConfirmPkg.informou ? 'text-[#2f5c1a]' : 'text-[#875508]'}>
                {paymentConfirmPkg.informou ? 'PAGAMENTO INFORMADO' : 'PENDENTE'}
              </strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentConfirmPkg(null)}
                className="px-3.5 py-1.5 bg-[#EADBBE] rounded-xl text-xs font-semibold text-[#302414]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isUpdatingPayment}
                onClick={handleConfirmTogglePayment}
                className="px-4 py-1.5 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold"
              >
                {isUpdatingPayment ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Cobrança / Iniciar Pagamento */}
      {configPaymentState && (
        <ConfigurePaymentModal
          isOpen={Boolean(configPaymentState)}
          packageItem={configPaymentState.pkg}
          isStartingStage={configPaymentState.isStartingStage}
          onClose={() => setConfigPaymentState(null)}
          onSaveConfig={onConfigurePayment}
          onToast={onToast}
        />
      )}

      {/* Modal de Instruções de Pagamento e Declaração de Pix */}
      {paymentInstructionsPkg && (
        <PaymentInstructionsModal
          isOpen={Boolean(paymentInstructionsPkg)}
          packageItem={paymentInstructionsPkg}
          currentUser={currentUser}
          onClose={() => setPaymentInstructionsPkg(null)}
          onConfirmPayment={async (pkgId, memberId) => {
            await onUpdatePayment(pkgId, memberId, true);
          }}
          onToast={onToast}
        />
      )}

      {/* Modal de Edição de Imagem de Capa */}
      {imageEditPkg && (
        <EditPackageImageModal
          isOpen={Boolean(imageEditPkg)}
          packageItem={imageEditPkg}
          onClose={() => setImageEditPkg(null)}
          onUpdateImage={onUpdatePackageImage}
          onToast={onToast}
        />
      )}

      {/* Modal de Consulta de Participantes com Ranks RPG e Privacidade */}
      {viewingParticipantsPkg && (
        <FundingParticipantsModal
          isOpen={Boolean(viewingParticipantsPkg)}
          onClose={() => setViewingParticipantsPkg(null)}
          packageItem={viewingParticipantsPkg}
          allUsers={allUsers}
          currentUser={currentUser}
          packages={packages}
          onTogglePaymentStatus={handleTogglePaymentStatus}
        />
      )}

      {/* Modal de Confirmação para Desfazer Pagamento Informado por Engano */}
      {undoPaymentPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in">
          <div className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl border-[#C6AD78]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-base sm:text-lg font-bold text-[#302414] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#875508]" />
                <span>Desfazer Confirmação</span>
              </h3>
              <button
                type="button"
                onClick={() => setUndoPaymentPkg(null)}
                className="p-1 text-[#71634D] hover:text-[#302414] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#55482e] leading-relaxed">
              Você confirma que deseja desfazer a declaração de pagamento de <strong>"{undoPaymentPkg.titulo}"</strong>?
            </p>

            <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs text-[#71634D] space-y-1">
              <div>Sua situação voltará a constar como <strong>Pendente</strong> na lista deste rateio.</div>
              <div className="text-[11px] text-[#716016] font-medium pt-1">
                Você poderá realizar e confirmar o Pix novamente a qualquer momento antes do prazo.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isUndoingPayment}
                onClick={() => setUndoPaymentPkg(null)}
                className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isUndoingPayment}
                onClick={handleConfirmUndoPayment}
                className="px-4 py-2 bg-[#875508] hover:bg-[#6c4305] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isUndoingPayment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Desfazendo...</span>
                  </>
                ) : (
                  <span>Sim, desfazer pagamento</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal quando o estorno requer intervenção direta do Mestre */}
      {undoLockedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in">
          <div className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl border-[#C6AD78]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-base sm:text-lg font-bold text-[#302414] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#875508]" />
                <span>Solicitar Ajuste ao Mestre</span>
              </h3>
              <button
                type="button"
                onClick={() => setUndoLockedInfo(null)}
                className="p-1 text-[#71634D] hover:text-[#302414] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#55482e] leading-relaxed">
              {undoLockedInfo.reason}
            </p>

            <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs font-semibold text-[#302414]">
              📦 {undoLockedInfo.pkg.titulo}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUndoLockedInfo(null)}
                className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
              <a
                href={`https://wa.me/5519981512030?text=${encodeURIComponent(`Olá, Mestre! Preciso de um ajuste no meu pagamento do pacote "${undoLockedInfo.pkg.titulo}". Meu nome é ${currentUser.nome}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Falar com o Mestre</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
