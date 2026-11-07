import React, { useState, useMemo } from 'react';
import { FundingPackage, UserProfile, SISTEMAS_PADRAO } from '../types';
import { ArrowLeft, BookOpen, Search, ExternalLink, FolderCheck, Users, Copy, Check, Trash2, Edit2 } from 'lucide-react';

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

  const catalogPackages = useMemo(() => {
    return packages.filter((p) => p.status === 'Catálogo');
  }, [packages]);

  const filteredPackages = useMemo(() => {
    return catalogPackages.filter((pkg) => {
      const matchSistema = selectedSistema === 'Todos' || pkg.sistema === selectedSistema;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        pkg.titulo.toLowerCase().includes(q) ||
        pkg.descricao.toLowerCase().includes(q) ||
        pkg.itensInclusos.some((item) => item.toLowerCase().includes(q)) ||
        pkg.apoiadores.some((ap) => ap.nome.toLowerCase().includes(q));

      return matchSistema && matchSearch;
    });
  }, [catalogPackages, selectedSistema, searchTerm]);

  const handleCopyWppSummary = (pkg: FundingPackage) => {
    const cotistas = pkg.apoiadores.map((a) => a.nome).join(', ');
    const text = `📚 *CATÁLOGO DE RPG - A PONTE DOS TROLLS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *${pkg.titulo}*\n` +
      `🎲 *Sistema:* ${pkg.sistema}\n` +
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

        <span className="text-xs font-mono text-[#52c27c] bg-[#173320] border border-[#275232] px-3 py-1 rounded-full font-bold">
          {catalogPackages.length} pacotes no Drive
        </span>
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
          Materiais, módulos de Foundry VTT, livros e mapas que o grupo já comprou e organizou na pasta compartilhada do Google Drive.
        </p>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="bg-[#0e1911] border border-[#1f3524] rounded-2xl p-3 sm:p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do pacote, módulo ou cotista..."
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
            Tente buscar com outros termos ou altere o sistema de RPG selecionado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredPackages.map((pkg) => {
            const apoiadores = pkg.apoiadores || [];
            const count = apoiadores.length;

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
                        {pkg.sistema}
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

                {/* Itens Inclusos */}
                {pkg.itensInclusos && pkg.itensInclusos.length > 0 && (
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
                )}

                {/* Descrição */}
                {pkg.descricao && (
                  <p className="text-xs text-[#8a9d8c] leading-relaxed">
                    {pkg.descricao}
                  </p>
                )}

                {/* Caixa de Cotistas & Créditos */}
                <div className="p-4 rounded-2xl bg-[#101e14] border border-[#1d3823] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#a4b5a6] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#34d399]" />
                      <span>Financiado por {count} membros da mesa:</span>
                    </span>
                    <span className="font-mono text-xs text-[#d49e2a]">
                      Total: R$ {pkg.valorTotalBRL.toFixed(2)}
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
                    {pkg.linkLoja && (
                      <a
                        href={pkg.linkLoja}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#8a9d8c] hover:text-[#d49e2a] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Loja Oficial</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Botão Copiar WhatsApp */}
                    <button
                      onClick={() => handleCopyWppSummary(pkg)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#152719] hover:bg-[#1d3523] text-[#43aa6a] hover:text-[#6ee7b7] border border-[#26482e] transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Copiar resumo formatado para o WhatsApp"
                    >
                      {copiedId === pkg.id ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === pkg.id ? 'Copiado!' : 'Copiar Resumo'}</span>
                    </button>

                    {/* Botão Abrir no Google Drive */}
                    {pkg.linkDrive ? (
                      <a
                        href={pkg.linkDrive}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#236336] hover:bg-[#2c7842] text-white font-bold text-xs sm:text-sm shadow-lg shadow-black/40 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                      >
                        <FolderCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Abrir no Google Drive</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl bg-[#17271b] text-[#556957] font-semibold text-xs border border-[#203625] cursor-not-allowed"
                      >
                        Link do Drive em processamento
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
