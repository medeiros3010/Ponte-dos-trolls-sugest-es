import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch,
} from 'firebase/firestore';
import { signInWithPopup, signOut as fbSignOut, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { ItemRPG, FundingPackage, UserProfile, MembershipApplication } from '../types';
import { SEED_ITEMS, SEED_PACKAGES, SEED_USERS } from '../data/seedData';

// Collections
const ITEMS_COLLECTION = 'items';
const PACKAGES_COLLECTION = 'packages';
const USERS_COLLECTION = 'users';
const APPLICATIONS_COLLECTION = 'solicitacoes';
const ADMINS_COLLECTION = 'admins';

/**
 * Google Sign In via Popup (preferred in AI Studio iframe environment)
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (err) {
    console.error('Google Sign In error:', err);
    throw err;
  }
}

/**
 * Sign Out from Firebase
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.error('Sign Out error:', err);
  }
}

/**
 * Bootstraps initial data into Firestore if empty
 */
export async function bootstrapFirestoreIfEmpty(): Promise<void> {
  try {
    const itemsSnap = await getDocs(collection(db, ITEMS_COLLECTION));
    if (itemsSnap.empty) {
      console.log('[Firebase] Bootstrapping initial items to Firestore...');
      const batch = writeBatch(db);
      for (const item of SEED_ITEMS) {
        batch.set(doc(db, ITEMS_COLLECTION, item.id), item);
      }
      await batch.commit();
    }

    const packagesSnap = await getDocs(collection(db, PACKAGES_COLLECTION));
    if (packagesSnap.empty) {
      console.log('[Firebase] Bootstrapping initial packages to Firestore...');
      const batch = writeBatch(db);
      for (const pkg of SEED_PACKAGES) {
        batch.set(doc(db, PACKAGES_COLLECTION, pkg.id), pkg);
      }
      await batch.commit();
    }

    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    if (usersSnap.empty) {
      console.log('[Firebase] Bootstrapping initial users to Firestore...');
      // Split into batches of 100
      let batch = writeBatch(db);
      let count = 0;
      for (const u of SEED_USERS) {
        batch.set(doc(db, USERS_COLLECTION, u.id), u);
        count++;
        if (count % 100 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % 100 !== 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    console.warn('[Firebase] Bootstrap check notice (permissions or already seeded):', error);
  }
}

/**
 * Subscribe to Items collection
 */
export function subscribeItems(
  onData: (items: ItemRPG[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = ITEMS_COLLECTION;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: ItemRPG[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ItemRPG);
      });
      onData(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Save Item to Firestore
 */
export async function saveItemToFirestore(item: ItemRPG): Promise<void> {
  const path = `${ITEMS_COLLECTION}/${item.id}`;
  try {
    await setDoc(doc(db, ITEMS_COLLECTION, item.id), item, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete Item from Firestore
 */
export async function deleteItemFromFirestore(itemId: string): Promise<void> {
  const path = `${ITEMS_COLLECTION}/${itemId}`;
  try {
    await deleteDoc(doc(db, ITEMS_COLLECTION, itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to Packages collection
 */
export function subscribePackages(
  onData: (packages: FundingPackage[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = PACKAGES_COLLECTION;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const packages: FundingPackage[] = [];
      snapshot.forEach((docSnap) => {
        packages.push(docSnap.data() as FundingPackage);
      });
      onData(packages);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Save Package to Firestore
 */
export async function savePackageToFirestore(pkg: FundingPackage): Promise<void> {
  const path = `${PACKAGES_COLLECTION}/${pkg.id}`;
  try {
    await setDoc(doc(db, PACKAGES_COLLECTION, pkg.id), pkg, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete Package from Firestore
 */
export async function deletePackageFromFirestore(packageId: string): Promise<void> {
  const path = `${PACKAGES_COLLECTION}/${packageId}`;
  try {
    await deleteDoc(doc(db, PACKAGES_COLLECTION, packageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to Users collection
 */
export function subscribeUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = USERS_COLLECTION;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as UserProfile);
      });
      onData(users);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Save User to Firestore
 */
export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  const path = `${USERS_COLLECTION}/${user.id}`;
  try {
    await setDoc(doc(db, USERS_COLLECTION, user.id), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Submit Membership Application to Firestore
 */
export async function submitApplicationToFirestore(app: MembershipApplication): Promise<void> {
  const path = `${APPLICATIONS_COLLECTION}/${app.id}`;
  try {
    await setDoc(doc(db, APPLICATIONS_COLLECTION, app.id), app);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Sincroniza a Planilha Oficial de 125 membros com a coleção 'users' no Firestore.
 * 1. Apaga todos os membros comuns existentes (garantindo a preservação total do Mestre Administrador).
 * 2. Insere os 125 membros mapeados para o formato { id, nome, telefone, email, status: 'aprovado', strikes: [], createdAt: '...' }.
 * 3. Garante que o documento do Mestre Administrador ('usr-master') permaneça ativo e intocado.
 */
export async function syncOfficialMembersToFirestore(
  onProgress?: (message: string) => void
): Promise<{ success: boolean; count: number; users: UserProfile[]; message: string }> {
  const path = USERS_COLLECTION;
  try {
    onProgress?.('Iniciando comunicação com a coleção de usuários no Firestore...');
    const usersCollectionRef = collection(db, USERS_COLLECTION);
    const existingSnap = await getDocs(usersCollectionRef);

    onProgress?.(`Encontrados ${existingSnap.size} registros no Firestore. Identificando documentos para limpeza...`);

    // 1. Filtrar documentos a serem apagados, PRESERVANDO o Mestre Administrador
    const docsToDelete = existingSnap.docs.filter((docSnap) => {
      const data = docSnap.data();
      const isMaster =
        docSnap.id === 'usr-master' ||
        data.isMaster === true ||
        (data.email && data.email.toLowerCase() === 'pontedostrolls@gmail.com') ||
        (data.nome && data.nome.toLowerCase() === 'ponte dos trolls');
      return !isMaster;
    });

    // Apagar em lotes (batch) de até 400
    if (docsToDelete.length > 0) {
      onProgress?.(`Apagando ${docsToDelete.length} membros antigos no Firestore (preservando Mestre)...`);
      for (let i = 0; i < docsToDelete.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = docsToDelete.slice(i, i + 400);
        for (const d of chunk) {
          batch.delete(doc(db, USERS_COLLECTION, d.id));
        }
        await batch.commit();
      }
    }

    // 2. Carregar os 125 membros oficiais
    onProgress?.('Carregando base de 125 membros oficiais da planilha...');
    let rawMembers: any[] = [];
    try {
      const res = await fetch('/assets/aistudio/membros_ponte_dos_trolls_5a53fd88.json');
      if (res.ok) {
        rawMembers = await res.json();
      }
    } catch (e) {
      console.warn('Falha ao carregar JSON via fetch, usando SEED_USERS como fallback:', e);
    }

    const officialUsers: UserProfile[] = (rawMembers && rawMembers.length > 0)
      ? rawMembers.map((m: any, idx: number) => {
          const cleanPhone = String(m.whatsapp || m.telefone || '').replace(/[^\d+]/g, '').trim();
          return {
            id: `u_${idx + 1}`,
            nome: String(m.nome || `Membro ${idx + 1}`).trim(),
            telefone: cleanPhone || String(m.whatsapp || m.telefone || '').trim(),
            email: String(m.email || '').trim().toLowerCase(),
            status: 'aprovado' as const,
            createdAt: '2026-02-15',
            strikes: [],
            isMaster: false,
          };
        })
      : SEED_USERS.filter((u) => !u.isMaster);

    // 3. Inserir em lotes no Firestore
    onProgress?.(`Gravando ${officialUsers.length} novos membros no Firestore...`);
    for (let i = 0; i < officialUsers.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = officialUsers.slice(i, i + 400);
      for (const u of chunk) {
        batch.set(doc(db, USERS_COLLECTION, u.id), u);
      }
      await batch.commit();
    }

    // 4. Garantir que o Mestre Administrador existe e está configurado
    onProgress?.('Validando credenciais do Mestre Administrador...');
    const masterUser: UserProfile = {
      id: 'usr-master',
      nome: 'Ponte dos Trolls',
      telefone: '(19) 98151-2030',
      email: 'pontedostrolls@gmail.com',
      status: 'aprovado',
      createdAt: '2026-01-01',
      strikes: [],
      isMaster: true,
    };
    await setDoc(doc(db, USERS_COLLECTION, 'usr-master'), masterUser, { merge: true });

    const finalUsers = [masterUser, ...officialUsers];
    onProgress?.('Sincronização com o Firestore concluída com êxito!');

    return {
      success: true,
      count: officialUsers.length,
      users: finalUsers,
      message: `${officialUsers.length} membros oficiais sincronizados no Firestore com sucesso!`,
    };
  } catch (error: any) {
    console.error('Erro na sincronização de membros com o Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

