import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FundingPackage, PackageSubItem, ProductType, OFFICIAL_PRODUCT_TYPES, SISTEMAS_PADRAO, ADMIN_PASSWORD } from '../types';
import { X, Layers, Plus, Trash2, KeyRound, DollarSign, Calendar, Users, ExternalLink, Image as ImageIcon, Upload, FolderCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { uploadImageFile } from '../utils/cloudStorage';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkgData: Omit<FundingPackage, 'id' | 'criadoEm'> & { id?: string }) => Promise<any> | void;
  existingPackage?: FundingPackage | null;
  onToast: (msg: string) => void;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPackage,
  onToast,
}) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<ProductType>('Material para VTT');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [linkDrive, setLinkDrive] = useState('');

  const [itens, setItens] = useState<PackageSubItem[]>([]);
  
  // Item builder fields
  const [subNome, setSubNome] = useState('');
  const [subSistema, setSubSistema] = useState('Foundry VTT Geral');
  const [subTipo, setSubTipo] = useState<ProductType>('Material para VTT');
  const [subLink, setSubLink] = useState('');
  const [subPreco, setSubPreco] = useState('');
  const [subImageUrl, setSubImageUrl] = useState('');
  const [isUploadingSubImage, setIsUploadingSubImage] = useState(false);

  // Rules and dates
  const [dataFinalizar, setDataFinalizar] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [minimoParticipantes, setMinimoParticipantes] = useState<number>(35);
  const [valorCatalogoBRL, setValorCatalogoBRL] = useState<string>('');

  const [adminPassword, setAdminPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field element references for auto-focusing on validation failure
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subNomeInputRef = useRef<HTMLInputElement>(null);
  const subPrecoInputRef = useRef<HTMLInputElement>(null);
  const minimoParticipantesInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const itemsSectionRef = useRef<HTMLDivElement>(null);

  // Auto-calculated total price from items
  const valorTotalBRL = useMemo(() => {
    return itens.reduce((acc, it) => acc + (it.precoBRL || 0), 0);
  }, [itens]);

  // Max value per person: valorTotalBRL / minimoParticipantes
  const valorMaximoPorPessoa = useMemo(() => {
    const min = minimoParticipantes > 0 ? minimoParticipantes : 1;
    return valorTotalBRL / min;
  }, [valorTotalBRL, minimoParticipantes]);

  useEffect(() => {
    if (existingPackage) {
      setTitulo(existingPackage.titulo || '');
      setDescricao(existingPackage.descricao || '');
      setTipo(existingPackage.tipo || 'Material para VTT');
      setImageUrl(existingPackage.imageUrl || '');
      setLinkDrive(existingPackage.linkDrive || '');
      setItens(
        existingPackage.itens && existingPackage.itens.length > 0
          ? existingPackage.itens
          : (existingPackage.itensInclusos || []).map((nome, idx) => ({
              id: `item-${idx}`,
              nome,
              sistema: existingPackage.sistema || 'Foundry VTT Geral',
              tipo: existingPackage.tipo || 'Material para VTT',
              link: existingPackage.linkLoja || '',
              precoBRL: existingPackage.valorTotalBRL / ((existingPackage.itensInclusos || []).length || 1),
            }))
      );
      setDataFinalizar(existingPackage.dataFinalizar || '');
      setDataPagamento(existingPackage.dataPagamento || '');
      setMinimoParticipantes(existingPackage.minimoParticipantes || 35);
      setValorCatalogoBRL(
        existingPackage.valorCatalogoBRL !== undefined
          ? existingPackage.valorCatalogoBRL.toString()
          : (existingPackage.valorTotalBRL * 1.2).toFixed(2)
      );
    } else {
      setTitulo('');
      setDescricao('');
      setTipo('Material para VTT');
      setImageUrl('');
      setLinkDrive('');
      setItens([]);
      const d1 = new Date();
      d1.setDate(d1.getDate() + 15);
      const d2 = new Date();
      d2.setDate(d2.getDate() + 20);
      setDataFinalizar(d1.toISOString().split('T')[0]);
      setDataPagamento(d2.toISOString().split('T')[0]);
      setMinimoParticipantes(35);
      setValorCatalogoBRL('');
    }
    setSubNome('');
    setSubSistema('Foundry VTT Geral');
    setSubTipo('Material para VTT');
    setSubLink('');
    setSubPreco('');
    setSubImageUrl('');
    setAdminPassword('');
    setErrorMsg('');
    setFieldErrors({});
    setIsSubmitting(false);
  }, [existingPackage, isOpen]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCover(true);
      setErrorMsg('');
      const res = await uploadImageFile(file);
      if (res?.url) {
        setImageUrl(res.url);
        onToast('Imagem de capa enviada com sucesso!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar imagem');
    } finally {
      setIsUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleAddSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors((prev) => ({ ...prev, subItem: '', itens: '' }));

    if (!subNome.trim()) {
      setFieldErrors((prev) => ({ ...prev, subItem: 'Informe o nome do item a ser incluído.' }));
      subNomeInputRef.current?.focus();
      return;
    }

    const cleanPreco = subPreco.replace(',', '.').trim();
    const preco = parseFloat(cleanPreco);
    if (isNaN(preco) || preco < 0) {
      setFieldErrors((prev) => ({ ...prev, subItem: 'Informe um valor numérico válido para o item (ex: 29.90).' }));
      subPrecoInputRef.current?.focus();
      return;
    }

    const newItem: PackageSubItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      nome: subNome.trim(),
      sistema: subSistema,
      tipo: subTipo,
      link: subLink.trim(),
      precoBRL: preco,
      imageUrl: subImageUrl.trim() || undefined,
    };

    setItens((prev) => [...prev, newItem]);
    setSubNome('');
    setSubLink('');
    setSubPreco('');
    setSubImageUrl('');
    setErrorMsg('');
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.itens;
      delete next.subItem;
      return next;
    });
    onToast(`Item "${newItem.nome}" adicionado à lista.`);
  };

  const handleRemoveSubItem = (id: string) => {
    setItens((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    const errors: Record<string, string> = {};

    // 1. Validação do Título
    if (!titulo.trim()) {
      errors.titulo = 'O nome do pacote é obrigatório.';
    }

    // 2. Incorporação automática de item em digitação e validação da lista de itens
    let finalItens = [...itens];
    if (subNome.trim()) {
      const cleanSubPreco = subPreco.replace(',', '.').trim();
      const parsedSubPreco = parseFloat(cleanSubPreco);
      if (!isNaN(parsedSubPreco) && parsedSubPreco >= 0) {
        const autoItem: PackageSubItem = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          nome: subNome.trim(),
          sistema: subSistema,
          tipo: subTipo,
          link: subLink.trim(),
          precoBRL: parsedSubPreco,
          imageUrl: subImageUrl.trim() || undefined,
        };
        finalItens = [...finalItens, autoItem];
        setItens(finalItens);
        setSubNome('');
        setSubPreco('');
        setSubLink('');
        setSubImageUrl('');
      } else {
        errors.subItem = `O item "${subNome.trim()}" precisa de um preço numérico válido em R$ (ex: 29.90).`;
      }
    }

    if (finalItens.length === 0 && !errors.subItem) {
      errors.itens = 'O pacote precisa ter pelo menos 1 item incluso. Preencha o nome e preço do item no bloco acima e adicione-o.';
    }

    // 3. Validação do Mínimo de cotistas
    const minPart = Number(minimoParticipantes);
    if (isNaN(minPart) || minPart < 1) {
      errors.minimoParticipantes = 'O mínimo de cotistas deve ser pelo menos 1 participante.';
    }

    // 4. Validação da Senha do Mestre
    if (!adminPassword) {
      errors.adminPassword = 'A senha do Mestre é obrigatória para publicar ou editar pacotes.';
    } else if (adminPassword !== ADMIN_PASSWORD) {
      errors.adminPassword = 'Senha do Mestre incorreta! Acesso negado.';
    }

    // Se houver algum erro, foca o primeiro campo inválido com scroll suave
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Por favor, corrija os campos indicados antes de continuar.');

      if (errors.titulo) {
        titleInputRef.current?.focus();
        titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.itens || errors.subItem) {
        itemsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (errors.subItem) {
          subPrecoInputRef.current?.focus();
        } else {
          subNomeInputRef.current?.focus();
        }
      } else if (errors.minimoParticipantes) {
        minimoParticipantesInputRef.current?.focus();
        minimoParticipantesInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.adminPassword) {
        passwordInputRef.current?.focus();
        passwordInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const catalogoPrice = valorCatalogoBRL.trim() !== ''
        ? parseFloat(valorCatalogoBRL.replace(',', '.'))
        : valorTotalBRL;

      const principalSistema = finalItens[0]?.sistema || 'Foundry VTT Geral';

      await onSave({
        id: existingPackage?.id,
        titulo: titulo.trim(),
        sistema: principalSistema,
        tipo,
        descricao: descricao.trim(),
        imageUrl: imageUrl.trim() || undefined,
        itens: finalItens,
        valorTotalBRL,
        minimoParticipantes: minPart > 0 ? minPart : 35,
        valorMaximoPorPessoa,
        valorCatalogoBRL: isNaN(catalogoPrice) ? valorTotalBRL : catalogoPrice,
        linkDrive: linkDrive.trim(),
        dataFinalizar,
        dataPagamento,
        status: existingPackage?.status || 'Financiamento',
        etapaFinanciamento: existingPackage?.etapaFinanciamento || 'COLETA',
        apoiadores: existingPackage?.apoiadores || [],
        pagamentos: existingPackage?.pagamentos || {},
        valorFinalPorParticipante: existingPackage?.valorFinalPorParticipante,
        chavePix: existingPackage?.chavePix,
        instrucoesPix: existingPackage?.instrucoesPix,
      });

      onToast(existingPackage ? 'Pacote atualizado com sucesso!' : 'Novo pacote de financiamento criado com sucesso!');
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar pacote:', err);
      setErrorMsg(err.message || 'Falha ao salvar no servidor. Verifique sua conexão e tente novamente.');
      onToast(err.message || 'Falha ao salvar o pacote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-3xl h-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header Fixo */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                {existingPackage ? 'Editar Pacote de Financiamento' : 'Novo Pacote de Financiamento'}
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Capa do pacote, itens inclusos, link do Drive e valor de rateio
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Área com Rolagem Interna e Rodapé Fixo */}
        <form id="package-funding-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Conteúdo com rolagem garantida */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-[#302414]">
            
            {/* Banner de Erro Geral se houver */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Nome, Tipo & Capa Principal */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#302414] mb-1">
                  1. Nome do Pacote / Vaquinha <span className="text-[#8b261b] font-bold">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    if (fieldErrors.titulo) {
                      setFieldErrors((prev) => ({ ...prev, titulo: '' }));
                    }
                  }}
                  placeholder="Ex: Pacote de Aventura & Mapas - Symbaroum"
                  className={`w-full px-3.5 py-2.5 bg-[#FAF4E6] border rounded-xl text-xs sm:text-sm text-[#302414] font-medium focus:outline-none transition-colors ${
                    fieldErrors.titulo
                      ? 'border-[#8b261b] focus:border-[#8b261b] ring-1 ring-[#8b261b]'
                      : 'border-[#C6AD78] focus:border-[#48551F]'
                  }`}
                />
                {fieldErrors.titulo && (
                  <p className="text-[11px] text-[#8b261b] font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.titulo}</span>
                  </p>
                )}
              </div>

              {/* Tipo de Produto Oficial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#71634D] mb-1">
                    Tipo de Produto <span className="text-[#8b261b] font-bold">*</span>
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as ProductType)}
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  >
                    {OFFICIAL_PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Link do Google Drive */}
                <div>
                  <label className="block text-xs font-semibold text-[#71634D] mb-1 flex items-center gap-1">
                    <FolderCheck className="w-3.5 h-3.5 text-[#48551F]" />
                    <span>Link da Pasta no Google Drive (Acervo)</span>
                  </label>
                  <input
                    type="url"
                    value={linkDrive}
                    onChange={(e) => setLinkDrive(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                </div>
              </div>

              {/* Capa Principal do Pacote */}
              <div className="p-3.5 bg-[#FBF4E4] border border-[#D6C296] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#302414] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#716016]" />
                    <span>Imagem Principal de Capa do Pacote</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[10px] text-[#8b261b] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover Capa</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#282D13] border border-[#C6AD78] flex items-center justify-center shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Prévia" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-[#cfc4a6] text-center px-1">Sem Imagem</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="url"
                      placeholder="Cole a URL da capa (https://...)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-lg text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                    />

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-[#716016]" />
                        <span>{isUploadingCover ? 'Enviando...' : 'Fazer Upload de Imagem'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          disabled={isUploadingCover}
                          onChange={handleCoverUpload}
                        />
                      </label>
                      <span className="text-[10px] text-[#71634D]">JPG, PNG, WebP ou GIF</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#71634D] mb-1">
                  Descrição / Observações (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhes sobre o conteúdo, regras ou link geral..."
                  className="w-full px-3 py-2 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                />
              </div>
            </div>

            {/* 2. Construtor de Itens do Pacote */}
            <div ref={itemsSectionRef} className={`p-4 rounded-2xl bg-[#FBF4E4] border space-y-3 transition-colors ${
              fieldErrors.itens ? 'border-[#8b261b] bg-[#FFF5F5]' : 'border-[#D6C296]'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-[#716016] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>2. Itens Inclusos no Pacote ({itens.length}) <span className="text-[#8b261b] font-bold">*</span></span>
                </h3>
                <span className="text-xs font-bold font-mono text-[#48551F]">
                  Soma Total: R$ {valorTotalBRL.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {fieldErrors.itens && (
                <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.itens}</span>
                </div>
              )}

              {/* Lista dos Itens já adicionados */}
              {itens.length > 0 ? (
                <div className="space-y-1.5 max-h-44 overflow-y-auto divide-y divide-[#E3D1AC] pr-1">
                  {itens.map((it) => (
                    <div key={it.id} className="pt-1.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-[#EDE2CA] text-[#55482e] border border-[#D5C49F] text-[10px] font-bold shrink-0">
                          {it.sistema}
                        </span>
                        <span className="font-medium text-[#302414] truncate">{it.nome}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-[#302414]">
                          R$ {it.precoBRL.toFixed(2).replace('.', ',')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubItem(it.id)}
                          className="p-1 text-[#8b261b] hover:bg-[#FEE2E2] rounded cursor-pointer transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FAF4E6] border border-dashed border-[#C6AD78] text-center text-[11px] text-[#71634D]">
                  Nenhum item adicionado ainda. Preencha os campos abaixo e clique em <strong>"Adicionar Item"</strong>.
                </div>
              )}

              {/* Formulário Interno para Adicionar Novo Sub-Item */}
              <div className="p-3 bg-[#FAF4E6] rounded-xl border border-[#C6AD78] space-y-2">
                <span className="text-[11px] font-bold text-[#302414] block">
                  + Adicionar Item ao Pacote:
                </span>
                
                {fieldErrors.subItem && (
                  <p className="text-[11px] text-[#8b261b] font-bold">
                    {fieldErrors.subItem}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    ref={subNomeInputRef}
                    type="text"
                    placeholder="Nome do item/módulo *"
                    value={subNome}
                    onChange={(e) => setSubNome(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1.5 bg-[#F8EDD5] border border-[#C6AD78] rounded-lg text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                  <select
                    value={subSistema}
                    onChange={(e) => setSubSistema(e.target.value)}
                    className="px-2 py-1.5 bg-[#F8EDD5] border border-[#C6AD78] rounded-lg text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  >
                    {SISTEMAS_PADRAO.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    ref={subPrecoInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Preço R$ *"
                    value={subPreco}
                    onChange={(e) => setSubPreco(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#F8EDD5] border border-[#C6AD78] rounded-lg text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddSubItem}
                    className="px-3.5 py-1.5 rounded-lg bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Item</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Regras de Rateio e Prazos */}
            <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] space-y-3">
              <h3 className="font-bold text-xs text-[#716016] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>3. Metas, Cotas e Prazos</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#71634D] mb-1">
                    Mínimo de Cotistas (Meta) <span className="text-[#8b261b] font-bold">*</span>:
                  </label>
                  <input
                    ref={minimoParticipantesInputRef}
                    type="number"
                    min="1"
                    value={minimoParticipantes}
                    onChange={(e) => setMinimoParticipantes(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                  />
                  {fieldErrors.minimoParticipantes && (
                    <p className="text-[11px] text-[#8b261b] font-bold mt-0.5">
                      {fieldErrors.minimoParticipantes}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#71634D] mb-1">
                    Adesões até (Coleta):
                  </label>
                  <input
                    type="date"
                    value={dataFinalizar}
                    onChange={(e) => setDataFinalizar(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#71634D] mb-1">
                    Preço no Catálogo (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorCatalogoBRL}
                    onChange={(e) => setValorCatalogoBRL(e.target.value)}
                    placeholder="Preço pós-rateio"
                    className="w-full px-3 py-1.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#EDE2CA] rounded-xl border border-[#C6AD78] flex items-center justify-between text-xs">
                <span className="text-[#71634D]">Cota estimada por pessoa com meta atingida ({minimoParticipantes} cotistas):</span>
                <span className="font-mono text-base font-bold text-[#48551F]">
                  R$ {valorMaximoPorPessoa.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Senha do Mestre */}
            <div className={`p-3.5 bg-[#FBF4E4] border rounded-xl space-y-1.5 transition-colors ${
              fieldErrors.adminPassword ? 'border-[#8b261b] bg-[#FFF5F5]' : 'border-[#D6C296]'
            }`}>
              <label className="block text-xs font-bold text-[#302414] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#716016]" />
                <span>Senha do Mestre para Salvar <span className="text-[#8b261b] font-bold">*</span></span>
              </label>
              <input
                ref={passwordInputRef}
                type="password"
                placeholder="Digite a senha de administrador da Ponte..."
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  if (fieldErrors.adminPassword) {
                    setFieldErrors((prev) => ({ ...prev, adminPassword: '' }));
                  }
                  if (errorMsg) setErrorMsg('');
                }}
                className={`w-full bg-[#FAF4E6] border rounded-lg px-3 py-2 text-xs text-[#302414] font-mono focus:outline-none ${
                  fieldErrors.adminPassword
                    ? 'border-[#8b261b] ring-1 ring-[#8b261b]'
                    : 'border-[#C6AD78] focus:border-[#48551F]'
                }`}
              />
              {fieldErrors.adminPassword && (
                <p className="text-[11px] text-[#8b261b] font-bold flex items-center gap-1 pt-0.5">
                  <AlertCircle className="w-3 h-3" />
                  <span>{fieldErrors.adminPassword}</span>
                </p>
              )}
            </div>

          </div>

          {/* Rodapé Fixo (Sticky Footer) - Sempre visível e acessível */}
          <div className="px-6 py-3.5 bg-[#EDE2CA] border-t border-[#D6C296] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-[#71634D] hidden sm:inline">
                <span className="text-[#8b261b] font-bold">*</span> Campos obrigatórios
              </span>
              {errorMsg && (
                <span className="text-[11px] text-[#8b261b] font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#302414] bg-[#F8EDD5] hover:bg-[#FBF4E4] border border-[#C6AD78] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="package-funding-form"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-[#F8EDD5] bg-[#48551F] hover:bg-[#59672A] rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </span>
                ) : (
                  <span>{existingPackage ? 'Salvar Alterações' : 'Criar Pacote de Financiamento'}</span>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
