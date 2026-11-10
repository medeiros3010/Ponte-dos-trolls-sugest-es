import { FundingPackage } from '../types';

export interface UserRankInfo {
  level: number;
  name: string;
  min: number;
  max: number | null;
  currentCount: number;
  nextRankName: string | null;
  neededForNext: number;
  progressPercent: number;
  isMaxRank: boolean;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  cardBorderClass: string;
  badgeSvgPath: string;
  iconName: 'BookOpen' | 'Compass' | 'Shield' | 'Crown' | 'Sparkles' | 'Sun';
}

export const RANKS_CONFIG = [
  {
    level: 1,
    name: 'Aprendiz da Ponte',
    min: 0,
    max: 10,
    iconName: 'BookOpen' as const,
    colorClass: 'text-[#6d5b3d]',
    bgClass: 'bg-[#EDE2CA]',
    borderClass: 'border-[#C6AD78]',
    cardBorderClass: 'border-[#C6AD78]/70 hover:border-[#8C6239]',
    badgeSvgPath: '/ranks/rank-1-aprendiz.svg',
  },
  {
    level: 2,
    name: 'Aventureiro',
    min: 11,
    max: 30,
    iconName: 'Compass' as const,
    colorClass: 'text-[#48551F]',
    bgClass: 'bg-[#E3E8D0]',
    borderClass: 'border-[#8F9F5B]',
    cardBorderClass: 'border-[#8F9F5B]/70 hover:border-[#48551F]',
    badgeSvgPath: '/ranks/rank-2-aventureiro.svg',
  },
  {
    level: 3,
    name: 'Veterano',
    min: 31,
    max: 50,
    iconName: 'Shield' as const,
    colorClass: 'text-[#204468]',
    bgClass: 'bg-[#E2ECF7]',
    borderClass: 'border-[#6A8CAE]',
    cardBorderClass: 'border-[#6A8CAE]/70 hover:border-[#204468]',
    badgeSvgPath: '/ranks/rank-3-veterano.svg',
  },
  {
    level: 4,
    name: 'Herói',
    min: 51,
    max: 70,
    iconName: 'Crown' as const,
    colorClass: 'text-[#875508]',
    bgClass: 'bg-[#FFF2CC]',
    borderClass: 'border-[#D9A74A]',
    cardBorderClass: 'border-[#D9A74A]/80 hover:border-[#875508]',
    badgeSvgPath: '/ranks/rank-4-heroi.svg',
  },
  {
    level: 5,
    name: 'Lenda',
    min: 71,
    max: 100,
    iconName: 'Sparkles' as const,
    colorClass: 'text-[#5A2482]',
    bgClass: 'bg-[#F3E8FC]',
    borderClass: 'border-[#9D52D4]',
    cardBorderClass: 'border-[#9D52D4]/80 hover:border-[#5A2482]',
    badgeSvgPath: '/ranks/rank-5-lenda.svg',
  },
  {
    level: 6,
    name: 'Guardião Lendário',
    min: 101,
    max: null,
    iconName: 'Sun' as const,
    colorClass: 'text-[#7A1D28]',
    bgClass: 'bg-[#FFF8EA]',
    borderClass: 'border-[#D4A538]',
    cardBorderClass: 'border-[#D4A538] ring-1 ring-[#D4A538]/40 hover:border-[#B82834]',
    badgeSvgPath: '/ranks/rank-6-guardiao.svg',
  },
];

/**
 * Regra centralizada de aquisição de pacotes:
 * Um pacote está no acervo do usuário SE:
 * 1. O pacote está no status 'Catálogo'
 * 2. O usuário está na lista de apoiadores/cotistas que adquiriram (seja pelo rateio original concluído ou como comprador posterior confirmado pelo Mestre).
 * Exclui: simples apoios em financiamento aberto, compras pendentes de pagamento, carrinhos e mensagens de WhatsApp.
 */
export function isPackageAcquired(
  pkg: FundingPackage,
  user: { id: string; nome: string } | null | undefined
): boolean {
  if (!user || !user.id || !pkg) return false;
  if (pkg.status !== 'Catálogo') return false;

  const userNorm = user.nome.trim().toLowerCase();
  const userId = user.id.trim();

  return (pkg.apoiadores || []).some((ap) => {
    if (ap.id && ap.id === userId) return true;
    if (ap.nome && ap.nome.trim().toLowerCase() === userNorm) return true;
    return false;
  });
}

/**
 * Retorna todos os pacotes únicos que o usuário possui no seu acervo
 */
export function getUserAcquiredPackages(
  user: { id: string; nome: string } | null | undefined,
  packages: FundingPackage[]
): FundingPackage[] {
  if (!user || !user.id || !Array.isArray(packages)) return [];
  return packages.filter((pkg) => isPackageAcquired(pkg, user));
}

/**
 * Calcula o Rank em 6 níveis a partir da contagem de aquisições únicas no Catálogo:
 * 0 a 10: Aprendiz
 * 11 a 30: Aventureiro
 * 31 a 50: Veterano
 * 51 a 70: Herói
 * 71 a 100: Paragon
 * 101+: Deus Ascendente
 */
export function getUserRank(acquiredCount: number): UserRankInfo {
  const count = Math.max(0, acquiredCount);

  if (count <= 10) {
    const config = RANKS_CONFIG[0];
    const progressPercent = Math.min(100, Math.round((count / 11) * 100));
    return {
      level: 1,
      name: config.name,
      min: config.min,
      max: config.max,
      currentCount: count,
      nextRankName: 'Aventureiro',
      neededForNext: 11 - count,
      progressPercent,
      isMaxRank: false,
      colorClass: config.colorClass,
      bgClass: config.bgClass,
      borderClass: config.borderClass,
      cardBorderClass: config.cardBorderClass,
      badgeSvgPath: config.badgeSvgPath,
      iconName: config.iconName,
    };
  }

  if (count <= 30) {
    const config = RANKS_CONFIG[1];
    const progressPercent = Math.min(100, Math.round(((count - 10) / 20) * 100));
    return {
      level: 2,
      name: config.name,
      min: config.min,
      max: config.max,
      currentCount: count,
      nextRankName: 'Veterano',
      neededForNext: 31 - count,
      progressPercent,
      isMaxRank: false,
      colorClass: config.colorClass,
      bgClass: config.bgClass,
      borderClass: config.borderClass,
      cardBorderClass: config.cardBorderClass,
      badgeSvgPath: config.badgeSvgPath,
      iconName: config.iconName,
    };
  }

  if (count <= 50) {
    const config = RANKS_CONFIG[2];
    const progressPercent = Math.min(100, Math.round(((count - 30) / 20) * 100));
    return {
      level: 3,
      name: config.name,
      min: config.min,
      max: config.max,
      currentCount: count,
      nextRankName: 'Herói',
      neededForNext: 51 - count,
      progressPercent,
      isMaxRank: false,
      colorClass: config.colorClass,
      bgClass: config.bgClass,
      borderClass: config.borderClass,
      cardBorderClass: config.cardBorderClass,
      badgeSvgPath: config.badgeSvgPath,
      iconName: config.iconName,
    };
  }

  if (count <= 70) {
    const config = RANKS_CONFIG[3];
    const progressPercent = Math.min(100, Math.round(((count - 50) / 20) * 100));
    return {
      level: 4,
      name: config.name,
      min: config.min,
      max: config.max,
      currentCount: count,
      nextRankName: 'Lenda',
      neededForNext: 71 - count,
      progressPercent,
      isMaxRank: false,
      colorClass: config.colorClass,
      bgClass: config.bgClass,
      borderClass: config.borderClass,
      cardBorderClass: config.cardBorderClass,
      badgeSvgPath: config.badgeSvgPath,
      iconName: config.iconName,
    };
  }

  if (count <= 100) {
    const config = RANKS_CONFIG[4];
    const progressPercent = Math.min(100, Math.round(((count - 70) / 30) * 100));
    return {
      level: 5,
      name: config.name,
      min: config.min,
      max: config.max,
      currentCount: count,
      nextRankName: 'Guardião Lendário',
      neededForNext: 101 - count,
      progressPercent,
      isMaxRank: false,
      colorClass: config.colorClass,
      bgClass: config.bgClass,
      borderClass: config.borderClass,
      cardBorderClass: config.cardBorderClass,
      badgeSvgPath: config.badgeSvgPath,
      iconName: config.iconName,
    };
  }

  // Level 6: 101+
  const config = RANKS_CONFIG[5];
  return {
    level: 6,
    name: config.name,
    min: config.min,
    max: null,
    currentCount: count,
    nextRankName: null,
    neededForNext: 0,
    progressPercent: 100,
    isMaxRank: true,
    colorClass: config.colorClass,
    bgClass: config.bgClass,
    borderClass: config.borderClass,
    cardBorderClass: config.cardBorderClass,
    badgeSvgPath: config.badgeSvgPath,
    iconName: config.iconName,
  };
}
