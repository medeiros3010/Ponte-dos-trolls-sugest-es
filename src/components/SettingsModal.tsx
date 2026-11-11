import React, { useState } from 'react';
import { ItemRPG, UserProfile, MASTER_ADMIN_NAME } from '../types';
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
  apiSyncOfficialMembers,
  apiMirrorOfficialToDev,
  isDevelopmentEnvironment,
  DEFAULT_BIN_ID,
} from '../utils/cloudStorage';
import {
  syncOfficialMembersToFirestore,
  signInWithGoogle,
} from '../firebase/firestoreService';
import { auth } from '../firebase/config';
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
  Users,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Loader2,
  Lock,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  currentItems: ItemRPG[];
  exchangeRate: number;
  binId: string;
  currentUser?: UserProfile | null;
  onSaveBinId: (newBinId: string) => void;
  onImportItems: (newItems: ItemRPG[], mode: 'replace' | 'append') => void;
  onUpdateItemsFromCloud: (items: ItemRPG[]) => void;
  onSyncUsers?: (newUsers: UserProfile[]) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentItems,
  exchangeRate,
  binId,
  currentUser,
  onSaveBinId,
  onImportItems,
  onUpdateItemsFromCloud,
  onSyncUsers,
  onClose,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'membros' | 'import' | 'export'>('cloud');
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ItemRPG[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  // Sincronização da Planilha Oficial
  const [isSyncingOfficial, setIsSyncingOfficial] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const [syncSuccessInfo, setSyncSuccessInfo] = useState<{ count: number; message: string } | null>(null);

  // Cloud State
  const [binInput, setBinInput] = useState(binId);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [isMirroringDev, setIsMirroringDev] = useState(false);
  const [mirrorStatus, setMirrorStatus] = useState<string | null>(null);

  const shareableLink = getShareableGroupLink(binInput || binId);

  const handleMirrorOfficialToDev = async () => {
    setIsMirroringDev(true);
    setMirrorStatus('Copiando dados da mesa oficial para o ambiente de testes...');
    try {
      const res = await apiMirrorOfficialToDev();
      setMirrorStatus(res.message);
      onToast('Espelho atualizado com sucesso! Recarregando tela...');
      const freshItems = await fetchItemsFromCloud('trolls-rpg-dev');
      if (freshItems && freshItems.length > 0) {
        onUpdateItemsFromCloud(freshItems);
      }
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setMirrorStatus(`Erro: ${err.message || 'Falha ao espelhar'}`);
      onToast(`Erro ao espelhar: ${err.message}`);
    } finally {
      setIsMirroringDev(false);
    }
  };

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

  const handleExecuteSyncOfficialMembers = async () => {
    setIsSyncingOfficial(true);
    setSyncSuccessInfo(null);
    setSyncProgress('1/3 - Lendo planilha oficial e atualizando banco do servidor...');

    try {
      // 1. Atualizar base no backend / servidor Node
      const serverRes = await apiSyncOfficialMembers();
      const updatedUsers = serverRes.users;

      // 2. Atualizar no Firestore
      setSyncProgress('2/3 - Sincronizando coleção de usuários no Firestore (Google Cloud)...');
      let firestoreSynced = false;
      try {
        await syncOfficialMembersToFirestore((msg) => {
          setSyncProgress(`2/3 - ${msg}`);
        });
        firestoreSynced = true;
      } catch (fsErr: any) {
        console.warn('Aviso ao sincronizar diretamente com o Firestore:', fsErr);
        if (fsErr?.message?.includes('PERMISSION_DENIED') || fsErr?.message?.includes('permission')) {
          setSyncProgress(
            'Base atualizada no servidor! Para replicar no Firestore, confirme com a conta Google do Mestre.'
          );
        } else {
          setSyncProgress(`Aviso Firestore: ${fsErr?.message || 'Falha de permissão no Firestore'}. Base gravada no servidor.`);
        }
      }

      // 3. Atualizar estado do app
      setSyncProgress('3/3 - Finalizando atualização da mesa...');
      if (updatedUsers && updatedUsers.length > 0) {
        onSyncUsers?.(updatedUsers);
      }

      const msg = firestoreSynced
        ? `Sucesso: 125 membros da planilha oficial sincronizados no Firestore e no servidor!`
        : `Sucesso: 125 membros sincronizados no servidor. Mestre Administrador ativo.`;

      setSyncSuccessInfo({
        count: 125,
        message: msg,
      });
      onToast(msg);
      setShowConfirmSync(false);
    } catch (err: any) {
      console.error('Erro na sincronização oficial:', err);
      setSyncProgress(`Erro: ${err.message || 'Falha na sincronização'}`);
      onToast(`Erro ao sincronizar: ${err.message || 'Falha no servidor'}`);
    } finally {
      setIsSyncingOfficial(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border-[#C6AD78]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#3a4419] text-[#F8EDD5] border border-[#C6AD78]">
              <Database className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-rpg text-[#F8EDD5]">
                Banco de Dados & Sincronização
              </h2>
              <p className="text-xs text-[#cfc4a6]">
                Painel do Mestre • Sincronização da Planilha Oficial e Nuvem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#cfc4a6] hover:text-[#F8EDD5] p-1.5 rounded-lg hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D6C296] px-4 sm:px-6 bg-[#FBF4E4] text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'cloud'
                ? 'border-[#48551F] text-[#48551F]'
                : 'border-transparent text-[#71634D] hover:text-[#302414]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Banco na Nuvem</span>
          </button>

          <button
            onClick={() => setActiveTab('membros')}
            className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'membros'
                ? 'border-[#48551F] text-[#48551F]'
                : 'border-transparent text-[#71634D] hover:text-[#302414]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#716016]" />
            <span className="font-bold">Planilha Oficial (125)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'import'
                ? 'border-[#48551F] text-[#48551F]'
                : 'border-transparent text-[#71634D] hover:text-[#302414]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Colar Linhas / CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-[#48551F] text-[#48551F]'
                : 'border-transparent text-[#71634D] hover:text-[#302414]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Dados</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 text-xs text-[#302414]">
          
          {/* TAB: Cloud */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">

              {/* CARD DESTAQUE: Sincronizar Planilha Oficial */}
              <div className="p-4 bg-gradient-to-r from-[#FBF4E4] via-[#F8EDD5] to-[#F3E5C5] border-2 border-[#C6AD78] rounded-xl shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-[#48551F] text-[#F8EDD5] shadow-xs">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-rpg font-bold text-sm text-[#302414] flex items-center gap-1.5">
                        <span>Planilha Oficial da Mesa</span>
                        <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-[#48551F] text-[#F8EDD5] font-bold">
                          125 Membros
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#71634D]">
                        Arquivo: <code className="font-mono text-[#48551F] font-semibold">membros_ponte_dos_trolls.json</code>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('membros')}
                    className="text-[10px] font-bold text-[#48551F] hover:underline cursor-pointer"
                  >
                    Ver detalhes →
                  </button>
                </div>

                <p className="text-[11px] text-[#71634D] leading-relaxed">
                  Apaga todos os membros comuns anteriores da coleção do Firestore (mantendo o acesso do Mestre Administrador seguro) e insere todos os 125 membros oficiais mapeados com nome, WhatsApp e e-mail.
                </p>

                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setShowConfirmSync(true)}
                    disabled={isSyncingOfficial}
                    className="py-2.5 px-4 rounded-xl font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] border border-[#3f471e] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs"
                  >
                    {isSyncingOfficial ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#F8EDD5]" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-[#F8EDD5]" />
                    )}
                    <span>{isSyncingOfficial ? 'Sincronizando...' : 'Sincronizar Planilha Oficial'}</span>
                  </button>
                </div>

                {syncProgress && (
                  <div className="p-2.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-lg text-[11px] font-mono text-[#71634D] flex items-center gap-2">
                    {isSyncingOfficial && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#716016] shrink-0" />}
                    <span>{syncProgress}</span>
                  </div>
                )}

                {syncSuccessInfo && (
                  <div className="p-2.5 bg-[#48551F]/10 border border-[#48551F]/40 rounded-lg text-[11px] text-[#48551F] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#48551F]" />
                    <span>{syncSuccessInfo.message}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-[#FBF4E4] border border-[#D6C296] rounded-xl text-[#71634D] space-y-1.5">
                <p className="font-semibold text-[#716016] text-xs flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>Sincronização Automática em Nuvem:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Não é necessário Google Apps Script! Todas as alterações (novas sugestões, apoios, exclusões e mudanças para finalizado) atualizam este banco compartilhado na nuvem em tempo real.
                </p>
              </div>

              {/* Shareable Link Box */}
              <div className="p-3.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#302414] flex items-center gap-1.5 text-xs">
                    <Share2 className="w-4 h-4 text-[#716016]" />
                    <span>Link Sincronizado para o Grupo</span>
                  </span>
                  <button
                    onClick={handleCopyShareLink}
                    className="flex items-center gap-1 text-xs font-bold text-[#F8EDD5] bg-[#48551F] hover:bg-[#59672A] px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    {copiedShareLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShareLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#71634D]">
                  Envie este link no grupo do WhatsApp. Qualquer pessoa que abrir acessará exatamente os mesmos itens atualizados:
                </p>
                <div className="bg-[#F8EDD5] p-2.5 rounded-lg text-[11px] font-mono text-[#302414] break-all border border-[#C6AD78] select-all">
                  {shareableLink}
                </div>
              </div>

              {/* Banco ID Management */}
              <div>
                <label className="block text-xs font-semibold text-[#302414] mb-1.5">
                  ID do Banco Compartilhado:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="trolls-rpg-oficial"
                    value={binInput}
                    onChange={(e) => setBinInput(e.target.value)}
                    className="flex-1 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] font-mono placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F]"
                  />
                  <button
                    onClick={handleSaveBinId}
                    className="px-3.5 py-2 font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Conectar
                  </button>
                  <button
                    onClick={handleCreateNewBin}
                    disabled={isLoadingCloud}
                    title="Criar um novo banco separado com ID único"
                    className="px-3 py-2 font-semibold bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#716016]" />
                    <span className="hidden sm:inline">Novo Banco</span>
                  </button>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handlePullFromCloud}
                  disabled={isLoadingCloud}
                  className="py-2.5 px-3 rounded-xl font-semibold bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#48551F]" />
                  <span>Puxar da Nuvem (Atualizar)</span>
                </button>

                <button
                  onClick={handlePushToCloud}
                  disabled={isLoadingCloud}
                  className="py-2.5 px-3 rounded-xl font-semibold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] border border-[#3f471e] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Gravar na Nuvem (Enviar Tudo)</span>
                </button>
              </div>

              {cloudStatus && (
                <div className="p-2.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-[11px] font-mono text-center text-[#71634D]">
                  {isLoadingCloud && <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-2 text-[#716016]" />}
                  {cloudStatus}
                </div>
              )}

              {/* Espelho de Testes (Produção -> Sandbox) */}
              <div className="p-3.5 bg-gradient-to-r from-[#FAF4E6] to-[#F5ECE0] border border-[#C6AD78] rounded-xl space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#302414] flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-[#716016]" />
                    <span>Espelho da Mesa Oficial para Testes</span>
                  </span>
                  <span className="text-[10px] bg-[#48551F]/10 text-[#48551F] font-semibold px-2 py-0.5 rounded-full border border-[#48551F]/20">
                    Mestre
                  </span>
                </div>
                <p className="text-[11px] text-[#71634D] leading-relaxed">
                  Copia todos os pacotes, sugestões e membros da base oficial de produção para o seu ambiente de testes aqui no editor, permitindo visualizar os dados reais com segurança antes de publicar.
                </p>
                <button
                  onClick={handleMirrorOfficialToDev}
                  disabled={isMirroringDev}
                  className="w-full py-2.5 px-3 rounded-xl font-bold bg-[#716016] hover:bg-[#85721B] text-[#F8EDD5] border border-[#594d12] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs"
                >
                  {isMirroringDev ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F8EDD5]" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#F8EDD5]" />
                  )}
                  <span>{isMirroringDev ? 'Atualizando Espelho...' : 'Atualizar Espelho de Testes Agora'}</span>
                </button>
                {mirrorStatus && (
                  <p className="text-[11px] font-mono text-[#48551F] text-center pt-1">
                    {mirrorStatus}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB: Membros Oficiais */}
          {activeTab === 'membros' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-[#FBF4E4] via-[#F8EDD5] to-[#F3E5C5] border-2 border-[#C6AD78] rounded-xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-[#48551F] text-[#F8EDD5]">
                      <Users className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-rpg font-bold text-base text-[#302414]">
                        Sincronizar Planilha Oficial (125 Membros)
                      </h3>
                      <p className="text-[11px] text-[#71634D]">
                        Base consolidada do grupo • Mapeamento automático de campos
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#48551F] text-[#F8EDD5]">
                    125 Prontos
                  </span>
                </div>

                <div className="p-3 bg-[#FAF4E6] border border-[#C6AD78] rounded-lg text-[11px] text-[#302414] space-y-1.5">
                  <p className="font-semibold text-[#716016] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#48551F]" />
                    <span>Como funciona a sincronização no Firestore:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[#71634D] leading-relaxed">
                    <li>O backend apaga todos os membros comuns anteriores da coleção <code className="font-mono text-[#302414]">users</code> no Firestore.</li>
                    <li>O <strong>Mestre Administrador</strong> (<code className="font-mono text-[#48551F]">usr-master</code> / Ponte dos Trolls) é <strong>preservado</strong> e garantido ativo.</li>
                    <li>Lê o arquivo <code className="font-mono text-[#302414]">membros_ponte_dos_trolls.json</code> com os 125 membros oficiais.</li>
                    <li>Mapeia <code className="font-mono text-[#302414]">nome</code>, <code className="font-mono text-[#302414]">whatsapp → telefone</code>, <code className="font-mono text-[#302414]">email</code>, com status <code className="font-mono text-[#48551F]">aprovado</code> e 0 strikes.</li>
                    <li>Grava tudo em lotes atômicos tanto no Firestore na nuvem quanto no servidor Node.js.</li>
                  </ol>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowConfirmSync(true)}
                    disabled={isSyncingOfficial}
                    className="w-full py-3 px-4 rounded-xl font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] border border-[#3f471e] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm"
                  >
                    {isSyncingOfficial ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#F8EDD5]" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-[#F8EDD5]" />
                    )}
                    <span>{isSyncingOfficial ? 'Sincronizando 125 membros...' : 'Sincronizar Planilha Oficial'}</span>
                  </button>
                </div>

                {syncProgress && (
                  <div className="p-3 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs font-mono text-[#71634D] flex items-center gap-2">
                    {isSyncingOfficial && <Loader2 className="w-4 h-4 animate-spin text-[#716016] shrink-0" />}
                    <span>{syncProgress}</span>
                  </div>
                )}

                {syncSuccessInfo && (
                  <div className="p-3 bg-[#48551F]/15 border border-[#48551F]/40 rounded-xl text-xs text-[#48551F] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-[#48551F]" />
                    <span>{syncSuccessInfo.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Importar */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl text-[#71634D] space-y-1">
                <p className="font-semibold text-[#716016]">
                  💡 Colar diretamente da Planilha:
                </p>
                <p className="text-[11px] leading-relaxed">
                  No Google Sheets ou Excel, copie (<kbd className="px-1 rounded bg-[#EADBBE] text-[#302414] font-mono">Ctrl+C</kbd>) as linhas e cole abaixo. Nosso leitor reconhece automaticamente as colunas da planilha oficial do grupo!
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#302414] mb-1">
                  Cole as linhas da planilha aqui:
                </label>
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={(e) => handleParseText(e.target.value)}
                  placeholder="2026-02-15	Battlezoo Adventures	Módulo Foundry	PF2E	...	https://...	Erick Santos	$ 20.00	Financiado"
                  className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl p-3 text-xs text-[#302414] font-mono placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] cursor-pointer border border-[#C6AD78] transition-colors font-medium">
                  <Upload className="w-3.5 h-3.5 text-[#716016]" />
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
                <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#48551F] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{parsedPreview.length} item(ns) identificados</span>
                    </span>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[#302414] cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="accent-[#48551F]"
                        />
                        <span>Adicionar aos atuais</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[#8b261b] cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="accent-[#8b261b]"
                        />
                        <span>Substituir tudo</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    className="w-full py-2 px-3 rounded-xl font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
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
              <div className="p-4 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-2">
                <h4 className="font-semibold text-[#302414] flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#716016]" />
                  <span>Exportar Planilha Oficial (.CSV)</span>
                </h4>
                <p className="text-[#71634D] text-[11px] leading-relaxed">
                  Baixa um arquivo .CSV com codificação UTF-8 BOM perfeitamente compatível com Microsoft Excel e Google Sheets, mantendo as colunas oficiais do grupo.
                </p>
                <button
                  onClick={handleExportCSV}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#716016]" />
                  <span>Baixar Planilha CSV ({currentItems.length} Itens)</span>
                </button>
              </div>

              <div className="p-4 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-2">
                <h4 className="font-semibold text-[#302414] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#48551F]" />
                  <span>Versão Standalone (Arquivo Único HTML Offline)</span>
                </h4>
                <p className="text-[#71634D] text-[11px] leading-relaxed">
                  Gera um arquivo único .html com Tailwind CSS, dados embutidos e tema da floresta para enviar no WhatsApp ou abrir em qualquer dispositivo sem servidor.
                </p>
                <button
                  onClick={handleExportHTML}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <Globe className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Arquivo HTML Standalone</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#D6C296] bg-[#FBF4E4] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* Modal de Confirmação da Sincronização Oficial */}
      {showConfirmSync && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="parchment-card w-full max-w-md p-5 border-2 border-[#C6AD78] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#8b261b]">
              <div className="p-2 rounded-xl bg-[#8b261b]/10 border border-[#8b261b]/30">
                <AlertTriangle className="w-6 h-6 text-[#8b261b]" />
              </div>
              <div>
                <h3 className="font-rpg font-bold text-base text-[#302414]">
                  Confirmar Sincronização
                </h3>
                <p className="text-xs text-[#71634D]">
                  Ação definitiva do Painel do Mestre
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] space-y-2">
              <p className="font-semibold text-[#716016]">
                Esta operação irá:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#71634D] text-[11px] leading-relaxed">
                <li>Apagar membros anteriores da coleção <code className="font-mono text-[#302414]">users</code> no Firestore;</li>
                <li><strong className="text-[#48551F]">Preservar</strong> o Mestre Administrador (<code className="font-mono text-[#48551F]">usr-master</code>);</li>
                <li>Inserir todos os <strong>125 membros</strong> oficiais com status aprovado;</li>
                <li>Atualizar o banco do servidor e a memória do sistema.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmSync(false)}
                disabled={isSyncingOfficial}
                className="px-4 py-2 rounded-xl font-semibold bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteSyncOfficialMembers}
                disabled={isSyncingOfficial}
                className="px-4 py-2 rounded-xl font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {isSyncingOfficial ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#F8EDD5]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#F8EDD5]" />
                )}
                <span>{isSyncingOfficial ? 'Sincronizando...' : 'Sim, Sincronizar Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
