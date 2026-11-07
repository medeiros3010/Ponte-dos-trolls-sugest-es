import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { SEED_ITEMS } from './src/data/seedData';

const app = express();
const PORT = 3000;
const BINS_DIR = path.resolve(process.cwd(), 'data', 'bins');

// Ensure bins directory exists
if (!fs.existsSync(BINS_DIR)) {
  fs.mkdirSync(BINS_DIR, { recursive: true });
}

// Default bin seed file
const defaultBinPath = path.join(BINS_DIR, 'trolls-rpg-oficial.json');
if (!fs.existsSync(defaultBinPath)) {
  fs.writeFileSync(defaultBinPath, JSON.stringify({
    id: 'trolls-rpg-oficial',
    name: 'A Ponte dos Trolls - Rateios RPG',
    updatedAt: new Date().toISOString(),
    items: SEED_ITEMS,
  }, null, 2), 'utf-8');
}

// Body parsing with 10mb limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// ==================== REST API ENDPOINTS ====================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// GET /api/bin/:binId - Carrega os itens do banco na nuvem
app.get('/api/bin/:binId', (req: Request, res: Response) => {
  try {
    const rawId = req.params.binId;
    const binId = sanitizeBinId(rawId);
    const filePath = path.join(BINS_DIR, `${binId}.json`);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return res.json(data);
    }

    // Se o banco ainda não existe, cria automaticamente inicializado com os SEED_ITEMS
    const initialData = {
      id: binId,
      name: `A Ponte dos Trolls - ${binId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: SEED_ITEMS,
    };

    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf-8');
    return res.json(initialData);
  } catch (err: any) {
    console.error('Error in GET /api/bin/:binId', err);
    res.status(500).json({ error: 'Erro ao carregar banco JSON', details: err.message });
  }
});

// PUT /api/bin/:binId - Atualiza os itens do banco na nuvem
app.put('/api/bin/:binId', (req: Request, res: Response) => {
  try {
    const rawId = req.params.binId;
    const binId = sanitizeBinId(rawId);
    const filePath = path.join(BINS_DIR, `${binId}.json`);

    const body = req.body;
    let itemsToSave: any[] = [];

    if (Array.isArray(body)) {
      itemsToSave = body;
    } else if (body && Array.isArray(body.items)) {
      itemsToSave = body.items;
    } else if (body && body.data && Array.isArray(body.data.items)) {
      itemsToSave = body.data.items;
    }

    const payload = {
      id: binId,
      name: body.name || `A Ponte dos Trolls - ${binId}`,
      updatedAt: new Date().toISOString(),
      items: itemsToSave,
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({
      success: true,
      id: binId,
      count: itemsToSave.length,
      updatedAt: payload.updatedAt,
    });
  } catch (err: any) {
    console.error('Error in PUT /api/bin/:binId', err);
    res.status(500).json({ error: 'Erro ao salvar no banco JSON', details: err.message });
  }
});

// POST /api/bin - Cria um novo banco e devolve o ID
app.post('/api/bin', (req: Request, res: Response) => {
  try {
    const binId = `trolls-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const filePath = path.join(BINS_DIR, `${binId}.json`);

    const body = req.body;
    const items = (body && Array.isArray(body.items)) ? body.items : SEED_ITEMS;

    const payload = {
      id: binId,
      name: body.name || `A Ponte dos Trolls - ${binId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items,
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.status(201).json({ id: binId, success: true });
  } catch (err: any) {
    console.error('Error in POST /api/bin', err);
    res.status(500).json({ error: 'Erro ao criar banco', details: err.message });
  }
});

// ==================== VITE SPA INTEGRATION ====================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Dev mode: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
