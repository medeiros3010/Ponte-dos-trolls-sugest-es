import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ItemRPG,
  UserProfile,
  FundingPackage,
  AppView,
  Apoiador,
  ItemStatus,
  ProductType,
  MembershipApplication,
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
  apiSubmitApplication,
  apiFetchApplications,
  apiApproveApplication,
  apiRejectApplication,
  apiAddPosteriorBuyer,
  apiRemovePosteriorBuyer,
  apiVerifySession,
  apiLogout,
  apiSaveItem,
  apiDeleteItem,
  apiToggleItemSupport,
  apiSavePackage,
  apiDeletePackage,
  setSessionToken,
  DEFAULT_BIN_ID,
  USERS_VERSION,
} from './utils/cloudStorage';
import { RulesConfig, INITIAL_RULES_CONFIG } from './data/rulesAndQuestions';
import { isPackageAcquired, getUserAcquiredPackages } from './utils/ranksAndAcquisitions';
import { testConnection, auth } from './firebase/config';
import {
  bootstrapFirestoreIfEmpty,
  subscribeItems,
  subscribePackages,
  subscribeUsers,
  saveItemToFirestore,
  deleteItemFromFirestore,
  savePackageToFirestore,
  deletePackageFromFirestore,
} from './firebase/firestoreService';

import { Header } from './components/Header';
import { HomeHub } from './components/HomeHub';
import { SugestoesView } from './components/SugestoesView';
import { FinanciamentoView } from './components/FinanciamentoView';
import { CatalogoView } from './components/CatalogoView';
import { MembrosView } from './components/MembrosView';
import { MeusItensView } from './components/MeusItensView';

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
import { CartModal } from './components/CartModal';
import { WhatsAppCheckoutModal } from './components/WhatsAppCheckoutModal';
import { NewMemberApplicationModal, ApplicationDraft } from './components/NewMemberApplicationModal';
import { AmbientMusicPlayer } from './components/AmbientMusicPlayer';
import { Toast, ToastMessageItem } from './components/Toast';
import { InviteFriendModal } from './components/InviteFriendModal';
import { CheckCircle2 } from 'lucide-react';

const STORAGE_KEY_ITEMS = 'ponte_trolls_clean_v5';
const STORAGE_KEY_USERS = 'ponte_trolls_users_v5';
const STORAGE_KEY_PACKAGES = 'ponte_trolls_packages_v5';
const STORAGE_KEY_RATE = 'ponte_trolls_dollar_rate_v5';

export type EntryModalState = 'login' | 'solicitacao' | 'confirmacao_envio' | 'closed';

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

  // Cart State (stored per user ID or anonymous)
  const [cart, setCart] = useState<string[]>(() => {
    try {
      const key = `ponte_trolls_cart_${currentUser?.id || 'anon'}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Candidaturas / Solicitações de Novos Membros
  const [applications, setApplications] = useState<MembershipApplication[]>(() => {
    try {
      const stored = localStorage.getItem('ponte_trolls_solicitacoes_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Regras e Questionário da Comunidade
  const [rulesConfig, setRulesConfig] = useState<RulesConfig>(INITIAL_RULES_CONFIG);

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

  // Novos modais: Carrinho, Checkout WhatsApp, Cadastro de Novo Membro e Convidar Amigo
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isWhatsAppCheckoutOpen, setIsWhatsAppCheckoutOpen] = useState(false);
  const [isInviteFriendOpen, setIsInviteFriendOpen] = useState(false);
  
  // Controle de estado único para o fluxo de entrada (Login -> Solicitação -> Confirmação)
  const [entryModalState, setEntryModalState] = useState<EntryModalState>(() => {
    return getStoredCurrentUser() ? 'closed' : 'login';
  });

  // Validação inicial assíncrona de sessão salva (áudio não toca durante esta etapa)
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(() => {
    return Boolean(getStoredCurrentUser());
  });

  useEffect(() => {
    let isMounted = true;
    async function checkSavedSession() {
      const stored = getStoredCurrentUser();
      if (!stored) {
        if (isMounted) setIsValidatingSession(false);
        return;
      }
      try {
        const verified = await apiVerifySession();
        if (isMounted) {
          if (verified && verified.success && verified.user) {
            setCurrentUser(verified.user);
            saveStoredCurrentUser(verified.user);
          } else if (verified === null) {
            // Rede temporariamente indisponível: mantém usuário salvo
          } else {
            // Sessão expirada ou revogada
            setCurrentUser(null);
            saveStoredCurrentUser(null);
            setEntryModalState('login');
          }
        }
      } catch (e) {
        // Fallback local
      } finally {
        if (isMounted) setIsValidatingSession(false);
      }
    }
    checkSavedSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Firebase Firestore Connection & Real-Time Sync
  useEffect(() => {
    // Test Firestore connection on boot (Skill Critical Constraint)
    testConnection();

    // Bootstrap initial data if Firestore is empty
    bootstrapFirestoreIfEmpty();

    // Auth listener
    const unsubAuth = auth.onAuthStateChanged((fbUser) => {
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
        setCurrentUser(userProfile);
        saveStoredCurrentUser(userProfile);
        setEntryModalState('closed');
      }
    });

    // Real-time synchronization from Firestore
    let unsubItems: () => void = () => {};
    let unsubPackages: () => void = () => {};
    let unsubUsers: () => void = () => {};

    try {
      unsubItems = subscribeItems((cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          setItems(cloudItems);
        }
      });

      unsubPackages = subscribePackages((cloudPackages) => {
        if (cloudPackages && cloudPackages.length > 0) {
          setPackages(cloudPackages);
        }
      });

      unsubUsers = subscribeUsers((cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          setUsers(cloudUsers);
        }
      });
    } catch (err) {
      console.warn('[Firebase] Subscriptions warning:', err);
    }

    return () => {
      unsubAuth();
      unsubItems();
      unsubPackages();
      unsubUsers();
    };
  }, []);

  // Autenticação estrita confirmada (sessão válida, sem modais de entrada e validação finalizada)
  const isAuthenticated = Boolean(currentUser) && entryModalState === 'closed' && !isValidatingSession;

  // Preservação contínua do rascunho de candidatura entre etapas e navegação
  const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>({
    step: 1,
    agreedToRules: false,
    agreedTimestamp: '',
    answers: {},
    nome: '',
    email: '',
    telefone: '',
    comoConheceu: 'Indicação de um membro',
    indicadoPor: '',
  });

  // Fila de notificações toast empilháveis no topo direito
  const [toastQueue, setToastQueue] = useState<ToastMessageItem[]>([]);

  const showToast = useCallback((msg: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToastQueue((prev) => [...prev, { id, message: msg }]);
    setTimeout(() => {
      setToastQueue((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
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

  // Sincroniza carrinho no localStorage por usuário
  useEffect(() => {
    try {
      const key = `ponte_trolls_cart_${currentUser?.id || 'anon'}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCart(parsed);
          return;
        }
      }
      setCart([]);
    } catch (e) {
      setCart([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    try {
      const key = `ponte_trolls_cart_${currentUser?.id || 'anon'}`;
      localStorage.setItem(key, JSON.stringify(cart));
    } catch (e) {}
  }, [cart, currentUser?.id]);

  // Sincroniza solicitações no localStorage
  useEffect(() => {
    localStorage.setItem('ponte_trolls_solicitacoes_v2', JSON.stringify(applications));
  }, [applications]);

  // Initial cloud synchronization with USERS_VERSION enforcement
  useEffect(() => {
    let isMounted = true;
    async function loadFromCloud() {
      if (!binId) return;
      try {
        setIsSyncing(true);
        const cloudData = await fetchCloudData(binId, undefined, currentUser?.id, currentUser?.telefone);
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
          if (Array.isArray(cloudData.solicitacoes)) {
            setApplications(cloudData.solicitacoes);
          }
          if (cloudData.regrasConfig) {
            setRulesConfig(cloudData.regrasConfig);
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
  }, [binId, currentUser?.id, currentUser?.isMaster]);

  // Push to cloud helper
  const syncWithCloud = useCallback(
    async (
      newItems: ItemRPG[] = items,
      newUsers: UserProfile[] = users,
      newPackages: FundingPackage[] = packages,
      newApplications: MembershipApplication[] = applications,
      newRulesConfig: RulesConfig = rulesConfig
    ): Promise<boolean> => {
      if (!binId) return true;
      try {
        setIsSyncing(true);
        await pushCloudData(binId, newItems, newUsers, newPackages, newApplications, newRulesConfig, USERS_VERSION);
        return true;
      } catch (err: any) {
        console.error('Error syncing with cloud:', err);
        showToast('Aviso: Não foi possível salvar na nuvem.');
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [binId, items, users, packages, applications, rulesConfig, showToast]
  );

  // User Identification Handlers
  const handleSelectExistingUser = (user: UserProfile, updatedEmail?: string, updatedPhone?: string) => {
    // Reiniciar navegação para 'home' e fechar todos os modais anteriores
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
    setEntryModalState('closed');

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
    apiLogout();
    setSessionToken(null);
    setCart([]);
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
    setIsCartModalOpen(false);
    setIsWhatsAppCheckoutOpen(false);
    setEntryModalState('login');
    setCurrentUser(null);
    saveStoredCurrentUser(null);
  };

  // Cart Handlers
  const handleAddToCart = (packageId: string) => {
    if (!cart.includes(packageId)) {
      const nextCart = [...cart, packageId];
      setCart(nextCart);
      const pkg = packages.find((p) => p.id === packageId);
      showToast(`Adicionado ao carrinho: ${pkg?.titulo || 'Pacote'}`);
    } else {
      showToast('Este pacote já está no seu carrinho.');
    }
  };

  const handleRemoveFromCart = (packageId: string) => {
    const nextCart = cart.filter((id) => id !== packageId);
    setCart(nextCart);
    const pkg = packages.find((p) => p.id === packageId);
    showToast(`"${pkg?.titulo || 'Pacote'}" removido do carrinho.`);
  };

  const handleClearCart = () => {
    setCart([]);
    showToast('Carrinho esvaziado.');
  };

  // Membership Application Handlers
  const handleSubmitApplication = async (
    newAppData: Omit<MembershipApplication, 'id' | 'criadoEm'>
  ): Promise<boolean> => {
    try {
      const res = await apiSubmitApplication(newAppData, binId);
      if (res && res.success && res.application) {
        setApplications((prev) => [res.application!, ...prev]);
        showToast('✅ Solicitação de entrada enviada com sucesso! O Mestre avaliará seu cadastro.');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar solicitação.');
      return false;
    }
  };

  const handleApproveApplication = async (
    appId: string,
    adminPassword: string
  ): Promise<boolean> => {
    try {
      const res = await apiApproveApplication(appId, adminPassword, undefined, binId);
      if (res && res.success) {
        if (res.application) {
          setApplications((prev) => prev.map((a) => (a.id === appId ? res.application! : a)));
        }
        if (res.users) {
          setUsers(res.users);
        } else if (res.user) {
          setUsers((prev) => [...prev, res.user!]);
        }
        showToast(`✅ Candidato aprovado! O novo membro já pode acessar o sistema.`);
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Erro ao aprovar solicitação.');
      return false;
    }
  };

  const handleRejectApplication = async (
    appId: string,
    observacoes: string,
    adminPassword: string
  ): Promise<boolean> => {
    try {
      const res = await apiRejectApplication(appId, adminPassword, observacoes, binId);
      if (res && res.success) {
        if (res.application) {
          setApplications((prev) => prev.map((a) => (a.id === appId ? res.application! : a)));
        }
        showToast('Solicitação recusada.');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Erro ao recusar solicitação.');
      return false;
    }
  };

  // Sugestões Handlers
  const handleSaveItem = async (itemData: Omit<ItemRPG, 'id' | 'apoiadores'> & { id?: string; adminPassword?: string }) => {
    const isEdit = Boolean(itemData.id);
    try {
      const res = await apiSaveItem(binId, itemData, itemData.adminPassword);
      if (res && res.item) {
        if (isEdit) {
          setItems((prev) => prev.map((it) => (it.id === itemData.id ? res.item! : it)));
          showToast('Sugestão atualizada!');
        } else {
          setItems((prev) => [res.item!, ...prev]);
          showToast('Sugestão enviada com sucesso!');
        }
        // Sync to Firestore
        saveItemToFirestore(res.item).catch((err) => console.warn('Firestore sync item notice:', err));
        setIsFormOpen(false);
        setItemToEdit(null);
        return;
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar sugestão.');
    }
  };

  const handleToggleSupportItem = async (itemId: string) => {
    if (!currentUser) return;
    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;

    try {
      const res = await apiToggleItemSupport(binId, itemId, currentUser);
      if (res && res.item) {
        setItems((prev) => prev.map((it) => (it.id === itemId ? res.item! : it)));
        saveItemToFirestore(res.item).catch(() => {});
        const already = (targetItem.apoiadores || []).some((a) => a.id === currentUser.id);
        showToast(already ? `Você retirou seu apoio da sugestão "${targetItem.nome}".` : `Você apoiou "${targetItem.nome}"!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao alternar apoio');
    }
  };

  const handleConfirmDeleteItem = async (adminPassword?: string) => {
    if (!itemToDelete) return;
    try {
      await apiDeleteItem(binId, itemToDelete.id, adminPassword);
      setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id));
      deleteItemFromFirestore(itemToDelete.id).catch(() => {});
      showToast(`Item "${itemToDelete.nome}" excluído.`);
      setItemToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir item');
    }
  };

  // Funding Packages Handlers
  const handleSavePackage = async (
    pkgData: Omit<FundingPackage, 'id' | 'criadoEm'> & { id?: string; adminPassword?: string }
  ) => {
    try {
      const res = await apiSavePackage(binId, pkgData, pkgData.adminPassword);
      if (res && res.package) {
        if (pkgData.id) {
          setPackages((prev) => prev.map((p) => (p.id === pkgData.id ? res.package! : p)));
          showToast('Pacote atualizado com sucesso!');
        } else {
          setPackages((prev) => [res.package!, ...prev]);
          showToast('Novo pacote de financiamento criado!');
        }
        savePackageToFirestore(res.package).catch((err) => console.warn('Firestore sync package notice:', err));
        setPackageToEdit(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar pacote');
      throw err;
    }
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
      const res = await apiTogglePackageSupport(binId, packageId, currentUser);
      if (res && res.package) {
        setPackages((prev) => prev.map((p) => (p.id === packageId ? res.package! : p)));
        const already = (pkg.apoiadores || []).some((a) => a.id === currentUser.id);
        showToast(already ? `Você saiu do rateio de "${pkg.titulo}".` : `Você entrou na vaquinha de "${pkg.titulo}"!`);
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao atualizar participação');
    }
  };

  const handleUpdatePackageStage = async (packageId: string, etapa: 'COLETA' | 'PAGAMENTO', adminPassword?: string) => {
    try {
      await apiUpdatePackageStage(binId, packageId, etapa, adminPassword);
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, etapaFinanciamento: etapa } : p))
      );
    } catch (err: any) {
      console.error('Error updating stage:', err);
      showToast(err.message || 'Erro ao atualizar etapa');
    }
  };

  const handleUpdatePackagePayment = async (packageId: string, memberId: string, informouPagamento: boolean, adminPassword?: string) => {
    try {
      await apiUpdatePackagePayment(binId, packageId, memberId, informouPagamento, adminPassword);
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
      showToast(err.message || 'Erro ao registrar declaração de pagamento');
    }
  };

  const handleUpdateDriveLink = async (packageId: string, linkDrive: string, adminPassword?: string) => {
    try {
      await apiUpdatePackageDriveLink(binId, packageId, linkDrive, adminPassword);
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, linkDrive } : p))
      );
    } catch (err: any) {
      console.error('Error updating drive link:', err);
      showToast(err.message || 'Erro ao atualizar link do Drive');
    }
  };

  const handleUpdatePackageImage = async (packageId: string, newImageUrl: string, adminPassword?: string) => {
    try {
      await apiUpdatePackageImage(binId, packageId, newImageUrl, adminPassword);
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, imageUrl: newImageUrl } : p))
      );
      showToast('Imagem de capa do pacote atualizada com sucesso!');
    } catch (err: any) {
      console.error('Error updating package image:', err);
      showToast(err.message || 'Erro ao atualizar imagem da capa');
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
    deletePackageFromFirestore(packageToDelete.id).catch(() => {});
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

  // Pending applications & users count for Master badge on "Membros" button (Requirement 3)
  const pendingApplicationsCount = useMemo(() => {
    const pendingApps = applications.filter((a) => a.status === 'pendente').length;
    const pendingUsers = users.filter((u) => u.status === 'pendente').length;
    return pendingApps + pendingUsers;
  }, [applications, users]);

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
      
      {/* Global Ambient Music Player (Playlist 3 faixas - toca somente após login confirmado) */}
      <AmbientMusicPlayer isAuthenticated={isAuthenticated} />

      {/* Fluxo de Entrada Obrigatório: Apenas 1 janela ativa por vez (Login | Solicitação | Confirmação de Envio) */}
      {!currentUser && entryModalState === 'login' && (
        <UserAuthModal
          isOpen={true}
          users={users}
          binId={binId}
          onSelectExistingUser={handleSelectExistingUser}
          onOpenNewMemberApplication={() => setEntryModalState('solicitacao')}
        />
      )}

      {!currentUser && entryModalState === 'solicitacao' && (
        <NewMemberApplicationModal
          isOpen={true}
          onClose={() => setEntryModalState('login')}
          onSubmitApplication={handleSubmitApplication}
          onSubmitSuccess={() => setEntryModalState('confirmacao_envio')}
          draft={applicationDraft}
          onUpdateDraft={setApplicationDraft}
          rulesConfig={rulesConfig}
          onToast={showToast}
        />
      )}

      {!currentUser && entryModalState === 'confirmacao_envio' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#FBF7EE] text-[#302414] rounded-2xl shadow-2xl border-4 border-[#8B5A2B] p-6 sm:p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 mb-4 shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#302414] mb-2">
              Solicitação Enviada!
            </h2>
            <div className="w-16 h-1 bg-[#8B5A2B] rounded-full mx-auto mb-4" />
            <p className="text-sm text-[#5C4033] leading-relaxed mb-6">
              Sua solicitação de entrada na <strong>Ponte dos Trolls</strong> foi recebida com sucesso.
              O Mestre avaliará suas respostas e dados cadastrais. Assim que sua entrada for aprovada, você poderá selecionar seu nome na tela de entrada para explorar todo o acervo.
            </p>
            {applicationDraft.nome && (
              <div className="w-full bg-[#EFE3C3] border border-[#8B5A2B]/30 rounded-xl p-3 mb-6 text-xs text-[#422006] text-left space-y-1">
                <div><strong>Aventureiro(a):</strong> {applicationDraft.nome}</div>
                {applicationDraft.email && <div><strong>E-mail:</strong> {applicationDraft.email}</div>}
                {applicationDraft.telefone && <div><strong>WhatsApp:</strong> {applicationDraft.telefone}</div>}
                <div className="text-amber-800 font-semibold pt-1">Status: Aguardando aprovação do Mestre</div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setEntryModalState('login');
              }}
              className="w-full py-3 px-6 rounded-xl font-serif font-bold text-white bg-[#48551F] hover:bg-[#384318] active:scale-[0.98] transition-all shadow-md cursor-pointer"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <Header
        binId={binId}
        currentUser={currentUser}
        currentView={view}
        pendingUsersCount={pendingApplicationsCount}
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
        cartCount={cart.length}
        onOpenCart={() => setIsCartModalOpen(true)}
        myAcervoCount={currentUser ? getUserAcquiredPackages(currentUser, packages).length : 0}
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
                countMeusItens={currentUser ? getUserAcquiredPackages(currentUser, packages).length : 0}
                onNavigate={(v) => setView(v)}
                onOpenNewItem={() => {
                  setItemToEdit(null);
                  setIsFormOpen(true);
                }}
                onOpenInviteFriend={() => setIsInviteFriendOpen(true)}
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
                cartPackageIds={cart}
                onAddToCart={(pkg) => handleAddToCart(pkg.id)}
                onRemoveFromCart={handleRemoveFromCart}
                onOpenCart={() => setIsCartModalOpen(true)}
                onGoToMyItems={() => setView('meus-itens')}
                onAddPosteriorBuyer={async (packageId, memberId, adminPassword) => {
                  const member = users.find((u) => u.id === memberId);
                  if (!member) return false;
                  try {
                    const res = await apiAddPosteriorBuyer(binId, packageId, member, adminPassword);
                    if (res && res.package) {
                      setPackages((prev) => prev.map((p) => (p.id === packageId ? res.package! : p)));
                      showToast(`Acesso liberado para ${member.nome}!`);
                      return true;
                    }
                  } catch (e: any) {
                    showToast(e?.message || 'Erro ao liberar acesso');
                  }
                  return false;
                }}
                onRemovePosteriorBuyer={async (packageId, memberId, adminPassword) => {
                  try {
                    const res = await apiRemovePosteriorBuyer(binId, packageId, memberId, adminPassword);
                    if (res && res.package) {
                      setPackages((prev) => prev.map((p) => (p.id === packageId ? res.package! : p)));
                      showToast('Acesso removido.');
                      return true;
                    }
                  } catch (e: any) {
                    showToast(e?.message || 'Erro ao remover acesso');
                  }
                  return false;
                }}
                onToast={showToast}
              />
            )}

            {view === 'meus-itens' && (
              <MeusItensView
                packages={packages}
                currentUser={currentUser}
                onGoHome={() => setView('home')}
                onGoToCatalog={() => setView('catalogo')}
                onToast={showToast}
              />
            )}

            {view === 'membros' && (
              <MembrosView
                users={users}
                currentUser={currentUser}
                packages={packages}
                items={items}
                applications={applications}
                rulesConfig={rulesConfig}
                onGoHome={() => setView('home')}
                onAddUser={handleAddUserFromManagement}
                onUpdateUser={handleUpdateUserFromManagement}
                onDeleteUser={handleDeleteUser}
                onApproveApplication={handleApproveApplication}
                onRejectApplication={handleRejectApplication}
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

      {/* Modal de Carrinho de Compras */}
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        cartPackages={packages.filter((p) => cart.includes(p.id))}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onProceedToWhatsApp={() => {
          setIsCartModalOpen(false);
          setIsWhatsAppCheckoutOpen(true);
        }}
        onGoToCatalog={() => {
          setIsCartModalOpen(false);
          setView('catalogo');
        }}
      />

      {/* Modal de Checkout / WhatsApp Direto para o Mestre */}
      <WhatsAppCheckoutModal
        isOpen={isWhatsAppCheckoutOpen}
        onClose={() => setIsWhatsAppCheckoutOpen(false)}
        items={packages.filter((p) => cart.includes(p.id))}
        currentUser={currentUser}
        onToast={showToast}
      />

      {/* Modal de Convidar um Amigo */}
      {currentUser && (
        <InviteFriendModal
          isOpen={isInviteFriendOpen}
          onClose={() => setIsInviteFriendOpen(false)}
          currentUser={currentUser}
          onToast={showToast}
        />
      )}

      {/* Notificações Toast empilhadas no topo direito */}
      <Toast
        toasts={toastQueue}
        onRemoveToast={(id) => setToastQueue((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
