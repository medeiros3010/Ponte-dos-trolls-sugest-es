import React, { useState } from 'react';
import { Plus, Cloud, RefreshCw, MessageSquareShare, Link2, Check, User, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { getShareableGroupLink } from '../utils/cloudStorage';

interface HeaderProps {
  binId: string;
  currentUser: UserProfile | null;
  onChangeUser: () => void;
  onGoHome: () => void;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  onOpenNewItemModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenBulletinModal: () => void;
  isSyncing?: boolean;
  onToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  binId,
  currentUser,
  onChangeUser,
  onGoHome,
  exchangeRate,
  onExchangeRateChange,
  onOpenNewItemModal,
  onOpenSettingsModal,
  onOpenBulletinModal,
  isSyncing = false,
  onToast,
}) => {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSaveRate = () => {
    const parsed = parseFloat(tempRate.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onExchangeRateChange(parsed);
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
  };

  return (
    <header className="border-b border-[#1f3524] bg-[#0c150e]/95 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Left: Avatar/Icon + Title + User Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGoHome}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#d49e2a] shadow-md shadow-black/40 shrink-0 bg-[#16271a] hover:scale-105 transition-transform"
              title="Voltar ao Menu Inicial"
            >
              <img
                src="/assets/aistudio/image_95654294.png"
                alt="A Ponte dos Trolls"
                className="w-full h-full object-cover"
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onGoHome}
                  className="font-rpg text-base sm:text-xl font-bold tracking-wide text-[#f4ecd8] leading-tight hover:text-[#d49e2a] transition-colors text-left"
                >
                  A Ponte dos Trolls
                </button>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-[#1e3422] text-[#d49e2a] border border-[#d49e2a]/30 rounded">
                  Rateios RPG
                </span>
              </div>
              
              {/* User indicator & Cloud status */}
              <div className="flex items-center gap-2.5 text-[11px] mt-0.5">
                {currentUser && (
                  <div className="flex items-center gap-1.5 text-[#d49e2a]">
                    <User className="w-3 h-3 text-[#d49e2a]" />
                    <span className="font-semibold truncate max-w-[120px] sm:max-w-[180px]">
                      {currentUser.nome}
                    </span>
                    <button
                      onClick={onChangeUser}
                      className="text-[10px] text-[#8a9d8c] hover:text-[#f4ecd8] underline ml-0.5"
                      title="Trocar de membro"
                    >
                      [Trocar]
                    </button>
                  </div>
                )}

                <span className="hidden sm:inline text-[#3a523f]">·</span>

                <button
                  onClick={onOpenSettingsModal}
                  className="hidden sm:inline-flex items-center gap-1.5 hover:underline"
                  title="Clique para gerenciar o banco na nuvem e compartilhamento"
                >
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      isSyncing
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    }`}
                  />
                  <span className="text-[#6ee7b7] font-medium text-[10px]">
                    {isSyncing ? 'Sincronizando...' : `Nuvem: ${binId}`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Exchange Rate + Copy Group Link + Settings + WhatsApp Bulletin + Primary Golden CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Dollar Rate */}
            <div className="hidden lg:flex items-center gap-1.5 bg-[#122015] px-2.5 py-1.5 rounded-xl border border-[#203625] text-xs">
              <span className="text-[#7a8e7d] text-[11px]">1 USD =</span>
              {isEditingRate ? (
                <div className="flex items-center gap-1">
                  <span className="text-[#d49e2a] font-mono">R$</span>
                  <input
                    type="text"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    onBlur={handleSaveRate}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRate()}
                    className="w-14 bg-[#0a120c] border border-[#d49e2a] rounded px-1.5 py-0.5 text-[#f4ecd8] font-mono text-xs focus:outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTempRate(exchangeRate.toFixed(2));
                    setIsEditingRate(true);
                  }}
                  title="Ajustar cotação do dólar"
                  className="font-mono font-bold text-[#d49e2a] hover:underline px-0.5"
                >
                  R$ {exchangeRate.toFixed(2)}
                </button>
              )}
              <button
                onClick={() => {
                  onExchangeRateChange(5.80);
                  setTempRate('5.80');
                }}
                title="Redefinir para 5.80"
                className="text-[#556957] hover:text-[#9aa39b] p-0.5"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* 🔗 Copiar Link Sincronizado para o Grupo */}
            <button
              onClick={handleCopyLink}
              className={`p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                copiedLink
                  ? 'bg-[#183824] text-[#6ee7b7] border-[#34d399]'
                  : 'bg-[#16271a] hover:bg-[#1f3724] text-[#d49e2a] border-[#2e5035]'
              }`}
              title="Copiar link com o banco sincronizado para colar no WhatsApp"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#34d399]" /> : <Link2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            {/* Boletim WhatsApp */}
            <button
              onClick={onOpenBulletinModal}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#43aa6a] hover:text-[#52c27c] bg-[#122015] hover:bg-[#1a2e1f] border border-[#203625] rounded-xl transition-colors flex items-center gap-1.5"
              title="Gerar boletim para colar no WhatsApp"
            >
              <MessageSquareShare className="w-4 h-4" />
              <span className="hidden md:inline">Boletim</span>
            </button>

            {/* ⚙️ Nuvem / Planilha */}
            <button
              onClick={onOpenSettingsModal}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors bg-[#122015] text-[#a4b5a6] border-[#203625] hover:text-[#f4ecd8] hover:bg-[#182b1d]"
              title="Gerenciar banco em nuvem e exportar CSV"
            >
              <Cloud className="w-4 h-4 text-[#d49e2a]" />
              <span className="hidden md:inline">Nuvem / CSV</span>
            </button>

            {/* + Sugerir Compra */}
            <button
              onClick={onOpenNewItemModal}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold text-[#122015] bg-[#d49e2a] hover:bg-[#e5b23d] rounded-xl shadow-md shadow-black/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Sugerir Compra</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
