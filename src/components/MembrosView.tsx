import React, { useState, useMemo } from 'react';
import { UserProfile, FundingPackage, ItemRPG, ADMIN_PASSWORD } from '../types';
import { 
  Users, UserPlus, Search, ArrowLeft, Shield, Phone, Mail, 
  Calendar, AlertTriangle, Plus, Minus, Trash2, Award, 
  Sparkles, PackageCheck, Flame, CheckCircle2 
} from 'lucide-react';
import { formatDateDisplay } from '../utils/helpers';

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
  const isMaster = Boolean(currentUser.isMaster);

  // Mestre - Formulário de Novo Membro
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDataEntrada, setNewDataEntrada] = useState(() => new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  // Mestre - Exclusão de membro
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

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

    let rank = 'Novato da Ponte';
    let rankColor = 'text-[#8a9d8c] bg-[#1a2f20] border-[#2e5035]';

    if (member.isMaster || norm === 'ponte dos trolls') {
      rank = 'Mestre Guardião';
      rankColor = 'text-[#d49e2a] bg-[#2a220d] border-[#d49e2a]/50';
    } else if (totalParticipations >= 10) {
      rank = 'Lenda dos Rateios';
      rankColor = 'text-purple-300 bg-purple-950/70 border-purple-500/40';
    } else if (totalParticipations >= 5) {
      rank = 'Veterano da Mesa';
      rankColor = 'text-amber-300 bg-amber-950/60 border-amber-500/40';
    } else if (totalParticipations >= 1) {
      rank = 'Aventureiro Ativo';
      rankColor = 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40';
    }

    return {
      activeFundingCount,
      catalogCount,
      suggestionsSupportedCount,
      totalParticipations,
      rank,
      rankColor,
    };
  };

  // Membros ativos (ordem alfabética por padrão)
  const sortedMembers = useMemo(() => {
    const list = [...users].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        (isMaster && u.telefone && u.telefone.toLowerCase().includes(q)) ||
        (isMaster && u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchTerm, isMaster]);

  // Submissão de novo membro pelo Mestre
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
    onToast(`✅ Membro ${cleanName} cadastrado com sucesso!`);
  };

  // Ajuste de strikes pelo Mestre
  const handleAdjustStrikes = (member: UserProfile, delta: number) => {
    const currentStrikes = Array.isArray(member.strikes) ? member.strikes.length : (member.strikes || 0);
    const nextStrikes = Math.max(0, Math.min(3, currentStrikes + delta));
    if (nextStrikes === currentStrikes) return;

    onUpdateUser({
      ...member,
      strikes: nextStrikes,
    });

    if (delta > 0) {
      onToast(`⚠️ 1 strike adicionado para ${member.nome} (Total: ${nextStrikes}/3).`);
    } else {
      onToast(`Strike removido de ${member.nome} (Total: ${nextStrikes}/3).`);
    }
  };

  // Exclusão de membro pelo Mestre
  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;

    if (deletePassword !== ADMIN_PASSWORD) {
      setDeleteError('Senha do Mestre incorreta!');
      return;
    }

    onDeleteUser(userToDelete.id);
    onToast(`Membro "${userToDelete.nome}" removido da mesa.`);
    setUserToDelete(null);
    setDeletePassword('');
    setDeleteError('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Barra de Navegação Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#203625]">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoHome}
            className="p-2.5 rounded-xl bg-[#142318] hover:bg-[#1d3323] text-[#a4b5a6] hover:text-[#f1ede4] border border-[#27442d] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Voltar à tela principal"
          >
            <ArrowLeft className="w-4 h-4 text-[#d49e2a]" />
            <span>Voltar ao Menu</span>
          </button>
          <div>
            <h1 className="font-rpg text-xl sm:text-2xl font-bold text-[#f4ecd8] flex items-center gap-2">
              <Users className="w-6 h-6 text-[#d49e2a]" />
              <span>Membros da Ponte dos Trolls</span>
            </h1>
            <p className="text-xs text-[#8a9d8c] mt-0.5">
              {users.length} aventureiros cadastrados na central de compras coletivas
            </p>
          </div>
        </div>

        {/* Busca rápida */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] placeholder-[#556957] focus:outline-none focus:border-[#d49e2a]"
          />
        </div>
      </div>

      {/* PAINEL DO MESTRE: Formulário de Cadastro Exclusivo */}
      {isMaster && (
        <div className="mb-6 bg-gradient-to-r from-[#172b1c] to-[#122015] border-2 border-[#d49e2a]/50 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-5 h-5 text-[#d49e2a]" />
            <h2 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
              Cadastrar Novo Membro na Mesa
            </h2>
          </div>
          <p className="text-xs text-[#8a9d8c] mb-4">
            Apenas o Mestre pode autorizar e adicionar novos integrantes. O número de celular cadastrado será a chave de acesso do usuário.
          </p>

          <form onSubmit={handleCreateMember} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#a4b5a6] mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Pedro Henrique"
                className="w-full px-3 py-2 bg-[#0c150e] border border-[#27442d] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#a4b5a6] mb-1">Telefone / WhatsApp (Senha) *</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => handlePhoneMask(e.target.value, setNewPhone)}
                placeholder="(19) 98765-4321"
                className="w-full px-3 py-2 bg-[#0c150e] border border-[#27442d] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#a4b5a6] mb-1">E-mail (Drive de Entrega)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="membro@gmail.com"
                className="w-full px-3 py-2 bg-[#0c150e] border border-[#27442d] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-[#a4b5a6] mb-1">Data de Entrada</label>
                <input
                  type="date"
                  value={newDataEntrada}
                  onChange={(e) => setNewDataEntrada(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#0c150e] border border-[#27442d] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 h-[38px]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Salvar</span>
              </button>
            </div>
          </form>

          {formError && (
            <div className="mt-3 text-xs text-red-300 bg-red-950/60 border border-red-500/40 p-2.5 rounded-xl">
              {formError}
            </div>
          )}
        </div>
      )}

      {/* Aviso de Privacidade para Membro Comum */}
      {!isMaster && (
        <div className="mb-4 p-3 bg-[#132317] border border-[#24462c] rounded-2xl flex items-center gap-2.5 text-xs text-[#a4b5a6]">
          <Shield className="w-4 h-4 text-[#d49e2a] shrink-0" />
          <span>
            <strong>Visão Segura da Comunidade:</strong> Telefones e e-mails permanecem estritamente confidenciais. Aqui você pode ver os aventureiros da mesa, seus títulos e níveis de participação nos rateios!
          </span>
        </div>
      )}

      {/* Grid de Membros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sortedMembers.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-[#122015] border border-[#203625] rounded-2xl text-xs text-[#7a8e7d]">
            Nenhum membro encontrado com este nome.
          </div>
        ) : (
          sortedMembers.map((member) => {
            const stats = getStats(member);
            const strikesCount = Array.isArray(member.strikes) ? member.strikes.length : (member.strikes || 0);
            const isSelf = currentUser.id === member.id;

            return (
              <div
                key={member.id}
                className={`bg-[#122015] border rounded-2xl p-4 flex flex-col justify-between transition-all duration-150 ${
                  isSelf
                    ? 'border-[#d49e2a] shadow-md shadow-[#d49e2a]/10 bg-[#16271a]'
                    : 'border-[#203625] hover:border-[#2f5036]'
                }`}
              >
                <div>
                  {/* Topo do Card: Nome e Rank */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#f4ecd8]">{member.nome}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d49e2a] text-[#122015]">
                            Você
                          </span>
                        )}
                        {member.isMaster && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d49e2a]/20 text-[#d49e2a] border border-[#d49e2a]/40">
                            Mestre
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stats.rankColor}`}>
                          <Award className="w-3 h-3" />
                          <span>{stats.rank}</span>
                        </span>
                      </div>
                    </div>

                    {/* Strikes (visível se tiver strikes ou para o Mestre) */}
                    {(isMaster || strikesCount > 0) && (
                      <div className="text-right shrink-0">
                        {strikesCount === 0 ? (
                          <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                            0 Strikes
                          </span>
                        ) : strikesCount < 3 ? (
                          <span className="text-[10px] text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>{strikesCount}/3 Strikes</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-950/90 border border-red-500/60 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span>{strikesCount}/3 Limite</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Informações Confidenciais (EXCLUSIVAS DO MESTRE) */}
                  {isMaster && (
                    <div className="mt-3 pt-2.5 border-t border-[#1b2f21] space-y-1 text-xs text-[#a4b5a6]">
                      <div className="flex items-center gap-1.5 font-mono text-[#d49e2a]">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-[#7a8e7d]" />
                        <span>{member.telefone || 'Sem telefone'}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#8a9d8c] truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-[#7a8e7d]" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.dataEntrada && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#6b7e6e]">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>Entrou em: {formatDateDisplay(member.dataEntrada)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estatísticas de Participação (Visíveis para TODOS) */}
                  <div className="mt-3 pt-2.5 border-t border-[#1b2f21] grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#0e1811] p-2 rounded-xl border border-[#1b2f21]">
                      <div className="text-[#7a8e7d] flex items-center gap-1 text-[10px]">
                        <PackageCheck className="w-3 h-3 text-[#d49e2a]" />
                        <span>Catálogo Drive:</span>
                      </div>
                      <div className="font-bold text-[#f1ede4] mt-0.5 font-mono">
                        {stats.catalogCount} pacote{stats.catalogCount !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="bg-[#0e1811] p-2 rounded-xl border border-[#1b2f21]">
                      <div className="text-[#7a8e7d] flex items-center gap-1 text-[10px]">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>Vaquinhas:</span>
                      </div>
                      <div className="font-bold text-[#f1ede4] mt-0.5 font-mono">
                        {stats.activeFundingCount} ativa{stats.activeFundingCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controles Administrativos do Mestre */}
                {isMaster && (
                  <div className="mt-3 pt-3 border-t border-[#1f3524] flex items-center justify-between gap-2">
                    {/* Botões de Strike */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#7a8e7d] mr-1">Strikes:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustStrikes(member, -1)}
                        disabled={strikesCount === 0}
                        className="w-6 h-6 rounded-lg bg-[#1a2f20] hover:bg-[#25422d] text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-[#27452d] transition-all cursor-pointer"
                        title="Remover strike"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold w-4 text-center text-[#d49e2a]">
                        {strikesCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustStrikes(member, 1)}
                        disabled={strikesCount >= 3}
                        className="w-6 h-6 rounded-lg bg-[#1a2f20] hover:bg-[#25422d] text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-[#27452d] transition-all cursor-pointer"
                        title="Adicionar strike"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Excluir membro */}
                    {!member.isMaster && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(member)}
                        className="p-1.5 text-[#7a8e7d] hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Excluir membro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Exclusão de Membro (Sem window.confirm) */}
      {userToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-red-500/60 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">Excluir Membro</h3>
            </div>
            <p className="text-xs text-[#a4b5a6] mb-4">
              Deseja realmente remover o membro <strong className="text-[#f4ecd8]">{userToDelete.nome}</strong> da central? Digite a senha do Mestre para confirmar.
            </p>

            <form onSubmit={handleConfirmDelete} className="space-y-3">
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Senha do Mestre (Ponte#dos#trolls)"
                className="w-full px-3 py-2 bg-[#0c150e] border border-red-500/40 rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-red-400"
                autoFocus
              />

              {deleteError && (
                <div className="text-xs text-red-400">{deleteError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserToDelete(null);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-[#8a9d8c] hover:text-[#f1ede4] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
