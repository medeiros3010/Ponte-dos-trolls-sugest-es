import type { FundingPackage, ItemRPG, PackageSubItem, ProductType } from '../types';

export interface RpgSystemLegend {
  id: string;
  nome: string;
}

export const OFFICIAL_RPG_SYSTEM_LEGENDS: readonly RpgSystemLegend[] = [
  { id: 'pf2e', nome: 'PF2E' },
  { id: 'dnd5e', nome: 'DnD5e' },
  { id: 'swade', nome: 'SWADE' },
  { id: 'forbidden-land', nome: 'Forbidden Land' },
  { id: 'cthulhu', nome: 'Cthulhu' },
  { id: 'symbaroum', nome: 'Symbaroum' },
  { id: 'dragonbane', nome: 'Dragonbane' },
  { id: 'draw-steel', nome: 'Draw Steel' },
  { id: 'delta-green', nome: 'Delta Green' },
  { id: 'mork-borg', nome: 'Mork Borg' },
  { id: 'tormenta20', nome: 'Tormenta20' },
  { id: 'foundry-vtt-geral', nome: 'Foundry VTT Geral' },
  { id: 'outro', nome: 'Outro' },
];

export const OFFICIAL_RPG_SYSTEM_NAMES: string[] = OFFICIAL_RPG_SYSTEM_LEGENDS.map((l) => l.nome);

export interface ResolvedRpgSystem {
  legend: RpgSystemLegend | null;
  sistemaId?: string;
  displayName: string;
  originalText: string;
  needsReview: boolean;
}

export interface PackageSystemSummary {
  badges: RpgSystemLegend[];
  hasPendingReview: boolean;
  pendingCount: number;
  primaryLegendName: string;
}

const LEGEND_BY_ID = new Map<string, RpgSystemLegend>(
  OFFICIAL_RPG_SYSTEM_LEGENDS.map((l) => [l.id.toLowerCase(), l])
);

const LEGEND_BY_NAME_NORMALIZED = new Map<string, RpgSystemLegend>(
  OFFICIAL_RPG_SYSTEM_LEGENDS.map((l) => [normalizeTextKey(l.nome), l])
);

function normalizeTextKey(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getOfficialRpgSystemById(id?: string | null): RpgSystemLegend | null {
  if (!id) return null;
  return LEGEND_BY_ID.get(String(id).trim().toLowerCase()) || null;
}

export function getOfficialRpgSystemByName(name?: string | null): RpgSystemLegend | null {
  if (!name) return null;
  return LEGEND_BY_NAME_NORMALIZED.get(normalizeTextKey(String(name))) || null;
}

const SINGLE_SYSTEM_ALIAS_MAP = new Map<string, string>([
  // PF2E
  ['pf2e', 'pf2e'],
  ['pf 2e', 'pf2e'],
  ['pf2', 'pf2e'],
  ['pathfinder 2e', 'pf2e'],
  ['pathfinder 2', 'pf2e'],
  ['pathfinder 2a edicao', 'pf2e'],
  ['pathfinder second edition', 'pf2e'],

  // DnD5e
  ['dnd5e', 'dnd5e'],
  ['dnd 5e', 'dnd5e'],
  ['d&d 5e', 'dnd5e'],
  ['d&d5e', 'dnd5e'],
  ['dungeons & dragons 5e', 'dnd5e'],
  ['dungeons and dragons 5e', 'dnd5e'],
  ['5e', 'dnd5e'],

  // SWADE
  ['swade', 'swade'],
  ['savage worlds', 'swade'],
  ['savage worlds adventure edition', 'swade'],
  ['deadlands (savage worlds adventure edition - swade)', 'swade'],
  ['deadlands (swade)', 'swade'],

  // Forbidden Land
  ['forbidden land', 'forbidden-land'],
  ['forbidden lands', 'forbidden-land'],

  // Cthulhu
  ['cthulhu', 'cthulhu'],
  ['coc', 'cthulhu'],
  ['call of cthulhu', 'cthulhu'],
  ['call of cthulhu 7e', 'cthulhu'],
  ['call of cthulhu (coc 7a edicao)', 'cthulhu'],
  ['call of cthulhu (7a edicao)', 'cthulhu'],
  ['chamado de cthulhu', 'cthulhu'],

  // Symbaroum
  ['symbaroum', 'symbaroum'],

  // Dragonbane
  ['dragonbane', 'dragonbane'],

  // Draw Steel
  ['draw steel', 'draw-steel'],

  // Delta Green
  ['delta green', 'delta-green'],

  // Mork Borg
  ['mork borg', 'mork-borg'],

  // Tormenta20
  ['tormenta20', 'tormenta20'],
  ['tormenta 20', 'tormenta20'],
  ['t20', 'tormenta20'],

  // Foundry VTT Geral
  ['foundry vtt geral', 'foundry-vtt-geral'],
  ['foundry geral', 'foundry-vtt-geral'],
  ['foundry vtt', 'foundry-vtt-geral'],
  ['vtt geral', 'foundry-vtt-geral'],
  ['diversos / vtt', 'foundry-vtt-geral'],
  ['diversos / foundry vtt', 'foundry-vtt-geral'],
  ['diversos', 'foundry-vtt-geral'],
  ['generico / vtt', 'foundry-vtt-geral'],
  ['generico / vtt independente (para dungeons, mapas e cenarios fisicos ou impressos)', 'foundry-vtt-geral'],
  ['generico', 'foundry-vtt-geral'],

  // Outro
  ['outro', 'outro'],
  ['outros', 'outro'],
]);

const SINGLE_UNLISTED_SYSTEM_KEYS = new Set<string>([
  'starfinder',
  'starfinder 2e',
  'starfinder 2e (playtest)',
  'wrath & glory',
  'wrath & glory (warhammer 40k rpg)',
  'mutant: year zero',
  'shadow of the demon lord',
  'cosmere rpg',
  'warhammer fantasy roleplay (versao compativel com foundry vtt)',
  'warhammer fantasy roleplay',
  'skyfall rpg',
  'daggerheart',
  'pendragon 6a edicao',
  'old-school essentials',
  'kult: divinity lost',
]);

function looksAmbiguousOrMixed(normalized: string): boolean {
  if (!normalized) return false;

  // Explicit adaptation / cross-compatibility qualifiers involving RPGs
  if (
    /adaptacao|compativel com\s+(?:d&d|dnd|pf|pathfinder|swade|savage|cthulhu|tormenta)|conforme modulo/.test(
      normalized
    )
  ) {
    return true;
  }

  // Multi-value separators outside safe single-system phrases
  if (/[,;/+]|\s+e\s+/.test(normalized)) {
    return true;
  }

  // Multiple distinct named RPG families appearing in the same string
  const familyPatterns: RegExp[] = [
    /\b(?:pf2e|pf\s*2e|pathfinder)\b/,
    /\b(?:dnd|d&d|dungeons\s*&\s*dragons)\b/,
    /\b(?:swade|savage\s+worlds)\b/,
    /\bforbidden\s+lands?\b/,
    /\b(?:cthulhu|coc)\b/,
    /\bsymbaroum\b/,
    /\bdragonbane\b/,
    /\bdraw\s+steel\b/,
    /\bdelta\s+green\b/,
    /\bmork\s+borg\b/,
    /\b(?:tormenta\s*20|t20)\b/,
    /\bcosmere\b/,
    /\bstarfinder\b/,
    /\bmutant\b/,
    /\bskyfall\b/,
    /\bdaggerheart\b/,
    /\bpendragon\b/,
    /\bkult\b/,
  ];

  let hits = 0;
  for (const re of familyPatterns) {
    if (re.test(normalized)) hits += 1;
    if (hits >= 2) return true;
  }

  return false;
}

export type RpgSystemInput =
  | string
  | {
      sistemaId?: string | null;
      sistema?: string | null;
      sistemaOriginal?: string | null;
      sistemaPrecisaRevisao?: boolean | null;
    }
  | null
  | undefined;

export function resolveRpgSystem(input: RpgSystemInput): ResolvedRpgSystem {
  if (input && typeof input === 'object') {
    const idLegend = getOfficialRpgSystemById(input.sistemaId);
    const rawOriginal = String(input.sistemaOriginal || input.sistema || '').trim();
    const rawCurrent = String(input.sistema || '').trim();

    if (idLegend && !input.sistemaPrecisaRevisao) {
      return {
        legend: idLegend,
        sistemaId: idLegend.id,
        displayName: idLegend.nome,
        originalText: rawOriginal || idLegend.nome,
        needsReview: false,
      };
    }

    // If an official legend name was saved cleanly without a flagged review, resolve it
    if (!input.sistemaPrecisaRevisao && rawCurrent) {
      const exactCurrent = getOfficialRpgSystemByName(rawCurrent);
      if (exactCurrent) {
        return {
          legend: exactCurrent,
          sistemaId: exactCurrent.id,
          displayName: exactCurrent.nome,
          originalText: rawOriginal || exactCurrent.nome,
          needsReview: false,
        };
      }
    }

    const textToInspect = rawCurrent || rawOriginal;
    if (input.sistemaPrecisaRevisao && !idLegend) {
      return {
        legend: null,
        sistemaId: undefined,
        displayName: textToInspect || 'Sistema indefinido',
        originalText: rawOriginal || rawCurrent,
        needsReview: true,
      };
    }

    return resolveRpgSystem(textToInspect);
  }

  const rawText = String(input || '').trim();
  if (!rawText) {
    return {
      legend: null,
      sistemaId: undefined,
      displayName: '',
      originalText: '',
      needsReview: false,
    };
  }

  const exactOfficial = getOfficialRpgSystemByName(rawText);
  if (exactOfficial) {
    return {
      legend: exactOfficial,
      sistemaId: exactOfficial.id,
      displayName: exactOfficial.nome,
      originalText: rawText,
      needsReview: false,
    };
  }

  const normalized = normalizeTextKey(rawText);

  const aliasId = SINGLE_SYSTEM_ALIAS_MAP.get(normalized);
  if (aliasId) {
    const legend = getOfficialRpgSystemById(aliasId)!;
    return {
      legend,
      sistemaId: legend.id,
      displayName: legend.nome,
      originalText: rawText,
      needsReview: false,
    };
  }

  if (SINGLE_UNLISTED_SYSTEM_KEYS.has(normalized)) {
    const outroLegend = getOfficialRpgSystemById('outro')!;
    return {
      legend: outroLegend,
      sistemaId: outroLegend.id,
      displayName: outroLegend.nome,
      originalText: rawText,
      needsReview: false,
    };
  }

  if (looksAmbiguousOrMixed(normalized)) {
    return {
      legend: null,
      sistemaId: undefined,
      displayName: rawText,
      originalText: rawText,
      needsReview: true,
    };
  }

  // Fallback for a clear, non-mixed unlisted single RPG string -> Outro preserving original
  const outroLegend = getOfficialRpgSystemById('outro')!;
  return {
    legend: outroLegend,
    sistemaId: outroLegend.id,
    displayName: outroLegend.nome,
    originalText: rawText,
    needsReview: false,
  };
}

export function normalizeMaterialSystemFields<
  T extends {
    sistema?: string;
    sistemaId?: string;
    sistemaOriginal?: string;
    sistemaPrecisaRevisao?: boolean;
  }
>(material: T): T {
  const resolved = resolveRpgSystem(material);

  if (!resolved.displayName && !resolved.needsReview && !resolved.legend) {
    const cleaned = { ...material };
    delete cleaned.sistemaId;
    delete cleaned.sistemaPrecisaRevisao;
    return {
      ...cleaned,
      sistema: '',
    };
  }

  if (resolved.needsReview) {
    const cleaned = { ...material };
    delete cleaned.sistemaId;
    return {
      ...cleaned,
      sistema: resolved.originalText || String(material.sistema || '').trim(),
      sistemaOriginal: resolved.originalText || String(material.sistema || '').trim(),
      sistemaPrecisaRevisao: true,
    };
  }

  const next: T = {
    ...material,
    sistema: resolved.legend!.nome,
    sistemaId: resolved.legend!.id,
    sistemaPrecisaRevisao: false,
  };

  if (
    resolved.originalText &&
    normalizeTextKey(resolved.originalText) !== normalizeTextKey(resolved.legend!.nome)
  ) {
    next.sistemaOriginal = resolved.originalText;
  } else {
    delete next.sistemaOriginal;
  }

  return next;
}

export function getPackageSystemBadges(
  pkg: Pick<FundingPackage, 'itens' | 'sistema' | 'sistemasIds'> | null | undefined
): PackageSystemSummary {
  if (!pkg) {
    return {
      badges: [],
      hasPendingReview: false,
      pendingCount: 0,
      primaryLegendName: '',
    };
  }

  const seenIds = new Set<string>();
  const badges: RpgSystemLegend[] = [];
  let pendingCount = 0;

  const itens = Array.isArray(pkg.itens) ? pkg.itens : [];
  if (itens.length > 0) {
    for (const it of itens) {
      const resolved = resolveRpgSystem(it);
      if (resolved.needsReview || !resolved.legend) {
        if (resolved.needsReview || String(it?.sistema || '').trim()) {
          pendingCount += 1;
        }
        continue;
      }
      if (!seenIds.has(resolved.legend.id)) {
        seenIds.add(resolved.legend.id);
        badges.push(resolved.legend);
      }
    }

    // Order badges according to OFFICIAL_RPG_SYSTEM_LEGENDS order for consistent visual presentation
    const orderIndex = new Map(OFFICIAL_RPG_SYSTEM_LEGENDS.map((l, idx) => [l.id, idx]));
    badges.sort((a, b) => (orderIndex.get(a.id) ?? 999) - (orderIndex.get(b.id) ?? 999));

    return {
      badges,
      hasPendingReview: pendingCount > 0,
      pendingCount,
      primaryLegendName: badges[0]?.nome || (pendingCount > 0 ? 'Revisar sistema' : ''),
    };
  }

  // Fallback ONLY when package has zero structured itens
  const explicitIds = Array.isArray(pkg.sistemasIds) ? pkg.sistemasIds : [];
  for (const id of explicitIds) {
    const leg = getOfficialRpgSystemById(id);
    if (leg && !seenIds.has(leg.id)) {
      seenIds.add(leg.id);
      badges.push(leg);
    }
  }

  if (badges.length === 0 && pkg.sistema) {
    const resolvedPkg = resolveRpgSystem(pkg.sistema);
    if (resolvedPkg.legend) {
      badges.push(resolvedPkg.legend);
    } else if (resolvedPkg.needsReview) {
      pendingCount = 1;
    }
  }

  return {
    badges,
    hasPendingReview: pendingCount > 0,
    pendingCount,
    primaryLegendName: badges[0]?.nome || pkg.sistema || '',
  };
}

export function derivePackageSystemMeta(
  itens: Array<Pick<PackageSubItem, 'sistema' | 'sistemaId' | 'sistemaOriginal' | 'sistemaPrecisaRevisao'>>,
  fallbackPkgSistema?: string
): {
  sistemasIds: string[];
  sistema: string;
} {
  const summary = getPackageSystemBadges({ itens, sistema: fallbackPkgSistema });
  const sistemasIds = summary.badges.map((b) => b.id);
  const sistema =
    summary.badges.length === 1
      ? summary.badges[0].nome
      : summary.badges[0]?.nome || String(fallbackPkgSistema || '').trim();

  return {
    sistemasIds,
    sistema,
  };
}

export function itemMatchesSystem(
  item: Pick<ItemRPG | PackageSubItem, 'sistema' | 'sistemaId' | 'sistemaOriginal' | 'sistemaPrecisaRevisao'>,
  selectedSistema: string
): boolean {
  if (!selectedSistema || selectedSistema === 'Todos' || selectedSistema === 'todos') {
    return true;
  }

  const targetLegend =
    getOfficialRpgSystemByName(selectedSistema) || getOfficialRpgSystemById(selectedSistema);
  const resolved = resolveRpgSystem(item);

  if (targetLegend) {
    return resolved.legend?.id === targetLegend.id;
  }

  return normalizeTextKey(resolved.displayName) === normalizeTextKey(selectedSistema);
}

export function packageMatchesSystemAndCategory(
  pkg: Pick<FundingPackage, 'itens' | 'sistema' | 'sistemasIds' | 'tipo'>,
  selectedSistema: string,
  selectedCategories: ProductType[]
): boolean {
  const hasSystemFilter = Boolean(
    selectedSistema && selectedSistema !== 'Todos' && selectedSistema !== 'todos'
  );
  const hasCategoryFilter = Array.isArray(selectedCategories) && selectedCategories.length > 0;

  if (!hasSystemFilter && !hasCategoryFilter) return true;

  const itens = Array.isArray(pkg.itens) ? pkg.itens : [];
  if (itens.length > 0) {
    return itens.some((it) => {
      const matchesSys = !hasSystemFilter || itemMatchesSystem(it, selectedSistema);
      if (!matchesSys) return false;

      if (!hasCategoryFilter) return true;
      const itemCat = (it.categoria || it.tipo || pkg.tipo || 'Outros') as ProductType;
      return selectedCategories.includes(itemCat);
    });
  }

  // Fallback for legacy packages with no sub-items array
  const matchesSys =
    !hasSystemFilter ||
    getPackageSystemBadges(pkg).badges.some((b) => itemMatchesSystem({ sistema: b.nome, sistemaId: b.id }, selectedSistema));
  const matchesCat =
    !hasCategoryFilter || selectedCategories.includes((pkg.tipo || 'Outros') as ProductType);

  return matchesSys && matchesCat;
}
