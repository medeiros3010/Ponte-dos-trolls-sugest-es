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
  USERS_VERSION,
} from './utils/cloudStorage';

import { Header } from './components/Header';
import { HomeHub } from './components/HomeHub';
import { SugestoesView } from './components/SugestoesView';
import { FinanciamentoView } from './components/FinanciamentoView';
import { CatalogoView } from './components/CatalogoView';
import { MembrosView } from './components/MembrosView';

import { ItemFormModal } from './components/ItemFormModal';
import { PackageModal } from './components/PackageModal';
import { MoveToCatalogModal } from './components/MoveToCatalogModal';
import { MemberManagementModal } from './components/MemberManagementModal';
import { ExportDataModal } from './components/ExportDataModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { WeeklyBulletinModal } from './components/WeeklyBulletinModal';
import { UserAuthModal } from './components/UserAuthModal';
import { UserProfileModal } from './components/UserProfileModal';
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

  // Members list with automatic version check & overwrite for the 125 official members
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const storedVersion = localStorage.getItem('users_version');
      if (storedVersion !== USERS_VERSION) {
        localStorage.setItem('users_version', USERS_VERSION);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SEED_USERS));
        return SEED_USERS;
      }
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 125) return parsed;
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
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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

  // Initial cloud synchronization with USERS_VERSION enforcement
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
          if (cloudData.packages && cloudData.packages.length > 0) {
            setPackages(cloudData.packages);
          }

          const storedVer = localStorage.getItem('users_version');
          const isCloudOutdated = cloudData.usersVersion !== USERS_VERSION || (!cloudData.users || cloudData.users.length < 125);

          if (storedVer !== USERS_VERSION || isCloudOutdated) {
            // Overwrite immediately with the 125 official members and push PUT/POST to cloud
            setUsers(SEED_USERS);
            localStorage.setItem('users_version', USERS_VERSION);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SEED_USERS));

            await pushCloudData(
              binId,
              cloudData.items && cloudData.items.length > 0 ? cloudData.items : items,
              SEED_USERS,
              cloudData.packages && cloudData.packages.length > 0 ? cloudData.packages : packages,
              USERS_VERSION
            );
          } else if (cloudData.users && cloudData.users.length > 0) {
            setUsers(cloudData.users);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(cloudData.users));
          }
        } else if (isMounted) {
          const storedVer = localStorage.getItem('users_version');
          if (storedVer !== USERS_VERSION) {
            setUsers(SEED_USERS);
            localStorage.setItem('users_version', USERS_VERSION);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SEED_USERS));
            await pushCloudData(binId, items, SEED_USERS, packages, USERS_VERSION);
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
        await pushCloudData(binId, newItems, newUsers, newPackages, USERS_VERSION);
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
  const handleSelectExistingUser = (user: UserProfile, updatedEmail?: string, updatedPhone?: string) => {
    const updatedUser: UserProfile = {
      ...user,
      email: updatedEmail || user.email || '',
      telefone: updatedPhone || user.telefone || '',
      status: 'aprovado',
    };
    setCurrentUser(updatedUser);
    saveStoredCurrentUser(updatedUser);

    const hasChanges = (updatedEmail && updatedEmail !== user.email) || (updatedPhone && updatedPhone !== user.telefone);
    if (hasChanges) {
      const nextUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
      setUsers(nextUsers);
      syncWithCloud(items, nextUsers, packages);
    }

    showToast(`Bem-vindo, ${updatedUser.nome}!`);

    // Abre imediatamente o Modal de Boas-Vindas e Conferência para membros comuns
    if (!updatedUser.isMaster) {
      setIsProfileOpen(true);
    }
  };

  const handleUpdateCurrentUser = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    saveStoredCurrentUser(updatedUser);
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    syncWithCloud(items, nextUsers, packages);
  };

  const handleUpdateUserFromManagement = (updatedUser: UserProfile) => {
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      saveStoredCurrentUser(updatedUser);
    }
    syncWithCloud(items, nextUsers, packages);
  };

  const handleApproveUser = (userId: string) => {
    const nextUsers = users.map((u) => (u.id === userId ? { ...u, status: 'aprovado' as const } : u));
    setUsers(nextUsers);
    syncWithCloud(items, nextUsers, packages);
  };

  const handleRejectUser = (userId: string) => {
    const nextUsers = users.filter((u) => u.id !== userId);
    setUsers(nextUsers);
    syncWithCloud(items, nextUsers, packages);
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
      // Criar Novo
      const newItem: ItemRPG = {
        ...itemData,
        id: `item-${Date.now()}`,
        status: 'Sugestão',
        apoiadores: currentUser
          ? [
              {
                id: currentUser.id,
                nome: currentUser.nome,
                telefone: currentUser.telefone,
                email: currentUser.email,
              },
            ]
          : [],
      };
      const nextItems = [newItem, ...items];
      setItems(nextItems);
      syncWithCloud(nextItems, users, packages);
      showToast('Sugestão enviada com sucesso!');
    }
    setIsFormOpen(false);
    setItemToEdit(null);
  };

  const handleToggleSupportItem = (itemId: string) => {
    if (!currentUser) return;
    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;

    const alreadySupporting = (targetItem.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    );

    let nextApoiadores: Apoiador[];
    if (alreadySupporting) {
      nextApoiadores = (targetItem.apoiadores || []).filter(
        (ap) => ap.id !== currentUser.id && ap.nome.toLowerCase() !== currentUser.nome.toLowerCase()
      );
      showToast(`Você retirou seu apoio da sugestão "${targetItem.nome}".`);
    } else {
      const novoApoiador: Apoiador = {
        id: currentUser.id,
        nome: currentUser.nome,
        telefone: currentUser.telefone,
        email: currentUser.email,
        data: new Date().toISOString(),
      };
      nextApoiadores = [...(targetItem.apoiadores || []), novoApoiador];
      showToast(`Você apoiou "${targetItem.nome}"!`);
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

    const alreadySupporting = (pkg.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    );

    let nextApoiadores: Apoiador[];
    if (alreadySupporting) {
      nextApoiadores = (pkg.apoiadores || []).filter(
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
      nextApoiadores = [...(pkg.apoiadores || []), novoApoiador];
      showToast(`Você entrou na vaquinha de "${pkg.titulo}"!`);
    }

    const nextPackages = packages.map((p) => (p.id === packageId ? { ...p, apoiadores: nextApoiadores } : p));
    setPackages(nextPackages);
    syncWithCloud(items, users, nextPackages);
  };

  const handleConfirmMoveToCatalog = (packageId: string, linkDrive: string, valorCatalogoBRL: number) => {
    const nextPackages = packages.map((p) =>
      p.id === packageId
        ? {
            ...p,
            status: 'Catálogo' as const,
            linkDrive,
            valorCatalogoBRL,
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

  const handleRestoreBackup = (backupData: any) => {
    let nextItems = items;
    let nextUsers = users;
    let nextPackages = packages;

    if (backupData.items && Array.isArray(backupData.items)) {
      nextItems = backupData.items;
      setItems(nextItems);
    }
    if (backupData.users && Array.isArray(backupData.users)) {
      nextUsers = backupData.users;
      setUsers(nextUsers);
    }
    if (backupData.packages && Array.isArray(backupData.packages)) {
      nextPackages = backupData.packages;
      setPackages(nextPackages);
    }
    syncWithCloud(nextItems, nextUsers, nextPackages);
  };

  // Pending users count for Master badge
  const pendingUsersCount = useMemo(() => {
    return users.filter((u) => u.status === 'pendente').length;
  }, [users]);

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

  const countMembros = useMemo(() => {
    return users.length;
  }, [users]);

  return (
    <div className="min-h-screen bg-[#0c150e] text-[#f1ede4] flex flex-col font-sans selection:bg-[#d49e2a]/30 selection:text-[#f4ecd8]">
      
      {/* Modal de Entrada Obrigatório */}
      {!currentUser && (
        <UserAuthModal
          isOpen={!currentUser}
          users={users}
          onSelectExistingUser={handleSelectExistingUser}
        />
      )}

      {/* Cabeçalho Compacto */}
      <Header
        binId={binId}
        currentUser={currentUser}
        currentView={view}
        pendingUsersCount={pendingUsersCount}
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
        onOpenMembersModal={() => setView('membros')}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenProfileModal={() => setIsProfileOpen(true)}
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
                countMembros={countMembros}
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
                onToast={showToast}
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

            {view === 'membros' && (
              <MembrosView
                users={users}
                currentUser={currentUser}
                packages={packages}
                items={items}
                onGoHome={() => setView('home')}
                onAddUser={handleAddUserFromManagement}
                onUpdateUser={handleUpdateUserFromManagement}
                onDeleteUser={handleDeleteUser}
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
          onUpdateUser={handleUpdateUserFromManagement}
          onDeleteUser={handleDeleteUser}
          onToast={showToast}
        />
      )}

      {/* Modal de Perfil e Conferência de Cadastro */}
      {isProfileOpen && currentUser && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          packages={packages}
          items={items}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          onToast={showToast}
        />
      )}

      {isExportOpen && (
        <ExportDataModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          users={users}
          items={items}
          packages={packages}
          binId={binId}
          onRestoreBackup={handleRestoreBackup}
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
            sistema: packageToDelete.sistema || 'Outro',
            descricao: packageToDelete.descricao || '',
            link: packageToDelete.linkLoja || '',
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
            showToast(`Banco alternado para: ${newId}`);
          }}
          onImportItems={(newItems, mode) => {
            const nextItems = mode === 'replace' ? newItems : [...items, ...newItems];
            setItems(nextItems);
            syncWithCloud(nextItems, users, packages);
            showToast(`${newItems.length} itens importados com sucesso!`);
          }}
          onUpdateItemsFromCloud={(newItems) => {
            setItems(newItems);
            syncWithCloud(newItems, users, packages);
          }}
          onClose={() => setIsSettingsOpen(false)}
          onToast={showToast}
        />
      )}

      {isBulletinOpen && (
        <WeeklyBulletinModal
          isOpen={isBulletinOpen}
          onClose={() => setIsBulletinOpen(false)}
          items={items}
          exchangeRate={exchangeRate}
          onToast={showToast}
        />
      )}

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
