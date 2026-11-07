import React, { useState, useMemo } from 'react';
import { ItemRPG, UserProfile, SISTEMAS_PADRAO, OFFICIAL_PRODUCT_TYPES } from '../types';
import { ArrowLeft, ShoppingBag, Plus, Search, ExternalLink, Users, Copy, Check, UserPlus, Edit2, Trash2, AlertTriangle, ShieldAlert, ArrowUpDown, Filter } from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<string>('data-desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Commitment Confirmation Modal state
  const [itemToCommit, setItemToCommit] = useState<ItemRPG | null>(null);

  // Filtra apenas itens com status 'Sugestão'
  const sugestoesItems = useMemo(() => {
    return items.filter((i) => i.status === 'Sugestão');
  }, [items]);

  // Filtra e Ordena estritamente segundo as 4 regras especificadas
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
        case 'data-desc':
          // 📅 Tempo incluído: Mais recente para o mais antigo
          return (b.data || '').localeCompare(a.data || '');
        case 'data-asc':
          // 📅 Tempo incluído: Mais antigo para o mais recente
          return (a.data || '').localeCompare(b.data || '');
        case 'tipo-asc':
          // 🏷️ Tipo de Produto (Ordenação alfabética)
          return (a.produto || '').localeCompare(b.produto || '', 'pt-BR');
        case 'valor-asc':
          // 💰 Valor: Menor para o maior (normalizando USD para BRL)
          return valA - valB;
        case 'valor-desc':
          // 💰 Valor: Maior para o menor (normalizando USD para BRL)
          return valB - valA;
        case 'apoios-desc':
          // 👥 Quantidade de pessoas que apoiam: Mais apoiado para o menos apoiado
          return apoiosB - apoiosA;
        case 'apoios-asc':
          // 👥 Quantidade de pessoas que apoiam: Menos apoiado para o mais apoiado
          return apoiosA - apoiosB;
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
      // Já apoia -> remove apoio diretamente
      onToggleSupportItem(item.id);
    } else {
      // Não apoia -> abre modal de compromisso de apoio
      setItemToCommit(item);
    }
  };

  const handleConfirmCommitment = () => {
    if (!itemToCommit) return;
    onToggleSupportItem(itemToCommit.id);
    onToast(`Você declarou apoio à sugestão "${itemToCommit.nome}"!`);
    setItemToCommit(null);
  };

  const handleCopySummary = (item: ItemRPG) => {
    const valorEmReais = item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;
    const apoiadoresNomes = (item.apoiadores || []).map((a) => a.nome).join(', ') || 'Nenhum ainda';

    const text = `💡 *SUGESTÃO DE COMPRA RPG - A PONTE DOS TROLLS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *${item.nome}*\n` +
      `🎲 *Sistema:* ${item.sistema} | *Tipo:* ${item.produto}\n` +
      `💰 *Valor Estimado:* ${item.moeda === 'USD' ? `$${item.valorNumerico.toFixed(2)} (aprox. R$ ${valorEmReais.toFixed(2)})` : `R$ ${valorEmReais.toFixed(2)}`}\n` +
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1f3524]">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#142318] hover:bg-[#1a2f20] text-[#d49e2a] hover:text-[#f4ecd8] border border-[#27442d] text-xs font-semibold transition-all hover:-translate-x-0.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Menu Inicial</span>
        </button>

        {/* Botão de Sugerir Compra sem duplicar o '+' */}
        <button
          onClick={onOpenNewItem}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Sugerir Nova Compra</span>
        </button>
      </div>

      {/* Título da Seção */}
      <div className="mb-6 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d49e2a] uppercase tracking-wider">
          <ShoppingBag className="w-4 h-4" />
          <span>Ideias da Comunidade</span>
        </div>
        <h1 className="font-rpg text-2xl sm:text-3xl font-bold text-[#f4ecd8]">
          Sugerir Compras
        </h1>
        <p className="text-xs sm:text-sm text-[#8a9d8c]">
          Envie ideias de livros, tokens, mapas e módulos Foundry VTT. Os materiais mais votados serão agrupados pelo Mestre em um pacote oficial de financiamento!
        </p>
      </div>

      {/* Barra de Filtros, Categorias & Ordenação */}
      <div className="bg-[#0e1911] border border-[#1f3524] rounded-2xl p-3 sm:p-4 mb-6 space-y-3">
        {/* Linha 1: Busca e Sistema */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, tipo, sistema, descrição ou apoiador..."
              className="w-full pl-9 pr-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
            />
          </div>

          <div className="w-full sm:w-52">
            <select
              value={selectedSistema}
              onChange={(e) => setSelectedSistema(e.target.value)}
              className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
            >
              <option value="Todos">Todos os Sistemas</option>
              {SISTEMAS_PADRAO.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 2: Tipo de Produto e Menu Suspenso de Ordenação Oficial */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#1a2f20]">
          {/* Tipo de Produto */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[11px] font-semibold text-[#8a9d8c] shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#d49e2a]" />
              <span>Tipo:</span>
            </label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="flex-1 sm:w-48 px-3 py-1.5 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
            >
              <option value="Todos">Todos os Tipos</option>
              {OFFICIAL_PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Menu Suspenso de Ordenação Completa */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[11px] font-semibold text-[#8a9d8c] shrink-0 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#d49e2a]" />
              <span>Ordenar por:</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 sm:w-64 px-3 py-1.5 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a] cursor-pointer"
            >
              <option value="data-desc">📅 Tempo incluído (Mais recente)</option>
              <option value="data-asc">📅 Tempo incluído (Mais antigo)</option>
              <option value="tipo-asc">🏷️ Tipo de Produto (A - Z)</option>
              <option value="valor-asc">💰 Valor (Menor para o maior)</option>
              <option value="valor-desc">💰 Valor (Maior para o menor)</option>
              <option value="apoios-desc">👥 Quantidade de apoios (Mais votado)</option>
              <option value="apoios-asc">👥 Quantidade de apoios (Menos votado)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Sugestões */}
      {sortedAndFilteredItems.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#1f3524] rounded-3xl bg-[#0c150e]/60">
          <div className="w-16 h-16 rounded-full bg-[#182c1d] border border-[#27442d] flex items-center justify-center mx-auto mb-3 text-2xl">
            💡
          </div>
          <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
            Nenhuma sugestão encontrada
          </h3>
          <p className="text-xs text-[#8a9d8c] mt-1 max-w-sm mx-auto">
            Seja o primeiro a enviar uma ideia ou ajuste os filtros de pesquisa acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedAndFilteredItems.map((item) => {
            const apoiadores = item.apoiadores || [];
            const count = apoiadores.length;
            const valorEmReais = item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;
            const isUserSupporting = apoiadores.some(
              (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
            );

            return (
              <div
                key={item.id}
                className="bg-[#122015] border border-[#1f3524] hover:border-[#d49e2a]/50 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1a3321] text-[#d49e2a] border border-[#d49e2a]/30">
                        {item.sistema}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#16271b] text-[#a4b5a6] border border-[#203625]">
                        {item.produto}
                      </span>
                      <span className="text-[11px] text-[#7a8e7d]">
                        Sugerido por <strong className="text-[#f1ede4]">{item.sugeridoPorNome}</strong>
                      </span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-[#f4ecd8]">
                      {item.nome}
                    </h3>
                  </div>

                  {/* Valor e Ações de Mestre */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm sm:text-base text-[#d49e2a]">
                        {item.moeda === 'USD' ? `$ ${item.valorNumerico.toFixed(2)}` : `R$ ${item.valorNumerico.toFixed(2)}`}
                      </div>
                      {item.moeda === 'USD' && (
                        <div className="text-[10px] text-[#8a9d8c] font-mono">
                          ~ R$ {valorEmReais.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {isMaster && (
                      <div className="flex items-center gap-1 border-l border-[#203625] pl-2">
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1.5 text-[#7a8e7d] hover:text-[#f4ecd8] hover:bg-[#182c1d] rounded-lg transition-colors cursor-pointer"
                          title="Editar sugestão"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item)}
                          className="p-1.5 text-[#7a8e7d] hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Excluir sugestão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {item.descricao && (
                  <p className="text-xs text-[#a4b5a6] leading-relaxed">
                    {item.descricao}
                  </p>
                )}

                {/* Interessados & Apoio */}
                <div className="pt-2 border-t border-[#1a2d1f] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[#6ee7b7] font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      <span>{count} {count === 1 ? 'interessado' : 'interessados'}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[#7a8e7d] truncate max-w-xs text-[11px]">
                        ({apoiadores.map((a) => a.nome).join(', ')})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-[#142318] hover:bg-[#1a2f20] text-[#a4b5a6] hover:text-[#d49e2a] transition-colors flex items-center gap-1 text-xs"
                        title="Ver link original do produto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Link</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleCopySummary(item)}
                      className="p-2 rounded-xl bg-[#142318] hover:bg-[#1a2f20] text-[#43aa6a] hover:text-[#6ee7b7] transition-colors flex items-center gap-1 text-xs cursor-pointer"
                      title="Copiar sugestão para o WhatsApp"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{copiedId === item.id ? 'Copiado!' : 'Compartilhar'}</span>
                    </button>

                    {/* Botão de Apoiar */}
                    <button
                      onClick={() => handleSupportClick(item)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        isUserSupporting
                          ? 'bg-[#183824] hover:bg-[#204a30] text-[#6ee7b7] border border-[#34d399]/50'
                          : 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015]'
                      }`}
                    >
                      {isUserSupporting ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#34d399]" />
                          <span>Apoiado</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Apoiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Compromisso de Apoio (Especificação 4) */}
      {itemToCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-[#d49e2a]/70 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3 text-[#d49e2a]">
              <div className="w-10 h-10 rounded-xl bg-[#282110] border border-[#d49e2a]/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#d49e2a]" />
              </div>
              <div>
                <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
                  Compromisso de Apoio
                </h3>
                <span className="text-xs text-[#d49e2a] font-semibold">
                  A Ponte dos Trolls - Sugestões de Compra
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] text-xs space-y-2 leading-relaxed text-[#f1ede4]">
              <p>
                Olá, <strong>{currentUser.nome}</strong>!
              </p>
              <p className="text-[#d1d5db]">
                Ao apoiar esta sugestão (<strong>{itemToCommit.nome}</strong>), você declara real interesse e <strong>se compromete a participar do financiamento coletivo</strong> caso este item seja selecionado para um pacote oficial.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToCommit(null)}
                className="px-4 py-2 text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCommitment}
                className="px-5 py-2.5 font-bold text-xs sm:text-sm rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all cursor-pointer"
              >
                Estou Ciente e Quero Apoiar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
