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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#fbbf24]/70 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1c2e1f] to-[#122015] border-b border-[#25462d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#273d2b] border border-[#fbbf24]/50 flex items-center justify-center text-[#fbbf24]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
                Exportar Todos os Dados
              </h2>
              <p className="text-[11px] text-[#8a9d8c]">
                Backup total do grupo: membros, sugestões e pacotes de rateio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a8e7d] hover:text-[#f1ede4] hover:bg-[#1a2f20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          
          <div className="p-3 bg-[#0c150e] border border-[#203625] rounded-2xl flex items-center justify-between text-xs text-[#a4b5a6]">
            <div>
              <span className="text-[#f4ecd8] font-bold block">Resumo dos Dados Atuais:</span>
              <span>{users.length} membros · {items.length} sugestões · {packages.length} pacotes</span>
            </div>
            <span className="font-mono text-[11px] text-[#6ee7b7]">Banco: {binId}</span>
          </div>

          {/* Opção 1: Planilha Completa (Excel / CSV) */}
          <div className="p-4 rounded-2xl bg-[#0e1911] border border-[#2e5035] hover:border-[#34d399] transition-all space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#14321c] border border-[#34d399]/40 flex items-center justify-center text-[#34d399] shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-sm text-[#f4ecd8]">
                  1. Exportar Planilha Completa (Excel / CSV)
                </h3>
                <p className="text-[#8a9d8c] text-[11px] leading-relaxed">
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
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-950 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Planilha Excel (.CSV)</span>
              </button>
            </div>
          </div>

          {/* Opção 2: Backup Total (.JSON) */}
          <div className="p-4 rounded-2xl bg-[#0e1911] border border-[#382b13] hover:border-[#fbbf24] transition-all space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2a220d] border border-[#fbbf24]/40 flex items-center justify-center text-[#fbbf24] shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-sm text-[#f4ecd8]">
                  2. Exportar Backup Total (.JSON)
                </h3>
                <p className="text-[#8a9d8c] text-[11px] leading-relaxed">
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
                  className="px-3 py-1.5 rounded-lg bg-[#19241b] hover:bg-[#203323] border border-[#2e4732] text-[#8a9d8c] hover:text-[#f4ecd8] text-[11px] flex items-center gap-1.5 cursor-pointer"
                  title="Importar e restaurar dados de um backup .json"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restaurar de arquivo .json</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportJSON}
                className="px-4 py-2 rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo (.JSON)</span>
              </button>
            </div>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-[#142918] border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
            >
              Fechar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
