import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { SEED_ITEMS, SEED_USERS, SEED_PACKAGES } from './src/data/seedData';
import { ADMIN_PASSWORD, normalizeProductType } from './src/types';

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // In AI Studio / Cloud Run container environment, process.env.PORT is set to 8080 for Nginx.
  // The Node application dev server MUST always bind to 3000.
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

// Ensure bins and uploads directories exist
if (!fs.existsSync(BINS_DIR)) {
  fs.mkdirSync(BINS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Version flag
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

// Permissive CORS for cross-origin access and standalone HTML
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to sanitize bin ID
function sanitizeBinId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64) || 'trolls-rpg-oficial';
}

// Helper to normalize and preserve package fields
function sanitizePackage(pkg: any): any {
  if (!pkg || typeof pkg !== 'object') return pkg;
  const norm = normalizeProductType(pkg.tipo || pkg.produto, pkg.sistema);

  const itens = Array.isArray(pkg.itens) ? pkg.itens.map((it: any) => {
    const itemNorm = normalizeProductType(it.tipo || it.produto, it.sistema);
    return {
      id: it.id || `it-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: it.nome || 'Item',
      sistema: it.sistema || norm.sistema || 'Foundry VTT Geral',
      tipo: it.tipo || itemNorm.tipo,
      link: it.link || '',
      precoBRL: typeof it.precoBRL === 'number' ? it.precoBRL : (parseFloat(it.precoBRL) || 0),
      imageUrl: it.imageUrl || undefined,
    };
  }) : [];

  return {
    id: pkg.id || `pack-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    titulo: pkg.titulo || 'Pacote sem título',
    sistema: pkg.sistema || norm.sistema || 'Foundry VTT Geral',
    tipo: pkg.tipo || norm.tipo,
    descricao: pkg.descricao || '',
    imageUrl: pkg.imageUrl || undefined,
    itens,
    valorTotalBRL: typeof pkg.valorTotalBRL === 'number' ? pkg.valorTotalBRL : (parseFloat(pkg.valorTotalBRL) || 0),
    dataFinalizar: pkg.dataFinalizar || '',
    dataPagamento: pkg.dataPagamento || '',
    minimoParticipantes: typeof pkg.minimoParticipantes === 'number' && pkg.minimoParticipantes > 0 ? pkg.minimoParticipantes : 35,
    valorMaximoPorPessoa: typeof pkg.valorMaximoPorPessoa === 'number' ? pkg.valorMaximoPorPessoa : 0,
    valorCatalogoBRL: typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : undefined,
    linkLoja: pkg.linkLoja || '',
    linkDrive: pkg.linkDrive || '',
    itensInclusos: Array.isArray(pkg.itensInclusos) ? pkg.itensInclusos : [],
    sugestoesIds: Array.isArray(pkg.sugestoesIds) ? pkg.sugestoesIds : [],
    status: pkg.status === 'Catálogo' ? 'Catálogo' : 'Financiamento',
    etapaFinanciamento: pkg.etapaFinanciamento === 'PAGAMENTO' ? 'PAGAMENTO' : 'COLETA',
    valorFinalPorParticipante: typeof pkg.valorFinalPorParticipante === 'number' ? pkg.valorFinalPorParticipante : undefined,
    chavePix: typeof pkg.chavePix === 'string' ? pkg.chavePix : undefined,
    instrucoesPix: typeof pkg.instrucoesPix === 'string' ? pkg.instrucoesPix : undefined,
    pagamentos: pkg.pagamentos && typeof pkg.pagamentos === 'object' ? pkg.pagamentos : {},
    apoiadores: Array.isArray(pkg.apoiadores) ? pkg.apoiadores : [],
    criadoEm: pkg.criadoEm || new Date().toISOString().split('T')[0],
    finalizadoEm: pkg.finalizadoEm || undefined,
  };
}

// ==================== REST API ENDPOINTS ====================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// POST /api/upload - Recebe arquivo de imagem (base64 ou multipart) e salva em disco com URL persistente
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({ error: 'Nenhum dado de imagem fornecido' });
    }

    // Valida formato data URL: data:image/(png|jpeg|webp|gif);base64,...
    const matches = fileData.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de imagem inválido. Forneça uma imagem PNG, JPG, WebP ou GIF válida.' });
    }

    const mimeType = matches[1].toLowerCase();
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Tipo de imagem não suportado. Use JPG, PNG, WebP ou GIF.' });
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validação de tamanho: máximo 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'Arquivo excede o tamanho máximo de 5MB.' });
    }

    // Extensão apropriada
    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';

    const safeBaseName = (fileName ? path.basename(fileName, path.extname(fileName)) : 'imagem')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 32);

    const uniqueFileName = `${Date.now()}_${safeBaseName}.${ext}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueFileName);

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;
    return res.json({ success: true, url: publicUrl, size: buffer.length });
  } catch (err: any) {
    console.error('Erro no upload de imagem:', err);
    return res.status(500).json({ error: 'Erro ao processar upload da imagem', details: err.message });
  }
});

// GET /api/bin/:binId - Carrega os dados do banco JSON sem substituir listas legítimas
app.get('/api/bin/:binId', (req: Request, res: Response) => {
  try {
    const rawId = req.params.binId;
    const binId = sanitizeBinId(rawId);
    const filePath = path.join(BINS_DIR, `${binId}.json`);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Preserve existing users array; only use seed if undefined
      if (!Array.isArray(data.users)) {
        data.users = SEED_USERS;
      }
      if (!Array.isArray(data.packages)) {
        data.packages = SEED_PACKAGES;
      }
      if (!Array.isArray(data.items)) {
        data.items = SEED_ITEMS;
      }
      if (!Array.isArray(data.solicitacoes)) {
        data.solicitacoes = [];
      }

      // Ensure packages are properly sanitized with all new fields
      data.packages = data.packages.map(sanitizePackage);

      // Regra 1: STRIKES VISÍVEIS SOMENTE AO MESTRE NA LISTAGEM
      // A resposta da API para membros comuns não deve incluir strikes de outras pessoas.
      // Preservar a consulta do próprio usuário à sua situação no perfil.
      const adminPassword = (req.headers['x-admin-password'] as string) || (req.query.adminPassword as string);
      const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
      const userPhone = (req.headers['x-user-phone'] as string) || (req.query.userPhone as string);
      const isMaster = adminPassword === ADMIN_PASSWORD;

      if (!isMaster) {
        data.users = data.users.map((u: any) => {
          const isSelf = (userId && u.id === userId) || (userPhone && u.telefone && u.telefone === userPhone);
          if (isSelf) {
            return u;
          }
          const sanitized = { ...u };
          delete sanitized.strikes;
          return sanitized;
        });

        // Solicitações são exclusivas do Mestre
        data.solicitacoes = [];
      }

      return res.json(data);
    }

    // Se o banco ainda não existe, cria inicializado
    const initialData = {
      id: binId,
      name: `A Ponte dos Trolls - ${binId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: SEED_ITEMS,
      users: SEED_USERS,
      packages: SEED_PACKAGES.map(sanitizePackage),
      solicitacoes: [],
    };

    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf-8');
    return res.json(initialData);
  } catch (err: any) {
    console.error('Error in GET /api/bin/:binId', err);
    res.status(500).json({ error: 'Erro ao carregar banco JSON', details: err.message });
  }
});

// PUT /api/bin/:binId - Atualiza o banco na nuvem preservando imagens, etapas, pagamentos e tipos
app.put('/api/bin/:binId', (req: Request, res: Response) => {
  try {
    const rawId = req.params.binId;
    const binId = sanitizeBinId(rawId);
    const filePath = path.join(BINS_DIR, `${binId}.json`);

    let existingData: any = {};
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {}
    }

    const body = req.body;
    let itemsToSave: any[] = existingData.items ?? SEED_ITEMS;
    let usersToSave: any[] = existingData.users ?? SEED_USERS;
    let packagesToSave: any[] = existingData.packages ?? SEED_PACKAGES;
    let solicitacoesToSave: any[] = existingData.solicitacoes ?? [];
    let regrasConfigToSave: any = existingData.regrasConfig ?? undefined;

    if (Array.isArray(body)) {
      itemsToSave = body;
    } else if (body) {
      if (Array.isArray(body.items)) {
        itemsToSave = body.items;
      } else if (body.data && Array.isArray(body.data.items)) {
        itemsToSave = body.data.items;
      }

      if (Array.isArray(body.users)) {
        usersToSave = body.users;
      } else if (body.data && Array.isArray(body.data.users)) {
        usersToSave = body.data.users;
      }

      if (Array.isArray(body.packages)) {
        packagesToSave = body.packages;
      } else if (body.data && Array.isArray(body.data.packages)) {
        packagesToSave = body.data.packages;
      }

      if (Array.isArray(body.solicitacoes)) {
        solicitacoesToSave = body.solicitacoes;
      }

      if (body.regrasConfig) {
        regrasConfigToSave = body.regrasConfig;
      }
    }

    // Sanitize items: preserve original author on existing items and enforce valid HTTP/HTTPS image URLs
    const existingItemsMap = new Map<string, any>((existingData.items || []).map((it: any) => [it.id, it]));
    itemsToSave = itemsToSave.map((item: any) => {
      const orig: any = item.id ? existingItemsMap.get(item.id) : null;
      let validImageUrl = item.imageUrl ? String(item.imageUrl).trim() : undefined;
      // Do not accept javascript:, data:, or blob: urls for suggestions
      if (validImageUrl && !validImageUrl.startsWith('http://') && !validImageUrl.startsWith('https://') && !validImageUrl.startsWith('/uploads/')) {
        validImageUrl = orig?.imageUrl || undefined;
      }
      return {
        ...item,
        sugeridoPorId: orig?.sugeridoPorId || item.sugeridoPorId,
        sugeridoPorNome: orig?.sugeridoPorNome || item.sugeridoPorNome,
        sugeridoPorTelefone: orig?.sugeridoPorTelefone || item.sugeridoPorTelefone,
        sugeridoPorEmail: orig?.sugeridoPorEmail || item.sugeridoPorEmail,
        imageUrl: validImageUrl,
      };
    });

    // Sanitize packages to ensure images, stages, payments, etc. are preserved
    packagesToSave = packagesToSave.map(sanitizePackage);

    const putAdminPassword = (req.headers['x-admin-password'] as string) || (body && body.adminPassword);
    const isMasterPut = putAdminPassword === ADMIN_PASSWORD;

    // Preservar strikes dos membros se o salvamento não for autenticado pelo Mestre
    const existingUsersMap = new Map<string, any>((existingData.users || []).map((u: any) => [u.id, u]));
    usersToSave = usersToSave.map((u: any) => {
      const orig: any = u.id ? existingUsersMap.get(u.id) : null;
      if (!isMasterPut && orig) {
        return {
          ...u,
          strikes: orig.strikes !== undefined ? orig.strikes : (u.strikes || []),
        };
      }
      return u;
    });

    if (!isMasterPut && Array.isArray(existingData.solicitacoes)) {
      solicitacoesToSave = existingData.solicitacoes;
    }

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

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
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

// POST /api/bin/:binId/package/:packageId/pagamento - Atualização atômica de declaração de pagamento
app.post('/api/bin/:binId/package/:packageId/pagamento', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const packageId = req.params.packageId;
    const { memberId, informouPagamento, isMaster, adminPassword } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'memberId é obrigatório' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    // Validação estrita de participação no servidor
    const isMasterAdmin = adminPassword === ADMIN_PASSWORD;
    const isParticipant = Array.isArray(pkg.apoiadores) && pkg.apoiadores.some((a: any) => a.id === memberId);

    if (!isMasterAdmin && !isParticipant) {
      return res.status(403).json({
        error: 'Inscrições encerradas. Você poderá comprar quando estiver no Catálogo.',
      });
    }

    if (!isMasterAdmin && pkg.etapaFinanciamento !== 'PAGAMENTO') {
      return res.status(400).json({
        error: 'Este financiamento não está na etapa de pagamento.',
      });
    }

    // Inicializa estrutura de pagamentos
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

    // Atualiza também no apoiador correspondente se existir
    if (Array.isArray(pkg.apoiadores)) {
      const ap = pkg.apoiadores.find((a: any) => a.id === memberId);
      if (ap) {
        ap.pagamentoInformado = isInformado;
        ap.dataPagamentoInformado = timestamp;
      }
    }

    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      packageId,
      memberId,
      informouPagamento: isInformado,
      dataPagamentoInformado: timestamp,
      package: sanitizePackage(pkg),
    });
  } catch (err: any) {
    console.error('Erro na atualização atômica de pagamento:', err);
    return res.status(500).json({ error: 'Erro ao registrar pagamento', details: err.message });
  }
});

// POST /api/bin/:binId/package/:packageId/etapa - Alteração atômica da etapa de financiamento (apenas Mestre)
app.post('/api/bin/:binId/package/:packageId/etapa', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const packageId = req.params.packageId;
    const { etapa, adminPassword } = req.body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta' });
    }

    if (etapa !== 'COLETA' && etapa !== 'PAGAMENTO') {
      return res.status(400).json({ error: 'Etapa inválida. Deve ser COLETA ou PAGAMENTO' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    pkg.etapaFinanciamento = etapa;
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      packageId,
      etapaFinanciamento: etapa,
      package: sanitizePackage(pkg),
    });
  } catch (err: any) {
    console.error('Erro ao alterar etapa:', err);
    return res.status(500).json({ error: 'Erro ao alterar etapa', details: err.message });
  }
});

// POST /api/bin/:binId/package/:packageId/drive-link - Edição atômica do link do Google Drive (apenas Mestre)
app.post('/api/bin/:binId/package/:packageId/drive-link', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const packageId = req.params.packageId;
    const { linkDrive, adminPassword } = req.body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    pkg.linkDrive = String(linkDrive || '').trim();
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      packageId,
      linkDrive: pkg.linkDrive,
      package: sanitizePackage(pkg),
    });
  } catch (err: any) {
    console.error('Erro ao salvar link do Drive:', err);
    return res.status(500).json({ error: 'Erro ao salvar link do Drive', details: err.message });
  }
});

// POST /api/bin/:binId/package/:packageId/apoio - Entrada/Saída atômica com validação de etapa travada
app.post('/api/bin/:binId/package/:packageId/apoio', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const packageId = req.params.packageId;
    const { user, adminPassword } = req.body;

    if (!user || !user.id || !user.nome) {
      return res.status(400).json({ error: 'Usuário inválido' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    // Se estiver em etapa de pagamento, bloqueia entrada e saída por membro comum
    if (pkg.etapaFinanciamento === 'PAGAMENTO' && adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({
        error: 'Este financiamento está em PROCESSO DE PAGAMENTO. A lista de participantes foi travada para cobrança. Apenas o Mestre pode autorizar alterações.',
      });
    }

    pkg.apoiadores = Array.isArray(pkg.apoiadores) ? pkg.apoiadores : [];
    const exists = pkg.apoiadores.some((a: any) => a.id === user.id || a.nome.toLowerCase() === user.nome.toLowerCase());

    if (exists) {
      pkg.apoiadores = pkg.apoiadores.filter((a: any) => a.id !== user.id && a.nome.toLowerCase() !== user.nome.toLowerCase());
    } else {
      pkg.apoiadores.push({
        id: user.id,
        nome: user.nome,
        telefone: user.telefone || '',
        email: user.email || '',
        data: new Date().toISOString(),
      });
    }

    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

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

// POST /api/bin/:binId/package/:packageId/image - Edição da capa do pacote (Mestre)
app.post('/api/bin/:binId/package/:packageId/image', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const packageId = req.params.packageId;
    const { imageUrl, adminPassword } = req.body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    pkg.imageUrl = imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : undefined;
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      packageId,
      imageUrl: pkg.imageUrl,
      package: sanitizePackage(pkg),
    });
  } catch (err: any) {
    console.error('Erro ao atualizar capa do pacote:', err);
    return res.status(500).json({ error: 'Erro ao atualizar capa do pacote', details: err.message });
  }
});

// POST /api/bin/:binId/package/:packageId/configure-payment - Define cobrança e inicia/atualiza pagamento
app.post('/api/bin/:binId/package/:packageId/configure-payment', (req: Request, res: Response) => {
  try {
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

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta' });
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

    // Se estiver iniciando etapa de pagamento, não permite data anterior a hoje
    const today = new Date().toISOString().split('T')[0];
    if (iniciarEtapaPagamento && dataLimite < today) {
      return res.status(400).json({ error: 'A data limite não pode ser anterior à data de hoje' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

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

    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      packageId,
      package: sanitizePackage(pkg),
    });
  } catch (err: any) {
    console.error('Erro ao configurar cobrança de pagamento:', err);
    return res.status(500).json({ error: 'Erro ao configurar cobrança', details: err.message });
  }
});

// POST /api/bin/:binId/user/update-profile - Atualização do perfil do próprio usuário (Nome, Telefone, Email)
app.post('/api/bin/:binId/user/update-profile', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const { userId, nome, telefone, email } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    const trimmedNome = String(nome || '').trim();
    if (!trimmedNome) {
      return res.status(400).json({ error: 'O nome do usuário não pode estar em branco' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data.users = Array.isArray(data.users) ? data.users : [];
    const userIndex = data.users.findIndex((u: any) => u.id === userId);

    const updatedUser = {
      ...(userIndex >= 0 ? data.users[userIndex] : { id: userId, createdAt: new Date().toISOString() }),
      id: userId,
      nome: trimmedNome,
      telefone: String(telefone || '').trim(),
      email: String(email || '').trim(),
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

    // Propaga em apoiadores de sugestões
    if (Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        if (Array.isArray(item.apoiadores)) {
          item.apoiadores.forEach((ap: any) => {
            if (ap.id === userId) {
              ap.nome = trimmedNome;
              if (updatedUser.telefone) ap.telefone = updatedUser.telefone;
              if (updatedUser.email) ap.email = updatedUser.email;
            }
          });
        }
      });
    }

    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

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

// ==================== CANDIDATURA & NOVO MEMBRO ENDPOINTS ====================

// GET /api/solicitacoes - Lista todas as solicitações de novos membros
app.get('/api/solicitacoes', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId((req.query.binId as string) || 'trolls-rpg-oficial');
    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, solicitacoes: [] });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const solicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
    return res.json({ success: true, solicitacoes });
  } catch (err: any) {
    console.error('Erro ao listar solicitações:', err);
    return res.status(500).json({ error: 'Erro ao listar solicitações', details: err.message });
  }
});

// POST /api/solicitacoes - Candidato envia cadastro (anti-duplicação e sem auto-autenticação)
app.post('/api/solicitacoes', (req: Request, res: Response) => {
  try {
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

    if (!trimmedNome) {
      return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return res.status(400).json({ error: 'E-mail válido para o Google Drive é obrigatório.' });
    }
    if (digitsTelefone.length < 10) {
      return res.status(400).json({ error: 'Telefone com DDD é obrigatório.' });
    }
    if (!aceitouTermos) {
      return res.status(400).json({ error: 'É obrigatório declarar leitura e aceite das regras da comunidade.' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    let data: any = {};
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      data = {
        id: binId,
        items: SEED_ITEMS,
        users: SEED_USERS,
        packages: SEED_PACKAGES.map(sanitizePackage),
        solicitacoes: [],
      };
    }

    data.solicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
    data.users = Array.isArray(data.users) ? data.users : [];

    // Checagem anti-duplicidade com usuários já aprovados
    const existingApprovedUser = data.users.find(
      (u: any) =>
        (u.email && u.email.trim().toLowerCase() === trimmedEmail) ||
        (u.telefone && u.telefone.replace(/\D/g, '') === digitsTelefone)
    );
    if (existingApprovedUser) {
      return res.status(400).json({
        error: `Já existe um membro cadastrado e aprovado com este e-mail ou telefone (${existingApprovedUser.nome}). Por favor, acesse a tela de login.`,
      });
    }

    // Checagem anti-duplicidade com solicitações pendentes recentes
    const existingPending = data.solicitacoes.find(
      (s: any) =>
        s.status === 'pendente' &&
        ((s.email && s.email.trim().toLowerCase() === trimmedEmail) ||
          (s.telefone && s.telefone.replace(/\D/g, '') === digitsTelefone))
    );
    if (existingPending) {
      return res.status(400).json({
        error: 'Já existe uma solicitação de entrada em análise com este mesmo e-mail ou telefone. Aguarde a avaliação pelo Mestre no WhatsApp.',
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
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

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

// POST /api/solicitacoes/:id/aprovar - Mestre aprova candidato e cria usuário oficial
app.post('/api/solicitacoes/:id/aprovar', (req: Request, res: Response) => {
  try {
    const applicationId = req.params.id;
    const { adminPassword, observacoesMestre } = req.body;
    const binId = sanitizeBinId((req.body.binId as string) || 'trolls-rpg-oficial');

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta! Acesso negado.' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado.' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data.solicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
    data.users = Array.isArray(data.users) ? data.users : [];

    const appIndex = data.solicitacoes.findIndex((s: any) => s.id === applicationId);
    if (appIndex === -1) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    const app = data.solicitacoes[appIndex];
    const timestamp = new Date().toISOString();

    // Atualiza status da solicitação
    app.status = 'aprovado';
    app.avaliadoEm = timestamp;
    app.avaliadoPor = 'Ponte dos Trolls';
    if (observacoesMestre) {
      app.observacoesMestre = String(observacoesMestre).trim();
    }

    // Cria ou atualiza usuário oficial na lista de membros
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
    data.updatedAt = timestamp;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

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

// POST /api/solicitacoes/:id/recusar - Mestre recusa candidato
app.post('/api/solicitacoes/:id/recusar', (req: Request, res: Response) => {
  try {
    const applicationId = req.params.id;
    const { adminPassword, observacoesMestre } = req.body;
    const binId = sanitizeBinId((req.body.binId as string) || 'trolls-rpg-oficial');

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta! Acesso negado.' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado.' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data.solicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];

    const appIndex = data.solicitacoes.findIndex((s: any) => s.id === applicationId);
    if (appIndex === -1) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    const app = data.solicitacoes[appIndex];
    const timestamp = new Date().toISOString();

    app.status = 'recusado';
    app.avaliadoEm = timestamp;
    app.avaliadoPor = 'Ponte dos Trolls';
    if (observacoesMestre) {
      app.observacoesMestre = String(observacoesMestre).trim();
    }

    data.updatedAt = timestamp;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      application: app,
    });
  } catch (err: any) {
    console.error('Erro ao recusar solicitação:', err);
    return res.status(500).json({ error: 'Erro ao recusar solicitação', details: err.message });
  }
});

// ==================== COMPRADOR POSTERIOR DE CATÁLOGO ====================

// POST /api/bin/:binId/package/:packageId/posterior-buyer - Mestre libera acesso posterior a pacote do Catálogo
app.post('/api/bin/:binId/package/:packageId/posterior-buyer', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const packageId = req.params.packageId;
    const { memberId, nome, telefone, email, adminPassword } = req.body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta! Acesso negado.' });
    }

    if (!memberId || !nome) {
      return res.status(400).json({ error: 'Dados do membro são obrigatórios.' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado.' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

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

    data.updatedAt = timestamp;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      packageId,
      package: sanitizePackage(pkg),
    });
  } catch (err: any) {
    console.error('Erro ao adicionar comprador posterior:', err);
    return res.status(500).json({ error: 'Erro ao adicionar comprador posterior', details: err.message });
  }
});

// GET /api/bin/:binId/member/:memberId/acervo - Mestre consulta o acervo individual de um membro
app.get('/api/bin/:binId/member/:memberId/acervo', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const memberId = req.params.memberId;
    const adminPassword = (req.headers['x-admin-password'] as string) || (req.query.adminPassword as string);

    // Validação estrita no servidor: apenas o Mestre pode consultar acervo de outros membros
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({
        error: 'Acesso negado. Apenas o Mestre da Ponte pode consultar o acervo individual de membros.',
      });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado.' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const users: any[] = Array.isArray(data.users) ? data.users : [];
    const member = users.find((u: any) => u.id === memberId);

    if (!member) {
      return res.status(404).json({ error: 'Membro não encontrado.' });
    }

    const memberNorm = member.nome.trim().toLowerCase();
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];

    // Mesma regra de aquisição do "Meus itens": status === 'Catálogo' e presente em apoiadores
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
  } catch (err: any) {
    console.error('Erro ao consultar acervo do membro:', err);
    return res.status(500).json({ error: 'Erro ao consultar acervo do membro', details: err.message });
  }
});

// DELETE /api/bin/:binId/package/:packageId/posterior-buyer/:memberId - Mestre remove comprador posterior
app.delete('/api/bin/:binId/package/:packageId/posterior-buyer/:memberId', (req: Request, res: Response) => {
  try {
    const binId = sanitizeBinId(req.params.binId);
    const packageId = req.params.packageId;
    const memberId = req.params.memberId;
    const adminPassword = (req.body && req.body.adminPassword) || (req.query && req.query.adminPassword);

    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Senha de Mestre incorreta! Acesso negado.' });
    }

    const filePath = path.join(BINS_DIR, `${binId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado.' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const packages: any[] = Array.isArray(data.packages) ? data.packages : [];
    const pkg = packages.find((p: any) => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado.' });
    }

    pkg.apoiadores = Array.isArray(pkg.apoiadores) ? pkg.apoiadores.filter((a: any) => a.id !== memberId) : [];
    if (pkg.pagamentos && pkg.pagamentos[memberId]) {
      delete pkg.pagamentos[memberId];
    }

    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({
      success: true,
      packageId,
      package: sanitizePackage(pkg),
    });
  } catch (err: any) {
    console.error('Erro ao remover comprador posterior:', err);
    return res.status(500).json({ error: 'Erro ao remover comprador posterior', details: err.message });
  }
});

// ==================== VITE SPA INTEGRATION ====================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  let vite: any = null;

  if (!isProd) {
    // Dev mode: Vite middleware
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
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
