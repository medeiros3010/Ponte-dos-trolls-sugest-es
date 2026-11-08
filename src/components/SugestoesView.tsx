import React, { useState, useMemo } from 'react';
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
  Copy,
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
} from 'lucide-react';
import { PageBanner } from './PageBanner';

interface SugestoesViewProps {
  items: ItemRPG[];
  currentUser: UserProfile;
  exchangeRate: number;
  onGoHome: () => void;
  onOpenNewItem: () => void;
  onToggleSupportItem: (itemId: string) => void;
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
  onEditItem,
  onDeleteItem,
  onToast,
}) => {
  const isMaster = Boolean(currentUser.isMaster);
  const [selectedSistema, setSelectedSistema] = useState<string>('Todos');
  const [selectedTipo, setSelectedTipo] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<string>('apoios-desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Commitment Confirmation Modal state
  const [itemToCommit, setItemToCommit] = useState<ItemRPG | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState<boolean>(false);

  // Filtra apenas itens com status 'Sugestão'
  const sugestoesItems = useMemo(() => {
    return items.filter((i) => i.status === 'Sugestão');
  }, [items]);

  // Contagem de participações do usuário logado
  const userSupportedCount = useMemo(() => {
    return sugestoesItems.filter((i) =>
      (i.apoiadores || []).some(
        (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
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
      const apoiosA = (a.apoiadores || []).length;
      const apoiosB = (b.apoiadores || []).length;

      switch (sortBy) {
        case 'apoios-desc':
          return apoiosB - apoiosA;
        case 'apoios-asc':
          return apoiosA - apoiosB;
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
    const isUserSupporting = (item.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
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

  const handleCopySummary = (item: ItemRPG) => {
    const valorEmReais = item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;
    const apoiadoresNomes = (item.apoiadores || []).map((a) => a.nome).join(', ') || 'Nenhum ainda';

    const text =
      `💡 *SUGESTÃO DE COMPRA RPG - A PONTE DOS TROLLS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *${item.nome}*\n` +
      `🎲 *Sistema:* ${item.sistema} | *Tipo:* ${item.produto}\n` +
      `💰 *Valor Estimado:* ${
        item.moeda === 'USD'
          ? `US$ ${item.valorNumerico.toFixed(2)} (~ R$ ${valorEmReais.toFixed(2)})`
          : `R$ ${valorEmReais.toFixed(2)}`
      }\n` +
      `👤 *Sugerido por:* ${item.sugeridoPorNome}\n` +
      `🙋‍♂️ *Interessados (${item.apoiadores.length}):* ${apoiadoresNomes}\n` +
      (item.link ? `🔗 *Link:* ${item.link}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Acesse a central da Ponte dos Trolls para apoiar esta sugestão!_`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    onToast('Sugestão copiada para o WhatsApp!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Banner Superior com Arte dos Trolls (Fiel ao Print 4 / image_a9b2f00e.png) */}
      <PageBanner
        title="Ideias para a próxima aventura"
        subtitle="Sugira materiais e apoie as escolhas da comunidade."
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
            <option value="apoios-desc">Mais apoiadas</option>
            <option value="apoios-asc">Menos apoiadas</option>
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
              const isUserSupporting = (item.apoiadores || []).some(
                (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
              );

              const valorEmReais =
                item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;

              return (
                <div
                  key={item.id}
                  className="parchment-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 transition-all hover:shadow-md"
                >
                  {/* Miniatura à Esquerda */}
                  <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-[#282D13] shrink-0 border border-[#C6AD78] relative">
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

                  {/* Centro: Informações, Tags, Descrição e Autor */}
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

                    {/* Autor & Ações Secundárias */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#71634D]">
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

                  {/* Direita: Preço, Apoios e Botão Apoiar (Fiel ao Print 4) */}
                  <div className="sm:w-44 sm:border-l sm:border-[#D6C296] sm:pl-4 flex flex-col justify-between items-start sm:items-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D6C296]">
                    <div className="sm:text-right w-full">
                      {/* Preço original respeitando a moeda cadastrada */}
                      <span className="font-mono text-lg font-bold text-[#302414] block">
                        {item.moeda === 'USD' ? 'US$' : 'R$'}{' '}
                        {item.valorNumerico.toFixed(2).replace('.', ',')}
                      </span>

                      {/* Estimativa em Reais se for em Dólares */}
                      {item.moeda === 'USD' ? (
                        <span className="text-[11px] text-[#71634D] flex items-center sm:justify-end gap-1 mt-0.5">
                          <Calculator className="w-3 h-3 text-[#716016]" />
                          <span>~ R$ {valorEmReais.toFixed(2).replace('.', ',')} (est. BRL)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#71634D] block mt-0.5">
                          (valor total em reais)
                        </span>
                      )}

                      {/* Contagem de Apoios */}
                      <div className="flex items-center sm:justify-end gap-1.5 text-xs text-[#302414] font-medium mt-1">
                        <Users className="w-3.5 h-3.5 text-[#716016]" />
                        <span>
                          <strong className="font-mono">{item.apoiadores.length}</strong> apoios
                        </span>
                      </div>
                    </div>

                    {/* Botão de Ação: "Você apoiou" ou "Apoiar" */}
                    <div className="mt-3 w-full">
                      {isUserSupporting ? (
                        <button
                          onClick={() => handleSupportClick(item)}
                          className="w-full py-2 px-3 rounded-xl bg-[#dbe6c2] hover:bg-[#cfdcaf] text-[#354817] border border-[#8ea259] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          title="Clique para remover seu apoio"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Você apoiou</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSupportClick(item)}
                          className="w-full py-2 px-3 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <span>🤝</span>
                          <span>Apoiar</span>
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* COLUNA DIREITA: COMO FUNCIONA + PARTICIPAÇÕES (Fiel ao Print 4) */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          
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
                    <span>Sugerir</span>
                  </h4>
                  <p className="text-[#71634D] leading-relaxed">
                    Indique livros, mapas, módulos ou outros materiais para a mesa.
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
                    <span>Apoiar</span>
                  </h4>
                  <p className="text-[#71634D] leading-relaxed">
                    Demonstre interesse apoiando as sugestões da comunidade.
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
                    As ideias mais apoiadas viram pacotes de financiamento oficial organizados pelo Mestre.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Card: Suas participações (Fiel ao Print 4) */}
          <div className="parchment-card p-5 space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D6C296]">
              <Users className="w-4 h-4 text-[#716016]" />
              <h3 className="font-rpg text-base font-bold text-[#302414]">
                Suas participações
              </h3>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="font-rpg text-4xl font-bold text-[#48551F]">
                {userSupportedCount}
              </span>
              <span className="text-sm font-semibold text-[#302414]">
                {userSupportedCount === 1 ? 'sugestão apoiada' : 'sugestões apoiadas'}
              </span>
            </div>
            <p className="text-[11px] text-[#71634D] leading-tight">
              Acompanhe suas preferências e ajude a definir os próximos financiamentos coletivos da Ponte.
            </p>
          </div>

        </aside>

      </div>

      {/* Modal de Confirmação de Apoio */}
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
              Apoiar significa que você tem interesse real em participar da compra quando ela for organizada. Apoie apenas os materiais que pretende adquirir. A participação no financiamento será confirmada em uma etapa posterior.
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
                <span>Interessados atuais:</span>
                <span className="font-semibold text-[#48551F]">
                  {(itemToCommit.apoiadores || []).length} pessoas
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

    </div>
  );
};
