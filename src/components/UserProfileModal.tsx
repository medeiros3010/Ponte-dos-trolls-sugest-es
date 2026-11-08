import React, { useState, useEffect } from 'react';
import { UserProfile, ItemRPG, FundingPackage } from '../types';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ShoppingBag,
  ShieldCheck,
  DollarSign,
  Save,
  ArrowRight,
  Package,
} from 'lucide-react';
import { formatDateDisplay } from '../utils/helpers';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  packages: FundingPackage[];
  items: ItemRPG[];
  onUpdateCurrentUser: (updatedUser: UserProfile) => void;
  onOpenMyAcervo: () => void;
  onToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  packages,
  items,
  onUpdateCurrentUser,
  onOpenMyAcervo,
  onToast,
}) => {
  const [nome, setNome] = useState(currentUser.nome || '');
  const [phone, setPhone] = useState(currentUser.telefone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNome(currentUser.nome || '');
      setPhone(currentUser.telefone || '');
      setEmail(currentUser.email || '');
      setIsEditing(false);
      setNameError('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const myPackages = packages.filter((pkg) =>
    (pkg.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    )
  );

  const myActivePackages = myPackages.filter((p) => p.status === 'Financiamento');
  const myCatalogPackages = myPackages.filter((p) => p.status === 'Catálogo');

  const mySupportedItems = items.filter((it) =>
    (it.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    )
  );

  const totalCommittedBRL = myActivePackages.reduce((acc, p) => {
    if (p.etapaFinanciamento === 'PAGAMENTO' && typeof p.valorFinalPorParticipante === 'number') {
      return acc + p.valorFinalPorParticipante;
    }
    const val = p.valorMaximoPorPessoa || (p.valorTotalBRL / (p.minimoParticipantes || 1));
    return acc + val;
  }, 0);

  const strikes = Array.isArray(currentUser.strikes) ? currentUser.strikes.length : (currentUser.strikes || 0);

  const handlePhoneMask = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 11);
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 6 && digits.length <= 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const handleSaveContactInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNome = nome.trim();
    if (!cleanNome) {
      setNameError('O nome é obrigatório e não pode conter apenas espaços.');
      return;
    }

    const updated: UserProfile = {
      ...currentUser,
      nome: cleanNome,
      telefone: phone.trim(),
      email: email.trim(),
    };

    onUpdateCurrentUser(updated);
    setIsEditing(false);
    setNameError('');
    onToast('Seus dados cadastrais foram atualizados com sucesso!');
  };

  const handleAcervoClick = () => {
    onClose();
    onOpenMyAcervo();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header em Verde-Oliva Escuro */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5] font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5] flex items-center gap-2">
                <span>Boas-vindas, {currentUser.nome}!</span>
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Conferência de Cadastro e Painel de Participação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs text-[#302414]">
          
          {/* Card 1: Dados Cadastrais com Botão Editar */}
          <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D6C296] pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#716016] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#48551F]" />
                <span>Seus Dados de Contato na Mesa</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-2.5 py-1 rounded-lg bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] font-semibold text-[11px] border border-[#C6AD78] cursor-pointer"
              >
                {isEditing ? 'Cancelar Edição' : '✏️ Editar Contato'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveContactInfo} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-[#302414] mb-1">
                    Nome Completo:
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      setNameError('');
                    }}
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                  {nameError && <p className="text-[11px] text-[#8b261b] mt-1">{nameError}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#302414] mb-1">
                      WhatsApp / Celular:
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneMask(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#302414] mb-1">
                      E-mail Google Drive:
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@gmail.com"
                      className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-xs rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Dados Atualizados</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F8EDD5] border border-[#D6C296]">
                  <span className="text-[10px] text-[#71634D] block font-semibold">Nome Cadastrado:</span>
                  <span className="font-bold text-[#302414] truncate block">{currentUser.nome}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8EDD5] border border-[#D6C296]">
                  <span className="text-[10px] text-[#71634D] block font-semibold">WhatsApp (Senha):</span>
                  <span className="font-bold text-[#48551F] block">{currentUser.telefone || 'Não informado'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8EDD5] border border-[#D6C296]">
                  <span className="text-[10px] text-[#71634D] block font-semibold">E-mail Drive:</span>
                  <span className="font-bold text-[#302414] truncate block">{currentUser.email || 'Não informado'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Painel de Estatísticas Pessoais */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-[#716016] uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Suas Estatísticas na Ponte dos Trolls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vaquinhas em Andamento */}
              <div className="p-3.5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296]">
                <span className="text-[10px] text-[#71634D] uppercase font-semibold block">Vaquinhas em Andamento</span>
                <span className="font-rpg text-xl font-bold text-[#48551F] flex items-center gap-1 mt-1">
                  <Flame className="w-4 h-4 text-[#716016]" />
                  <span>{myActivePackages.length} ativas</span>
                </span>
                <span className="text-[10px] text-[#71634D] block mt-1">
                  Compromisso: ~ R$ {totalCommittedBRL.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Atalho Clicável: Acervo Disponível */}
              <button
                type="button"
                onClick={handleAcervoClick}
                className="p-3.5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] hover:border-[#48551F] text-left transition-all group cursor-pointer shadow-sm"
                title="Clique para abrir o Catálogo com os pacotes do seu acervo"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#71634D] group-hover:text-[#48551F] uppercase font-semibold block transition-colors">
                    Acervo Disponível
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#48551F] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="font-rpg text-xl font-bold text-[#48551F] flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-[#48551F]" />
                  <span>{myCatalogPackages.length} pacotes</span>
                </span>
                <span className="text-[10px] text-[#48551F] block mt-1 underline underline-offset-2">
                  Clique para ver seu acervo no Catálogo →
                </span>
              </button>

              {/* Sugestões Apoiadas */}
              <div className="p-3.5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296]">
                <span className="text-[10px] text-[#71634D] uppercase font-semibold block">Sugestões Apoiadas</span>
                <span className="font-rpg text-xl font-bold text-[#716016] flex items-center gap-1 mt-1">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{mySupportedItems.length} ideias</span>
                </span>
                <span className="text-[10px] text-[#71634D] block mt-1">
                  Aguardando rateio oficial
                </span>
              </div>
            </div>
          </div>

          {/* Lista das Vaquinhas Ativas do Usuário */}
          {myActivePackages.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] space-y-2.5">
              <span className="font-bold text-xs text-[#302414] block">
                Vaquinhas ativas com seu nome confirmado ({myActivePackages.length}):
              </span>
              <div className="divide-y divide-[#E3D1AC]">
                {myActivePackages.map((pkg) => {
                  const isPagamento = pkg.etapaFinanciamento === 'PAGAMENTO';
                  const valorExato = isPagamento && typeof pkg.valorFinalPorParticipante === 'number'
                    ? pkg.valorFinalPorParticipante
                    : (pkg.valorMaximoPorPessoa || (pkg.valorTotalBRL / (pkg.minimoParticipantes || 1)));

                  return (
                    <div key={pkg.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#302414]">{pkg.titulo}</span>
                          {isPagamento ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#fae8b4] text-[#875508] border border-[#e3c578]">
                              Etapa de Pagamento
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#dbe9c8] text-[#2f5c1a] border border-[#a4cb88]">
                              Coleta de Membros
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#71634D] block">
                          Prazo Pagamento: {formatDateDisplay(pkg.dataPagamento)} · Cotistas: {pkg.apoiadores.length}/{pkg.minimoParticipantes}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#71634D] block">
                          {isPagamento ? 'Valor Cobrado:' : 'Estimativa Máxima:'}
                        </span>
                        <span className="font-mono font-bold text-sm text-[#302414]">
                          R$ {valorExato.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão de Conclusão Grande e Centralizado (Fiel à Instrução) */}
          <div className="pt-4 border-t border-[#D6C296] flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-w-[280px] px-8 py-3.5 font-rpg text-sm sm:text-base font-bold rounded-2xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center"
            >
              Confirmar e Acessar a Central
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
