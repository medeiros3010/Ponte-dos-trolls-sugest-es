import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import { Users, UserPlus, Trash2, Search, X, Shield, Phone, Mail, Calendar, AlertTriangle, Check, Plus, Minus, UserCheck } from 'lucide-react';
import { formatDateDisplay } from '../utils/helpers';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  onAddUser: (newUser: Omit<UserProfile, 'id'>) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onToast: (msg: string) => void;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Novo Membro Form State (Sempre visível no topo conforme especificação)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDataEntrada, setNewDataEntrada] = useState(() => new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const activeMembers = useMemo(() => {
    return users.filter((u) => !u.isMaster);
  }, [users]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return activeMembers;
    const q = searchTerm.toLowerCase().trim();
    return activeMembers.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        (u.telefone && u.telefone.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [activeMembers, searchTerm]);

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
    setNewPhone(formatted);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim().length < 3) {
      setFormError('Informe o nome completo do membro.');
      return;
    }
    if (!newPhone.trim() || newPhone.replace(/\D/g, '').length < 10) {
      setFormError('Informe um WhatsApp válido com DDD (será a senha do membro).');
      return;
    }

    onAddUser({
      nome: newName.trim(),
      email: newEmail.trim(),
      telefone: newPhone.trim(),
      dataEntrada: newDataEntrada || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      strikes: 0,
      isMaster: false,
      status: 'aprovado',
    });

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewDataEntrada(new Date().toISOString().split('T')[0]);
    setFormError('');
    onToast(`Membro "${newName.trim()}" cadastrado e ativado com sucesso!`);
  };

  const handleAdjustStrikes = (user: UserProfile, delta: number) => {
    const currentStrikes = Array.isArray(user.strikes) ? user.strikes.length : (user.strikes || 0);
    const newStrikes = Math.max(0, Math.min(3, currentStrikes + delta));
    if (newStrikes === currentStrikes) return;

    onUpdateUser({
      ...user,
      strikes: newStrikes,
    });

    if (delta > 0) {
      onToast(`⚠️ 1 strike adicionado para ${user.nome} (Total: ${newStrikes}/3 strikes).`);
    } else {
      onToast(`Strike removido de ${user.nome} (Total: ${newStrikes}/3 strikes).`);
    }
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;

    if (!deletePassword.trim()) {
      setDeleteError('A senha do Mestre é necessária para confirmar a exclusão.');
      return;
    }

    onDeleteUser(userToDelete.id);
    onToast(`Membro "${userToDelete.nome}" removido da mesa.`);
    setUserToDelete(null);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleCopyPhoneList = () => {
    const list = activeMembers
      .filter((u) => u.telefone && u.telefone.trim())
      .map((u) => `${u.nome}: ${u.telefone}`)
      .join('\n');
    navigator.clipboard.writeText(list);
    onToast('Lista de contatos copiada!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5] flex items-center gap-2">
                <span>Gerenciar Membros da Mesa</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#3a4419] text-[#F8EDD5] border border-[#C6AD78]/40">
                  {activeMembers.length} membros
                </span>
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Cadastro exclusivo pelo Mestre, controle de contatos e strikes de pagamento
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
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-6 text-xs text-[#302414]">
          
          {/* 1. FORMULÁRIO: + CADASTRAR NOVO MEMBRO (Exclusivo Mestre) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-[#716016] uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#716016]" />
                <span>+ Cadastrar Novo Membro</span>
              </h3>
              <span className="text-[10px] text-[#71634D] bg-[#EDE2CA] px-2 py-0.5 rounded border border-[#D5C49F]">
                Ativação Imediata
              </span>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302414] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Pedro Henrique"
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#302414] mb-1">
                    Telefone/WhatsApp (Senha) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => handlePhoneMask(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#302414] mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="pedro@exemplo.com"
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#302414] mb-1">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    required
                    value={newDataEntrada}
                    onChange={(e) => setNewDataEntrada(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-[#8b261b] font-semibold">{formError}</p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-xs rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Salvar e Ativar Membro</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2. Barra de Busca e Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#71634D] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar membro na mesa..."
                className="w-full pl-9 pr-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyPhoneList}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-[#302414] flex items-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto justify-center"
              title="Copiar lista de contatos para transmissão no WhatsApp"
            >
              <Phone className="w-3.5 h-3.5 text-[#716016]" />
              <span>Copiar Contatos WhatsApp</span>
            </button>
          </div>

          {/* 3. Lista de Membros com Gerenciamento de Strikes */}
          <div className="border border-[#D6C296] rounded-2xl bg-[#FBF4E4] overflow-hidden divide-y divide-[#E3D1AC]">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71634D]">
                Nenhum membro encontrado com este termo.
              </div>
            ) : (
              filteredMembers.map((u) => {
                const strikesCount = Array.isArray(u.strikes) ? u.strikes.length : (u.strikes || 0);
                return (
                  <div
                    key={u.id}
                    className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8EDD5] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-xs sm:text-sm text-[#302414] flex items-center gap-2">
                        <span>{u.nome}</span>
                        {strikesCount === 0 ? (
                          <span className="text-[10px] bg-[#dbe6c2] text-[#354817] border border-[#8ea259] px-1.5 py-0.5 rounded font-bold">
                            Regular (0 strikes)
                          </span>
                        ) : strikesCount < 3 ? (
                          <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                            <span>{strikesCount}/3 Strikes</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444] px-1.5 py-0.5 rounded font-bold animate-pulse">
                            ⚠️ 3 Strikes (Limite Atingido)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#71634D]">
                        <span className="text-[#302414] flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-[#716016]" />
                          {u.telefone || 'Sem telefone'}
                        </span>
                        {u.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#71634D]" />
                            {u.email}
                          </span>
                        )}
                        {(u.dataEntrada || u.createdAt) && (
                          <span className="text-[#71634D] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Entrada: {formatDateDisplay(u.dataEntrada || u.createdAt?.split('T')[0])}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controles de Strikes & Exclusão */}
                    <div className="flex items-center gap-3">
                      {/* Painel de Strikes */}
                      <div className="flex items-center gap-1.5 bg-[#FAF4E6] px-2 py-1 rounded-xl border border-[#C6AD78]">
                        <span className="text-[10px] text-[#71634D] font-semibold mr-1">Strikes:</span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStrikes(u, -1)}
                          disabled={strikesCount === 0}
                          className="w-5 h-5 rounded flex items-center justify-center bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Remover 1 strike"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`font-mono font-bold text-xs px-1 ${
                          strikesCount === 0 ? 'text-[#48551F]' : strikesCount < 3 ? 'text-[#B45309]' : 'text-[#8b261b]'
                        }`}>
                          {strikesCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStrikes(u, 1)}
                          disabled={strikesCount >= 3}
                          className="w-5 h-5 rounded flex items-center justify-center bg-[#EADBBE] hover:bg-[#FEE2E2] text-[#302414] hover:text-[#8b261b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Adicionar 1 strike por atraso de pagamento"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(u);
                          setDeletePassword('');
                          setDeleteError('');
                        }}
                        className="p-1.5 rounded-lg text-[#71634D] hover:text-[#8b261b] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                        title="Remover membro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Modal Confirmação de Exclusão com Senha */}
        {userToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-sm">
            <div className="parchment-card border-2 border-[#8b261b]/60 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
              <div className="flex items-center gap-2 text-[#8b261b]">
                <Trash2 className="w-5 h-5" />
                <h4 className="font-bold text-sm text-[#302414]">Excluir Membro da Mesa</h4>
              </div>
              <p className="text-xs text-[#71634D]">
                Tem certeza que deseja remover <strong className="text-[#302414]">{userToDelete.nome}</strong> da lista?
              </p>
              <form onSubmit={handleConfirmDelete} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] text-[#71634D] mb-1">
                    Senha do Mestre para confirmar:
                  </label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Ponte#dos#trolls"
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#8b261b]"
                    autoFocus
                  />
                </div>
                {deleteError && (
                  <p className="text-xs text-[#8b261b]">{deleteError}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    className="px-3 py-1.5 text-xs text-[#71634D] hover:text-[#302414] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#8b261b] hover:bg-[#a12e20] text-white cursor-pointer"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
