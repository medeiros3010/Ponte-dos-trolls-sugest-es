import { ItemRPG, UserProfile, ItemStatus, FundingPackage, PackageSubItem, FundingStage, ParticipantPaymentInfo, normalizeProductType, MembershipApplication } from '../types';
import { RulesConfig } from '../data/rulesAndQuestions';
import { SEED_USERS, SEED_PACKAGES, SEED_ITEMS } from '../data/seedData';

export const CLOUD_BIN_KEY = 'ponte_trolls_bin_id_v4';
export const DEFAULT_BIN_ID = 'trolls-rpg-oficial';
export const CURRENT_USER_KEY = 'ponte_trolls_current_user_v2';
export const SESSION_TOKEN_KEY = 'ponte_trolls_session_token_v1';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {}
}

// Fallback host if opened offline via file:// or outside Cloud Run
export const FALLBACK_SERVER_URL = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
  ? window.location.origin
  : 'https://ais-pre-4yygmmgjezaxwzwlfxcm7n-236036871357.us-east1.run.app';

export function getInitialBinId(): string {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const binParam = params.get('bin') || params.get('db') || params.get('cloud');
      if (binParam) {
        const decoded = decodeURIComponent(binParam).trim();
        localStorage.setItem(CLOUD_BIN_KEY, decoded);
        return decoded;
      }
    }

    const stored = localStorage.getItem(CLOUD_BIN_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch (err) {
    console.warn('Error reading bin ID', err);
  }
  return DEFAULT_BIN_ID;
}

export function saveBinId(binId: string): void {
  try {
    localStorage.setItem(CLOUD_BIN_KEY, binId.trim());
  } catch (err) {
    console.error('Error saving bin ID', err);
  }
}

export function getStoredCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.nome) return parsed;
    }
  } catch (e) {
    console.warn('Error reading current user', e);
  }
  return null;
}

export function saveStoredCurrentUser(user: UserProfile | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Error saving current user', e);
  }
}

export function getShareableGroupLink(binId: string): string {
  if (typeof window === 'undefined') return '';
  const currentBin = (binId || DEFAULT_BIN_ID).trim();
  const origin = window.location.origin.startsWith('file:')
    ? FALLBACK_SERVER_URL
    : window.location.origin;
  const path = window.location.pathname || '/';
  return `${origin}${path}?bin=${encodeURIComponent(currentBin)}`;
}

function resolveEndpoint(binOrUrl: string): { url: string; isCustom: boolean } {
  const clean = (binOrUrl || DEFAULT_BIN_ID).trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return { url: clean, isCustom: true };
  }
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;
  return { url: `${base}/api/bin/${encodeURIComponent(clean)}`, isCustom: false };
}

export const USERS_VERSION = 'v2_125_oficial';

export interface CloudPayloadData {
  items: ItemRPG[];
  users: UserProfile[];
  packages: FundingPackage[];
  solicitacoes?: MembershipApplication[];
  regrasConfig?: RulesConfig;
  usersVersion?: string;
}

export async function fetchCloudData(
  binOrUrl: string,
  adminPassword?: string,
  currentUserId?: string,
  currentUserPhone?: string
): Promise<CloudPayloadData | null> {
  const { url } = resolveEndpoint(binOrUrl);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const token = getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-session-token'] = token;
    }
    if (adminPassword) {
      headers['x-admin-password'] = adminPassword;
    }
    if (currentUserId) {
      headers['x-user-id'] = currentUserId;
    }
    if (currentUserPhone) {
      headers['x-user-phone'] = currentUserPhone;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data) return null;

    let rawItems: any[] = [];
    if (data.items && Array.isArray(data.items)) {
      rawItems = data.items;
    } else if (Array.isArray(data)) {
      rawItems = data;
    } else if (data.data && Array.isArray(data.data.items)) {
      rawItems = data.data.items;
    } else if (typeof data === 'object') {
      rawItems = Object.values(data);
    }

    const items = rawItems.length > 0 ? normalizeCloudItems(rawItems) : [];

    let users: UserProfile[] = SEED_USERS;
    if (data.users && Array.isArray(data.users)) {
      users = data.users.map((u: any, idx: number) => ({
        id: u.id || `usr-${idx}`,
        nome: String(u.nome || '').trim(),
        telefone: String(u.telefone || '').trim(),
        email: String(u.email || '').trim(),
        createdAt: u.createdAt || new Date().toISOString(),
        isMaster: Boolean(u.isMaster),
        status: (u.status as any) || 'aprovado',
        strikes: u.strikes !== undefined ? u.strikes : [],
        solicitacaoId: u.solicitacaoId || undefined,
      }));
    }

    let packages: FundingPackage[] = SEED_PACKAGES;
    if (data.packages && Array.isArray(data.packages)) {
      packages = normalizeCloudPackages(data.packages);
    }

    const solicitacoes: MembershipApplication[] = Array.isArray(data.solicitacoes)
      ? data.solicitacoes
      : [];

    return {
      items,
      users,
      packages,
      solicitacoes,
      regrasConfig: data.regrasConfig,
      usersVersion: data.usersVersion,
    };
  } catch (err) {
    console.error('fetchCloudData error:', err);
    throw err;
  }
}

export async function pushCloudData(
  binOrUrl: string,
  items: ItemRPG[],
  users: UserProfile[],
  packages: FundingPackage[],
  solicitacoes?: MembershipApplication[],
  regrasConfig?: RulesConfig,
  usersVersion: string = USERS_VERSION
): Promise<boolean> {
  const { url } = resolveEndpoint(binOrUrl);

  try {
    const payload: any = {
      id: binOrUrl,
      name: 'A Ponte dos Trolls - Rateios RPG',
      updatedAt: new Date().toISOString(),
      usersVersion,
      items,
      users,
      packages,
    };

    if (Array.isArray(solicitacoes)) {
      payload.solicitacoes = solicitacoes;
    }
    if (regrasConfig) {
      payload.regrasConfig = regrasConfig;
    }

    const token = getSessionToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-session-token'] = token;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || errJson.details || `Erro ${res.status} ao salvar no servidor`);
    }

    return true;
  } catch (err) {
    console.error('pushCloudData error:', err);
    throw err;
  }
}

// Backwards-compatible aliases
export async function fetchItemsFromCloud(binOrUrl: string): Promise<ItemRPG[] | null> {
  const data = await fetchCloudData(binOrUrl);
  return data ? data.items : null;
}

export async function pushItemsToCloud(binOrUrl: string, items: ItemRPG[]): Promise<boolean> {
  return pushCloudData(binOrUrl, items, SEED_USERS, SEED_PACKAGES);
}

export async function createNewCloudBin(
  initialItems: ItemRPG[],
  initialUsers: UserProfile[] = SEED_USERS
): Promise<string | null> {
  try {
    const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
      ? window.location.origin
      : FALLBACK_SERVER_URL;

    const res = await fetch(`${base}/api/bin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: initialItems, users: initialUsers }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.id;
    }
  } catch (err) {
    console.error('createNewCloudBin error:', err);
  }
  return null;
}

/**
 * Upload de arquivo de imagem para o servidor
 * Salva no disco com URL permanente /uploads/... evitando base64 gigante no JSON compartilhado.
 */
export async function uploadImageFile(file: File): Promise<{ url: string } | null> {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    throw new Error('Tipo de imagem não suportado. Por favor, selecione um arquivo JPG, PNG, WebP ou GIF.');
  }

  // Máximo 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A imagem é muito pesada (máximo permitido: 5MB).');
  }

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileData: base64Data,
      fileName: file.name,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Erro no upload (HTTP ${res.status})`);
  }

  const json = await res.json();
  return { url: json.url };
}

function getAuthHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...additionalHeaders };
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }
  try {
    const raw = localStorage.getItem('ponte_trolls_user_v2');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.email) headers['x-user-email'] = u.email;
      if (u?.id) headers['x-user-id'] = u.id;
      if (u?.isMaster) headers['x-is-master'] = 'true';
    }
  } catch {}
  return headers;
}

/**
 * Autenticação do Mestre via servidor
 */
export async function apiMasterLogin(
  password: string,
  binId: string = DEFAULT_BIN_ID
): Promise<{ success: boolean; token: string; user: UserProfile }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/auth/master-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password, binId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao autenticar como Mestre');
  }

  if (data.token) {
    setSessionToken(data.token);
  }
  return data;
}

/**
 * Autenticação de membro via servidor
 */
export async function apiMemberLogin(
  memberId: string,
  telefone?: string,
  binId: string = DEFAULT_BIN_ID
): Promise<{ success: boolean; token: string; user: UserProfile }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ memberId, telefone, binId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao autenticar membro');
  }

  if (data.token) {
    setSessionToken(data.token);
  }
  return data;
}

/**
 * Verificação de sessão atual com o servidor
 */
export async function apiVerifySession(): Promise<{ success: boolean; user?: UserProfile; session?: any } | null> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  try {
    const res = await fetch(`${base}/api/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders({ Accept: 'application/json' }),
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Logout do servidor
 */
export async function apiLogout(): Promise<void> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  try {
    await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
    });
  } catch {}
  setSessionToken(null);
}

/**
 * Criação ou edição atômica de sugestão
 */
export async function apiSaveItem(
  binId: string,
  item: Partial<ItemRPG>,
  adminPassword?: string
): Promise<{ success: boolean; item?: ItemRPG }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/item`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ item, adminPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao salvar sugestão');
  }
  return data;
}

/**
 * Exclusão atômica de sugestão
 */
export async function apiDeleteItem(
  binId: string,
  itemId: string,
  adminPassword?: string
): Promise<{ success: boolean }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/item/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ adminPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao excluir sugestão');
  }
  return data;
}

/**
 * Alterna apoio a uma sugestão
 */
export async function apiToggleItemSupport(
  binId: string,
  itemId: string,
  user: UserProfile
): Promise<{ success: boolean; item?: ItemRPG; apoiadores?: any[] }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/item/${encodeURIComponent(itemId)}/apoio`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ user }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao alternar apoio');
  }
  return data;
}

/**
 * Salva ou edita um pacote de financiamento de forma atômica
 */
export async function apiSavePackage(
  binId: string,
  pkg: Partial<FundingPackage>,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ pkg, package: pkg, adminPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao salvar pacote');
  }
  return data;
}

/**
 * Exclui um pacote de forma atômica
 */
export async function apiDeletePackage(
  binId: string,
  packageId: string,
  adminPassword?: string
): Promise<{ success: boolean }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ adminPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao excluir pacote');
  }
  return data;
}

/**
 * Atualização atômica de pagamento pelo membro ou mestre
 */
export async function apiUpdatePackagePayment(
  binId: string,
  packageId: string,
  memberId: string,
  informouPagamento: boolean,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/pagamento`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ memberId, informouPagamento, adminPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao registrar declaração de pagamento');
  }

  return data;
}

/**
 * Atualização atômica da etapa de financiamento pelo Mestre
 */
export async function apiUpdatePackageStage(
  binId: string,
  packageId: string,
  etapa: FundingStage,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/etapa`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ etapa, adminPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao alterar etapa do financiamento');
  }

  return await res.json();
}

/**
 * Atualização atômica do link do Google Drive
 */
export async function apiUpdatePackageDriveLink(
  binId: string,
  packageId: string,
  linkDrive: string,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/drive-link`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ linkDrive, adminPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao atualizar link do Drive');
  }

  return await res.json();
}

/**
 * Atualização atômica de participação em pacote
 */
export async function apiTogglePackageSupport(
  binId: string,
  packageId: string,
  user: UserProfile,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage; apoiadores?: any[] }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/apoio`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ user, adminPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao atualizar participação');
  }

  return await res.json();
}

/**
 * Atualização atômica da capa do pacote pelo Mestre
 */
export async function apiUpdatePackageImage(
  binId: string,
  packageId: string,
  imageUrl: string,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage; imageUrl?: string }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/image`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ imageUrl, adminPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao atualizar capa do pacote');
  }

  return await res.json();
}

/**
 * Configuração atômica de dados de cobrança e início de pagamento pelo Mestre
 */
export async function apiConfigurePayment(
  binId: string,
  packageId: string,
  params: {
    valorFinalPorParticipante: number;
    dataPagamento: string;
    chavePix: string;
    instrucoesPix?: string;
    iniciarEtapaPagamento?: boolean;
    adminPassword?: string;
  }
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/configure-payment`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao configurar cobrança de pagamento');
  }

  return await res.json();
}

/**
 * Atualização atômica do perfil do próprio usuário (Nome, Telefone, Email)
 */
export async function apiUpdateUserProfile(
  binId: string,
  params: {
    userId: string;
    nome: string;
    telefone: string;
    email: string;
  }
): Promise<{ success: boolean; user?: UserProfile; users?: UserProfile[]; packages?: FundingPackage[] }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/user/update-profile`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao atualizar dados do usuário');
  }

  return await res.json();
}

/**
 * Envia uma solicitação de entrada de novo membro
 */
export async function apiSubmitApplication(
  app: Omit<MembershipApplication, 'id' | 'criadoEm'>,
  binId: string = DEFAULT_BIN_ID
): Promise<{ success: boolean; application?: MembershipApplication; message?: string }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/solicitacoes`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ ...app, binId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao enviar solicitação.');
  }

  return data;
}

/**
 * Busca todas as solicitações de membros cadastradas
 */
export async function apiFetchApplications(
  binId: string = DEFAULT_BIN_ID
): Promise<MembershipApplication[]> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/solicitacoes?binId=${encodeURIComponent(binId)}`, {
    method: 'GET',
    headers: getAuthHeaders({ Accept: 'application/json' }),
    credentials: 'include',
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
}

/**
 * Mestre aprova uma solicitação de entrada
 */
export async function apiApproveApplication(
  applicationId: string,
  adminPassword?: string,
  observacoesMestre?: string,
  binId: string = DEFAULT_BIN_ID
): Promise<{ success: boolean; application?: MembershipApplication; user?: UserProfile; users?: UserProfile[] }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/solicitacoes/${encodeURIComponent(applicationId)}/aprovar`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ adminPassword, observacoesMestre, binId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao aprovar solicitação.');
  }

  return data;
}

/**
 * Mestre recusa uma solicitação de entrada
 */
export async function apiRejectApplication(
  applicationId: string,
  adminPassword?: string,
  observacoesMestre?: string,
  binId: string = DEFAULT_BIN_ID
): Promise<{ success: boolean; application?: MembershipApplication }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/solicitacoes/${encodeURIComponent(applicationId)}/recusar`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ adminPassword, observacoesMestre, binId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao recusar solicitação.');
  }

  return data;
}

/**
 * Adiciona comprador posterior a um pacote do Catálogo (Mestre)
 */
export async function apiAddPosteriorBuyer(
  binId: string,
  packageId: string,
  member: { id: string; nome: string; telefone?: string; email?: string },
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/posterior-buyer`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({
      memberId: member.id,
      nome: member.nome,
      telefone: member.telefone,
      email: member.email,
      adminPassword,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao adicionar comprador posterior');
  }

  return data;
}

/**
 * Remove comprador posterior de um pacote do Catálogo (Mestre)
 */
export async function apiRemovePosteriorBuyer(
  binId: string,
  packageId: string,
  memberId: string,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/posterior-buyer/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ adminPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao remover comprador posterior');
  }

  return data;
}

/**
 * Solicitação de acesso a um pacote via carrinho
 */
export async function apiRequestPackageAccess(
  binId: string,
  packageId: string,
  member: { memberId: string; nome: string; telefone?: string; email?: string }
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(`${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/request-access`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(member),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao registrar solicitação de acesso');
  }

  return data;
}

/**
  * Recusa/cancela solicitação de acesso a um pacote (Mestre)
  */
export async function apiRejectPackageAccess(
  binId: string,
  packageId: string,
  memberId: string,
  adminPassword?: string
): Promise<{ success: boolean; package?: FundingPackage }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(
    `${base}/api/bin/${encodeURIComponent(binId)}/package/${encodeURIComponent(packageId)}/request-access/${encodeURIComponent(memberId)}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ adminPassword }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao recusar solicitação de acesso');
  }

  return data;
}

/**
 * Consulta o acervo de um membro (exclusivo para o Mestre com validação no servidor)
 */
export async function apiFetchMemberAcervo(
  binId: string,
  memberId: string,
  adminPassword?: string
): Promise<{ success: boolean; member: any; packages: FundingPackage[]; count: number }> {
  const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
    ? window.location.origin
    : FALLBACK_SERVER_URL;

  const res = await fetch(
    `${base}/api/bin/${encodeURIComponent(binId)}/member/${encodeURIComponent(memberId)}/acervo`,
    {
      method: 'GET',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        ...(adminPassword ? { 'x-admin-password': adminPassword } : {}),
      }),
      credentials: 'include',
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao consultar acervo do membro');
  }

  return data;
}

function normalizeCloudItems(rawList: any[]): ItemRPG[] {
  return rawList.map((row, idx) => {
    const rawValor = row.valor ? String(row.valor) : '';
    const rawAutor = row.sugestaoDe ? String(row.sugestaoDe) : (row.sugeridoPorNome || 'Membro do Grupo');

    let status: ItemStatus = 'Sugestão';
    const sLower = String(row.status || '').toLowerCase();
    if (sLower.includes('financiado') || sLower.includes('drive') || sLower.includes('finalizado')) {
      status = 'Finalizados';
    } else if (sLower.includes('em financiamento') || sLower.includes('vaquinha') || sLower.includes('andamento')) {
      status = 'Em Financiamento';
    } else {
      status = 'Sugestão';
    }

    let apoiadores = [];
    if (Array.isArray(row.apoiadores)) {
      apoiadores = row.apoiadores;
    } else if (rawAutor) {
      apoiadores = [{ id: `ap-${idx}`, nome: rawAutor }];
    }

    const { tipo, sistema } = normalizeProductType(row.produto, row.sistema);

    return {
      id: row.id || `cloud-${Date.now()}-${idx}`,
      data: row.data ? String(row.data) : new Date().toISOString().split('T')[0],
      nome: row.nome || 'Item',
      produto: tipo,
      sistema: row.sistema || sistema,
      descricao: row.descricao || '',
      link: row.link || '',
      imageUrl: row.imageUrl || undefined,
      sugeridoPorNome: rawAutor,
      sugeridoPorTelefone: row.sugeridoPorTelefone || '',
      sugeridoPorEmail: row.sugeridoPorEmail || '',
      moeda: rawValor.includes('R$') ? 'BRL' : (row.moeda || 'USD'),
      valorNumerico: typeof row.valorNumerico === 'number'
        ? row.valorNumerico
        : (parseFloat(rawValor.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0),
      observacaoValor: row.observacaoValor || (rawValor.includes('(') ? rawValor : ''),
      status,
      apoiadores,
      packageId: row.packageId || undefined,
    };
  });
}

function normalizeCloudPackages(rawList: any[]): FundingPackage[] {
  return rawList.map((pkg, idx) => {
    let status: 'Financiamento' | 'Catálogo' = 'Financiamento';
    const sLower = String(pkg.status || '').toLowerCase();
    if (sLower.includes('catálogo') || sLower.includes('catalogo') || sLower.includes('finalizado') || sLower.includes('drive')) {
      status = 'Catálogo';
    } else {
      status = 'Financiamento';
    }

    const valorTotalBRL = typeof pkg.valorTotalBRL === 'number'
      ? pkg.valorTotalBRL
      : (parseFloat(pkg.valorTotalBRL) || 0);

    const minimoParticipantes = typeof pkg.minimoParticipantes === 'number' && pkg.minimoParticipantes > 0
      ? pkg.minimoParticipantes
      : 35;

    const valorMaximoPorPessoa = typeof pkg.valorMaximoPorPessoa === 'number' && pkg.valorMaximoPorPessoa > 0
      ? pkg.valorMaximoPorPessoa
      : Number((valorTotalBRL / minimoParticipantes).toFixed(2));

    const itensInclusos: string[] = Array.isArray(pkg.itensInclusos) ? pkg.itensInclusos : [];

    const norm = normalizeProductType(pkg.tipo || pkg.produto, pkg.sistema);

    const itens: PackageSubItem[] = (Array.isArray(pkg.itens) && pkg.itens.length > 0)
      ? pkg.itens.map((it: any, itIdx: number) => {
          const itemNorm = normalizeProductType(it.tipo || it.produto, it.sistema);
          return {
            id: it.id || `it-${itIdx}`,
            nome: it.nome || 'Item',
            sistema: it.sistema || pkg.sistema || 'Foundry VTT Geral',
            tipo: it.tipo || itemNorm.tipo,
            link: it.link || pkg.linkLoja || '',
            precoBRL: typeof it.precoBRL === 'number' ? it.precoBRL : (parseFloat(it.precoBRL) || 0),
            imageUrl: it.imageUrl || undefined,
          };
        })
      : itensInclusos.map((itName: string, itIdx: number) => ({
          id: `it-${itIdx}`,
          nome: String(itName),
          sistema: pkg.sistema || 'Foundry VTT Geral',
          tipo: 'Material para VTT' as const,
          link: pkg.linkLoja || '',
          precoBRL: 0,
        }));

    // Ensure pagamentos record exists and maps any existing declaration
    const pagamentos: Record<string, ParticipantPaymentInfo> = pkg.pagamentos && typeof pkg.pagamentos === 'object'
      ? { ...pkg.pagamentos }
      : {};

    const apoiadores = Array.isArray(pkg.apoiadores) ? pkg.apoiadores.map((a: any) => {
      const isPaid = Boolean(a.pagamentoInformado || (pagamentos[a.id] && pagamentos[a.id].informouPagamento));
      const payDate = a.dataPagamentoInformado || (pagamentos[a.id] && pagamentos[a.id].dataPagamentoInformado);
      if (isPaid && !pagamentos[a.id]) {
        pagamentos[a.id] = {
          memberId: a.id,
          nome: a.nome,
          informouPagamento: true,
          dataPagamentoInformado: payDate,
        };
      }
      return {
        id: a.id,
        nome: a.nome,
        telefone: a.telefone || '',
        email: a.email || '',
        data: a.data,
        pagamentoInformado: isPaid,
        dataPagamentoInformado: payDate,
      };
    }) : [];

    return {
      id: pkg.id || `pack-${Date.now()}-${idx}`,
      titulo: pkg.titulo || 'Pacote de RPG',
      sistema: pkg.sistema || norm.sistema || 'Outro',
      tipo: pkg.tipo || norm.tipo,
      descricao: pkg.descricao || '',
      imageUrl: pkg.imageUrl || undefined,
      itens,
      valorTotalBRL,
      minimoParticipantes,
      valorMaximoPorPessoa,
      valorCatalogoBRL: typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : valorTotalBRL,
      dataFinalizar: pkg.dataFinalizar || '2026-03-25',
      dataPagamento: pkg.dataPagamento || '2026-03-30',
      linkLoja: pkg.linkLoja || '',
      linkDrive: pkg.linkDrive || '',
      itensInclusos: itensInclusos.length > 0 ? itensInclusos : itens.map((it: PackageSubItem) => it.nome),
      sugestoesIds: Array.isArray(pkg.sugestoesIds) ? pkg.sugestoesIds : [],
      status,
      etapaFinanciamento: pkg.etapaFinanciamento === 'PAGAMENTO' ? 'PAGAMENTO' : 'COLETA',
      valorFinalPorParticipante: typeof pkg.valorFinalPorParticipante === 'number' ? pkg.valorFinalPorParticipante : undefined,
      chavePix: typeof pkg.chavePix === 'string' ? pkg.chavePix : undefined,
      instrucoesPix: typeof pkg.instrucoesPix === 'string' ? pkg.instrucoesPix : undefined,
      pagamentos,
      apoiadores,
      solicitacoesAcesso: Array.isArray(pkg.solicitacoesAcesso)
        ? pkg.solicitacoesAcesso.map((s: any) => ({
            memberId: String(s.memberId || '').trim(),
            nome: String(s.nome || '').trim(),
            data: s.data || new Date().toISOString(),
            telefone: s.telefone ? String(s.telefone).trim() : undefined,
            email: s.email ? String(s.email).trim() : undefined,
          }))
        : [],
      criadoEm: pkg.criadoEm || new Date().toISOString().split('T')[0],
      finalizadoEm: pkg.finalizadoEm || undefined,
    };
  });
}

/**
 * Chama o endpoint administrativo do backend para sincronizar os 125 membros da planilha oficial.
 */
export async function apiSyncOfficialMembers(adminPassword?: string): Promise<{
  success: boolean;
  count: number;
  users: UserProfile[];
  message: string;
}> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['x-session-token'] = token;
  if (adminPassword) headers['x-admin-password'] = adminPassword;

  const res = await fetch('/api/admin/sync-official-members', {
    method: 'POST',
    headers,
    body: JSON.stringify({ adminPassword }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao sincronizar membros oficiais no servidor.');
  }
  return json;
}


