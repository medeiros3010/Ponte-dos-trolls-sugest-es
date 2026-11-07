import React, { useState, useMemo } from 'react';
import { UserProfile, ADMIN_PASSWORD, MASTER_ADMIN_NAME } from '../types';
import { Users, Shield, Phone, CheckCircle2, Search, KeyRound, AlertTriangle } from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  users: UserProfile[];
  onSelectExistingUser: (user: UserProfile, updatedEmail?: string, updatedPhone?: string) => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  users,
  onSelectExistingUser,
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

  // Filtered unique members: ONLY unique names in alphabetical order (pt-BR)
  // CRITICAL: We NEVER display phone numbers here to protect user secret passwords!
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

  // Candidates with the selected name (handles duplicate names automatically)
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

  // Submit Tab 1: Existing member with intelligent phone matching
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

    // Helper: matches if numbers are identical OR if the last 8 digits match
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

    // Find which candidate user matches the entered phone (solves duplicates like "Matheus")
    const matchedUser = candidateUsers.find((candidate) => isPhoneMatch(candidate.telefone));

    if (matchedUser) {
      onSelectExistingUser(matchedUser);
      return;
    }

    // Fallback: If only 1 candidate exists and didn't have phone saved yet
    if (candidateUsers.length === 1 && !(candidateUsers[0].telefone || '').replace(/\D/g, '')) {
      onSelectExistingUser(candidateUsers[0], candidateUsers[0].email, existingUserPhone.trim());
      return;
    }

    setExistingUserError(
      'Número de celular incorreto para este membro! O celular cadastrado funciona como sua senha secreta.'
    );
  };

  // Submit Tab 2: Master Admin Mode
  const handleMasterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = masterName.trim();
    if (cleanName.toLowerCase() !== MASTER_ADMIN_NAME.toLowerCase()) {
      setMasterError(`O nome de administrador deve ser exatamente "${MASTER_ADMIN_NAME}".`);
      return;
    }

    if (masterPassword !== ADMIN_PASSWORD) {
      setMasterError('Senha de Administrador incorreta! Acesso negado.');
      return;
    }

    onSelectExistingUser(
      {
        id: 'usr-master-admin',
        nome: MASTER_ADMIN_NAME,
        telefone: '(19) 98151-2030',
        email: 'pontedostrolls@gmail.com',
        isMaster: true,
        status: 'aprovado',
      },
      'pontedostrolls@gmail.com'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/60 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        
        {/* Header com Avatar Troll */}
        <div className="p-6 bg-gradient-to-b from-[#182d1d] to-[#122015] border-b border-[#203625] text-center relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d49e2a] shadow-lg shadow-black/60 mx-auto mb-3 bg-[#16271a]">
            <img
              src="/troll-mascot.png"
              alt="A Ponte dos Trolls"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="font-rpg text-xl sm:text-2xl font-bold tracking-wide text-[#f4ecd8]">
            A Ponte dos Trolls
          </h2>
          <p className="text-xs text-[#a4b5a6] mt-1">
            Central de Rateios & Compras Coletivas RPG
          </p>
        </div>

        {/* 2 Abas: Apenas Membro Cadastrado ou Modo Mestre */}
        <div className="flex border-b border-[#203625] bg-[#0c150e] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`flex-1 py-3.5 px-3 font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'existing'
                ? 'border-[#d49e2a] text-[#d49e2a] bg-[#16271a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f4ecd8]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membro Cadastrado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`flex-1 py-3.5 px-3 font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'master'
                ? 'border-[#e5b23d] text-[#e5b23d] bg-[#1d3021]'
                : 'border-transparent text-[#9e8b61] hover:text-[#f4ecd8]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Modo Mestre</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[65vh]">
          {/* TAB 1: Já sou Membro */}
          {activeTab === 'existing' && (
            <form onSubmit={handleExistingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1.5">
                  1. Localize seu Nome na lista de membros:
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Filtrar pelo seu nome..."
                    className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                {/* Lista exibindo ESTRITAMENTE o Nome Completo em Ordem Alfabética (SEM TELEFONES) */}
                <div className="border border-[#203625] rounded-xl bg-[#0c150e] max-h-52 overflow-y-auto divide-y divide-[#1a2f20]">
                  {sortedUniqueMemberNames.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#7a8e7d]">
                      Nenhum membro encontrado com este nome.
                    </div>
                  ) : (
                    sortedUniqueMemberNames.map((name) => {
                      const isSelected = selectedMemberName === name;
                      return (
                        <div
                          key={name}
                          onClick={() => handleSelectMember(name)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? 'bg-[#182c1d] border-l-4 border-l-[#d49e2a]'
                              : 'hover:bg-[#142318]'
                          }`}
                        >
                          <div className="font-semibold text-[#f1ede4] flex items-center gap-2">
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#d49e2a]" />}
                            <span className="text-sm">{name}</span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isSelected
                                ? 'bg-[#d49e2a] text-[#122015]'
                                : 'bg-[#1c3222] text-[#8a9d8c]'
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
                <div className="space-y-3 pt-3 border-t border-[#1f3524] animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-[#f4ecd8] mb-1">
                      2. Digite seu Número de Celular / WhatsApp <span className="text-[#d49e2a]">(Sua Senha)</span>:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={existingUserPhone}
                        onChange={(e) => handlePhoneMask(e.target.value, setExistingUserPhone)}
                        placeholder="(11) 98765-4321"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-[#7a8e7d] mt-1">
                      Digite seu número de WhatsApp/celular cadastrado.
                    </p>
                  </div>

                  <p className="text-xs text-[#a4b5a6] bg-[#142618] p-2.5 rounded-xl border border-[#24462c]">
                    Membro selecionado: <strong className="text-[#d49e2a]">{selectedMemberName}</strong>
                  </p>
                </div>
              )}

              {existingUserError && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{existingUserError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedMemberName}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-black/40 transition-all flex items-center justify-center gap-2 ${
                  selectedMemberName
                    ? 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] cursor-pointer'
                    : 'bg-[#1b2f20] text-[#556957] cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Entrar na Central</span>
              </button>
            </form>
          )}

          {/* TAB 2: Modo Mestre (Admin) */}
          {activeTab === 'master' && (
            <form onSubmit={handleMasterSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#1a2f20] border border-[#d49e2a]/40 text-xs text-[#f4ecd8] flex items-start gap-2.5">
                <Shield className="w-5 h-5 text-[#d49e2a] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#d49e2a] block">Painel Administrativo do Mestre:</strong>
                  <span>
                    Acesso exclusivo para cadastrar membros, gerenciar vaquinhas, catálogo e dados da Ponte dos Trolls.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                  Usuário de Administrador:
                </label>
                <input
                  type="text"
                  required
                  value={masterName}
                  onChange={(e) => setMasterName(e.target.value)}
                  placeholder="Ponte dos Trolls"
                  className="w-full px-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-semibold focus:outline-none focus:border-[#d49e2a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                  Senha do Mestre:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Digite a senha do Mestre..."
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>
              </div>

              {masterError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                  {masterError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#d49e2a] to-[#e5b23d] hover:brightness-110 text-[#122015] shadow-lg shadow-black/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
