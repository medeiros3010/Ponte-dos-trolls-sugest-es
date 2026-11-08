import React, { useState, useMemo, useEffect } from 'react';
import { FundingPackage, UserProfile, SISTEMAS_PADRAO, OFFICIAL_PRODUCT_TYPES, ProductType, ADMIN_PASSWORD } from '../types';
import { ArrowLeft, BookOpen, Search, ExternalLink, FolderCheck, Users, Copy, Check, Trash2, Edit2, ShoppingCart, Info, MessageSquare, Phone, X, Filter, RotateCcw, Image as ImageIcon, Link as LinkIcon, KeyRound, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { generateCatalogBuyMessage, extractPaidMemberEmails, formatDateDisplay } from '../utils/helpers';
import { EditPackageImageModal } from './EditPackageImageModal';

interface CatalogoViewProps {
  packages: FundingPackage[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  filterMyAcervo?: boolean;
  onToggleMyAcervo?: (active: boolean) => void;
  onGoHome: () => void;
  onEditPackage: (pkg: FundingPackage) => void;
  onDeletePackage: (pkg: FundingPackage) => void;
  onUpdateDriveLink?: (packageId: string, linkDrive: string) => Promise<void>;
  onUpdatePackageImage?: (packageId: string, newImageUrl: string, adminPassword?: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export const CatalogoView: React.FC<CatalogoViewProps> = ({
  packages,
  allUsers,
  currentUser,
  filterMyAcervo = false,
  onToggleMyAcervo,
  onGoHome,
  onEditPackage,
  onDeletePackage,
  onUpdateDriveLink,
  onUpdatePackageImage,
  onToast,
}) => {
  const isMaster = Boolean(currentUser.isMaster);

  // Filter States
  const [myAcervoActive, setMyAcervoActive] = useState<boolean>(filterMyAcervo);

  useEffect(() => {
    setMyAcervoActive(Boolean(filterMyAcervo));
  }, [filterMyAcervo]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSistema, setSelectedSistema] = useState<string>('Todos');
  const [selectedTipo, setSelectedTipo] = useState<string>('Todos');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recentes');

  // Modal States
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<FundingPackage | null>(null);
  const [packageToBuy, setPackageToBuy] = useState<FundingPackage | null>(null);
  const [copiedBuyMsg, setCopiedBuyMsg] = useState<boolean>(false);
  const [showRulesNotice, setShowRulesNotice] = useState<boolean>(false);

  // Drive Link Quick Edit Modal (Requirement 5)
  const [driveEditPkg, setDriveEditPkg] = useState<FundingPackage | null>(null);
  const [editDriveUrl, setEditDriveUrl] = useState('');
  const [driveAdminPassword, setDriveAdminPassword] = useState('');
  const [driveEditError, setDriveEditError] = useState('');
  const [isSavingDrive, setIsSavingDrive] = useState(false);

  // Edit Cover Image Modal (Requirement 3)
  const [imageEditPkg, setImageEditPkg] = useState<FundingPackage | null>(null);

  // Base list of packages in Catálogo
  const catalogPackages = useMemo(() => {
    return packages.filter((p) => p.status === 'Catálogo');
  }, [packages]);

  // Combined Filters and Sorting (Requirements 1, 3, 4)
  const filteredAndSortedPackages = useMemo(() => {
    const list = catalogPackages.filter((pkg) => {
      // 0. Filtro Meu Acervo (Requirement 1)
      if (myAcervoActive) {
        const isUserParticipant = (pkg.apoiadores || []).some(
          (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
        );
        if (!isUserParticipant) return false;
      }

      // 1. Text Search (title, description, internal sub-items, and supporters)
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        pkg.titulo.toLowerCase().includes(q) ||
        Boolean(pkg.descricao && pkg.descricao.toLowerCase().includes(q)) ||
        Boolean(
          pkg.itens &&
            pkg.itens.some(
              (it) =>
                it.nome.toLowerCase().includes(q) ||
                it.sistema.toLowerCase().includes(q) ||
                (it.tipo && it.tipo.toLowerCase().includes(q))
            )
        ) ||
        Boolean(pkg.itensInclusos && pkg.itensInclusos.some((item) => item.toLowerCase().includes(q))) ||
        (pkg.apoiadores || []).some((ap) => ap.nome.toLowerCase().includes(q));

      // 2. Sistema Filter (matches package or ANY internal sub-item)
      const matchSistema =
        selectedSistema === 'Todos' ||
        pkg.sistema === selectedSistema ||
        (pkg.itens && pkg.itens.some((it) => it.sistema === selectedSistema));

      // 3. Tipo Filter (matches package or ANY internal sub-item)
      const matchTipo =
        selectedTipo === 'Todos' ||
        pkg.tipo === selectedTipo ||
        (pkg.itens && pkg.itens.some((it) => it.tipo === selectedTipo));

      // 4. Preço em Reais (uses valorCatalogoBRL; fallback to valorTotalBRL, 0 is valid)
      const catalogPrice =
        typeof pkg.valorCatalogoBRL === 'number'
          ? pkg.valorCatalogoBRL
          : pkg.valorTotalBRL;

      const min = minPrice.trim() !== '' ? parseFloat(minPrice.replace(',', '.')) : null;
      const max = maxPrice.trim() !== '' ? parseFloat(maxPrice.replace(',', '.')) : null;

      const matchMinPrice = min === null || isNaN(min) || catalogPrice >= min;
      const matchMaxPrice = max === null || isNaN(max) || catalogPrice <= max;

      return matchSearch && matchSistema && matchTipo && matchMinPrice && matchMaxPrice;
    });

    // Sorting
    list.sort((a, b) => {
      const priceA = typeof a.valorCatalogoBRL === 'number' ? a.valorCatalogoBRL : a.valorTotalBRL;
      const priceB = typeof b.valorCatalogoBRL === 'number' ? b.valorCatalogoBRL : b.valorTotalBRL;

      switch (sortBy) {
        case 'menor-preco':
          return priceA - priceB;
        case 'maior-preco':
          return priceB - priceA;
        case 'nome-az':
          return a.titulo.localeCompare(b.titulo, 'pt-BR');
        case 'recentes':
        default:
          return (b.finalizadoEm || b.criadoEm || '').localeCompare(a.finalizadoEm || a.criadoEm || '');
      }
    });

    return list;
  }, [catalogPackages, myAcervoActive, currentUser.id, currentUser.nome, searchTerm, selectedSistema, selectedTipo, minPrice, maxPrice, sortBy]);

  // Clear all filters
  const handleClearFilters = () => {
    setMyAcervoActive(false);
    if (onToggleMyAcervo) onToggleMyAcervo(false);
    setSearchTerm('');
    setSelectedSistema('Todos');
    setSelectedTipo('Todos');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('recentes');
  };

  // Requirement 8: Copy emails of participants who informed payment
  const handleCopyPaidEmails = (pkg: FundingPackage) => {
    const result = extractPaidMemberEmails(pkg, allUsers);

    if (result.validEmails.length === 0) {
      if (result.totalWithPaymentInformed === 0) {
        onToast('Nenhum participante informou pagamento neste pacote ainda.');
      } else {
        onToast(
          `Atenção: Os ${result.totalWithPaymentInformed} participantes que informaram pagamento estão com e-mails incompletos no cadastro.`
        );
      }
      return;
    }

    navigator.clipboard.writeText(result.clipboardText);

    if (result.missingOrInvalidMembers.length > 0) {
      onToast(
        `Copiados ${result.validEmails.length} e-mails! Atenção: ${result.missingOrInvalidMembers.join(
          ', '
        )} precisa(m) corrigir o e-mail no cadastro.`
      );
    } else {
      onToast(`Copiados ${result.validEmails.length} e-mails para o Google Drive!`);
    }
  };

  // WhatsApp Buy message
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

  // Drive Link quick edit handler
  const handleOpenDriveEdit = (pkg: FundingPackage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDriveEditPkg(pkg);
    setEditDriveUrl(pkg.linkDrive || '');
    setDriveAdminPassword('');
    setDriveEditError('');
  };

  const handleSaveDriveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (driveAdminPassword !== ADMIN_PASSWORD) {
      setDriveEditError('Senha do Mestre incorreta! Acesso negado.');
      return;
    }

    if (!driveEditPkg) return;

    try {
      setIsSavingDrive(true);
      if (onUpdateDriveLink) {
        await onUpdateDriveLink(driveEditPkg.id, editDriveUrl.trim());
      }
      // Update local state in details modal if open
      if (selectedPackageDetails && selectedPackageDetails.id === driveEditPkg.id) {
        setSelectedPackageDetails({ ...selectedPackageDetails, linkDrive: editDriveUrl.trim() });
      }
      onToast('Link do Google Drive atualizado com sucesso!');
      setDriveEditPkg(null);
    } catch (err: any) {
      setDriveEditError(err.message || 'Erro ao salvar link do Drive');
    } finally {
      setIsSavingDrive(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col animate-in fade-in duration-200">
      
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
            className="text-xs text-[#a4b5a6] hover:text-[#f4ecd8] flex items-center gap-1.5 bg-[#122015] hover:bg-[#182c1d] px-3 py-1.5 rounded-xl border border-[#203625] transition-colors cursor-pointer"
            title="Ver regras de aquisição do Catálogo"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Regras de Aquisição</span>
          </button>
          <span className="text-xs font-mono text-[#52c27c] bg-[#173320] border border-[#275232] px-3.5 py-1.5 rounded-xl font-bold">
            {catalogPackages.length} pacotes no Acervo
          </span>
        </div>
      </div>

      {/* Header do Catálogo */}
      <div className="mb-6 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52c27c] uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Acervo Concluído & Disponível no Google Drive</span>
        </div>
        <h1 className="font-rpg text-2xl sm:text-3xl font-bold text-[#f4ecd8]">
          Catálogo de Produtos
        </h1>
        <p className="text-xs sm:text-sm text-[#8a9d8c]">
          Materiais, módulos de Foundry VTT, livros e mapas já organizados e disponibilizados. Adquira pacotes completos com acesso imediato à pasta do Drive!
        </p>
      </div>

      {/* Painel Completo de Filtros e Ordenação (Requirement 3) */}
      <div className="bg-[#0e1911] border border-[#1f3524] rounded-2xl p-4 mb-8 space-y-3.5 shadow-lg">
        {/* Linha 1: Busca Geral */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por pacote, nome de módulos, livros, mapas ou cotistas..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
          />
        </div>

        {/* Linha 2: Sistema, Tipo, Faixa de Preço & Ordenação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Filtro Sistema */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#7a8e7d] mb-1">
              🎲 Sistema:
            </label>
            <select
              value={selectedSistema}
              onChange={(e) => setSelectedSistema(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
            >
              <option value="Todos">Todos os Sistemas</option>
              {SISTEMAS_PADRAO.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo (Requirement 4: 4 tipos oficiais + Todos) */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#7a8e7d] mb-1">
              🏷️ Tipo de Produto:
            </label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
            >
              <option value="Todos">Todos os Tipos</option>
              {OFFICIAL_PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Preço Mínimo */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#7a8e7d] mb-1">
              💰 Preço Mínimo (R$):
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Ex: 5"
              className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#43aa6a]"
            />
          </div>

          {/* Preço Máximo */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#7a8e7d] mb-1">
              💰 Preço Máximo (R$):
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Ex: 30"
              className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#43aa6a]"
            />
          </div>

          {/* Ordenação */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#7a8e7d] mb-1">
              ⇅ Ordenar por:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#43aa6a]"
            >
              <option value="recentes">Mais recentes</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
              <option value="nome-az">Nome (A – Z)</option>
            </select>
          </div>

        </div>

        {/* Linha 3: Resumo dos Resultados e Botão Limpar Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1a2e20] text-xs">
          <div className="text-[#8e9f90]">
            Exibindo <strong className="text-[#f4ecd8] font-mono">{filteredAndSortedPackages.length}</strong> de{' '}
            <span className="font-mono">{catalogPackages.length}</span> pacotes no catálogo
          </div>

          {(searchTerm || selectedSistema !== 'Todos' || selectedTipo !== 'Todos' || minPrice || maxPrice || sortBy !== 'recentes') && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#142618] hover:bg-[#1a3321] text-[#a4b5a6] hover:text-[#f4ecd8] border border-[#234229] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Filtro Ativo: Meu Acervo (Requirement 1) */}
      {myAcervoActive && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#142d1c] to-[#0f2115] border-2 border-emerald-500/60 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-rpg text-sm sm:text-base font-bold text-[#f4ecd8] block">
                Filtro Ativo: Meu Acervo ({filteredAndSortedPackages.length} pacote{filteredAndSortedPackages.length === 1 ? '' : 's'})
              </span>
              <p className="text-[11px] text-[#c7d5c9]">
                Exibindo apenas materiais que você já financiou ou adquiriu. O acesso aos arquivos é feito pelo Google Drive.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMyAcervoActive(false);
              if (onToggleMyAcervo) onToggleMyAcervo(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-[#f4ecd8] border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Remover filtro e ver todo o catálogo</span>
          </button>
        </div>
      )}

      {/* Grade de Vitrine Responsiva (Requirement 1 - Print 1) */}
      {filteredAndSortedPackages.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-[#1f3524] rounded-3xl bg-[#0c150e]/60">
          <div className="w-16 h-16 rounded-full bg-[#182c1d] border border-[#27442d] flex items-center justify-center mx-auto mb-3 text-2xl">
            {myAcervoActive ? '📂' : '🔍'}
          </div>
          <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
            {myAcervoActive
              ? 'Nenhum material no seu acervo pessoal ainda'
              : 'Nenhum pacote encontrado com esses filtros'}
          </h3>
          <p className="text-xs text-[#8a9d8c] mt-1 max-w-md mx-auto">
            {myAcervoActive
              ? 'Participe dos financiamentos em andamento ou explore os itens da vitrine abaixo para adquirir novos pacotes!'
              : 'Tente ajustar os filtros de sistema, tipo ou faixa de preço para visualizar outros materiais do catálogo.'}
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-[#1a2f20] hover:bg-[#25422d] border border-[#2f5539] text-[#d49e2a] text-xs font-bold transition-all cursor-pointer"
          >
            Ver Todo o Catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {filteredAndSortedPackages.map((pkg) => {
            const valorCatalogo =
              typeof pkg.valorCatalogoBRL === 'number'
                ? pkg.valorCatalogoBRL
                : pkg.valorTotalBRL;

            const subItemsCount = pkg.itens?.length || pkg.itensInclusos?.length || 1;

            return (
              <div
                key={pkg.id}
                className="group flex flex-col bg-gradient-to-b from-[#132216] to-[#0c170f] border-2 border-[#1f3524] hover:border-[#43aa6a]/70 rounded-3xl p-4 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#43aa6a]/10"
              >
                {/* 1. Imagem de Capa em Destaque (Sem deformação, proporção consistente) */}
                <div
                  onClick={() => setSelectedPackageDetails(pkg)}
                  className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#09110a] border border-[#1b3120] flex items-center justify-center cursor-pointer group-hover:border-[#388554] transition-colors group/capa"
                >
                  {pkg.imageUrl ? (
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.titulo}
                      className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#142618] border border-[#27442d] flex items-center justify-center text-xl mb-2">
                        🎲
                      </div>
                      <span className="font-rpg text-xs font-bold text-[#8a9d8c]">A Ponte dos Trolls</span>
                    </div>
                  )}

                  {/* Ação de Editar Capa para o Mestre sobre a Capa (Requirement 3) */}
                  {isMaster && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageEditPkg(pkg);
                      }}
                      className="absolute inset-0 bg-black/75 opacity-0 group-hover/capa:opacity-100 flex flex-col items-center justify-center gap-1 text-[11px] text-[#f4ecd8] font-bold transition-opacity cursor-pointer p-1 text-center"
                      title="Editar imagem da capa"
                    >
                      <ImageIcon className="w-5 h-5 text-[#d49e2a]" />
                      <span>Editar Capa</span>
                    </button>
                  )}

                  {/* Badges Flutuantes sobre a Imagem */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[85%] pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-black/80 backdrop-blur-md text-[#d49e2a] border border-[#d49e2a]/40 shadow-sm">
                      {pkg.sistema || 'Foundry VTT'}
                    </span>
                    {pkg.tipo && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#142618]/90 backdrop-blur-md text-[#86efac] border border-[#22c55e]/30 shadow-sm">
                        {pkg.tipo}
                      </span>
                    )}
                  </div>

                  {/* Drive Badge se houver link */}
                  {pkg.linkDrive && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-1 rounded-lg bg-emerald-950/80 backdrop-blur-sm border border-emerald-500/40 text-emerald-400" title="Disponível no Google Drive">
                      <FolderCheck className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* 2. Informações: Título & Itens */}
                <div className="mt-3.5 space-y-1.5 flex-1 flex flex-col">
                  <h3
                    onClick={() => setSelectedPackageDetails(pkg)}
                    className="font-rpg text-sm sm:text-base font-bold text-[#f4ecd8] group-hover:text-[#52c27c] transition-colors line-clamp-2 leading-snug cursor-pointer min-h-[2.5rem]"
                    title={pkg.titulo}
                  >
                    {pkg.titulo}
                  </h3>

                  <p className="text-[11px] text-[#7a8e7d]">
                    📦 {subItemsCount} {subItemsCount === 1 ? 'item incluso' : 'itens inclusos'}
                  </p>

                  {/* 3. Preço de Aquisição no Catálogo */}
                  <div className="pt-2 mt-auto">
                    <span className="text-[10px] uppercase font-bold text-[#8a9d8c] block">
                      Valor de Aquisição:
                    </span>
                    <span className="font-rpg text-xl font-bold text-[#fbbf24] tracking-wide">
                      R$ {valorCatalogo.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* 4. Botões de Ação Alinhados */}
                <div className="mt-4 pt-3 border-t border-[#1a2e20] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {/* Botão Ver Detalhes */}
                    <button
                      type="button"
                      onClick={() => setSelectedPackageDetails(pkg)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-[#142618] hover:bg-[#1a3321] text-[#a4b5a6] hover:text-[#f4ecd8] border border-[#244229] text-xs font-semibold transition-colors cursor-pointer text-center"
                    >
                      Ver detalhes
                    </button>

                    {/* Botão Compra WhatsApp */}
                    <button
                      type="button"
                      onClick={() => setPackageToBuy(pkg)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-[#236336] hover:bg-[#2c7842] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                      title="Comprar via WhatsApp"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Comprar</span>
                    </button>
                  </div>

                  {/* Ações de Mestre: Editar, Excluir, Capa e Link Drive */}
                  {isMaster && (
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#16271a] text-[11px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleOpenDriveEdit(pkg, e)}
                          className="text-[#6ee7b7] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Editar link do Drive"
                        >
                          <FolderCheck className="w-3 h-3 text-[#34d399]" />
                          <span>Drive</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageEditPkg(pkg);
                          }}
                          className="text-[#d49e2a] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Editar capa do pacote"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Capa</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onEditPackage(pkg)}
                          className="p-1 text-[#a4b5a6] hover:text-[#f4ecd8] hover:bg-[#1a2f20] rounded-lg cursor-pointer"
                          title="Editar pacote"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeletePackage(pkg)}
                          className="p-1 text-[#a4b5a6] hover:text-red-400 hover:bg-red-950/40 rounded-lg cursor-pointer"
                          title="Excluir pacote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ==================== MODAL DE DETALHES COMPLETOS DO PACOTE ==================== */}
      {selectedPackageDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#122015] border-2 border-[#43aa6a]/70 rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#173320] to-[#122015] border-b border-[#25462d] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1f4228] border border-[#43aa6a]/50 flex items-center justify-center text-[#6ee7b7]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
                    Detalhes do Pacote
                  </h3>
                  <p className="text-[11px] text-[#8a9d8c]">
                    Acervo oficial de materiais de RPG da Ponte dos Trolls
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPackageDetails(null)}
                className="p-1.5 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] hover:bg-[#1a2f20] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs">
              
              {/* Top Section com Imagem e Título */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-full sm:w-40 aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-[#0a120c] border border-[#203625] flex items-center justify-center shrink-0">
                  {selectedPackageDetails.imageUrl ? (
                    <img
                      src={selectedPackageDetails.imageUrl}
                      alt={selectedPackageDetails.titulo}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-2 text-[#7a8e7d]">
                      <span className="text-2xl block mb-1">📚</span>
                      <span className="text-[10px]">A Ponte dos Trolls</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#1c3222] text-[#d49e2a] border border-[#d49e2a]/30">
                      {selectedPackageDetails.sistema || 'Foundry VTT'}
                    </span>
                    {selectedPackageDetails.tipo && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1a3321] text-[#86efac] border border-[#22c55e]/30">
                        {selectedPackageDetails.tipo}
                      </span>
                    )}
                    {selectedPackageDetails.finalizadoEm && (
                      <span className="text-[11px] text-[#7a8e7d]">
                        Finalizado em {formatDateDisplay(selectedPackageDetails.finalizadoEm)}
                      </span>
                    )}
                  </div>

                  <h2 className="font-rpg text-lg sm:text-xl font-bold text-[#f4ecd8] leading-tight">
                    {selectedPackageDetails.titulo}
                  </h2>

                  {/* Preço de Aquisição */}
                  <div className="p-3 rounded-xl bg-[#0c150e] border border-[#1f3524] inline-block">
                    <span className="text-[10px] uppercase font-bold text-[#8a9d8c] block">
                      Valor de Aquisição no Catálogo:
                    </span>
                    <span className="font-rpg text-xl font-bold text-[#fbbf24]">
                      R${' '}
                      {(
                        typeof selectedPackageDetails.valorCatalogoBRL === 'number'
                          ? selectedPackageDetails.valorCatalogoBRL
                          : selectedPackageDetails.valorTotalBRL
                      )
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {selectedPackageDetails.descricao && (
                <div className="p-3.5 rounded-2xl bg-[#0c150e] border border-[#1f3524] space-y-1">
                  <span className="text-[11px] font-bold text-[#a4b5a6] uppercase tracking-wider block">
                    Descrição do Material:
                  </span>
                  <p className="text-xs text-[#d1d5db] leading-relaxed">
                    {selectedPackageDetails.descricao}
                  </p>
                </div>
              )}

              {/* Botão de Acesso ao Google Drive & Edição pelo Mestre */}
              <div className="p-4 rounded-2xl bg-[#142618] border border-[#274c30] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-[#6ee7b7] flex items-center gap-1.5 text-xs">
                    <FolderCheck className="w-4 h-4 text-[#34d399]" />
                    <span>Acesso ao Google Drive:</span>
                  </span>
                  <span className="text-[11px] text-[#8e9f90]">
                    {selectedPackageDetails.linkDrive
                      ? 'Pasta oficial configurada com os arquivos e módulos'
                      : 'Nenhum link do Drive cadastrado ainda.'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPackageDetails.linkDrive ? (
                    <a
                      href={selectedPackageDetails.linkDrive}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#236336] hover:bg-[#2c7842] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderCheck className="w-4 h-4" />
                      <span>Abrir no Google Drive</span>
                    </a>
                  ) : null}

                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => handleOpenDriveEdit(selectedPackageDetails)}
                      className="px-3 py-2 rounded-xl bg-[#1a3321] hover:bg-[#22442c] border border-[#2f5e3c] text-[#d49e2a] hover:text-[#f4ecd8] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Editar link da pasta no Google Drive"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{selectedPackageDetails.linkDrive ? 'Alterar Link' : 'Adicionar Link'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Itens Inclusos com Miniaturas (Requirement 2) */}
              <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#1f3524] space-y-3">
                <span className="text-[11px] font-bold text-[#52c27c] uppercase tracking-wider block">
                  Itens Inclusos neste Pacote ({selectedPackageDetails.itens?.length || selectedPackageDetails.itensInclusos?.length || 0}):
                </span>

                {selectedPackageDetails.itens && selectedPackageDetails.itens.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedPackageDetails.itens.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-[#122015] border border-[#1e3823]"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#0c150e] border border-[#27442d] flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.nome} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-[#6e8571]">📜</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-[#f4ecd8] block truncate text-xs">
                            {item.nome}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8e9f90]">
                            <span className="text-[#d49e2a] font-medium">{item.sistema}</span>
                            <span>·</span>
                            <span>{item.tipo || 'Material para VTT'}</span>
                          </div>
                        </div>

                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-[#6ee7b7] hover:text-white"
                            title="Ver link do produto"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#d1d5db]">
                    {(selectedPackageDetails.itensInclusos || []).map((it, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#34d399] font-bold">✔</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Cotistas e Histórico de Pagamentos (Requirement 7 & 8) */}
              <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#1f3524] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#f4ecd8] flex items-center gap-1.5 text-xs">
                      <Users className="w-3.5 h-3.5 text-[#d49e2a]" />
                      <span>Participantes do Financiamento:</span>
                    </span>
                    {/* Contadores exigidos */}
                    {(() => {
                      const aps = selectedPackageDetails.apoiadores || [];
                      const pags = selectedPackageDetails.pagamentos || {};
                      const informedCount = aps.filter(
                        (a) => a.pagamentoInformado || (pags[a.id] && pags[a.id].informouPagamento)
                      ).length;
                      const pendingCount = Math.max(0, aps.length - informedCount);

                      return (
                        <div className="flex items-center gap-3 text-[11px] text-[#8a9d8c] pt-0.5">
                          <span>Total: <strong className="text-[#f4ecd8] font-mono">{aps.length}</strong></span>
                          <span>·</span>
                          <span>Pagamento Informado: <strong className="text-[#34d399] font-mono">{informedCount}</strong></span>
                          <span>·</span>
                          <span>Pendentes: <strong className="text-amber-400 font-mono">{pendingCount}</strong></span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Botão exclusivo do Mestre: Copiar E-mails (Requirement 8) */}
                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => handleCopyPaidEmails(selectedPackageDetails)}
                      className="px-3 py-1.5 rounded-xl bg-[#1b3322] hover:bg-[#254930] border border-[#34d399]/40 text-[#6ee7b7] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Copiar e-mails de quem informou pagamento (1 por linha) para colar no Drive"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar e-mails de quem informou pagamento</span>
                    </button>
                  )}
                </div>

                {/* Lista de Participantes com Status de Pagamento (sem expor e-mails a usuários comuns) */}
                <div className="max-h-48 overflow-y-auto divide-y divide-[#182a1c] border border-[#1f3524] rounded-xl bg-[#09110a] p-2">
                  {(selectedPackageDetails.apoiadores || []).length === 0 ? (
                    <p className="text-[11px] text-[#6e8571] p-2 italic text-center">
                      Nenhum participante registrado originalmente.
                    </p>
                  ) : (
                    (selectedPackageDetails.apoiadores || []).map((ap, idx) => {
                      const isPaid = Boolean(
                        ap.pagamentoInformado ||
                          (selectedPackageDetails.pagamentos?.[ap.id]?.informouPagamento)
                      );
                      const payDate =
                        ap.dataPagamentoInformado ||
                        selectedPackageDetails.pagamentos?.[ap.id]?.dataPagamentoInformado;

                      return (
                        <div key={ap.id || idx} className="py-1.5 px-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-[#d1d5db]">
                            {idx + 1}. {ap.nome}
                          </span>

                          <div className="flex items-center gap-2">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#142e1d] text-[#6ee7b7] border border-[#34d399]/40">
                                <Check className="w-3 h-3 text-[#34d399]" />
                                <span>Pagamento Informado</span>
                                {payDate && (
                                  <span className="text-[9px] text-[#8e9f90] ml-1">
                                    ({formatDateDisplay(payDate.split('T')[0])})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#282110] text-amber-400 border border-amber-500/30">
                                <span>Pendente</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Botões do Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1f3524]">
                <button
                  type="button"
                  onClick={() => setSelectedPackageDetails(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPackageToBuy(selectedPackageDetails);
                    setSelectedPackageDetails(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#236336] hover:bg-[#2c7842] text-white font-bold text-xs sm:text-sm shadow-lg shadow-black/40 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Comprar este Financiamento</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==================== MODAL DE EDIÇÃO DO LINK DO DRIVE (Requirement 5) ==================== */}
      {driveEditPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-[#34d399]/70 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#173320] to-[#122015] border-b border-[#25462d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-[#34d399]" />
                <h3 className="font-rpg text-base font-bold text-[#f4ecd8]">
                  Editar Link da Pasta no Google Drive
                </h3>
              </div>
              <button
                onClick={() => setDriveEditPkg(null)}
                className="p-1 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriveLink} className="p-5 space-y-4 text-xs">
              <div>
                <strong className="text-[#f4ecd8] block mb-1">{driveEditPkg.titulo}</strong>
                <p className="text-[11px] text-[#8a9d8c]">
                  Adicione, substitua ou remova o link da pasta de materiais compartilhada com os membros.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                  URL da Pasta no Google Drive:
                </label>
                <input
                  type="url"
                  value={editDriveUrl}
                  onChange={(e) => setEditDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#34d399]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f4ecd8] mb-1">
                  Senha do Mestre para Salvar:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={driveAdminPassword}
                    onChange={(e) => setDriveAdminPassword(e.target.value)}
                    placeholder="Ponte#dos#trolls"
                    className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#34d399]"
                  />
                </div>
              </div>

              {driveEditError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                  {driveEditError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDriveEditPkg(null)}
                  className="px-3.5 py-2 text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDrive}
                  className="px-4 py-2 rounded-xl bg-[#236336] hover:bg-[#2c7842] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingDrive ? 'Salvando...' : 'Salvar Link do Drive'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Regras de Aquisição */}
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
                  Diretrizes oficiais para aquisição tardia de materiais no acervo
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
                  2. Vantagem do Financiamento em Andamento:
                </strong>
                <p>
                  O valor de aquisição no Catálogo <strong>possui acréscimo em comparação ao rateio original da época da vaquinha</strong>. Participar durante a coleta de membros é sempre a forma mais econômica de garantir os materiais!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRulesNotice(false)}
                className="px-5 py-2.5 font-bold text-xs sm:text-sm rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all cursor-pointer"
              >
                Entendi, explorar vitrine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compra via WhatsApp */}
      {packageToBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-[#34d399]/70 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            
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

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#a4b5a6] mb-1.5">
                  Mensagem formatada para o pedido:
                </label>
                <textarea
                  readOnly
                  rows={6}
                  value={buyMessageText}
                  className="w-full p-3 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono leading-relaxed focus:outline-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#142618] border border-[#274c30] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#a4b5a6]">
                  <Phone className="w-4 h-4 text-[#34d399]" />
                  <span>WhatsApp do Mestre:</span>
                </div>
                <strong className="text-[#6ee7b7] font-mono font-bold text-sm">
                  (19) 98151-2030
                </strong>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>📲 Abrir no WhatsApp do Mestre (19 98151-2030)</span>
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

      {/* Modal de Editar Imagem da Capa (Requirement 3) */}
      {imageEditPkg && (
        <EditPackageImageModal
          isOpen={Boolean(imageEditPkg)}
          pkg={imageEditPkg}
          onClose={() => setImageEditPkg(null)}
          onSave={async (packageId, newImageUrl, adminPassword) => {
            if (onUpdatePackageImage) {
              await onUpdatePackageImage(packageId, newImageUrl, adminPassword);
            }
          }}
          onToast={onToast}
        />
      )}

    </div>
  );
};
