import React, { useState, useMemo } from 'react';
import { FundingPackage, UserProfile, SISTEMAS_PADRAO } from '../types';
import { ArrowLeft, BookOpen, Search, ExternalLink, FolderCheck, Users, Copy, Check, Trash2, Edit2, ShoppingCart, Info, MessageSquare, Phone, X } from 'lucide-react';
import { generateCatalogBuyMessage } from '../utils/helpers';

interface CatalogoViewProps {
  packages: FundingPackage[];
  currentUser: UserProfile;
  onGoHome: () => void;
  onEditPackage: (pkg: FundingPackage) => void;
  onDeletePackage: (pkg: FundingPackage) => void;
  onToast: (msg: string) => void;
}

export const CatalogoView: React.FC<CatalogoViewProps> = ({
  packages,
  currentUser,
  onGoHome,
  onEditPackage,
  onDeletePackage,
  onToast,
}) => {
  const isMaster = Boolean(currentUser.isMaster);
  const [selectedSistema, setSelectedSistema] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Motivational rules modal state (shown when opening Catálogo)
  const [showRulesNotice, setShowRulesNotice] = useState<boolean>(true);

  // Buy Request Modal state
  const [packageToBuy, setPackageToBuy] = useState<FundingPackage | null>(null);
  const [copiedBuyMsg, setCopiedBuyMsg] = useState<boolean>(false);

  const catalogPackages = useMemo(() => {
    return packages.filter((p) => p.status === 'Catálogo');
  }, [packages]);

  // Intelligent filter: matches pkg.sistema OR any sub-item's system
  const filteredPackages = useMemo(() => {
    return catalogPackages.filter((pkg) => {
      const matchSistema =
        selectedSistema === 'Todos' ||
        pkg.sistema === selectedSistema ||
        (pkg.itens && pkg.itens.some((it) => it.sistema === selectedSistema));

      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        pkg.titulo.toLowerCase().includes(q) ||
        Boolean(pkg.descricao && pkg.descricao.toLowerCase().includes(q)) ||
        Boolean(pkg.itens && pkg.itens.some((it) => it.nome.toLowerCase().includes(q) || it.sistema.toLowerCase().includes(q))) ||
        Boolean(pkg.itensInclusos && pkg.itensInclusos.some((item) => item.toLowerCase().includes(q))) ||
        (pkg.apoiadores || []).some((ap) => ap.nome.toLowerCase().includes(q));

      return matchSistema && matchSearch;
    });
  }, [catalogPackages, selectedSistema, searchTerm]);

  const handleCopyWppSummary = (pkg: FundingPackage) => {
    const cotistas = (pkg.apoiadores || []).map((a) => a.nome).join(', ');
    const text = `📚 *CATÁLOGO DE RPG - A PONTE DOS TROLLS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *${pkg.titulo}*\n` +
      `🎲 *Sistema:* ${pkg.sistema || 'Foundry VTT Geral'}\n` +
      `💰 *Total Financiado:* R$ ${pkg.valorTotalBRL.toFixed(2)}\n` +
      `👥 *Cotistas:* ${cotistas}\n` +
      (pkg.linkDrive ? `📁 *Link do Drive:* ${pkg.linkDrive}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Item oficial disponível no acervo do grupo!_`;

    navigator.clipboard.writeText(text);
    setCopiedId(pkg.id);
    setTimeout(() => setCopiedId(null), 2000);
    onToast('Resumo formatado copiado! Envie no grupo do WhatsApp.');
  };

  const buyMessageText = useMemo(() => {
    if (!packageToBuy) return '';
    return generateCatalogBuyMessage(packageToBuy, currentUser);
  }, [packageToBuy, currentUser]);

  const handleCopyBuyMessage = () => {
    if (!buyMessageText) return;
    navigator.clipboard.writeText(buyMessageText);
    setCopiedBuyMsg(true);
    setTimeout(() => setCopiedBuyMsg(false), 2200);
    onToast('Mensagem de compra copiada para a área de transferência!');
  };

  const handleSendWhatsApp = () => {
    if (!buyMessageText) return;
    const url = `https://wa.me/5519981512030?text=${encodeURIComponent(buyMessageText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Top Bar com Voltar */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1f3524]">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#142318] hover:bg-[#1a2f20] text-[#d49e2a] hover:text-[#f4ecd8] border border-[#27442d] text-xs font-semibold transition-all hover:-translate-x-0.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Menu Inicial</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRulesNotice(true)}
            className="text-xs text-[#a4b5a6] hover:text-[#f4ecd8] flex items-center gap-1 bg-[#122015] px-2.5 py-1 rounded-lg border border-[#203625] cursor-pointer"
            title="Ver regras de aquisição do Catálogo"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Regras do Catálogo</span>
          </button>
          <span className="text-xs font-mono text-[#52c27c] bg-[#173320] border border-[#275232] px-3 py-1 rounded-full font-bold">
            {catalogPackages.length} pacotes no Acervo
          </span>
        </div>
      </div>

      {/* Título da Seção */}
      <div className="mb-6 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52c27c] uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Acervo Concluído & Disponível</span>
        </div>
        <h1 className="font-rpg text-2xl sm:text-3xl font-bold text-[#f4ecd8]">
          Catálogo de Produtos
        </h1>
        <p className="text-xs sm:text-sm text-[#8a9d8c]">
          Materiais, módulos de Foundry VTT, livros e mapas que o grupo já financiou e organizou. Você pode adquirir pacotes completos já finalizados diretamente com o Mestre!
        </p>
      </div>

      {/* Barra de Filtros Inteligentes & Busca */}
      <div className="bg-[#0e1911] border border-[#1f3524] rounded-2xl p-3 sm:p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pacote, nome de qualquer item/módulo ou cotista..."
              className="w-full pl-9 pr-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={selectedSistema}
              onChange={(e) => setSelectedSistema(e.target.value)}
              className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
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

      {/* Lista de Itens do Catálogo */}
      {filteredPackages.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#1f3524] rounded-3xl bg-[#0c150e]/60">
          <div className="w-16 h-16 rounded-full bg-[#182c1d] border border-[#27442d] flex items-center justify-center mx-auto mb-3 text-2xl">
            📚
          </div>
          <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
            Nenhum pacote encontrado com esses filtros
          </h3>
          <p className="text-xs text-[#8a9d8c] mt-1">
            Tente buscar com outros termos ou selecione "Todos os Sistemas" acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredPackages.map((pkg) => {
            const apoiadores = pkg.apoiadores || [];
            const count = apoiadores.length;
            const valorCatalogo = pkg.valorCatalogoBRL || pkg.valorTotalBRL;

            return (
              <div
                key={pkg.id}
                className="bg-gradient-to-b from-[#132216] to-[#0c170f] border-2 border-[#1f3524] hover:border-[#43aa6a]/50 rounded-3xl p-5 sm:p-7 shadow-xl transition-all space-y-5"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#173520] text-[#6ee7b7] border border-[#34d399]/40 flex items-center gap-1">
                        <FolderCheck className="w-3 h-3 text-[#34d399]" />
                        <span>No Drive do Grupo</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1a2f20] text-[#d49e2a] border border-[#d49e2a]/30">
                        {pkg.sistema || 'Foundry VTT Geral'}
                      </span>
                      {pkg.finalizadoEm && (
                        <span className="text-[11px] text-[#7a8e7d]">
                          Finalizado em {pkg.finalizadoEm}
                        </span>
                      )}
                    </div>
                    <h2 className="font-rpg text-xl sm:text-2xl font-bold text-[#f4ecd8] leading-tight">
                      {pkg.titulo}
                    </h2>
                  </div>

                  {/* Preço no Catálogo */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#a4b5a6] block">
                      Valor de Aquisição no Catálogo:
                    </span>
                    <span className="font-rpg text-xl sm:text-2xl font-bold text-[#fbbf24]">
                      R$ {valorCatalogo.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {/* Ações Mestre */}
                  {isMaster && (
                    <div className="flex items-center gap-1.5 bg-[#0e1911] p-1.5 rounded-xl border border-[#203625]">
                      <button
                        onClick={() => onEditPackage(pkg)}
                        className="p-1.5 text-[#a4b5a6] hover:text-[#f4ecd8] hover:bg-[#1a2f20] rounded-lg transition-colors cursor-pointer"
                        title="Editar pacote do catálogo"
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

                {/* Itens Inclusos Detalhados */}
                {pkg.itens && pkg.itens.length > 0 ? (
                  <div className="p-3.5 rounded-2xl bg-[#0c150e]/80 border border-[#1f3524] space-y-2">
                    <span className="text-[11px] font-bold text-[#52c27c] uppercase tracking-wider block">
                      Itens inclusos no pacote ({pkg.itens.length}):
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#d1d5db]">
                      {pkg.itens.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="text-[#34d399] font-bold mt-0.5">✔</span>
                          <div>
                            <span className="font-medium">{item.nome}</span>
                            <span className="text-[10px] text-[#a4b5a6] ml-1.5">({item.sistema})</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  pkg.itensInclusos && pkg.itensInclusos.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#0c150e]/80 border border-[#1f3524] space-y-2">
                      <span className="text-[11px] font-bold text-[#52c27c] uppercase tracking-wider block">
                        Conteúdos Disponibilizados:
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#d1d5db]">
                        {pkg.itensInclusos.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#34d399] font-bold mt-0.5">✔</span>
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

                {/* Caixa de Cotistas & Créditos */}
                <div className="p-3.5 rounded-2xl bg-[#101e14] border border-[#1d3823] space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#a4b5a6] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#34d399]" />
                      <span>Financiado originariamente por {count} membros:</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {apoiadores.map((ap) => (
                      <span
                        key={ap.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-[#172e1c] text-[#a7f3d0] border border-[#2b5936]"
                      >
                        {ap.nome}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1f3524]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyWppSummary(pkg)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#152719] hover:bg-[#1d3523] text-[#43aa6a] hover:text-[#6ee7b7] border border-[#26482e] transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Copiar resumo formatado para o WhatsApp"
                    >
                      {copiedId === pkg.id ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === pkg.id ? 'Copiado!' : 'Copiar Resumo'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Botão Abrir no Google Drive (visível se tiver link) */}
                    {pkg.linkDrive && (
                      <a
                        href={pkg.linkDrive}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#16271a] hover:bg-[#1f3724] border border-[#2e5035] text-[#a4b5a6] hover:text-[#f4ecd8] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        title="Abrir pasta de materiais no Google Drive"
                      >
                        <FolderCheck className="w-3.5 h-3.5 text-[#34d399]" />
                        <span>Google Drive</span>
                      </a>
                    )}

                    {/* Botão de Compra Direta para o WhatsApp */}
                    <button
                      type="button"
                      onClick={() => setPackageToBuy(pkg)}
                      className="px-4 py-2.5 rounded-xl bg-[#236336] hover:bg-[#2c7842] text-white font-bold text-xs sm:text-sm shadow-lg shadow-black/40 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                    >
                      <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                      <span>Comprar este Financiamento</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Banner de Aviso Importante de Regras do Catálogo (Especificação 5) */}
      {showRulesNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-[#d49e2a]/70 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#282110] border border-[#d49e2a]/40 flex items-center justify-center text-[#d49e2a] shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
                  📢 Regras de Aquisição do Catálogo
                </h3>
                <p className="text-[11px] text-[#8a9d8c]">
                  Leia atentamente as diretrizes antes de solicitar acesso aos materiais
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] text-xs space-y-3 text-[#d1d5db] leading-relaxed">
              <div className="space-y-1">
                <strong className="text-[#d49e2a] block text-xs">
                  1. Pacotes Indivisíveis:
                </strong>
                <p>
                  Os itens dentro dos pacotes foram financiados em conjunto e <strong>são vendidos sem separação</strong> (não é possível adquirir apenas um item avulso de dentro de um pacote).
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-[#1a2d1f]">
                <strong className="text-amber-400 block text-xs">
                  2. Fique atento aos Financiamentos em Andamento!
                </strong>
                <p>
                  O valor de aquisição tardia no Catálogo <strong>sofre acréscimo em comparação ao valor original da época do financiamento</strong>. Participar durante o <em>Financiamento em Andamento</em> é sempre a forma mais barata de garantir os materiais!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRulesNotice(false)}
                className="px-5 py-2.5 font-bold text-xs sm:text-sm rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all cursor-pointer"
              >
                Entendi, ver Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Compra Direta para o WhatsApp (Especificação 5) */}
      {packageToBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-[#34d399]/70 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#173320] to-[#122015] border-b border-[#25462d] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1f4228] border border-[#34d399]/40 flex items-center justify-center text-[#34d399]">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
                    Comprar Pacote do Catálogo
                  </h3>
                  <p className="text-[11px] text-[#8a9d8c]">
                    Mensagem pronta para enviar ao Mestre no WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPackageToBuy(null)}
                className="p-1.5 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] hover:bg-[#1a2f20] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#a4b5a6] mb-1.5">
                  Mensagem gerada automaticamente para o pedido:
                </label>
                <textarea
                  readOnly
                  rows={6}
                  value={buyMessageText}
                  className="w-full p-3 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono leading-relaxed focus:outline-none"
                />
              </div>

              {/* Informações do WhatsApp do Mestre */}
              <div className="p-3.5 rounded-2xl bg-[#142618] border border-[#274c30] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#a4b5a6]">
                  <Phone className="w-4 h-4 text-[#34d399]" />
                  <span>WhatsApp do Mestre:</span>
                </div>
                <strong className="text-[#6ee7b7] font-mono font-bold text-sm">
                  (19) 98151-2030
                </strong>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>📲 Enviar Mensagem para o WhatsApp (19 98151-2030)</span>
                </button>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setPackageToBuy(null)}
                    className="px-3 py-1.5 text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyBuyMessage}
                    className="px-4 py-2 rounded-xl bg-[#1a2f20] hover:bg-[#25422d] border border-[#2f5539] text-[#d49e2a] hover:text-[#f4ecd8] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedBuyMsg ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBuyMsg ? 'Mensagem Copiada!' : '📋 Copiar Mensagem'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
