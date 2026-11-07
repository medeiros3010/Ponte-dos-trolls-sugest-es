import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import { Users, UserPlus, ShieldCheck, Mail, Phone, CheckCircle2, Search } from 'lucide-react';

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
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');

  // Tab 1 state: Existing user
  const [searchMember, setSearchMember] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [existingUserError, setExistingUserError] = useState('');

  // Tab 2 state: New user
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newError, setNewError] = useState('');

  // Phone mask helper
  const handlePhoneMask = (val: string, setter: (v: string) => void) => {
    let digits = val.replace(/\D/g, '').substring(0, 11);
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

  // Submit Tab 1
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

  // Submit Tab 2
  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanPhone = newPhone.trim();
    const cleanEmail = newEmail.trim();

    if (!cleanName || cleanName.length < 3) {
      setNewError('Por favor, informe seu nome completo.');
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
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/60 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        
        {/* Header com Avatar Troll */}
        <div className="p-6 bg-gradient-to-b from-[#182d1d] to-[#122015] border-b border-[#203625] text-center relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d49e2a] shadow-lg shadow-black/60 mx-auto mb-3 bg-[#16271a]">
            <img
              src="/assets/aistudio/image_95654294.png"
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

        {/* Abas */}
        <div className="flex border-b border-[#203625] bg-[#0c150e] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`flex-1 py-3.5 px-3 font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'existing'
                ? 'border-[#d49e2a] text-[#d49e2a] bg-[#16271a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f4ecd8]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Já sou Membro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3.5 px-3 font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'new'
                ? 'border-[#d49e2a] text-[#d49e2a] bg-[#16271a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f4ecd8]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Primeiro Cadastro</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 sm:p-6 text-xs overflow-y-auto max-h-[70vh]">
          
          {/* TAB 1: Já sou Membro */}
          {activeTab === 'existing' && (
            <form onSubmit={handleExistingSubmit} className="space-y-4">
              <div className="p-3 bg-[#0c150e] border border-[#1e3422] rounded-xl text-[#9cb09e] text-[11px] leading-relaxed">
                Selecione o seu nome na lista da planilha oficial. Se for o seu primeiro acesso após a migração, informe seu e-mail para validar.
              </div>

              {/* Busca / Filtro de Membros */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#556957] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar seu nome na lista..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full bg-[#0c150e] border border-[#1e3422] rounded-xl pl-9 pr-3 py-2 text-xs text-[#f4ecd8] placeholder-[#556957] focus:outline-none focus:border-[#d49e2a]"
                />
              </div>

              {/* Lista Selecionável */}
              <div>
                <label className="block font-semibold text-[#c2cbbe] mb-1">
                  Seu Nome na Lista ({filteredUsers.length} membros):
                </label>
                <div className="max-h-40 overflow-y-auto bg-[#0c150e] border border-[#1e3422] rounded-xl p-1.5 space-y-1">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center py-4 text-[#7a8e7d] italic text-[11px]">
                      Nenhum membro encontrado com esse nome. Mude para a aba "Primeiro Cadastro".
                    </p>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUserId === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectMember(u.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-[#1e3422] text-[#d49e2a] font-bold border border-[#d49e2a]/40'
                              : 'text-[#e6decb] hover:bg-[#16271a]'
                          }`}
                        >
                          <div className="truncate">
                            <span>{u.nome}</span>
                            {u.telefone && (
                              <span className="block text-[10px] text-[#7a8e7d] font-mono">
                                {u.telefone}
                              </span>
                            )}
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#d49e2a] shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Se o membro foi selecionado: campo obrigatório de e-mail */}
              {selectedUser && (
                <div className="p-3 bg-[#16271a] border border-[#27442d] rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-[#d49e2a] font-bold text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Confirmar / Completar E-mail:</span>
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={existingUserEmail}
                    onChange={(e) => {
                      setExistingUserEmail(e.target.value);
                      setExistingUserError('');
                    }}
                    className="w-full bg-[#0c150e] border border-[#1e3422] rounded-xl px-3 py-2 text-xs text-[#f4ecd8] focus:outline-none focus:border-[#d49e2a]"
                  />
                  <p className="text-[10px] text-[#8a9d8c]">
                    O e-mail será vinculado ao seu perfil para confirmação de apoios e avisos de entrega.
                  </p>
                </div>
              )}

              {existingUserError && (
                <p className="text-xs text-[#ef4444] font-semibold bg-[#2b1414] p-2 rounded-lg border border-[#7f1d1d]">
                  {existingUserError}
                </p>
              )}

              <button
                type="submit"
                disabled={!selectedUser}
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Entrar no Sistema</span>
              </button>
            </form>
          )}

          {/* TAB 2: Primeiro Cadastro (Novo Membro) */}
          {activeTab === 'new' && (
            <form onSubmit={handleNewSubmit} className="space-y-3.5">
              <div className="p-3 bg-[#0c150e] border border-[#1e3422] rounded-xl text-[#9cb09e] text-[11px] leading-relaxed">
                Preencha os 3 dados oficiais de entrada do grupo do WhatsApp para ser registrado na nuvem da Ponte dos Trolls.
              </div>

              <div>
                <label className="block font-semibold text-[#c2cbbe] mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setNewError('');
                  }}
                  className="w-full bg-[#0c150e] border border-[#1e3422] rounded-xl px-3 py-2 text-xs text-[#f4ecd8] focus:outline-none focus:border-[#d49e2a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#c2cbbe] mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#d49e2a]" />
                  <span>Número de Telefone / WhatsApp *</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={newPhone}
                  onChange={(e) => {
                    handlePhoneMask(e.target.value, setNewPhone);
                    setNewError('');
                  }}
                  className="w-full bg-[#0c150e] border border-[#1e3422] rounded-xl px-3 py-2 text-xs text-[#f4ecd8] font-mono focus:outline-none focus:border-[#d49e2a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#c2cbbe] mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#d49e2a]" />
                  <span>E-mail *</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setNewError('');
                  }}
                  className="w-full bg-[#0c150e] border border-[#1e3422] rounded-xl px-3 py-2 text-xs text-[#f4ecd8] focus:outline-none focus:border-[#d49e2a]"
                />
              </div>

              {newError && (
                <p className="text-xs text-[#ef4444] font-semibold bg-[#2b1414] p-2 rounded-lg border border-[#7f1d1d]">
                  {newError}
                </p>
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

        </div>

      </div>
    </div>
  );
};
