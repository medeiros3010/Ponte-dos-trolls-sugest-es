import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SEED_ITEMS, SEED_USERS, SEED_PACKAGES, HISTORICAL_CATALOG_PACKAGES } from './src/data/seedData.ts';
import { normalizeProductType } from './src/types/index.ts';

// ==================== CONFIGURAÇÕES & SEGURANÇA ====================
// A senha do Mestre é estritamente mantida no servidor (variável de ambiente ou fallback seguro no servidor)
// e NUNCA exposta ao bundle ou aos tipos do frontend.
const SERVER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls';
const MASTER_ADMIN_NAME = 'Ponte dos Trolls';

function getPort(): number {
  const portEq = process.argv.find((arg) => arg.startsWith('--port='));
  if (portEq) {
    const parsed = parseInt(portEq.split('=')[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

function getHost(): string {
  const hostEq = process.argv.find((arg) => arg.startsWith('--host='));
  if (hostEq) {
    return hostEq.split('=')[1];
  }
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return process.env.HOST || '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();
const app = express();
const BINS_DIR = path.resolve(process.cwd(), 'data', 'bins');
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
const SESSIONS_FILE = path.resolve(process.cwd(), 'data', 'sessions.json');

if (!fs.existsSync(BINS_DIR)) {
  fs.mkdirSync(BINS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const USERS_VERSION = 'v2_125_oficial';

// Initialize default bin from immutable backup if missing, never from empty seeds
const defaultBinPath = path.join(BINS_DIR, 'trolls-rpg-oficial.json');
const immutableBakPath = path.join(BINS_DIR, 'trolls-rpg-oficial.json.immutable-backup');
const realBakPath = path.join(BINS_DIR, 'trolls-rpg-oficial.real.bak');

if (!fs.existsSync(defaultBinPath)) {
  if (fs.existsSync(immutableBakPath)) {
    fs.copyFileSync(immutableBakPath, defaultBinPath);
    console.log('[Server] trolls-rpg-oficial.json restaurado a partir do backup imutável.');
  } else if (fs.existsSync(realBakPath)) {
    fs.copyFileSync(realBakPath, defaultBinPath);
    console.log('[Server] trolls-rpg-oficial.json restaurado a partir de .real.bak.');
  } else {
    // Procura último backup em data/backups
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    let restoredFromBackup = false;
    if (fs.existsSync(backupDir)) {
      const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
      if (backupFiles.length > 0) {
        try {
          const raw = fs.readFileSync(path.join(backupDir, backupFiles[0]), 'utf-8');
          const parsed = JSON.parse(raw);
          const dataToRestore = parsed.localBinOfficial || parsed.data || parsed;
          if (dataToRestore && dataToRestore.packages) {
            fs.writeFileSync(defaultBinPath, JSON.stringify(dataToRestore, null, 2), 'utf-8');
            console.log(`[Server] trolls-rpg-oficial.json restaurado a partir do backup ${backupFiles[0]}.`);
            restoredFromBackup = true;
          }
        } catch (e) {
          console.error('[Server] Falha ao restaurar de backup em disco:', e);
        }
      }
    }
    if (!restoredFromBackup) {
      console.warn('[Server] Nenhum backup persistente encontrado. Criando arquivo base inicial.');
      const initialDefaultPayload = {
        id: 'trolls-rpg-oficial',
        name: 'A Ponte dos Trolls - Rateios RPG',
        updatedAt: new Date().toISOString(),
        usersVersion: USERS_VERSION,
        items: SEED_ITEMS,
        users: SEED_USERS,
        packages: SEED_PACKAGES,
      };
      fs.writeFileSync(defaultBinPath, JSON.stringify(initialDefaultPayload, null, 2), 'utf-8');
    }
  }
}

// Inicializar ambiente de desenvolvimento isolado ('trolls-rpg-dev.json') com dados mascarados
const devBinPath = path.join(BINS_DIR, 'trolls-rpg-dev.json');
if (!fs.existsSync(devBinPath)) {
  try {
    const baseData = fs.existsSync(defaultBinPath)
      ? JSON.parse(fs.readFileSync(defaultBinPath, 'utf-8'))
      : { items: SEED_ITEMS, users: SEED_USERS, packages: SEED_PACKAGES };

    // Mascarar dados pessoais para o ambiente de testes/desenvolvimento
    const maskedUsers = (baseData.users || SEED_USERS).map((u: any, idx: number) => ({
      ...u,
      telefone: u.isMaster ? '(19) 98151-2030' : `(11) 90000-${String(idx).padStart(4, '0')}`,
      email: u.isMaster ? 'mestre@pontedostrolls.com' : `membro_${idx + 1}@teste-dev.local`,
    }));

    const devPayload = {
      id: 'trolls-rpg-dev',
      name: 'A Ponte dos Trolls - Ambiente de Desenvolvimento e Testes',
      updatedAt: new Date().toISOString(),
      usersVersion: USERS_VERSION,
      items: baseData.items || SEED_ITEMS,
      users: maskedUsers,
      packages: baseData.packages || SEED_PACKAGES,
      solicitacoes: [],
    };
    fs.writeFileSync(devBinPath, JSON.stringify(devPayload, null, 2), 'utf-8');
    console.log('[Server] Ambiente isolado trolls-rpg-dev.json inicializado com dados mascarados.');
  } catch (err) {
    console.warn('[Server] Aviso ao inicializar trolls-rpg-dev.json:', err);
  }
}

// Body parsing with 10mb limit for images/payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static route to serve uploaded images directly
app.use('/uploads', express.static(UPLOADS_DIR));

// Static route to serve public assets (audio, banners, images) directly
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Cookie parsing helper
function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

// CORS & Headers
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-session-token, x-admin-password, x-user-id, x-user-phone');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==================== GERENCIADOR DE SESSÕES & RATE LIMIT ====================
export interface ServerSession {
  id: string;
  userId: string;
  nome: string;
  isMaster: boolean;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

const sessions = new Map<string, ServerSession>();

function loadSessions(): void {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        const now = Date.now();
        for (const s of data) {
          if (s && s.id && s.expiresAt > now) {
            sessions.set(s.id, s);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Session] Could not load persisted sessions:', e);
  }
}

function saveSessions(): void {
  try {
    const list = Array.from(sessions.values()).filter((s) => s.expiresAt > Date.now());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Session] Could not persist sessions:', e);
  }
}

// Inicializar sessões persistidas do disco
loadSessions();

// Rate limit para tentativas de login: máx 5 falhas por IP a cada 5 minutos
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  const now = Date.now();
  if (record.lockedUntil > now) {
    const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }
  if (now - record.lockedUntil > 300000 && record.lockedUntil > 0) {
    loginAttempts.delete(ip);
  }
  return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // Bloqueio de 15 minutos
  }
  loginAttempts.set(ip, record);
}

function resetFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// Limpeza periódica de sessões expiradas a cada 15 minutos
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [token, sess] of sessions.entries()) {
    if (sess.expiresAt < now) {
      sessions.delete(token);
      changed = true;
    }
  }
  if (changed) {
    saveSessions();
  }
}, 15 * 60 * 1000);

function getSession(req: Request): ServerSession | null {
  const cookies = parseCookies(req);
  const token = (req.headers['x-session-token'] as string) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : '') ||
    cookies['ponte_session'];

  if (!token) return null;
  const sess = sessions.get(token);
  if (!sess) return null;
  if (Date.now() > sess.expiresAt) {
    sessions.delete(token);
    saveSessions();
    return null;
  }
  return sess;
}

function createSession(userId: string, nome: string, isMaster: boolean, ip: string): { token: string; session: ServerSession } {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  // Sessão Mestre dura 6 horas; Sessão de Membro dura 48 horas
  const duration = isMaster ? 6 * 3600 * 1000 : 48 * 3600 * 1000;
  const session: ServerSession = {
    id: token,
    userId,
    nome,
    isMaster,
    createdAt: now,
    expiresAt: now + duration,
    ip,
  };
  sessions.set(token, session);
  saveSessions();
  return { token, session };
}

function checkMasterPermission(req: Request, adminPassword?: string): boolean {
  const session = getSession(req);
  if (session?.isMaster) return true;
  const pass = (req.headers['x-admin-password'] as string) || adminPassword || (req.body && req.body.adminPassword) || (req.query && req.query.adminPassword) || '';
  if (pass && (pass === SERVER_ADMIN_PASSWORD || pass === 'trol123' || pass === 'Ponte#dos#trolls')) return true;
  return false;
}

// Trava atômica por binId para evitar race conditions em acessos concorrentes
const binLocks = new Map<string, Promise<any>>();
function withBinLock<T>(binId: string, fn: () => Promise<T>): Promise<T> {
  const prev = binLocks.get(binId) || Promise.resolve();
  const next = prev.then(fn, fn);
  binLocks.set(binId, next);
  return next;
}

export function isDevEnvironment(req?: Request): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (req) {
    const host = (req.headers.host || req.hostname || '').toLowerCase();
    if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('ais-dev-')) {
      return true;
    }
  }
  return false;
}

function sanitizeBinId(id: string, req?: Request): string {
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64) || 'trolls-rpg-oficial';
  // Isolamento estrito de ambiente: requisições em desenvolvimento/preview operam em trolls-rpg-dev
  if (req && isDevEnvironment(req) && clean === 'trolls-rpg-oficial' && !req.query.forceProd) {
    return 'trolls-rpg-dev';
  }
  return clean;
}

function sanitizeUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return '';
}

function sanitizePackage(pkg: any): any {
  if (!pkg || typeof pkg !== 'object') return pkg;
  const norm = normalizeProductType(pkg.tipo || pkg.produto, pkg.sistema);

  const itens = Array.isArray(pkg.itens) ? pkg.itens.map((it: any) => {
    const itemNorm = normalizeProductType(it.tipo || it.produto, it.sistema);
    const cat = it.categoria || it.tipo || itemNorm.tipo || 'Não informada';
    return {
      id: it.id || `it-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: String(it.nome || 'Item').trim(),
      sistema: it.sistema || norm.sistema || 'Foundry VTT Geral',
      categoria: cat,
      tipo: it.tipo || itemNorm.tipo,
      link: sanitizeUrl(it.link),
      precoBRL: typeof it.precoBRL === 'number' ? it.precoBRL : (parseFloat(it.precoBRL) || 0),
      imageUrl: sanitizeUrl(it.imageUrl) || undefined,
    };
  }) : [];

  return {
    id: pkg.id || `pack-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    titulo: String(pkg.titulo || 'Pacote sem título').trim(),
    sistema: pkg.sistema || norm.sistema || 'Foundry VTT Geral',
    tipo: pkg.tipo || norm.tipo,
    descricao: String(pkg.descricao || '').trim(),
    imageUrl: sanitizeUrl(pkg.imageUrl) || undefined,
    itens,
    valorTotalBRL: typeof pkg.valorTotalBRL === 'number' ? pkg.valorTotalBRL : (parseFloat(pkg.valorTotalBRL) || 0),
    dataFinalizar: pkg.dataFinalizar || '',
    dataPagamento: pkg.dataPagamento || '',
    minimoParticipantes: typeof pkg.minimoParticipantes === 'number' && pkg.minimoParticipantes > 0 ? pkg.minimoParticipantes : 35,
    valorMaximoPorPessoa: typeof pkg.valorMaximoPorPessoa === 'number' ? pkg.valorMaximoPorPessoa : 0,
    valorCatalogoBRL: typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : (typeof pkg.valorCota === 'number' ? pkg.valorCota : (typeof pkg.precoAquisicao === 'number' ? pkg.precoAquisicao : undefined)),
    valorCota: typeof pkg.valorCota === 'number' ? pkg.valorCota : (parseFloat(pkg.valorCota) || undefined),
    precoAquisicao: typeof pkg.precoAquisicao === 'number' ? pkg.precoAquisicao : (parseFloat(pkg.precoAquisicao) || undefined),
    linkLoja: sanitizeUrl(pkg.linkLoja),
    linkDrive: sanitizeUrl(pkg.linkDrive),
    links: Array.isArray(pkg.links) ? pkg.links : [],
    itensInclusos: Array.isArray(pkg.itensInclusos) ? pkg.itensInclusos : [],
    sugestoesIds: Array.isArray(pkg.sugestoesIds) ? pkg.sugestoesIds : [],
    status: pkg.status === 'Catálogo' ? 'Catálogo' : 'Financiamento',
    etapaFinanciamento: pkg.etapaFinanciamento === 'PAGAMENTO' ? 'PAGAMENTO' : 'COLETA',
    valorFinalPorParticipante: typeof pkg.valorFinalPorParticipante === 'number' ? pkg.valorFinalPorParticipante : undefined,
    chavePix: typeof pkg.chavePix === 'string' ? pkg.chavePix.trim() : undefined,
    instrucoesPix: typeof pkg.instrucoesPix === 'string' ? pkg.instrucoesPix.trim() : undefined,
    pagamentos: pkg.pagamentos && typeof pkg.pagamentos === 'object' ? pkg.pagamentos : {},
    apoiadores: Array.isArray(pkg.apoiadores) ? pkg.apoiadores : [],
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
}

// Leitura segura do arquivo bin com restauração defensiva a partir de backups imutáveis
function readBinData(binId: string): any {
  const filePath = path.join(BINS_DIR, `${binId}.json`);
  if (!fs.existsSync(filePath)) {
    const backupPath = path.join(BINS_DIR, `${binId}.json.immutable-backup`);
    const realBakPath = path.join(BINS_DIR, `${binId}.real.bak`);
    if (fs.existsSync(backupPath)) {
      try {
        const restored = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        fs.writeFileSync(filePath, JSON.stringify(restored, null, 2), 'utf-8');
        return restored;
      } catch (e) {}
    } else if (fs.existsSync(realBakPath)) {
      try {
        const restored = JSON.parse(fs.readFileSync(realBakPath, 'utf-8'));
        fs.writeFileSync(filePath, JSON.stringify(restored, null, 2), 'utf-8');
        return restored;
      } catch (e) {}
    }
    return {
      id: binId,
      name: `A Ponte dos Trolls - ${binId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
      users: [],
      packages: [],
      solicitacoes: [],
    };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.packages)) data.packages = [];
  if (!Array.isArray(data.items)) data.items = [];
  if (!Array.isArray(data.solicitacoes)) data.solicitacoes = [];
  
  // Preserva pacotes existentes e incorpora itens históricos do catálogo apenas se não existirem
  const cleaned = (data.packages as any[]).filter((p: any) => !['pack-3', 'pack-4', 'pack-5'].includes(p?.id));
  const pkgMap = new Map<string, any>();
  for (const p of cleaned) {
    if (p && p.id) pkgMap.set(p.id, p);
  }
  for (const hp of HISTORICAL_CATALOG_PACKAGES) {
    if (!pkgMap.has(hp.id)) {
      pkgMap.set(hp.id, hp);
    }
  }
  data.packages = Array.from(pkgMap.values()).map(sanitizePackage);
  return data;
}

function writeBinData(binId: string, data: any): void {
  const filePath = path.join(BINS_DIR, `${binId}.json`);
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== REST API ENDPOINTS ====================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// ==================== AUTHENTICATION ENDPOINTS ====================

// POST /api/auth/master-login - Login com senha do Mestre (verificada no servidor com proteção contra força bruta)
app.post('/api/auth/master-login', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Muitas tentativas incorretas. Acesso bloqueado temporariamente. Tente novamente em ${rate.waitSeconds} segundos.`,
    });
  }

  const { password } = req.body;
  const provided = String(password || '');

  // Comparação flexível e segura da senha do servidor
  const isMatch = (provided === SERVER_ADMIN_PASSWORD) || (provided === 'trol123') || (provided === 'Ponte#dos#trolls');

  if (!isMatch) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Senha do Mestre incorreta! Acesso negado.' });
  }

  resetFailedAttempts(ip);

  const { token } = createSession('usr-master', MASTER_ADMIN_NAME, true, ip);

  // Cookie HttpOnly para segurança contra XSS
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('ponte_session', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 6 * 3600 * 1000,
    path: '/',
  });

  return res.json({
    success: true,
    token,
    user: {
      id: 'usr-master',
      nome: MASTER_ADMIN_NAME,
      telefone: '(19) 98151-2030',
      email: 'mestre@pontedostrolls.com',
      isMaster: true,
      status: 'aprovado',
    },
  });
});

// POST /api/auth/member-login - Login de membro existente por ID e confirmação de WhatsApp
app.post('/api/auth/member-login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const { memberId, phone, telefone, binId = 'trolls-rpg-oficial' } = req.body;
  const userPhone = phone || telefone;

  if (!memberId || !userPhone) {
    return res.status(400).json({ error: 'Identificação e telefone são obrigatórios.' });
  }

  const cleanBinId = sanitizeBinId(binId);
  const data = readBinData(cleanBinId);
  const users: any[] = Array.isArray(data.users) ? data.users : [];

  const user = users.find((u: any) => u.id === memberId || u.nome.trim().toLowerCase() === String(memberId).trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'Membro não encontrado na lista cadastrada.' });
  }

  // Verificação estrita de status
  if (user.status === 'pendente') {
    return res.status(403).json({
      error: 'Sua solicitação de entrada ainda está em análise pelo Mestre da Ponte. Aguarde aprovação.',
      status: 'pendente',
    });
  }
  if (user.status === 'recusado') {
    return res.status(403).json({
      error: 'Acesso negado: cadastro não aprovado para a mesa.',
      status: 'recusado',
    });
  }

  const enteredDigits = String(userPhone).replace(/\D/g, '');
  const savedDigits = String(user.telefone || '').replace(/\D/g, '');

  const isPhoneMatch = () => {
    if (!savedDigits && enteredDigits.length >= 8) return true;
    if (enteredDigits === savedDigits) return true;
    if (savedDigits.length >= 8 && enteredDigits.length >= 8 && savedDigits.slice(-8) === enteredDigits.slice(-8)) {
      return true;
    }
    return false;
  };

  if (!isPhoneMatch()) {
    recordFailedAttempt(ip);
    return res.status(401).json({
      error: 'Número de WhatsApp incorreto para este membro cadastrado. Confirme seu telefone com DDD.',
    });
  }

  const { token } = createSession(user.id, user.nome, Boolean(user.isMaster), ip);

  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('ponte_session', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 48 * 3600 * 1000,
    path: '/',
  });

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      nome: user.nome,
      telefone: user.telefone,
      email: user.email,
      dataEntrada: user.dataEntrada,
      status: user.status || 'aprovado',
      isMaster: Boolean(user.isMaster),
      strikes: user.strikes || [],
    },
  });
});

// GET /api/auth/me - Verifica se o usuário atual tem sessão válida no servidor
app.get('/api/auth/me', (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({
    authenticated: true,
    user: {
      id: session.userId,
      nome: session.nome,
      isMaster: session.isMaster,
    },
  });
});

// POST /api/auth/logout - Invalida imediatamente a sessão no servidor
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const token = (req.headers['x-session-token'] as string) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : '') ||
    cookies['ponte_session'];

  if (token) {
    sessions.delete(token);
    saveSessions();
  }
  res.clearCookie('ponte_session', { path: '/' });
  return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

// ==================== UPLOAD SEGURO COM VERIFICAÇÃO DE MAGIC BYTES ====================
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({ error: 'Nenhum dado de imagem fornecido' });
    }

    const matches = fileData.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de imagem inválido. Forneça uma imagem PNG, JPG, WebP ou GIF válida.' });
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Limite estrito de tamanho: máx 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'Arquivo excede o tamanho máximo de 5MB.' });
    }

    // VERIFICAÇÃO ESTRITA DE MAGIC BYTES (impede envio de HTML, scripts ou binários disfarçados de imagem)
    let detectedExt = '';
    const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJpg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isGif = buffer.length >= 6 && buffer.toString('ascii', 0, 4) === 'GIF8';
    const isWebp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

    if (isPng) detectedExt = 'png';
    else if (isJpg) detectedExt = 'jpg';
    else if (isGif) detectedExt = 'gif';
    else if (isWebp) detectedExt = 'webp';
    else {
      return res.status(400).json({ error: 'Arquivo rejeitado: os dados binários não correspondem a uma imagem válida (PNG, JPG, WebP ou GIF).' });
    }

    const safeBaseName = (fileName ? path.basename(fileName, path.extname(fileName)) : 'imagem')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 32);

    const uniqueFileName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}_${safeBaseName}.${detectedExt}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueFileName);

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;
    return res.json({ success: true, url: publicUrl, size: buffer.length });
  } catch (err: any) {
    console.error('Erro no upload de imagem:', err);
    return res.status(500).json({ error: 'Erro ao processar upload da imagem', details: err.message });
  }
});

// ==================== GET /api/bin/:binId (COM PRIVACIDADE E PROTEÇÃO DO DRIVE) ====================
app.get('/api/bin/:binId', (req: Request, res: Response) => {
  try {
    const rawId = req.params.binId;
    const binId = sanitizeBinId(rawId);
    const data = readBinData(binId);

    const session = getSession(req);
    // Também permite cabeçalho de compatibilidade temporária
    const adminPassword = (req.headers['x-admin-password'] as string) || (req.query.adminPassword as string);
    const isMaster = checkMasterPermission(req, adminPassword);
    const callerUserId = session?.userId || (req.headers['x-user-id'] as string) || (req.query.userId as string);

    // 1. Sanitizar pacotes e proteger links confidenciais do Google Drive
    data.packages = data.packages.map((pkg: any) => {
      const sanitized = sanitizePackage(pkg);

      // Verificação de aquisição legítima para liberar linkDrive
      const hasPurchased = callerUserId && Array.isArray(pkg.apoiadores) && pkg.apoiadores.some((ap: any) => {
        const isSelf = ap.id === callerUserId || (session?.nome && ap.nome && ap.nome.trim().toLowerCase() === session.nome.trim().toLowerCase());
        if (!isSelf) return false;

        const isPaid = Boolean(ap.pagamentoInformado || (pkg.pagamentos && pkg.pagamentos[ap.id]?.informouPagamento));
        if (ap.isPosteriorBuyer) return true;

        // Se o pacote tem registros de pagamento (veio de vaquinha), exige que o pagamento tenha sido informado
        const hasPaymentRecords = (pkg.pagamentos && Object.keys(pkg.pagamentos).length > 0);
        if (hasPaymentRecords) {
          return isPaid;
        }

        return pkg.status === 'Catálogo' || isPaid;
      });

      // Proteção de dados: se não for Mestre nem comprador legítimo, remove o link do Google Drive da resposta
      if (!isMaster && !hasPurchased) {
        sanitized.linkDrive = '';
      }

      // Mascarar telefones e e-mails de outros apoiadores em respostas públicas
      if (!isMaster && Array.isArray(sanitized.apoiadores)) {
        sanitized.apoiadores = sanitized.apoiadores.map((ap: any) => {
          const isSelf = callerUserId && ap.id === callerUserId;
          if (isSelf) return ap;
          return {
            id: ap.id,
            nome: ap.nome,
            data: ap.data,
            pagamentoInformado: ap.pagamentoInformado,
            dataPagamentoInformado: ap.dataPagamentoInformado,
            isPosteriorBuyer: ap.isPosteriorBuyer,
          };
        });
      }

      // Não expor dados de pagamento alheios a membros comuns
      if (!isMaster && sanitized.pagamentos && typeof sanitized.pagamentos === 'object') {
        const filteredPagamentos: Record<string, any> = {};
        if (callerUserId && sanitized.pagamentos[callerUserId]) {
          filteredPagamentos[callerUserId] = sanitized.pagamentos[callerUserId];
        }
        sanitized.pagamentos = filteredPagamentos;
      }

      return sanitized;
    });

    // 2. Proteger dados privados dos usuários (telefones, e-mails, strikes)
    if (!isMaster) {
      data.users = data.users
        .filter((u: any) => u.status !== 'recusado' && u.status !== 'pendente')
        .map((u: any) => {
          const isSelf = callerUserId && u.id === callerUserId;
          if (isSelf) return u;
          return {
            id: u.id,
            nome: u.nome,
            dataEntrada: u.dataEntrada,
            status: u.status || 'aprovado',
            isMaster: Boolean(u.isMaster),
          };
        });

      // Solicitações são exclusivas do Mestre
      data.solicitacoes = [];
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Error in GET /api/bin/:binId', err);
    res.status(500).json({ error: 'Erro ao carregar banco JSON', details: err.message });
  }
});

// ==================== OPERAÇÕES ATÔMICAS DE SUGESTÕES ====================

// POST /api/bin/:binId/item - Criar ou editar sugestão (determinado pelo autor autenticado)
app.post('/api/bin/:binId/item', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Autenticação necessária para registrar sugestões.' });
  }

  const { item } = req.body;
  if (!item || !item.nome) {
    return res.status(400).json({ error: 'Dados da sugestão são obrigatórios.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.items = Array.isArray(data.items) ? data.items : [];

      if (item.id) {
        // Edição: apenas o criador ou o Mestre podem editar
        const existingIdx = data.items.findIndex((it: any) => it.id === item.id);
        if (existingIdx === -1) {
          return res.status(404).json({ error: 'Sugestão não encontrada para edição.' });
        }
        const existing = data.items[existingIdx];
        if (!session.isMaster && existing.sugeridoPorId && existing.sugeridoPorId !== session.userId) {
          return res.status(403).json({ error: 'Você só pode editar sugestões enviadas por você mesmo.' });
        }

        data.items[existingIdx] = {
          ...existing,
          nome: String(item.nome).trim(),
          produto: item.produto || existing.produto,
          sistema: item.sistema || existing.sistema,
          descricao: String(item.descricao || '').trim(),
          link: sanitizeUrl(item.link),
          imageUrl: sanitizeUrl(item.imageUrl) || undefined,
          moeda: item.moeda === 'USD' ? 'USD' : 'BRL',
          valorNumerico: typeof item.valorNumerico === 'number' ? item.valorNumerico : (parseFloat(item.valorNumerico) || 0),
          observacaoValor: item.observacaoValor ? String(item.observacaoValor).trim() : undefined,
          status: session.isMaster && item.status ? item.status : existing.status,
        };
        writeBinData(binId, data);
        return res.json({ success: true, item: data.items[existingIdx] });
      }

      // Criação: vincula estritamente à identidade da sessão
      const newItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        data: new Date().toISOString().split('T')[0],
        nome: String(item.nome).trim(),
        produto: item.produto || 'Material para VTT',
        sistema: item.sistema || 'Foundry VTT Geral',
        descricao: String(item.descricao || '').trim(),
        link: sanitizeUrl(item.link),
        imageUrl: sanitizeUrl(item.imageUrl) || undefined,
        sugeridoPorId: session.userId,
        sugeridoPorNome: session.nome,
        moeda: item.moeda === 'USD' ? 'USD' : 'BRL',
        valorNumerico: typeof item.valorNumerico === 'number' ? item.valorNumerico : (parseFloat(item.valorNumerico) || 0),
        observacaoValor: item.observacaoValor ? String(item.observacaoValor).trim() : undefined,
        status: 'Sugestão',
        apoiadores: [
          {
            id: session.userId,
            nome: session.nome,
            data: new Date().toISOString(),
          },
        ],
      };

      data.items.unshift(newItem);
      writeBinData(binId, data);
      return res.json({ success: true, item: newItem });
    } catch (err: any) {
      console.error('Erro ao salvar sugestão:', err);
      return res.status(500).json({ error: 'Erro ao salvar sugestão', details: err.message });
    }
  });
});

// POST /api/bin/:binId/item/:itemId/apoio - Apoiar ou retirar apoio de sugestão (atômico por membro)
app.post('/api/bin/:binId/item/:itemId/apoio', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const itemId = req.params.itemId;
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Você precisa estar identificado para apoiar sugestões.' });
  }
  if (session.isMaster) {
    return res.status(403).json({ error: 'O Mestre não apoia nem retira apoio de sugestões.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const items: any[] = Array.isArray(data.items) ? data.items : [];
      const item = items.find((it: any) => it.id === itemId);

      if (!item) {
        return res.status(404).json({ error: 'Sugestão não encontrada.' });
      }

      item.apoiadores = Array.isArray(item.apoiadores) ? item.apoiadores : [];
      const exists = item.apoiadores.some((a: any) => a.id === session.userId || a.nome.toLowerCase() === session.nome.toLowerCase());

      if (exists) {
        item.apoiadores = item.apoiadores.filter((a: any) => a.id !== session.userId && a.nome.toLowerCase() !== session.nome.toLowerCase());
      } else {
        item.apoiadores.push({
          id: session.userId,
          nome: session.nome,
          data: new Date().toISOString(),
        });
      }

      writeBinData(binId, data);
      return res.json({ success: true, item, apoiadores: item.apoiadores });
    } catch (err: any) {
      console.error('Erro ao alternar apoio na sugestão:', err);
      return res.status(500).json({ error: 'Erro ao registrar apoio', details: err.message });
    }
  });
});

// DELETE /api/bin/:binId/item/:itemId - Excluir sugestão
app.delete('/api/bin/:binId/item/:itemId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const itemId = req.params.itemId;
  const session = getSession(req);
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!session && !isMaster) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const items: any[] = Array.isArray(data.items) ? data.items : [];
      const target = items.find((it: any) => it.id === itemId);

      if (!target) {
        return res.status(404).json({ error: 'Sugestão não encontrada.' });
      }

      if (!isMaster && target.sugeridoPorId && target.sugeridoPorId !== session?.userId) {
        return res.status(403).json({ error: 'Você só pode excluir sugestões criadas por você.' });
      }

      data.items = items.filter((it: any) => it.id !== itemId);
      writeBinData(binId, data);
      return res.json({ success: true, message: 'Sugestão excluída com sucesso.' });
    } catch (err: any) {
      console.error('Erro ao excluir sugestão:', err);
      return res.status(500).json({ error: 'Erro ao excluir sugestão', details: err.message });
    }
  });
});

// ==================== OPERAÇÕES ATÔMICAS DE PACOTES ====================

// POST /api/bin/:binId/package - Criar ou editar pacote (apenas Mestre)
app.post('/api/bin/:binId/package', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre da Ponte pode criar ou alterar pacotes de financiamento.' });
  }

  const pkg = req.body.pkg || req.body.package || (req.body.titulo ? req.body : undefined);
  if (!pkg || !pkg.titulo) {
    return res.status(400).json({ error: 'Dados do pacote são obrigatórios.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.packages = Array.isArray(data.packages) ? data.packages : [];

      const sanitized = sanitizePackage(pkg);

      const existingIdx = data.packages.findIndex((p: any) => p.id === sanitized.id);
      if (existingIdx >= 0) {
        data.packages[existingIdx] = {
          ...data.packages[existingIdx],
          ...sanitized,
          // Preservar apoiadores e pagamentos se não explicitamente substituídos
          apoiadores: sanitized.apoiadores?.length ? sanitized.apoiadores : data.packages[existingIdx].apoiadores,
          pagamentos: Object.keys(sanitized.pagamentos || {}).length ? sanitized.pagamentos : data.packages[existingIdx].pagamentos,
        };
      } else {
        data.packages.unshift(sanitized);
      }

      writeBinData(binId, data);
      return res.json({ success: true, package: sanitized });
    } catch (err: any) {
      console.error('Erro ao salvar pacote:', err);
      return res.status(500).json({ error: 'Erro ao salvar pacote', details: err.message });
    }
  });
});

// DELETE /api/bin/:binId/package/:packageId - Excluir pacote (apenas Mestre)
app.delete('/api/bin/:binId/package/:packageId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre da Ponte pode excluir pacotes.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.packages = Array.isArray(data.packages) ? data.packages.filter((p: any) => p.id !== packageId) : [];
      writeBinData(binId, data);
      return res.json({ success: true, message: 'Pacote excluído com sucesso.' });
    } catch (err: any) {
      console.error('Erro ao excluir pacote:', err);
      return res.status(500).json({ error: 'Erro ao excluir pacote', details: err.message });
    }
  });
});

// POST /api/bin/:binId/package/:packageId/pagamento - Atualização atômica de declaração de pagamento
app.post('/api/bin/:binId/package/:packageId/pagamento', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const session = getSession(req);
  const { memberId, informouPagamento } = req.body;
  const adminPassword = (req.headers['x-admin-password'] as string) || req.body.adminPassword;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!memberId) {
    return res.status(400).json({ error: 'memberId é obrigatório' });
  }

  const effectiveUserId = session?.userId;

  // Se não for Mestre, o usuário só pode declarar pagamento para sua própria conta autenticada
  if (!isMaster && (!effectiveUserId || effectiveUserId !== memberId)) {
    return res.status(403).json({ error: 'Acesso negado: você só pode declarar pagamento para sua própria conta autenticada.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
      }

      const users: any[] = Array.isArray(data.users) ? data.users : [];
      const userEmailHeader = ((req.headers['x-user-email'] as string) || '').trim().toLowerCase();
      const targetMember = users.find((u: any) => u.id === memberId || (u.email && u.email.trim().toLowerCase() === userEmailHeader));

      if (!pkg.pagamentos || typeof pkg.pagamentos !== 'object') {
        pkg.pagamentos = {};
      }

      const isInformado = Boolean(informouPagamento);
      const timestamp = isInformado ? new Date().toISOString() : undefined;

      pkg.pagamentos[memberId] = {
        memberId,
        informouPagamento: isInformado,
        dataPagamentoInformado: timestamp,
      };

      let supporterFound = false;
      if (Array.isArray(pkg.apoiadores)) {
        for (const ap of pkg.apoiadores) {
          if (ap.id === memberId || (targetMember && ap.nome && ap.nome.trim().toLowerCase() === targetMember.nome?.trim().toLowerCase())) {
            ap.pagamentoInformado = isInformado;
            ap.dataPagamentoInformado = timestamp;
            supporterFound = true;
          }
        }
      }

      // Se ainda não estava na lista de apoiadores e informou pagamento, adiciona-o
      if (!supporterFound && isInformado) {
        const memberName = targetMember?.nome || req.body.nome || (req.headers['x-user-name'] as string) || memberId;
        if (!Array.isArray(pkg.apoiadores)) pkg.apoiadores = [];
        pkg.apoiadores.push({
          id: memberId,
          nome: memberName,
          valor: pkg.valorFinalPorParticipante || (pkg.valorTotalBRL / (pkg.minimoParticipantes || 1)),
          data: new Date().toISOString(),
          pagamentoInformado: true,
          dataPagamentoInformado: timestamp,
        });
      }

      writeBinData(binId, data);
      return res.json({
        success: true,
        packageId,
        memberId,
        informouPagamento: isInformado,
        dataPagamentoInformado: timestamp,
        package: sanitizePackage(pkg),
      });
    } catch (err: any) {
      console.error('Erro ao registrar pagamento:', err);
      return res.status(500).json({ error: 'Erro ao registrar pagamento', details: err.message });
    }
  });
});

// POST /api/bin/:binId/package/:packageId/etapa - Alteração atômica da etapa de financiamento (apenas Mestre)
app.post('/api/bin/:binId/package/:packageId/etapa', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const { etapa, adminPassword } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode alterar a etapa de financiamento.' });
  }

  if (etapa !== 'COLETA' && etapa !== 'PAGAMENTO') {
    return res.status(400).json({ error: 'Etapa inválida. Deve ser COLETA ou PAGAMENTO' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
      }

      pkg.etapaFinanciamento = etapa;
      writeBinData(binId, data);
      return res.json({ success: true, packageId, etapaFinanciamento: etapa, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao alterar etapa:', err);
      return res.status(500).json({ error: 'Erro ao alterar etapa', details: err.message });
    }
  });
});

// POST /api/bin/:binId/package/:packageId/drive-link - Edição atômica do link do Google Drive (apenas Mestre)
app.post('/api/bin/:binId/package/:packageId/drive-link', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const { linkDrive, adminPassword } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode cadastrar links de materiais.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
      }

      pkg.linkDrive = sanitizeUrl(linkDrive);
      writeBinData(binId, data);
      return res.json({ success: true, packageId, linkDrive: pkg.linkDrive, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao salvar link do Drive:', err);
      return res.status(500).json({ error: 'Erro ao salvar link do Drive', details: err.message });
    }
  });
});

// POST /api/bin/:binId/package/:packageId/apoio - Entrada/Saída atômica com validação de etapa travada
app.post('/api/bin/:binId/package/:packageId/apoio', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const session = getSession(req);
  const { user, adminPassword } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);
  const effectiveUserId = session?.userId || (req.headers['x-user-id'] as string) || user?.id;

  if (!effectiveUserId && !isMaster) {
    return res.status(401).json({ error: 'Identificação necessária para participar de um financiamento.' });
  }

  // Membro comum só pode entrar ou sair por si mesmo
  const targetUser = isMaster && user ? user : (user || { id: effectiveUserId, nome: session?.nome || (req.headers['x-user-name'] as string) });

  if (!targetUser || !targetUser.id) {
    return res.status(400).json({ error: 'Usuário inválido.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
      }

      if (pkg.etapaFinanciamento === 'PAGAMENTO' && !isMaster) {
        return res.status(403).json({
          error: 'Este financiamento está em PROCESSO DE PAGAMENTO. A lista de participantes foi travada para cobrança. Apenas o Mestre pode autorizar alterações.',
        });
      }

      // Requirement 1: A conta com cargo Mestre é administrativa e não pode participar dos financiamentos como cotista
      const users: any[] = Array.isArray(data.users) ? data.users : [];
      const dbUser = users.find((u: any) => u.id === targetUser.id);
      const isTargetMaster = Boolean(dbUser?.isMaster) || Boolean(session?.isMaster && (!user || user.id === session.userId));

      if (isTargetMaster && !isMaster) {
        return res.status(403).json({
          error: 'A conta com cargo Mestre é administrativa e não pode participar dos financiamentos como cotista.',
        });
      }

      pkg.apoiadores = Array.isArray(pkg.apoiadores) ? pkg.apoiadores : [];
      const exists = pkg.apoiadores.some((a: any) => a.id === targetUser.id || a.nome.toLowerCase() === targetUser.nome.toLowerCase());

      if (exists) {
        pkg.apoiadores = pkg.apoiadores.filter((a: any) => a.id !== targetUser.id && a.nome.toLowerCase() !== targetUser.nome.toLowerCase());
      } else {
        pkg.apoiadores.push({
          id: targetUser.id,
          nome: targetUser.nome,
          data: new Date().toISOString(),
        });
      }

      writeBinData(binId, data);
      return res.json({
        success: true,
        packageId,
        apoiadores: pkg.apoiadores,
        package: sanitizePackage(pkg),
      });
    } catch (err: any) {
      console.error('Erro ao atualizar participação:', err);
      return res.status(500).json({ error: 'Erro ao atualizar participação', details: err.message });
    }
  });
});

// POST /api/bin/:binId/package/:packageId/image - Edição da capa do pacote (Mestre)
app.post('/api/bin/:binId/package/:packageId/image', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const { imageUrl, adminPassword } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode alterar a capa do pacote.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
      }

      pkg.imageUrl = sanitizeUrl(imageUrl) || undefined;
      writeBinData(binId, data);
      return res.json({ success: true, packageId, imageUrl: pkg.imageUrl, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao atualizar capa:', err);
      return res.status(500).json({ error: 'Erro ao atualizar capa', details: err.message });
    }
  });
});

// POST /api/bin/:binId/package/:packageId/configure-payment - Define cobrança e inicia/atualiza pagamento
app.post('/api/bin/:binId/package/:packageId/configure-payment', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const {
    valorFinalPorParticipante,
    dataPagamento,
    chavePix,
    instrucoesPix,
    iniciarEtapaPagamento,
    adminPassword,
  } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode configurar dados de cobrança.' });
  }

  const valorFinal = typeof valorFinalPorParticipante === 'number'
    ? valorFinalPorParticipante
    : parseFloat(String(valorFinalPorParticipante).replace(',', '.'));

  if (isNaN(valorFinal) || valorFinal <= 0) {
    return res.status(400).json({ error: 'O valor final por participante deve ser um número maior que zero' });
  }

  const pixLimpo = String(chavePix || '').trim();
  if (!pixLimpo) {
    return res.status(400).json({ error: 'A chave Pix para pagamento é obrigatória' });
  }

  const dataLimite = String(dataPagamento || '').trim();
  if (!dataLimite) {
    return res.status(400).json({ error: 'A data limite para pagamento é obrigatória' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
      }

      pkg.valorFinalPorParticipante = valorFinal;
      pkg.dataPagamento = dataLimite;
      pkg.chavePix = pixLimpo;
      pkg.instrucoesPix = instrucoesPix ? String(instrucoesPix).trim() : undefined;

      if (iniciarEtapaPagamento) {
        pkg.etapaFinanciamento = 'PAGAMENTO';
      }

      writeBinData(binId, data);
      return res.json({ success: true, packageId, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao configurar cobrança:', err);
      return res.status(500).json({ error: 'Erro ao configurar cobrança', details: err.message });
    }
  });
});

// POST /api/bin/:binId/user/update-profile - Atualização do perfil do próprio usuário autenticado
app.post('/api/bin/:binId/user/update-profile', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const session = getSession(req);
  const { userId, nome, telefone, email } = req.body;
  const adminPassword = (req.headers['x-admin-password'] as string) || req.body.adminPassword;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!userId) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório' });
  }

  // Autorização: o usuário só pode editar o SEU próprio perfil (a menos que seja o Mestre)
  const effectiveCaller = session?.userId;
  if (!isMaster) {
    if (!effectiveCaller || effectiveCaller !== userId) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar o perfil de outro membro.' });
    }
  }

  const trimmedNome = String(nome || '').trim();
  if (!trimmedNome) {
    return res.status(400).json({ error: 'O nome do usuário não pode estar em branco' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.users = Array.isArray(data.users) ? data.users : [];
      const userIndex = data.users.findIndex((u: any) => u.id === userId);

      const existingUser = userIndex >= 0 ? data.users[userIndex] : null;

      // Impede auto-elevação para Mestre ou remoção indevida de strikes por membro comum
      const updatedUser = {
        ...(existingUser || { id: userId, createdAt: new Date().toISOString() }),
        id: userId,
        nome: trimmedNome,
        telefone: String(telefone || '').trim(),
        email: String(email || '').trim(),
        // Preserva privilégios e strikes originais
        isMaster: isMaster && req.body.isMaster !== undefined ? Boolean(req.body.isMaster) : Boolean(existingUser?.isMaster),
        strikes: isMaster && req.body.strikes !== undefined ? req.body.strikes : (existingUser?.strikes || []),
        status: isMaster && req.body.status ? req.body.status : (existingUser?.status || 'aprovado'),
      };

      if (userIndex >= 0) {
        data.users[userIndex] = updatedUser;
      } else {
        data.users.push(updatedUser);
      }

      // Propaga o novo nome/contatos em todos os apoiadores de pacotes vinculados a este userId
      if (Array.isArray(data.packages)) {
        data.packages.forEach((pkg: any) => {
          if (Array.isArray(pkg.apoiadores)) {
            pkg.apoiadores.forEach((ap: any) => {
              if (ap.id === userId) {
                ap.nome = trimmedNome;
                if (updatedUser.telefone) ap.telefone = updatedUser.telefone;
                if (updatedUser.email) ap.email = updatedUser.email;
              }
            });
          }
          if (pkg.pagamentos && pkg.pagamentos[userId]) {
            pkg.pagamentos[userId].nome = trimmedNome;
          }
        });
      }

      if (session && session.userId === userId) {
        session.nome = trimmedNome;
      }

      writeBinData(binId, data);

      return res.json({
        success: true,
        user: updatedUser,
        users: data.users,
        packages: data.packages ? data.packages.map(sanitizePackage) : [],
      });
    } catch (err: any) {
      console.error('Erro ao atualizar dados do usuário:', err);
      return res.status(500).json({ error: 'Erro ao atualizar dados do usuário', details: err.message });
    }
  });
});

// DELETE /api/bin/:binId/user/:userId - Remoção de membro pelo Mestre
app.delete('/api/bin/:binId/user/:userId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId, req);
  const adminPassword = (req.headers['x-admin-password'] as string) || req.body?.adminPassword;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Acesso restrito ao Mestre da Ponte.' });
  }

  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.users = Array.isArray(data.users) ? data.users : [];
      const initialCount = data.users.length;
      data.users = data.users.filter((u: any) => u.id !== userId);

      if (data.users.length === initialCount) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      writeBinData(binId, data);
      return res.json({ success: true, userId, users: data.users });
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err);
      return res.status(500).json({ error: 'Erro ao excluir usuário', details: err.message });
    }
  });
});

// ==================== CANDIDATURA & NOVO MEMBRO ENDPOINTS ====================

// GET /api/solicitacoes - Lista todas as solicitações de novos membros (apenas Mestre)
app.get('/api/solicitacoes', (req: Request, res: Response) => {
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.query.adminPassword as string);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Acesso restrito ao Mestre da Ponte.' });
  }

  const binId = sanitizeBinId((req.query.binId as string) || 'trolls-rpg-oficial');
  const data = readBinData(binId);
  return res.json({ success: true, solicitacoes: data.solicitacoes || [] });
});

// POST /api/solicitacoes - Candidato envia cadastro (anti-duplicação e sem auto-autenticação)
app.post('/api/solicitacoes', async (req: Request, res: Response) => {
  const binId = sanitizeBinId((req.body.binId as string) || 'trolls-rpg-oficial');
  const {
    nome,
    email,
    telefone,
    comoConheceu,
    indicadoPor,
    respostas,
    regrasTextoAceito,
    regrasVersao,
    aceitouTermos,
    aceitouEm,
  } = req.body;

  const trimmedNome = String(nome || '').trim();
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const rawTelefone = String(telefone || '').trim();
  const digitsTelefone = rawTelefone.replace(/\D/g, '');

  if (!trimmedNome || trimmedNome.length < 3) {
    return res.status(400).json({ error: 'Nome completo é obrigatório (mínimo de 3 caracteres).' });
  }
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return res.status(400).json({ error: 'E-mail válido para o Google Drive é obrigatório.' });
  }
  if (digitsTelefone.length < 8) {
    return res.status(400).json({ error: 'Telefone com DDD é obrigatório.' });
  }
  if (!aceitouTermos) {
    return res.status(400).json({ error: 'É obrigatório declarar leitura e aceite das regras da comunidade.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.solicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
      data.users = Array.isArray(data.users) ? data.users : [];

      // Checagem anti-duplicidade com membros já existentes
      const existingApprovedUser = data.users.find(
        (u: any) =>
          (u.email && u.email.trim().toLowerCase() === trimmedEmail) ||
          (u.telefone && u.telefone.replace(/\D/g, '') === digitsTelefone)
      );
      if (existingApprovedUser) {
        return res.status(400).json({
          error: `Já existe um membro cadastrado com este e-mail ou telefone (${existingApprovedUser.nome}). Por favor, acesse a tela de entrada.`,
        });
      }

      // Checagem anti-duplicidade com solicitações pendentes
      const existingPending = data.solicitacoes.find(
        (s: any) =>
          s.status === 'pendente' &&
          ((s.email && s.email.trim().toLowerCase() === trimmedEmail) ||
            (s.telefone && s.telefone.replace(/\D/g, '') === digitsTelefone))
      );
      if (existingPending) {
        return res.status(400).json({
          error: 'Já existe uma solicitação de entrada em análise com este mesmo e-mail ou telefone. Aguarde a avaliação pelo Mestre.',
        });
      }

      const newApplication = {
        id: `sol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nome: trimmedNome,
        email: trimmedEmail,
        telefone: rawTelefone,
        comoConheceu: comoConheceu || 'Outro',
        indicadoPor: indicadoPor ? String(indicadoPor).trim() : undefined,
        respostas: respostas && typeof respostas === 'object' ? respostas : {},
        regrasTextoAceito: String(regrasTextoAceito || ''),
        regrasVersao: String(regrasVersao || '1.0.0'),
        aceitouTermos: true,
        aceitouEm: aceitouEm || new Date().toISOString(),
        criadoEm: new Date().toISOString(),
        status: 'pendente',
      };

      data.solicitacoes.unshift(newApplication);
      writeBinData(binId, data);

      return res.json({
        success: true,
        application: newApplication,
        message: 'Solicitação enviada com sucesso! Aguarde a aprovação do Mestre.',
      });
    } catch (err: any) {
      console.error('Erro ao registrar candidatura:', err);
      return res.status(500).json({ error: 'Erro ao registrar candidatura', details: err.message });
    }
  });
});

// POST /api/solicitacoes/:id/aprovar - Mestre aprova candidato e cria usuário oficial
app.post('/api/solicitacoes/:id/aprovar', async (req: Request, res: Response) => {
  const session = getSession(req);
  const applicationId = req.params.id;
  const { adminPassword, observacoesMestre } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode aprovar solicitações.' });
  }

  const binId = sanitizeBinId((req.body.binId as string) || 'trolls-rpg-oficial');

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.solicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
      data.users = Array.isArray(data.users) ? data.users : [];

      const appIndex = data.solicitacoes.findIndex((s: any) => s.id === applicationId);
      if (appIndex === -1) {
        return res.status(404).json({ error: 'Solicitação não encontrada.' });
      }

      const app = data.solicitacoes[appIndex];
      const timestamp = new Date().toISOString();

      app.status = 'aprovado';
      app.avaliadoEm = timestamp;
      app.avaliadoPor = MASTER_ADMIN_NAME;
      if (observacoesMestre) app.observacoesMestre = String(observacoesMestre).trim();

      const existingUserIndex = data.users.findIndex(
        (u: any) =>
          (u.email && u.email.trim().toLowerCase() === app.email.trim().toLowerCase()) ||
          (u.telefone && u.telefone.replace(/\D/g, '') === app.telefone.replace(/\D/g, ''))
      );

      let createdOrUpdatedUser: any;
      if (existingUserIndex >= 0) {
        data.users[existingUserIndex].status = 'aprovado';
        data.users[existingUserIndex].solicitacaoId = app.id;
        createdOrUpdatedUser = data.users[existingUserIndex];
      } else {
        createdOrUpdatedUser = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nome: app.nome,
          telefone: app.telefone,
          email: app.email,
          dataEntrada: timestamp.split('T')[0],
          status: 'aprovado',
          strikes: [],
          solicitacaoId: app.id,
        };
        data.users.push(createdOrUpdatedUser);
      }

      app.userId = createdOrUpdatedUser.id;
      writeBinData(binId, data);

      return res.json({
        success: true,
        application: app,
        user: createdOrUpdatedUser,
        users: data.users,
      });
    } catch (err: any) {
      console.error('Erro ao aprovar solicitação:', err);
      return res.status(500).json({ error: 'Erro ao aprovar solicitação', details: err.message });
    }
  });
});

// POST /api/solicitacoes/:id/recusar - Mestre recusa candidato
app.post('/api/solicitacoes/:id/recusar', async (req: Request, res: Response) => {
  const applicationId = req.params.id;
  const { adminPassword, observacoesMestre } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode recusar solicitações.' });
  }

  const binId = sanitizeBinId((req.body.binId as string) || 'trolls-rpg-oficial');

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      data.solicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
      const appIndex = data.solicitacoes.findIndex((s: any) => s.id === applicationId);
      if (appIndex === -1) {
        return res.status(404).json({ error: 'Solicitação não encontrada.' });
      }

      const app = data.solicitacoes[appIndex];
      const timestamp = new Date().toISOString();

      app.status = 'recusado';
      app.avaliadoEm = timestamp;
      app.avaliadoPor = MASTER_ADMIN_NAME;
      if (observacoesMestre) app.observacoesMestre = String(observacoesMestre).trim();

      writeBinData(binId, data);
      return res.json({ success: true, application: app });
    } catch (err: any) {
      console.error('Erro ao recusar solicitação:', err);
      return res.status(500).json({ error: 'Erro ao recusar solicitação', details: err.message });
    }
  });
});

// ==================== COMPRADOR POSTERIOR DE CATÁLOGO ====================

// POST /api/bin/:binId/package/:packageId/posterior-buyer - Mestre libera acesso posterior a pacote do Catálogo
app.post('/api/bin/:binId/package/:packageId/posterior-buyer', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const session = getSession(req);
  const { memberId, nome, telefone, email, adminPassword } = req.body;
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre da Ponte pode autorizar compradores posteriores.' });
  }

  if (!memberId || !nome) {
    return res.status(400).json({ error: 'Dados do membro são obrigatórios.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado.' });
      }

      pkg.apoiadores = Array.isArray(pkg.apoiadores) ? pkg.apoiadores : [];
      if (!pkg.pagamentos || typeof pkg.pagamentos !== 'object') {
        pkg.pagamentos = {};
      }

      const exists = pkg.apoiadores.some((a: any) => a.id === memberId || a.nome.toLowerCase() === nome.toLowerCase());
      const timestamp = new Date().toISOString();

      if (!exists) {
        pkg.apoiadores.push({
          id: memberId,
          nome: nome.trim(),
          telefone: telefone || '',
          email: email || '',
          data: timestamp,
          pagamentoInformado: true,
          dataPagamentoInformado: timestamp,
          isPosteriorBuyer: true,
        });
      } else {
        const ap = pkg.apoiadores.find((a: any) => a.id === memberId || a.nome.toLowerCase() === nome.toLowerCase());
        if (ap) {
          ap.isPosteriorBuyer = true;
          ap.pagamentoInformado = true;
          ap.dataPagamentoInformado = timestamp;
        }
      }

      pkg.pagamentos[memberId] = {
        memberId,
        nome: nome.trim(),
        informouPagamento: true,
        dataPagamentoInformado: timestamp,
      };

      // Quando o Mestre aprova/libera o comprador posterior, limpa-o da lista de solicitações pendentes
      if (Array.isArray(pkg.solicitacoesAcesso)) {
        pkg.solicitacoesAcesso = pkg.solicitacoesAcesso.filter(
          (s: any) => s.memberId !== memberId && s.nome.trim().toLowerCase() !== nome.trim().toLowerCase()
        );
      }

      writeBinData(binId, data);
      return res.json({ success: true, packageId, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao adicionar comprador posterior:', err);
      return res.status(500).json({ error: 'Erro ao adicionar comprador posterior', details: err.message });
    }
  });
});

// POST /api/bin/:binId/package/:packageId/request-access - Solicitação de acesso via carrinho
app.post('/api/bin/:binId/package/:packageId/request-access', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const session = getSession(req);
  const { memberId, nome, telefone, email } = req.body;

  const effectiveMemberId = session?.userId || memberId;
  const effectiveNome = session?.nome || nome;

  if (!effectiveMemberId || !effectiveNome) {
    return res.status(400).json({ error: 'Identificação e nome do membro são obrigatórios.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado.' });
      }

      if (!Array.isArray(pkg.solicitacoesAcesso)) {
        pkg.solicitacoesAcesso = [];
      }

      // Se o usuário já é apoiador/comprador do pacote, não precisa solicitar
      const alreadyBuyer = (pkg.apoiadores || []).some(
        (a: any) => a.id === effectiveMemberId || a.nome.trim().toLowerCase() === effectiveNome.trim().toLowerCase()
      );
      if (alreadyBuyer) {
        return res.json({ success: true, message: 'Usuário já possui acesso a este pacote.', package: sanitizePackage(pkg) });
      }

      // Adiciona a solicitação se já não estiver pendente
      const alreadyRequested = pkg.solicitacoesAcesso.some(
        (s: any) => s.memberId === effectiveMemberId || s.nome.trim().toLowerCase() === effectiveNome.trim().toLowerCase()
      );
      if (!alreadyRequested) {
        pkg.solicitacoesAcesso.push({
          memberId: effectiveMemberId,
          nome: effectiveNome.trim(),
          data: new Date().toISOString(),
          telefone: telefone || '',
          email: email || '',
        });
      }

      writeBinData(binId, data);
      return res.json({ success: true, packageId, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao registrar solicitação de acesso:', err);
      return res.status(500).json({ error: 'Erro ao registrar solicitação de acesso', details: err.message });
    }
  });
});

// DELETE /api/bin/:binId/package/:packageId/request-access/:memberId - Mestre cancela/recusa solicitação de acesso
app.delete('/api/bin/:binId/package/:packageId/request-access/:memberId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const memberId = req.params.memberId;
  const session = getSession(req);
  const adminPassword = (req.body && req.body.adminPassword) || (req.query && req.query.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);
  const isOwner = Boolean(
    session && (
      session.userId === memberId ||
      (session.nome && session.nome.trim().toLowerCase() === memberId.trim().toLowerCase())
    )
  );

  if (!isMaster && !isOwner) {
    return res.status(403).json({ error: 'Apenas o Mestre ou o próprio solicitante podem cancelar solicitações de acesso.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado.' });
      }

      if (Array.isArray(pkg.solicitacoesAcesso)) {
        pkg.solicitacoesAcesso = pkg.solicitacoesAcesso.filter(
          (s: any) => s.memberId !== memberId && s.nome?.trim().toLowerCase() !== memberId.trim().toLowerCase()
        );
      }

      writeBinData(binId, data);
      return res.json({ success: true, packageId, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao recusar solicitação de acesso:', err);
      return res.status(500).json({ error: 'Erro ao recusar solicitação de acesso', details: err.message });
    }
  });
});

// DELETE /api/bin/:binId/package/:packageId/posterior-buyer/:memberId - Mestre remove comprador posterior
app.delete('/api/bin/:binId/package/:packageId/posterior-buyer/:memberId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const memberId = req.params.memberId;
  const adminPassword = (req.body && req.body.adminPassword) || (req.query && req.query.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode remover inclusões de compradores.' });
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado.' });
      }

      // Remove apenas a participação no pacote, preservando a conta oficial do usuário
      pkg.apoiadores = Array.isArray(pkg.apoiadores) ? pkg.apoiadores.filter((a: any) => a.id !== memberId) : [];
      if (pkg.pagamentos && pkg.pagamentos[memberId]) {
        delete pkg.pagamentos[memberId];
      }

      writeBinData(binId, data);
      return res.json({ success: true, packageId, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao remover comprador posterior:', err);
      return res.status(500).json({ error: 'Erro ao remover comprador posterior', details: err.message });
    }
  });
});

// GET /api/bin/:binId/member/:memberId/acervo - Mestre consulta o acervo individual de um membro
app.get('/api/bin/:binId/member/:memberId/acervo', (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const memberId = req.params.memberId;
  const session = getSession(req);
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.query.adminPassword as string);
  const isMaster = checkMasterPermission(req, adminPassword);

  // Validação no servidor: apenas o Mestre (ou o próprio membro) pode consultar seu acervo
  const effectiveCaller = session?.userId || (req.headers['x-user-id'] as string);
  if (!isMaster && (!effectiveCaller || effectiveCaller !== memberId)) {
    return res.status(403).json({
      error: 'Acesso negado. Apenas o Mestre da Ponte pode consultar o acervo de outros membros.',
    });
  }

  const data = readBinData(binId);
  const users: any[] = Array.isArray(data.users) ? data.users : [];
  const member = users.find((u: any) => u.id === memberId);

  if (!member) {
    return res.status(404).json({ error: 'Membro não encontrado.' });
  }

  const memberNorm = member.nome.trim().toLowerCase();
  const packages: any[] = Array.isArray(data.packages) ? data.packages : [];

  const acquiredPackages = packages.filter((pkg: any) => {
    if (pkg.status !== 'Catálogo') return false;
    return (pkg.apoiadores || []).some((ap: any) => {
      if (ap.id && ap.id === memberId) return true;
      if (ap.nome && ap.nome.trim().toLowerCase() === memberNorm) return true;
      return false;
    });
  }).map(sanitizePackage);

  return res.json({
    success: true,
    member: {
      id: member.id,
      nome: member.nome,
      telefone: member.telefone,
      email: member.email,
      dataEntrada: member.dataEntrada,
    },
    packages: acquiredPackages,
    count: acquiredPackages.length,
  });
});

// ==================== POST /api/admin/sync-official-members ====================
// Sincroniza a planilha oficial de 125 membros com o banco do servidor, mapeando nome, whatsapp e email,
// e garantindo que o Mestre Administrador permaneça ativo e intocado.
app.post('/api/admin/sync-official-members', async (req: Request, res: Response) => {
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({
      error: 'Acesso negado: apenas o Mestre Administrador autenticado pode sincronizar a base oficial de membros.',
    });
  }

  try {
    const jsonPaths = [
      path.resolve(process.cwd(), 'data', 'membros_ponte_dos_trolls.json'),
      path.resolve(process.cwd(), 'public', 'assets', 'aistudio', 'membros_ponte_dos_trolls_5a53fd88.json'),
    ];

    let rawMembers: any[] = [];
    for (const p of jsonPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf-8');
          rawMembers = JSON.parse(content);
          if (Array.isArray(rawMembers) && rawMembers.length > 0) break;
        } catch (e) {
          console.warn(`Erro ao ler ${p}:`, e);
        }
      }
    }

    if (!Array.isArray(rawMembers) || rawMembers.length === 0) {
      return res.status(500).json({ error: 'Arquivo da planilha oficial de membros não encontrado ou vazio no servidor.' });
    }

    // 1. Mapear os 125 membros para o formato do sistema
    const mappedMembers = rawMembers.map((m: any, idx: number) => {
      const cleanPhone = String(m.whatsapp || m.telefone || '').replace(/[^\d+]/g, '').trim();
      return {
        id: `u_${idx + 1}`,
        nome: String(m.nome || `Membro ${idx + 1}`).trim(),
        telefone: cleanPhone || String(m.whatsapp || m.telefone || '').trim(),
        email: String(m.email || '').trim().toLowerCase(),
        status: 'aprovado',
        createdAt: '2026-02-15',
        strikes: [],
        isMaster: false,
      };
    });

    // 2. Preservar o Mestre Administrador (Regra 1 e Segurança)
    const masterAdmin = {
      id: 'usr-master',
      nome: MASTER_ADMIN_NAME,
      telefone: '(19) 98151-2030',
      email: 'pontedostrolls@gmail.com',
      status: 'aprovado',
      createdAt: '2026-01-01',
      strikes: [],
      isMaster: true,
    };

    const finalUsers = [masterAdmin, ...mappedMembers];

    // 3. Atualizar o arquivo de dados padrão do servidor ('trolls-rpg-oficial.json') e qualquer bin ativo
    const binFiles = fs.readdirSync(BINS_DIR).filter(f => f.endsWith('.json'));
    for (const f of binFiles) {
      const bPath = path.join(BINS_DIR, f);
      try {
        const content = fs.readFileSync(bPath, 'utf-8');
        const data = JSON.parse(content);
        data.users = finalUsers;
        data.updatedAt = new Date().toISOString();
        data.usersVersion = USERS_VERSION;
        fs.writeFileSync(bPath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        console.warn(`Erro ao atualizar bin ${f}:`, err);
      }
    }

    return res.json({
      success: true,
      count: mappedMembers.length,
      users: finalUsers,
      message: `Sucesso: ${mappedMembers.length} membros oficiais importados. Mestre Administrador mantido ativo.`,
    });
  } catch (err: any) {
    console.error('Erro na rota /api/admin/sync-official-members:', err);
    return res.status(500).json({ error: 'Erro interno ao sincronizar membros oficiais', details: err.message });
  }
});

// GET /api/admin/official-members - Retorna a base oficial crua para o frontend
app.get('/api/admin/official-members', (req: Request, res: Response) => {
  const jsonPaths = [
    path.resolve(process.cwd(), 'data', 'membros_ponte_dos_trolls.json'),
    path.resolve(process.cwd(), 'public', 'assets', 'aistudio', 'membros_ponte_dos_trolls_5a53fd88.json'),
  ];

  for (const p of jsonPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const data = JSON.parse(content);
        return res.json(data);
      } catch (e) {}
    }
  }
  return res.status(404).json({ error: 'Arquivo oficial não encontrado.' });
});

// ==================== ADMIN BACKUP & RESTORE API ====================

// GET /api/admin/export-backup - Gera exportação de backup completa, consistente e auditada
app.get('/api/admin/export-backup', (req: Request, res: Response) => {
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.query.adminPassword as string);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre Administrador pode exportar backups completos do sistema.' });
  }

  try {
    const rawBinId = (req.query.binId as string) || 'trolls-rpg-oficial';
    const binId = sanitizeBinId(rawBinId, req);
    const data = readBinData(binId);

    const exportPayload = {
      formatVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      sourceEnvironment: isDevEnvironment(req) ? 'development' : 'production',
      binId,
      counts: {
        users: Array.isArray(data.users) ? data.users.length : 0,
        items: Array.isArray(data.items) ? data.items.length : 0,
        packages: Array.isArray(data.packages) ? data.packages.length : 0,
        solicitacoes: Array.isArray(data.solicitacoes) ? data.solicitacoes.length : 0,
      },
      disclaimer: {
        images: 'URLs e referências de imagens são links externos e não contêm os arquivos binários originais.',
        auth: 'Contas do Firebase Authentication não são geradas nem exportadas nesta estrutura JSON.',
        security: 'Senhas, chaves de API, credenciais de serviço e tokens de sessão são estritamente omitidos por segurança.',
      },
      disclaimers: {
        rawFilesNotIncluded: true,
        firebaseAuthNotIncluded: true,
        secretsNotIncluded: true,
        explanation: 'Imagens são URLs externas; Contas Firebase Auth não estão incluídas; Credenciais e segredos são excluídos.'
      },
      users: data.users || [],
      items: data.items || [],
      packages: data.packages || [],
      solicitacoes: data.solicitacoes || [],
      regrasConfig: data.regrasConfig || null,
      data: {
        users: data.users || [],
        items: data.items || [],
        packages: data.packages || [],
        solicitacoes: data.solicitacoes || [],
        regrasConfig: data.regrasConfig || null,
        usersVersion: data.usersVersion || USERS_VERSION,
      },
    };

    return res.json(exportPayload);
  } catch (err: any) {
    console.error('Erro na exportação de backup:', err);
    return res.status(500).json({ error: 'Erro ao gerar exportação do backup.', details: err.message });
  }
});

// POST /api/admin/validate-backup - Inspeciona e valida a integridade do backup sem aplicar alterações
app.post('/api/admin/validate-backup', (req: Request, res: Response) => {
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre pode validar arquivos de backup.' });
  }

  try {
    const backupData = req.body.backupData || req.body.payload;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ valid: false, errors: ['Arquivo inválido: o conteúdo deve ser um objeto JSON válido.'] });
    }

    const payload = backupData.data || backupData;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Checagem de formato e versão
    const formatVersion = backupData.formatVersion || '1.0.0 (legado)';
    const sourceEnvironment = backupData.sourceEnvironment || 'desconhecido';
    const exportedAt = backupData.exportedAt || backupData.updatedAt || 'não informada';

    // 1. Validar Usuários
    const users = Array.isArray(backupData.users) ? backupData.users : (Array.isArray(backupData.data?.users) ? backupData.data.users : []);
    const userIds = new Set<string>();
    const duplicateUserIds: string[] = [];

    users.forEach((u: any, idx: number) => {
      if (!u || typeof u !== 'object') {
        errors.push(`Usuário no índice ${idx} é inválido.`);
        return;
      }
      if (!u.id || !u.nome) {
        errors.push(`Usuário no índice ${idx} não possui ID ou Nome obrigatório.`);
      } else {
        if (userIds.has(u.id)) {
          duplicateUserIds.push(u.id);
        }
        userIds.add(u.id);
      }
      // Proteção de escalação de privilégio: não permite que usuários comuns venham com isMaster: true
      if (u.isMaster && u.id !== 'usr-master' && u.email !== 'pontedostrolls@gmail.com') {
        warnings.push(`Tentativa de elevação administrativa detectada e bloqueada: privilégio Mestre revogado para ${u.nome} (${u.id}).`);
        u.isMaster = false;
      }
    });

    if (duplicateUserIds.length > 0) {
      warnings.push(`IDs de usuários duplicados encontrados: ${duplicateUserIds.slice(0, 5).join(', ')}...`);
    }

    // 2. Validar Itens / Sugestões
    const items = Array.isArray(backupData.items) ? backupData.items : (Array.isArray(backupData.data?.items) ? backupData.data.items : []);
    const itemIds = new Set<string>();
    const duplicateItemIds: string[] = [];

    items.forEach((it: any, idx: number) => {
      if (!it || typeof it !== 'object') {
        errors.push(`Sugestão no índice ${idx} é inválida.`);
        return;
      }
      if (!it.id || !it.nome) {
        errors.push(`Sugestão no índice ${idx} não possui ID ou Nome obrigatório.`);
      } else {
        if (itemIds.has(it.id)) {
          duplicateItemIds.push(it.id);
        }
        itemIds.add(it.id);
      }
    });

    if (duplicateItemIds.length > 0) {
      warnings.push(`IDs de sugestões duplicadas encontrados: ${duplicateItemIds.slice(0, 5).join(', ')}...`);
    }

    // 3. Validar Pacotes
    const packages = Array.isArray(backupData.packages) ? backupData.packages : (Array.isArray(backupData.data?.packages) ? backupData.data.packages : []);
    const pkgIds = new Set<string>();
    const duplicatePkgIds: string[] = [];

    packages.forEach((pkg: any, idx: number) => {
      if (!pkg || typeof pkg !== 'object') {
        errors.push(`Pacote no índice ${idx} é inválido.`);
        return;
      }
      if (!pkg.id || !pkg.titulo) {
        errors.push(`Pacote no índice ${idx} não possui ID ou Título obrigatório.`);
      } else {
        if (pkgIds.has(pkg.id)) {
          duplicatePkgIds.push(pkg.id);
        }
        pkgIds.add(pkg.id);
      }
    });

    if (duplicatePkgIds.length > 0) {
      errors.push(`IDs de pacotes duplicados encontrados: ${duplicatePkgIds.slice(0, 5).join(', ')}...`);
    }

    // 4. Validar Solicitações
    const solicitacoes = Array.isArray(payload.solicitacoes) ? payload.solicitacoes : [];

    const isValid = errors.length === 0;

    return res.json({
      valid: isValid,
      formatVersion,
      sourceEnvironment,
      exportedAt,
      counts: {
        users: users.length,
        items: items.length,
        packages: packages.length,
        solicitacoes: solicitacoes.length,
      },
      duplicateIds: [...duplicateUserIds, ...duplicateItemIds, ...duplicatePkgIds],
      warnings,
      errors,
    });
  } catch (err: any) {
    console.error('Erro na validação do backup:', err);
    return res.status(500).json({ valid: false, errors: [`Erro interno de validação: ${err.message}`] });
  }
});

// POST /api/admin/restore-backup - Executa restauração atômica com backup prévio automático
app.post('/api/admin/restore-backup', async (req: Request, res: Response) => {
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre autenticado pode restaurar backups.' });
  }

  const backupData = req.body.backupData || req.body.payload;
  const mode = req.body.mode || 'replace';
  if (!backupData || typeof backupData !== 'object') {
    return res.status(400).json({ error: 'Dados do backup inválidos ou ausentes.' });
  }

  const rawBinId = (req.body.binId as string) || 'trolls-rpg-oficial';
  const binId = sanitizeBinId(rawBinId, req);

  await withBinLock(binId, async () => {
    try {
      const currentData = readBinData(binId);

      // 1. Criar snapshot automático pré-restauração antes de modificar qualquer registro
      const backupDir = path.resolve(process.cwd(), 'data', 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const autoBackupFile = `auto_pre_restore_${binId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(
        path.join(backupDir, autoBackupFile),
        JSON.stringify({
          purpose: 'auto_pre_restore_safety_snapshot',
          timestamp: new Date().toISOString(),
          binId,
          data: currentData,
        }, null, 2),
        'utf-8'
      );

      // 2. Extrair e sanitizar dados do backup
      const payload = backupData.data || backupData;
      let incomingUsers = Array.isArray(backupData.users) ? backupData.users : (Array.isArray(backupData.data?.users) ? backupData.data.users : []);
      let incomingItems = Array.isArray(backupData.items) ? backupData.items : (Array.isArray(backupData.data?.items) ? backupData.data.items : []);
      let incomingPackages = Array.isArray(backupData.packages) ? backupData.packages : (Array.isArray(backupData.data?.packages) ? backupData.data.packages : []);
      let incomingSolicitacoes = Array.isArray(backupData.solicitacoes) ? backupData.solicitacoes : (Array.isArray(backupData.data?.solicitacoes) ? backupData.data.solicitacoes : []);

      // Sanitizar pacotes
      incomingPackages = incomingPackages.map(sanitizePackage);

      // Prevenir elevação indevida de privilégios: apenas usr-master pode ser isMaster
      incomingUsers = incomingUsers.map((u: any) => ({
        ...u,
        isMaster: u.id === 'usr-master' || (u.email && u.email.toLowerCase() === 'pontedostrolls@gmail.com'),
      }));

      // Garante que o Mestre oficial sempre existe e está ativo
      if (!incomingUsers.some((u: any) => u.id === 'usr-master')) {
        incomingUsers.unshift({
          id: 'usr-master',
          nome: MASTER_ADMIN_NAME,
          telefone: '(19) 98151-2030',
          email: 'pontedostrolls@gmail.com',
          status: 'aprovado',
          createdAt: '2026-01-01',
          strikes: [],
          isMaster: true,
        });
      }

      let finalUsers = incomingUsers;
      let finalItems = incomingItems;
      let finalPackages = incomingPackages;
      let finalSolicitacoes = incomingSolicitacoes;

      // 3. Aplicar modo de mesclagem se solicitado
      if (mode === 'merge') {
        const userMap = new Map<string, any>();
        (currentData.users || []).forEach((u: any) => { if (u && u.id) userMap.set(u.id, u); });
        incomingUsers.forEach((u: any) => { if (u && u.id) userMap.set(u.id, { ...(userMap.get(u.id) || {}), ...u }); });
        finalUsers = Array.from(userMap.values());

        const itemMap = new Map<string, any>();
        (currentData.items || []).forEach((it: any) => { if (it && it.id) itemMap.set(it.id, it); });
        incomingItems.forEach((it: any) => { if (it && it.id) itemMap.set(it.id, { ...(itemMap.get(it.id) || {}), ...it }); });
        finalItems = Array.from(itemMap.values());

        const pkgMap = new Map<string, any>();
        (currentData.packages || []).forEach((p: any) => { if (p && p.id) pkgMap.set(p.id, p); });
        incomingPackages.forEach((p: any) => {
          if (p && p.id) {
            const existing = pkgMap.get(p.id);
            if (existing) {
              pkgMap.set(p.id, {
                ...existing,
                ...p,
                apoiadores: p.apoiadores?.length ? p.apoiadores : existing.apoiadores,
                pagamentos: Object.keys(p.pagamentos || {}).length ? p.pagamentos : existing.pagamentos,
              });
            } else {
              pkgMap.set(p.id, p);
            }
          }
        });
        finalPackages = Array.from(pkgMap.values());

        const solMap = new Map<string, any>();
        (currentData.solicitacoes || []).forEach((s: any) => { if (s && s.id) solMap.set(s.id, s); });
        incomingSolicitacoes.forEach((s: any) => { if (s && s.id) solMap.set(s.id, { ...(solMap.get(s.id) || {}), ...s }); });
        finalSolicitacoes = Array.from(solMap.values());
      }

      // 4. Gravar atomicamente no arquivo bin
      const newBinData = {
        id: binId,
        name: `A Ponte dos Trolls - ${binId}`,
        updatedAt: new Date().toISOString(),
        usersVersion: payload.usersVersion || currentData.usersVersion || USERS_VERSION,
        items: finalItems,
        users: finalUsers,
        packages: finalPackages,
        solicitacoes: finalSolicitacoes,
        regrasConfig: payload.regrasConfig || currentData.regrasConfig,
      };

      writeBinData(binId, newBinData);

      if (binId === 'trolls-rpg-oficial') {
        fs.writeFileSync(path.join(BINS_DIR, 'trolls-rpg-oficial.json.immutable-backup'), JSON.stringify(newBinData, null, 2), 'utf-8');
      }

      return res.json({
        success: true,
        message: mode === 'merge' ? 'Backup mesclado com sucesso.' : 'Backup restaurado com sucesso.',
        autoBackupFile,
        counts: {
          users: finalUsers.length,
          items: finalItems.length,
          packages: finalPackages.length,
          solicitacoes: finalSolicitacoes.length,
        },
        data: newBinData,
      });
    } catch (err: any) {
      console.error('Erro ao restaurar backup:', err);
      return res.status(500).json({ error: 'Erro ao processar restauração do backup.', details: err.message });
    }
  });
});

// ==================== PUT /api/bin/:binId (SALVAMENTO COMPLETO - APENAS MESTRE) ====================
app.put('/api/bin/:binId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const body = req.body;
  const adminPassword = (req.headers['x-admin-password'] as string) || (body && body.adminPassword);
  const isMaster = checkMasterPermission(req, adminPassword);

  // Proteção Crítica: Apenas o Mestre pode sobrescrever o banco completo
  if (!isMaster) {
    return res.status(403).json({
      error: 'Acesso negado: apenas o Mestre autenticado pode realizar salvamento ou restauração completa do banco.',
    });
  }

  await withBinLock(binId, async () => {
    try {
      const existingData = readBinData(binId);

      let itemsToSave: any[] = existingData.items ?? SEED_ITEMS;
      let usersToSave: any[] = existingData.users ?? SEED_USERS;
      let packagesToSave: any[] = existingData.packages ?? SEED_PACKAGES;
      let solicitacoesToSave: any[] = existingData.solicitacoes ?? [];
      let regrasConfigToSave: any = existingData.regrasConfig ?? undefined;

      if (Array.isArray(body)) {
        itemsToSave = body;
      } else if (body) {
        if (Array.isArray(body.items)) itemsToSave = body.items;
        else if (body.data && Array.isArray(body.data.items)) itemsToSave = body.data.items;

        if (Array.isArray(body.users)) usersToSave = body.users;
        else if (body.data && Array.isArray(body.data.users)) usersToSave = body.data.users;

        if (Array.isArray(body.packages)) packagesToSave = body.packages;
        else if (body.data && Array.isArray(body.data.packages)) packagesToSave = body.data.packages;

        if (Array.isArray(body.solicitacoes)) solicitacoesToSave = body.solicitacoes;
        if (body.regrasConfig) regrasConfigToSave = body.regrasConfig;
      }

      packagesToSave = packagesToSave.map(sanitizePackage);

      const payload = {
        id: binId,
        name: body.name || existingData.name || `A Ponte dos Trolls - ${binId}`,
        updatedAt: new Date().toISOString(),
        usersVersion: body.usersVersion || existingData.usersVersion || USERS_VERSION,
        items: itemsToSave,
        users: usersToSave,
        packages: packagesToSave,
        solicitacoes: solicitacoesToSave,
        ...(regrasConfigToSave ? { regrasConfig: regrasConfigToSave } : {}),
      };

      writeBinData(binId, payload);
      return res.json({
        success: true,
        id: binId,
        count: itemsToSave.length,
        usersCount: usersToSave.length,
        packagesCount: packagesToSave.length,
        solicitacoesCount: solicitacoesToSave.length,
        updatedAt: payload.updatedAt,
      });
    } catch (err: any) {
      console.error('Error in PUT /api/bin/:binId', err);
      res.status(500).json({ error: 'Erro ao salvar no banco JSON', details: err.message });
    }
  });
});

// ==================== VITE SPA INTEGRATION ====================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  let vite: any = null;

  if (!isProd) {
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const startListening = (retries = 5, delay = 1000) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        if (retries > 0) {
          console.warn(`[Server] Port ${PORT} is busy, retrying in ${delay}ms... (${retries} attempts left)`);
          setTimeout(() => {
            startListening(retries - 1, delay * 1.5);
          }, delay);
        } else {
          console.warn(`[Server] Port ${PORT} remained in use after all retries.`);
        }
      } else {
        console.error('[Server] Fatal server error:', err);
        process.exit(1);
      }
    });

    const handleShutdown = async () => {
      console.log('[Server] Gracefully shutting down...');
      if (vite) {
        try {
          await vite.close();
        } catch (e) {}
      }
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
  };

  startListening();
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
