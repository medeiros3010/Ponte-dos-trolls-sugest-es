import React from 'react';
import { MainCategory } from '../types';
import { Search, X, Filter } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: MainCategory;
  onTabChange: (tab: MainCategory) => void;
  countEmFinanciamento: number;
  countFinalizados: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSystem: string;
  onSystemChange: (sys: string) => void;
  availableSystems: string[];
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  countEmFinanciamento,
  countFinalizados,
  searchQuery,
  onSearchChange,
  selectedSystem,
  onSystemChange,
  availableSystems,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
      
      {/* The 2 Main Prominent Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-[#122015] border border-[#203625] rounded-2xl shrink-0">
        <button
          onClick={() => onTabChange('Em Financiamento')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'Em Financiamento'
              ? 'bg-[#d49e2a] text-[#122015] shadow-md shadow-black/30'
              : 'text-[#8ea090] hover:text-[#f4ecd8] hover:bg-[#182b1d]'
          }`}
        >
          <span>🔥 Em Financiamento</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
              activeTab === 'Em Financiamento'
                ? 'bg-[#122015]/20 text-[#122015]'
                : 'bg-[#182b1d] text-[#a4b5a6]'
            }`}
          >
            {countEmFinanciamento}
          </span>
        </button>

        <button
          onClick={() => onTabChange('Finalizados')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'Finalizados'
              ? 'bg-[#43aa6a] text-[#0c150e] shadow-md shadow-black/30'
              : 'text-[#8ea090] hover:text-[#f4ecd8] hover:bg-[#182b1d]'
          }`}
        >
          <span>✅ Finalizados</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
              activeTab === 'Finalizados'
                ? 'bg-[#0c150e]/20 text-[#0c150e]'
                : 'bg-[#182b1d] text-[#a4b5a6]'
            }`}
          >
            {countFinalizados}
          </span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex items-center gap-2 flex-1 md:max-w-xl justify-end">
        
        {/* RPG System Filter Dropdown */}
        <div className="relative shrink-0">
          <div className="relative">
            <select
              value={selectedSystem}
              onChange={(e) => onSystemChange(e.target.value)}
              aria-label="Filtrar por sistema de RPG"
              className="appearance-none bg-[#122015] border border-[#203625] text-xs text-[#dcd6c8] pl-8 pr-7 py-2.5 rounded-2xl focus:outline-none focus:border-[#d49e2a] transition-colors cursor-pointer font-medium hover:bg-[#16271a]"
            >
              <option value="">Todos os Sistemas</option>
              {availableSystems.map((sys) => (
                <option key={sys} value={sys} className="bg-[#122015] text-[#f4ecd8]">
                  {sys}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-[#d49e2a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="text-[#6e8070] text-[10px] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              ▼
            </span>
          </div>
        </div>

        {/* Clean Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6e8070] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full bg-[#122015] border border-[#203625] rounded-2xl pl-10 pr-8 py-2.5 text-xs sm:text-sm text-[#f4ecd8] placeholder-[#5d7060] focus:outline-none focus:border-[#d49e2a] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e8070] hover:text-[#f4ecd8] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
