import { ItemRPG, UserProfile, ItemStatus, FundingPackage, PackageSubItem, FundingStage, ParticipantPaymentInfo, normalizeProductType } from '../types';
import { SEED_USERS, SEED_PACKAGES, SEED_ITEMS } from '../data/seedData';

export const CLOUD_BIN_KEY = 'ponte_trolls_bin_id_v4';
export const DEFAULT_BIN_ID = 'trolls-rpg-oficial';
export const CURRENT_USER_KEY = 'ponte_trolls_current_user_v2';

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
  usersVersion?: string;
}

export async function fetchCloudData(binOrUrl: string): Promise<CloudPayloadData | null> {
  const { url } = resolveEndpoint(binOrUrl);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
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
      }));
    }

    let packages: FundingPackage[] = SEED_PACKAGES;
    if (data.packages && Array.isArray(data.packages)) {
      packages = normalizeCloudPackages(data.packages);
    }

    return { items, users, packages, usersVersion: data.usersVersion };
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
  usersVersion: string = USERS_VERSION
): Promise<boolean> {
  const { url } = resolveEndpoint(binOrUrl);

  try {
    const payload = {
      id: binOrUrl,
      name: 'A Ponte dos Trolls - Rateios RPG',
      updatedAt: new Date().toISOString(),
      usersVersion,
      items,
      users,
      packages,
    };

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, informouPagamento, adminPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao registrar declaração de pagamento');
  }

  return await res.json();
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao atualizar dados do usuário');
  }

  return await res.json();
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
      criadoEm: pkg.criadoEm || new Date().toISOString().split('T')[0],
      finalizadoEm: pkg.finalizadoEm || undefined,
    };
  });
}

