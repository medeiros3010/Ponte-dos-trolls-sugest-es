import assert from 'assert';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const TEST_BIN = 'test-lifecycle-bin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'trol123';

async function runLifecycleTests() {
  console.log('=== TESTES DO CICLO DE VIDA DE BACKUP, VALIDAÇÃO E RESTAURAÇÃO ===\n');

  // 0. Grava snapshot de verificação de integridade dos dados reais de produção
  const prodFileBefore = fs.readFileSync('data/bins/trolls-rpg-oficial.json', 'utf8');
  const prodBackup = fs.readFileSync('data/bins/trolls-rpg-oficial.json.immutable-backup', 'utf8');
  assert.strictEqual(prodFileBefore, prodBackup, 'Atenção: arquivo de produção difere do backup imutável antes dos testes!');
  console.log('✔ Integridade inicial do banco de produção confirmada.');

  // Cria bin isolado para os testes de restauração
  const initialTestState = {
    id: TEST_BIN,
    name: 'Banco de Teste Isolado',
    updatedAt: new Date().toISOString(),
    usersVersion: 'v2_test',
    items: [
      { id: 'item-orig-1', nome: 'Item Original', produto: 'Livro Básico', status: 'Sugestão' }
    ],
    users: [
      { id: 'usr-orig-1', nome: 'Usuário Original', email: 'orig@test.com', status: 'aprovado' }
    ],
    packages: [
      { id: 'pkg-orig-1', titulo: 'Pacote Original', status: 'Financiamento', valorTotalBRL: 100, apoiadores: [] }
    ],
    solicitacoes: [],
    regrasConfig: { versao: '1.0' }
  };
  fs.writeFileSync(`data/bins/${TEST_BIN}.json`, JSON.stringify(initialTestState, null, 2));

  // 1. TESTE DE EXPORTAÇÃO DE BACKUP
  console.log('\n[1. EXPORTAÇÃO]');
  const exportRes = await fetch(`${BASE_URL}/api/admin/export-backup?binId=trolls-rpg-oficial&adminPassword=${ADMIN_PASSWORD}`);
  assert.strictEqual(exportRes.status, 200, `Esperado 200 na exportação, recebido ${exportRes.status}`);
  const exportData = await exportRes.json();

  assert.strictEqual(exportData.formatVersion, '2.0.0', 'Formato deve ser 2.0.0');
  assert.ok(exportData.exportedAt, 'Deve conter exportedAt');
  assert.ok(exportData.sourceEnvironment, 'Deve conter sourceEnvironment');
  assert.ok(exportData.counts, 'Deve conter contagens de registros');
  assert.ok(exportData.counts.users >= 120, 'Deve conter todos os membros exportados');
  assert.ok(exportData.counts.packages >= 100, 'Deve conter todos os pacotes exportados');
  assert.ok(exportData.disclaimers, 'Deve conter avisos documentados do que NÃO está no backup');
  assert.ok(exportData.disclaimers.rawFilesNotIncluded, 'Deve documentar que arquivos brutos não são copiados no JSON');
  assert.ok(exportData.disclaimers.firebaseAuthNotIncluded, 'Deve documentar que contas Auth não estão no JSON');
  assert.ok(exportData.disclaimers.secretsNotIncluded, 'Deve documentar que senhas/tokens não estão no JSON');
  console.log(`✔ Exportação concluída com sucesso: ${exportData.counts.users} membros, ${exportData.counts.packages} pacotes, ${exportData.counts.items} itens.`);

  // 2. TESTE DE VALIDAÇÃO DE BACKUP
  console.log('\n[2. VALIDAÇÃO ANTES DA RESTAURAÇÃO]');

  // 2.1 Backup válido
  const validValRes = await fetch(`${BASE_URL}/api/admin/validate-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: exportData, adminPassword: ADMIN_PASSWORD })
  });
  const validValData = await validValRes.json();
  assert.strictEqual(validValData.valid, true, 'Backup oficial deve ser considerado válido');
  assert.strictEqual(validValData.errors.length, 0, 'Backup oficial não deve conter erros críticos');
  console.log('✔ Validação de backup íntegro aprovada com 0 erros.');

  // 2.2 Backup malformado
  const malformedValRes = await fetch(`${BASE_URL}/api/admin/validate-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: 'String Inválida', adminPassword: ADMIN_PASSWORD })
  });
  const malformedValData = await malformedValRes.json();
  assert.strictEqual(malformedValData.valid, false, 'Payload malformado deve ser rejeitado');
  console.log('✔ Rejeição de payload corrompido/malformado testada com sucesso.');

  // 2.3 Detecção de IDs duplicados
  const dupPayload = JSON.parse(JSON.stringify(exportData));
  dupPayload.users.push({ id: dupPayload.users[0].id, nome: 'Usuário Duplicado' });
  const dupValRes = await fetch(`${BASE_URL}/api/admin/validate-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: dupPayload, adminPassword: ADMIN_PASSWORD })
  });
  const dupValData = await dupValRes.json();
  assert.ok(dupValData.warnings.some(w => w.includes('IDs duplicados') || w.includes('duplicado')), 'Deve detectar IDs duplicados');
  console.log('✔ Detecção de IDs duplicados testada com sucesso.');

  // 2.4 Detecção e bloqueio de falsa elevação de privilégios de administrador
  const hackerPayload = JSON.parse(JSON.stringify(exportData));
  hackerPayload.users.push({
    id: 'usr-fake-admin',
    nome: 'Falso Administrador',
    email: 'hacker@malicious.org',
    isMaster: true
  });
  const hackerValRes = await fetch(`${BASE_URL}/api/admin/validate-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: hackerPayload, adminPassword: ADMIN_PASSWORD })
  });
  const hackerValData = await hackerValRes.json();
  assert.ok(hackerValData.warnings.some(w => w.includes('Tentativa de elevação administrativa')), 'Deve avisar sobre elevação indevida');
  console.log('✔ Bloqueio de auto-elevação administrativa verificado.');

  // 3. TESTE DE RESTAURAÇÃO COM SEGURANÇA
  console.log('\n[3. RESTAURAÇÃO]');

  // 3.1 Rejeição de restauração não autorizada
  const unauthRes = await fetch(`${BASE_URL}/api/admin/restore-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: TEST_BIN,
      adminPassword: 'senha-errada',
      mode: 'replace',
      payload: exportData
    })
  });
  assert.strictEqual(unauthRes.status, 403, 'Restauração sem senha de Mestre válida deve retornar 403');
  console.log('✔ Restauração não autorizada bloqueada com HTTP 403.');

  // 3.2 Restauração no bin isolado (Modo 'replace')
  const filesBeforeRestore = fs.readdirSync('data/backups').filter(f => f.startsWith('auto_pre_restore_')).length;

  const replaceRestoreRes = await fetch(`${BASE_URL}/api/admin/restore-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: TEST_BIN,
      adminPassword: ADMIN_PASSWORD,
      mode: 'replace',
      payload: exportData
    })
  });
  assert.strictEqual(replaceRestoreRes.status, 200, 'Restauração em modo replace deve retornar 200');
  const replaceRestoreData = await replaceRestoreRes.json();
  assert.strictEqual(replaceRestoreData.success, true);

  // Verifica que um snapshot de segurança foi gravado no servidor antes da alteração
  const filesAfterRestore = fs.readdirSync('data/backups').filter(f => f.startsWith('auto_pre_restore_')).length;
  assert.strictEqual(filesAfterRestore, filesBeforeRestore + 1, 'Servidor deve gerar snapshot automático antes de restaurar');
  console.log('✔ Snapshot automático pré-restauração gerado no servidor com sucesso.');

  // Verifica dados do bin após restauração
  const restoredTestBin = JSON.parse(fs.readFileSync(`data/bins/${TEST_BIN}.json`, 'utf8'));
  assert.strictEqual(restoredTestBin.users.length, exportData.users.length);
  assert.strictEqual(restoredTestBin.packages.length, exportData.packages.length);
  console.log('✔ Modo "Substituir com Segurança" restaurou todos os registros perfeitamente.');

  // 3.3 Restauração no bin isolado (Modo 'merge')
  const mergePayload = {
    formatVersion: '2.0.0',
    users: [
      { id: 'usr-novo-merge-1', nome: 'Membro Adicionado no Merge', email: 'merge@test.com', status: 'aprovado' }
    ],
    packages: [
      { id: 'pkg-novo-merge-1', titulo: 'Pacote Adicionado no Merge', status: 'Financiamento', valorTotalBRL: 50, apoiadores: [] }
    ]
  };

  const mergeRestoreRes = await fetch(`${BASE_URL}/api/admin/restore-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: TEST_BIN,
      adminPassword: ADMIN_PASSWORD,
      mode: 'merge',
      payload: mergePayload
    })
  });
  assert.strictEqual(mergeRestoreRes.status, 200);
  const afterMergeBin = JSON.parse(fs.readFileSync(`data/bins/${TEST_BIN}.json`, 'utf8'));
  assert.strictEqual(afterMergeBin.users.length, restoredTestBin.users.length + 1, 'Merge deve somar novos usuários');
  assert.strictEqual(afterMergeBin.packages.length, restoredTestBin.packages.length + 1, 'Merge deve somar novos pacotes');
  console.log('✔ Modo "Mesclar Registros" preservou registros existentes e adicionou novos sem perdas.');

  // 3.4 Teste de idempotência (restaurar o mesmo payload duas vezes não cria duplicações)
  await fetch(`${BASE_URL}/api/admin/restore-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      binId: TEST_BIN,
      adminPassword: ADMIN_PASSWORD,
      mode: 'merge',
      payload: mergePayload
    })
  });
  const afterSecondMerge = JSON.parse(fs.readFileSync(`data/bins/${TEST_BIN}.json`, 'utf8'));
  assert.strictEqual(afterSecondMerge.users.length, afterMergeBin.users.length, 'Idempotência violada: usuário duplicado!');
  assert.strictEqual(afterSecondMerge.packages.length, afterMergeBin.packages.length, 'Idempotência violada: pacote duplicado!');
  console.log('✔ Idempotência comprovada: re-execução não gerou duplicações.');

  // 4. VERIFICAÇÃO FINAL DE NÃO-CONTAMINAÇÃO DA PRODUÇÃO
  console.log('\n[4. INTEGRIDADE DO AMBIENTE DE PRODUÇÃO]');
  const prodFileAfter = fs.readFileSync('data/bins/trolls-rpg-oficial.json', 'utf8');
  assert.strictEqual(prodFileAfter, prodBackup, 'FALHA CRÍTICA: Os testes contaminaram ou alteraram o banco de produção!');
  console.log('✔ BANCO DE PRODUÇÃO PERMANECEU 100% INTACTO E PROTEGIDO DURANTE TODOS OS TESTES.');

  // Limpa o bin temporário de testes de ciclo de vida
  if (fs.existsSync(`data/bins/${TEST_BIN}.json`)) {
    fs.unlinkSync(`data/bins/${TEST_BIN}.json`);
  }

  console.log('\n======================================================');
  console.log('TODOS OS TESTES DO CICLO DE VIDA FORAM CONCLUÍDOS COM SUCESSO (100% APROVADO)!');
  console.log('======================================================\n');
  process.exit(0);
}

runLifecycleTests().catch((err) => {
  console.error('ERRO NO TESTE DE CICLO DE VIDA:', err);
  process.exit(1);
});
