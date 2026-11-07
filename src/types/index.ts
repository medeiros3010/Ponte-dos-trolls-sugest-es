export type ItemStatus = 'Sugestão' | 'Em Financiamento' | 'Finalizados' | 'Em Pacote' | 'Arquivado';

export type SugestoesCategory = 'Sugestão' | 'Finalizados';

export type PackageStatus = 'Financiamento' | 'Catálogo';

export type AppView = 'home' | 'sugestoes' | 'financiamento' | 'catalogo' | 'membros';

export type ProductType = 
  | 'Mapas para VTT'
  | 'Mapas normais'
  | 'Livros'
  | 'PF2E'
  | 'DnD5e'
  | 'SWADE'
  | 'Symbaroum'
  | 'Cthulhu'
  | 'Módulo Foundry'
  | 'Token'
  | 'Patreon'
  | 'Outro'
  | string;

export const OFFICIAL_PRODUCT_TYPES: string[] = [
  'Mapas para VTT',
  'Mapas normais',
  'Livros',
  'PF2E',
  'DnD5e',
  'SWADE',
  'Symbaroum',
  'Cthulhu',
  'Outro',
];

export type CurrencyType = 'USD' | 'BRL';

export type UserStatus = 'aprovado' | 'pendente' | 'recusado';

export interface UserProfile {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  createdAt?: string;
  dataEntrada?: string;
  strikes?: number | any[];
  isMaster?: boolean;
  status?: UserStatus;
}

export interface Apoiador {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  data?: string;
}

export interface ItemRPG {
  id: string;
  data: string; // YYYY-MM-DD
  nome: string;
  produto: ProductType;
  sistema: string;
  descricao: string;
  link: string;
  imageUrl?: string;
  sugeridoPorNome: string;
  sugeridoPorTelefone: string;
  sugeridoPorEmail?: string;
  moeda: CurrencyType;
  valorNumerico: number;
  observacaoValor?: string;
  status: ItemStatus;
  apoiadores: Apoiador[];
  packageId?: string; // Id do pacote se foi agrupado
}

export interface PackageSubItem {
  id: string;
  nome: string;
  sistema: string;
  link: string;
  precoBRL: number;
}

export interface FundingPackage {
  id: string;
  titulo: string;
  sistema?: string;
  descricao?: string;
  itens: PackageSubItem[]; // Lista dinâmica com nome, sistema, link e precoBRL
  valorTotalBRL: number; // Soma automática dos precoBRL
  dataFinalizar?: string; // Data máxima para colocar o nome na lista
  dataPagamento?: string; // Data máxima para efetuar o pagamento
  minimoParticipantes: number; // Mínimo de cotistas, ex: 35
  valorMaximoPorPessoa: number; // valorTotalBRL / minimoParticipantes
  valorCatalogoBRL?: number; // Preço no catálogo de produtos (com acréscimo)
  linkLoja?: string;
  linkDrive?: string;
  itensInclusos?: string[]; // Retrocompatibilidade
  sugestoesIds?: string[];
  status: PackageStatus; // 'Financiamento' | 'Catálogo'
  apoiadores: Apoiador[];
  criadoEm: string;
  finalizadoEm?: string;
}

export const SISTEMAS_PADRAO: string[] = [
  'PF2E',
  'DnD5e',
  'SWADE',
  'Forbidden Land',
  'Cthulhu',
  'Symbaroum',
  'Dragonbane',
  'Draw Steel',
  'Delta Green',
  'Mork Borg',
  'Tormenta20',
  'Foundry VTT Geral',
  'Outro',
];

export const ADMIN_PASSWORD = 'Ponte#dos#trolls';
export const MASTER_ADMIN_NAME = 'Ponte dos Trolls';

