import React, { useState, useMemo } from 'react';
import { UserProfile, FundingPackage } from '../types';
import { getUserAcquiredPackages } from '../utils/ranksAndAcquisitions';
import {
  X,
  Package,
  Search,
  ExternalLink,
  FolderCheck,
  FolderX,
  Layers,
  Sparkles,
  CheckCircle2,
  Tag,
  Shield,
} from 'lucide-react';

interface MemberAcervoModalProps {
  isOpen: boolean;
  member: UserProfile | null;
  packages: FundingPackage[];
  onClose: () => void;
  onToast?: (msg: string) => void;
}

export const MemberAcervoModal: React.FC<MemberAcervoModalProps> = ({
  isOpen,
  member,
  packages,
  onClose,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mesma regra centralizada e exata da tela "Meus Itens"
  const memberAcquiredPackages = useMemo(() => {
    if (!member) return [];
    return getUserAcquiredPackages(member, packages);
  }, [member, packages]);

  // Filtragem local por busca
  const filteredPackages = useMemo(() => {
    if (!searchTerm.trim()) return memberAcquiredPackages;
    const q = searchTerm.toLowerCase().trim();
    return memberAcquiredPackages.filter((pkg) => {
      const matchTitle = pkg.titulo.toLowerCase().includes(q);
      const matchSistema = (pkg.sistema || '').toLowerCase().includes(q);
      const matchItens = (pkg.itens || []).some((it) => it.nome.toLowerCase().includes(q));
      return matchTitle || matchSistema || matchItens;
    });
  }, [memberAcquiredPackages, searchTerm]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col border-[#C6AD78] overflow-hidden">
        
        {/* Header com identidade da Ponte */}
        <div className="p-4 sm:p-5 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#3d451c] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5] shrink-0">
              <Package className="w-5 h-5 text-[#d6be8c]" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="font-rpg text-base sm:text-xl font-bold text-[#F8EDD5] truncate">
                  Acervo de {member.nome}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#384318] text-[#a8d363] border border-[#5d7328] shrink-0">
                  Consulta do Mestre
                </span>
              </div>
              <p className="text-xs text-[#cfc4a6] mt-0.5">
                {memberAcquiredPackages.length}{' '}
                {memberAcquiredPackages.length === 1 ? 'aquisição confirmada no acervo' : 'aquisições confirmadas no acervo'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="p-3.5 sm:p-4 bg-[#F8EDD5] border-b border-[#D6C296] flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71634D] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do pacote, módulo ou sistema..."
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F]"
            />
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#EDE2CA] border border-[#C6AD78] text-xs font-bold text-[#302414] shrink-0 whitespace-nowrap">
            {filteredPackages.length} de {memberAcquiredPackages.length} {memberAcquiredPackages.length === 1 ? 'pacote' : 'pacotes'}
          </div>
        </div>

        {/* Lista de Itens do Acervo */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 bg-[#F3E5C5]/40">
          {filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPackages.map((pkg) => {
                const apoiador = (pkg.apoiadores || []).find(
                  (ap) =>
                    (ap.id && ap.id === member.id) ||
                    (ap.nome && ap.nome.trim().toLowerCase() === member.nome.trim().toLowerCase())
                );

                // Identificação de compra posterior
                const isPosterior = Boolean(
                  apoiador?.isPosteriorBuyer ||
                    (pkg.finalizadoEm && apoiador?.data && new Date(apoiador.data) > new Date(pkg.finalizadoEm))
                );

                const hasDriveLink = Boolean(pkg.linkDrive && pkg.linkDrive.trim());
                const itemCount = Array.isArray(pkg.itens) && pkg.itens.length > 0
                  ? pkg.itens.length
                  : (pkg.itensInclusos ? pkg.itensInclusos.length : 1);

                return (
                  <div
                    key={pkg.id}
                    className="parchment-card p-3 sm:p-3.5 border-[#C6AD78] flex flex-col justify-between space-y-3 hover:border-[#48551F]/60 transition-colors bg-[#FBF4E4]"
                  >
                    <div>
                      {/* Topo: Miniatura + Título + Badges */}
                      <div className="flex gap-3">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#282D13] overflow-hidden border border-[#C6AD78] shrink-0 flex items-center justify-center">
                          {pkg.imageUrl ? (
                            <img
                              src={pkg.imageUrl}
                              alt={pkg.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-7 h-7 text-[#8c9c64] opacity-70" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#EDE2CA] text-[#55482e] border border-[#D5C49F]">
                              {pkg.sistema || 'Foundry VTT'}
                            </span>
                            
                            {isPosterior ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FAE8B4] text-[#875508] border border-[#D9A74A] flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5 text-[#875508]" />
                                <span>Compra posterior</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88] flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 text-[#2f5c1a]" />
                                <span>Rateio original</span>
                              </span>
                            )}
                          </div>

                          <h4 className="font-rpg text-xs sm:text-sm font-bold text-[#302414] leading-snug line-clamp-2">
                            {pkg.titulo}
                          </h4>

                          <p className="text-[10px] text-[#71634D] flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#716016]" />
                            <span>{itemCount} {itemCount === 1 ? 'item incluso' : 'itens inclusos'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ação: Link do Drive */}
                    <div className="pt-2 border-t border-[#D6C296] flex items-center justify-between gap-2 text-xs">
                      {hasDriveLink ? (
                        <a
                          href={pkg.linkDrive}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-3 rounded-lg bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FolderCheck className="w-3.5 h-3.5 text-[#a8d363]" />
                          <span>Link do Google Drive</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      ) : (
                        <div className="w-full py-1 px-2.5 rounded-lg bg-[#FAF4E6] border border-[#D6C296] text-[#71634D] text-[10px] text-center flex items-center justify-center gap-1">
                          <FolderX className="w-3 h-3 text-[#716016]" />
                          <span>Drive não cadastrado</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Estado Vazio */
            <div className="py-12 px-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#FAF4E6] border border-[#C6AD78] flex items-center justify-center text-[#716016]">
                <Package className="w-7 h-7 opacity-60" />
              </div>
              <h3 className="font-rpg text-base font-bold text-[#302414]">
                {searchTerm
                  ? 'Nenhum pacote encontrado com este termo'
                  : 'Este membro ainda não possui itens no acervo.'}
              </h3>
              <p className="text-xs text-[#71634D] max-w-sm mx-auto leading-relaxed">
                {searchTerm
                  ? 'Tente pesquisar por outro nome ou sistema.'
                  : 'Materiais aparecem aqui quando o membro participa de um rateio que foi finalizado para o Catálogo ou quando tem acesso posterior liberado pelo Mestre.'}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3.5 sm:p-4 bg-[#EDE2CA] border-t border-[#D6C296] flex items-center justify-between">
          <span className="text-[11px] text-[#71634D] font-medium">
            Visualizando acervo de <strong>{member.nome}</strong> sem alterar a conta conectada.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
