import React, { useState, useMemo, useRef } from 'react';
import {
  ItemRPG,
  UserProfile,
  SISTEMAS_PADRAO,
  OFFICIAL_PRODUCT_TYPES,
} from '../types';
import {
  Plus,
  Search,
  ExternalLink,
  Users,
  Check,
  Edit2,
  Trash2,
  Lightbulb,
  BookOpen,
  ChevronDown,
  X,
  Share2,
  Calculator,
  User,
  Package,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PageBanner } from './PageBanner';
import { TrollinCoinIcon, TrollinInfoBadge } from './TrollinCoin';
import {
  compareSuggestionsQueue,
  formatSuggestionPriorityBadge,
  formatSuggestionPriorityFormula,
  formatSuggestionPriorityText,
  getMemberTrollinsBalance,
  getOtherSupporters,
  getSuggestionPriorityStats,
  isAuthorSupporter,
  isMasterUser,
  normalizeIdentityName,
} from '../utils/trollins';

interface SugestoesViewProps {
  items: ItemRPG[];
  currentUser: UserProfile;
  exchangeRate: number;
  onGoHome: () => void;
  onOpenNewItem: () => void;
  onToggleSupportItem: (itemId: string) => void;
  onDonateTrollins: (itemId: string, amount: number, clientRequestId: string) => Promise<void>;
  onEditItem: (item: ItemRPG) => void;
  onDeleteItem: (item: ItemRPG) => void;
  onToast: (msg: string) => void;
}

export const SugestoesView: React.FC<SugestoesViewProps> = ({
  items,
  currentUser,
  exchangeRate,
  onGoHome,
  onOpenNewItem,
  onToggleSupportItem,
  onDonateTrollins,
  onEditItem,
  onDeleteItem,
  onToast,
}) => {
  const isMaster = isMasterUser(currentUser);
  const myTrollinsBalance = getMemberTrollinsBalance(currentUser);
  const [selectedSistema, setSelectedSistema] = useState<string>('Todos');
  const [selectedTipo, setSelectedTipo] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<string>('prioridade-desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Commitment Confirmation Modal state
  const [itemToCommit, setItemToCommit] = useState<ItemRPG | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState<boolean>(false);

  // Doar Trollins Modal state
  const [itemToDonate, setItemToDonate] = useState<ItemRPG | null>(null);
  const [donateAmount, setDonateAmount] = useState<number>(1);
  const [isSubmittingDonation, setIsSubmittingDonation] = useState<boolean>(false);
  const [donationError, setDonationError] = useState<string>('');
  const donationRequestIdRef = useRef<string>('');

  // Filtra apenas itens com status 'Sugestão'
  const sugestoesItems = useMemo(() => {
    return items.filter((i) => i.status === 'Sugestão');
  }, [items]);

  // Contagem de participações do usuário logado em sugestões de outros membros
  const userSupportedCount = useMemo(() => {
    const myNorm = normalizeIdentityName(currentUser.nome);
    return sugestoesItems.filter((i) =>
      getOtherSupporters(i).some(
        (ap) => ap.id === currentUser.id || normalizeIdentityName(ap.nome) === myNorm
      )
    ).length;
  }, [sugestoesItems, currentUser.id, currentUser.nome]);

  // Filtra e Ordena
  const sortedAndFilteredItems = useMemo(() => {
    const list = sugestoesItems.filter((item) => {
      const matchSistema = selectedSistema === 'Todos' || item.sistema === selectedSistema;
      const matchTipo = selectedTipo === 'Todos' || item.produto === selectedTipo;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nome.toLowerCase().includes(q) ||
        (item.descricao && item.descricao.toLowerCase().includes(q)) ||
        item.sugeridoPorNome.toLowerCase().includes(q) ||
        (item.produto && item.produto.toLowerCase().includes(q)) ||
        (item.sistema && item.sistema.toLowerCase().includes(q)) ||
        (item.apoiadores || []).some((ap) => ap.nome.toLowerCase().includes(q));

      return matchSistema && matchTipo && matchSearch;
    });

    list.sort((a, b) => {
      const valA = a.moeda === 'USD' ? a.valorNumerico * exchangeRate : a.valorNumerico;
      const valB = b.moeda === 'USD' ? b.valorNumerico * exchangeRate : b.valorNumerico;

      switch (sortBy) {
        case 'prioridade-desc':
        case 'apoios-desc':
          return compareSuggestionsQueue(a, b);
        case 'apoios-asc':
          return getSuggestionPriorityStats(a).totalPoints - getSuggestionPriorityStats(b).totalPoints;
        case 'valor-asc':
          return valA - valB;
        case 'valor-desc':
          return valB - valA;
        case 'tipo-asc':
          return (a.produto || '').localeCompare(b.produto || '', 'pt-BR');
        case 'data-asc':
          return (a.data || '').localeCompare(b.data || '');
        case 'data-desc':
        default:
          return (b.data || '').localeCompare(a.data || '');
      }
    });

    return list;
  }, [sugestoesItems, selectedSistema, selectedTipo, searchTerm, sortBy, exchangeRate]);

  const handleSupportClick = (item: ItemRPG) => {
    if (isAuthorSupporter(item, currentUser)) return;
    const myNorm = normalizeIdentityName(currentUser.nome);
    const isUserSupporting = getOtherSupporters(item).some(
      (ap) => ap.id === currentUser.id || normalizeIdentityName(ap.nome) === myNorm
    );

    if (isUserSupporting) {
      // Retirada direta sem exibir modal de confirmação
      onToggleSupportItem(item.id);
    } else {
      // Exibe confirmação com aviso sobre interesse real
      setItemToCommit(item);
    }
  };

  const handleConfirmCommitment = () => {
    if (!itemToCommit || isSubmittingSupport) return;
    try {
      setIsSubmittingSupport(true);
      onToggleSupportItem(itemToCommit.id);
      setItemToCommit(null);
    } finally {
      setTimeout(() => setIsSubmittingSupport(false), 500);
    }
  };

  const handleOpenDonateModal = (item: ItemRPG) => {
    if (isMaster) return;
    setItemToDonate(item);
    setDonateAmount(myTrollinsBalance >= 1 ? 1 : 0);
    setDonationError('');
    setIsSubmittingDonation(false);
    donationRequestIdRef.current = `donreq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  };

  const handleConfirmDonation = async () => {
    if (!itemToDonate || isSubmittingDonation) return;
    if (myTrollinsBalance < 1) {
      setDonationError('Você não possui Trollins disponíveis para doar no momento.');
      return;
    }
    const cleanAmount = Math.floor(Number(donateAmount));
    if (!Number.isInteger(cleanAmount) || cleanAmount < 1 || cleanAmount > myTrollinsBalance) {
      setDonationError(`Escolha entre 1 e ${myTrollinsBalance} Trollin(s) para doar.`);
      return;
    }

    try {
      setIsSubmittingDonation(true);
      setDonationError('');
      const reqId =
        donationRequestIdRef.current ||
        `donreq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      donationRequestIdRef.current = reqId;
      await onDonateTrollins(itemToDonate.id, cleanAmount, reqId);
      setItemToDonate(null);
    } catch (err: any) {
      setDonationError(err?.message || 'Erro ao confirmar doação de Trollins.');
      // Gera novo clientRequestId caso a tentativa falhe e o usuário queira tentar novamente
      donationRequestIdRef.current = `donreq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  const handleCopySummary = (item: ItemRPG) => {
    const valorEmReais = item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;
    const otherSupporters = getOtherSupporters(item);
    const stats = getSuggestionPriorityStats(item);
    const apoiadoresNomes = otherSupporters.map((a) => a.nome).join(', ') || 'Nenhum ainda';

    const text =
      `💡 *SUGESTÃO DE COMPRA RPG - A PONTE DOS TROLLS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *${item.nome}*\n` +
      `🎲 *Sistema:* ${item.sistema} | *Tipo:* ${item.produto}\n` +
      `🏆 *Prioridade:* ${formatSuggestionPriorityText(stats)}\n` +
      `💰 *Valor Estimado:* ${
        item.moeda === 'USD'
          ? `US$ ${item.valorNumerico.toFixed(2)} (~ R$ ${valorEmReais.toFixed(2)})`
          : `R$ ${valorEmReais.toFixed(2)}`
      }\n` +
      `👤 *Sugerido por:* ${item.sugeridoPorNome}\n` +
      `🙋‍♂️ *Interessados (${otherSupporters.length}):* ${apoiadoresNomes}\n` +
      (item.link ? `🔗 *Link:* ${item.link}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Acesse a central da Ponte dos Trolls para apoiar esta sugestão!_`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    onToast('Sugestão copiada para o WhatsApp!');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Banner Superior com Arte dos Trolls (Fiel ao Print 4 / image_a9b2f00e.png) */}
      <PageBanner
        title="Ideias para a próxima aventura"
        subtitle="Sugira materiais e manifeste seu interesse nas escolhas da comunidade."
      />

      {/* Cabeçalho da Seção: Título à Esquerda + Botão Sugerir Compra à Direita */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="w-6 h-6 text-[#716016] shrink-0" />
          <h2 className="font-rpg text-xl sm:text-2xl font-bold text-[#302414]">
            Sugestões da comunidade
          </h2>
        </div>

        <button
          onClick={onOpenNewItem}
          className="px-4 py-2.5 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Sugerir compra</span>
        </button>
      </div>

      {/* Linha de Filtros: Busca, Sistema, Categoria e Ordenação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        
        {/* Barra de Busca */}
        <div className="relative lg:col-span-1">
          <Search className="w-4 h-4 text-[#71634D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar sugestões..."
            className="w-full bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F] shadow-sm"
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

        {/* Dropdown Sistema */}
        <div className="relative">
          <select
            value={selectedSistema}
            onChange={(e) => setSelectedSistema(e.target.value)}
            className="w-full appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
          >
            <option value="Todos">Sistema: Todos</option>
            {SISTEMAS_PADRAO.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown Categoria */}
        <div className="relative">
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="w-full appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
          >
            <option value="Todos">Categoria: Todas</option>
            {OFFICIAL_PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown Ordenação */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
          >
            <option value="prioridade-desc">Fila de Prioridade (Pontos)</option>
            <option value="apoios-asc">Menor pontuação</option>
            <option value="data-desc">Mais recentes</option>
            <option value="data-asc">Mais antigas</option>
            <option value="valor-asc">Menor valor</option>
            <option value="valor-desc">Maior valor</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

      </div>

      {/* Layout de 2 Colunas: Lista Principal (Esquerda) + Barra Lateral Informativa (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA: LISTA DE SUGESTÕES (Fiel ao Print 4) */}
        <div className="lg:col-span-8 space-y-4">
          {sortedAndFilteredItems.length === 0 ? (
            <div className="parchment-card p-12 text-center">
              <Lightbulb className="w-12 h-12 text-[#716016] mx-auto mb-3 opacity-60" />
              <h3 className="font-rpg text-lg font-bold text-[#302414]">
                Nenhuma sugestão encontrada
              </h3>
              <p className="text-xs text-[#71634D] max-w-sm mx-auto mt-1 mb-4">
                Não há sugestões com esses filtros no momento. Seja o primeiro a sugerir um material!
              </p>
              <button
                onClick={onOpenNewItem}
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Sugerir compra agora
              </button>
            </div>
          ) : (
            sortedAndFilteredItems.map((item) => {
              const myNorm = normalizeIdentityName(currentUser.nome);
              const isAuthor = isAuthorSupporter(item, currentUser);
              const otherSupporters = getOtherSupporters(item);
              const isUserSupporting = otherSupporters.some(
                (ap) => ap.id === currentUser.id || normalizeIdentityName(ap.nome) === myNorm
              );
              const priorityStats = getSuggestionPriorityStats(item);
              const priorityBadgeText = formatSuggestionPriorityBadge(priorityStats);
              const priorityFormulaText = formatSuggestionPriorityFormula(priorityStats);

              const valorEmReais =
                item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;

              return (
                <div
                  key={item.id}
                  className="parchment-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 transition-all hover:shadow-md"
                >
                  {/* Miniatura à Esquerda */}
                  <div className="w-full sm:w-40 h-36 sm:h-28 rounded-xl overflow-hidden bg-[#282D13] shrink-0 border border-[#C6AD78] relative">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-[#93a270]">
                        <Package className="w-7 h-7 mb-1 opacity-70" />
                        <span className="text-[10px] line-clamp-1">{item.nome}</span>
                      </div>
                    )}
                  </div>

                  {/* Centro: Informações, Tags, Descrição, Pontuação em Selo + Soma e Autor */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDE2CA] text-[#55482e] border border-[#D5C49F]">
                        {item.sistema}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5DBC1] text-[#55482e] border border-[#D5C49F]">
                        {item.produto}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className="font-rpg text-base sm:text-lg font-bold text-[#302414] leading-snug line-clamp-1">
                      {item.nome}
                    </h3>

                    {/* Descrição */}
                    <p className="text-xs text-[#71634D] line-clamp-2 leading-relaxed">
                      {item.descricao || 'Sem descrição detalhada.'}
                    </p>

                    {/* Selo de Alto Contraste + Conta Explicada Logo Abaixo */}
                    <div className="pt-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#282D13] text-[#F6D365] border border-[#D4A538] text-xs font-bold shadow-xs tabular-nums">
                          <TrollinCoinIcon size={16} />
                          <span>{priorityBadgeText}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#55482e] tabular-nums">
                        <TrollinInfoBadge iconSize={14} align="left">
                          <span className="sr-only">Explicação sobre Trollins</span>
                        </TrollinInfoBadge>
                        <span>{priorityFormulaText}</span>
                      </div>
                    </div>

                    {/* Autor & Ações Secundárias */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-[#71634D]">
                      <span className="flex items-center gap-1 truncate">
                        <User className="w-3 h-3 text-[#716016]" />
                        <span>Sugerido por <strong className="text-[#302414]">{item.sugeridoPorNome}</strong></span>
                      </span>

                      <div className="flex items-center gap-2">
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#48551F] hover:underline flex items-center gap-1 font-semibold"
                            title="Abrir página oficial do produto"
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <button
                          onClick={() => handleCopySummary(item)}
                          className="hover:text-[#302414] flex items-center gap-1 cursor-pointer"
                          title="Copiar resumo para o WhatsApp"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-[#48551F]" />
                          ) : (
                            <Share2 className="w-3 h-3" />
                          )}
                        </button>

                        {(isMaster || item.sugeridoPorNome.toLowerCase() === currentUser.nome.toLowerCase()) && (
                          <button
                            onClick={() => onEditItem(item)}
                            className="hover:text-[#48551F] cursor-pointer"
                            title="Editar sugestão"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}

                        {isMaster && (
                          <button
                            onClick={() => onDeleteItem(item)}
                            className="hover:text-[#8b261b] cursor-pointer"
                            title="Excluir sugestão"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Direita: Preço e Botões "Me interesso" + "Doar Trollins" (Ocultos no Modo Mestre) */}
                  <div className="sm:w-56 sm:border-l sm:border-[#D6C296] sm:pl-4 flex flex-col justify-between items-start sm:items-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D6C296]">
                    <div className="sm:text-right w-full">
                      {/* Preço original respeitando a moeda cadastrada */}
                      <span className="font-mono text-lg font-bold text-[#302414] block tabular-nums">
                        {item.moeda === 'USD' ? 'US$' : 'R$'}{' '}
                        {item.valorNumerico.toFixed(2).replace('.', ',')}
                      </span>

                      {/* Estimativa em Reais se for em Dólares */}
                      {item.moeda === 'USD' ? (
                        <span className="text-[11px] text-[#71634D] flex items-center sm:justify-end gap-1 mt-0.5 tabular-nums">
                          <Calculator className="w-3 h-3 text-[#716016]" />
                          <span>~ R$ {valorEmReais.toFixed(2).replace('.', ',')} (est. BRL)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#71634D] block mt-0.5">
                          (valor total em reais)
                        </span>
                      )}

                      {/* Interessados gratuitos */}
                      <div className="flex items-center sm:justify-end gap-1.5 text-xs text-[#71634D] font-medium mt-1 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-[#716016]" />
                        <span>
                          <strong className="font-mono text-[#302414]">{priorityStats.supports}</strong>{' '}
                          {priorityStats.supports === 1 ? 'interessado' : 'interessados'}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação lado a lado: Apoio gratuito + Doar Trollins */}
                    {!isMaster && (
                      <div className="mt-3 w-full grid grid-cols-2 gap-1.5">
                        {isAuthor ? (
                          <div className="min-h-[42px] py-2 px-2 rounded-xl bg-[#EFE4CC] text-[#71634D] border border-[#D6C296] text-[11px] font-semibold flex items-center justify-center text-center leading-tight">
                            Sua sugestão
                          </div>
                        ) : isUserSupporting ? (
                          <button
                            type="button"
                            onClick={() => handleSupportClick(item)}
                            className="min-h-[42px] py-2 px-2 rounded-xl bg-[#dbe6c2] hover:bg-[#cfdcaf] text-[#354817] border border-[#8ea259] text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                            title="Clique para remover seu interesse"
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>Tenho interesse</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSupportClick(item)}
                            className="min-h-[42px] py-2 px-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                          >
                            <span>🤝</span>
                            <span>Me interesso</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenDonateModal(item)}
                          className="min-h-[42px] py-2 px-2 rounded-xl bg-[#282D13] hover:bg-[#363d1b] text-[#F6D365] border border-[#D4A538] text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                          title="Doar Trollins para aumentar a prioridade desta sugestão"
                        >
                          <TrollinCoinIcon size={15} />
                          <span>Doar Trollins</span>
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* COLUNA DIREITA: SEUS TROLLINS + COMO FUNCIONA + PARTICIPAÇÕES */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">

          {/* Card: Saldo Pessoal de Trollins (Destaque em Dourado sobre Verde-Oliva Escuro) */}
          {!isMaster && (
            <div className="p-5 space-y-3 rounded-2xl bg-[#282D13] text-[#F8EDD5] border-2 border-[#D4A538] shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-[#D4A538]/30">
                <TrollinInfoBadge iconSize={22} align="left">
                  <h3 className="font-rpg text-base font-bold text-[#F6D365]">
                    Seus Trollins
                  </h3>
                </TrollinInfoBadge>
                <span className="text-[11px] font-semibold text-[#E6D4A7]">Saldo pessoal</span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <TrollinInfoBadge showIcon={false} align="left">
                  <TrollinCoinIcon size={54} className="drop-shadow-md" />
                </TrollinInfoBadge>
                <div className="min-w-0 tabular-nums">
                  <span className="font-rpg text-4xl font-bold text-[#F6D365] leading-none block">
                    {myTrollinsBalance}
                  </span>
                  <span className="text-xs font-semibold text-[#F8EDD5] block mt-1">
                    {myTrollinsBalance === 1 ? 'Trollin disponível' : 'Trollins disponíveis'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#E6D4A7] leading-relaxed pt-1 border-t border-[#D4A538]/20">
                Você ganha 1 Trollin por financiamento concluído e pode investi-los ao sugerir compras ou doar em sugestões da comunidade.
              </p>
            </div>
          )}

          {/* Card: Como funciona */}
          <div className="parchment-card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D6C296]">
              <BookOpen className="w-4 h-4 text-[#716016]" />
              <h3 className="font-rpg text-base font-bold text-[#302414]">
                Como funciona
              </h3>
            </div>

            <div className="space-y-4 text-xs">

              {/* Passo 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#716016] text-[#F8EDD5] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-[#302414] text-xs flex items-center gap-1.5">
                    <span>✏️</span>
                    <span>Sugerir com Trollins</span>
                  </h4>
                  <p className="text-[#71634D] leading-relaxed">
                    Invista a partir de 1 Trollin para indicar materiais e definir a prioridade inicial na fila.
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#716016] text-[#F8EDD5] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-[#302414] text-xs flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Me interesso e Doar Trollins</span>
                  </h4>
                  <p className="text-[#71634D] leading-relaxed">
                    Cada membro que marcar interesse soma +1 ponto grátis. Você também pode doar Trollins para impulsionar a prioridade de qualquer sugestão.
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#716016] text-[#F8EDD5] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-[#302414] text-xs flex items-center gap-1.5">
                    <span>📦</span>
                    <span>Financiar</span>
                  </h4>
                  <p className="text-[#71634D] leading-relaxed">
                    As sugestões no topo da fila viram pacotes de financiamento oficial organizados pelo Mestre.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Card: Suas participações */}
          <div className="parchment-card p-5 space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D6C296]">
              <Users className="w-4 h-4 text-[#716016]" />
              <h3 className="font-rpg text-base font-bold text-[#302414]">
                Suas participações
              </h3>
            </div>

            <div className="flex items-baseline gap-3 pt-1 tabular-nums">
              <span className="font-rpg text-4xl font-bold text-[#48551F]">
                {userSupportedCount}
              </span>
              <span className="text-sm font-semibold text-[#302414]">
                {userSupportedCount === 1 ? 'sugestão de interesse' : 'sugestões de interesse'}
              </span>
            </div>
            <p className="text-[11px] text-[#71634D] leading-tight">
              Acompanhe suas preferências e ajude a definir os próximos financiamentos coletivos da Ponte.
            </p>
          </div>

        </aside>

      </div>

      {/* Modal de Confirmação de Interesse */}
      {itemToCommit && (
        <div
          className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingSupport) setItemToCommit(null);
          }}
        >
          <div className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in-50 border-[#C6AD78]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-lg font-bold text-[#302414] flex items-center gap-2">
                <span>🤝</span>
                <span>Tem interesse em participar?</span>
              </h3>
              <button
                type="button"
                disabled={isSubmittingSupport}
                onClick={() => setItemToCommit(null)}
                className="p-1 text-[#71634D] hover:text-[#302414] rounded-lg transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#55482e] leading-relaxed">
              Manifestar interesse significa que você gostaria de participar da compra quando ela for organizada. Marque interesse apenas nos materiais que pretende adquirir. A inscrição e a coleta no financiamento serão feitas posteriormente.
            </p>

            {/* Detalhes do item apoiado */}
            <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs space-y-1.5">
              <div className="font-bold text-[#302414] line-clamp-1">
                📦 {itemToCommit.nome}
              </div>
              <div className="flex items-center justify-between text-[#71634D]">
                <span>Preço estimado:</span>
                <span className="font-mono font-bold text-[#302414]">
                  {itemToCommit.moeda === 'USD'
                    ? `US$ ${itemToCommit.valorNumerico.toFixed(2)} (~ R$ ${(itemToCommit.valorNumerico * exchangeRate).toFixed(2)})`
                    : `R$ ${itemToCommit.valorNumerico.toFixed(2).replace('.', ',')}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#71634D]">
                <span>Pontuação atual:</span>
                <span className="font-semibold text-[#48551F] tabular-nums">
                  {formatSuggestionPriorityText(getSuggestionPriorityStats(itemToCommit))}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmittingSupport}
                onClick={() => setItemToCommit(null)}
                className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingSupport}
                onClick={handleConfirmCommitment}
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmittingSupport ? 'Salvando...' : 'Sim, tenho interesse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Doação de Trollins para Sugestão */}
      {itemToDonate && (() => {
        const currentStats = getSuggestionPriorityStats(itemToDonate);
        const chosen = myTrollinsBalance >= 1
          ? Math.min(Math.max(1, donateAmount), myTrollinsBalance)
          : 0;
        const remainingBalance = Math.max(0, myTrollinsBalance - chosen);
        const projectedScore = currentStats.totalPoints + chosen;
        const projectedFormula = formatSuggestionPriorityFormula({
          ...currentStats,
          donated: currentStats.donated + chosen,
          totalPoints: projectedScore,
        });
        const progressPct =
          myTrollinsBalance > 1
            ? Math.round(((chosen - 1) / (myTrollinsBalance - 1)) * 100)
            : 100;

        return (
          <div
            className="fixed inset-0 z-50 bg-[#282D13]/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingDonation) setItemToDonate(null);
            }}
          >
            <div className="parchment-card w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 border-2 border-[#D4A538]">
              {/* Header */}
              <div className="p-4 sm:p-5 bg-[#282D13] border-b border-[#D4A538]/40 flex items-center justify-between text-[#F8EDD5]">
                <TrollinInfoBadge iconSize={24} align="left">
                  <span className="font-rpg text-base sm:text-lg font-bold text-[#F6D365]">
                    Doar Trollins
                  </span>
                </TrollinInfoBadge>
                <button
                  type="button"
                  disabled={isSubmittingDonation}
                  onClick={() => setItemToDonate(null)}
                  className="p-1.5 text-[#cfc4a6] hover:text-[#F8EDD5] rounded-lg hover:bg-[#363e1a] transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs text-[#302414]">
                {/* Sugestão alvo */}
                <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#71634D] block">
                    Sugestão selecionada
                  </span>
                  <div className="font-rpg text-sm font-bold text-[#302414] line-clamp-1">
                    {itemToDonate.nome}
                  </div>
                  <div className="text-[11px] text-[#55482e] tabular-nums">
                    Pontuação atual: <strong>{formatSuggestionPriorityBadge(currentStats)}</strong> ({formatSuggestionPriorityFormula(currentStats)})
                  </div>
                </div>

                {myTrollinsBalance < 1 ? (
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-medium leading-relaxed">
                    Você está sem Trollins disponíveis no momento (saldo: 0). Você ainda pode marcar <strong>"Me interesso"</strong> gratuitamente para somar +1 ponto na sugestão.
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#282D13] text-[#F8EDD5] border border-[#D4A538] space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <TrollinCoinIcon size={32} />
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-[#E6D4A7]">
                            Valor da doação
                          </span>
                          <span className="font-rpg text-3xl font-bold text-[#F6D365] leading-none tabular-nums">
                            {chosen} {chosen === 1 ? 'Trollin' : 'Trollins'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="block text-[10px] uppercase font-semibold text-[#E6D4A7]">
                          Saldo atual
                        </span>
                        <span className="font-rpg text-lg font-bold text-[#F8EDD5]">
                          {myTrollinsBalance}
                        </span>
                      </div>
                    </div>

                    {/* Barra dourada com controle deslizante */}
                    <div className="space-y-1.5">
                      <div className="relative flex items-center h-6">
                        <div className="w-full h-2.5 rounded-full bg-[#1B1F0B] border border-[#D4A538]/50 overflow-hidden pointer-events-none">
                          <div
                            className="h-full bg-gradient-to-r from-[#B8860B] via-[#D4A538] to-[#F6D365] rounded-full transition-all duration-100"
                            style={{ width: `${Math.max(8, progressPct)}%` }}
                          />
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={myTrollinsBalance}
                          step={1}
                          value={chosen}
                          disabled={isSubmittingDonation}
                          onChange={(e) => setDonateAmount(parseInt(e.target.value, 10) || 1)}
                          aria-label="Quantidade de Trollins para doar"
                          className="absolute inset-0 w-full h-full opacity-90 accent-[#F6D365] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F6D365] rounded-full"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#E6D4A7] tabular-nums">
                        <span>Mínimo: 1</span>
                        <span>Disponível: {myTrollinsBalance}</span>
                      </div>
                    </div>

                    {/* Prévia antes de confirmar */}
                    <div className="pt-2.5 border-t border-[#D4A538]/30 space-y-1.5 text-[11px] tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-[#E6D4A7]">Seu saldo após doar:</span>
                        <strong className="text-[#F8EDD5]">
                          {remainingBalance} {remainingBalance === 1 ? 'Trollin' : 'Trollins'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#E6D4A7]">Nova pontuação da sugestão:</span>
                        <strong className="text-[#F6D365]">
                          {currentStats.totalPoints} → {projectedScore}{' '}
                          {projectedScore === 1 ? 'ponto' : 'pontos'}
                        </strong>
                      </div>
                      <div className="text-[10px] text-[#E6D4A7]/90">
                        {projectedFormula}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-[#71634D] leading-relaxed">
                  Os Trollins doados aumentam a pontuação desta sugestão na fila e não são transferidos ao saldo do autor.
                </p>

                {donationError && (
                  <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-[11px] font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{donationError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2 border-t border-[#D6C296]">
                  <button
                    type="button"
                    disabled={isSubmittingDonation}
                    onClick={() => setItemToDonate(null)}
                    className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingDonation || myTrollinsBalance < 1 || chosen < 1}
                    onClick={handleConfirmDonation}
                    className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    {isSubmittingDonation ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <>
                        <TrollinCoinIcon size={15} />
                        <span>Confirmar doação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
