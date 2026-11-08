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

  const handleSubItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingSubImage(true);
      setErrorMsg('');
      const res = await uploadImageFile(file);
      if (res?.url) {
        setSubImageUrl(res.url);
        onToast('Imagem do item enviada!');
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
      setErrorMsg('Informe o nome do item a ser incluído');
      return;
    }
    const preco = parseFloat(subPreco.replace(',', '.')) || 0;
    const newItem: PackageSubItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      nome: subNome.trim(),
      sistema: subSistema,
      tipo: subTipo,
      link: subLink.trim(),
      precoBRL: preco,
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
    setErrorMsg('');

    if (adminPassword !== ADMIN_PASSWORD) {
      setErrorMsg('Senha do Mestre incorreta! Acesso negado.');
      return;
    }

    if (!titulo.trim()) {
      setErrorMsg('O nome do pacote é obrigatório.');
      return;
    }

    if (itens.length === 0) {
      setErrorMsg('Adicione pelo menos 1 item na lista do pacote.');
      return;
    }

    const minPart = Number(minimoParticipantes) > 0 ? Number(minimoParticipantes) : 35;
    const catalogoPrice = valorCatalogoBRL.trim() !== ''
      ? parseFloat(valorCatalogoBRL.replace(',', '.'))
      : valorTotalBRL;

    const principalSistema = itens[0]?.sistema || 'Foundry VTT Geral';

    onSave({
      id: existingPackage?.id,
      titulo: titulo.trim(),
      sistema: principalSistema,
      tipo,
      descricao: descricao.trim(),
      imageUrl: imageUrl.trim() || undefined,
      itens,
      valorTotalBRL,
      minimoParticipantes: minPart,
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

    onClose();
    onToast(existingPackage ? 'Pacote atualizado com sucesso!' : 'Novo pacote criado com sucesso!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a4419] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                {existingPackage ? 'Editar Pacote' : 'Novo Pacote de Financiamento'}
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Capa do pacote, itens inclusos, link do Drive e valor de rateio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs text-[#302414]">
          
          {/* 1. Nome, Tipo & Capa Principal */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#302414] mb-1.5">
                1. Nome do Pacote / Vaquinha <span className="text-[#8b261b]">*</span>
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Pacote de Aventura & Mapas - Symbaroum"
                className="w-full px-3.5 py-2.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs sm:text-sm text-[#302414] font-medium focus:outline-none focus:border-[#48551F]"
              />
            </div>

            {/* Tipo de Produto Oficial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#71634D] mb-1">
                  Tipo de Produto *
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
                  <span>Imagem Principal de Capa do Pacote (Financiamento & Catálogo)</span>
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
                    <span className="text-[10px] text-[#71634D]">JPG, PNG, WebP ou GIF (máx 5MB)</span>
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
          <div className="p-4 rounded-2xl bg-[#FBF4E4] border border-[#D6C296] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#716016] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>2. Itens Inclusos no Pacote ({itens.length})</span>
              </h3>
              <span className="text-xs font-bold font-mono text-[#48551F]">
                Soma Automática: R$ {valorTotalBRL.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Lista dos Itens já adicionados */}
            {itens.length > 0 && (
              <div className="space-y-1.5 max-h-44 overflow-y-auto divide-y divide-[#E3D1AC]">
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
                        className="p-1 text-[#8b261b] hover:bg-[#FEE2E2] rounded cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar Novo Sub-Item */}
            <div className="p-3 bg-[#FAF4E6] rounded-xl border border-[#C6AD78] space-y-2">
              <span className="text-[11px] font-bold text-[#302414] block">
                + Adicionar Item ao Pacote:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
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
                  className="px-3.5 py-1.5 rounded-lg bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
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
                  Mínimo de Cotistas (Meta):
                </label>
                <input
                  type="number"
                  min="1"
                  value={minimoParticipantes}
                  onChange={(e) => setMinimoParticipantes(parseInt(e.target.value) || 35)}
                  className="w-full px-3 py-1.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                />
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
              <span className="text-[#71634D]">Cota estimada por pessoa com meta atingida:</span>
              <span className="font-mono text-base font-bold text-[#48551F]">
                R$ {valorMaximoPorPessoa.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Senha do Mestre */}
          <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-1.5">
            <label className="block text-xs font-semibold text-[#302414] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#716016]" />
              <span>Senha do Mestre para Salvar *</span>
            </label>
            <input
              type="password"
              required
              placeholder="Digite a senha de administrador..."
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] focus:border-[#48551F] rounded-lg px-3 py-2 text-xs text-[#302414] font-mono focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#D6C296] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-[#F8EDD5] bg-[#48551F] hover:bg-[#59672A] rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {existingPackage ? 'Salvar Alterações' : 'Criar Pacote de Financiamento'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
