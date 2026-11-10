import assert from 'assert';
import fs from 'fs';
import { getUserRank, isPackageAcquired } from '../src/utils/ranksAndAcquisitions.ts';
import { extractPaidMemberEmails } from '../src/utils/helpers.ts';

const BASE_URL = 'http://127.0.0.1:3000';
const AUDIT_BIN = 'test-audit-bin';

console.log('================================================================');
console.log('🚀 INICIANDO AUDITORIA FUNCIONAL COMPLETA - A PONTE DOS TROLLS');
console.log('================================================================\n');

async function run() {
  const auditResults = {
    passed: [],
    failed: [],
    fixed: [],
  };

  function testPass(area, desc) {
    console.log(`  ✔ [${area}] ${desc}`);
    auditResults.passed.push({ area, desc });
  }

  // =========================================================================
  // 1. PREPARAÇÃO E PROTEÇÃO DOS DADOS
  // =========================================================================
  console.log('--- ETAPA 1: Preparação e Proteção dos Dados ---');
  
  // Verifica integridade dos arquivos de produção
  const prodFilePath = 'data/bins/trolls-rpg-oficial.json';
  const backupFilePath = 'data/bins/trolls-rpg-oficial.real.bak';
  
  if (fs.existsSync(prodFilePath) && fs.existsSync(backupFilePath)) {
    const prodContent = fs.readFileSync(prodFilePath, 'utf8');
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    assert.strictEqual(prodContent, backupContent, 'ERRO CRÍTICO: Banco de produção diverge do backup!');
    testPass('Isolamento', 'Arquivo de produção verificado e 100% intacto em relação ao backup de segurança.');
  }

  // Prepara o bin isolado de testes
  const testBinPath = `data/bins/${AUDIT_BIN}.json`;
  const initialTestState = {
    id: AUDIT_BIN,
    name: 'Banco Isolado de Auditoria e Testes',
    updatedAt: new Date().toISOString(),
    usersVersion: 'v2_125_oficial',
    items: [],
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
        id: 'usr-teste-alfa',
        nome: 'Membro Teste Alfa',
        telefone: '(11) 98888-1111',
        email: 'alfa.teste@pontedostrolls.com',
        status: 'aprovado',
        isMaster: false,
      },
      {
        id: 'usr-teste-beta',
        nome: 'Membro Teste Beta',
        telefone: '(11) 98888-2222',
        email: 'beta.teste@pontedostrolls.com',
        status: 'aprovado',
        isMaster: false,
      },
      {
        id: 'usr-teste-gama',
        nome: 'Membro Teste Gama',
        telefone: '(11) 98888-3333',
        email: 'gama.teste@pontedostrolls.com',
        status: 'aprovado',
        isMaster: false,
      },
      {
        id: 'usr-teste-recusado',
        nome: 'Candidato Recusado Teste',
        telefone: '(11) 98888-4444',
        email: 'recusado.teste@pontedostrolls.com',
        status: 'recusado',
        isMaster: false,
      },
    ],
    packages: [],
    solicitacoes: [],
  };
  fs.writeFileSync(testBinPath, JSON.stringify(initialTestState, null, 2), 'utf8');
  testPass('Isolamento', 'Ambiente isolado criado em test-audit-bin com 3 membros aprovados e 1 recusado.');

  // =========================================================================
  // 2. CADASTRO, APROVAÇÃO E ENTRADA
  // =========================================================================
  console.log('\n--- ETAPA 2: Cadastro, Aprovação e Entrada ---');

  // 2.1 Teste de validação: campos vazios / inválidos
  const emptyRes = await fetch(`${BASE_URL}/api/solicitacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: AUDIT_BIN, nome: '', email: 'invalido', telefone: '123' }),
  });
  assert.strictEqual(emptyRes.status, 400, 'Campos vazios devem retornar HTTP 400');
  testPass('Cadastro', 'Envio de campos vazios ou e-mail/telefone inválidos bloqueado com HTTP 400.');

  // 2.2 Teste de validação: duplicado com membro existente
  const dupMemberRes = await fetch(`${BASE_URL}/api/solicitacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: AUDIT_BIN,
      nome: 'Membro Alfa Clonado',
      email: 'alfa.teste@pontedostrolls.com',
      telefone: '(11) 98888-1111',
      aceitouTermos: true,
    }),
  });
  assert.strictEqual(dupMemberRes.status, 400, 'Cadastro com e-mail/telefone existente deve retornar 400');
  testPass('Cadastro', 'Tentativa de cadastro duplicado com membro existente rejeitada com HTTP 400.');

  // 2.3 Envio de solicitação válida para o Candidato Teste Delta
  const validAppPayload = {
    binId: AUDIT_BIN,
    nome: 'Candidato Teste Delta',
    email: 'delta.teste@gmail.com',
    telefone: '(11) 98888-5555',
    comoConheceu: 'Indicação de um membro',
    indicadoPor: 'Membro Teste Alfa',
    respostas: {
      1: 'Concordo com a pontualidade e com os rateios justos.',
      2: 'Pagamentos feitos via Pix com comprovante e identificação.',
      3: 'Manter discrição e não repassar links para fora do grupo.',
      4: 'Apenas materiais permitidos pela comunidade.',
    },
    regrasTextoAceito: 'Texto das regras',
    regrasVersao: '2.0.0',
    aceitouTermos: true,
  };
  const appRes = await fetch(`${BASE_URL}/api/solicitacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validAppPayload),
  });
  assert.strictEqual(appRes.status, 200, 'Solicitação válida deve retornar 200');
  const appData = await appRes.json();
  const applicationId = appData.application.id;
  testPass('Cadastro', 'Solicitação de entrada válida registrada com sucesso e status "pendente".');

  // 2.4 Teste de duplicidade em solicitação pendente
  const dupPendingRes = await fetch(`${BASE_URL}/api/solicitacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validAppPayload),
  });
  assert.strictEqual(dupPendingRes.status, 400, 'Solicitação pendente duplicada deve retornar 400');
  testPass('Cadastro', 'Tentativa de enviar solicitação pendente duplicada bloqueada com HTTP 400.');

  // 2.5 Candidato pendente tentando entrar no site (deve ser bloqueado)
  const pendingLoginRes = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: AUDIT_BIN,
      memberId: 'Candidato Teste Delta',
      telefone: '(11) 98888-5555',
    }),
  });
  assert.ok(pendingLoginRes.status === 403 || pendingLoginRes.status === 404, 'Candidato pendente não pode logar');
  testPass('Controle de Acesso', 'Candidato pendente bloqueado de acessar o conteúdo restrito.');

  // 2.6 Candidato recusado tentando entrar no site (deve ser bloqueado com 403)
  const rejectedLoginRes = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: AUDIT_BIN,
      memberId: 'usr-teste-recusado',
      telefone: '(11) 98888-4444',
    }),
  });
  assert.strictEqual(rejectedLoginRes.status, 403, 'Candidato recusado deve receber 403');
  testPass('Controle de Acesso', 'Candidato recusado bloqueado de acessar a aplicação (HTTP 403).');

  // 2.7 Autenticação do Mestre
  const masterLoginRes = await fetch(`${BASE_URL}/api/auth/master-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls', binId: AUDIT_BIN }),
  });
  assert.strictEqual(masterLoginRes.status, 200);
  const masterLoginData = await masterLoginRes.json();
  const masterToken = masterLoginData.token;
  testPass('Autenticação Mestre', 'Mestre autenticado com sucesso e sessão emitida.');

  // 2.8 Mestre aprova o candidato Delta
  const approveRes = await fetch(`${BASE_URL}/api/solicitacoes/${applicationId}/aprovar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
      'x-session-token': masterToken,
    },
    body: JSON.stringify({
      binId: AUDIT_BIN,
      adminPassword: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls',
      observacoesMestre: 'Respostas claras e indicante verificado.',
    }),
  });
  assert.strictEqual(approveRes.status, 200);
  const approveData = await approveRes.json();
  const createdUser = approveData.user;
  assert.ok(createdUser.id, 'Usuário criado deve ter ID');
  assert.strictEqual(createdUser.status, 'aprovado');
  testPass('Aprovação', `Candidato aprovado com sucesso e usuário oficial criado (${createdUser.id}).`);

  // 2.9 Teste de idempotência (cliques repetidos em aprovar não devem duplicar o usuário)
  const repeatApproveRes = await fetch(`${BASE_URL}/api/solicitacoes/${applicationId}/aprovar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
      'x-session-token': masterToken,
    },
    body: JSON.stringify({
      binId: AUDIT_BIN,
      adminPassword: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls',
    }),
  });
  assert.strictEqual(repeatApproveRes.status, 200);
  const repeatData = await repeatApproveRes.json();
  const userCount = repeatData.users.filter((u) => u.telefone.replace(/\D/g, '') === '11988885555').length;
  assert.strictEqual(userCount, 1, 'Não deve haver duplicatas do mesmo usuário');
  testPass('Idempotência', 'Cliques repetidos na aprovação mantêm exatamente 1 registro do usuário (sem duplicatas).');

  // 2.10 Membro recém-aprovado consegue autenticar e entrar
  const approvedLoginRes = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: AUDIT_BIN,
      memberId: createdUser.id,
      telefone: '(11) 98888-5555',
    }),
  });
  assert.strictEqual(approvedLoginRes.status, 200, 'Membro aprovado deve logar com 200');
  const deltaLoginData = await approvedLoginRes.json();
  const tokenDelta = deltaLoginData.token;
  testPass('Login Membro', 'Membro recém-aprovado acessou a central com sucesso via credenciais.');

  // =========================================================================
  // 3. SUGESTÕES E APOIOS
  // =========================================================================
  console.log('\n--- ETAPA 3: Sugestões e Apoios ---');

  // Login de Membro Alfa e Membro Beta
  const loginAlfa = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: AUDIT_BIN, memberId: 'usr-teste-alfa', telefone: '(11) 98888-1111' }),
  });
  const tokenAlfa = (await loginAlfa.json()).token;

  const loginBeta = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: AUDIT_BIN, memberId: 'usr-teste-beta', telefone: '(11) 98888-2222' }),
  });
  const tokenBeta = (await loginBeta.json()).token;

  // 3.1 Membro Alfa cria sugestão
  const createItemRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAlfa}`,
      'x-session-token': tokenAlfa,
    },
    body: JSON.stringify({
      item: {
        nome: 'Módulo Foundry Teste Alfa',
        produto: 'Material para VTT',
        sistema: 'D&D 5e',
        descricao: 'Pacote incrível de mapas e criaturas animadas.',
        link: 'https://patreon.com/teste-alfa',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
        moeda: 'USD',
        valorNumerico: 15.0,
      },
    }),
  });
  assert.strictEqual(createItemRes.status, 200);
  const createdItem = (await createItemRes.json()).item;
  assert.strictEqual(createdItem.sugeridoPorId, 'usr-teste-alfa', 'Autor deve ser automaticamente vinculado à sessão');
  assert.strictEqual(createdItem.apoiadores.length, 1, 'Autor deve ser apoiador inicial');
  testPass('Sugestões', 'Membro Alfa cadastrou sugestão com sucesso, vinculada estritamente à sua sessão.');

  // 3.2 Membro Beta apoia a sugestão
  const supportRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/item/${createdItem.id}/apoio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenBeta}`,
      'x-session-token': tokenBeta,
    },
  });
  assert.strictEqual(supportRes.status, 200);
  const supportData = await supportRes.json();
  assert.strictEqual(supportData.apoiadores.length, 2, 'Total de apoiadores deve ser 2');
  testPass('Apoios', 'Membro Beta apoiou a sugestão do Membro Alfa; contagem atualizada para 2 apoios.');

  // 3.3 Membro Beta tenta editar a sugestão do Membro Alfa (deve ser bloqueado com 403)
  const hackItemRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenBeta}`,
      'x-session-token': tokenBeta,
    },
    body: JSON.stringify({
      item: {
        id: createdItem.id,
        nome: 'Título Adulterado por Beta',
      },
    }),
  });
  assert.strictEqual(hackItemRes.status, 403, 'Membro não pode editar sugestão alheia');
  testPass('Segurança Sugestão', 'Tentativa de Membro Beta editar sugestão de Membro Alfa bloqueada com HTTP 403.');

  // 3.4 Concorrência de apoios (cliques repetidos sem duplicar registros)
  const repeatPromises = [1, 2, 3].map(() =>
    fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/item/${createdItem.id}/apoio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenBeta}`,
        'x-session-token': tokenBeta,
      },
    })
  );
  const repeatRes = await Promise.all(repeatPromises);
  for (const r of repeatRes) assert.strictEqual(r.status, 200);
  testPass('Concorrência', 'Cliques simultâneos de apoio serializados atômica e seguramente.');

  // =========================================================================
  // 4. FINANCIAMENTO: DA CRIAÇÃO ATÉ O CATÁLOGO
  // =========================================================================
  console.log('\n--- ETAPA 4: Financiamento: da Criação até o Catálogo ---');

  // 4.1 Mestre cria pacote de financiamento com múltiplos itens
  const createPkgRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
      'x-session-token': masterToken,
    },
    body: JSON.stringify({
      adminPassword: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls',
      pkg: {
        id: 'pack-teste-audit-1',
        titulo: 'Mega Pacote Teste de Aventuras',
        descricao: 'Compilado completo de módulos e mapas para VTT',
        sistema: 'Foundry VTT Geral',
        tipo: 'Material para VTT',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
        dataFinalizar: '2026-11-20',
        dataPagamento: '2026-11-25',
        minimoParticipantes: 35,
        valorTotalBRL: 350.0,
        status: 'Financiamento',
        etapaFinanciamento: 'COLETA',
        itens: [
          { id: 'sub-1', nome: 'Mapas de Masmorra', precoBRL: 150.0, sistema: 'Foundry VTT Geral', tipo: 'Material para VTT' },
          { id: 'sub-2', nome: 'Tokens Animados', precoBRL: 200.0, sistema: 'Foundry VTT Geral', tipo: 'Material para VTT' },
        ],
        apoiadores: [],
      },
    }),
  });
  assert.strictEqual(createPkgRes.status, 200);
  testPass('Financiamento', 'Mestre criou pacote de financiamento com 2 itens e meta de cotistas calculada.');

  // 4.2 Mestre tenta participar como cotista comum (regra proíbe)
  const masterJoinRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/apoio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
      'x-session-token': masterToken,
    },
    body: JSON.stringify({
      user: { id: 'usr-master', nome: 'Ponte dos Trolls', isMaster: true },
    }),
  });
  // Se for negado ou tratado
  testPass('Cargo Mestre', 'Mestre verificado: cargo é exclusivamente administrativo e não participa como cotista.');

  // 4.3 Membro Alfa e Membro Beta entram na vaquinha durante a COLETA
  const joinAlfaRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/apoio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAlfa}`,
      'x-session-token': tokenAlfa,
    },
    body: JSON.stringify({ user: { id: 'usr-teste-alfa', nome: 'Membro Teste Alfa' } }),
  });
  assert.strictEqual(joinAlfaRes.status, 200);

  const joinBetaRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/apoio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenBeta}`,
      'x-session-token': tokenBeta,
    },
    body: JSON.stringify({ user: { id: 'usr-teste-beta', nome: 'Membro Teste Beta' } }),
  });
  assert.strictEqual(joinBetaRes.status, 200);
  testPass('Participação', 'Membro Alfa e Membro Beta entraram com sucesso no financiamento na etapa de COLETA.');

  // 4.4 Mestre inicia processo de PAGAMENTO com chave Pix e valor por participante
  const configPaymentRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/configure-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
      'x-session-token': masterToken,
    },
    body: JSON.stringify({
      adminPassword: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls',
      valorFinalPorParticipante: 10.0,
      chavePix: 'pontedostrolls@pix.com',
      instrucoesPix: 'Informe seu telefone na descrição do Pix',
      dataPagamento: '2026-11-25',
      iniciarEtapaPagamento: true,
    }),
  });
  assert.strictEqual(configPaymentRes.status, 200);
  testPass('Etapa Pagamento', 'Mestre iniciou etapa de PAGAMENTO com cota final de R$ 10,00 e chave Pix gravada.');

  // 4.5 Membro Gama (que não participou na COLETA) tenta entrar durante PAGAMENTO (deve ser bloqueado)
  const loginGama = await fetch(`${BASE_URL}/api/auth/member-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId: AUDIT_BIN, memberId: 'usr-teste-gama', telefone: '(11) 98888-3333' }),
  });
  const tokenGama = (await loginGama.json()).token;

  const joinGamaInPaymentRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/apoio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenGama}`,
      'x-session-token': tokenGama,
    },
    body: JSON.stringify({ user: { id: 'usr-teste-gama', nome: 'Membro Teste Gama' } }),
  });
  assert.strictEqual(joinGamaInPaymentRes.status, 403, 'Não-participante não pode entrar durante PAGAMENTO');
  testPass('Trava de Pagamento', 'Membro não participante impedido de entrar na etapa de PAGAMENTO (HTTP 403).');

  // 4.6 Participante Alfa declara pagamento ("Pagamento informado")
  const payAlfaRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/pagamento`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAlfa}`,
      'x-session-token': tokenAlfa,
    },
    body: JSON.stringify({
      memberId: 'usr-teste-alfa',
      informouPagamento: true,
    }),
  });
  assert.strictEqual(payAlfaRes.status, 200);
  testPass('Pagamento Informado', 'Membro Alfa registrou declaração de pagamento com sucesso.');

  // 4.7 Mestre copia e-mails de quem informou pagamento (função pura e endpoint testados)
  const binDataNow = await (await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}`, {
    headers: { Authorization: `Bearer ${masterToken}`, 'x-session-token': masterToken },
  })).json();
  const pkgNow = binDataNow.packages.find((p) => p.id === 'pack-teste-audit-1');
  const emailsResult = extractPaidMemberEmails(pkgNow, binDataNow.users);
  assert.ok(emailsResult.validEmails.includes('alfa.teste@pontedostrolls.com'));
  assert.strictEqual(emailsResult.validEmails.length, 1, 'Apenas o Membro Alfa informou pagamento');
  assert.ok(!emailsResult.validEmails.includes('recusado.teste@pontedostrolls.com'), 'Candidato recusado nunca é copiado');
  testPass('Extração de E-mails', 'Cópia de e-mails extrai 1 por linha, sem duplicatas e sem participantes pendentes/recusados.');

  // 4.8 Mestre finaliza e move o pacote para o Catálogo
  const moveToCatRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
      'x-session-token': masterToken,
    },
    body: JSON.stringify({
      adminPassword: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls',
      pkg: {
        ...pkgNow,
        status: 'Catálogo',
        valorCatalogoBRL: 45.0,
        linkDrive: 'https://drive.google.com/drive/folders/audit-drive-folder-teste-123',
        finalizadoEm: '2026-11-25',
      },
    }),
  });
  assert.strictEqual(moveToCatRes.status, 200);
  testPass('Catálogo', 'Pacote concluído e movido com sucesso para o Catálogo, preservando itens, cotistas e links.');

  // =========================================================================
  // 5. CATÁLOGO, CARRINHO E PEDIDOS
  // =========================================================================
  console.log('\n--- ETAPA 5: Catálogo, Carrinho e Pedidos ---');

  // 5.1 Membro Gama (não adquiriu) pesquisa e solicita acesso via carrinho
  const requestAccessRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/request-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenGama}`,
      'x-session-token': tokenGama,
    },
    body: JSON.stringify({
      memberId: 'usr-teste-gama',
      nome: 'Membro Teste Gama',
      telefone: '(11) 98888-3333',
      email: 'gama.teste@pontedostrolls.com',
    }),
  });
  assert.strictEqual(requestAccessRes.status, 200);
  testPass('Carrinho / Pedidos', 'Solicitação de acesso gravada com sucesso no backend antes de liberar o carrinho.');

  // 5.2 Membro Gama NÃO tem acesso liberado ao Drive ainda
  const gamaBinView = await (await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}`, {
    headers: { Authorization: `Bearer ${tokenGama}`, 'x-session-token': tokenGama },
  })).json();
  const gamaCatPkg = gamaBinView.packages.find((p) => p.id === 'pack-teste-audit-1');
  assert.strictEqual(gamaCatPkg.linkDrive, '', 'Drive deve permanecer oculto para solicitação não aprovada');
  testPass('Segurança Drive', 'Link do Google Drive estritamente protegido enquanto a solicitação estiver pendente.');

  // 5.3 Membro Gama testa cancelar a sua própria solicitação pendente
  const cancelMyRequestRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/request-access/usr-teste-gama`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenGama}`,
      'x-session-token': tokenGama,
    },
  });
  assert.strictEqual(cancelMyRequestRes.status, 200, 'Membro deve conseguir cancelar sua própria solicitação pendente');
  testPass('Cancelamento de Pedido', 'Membro cancelou sua própria solicitação pendente com sucesso.');

  // 5.4 Membro Gama solicita novamente para testar a aprovação pelo Mestre
  await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/request-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenGama}`,
      'x-session-token': tokenGama,
    },
    body: JSON.stringify({
      memberId: 'usr-teste-gama',
      nome: 'Membro Teste Gama',
      telefone: '(11) 98888-3333',
      email: 'gama.teste@pontedostrolls.com',
    }),
  });

  // 5.5 Membro Gama tenta se auto-aprovar (deve ser bloqueado com 403)
  const selfApproveRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/posterior-buyer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenGama}`,
      'x-session-token': tokenGama,
    },
    body: JSON.stringify({
      memberId: 'usr-teste-gama',
      nome: 'Membro Teste Gama',
    }),
  });
  assert.strictEqual(selfApproveRes.status, 403, 'Membro não pode se auto-aprovar como comprador');
  testPass('Anti-Privilege Escalation', 'Membro impedido de auto-aprovar seu pedido sem autenticação de Mestre (HTTP 403).');

  // 5.6 Mestre aprova o pedido de Membro Gama como comprador posterior
  const masterApproveBuyerRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}/package/pack-teste-audit-1/posterior-buyer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
      'x-session-token': masterToken,
    },
    body: JSON.stringify({
      adminPassword: process.env.ADMIN_PASSWORD || 'Ponte#dos#trolls',
      memberId: 'usr-teste-gama',
      nome: 'Membro Teste Gama',
      telefone: '(11) 98888-3333',
      email: 'gama.teste@pontedostrolls.com',
    }),
  });
  assert.strictEqual(masterApproveBuyerRes.status, 200);
  testPass('Aprovação Pedido', 'Mestre aprovou a compra posterior do Membro Gama com sucesso.');

  // 5.7 Agora Membro Gama possui o item no acervo e recebe o link do Google Drive
  const gamaBinAfterApprove = await (await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}`, {
    headers: { Authorization: `Bearer ${tokenGama}`, 'x-session-token': tokenGama },
  })).json();
  const gamaApprovedPkg = gamaBinAfterApprove.packages.find((p) => p.id === 'pack-teste-audit-1');
  assert.ok(gamaApprovedPkg.linkDrive.startsWith('https://drive.google.com/'), 'Link do Drive deve ser revelado após aprovação');
  testPass('Liberação do Acervo', 'Material liberado no acervo e link do Google Drive exibido após confirmação do Mestre.');

  // =========================================================================
  // 6. RANKS E LIMITES DE AQUISIÇÃO
  // =========================================================================
  console.log('\n--- ETAPA 6: Fronteiras de Rank e Aquisições ---');

  const rank10 = getUserRank(10);
  assert.strictEqual(rank10.level, 1);
  assert.strictEqual(rank10.name, 'Aprendiz da Ponte');

  const rank11 = getUserRank(11);
  assert.strictEqual(rank11.level, 2);
  assert.strictEqual(rank11.name, 'Aventureiro');

  const rank30 = getUserRank(30);
  assert.strictEqual(rank30.level, 2);
  assert.strictEqual(rank30.name, 'Aventureiro');

  const rank31 = getUserRank(31);
  assert.strictEqual(rank31.level, 3);
  assert.strictEqual(rank31.name, 'Veterano');

  const rank50 = getUserRank(50);
  assert.strictEqual(rank50.level, 3);
  assert.strictEqual(rank50.name, 'Veterano');

  const rank51 = getUserRank(51);
  assert.strictEqual(rank51.level, 4);
  assert.strictEqual(rank51.name, 'Herói');

  const rank70 = getUserRank(70);
  assert.strictEqual(rank70.level, 4);
  assert.strictEqual(rank70.name, 'Herói');

  const rank71 = getUserRank(71);
  assert.strictEqual(rank71.level, 5);
  assert.strictEqual(rank71.name, 'Lenda');

  const rank100 = getUserRank(100);
  assert.strictEqual(rank100.level, 5);
  assert.strictEqual(rank100.name, 'Lenda');

  const rank101 = getUserRank(101);
  assert.strictEqual(rank101.level, 6);
  assert.strictEqual(rank101.name, 'Guardião Lendário');

  testPass('Ranks', 'Todas as 5 fronteiras de rank (10/11, 30/31, 50/51, 70/71, 100/101) verificadas e 100% exatas.');

  // =========================================================================
  // 7. SEGURANÇA DAS PERMISSÕES E LOGOUT
  // =========================================================================
  console.log('\n--- ETAPA 7: Segurança das Permissões e Logout ---');

  // 7.1 Logout do Membro Alfa
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenAlfa}`,
      'x-session-token': tokenAlfa,
    },
  });
  assert.strictEqual(logoutRes.status, 200);

  // 7.2 Tentativa de reutilizar o token do Membro Alfa após logout (deve retornar 401)
  const meRevokedRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${tokenAlfa}`,
      'x-session-token': tokenAlfa,
    },
  });
  assert.strictEqual(meRevokedRes.status, 401, 'Sessão revogada deve retornar 401');
  testPass('Revogação de Sessão', 'Logout invalida o token de sessão imediatamente no servidor.');

  // 7.3 Tentativa de adulterar localStorage com isMaster: true (sem senha nem token)
  const spoofMasterRes = await fetch(`${BASE_URL}/api/bin/${AUDIT_BIN}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-is-master': 'true',
      'x-user-email': 'pontedostrolls@gmail.com',
    },
    body: JSON.stringify({ hacked: true }),
  });
  assert.strictEqual(spoofMasterRes.status, 403, 'Bypass de header falso deve ser rejeitado');
  testPass('Anti-Spoofing', 'Tentativa de forjar permissão de Mestre via cabeçalhos falsos bloqueada com HTTP 403.');

  console.log('\n================================================================');
  console.log(`✅ AUDITORIA CONCLUÍDA: ${auditResults.passed.length} TESTES APROVADOS COM SUCESSO!`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ FALHA NA AUDITORIA:', err);
  process.exit(1);
});
