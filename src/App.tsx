import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ItemRPG,
  UserProfile,
  FundingPackage,
  AppView,
  Apoiador,
  ItemStatus,
  ADMIN_PASSWORD,
} from './types';
import { SEED_ITEMS, SEED_USERS, SEED_PACKAGES } from './data/seedData';
import { DEFAULT_EXCHANGE_RATE } from './utils/helpers';
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
import { SugestoesView } from './components/SugestoesView';
import { FinanciamentoView } from './components/FinanciamentoView';
import { CatalogoView } from './components/CatalogoView';

import { ItemFormModal } from './components/ItemFormModal';
import { PackageModal } from './components/PackageModal';
import { MoveToCatalogModal } from './components/MoveToCatalogModal';
import { MemberManagementModal } from './components/MemberManagementModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { WeeklyBulletinModal } from './components/WeeklyBulletinModal';
import { UserAuthModal } from './components/UserAuthModal';
import { Toast } from './components/Toast';

const STORAGE_KEY_ITEMS = 'ponte_trolls_clean_v5';
const STORAGE_KEY_USERS = 'ponte_trolls_users_v5';
const STORAGE_KEY_PACKAGES = 'ponte_trolls_packages_v5';
const STORAGE_KEY_RATE = 'ponte_trolls_dollar_rate_v5';

export default function App() {
  // Cloud JSON Database Bin ID
  const [binId, setBinId] = useState<string>(() => getInitialBinId());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active View State: 'home' | 'sugestoes' | 'financiamento' | 'catalogo'
  const [view, setView] = useState<AppView>('home');

  // Mandatory Identified User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredCurrentUser());

  // Members list
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

  // Items State (Suggestions)
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

  // Funding Packages State
  const [packages, setPackages] = useState<FundingPackage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PACKAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Fallback to seed packages', e);
    }
    return SEED_PACKAGES;
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

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemRPG | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemRPG | null>(null);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageToEdit, setPackageToEdit] = useState<FundingPackage | null>(null);
  const [packageToMove, setPackageToMove] = useState<FundingPackage | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<FundingPackage | null>(null);

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(packages));
  }, [packages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RATE, exchangeRate.toString());
  }, [exchangeRate]);

  // Initial cloud synchronization
  useEffect(() => {
    let isMounted = true;
    async function loadFromCloud() {
      if (!binId) return;
      try {
        setIsSyncing(true);
        const cloudData = await fetchCloudData(binId);
        if (isMounted && cloudData) {
          if (cloudData.items && cloudData.items.length > 0) {
            setItems(cloudData.items);
          }
          if (cloudData.users && cloudData.users.length > 0) {
            setUsers(cloudData.users);
          }
          if (cloudData.packages && cloudData.packages.length > 0) {
            setPackages(cloudData.packages);
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync error:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    }
    loadFromCloud();
    return () => {
      isMounted = false;
    };
  }, [binId]);

  // Push to cloud helper
  const syncWithCloud = useCallback(
    async (
      newItems: ItemRPG[] = items,
      newUsers: UserProfile[] = users,
      newPackages: FundingPackage[] = packages
    ) => {
      if (!binId) return;
      try {
        setIsSyncing(true);
        await pushCloudData(binId, newItems, newUsers, newPackages);
      } catch (err) {
        console.error('Error syncing with cloud:', err);
        showToast('Aviso: Não foi possível salvar na nuvem.');
      } finally {
        setIsSyncing(false);
      }
    },
    [binId, items, users, packages, showToast]
  );

  // User Identification Handlers
  const handleSelectExistingUser = (user: UserProfile, updatedEmail?: string) => {
    const updatedUser: UserProfile = {
      ...user,
      email: updatedEmail || user.email || '',
    };
    setCurrentUser(updatedUser);
    saveStoredCurrentUser(updatedUser);

    if (updatedEmail && updatedEmail !== user.email) {
      const nextUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
      setUsers(nextUsers);
      syncWithCloud(items, nextUsers, packages);
    }
    showToast(`Bem-vindo, ${updatedUser.nome}!`);
  };

  const handleRegisterNewUser = (newUserData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...newUserData,
      id: `usr-${Date.now()}`,
    };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    setCurrentUser(newUser);
    saveStoredCurrentUser(newUser);
    syncWithCloud(items, nextUsers, packages);
    showToast(`Cadastro realizado com sucesso! Bem-vindo, ${newUser.nome}.`);
  };

  const handleChangeUser = () => {
    setCurrentUser(null);
    saveStoredCurrentUser(null);
  };

  // Sugestões Handlers
  const handleSaveItem = (itemData: Omit<ItemRPG, 'id' | 'apoiadores'> & { id?: string }) => {
    if (itemData.id) {
      // Editar
      const nextItems = items.map((it) =>
        it.id === itemData.id
          ? {
              ...it,
              ...itemData,
              status: itemData.status as ItemStatus,
            }
          : it
      );
      setItems(nextItems);
      syncWithCloud(nextItems, users, packages);
      showToast('Sugestão atualizada!');
    } else {
      // Nova Sugestão
      const autorApoiador: Apoiador = {
        id: currentUser?.id || `ap-${Date.now()}`,
        nome: currentUser?.nome || itemData.sugeridoPorNome,
        telefone: currentUser?.telefone || itemData.sugeridoPorTelefone,
        email: currentUser?.email || '',
        data: new Date().toISOString(),
      };

      const newItem: ItemRPG = {
        ...itemData,
        id: `item-${Date.now()}`,
        status: 'Sugestão',
        apoiadores: [autorApoiador],
      };

      const nextItems = [newItem, ...items];
      setItems(nextItems);
      syncWithCloud(nextItems, users, packages);
      showToast('Nova sugestão cadastrada!');
    }
    setItemToEdit(null);
  };

  const handleToggleSupportItem = (itemId: string) => {
    if (!currentUser) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const alreadySupporting = item.apoiadores.some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    );

    let nextApoiadores: Apoiador[];
    if (alreadySupporting) {
      nextApoiadores = item.apoiadores.filter(
        (ap) => ap.id !== currentUser.id && ap.nome.toLowerCase() !== currentUser.nome.toLowerCase()
      );
      showToast(`Você retirou seu apoio de "${item.nome}".`);
    } else {
      const novoApoiador: Apoiador = {
        id: currentUser.id,
        nome: currentUser.nome,
        telefone: currentUser.telefone,
        email: currentUser.email,
        data: new Date().toISOString(),
      };
      nextApoiadores = [...item.apoiadores, novoApoiador];
      showToast(`Você apoiou "${item.nome}"!`);
    }

    const nextItems = items.map((it) => (it.id === itemId ? { ...it, apoiadores: nextApoiadores } : it));
    setItems(nextItems);
    syncWithCloud(nextItems, users, packages);
  };

  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    const nextItems = items.filter((it) => it.id !== itemToDelete.id);
    setItems(nextItems);
    syncWithCloud(nextItems, users, packages);
    showToast(`Item "${itemToDelete.nome}" excluído.`);
    setItemToDelete(null);
  };

  // Funding Packages Handlers
  const handleSavePackage = (
    pkgData: Omit<FundingPackage, 'id' | 'criadoEm'> & { id?: string }
  ) => {
    if (pkgData.id) {
      // Editar
      const nextPackages = packages.map((p) =>
        p.id === pkgData.id
          ? {
              ...p,
              ...pkgData,
            }
          : p
      );
      setPackages(nextPackages);
      syncWithCloud(items, users, nextPackages);
    } else {
      // Criar Novo Pacote
      const newPkg: FundingPackage = {
        ...pkgData,
        id: `pack-${Date.now()}`,
        criadoEm: new Date().toISOString().split('T')[0],
      };
      const nextPackages = [newPkg, ...packages];
      setPackages(nextPackages);
      syncWithCloud(items, users, nextPackages);
    }
    setPackageToEdit(null);
  };

  const handleToggleSupportPackage = (packageId: string) => {
    if (!currentUser) return;
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    const alreadySupporting = pkg.apoiadores.some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    );

    let nextApoiadores: Apoiador[];
    if (alreadySupporting) {
      nextApoiadores = pkg.apoiadores.filter(
        (ap) => ap.id !== currentUser.id && ap.nome.toLowerCase() !== currentUser.nome.toLowerCase()
      );
      showToast(`Você saiu do rateio de "${pkg.titulo}".`);
    } else {
      const novoApoiador: Apoiador = {
        id: currentUser.id,
        nome: currentUser.nome,
        telefone: currentUser.telefone,
        email: currentUser.email,
        data: new Date().toISOString(),
      };
      nextApoiadores = [...pkg.apoiadores, novoApoiador];
      showToast(`Você entrou na vaquinha de "${pkg.titulo}"!`);
    }

    const nextPackages = packages.map((p) => (p.id === packageId ? { ...p, apoiadores: nextApoiadores } : p));
    setPackages(nextPackages);
    syncWithCloud(items, users, nextPackages);
  };

  const handleConfirmMoveToCatalog = (packageId: string, linkDrive: string) => {
    const nextPackages = packages.map((p) =>
      p.id === packageId
        ? {
            ...p,
            status: 'Catálogo' as const,
            linkDrive,
            finalizadoEm: new Date().toISOString().split('T')[0],
          }
        : p
    );
    setPackages(nextPackages);
    syncWithCloud(items, users, nextPackages);
    setPackageToMove(null);
  };

  const handleDeletePackage = (pkg: FundingPackage) => {
    setPackageToDelete(pkg);
  };

  const handleConfirmDeletePackage = () => {
    if (!packageToDelete) return;
    const nextPackages = packages.filter((p) => p.id !== packageToDelete.id);
    setPackages(nextPackages);
    syncWithCloud(items, users, nextPackages);
    showToast(`Pacote "${packageToDelete.titulo}" excluído.`);
    setPackageToDelete(null);
  };

  // Member Management Handlers
  const handleAddUserFromManagement = (newUserData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...newUserData,
      id: `usr-${Date.now()}`,
    };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    syncWithCloud(items, nextUsers, packages);
  };

  const handleDeleteUser = (userId: string) => {
    const nextUsers = users.filter((u) => u.id !== userId);
    setUsers(nextUsers);
    syncWithCloud(items, nextUsers, packages);
  };

  // Counters for Home Hub
  const countSugestoes = useMemo(() => {
    return items.filter((i) => i.status === 'Sugestão').length;
  }, [items]);

  const countFinanciamento = useMemo(() => {
    return packages.filter((p) => p.status === 'Financiamento').length;
  }, [packages]);

  const countCatalogo = useMemo(() => {
    return packages.filter((p) => p.status === 'Catálogo').length;
  }, [packages]);

  return (
    <div className="min-h-screen bg-[#0c150e] text-[#f1ede4] flex flex-col font-sans selection:bg-[#d49e2a]/30 selection:text-[#f4ecd8]">
      
      {/* Modal de Entrada Obrigatório */}
      {!currentUser && (
        <UserAuthModal
          isOpen={!currentUser}
          users={users}
          onSelectExistingUser={handleSelectExistingUser}
          onRegisterNewUser={handleRegisterNewUser}
        />
      )}

      {/* Cabeçalho Compacto */}
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
        onOpenMembersModal={() => setIsMembersModalOpen(true)}
        isSyncing={isSyncing}
        onToast={showToast}
      />

      {/* Roteamento das Telas */}
      <main className="flex-1 flex flex-col">
        {currentUser && (
          <>
            {view === 'home' && (
              <HomeHub
                currentUser={currentUser}
                countSugestoes={countSugestoes}
                countFinanciamento={countFinanciamento}
                countCatalogo={countCatalogo}
                onNavigate={(v) => setView(v)}
                onOpenNewItem={() => {
                  setItemToEdit(null);
                  setIsFormOpen(true);
                }}
              />
            )}

            {view === 'sugestoes' && (
              <SugestoesView
                items={items}
                currentUser={currentUser}
                exchangeRate={exchangeRate}
                onGoHome={() => setView('home')}
                onOpenNewItem={() => {
                  setItemToEdit(null);
                  setIsFormOpen(true);
                }}
                onToggleSupportItem={handleToggleSupportItem}
                onEditItem={(item) => {
                  setItemToEdit(item);
                  setIsFormOpen(true);
                }}
                onDeleteItem={(item) => setItemToDelete(item)}
                onToast={showToast}
              />
            )}

            {view === 'financiamento' && (
              <FinanciamentoView
                packages={packages}
                currentUser={currentUser}
                onGoHome={() => setView('home')}
                onOpenCreatePackage={() => {
                  setPackageToEdit(null);
                  setIsPackageModalOpen(true);
                }}
                onEditPackage={(pkg) => {
                  setPackageToEdit(pkg);
                  setIsPackageModalOpen(true);
                }}
                onDeletePackage={handleDeletePackage}
                onMoveToCatalog={(pkg) => setPackageToMove(pkg)}
                onToggleSupport={handleToggleSupportPackage}
              />
            )}

            {view === 'catalogo' && (
              <CatalogoView
                packages={packages}
                currentUser={currentUser}
                onGoHome={() => setView('home')}
                onEditPackage={(pkg) => {
                  setPackageToEdit(pkg);
                  setIsPackageModalOpen(true);
                }}
                onDeletePackage={handleDeletePackage}
                onToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Modais de Gerenciamento & Apoio */}
      {isFormOpen && (
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
      )}

      {isPackageModalOpen && (
        <PackageModal
          isOpen={isPackageModalOpen}
          onClose={() => {
            setIsPackageModalOpen(false);
            setPackageToEdit(null);
          }}
          onSave={handleSavePackage}
          existingPackage={packageToEdit}
          availableSugestoes={items.filter((i) => i.status === 'Sugestão')}
          onToast={showToast}
        />
      )}

      {Boolean(packageToMove) && (
        <MoveToCatalogModal
          isOpen={Boolean(packageToMove)}
          onClose={() => setPackageToMove(null)}
          packageItem={packageToMove}
          onConfirmMove={handleConfirmMoveToCatalog}
          onToast={showToast}
        />
      )}

      {isMembersModalOpen && (
        <MemberManagementModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          users={users}
          onAddUser={handleAddUserFromManagement}
          onDeleteUser={handleDeleteUser}
          onToast={showToast}
        />
      )}

      {Boolean(itemToDelete) && (
        <DeleteConfirmModal
          isOpen={Boolean(itemToDelete)}
          item={itemToDelete}
          onConfirm={handleConfirmDeleteItem}
          onCancel={() => setItemToDelete(null)}
        />
      )}

      {/* Confirmação de exclusão de pacote */}
      {packageToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(packageToDelete)}
          item={{
            id: packageToDelete.id,
            nome: packageToDelete.titulo,
            data: packageToDelete.criadoEm,
            produto: 'Bundle / Pacote de Mapas',
            sistema: packageToDelete.sistema,
            descricao: packageToDelete.descricao,
            link: packageToDelete.linkLoja,
            sugeridoPorNome: 'Mestre da Ponte',
            sugeridoPorTelefone: '',
            moeda: 'BRL',
            valorNumerico: packageToDelete.valorTotalBRL,
            status: 'Sugestão',
            apoiadores: packageToDelete.apoiadores,
          }}
          onConfirm={handleConfirmDeletePackage}
          onCancel={() => setPackageToDelete(null)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          currentItems={items}
          exchangeRate={exchangeRate}
          binId={binId}
          onSaveBinId={(newId) => {
            setBinId(newId);
            saveBinId(newId);
            showToast(`Banco em nuvem alterado para: ${newId}`);
          }}
          onImportItems={(importedItems: ItemRPG[], mode: 'replace' | 'append') => {
            const nextItems = mode === 'replace' ? importedItems : [...importedItems, ...items];
            setItems(nextItems);
            syncWithCloud(nextItems, users, packages);
            showToast(`${importedItems.length} itens importados com sucesso!`);
          }}
          onUpdateItemsFromCloud={(cloudItems: ItemRPG[]) => {
            setItems(cloudItems);
            showToast('Itens atualizados a partir da nuvem!');
          }}
          onClose={() => setIsSettingsOpen(false)}
          onToast={showToast}
        />
      )}

      {isBulletinOpen && (
        <WeeklyBulletinModal
          isOpen={isBulletinOpen}
          items={items}
          exchangeRate={exchangeRate}
          onClose={() => setIsBulletinOpen(false)}
          onToast={showToast}
        />
      )}

      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

    </div>
  );
}
