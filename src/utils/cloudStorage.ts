import { ItemRPG } from '../types';

export const CLOUD_BIN_KEY = 'ponte_trolls_bin_id_v4';
export const DEFAULT_BIN_ID = 'trolls-rpg-oficial';

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

export async function fetchItemsFromCloud(binOrUrl: string): Promise<ItemRPG[] | null> {
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

    let rawList: any[] = [];
    if (data.items && Array.isArray(data.items)) {
      rawList = data.items;
    } else if (Array.isArray(data)) {
      rawList = data;
    } else if (data.data && Array.isArray(data.data.items)) {
      rawList = data.data.items;
    } else if (typeof data === 'object') {
      rawList = Object.values(data);
    }

    if (rawList.length > 0) {
      return normalizeCloudItems(rawList);
    }
  } catch (err) {
    console.error('fetchItemsFromCloud error:', err);
    throw err;
  }

  return null;
}

export async function pushItemsToCloud(binOrUrl: string, items: ItemRPG[]): Promise<boolean> {
  const { url } = resolveEndpoint(binOrUrl);

  try {
    const payload = {
      id: binOrUrl,
      name: 'A Ponte dos Trolls - Rateios RPG',
      updatedAt: new Date().toISOString(),
      items,
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
    console.error('pushItemsToCloud error:', err);
    throw err;
  }
}

export async function createNewCloudBin(initialItems: ItemRPG[]): Promise<string | null> {
  try {
    const base = typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
      ? window.location.origin
      : FALLBACK_SERVER_URL;

    const res = await fetch(`${base}/api/bin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: initialItems }),
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

function normalizeCloudItems(rawList: any[]): ItemRPG[] {
  return rawList.map((row, idx) => {
    const rawValor = row.valor ? String(row.valor) : '';
    const rawAutor = row.sugestaoDe ? String(row.sugestaoDe) : (row.sugeridoPorNome || 'Membro do Grupo');

    let status: 'Em Financiamento' | 'Finalizados' = 'Em Financiamento';
    const sLower = String(row.status || '').toLowerCase();
    if (sLower.includes('financiado') || sLower.includes('drive') || sLower.includes('finalizado')) {
      status = 'Finalizados';
    }

    let apoiadores = [];
    if (Array.isArray(row.apoiadores)) {
      apoiadores = row.apoiadores;
    } else if (rawAutor) {
      apoiadores = [{ id: `ap-${idx}`, nome: rawAutor }];
    }

    return {
      id: row.id || `cloud-${Date.now()}-${idx}`,
      data: row.data ? String(row.data) : new Date().toISOString().split('T')[0],
      nome: row.nome || 'Item',
      produto: row.produto || 'Módulo Foundry',
      sistema: row.sistema || 'Outro',
      descricao: row.descricao || '',
      link: row.link || '',
      sugeridoPorNome: rawAutor,
      sugeridoPorTelefone: row.sugeridoPorTelefone || '',
      moeda: rawValor.includes('R$') ? 'BRL' : (row.moeda || 'USD'),
      valorNumerico: typeof row.valorNumerico === 'number'
        ? row.valorNumerico
        : (parseFloat(rawValor.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0),
      observacaoValor: row.observacaoValor || (rawValor.includes('(') ? rawValor : ''),
      status,
      apoiadores,
    };
  });
}
