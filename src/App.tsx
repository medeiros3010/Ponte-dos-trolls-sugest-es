import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ItemRPG,
  UserProfile,
  AppView,
  SugestoesCategory,
  Apoiador,
  ItemStatus,
} from './types';
import { SEED_ITEMS, SEED_USERS } from './data/seedData';
import { DEFAULT_EXCHANGE_RATE, generateItemWhatsAppMessage } from './utils/helpers';
import {
  getInitialBinId,
  saveBinId,
  fetchCloudData,
  pushCloudData,
  getStoredCurrentUser,
  saveStoredCurrentUser,
  DEFAULT_BIN_ID,
} from './utils/cloudStorage';
import { Header } from './components/Header';
import { HomeHub } from './components/HomeHub';
import { NavigationTabs } from './components/NavigationTabs';
import { ItemRow } from './components/ItemRow';
import { RateioModal } from './components/RateioModal';
import { ItemFormModal } from './components/ItemFormModal';
import { SettingsModal } from './components/SettingsModal';
import { WeeklyBulletinModal } from './components/WeeklyBulletinModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { UserAuthModal } from './components/UserAuthModal';
import { Toast } from './components/Toast';
import { Trees, Compass, ArrowLeft, Flame, BookOpen, ShoppingBag, Filter, Search, X } from 'lucide-react';

const STORAGE_KEY_ITEMS = 'ponte_trolls_clean_v4';
const STORAGE_KEY_USERS = 'ponte_trolls_users_v4';
const STORAGE_KEY_RATE = 'ponte_trolls_dollar_rate_v4';

export default function App() {
  // Cloud JSON Database Bin ID
  const [binId, setBinId] = useState<string>(() => getInitialBinId());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active View State: 'home' | 'sugestoes' | 'financiamento' | 'catalogo'
  const [view, setView] = useState<AppView>('home');

  // Mandatory Identified User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredCurrentUser());

  // Members list (stored locally and synced with cloud)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Fallback to seed users', e);
    }
    return SEED_USERS;
  });

  // Items State
  const [items, setItems] = useState<ItemRPG[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Fallback to seed items', e);
    }
    return SEED_ITEMS;
  });

  // Dollar Exchange Rate
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RATE);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch (e) {
      console.warn('Fallback to default rate', e);
    }
    return DEFAULT_EXCHANGE_RATE;
  });

  // Modals & Feedback
  const [rateioItem, setRateioItem] = useState<ItemRPG | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemRPG | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemRPG | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters for lists
  const [sugestoesTab, setSugestoesTab] = useState<SugestoesCategory>('Sugestão');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving items', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RATE, exchangeRate.toString());
    } catch (e) {
      console.error('Error saving rate', e);
    }
  }, [exchangeRate]);

  // Sync to Cloud Helper
  const triggerCloudSync = useCallback(
    (updatedItems: ItemRPG[], updatedUsers: UserProfile[]) => {
      const targetBin = binId || DEFAULT_BIN_ID;
      setIsSyncing(true);
      pushCloudData(targetBin, updatedItems, updatedUsers)
        .catch((err) => console.warn('Background cloud push failed', err))
        .finally(() => setIsSyncing(false));
    },
    [binId]
  );

  // Initial cloud fetch on bin load
  useEffect(() => {
    const targetBin = binId || DEFAULT_BIN_ID;
    setIsSyncing(true);
    fetchCloudData(targetBin)
      .then((cloudData) => {
        if (cloudData) {
          if (cloudData.items && cloudData.items.length > 0) {
            setItems(cloudData.items);
          }
          if (cloudData.users && cloudData.users.length > 0) {
            setUsers(cloudData.users);
          }
          showToast(`Sincronizado com a nuvem da Ponte dos Trolls!`);
        }
      })
      .catch((err) => console.warn('Initial cloud sync error', err))
      .finally(() => setIsSyncing(false));
  }, [binId]);

  // Counters for Home Hub
  const countSugestoes = useMemo(() => {
    return items.filter((i) => i.status === 'Sugestão').length;
  }, [items]);

  const countFinanciamento = useMemo(() => {
    return items.filter((i) => i.status === 'Em Financiamento').length;
  }, [items]);

  const countCatalogo = useMemo(() => {
    return items.filter((i) => i.status === 'Finalizados').length;
  }, [items]);

  // Systems List for Filter Dropdown
  const availableSystems = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.sistema && it.sistema.trim()) {
        set.add(it.sistema.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Filtered Items based on active view
  const displayedItems = useMemo(() => {
    let result: ItemRPG[] = [];

    if (view === 'sugestoes') {
      result = items.filter((i) => i.status === sugestoesTab);
    } else if (view === 'financiamento') {
      result = items.filter((i) => i.status === 'Em Financiamento');
    } else if (view === 'catalogo') {
      result = items.filter((i) => i.status === 'Finalizados');
    }

    if (selectedSystem) {
      result = result.filter(
        (i) => i.sistema.toLowerCase() === selectedSystem.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.nome.toLowerCase().includes(q) ||
          i.sistema.toLowerCase().includes(q) ||
          i.descricao.toLowerCase().includes(q) ||
          i.sugeridoPorNome.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, view, sugestoesTab, selectedSystem, searchQuery]);

  // --- USER IDENTIFICATION HANDLERS ---
  const handleSelectExistingUser = (user: UserProfile, updatedEmail?: string) => {
    let userToSave = user;
    let nextUsers = users;

    if (updatedEmail && updatedEmail !== user.email) {
      userToSave = { ...user, email: updatedEmail };
      nextUsers = users.map((u) => (u.id === user.id ? userToSave : u));
      setUsers(nextUsers);
    }

    setCurrentUser(userToSave);
    saveStoredCurrentUser(userToSave);
    triggerCloudSync(items, nextUsers);
    showToast(`Bem-vindo, ${userToSave.nome}!`);
  };

  const handleRegisterNewUser = (newUserData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...newUserData,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    setCurrentUser(newUser);
    saveStoredCurrentUser(newUser);
    triggerCloudSync(items, nextUsers);
    showToast(`Cadastro realizado com sucesso! Bem-vindo, ${newUser.nome}.`);
  };

  const handleChangeUser = () => {
    setCurrentUser(null);
    saveStoredCurrentUser(null);
  };

  // --- ITEM CRUD HANDLERS ---
  const handleSaveItem = (itemData: Omit<ItemRPG, 'id' | 'apoiadores'> & { id?: string }) => {
    let nextList: ItemRPG[];

    if (itemData.id) {
      nextList = items.map((it) => (it.id === itemData.id ? { ...it, ...itemData } : it));
      showToast(`"${itemData.nome}" atualizado!`);
    } else {
      const authorName = currentUser?.nome || itemData.sugeridoPorNome || 'Membro do Grupo';
      const authorPhone = currentUser?.telefone || itemData.sugeridoPorTelefone || '';
      const authorEmail = currentUser?.email || '';

      const newItem: ItemRPG = {
        ...itemData,
        id: `troll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        status: 'Sugestão', // Novo item entra sempre como Sugestão
        sugeridoPorNome: authorName,
        sugeridoPorTelefone: authorPhone,
        sugeridoPorEmail: authorEmail,
        apoiadores: [
          {
            id: `ap-${Date.now()}`,
            nome: authorName,
            telefone: authorPhone,
            email: authorEmail,
            data: new Date().toISOString().split('T')[0],
          },
        ],
      };
      nextList = [newItem, ...items];
      showToast(`"${newItem.nome}" adicionado em Sugestões!`);
      setView('sugestoes');
      setSugestoesTab('Sugestão');
    }

    setItems(nextList);
    triggerCloudSync(nextList, users);
  };

  const handleRequestDelete = (id: string) => {
    const item = items.find((i) => String(i.id) === String(id));
    if (item) {
      setItemToDelete(item);
    }
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const targetId = String(itemToDelete.id);
    const nextList = items.filter((i) => String(i.id) !== targetId);
    setItems(nextList);
    triggerCloudSync(nextList, users);
    showToast(`"${itemToDelete.nome}" foi removido com sucesso!`);
    setItemToDelete(null);
  };

  const handleAddApoiador = (itemId: string, apoiadorData: Omit<Apoiador, 'id'>) => {
    const newApoiador: Apoiador = {
      ...apoiadorData,
      id: `ap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    const nextList = items.map((it) => {
      if (it.id === itemId) {
        // Evita apoio duplicado da mesma pessoa
        const alreadyExists = it.apoiadores.some(
          (ap) =>
            ap.nome.toLowerCase() === newApoiador.nome.toLowerCase() ||
            (newApoiador.telefone && ap.telefone && ap.telefone === newApoiador.telefone)
        );

        const updatedApoiadores = alreadyExists
          ? it.apoiadores
          : [...(it.apoiadores || []), newApoiador];

        const updated = {
          ...it,
          apoiadores: updatedApoiadores,
        };

        if (rateioItem && rateioItem.id === itemId) {
          setRateioItem(updated);
        }
        return updated;
      }
      return it;
    });

    setItems(nextList);
    triggerCloudSync(nextList, users);
  };

  const handleRemoveApoiador = (itemId: string, apoiadorId: string) => {
    const nextList = items.map((it) => {
      if (it.id === itemId) {
        const updated = {
          ...it,
          apoiadores: it.apoiadores.filter((ap) => ap.id !== apoiadorId),
        };
        if (rateioItem && rateioItem.id === itemId) {
          setRateioItem(updated);
        }
        return updated;
      }
      return it;
    });

    setItems(nextList);
    triggerCloudSync(nextList, users);
  };

  const handleCopyWhatsApp = (item: ItemRPG) => {
    const msg = generateItemWhatsAppMessage(item, exchangeRate);
    navigator.clipboard.writeText(msg);
    showToast(`Texto formatado de "${item.nome}" copiado!`);
  };

  const handleImportItems = (newItems: ItemRPG[], mode: 'replace' | 'append') => {
    const nextList = mode === 'replace' ? newItems : [...newItems, ...items];
    setItems(nextList);
    triggerCloudSync(nextList, users);
  };

  return (
    <div className="min-h-screen bg-[#0c150e] text-[#f1ede4] flex flex-col selection:bg-[#d49e2a]/30 selection:text-[#f4ecd8]">
      
      {/* 1. Modal/Tela de Entrada Obrigatória (Sem botão de fechar quando deslogado) */}
      <UserAuthModal
        isOpen={!currentUser}
        users={users}
        onSelectExistingUser={handleSelectExistingUser}
        onRegisterNewUser={handleRegisterNewUser}
      />

      {/* 2. Cabeçalho Compacto com Identificação do Usuário */}
      <Header
        binId={binId}
        currentUser={currentUser}
        onChangeUser={handleChangeUser}
        onGoHome={() => setView('home')}
        exchangeRate={exchangeRate}
        onExchangeRateChange={setExchangeRate}
        onOpenNewItemModal={() => {
          setItemToEdit(null);
          setIsFormOpen(true);
        }}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenBulletinModal={() => setIsBulletinOpen(true)}
        isSyncing={isSyncing}
        onToast={showToast}
      />

      {/* 3. VISUALIZAÇÃO CONDICIONAL */}
      {view === 'home' && currentUser ? (
        /* TELA INICIAL (HOME HUB) COM 3 BOTÕES GIGANTES */
        <HomeHub
          currentUser={currentUser}
          countSugestoes={countSugestoes}
          countFinanciamento={countFinanciamento}
          countCatalogo={countCatalogo}
          onNavigate={(targetView) => {
            setView(targetView);
            setSelectedSystem('');
            setSearchQuery('');
          }}
          onOpenNewItem={() => {
            setItemToEdit(null);
            setIsFormOpen(true);
          }}
        />
      ) : (
        /* TELAS INTERNAS DE LISTAGEM COM BOTÃO VISÍVEL DE VOLTAR */
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 animate-in fade-in duration-150">
          
          {/* Barra Superior da Tela Interna: ⬅️ Voltar ao Menu Inicial */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-[#1b2f20]">
            <button
              onClick={() => {
                setView('home');
                setSelectedSystem('');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#142318] hover:bg-[#1a2f20] text-[#d49e2a] border border-[#27442d] transition-all hover:-translate-x-0.5 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Voltar ao Menu Inicial</span>
            </button>

            {/* Título de Contexto da Tela Interna */}
            <div className="flex items-center gap-2 text-xs font-bold">
              {view === 'sugestoes' && (
                <span className="text-[#d49e2a] flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Sugerir Compras & Ideias</span>
                </span>
              )}
              {view === 'financiamento' && (
                <span className="text-[#e5b23d] flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#e5b23d]" />
                  <span>Financiamento em Andamento (Vaquinhas Oficiais)</span>
                </span>
              )}
              {view === 'catalogo' && (
                <span className="text-[#52c27c] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#43aa6a]" />
                  <span>Catálogo de Produtos (No Drive)</span>
                </span>
              )}
            </div>
          </div>

          {/* Navegação específica para a tela 'sugestoes' (2 Abas: 💡 Sugestão e ✅ Finalizados) */}
          {view === 'sugestoes' && (
            <NavigationTabs
              activeTab={sugestoesTab}
              onTabChange={setSugestoesTab}
              countSugestoes={countSugestoes}
              countFinalizados={countCatalogo}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedSystem={selectedSystem}
              onSystemChange={setSelectedSystem}
              availableSystems={availableSystems}
            />
          )}

          {/* Controles de Filtro e Busca para 'financiamento' e 'catalogo' */}
          {view !== 'sugestoes' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 bg-[#122015] border border-[#203625] p-3 rounded-2xl">
              <div className="text-xs font-bold text-[#f4ecd8] flex items-center gap-2">
                <span>{displayedItems.length} item(ns) encontrado(s)</span>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
                <div className="relative shrink-0">
                  <select
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                    className="appearance-none bg-[#0c150e] border border-[#1e3422] text-xs text-[#dcd6c8] pl-7 pr-7 py-2 rounded-xl focus:outline-none focus:border-[#d49e2a] cursor-pointer"
                  >
                    <option value="">Todos os Sistemas</option>
                    {availableSystems.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Filter className="w-3 h-3 text-[#d49e2a] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#556957] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-[#0c150e] border border-[#1e3422] rounded-xl pl-8 pr-7 py-2 text-xs text-[#f4ecd8] placeholder-[#556957] focus:outline-none focus:border-[#d49e2a]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#556957] hover:text-[#f4ecd8]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lista de Linhas Horizontais */}
          {displayedItems.length === 0 ? (
            <div className="bg-[#122015] border border-[#203625] rounded-2xl p-12 text-center my-6">
              <Compass className="w-10 h-10 text-[#d49e2a]/60 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-[#f4ecd8] mb-1">
                {searchQuery || selectedSystem
                  ? 'Nenhum item encontrado com os filtros atuais'
                  : view === 'financiamento'
                  ? 'Nenhuma vaquinha aberta no momento'
                  : 'Nenhum item nesta lista'}
              </h3>
              <p className="text-xs text-[#7a8e7d] max-w-sm mx-auto mb-4">
                {view === 'financiamento'
                  ? 'Aguarde o administrador abrir a próxima vaquinha oficial ou sugira um novo item!'
                  : 'Clique no botão "+ Sugerir Compra" no topo para sugerir um novo material!'}
              </p>
              {(searchQuery || selectedSystem) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSystem('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#182b1d] hover:bg-[#203a27] text-[#d49e2a] border border-[#27442d] transition-colors"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayedItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  currentUser={currentUser}
                  exchangeRate={exchangeRate}
                  onOpenApoiar={(it) => setRateioItem(it)}
                  onRemoveApoiador={handleRemoveApoiador}
                  onCopyWhatsApp={handleCopyWhatsApp}
                  onEdit={(it) => {
                    setItemToEdit(it);
                    setIsFormOpen(true);
                  }}
                  onDelete={handleRequestDelete}
                />
              ))}
            </div>
          )}

        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1a2d1f] bg-[#09100a] py-6 text-center text-xs text-[#6e8070] mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trees className="w-4 h-4 text-[#43aa6a]" />
            <span>A Ponte dos Trolls &copy; {new Date().getFullYear()} · Rateios de RPG</span>
          </div>
          <div className="flex items-center gap-4 text-[#8a9d8c]">
            <span>{items.length} itens cadastrados</span>
            <span>·</span>
            <span>{users.length} membros</span>
            <span>·</span>
            <button
              onClick={() => setIsBulletinOpen(true)}
              className="hover:text-[#d49e2a] transition-colors"
            >
              Boletim WhatsApp
            </button>
            <span>·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-[#d49e2a] transition-colors"
            >
              Nuvem & Planilha
            </button>
          </div>
        </div>
      </footer>

      {/* Modais */}
      <RateioModal
        item={rateioItem}
        currentUser={currentUser}
        exchangeRate={exchangeRate}
        onClose={() => setRateioItem(null)}
        onAddApoiador={handleAddApoiador}
        onRemoveApoiador={handleRemoveApoiador}
        onToast={showToast}
      />

      <ItemFormModal
        isOpen={isFormOpen}
        itemToEdit={itemToEdit}
        currentUser={currentUser}
        onClose={() => {
          setIsFormOpen(false);
          setItemToEdit(null);
        }}
        onSave={handleSaveItem}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        currentItems={items}
        exchangeRate={exchangeRate}
        binId={binId}
        onSaveBinId={(newId) => {
          setBinId(newId);
          saveBinId(newId);
        }}
        onImportItems={handleImportItems}
        onUpdateItemsFromCloud={(newItems) => {
          setItems(newItems);
          triggerCloudSync(newItems, users);
        }}
        onClose={() => setIsSettingsOpen(false)}
        onToast={showToast}
      />

      <WeeklyBulletinModal
        isOpen={isBulletinOpen}
        items={items}
        exchangeRate={exchangeRate}
        onClose={() => setIsBulletinOpen(false)}
        onToast={showToast}
      />

      {/* Custom Delete Confirmation Modal com Senha de Admin (NO window.confirm) */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        item={itemToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

    </div>
  );
}
