import React, { useState } from 'react';
import { ItemRPG } from '../types';
import {
  parseSpreadsheetText,
  exportToCSV,
  exportStandaloneHTML,
} from '../utils/helpers';
import {
  getShareableGroupLink,
  fetchItemsFromCloud,
  pushItemsToCloud,
  createNewCloudBin,
  DEFAULT_BIN_ID,
} from '../utils/cloudStorage';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Cloud,
  Copy,
  Check,
  CheckCircle2,
  Globe,
  Share2,
  RefreshCw,
  Database,
  PlusCircle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  currentItems: ItemRPG[];
  exchangeRate: number;
  binId: string;
  onSaveBinId: (newBinId: string) => void;
  onImportItems: (newItems: ItemRPG[], mode: 'replace' | 'append') => void;
  onUpdateItemsFromCloud: (items: ItemRPG[]) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentItems,
  exchangeRate,
  binId,
  onSaveBinId,
  onImportItems,
  onUpdateItemsFromCloud,
  onClose,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'import' | 'export'>('cloud');
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ItemRPG[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  // Cloud State
  const [binInput, setBinInput] = useState(binId);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);

  const shareableLink = getShareableGroupLink(binInput || binId);

  const handleParseText = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }
    const parsed = parseSpreadsheetText(text);
    setParsedPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseText(content);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportItems(parsedPreview, importMode);
    onToast(
      importMode === 'replace'
        ? `${parsedPreview.length} itens importados (base substituída)!`
        : `${parsedPreview.length} itens adicionados ao catálogo!`
    );
    setPastedText('');
    setParsedPreview([]);
    onClose();
  };

  const handleExportCSV = () => {
    exportToCSV(currentItems);
    onToast(`Exportado arquivo CSV com ${currentItems.length} itens!`);
  };

  const handleExportHTML = () => {
    exportStandaloneHTML(currentItems, exchangeRate);
    onToast(`Arquivo HTML standalone gerado com sucesso!`);
  };

  const handleCopyShareLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
    onToast('Link com banco compartilhado copiado! Envie no WhatsApp.');
  };

  const handleSaveBinId = () => {
    const clean = binInput.trim() || DEFAULT_BIN_ID;
    onSaveBinId(clean);
    onToast(`Conectado ao banco: ${clean}`);
  };

  const handleCreateNewBin = async () => {
    setIsLoadingCloud(true);
    setCloudStatus('Criando novo banco na nuvem...');
    try {
      const newId = await createNewCloudBin(currentItems);
      if (newId) {
        setBinInput(newId);
        onSaveBinId(newId);
        setCloudStatus(`Novo banco criado com sucesso: ${newId}`);
        onToast(`Novo banco criado: ${newId}! Link de compartilhamento atualizado.`);
      } else {
        throw new Error('Falha ao gerar ID do banco');
      }
    } catch (err: any) {
      setCloudStatus(`Erro ao criar banco: ${err.message || 'Falha na conexão'}`);
      onToast('Erro ao criar novo banco.');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handlePullFromCloud = async () => {
    const targetBin = binInput.trim() || binId;
    setIsLoadingCloud(true);
    setCloudStatus(`Carregando dados do banco ${targetBin}...`);
    try {
      const loaded = await fetchItemsFromCloud(targetBin);
      if (loaded && loaded.length > 0) {
        onUpdateItemsFromCloud(loaded);
        onToast(`Sincronizados ${loaded.length} itens do banco na nuvem!`);
        setCloudStatus(`Sucesso: ${loaded.length} itens carregados da nuvem.`);
      } else {
        setCloudStatus('O banco respondeu, mas não contém itens cadastrados.');
        onToast('Banco vazio ou sem novos dados.');
      }
    } catch (err: any) {
      console.error(err);
      setCloudStatus(`Erro ao carregar: ${err.message || 'Verifique sua conexão'}`);
      onToast('Erro ao sincronizar com o banco.');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handlePushToCloud = async () => {
    const targetBin = binInput.trim() || binId;
    setIsLoadingCloud(true);
    setCloudStatus(`Gravando ${currentItems.length} itens no banco ${targetBin}...`);
    try {
      const ok = await pushItemsToCloud(targetBin, currentItems);
      if (ok) {
        onToast(`Banco na nuvem atualizado com ${currentItems.length} itens!`);
        setCloudStatus(`Sucesso: Catálogo sincronizado com todos os membros.`);
      } else {
        throw new Error('Servidor retornou erro ao gravar');
      }
    } catch (err: any) {
      console.error(err);
      setCloudStatus(`Erro ao gravar: ${err.message || 'Falha de conexão'}`);
      onToast('Erro ao gravar no banco.');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#122015] border border-[#233a29] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f3524] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#182b1d] text-[#d49e2a] border border-[#28462f]">
              <Database className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#f4ecd8]">
                Banco de Dados & Sincronização
              </h2>
              <p className="text-xs text-[#8a9d8c]">
                Banco JSON automático e compartilhado com o grupo do WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#738776] hover:text-[#f3efe6] p-1.5 rounded-lg hover:bg-[#192c1d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1f3524] px-4 sm:px-6 bg-[#0e1710]/50 text-xs">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'cloud'
                ? 'border-[#d49e2a] text-[#d49e2a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f3efe6]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Banco na Nuvem (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'import'
                ? 'border-[#d49e2a] text-[#d49e2a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f3efe6]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Colar Linhas / CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'export'
                ? 'border-[#d49e2a] text-[#d49e2a]'
                : 'border-transparent text-[#7a8e7d] hover:text-[#f3efe6]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Dados</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 text-xs">
          
          {/* TAB: Cloud */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#0d160f] border border-[#1e3422] rounded-xl text-[#9cb09e] space-y-1.5">
                <p className="font-semibold text-[#d49e2a] text-xs flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>Sincronização Automática em Nuvem:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Não é necessário Google Apps Script! Todas as alterações (novas sugestões, apoios, exclusões e mudanças para finalizado) atualizam este banco compartilhado na nuvem em tempo real.
                </p>
              </div>

              {/* Shareable Link Box */}
              <div className="p-3.5 bg-[#16271a] border border-[#2e5035] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#f4ecd8] flex items-center gap-1.5 text-xs">
                    <Share2 className="w-4 h-4 text-[#d49e2a]" />
                    <span>Link Sincronizado para o Grupo</span>
                  </span>
                  <button
                    onClick={handleCopyShareLink}
                    className="flex items-center gap-1 text-xs font-bold text-[#122015] bg-[#d49e2a] hover:bg-[#e5b23d] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    {copiedShareLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShareLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#8e9f90]">
                  Envie este link no grupo do WhatsApp. Qualquer pessoa que abrir acessará exatamente os mesmos itens atualizados:
                </p>
                <div className="bg-[#0c150e] p-2.5 rounded-lg text-[11px] font-mono text-[#a4b5a6] break-all border border-[#1f3524] select-all">
                  {shareableLink}
                </div>
              </div>

              {/* Banco ID Management */}
              <div>
                <label className="block text-xs font-semibold text-[#c2cbbe] mb-1.5">
                  ID do Banco Compartilhado:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="trolls-rpg-oficial"
                    value={binInput}
                    onChange={(e) => setBinInput(e.target.value)}
                    className="flex-1 bg-[#0d160f] border border-[#1e3422] rounded-xl px-3 py-2 text-xs text-[#f3efe6] font-mono placeholder-[#506352] focus:outline-none focus:border-[#d49e2a]"
                  />
                  <button
                    onClick={handleSaveBinId}
                    className="px-3.5 py-2 font-bold bg-[#1b2f20] hover:bg-[#233f2a] text-[#d49e2a] border border-[#2b4d33] rounded-xl transition-colors whitespace-nowrap"
                  >
                    Conectar
                  </button>
                  <button
                    onClick={handleCreateNewBin}
                    disabled={isLoadingCloud}
                    title="Criar um novo banco separado com ID único"
                    className="px-3 py-2 font-semibold bg-[#16271a] hover:bg-[#1f3524] text-[#a4b5a6] hover:text-[#f4ecd8] border border-[#25462d] rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#d49e2a]" />
                    <span className="hidden sm:inline">Novo Banco</span>
                  </button>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handlePullFromCloud}
                  disabled={isLoadingCloud}
                  className="py-2.5 px-3 rounded-xl font-semibold bg-[#16271a] hover:bg-[#1e3422] text-[#52c27c] border border-[#25462d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Puxar da Nuvem (Atualizar)</span>
                </button>

                <button
                  onClick={handlePushToCloud}
                  disabled={isLoadingCloud}
                  className="py-2.5 px-3 rounded-xl font-semibold bg-[#16271a] hover:bg-[#1e3422] text-[#d49e2a] border border-[#25462d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Gravar na Nuvem (Enviar Tudo)</span>
                </button>
              </div>

              {cloudStatus && (
                <div className="p-2.5 bg-[#0d160f] border border-[#1e3422] rounded-xl text-[11px] font-mono text-center text-[#c2cbbe]">
                  {isLoadingCloud && <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-2 text-[#d49e2a]" />}
                  {cloudStatus}
                </div>
              )}
            </div>
          )}

          {/* TAB: Importar */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0d160f] border border-[#1e3422] rounded-xl text-[#a4b5a6] space-y-1">
                <p className="font-semibold text-[#d49e2a]">
                  💡 Colar diretamente da Planilha:
                </p>
                <p className="text-[11px] leading-relaxed">
                  No Google Sheets ou Excel, copie (<kbd className="px-1 rounded bg-[#182b1d] text-[#f4ecd8] font-mono">Ctrl+C</kbd>) as linhas e cole abaixo. Nosso leitor reconhece automaticamente as colunas da planilha oficial do grupo!
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c2cbbe] mb-1">
                  Cole as linhas da planilha aqui:
                </label>
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={(e) => handleParseText(e.target.value)}
                  placeholder="2026-02-15	Battlezoo Adventures	Módulo Foundry	PF2E	...	https://...	Erick Santos	$ 20.00	Financiado"
                  className="w-full bg-[#0d160f] border border-[#1e3422] rounded-xl p-3 text-xs text-[#f3efe6] font-mono placeholder-[#506352] focus:outline-none focus:border-[#d49e2a]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#182b1d] hover:bg-[#203a27] text-[#c2cbbe] hover:text-white cursor-pointer border border-[#27442d] transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#d49e2a]" />
                  <span>Ou selecione arquivo (.CSV / .TSV)</span>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {parsedPreview.length > 0 && (
                <div className="p-3 rounded-xl bg-[#0d160f] border border-[#27442d] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#43aa6a] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{parsedPreview.length} item(ns) identificados</span>
                    </span>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[#a4b5a6] cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="accent-[#d49e2a]"
                        />
                        <span>Adicionar aos atuais</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[#e06c75] cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="accent-[#e06c75]"
                        />
                        <span>Substituir tudo</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    className="w-full py-2 px-3 rounded-xl font-bold bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirmar Importação</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Exportar */}
          {activeTab === 'export' && (
            <div className="space-y-4 py-1">
              <div className="p-4 bg-[#0d160f] border border-[#1e3422] rounded-xl space-y-2">
                <h4 className="font-semibold text-[#f4ecd8] flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#d49e2a]" />
                  <span>Exportar Planilha Oficial (.CSV)</span>
                </h4>
                <p className="text-[#8e9f90] text-[11px] leading-relaxed">
                  Baixa um arquivo .CSV com codificação UTF-8 BOM perfeitamente compatível com Microsoft Excel e Google Sheets, mantendo as colunas oficiais do grupo.
                </p>
                <button
                  onClick={handleExportCSV}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold bg-[#1b2f20] hover:bg-[#233f2a] text-[#f4ecd8] border border-[#2b4d33] flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#d49e2a]" />
                  <span>Baixar Planilha CSV ({currentItems.length} Itens)</span>
                </button>
              </div>

              <div className="p-4 bg-[#0d160f] border border-[#1e3422] rounded-xl space-y-2">
                <h4 className="font-semibold text-[#f4ecd8] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#43aa6a]" />
                  <span>Versão Standalone (Arquivo Único HTML Offline)</span>
                </h4>
                <p className="text-[#8e9f90] text-[11px] leading-relaxed">
                  Gera um arquivo único .html com Tailwind CSS, dados embutidos e tema da floresta para enviar no WhatsApp ou abrir em qualquer dispositivo sem servidor.
                </p>
                <button
                  onClick={handleExportHTML}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Globe className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Arquivo HTML Standalone</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1f3524] bg-[#0e1710]/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#c2cbbe] hover:text-[#f4ecd8] bg-[#16271a] hover:bg-[#1e3422] transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
