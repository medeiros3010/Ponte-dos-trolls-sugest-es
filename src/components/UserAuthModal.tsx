import React, { useState, useMemo } from 'react';
import { UserProfile, ADMIN_PASSWORD, MASTER_ADMIN_NAME } from '../types';
import { Users, Shield, Phone, CheckCircle2, Search, KeyRound, AlertTriangle, Scroll } from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  users: UserProfile[];
  onSelectExistingUser: (user: UserProfile, updatedEmail?: string, updatedPhone?: string) => void;
  onOpenNewMemberApplication?: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  users,
  onSelectExistingUser,
  onOpenNewMemberApplication,
}) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'master'>('existing');

  // Tab 1: Existing member
  const [searchMember, setSearchMember] = useState('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [existingUserPhone, setExistingUserPhone] = useState('');
  const [existingUserError, setExistingUserError] = useState('');

  // Tab 2: Master Admin Mode
  const [masterName, setMasterName] = useState(MASTER_ADMIN_NAME);
  const [masterPassword, setMasterPassword] = useState('');
  const [masterError, setMasterError] = useState('');

  // Phone mask helper
  const handlePhoneMask = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, '').substring(0, 11);
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 6 && digits.length <= 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    setter(formatted);
  };

  const sortedUniqueMemberNames = useMemo(() => {
    const activeMembers = users.filter(
      (u) => u.nome !== MASTER_ADMIN_NAME && u.status !== 'recusado' && u.status !== 'pendente'
    );
    const uniqueNames = Array.from(new Set(activeMembers.map((u) => u.nome.trim()))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );

    if (!searchMember.trim()) return uniqueNames;
    const q = searchMember.toLowerCase().trim();
    return uniqueNames.filter((name) => name.toLowerCase().includes(q));
  }, [users, searchMember]);

  const candidateUsers = useMemo(() => {
    if (!selectedMemberName) return [];
    return users.filter(
      (u) =>
        u.nome.trim().toLowerCase() === selectedMemberName.trim().toLowerCase() &&
        u.status !== 'recusado' &&
        u.status !== 'pendente'
    );
  }, [users, selectedMemberName]);

  const handleSelectMember = (name: string) => {
    setSelectedMemberName(name);
    setExistingUserError('');
    setExistingUserPhone('');
  };

  const handleExistingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberName || candidateUsers.length === 0) {
      setExistingUserError('Selecione seu nome na lista da mesa.');
      return;
    }

    const enteredDigits = existingUserPhone.replace(/\D/g, '');
    if (enteredDigits.length < 8) {
      setExistingUserError('Digite seu número de WhatsApp/celular com DDD para autenticar.');
      return;
    }

    const isPhoneMatch = (storedPhone: string): boolean => {
      const savedDigits = (storedPhone || '').replace(/\D/g, '');
      if (!savedDigits) return false;
      if (enteredDigits === savedDigits) return true;
      if (
        savedDigits.length >= 8 &&
        enteredDigits.length >= 8 &&
        savedDigits.slice(-8) === enteredDigits.slice(-8)
      ) {
        return true;
      }
      return false;
    };

    const matchedUser = candidateUsers.find((candidate) => isPhoneMatch(candidate.telefone));

    if (matchedUser) {
      onSelectExistingUser(matchedUser);
      return;
    }

    if (candidateUsers.length === 1 && !(candidateUsers[0].telefone || '').replace(/\D/g, '')) {
      onSelectExistingUser(candidateUsers[0], candidateUsers[0].email, existingUserPhone.trim());
      return;
    }

    setExistingUserError(
      'Número de celular incorreto para este membro! O celular cadastrado funciona como sua confirmação de acesso.'
    );
  };

  const handleMasterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMasterError('');

    if (masterPassword !== ADMIN_PASSWORD) {
      setMasterError('Senha do Mestre incorreta! Acesso negado.');
      return;
    }

    const existingMaster = users.find((u) => u.isMaster || u.nome === MASTER_ADMIN_NAME);
    if (existingMaster) {
      onSelectExistingUser(existingMaster);
    } else {
      const newMaster: UserProfile = {
        id: 'master-guardiao',
        nome: MASTER_ADMIN_NAME,
        telefone: '(19) 98151-2030',
        email: 'ericksantos500@hotmail.com',
        isMaster: true,
        status: 'aprovado',
        createdAt: new Date().toISOString(),
      };
      onSelectExistingUser(newMaster);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border-[#C6AD78]">
        
        {/* Header com Arte / Logo */}
        <div className="p-6 bg-[#282D13] text-center text-[#F8EDD5] relative border-b border-[#3f471e]">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#C6AD78] shadow-md mx-auto mb-3 bg-[#1e230e]">
            <img
              src="/troll-mascot.png"
              alt="A Ponte dos Trolls"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="font-rpg text-xl sm:text-2xl font-bold tracking-wide text-[#F8EDD5]">
            A Ponte dos Trolls
          </h2>
          <p className="text-xs text-[#cfc4a6] mt-1">
            Central de Rateios & Compras Coletivas RPG
          </p>
        </div>

        {/* 2 Abas: Membro Cadastrado ou Modo Mestre */}
        <div className="flex border-b border-[#D6C296] bg-[#EDE2CA] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`flex-1 py-3 px-3 font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'existing'
                ? 'border-[#48551F] text-[#48551F] bg-[#F8EDD5]'
                : 'border-transparent text-[#71634D] hover:text-[#302414]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membro Cadastrado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`flex-1 py-3 px-3 font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'master'
                ? 'border-[#716016] text-[#716016] bg-[#F8EDD5]'
                : 'border-transparent text-[#71634D] hover:text-[#302414]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Modo Mestre</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[65vh]">
          {/* TAB 1: Membro Cadastrado */}
          {activeTab === 'existing' && (
            <form onSubmit={handleExistingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#71634D] mb-1.5">
                  1. Localize seu Nome na lista de membros:
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-[#71634D] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Filtrar pelo seu nome..."
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                </div>

                {/* Lista em Ordem Alfabética */}
                <div className="border border-[#C6AD78] rounded-xl bg-[#FAF4E6] max-h-52 overflow-y-auto divide-y divide-[#E3D1AC]">
                  {sortedUniqueMemberNames.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#71634D] space-y-1.5">
                      <p>Nenhum membro encontrado com este nome.</p>
                      {onOpenNewMemberApplication && (
                        <button
                          type="button"
                          onClick={onOpenNewMemberApplication}
                          className="text-xs text-[#48551F] font-bold hover:underline cursor-pointer"
                        >
                          É novo por aqui? Solicitar entrada →
                        </button>
                      )}
                    </div>
                  ) : (
                    sortedUniqueMemberNames.map((name) => {
                      const isSelected = selectedMemberName === name;
                      return (
                        <div
                          key={name}
                          onClick={() => handleSelectMember(name)}
                          className={`p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? 'bg-[#EFE2C5] border-l-4 border-l-[#48551F]'
                              : 'hover:bg-[#F3E7CC]'
                          }`}
                        >
                          <div className="font-semibold text-[#302414] flex items-center gap-2">
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#48551F]" />}
                            <span className="text-xs sm:text-sm">{name}</span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isSelected
                                ? 'bg-[#48551F] text-[#F8EDD5]'
                                : 'bg-[#E5DBC1] text-[#71634D]'
                            }`}
                          >
                            {isSelected ? 'Selecionado' : 'Selecionar'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedMemberName && (
                <div className="space-y-3 pt-3 border-t border-[#D6C296] animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-[#302414] mb-1">
                      2. Digite seu Número de Celular / WhatsApp <span className="text-[#48551F]">(Confirmação de Acesso)</span>:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#71634D] absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={existingUserPhone}
                        onChange={(e) => handlePhoneMask(e.target.value, setExistingUserPhone)}
                        placeholder="(11) 98765-4321"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-[#71634D] mt-1">
                      Digite seu número de WhatsApp cadastrado na comunidade.
                    </p>
                  </div>

                  <p className="text-xs text-[#302414] bg-[#FBF4E4] p-2.5 rounded-xl border border-[#D6C296]">
                    Membro selecionado: <strong className="text-[#48551F]">{selectedMemberName}</strong>
                  </p>
                </div>
              )}

              {existingUserError && (
                <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                  <span>{existingUserError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedMemberName}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  selectedMemberName
                    ? 'bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] cursor-pointer'
                    : 'bg-[#D4C198] text-[#71634D] cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Entrar na Central</span>
              </button>

              {/* Botão de Solicitação para Novo Membro */}
              {onOpenNewMemberApplication && (
                <div className="pt-2 border-t border-[#D6C296] text-center space-y-1.5">
                  <button
                    type="button"
                    onClick={onOpenNewMemberApplication}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FAF4E6] hover:bg-[#F3E7CC] border border-[#C6AD78] hover:border-[#48551F] text-xs font-bold text-[#48551F] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
                  >
                    <Scroll className="w-4 h-4 text-[#716016]" />
                    <span>Sou novo — solicitar entrada</span>
                  </button>
                  <p className="text-[11px] text-[#71634D]">
                    Ainda não possui cadastro na mesa? Leia as regras e solicite sua entrada.
                  </p>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: Modo Mestre */}
          {activeTab === 'master' && (
            <form onSubmit={handleMasterSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#EDE2CA] border border-[#C6AD78] text-xs text-[#302414] flex items-start gap-2.5">
                <Shield className="w-5 h-5 text-[#716016] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#716016] block">Painel Administrativo do Mestre:</strong>
                  <span>
                    Acesso exclusivo para cadastrar membros, gerenciar vaquinhas, catálogo e dados da Ponte dos Trolls.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#71634D] mb-1">
                  Usuário de Administrador:
                </label>
                <input
                  type="text"
                  required
                  value={masterName}
                  onChange={(e) => setMasterName(e.target.value)}
                  placeholder="Ponte dos Trolls"
                  className="w-full px-3 py-2.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-semibold focus:outline-none focus:border-[#48551F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#71634D] mb-1">
                  Senha do Mestre:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#71634D] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Digite a senha do Mestre..."
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                </div>
              </div>

              {masterError && (
                <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs">
                  {masterError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4 stroke-[2.5]" />
                <span>Entrar como Mestre da Ponte</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
