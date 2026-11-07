export type ItemStatus = 'Sugestão' | 'Em Financiamento' | 'Finalizados';

export type SugestoesCategory = 'Sugestão' | 'Finalizados';

export type AppView = 'home' | 'sugestoes' | 'financiamento' | 'catalogo';

export type ProductType = 
  | 'Módulo Foundry'
  | 'Mapa'
  | 'Token'
  | 'Patreon'
  | 'Livro de Regras em PDF'
  | 'Suplemento / Aventura em PDF'
  | 'Bundle / Pacote de Mapas'
  | 'Patreon Mensal'
  | 'Livro'
  | 'Outro';

export type CurrencyType = 'USD' | 'BRL';

export interface UserProfile {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  createdAt?: string;
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
  'Outro',
];

export const ADMIN_PASSWORD = 'Ponte#dos#trolls';
