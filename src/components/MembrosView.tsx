import React, { useState, useMemo } from 'react';
import { UserProfile, FundingPackage, ItemRPG, MembershipApplication } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  Package,
  Coins,
  Edit2,
  Check,
  X,
  ChevronDown,
  BookOpen,
  Compass,
  Crown,
  Sparkles,
  Sun,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { PageBanner } from './PageBanner';
import { getUserRank, getUserAcquiredPackages } from '../utils/ranksAndAcquisitions';
import { CandidateReviewModal } from './CandidateReviewModal';
import { MemberAcervoModal } from './MemberAcervoModal';
import { WelcomeMessageModal } from './WelcomeMessageModal';
import { RulesConfig } from '../data/rulesAndQuestions';
import { RankBadgeIcon } from './RankBadge';

interface MembrosViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  packages: FundingPackage[];
  items: ItemRPG[];
  applications?: MembershipApplication[];
  rulesConfig?: RulesConfig;
  onGoHome: () => void;
  onAddUser: (newUser: Omit<UserProfile, 'id'>) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onApproveApplication?: (applicationId: string, adminPassword: string) => Promise<boolean>;
  onRejectApplication?: (applicationId: string, observacoes: string, adminPassword: string) => Promise<boolean>;
  onOpenSyncOfficialModal?: () => void;
  onToast: (msg: string) => void;
}

export const MembrosView: React.FC<MembrosViewProps> = ({
  users,
  currentUser,
  packages,
  items,
  applications = [],
  rulesConfig,
  onGoHome,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onApproveApplication,
  onRejectApplication,
  onOpenSyncOfficialModal,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'membros' | 'solicitacoes'>('membros');
  const [selectedApplication, setSelectedApplication] = useState<MembershipApplication | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('nome-az');

  // Filtros da aba de solicitações
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [appFilterStatus, setAppFilterStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'recusado'>('todos');

  const isMaster = Boolean(currentUser.isMaster);

  // Modais de Cadastro e Edição de Membro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<UserProfile | null>(null);
  const [memberToViewAcervo, setMemberToViewAcervo] = useState<UserProfile | null>(null);
  const [welcomeMember, setWelcomeMember] = useState<{ nome: string; telefone: string } | null>(null);
  const [activeMemberMenuId, setActiveMemberMenuId] = useState<string | null>(null);

  // Formulário de Novo Membro
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDataEntrada, setNewDataEntrada] = useState(() => new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  // Formulário de Edição
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Exclusão de membro
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Active Menu Dropdown for card
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Phone mask helper
  const handlePhoneMask = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, '').substring(0, 11);
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 6 && digits.length <= 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    setter(formatted);
  };

  // Helper de estatísticas por usuário
  const getStats = (member: UserProfile) => {
    const norm = member.nome.trim().toLowerCase();

    // Vaquinhas ativas
    const activeFundingCount = packages.filter(
      (p) =>
        p.status === 'Financiamento' &&
        (p.apoiadores || []).some((ap) => ap.id === member.id || ap.nome.trim().toLowerCase() === norm)
    ).length;

    // Pacotes do Catálogo
    const catalogCount = packages.filter(
      (p) =>
        p.status === 'Catálogo' &&
        (p.apoiadores || []).some((ap) => ap.id === member.id || ap.nome.trim().toLowerCase() === norm)
    ).length;

    // Sugestões apoiadas
    const suggestionsSupportedCount = items.filter(
      (i) =>
        (i.apoiadores || []).some((ap) => ap.id === member.id || ap.nome.trim().toLowerCase() === norm)
    ).length;

    const totalParticipations = activeFundingCount + catalogCount + suggestionsSupportedCount;

    // Strikes count
    const strikesCount = typeof member.strikes === 'number'
      ? member.strikes
      : Array.isArray(member.strikes)
      ? member.strikes.length
      : 0;

    // Has pending payment in active payment packages
    const hasPendingPayment = packages.some(
      (p) =>
        p.status === 'Financiamento' &&
        p.etapaFinanciamento === 'PAGAMENTO' &&
        (p.apoiadores || []).some((ap) => ap.id === member.id || ap.nome.trim().toLowerCase() === norm) &&
        !(p.pagamentos && p.pagamentos[member.id]?.informouPagamento)
    );

    let rank = 'Novato da Ponte';
    let isVeteran = false;

    if (member.isMaster || norm === 'ponte dos trolls') {
      rank = 'Mestre Guardião';
      isVeteran = true;
    } else if (totalParticipations >= 5) {
      rank = 'Aventureiro ativo';
      isVeteran = true;
    } else if (totalParticipations >= 1) {
      rank = 'Aventureiro ativo';
      isVeteran = true;
    }

    return {
      activeFundingCount,
      catalogCount,
      suggestionsSupportedCount,
      totalParticipations,
      strikesCount,
      hasPendingPayment,
      rank,
      isVeteran,
    };
  };

  // Estatísticas globais do grupo (para os 3 cards do topo)
  const groupStats = useMemo(() => {
    let activeParticipantsSet = new Set<string>();
    let membersWithPendingCount = 0;

    users.forEach((u) => {
      const stats = getStats(u);
      if (stats.activeFundingCount > 0) {
        activeParticipantsSet.add(u.id);
      }
      if (stats.strikesCount > 0 || stats.hasPendingPayment) {
        membersWithPendingCount++;
      }
    });

    return {
      totalMembers: users.length,
      activeParticipants: activeParticipantsSet.size,
      membersWithPending: membersWithPendingCount,
    };
  }, [users, packages, items]);

  // Lista filtrada e ordenada
  const filteredAndSortedMembers = useMemo(() => {
    let list = [...users];

    // Busca textual
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.nome.toLowerCase().includes(q) ||
          (isMaster && u.telefone && u.telefone.toLowerCase().includes(q)) ||
          (isMaster && u.email && u.email.toLowerCase().includes(q))
      );
    }

    // Filtro por tipo
    if (filterType === 'ativos') {
      list = list.filter((u) => getStats(u).activeFundingCount > 0);
    } else if (filterType === 'pendencias' && isMaster) {
      list = list.filter((u) => {
        const s = getStats(u);
        return s.strikesCount > 0 || s.hasPendingPayment;
      });
    }

    // Ordenação
    list.sort((a, b) => {
      const statsA = getStats(a);
      const statsB = getStats(b);

      switch (sortBy) {
        case 'nome-za':
          return b.nome.localeCompare(a.nome, 'pt-BR', { sensitivity: 'base' });
        case 'mais-ativos':
          return statsB.totalParticipations - statsA.totalParticipations;
        case 'mais-strikes':
          return isMaster
            ? statsB.strikesCount - statsA.strikesCount
            : a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        case 'nome-az':
        default:
          return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
      }
    });

    return list;
  }, [users, searchTerm, filterType, sortBy, isMaster, packages, items]);

  // Contadores e filtro de solicitações de novos membros
  const pendingApplicationsCount = useMemo(() => {
    return applications.filter((app) => app.status === 'pendente').length;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    let list = [...applications];

    if (appFilterStatus !== 'todos') {
      list = list.filter((app) => app.status === appFilterStatus);
    }

    if (appSearchTerm.trim()) {
      const q = appSearchTerm.toLowerCase().trim();
      list = list.filter(
        (app) =>
          app.nome.toLowerCase().includes(q) ||
          app.email.toLowerCase().includes(q) ||
          app.telefone.toLowerCase().includes(q) ||
          (app.indicadoPor && app.indicadoPor.toLowerCase().includes(q))
      );
    }

    // Mais recentes primeiro
    list.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    return list;
  }, [applications, appFilterStatus, appSearchTerm]);

  // Submissão de novo membro
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = newName.trim();
    if (!cleanName) {
      setFormError('Informe o nome completo do membro.');
      return;
    }

    const cleanPhone = newPhone.trim();
    if (!cleanPhone) {
      setFormError('Informe o telefone celular com DDD.');
      return;
    }

    onAddUser({
      nome: cleanName,
      email: newEmail.trim(),
      telefone: cleanPhone,
      dataEntrada: newDataEntrada || new Date().toISOString().split('T')[0],
      status: 'aprovado',
      strikes: [],
    });

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setIsAddModalOpen(false);
    onToast(`✅ Membro ${cleanName} cadastrado com sucesso!`);
  };

  // Submissão de edição de membro
  const handleOpenEditMember = (member: UserProfile) => {
    setMemberToEdit(member);
    setEditName(member.nome);
    setEditEmail(member.email || '');
    setEditPhone(member.telefone || '');
  };

  const handleSaveEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToEdit) return;

    const cleanName = editName.trim();
    if (!cleanName) {
      onToast('O nome não pode estar em branco.');
      return;
    }

    onUpdateUser({
      ...memberToEdit,
      nome: cleanName,
      email: editEmail.trim(),
      telefone: editPhone.trim(),
    });

    onToast(`Dados de ${cleanName} atualizados!`);
    setMemberToEdit(null);
  };

  // Ajuste de strikes pelo Mestre
  const handleUpdateStrikes = (member: UserProfile, delta: number) => {
    if (!isMaster) return;

    let currentStrikesList: any[] = [];
    if (Array.isArray(member.strikes)) {
      currentStrikesList = [...member.strikes];
    } else if (typeof member.strikes === 'number') {
      currentStrikesList = Array.from({ length: member.strikes }, (_, i) => ({
        id: `legacy-${i}`,
        data: new Date().toISOString(),
        motivo: 'Strike registrado pelo Mestre',
      }));
    }

    if (delta > 0) {
      currentStrikesList.push({
        id: `strike-${Date.now()}`,
        data: new Date().toISOString(),
        motivo: 'Aviso de inadimplência/falta de pagamento',
      });
      onToast(`Strike adicionado a ${member.nome} (Total: ${currentStrikesList.length})`);
    } else if (delta < 0 && currentStrikesList.length > 0) {
      currentStrikesList.pop();
      onToast(`Strike removido de ${member.nome} (Total: ${currentStrikesList.length})`);
    }

    onUpdateUser({
      ...member,
      strikes: currentStrikesList,
    });
  };

  // Exclusão com senha
  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      setDeleteError('A senha do Mestre é necessária para confirmar a exclusão.');
      return;
    }

    if (!userToDelete) return;

    onDeleteUser(userToDelete.id);
    onToast(`Membro ${userToDelete.nome} removido do grupo.`);
    setUserToDelete(null);
    setDeletePassword('');
    setDeleteError('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Banner Superior com Arte dos Trolls (Fiel ao Print 2 / image_b133733d.png) */}
      <PageBanner
        title="Quem faz a Ponte acontecer"
        subtitle="Nossa comunidade de aventureiros."
      />

      {/* Sub-navegação do Mestre: Membros da Mesa vs. Solicitações de Entrada com badge */}
      {isMaster && (
        <div className="flex items-center gap-2 mb-6 border-b border-[#D6C296] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('membros')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'membros'
                ? 'bg-[#48551F] text-[#F8EDD5] shadow-sm'
                : 'bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membros da Mesa</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeTab === 'membros' ? 'bg-[#374217] text-[#F8EDD5]' : 'bg-[#D6C296] text-[#302414]'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('solicitacoes')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 relative ${
              activeTab === 'solicitacoes'
                ? 'bg-[#48551F] text-[#F8EDD5] shadow-sm'
                : 'bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Solicitações de Entrada</span>
            {pendingApplicationsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#c74d3c] text-white animate-pulse">
                {pendingApplicationsCount} pendente{pendingApplicationsCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'solicitacoes' ? 'bg-[#374217] text-[#F8EDD5]' : 'bg-[#D6C296] text-[#302414]'
              }`}>
                {applications.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ==================== ABA 1: MEMBROS DA MESA ==================== */}
      {activeTab === 'membros' && (
        <>
          {/* Cabeçalho da Seção: Título + Total Cadastrado + Botão Cadastrar Membro */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-[#716016] shrink-0" />
                <h2 className="font-rpg text-xl sm:text-2xl font-bold text-[#302414]">
                  Membros da Ponte
                </h2>
              </div>
              <span className="text-xs text-[#71634D] font-medium border-l border-[#C6AD78] pl-3">
                <strong className="text-[#302414] font-mono">{groupStats.totalMembers}</strong> membros cadastrados
              </span>
            </div>

            {isMaster && (
              <div className="flex flex-wrap items-center gap-2">
                {onOpenSyncOfficialModal && (
                  <button
                    onClick={onOpenSyncOfficialModal}
                    className="px-3.5 py-2.5 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                    title="Sincronizar os 125 membros da planilha oficial no Firestore e no servidor"
                  >
                    <RefreshCw className="w-4 h-4 text-[#716016]" />
                    <span className="hidden sm:inline">Sincronizar Planilha Oficial</span>
                    <span className="sm:hidden">Sincronizar 125</span>
                  </button>
                )}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2.5 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Cadastrar membro</span>
                </button>
              </div>
            )}
          </div>

      {/* CARDS DE ESTATÍSTICA (Exclusivos para o Mestre) */}
      {isMaster && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Total de Membros */}
          <div className="parchment-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="font-rpg text-xl font-bold text-[#302414] block">
                {groupStats.totalMembers} membros
              </span>
            </div>
          </div>

          {/* Card 2: Participantes Ativos */}
          <div className="parchment-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-rpg text-xl font-bold text-[#302414] block">
                {groupStats.activeParticipants} participantes ativos
              </span>
            </div>
          </div>

          {/* Card 3: Com Pendências */}
          <div className="parchment-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-rpg text-xl font-bold text-[#302414] block">
                {groupStats.membersWithPending} com pendências
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros: Busca e Ordenação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Input de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71634D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isMaster ? "Buscar por nome ou contato..." : "Buscar membro por nome..."}
            className="w-full bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F] shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71634D] hover:text-[#302414] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filtro (Apenas Mestre) */}
        {isMaster && (
          <div className="relative shrink-0">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
            >
              <option value="todos">Todos os membros</option>
              <option value="ativos">Participantes ativos</option>
              <option value="pendencias">Com pendências</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Dropdown Ordenação */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
          >
            <option value="nome-az">Nome A–Z</option>
            <option value="nome-za">Nome Z–A</option>
            {isMaster && <option value="mais-ativos">Mais ativos</option>}
            {isMaster && <option value="mais-strikes">Mais strikes</option>}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* GRADE DE 3 COLUNAS DE MEMBROS (Fiel ao Print 2) */}
      {filteredAndSortedMembers.length === 0 ? (
        <div className="parchment-card p-12 text-center my-6">
          <Users className="w-12 h-12 text-[#716016] mx-auto mb-3 opacity-60" />
          <h3 className="font-rpg text-lg font-bold text-[#302414]">
            Nenhum membro encontrado
          </h3>
          <p className="text-xs text-[#71634D] max-w-sm mx-auto mt-1 mb-4">
            Tente buscar por outro termo ou alterar o filtro selecionado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedMembers.map((member) => {
            const stats = getStats(member);
            const initials = member.nome
              ? member.nome
                  .split(' ')
                  .filter(Boolean)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : '??';

            const isThisMemberMaster = member.isMaster || member.nome.trim().toLowerCase() === 'ponte dos trolls';
            const acquiredList = isThisMemberMaster ? [] : getUserAcquiredPackages(member, packages);
            const rank = isThisMemberMaster
              ? {
                  level: 99,
                  name: 'Mestre Guardião',
                  colorClass: 'text-[#716016]',
                  bgClass: 'bg-[#FAF4E6]',
                  borderClass: 'border-[#C6AD78]',
                  cardBorderClass: 'border-[#C6AD78]/80',
                  currentCount: 0,
                }
              : getUserRank(acquiredList.length);

            // ==================== VISUALIZAÇÃO SIMPLIFICADA PARA MEMBROS COMUNS ====================
            // Exibe SOMENTE: Nome do membro, Nome do rank, Brasão correspondente.
            // Oculta estritamente: contatos, e-mails, telefones, strikes, pendências, contagem de compras, financiamentos e acervo.
            if (!isMaster) {
              return (
                <div
                  key={member.id}
                  className={`parchment-card p-4 sm:p-4.5 flex items-center gap-4 transition-all hover:shadow-md border ${rank.cardBorderClass}`}
                >
                  {/* Brasão Oficial do Rank RPG com Destaque Visual */}
                  <div className="shrink-0 relative">
                    <RankBadgeIcon level={rank.level} size={50} />
                  </div>

                  {/* Nome do Membro e Selo com Nome do Rank Escrito */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-rpg text-base font-bold text-[#302414] leading-tight truncate">
                      {member.nome}
                    </h3>

                    <div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${rank.bgClass} ${rank.colorClass} border ${rank.borderClass} inline-flex items-center gap-1.5 shadow-xs`}
                      >
                        <span>{rank.name}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // ==================== VISUALIZAÇÃO ADMINISTRATIVA COMPLETA DO MESTRE ====================
            return (
              <div
                key={member.id}
                className={`parchment-card p-4 space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow border ${rank.cardBorderClass}`}
              >
                <div>
                  {/* Linha Superior: Brasão/Avatar + Nome + Badge + Strikes */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Brasão Oficial do Rank */}
                      <div className="shrink-0 relative">
                        <RankBadgeIcon level={rank.level} size={42} />
                      </div>

                      {/* Nome e Rank Badge */}
                      <div className="min-w-0">
                        <h3 className="font-rpg text-base font-bold text-[#302414] leading-tight truncate">
                          {member.nome}
                        </h3>

                        {/* Rank Badge com Nível Oficial */}
                        <div className="mt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${rank.bgClass} ${rank.colorClass} border ${rank.borderClass} inline-flex items-center gap-1 shadow-xs`}
                            title={isThisMemberMaster ? 'Mestre da Ponte' : `${rank.name} - ${stats.catalogCount} pacotes adquiridos`}
                          >
                            <span>{rank.name} ({stats.catalogCount})</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge de Strikes (Top Right) - SOMENTE PARA O MESTRE */}
                    {isMaster && (
                      <div className="shrink-0">
                        {stats.strikesCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#edd8b2] text-[#7c4912] border border-[#deb878]">
                            {stats.strikesCount} {stats.strikesCount === 1 ? 'strike' : 'strikes'}
                          </span>
                        ) : (
                          <span className="text-xs text-[#71634D] font-medium">
                            0 strikes
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Linha de Contatos: E-mail e Telefone */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#71634D] pt-2.5 border-t border-[#D6C296] mt-3">
                    <div className="flex items-center gap-1 truncate max-w-[170px]" title={member.email || 'Não informado'}>
                      <Mail className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                      <span className="truncate">
                        {isMaster || currentUser.id === member.id
                          ? member.email || 'Sem e-mail'
                          : member.email
                          ? member.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
                          : 'Sem e-mail'}
                      </span>
                    </div>

                    <span className="text-[#C6AD78]">|</span>

                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                      <span>
                        {isMaster || currentUser.id === member.id
                          ? member.telefone || 'Sem telefone'
                          : member.telefone
                          ? '(xx) xxxxx-xxxx'
                          : 'Sem telefone'}
                      </span>
                    </div>
                  </div>

                  {/* Linha de Estatísticas: Acervo e Financiamentos */}
                  <div className="flex items-center gap-3 text-xs text-[#302414] pt-2">
                    {isMaster ? (
                      <button
                        type="button"
                        onClick={() => setMemberToViewAcervo(member)}
                        className="flex items-center gap-1.5 px-2 py-1 -mx-2 -my-1 rounded-lg hover:bg-[#EADBBE] text-[#302414] hover:text-[#48551F] transition-all cursor-pointer group font-medium"
                        title={`Clique para consultar o acervo individual de ${member.nome}`}
                      >
                        <Package className="w-3.5 h-3.5 text-[#716016] group-hover:scale-110 transition-transform" />
                        <span>
                          Acervo: <strong className="underline underline-offset-2">{stats.catalogCount}</strong> {stats.catalogCount === 1 ? 'pacote' : 'pacotes'}
                        </span>
                        <span className="text-[10px] text-[#48551F] font-bold bg-[#E5DBC1] px-1.5 py-0.5 rounded border border-[#C6AD78] group-hover:bg-[#48551F] group-hover:text-[#F8EDD5] transition-colors ml-0.5">
                          Ver acervo
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-[#716016]" />
                        <span>
                          Acervo: <strong>{stats.catalogCount}</strong> {stats.catalogCount === 1 ? 'pacote' : 'pacotes'}
                        </span>
                      </div>
                    )}

                    <span className="text-[#C6AD78]">|</span>

                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-[#716016]" />
                      <span>
                        Financiamentos: <strong>{stats.activeFundingCount}</strong> {stats.activeFundingCount === 1 ? 'ativo' : 'ativos'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card: Ações do Mestre (Fiel ao Print 2) */}
                {isMaster && (
                  <div className="pt-3 border-t border-[#D6C296] flex items-center justify-between gap-2">
                    {/* Botão Editar Membro */}
                    <button
                      onClick={() => handleOpenEditMember(member)}
                      className="px-3 py-1.5 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-xs font-semibold text-[#302414] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#716016]" />
                      <span>Editar membro</span>
                    </button>

                    {/* Controle de Strikes e Menu Administrativo */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[#71634D] font-medium mr-0.5">Strikes</span>
                        <button
                          onClick={() => handleUpdateStrikes(member, -1)}
                          disabled={stats.strikesCount === 0}
                          className="w-6 h-6 rounded bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-[#302414] font-bold text-xs flex items-center justify-center disabled:opacity-40 cursor-pointer"
                          title="Remover strike"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-xs text-[#302414]">
                          {stats.strikesCount}
                        </span>
                        <button
                          onClick={() => handleUpdateStrikes(member, 1)}
                          className="w-6 h-6 rounded bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-[#302414] font-bold text-xs flex items-center justify-center cursor-pointer"
                          title="Adicionar strike"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Menu 3 Pontos com "Enviar boas-vindas" e "Excluir membro" */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMemberMenuId(activeMemberMenuId === member.id ? null : member.id)}
                          className="p-1 text-[#71634D] hover:text-[#302414] hover:bg-[#EADBBE] rounded-lg transition-colors cursor-pointer"
                          title="Mais opções administrativas do membro"
                        >
                          <span className="text-sm font-bold leading-none px-1">⋮</span>
                        </button>

                        {activeMemberMenuId === member.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-full mb-1 w-48 bg-[#F8EDD5] text-[#302414] rounded-xl shadow-xl border border-[#C6AD78] py-1.5 z-50 animate-in fade-in-50"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMemberMenuId(null);
                                setWelcomeMember({ nome: member.nome, telefone: member.telefone || '' });
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] text-[#48551F] transition-colors cursor-pointer font-semibold"
                              title="Enviar ou rever mensagem de boas-vindas"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#48551F]" />
                              <span>Enviar boas-vindas</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMemberMenuId(null);
                                handleOpenEditMember(member);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#716016]" />
                              <span>Editar membro</span>
                            </button>

                            <div className="border-t border-[#D6C296] my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMemberMenuId(null);
                                setUserToDelete(member);
                                setDeletePassword('');
                                setDeleteError('');
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 text-[#8b261b] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#8b261b]" />
                              <span>Excluir membro</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* ==================== ABA 2: SOLICITAÇÕES DE ENTRADA (MESTRE) ==================== */}
      {activeTab === 'solicitacoes' && isMaster && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Cabeçalho da Seção */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#716016]" />
                <h2 className="font-rpg text-xl sm:text-2xl font-bold text-[#302414]">
                  Solicitações de Entrada na Ponte
                </h2>
              </div>
              <p className="text-xs text-[#71634D] mt-0.5">
                Avalie as respostas dos candidatos ao questionário da comunidade antes de liberar o acesso.
              </p>
            </div>

            {/* Badges de Resumo */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#fae8b4] text-[#875508] border border-[#e3c578] inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingApplicationsCount} pendentes</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88] inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{applications.filter((a) => a.status === 'aprovado').length} aprovados</span>
              </span>
            </div>
          </div>

          {/* Barra de Filtros de Solicitações */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#71634D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={appSearchTerm}
                onChange={(e) => setAppSearchTerm(e.target.value)}
                placeholder="Buscar candidato por nome, contato ou indicação..."
                className="w-full bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F] shadow-sm"
              />
              {appSearchTerm && (
                <button
                  onClick={() => setAppSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71634D] hover:text-[#302414] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <select
                value={appFilterStatus}
                onChange={(e) => setAppFilterStatus(e.target.value as any)}
                className="appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
              >
                <option value="todos">Todas as solicitações</option>
                <option value="pendente">Apenas Pendentes</option>
                <option value="aprovado">Aprovadas</option>
                <option value="recusado">Recusadas</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Lista de Solicitações */}
          {filteredApplications.length === 0 ? (
            <div className="parchment-card p-12 text-center my-4">
              <FileText className="w-12 h-12 text-[#716016] mx-auto mb-3 opacity-60" />
              <h3 className="font-rpg text-lg font-bold text-[#302414]">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-xs text-[#71634D] max-w-sm mx-auto mt-1">
                {applications.length === 0
                  ? 'Ainda não há candidatos cadastrados pelo fluxo "Sou novo — solicitar entrada".'
                  : 'Nenhum resultado corresponde aos filtros selecionados.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredApplications.map((app) => {
                const initials = app.nome
                  ? app.nome
                      .split(' ')
                      .filter(Boolean)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : '??';

                const formattedDate = new Date(app.criadoEm).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={app.id}
                    className={`parchment-card p-4 flex flex-col justify-between space-y-4 transition-shadow hover:shadow-md ${
                      app.status === 'pendente' ? 'border-[#C6AD78] ring-1 ring-[#D9A74A]/40' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Topo: Avatar + Nome + Badge Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#455222] border border-[#C6AD78] text-[#F8EDD5] font-rpg font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-rpg text-base font-bold text-[#302414] leading-tight truncate">
                              {app.nome}
                            </h3>
                            <span className="text-[11px] text-[#71634D] block truncate">
                              {app.comoConheceu}
                              {app.indicadoPor ? ` (por ${app.indicadoPor})` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {app.status === 'pendente' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fae8b4] text-[#875508] border border-[#e3c578] inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pendente</span>
                            </span>
                          )}
                          {app.status === 'aprovado' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aprovado</span>
                            </span>
                          )}
                          {app.status === 'recusado' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fadcd7] text-[#932318] border border-[#eab4ab] inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Recusado</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contatos & Dados */}
                      <div className="space-y-1.5 pt-2 border-t border-[#D6C296] text-xs text-[#71634D]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                          <span className="font-mono text-[#302414]">{app.telefone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                          <span className="truncate text-[#302414]">{app.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                          <span>Solicitado em: {formattedDate}</span>
                        </div>
                      </div>

                      {/* Informações da Avaliação se já avaliado */}
                      {app.avaliadoEm && (
                        <div className="pt-2 border-t border-[#D6C296] text-[11px] text-[#71634D] space-y-0.5 bg-[#FAF4E6]/60 p-2 rounded-lg">
                          <p>
                            <strong>Avaliado em:</strong> {new Date(app.avaliadoEm).toLocaleDateString('pt-BR')}
                          </p>
                          {app.observacoesMestre && (
                            <p className="italic text-[#302414]">
                              "{app.observacoesMestre}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão de Ação */}
                    <div className="pt-2">
                      <button
                        onClick={() => setSelectedApplication(app)}
                        className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                          app.status === 'pendente'
                            ? 'bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5]'
                            : 'bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78]'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {app.status === 'pendente'
                            ? 'Avaliar Candidato (8 Respostas)'
                            : 'Ver Respostas do Candidato'}
                        </span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ==================== MODAIS ==================== */}

      {/* Modal de Avaliação de Candidato pelo Mestre */}
      {selectedApplication && (
        <CandidateReviewModal
          isOpen={Boolean(selectedApplication)}
          application={selectedApplication}
          rulesConfig={rulesConfig}
          onApprove={async (appId, adminPassword) => {
            if (onApproveApplication) {
              const ok = await onApproveApplication(appId, adminPassword);
              if (ok) {
                setSelectedApplication(null);
              }
              return ok;
            }
            return false;
          }}
          onApproveSuccess={(app) => {
            setWelcomeMember({ nome: app.nome, telefone: app.telefone });
          }}
          onReject={async (appId, obs, adminPassword) => {
            if (onRejectApplication) {
              const ok = await onRejectApplication(appId, obs, adminPassword);
              if (ok) {
                setSelectedApplication(null);
              }
              return ok;
            }
            return false;
          }}
          onClose={() => setSelectedApplication(null)}
          onToast={onToast}
        />
      )}

      {/* Modal 1: Cadastrar Novo Membro (Mestre) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateMember}
            className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-lg font-bold text-[#302414] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#48551F]" />
                <span>Cadastrar Novo Membro</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#71634D] hover:text-[#302414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">Nome Completo:</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">WhatsApp com DDD:</label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => handlePhoneMask(e.target.value, setNewPhone)}
                placeholder="(11) 99999-9999"
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">E-mail Google Drive:</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@gmail.com"
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            {formError && (
              <p className="text-xs text-[#8b261b] font-medium">{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-[#EADBBE] rounded-xl text-xs font-semibold text-[#302414]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                Cadastrar Membro
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Editar Membro (Mestre) */}
      {memberToEdit && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditMember}
            className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-lg font-bold text-[#302414] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#48551F]" />
                <span>Editar Membro</span>
              </h3>
              <button
                type="button"
                onClick={() => setMemberToEdit(null)}
                className="p-1 text-[#71634D] hover:text-[#302414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">Nome Completo:</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">Telefone:</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => handlePhoneMask(e.target.value, setEditPhone)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">E-mail Google Drive:</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToEdit(null)}
                className="px-4 py-2 bg-[#EADBBE] rounded-xl text-xs font-semibold text-[#302414]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Excluir Membro (Mestre com Senha) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDelete}
            className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-base font-bold text-[#8b261b] flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#8b261b]" />
                <span>Excluir Membro</span>
              </h3>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="p-1 text-[#71634D] hover:text-[#302414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#71634D]">
              Tem certeza que deseja excluir o cadastro de <strong>"{userToDelete.nome}"</strong>? Esta ação é irreversível.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">Senha do Mestre:</label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Digite a senha de administrador"
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-[#8b261b] font-medium">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 bg-[#EADBBE] rounded-xl text-xs font-semibold text-[#302414]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#8b261b] hover:bg-[#a32d20] text-[#F8EDD5] rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Consulta de Acervo do Membro (Exclusivo Mestre) */}
      {memberToViewAcervo && (
        <MemberAcervoModal
          isOpen={Boolean(memberToViewAcervo)}
          member={memberToViewAcervo}
          packages={packages}
          onClose={() => setMemberToViewAcervo(null)}
          onToast={onToast}
        />
      )}

      {/* Modal de Boas-Vindas ao Membro (Após Aprovação ou pelo Menu do Membro) */}
      {welcomeMember && (
        <WelcomeMessageModal
          isOpen={Boolean(welcomeMember)}
          member={welcomeMember}
          onClose={() => setWelcomeMember(null)}
          onToast={onToast}
        />
      )}

    </div>
  );
};
