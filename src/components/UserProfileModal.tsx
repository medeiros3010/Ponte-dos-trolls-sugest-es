import React, { useState, useEffect } from 'react';
import { UserProfile, ItemRPG, FundingPackage } from '../types';
import { X, User, Phone, Mail, Calendar, AlertTriangle, CheckCircle2, Flame, ShoppingBag, ShieldCheck, DollarSign, Save, ArrowRight } from 'lucide-react';
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

  // Estatísticas do Usuário utilizando o ID como referência primária
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

  // Requirement 5: Usar o valor final para pacotes em PAGAMENTO e estimativa durante COLETA
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/70 rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#182d1d] to-[#122015] border-b border-[#203625] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1e3524] border-2 border-[#d49e2a]/60 flex items-center justify-center text-[#d49e2a] font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8] flex items-center gap-2">
                <span>Boas-vindas, {currentUser.nome}!</span>
              </h2>
              <p className="text-[11px] text-[#8a9d8c]">
                Conferência de Cadastro e Painel de Participação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] hover:bg-[#1f3524] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs">
          
          {/* Alerta de Situação de Strikes */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            strikes === 0
              ? 'bg-[#142918] border-emerald-500/40 text-emerald-200'
              : strikes < 3
              ? 'bg-[#29200d] border-amber-500/50 text-amber-200'
              : 'bg-red-950/80 border-red-500 text-red-200'
          }`}>
            <div className="shrink-0 mt-0.5">
              {strikes === 0 ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#f4ecd8]">
                  Situação de Pagamentos e Strikes:
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  strikes === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {strikes}/3 Strikes
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#c7d5c9]">
                {strikes === 0 ? (
                  <span>Sua situação está <strong>100% regular</strong> na mesa! Você não possui nenhum strike registrado.</span>
                ) : (
                  <span>Você possui <strong>{strikes} strike{strikes > 1 ? 's' : ''}</strong> de atraso. Regularize seus pagamentos no prazo para não atingir o limite.</span>
                )}
              </p>
              <p className="text-[10px] text-[#8a9d8c] italic pt-0.5">
                Regra da Mesa: Pagamentos fora do prazo recebem 1 strike. Ao acumular 3 strikes, o membro será removido do grupo de financiamento.
              </p>
            </div>
          </div>

          {/* Dados Cadastrais & Conferência (Requirement 1: Editar meus dados) */}
          <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#d49e2a] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Seus Dados Cadastrais</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-[11px] text-[#6ee7b7] hover:underline cursor-pointer font-semibold"
              >
                {isEditing ? 'Cancelar Edição' : 'Editar meus dados'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveContactInfo} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] text-[#8a9d8c] mb-1 font-semibold">
                    Nome Completo / Apelido *:
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="Seu nome ou apelido de jogo"
                    className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                  {nameError && (
                    <p className="text-[10px] text-red-400 mt-1 font-medium">{nameError}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#8a9d8c] mb-1 font-semibold">
                      WhatsApp / Celular (Sua Senha) *:
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneMask(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#d49e2a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#8a9d8c] mb-1 font-semibold">
                      E-mail para avisos:
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-xs rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Dados Atualizados</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-[#122015] border border-[#1f3524]">
                  <span className="text-[10px] text-[#7a8e7d] block font-semibold">Nome Cadastrado:</span>
                  <span className="font-bold text-[#f4ecd8] truncate block">{currentUser.nome}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#122015] border border-[#1f3524]">
                  <span className="text-[10px] text-[#7a8e7d] block font-semibold">WhatsApp (Senha):</span>
                  <span className="font-bold text-[#d49e2a] block">{currentUser.telefone || 'Não informado'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#122015] border border-[#1f3524]">
                  <span className="text-[10px] text-[#7a8e7d] block font-semibold">E-mail:</span>
                  <span className="font-bold text-[#a4b5a6] truncate block">{currentUser.email || 'Não informado'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Painel de Estatísticas Pessoais */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-[#d49e2a] uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Suas Estatísticas na Ponte dos Trolls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0c150e] border border-[#203625]">
                <span className="text-[10px] text-[#7a8e7d] uppercase font-semibold block">Vaquinhas em Andamento</span>
                <span className="font-rpg text-xl font-bold text-[#fbbf24] flex items-center gap-1 mt-1">
                  <Flame className="w-4 h-4 text-[#d49e2a]" />
                  <span>{myActivePackages.length} ativas</span>
                </span>
                <span className="text-[10px] text-[#8a9d8c] block mt-1">
                  Compromisso: ~ R$ {totalCommittedBRL.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Requirement 1: Cartão clicável Acervo Disponível */}
              <button
                type="button"
                onClick={handleAcervoClick}
                className="p-3.5 rounded-2xl bg-[#0c150e] border border-[#203625] hover:border-emerald-500/60 hover:bg-[#102014] text-left transition-all duration-150 group cursor-pointer shadow-sm hover:shadow-emerald-950/30"
                title="Clique para abrir o Catálogo com os pacotes do seu acervo"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#7a8e7d] group-hover:text-emerald-300 uppercase font-semibold block transition-colors">
                    Acervo Disponível
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="font-rpg text-xl font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{myCatalogPackages.length} pacotes</span>
                </span>
                <span className="text-[10px] text-emerald-400/80 group-hover:text-emerald-300 block mt-1 underline underline-offset-2">
                  Clique para ver seu acervo no Catálogo →
                </span>
              </button>

              <div className="p-3.5 rounded-2xl bg-[#0c150e] border border-[#203625]">
                <span className="text-[10px] text-[#7a8e7d] uppercase font-semibold block">Sugestões Apoiadas</span>
                <span className="font-rpg text-xl font-bold text-[#6ee7b7] flex items-center gap-1 mt-1">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{mySupportedItems.length} ideias</span>
                </span>
                <span className="text-[10px] text-[#8a9d8c] block mt-1">
                  Aguardando rateio oficial
                </span>
              </div>
            </div>
          </div>

          {/* Lista das Vaquinhas Ativas com distinção de valor cobrado vs estimativa (Requirement 5) */}
          {myActivePackages.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] space-y-2.5">
              <span className="font-bold text-xs text-[#f4ecd8] block">
                Vaquinhas ativas com seu nome confirmado ({myActivePackages.length}):
              </span>
              <div className="divide-y divide-[#1a2f20]">
                {myActivePackages.map((pkg) => {
                  const isPagamento = pkg.etapaFinanciamento === 'PAGAMENTO';
                  const valorExato = isPagamento && typeof pkg.valorFinalPorParticipante === 'number'
                    ? pkg.valorFinalPorParticipante
                    : (pkg.valorMaximoPorPessoa || (pkg.valorTotalBRL / (pkg.minimoParticipantes || 1)));

                  return (
                    <div key={pkg.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#f4ecd8]">{pkg.titulo}</span>
                          {isPagamento ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Etapa de Pagamento
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Coleta de Membros
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#7a8e7d] block">
                          Prazo Pagamento: {formatDateDisplay(pkg.dataPagamento)} · Cotistas: {pkg.apoiadores.length}/{pkg.minimoParticipantes}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#8a9d8c] block">
                          {isPagamento ? 'Valor Cobrado:' : 'Estimativa Máxima:'}
                        </span>
                        <span className="font-mono font-bold text-sm text-[#d49e2a]">
                          R$ {valorExato.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão de Conclusão de Grande Destaque (Requirement 1) */}
          <div className="pt-4 border-t border-[#1f3524] flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-w-[280px] px-8 py-3.5 font-rpg text-sm sm:text-base font-bold rounded-2xl bg-gradient-to-r from-[#d49e2a] via-[#e5b23d] to-[#d49e2a] hover:from-[#e5b23d] hover:to-[#f3c85f] text-[#122015] shadow-xl shadow-amber-950/50 hover:shadow-amber-900/60 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center"
            >
              Confirmar e Acessar a Central
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
