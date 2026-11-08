import React, { useState, useMemo } from 'react';
import { FundingPackage, UserProfile, Apoiador } from '../types';
import {
  X,
  Users,
  Search,
  Shield,
  Crown,
  Sparkles,
  Sun,
  BookOpen,
  Compass,
  Check,
  CreditCard,
  Phone,
  Mail,
  User,
  ShieldCheck,
} from 'lucide-react';
import { getUserRank, getUserAcquiredPackages } from '../utils/ranksAndAcquisitions';

interface FundingParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageItem: FundingPackage | null;
  allUsers: UserProfile[];
  currentUser: UserProfile;
  packages: FundingPackage[];
  onTogglePaymentStatus?: (
    pkg: FundingPackage,
    memberId: string,
    currentStatus: boolean,
    memberName: string
  ) => void;
}

export const FundingParticipantsModal: React.FC<FundingParticipantsModalProps> = ({
  isOpen,
  onClose,
  packageItem,
  allUsers,
  currentUser,
  packages,
  onTogglePaymentStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !packageItem) return null;

  const isMaster = Boolean(currentUser.isMaster);
  const isColeta = (packageItem.etapaFinanciamento || 'COLETA') === 'COLETA';
  const apoiadores: Apoiador[] = packageItem.apoiadores || [];

  // Mapeia cada apoiador para seu perfil completo mais recente
  const resolvedParticipants = useMemo(() => {
    return apoiadores.map((ap) => {
      // Relaciona estritamente pelo ID do membro para evitar confundir homônimos
      const userMatch = ap.id
        ? allUsers.find((u) => u.id === ap.id)
        : allUsers.find((u) => u.nome.trim().toLowerCase() === ap.nome.trim().toLowerCase());

      const resolvedName = userMatch?.nome || ap.nome;
      const isThisMaster = Boolean(
        userMatch?.isMaster ||
        (currentUser.id === ap.id && currentUser.isMaster) ||
        userMatch?.nome === 'Ponte dos Trolls' ||
        (ap as any).isMaster
      );
      const isCurrent = ap.id === currentUser.id || (userMatch && userMatch.id === currentUser.id);

      // Calcula aquisições no acervo do Catálogo para determinar o Rank RPG
      const acquiredCount = userMatch
        ? getUserAcquiredPackages(userMatch, packages).length
        : 0;
      const rankInfo = getUserRank(acquiredCount);

      // Status de pagamento se estiver na etapa de pagamento
      const paymentInfo = packageItem.pagamentos && packageItem.pagamentos[ap.id];
      const hasPaid = Boolean(paymentInfo?.informouPagamento || ap.pagamentoInformado);

      return {
        ap,
        userMatch,
        resolvedName,
        isThisMaster,
        isCurrent,
        rankInfo,
        hasPaid,
        email: userMatch?.email || ap.email || '',
        telefone: userMatch?.telefone || ap.telefone || '',
      };
    });
  }, [apoiadores, allUsers, currentUser, packages, packageItem.pagamentos]);

  // Filtra por termo de busca
  const filteredParticipants = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return resolvedParticipants;
    return resolvedParticipants.filter(
      (p) =>
        p.resolvedName.toLowerCase().includes(q) ||
        p.rankInfo.name.toLowerCase().includes(q)
    );
  }, [resolvedParticipants, searchTerm]);

  // Helper de ícone de rank
  const renderRankIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen':
        return <BookOpen className="w-3 h-3 shrink-0" />;
      case 'Compass':
        return <Compass className="w-3 h-3 shrink-0" />;
      case 'Shield':
        return <Shield className="w-3 h-3 shrink-0" />;
      case 'Crown':
        return <Crown className="w-3 h-3 shrink-0" />;
      case 'Sparkles':
        return <Sparkles className="w-3 h-3 shrink-0" />;
      case 'Sun':
        return <Sun className="w-3 h-3 shrink-0" />;
      default:
        return <Shield className="w-3 h-3 shrink-0" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#282D13]/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="parchment-card w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <Users className="w-5 h-5 text-[#a8d363]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                  Participantes do Financiamento
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isColeta
                      ? 'bg-[#D4A538] text-[#322105]'
                      : 'bg-[#48551F] text-[#F8EDD5] border border-[#7f993d]'
                  }`}
                >
                  {isColeta ? 'Em Coleta' : 'Pagamento'}
                </span>
              </div>
              <p className="text-xs text-[#cfc4a6] truncate max-w-sm sm:max-w-md">
                {packageItem.titulo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pesquisa e Resumo de Inscritos */}
        <div className="p-4 bg-[#EDE2CA] border-b border-[#D6C296] space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-[#302414] font-medium">
              Total de inscritos:{' '}
              <strong className="font-mono text-sm text-[#48551F]">
                {apoiadores.length}
              </strong>{' '}
              {packageItem.minimoParticipantes
                ? `de ${packageItem.minimoParticipantes} (meta mínima)`
                : 'participantes'}
            </span>

            {!isColeta && (
              <span className="text-xs text-[#71634D]">
                <strong className="text-[#2f5c1a] font-mono">
                  {resolvedParticipants.filter((p) => p.hasPaid).length}
                </strong>{' '}
                pagaram ·{' '}
                <strong className="text-[#875508] font-mono">
                  {resolvedParticipants.filter((p) => !p.hasPaid).length}
                </strong>{' '}
                pendentes
              </span>
            )}
          </div>

          {/* Input de Busca */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#71634D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar membro por nome ou rank RPG..."
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl pl-9 pr-8 py-2 text-xs text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71634D] hover:text-[#302414]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Membros */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Users className="w-10 h-10 text-[#716016] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-[#302414]">
                {apoiadores.length === 0
                  ? 'Nenhum participante inscrito ainda.'
                  : 'Nenhum membro encontrado com este filtro.'}
              </p>
              <p className="text-xs text-[#71634D] mt-1 max-w-sm mx-auto">
                {apoiadores.length === 0
                  ? 'Seja o primeiro a apoiar e garantir a realização desta compra!'
                  : 'Tente outro termo na barra de busca acima.'}
              </p>
            </div>
          ) : (
            filteredParticipants.map((p, idx) => {
              // Regra de privacidade: membros comuns NÃO veem e-mail nem telefone de outros
              const canViewContact = isMaster || p.isCurrent;

              return (
                <div
                  key={`${p.ap.id}-${idx}`}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                    p.isCurrent
                      ? 'bg-[#FAF4E6] border-[#8F9F5B] shadow-sm ring-1 ring-[#8F9F5B]/50'
                      : 'bg-[#FBF4E4] border-[#D6C296]'
                  }`}
                >
                  {/* Esquerda: Nome, Badges de Rank & Você */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-[#302414] truncate">
                          {p.resolvedName}
                        </span>

                        {/* Indicador Você */}
                        {p.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#48551F] text-[#F8EDD5]">
                            Você
                          </span>
                        )}

                        {/* Badge de Mestre da Ponte */}
                        {p.isThisMaster && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#875508] text-[#F8EDD5] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Mestre</span>
                          </span>
                        )}

                        {/* Badge de Rank RPG */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${p.rankInfo.bgClass} ${p.rankInfo.colorClass} ${p.rankInfo.borderClass}`}
                          title={`Rank ${p.rankInfo.name} (${p.rankInfo.currentCount} compras no Catálogo)`}
                        >
                          {renderRankIcon(p.rankInfo.iconName)}
                          <span>{p.rankInfo.name}</span>
                        </span>
                      </div>

                      {/* Dados de Contato Privados (Apenas Mestre ou o próprio usuário) */}
                      {canViewContact && (p.telefone || p.email) && (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#71634D] mt-0.5">
                          {p.telefone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-[#716016]" />
                              <span>{p.telefone}</span>
                            </span>
                          )}
                          {p.email && (
                            <span className="flex items-center gap-1 font-mono">
                              <Mail className="w-3 h-3 text-[#716016]" />
                              <span>{p.email}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direita: Status de Pagamento (se na etapa de pagamento) */}
                  {!isColeta && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {p.hasPaid ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Pagamento Informado</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#fae8b4] text-[#875508] border border-[#e3c578]">
                          Pendente
                        </span>
                      )}

                      {/* Ação do Mestre de alternar status */}
                      {isMaster && onTogglePaymentStatus && (
                        <button
                          type="button"
                          onClick={() =>
                            onTogglePaymentStatus(
                              packageItem,
                              p.ap.id,
                              p.hasPaid,
                              p.resolvedName
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Alterar status de pagamento deste membro"
                        >
                          Alternar
                        </button>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3.5 bg-[#EDE2CA] border-t border-[#D6C296] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#71634D]">
            Lista atualizada em tempo real conforme adesões da comunidade
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
