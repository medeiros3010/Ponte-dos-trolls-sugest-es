import React, { useState, useMemo } from 'react';
import { UserProfile, FundingPackage, ItemRPG, ADMIN_PASSWORD } from '../types';
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
} from 'lucide-react';
import { PageBanner } from './PageBanner';

interface MembrosViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  packages: FundingPackage[];
  items: ItemRPG[];
  onGoHome: () => void;
  onAddUser: (newUser: Omit<UserProfile, 'id'>) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onToast: (msg: string) => void;
}

export const MembrosView: React.FC<MembrosViewProps> = ({
  users,
  currentUser,
  packages,
  items,
  onGoHome,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('nome-az');
  const isMaster = Boolean(currentUser.isMaster);

  // Modais de Cadastro e Edição de Membro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<UserProfile | null>(null);

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
    } else if (filterType === 'pendencias') {
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
          return statsB.strikesCount - statsA.strikesCount;
        case 'nome-az':
        default:
          return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
      }
    });

    return list;
  }, [users, searchTerm, filterType, sortBy, isMaster, packages, items]);

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
    if (deletePassword !== ADMIN_PASSWORD) {
      setDeleteError('Senha do Mestre incorreta! Operação cancelada.');
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
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar membro</span>
          </button>
        )}
      </div>

      {/* 3 CARDS DE ESTATÍSTICA (Fiel ao Print 2) */}
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

      {/* Barra de Filtros: Busca, Filtro de Tipo e Ordenação (Fiel ao Print 2) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        
        {/* Input de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71634D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou contato..."
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

        {/* Dropdown Filtro */}
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

        {/* Dropdown Ordenação */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
          >
            <option value="nome-az">Nome A–Z</option>
            <option value="nome-za">Nome Z–A</option>
            <option value="mais-ativos">Mais ativos</option>
            <option value="mais-strikes">Mais strikes</option>
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

            return (
              <div
                key={member.id}
                className="parchment-card p-4 space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Linha Superior: Avatar de Iniciais + Nome + Badge + Strikes */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Círculo com Iniciais */}
                      <div className="w-11 h-11 rounded-full bg-[#455222] border border-[#C6AD78] text-[#F8EDD5] font-rpg font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {initials}
                      </div>

                      {/* Nome e Rank Badge */}
                      <div className="min-w-0">
                        <h3 className="font-rpg text-base font-bold text-[#302414] leading-tight truncate">
                          {member.nome}
                        </h3>

                        {/* Rank Badge */}
                        <div className="mt-1">
                          {stats.isVeteran ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88] inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{stats.rank}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fae8b4] text-[#875508] border border-[#e3c578] inline-flex items-center gap-1">
                              <span>🌱</span>
                              <span>{stats.rank}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge de Strikes (Top Right) */}
                    <div>
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
                    <div className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-[#716016]" />
                      <span>
                        Acervo: <strong>{stats.catalogCount}</strong> {stats.catalogCount === 1 ? 'pacote' : 'pacotes'}
                      </span>
                    </div>

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

                    {/* Controle de Strikes: Strikes [ - ] [ N ] [ + ] */}
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

                      {/* 3 Pontos para Excluir */}
                      <button
                        onClick={() => {
                          setUserToDelete(member);
                          setDeletePassword('');
                          setDeleteError('');
                        }}
                        className="p-1 text-[#71634D] hover:text-[#8b261b] ml-1 cursor-pointer"
                        title="Excluir membro"
                      >
                        <span className="text-sm font-bold leading-none">⋮</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ==================== MODAIS ==================== */}

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

    </div>
  );
};
