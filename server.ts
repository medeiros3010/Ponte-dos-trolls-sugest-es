import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { SEED_ITEMS, SEED_USERS, SEED_PACKAGES } from './src/data/seedData';
import { ADMIN_PASSWORD, normalizeProductType } from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
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

      // Ensure packages are properly sanitized with all new fields
      data.packages = data.packages.map(sanitizePackage);

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
    }

    // Sanitize packages to ensure images, stages, payments, etc. are preserved
    packagesToSave = packagesToSave.map(sanitizePackage);

    const payload = {
      id: binId,
      name: body.name || existingData.name || `A Ponte dos Trolls - ${binId}`,
      updatedAt: new Date().toISOString(),
      usersVersion: body.usersVersion || existingData.usersVersion || USERS_VERSION,
      items: itemsToSave,
      users: usersToSave,
      packages: packagesToSave,
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({
      success: true,
      id: binId,
      count: itemsToSave.length,
      usersCount: usersToSave.length,
      packagesCount: packagesToSave.length,
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

// ==================== VITE SPA INTEGRATION ====================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Dev mode: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
