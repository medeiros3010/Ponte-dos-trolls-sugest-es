import React, { useState, useMemo } from 'react';
import { UserProfile, ADMIN_PASSWORD } from '../types';
import { Users, UserPlus, Trash2, Search, X, Shield, Phone, Mail, Check, Copy } from 'lucide-react';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  onAddUser: (newUser: Omit<UserProfile, 'id'>) => void;
  onDeleteUser: (userId: string) => void;
  onToast: (msg: string) => void;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onAddUser,
  onDeleteUser,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        (u.telefone && u.telefone.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchTerm]);

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
    onAddUser({
      nome: newName.trim(),
      telefone: newPhone.trim(),
      email: newEmail.trim(),
      createdAt: new Date().toISOString(),
      isMaster: false,
    });
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setShowAddForm(false);
    setFormError('');
    onToast('Membro adicionado com sucesso!');
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;

    if (deletePassword !== ADMIN_PASSWORD) {
      setDeleteError('Senha de administrador incorreta!');
      return;
    }

    onDeleteUser(userToDelete.id);
    onToast(`Membro "${userToDelete.nome}" removido da lista.`);
    setUserToDelete(null);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleCopyPhoneList = () => {
    const list = users
      .filter((u) => u.telefone && u.telefone.trim())
      .map((u) => `${u.nome}: ${u.telefone}`)
      .join('\n');
    navigator.clipboard.writeText(list);
    onToast('Lista de contatos copiada para a área de transferência!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#2c4831] rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#16271a] border-b border-[#203625] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f3524] border border-[#2e5035] flex items-center justify-center text-[#d49e2a]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-lg font-bold text-[#f4ecd8] flex items-center gap-2">
                <span>Gerenciar Membros</span>
                <span className="px-2 py-0.5 text-[10px] bg-[#d49e2a]/20 text-[#d49e2a] border border-[#d49e2a]/40 rounded-full font-mono">
                  {users.length} cadastrados
                </span>
              </h2>
              <p className="text-[11px] text-[#8a9d8c]">Painel exclusivo do Mestre da Ponte</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a8e7d] hover:text-[#f1ede4] hover:bg-[#1a2f20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-[#0e1911] border-b border-[#1a2e1e] flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar membro por nome, WhatsApp ou e-mail..."
              className="w-full pl-9 pr-3 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPhoneList}
              className="px-3 py-2 text-xs font-semibold bg-[#182c1d] hover:bg-[#203a27] text-[#8a9d8c] hover:text-[#f4ecd8] border border-[#27442d] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copiar lista de telefones para avisos no WhatsApp"
            >
              <Copy className="w-3.5 h-3.5 text-[#d49e2a]" />
              <span className="hidden sm:inline">Copiar Contatos</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-2 text-xs font-bold bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{showAddForm ? 'Cancelar' : '+ Novo Membro'}</span>
            </button>
          </div>
        </div>

        {/* Form para adicionar membro (expansível) */}
        {showAddForm && (
          <form onSubmit={handleCreateMember} className="p-4 bg-[#142317] border-b border-[#25412b] animate-in fade-in space-y-3">
            <h3 className="text-xs font-bold text-[#d49e2a] flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Novo Membro no Grupo</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome completo..."
                className="px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => handlePhoneMask(e.target.value)}
                placeholder="WhatsApp com DDD..."
                className="px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="E-mail (opcional)..."
                className="px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>
            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-[#8a9d8c] hover:text-[#f1ede4] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold text-xs rounded-xl cursor-pointer"
              >
                Salvar Membro
              </button>
            </div>
          </form>
        )}

        {/* Lista de Membros */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-[#1a2f20]">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7a8e7d]">
              Nenhum membro encontrado.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const digits = (u.telefone || '').replace(/\D/g, '');
              const waLink = digits.length >= 10 ? `https://wa.me/55${digits}` : null;

              return (
                <div key={u.id} className="py-3 flex items-center justify-between gap-3 hover:bg-[#142318]/50 px-2 rounded-xl transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-[#f1ede4] truncate">
                        {u.nome}
                      </span>
                      {u.isMaster && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-[#fbbf24] border border-[#fbbf24]/40 rounded font-bold">
                          Mestre
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7a8e7d] mt-1">
                      {u.telefone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#d49e2a]" />
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#6ee7b7] hover:underline"
                              title="Abrir conversa no WhatsApp"
                            >
                              {u.telefone}
                            </a>
                          ) : (
                            u.telefone
                          )}
                        </span>
                      ) : (
                        <span className="italic text-[#556957]">Sem telefone</span>
                      )}

                      {u.email ? (
                        <span className="flex items-center gap-1 text-[#a4b5a6]">
                          <Mail className="w-3 h-3 text-[#7a8e7d]" />
                          <span className="truncate max-w-[160px] sm:max-w-[220px]">{u.email}</span>
                        </span>
                      ) : (
                        <span className="italic text-amber-400/80">Sem e-mail</span>
                      )}
                    </div>
                  </div>

                  {/* Ação de exclusão */}
                  {!u.isMaster && (
                    <button
                      onClick={() => {
                        setUserToDelete(u);
                        setDeletePassword('');
                        setDeleteError('');
                      }}
                      className="p-2 text-[#7a8e7d] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                      title={`Remover ${u.nome}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal interno de confirmação de exclusão */}
        {userToDelete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
            <form onSubmit={handleConfirmDelete} className="bg-[#16271a] border-2 border-red-500/50 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#f4ecd8]">Remover Membro da Toca</h3>
              </div>
              <p className="text-xs text-[#a4b5a6] leading-relaxed">
                Tem certeza que deseja remover o membro <strong className="text-red-300">{userToDelete.nome}</strong> da lista?
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#8a9d8c] mb-1">
                  Senha do Mestre para confirmar exclusão:
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Digite Ponte#dos#trolls"
                  className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-red-400"
                  autoFocus
                />
              </div>
              {deleteError && (
                <p className="text-red-400 text-xs">{deleteError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-[#8a9d8c] hover:text-[#f1ede4] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
