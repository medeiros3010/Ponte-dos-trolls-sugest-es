import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ItemRPG,
  UserProfile,
  FundingPackage,
  AppView,
  Apoiador,
  ItemStatus,
  ProductType,
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
  apiUpdatePackagePayment,
  apiUpdatePackageStage,
  apiUpdatePackageDriveLink,
  apiTogglePackageSupport,
  apiUpdatePackageImage,
  apiConfigurePayment,
  apiUpdateUserProfile,
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

  // Members list (no automatic forced reset or <125 check)
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
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [catalogMyAcervoFilter, setCatalogMyAcervoFilter] = useState(false);
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
          if (Array.isArray(cloudData.items)) {
            setItems(cloudData.items);
          }
          if (Array.isArray(cloudData.packages)) {
            setPackages(cloudData.packages);
          }
          if (Array.isArray(cloudData.users) && cloudData.users.length > 0) {
            setUsers(cloudData.users);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(cloudData.users));
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
    // Requirement 7: Reiniciar navegação para 'home' e fechar todos os modais anteriores
    setView('home');
    setCatalogMyAcervoFilter(false);
    setIsFormOpen(false);
    setItemToEdit(null);
    setIsPackageModalOpen(false);
    setPackageToEdit(null);
    setPackageToMove(null);
    setPackageToDelete(null);
    setItemToDelete(null);
    setIsMembersModalOpen(false);
    setIsExportOpen(false);
    setIsSettingsOpen(false);
    setIsBulletinOpen(false);

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

    // Abre imediatamente o Modal de Boas-Vindas e Conferência para membros comuns com a tela inicial ao fundo
    if (!updatedUser.isMaster) {
      setIsProfileOpen(true);
    }
  };

  const handleUpdateCurrentUser = async (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    saveStoredCurrentUser(updatedUser);

    // Atualiza lista de usuários
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);

    // Propaga novo nome em todos os apoiadores de pacotes vinculados ao mesmo ID (Requirement 1)
    const nextPackages = packages.map((pkg) => {
      const apoiadores = (pkg.apoiadores || []).map((ap) => {
        if (ap.id === updatedUser.id) {
          return {
            ...ap,
            nome: updatedUser.nome,
            telefone: updatedUser.telefone,
            email: updatedUser.email,
          };
        }
        return ap;
      });
      const pagamentos = { ...(pkg.pagamentos || {}) };
      if (pagamentos[updatedUser.id]) {
        pagamentos[updatedUser.id] = {
          ...pagamentos[updatedUser.id],
          nome: updatedUser.nome,
        };
      }
      return { ...pkg, apoiadores, pagamentos };
    });
    setPackages(nextPackages);

    // Propaga em apoiadores de sugestões
    const nextItems = items.map((it) => {
      const apoiadores = (it.apoiadores || []).map((ap) => {
        if (ap.id === updatedUser.id) {
          return {
            ...ap,
            nome: updatedUser.nome,
            telefone: updatedUser.telefone,
            email: updatedUser.email,
          };
        }
        return ap;
      });
      return { ...it, apoiadores };
    });
    setItems(nextItems);

    try {
      await apiUpdateUserProfile(binId, {
        userId: updatedUser.id,
        nome: updatedUser.nome,
        telefone: updatedUser.telefone,
        email: updatedUser.email,
      });
    } catch (e) {
      console.warn('Fallback sync for user update:', e);
      syncWithCloud(nextItems, nextUsers, nextPackages);
    }
  };

  const handleOpenMyAcervo = () => {
    setIsProfileOpen(false);
    setCatalogMyAcervoFilter(true);
    setView('catalogo');
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
    // Requirement 7: Limpar sessão, fechar modais e resetar para a tela inicial
    setView('home');
    setCatalogMyAcervoFilter(false);
    setIsProfileOpen(false);
    setIsFormOpen(false);
    setItemToEdit(null);
    setIsPackageModalOpen(false);
    setPackageToEdit(null);
    setPackageToMove(null);
    setPackageToDelete(null);
    setItemToDelete(null);
    setIsMembersModalOpen(false);
    setIsExportOpen(false);
    setIsSettingsOpen(false);
    setIsBulletinOpen(false);
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

  const handleToggleSupportPackage = async (packageId: string) => {
    if (!currentUser) return;
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    if (pkg.etapaFinanciamento === 'PAGAMENTO' && !currentUser.isMaster) {
      showToast('A lista deste financiamento está travada para cobrança (Processo de Pagamento). Apenas o Mestre pode autorizar alterações.');
      return;
    }

    try {
      const res = await apiTogglePackageSupport(binId, packageId, currentUser, ADMIN_PASSWORD);
      if (res && res.package) {
        setPackages((prev) => prev.map((p) => (p.id === packageId ? res.package! : p)));
        const already = (pkg.apoiadores || []).some((a) => a.id === currentUser.id);
        showToast(already ? `Você saiu do rateio de "${pkg.titulo}".` : `Você entrou na vaquinha de "${pkg.titulo}"!`);
        return;
      }
    } catch (e) {
      console.warn('Fallback to local support toggle', e);
    }

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

  const handleUpdatePackageStage = async (packageId: string, etapa: 'COLETA' | 'PAGAMENTO') => {
    try {
      await apiUpdatePackageStage(binId, packageId, etapa, ADMIN_PASSWORD);
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, etapaFinanciamento: etapa } : p))
      );
    } catch (err: any) {
      console.error('Error updating stage:', err);
      const nextPackages = packages.map((p) =>
        p.id === packageId ? { ...p, etapaFinanciamento: etapa } : p
      );
      setPackages(nextPackages);
      syncWithCloud(items, users, nextPackages);
    }
  };

  const handleUpdatePackagePayment = async (packageId: string, memberId: string, informouPagamento: boolean) => {
    try {
      await apiUpdatePackagePayment(binId, packageId, memberId, informouPagamento, ADMIN_PASSWORD);
      setPackages((prev) =>
        prev.map((p) => {
          if (p.id !== packageId) return p;
          const pagamentos = { ...(p.pagamentos || {}) };
          pagamentos[memberId] = {
            memberId,
            informouPagamento,
            dataPagamentoInformado: informouPagamento ? new Date().toISOString() : undefined,
          };
          const apoiadores = (p.apoiadores || []).map((a) => {
            if (a.id === memberId) {
              return {
                ...a,
                pagamentoInformado: informouPagamento,
                dataPagamentoInformado: informouPagamento ? new Date().toISOString() : undefined,
              };
            }
            return a;
          });
          return { ...p, pagamentos, apoiadores };
        })
      );
    } catch (err: any) {
      console.error('Error updating payment:', err);
      const nextPackages = packages.map((p) => {
        if (p.id !== packageId) return p;
        const pagamentos = { ...(p.pagamentos || {}) };
        pagamentos[memberId] = {
          memberId,
          informouPagamento,
          dataPagamentoInformado: informouPagamento ? new Date().toISOString() : undefined,
        };
        const apoiadores = (p.apoiadores || []).map((a) => {
          if (a.id === memberId) {
            return {
              ...a,
              pagamentoInformado: informouPagamento,
              dataPagamentoInformado: informouPagamento ? new Date().toISOString() : undefined,
            };
          }
          return a;
        });
        return { ...p, pagamentos, apoiadores };
      });
      setPackages(nextPackages);
      syncWithCloud(items, users, nextPackages);
    }
  };

  const handleUpdateDriveLink = async (packageId: string, linkDrive: string) => {
    try {
      await apiUpdatePackageDriveLink(binId, packageId, linkDrive, ADMIN_PASSWORD);
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, linkDrive } : p))
      );
    } catch (err: any) {
      console.error('Error updating drive link:', err);
      const nextPackages = packages.map((p) =>
        p.id === packageId ? { ...p, linkDrive } : p
      );
      setPackages(nextPackages);
      syncWithCloud(items, users, nextPackages);
    }
  };

  const handleUpdatePackageImage = async (packageId: string, newImageUrl: string, adminPassword?: string) => {
    try {
      await apiUpdatePackageImage(binId, packageId, newImageUrl, adminPassword || ADMIN_PASSWORD);
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, imagemUrl: newImageUrl } : p))
      );
      showToast('Imagem de capa do pacote atualizada com sucesso!');
    } catch (err: any) {
      console.error('Error updating package image:', err);
      const nextPackages = packages.map((p) =>
        p.id === packageId ? { ...p, imagemUrl: newImageUrl } : p
      );
      setPackages(nextPackages);
      syncWithCloud(items, users, nextPackages);
      showToast('Imagem salva e sincronizada!');
    }
  };

  const handleConfigurePayment = async (params: {
    packageId: string;
    valorFinalPorParticipante: number;
    dataPagamento: string;
    chavePix: string;
    instrucoesPix?: string;
    iniciarEtapaPagamento: boolean;
    adminPassword: string;
  }) => {
    try {
      await apiConfigurePayment(binId, params.packageId, params);
      setPackages((prev) =>
        prev.map((p) => {
          if (p.id !== params.packageId) return p;
          return {
            ...p,
            valorFinalPorParticipante: params.valorFinalPorParticipante,
            dataPagamento: params.dataPagamento,
            chavePix: params.chavePix,
            instrucoesPix: params.instrucoesPix,
            etapaFinanciamento: params.iniciarEtapaPagamento ? 'PAGAMENTO' : p.etapaFinanciamento,
          };
        })
      );
      showToast(params.iniciarEtapaPagamento ? 'Etapa de Pagamento iniciada com cobrança definida!' : 'Dados de cobrança salvos com sucesso!');
    } catch (err: any) {
      console.error('Error configuring payment:', err);
      const nextPackages = packages.map((p) => {
        if (p.id !== params.packageId) return p;
        return {
          ...p,
          valorFinalPorParticipante: params.valorFinalPorParticipante,
          dataPagamento: params.dataPagamento,
          chavePix: params.chavePix,
          instrucoesPix: params.instrucoesPix,
          etapaFinanciamento: params.iniciarEtapaPagamento ? 'PAGAMENTO' : p.etapaFinanciamento,
        };
      });
      setPackages(nextPackages);
      syncWithCloud(items, users, nextPackages);
      showToast(params.iniciarEtapaPagamento ? 'Etapa de Pagamento iniciada!' : 'Dados de cobrança salvos!');
    }
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
    <div className="min-h-screen bg-[#F3E5C5] text-[#302414] flex flex-col font-sans selection:bg-[#48551F]/20 selection:text-[#302414]">
      
      {/* Modal de Entrada Obrigatório */}
      {!currentUser && (
        <UserAuthModal
          isOpen={!currentUser}
          users={users}
          onSelectExistingUser={handleSelectExistingUser}
        />
      )}

      {/* Cabeçalho */}
      <Header
        binId={binId}
        currentUser={currentUser}
        currentView={view}
        pendingUsersCount={pendingUsersCount}
        onNavigate={(v) => setView(v)}
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
                activePackages={packages}
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
                allUsers={users}
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
                onUpdateStage={handleUpdatePackageStage}
                onConfigurePayment={handleConfigurePayment}
                onUpdatePackageImage={handleUpdatePackageImage}
                onUpdatePayment={handleUpdatePackagePayment}
                onToast={showToast}
              />
            )}

            {view === 'catalogo' && (
              <CatalogoView
                packages={packages}
                allUsers={users}
                currentUser={currentUser}
                filterMyAcervo={catalogMyAcervoFilter}
                onToggleMyAcervo={(active) => setCatalogMyAcervoFilter(active)}
                onGoHome={() => setView('home')}
                onEditPackage={(pkg) => {
                  setPackageToEdit(pkg);
                  setIsPackageModalOpen(true);
                }}
                onDeletePackage={handleDeletePackage}
                onUpdateDriveLink={handleUpdateDriveLink}
                onUpdatePackageImage={handleUpdatePackageImage}
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
          onClose={() => {
            setIsProfileOpen(false);
            setView('home');
          }}
          currentUser={currentUser}
          packages={packages}
          items={items}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          onOpenMyAcervo={handleOpenMyAcervo}
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
            produto: (packageToDelete.tipo as ProductType) || 'Outros',
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
