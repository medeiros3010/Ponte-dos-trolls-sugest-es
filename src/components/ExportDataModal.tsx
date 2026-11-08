import React, { useRef, useState } from 'react';
import { UserProfile, ItemRPG, FundingPackage } from '../types';
import { exportFullDataToCSV, exportFullBackupJSON } from '../utils/helpers';
import { X, Download, FileSpreadsheet, Database, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  items: ItemRPG[];
  packages: FundingPackage[];
  binId: string;
  onRestoreBackup: (backupData: { users?: UserProfile[]; items?: ItemRPG[]; packages?: FundingPackage[] }) => void;
  onToast: (msg: string) => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  users,
  items,
  packages,
  binId,
  onRestoreBackup,
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    exportFullDataToCSV(users, items, packages);
    onToast('Planilha completa CSV baixada com sucesso! Compatível com Excel.');
  };

  const handleExportJSON = () => {
    exportFullBackupJSON(users, items, packages, binId);
    onToast('Arquivo de backup completo JSON baixado com sucesso!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Arquivo JSON inválido.');
        }

        onRestoreBackup(parsed);
        setImportStatus('Backup restaurado com sucesso no sistema!');
        onToast('Backup JSON restaurado com sucesso!');
        setTimeout(() => {
          setImportStatus(null);
          onClose();
        }, 1500);
      } catch (err: any) {
        setImportStatus(`Erro ao importar: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-lg shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Exportar Todos os Dados
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Backup total do grupo: membros, sugestões e pacotes de rateio
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-[#302414]">
          
          <div className="p-3 bg-[#FAF4E6] border border-[#C6AD78] rounded-2xl flex items-center justify-between text-xs text-[#71634D]">
            <div>
              <span className="text-[#302414] font-bold block">Resumo dos Dados Atuais:</span>
              <span>{users.length} membros · {items.length} sugestões · {packages.length} pacotes</span>
            </div>
            <span className="font-mono text-[11px] text-[#48551F] font-bold">Banco: {binId}</span>
          </div>

          {/* Opção 1: Planilha Completa (Excel / CSV) */}
          <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] hover:border-[#48551F] transition-all space-y-2.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#48551F] shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-sm text-[#302414]">
                  1. Exportar Planilha Completa (Excel / CSV)
                </h3>
                <p className="text-[#71634D] text-[11px] leading-relaxed">
                  Arquivo <strong>.csv</strong> formatado em UTF-8 com BOM (acentos perfeitos no Excel). Contém 3 seções completas:
                  <br />• <strong>Seção 1:</strong> Membros cadastrados e pendentes (com status e contato)
                  <br />• <strong>Seção 2:</strong> Sugestões da comunidade e seus apoiadores
                  <br />• <strong>Seção 3:</strong> Pacotes em Financiamento e Catálogo (valores, prazos e cotistas)
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
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

          {/* Opção 2: Backup Total (.JSON) */}
          <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] hover:border-[#716016] transition-all space-y-2.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EADBBE] border border-[#C6AD78] flex items-center justify-center text-[#716016] shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-sm text-[#302414]">
                  2. Exportar Backup Total (.JSON)
                </h3>
                <p className="text-[#71634D] text-[11px] leading-relaxed">
                  Baixa o banco de dados completo em arquivo estruturado <strong>.json</strong>. Permite guardar uma cópia exata ou restaurar dados em caso de emergência.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-[#302414] text-[11px] flex items-center gap-1.5 cursor-pointer font-medium"
                  title="Importar e restaurar dados de um backup .json"
                >
                  <Upload className="w-3.5 h-3.5 text-[#716016]" />
                  <span>Restaurar de arquivo .json</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportJSON}
                className="px-4 py-2 rounded-xl bg-[#716016] hover:bg-[#85721a] text-[#F8EDD5] font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo (.JSON)</span>
              </button>
            </div>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-[#dbe6c2] border border-[#8ea259] text-[#354817] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#48551F] shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

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
