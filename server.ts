import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SEED_ITEMS, SEED_USERS, SEED_PACKAGES } from './src/data/seedData';
import { normalizeProductType } from './src/types';

// ==================== CONFIGURAÇÕES & SEGURANÇA ====================
// A senha do Mestre é estritamente mantida no servidor (variável de ambiente ou fallback seguro no servidor)
// e NUNCA exposta ao bundle ou aos tipos do frontend.
const SERVER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls';
const MASTER_ADMIN_NAME = 'Ponte dos Trolls';

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

function getHost(): string {
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

if (!fs.existsSync(BINS_DIR)) {
  fs.mkdirSync(BINS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const USERS_VERSION = 'v2_125_oficial';

// Initialize default bin seed file only if it doesn't already exist on disk
const defaultBinPath = path.join(BINS_DIR, 'trolls-rpg-oficial.json');
if (!fs.existsSync(defaultBinPath)) {
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
  for (const [token, sess] of sessions.entries()) {
    if (sess.expiresAt < now) {
      sessions.delete(token);
    }
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
  return { token, session };
}

// Trava atômica por binId para evitar race conditions em acessos concorrentes
const binLocks = new Map<string, Promise<any>>();
function withBinLock<T>(binId: string, fn: () => Promise<T>): Promise<T> {
  const prev = binLocks.get(binId) || Promise.resolve();
  const next = prev.then(fn, fn);
  binLocks.set(binId, next);
  return next;
}

function sanitizeBinId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64) || 'trolls-rpg-oficial';
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
    return {
      id: it.id || `it-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: String(it.nome || 'Item').trim(),
      sistema: it.sistema || norm.sistema || 'Foundry VTT Geral',
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
    valorCatalogoBRL: typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : undefined,
    linkLoja: sanitizeUrl(pkg.linkLoja),
    linkDrive: sanitizeUrl(pkg.linkDrive),
    itensInclusos: Array.isArray(pkg.itensInclusos) ? pkg.itensInclusos : [],
    sugestoesIds: Array.isArray(pkg.sugestoesIds) ? pkg.sugestoesIds : [],
    status: pkg.status === 'Catálogo' ? 'Catálogo' : 'Financiamento',
    etapaFinanciamento: pkg.etapaFinanciamento === 'PAGAMENTO' ? 'PAGAMENTO' : 'COLETA',
    valorFinalPorParticipante: typeof pkg.valorFinalPorParticipante === 'number' ? pkg.valorFinalPorParticipante : undefined,
    chavePix: typeof pkg.chavePix === 'string' ? pkg.chavePix.trim() : undefined,
    instrucoesPix: typeof pkg.instrucoesPix === 'string' ? pkg.instrucoesPix.trim() : undefined,
    pagamentos: pkg.pagamentos && typeof pkg.pagamentos === 'object' ? pkg.pagamentos : {},
    apoiadores: Array.isArray(pkg.apoiadores) ? pkg.apoiadores : [],
    criadoEm: pkg.criadoEm || new Date().toISOString().split('T')[0],
    finalizadoEm: pkg.finalizadoEm || undefined,
  };
}

// Leitura segura do arquivo bin
function readBinData(binId: string): any {
  const filePath = path.join(BINS_DIR, `${binId}.json`);
  if (!fs.existsSync(filePath)) {
    return {
      id: binId,
      name: `A Ponte dos Trolls - ${binId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: SEED_ITEMS,
      users: SEED_USERS,
      packages: SEED_PACKAGES.map(sanitizePackage),
      solicitacoes: [],
    };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  if (!Array.isArray(data.users)) data.users = SEED_USERS;
  if (!Array.isArray(data.packages)) data.packages = SEED_PACKAGES;
  if (!Array.isArray(data.items)) data.items = SEED_ITEMS;
  if (!Array.isArray(data.solicitacoes)) data.solicitacoes = [];
  data.packages = data.packages.map(sanitizePackage);
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

  const { password, masterName } = req.body;
  const provided = String(password || '');

  // Comparação segura de comprimento e valor da senha do servidor
  const isMatch = provided.length === SERVER_ADMIN_PASSWORD.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(SERVER_ADMIN_PASSWORD));

  if (!isMatch) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Senha do Mestre incorreta! Acesso negado.' });
  }

  resetFailedAttempts(ip);

  const { token, session } = createSession('usr-master', masterName || MASTER_ADMIN_NAME, true, ip);

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
      nome: masterName || MASTER_ADMIN_NAME,
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
    const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;
    const callerUserId = session?.userId || (req.headers['x-user-id'] as string) || (req.query.userId as string);

    // 1. Sanitizar pacotes e proteger links confidenciais do Google Drive
    data.packages = data.packages.map((pkg: any) => {
      const sanitized = sanitizePackage(pkg);

      // Verificação de aquisição legítima para liberar linkDrive
      const hasPurchased = callerUserId && Array.isArray(pkg.apoiadores) && pkg.apoiadores.some((ap: any) => {
        const isSelf = ap.id === callerUserId || (session?.nome && ap.nome && ap.nome.trim().toLowerCase() === session.nome.trim().toLowerCase());
        const isPaid = Boolean(ap.pagamentoInformado || (pkg.pagamentos && pkg.pagamentos[ap.id]?.informouPagamento));
        return isSelf && (pkg.status === 'Catálogo' || isPaid);
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
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const session = getSession(req);
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

  if (!isMaster) {
    return res.status(403).json({ error: 'Apenas o Mestre da Ponte pode criar ou alterar pacotes de financiamento.' });
  }

  const { pkg } = req.body;
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
  const session = getSession(req);
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.body && req.body.adminPassword);
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

  if (!memberId) {
    return res.status(400).json({ error: 'memberId é obrigatório' });
  }

  // Se não for Mestre, o usuário SÓ PODE declarar pagamento em seu próprio nome
  if (!isMaster) {
    if (!session || session.userId !== memberId) {
      return res.status(403).json({ error: 'Acesso negado: você só pode declarar pagamento para sua própria conta.' });
    }
  }

  await withBinLock(binId, async () => {
    try {
      const data = readBinData(binId);
      const pkg = (data.packages || []).find((p: any) => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
      }

      // Requirement 1: Conta Mestre é administrativa e não realiza pagamentos como cotista
      const users: any[] = Array.isArray(data.users) ? data.users : [];
      const targetMember = users.find((u: any) => u.id === memberId);
      const isTargetMaster = Boolean(targetMember?.isMaster) || Boolean(session?.isMaster && memberId === session.userId);

      if (isTargetMaster) {
        return res.status(403).json({
          error: 'A conta com cargo Mestre é administrativa e não participa nem realiza pagamentos de financiamentos.',
        });
      }

      const isParticipant = Array.isArray(pkg.apoiadores) && pkg.apoiadores.some((a: any) => a.id === memberId);
      if (!isMaster && !isParticipant) {
        return res.status(403).json({ error: 'Inscrições encerradas para este pacote.' });
      }

      if (!isMaster && pkg.etapaFinanciamento !== 'PAGAMENTO') {
        return res.status(400).json({ error: 'Este financiamento não está na etapa de pagamento.' });
      }

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

      if (Array.isArray(pkg.apoiadores)) {
        const ap = pkg.apoiadores.find((a: any) => a.id === memberId);
        if (ap) {
          ap.pagamentoInformado = isInformado;
          ap.dataPagamentoInformado = timestamp;
        }
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
  const session = getSession(req);
  const { etapa, adminPassword } = req.body;
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const session = getSession(req);
  const { linkDrive, adminPassword } = req.body;
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

  if (!session && !isMaster) {
    return res.status(401).json({ error: 'Identificação necessária para participar de um financiamento.' });
  }

  // Membro comum só pode entrar ou sair por si mesmo
  const targetUser = isMaster && user ? user : { id: session?.userId, nome: session?.nome };

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

      if (isTargetMaster) {
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
  const session = getSession(req);
  const { imageUrl, adminPassword } = req.body;
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const session = getSession(req);
  const {
    valorFinalPorParticipante,
    dataPagamento,
    chavePix,
    instrucoesPix,
    iniciarEtapaPagamento,
    adminPassword,
  } = req.body;
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

  if (!userId) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório' });
  }

  // Autorização estrita: o usuário só pode editar o SEU próprio perfil (a menos que seja o Mestre)
  if (!isMaster) {
    if (!session || session.userId !== userId) {
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

// ==================== CANDIDATURA & NOVO MEMBRO ENDPOINTS ====================

// GET /api/solicitacoes - Lista todas as solicitações de novos membros (apenas Mestre)
app.get('/api/solicitacoes', (req: Request, res: Response) => {
  const session = getSession(req);
  const adminPassword = (req.headers['x-admin-password'] as string) || (req.query.adminPassword as string);
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const session = getSession(req);
  const applicationId = req.params.id;
  const { adminPassword, observacoesMestre } = req.body;
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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

      writeBinData(binId, data);
      return res.json({ success: true, packageId, package: sanitizePackage(pkg) });
    } catch (err: any) {
      console.error('Erro ao adicionar comprador posterior:', err);
      return res.status(500).json({ error: 'Erro ao adicionar comprador posterior', details: err.message });
    }
  });
});

// DELETE /api/bin/:binId/package/:packageId/posterior-buyer/:memberId - Mestre remove comprador posterior
app.delete('/api/bin/:binId/package/:packageId/posterior-buyer/:memberId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const packageId = req.params.packageId;
  const memberId = req.params.memberId;
  const session = getSession(req);
  const adminPassword = (req.body && req.body.adminPassword) || (req.query && req.query.adminPassword);
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

  // Validação estrita no servidor: apenas o Mestre (ou o próprio membro) pode consultar seu acervo
  if (!isMaster && (!session || session.userId !== memberId)) {
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

// ==================== PUT /api/bin/:binId (SALVAMENTO COMPLETO - APENAS MESTRE) ====================
app.put('/api/bin/:binId', async (req: Request, res: Response) => {
  const binId = sanitizeBinId(req.params.binId);
  const session = getSession(req);
  const body = req.body;
  const adminPassword = (req.headers['x-admin-password'] as string) || (body && body.adminPassword);
  const isMaster = Boolean(session?.isMaster) || adminPassword === SERVER_ADMIN_PASSWORD;

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
