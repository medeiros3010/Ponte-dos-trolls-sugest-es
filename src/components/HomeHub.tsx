import React from 'react';
import { AppView, UserProfile, FundingPackage } from '../types';
import {
  Lightbulb,
  Coins,
  BookOpen,
  Users,
  ArrowRight,
  Sparkles,
  CreditCard,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FolderCheck,
} from 'lucide-react';
import { formatDateDisplay } from '../utils/helpers';
import { PageBanner } from './PageBanner';

interface HomeHubProps {
  currentUser: UserProfile;
  activePackages: FundingPackage[];
  countSugestoes: number;
  countFinanciamento: number;
  countCatalogo: number;
  countMembros: number;
  countMeusItens?: number;
  onNavigate: (view: AppView) => void;
  onOpenNewItem: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  currentUser,
  activePackages = [],
  countSugestoes,
  countFinanciamento,
  countCatalogo,
  countMembros,
  countMeusItens = 0,
  onNavigate,
}) => {
  const openPackages = activePackages.filter((p) => p.status === 'Financiamento');

  // Identifica financiamentos em processo de pagamento pendentes para o usuário atual
  const pendingPaymentsForUser = openPackages.filter((pkg) => {
    if (pkg.etapaFinanciamento !== 'PAGAMENTO') return false;
    const isParticipant = (pkg.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    );
    if (!isParticipant) return false;
    const paymentInfo = pkg.pagamentos && pkg.pagamentos[currentUser.id];
    return !paymentInfo?.informouPagamento;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col justify-center animate-in fade-in duration-200 space-y-6">
      
      {/* Banner Superior com Arte dos Trolls */}
      <PageBanner
        title="A Ponte dos Trolls"
        subtitle="Central de compras coletivas, vaquinhas e rateios RPG."
      />

      {/* Saudação Compacta */}
      <div className="parchment-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#C6AD78] bg-[#282D13] shrink-0">
            <img
              src="/troll-mascot.png"
              alt="Mascote Troll"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-rpg text-lg sm:text-xl font-bold text-[#302414]">
                Saudações, {currentUser.nome.split(' ')[0]}!
              </h2>
              {currentUser.isMaster && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#384518] text-[#F8EDD5]">
                  Mestre
                </span>
              )}
            </div>
            <p className="text-xs text-[#71634D]">
              Acompanhe as vaquinhas abertas, explore o catálogo com acesso ao Google Drive ou faça novas sugestões de materiais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('financiamento')}
            className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Ver Financiamentos
          </button>
        </div>
      </div>

      {/* Alerta de Pagamento Urgente (se o usuário tiver rateios abertos para pagamento) */}
      {pendingPaymentsForUser.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF6DE] border-2 border-[#D4A538] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A538] text-[#322105] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-rpg text-sm sm:text-base font-bold text-[#322105]">
                Atenção: Você possui {pendingPaymentsForUser.length} rateio{pendingPaymentsForUser.length > 1 ? 's' : ''} em fase de pagamento!
              </h3>
              <p className="text-xs text-[#71634D]">
                {pendingPaymentsForUser.map((p) => p.titulo).join(', ')}. Efetue o Pix e confirme no site para garantir seu acesso ao Drive.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('financiamento')}
            className="px-4 py-2 bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold rounded-xl shrink-0 cursor-pointer shadow-sm"
          >
            Pagar Agora
          </button>
        </div>
      )}

      {/* 4 CARDS PRINCIPAIS DE NAVEGAÇÃO (Fiel ao tema pergaminho) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Sugestões */}
        <button
          onClick={() => onNavigate('sugestoes')}
          className="parchment-card p-5 text-left flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer border-[#C6AD78]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] group-hover:scale-105 transition-transform">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EADBBE] text-[#302414] border border-[#C6AD78]">
                {countSugestoes} sugestões
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#302414] group-hover:text-[#48551F] transition-colors">
                Sugestões
              </h3>
              <p className="text-xs text-[#71634D] mt-1 leading-relaxed">
                Envie novas ideias de materiais e apoie sugestões da comunidade para virarem rateios.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-[#D6C296] flex items-center justify-between text-xs font-bold text-[#48551F]">
            <span>Acessar Sugestões</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 2: Financiamento */}
        <button
          onClick={() => onNavigate('financiamento')}
          className="parchment-card p-5 text-left flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer border-[#C6AD78]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] group-hover:scale-105 transition-transform">
                <Coins className="w-5 h-5" />
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#48551F] text-[#F8EDD5]">
                {countFinanciamento} abertos
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#302414] group-hover:text-[#48551F] transition-colors">
                Financiamentos
              </h3>
              <p className="text-xs text-[#71634D] mt-1 leading-relaxed">
                Vaquinhas ativas em coleta de cotistas ou em processo de pagamento e liberação.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-[#D6C296] flex items-center justify-between text-xs font-bold text-[#48551F]">
            <span>Ver Financiamentos</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 3: Catálogo */}
        <button
          onClick={() => onNavigate('catalogo')}
          className="parchment-card p-5 text-left flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer border-[#C6AD78]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EADBBE] text-[#302414] border border-[#C6AD78]">
                {countCatalogo} pacotes
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#302414] group-hover:text-[#48551F] transition-colors">
                Catálogo
              </h3>
              <p className="text-xs text-[#71634D] mt-1 leading-relaxed">
                Acervo de pacotes finalizados para você acessar suas pastas no Drive ou adquirir pacotes anteriores.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-[#D6C296] flex items-center justify-between text-xs font-bold text-[#48551F]">
            <span>Explorar Acervo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 4: Meus Itens */}
        <button
          onClick={() => onNavigate('meus-itens')}
          className="parchment-card p-5 text-left flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer border-[#C6AD78]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#E3E8D0] border border-[#8F9F5B] flex items-center justify-center text-[#48551F] group-hover:scale-105 transition-transform">
                <FolderCheck className="w-5 h-5" />
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E3E8D0] text-[#282D13] border border-[#8F9F5B]">
                {countMeusItens} {countMeusItens === 1 ? 'adquirido' : 'adquiridos'}
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#302414] group-hover:text-[#48551F] transition-colors">
                Meus Itens
              </h3>
              <p className="text-xs text-[#71634D] mt-1 leading-relaxed">
                Acesse diretamente as pastas do Google Drive com todos os materiais do seu acervo pessoal.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-[#D6C296] flex items-center justify-between text-xs font-bold text-[#48551F]">
            <span>Acessar Meus Itens</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 5: Membros */}
        <button
          onClick={() => onNavigate('membros')}
          className="parchment-card p-5 text-left flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer border-[#C6AD78]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EADBBE] text-[#302414] border border-[#C6AD78]">
                {countMembros} membros
              </span>
            </div>

            <div>
              <h3 className="font-rpg text-lg font-bold text-[#302414] group-hover:text-[#48551F] transition-colors">
                Membros
              </h3>
              <p className="text-xs text-[#71634D] mt-1 leading-relaxed">
                Nossa comunidade de aventureiros, estatísticas de participação e contatos.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-[#D6C296] flex items-center justify-between text-xs font-bold text-[#48551F]">
            <span>Ver Membros</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

      </div>

    </div>
  );
};
