import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  ExternalLink,
  FolderCheck,
  FolderX,
  Sparkles,
  ArrowRight,
  BookOpen,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, FundingPackage } from '../types';
import { getUserAcquiredPackages } from '../utils/ranksAndAcquisitions';
import { PageBanner } from './PageBanner';

interface MeusItensViewProps {
  currentUser: UserProfile;
  packages: FundingPackage[];
  onGoToCatalog: () => void;
  onGoHome: () => void;
  onToast?: (msg: string) => void;
}

export const MeusItensView: React.FC<MeusItensViewProps> = ({
  currentUser,
  packages,
  onGoToCatalog,
  onGoHome,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSistema, setSelectedSistema] = useState('todos');

  // Pacotes únicos adquiridos pelo usuário no catálogo
  const acquiredPackages = useMemo(() => {
    return getUserAcquiredPackages(currentUser, packages);
  }, [currentUser, packages]);

  // Sistemas disponíveis no acervo do usuário
  const availableSistemas = useMemo(() => {
    const set = new Set<string>();
    acquiredPackages.forEach((pkg) => {
      if (pkg.sistema) set.add(pkg.sistema);
    });
    return Array.from(set).sort();
  }, [acquiredPackages]);

  // Filtragem por busca e sistema
  const filteredPackages = useMemo(() => {
    return acquiredPackages.filter((pkg) => {
      if (selectedSistema !== 'todos' && pkg.sistema !== selectedSistema) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesTitle = pkg.titulo.toLowerCase().includes(q);
        const matchesSistema = (pkg.sistema || '').toLowerCase().includes(q);
        const matchesItems = (pkg.itens || []).some((it) => it.nome.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSistema && !matchesItems) return false;
      }
      return true;
    });
  }, [acquiredPackages, selectedSistema, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 flex-1 flex flex-col space-y-6 w-full animate-in fade-in duration-200">
      {/* Banner */}
      <PageBanner
        title="Meus Itens"
        subtitle="Seu acervo pessoal de módulos, livros, mapas e conteúdos adquiridos na Ponte dos Trolls."
      />

      {/* Barra de Filtro e Busca */}
      <div className="parchment-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#71634D] absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nos seus itens adquiridos..."
            className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl pl-9 pr-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
          />
        </div>

        {availableSistemas.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#71634D] whitespace-nowrap">
              Sistema:
            </span>
            <select
              value={selectedSistema}
              onChange={(e) => setSelectedSistema(e.target.value)}
              className="bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
            >
              <option value="todos">Todos os Sistemas ({acquiredPackages.length})</option>
              {availableSistemas.map((sis) => (
                <option key={sis} value={sis}>
                  {sis}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="px-3 py-1.5 rounded-xl bg-[#EADBBE] border border-[#C6AD78] text-xs font-bold text-[#302414] text-center whitespace-nowrap">
          {acquiredPackages.length} {acquiredPackages.length === 1 ? 'pacote adquirido' : 'pacotes adquiridos'}
        </div>
      </div>

      {/* Grid de Itens */}
      {filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPackages.map((pkg) => {
            const itemCount = Array.isArray(pkg.itens) && pkg.itens.length > 0
              ? pkg.itens.length
              : (pkg.itensInclusos ? pkg.itensInclusos.length : 1);

            const hasDriveLink = Boolean(pkg.linkDrive && pkg.linkDrive.trim());

            return (
              <div
                key={pkg.id}
                className="parchment-card overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-all duration-200 border-[#C6AD78]"
              >
                <div>
                  {/* Capa */}
                  <div className="relative aspect-[16/10] bg-[#282D13] overflow-hidden">
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

                    {/* Selo No seu acervo */}
                    <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md bg-[#3e4e1a] text-[#F8EDD5] text-[11px] font-bold shadow-md flex items-center gap-1 border border-[#5d7328]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#a8d363]" />
                      <span>No seu acervo</span>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDE2CA] text-[#55482e] border border-[#D5C49F]">
                        {pkg.sistema || 'Foundry VTT Geral'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5DBC1] text-[#55482e] border border-[#D5C49F]">
                        {pkg.tipo || 'Material para VTT'}
                      </span>
                    </div>

                    <h3 className="font-rpg text-base sm:text-lg font-bold text-[#302414] leading-snug">
                      {pkg.titulo}
                    </h3>

                    {/* Lista / contagem de itens inclusos */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-[#71634D]">
                        <Layers className="w-3.5 h-3.5 text-[#716016] shrink-0" />
                        <span className="font-semibold">{itemCount} itens inclusos:</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px] text-[#55482e] bg-[#FAF4E6] p-2 rounded-lg border border-[#D6C296]">
                        {Array.isArray(pkg.itens) && pkg.itens.length > 0 ? (
                          pkg.itens.map((it, idx) => (
                            <div key={it.id || idx} className="truncate">
                              • {it.nome}
                            </div>
                          ))
                        ) : (
                          pkg.itensInclusos?.map((nome, idx) => (
                            <div key={idx} className="truncate">
                              • {nome}
                            </div>
                          )) || <div>Conteúdo completo da compra</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ação: Google Drive */}
                <div className="p-4 pt-0">
                  {hasDriveLink ? (
                    <a
                      href={pkg.linkDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <FolderCheck className="w-4 h-4 text-[#a8d363]" />
                      <span>Acessar no Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-xl bg-[#FAF4E6] border border-[#D6C296] text-[#71634D] text-xs text-center flex items-center justify-center gap-1.5">
                      <FolderX className="w-4 h-4 text-[#716016]" />
                      <span>Link ainda não disponibilizado</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="parchment-card p-10 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FAF4E6] border-2 border-[#C6AD78] flex items-center justify-center text-[#716016]">
            <Package className="w-8 h-8 opacity-70" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-rpg text-lg font-bold text-[#302414]">
              {searchTerm || selectedSistema !== 'todos'
                ? 'Nenhum item encontrado nesta busca'
                : 'Seu acervo ainda está vazio'}
            </h3>
            <p className="text-xs text-[#71634D] leading-relaxed">
              {searchTerm || selectedSistema !== 'todos'
                ? 'Tente ajustar os termos de pesquisa ou o filtro de sistema.'
                : 'Você ainda não participou de nenhum rateio concluído deste banco de dados. Participe das compras coletivas ativas ou adquira pacotes anteriores diretamente pelo Catálogo da Ponte.'}
            </p>
          </div>
          <div>
            <button
              onClick={onGoToCatalog}
              className="px-5 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-md flex items-center gap-2 mx-auto cursor-pointer"
            >
              <span>Explorar Catálogo de Pacotes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
