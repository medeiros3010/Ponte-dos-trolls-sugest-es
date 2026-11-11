import React, { useState, useMemo } from 'react';
import { UserProfile, MASTER_ADMIN_NAME } from '../types';
import { Users, Shield, Phone, CheckCircle2, Search, KeyRound, AlertTriangle, Scroll, Loader2 } from 'lucide-react';
import { apiMasterLogin, apiMemberLogin, getInitialBinId } from '../utils/cloudStorage';
import { signInWithGoogle } from '../firebase/firestoreService';

interface UserAuthModalProps {
  isOpen: boolean;
  users: UserProfile[];
  binId?: string;
  onSelectExistingUser: (user: UserProfile, updatedEmail?: string, updatedPhone?: string) => void;
  onOpenNewMemberApplication?: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  users,
  binId,
  onSelectExistingUser,
  onOpenNewMemberApplication,
}) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'master'>('existing');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab 1: Existing member
  const [searchMember, setSearchMember] = useState('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [existingUserPhone, setExistingUserPhone] = useState('');
  const [existingUserError, setExistingUserError] = useState('');

  // Tab 2: Master Admin Mode
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

  const handleExistingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExistingUserError('');

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

    const matchedUser = candidateUsers.find((candidate) => isPhoneMatch(candidate.telefone)) || candidateUsers[0];

    try {
      setIsLoggingIn(true);
      const effectiveBin = binId || getInitialBinId();
      const res = await apiMemberLogin(matchedUser.id, existingUserPhone.trim(), effectiveBin);
      if (res && res.user) {
        onSelectExistingUser(res.user);
      }
    } catch (err: any) {
      setExistingUserError(err.message || 'Erro ao autenticar membro. Verifique o número digitado.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterError('');

    if (!masterPassword.trim()) {
      setMasterError('Digite a senha do Mestre.');
      return;
    }

    try {
      setIsLoggingIn(true);
      const effectiveBin = binId || getInitialBinId();
      const res = await apiMasterLogin(masterPassword.trim(), effectiveBin);
      if (res && res.user) {
        onSelectExistingUser(res.user);
      }
    } catch (err: any) {
      setMasterError(err.message || 'Senha do Mestre incorreta ou acesso bloqueado.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      setExistingUserError('');
      setMasterError('');
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        const isMasterEmail = fbUser.email === 'pontedostrolls@gmail.com';
        const matched = users.find(
          (u) => (fbUser.email && u.email && u.email.toLowerCase() === fbUser.email.toLowerCase()) || u.id === fbUser.uid
        );
        const userProfile: UserProfile = {
          id: fbUser.uid,
          nome: fbUser.displayName || matched?.nome || (isMasterEmail ? 'Mestre da Ponte' : 'Membro'),
          email: fbUser.email || '',
          telefone: fbUser.phoneNumber || matched?.telefone || '',
          isMaster: isMasterEmail || Boolean(matched?.isMaster),
          status: 'aprovado',
        };
        onSelectExistingUser(userProfile);
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setExistingUserError(err.message || 'Erro ao autenticar com o Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
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

        {/* Botão de Login com Google (Firebase) */}
        <div className="px-5 sm:px-6 pt-4 pb-2 bg-[#F3E5C5] border-b border-[#D6C296]">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-[#C6AD78] font-bold text-xs shadow-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{isLoggingIn ? 'Conectando...' : 'Entrar com Conta Google (Firebase)'}</span>
          </button>
          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-[#D6C296]"></div>
            <span className="px-2 text-[10px] text-[#71634D] uppercase font-bold tracking-wider">ou autenticação manual da mesa</span>
            <div className="flex-1 border-t border-[#D6C296]"></div>
          </div>
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
                disabled={!selectedMemberName || isLoggingIn}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  selectedMemberName && !isLoggingIn
                    ? 'bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] cursor-pointer'
                    : 'bg-[#D4C198] text-[#71634D] cursor-not-allowed opacity-60'
                }`}
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{isLoggingIn ? 'Autenticando...' : 'Entrar na Central'}</span>
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
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{isLoggingIn ? 'Autenticando...' : 'Entrar como Mestre'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
