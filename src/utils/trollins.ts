import type {
  Apoiador,
  FundingPackage,
  ItemRPG,
  TrollinLedgerEntry,
  TrollinsMeta,
  UserProfile,
} from '../types/index.ts';

export const TROLLIN_COIN_ICON_PATH = '/trollin-coin.webp';

export const TROLLIN_EXPLANATION_TEXT =
  'Trollins são as moedas da Ponte. Você ganha ao participar de financiamentos concluídos e pode investir em sugestões ou doar para aumentar a prioridade delas.';

export interface SuggestionPriorityStats {
  invested: number;
  donated: number;
  supports: number;
  totalPoints: number;
}

export function normalizeIdentityName(name?: string | null): string {
  return String(name || '').trim().toLowerCase();
}

export function isMasterUser(user?: { id?: string; isMaster?: boolean } | null): boolean {
  if (!user) return false;
  return Boolean(user.isMaster || user.id === 'usr-master');
}

export function isAuthorSupporter(
  item: Pick<ItemRPG, 'sugeridoPorId' | 'sugeridoPorNome'>,
  ap: Pick<Apoiador, 'id' | 'nome'>
): boolean {
  if (item.sugeridoPorId && ap.id && ap.id === item.sugeridoPorId) {
    return true;
  }
  const authorNorm = normalizeIdentityName(item.sugeridoPorNome);
  const apNorm = normalizeIdentityName(ap.nome);
  if (authorNorm && apNorm && authorNorm === apNorm) {
    return true;
  }
  return false;
}

/**
 * Retorna apoiadores válidos excluindo o autor da sugestão e deduplicando por membro (máx 1 ponto/membro).
 */
export function getOtherSupporters(item: Pick<ItemRPG, 'sugeridoPorId' | 'sugeridoPorNome' | 'apoiadores'>): Apoiador[] {
  const list = Array.isArray(item.apoiadores) ? item.apoiadores : [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: Apoiador[] = [];

  for (const ap of list) {
    if (!ap) continue;
    if (isAuthorSupporter(item, ap)) continue;

    const cleanId = String(ap.id || '').trim();
    const cleanName = normalizeIdentityName(ap.nome);

    if (cleanId && seenIds.has(cleanId)) continue;
    if (cleanName && seenNames.has(cleanName)) continue;

    if (cleanId) seenIds.add(cleanId);
    if (cleanName) seenNames.add(cleanName);
    result.push(ap);
  }

  return result;
}

export function getSuggestionPriorityStats(
  item: Pick<ItemRPG, 'trollinsInvestidos' | 'trollinsDoados' | 'doacoesTrollins' | 'sugeridoPorId' | 'sugeridoPorNome' | 'apoiadores'>
): SuggestionPriorityStats {
  const rawInvested = Number(item.trollinsInvestidos);
  const invested = Number.isFinite(rawInvested) && rawInvested > 0 ? Math.floor(rawInvested) : 0;

  let donated = 0;
  const rawDonated = Number(item.trollinsDoados);
  if (Number.isFinite(rawDonated) && rawDonated > 0) {
    donated = Math.floor(rawDonated);
  } else if (Array.isArray(item.doacoesTrollins) && item.doacoesTrollins.length > 0) {
    donated = item.doacoesTrollins.reduce((sum, rec) => {
      const amt = Number(rec?.amount);
      return sum + (Number.isFinite(amt) && amt > 0 ? Math.floor(amt) : 0);
    }, 0);
  }

  const supports = getOtherSupporters(item).length;
  return {
    invested,
    donated,
    supports,
    totalPoints: invested + donated + supports,
  };
}

export function formatSuggestionPriorityBadge(stats: SuggestionPriorityStats): string {
  return stats.totalPoints === 1
    ? '1 ponto de prioridade'
    : `${stats.totalPoints} pontos de prioridade`;
}

export function formatSuggestionPriorityFormula(stats: SuggestionPriorityStats): string {
  const authorLabel =
    stats.invested === 1 ? '1 Trollin do autor' : `${stats.invested} Trollins do autor`;
  const donatedLabel =
    stats.donated === 1 ? '1 Trollin doado' : `${stats.donated} Trollins doados`;
  const supLabel = stats.supports === 1 ? '1 apoio' : `${stats.supports} apoios`;
  return `${authorLabel} + ${donatedLabel} + ${supLabel}`;
}

export function formatSuggestionPriorityText(stats: SuggestionPriorityStats): string {
  return `${formatSuggestionPriorityBadge(stats)} · ${formatSuggestionPriorityFormula(stats)}`;
}

function getItemAgeSortKey(item: Pick<ItemRPG, 'id' | 'data'>): { date: string; idTs: number; id: string } {
  const date = typeof item.data === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.data)
    ? item.data.slice(0, 10)
    : '9999-12-31';
  let idTs = Number.MAX_SAFE_INTEGER;
  const match = typeof item.id === 'string' ? item.id.match(/(\d{10,13})/) : null;
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed)) idTs = parsed;
  }
  return { date, idTs, id: String(item.id || '') };
}

/**
 * Ordenação oficial da fila de sugestões:
 * 1. Maior pontuação total (Trollins do autor + Trollins doados + apoios de outros membros)
 * 2. Desempate: mais antigas primeiro
 */
export function compareSuggestionsQueue(a: ItemRPG, b: ItemRPG): number {
  const statsA = getSuggestionPriorityStats(a);
  const statsB = getSuggestionPriorityStats(b);
  if (statsB.totalPoints !== statsA.totalPoints) {
    return statsB.totalPoints - statsA.totalPoints;
  }
  const keyA = getItemAgeSortKey(a);
  const keyB = getItemAgeSortKey(b);
  const dateCmp = keyA.date.localeCompare(keyB.date);
  if (dateCmp !== 0) return dateCmp;
  if (keyA.idTs !== keyB.idTs) return keyA.idTs - keyB.idTs;
  return keyA.id.localeCompare(keyB.id);
}

/**
 * Verifica se um pacote faz parte do acervo pessoal ("Meus Itens") de um membro.
 * 1 pacote = 1 entrada distinta no acervo.
 */
export function isPackageAcquiredByMember(
  pkg: Pick<FundingPackage, 'id' | 'status' | 'apoiadores' | 'pagamentos'>,
  member: Pick<UserProfile, 'id' | 'nome'> | null | undefined
): boolean {
  if (!member || !member.id || !pkg || pkg.status !== 'Catálogo') return false;
  const memberNorm = normalizeIdentityName(member.nome);
  const memberId = String(member.id).trim();

  return (pkg.apoiadores || []).some((ap) => {
    const isMatch =
      (ap.id && String(ap.id).trim() === memberId) ||
      (ap.nome && normalizeIdentityName(ap.nome) === memberNorm);
    if (!isMatch) return false;
    if (ap.isPosteriorBuyer) return true;

    const hasPaymentRecords = Boolean(pkg.pagamentos && Object.keys(pkg.pagamentos).length > 0);
    if (hasPaymentRecords) {
      return Boolean(
        ap.pagamentoInformado ||
          pkg.pagamentos?.[ap.id]?.informouPagamento ||
          pkg.pagamentos?.[memberId]?.informouPagamento
      );
    }
    return true;
  });
}

export function getMemberTrollinsBalance(user?: Pick<UserProfile, 'id' | 'isMaster' | 'trollinsSaldo'> | null): number {
  if (!user || isMasterUser(user)) return 0;
  const raw = Number(user.trollinsSaldo);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

export function createLedgerId(): string {
  return `trl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Ativa o sistema de Trollins uma única vez sobre uma base que ainda não foi ativada:
 * - Credita 1 Trollin por entrada distinta em "Meus Itens" (1 pacote no Catálogo = 1 Trollin)
 * - Marca pacotes já no Catálogo em awardedPackageIds para impedir recompensa duplicada
 * - Conta do modo Mestre permanece com saldo 0 e sem extrato
 */
export function ensureTrollinsActivated(
  data: {
    users?: any[];
    packages?: any[];
    items?: any[];
    trollinsMeta?: TrollinsMeta;
  },
  nowIso: string = new Date().toISOString(),
  options?: { skipInitialCredit?: boolean }
): { activatedNow: boolean } {
  const users = Array.isArray(data.users) ? data.users : [];
  const packages = Array.isArray(data.packages) ? data.packages : [];
  const items = Array.isArray(data.items) ? data.items : [];

  // Normaliza campos de Trollins em itens legados/atuais sem alterar dados existentes
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    if (typeof it.trollinsInvestidos !== 'number') {
      it.trollinsInvestidos = 0;
    }
    if (typeof it.trollinsDoados !== 'number') {
      it.trollinsDoados = 0;
    }
  }

  // Se já ativado (incluindo via restauração de backup), nunca repete o crédito inicial
  const alreadyHasMeta = Boolean(data.trollinsMeta && data.trollinsMeta.activatedAt);
  const alreadyHasAnyLedger = users.some(
    (u: any) => !isMasterUser(u) && Array.isArray(u.trollinsExtrato) && u.trollinsExtrato.length > 0
  );

  if (alreadyHasMeta || alreadyHasAnyLedger || options?.skipInitialCredit) {
    if (!data.trollinsMeta) {
      const catalogIds = packages
        .filter((p: any) => p && p.status === 'Catálogo' && p.id)
        .map((p: any) => String(p.id));
      data.trollinsMeta = {
        activatedAt: nowIso,
        version: 1,
        awardedPackageIds: catalogIds,
      };
    }
    for (const u of users) {
      if (!u || typeof u !== 'object') continue;
      if (isMasterUser(u)) {
        u.trollinsSaldo = 0;
        u.trollinsExtrato = [];
      } else {
        if (typeof u.trollinsSaldo !== 'number' || !Number.isFinite(u.trollinsSaldo) || u.trollinsSaldo < 0) {
          u.trollinsSaldo = 0;
        }
        if (!Array.isArray(u.trollinsExtrato)) {
          u.trollinsExtrato = [];
        }
      }
    }
    return { activatedNow: false };
  }

  // Primeira ativação única
  const awardedPackageIds = packages
    .filter((p: any) => p && p.status === 'Catálogo' && p.id)
    .map((p: any) => String(p.id));

  for (const u of users) {
    if (!u || typeof u !== 'object') continue;
    if (isMasterUser(u)) {
      u.trollinsSaldo = 0;
      u.trollinsExtrato = [];
      continue;
    }

    const seenPkgIds = new Set<string>();
    let acervoCount = 0;
    for (const pkg of packages) {
      if (!pkg || !pkg.id || seenPkgIds.has(pkg.id)) continue;
      if (isPackageAcquiredByMember(pkg, u)) {
        seenPkgIds.add(pkg.id);
        acervoCount += 1;
      }
    }

    u.trollinsSaldo = acervoCount;
    const entry: TrollinLedgerEntry = {
      id: createLedgerId(),
      dedupKey: `initial:${u.id}`,
      memberId: u.id,
      type: 'inicial',
      amount: acervoCount,
      balanceAfter: acervoCount,
      description:
        acervoCount === 1
          ? 'Saldo inicial (1 item no acervo)'
          : `Saldo inicial (${acervoCount} itens no acervo)`,
      createdAt: nowIso,
    };
    u.trollinsExtrato = [entry];
  }

  data.trollinsMeta = {
    activatedAt: nowIso,
    version: 1,
    awardedPackageIds,
  };

  return { activatedNow: true };
}

/**
 * Credita 1 Trollin por membro inscrito quando um financiamento é concluído e transferido para o Catálogo.
 * Idempotente por (packageId, memberId) e por awardedPackageIds.
 */
export function creditMemberTrollinsForCompletedFinancing(
  data: {
    users?: any[];
    trollinsMeta?: TrollinsMeta;
  },
  pkg: any,
  nowIso: string = new Date().toISOString()
): { creditedCount: number; creditedMemberIds: string[] } {
  if (!pkg || !pkg.id || pkg.status !== 'Catálogo') {
    return { creditedCount: 0, creditedMemberIds: [] };
  }

  if (!data.trollinsMeta) {
    data.trollinsMeta = {
      activatedAt: nowIso,
      version: 1,
      awardedPackageIds: [],
    };
  }
  if (!Array.isArray(data.trollinsMeta.awardedPackageIds)) {
    data.trollinsMeta.awardedPackageIds = [];
  }

  if (data.trollinsMeta.awardedPackageIds.includes(pkg.id)) {
    return { creditedCount: 0, creditedMemberIds: [] };
  }

  const users = Array.isArray(data.users) ? data.users : [];
  const apoiadores = Array.isArray(pkg.apoiadores) ? pkg.apoiadores : [];
  const creditedMemberIds: string[] = [];
  const seenMemberIds = new Set<string>();

  for (const ap of apoiadores) {
    if (!ap) continue;
    // Ignora eventuais compradores posteriores adicionados avulsamente
    if (ap.isPosteriorBuyer) continue;

    const apId = String(ap.id || '').trim();
    const apNameNorm = normalizeIdentityName(ap.nome);

    const member = users.find((u: any) => {
      if (!u || !u.id) return false;
      if (apId && u.id === apId) return true;
      if (apNameNorm && normalizeIdentityName(u.nome) === apNameNorm) return true;
      return false;
    });

    if (!member || isMasterUser(member)) continue;
    if (seenMemberIds.has(member.id)) continue;
    seenMemberIds.add(member.id);

    if (!Array.isArray(member.trollinsExtrato)) {
      member.trollinsExtrato = [];
    }

    const dedupKey = `financing:${pkg.id}:${member.id}`;
    const alreadyInLedger = member.trollinsExtrato.some((e: any) => e && e.dedupKey === dedupKey);
    if (alreadyInLedger) continue;

    const currentBalance = getMemberTrollinsBalance(member);
    const nextBalance = currentBalance + 1;
    member.trollinsSaldo = nextBalance;

    const entry: TrollinLedgerEntry = {
      id: createLedgerId(),
      dedupKey,
      memberId: member.id,
      type: 'ganho_financiamento',
      amount: 1,
      balanceAfter: nextBalance,
      packageId: pkg.id,
      packageTitle: pkg.titulo || 'Financiamento concluído',
      description: `Financiamento concluído: ${pkg.titulo || 'Pacote'}`,
      createdAt: nowIso,
    };
    member.trollinsExtrato.unshift(entry);
    creditedMemberIds.push(member.id);
  }

  data.trollinsMeta.awardedPackageIds.push(pkg.id);
  return {
    creditedCount: creditedMemberIds.length,
    creditedMemberIds,
  };
}
