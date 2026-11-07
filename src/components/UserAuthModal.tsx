import React, { useState, useMemo } from 'react';
import { UserProfile, ADMIN_PASSWORD, MASTER_ADMIN_NAME } from '../types';
import { Users, UserPlus, Shield, Mail, Phone, CheckCircle2, Search, KeyRound } from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  users: UserProfile[];
  onSelectExistingUser: (user: UserProfile, updatedEmail?: string) => void;
  onRegisterNewUser: (newUser: Omit<UserProfile, 'id'>) => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  users,
  onSelectExistingUser,
  onRegisterNewUser,
}) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'new' | 'master'>('existing');

  // Tab 1: Existing member
  const [searchMember, setSearchMember] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [existingUserError, setExistingUserError] = useState('');

  // Tab 2: New member
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newError, setNewError] = useState('');

  // Tab 3: Master Admin Mode
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Filtered members for Tab 1
  const filteredUsers = useMemo(() => {
    if (!searchMember.trim()) return users;
    const q = searchMember.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        (u.telefone && u.telefone.toLowerCase().includes(q))
    );
  }, [users, searchMember]);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const handleSelectMember = (userId: string) => {
    setSelectedUserId(userId);
    setExistingUserError('');
    const u = users.find((usr) => usr.id === userId);
    if (u) {
      setExistingUserEmail(u.email || '');
    }
  };

  // Submit Tab 1: Existing member
  const handleExistingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setExistingUserError('Selecione seu nome na lista da Ponte dos Trolls.');
      return;
    }

    const emailToUse = existingUserEmail.trim();
    if (!emailToUse || !emailRegex.test(emailToUse)) {
      setExistingUserError('Por favor, informe um e-mail válido para identificação no grupo.');
      return;
    }

    onSelectExistingUser(selectedUser, emailToUse);
  };

  // Submit Tab 2: New member
  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanPhone = newPhone.trim();
    const cleanEmail = newEmail.trim();

    if (!cleanName || cleanName.length < 3) {
      setNewError('Por favor, informe seu nome completo.');
      return;
    }

    // Se o usuário tentar se cadastrar como "Ponte dos Trolls", direciona para o modo mestre
    if (cleanName.toLowerCase() === MASTER_ADMIN_NAME.toLowerCase()) {
      setActiveTab('master');
      setMasterError('Para acessar como Ponte dos Trolls, digite a senha de Mestre abaixo.');
      return;
    }

    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setNewError('Por favor, informe um número de WhatsApp válido com DDD.');
      return;
    }

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setNewError('Por favor, informe um e-mail válido.');
      return;
    }

    onRegisterNewUser({
      nome: cleanName,
      telefone: cleanPhone,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      isMaster: false,
    });
  };

  // Submit Tab 3: Master Admin Mode
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

    // Autentica como Mestre da Ponte
    onSelectExistingUser(
      {
        id: 'usr-master-admin',
        nome: MASTER_ADMIN_NAME,
        telefone: '(00) 00000-0000',
        email: 'pontedostrolls@gmail.com',
        isMaster: true,
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
            Identificação Obrigatória para Acessar a Central de Rateios RPG
          </p>
        </div>

        {/* 3 Abas */}
        <div className="flex border-b border-[#203625] bg-[#0c150e] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`flex-1 py-3.5 px-2 font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'existing'
                ? 'border-[#d49e2a] text-[#d49e2a] bg-[#16271a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f4ecd8]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membros ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3.5 px-2 font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'new'
                ? 'border-[#d49e2a] text-[#d49e2a] bg-[#16271a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f4ecd8]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Membro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`flex-1 py-3.5 px-2 font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
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
                  1. Localize seu nome na lista da mesa:
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Filtrar por nome ou WhatsApp..."
                    className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                <div className="border border-[#203625] rounded-xl bg-[#0c150e] max-h-48 overflow-y-auto divide-y divide-[#1a2f20]">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#7a8e7d]">
                      Nenhum membro encontrado com este termo.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUserId === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSelectMember(u.id)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? 'bg-[#182c1d] border-l-4 border-l-[#d49e2a]'
                              : 'hover:bg-[#142318]'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-[#f1ede4] flex items-center gap-1.5">
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#d49e2a]" />}
                              <span>{u.nome}</span>
                            </div>
                            <div className="text-[11px] text-[#7a8e7d] flex items-center gap-2 mt-0.5">
                              {u.telefone && <span>{u.telefone}</span>}
                              {u.email ? (
                                <span className="text-[#a4b5a6]">· {u.email}</span>
                              ) : (
                                <span className="text-amber-400/90 italic">· (Requer e-mail)</span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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

              {selectedUser && (
                <div className="space-y-1.5 pt-2 border-t border-[#1f3524] animate-in fade-in">
                  <label className="block text-xs font-semibold text-[#f4ecd8]">
                    2. Confirme seu E-mail para contato e avisos de vaquinha:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={existingUserEmail}
                      onChange={(e) => setExistingUserEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                    />
                  </div>
                  <p className="text-[11px] text-[#7a8e7d]">
                    Membro selecionado: <strong className="text-[#d49e2a]">{selectedUser.nome}</strong>
                  </p>
                </div>
              )}

              {existingUserError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                  {existingUserError}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedUserId}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-black/40 transition-all flex items-center justify-center gap-2 ${
                  selectedUserId
                    ? 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] cursor-pointer'
                    : 'bg-[#1b2f20] text-[#556957] cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Entrar no Sistema</span>
              </button>
            </form>
          )}

          {/* TAB 2: Primeiro Cadastro (Novo Membro) */}
          {activeTab === 'new' && (
            <form onSubmit={handleNewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                  Nome Completo:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Pedro Henrique"
                  className="w-full px-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                  WhatsApp com DDD:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => handlePhoneMask(e.target.value, setNewPhone)}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                  E-mail:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>
              </div>

              {newError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                  {newError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar e Entrar</span>
              </button>
            </form>
          )}

          {/* TAB 3: Modo Mestre (Admin) */}
          {activeTab === 'master' && (
            <form onSubmit={handleMasterSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#1a2f20] border border-[#d49e2a]/40 text-xs text-[#f4ecd8] flex items-start gap-2.5">
                <Shield className="w-5 h-5 text-[#d49e2a] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#d49e2a] block">Privilégios de Administrador Mestre:</strong>
                  <span>
                    Permite criar e gerenciar Pacotes de Financiamento, mover itens para o Catálogo, gerenciar a lista de membros e disparar boletins para o WhatsApp.
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
                    placeholder="Digite a senha de administrador..."
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
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#d49e2a] to-[#e5b23d] hover:brightness-110 text-[#122015] shadow-lg shadow-black/50 transition-all flex items-center justify-center gap-2"
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
