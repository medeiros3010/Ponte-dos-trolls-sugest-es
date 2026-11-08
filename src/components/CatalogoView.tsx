import React, { useState, useMemo, useEffect } from 'react';
import {
  FundingPackage,
  UserProfile,
  SISTEMAS_PADRAO,
  OFFICIAL_PRODUCT_TYPES,
  ProductType,
  ADMIN_PASSWORD,
} from '../types';
import {
  Search,
  ExternalLink,
  Users,
  Copy,
  Trash2,
  Edit2,
  ShoppingCart,
  Info,
  MessageSquare,
  Phone,
  X,
  Filter,
  RotateCcw,
  Image as ImageIcon,
  Link as LinkIcon,
  KeyRound,
  CheckCircle2,
  Package,
  FolderCheck,
  ChevronDown,
  BookOpen,
  Check,
  UserPlus,
} from 'lucide-react';
import { generateCatalogBuyMessage, extractPaidMemberEmails, formatDateDisplay } from '../utils/helpers';
import { isPackageAcquired } from '../utils/ranksAndAcquisitions';
import { EditPackageImageModal } from './EditPackageImageModal';
import { PageBanner } from './PageBanner';

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
  cartPackageIds?: string[];
  onAddToCart?: (pkg: FundingPackage) => void;
  onRemoveFromCart?: (packageId: string) => void;
  onOpenCart?: () => void;
  onGoToMyItems?: () => void;
  onAddPosteriorBuyer?: (packageId: string, memberId: string, adminPassword?: string) => Promise<boolean>;
  onRemovePosteriorBuyer?: (packageId: string, memberId: string, adminPassword?: string) => Promise<boolean>;
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
  cartPackageIds = [],
  onAddToCart,
  onRemoveFromCart,
  onOpenCart,
  onGoToMyItems,
  onAddPosteriorBuyer,
  onRemovePosteriorBuyer,
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recentes');

  // Mobile filters open/close
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Modal States
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<FundingPackage | null>(null);
  const [packageToBuy, setPackageToBuy] = useState<FundingPackage | null>(null);
  const [copiedBuyMsg, setCopiedBuyMsg] = useState<boolean>(false);
  const [showRulesNotice, setShowRulesNotice] = useState<boolean>(false);

  // Active Menu Dropdown for card
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Drive Link Quick Edit Modal
  const [driveEditPkg, setDriveEditPkg] = useState<FundingPackage | null>(null);
  const [editDriveUrl, setEditDriveUrl] = useState('');
  const [driveAdminPassword, setDriveAdminPassword] = useState('');
  const [driveEditError, setDriveEditError] = useState('');
  const [isSavingDrive, setIsSavingDrive] = useState(false);

  // Posterior Buyer Management (Mestre)
  const [newBuyerId, setNewBuyerId] = useState<string>('');
  const [buyerPassword, setBuyerPassword] = useState<string>('');
  const [isBuyerSaving, setIsBuyerSaving] = useState<boolean>(false);

  const handleAddBuyer = async (pkgId: string) => {
    if (!newBuyerId) {
      onToast('Selecione um membro para liberar acesso.');
      return;
    }
    if (buyerPassword !== ADMIN_PASSWORD) {
      onToast('Senha do Mestre incorreta.');
      return;
    }
    if (!onAddPosteriorBuyer) return;

    try {
      setIsBuyerSaving(true);
      const ok = await onAddPosteriorBuyer(pkgId, newBuyerId, buyerPassword);
      if (ok) {
        onToast('Acesso de comprador posterior liberado com sucesso!');
        setNewBuyerId('');
        // Update local selectedPackageDetails if open
        if (selectedPackageDetails && selectedPackageDetails.id === pkgId) {
          const userObj = allUsers.find((u) => u.id === newBuyerId);
          if (userObj) {
            const nextApoiadores = [
              ...(selectedPackageDetails.apoiadores || []),
              {
                id: userObj.id,
                nome: userObj.nome,
                telefone: userObj.telefone || '',
                email: userObj.email || '',
                data: new Date().toISOString(),
                pagamentoInformado: true,
              },
            ];
            setSelectedPackageDetails({ ...selectedPackageDetails, apoiadores: nextApoiadores });
          }
        }
      }
    } catch (e: any) {
      onToast(e?.message || 'Erro ao registrar comprador posterior');
    } finally {
      setIsBuyerSaving(false);
    }
  };

  const handleRemoveBuyer = async (pkgId: string, memberId: string) => {
    const pwd = prompt('Digite a Senha do Mestre para remover o acesso deste membro:');
    if (!pwd) return;
    if (pwd !== ADMIN_PASSWORD) {
      onToast('Senha do Mestre incorreta.');
      return;
    }
    if (!onRemovePosteriorBuyer) return;

    try {
      const ok = await onRemovePosteriorBuyer(pkgId, memberId, pwd);
      if (ok) {
        onToast('Acesso removido com sucesso.');
        if (selectedPackageDetails && selectedPackageDetails.id === pkgId) {
          const nextApoiadores = (selectedPackageDetails.apoiadores || []).filter((a) => a.id !== memberId);
          setSelectedPackageDetails({ ...selectedPackageDetails, apoiadores: nextApoiadores });
        }
      }
    } catch (e: any) {
      onToast(e?.message || 'Erro ao remover comprador');
    }
  };

  // Edit Cover Image Modal
  const [imageEditPkg, setImageEditPkg] = useState<FundingPackage | null>(null);

  // Base list of packages in Catálogo
  const catalogPackages = useMemo(() => {
    return packages.filter((p) => p.status === 'Catálogo');
  }, [packages]);

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Combined Filters and Sorting
  const filteredAndSortedPackages = useMemo(() => {
    const list = catalogPackages.filter((pkg) => {
      // 0. Filtro Meu Acervo
      if (myAcervoActive) {
        const isUserParticipant = (pkg.apoiadores || []).some(
          (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
        );
        if (!isUserParticipant) return false;
      }

      // 1. Text Search
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

      // 2. Sistema Filter
      const matchSistema =
        selectedSistema === 'Todos' ||
        pkg.sistema === selectedSistema ||
        (pkg.itens && pkg.itens.some((it) => it.sistema === selectedSistema));

      // 3. Categories (multi-checkbox)
      const matchCategory =
        selectedCategories.length === 0 ||
        (pkg.tipo && selectedCategories.includes(pkg.tipo)) ||
        (pkg.itens && pkg.itens.some((it) => it.tipo && selectedCategories.includes(it.tipo)));

      // 4. Preço em Reais
      const catalogPrice =
        typeof pkg.valorCatalogoBRL === 'number'
          ? pkg.valorCatalogoBRL
          : pkg.valorTotalBRL;

      const min = minPrice.trim() !== '' ? parseFloat(minPrice.replace(',', '.')) : null;
      const max = maxPrice.trim() !== '' ? parseFloat(maxPrice.replace(',', '.')) : null;

      const matchMinPrice = min === null || isNaN(min) || catalogPrice >= min;
      const matchMaxPrice = max === null || isNaN(max) || catalogPrice <= max;

      return matchSearch && matchSistema && matchCategory && matchMinPrice && matchMaxPrice;
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
  }, [
    catalogPackages,
    myAcervoActive,
    currentUser.id,
    currentUser.nome,
    searchTerm,
    selectedSistema,
    selectedCategories,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  // Clear all filters
  const handleClearFilters = () => {
    setMyAcervoActive(false);
    if (onToggleMyAcervo) onToggleMyAcervo(false);
    setSearchTerm('');
    setSelectedSistema('Todos');
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('recentes');
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Banner Superior com Arte dos Trolls (fiel ao Print 1 / image_968094c5.png) */}
      <PageBanner
        title="O acervo da Ponte"
        subtitle="Encontre a próxima aventura da sua mesa."
      />

      {/* Botão de Filtros no Celular */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="w-full py-2.5 px-4 bg-[#F8EDD5] border border-[#C6AD78] rounded-xl text-sm font-semibold text-[#302414] flex items-center justify-between shadow-sm cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#716016]" />
            <span>Filtros do Acervo</span>
            {(myAcervoActive || selectedCategories.length > 0 || selectedSistema !== 'Todos') && (
              <span className="w-2 h-2 rounded-full bg-[#48551F]" />
            )}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isMobileFiltersOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Main Layout: Sidebar Filtros à Esquerda + Grade de Produtos à Direita */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* SIDEBAR DE FILTROS (Fiel ao Print 1) */}
        <aside
          className={`w-full lg:w-64 shrink-0 parchment-card p-5 space-y-5 lg:sticky lg:top-24 ${
            isMobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Cabeçalho do Filtro */}
          <div className="flex items-center gap-2 pb-3 border-b border-[#D6C296]">
            <Filter className="w-4 h-4 text-[#302414]" />
            <h2 className="font-rpg text-base font-bold text-[#302414]">
              Filtrar acervo
            </h2>
          </div>

          {/* Toggle: Meu acervo */}
          <div className="space-y-1.5 pb-4 border-b border-[#D6C296]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#302414]">Meu acervo</span>
              <button
                type="button"
                role="switch"
                aria-checked={myAcervoActive}
                onClick={() => {
                  const next = !myAcervoActive;
                  setMyAcervoActive(next);
                  if (onToggleMyAcervo) onToggleMyAcervo(next);
                }}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  myAcervoActive ? 'bg-[#48551F]' : 'bg-[#D4C198]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#F8EDD5] shadow-md ring-0 transition duration-200 ease-in-out ${
                    myAcervoActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-[#71634D] leading-tight">
              Mostrar apenas pacotes que já possuo.
            </p>
          </div>

          {/* Categorias (Checkboxes com ícones) */}
          <div className="space-y-2 pb-4 border-b border-[#D6C296]">
            <label className="block text-xs font-bold text-[#302414]">
              Categorias
            </label>
            <div className="space-y-1.5 text-xs text-[#302414]">
              {[
                { id: 'Livros', label: 'Livros', icon: '📖' },
                { id: 'Mapas', label: 'Mapas', icon: '🗺️' },
                { id: 'Material para VTT', label: 'Material para VTT', icon: '🖥️' },
                { id: 'Outros', label: 'Outros', icon: '🎲' },
              ].map((cat) => {
                const checked = selectedCategories.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-[#EFE3C8] transition-colors cursor-pointer select-none"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="font-medium">{cat.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleCategory(cat.id)}
                      className="w-4 h-4 rounded border-[#C6AD78] text-[#48551F] focus:ring-[#48551F] accent-[#48551F] cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sistema */}
          <div className="space-y-1.5 pb-4 border-b border-[#D6C296]">
            <label className="block text-xs font-bold text-[#302414]">
              Sistema
            </label>
            <div className="relative">
              <select
                value={selectedSistema}
                onChange={(e) => setSelectedSistema(e.target.value)}
                className="w-full appearance-none bg-[#FBF4E4] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] font-medium focus:outline-none focus:border-[#48551F] cursor-pointer"
              >
                <option value="Todos">Todos os sistemas</option>
                {SISTEMAS_PADRAO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Faixa de Preço */}
          <div className="space-y-1.5 pb-4 border-b border-[#D6C296]">
            <label className="block text-xs font-bold text-[#302414]">
              Faixa de preço
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="R$ mín."
                className="w-full bg-[#FBF4E4] border border-[#C6AD78] rounded-xl px-2.5 py-1.5 text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
              />
              <span className="text-xs text-[#71634D]">—</span>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="R$ máx."
                className="w-full bg-[#FBF4E4] border border-[#C6AD78] rounded-xl px-2.5 py-1.5 text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
              />
            </div>
          </div>

          {/* Botão Limpar Filtros */}
          <button
            onClick={handleClearFilters}
            className="w-full py-2 px-3 bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] rounded-xl text-xs font-semibold text-[#302414] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#716016]" />
            <span>Limpar filtros</span>
          </button>
        </aside>

        {/* ÁREA PRINCIPAL: BARRA SUPERIOR + GRADE DE 3 COLUNAS */}
        <div className="flex-1 min-w-0">
          
          {/* Barra Superior: Busca, Ordenação e Contagem (Fiel ao Print 1) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
            
            {/* Input de Busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#71634D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar no acervo..."
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

            {/* Ordenação */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-[#F8EDD5] border border-[#C6AD78] rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-[#302414] focus:outline-none focus:border-[#48551F] shadow-sm cursor-pointer"
              >
                <option value="recentes">Mais recentes</option>
                <option value="menor-preco">Menor preço</option>
                <option value="maior-preco">Maior preço</option>
                <option value="nome-az">Nome (A – Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#71634D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Contagem de Pacotes Disponíveis */}
            <div className="text-xs text-[#71634D] font-medium shrink-0 self-center sm:self-auto">
              <span className="font-bold text-[#302414] font-mono">{filteredAndSortedPackages.length}</span> pacotes disponíveis
            </div>

          </div>

          {/* Grade de 3 Colunas de Produtos (Fiel ao Print 1) */}
          {filteredAndSortedPackages.length === 0 ? (
            <div className="parchment-card p-12 text-center my-6">
              <div className="w-14 h-14 rounded-full bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center mx-auto mb-3 text-2xl">
                {myAcervoActive ? '📂' : '🔍'}
              </div>
              <h3 className="font-rpg text-lg font-bold text-[#302414]">
                {myAcervoActive
                  ? 'Nenhum material no seu acervo pessoal'
                  : 'Nenhum pacote encontrado'}
              </h3>
              <p className="text-xs text-[#71634D] max-w-md mx-auto mt-1 mb-4">
                {myAcervoActive
                  ? 'Você ainda não participou de nenhum rateio concluído deste banco de dados.'
                  : 'Tente ajustar os filtros ou a palavra-chave da busca.'}
              </p>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAndSortedPackages.map((pkg) => {
                const isUserParticipant = isPackageAcquired(pkg, currentUser);
                const isInCart = cartPackageIds.includes(pkg.id);

                const catalogPrice =
                  typeof pkg.valorCatalogoBRL === 'number'
                    ? pkg.valorCatalogoBRL
                    : pkg.valorTotalBRL;

                const itemCount = Array.isArray(pkg.itens) && pkg.itens.length > 0
                  ? pkg.itens.length
                  : (pkg.itensInclusos ? pkg.itensInclusos.length : 1);

                return (
                  <div
                    key={pkg.id}
                    className="parchment-card overflow-hidden flex flex-col group hover:shadow-md transition-all duration-200 border-[#C6AD78]"
                  >
                    {/* Capa do Produto (Clicável para ver detalhes) */}
                    <div
                      onClick={() => setSelectedPackageDetails(pkg)}
                      className="relative aspect-[16/10] bg-[#282D13] overflow-hidden cursor-pointer"
                      title="Clique para ver detalhes do pacote"
                    >
                      {pkg.imageUrl ? (
                        <img
                          src={pkg.imageUrl}
                          alt={pkg.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#252b12] text-[#8c9c64] p-4 text-center">
                          <Package className="w-10 h-10 mb-1 opacity-70" />
                          <span className="text-xs font-serif">{pkg.titulo}</span>
                        </div>
                      )}

                      {/* Selo: No seu acervo (Top Left) */}
                      {isUserParticipant && (
                        <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md bg-[#3e4e1a] text-[#F8EDD5] text-[11px] font-bold shadow-md flex items-center gap-1 border border-[#5d7328]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#a8d363]" />
                          <span>No seu acervo</span>
                        </div>
                      )}

                      {/* Botões do Mestre (Top Right) */}
                      {isMaster && (
                        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                          {/* Editar Imagem */}
                          {onUpdatePackageImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageEditPkg(pkg);
                              }}
                              className="p-1.5 rounded-lg bg-[#282D13]/85 hover:bg-[#282D13] text-[#F8EDD5] border border-[#6b7a35] shadow-md transition-colors cursor-pointer"
                              title="Alterar capa do pacote"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Menu 3 Pontos */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === pkg.id ? null : pkg.id);
                              }}
                              className="p-1.5 rounded-lg bg-[#282D13]/85 hover:bg-[#282D13] text-[#F8EDD5] border border-[#6b7a35] shadow-md transition-colors cursor-pointer"
                              title="Mais opções do Mestre"
                            >
                              <span className="text-xs font-bold leading-none px-0.5">⋮</span>
                            </button>

                            {activeMenuId === pkg.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-48 bg-[#F8EDD5] text-[#302414] rounded-xl shadow-xl border border-[#C6AD78] py-1.5 z-50 animate-in fade-in-50"
                              >
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onEditPackage(pkg);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#48551F]" />
                                  <span>Editar Pacote</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleOpenDriveEdit(pkg);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                                >
                                  <LinkIcon className="w-3.5 h-3.5 text-[#716016]" />
                                  <span>Editar Link do Drive</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleCopyPaidEmails(pkg);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-[#48551F]" />
                                  <span>Copiar E-mails Pagos</span>
                                </button>

                                <div className="border-t border-[#D6C296] my-1" />

                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onDeletePackage(pkg);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-left font-medium flex items-center gap-2 text-[#8b261b] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-[#8b261b]" />
                                  <span>Excluir do Catálogo</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* Etiquetas: Sistema + Tipo de Produto */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDE2CA] text-[#55482e] border border-[#D5C49F]">
                            {pkg.sistema || 'Foundry VTT Geral'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5DBC1] text-[#55482e] border border-[#D5C49F]">
                            {pkg.tipo || 'Material para VTT'}
                          </span>
                        </div>

                        {/* Título do Pacote */}
                        <h3 className="font-rpg text-base sm:text-lg font-bold text-[#302414] leading-snug line-clamp-1 group-hover:text-[#48551F] transition-colors">
                          {pkg.titulo}
                        </h3>

                        {/* Itens Inclusos */}
                        <div className="flex items-center gap-1.5 text-xs text-[#71634D] mt-1">
                          <Package className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                          <span>{itemCount} itens inclusos</span>
                        </div>
                      </div>

                      {/* Rodapé: Preço & Botão de Ação */}
                      <div className="pt-3 border-t border-[#D6C296] flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-base sm:text-lg font-bold text-[#302414] block">
                            R$ {catalogPrice.toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedPackageDetails(pkg)}
                            className="text-[11px] text-[#71634D] hover:text-[#48551F] hover:underline font-semibold cursor-pointer block"
                          >
                            Ver detalhes →
                          </button>
                        </div>

                        {/* Ação Principal: Adicionar ao Carrinho / No seu acervo / No carrinho */}
                        <div>
                          {isUserParticipant ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onGoToMyItems) onGoToMyItems();
                                else setSelectedPackageDetails(pkg);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#E3E8D0] hover:bg-[#d5dcc0] text-[#282D13] border border-[#8F9F5B] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              title="Material já adquirido. Clique para acessar no seu acervo."
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#48551F]" />
                              <span>No seu acervo</span>
                            </button>
                          ) : isInCart ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCart) onOpenCart();
                                else onRemoveFromCart?.(pkg.id);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#FAF4E6] hover:bg-[#F3E7CC] text-[#48551F] border border-[#48551F] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              title="No carrinho! Clique para abrir o carrinho."
                            >
                              <Check className="w-3.5 h-3.5 text-[#48551F]" />
                              <span>No carrinho</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToCart?.(pkg)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Adicionar pacote ao carrinho"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Adicionar ao carrinho</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* ==================== MODAIS ==================== */}

      {/* 1. Modal de Detalhes do Pacote */}
      {selectedPackageDetails && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="parchment-card w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in-50 duration-150">
            
            {/* Header da Capa */}
            <div className="relative aspect-[21/9] bg-[#282D13]">
              {selectedPackageDetails.imageUrl ? (
                <img
                  src={selectedPackageDetails.imageUrl}
                  alt={selectedPackageDetails.titulo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8c9c64]">
                  <Package className="w-12 h-12 opacity-60" />
                </div>
              )}
              <button
                onClick={() => setSelectedPackageDetails(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-[#282D13]/80 hover:bg-[#282D13] text-[#F8EDD5] border border-[#6b7a35] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {/* Título & Badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#EDE2CA] text-[#55482e] border border-[#D5C49F]">
                    {selectedPackageDetails.sistema || 'Foundry VTT Geral'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#E5DBC1] text-[#55482e] border border-[#D5C49F]">
                    {selectedPackageDetails.tipo || 'Material para VTT'}
                  </span>
                </div>
                <h2 className="font-rpg text-2xl font-bold text-[#302414]">
                  {selectedPackageDetails.titulo}
                </h2>
                {selectedPackageDetails.descricao && (
                  <p className="text-xs sm:text-sm text-[#71634D] mt-2 whitespace-pre-wrap leading-relaxed">
                    {selectedPackageDetails.descricao}
                  </p>
                )}
              </div>

              {/* Itens Inclusos */}
              {Array.isArray(selectedPackageDetails.itens) && selectedPackageDetails.itens.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#71634D] flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#716016]" />
                    <span>Itens incluídos no pacote ({selectedPackageDetails.itens.length})</span>
                  </h4>
                  <ul className="divide-y divide-[#E3D1AC] text-xs">
                    {selectedPackageDetails.itens.map((it, idx) => (
                      <li key={idx} className="py-1.5 flex items-center justify-between gap-2">
                        <span className="font-medium text-[#302414]">{it.nome}</span>
                        {it.link && (
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#48551F] hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <span>Ver link original</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Seção de Acesso ao Drive ou Compra */}
              {(() => {
                const isUserParticipant = (selectedPackageDetails.apoiadores || []).some(
                  (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
                );
                const catalogPrice =
                  typeof selectedPackageDetails.valorCatalogoBRL === 'number'
                    ? selectedPackageDetails.valorCatalogoBRL
                    : selectedPackageDetails.valorTotalBRL;

                return (
                  <div className="p-4 rounded-xl bg-[#EDE2CA] border border-[#C6AD78] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-[#71634D] block">Preço de aquisição:</span>
                      <span className="font-mono text-2xl font-bold text-[#302414]">
                        R$ {catalogPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {isUserParticipant ? (
                        selectedPackageDetails.linkDrive ? (
                          <a
                            href={selectedPackageDetails.linkDrive}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FolderCheck className="w-4 h-4" />
                            <span>Acessar Google Drive</span>
                          </a>
                        ) : (
                          <div className="text-xs text-[#71634D] bg-[#F8EDD5] px-3 py-2 rounded-lg border border-[#D6C296]">
                            Pasta do Drive sendo atualizada pelo Mestre.
                          </div>
                        )
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {cartPackageIds.includes(selectedPackageDetails.id) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPackageDetails(null);
                                onOpenCart?.();
                              }}
                              className="px-4 py-2.5 rounded-xl bg-[#FAF4E6] hover:bg-[#F3E7CC] text-[#48551F] border border-[#48551F] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Check className="w-4 h-4 text-[#48551F]" />
                              <span>No carrinho (Ver)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToCart?.(selectedPackageDetails)}
                              className="px-4 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              <span>Adicionar ao carrinho</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPackageToBuy(selectedPackageDetails);
                              setSelectedPackageDetails(null);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#EADBBE] hover:bg-[#e0cfab] text-[#302414] border border-[#C6AD78] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 text-[#716016]" />
                            <span>Comprar pelo WhatsApp</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Participantes que financiaram (Transparência) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#71634D] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#716016]" />
                    <span>Cotistas e compradores ({selectedPackageDetails.apoiadores?.length || 0})</span>
                  </h4>
                  {isMaster && (
                    <button
                      onClick={() => handleCopyPaidEmails(selectedPackageDetails)}
                      className="text-xs text-[#48551F] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar e-mails</span>
                    </button>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs">
                  {selectedPackageDetails.apoiadores && selectedPackageDetails.apoiadores.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPackageDetails.apoiadores.map((ap) => (
                        <span
                          key={ap.id}
                          className="px-2 py-1 rounded bg-[#F8EDD5] text-[#302414] border border-[#C6AD78] text-[11px] font-medium flex items-center gap-1"
                        >
                          <span>{ap.nome}</span>
                          {isMaster && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBuyer(selectedPackageDetails.id, ap.id)}
                              className="text-[#8b261b] hover:bg-[#fae5e5] rounded p-0.5 ml-0.5 cursor-pointer"
                              title="Remover acesso deste membro"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#71634D]">Nenhum participante registrado.</span>
                  )}
                </div>

                {/* Painel do Mestre: Liberação de Comprador Posterior */}
                {isMaster && (
                  <div className="p-3 rounded-xl bg-[#EDE2CA] border border-[#C6AD78] space-y-2 mt-2">
                    <span className="text-xs font-bold text-[#302414] flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[#48551F]" />
                      <span>Liberar Acesso Manual (Comprador Posterior)</span>
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={newBuyerId}
                        onChange={(e) => setNewBuyerId(e.target.value)}
                        className="flex-1 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-2.5 py-1.5 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                      >
                        <option value="">Selecione o membro para liberar acesso...</option>
                        {allUsers
                          .filter(
                            (u) =>
                              u.status === 'aprovado' &&
                              !(selectedPackageDetails.apoiadores || []).some(
                                (ap) => ap.id === u.id || ap.nome.toLowerCase() === u.nome.toLowerCase()
                              )
                          )
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nome} ({u.telefone || 'Sem tel'})
                            </option>
                          ))}
                      </select>

                      <input
                        type="password"
                        value={buyerPassword}
                        onChange={(e) => setBuyerPassword(e.target.value)}
                        placeholder="Senha Mestre"
                        className="w-full sm:w-28 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-2.5 py-1.5 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                      />

                      <button
                        type="button"
                        disabled={isBuyerSaving || !newBuyerId}
                        onClick={() => handleAddBuyer(selectedPackageDetails.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        {isBuyerSaving ? 'Salvando...' : '+ Confirmar Acesso'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 bg-[#EDE2CA] border-t border-[#D6C296] flex justify-end">
              <button
                onClick={() => setSelectedPackageDetails(null)}
                className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Modal de Compra via WhatsApp */}
      {packageToBuy && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="parchment-card w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-lg font-bold text-[#302414] flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#48551F]" />
                <span>Adquirir no Catálogo</span>
              </h3>
              <button
                onClick={() => setPackageToBuy(null)}
                className="p-1 text-[#71634D] hover:text-[#302414] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-2">
              <p className="text-xs font-bold text-[#302414]">
                Pacote: {packageToBuy.titulo}
              </p>
              <p className="font-mono text-xl font-bold text-[#48551F]">
                R$ {(packageToBuy.valorCatalogoBRL || packageToBuy.valorTotalBRL).toFixed(2).replace('.', ',')}
              </p>
              <p className="text-[11px] text-[#71634D]">
                Envie o comprovante de pagamento ao Mestre no WhatsApp para receber o acesso à pasta do Google Drive.
              </p>
            </div>

            {/* Mensagem Formatada */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[#71634D]">
                Mensagem pré-formatada para o WhatsApp:
              </label>
              <textarea
                readOnly
                value={buyMessageText}
                rows={4}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl p-3 text-xs text-[#302414] font-mono resize-none focus:outline-none"
              />
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <button
                onClick={handleCopyBuyMessage}
                className="flex-1 py-2.5 px-4 bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] rounded-xl text-xs font-semibold text-[#302414] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-[#716016]" />
                <span>{copiedBuyMsg ? '✓ Mensagem Copiada!' : 'Copiar Mensagem'}</span>
              </button>

              <button
                onClick={handleSendWhatsApp}
                className="flex-1 py-2.5 px-4 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Abrir WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal de Edição Rápida do Link do Drive (Mestre) */}
      {driveEditPkg && (
        <div className="fixed inset-0 z-50 bg-[#282D13]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDriveLink}
            className="parchment-card w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C296]">
              <h3 className="font-rpg text-base font-bold text-[#302414] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#716016]" />
                <span>Link do Google Drive</span>
              </h3>
              <button
                type="button"
                onClick={() => setDriveEditPkg(null)}
                className="p-1 text-[#71634D] hover:text-[#302414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#71634D]">
              Pacote: <strong>{driveEditPkg.titulo}</strong>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">URL da Pasta do Drive:</label>
              <input
                type="url"
                required
                value={editDriveUrl}
                onChange={(e) => setEditDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#302414]">Senha do Mestre:</label>
              <input
                type="password"
                required
                value={driveAdminPassword}
                onChange={(e) => setDriveAdminPassword(e.target.value)}
                placeholder="Digite a senha de administrador"
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            {driveEditError && (
              <p className="text-xs text-[#8b261b] font-medium">{driveEditError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDriveEditPkg(null)}
                className="px-3.5 py-2 bg-[#EADBBE] rounded-xl text-xs font-semibold text-[#302414]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingDrive}
                className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isSavingDrive ? 'Salvando...' : 'Salvar Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Modal de Edição da Imagem da Capa */}
      {imageEditPkg && onUpdatePackageImage && (
        <EditPackageImageModal
          isOpen={Boolean(imageEditPkg)}
          packageItem={imageEditPkg}
          onClose={() => setImageEditPkg(null)}
          onUpdateImage={onUpdatePackageImage}
          onToast={onToast}
        />
      )}

    </div>
  );
};
