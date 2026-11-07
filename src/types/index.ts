export type MainCategory = 'Em Financiamento' | 'Finalizados';

export type ProductType = 
  | 'Módulo Foundry'
  | 'Mapa'
  | 'Token'
  | 'Patreon'
  | 'Livro de Regras em PDF'
  | 'Livro'
  | 'Outro';

export type CurrencyType = 'USD' | 'BRL';

export interface Apoiador {
  id: string;
  nome: string;
  telefone?: string;
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
  moeda: CurrencyType;
  valorNumerico: number;
  observacaoValor?: string;
  status: 'Em Financiamento' | 'Finalizados';
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
