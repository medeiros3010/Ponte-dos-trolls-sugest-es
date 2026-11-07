import React, { useState, useMemo } from 'react';
import { UserProfile, ADMIN_PASSWORD } from '../types';
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

    if (deletePassword !== ADMIN_PASSWORD) {
      setDeleteError('Senha de administrador incorreta!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/60 rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#182d1d] to-[#122015] border-b border-[#203625] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f3524] border border-[#d49e2a]/40 flex items-center justify-center text-[#d49e2a]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-lg font-bold text-[#f4ecd8] flex items-center gap-2">
                <span>Gerenciar Membros da Mesa</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#1e3422] text-[#d49e2a] border border-[#d49e2a]/30">
                  {activeMembers.length} membros
                </span>
              </h2>
              <p className="text-[11px] text-[#8a9d8c]">
                Cadastro exclusivo pelo Mestre, controle de contatos e strikes de pagamento
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
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-6 text-xs">
          
          {/* 1. FORMULÁRIO CLARO NO TOPO: + CADASTRAR NOVO MEMBRO (Exclusivo Mestre) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c150e] border-2 border-[#d49e2a]/50 shadow-md space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-[#d49e2a] uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#d49e2a]" />
                <span>+ Cadastrar Novo Membro</span>
              </h3>
              <span className="text-[10px] text-[#8a9d8c] bg-[#16271a] px-2 py-0.5 rounded border border-[#203625]">
                Ativação Imediata
              </span>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Pedro Henrique"
                    className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1">
                    Telefone/WhatsApp (Senha) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => handlePhoneMask(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="pedro@exemplo.com"
                    className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    required
                    value={newDataEntrada}
                    onChange={(e) => setNewDataEntrada(e.target.value)}
                    className="w-full px-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400 font-semibold">{formError}</p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-xs rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
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
              <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar membro na mesa..."
                className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyPhoneList}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#16271a] hover:bg-[#1f3724] border border-[#2e5035] text-[#d49e2a] flex items-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto justify-center"
              title="Copiar lista de contatos para transmissão no WhatsApp"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Copiar Contatos WhatsApp</span>
            </button>
          </div>

          {/* 3. Lista de Membros com Gerenciamento de Strikes */}
          <div className="border border-[#203625] rounded-2xl bg-[#0c150e] overflow-hidden divide-y divide-[#1a2f20]">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7a8e7d]">
                Nenhum membro encontrado com este termo.
              </div>
            ) : (
              filteredMembers.map((u) => {
                const strikesCount = Array.isArray(u.strikes) ? u.strikes.length : (u.strikes || 0);
                return (
                  <div
                    key={u.id}
                    className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#142318] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-xs sm:text-sm text-[#f1ede4] flex items-center gap-2">
                        <span>{u.nome}</span>
                        {strikesCount === 0 ? (
                          <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                            Regular (0 strikes)
                          </span>
                        ) : strikesCount < 3 ? (
                          <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>{strikesCount}/3 Strikes</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-red-950 text-red-200 border border-red-500 px-1.5 py-0.2 rounded font-bold animate-pulse">
                            ⚠️ 3 Strikes (Limite Atingido)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8a9d8c]">
                        <span className="text-[#a4b5a6] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#d49e2a]" />
                          {u.telefone || 'Sem telefone'}
                        </span>
                        {u.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#7a8e7d]" />
                            {u.email}
                          </span>
                        )}
                        {(u.dataEntrada || u.createdAt) && (
                          <span className="text-[#637965] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Entrada: {formatDateDisplay(u.dataEntrada || u.createdAt?.split('T')[0])}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controles de Strikes & Exclusão */}
                    <div className="flex items-center gap-3">
                      {/* Painel de Strikes */}
                      <div className="flex items-center gap-1.5 bg-[#122015] px-2 py-1 rounded-xl border border-[#203625]">
                        <span className="text-[10px] text-[#7a8e7d] font-semibold mr-1">Strikes:</span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStrikes(u, -1)}
                          disabled={strikesCount === 0}
                          className="w-5 h-5 rounded flex items-center justify-center bg-[#1a2f20] hover:bg-[#25442e] text-[#a4b5a6] hover:text-[#f4ecd8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Remover 1 strike"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`font-mono font-bold text-xs px-1 ${
                          strikesCount === 0 ? 'text-emerald-400' : strikesCount < 3 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {strikesCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStrikes(u, 1)}
                          disabled={strikesCount >= 3}
                          className="w-5 h-5 rounded flex items-center justify-center bg-[#1a2f20] hover:bg-[#3d2424] text-[#a4b5a6] hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                        className="p-1.5 rounded-lg text-[#6e8571] hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#122015] border-2 border-red-500/60 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h4 className="font-bold text-sm text-[#f4ecd8]">Excluir Membro da Mesa</h4>
              </div>
              <p className="text-xs text-[#a4b5a6]">
                Tem certeza que deseja remover <strong>{userToDelete.nome}</strong> da lista?
              </p>
              <form onSubmit={handleConfirmDelete} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] text-[#8a9d8c] mb-1">
                    Senha do Mestre para confirmar:
                  </label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Ponte#dos#trolls"
                    className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                </div>
                {deleteError && (
                  <p className="text-xs text-red-400">{deleteError}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    className="px-3 py-1.5 text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white cursor-pointer"
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
