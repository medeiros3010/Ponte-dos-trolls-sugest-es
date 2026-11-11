import assert from 'assert';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const TEST_BIN = 'test-audit-bin';

async function runAudit() {
  console.log('--- INICIANDO BATERIA DE AUDITORIA E TESTES AUTOMATIZADOS ---');

  // 1. ISOLAMENTO DE DADOS
  console.log('\n[1. AMBIENTE E ISOLAMENTO]');
  if (!fs.existsSync('data/bins/trolls-rpg-oficial.json.immutable-backup')) {
    fs.copyFileSync('data/bins/trolls-rpg-oficial.json', 'data/bins/trolls-rpg-oficial.json.immutable-backup');
  }
  const realFile = fs.readFileSync('data/bins/trolls-rpg-oficial.json', 'utf8');
  const backupFile = fs.readFileSync('data/bins/trolls-rpg-oficial.json.immutable-backup', 'utf8');
  assert.strictEqual(realFile, backupFile, 'ALERTA: Arquivo de produção foi alterado!');
  console.log('✔ Dados reais de produção preservados integralmente e idênticos ao backup.');

  // Prepara o bin isolado para test-audit-suite
  const suiteInitialState = {
    id: TEST_BIN,
    name: 'Banco Isolado de Testes Suite',
    updatedAt: new Date().toISOString(),
    usersVersion: 'v2_125_oficial',
    items: [
      {
        id: 'item-audit-1',
        nome: 'Item Teste 1',
        produto: 'Material para VTT',
        sistema: 'Foundry VTT Geral',
        descricao: 'Item para teste de concorrência',
        sugeridoPorId: 'usr-teste-a',
        apoiadores: [],
      },
    ],
    users: [
      {
        id: 'usr-master',
        nome: 'Ponte dos Trolls',
        telefone: '(19) 98151-2030',
        email: 'pontedostrolls@gmail.com',
        status: 'aprovado',
        isMaster: true,
      },
      {
        id: 'usr-teste-a',
        nome: 'Membro Teste A',
        telefone: '(11) 98888-1111',
        email: 'membro.a@test.com',
        status: 'aprovado',
        isMaster: false,
      },
      {
        id: 'usr-teste-b',
        nome: 'Membro Teste B',
        telefone: '(11) 98888-2222',
        email: 'membro.b@test.com',
        status: 'aprovado',
        isMaster: false,
      },
      {
        id: 'usr-teste-pendente',
        nome: 'Candidato Pendente',
        telefone: '(11) 98888-3333',
        email: 'pendente@test.com',
        status: 'pendente',
        isMaster: false,
      },
      {
        id: 'usr-teste-recusado',
        nome: 'Candidato Recusado',
        telefone: '(11) 98888-4444',
        email: 'recusado@test.com',
        status: 'recusado',
        isMaster: false,
      },
    ],
    packages: [
      {
        id: 'pack-audit-catalogo-secreto',
        titulo: 'Pacote Secreto de Catálogo',
        sistema: 'Foundry VTT Geral',
        tipo: 'Material para VTT',
        descricao: 'Apenas para quem comprou',
        status: 'Catálogo',
        linkDrive: 'https://drive.google.com/drive/folders/secret-drive-id',
        apoiadores: [],
      },
      {
        id: 'pack-audit-catalogo',
        titulo: 'Pacote Adquirido por Membro A',
        sistema: 'Foundry VTT Geral',
        tipo: 'Material para VTT',
        descricao: 'Membro A já comprou',
        status: 'Catálogo',
        linkDrive: 'https://drive.google.com/drive/folders/purchased-drive-id',
        apoiadores: [
          {
            id: 'usr-teste-a',
            nome: 'Membro Teste A',
            isPosteriorBuyer: true,
          },
        ],
      },
      {
        id: 'pack-audit-coleta',
        titulo: 'Pacote em Coleta',
        sistema: 'Foundry VTT Geral',
        tipo: 'Material para VTT',
        descricao: 'Fase de coleta',
        status: 'Financiamento',
        etapaFinanciamento: 'COLETA',
        apoiadores: [],
      },
      {
        id: 'pack-audit-pagamento',
        titulo: 'Pacote em Pagamento',
        sistema: 'Foundry VTT Geral',
        tipo: 'Material para VTT',
        descricao: 'Fase de pagamento',
        status: 'Financiamento',
        etapaFinanciamento: 'PAGAMENTO',
        apoiadores: [],
      },
    ],
    solicitacoes: [],
  };
  fs.writeFileSync(`data/bins/${TEST_BIN}.json`, JSON.stringify(suiteInitialState, null, 2), 'utf8');

  // 2. TENTATIVAS DE ACESSO INDEVIDO / AUTENTICAÇÃO MESTRE
  console.log('\n[2. TENTATIVAS DE ACESSO INDEVIDO AO MESTRE]');
  
  // Senha incorreta
  const failRes = await fetch(`${BASE_URL}/api/auth/master-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'senha_completamente_errada_123', binId: TEST_BIN }),
  });
  assert.strictEqual(failRes.status, 401, 'Deveria retornar 401 para senha incorreta');
  console.log('✔ Tentativa de login com senha incorreta rejeitada com HTTP 401.');

  // Login correto
  const masterLoginRes = await fetch(`${BASE_URL}/api/auth/master-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls', binId: TEST_BIN }),
  });
  assert.strictEqual(masterLoginRes.status, 200, 'Login do Mestre com senha correta deve retornar 200');
  const masterData = await masterLoginRes.json();
  assert.ok(masterData.token, 'Token do mestre deve existir');
  assert.strictEqual(masterData.user.isMaster, true);
  console.log('✔ Autenticação do Mestre no servidor bem-sucedida com emissão de token.');

  // Unauthenticated PUT
  const unauthPut = await fetch(`${BASE_URL}/api/bin/${TEST_BIN}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hacked: true }),
  });
  assert.strictEqual(unauthPut.status, 403, 'PUT sem autenticação deve retornar 403');
  console.log('✔ Tentativa de sobrescrita de banco sem autenticação bloqueada com HTTP 403.');

  // 3. LOGIN DE MEMBROS E CONTROLE DE ACESSO
  console.log('\n[3. LOGIN, CADASTRO E CONTROLE DE ACESSO]');
  
  // Membro A (Aprovado)
  const memberLoginA = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId: 'usr-teste-a', telefone: '(11) 98888-1111', binId: TEST_BIN }),
  });
  assert.strictEqual(memberLoginA.status, 200, 'Membro aprovado deve logar com 200');
  const memberAData = await memberLoginA.json();
  const tokenA = memberAData.token;
  console.log('✔ Membro A aprovado autentica com sucesso via telefone e ID.');

  // Candidato Pendente tentando entrar
  const pendingLogin = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId: 'usr-teste-pendente', telefone: '(11) 98888-3333', binId: TEST_BIN }),
  });
  assert.strictEqual(pendingLogin.status, 403, 'Candidato pendente não pode logar');
  console.log('✔ Candidato pendente bloqueado de acessar a aplicação (HTTP 403).');

  // Candidato Recusado tentando entrar
  const rejectedLogin = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId: 'usr-teste-recusado', telefone: '(11) 98888-4444', binId: TEST_BIN }),
  });
  assert.strictEqual(rejectedLogin.status, 403, 'Candidato recusado não pode logar');
  console.log('✔ Candidato recusado bloqueado de acessar a aplicação (HTTP 403).');

  // 4. PRIVACIDADE E AUTORIZAÇÃO POR REGISTRO
  console.log('\n[4. PRIVACIDADE E DADOS SENSÍVEIS]');
  
  // 1. Visitante não autenticado: nenhum link do drive do catálogo deve ser exposto
  const getAsUnauth = await fetch(`${BASE_URL}/api/bin/${TEST_BIN}`);
  const unauthViewData = await getAsUnauth.json();
  const unauthSecret = unauthViewData.packages.find((p) => p.id === 'pack-audit-catalogo-secreto');
  assert.strictEqual(unauthSecret.linkDrive, '', 'Visitante anônimo não pode receber link do Drive');

  // 2. Membro A autenticado: não comprou "pack-audit-catalogo-secreto", então linkDrive deve vir vazio
  const getAsMember = await fetch(`${BASE_URL}/api/bin/${TEST_BIN}`, {
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'x-session-token': tokenA,
    },
  });
  const memberViewData = await getAsMember.json();
  const memberSecret = memberViewData.packages.find((p) => p.id === 'pack-audit-catalogo-secreto');
  assert.strictEqual(memberSecret.linkDrive, '', 'Membro que não adquiriu o pacote não pode ver link do Drive');

  // 3. Membro A comprou "pack-audit-catalogo", portanto seu linkDrive vem preenchido legitimamente
  const memberPaidPkg = memberViewData.packages.find((p) => p.id === 'pack-audit-catalogo');
  assert.ok(memberPaidPkg.linkDrive.startsWith('https://drive.google.com/'), 'Membro que adquiriu tem acesso ao seu link');
  
  const otherUser = memberViewData.users.find((u) => u.id === 'usr-teste-b');
  assert.strictEqual(otherUser.telefone, undefined, 'Telefone de terceiros deve ser omitido');
  assert.strictEqual(otherUser.email, undefined, 'Email de terceiros deve ser omitido');
  console.log('✔ Links do Drive estritamente protegidos por compra legítima e bloqueados para não-compradores.');
  console.log('✔ Telefones e e-mails de outros membros protegidos contra vazamento para terceiros.');

  // Membro A tentando editar o perfil de Membro B
  const hackProfile = await fetch(`${BASE_URL}/api/bin/${TEST_BIN}/user/update-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-session-token': tokenA,
    },
    body: JSON.stringify({
      userId: 'usr-teste-b',
      nome: 'B Invasor',
      telefone: '11999998888',
      email: 'hacked@test.com',
    }),
  });
  assert.strictEqual(hackProfile.status, 403, 'Membro não pode alterar perfil de outro');
  console.log('✔ Tentativa de usurpação de perfil de outro membro bloqueada (HTTP 403).');

  // Membro A tentando declarar pagamento em nome de Membro B
  const hackPayment = await fetch(`${BASE_URL}/api/bin/${TEST_BIN}/package/pack-audit-pagamento/pagamento`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-session-token': tokenA,
    },
    body: JSON.stringify({
      memberId: 'usr-teste-b',
      informouPagamento: true,
    }),
  });
  assert.strictEqual(hackPayment.status, 403, 'Membro não pode declarar pagamento por outro membro');
  console.log('✔ Tentativa de declarar pagamento em nome de outro membro bloqueada (HTTP 403).');

  // 5. ETAPAS DE FINANCIAMENTO E ALTERAÇÕES ATÔMICAS
  console.log('\n[5. ETAPAS DE FINANCIAMENTO E OPERAÇÕES]');
  
  // Membro tentando alterar etapa do pacote para PAGAMENTO
  const hackStage = await fetch(`${BASE_URL}/api/bin/${TEST_BIN}/package/pack-audit-coleta/etapa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-session-token': tokenA,
    },
    body: JSON.stringify({ etapa: 'PAGAMENTO' }),
  });
  assert.strictEqual(hackStage.status, 403, 'Apenas o Mestre pode alterar etapa');
  console.log('✔ Membro comum impedido de mudar etapa de financiamento (HTTP 403).');

  // Mestre alterando etapa com seu token
  const masterStage = await fetch(`${BASE_URL}/api/bin/${TEST_BIN}/package/pack-audit-coleta/etapa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterData.token}`,
      'x-session-token': masterData.token,
    },
    body: JSON.stringify({ etapa: 'COLETA' }),
  });
  assert.strictEqual(masterStage.status, 200);
  console.log('✔ Mestre autenticado alterou etapa de financiamento com sucesso.');

  // 6. UPLOADS E SANITIZAÇÃO
  console.log('\n[6. SEGURANÇA DE ARQUIVOS E CSV]');
  
  // Upload malicioso falso
  const maliciousUpload = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'exploit.png',
      fileData: 'data:image/png;base64,' + Buffer.from('<script>alert("xss")</script>').toString('base64'),
    }),
  });
  assert.strictEqual(maliciousUpload.status, 400, 'Arquivo sem magic bytes válidos deve ser rejeitado');
  console.log('✔ Upload de payload camuflado rejeitado por inspeção de magic bytes binários.');

  // Upload de PNG binário real válido
  const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const goodUpload = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'avatar.png',
      fileData: `data:image/png;base64,${validPngBase64}`,
    }),
  });
  assert.strictEqual(goodUpload.status, 200);
  const uploadJson = await goodUpload.json();
  assert.ok(uploadJson.url.startsWith('/uploads/'));
  console.log('✔ Upload de imagem com cabeçalhos binários autênticos aceito e gerou URL estática.');

  // 7. CONCORRÊNCIA E PERSISTÊNCIA ATÔMICA
  console.log('\n[7. CONCORRÊNCIA]');
  // Dispara 3 requisições simultâneas de apoio para validar o lock de gravação
  const promises = [1, 2, 3].map((n) =>
    fetch(`${BASE_URL}/api/bin/${TEST_BIN}/item/item-audit-1/apoio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-session-token': tokenA,
      },
      body: JSON.stringify({ user: memberAData.user }),
    })
  );
  const results = await Promise.all(promises);
  for (const r of results) {
    assert.strictEqual(r.status, 200, 'Todas as requisições concorrentes devem ser processadas com sucesso pelo lock');
  }
  console.log('✔ Concorrência serializada por lock de escrita atômica com sucesso.');

  // 8. LOGOUT E ENCERRAMENTO DE SESSÃO
  console.log('\n[8. LOGOUT E ENCERRAMENTO DE SESSÃO]');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'x-session-token': tokenA,
    },
  });
  assert.strictEqual(logoutRes.status, 200);
  
  // Sessão antiga deve ser invalidada
  const meAfterLogout = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'x-session-token': tokenA,
    },
  });
  assert.strictEqual(meAfterLogout.status, 401, 'Sessão revogada não pode ser reutilizada');
  console.log('✔ Sessão revogada com sucesso no servidor e token antigo invalidado.');

  console.log('\n======================================================');
  console.log('TODOS OS TESTES AUTOMATIZADOS PASSARAM COM SUCESSO (100% OK)');
  console.log('======================================================');
}

runAudit().catch((err) => {
  console.error('\n❌ FALHA NA AUDITORIA:', err);
  process.exit(1);
});
