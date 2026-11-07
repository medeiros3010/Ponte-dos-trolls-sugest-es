import React, { useState } from 'react';
import { UserProfile, ItemRPG, FundingPackage } from '../types';
import { X, User, Phone, Mail, Calendar, AlertTriangle, CheckCircle2, Flame, ShoppingBag, ShieldCheck, DollarSign, Save } from 'lucide-react';
import { formatDateDisplay } from '../utils/helpers';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  packages: FundingPackage[];
  items: ItemRPG[];
  onUpdateCurrentUser: (updatedUser: UserProfile) => void;
  onToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  packages,
  items,
  onUpdateCurrentUser,
  onToast,
}) => {
  const [phone, setPhone] = useState(currentUser.telefone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  // Estatísticas do Usuário
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
    const updated: UserProfile = {
      ...currentUser,
      telefone: phone.trim(),
      email: email.trim(),
    };
    onUpdateCurrentUser(updated);
    setIsEditing(false);
    onToast('Seus dados cadastrais foram atualizados!');
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

          {/* Dados Cadastrais & Conferência */}
          <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#d49e2a] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Seus Dados Cadastrais</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-[11px] text-[#6ee7b7] hover:underline cursor-pointer"
              >
                {isEditing ? 'Cancelar Edição' : 'Editar Telefone / E-mail'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveContactInfo} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#8a9d8c] mb-1">
                      WhatsApp / Celular (Sua Senha):
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneMask(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#8a9d8c] mb-1">
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
                    className="px-4 py-2 font-bold text-xs rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] flex items-center gap-1.5 cursor-pointer shadow-md"
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

              <div className="p-3.5 rounded-2xl bg-[#0c150e] border border-[#203625]">
                <span className="text-[10px] text-[#7a8e7d] uppercase font-semibold block">Acervo Disponível</span>
                <span className="font-rpg text-xl font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{myCatalogPackages.length} pacotes</span>
                </span>
                <span className="text-[10px] text-[#8a9d8c] block mt-1">
                  Materiais liberados no Drive
                </span>
              </div>

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

          {/* Lista das Vaquinhas Ativas em que está participando */}
          {myActivePackages.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] space-y-2.5">
              <span className="font-bold text-xs text-[#f4ecd8] block">
                Vaquinhas ativas com seu nome confirmado ({myActivePackages.length}):
              </span>
              <div className="divide-y divide-[#1a2f20]">
                {myActivePackages.map((pkg) => {
                  const maxIndividual = pkg.valorMaximoPorPessoa || (pkg.valorTotalBRL / (pkg.minimoParticipantes || 1));
                  return (
                    <div key={pkg.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#f4ecd8] block">{pkg.titulo}</span>
                        <span className="text-[10px] text-[#7a8e7d]">
                          Prazo Pagamento: {formatDateDisplay(pkg.dataPagamento)} · Cotistas: {pkg.apoiadores.length}/{pkg.minimoParticipantes}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#d49e2a]">
                        Máx: R$ {maxIndividual.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão de Conclusão */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 font-bold text-xs sm:text-sm rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all cursor-pointer"
            >
              Confirmar e Acessar a Central
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
