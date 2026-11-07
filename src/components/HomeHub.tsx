import React from 'react';
import { AppView, UserProfile } from '../types';
import { ShoppingBag, Flame, BookOpen, Users, ArrowRight, Sparkles } from 'lucide-react';

interface HomeHubProps {
  currentUser: UserProfile;
  countSugestoes: number;
  countFinanciamento: number;
  countCatalogo: number;
  countMembros: number;
  onNavigate: (view: AppView) => void;
  onOpenNewItem: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  currentUser,
  countSugestoes,
  countFinanciamento,
  countCatalogo,
  countMembros,
  onNavigate,
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center animate-in fade-in duration-200">
      
      {/* Banner de Boas-vindas com Mascote do Troll */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-3">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#d49e2a] shadow-xl shadow-black/60 mx-auto mb-2 bg-[#16271a] hover:scale-105 transition-transform">
          <img
            src="/troll-mascot.png"
            alt="A Ponte dos Trolls"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#182c1d] border border-[#27442d] text-xs font-semibold text-[#d49e2a]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Saudações, {currentUser.nome.split(' ')[0]}! Bem-vindo à Ponte dos Trolls</span>
        </div>
        <h2 className="font-rpg text-2xl sm:text-3xl md:text-4xl font-bold text-[#f4ecd8] tracking-wide leading-tight">
          Central de Compras Coletivas & Rateios RPG
        </h2>
        <p className="text-xs sm:text-sm text-[#8a9d8c] leading-relaxed">
          Escolha um dos portais abaixo para sugerir materiais, entrar nas vaquinhas abertas da nossa mesa, explorar o acervo no Drive ou ver os membros da comunidade.
        </p>
      </div>

      {/* 4 BOTÕES GIGANTES DE DESTAQUE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Sugerir Compras */}
        <button
          onClick={() => onNavigate('sugestoes')}
          className="group relative text-left bg-gradient-to-b from-[#142318] to-[#0e1911] hover:from-[#1a2e20] hover:to-[#122216] border-2 border-[#203625] hover:border-[#d49e2a]/70 rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#d49e2a]/10 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#1b2f20] border border-[#2e5035] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 text-[#d49e2a]" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-[#1c3222] text-[#d49e2a] border border-[#d49e2a]/30">
                {countSugestoes}
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#f4ecd8] group-hover:text-[#d49e2a] transition-colors">
                Sugerir Compras
              </h3>
              <p className="text-xs text-[#8a9d8c] mt-1.5 leading-relaxed">
                Envie novas ideias de módulos, mapas ou livros e apoie sugestões da galera.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#1f3524] flex items-center justify-between text-xs font-bold text-[#d49e2a]">
            <span>Acessar Sugestões</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 2: Financiamento em Andamento */}
        <button
          onClick={() => onNavigate('financiamento')}
          className="group relative text-left bg-gradient-to-b from-[#182a1c] to-[#101e13] hover:from-[#1e3422] hover:to-[#142618] border-2 border-[#d49e2a]/50 hover:border-[#d49e2a] rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#d49e2a]/20 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#203a27] border border-[#d49e2a]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6 text-[#e5b23d] animate-pulse" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-[#d49e2a] text-[#122015] shadow-sm">
                {countFinanciamento} abertas
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#f4ecd8] group-hover:text-[#e5b23d] transition-colors">
                Financiamento
              </h3>
              <p className="text-xs text-[#8a9d8c] mt-1.5 leading-relaxed">
                Vaquinhas ativas recolhendo rateios com regras de valor máximo por pessoa.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#25462d] flex items-center justify-between text-xs font-bold text-[#e5b23d]">
            <span>Ver Vaquinhas</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 3: Catálogo de Produtos */}
        <button
          onClick={() => onNavigate('catalogo')}
          className="group relative text-left bg-gradient-to-b from-[#142318] to-[#0e1911] hover:from-[#1a2e20] hover:to-[#122216] border-2 border-[#203625] hover:border-[#43aa6a]/70 rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#43aa6a]/10 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#1b2f20] border border-[#2e5035] flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-[#43aa6a]" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-[#1a3824] text-[#52c27c] border border-[#2f5e3b]">
                {countCatalogo} no Drive
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#f4ecd8] group-hover:text-[#52c27c] transition-colors">
                Catálogo
              </h3>
              <p className="text-xs text-[#8a9d8c] mt-1.5 leading-relaxed">
                Acervo de pacotes finalizados para adquirir com acesso imediato ao Drive.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#1f3524] flex items-center justify-between text-xs font-bold text-[#52c27c]">
            <span>Explorar Acervo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 4: Membros */}
        <button
          onClick={() => onNavigate('membros')}
          className="group relative text-left bg-gradient-to-b from-[#142318] to-[#0e1911] hover:from-[#1a2e20] hover:to-[#122216] border-2 border-[#203625] hover:border-[#38bdf8]/70 rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#38bdf8]/10 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#162725] border border-[#224b42] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-[#38bdf8]" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-[#13302b] text-[#38bdf8] border border-[#1d4f45]">
                {countMembros}
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#f4ecd8] group-hover:text-[#38bdf8] transition-colors">
                Membros
              </h3>
              <p className="text-xs text-[#8a9d8c] mt-1.5 leading-relaxed">
                Comunidade da Ponte, histórico de participação e gerenciamento da mesa.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#1f3524] flex items-center justify-between text-xs font-bold text-[#38bdf8]">
            <span>Ver Comunidade</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

      </div>

    </div>
  );
};
