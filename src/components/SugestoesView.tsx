import React, { useState, useMemo } from 'react';
import { ItemRPG, UserProfile, SISTEMAS_PADRAO } from '../types';
import { ArrowLeft, ShoppingBag, Plus, Search, ExternalLink, Users, Copy, Check, UserPlus, Edit2, Trash2 } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtra apenas itens com status 'Sugestão' (SEM NENHUMA ABA DE FINALIZADOS)
  const sugestoesItems = useMemo(() => {
    return items.filter((i) => i.status === 'Sugestão');
  }, [items]);

  const filteredItems = useMemo(() => {
    return sugestoesItems.filter((item) => {
      const matchSistema = selectedSistema === 'Todos' || item.sistema === selectedSistema;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nome.toLowerCase().includes(q) ||
        item.descricao.toLowerCase().includes(q) ||
        item.sugeridoPorNome.toLowerCase().includes(q) ||
        item.produto.toLowerCase().includes(q) ||
        item.apoiadores.some((ap) => ap.nome.toLowerCase().includes(q));

      return matchSistema && matchSearch;
    });
  }, [sugestoesItems, selectedSistema, searchTerm]);

  const handleCopySummary = (item: ItemRPG) => {
    const valorEmReais = item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;
    const apoiadoresNomes = item.apoiadores.map((a) => a.nome).join(', ') || 'Nenhum ainda';

    const text = `💡 *SUGESTÃO DE COMPRA RPG - A PONTE DOS TROLLS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *${item.nome}*\n` +
      `🎲 *Sistema:* ${item.sistema} | *Tipo:* ${item.produto}\n` +
      `💰 *Valor Estimado:* ${item.moeda === 'USD' ? `$${item.valorNumerico.toFixed(2)} (aprox. R$ ${valorEmReais.toFixed(2)})` : `R$ ${valorEmReais.toFixed(2)}`}\n` +
      `👤 *Sugerido por:* ${item.sugeridoPorNome}\n` +
      `🙋‍♂️ *Interessados (${item.apoiadores.length}):* ${apoiadoresNomes}\n` +
      (item.link ? `🔗 *Link:* ${item.link}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Acesse o link da Ponte dos Trolls para apoiar esta sugestão!_`;

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

        <button
          onClick={onOpenNewItem}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Sugerir Nova Compra</span>
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
          Proponha módulos, mapas, PDFs e apoie as ideias dos outros membros para mostrar interesse ao Mestre da Ponte!
        </p>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-[#0e1911] border border-[#1f3524] rounded-2xl p-3 sm:p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar sugestão por nome, autor ou tipo..."
              className="w-full pl-9 pr-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
            />
          </div>

          <div className="w-full sm:w-56">
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
      </div>

      {/* Lista de Sugestões em Linhas Amplas */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#1f3524] rounded-3xl bg-[#0c150e]/60">
          <div className="w-16 h-16 rounded-full bg-[#182c1d] border border-[#27442d] flex items-center justify-center mx-auto mb-3 text-2xl">
            🛍️
          </div>
          <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
            Nenhuma sugestão encontrada
          </h3>
          <p className="text-xs text-[#8a9d8c] mt-1">
            Clique no botão "+ Sugerir Nova Compra" para propor o primeiro material!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const apoiadores = item.apoiadores || [];
            const isUserSupporting = apoiadores.some(
              (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
            );
            const valorEmReais = item.moeda === 'USD' ? item.valorNumerico * exchangeRate : item.valorNumerico;

            return (
              <div
                key={item.id}
                className="bg-[#122015] hover:bg-[#16271a] border border-[#1f3524] hover:border-[#d49e2a]/50 rounded-2xl p-4 sm:p-5 shadow-lg transition-all space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  
                  {/* Info Principal */}
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1a3020] text-[#d49e2a] border border-[#d49e2a]/30">
                        {item.sistema}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#182c1d] text-[#8a9d8c]">
                        {item.produto}
                      </span>
                      <span className="text-[11px] text-[#7a8e7d]">
                        Sugerido por <strong className="text-[#f1ede4]">{item.sugeridoPorNome}</strong>
                      </span>
                    </div>

                    <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
                      {item.nome}
                    </h3>

                    {item.descricao && (
                      <p className="text-xs text-[#8a9d8c] leading-relaxed">
                        {item.descricao}
                      </p>
                    )}
                  </div>

                  {/* Valor & Apoiadores */}
                  <div className="text-right sm:text-right shrink-0">
                    <div className="font-mono text-base sm:text-lg font-bold text-[#d49e2a]">
                      {item.moeda === 'USD' ? `$ ${item.valorNumerico.toFixed(2)}` : `R$ ${item.valorNumerico.toFixed(2)}`}
                    </div>
                    {item.moeda === 'USD' && (
                      <div className="text-[10px] text-[#7a8e7d]">
                        aprox. R$ {valorEmReais.toFixed(2)}
                      </div>
                    )}
                    <div className="text-xs text-[#6ee7b7] font-semibold mt-1">
                      {apoiadores.length} interessados
                    </div>
                  </div>

                </div>

                {/* Lista de Apoiadores */}
                {apoiadores.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-[#7a8e7d] mr-1">Interessados:</span>
                    {apoiadores.map((ap) => {
                      const isMe = ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase();
                      return (
                        <span
                          key={ap.id}
                          className={`px-2 py-0.5 rounded text-[10px] border ${
                            isMe
                              ? 'bg-[#183824] text-[#6ee7b7] border-[#34d399]/50 font-bold'
                              : 'bg-[#0e1911] text-[#a4b5a6] border-[#1f3524]'
                          }`}
                        >
                          {ap.nome} {isMe && '(Você)'}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Barra de Ações */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1a2e1e]">
                  <div className="flex items-center gap-2">
                    {/* Copiar WhatsApp */}
                    <button
                      onClick={() => handleCopySummary(item)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-[#43aa6a] hover:text-[#6ee7b7] bg-[#0c150e] hover:bg-[#16271a] border border-[#203625] rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copiar sugestão para o WhatsApp"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{copiedId === item.id ? 'Copiado' : 'WhatsApp'}</span>
                    </button>

                    {/* Link Externo */}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#0c150e] hover:bg-[#16271a] border border-[#203625] rounded-xl transition-colors flex items-center gap-1"
                        title="Abrir página oficial do material"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Abrir Link</span>
                      </a>
                    )}

                    {/* Comandos de Mestre */}
                    {isMaster && (
                      <>
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1.5 sm:px-2 sm:py-1.5 text-xs text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#0c150e] hover:bg-[#16271a] border border-[#203625] rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          title="Editar sugestão"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item)}
                          className="p-1.5 sm:px-2 sm:py-1.5 text-xs text-[#a4b5a6] hover:text-red-400 bg-[#0c150e] hover:bg-red-950/20 border border-[#203625] rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          title="Excluir sugestão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Botão de Apoiar Sugestão */}
                  <button
                    onClick={() => onToggleSupportItem(item.id)}
                    className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      isUserSupporting
                        ? 'bg-[#183824] hover:bg-[#20492f] text-[#6ee7b7] border border-[#34d399]/40'
                        : 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-md shadow-black/30'
                    }`}
                  >
                    {isUserSupporting ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#34d399]" />
                        <span>Apoiando (Sair)</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Apoiar Sugestão</span>
                      </>
                    )}
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
