import { OFFICIAL_RPG_SYSTEM_LEGENDS } from '../utils/rpgSystems';

export type ItemStatus = 'Sugestão' | 'Em Financiamento' | 'Finalizados' | 'Em Pacote' | 'Arquivado';

export type SugestoesCategory = 'Sugestão' | 'Finalizados';

export type PackageStatus = 'Financiamento' | 'Catálogo';

export type FundingStage = 'COLETA' | 'PAGAMENTO';

export type AppView = 'home' | 'sugestoes' | 'financiamento' | 'catalogo' | 'membros' | 'meus-itens';

export type ProductType = 
  | 'Livros'
  | 'Mapas'
  | 'Material para VTT'
  | 'Outros';

export const OFFICIAL_PRODUCT_TYPES: ProductType[] = [
  'Livros',
  'Mapas',
  'Material para VTT',
  'Outros',
];

export type CurrencyType = 'USD' | 'BRL';

export type UserStatus = 'aprovado' | 'pendente' | 'recusado';

export interface MembershipApplication {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  comoConheceu: string;
  indicadoPor?: string;
  respostas: Record<number, string>;
  regrasTextoAceito: string;
  regrasVersao: string;
  aceitouTermos: boolean;
  aceitouEm: string;
  criadoEm: string;
  status: 'pendente' | 'aprovado' | 'recusado';
  observacoesMestre?: string;
  avaliadoEm?: string;
  avaliadoPor?: string;
  userId?: string;
}

export type TrollinTransactionType =
  | 'inicial'
  | 'ganho_financiamento'
  | 'gasto_sugestao'
  | 'doacao_sugestao'
  | 'ajuste_mestre_credito'
  | 'ajuste_mestre_debito';

export interface TrollinLedgerEntry {
  id: string;
  dedupKey: string;
  memberId: string;
  type: TrollinTransactionType;
  amount: number;
  balanceAfter: number;
  packageId?: string;
  packageTitle?: string;
  itemId?: string;
  itemNome?: string;
  reason?: string;
  adjustedBy?: string;
  description: string;
  createdAt: string;
}

export interface TrollinDonationRecord {
  id: string;
  clientRequestId?: string;
  memberId: string;
  memberNome: string;
  amount: number;
  createdAt: string;
}

export interface TrollinsMeta {
  activatedAt: string;
  version: number;
  awardedPackageIds?: string[];
}

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
  solicitacaoId?: string;
  trollinsSaldo?: number;
  trollinsExtrato?: TrollinLedgerEntry[];
}

export interface Apoiador {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  data?: string;
  pagamentoInformado?: boolean;
  dataPagamentoInformado?: string;
  isPosteriorBuyer?: boolean;
}

export interface ParticipantPaymentInfo {
  memberId: string;
  nome?: string;
  informouPagamento: boolean;
  dataPagamentoInformado?: string;
}

export interface SolicitacaoAcesso {
  memberId: string;
  nome: string;
  data: string;
  telefone?: string;
  email?: string;
}

export interface ItemRPG {
  id: string;
  data: string; // YYYY-MM-DD
  nome: string;
  produto: ProductType;
  sistemaId?: string;
  sistema: string;
  sistemaOriginal?: string;
  sistemaPrecisaRevisao?: boolean;
  descricao: string;
  link: string;
  imageUrl?: string;
  sugeridoPorId?: string;
  sugeridoPorNome: string;
  sugeridoPorTelefone: string;
  sugeridoPorEmail?: string;
  moeda: CurrencyType;
  valorNumerico: number;
  observacaoValor?: string;
  status: ItemStatus;
  apoiadores: Apoiador[];
  packageId?: string; // Id do pacote se foi agrupado
  trollinsInvestidos?: number;
  trollinsDoados?: number;
  doacoesTrollins?: TrollinDonationRecord[];
  clientRequestId?: string;
}

export interface PackageSubItem {
  id: string;
  nome: string;
  sistemaId?: string;
  sistema: string;
  sistemaOriginal?: string;
  sistemaPrecisaRevisao?: boolean;
  categoria?: string;
  tipo?: ProductType;
  link: string;
  precoBRL: number;
  imageUrl?: string;
}

export interface FundingPackage {
  id: string;
  titulo: string;
  sistema?: string;
  sistemasIds?: string[];
  tipo?: ProductType;
  descricao?: string;
  imageUrl?: string; // Imagem principal de capa do pacote
  itens: PackageSubItem[]; // Lista dinâmica com nome, sistema, link, precoBRL e imagem
  valorTotalBRL: number; // Soma automática dos precoBRL
  dataFinalizar?: string; // Data máxima para colocar o nome na lista
  dataPagamento?: string; // Data máxima para efetuar o pagamento
  minimoParticipantes: number; // Mínimo de cotistas, ex: 35
  valorMaximoPorPessoa: number; // valorTotalBRL / minimoParticipantes
  valorCatalogoBRL?: number; // Preço de aquisição no catálogo de produtos
  valorCota?: number; // Valor da cota unitária histórica
  precoAquisicao?: number; // Preço de aquisição do catálogo
  linkLoja?: string;
  linkDrive?: string;
  links?: string[]; // Links de referência ou compra dos módulos
  itensInclusos?: string[]; // Retrocompatibilidade
  sugestoesIds?: string[];
  status: PackageStatus; // 'Financiamento' | 'Catálogo'
  etapaFinanciamento?: FundingStage; // 'COLETA' | 'PAGAMENTO' (padrão: COLETA)
  valorFinalPorParticipante?: number; // Valor final por participante fixado pelo Mestre ao iniciar a cobrança
  chavePix?: string; // Chave Pix para pagamento definida pelo Mestre
  instrucoesPix?: string; // Instruções adicionais do Mestre para pagamento
  pagamentos?: Record<string, ParticipantPaymentInfo>; // Registro de declaração de pagamento por memberId
  apoiadores: Apoiador[];
  solicitacoesAcesso?: SolicitacaoAcesso[]; // Solicitações de acesso pendentes de confirmação do Mestre via carrinho
  criadoEm: string;
  finalizadoEm?: string;
}

export const SISTEMAS_PADRAO: string[] = OFFICIAL_RPG_SYSTEM_LEGENDS.map((l) => l.nome);

export const MASTER_ADMIN_NAME = 'Ponte dos Trolls';

/**
 * Normaliza tipos antigos de produto para os 4 oficiais:
 * - 'Mapas para VTT' e 'Mapas normais' -> 'Mapas'
 * - 'Módulo Foundry' e 'Token' -> 'Material para VTT'
 * - 'Livros' -> 'Livros'
 * - 'Outro' -> 'Outros'
 * - Se era nome de sistema, preserva o sistema se aplicável e retorna 'Outros'.
 */
export function normalizeProductType(oldType: string | undefined, currentSistema?: string): {
  tipo: ProductType;
  sistema: string;
} {
  const raw = String(oldType || '').trim();
  const rawLower = raw.toLowerCase();
  let sistema = currentSistema ? String(currentSistema).trim() : '';

  if (!raw) {
    return { tipo: 'Outros', sistema };
  }

  if (rawLower.includes('livro')) {
    return { tipo: 'Livros', sistema };
  }

  if (rawLower.includes('mapa')) {
    return { tipo: 'Mapas', sistema };
  }

  if (rawLower.includes('módulo') || rawLower.includes('modulo') || rawLower.includes('token') || rawLower.includes('vtt')) {
    return { tipo: 'Material para VTT', sistema };
  }

  // Check if oldType is one of the standard systems (e.g., PF2E, DnD5e, SWADE, Symbaroum, Cthulhu)
  const matchingSistema = SISTEMAS_PADRAO.find(s => s.toLowerCase() === rawLower);
  if (matchingSistema) {
    if (!currentSistema || currentSistema === 'Outro' || currentSistema === 'Foundry VTT Geral') {
      sistema = matchingSistema;
    }
    return { tipo: 'Outros', sistema };
  }

  if (rawLower === 'outro' || rawLower === 'outros' || rawLower === 'patreon') {
    return { tipo: 'Outros', sistema };
  }

  return { tipo: 'Outros', sistema };
}


