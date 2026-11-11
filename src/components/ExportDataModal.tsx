import React, { useRef, useState } from 'react';
import { UserProfile, ItemRPG, FundingPackage } from '../types';
import { exportFullDataToCSV } from '../utils/helpers';
import { apiExportBackup, apiValidateBackup, apiRestoreBackup } from '../utils/cloudStorage';
import {
  X,
  Download,
  FileSpreadsheet,
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Info,
  Lock,
} from 'lucide-react';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  items: ItemRPG[];
  packages: FundingPackage[];
  binId: string;
  onRestoreSuccess: (restoredData: any) => void;
  onToast: (msg: string) => void;
}

interface ValidationReport {
  valid: boolean;
  formatVersion: string;
  sourceEnvironment: string;
  exportedAt: string;
  counts: { users: number; items: number; packages: number; solicitacoes: number };
  duplicateIds: string[];
  warnings: string[];
  errors: string[];
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  users,
  items,
  packages,
  binId,
  onRestoreSuccess,
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de exportação
  const [isExporting, setIsExporting] = useState(false);

  // Estados de pré-validação e restauração
  const [isValidating, setIsValidating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [masterPassword, setMasterPassword] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    exportFullDataToCSV(users, items, packages);
    onToast('Planilha completa CSV baixada com sucesso! Compatível com Excel.');
  };

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      let payload: any;
      try {
        payload = await apiExportBackup(binId);
      } catch (e) {
        // Fallback para montagem no cliente caso o servidor esteja offline
        console.warn('Fallback para exportação no cliente:', e);
        payload = {
          formatVersion: '2.0.0',
          exportedAt: new Date().toISOString(),
          sourceEnvironment: typeof window !== 'undefined' && window.location.hostname.includes('ais-dev') ? 'development' : 'production',
          binId,
          counts: {
            users: users.length,
            items: items.length,
            packages: packages.length,
            solicitacoes: 0,
          },
          disclaimer: {
            images: 'URLs e referências de imagens são links externos e não contêm os arquivos binários originais.',
            auth: 'Contas do Firebase Authentication não são geradas nem exportadas nesta estrutura JSON.',
            security: 'Senhas, chaves de API, credenciais de serviço e tokens de sessão são estritamente omitidos por segurança.',
          },
          data: {
            users,
            items,
            packages,
            solicitacoes: [],
          },
        };
      }

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `ponte_dos_trolls_backup_v2_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onToast('Arquivo de backup completo JSON (v2.0) baixado com sucesso!');
    } catch (err: any) {
      onToast(`Erro ao exportar: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccessMsg(null);
    setValidationReport(null);
    setPendingBackupData(null);
    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('Arquivo JSON corrompido ou formato inválido.');
        }

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('O arquivo não contém uma estrutura JSON válida.');
        }

        // Extração defensiva universal de dados (compatível com backups de raiz direta ou aninhados em .data)
        const rawUsers = Array.isArray(parsed.users) ? parsed.users : (Array.isArray(parsed.data?.users) ? parsed.data.users : []);
        const rawItems = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed.data?.items) ? parsed.data.items : []);
        const rawPackages = Array.isArray(parsed.packages) ? parsed.packages : (Array.isArray(parsed.data?.packages) ? parsed.data.packages : []);
        const rawSolicitacoes = Array.isArray(parsed.solicitacoes)
          ? parsed.solicitacoes
          : (Array.isArray(parsed.data?.solicitacoes)
              ? parsed.data.solicitacoes
              : (Array.isArray(parsed.applications) ? parsed.applications : []));

        if (rawUsers.length === 0 && rawItems.length === 0 && rawPackages.length === 0) {
          throw new Error('O arquivo selecionado não contém membros, itens ou pacotes reconhecíveis.');
        }

        // Relatório de validação inicial local
        let report: ValidationReport = {
          valid: true,
          formatVersion: parsed.formatVersion || (parsed.binId ? '1.0.0 (backup da Ponte)' : '1.0.0 (legado)'),
          sourceEnvironment: parsed.sourceEnvironment || 'Histórico do Site',
          exportedAt: parsed.exportedAt || parsed.updatedAt || 'Data informada no backup',
          counts: {
            users: rawUsers.length,
            items: rawItems.length,
            packages: rawPackages.length,
            solicitacoes: rawSolicitacoes.length,
          },
          duplicateIds: [],
          warnings: [],
          errors: [],
        };

        // Tentar obter validação detalhada do servidor se disponível
        try {
          const serverReport = await apiValidateBackup(parsed, binId);
          if (serverReport) {
            report = {
              ...report,
              ...serverReport,
              counts: {
                users: serverReport.counts?.users ?? rawUsers.length,
                items: serverReport.counts?.items ?? rawItems.length,
                packages: serverReport.counts?.packages ?? rawPackages.length,
                solicitacoes: serverReport.counts?.solicitacoes ?? rawSolicitacoes.length,
              },
            };
          }
        } catch (serverErr) {
          console.warn('Servidor de validação indisponível, usando validação defensiva local:', serverErr);
        }

        setPendingBackupData(parsed);
        setValidationReport(report);

        if (!report.valid && report.errors.length > 0) {
          setRestoreError(`Arquivo rejeitado pela validação: ${report.errors.join(' | ')}`);
        }
      } catch (err: any) {
        setRestoreError(err.message || 'Erro ao inspecionar o arquivo.');
      } finally {
        setIsValidating(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!pendingBackupData || !validationReport?.valid) return;
    if (!masterPassword.trim()) {
      setRestoreError('Digite a senha do Mestre para autorizar a restauração no servidor.');
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreError(null);

      const res = await apiRestoreBackup(pendingBackupData, restoreMode, masterPassword.trim(), binId);

      setRestoreSuccessMsg(
        `Restauração concluída! ${res.counts.users} membros, ${res.counts.packages} pacotes e ${res.counts.items} sugestões carregados. Backup prévio automático salvo como: ${res.autoBackupFile}`
      );
      onToast('Dados restaurados com êxito no servidor!');

      if (res.data) {
        onRestoreSuccess(res.data);
      }

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setRestoreError(err.message || 'Falha ao restaurar dados no servidor.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelPreview = () => {
    setPendingBackupData(null);
    setValidationReport(null);
    setRestoreError(null);
    setMasterPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Exportação & Restauração Segura
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Backup total estruturado com salvaguardas e validação prévia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (com scroll interno se necessário) */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-[#302414] overflow-y-auto">

          {/* Card Resumo do Ambiente */}
          <div className="p-3 bg-[#FAF4E6] border border-[#C6AD78] rounded-2xl flex items-center justify-between text-xs text-[#71634D]">
            <div>
              <span className="text-[#302414] font-bold block">Base Ativa no Servidor:</span>
              <span>{users.length} membros · {items.length} sugestões · {packages.length} pacotes</span>
            </div>
            <span className="font-mono text-[11px] text-[#48551F] font-bold">Banco: {binId}</span>
          </div>

          {/* SEÇÃO DE PRÉVIA DA RESTAURAÇÃO (quando um arquivo for selecionado) */}
          {validationReport && pendingBackupData && (
            <div className="p-4 rounded-2xl bg-[#FFFBF0] border-2 border-[#716016] space-y-3.5 shadow-md">
              <div className="flex items-center gap-2 text-[#716016] font-bold text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>Prévia de Restauração de Backup</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-[#F3E5C5] rounded-xl border border-[#D6C296]">
                  <span className="text-[#71634D] block text-[10px]">Membros:</span>
                  <strong className="text-sm text-[#302414]">{validationReport.counts.users}</strong>
                </div>
                <div className="p-2 bg-[#F3E5C5] rounded-xl border border-[#D6C296]">
                  <span className="text-[#71634D] block text-[10px]">Pacotes:</span>
                  <strong className="text-sm text-[#302414]">{validationReport.counts.packages}</strong>
                </div>
                <div className="p-2 bg-[#F3E5C5] rounded-xl border border-[#D6C296]">
                  <span className="text-[#71634D] block text-[10px]">Sugestões:</span>
                  <strong className="text-sm text-[#302414]">{validationReport.counts.items}</strong>
                </div>
                <div className="p-2 bg-[#F3E5C5] rounded-xl border border-[#D6C296]">
                  <span className="text-[#71634D] block text-[10px]">Candidaturas:</span>
                  <strong className="text-sm text-[#302414]">{validationReport.counts.solicitacoes}</strong>
                </div>
              </div>

              <div className="text-[11px] text-[#71634D] space-y-1">
                <p><strong>Versão do Formato:</strong> {validationReport.formatVersion} | <strong>Origem:</strong> {validationReport.sourceEnvironment}</p>
                <p><strong>Data de Exportação:</strong> {validationReport.exportedAt}</p>
              </div>

              {validationReport.warnings.length > 0 && (
                <div className="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[11px] space-y-0.5">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Avisos de integridade:</span>
                  </div>
                  {validationReport.warnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                </div>
              )}

              {/* Escolha do modo de restauração */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-xs text-[#302414]">Modo de Aplicação:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                    restoreMode === 'replace' ? 'bg-[#EDE2CA] border-[#48551F] ring-1 ring-[#48551F]' : 'bg-[#FAF4E6] border-[#D6C296]'
                  }`}>
                    <input
                      type="radio"
                      name="restoreMode"
                      value="replace"
                      checked={restoreMode === 'replace'}
                      onChange={() => setRestoreMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="block text-xs text-[#302414]">Substituir com Segurança</strong>
                      <span className="text-[10px] text-[#71634D]">Substitui o banco com o backup validado. Cria cópia prévia automática.</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                    restoreMode === 'merge' ? 'bg-[#EDE2CA] border-[#48551F] ring-1 ring-[#48551F]' : 'bg-[#FAF4E6] border-[#D6C296]'
                  }`}>
                    <input
                      type="radio"
                      name="restoreMode"
                      value="merge"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="block text-xs text-[#302414]">Mesclar Registros</strong>
                      <span className="text-[10px] text-[#71634D]">Preserva registros existentes e adiciona registros faltantes sem perda.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Autorização do Mestre */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-semibold text-[#71634D]">
                  Senha do Mestre para confirmar:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#71634D] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Digite a senha administrativa..."
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8EFE0] border border-[#A7BC8F] text-[#2E4017] text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#48551F]" />
                <span>Um snapshot de segurança completo do banco atual será gerado no servidor antes de aplicar as mudanças.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D6C296]">
                <button
                  type="button"
                  onClick={handleCancelPreview}
                  disabled={isRestoring}
                  className="px-3 py-2 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] font-medium text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring || !validationReport.valid}
                  className="px-4 py-2 rounded-xl bg-[#716016] hover:bg-[#85721a] text-[#F8EDD5] font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{isRestoring ? 'Restaurando com Segurança...' : 'Confirmar e Restaurar Dados'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback de erro ou sucesso */}
          {restoreError && (
            <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{restoreError}</span>
            </div>
          )}

          {restoreSuccessMsg && (
            <div className="p-3 rounded-xl bg-[#dbe6c2] border border-[#8ea259] text-[#354817] text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#48551F]" />
              <span>{restoreSuccessMsg}</span>
            </div>
          )}

          {/* Opção 1: Planilha Completa (Excel / CSV) */}
          <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] hover:border-[#48551F] transition-all space-y-2.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#48551F] shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-sm text-[#302414]">
                  1. Planilha Formatada (Excel / CSV)
                </h3>
                <p className="text-[#71634D] text-[11px] leading-relaxed">
                  Exporta arquivo <strong>.csv</strong> UTF-8 com BOM para visualização em tabelas (membros, sugestões e pacotes de rateio com apoiadores).
                </p>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Planilha Excel (.CSV)</span>
              </button>
            </div>
          </div>

          {/* Opção 2: Backup Total (.JSON) e Restauração Segura */}
          <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] hover:border-[#716016] transition-all space-y-2.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-sm text-[#302414]">
                  2. Backup Total Auditado (.JSON v2.0)
                </h3>
                <p className="text-[#71634D] text-[11px] leading-relaxed">
                  Exporta todos os registros persistentes da Ponte: membros, histórico, solicitações, sugestões com apoiadores, pacotes com cotas, Pix e declarações de pagamento.
                </p>
              </div>
            </div>

            {/* Aviso de Transparência e Limites de Backup */}
            <div className="p-3 bg-[#FAF4E6] border border-[#DDD0B0] rounded-xl text-[11px] text-[#71634D] space-y-1">
              <div className="font-bold text-[#302414] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#716016]" />
                <span>O que este backup inclui e o que é omitido:</span>
              </div>
              <ul className="space-y-0.5 pl-3 list-disc">
                <li>Preserva IDs, relações, pagamentos e histórico de acervo de cada membro.</li>
                <li><strong>Arquivos e Imagens:</strong> Links do Google Drive e capas são referências (URLs), não os arquivos originais.</li>
                <li><strong>Segurança:</strong> Contas do Firebase Auth, senhas e tokens de sessão são estritamente omitidos.</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isValidating || isRestoring}
                  className="px-3 py-1.5 rounded-lg bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-[#302414] text-[11px] flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-60"
                  title="Inspecionar e restaurar dados de um backup .json"
                >
                  {isValidating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#716016]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#716016]" />
                  )}
                  <span>{isValidating ? 'Validando Arquivo...' : 'Inspecionar e Restaurar .json'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportJSON}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl bg-[#716016] hover:bg-[#85721a] text-[#F8EDD5] font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isExporting ? 'Exportando...' : 'Baixar Backup Completo (.JSON)'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
