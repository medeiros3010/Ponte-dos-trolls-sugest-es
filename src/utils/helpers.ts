import { ItemRPG, CurrencyType, ProductType, FundingPackage, UserProfile, Apoiador, PackageSubItem } from '../types';

export const DEFAULT_EXCHANGE_RATE = 5.80;

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function convertToBRL(value: number, currency: CurrencyType, rate: number): number {
  if (currency === 'BRL') return value;
  return value * (rate > 0 ? rate : DEFAULT_EXCHANGE_RATE);
}

export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

export function parseDisplayDateToISO(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

export function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatPhone(raw: string): string {
  if (!raw) return '';
  const numbers = raw.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return raw;
}

export function cleanPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let numbers = phone.replace(/\D/g, '');
  if (numbers.length >= 10 && numbers.length <= 11) {
    if (!numbers.startsWith('55')) {
      numbers = '55' + numbers;
    }
  }
  return numbers;
}

export function parsePriceField(raw: string): {
  moeda: CurrencyType;
  valorNumerico: number;
  observacaoValor: string;
} {
  const text = (raw || '').trim();
  if (!text) {
    return { moeda: 'USD', valorNumerico: 0, observacaoValor: '' };
  }

  const isLower = text.toLowerCase();
  if (isLower.includes('não revelado') || isLower.includes('nao revelado') || isLower.includes('tbd')) {
    return { moeda: 'USD', valorNumerico: 0, observacaoValor: text };
  }

  let moeda: CurrencyType = 'USD';
  if (text.includes('R$') || text.includes('BRL') || isLower.startsWith('r$')) {
    moeda = 'BRL';
  } else if (text.includes('$') || text.includes('U$') || text.includes('USD')) {
    moeda = 'USD';
  }

  let observacaoValor = '';
  const parenMatch = text.match(/\((.*?)\)/);
  if (parenMatch) {
    observacaoValor = parenMatch[1].trim();
  }

  const cleanBase = parenMatch ? text.replace(/\(.*?\)/g, '') : text;
  const numberMatch = cleanBase.match(/[\d]+([.,][\d]{1,2})?/);

  let valorNumerico = 0;
  if (numberMatch) {
    const rawNum = numberMatch[0].replace(',', '.');
    valorNumerico = parseFloat(rawNum) || 0;
  }

  return { moeda, valorNumerico, observacaoValor };
}

export function parseAuthorField(raw: string): { nome: string; telefone: string } {
  const text = (raw || '').trim();
  if (!text) return { nome: 'Membro', telefone: '' };

  const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[-\s]?\d{4}/;
  const match = text.match(phoneRegex);

  if (match) {
    const rawPhone = match[0];
    const nome = text.replace(rawPhone, '').replace(/[-–—]/g, '').trim();
    return {
      nome: nome || 'Membro do Grupo',
      telefone: formatPhone(rawPhone),
    };
  }

  return { nome: text, telefone: '' };
}

export function generateItemWhatsAppMessage(item: ItemRPG, exchangeRate: number): string {
  const isUnrevealed = item.valorNumerico === 0;
  const valorOriginal = isUnrevealed
    ? (item.observacaoValor || 'Ainda não revelado')
    : item.moeda === 'USD'
      ? formatUSD(item.valorNumerico)
      : formatBRL(item.valorNumerico);

  const valorBRL = convertToBRL(item.valorNumerico, item.moeda, exchangeRate);
  const valorBRLStr = isUnrevealed ? '' : ` (~${formatBRL(valorBRL)})`;
  const obsStr = item.observacaoValor && !isUnrevealed ? ` [Obs: ${item.observacaoValor}]` : '';

  const totalApoiadores = item.apoiadores?.length || 0;
  let rateioStr = 'Seja o primeiro a apoiar!';
  if (totalApoiadores > 0 && !isUnrevealed) {
    const porPessoa = valorBRL / totalApoiadores;
    rateioStr = `${totalApoiadores} interessados (${formatBRL(porPessoa)} cada)`;
  } else if (totalApoiadores > 0) {
    rateioStr = `${totalApoiadores} apoiadores`;
  }

  const apoiadoresNomes = totalApoiadores > 0 
    ? `\n👥 *Apoiadores:* ${item.apoiadores.map(a => a.nome).join(', ')}` 
    : '';

  return `🎲 *A PONTE DOS TROLLS - RATEIO RPG*
📦 *Item:* ${item.nome} [${item.sistema}]
💰 *Valor:* ${valorOriginal}${valorBRLStr}${obsStr}
🤝 *Divisão Atual:* ${rateioStr}${apoiadoresNomes}
👤 *Sugerido por:* ${item.sugeridoPorNome}${item.sugeridoPorTelefone ? ` (${item.sugeridoPorTelefone})` : ''}
🔗 *Link:* ${item.link || 'Não informado'}
📊 *Status:* ${item.status}`;
}

export function generateWeeklyBulletin(items: ItemRPG[], exchangeRate: number): string {
  const abertos = items.filter(i => i.status === 'Em Financiamento');
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  let msg = `📜 *A PONTE DOS TROLLS - RATEIOS ABERTOS*\n`;
  msg += `🗓️ ${dataHoje} | Ref: 1 USD = R$ ${exchangeRate.toFixed(2)}\n`;
  msg += `────────────────────────────\n\n`;

  if (abertos.length === 0) {
    msg += `Nenhum rateio aberto no momento. Envie sua sugestão!\n`;
  } else {
    abertos.forEach((item, idx) => {
      const valorBRL = convertToBRL(item.valorNumerico, item.moeda, exchangeRate);
      const apoiadores = item.apoiadores?.length || 0;
      const rateio = apoiadores > 0 && item.valorNumerico > 0 
        ? `*${formatBRL(valorBRL / apoiadores)}* p/ cada (${apoiadores} apoios)`
        : `${apoiadores} interessados`;

      msg += `${idx + 1}. *${item.nome}* [${item.sistema}]\n`;
      msg += `   💰 Total: ~${formatBRL(valorBRL)} | 🤝 Rateio: ${rateio}\n`;
      if (item.link) msg += `   🔗 ${item.link}\n`;
      msg += `\n`;
    });
  }

  msg += `────────────────────────────\n`;
  msg += `💬 Quem anima entrar em algum? Responda no grupo ou entre pelo app!`;

  return msg;
}

export function parseSpreadsheetText(rawText: string): ItemRPG[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  const parsedItems: ItemRPG[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let cols: string[] = [];
    if (line.includes('\t')) {
      cols = line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    } else if (line.includes(';')) {
      cols = line.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
    } else {
      cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }

    if (i === 0 && (cols[0]?.toLowerCase().includes('data') || cols[1]?.toLowerCase().includes('nome'))) {
      continue;
    }

    if (cols.length < 2) continue;

    const rawData = cols[0] || '';
    const nome = cols[1] || 'Sem Nome';
    const produtoRaw = (cols[2] || 'Módulo Foundry') as ProductType;
    const sistema = cols[3] || 'Outro';
    const descricao = cols[4] || '';
    const link = cols[5] || '';
    const autorRaw = cols[6] || '';
    const valorRaw = cols[7] || '';
    const statusRaw = cols[8] || '';

    const { moeda, valorNumerico, observacaoValor } = parsePriceField(valorRaw);
    const { nome: sugeridoPorNome, telefone: sugeridoPorTelefone } = parseAuthorField(autorRaw);

    let dataISO = getTodayISODate();
    if (rawData) {
      if (rawData.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dataISO = rawData;
      } else if (rawData.includes('/')) {
        dataISO = parseDisplayDateToISO(rawData);
      }
    }

    // Map automatically to the 2 categories
    let status: 'Em Financiamento' | 'Finalizados' = 'Em Financiamento';
    const sLower = statusRaw.toLowerCase();
    if (sLower.includes('financiado') || sLower.includes('drive') || sLower.includes('finalizado') || sLower.includes('comprado')) {
      status = 'Finalizados';
    }

    parsedItems.push({
      id: `imp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      data: dataISO,
      nome,
      produto: produtoRaw || 'Módulo Foundry',
      sistema,
      descricao,
      link,
      sugeridoPorNome: sugeridoPorNome || 'Membro do Grupo',
      sugeridoPorTelefone,
      moeda,
      valorNumerico,
      observacaoValor,
      status,
      apoiadores: sugeridoPorNome ? [{ id: `ap-${i}`, nome: sugeridoPorNome, telefone: sugeridoPorTelefone }] : [],
    });
  }

  return parsedItems;
}

export function generatePackageWhatsAppAnnouncement(pkg: FundingPackage): string {
  const valorTotalStr = pkg.valorTotalBRL.toFixed(2).replace('.', ',');
  const valorMaxStr = (pkg.valorMaximoPorPessoa || (pkg.valorTotalBRL / (pkg.minimoParticipantes || 1))).toFixed(2).replace('.', ',');
  const dataFinalizarBR = formatDateDisplay(pkg.dataFinalizar);
  const dataPagamentoBR = formatDateDisplay(pkg.dataPagamento);

  let itensTexto = '';
  if (pkg.itens && pkg.itens.length > 0) {
    itensTexto = pkg.itens.map((it: PackageSubItem) => `📜 *${it.nome} (${it.sistema})*\n🔗 ${it.link || 'Sem link'}`).join('\n\n');
  } else if (pkg.itensInclusos && pkg.itensInclusos.length > 0) {
    itensTexto = pkg.itensInclusos.map((it: string) => `📜 *${it}*`).join('\n');
  } else {
    itensTexto = `📜 *${pkg.titulo}*`;
  }

  const apoiadores = pkg.apoiadores || [];
  let listaParticipantes = 'Nenhum ainda. Seja o primeiro a participar!';
  if (apoiadores.length > 0) {
    listaParticipantes = apoiadores
      .map((ap: Apoiador, i: number) => `${i + 1} - ${ap.nome}${ap.telefone ? ` (${ap.telefone})` : ''}`)
      .join('\n');
  }

  return `*NOVO FINANCIAMENTO COLETIVO ABERTO!*
📦 *Pacote de materiais:* ${pkg.titulo}

${itensTexto}

💰 *Valor total do pacote:* R$ ${valorTotalStr}

📌 A compra SÓ será realizada caso *>>> ${pkg.minimoParticipantes} pessoas <<<* aderirem.
*O valor individual será NO MÁXIMO de R$ ${valorMaxStr} por pessoa.*

📋 *REGRAS IMPORTANTES DO FINANCIAMENTO*
⏳ *Prazo para colocar o nome na lista:* até ${dataFinalizarBR}
⏳ *Prazo para Pagamento:* até ${dataPagamentoBR}
⚠️ *Atenção:* Pagamentos fora do prazo receberão 1 "strike". Ao acumular 3 strikes, o membro será removido do grupo de financiamento.

✍️ *Participantes confirmados (${apoiadores.length}):*
${listaParticipantes}`;
}

export function generateCatalogBuyMessage(pkg: FundingPackage, user: UserProfile): string {
  const valorPacote = (pkg.valorCatalogoBRL || pkg.valorTotalBRL).toFixed(2).replace('.', ',');
  
  let itensLista = '';
  if (pkg.itens && pkg.itens.length > 0) {
    itensLista = pkg.itens.map((it: PackageSubItem) => `${it.nome} (${it.sistema})`).join(', ');
  } else if (pkg.itensInclusos && pkg.itensInclusos.length > 0) {
    itensLista = pkg.itensInclusos.join(', ');
  } else {
    itensLista = pkg.titulo;
  }

  return `Olá mestre, gostaria de comprar esse financiamento:
📦 Pacote: ${pkg.titulo}
📜 Itens inclusos: ${itensLista}
💰 Valor: R$ ${valorPacote}
👤 Meu Nome: ${user.nome} (${user.telefone || 'Telefone não informado'})`;
}

/**
 * Helper de sanitização estrita para células CSV contra CSV Injection / Fórmula maliciosa
 * Impede que células iniciando com =, +, -, @, \t ou \r executem comandos no Excel/Sheets.
 */
export function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Escapa caracteres HTML para prevenir XSS
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza links externos garantindo protocolo seguro http ou https
 */
export function sanitizeExternalUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return '';
}

export function exportFullDataToCSV(
  users: UserProfile[],
  items: ItemRPG[],
  packages: FundingPackage[]
): void {
  const BOM = '\uFEFF';
  const sep = ';';
  const sections: string[] = [];

  // SEÇÃO 1: USUÁRIOS
  sections.push('=== SEÇÃO 1: USUÁRIOS / MEMBROS CADASTRADOS ===');
  sections.push(['ID', 'Nome', 'Telefone', 'E-mail', 'Status', 'Data Cadastro', 'É Mestre'].map(sanitizeCsvCell).join(sep));
  users.forEach(u => {
    sections.push([
      sanitizeCsvCell(u.id),
      sanitizeCsvCell(u.nome),
      sanitizeCsvCell(u.telefone || ''),
      sanitizeCsvCell(u.email || ''),
      sanitizeCsvCell(u.status || 'aprovado'),
      sanitizeCsvCell(u.createdAt || ''),
      sanitizeCsvCell(u.isMaster ? 'SIM' : 'NÃO'),
    ].join(sep));
  });

  sections.push('');
  // SEÇÃO 2: SUGESTÕES DE COMPRA
  sections.push('=== SEÇÃO 2: SUGESTÕES DE COMPRA DA COMUNIDADE ===');
  sections.push(['ID', 'Data', 'Nome', 'Produto', 'Sistema', 'Descrição', 'Link', 'Sugerido Por', 'Telefone', 'Moeda', 'Valor', 'Apoiadores (Qtd)', 'Lista Apoiadores'].map(sanitizeCsvCell).join(sep));
  items.forEach(it => {
    const apoios = (it.apoiadores || []).map((a: Apoiador) => a.nome).join(' | ');
    sections.push([
      sanitizeCsvCell(it.id),
      sanitizeCsvCell(formatDateDisplay(it.data)),
      sanitizeCsvCell(it.nome),
      sanitizeCsvCell(it.produto),
      sanitizeCsvCell(it.sistema),
      sanitizeCsvCell(it.descricao || ''),
      sanitizeCsvCell(sanitizeExternalUrl(it.link)),
      sanitizeCsvCell(it.sugeridoPorNome),
      sanitizeCsvCell(it.sugeridoPorTelefone || ''),
      sanitizeCsvCell(it.moeda),
      sanitizeCsvCell(it.valorNumerico.toFixed(2).replace('.', ',')),
      sanitizeCsvCell((it.apoiadores || []).length),
      sanitizeCsvCell(apoios),
    ].join(sep));
  });

  sections.push('');
  // SEÇÃO 3: PACOTES EM FINANCIAMENTO E CATÁLOGO
  sections.push('=== SEÇÃO 3: PACOTES (FINANCIAMENTO & CATÁLOGO) ===');
  sections.push([
    'ID',
    'Status',
    'Etapa Financiamento',
    'Tipo',
    'Título',
    'Sistema Principal',
    'Valor Total (R$)',
    'Valor Catálogo (R$)',
    'Mínimo Participantes',
    'Valor Máx / Pessoa (R$)',
    'Prazo Finalizar',
    'Prazo Pagamento',
    'Qtd Itens',
    'Itens Detalhados',
    'Link Loja',
    'Link Drive',
    'Participantes (Qtd)',
    'Lista Participantes',
  ].map(sanitizeCsvCell).join(sep));

  packages.forEach(pkg => {
    const itensStr = (pkg.itens || []).map((it: PackageSubItem) => `${it.nome} [${it.sistema} - ${it.tipo || 'Outros'}]: R$${it.precoBRL.toFixed(2)}`).join(' | ');
    const partsStr = (pkg.apoiadores || []).map((a: Apoiador) => `${a.nome} (${a.telefone || ''})`).join(' | ');

    sections.push([
      sanitizeCsvCell(pkg.id),
      sanitizeCsvCell(pkg.status),
      sanitizeCsvCell(pkg.etapaFinanciamento || 'COLETA'),
      sanitizeCsvCell(pkg.tipo || 'Material para VTT'),
      sanitizeCsvCell(pkg.titulo),
      sanitizeCsvCell(pkg.sistema || 'Outro'),
      sanitizeCsvCell(pkg.valorTotalBRL.toFixed(2).replace('.', ',')),
      sanitizeCsvCell((pkg.valorCatalogoBRL || pkg.valorTotalBRL).toFixed(2).replace('.', ',')),
      sanitizeCsvCell(pkg.minimoParticipantes || 35),
      sanitizeCsvCell((pkg.valorMaximoPorPessoa || (pkg.valorTotalBRL / (pkg.minimoParticipantes || 1))).toFixed(2).replace('.', ',')),
      sanitizeCsvCell(formatDateDisplay(pkg.dataFinalizar)),
      sanitizeCsvCell(formatDateDisplay(pkg.dataPagamento)),
      sanitizeCsvCell((pkg.itens || []).length),
      sanitizeCsvCell(itensStr),
      sanitizeCsvCell(sanitizeExternalUrl(pkg.linkLoja)),
      sanitizeCsvCell(sanitizeExternalUrl(pkg.linkDrive)),
      sanitizeCsvCell((pkg.apoiadores || []).length),
      sanitizeCsvCell(partsStr),
    ].join(sep));
  });

  const content = BOM + sections.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponte_dos_trolls_dados_completos_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFullBackupJSON(
  users: UserProfile[],
  items: ItemRPG[],
  packages: FundingPackage[],
  binId: string
): void {
  const data = {
    binId,
    name: 'A Ponte dos Trolls - Rateios RPG Backup',
    exportedAt: new Date().toISOString(),
    users,
    items,
    packages,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponte_dos_trolls_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV(items: ItemRPG[]): void {
  const BOM = '\uFEFF';
  const headers = ['Data', 'Nome', 'Produto', 'Sistema', 'Descrição', 'Link', 'Sugestão de:', 'Valor', 'Status'];

  const rows = items.map(item => {
    const dataDisplay = formatDateDisplay(item.data);
    const autorStr = item.sugeridoPorTelefone
      ? `${item.sugeridoPorNome} - ${item.sugeridoPorTelefone}`
      : item.sugeridoPorNome;

    let valorStr = '';
    if (item.valorNumerico === 0 && item.observacaoValor) {
      valorStr = item.observacaoValor;
    } else {
      const prefix = item.moeda === 'USD' ? 'U$ ' : 'R$ ';
      const val = item.valorNumerico.toFixed(2).replace('.', ',');
      valorStr = `${prefix}${val}${item.observacaoValor ? ` (${item.observacaoValor})` : ''}`;
    }

    return [
      sanitizeCsvCell(dataDisplay),
      sanitizeCsvCell(item.nome),
      sanitizeCsvCell(item.produto),
      sanitizeCsvCell(item.sistema),
      sanitizeCsvCell(item.descricao || ''),
      sanitizeCsvCell(sanitizeExternalUrl(item.link)),
      sanitizeCsvCell(autorStr),
      sanitizeCsvCell(valorStr),
      sanitizeCsvCell(item.status),
    ].join(';');
  });

  const csvContent = BOM + [headers.map(sanitizeCsvCell).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponte_dos_trolls_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportStandaloneHTML(items: ItemRPG[], exchangeRate: number): void {
  const safeItems = items.map(it => ({
    ...it,
    nome: escapeHtml(it.nome),
    sistema: escapeHtml(it.sistema),
    descricao: escapeHtml(it.descricao),
    link: sanitizeExternalUrl(it.link),
    imageUrl: sanitizeExternalUrl(it.imageUrl),
  }));
  const serializedItems = JSON.stringify(safeItems);
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Ponte dos Trolls - Rateios RPG (Standalone)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background-color: #0c150e; color: #f1ede4; }
    .font-rpg { font-family: 'Cinzel', serif; }
  </style>
</head>
<body class="bg-[#0c150e] text-[#f1ede4] min-h-screen">
  <div id="app" class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <header class="flex items-center justify-between pb-6 border-b border-[#203625]">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full overflow-hidden border-2 border-[#d49e2a] bg-[#16271a] shrink-0">
          <img src="/bridge-logo.png" alt="A Ponte dos Trolls" class="w-full h-full object-cover">
        </div>
        <div>
          <h1 class="font-rpg text-xl font-bold text-[#f4ecd8]">A Ponte dos Trolls</h1>
          <p class="text-xs text-[#7a8e7d]">Compras Coletivas & Rateios de RPG</p>
        </div>
      </div>
      <div class="bg-[#122015] border border-[#203625] px-3 py-1.5 rounded-xl text-xs font-mono text-[#d49e2a] font-bold">
        1 USD = R$ ${exchangeRate.toFixed(2)}
      </div>
    </header>

    <div class="space-y-3.5 mt-6" id="rows-container"></div>
  </div>

  <script>
    const ITEMS = ${serializedItems};
    const RATE = ${exchangeRate};
    function formatBRL(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
    function formatUSD(v) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v); }

    const container = document.getElementById('rows-container');
    container.innerHTML = ITEMS.map(item => {
      const isUSD = item.moeda === 'USD';
      const valBRL = isUSD ? item.valorNumerico * RATE : item.valorNumerico;
      const apoios = (item.apoiadores || []).length;
      const porPessoa = apoios > 0 && item.valorNumerico > 0 ? formatBRL(valBRL / apoios) : '-';

      return \`
        <div class="bg-[#122015] border border-[#203625] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div class="flex items-center gap-4 flex-1">
            \${item.imageUrl ? \`<img src="\${item.imageUrl}" class="w-24 h-16 rounded-xl object-cover border border-[#203625] shrink-0" />\` : ''}
            <div>
              <span class="text-[10px] px-2 py-0.5 rounded bg-[#182c1d] border border-[#27442d] text-[#d49e2a] font-mono font-bold uppercase">\${item.sistema}</span>
              <h3 class="font-bold text-base text-[#f4ecd8] mt-1">\${item.nome}</h3>
              \${item.descricao ? \`<p class="text-xs text-[#7a8e7d] mt-0.5">\${item.descricao}</p>\` : ''}
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <div class="font-mono font-bold text-base text-[#f4ecd8]">\${isUSD ? formatUSD(item.valorNumerico) + ' (~' + formatBRL(valBRL) + ')' : formatBRL(item.valorNumerico)}</div>
              \${apoios > 0 ? \`<div class="text-xs font-bold text-[#d49e2a] font-mono">\${porPessoa} / pessoa</div>\` : ''}
            </div>
            \${item.link ? \`<a href="\${item.link}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-[#182c1d] border border-[#27442d] text-[#d49e2a] text-xs font-semibold hover:underline">Loja &rarr;</a>\` : ''}
          </div>
        </div>
      \`;
    }).join('');
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponte_dos_trolls_offline_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script para A Ponte dos Trolls - Rateios RPG
 */
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[1]) continue;
    rows.push({
      data: row[0],
      nome: row[1],
      produto: row[2],
      sistema: row[3],
      descricao: row[4],
      link: row[5],
      sugestaoDe: row[6],
      valor: row[7],
      status: row[8]
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "success", items: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    var items = payload.items;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
    }
    if (items && items.length > 0) {
      var rowsToInsert = items.map(function(item) {
        return [item.data, item.nome, item.produto, item.sistema, item.descricao, item.link, item.sugestaoDe, item.valor, item.status];
      });
      sheet.getRange(2, 1, rowsToInsert.length, 9).setValues(rowsToInsert);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Atualizado!" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export interface EmailExtractionResult {
  validEmails: string[];
  clipboardText: string;
  missingOrInvalidMembers: string[];
  totalWithPaymentInformed: number;
}

/**
 * Requirement 8: Extrai apenas e-mails de participantes com pagamento informado
 * - Um e-mail por linha (\n)
 * - Sem nomes, marcadores, vírgulas ou texto extra
 * - Sem duplicatas
 * - Valida regex de e-mail e aponta quem precisa corrigir cadastro
 * - Exclui pendentes e recusados
 */
export function extractPaidMemberEmails(
  pkg: FundingPackage,
  allUsers: UserProfile[]
): EmailExtractionResult {
  const userMap = new Map<string, UserProfile>();
  allUsers.forEach((u) => {
    if (u.id) userMap.set(u.id, u);
  });

  // Strict valid email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmailsSet = new Set<string>();
  const missingOrInvalidMembers: string[] = [];

  const pagamentos = pkg.pagamentos || {};
  const supporters = pkg.apoiadores || [];

  let totalWithPaymentInformed = 0;

  supporters.forEach((ap) => {
    const isPaid = Boolean(
      ap.pagamentoInformado ||
      (pagamentos[ap.id] && pagamentos[ap.id].informouPagamento)
    );

    if (isPaid) {
      totalWithPaymentInformed++;
      const user = userMap.get(ap.id) || allUsers.find(
        (u) => u.nome.trim().toLowerCase() === ap.nome.trim().toLowerCase()
      );

      // Exclude pending and refused users
      if (user && (user.status === 'pendente' || user.status === 'recusado')) {
        return;
      }

      const rawEmail = (user?.email || ap.email || '').trim();

      if (rawEmail && emailRegex.test(rawEmail)) {
        validEmailsSet.add(rawEmail.toLowerCase());
      } else {
        missingOrInvalidMembers.push(ap.nome);
      }
    }
  });

  const validEmails = Array.from(validEmailsSet);
  const clipboardText = validEmails.join('\n');

  return {
    validEmails,
    clipboardText,
    missingOrInvalidMembers,
    totalWithPaymentInformed,
  };
}


