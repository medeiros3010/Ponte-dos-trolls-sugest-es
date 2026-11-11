import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Users,
  Shield,
  Crown,
  ChevronDown,
  DollarSign,
  Link2,
  Check,
  MessageSquareShare,
  Download,
  Cloud,
  LogOut,
  RefreshCw,
  Plus,
  Wrench,
  Menu,
  X,
  ShoppingCart,
  Package,
} from 'lucide-react';
import { UserProfile, AppView } from '../types';
import { getShareableGroupLink } from '../utils/cloudStorage';

interface HeaderProps {
  binId: string;
  currentUser: UserProfile | null;
  currentView: AppView;
  pendingUsersCount?: number;
  pendingCatalogRequestsCount?: number;
  cartCount?: number;
  myAcervoCount?: number;
  onNavigate: (view: AppView) => void;
  onChangeUser: () => void;
  onGoHome: () => void;
  onOpenCart?: () => void;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  onOpenNewItemModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenBulletinModal: () => void;
  onOpenMembersModal: () => void;
  onOpenExportModal: () => void;
  onOpenProfileModal: () => void;
  isSyncing?: boolean;
  onToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  binId,
  currentUser,
  currentView,
  pendingUsersCount = 0,
  pendingCatalogRequestsCount = 0,
  cartCount = 0,
  myAcervoCount = 0,
  onNavigate,
  onChangeUser,
  onGoHome,
  onOpenCart,
  exchangeRate,
  onExchangeRateChange,
  onOpenNewItemModal,
  onOpenSettingsModal,
  onOpenBulletinModal,
  onOpenMembersModal,
  onOpenExportModal,
  onOpenProfileModal,
  isSyncing = false,
  onToast,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());
  const [copiedLink, setCopiedLink] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Animação discreta ao adicionar ao carrinho (respeita motion-safe)
  const prevCartCountRef = useRef(cartCount);
  const [isBumpingCart, setIsBumpingCart] = useState(false);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setIsBumpingCart(true);
      const timer = setTimeout(() => setIsBumpingCart(false), 650);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  const isMaster = Boolean(currentUser?.isMaster);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveRate = () => {
    const parsed = parseFloat(tempRate.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onExchangeRateChange(parsed);
      onToast(`Cotação atualizada para R$ ${parsed.toFixed(2)}`);
    } else {
      setTempRate(exchangeRate.toString());
    }
    setIsEditingRate(false);
  };

  const handleCopyLink = () => {
    const link = getShareableGroupLink(binId);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
    onToast('Link com banco compartilhado copiado! Envie no WhatsApp do grupo.');
    setIsToolsMenuOpen(false);
  };

  const navItems: { id: AppView; label: string; badge?: number }[] = [
    { id: 'home', label: 'Início' },
    { id: 'sugestoes', label: 'Sugestões' },
    { id: 'financiamento', label: 'Financiamentos' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'meus-itens', label: 'Meus Itens', badge: myAcervoCount },
    { id: 'membros', label: 'Membros' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#282D13] border-b border-[#3f471e] shadow-md text-[#F8EDD5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-[68px]">
          
          {/* Left Brand: Bridge Silhouette + Site Title */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              onClick={onGoHome}
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer focus:outline-none min-h-[44px]"
              title="A Ponte dos Trolls - Início"
            >
              <img
                src="/bridge-logo.png"
                alt="A Ponte dos Trolls"
                className="h-7 sm:h-8 w-auto object-contain filter drop-shadow brightness-110 group-hover:scale-105 transition-transform shrink-0"
              />
              <span className="font-rpg font-bold tracking-wider sm:tracking-widest text-[#F8EDD5] text-xs sm:text-base md:text-lg uppercase group-hover:text-[#e4cf98] transition-colors whitespace-nowrap">
                A PONTE DOS TROLLS
              </span>
            </button>

            {/* Subtle Divider */}
            <span className="hidden md:inline-block h-6 w-px bg-[#434b21]" />
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 lg:gap-2">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isMembrosTab = item.id === 'membros';
              const isCatalogoTab = item.id === 'catalogo';
              const showPendingDot = isMembrosTab && isMaster && pendingUsersCount > 0;
              const showCatalogDot = isCatalogoTab && isMaster && pendingCatalogRequestsCount > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#525c28] text-[#F8EDD5] shadow-sm border border-[#6b7a35]'
                      : 'text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a]'
                  }`}
                  aria-label={
                    showCatalogDot
                      ? `${item.label} (Há ${pendingCatalogRequestsCount} solicitações de acesso pendentes)`
                      : showPendingDot
                      ? `${item.label} (Há solicitações de entrada pendentes)`
                      : item.label
                  }
                >
                  <span>{item.label}</span>
                  {showPendingDot && (
                    <span
                      className="absolute top-1 right-1 flex h-2 w-2 pointer-events-none"
                      title="Há solicitações de entrada pendentes"
                      aria-label="Há solicitações de entrada pendentes"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-2 ring-[#282D13]" />
                      <span className="sr-only">Há solicitações de entrada pendentes</span>
                    </span>
                  )}
                  {showCatalogDot && (
                    <span
                      className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none"
                      title={`Há ${pendingCatalogRequestsCount} solicitação(ões) de acesso no Catálogo`}
                      aria-label="Há solicitações de acesso no Catálogo"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 ring-2 ring-[#282D13] items-center justify-center text-[8px] font-bold text-white leading-none">
                        {pendingCatalogRequestsCount}
                      </span>
                      <span className="sr-only">Há solicitações de acesso pendentes no Catálogo</span>
                    </span>
                  )}
                  {item.id === 'meus-itens' && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#384318] text-[#a8d363] border border-[#5d7328]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Area: Cart + Tools Menu + User Account */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Carrinho do Catálogo - Apenas para Membros (Oculto no Modo Mestre) */}
            {onOpenCart && !isMaster && (
              <button
                type="button"
                onClick={onOpenCart}
                className={`relative min-h-[44px] min-w-[44px] px-3 sm:px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 select-none active:scale-95 ${
                  cartCount > 0
                    ? `bg-[#48551F] hover:bg-[#59672A] border-2 border-[#D4A538] text-[#F8EDD5] shadow-sm ${
                        isBumpingCart ? 'motion-safe:scale-105 motion-safe:ring-2 motion-safe:ring-[#D4A538]' : ''
                      }`
                    : 'bg-[#1e220e] hover:bg-[#2c3214] border border-[#3f471e] text-[#cfc4a6] hover:text-[#F8EDD5]'
                }`}
                title={cartCount > 0 ? `Abrir Carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})` : 'Abrir Carrinho'}
                aria-label={`Abrir carrinho com ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
              >
                <ShoppingCart className={`w-5 h-5 shrink-0 ${cartCount > 0 ? 'text-[#f5dfa8]' : 'text-[#cfc4a6]'}`} />
                <span className="hidden sm:inline font-bold text-xs sm:text-sm">
                  Carrinho
                </span>
                {typeof cartCount === 'number' && cartCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#875508] border border-[#e3c578] text-[11px] font-extrabold text-[#F8EDD5] font-mono leading-none shrink-0 shadow-xs">
                    <span className="hidden sm:inline">· </span>{cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Ferramentas do Mestre (Dropdown no desktop, integrado no menu móvel) */}
            {isMaster && (
              <div className="relative hidden md:block" ref={toolsMenuRef}>
                <button
                  onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isToolsMenuOpen
                      ? 'bg-[#3d451c] text-[#F8EDD5] border-[#65732f]'
                      : 'bg-[#20240f] text-[#cfc4a6] border-[#3f471e] hover:bg-[#323917] hover:text-[#F8EDD5]'
                  }`}
                  title="Ferramentas Administrativas"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#d6be8c]" />
                  <span className="hidden lg:inline">Ferramentas</span>
                  <ChevronDown className="w-3 h-3 text-[#cfc4a6]" />
                </button>

                {isToolsMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#F8EDD5] text-[#302414] rounded-2xl shadow-xl border border-[#C6AD78] py-2 z-50 animate-in fade-in-50 duration-150">
                    <div className="px-3 py-1.5 border-b border-[#E3D1AC] mb-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#71634D]">
                        Painel do Mestre
                      </p>
                    </div>

                    {/* Cotação do Dólar */}
                    <div className="px-3 py-2 flex items-center justify-between text-xs hover:bg-[#EFE3C8] transition-colors">
                      <span className="text-[#71634D] font-medium flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-[#716016]" />
                        1 USD =
                      </span>
                      {isEditingRate ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[#716016]">R$</span>
                          <input
                            type="text"
                            value={tempRate}
                            onChange={(e) => setTempRate(e.target.value)}
                            onBlur={handleSaveRate}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRate()}
                            className="w-16 bg-[#FFF9EC] border border-[#C6AD78] rounded px-1.5 py-0.5 text-xs text-[#302414] font-mono focus:outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setTempRate(exchangeRate.toFixed(2));
                            setIsEditingRate(true);
                          }}
                          className="font-mono font-bold text-[#48551F] hover:underline"
                          title="Clique para editar cotação"
                        >
                          R$ {exchangeRate.toFixed(2)}
                        </button>
                      )}
                    </div>

                    {/* Copiar Link Sincronizado */}
                    <button
                      onClick={handleCopyLink}
                      className="w-full px-3 py-2 text-xs text-left font-medium flex items-center gap-2 text-[#302414] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-[#716016]" />
                      <span>{copiedLink ? '✓ Link Copiado!' : 'Copiar Link do Grupo'}</span>
                    </button>

                    {/* Boletim WhatsApp */}
                    <button
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenBulletinModal();
                      }}
                      className="w-full px-3 py-2 text-xs text-left font-medium flex items-center gap-2 text-[#302414] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                    >
                      <MessageSquareShare className="w-3.5 h-3.5 text-[#48551F]" />
                      <span>Gerar Boletim WhatsApp</span>
                    </button>

                    {/* Exportar Dados */}
                    <button
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenExportModal();
                      }}
                      className="w-full px-3 py-2 text-xs text-left font-medium flex items-center gap-2 text-[#302414] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#716016]" />
                      <span>Exportar Dados (Excel / Backup)</span>
                    </button>

                    {/* Sincronização e Nuvem */}
                    <button
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenSettingsModal();
                      }}
                      className="w-full px-3 py-2 text-xs text-left font-medium flex items-center gap-2 text-[#302414] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5 text-[#48551F]" />
                      <div className="flex items-center justify-between flex-1">
                        <span>Configurações da Nuvem</span>
                        <span className="text-[10px] text-[#71634D] font-mono">
                          {isSyncing ? 'Sincronizando...' : binId.substring(0, 10)}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* User Account Capsule (matching top right in references) */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#1e220e] hover:bg-[#323917] border border-[#3f471e] transition-colors cursor-pointer"
                title="Opções da conta"
              >
                {/* Avatar circle */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-[#C6AD78] bg-[#3a4419] flex items-center justify-center shrink-0">
                  {isMaster ? (
                    <img
                      src="/avatar-mestre.png"
                      alt="Mestre"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-rpg font-bold text-xs text-[#F8EDD5]">
                      {currentUser?.nome ? currentUser.nome.substring(0, 2).toUpperCase() : 'U'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-semibold text-[#F8EDD5] max-w-[110px] sm:max-w-[140px] truncate">
                    {isMaster ? 'Mestre' : (currentUser?.nome || 'Aventureiro')}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#cfc4a6]" />
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#F8EDD5] text-[#302414] rounded-2xl shadow-xl border border-[#C6AD78] py-2 z-50 animate-in fade-in-50 duration-150">
                  <div className="px-3.5 py-2 border-b border-[#E3D1AC] mb-1">
                    <p className="text-xs font-bold text-[#302414] truncate">
                      {currentUser?.nome || 'Usuário'}
                    </p>
                    <p className="text-[11px] text-[#71634D]">
                      {isMaster ? 'Mestre da Ponte (Admin)' : 'Membro da Ponte'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenProfileModal();
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left font-medium flex items-center gap-2 text-[#302414] hover:bg-[#EFE3C8] transition-colors cursor-pointer font-semibold"
                  >
                    <User className="w-3.5 h-3.5 text-[#48551F]" />
                    <span>Meu perfil / Editar meus dados</span>
                  </button>

                  {isMaster && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigate('membros');
                      }}
                      className="w-full px-3.5 py-2 text-xs text-left font-medium flex items-center gap-2 text-[#302414] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-[#48551F]" />
                      <span>Gerenciar Membros</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onChangeUser();
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left font-medium flex items-center gap-2 text-[#8b261b] hover:bg-[#EFE3C8] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#8b261b]" />
                    <span>Trocar de Conta</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[#cfc4a6] hover:text-[#F8EDD5] rounded-xl hover:bg-[#323917] transition-colors cursor-pointer select-none"
              aria-label="Abrir menu de navegação"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <div className="md:hidden py-3 border-t border-[#3f471e] flex flex-col gap-1 pb-4 animate-in fade-in-50 duration-150">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isMembrosTab = item.id === 'membros';
              const isCatalogoTab = item.id === 'catalogo';
              const showPendingDot = isMembrosTab && isMaster && pendingUsersCount > 0;
              const showCatalogDot = isCatalogoTab && isMaster && pendingCatalogRequestsCount > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileNavOpen(false);
                  }}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors flex items-center justify-between cursor-pointer select-none ${
                    isActive
                      ? 'bg-[#525c28] text-[#F8EDD5] border border-[#6b7a35]'
                      : 'text-[#cfc4a6] hover:bg-[#363e1a] hover:text-[#F8EDD5]'
                  }`}
                  aria-label={
                    showCatalogDot
                      ? `${item.label} (Há ${pendingCatalogRequestsCount} solicitações de acesso pendentes)`
                      : showPendingDot
                      ? `${item.label} (Há solicitações de entrada pendentes)`
                      : item.label
                  }
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.id === 'meus-itens' && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#384318] text-[#a8d363] border border-[#5d7328]">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {showPendingDot && (
                    <span
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C2410C] text-[#F8EDD5] border border-[#ea580c] shadow-xs"
                      title="Há solicitações de entrada pendentes"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F8EDD5] animate-pulse" />
                      <span>Pendências</span>
                      <span className="sr-only">Há solicitações de entrada pendentes</span>
                    </span>
                  )}
                  {showCatalogDot && (
                    <span
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-[#F8EDD5] border border-red-500 shadow-xs"
                      title={`Há ${pendingCatalogRequestsCount} solicitações de acesso pendentes`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F8EDD5] animate-pulse" />
                      <span>{pendingCatalogRequestsCount} pedidos</span>
                      <span className="sr-only">Há solicitações de acesso no Catálogo</span>
                    </span>
                  )}
                </button>
              );
            })}

            {/* Painel do Mestre no Celular */}
            {isMaster && (
              <div className="mt-2 pt-2 border-t border-[#3f471e]/70 space-y-1">
                <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-[#d6be8c]">
                  Painel do Mestre
                </p>

                {/* Cotação do Dólar no Menu Mobile */}
                <div className="min-h-[44px] px-4 py-2 flex items-center justify-between text-xs text-[#cfc4a6] bg-[#21260e] rounded-xl border border-[#3f471e]">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#d6be8c]" />
                    <span>Cotação USD</span>
                  </span>
                  <button
                    onClick={() => {
                      setTempRate(exchangeRate.toFixed(2));
                      setIsEditingRate(true);
                      setIsMobileNavOpen(false);
                      setIsToolsMenuOpen(true);
                    }}
                    className="font-mono font-bold text-[#a8d363] px-2 py-1 rounded bg-[#333b16] border border-[#4d5921]"
                  >
                    R$ {exchangeRate.toFixed(2)}
                  </button>
                </div>

                <button
                  onClick={() => {
                    handleCopyLink();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left font-medium flex items-center gap-2 text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] rounded-xl transition-colors cursor-pointer"
                >
                  <Link2 className="w-4 h-4 text-[#d6be8c]" />
                  <span>{copiedLink ? '✓ Link Copiado!' : 'Copiar Link do Grupo'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onOpenBulletinModal();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left font-medium flex items-center gap-2 text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] rounded-xl transition-colors cursor-pointer"
                >
                  <MessageSquareShare className="w-4 h-4 text-[#a8d363]" />
                  <span>Gerar Boletim WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onOpenExportModal();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left font-medium flex items-center gap-2 text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#d6be8c]" />
                  <span>Exportar Dados (Excel / Backup)</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onOpenSettingsModal();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left font-medium flex items-center gap-2 text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] rounded-xl transition-colors cursor-pointer"
                >
                  <Cloud className="w-4 h-4 text-[#a8d363]" />
                  <span>Configurações da Nuvem</span>
                </button>
              </div>
            )}

            {/* Ações de Conta no Menu Mobile */}
            <div className="mt-2 pt-2 border-t border-[#3f471e]/70 space-y-1">
              <button
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onOpenProfileModal();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left font-medium flex items-center gap-2 text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] rounded-xl transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-[#a8d363]" />
                <span>Meu Perfil</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onChangeUser();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 text-xs text-left font-medium flex items-center gap-2 text-[#f87171] hover:bg-[#363e1a] rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#f87171]" />
                <span>Trocar de Conta</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
