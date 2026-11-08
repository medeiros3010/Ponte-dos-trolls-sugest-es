import React, { useState, useEffect, useMemo } from 'react';
import { FundingPackage, PackageSubItem, ProductType, OFFICIAL_PRODUCT_TYPES, SISTEMAS_PADRAO, ADMIN_PASSWORD } from '../types';
import { X, Layers, Plus, Trash2, KeyRound, DollarSign, Calendar, Users, ExternalLink, Image as ImageIcon, Upload, FolderCheck, Check } from 'lucide-react';
import { uploadImageFile } from '../utils/cloudStorage';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkgData: Omit<FundingPackage, 'id' | 'criadoEm'> & { id?: string }) => void;
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
      // Default dates: 15 and 20 days ahead
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
  }, [existingPackage, isOpen]);

  // Handle Cover Upload
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

  // Handle Sub-Item Image Upload
  const handleSubItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingSubImage(true);
      setErrorMsg('');
      const res = await uploadImageFile(file);
      if (res?.url) {
        setSubImageUrl(res.url);
        onToast('Imagem do item enviada com sucesso!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar imagem');
    } finally {
      setIsUploadingSubImage(false);
      e.target.value = '';
    }
  };

  const handleAddSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subNome.trim()) {
      setErrorMsg('Informe o nome do item a ser incluído no pacote.');
      return;
    }

    const precoParsed = parseFloat(subPreco.replace(',', '.'));
    if (isNaN(precoParsed) || precoParsed < 0) {
      setErrorMsg('Informe um preço válido em R$ para o item.');
      return;
    }

    const newItem: PackageSubItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: subNome.trim(),
      sistema: subSistema || 'Foundry VTT Geral',
      tipo: subTipo,
      link: subLink.trim(),
      precoBRL: precoParsed,
      imageUrl: subImageUrl.trim() || undefined,
    };

    setItens([...itens, newItem]);
    setSubNome('');
    setSubLink('');
    setSubPreco('');
    setSubImageUrl('');
    setErrorMsg('');
  };

  const handleRemoveSubItem = (id: string) => {
    setItens(itens.filter((it) => it.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== ADMIN_PASSWORD) {
      setErrorMsg('Senha do Mestre incorreta! Acesso negado.');
      return;
    }

    if (!titulo.trim()) {
      setErrorMsg('Informe o nome do pacote de financiamento.');
      return;
    }

    if (itens.length === 0) {
      setErrorMsg('Adicione pelo menos 1 item na lista do pacote.');
      return;
    }

    if (valorTotalBRL <= 0) {
      setErrorMsg('O valor total do pacote deve ser maior que zero.');
      return;
    }

    const minPart = Math.max(1, Number(minimoParticipantes) || 35);
    const catVal = valorCatalogoBRL !== '' ? parseFloat(valorCatalogoBRL.replace(',', '.')) : valorTotalBRL;

    const principalSistema = itens[0]?.sistema || existingPackage?.sistema || 'Foundry VTT Geral';

    onSave({
      id: existingPackage?.id,
      titulo: titulo.trim(),
      sistema: principalSistema,
      tipo,
      descricao: descricao.trim(),
      imageUrl: imageUrl.trim() || undefined,
      linkDrive: linkDrive.trim() || undefined,
      linkLoja: existingPackage?.linkLoja || '',
      itens,
      valorTotalBRL,
      minimoParticipantes: minPart,
      valorMaximoPorPessoa,
      valorCatalogoBRL: isNaN(catVal) ? valorTotalBRL : catVal,
      dataFinalizar,
      dataPagamento,
      itensInclusos: itens.map((it) => `${it.nome} (${it.sistema})`),
      status: existingPackage?.status || 'Financiamento',
      etapaFinanciamento: existingPackage?.etapaFinanciamento || 'COLETA',
      pagamentos: existingPackage?.pagamentos || {},
      apoiadores: existingPackage?.apoiadores || [],
      finalizadoEm: existingPackage?.finalizadoEm,
    });

    onToast(existingPackage ? 'Pacote atualizado com sucesso!' : 'Novo pacote de financiamento criado!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/60 rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#182d1d] to-[#122015] border-b border-[#203625] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f3524] border border-[#d49e2a]/40 flex items-center justify-center text-[#d49e2a]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-lg font-bold text-[#f4ecd8]">
                {existingPackage ? 'Editar Pacote' : 'Novo Pacote de Financiamento'}
              </h2>
              <p className="text-[11px] text-[#8a9d8c]">
                Capa do pacote, itens inclusos, link do Drive e valor de rateio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] hover:bg-[#1f3524] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs">
          
          {/* 1. Nome, Tipo & Capa Principal */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#f4ecd8] mb-1.5">
                1. Nome do Pacote / Vaquinha <span className="text-[#d49e2a]">*</span>
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Pacote de Aventura & Mapas - Symbaroum"
                className="w-full px-3.5 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-medium focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            {/* Tipo de Produto Oficial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                  Tipo de Produto *
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as ProductType)}
                  className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                >
                  {OFFICIAL_PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link do Google Drive (Requirement 5) */}
              <div>
                <label className="block text-xs font-semibold text-[#a4b5a6] mb-1 flex items-center gap-1">
                  <FolderCheck className="w-3.5 h-3.5 text-[#34d399]" />
                  <span>Link da Pasta no Google Drive (Acervo)</span>
                </label>
                <input
                  type="url"
                  value={linkDrive}
                  onChange={(e) => setLinkDrive(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#34d399]"
                />
              </div>
            </div>

            {/* Capa Principal do Pacote (Requirement 2) */}
            <div className="p-3.5 bg-[#0c150e] border border-[#203625] rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#f4ecd8] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#d49e2a]" />
                  <span>Imagem Principal de Capa do Pacote (Financiamento & Catálogo)</span>
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover Capa</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                {/* Preview Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#142318] border border-[#24402a] flex items-center justify-center shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Prévia" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-[#6e8571] text-center px-1">Sem Imagem</span>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="url"
                    placeholder="Cole a URL da capa (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#122015] border border-[#203625] rounded-lg text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#d49e2a]"
                  />

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#182c1d] hover:bg-[#203a27] text-[#d49e2a] hover:text-[#f4ecd8] border border-[#27442d] rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingCover ? 'Enviando...' : 'Fazer Upload de Imagem'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        disabled={isUploadingCover}
                        onChange={handleCoverUpload}
                      />
                    </label>
                    <span className="text-[10px] text-[#7a8e7d]">JPG, PNG, WebP ou GIF (máx 5MB)</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a4b5a6] mb-1">
                Descrição / Observações (Opcional):
              </label>
              <textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes sobre o conteúdo, regras ou link geral..."
                className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>
          </div>

          {/* 2. Construtor de Itens do Pacote (Lista Dinâmica) */}
          <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#d49e2a] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>2. Itens Internos do Pacote (Lista Dinâmica com Imagens Opcionais)</span>
              </h3>
              <span className="text-[11px] text-[#8a9d8c]">
                {itens.length} {itens.length === 1 ? 'item adicionado' : 'itens adicionados'}
              </span>
            </div>

            {/* Sub-item input row */}
            <div className="bg-[#122015] p-3 rounded-xl border border-[#1f3524] space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] text-[#8a9d8c] mb-1">Nome do Item *</label>
                  <input
                    type="text"
                    value={subNome}
                    onChange={(e) => setSubNome(e.target.value)}
                    placeholder="Ex: Módulo Bastion of Blasphemies"
                    className="w-full px-2.5 py-1.5 bg-[#0a120c] border border-[#203625] rounded-lg text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] text-[#8a9d8c] mb-1">Sistema de RPG</label>
                  <select
                    value={subSistema}
                    onChange={(e) => setSubSistema(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#0a120c] border border-[#203625] rounded-lg text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  >
                    {SISTEMAS_PADRAO.map((sis) => (
                      <option key={sis} value={sis}>
                        {sis}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-[#8a9d8c] mb-1">Tipo de Item</label>
                  <select
                    value={subTipo}
                    onChange={(e) => setSubTipo(e.target.value as ProductType)}
                    className="w-full px-2 py-1.5 bg-[#0a120c] border border-[#203625] rounded-lg text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  >
                    {OFFICIAL_PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-4">
                  <label className="block text-[10px] text-[#8a9d8c] mb-1">Link do Produto</label>
                  <input
                    type="url"
                    value={subLink}
                    onChange={(e) => setSubLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 bg-[#0a120c] border border-[#203625] rounded-lg text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-[#8a9d8c] mb-1">Preço (R$) *</label>
                  <input
                    type="text"
                    value={subPreco}
                    onChange={(e) => setSubPreco(e.target.value)}
                    placeholder="50,00"
                    className="w-full px-2.5 py-1.5 bg-[#0a120c] border border-[#203625] rounded-lg text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] text-[#8a9d8c] mb-1">Imagem do Item (Opcional)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={subImageUrl}
                      onChange={(e) => setSubImageUrl(e.target.value)}
                      placeholder="URL ou upload ➜"
                      className="w-full px-2 py-1.5 bg-[#0a120c] border border-[#203625] rounded-lg text-[11px] text-[#f1ede4] font-mono focus:outline-none focus:border-[#d49e2a]"
                    />
                    <label className="p-1.5 bg-[#182c1d] hover:bg-[#203a27] text-[#d49e2a] border border-[#27442d] rounded-lg cursor-pointer shrink-0" title="Upload de miniatura">
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        disabled={isUploadingSubImage}
                        onChange={handleSubItemImageUpload}
                      />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={handleAddSubItem}
                    className="w-full mt-4 py-2 bg-[#1e3d25] hover:bg-[#285232] border border-[#3e784c] text-[#6ee7b7] font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Visual list of items with thumbnails */}
            {itens.length === 0 ? (
              <p className="text-center py-4 text-[#6e8571] text-xs italic">
                Nenhum item adicionado ainda. Preencha os campos acima para incluir itens no pacote.
              </p>
            ) : (
              <div className="divide-y divide-[#1a2f20] border border-[#203625] rounded-xl overflow-hidden bg-[#0c150e]">
                {itens.map((it) => (
                  <div key={it.id} className="p-2.5 sm:px-3 flex items-center justify-between gap-3 hover:bg-[#122015] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Sub-item thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#16271a] border border-[#233f2a] flex items-center justify-center shrink-0">
                        {it.imageUrl ? (
                          <img src={it.imageUrl} alt={it.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-[#6e8571]">📜</span>
                        )}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-[#f4ecd8] flex items-center gap-2 truncate">
                          <span className="truncate">{it.nome}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#1a3321] text-[#d49e2a] border border-[#d49e2a]/30 shrink-0">
                            {it.sistema}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] text-[#8e9f90] bg-[#122015] border border-[#1f3524] shrink-0">
                            {it.tipo || 'Material para VTT'}
                          </span>
                        </div>
                        {it.link && (
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#6ee7b7] hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-xs">{it.link}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-bold text-sm text-[#f4ecd8]">
                        R$ {it.precoBRL.toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubItem(it.id)}
                        className="p-1 rounded text-[#7a8e7d] hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total acumulado automático */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-[#16271a] border border-[#2e5035]">
              <span className="font-bold text-xs text-[#a4b5a6]">Valor Total Consolidado do Pacote:</span>
              <span className="font-mono font-bold text-base text-[#d49e2a]">
                R$ {valorTotalBRL.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* 3. Regras, Prazos & Preço no Catálogo */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#0c150e] border border-[#203625]">
            <div>
              <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#d49e2a]" />
                <span>Prazo para Nome:</span>
              </label>
              <input
                type="date"
                required
                value={dataFinalizar}
                onChange={(e) => setDataFinalizar(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Prazo Pagamento:</span>
              </label>
              <input
                type="date"
                required
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#d49e2a]" />
                <span>Mínimo Cotistas:</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={minimoParticipantes}
                onChange={(e) => setMinimoParticipantes(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#f4ecd8] mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span>Preço Catálogo (R$):</span>
              </label>
              <input
                type="text"
                value={valorCatalogoBRL}
                onChange={(e) => setValorCatalogoBRL(e.target.value)}
                placeholder="Ex: 50.00"
                className="w-full px-2.5 py-2 bg-[#122015] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#fbbf24]"
              />
            </div>
          </div>

          {/* 4. Destaque Dourado: Cálculo Automático em Tempo Real */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#21351d] to-[#172b1a] border-2 border-[#d49e2a] shadow-lg flex items-center justify-between">
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-bold text-[#f4ecd8]">
                Cálculo de Rateio em Tempo Real:
              </span>
              <span className="text-[11px] text-[#a4b5a6]">
                R$ {valorTotalBRL.toFixed(2)} divididos por {minimoParticipantes || 1} participantes mínimos
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#d49e2a] font-semibold block uppercase">Valor máximo por pessoa:</span>
              <span className="font-rpg text-xl sm:text-2xl font-bold text-[#fbbf24]">
                R$ {valorMaximoPorPessoa.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Senha do Mestre */}
          <div className="pt-2 border-t border-[#1f3524]">
            <label className="block text-xs font-semibold text-[#f4ecd8] mb-1">
              Senha do Mestre para Salvar o Pacote:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#7a8e7d] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Ponte#dos#trolls"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-2.5 font-bold text-xs sm:text-sm rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all cursor-pointer"
            >
              {existingPackage ? 'Salvar Alterações' : 'Criar Pacote de Financiamento'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
