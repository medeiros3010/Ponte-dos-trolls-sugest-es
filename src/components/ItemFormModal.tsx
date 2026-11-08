import React, { useState, useEffect } from 'react';
import { ItemRPG, SISTEMAS_PADRAO, ADMIN_PASSWORD, ItemStatus, UserProfile, OFFICIAL_PRODUCT_TYPES, ProductType } from '../types';
import { formatPhone, getTodayISODate } from '../utils/helpers';
import { X, Save, PlusCircle, Pencil, Lock, AlertCircle, User, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  itemToEdit: ItemRPG | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSave: (itemData: Omit<ItemRPG, 'id' | 'apoiadores'> & { id?: string }) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  itemToEdit,
  currentUser,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(itemToEdit);
  const isMaster = Boolean(currentUser?.isMaster);

  const [nome, setNome] = useState('');
  const [produto, setProduto] = useState<ProductType>('Material para VTT');
  const [sistema, setSistema] = useState('PF2E');
  const [customSistema, setCustomSistema] = useState('');
  const [isCustomSistema, setIsCustomSistema] = useState(false);
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [moeda, setMoeda] = useState<'USD' | 'BRL'>('USD');
  const [valorNumerico, setValorNumerico] = useState<string>('0.00');
  const [observacaoValor, setObservacaoValor] = useState('');
  const [sugeridoPorNome, setSugeridoPorNome] = useState('');
  const [sugeridoPorTelefone, setSugeridoPorTelefone] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<ItemStatus>('Sugestão');
  
  // Admin password state (only required when editing)
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setAdminPassword('');
    setPasswordError('');
    setUploadError('');
    if (itemToEdit) {
      setNome(itemToEdit.nome);
      setProduto((itemToEdit.produto as ProductType) || 'Material para VTT');
      if (SISTEMAS_PADRAO.includes(itemToEdit.sistema)) {
        setSistema(itemToEdit.sistema);
        setIsCustomSistema(false);
        setCustomSistema('');
      } else {
        setSistema('Outro');
        setIsCustomSistema(true);
        setCustomSistema(itemToEdit.sistema);
      }
      setLink(itemToEdit.link || '');
      setImageUrl(itemToEdit.imageUrl || '');
      setMoeda(itemToEdit.moeda);
      setValorNumerico(itemToEdit.valorNumerico.toString());
      setObservacaoValor(itemToEdit.observacaoValor || '');
      setSugeridoPorNome(itemToEdit.sugeridoPorNome || '');
      setSugeridoPorTelefone(itemToEdit.sugeridoPorTelefone || '');
      setDescricao(itemToEdit.descricao || '');
      setStatus(itemToEdit.status || 'Sugestão');
    } else {
      setNome('');
      setProduto('Material para VTT');
      setSistema('PF2E');
      setIsCustomSistema(false);
      setCustomSistema('');
      setLink('');
      setImageUrl('');
      setMoeda('USD');
      setValorNumerico('0.00');
      setObservacaoValor('');
      setSugeridoPorNome(currentUser?.nome || '');
      setSugeridoPorTelefone(currentUser?.telefone || '');
      setDescricao('');
      setStatus('Sugestão');
    }
  }, [itemToEdit, isOpen, currentUser]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSugeridoPorTelefone(formatPhone(e.target.value));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      setUploadError('');
      const { uploadImageFile } = await import('../utils/cloudStorage');
      const res = await uploadImageFile(file);
      if (res && res.url) {
        setImageUrl(res.url);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !sugeridoPorNome.trim()) return;

    if (isEditing) {
      if (adminPassword !== ADMIN_PASSWORD) {
        setPasswordError('Senha incorreta! Digite a senha de administrador para salvar ou mudar status.');
        return;
      }
    }

    const finalSistema = isCustomSistema && customSistema.trim() ? customSistema.trim() : sistema;
    const finalValor = parseFloat(valorNumerico.replace(',', '.')) || 0;

    onSave({
      id: itemToEdit?.id,
      nome: nome.trim(),
      produto,
      sistema: finalSistema,
      descricao: descricao.trim(),
      link: link.trim(),
      imageUrl: imageUrl.trim() || undefined,
      sugeridoPorNome: sugeridoPorNome.trim(),
      sugeridoPorTelefone: sugeridoPorTelefone.trim(),
      sugeridoPorEmail: currentUser?.email || '',
      moeda,
      valorNumerico: finalValor,
      observacaoValor: observacaoValor.trim(),
      status: isEditing ? status : 'Sugestão',
      data: itemToEdit?.data || getTodayISODate(),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border-[#C6AD78]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#3a4419] text-[#F8EDD5] border border-[#C6AD78]">
              {isEditing ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </span>
            <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
              {isEditing ? 'Editar Material de RPG' : 'Sugerir Nova Compra'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#cfc4a6] hover:text-[#F8EDD5] p-1.5 rounded-lg hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 flex-1 text-xs text-[#302414]">
          
          {/* Nome do Item */}
          <div>
            <label className="block text-xs font-semibold text-[#302414] mb-1">
              Nome do Item / Módulo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Season of Ghosts Remastered, Daggerheart Bundle..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F]"
            />
          </div>

          {/* Tipo de Produto & Sistema de RPG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#71634D] mb-1">
                Tipo de Produto *
              </label>
              <select
                value={produto}
                onChange={(e) => setProduto(e.target.value as ProductType)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] font-medium focus:outline-none focus:border-[#48551F]"
              >
                {OFFICIAL_PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#71634D] mb-1">
                Sistema de RPG *
              </label>
              <select
                value={sistema}
                onChange={(e) => {
                  setSistema(e.target.value);
                  setIsCustomSistema(e.target.value === 'Outro');
                }}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] font-medium focus:outline-none focus:border-[#48551F]"
              >
                {SISTEMAS_PADRAO.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* O status só aparece no modo EDITAR */}
          {isEditing && (
            <div>
              <label className="block text-[11px] font-semibold text-[#716016] mb-1">
                Estágio / Status do Item
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] font-medium focus:outline-none focus:border-[#48551F]"
              >
                <option value="Sugestão">💡 1. Sugestão (Recebendo apoios)</option>
                <option value="Em Financiamento">🔥 2. Em Financiamento (Vaquinha Aberta)</option>
                <option value="Finalizados">✅ 3. Finalizados (No Drive do Grupo)</option>
              </select>
            </div>
          )}

          {isCustomSistema && (
            <div>
              <label className="block text-[11px] font-semibold text-[#716016] mb-1">
                Digite o Sistema de RPG:
              </label>
              <input
                type="text"
                placeholder="Ex: Tormenta20, Alien RPG, Draw Steel..."
                value={customSistema}
                onChange={(e) => setCustomSistema(e.target.value)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>
          )}

          {/* Link da Loja */}
          <div>
            <label className="block text-[11px] font-semibold text-[#71634D] mb-1">
              Link da Loja / Patreon (Opcional)
            </label>
            <input
              type="text"
              placeholder="https://www.foundryvtt.store/products/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] placeholder-[#8c7b64] font-mono focus:outline-none focus:border-[#48551F]"
            />
          </div>

          {/* Imagem do Item */}
          <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#302414] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#716016]" />
                <span>Imagem Ilustrativa / Capa do Material (Opcional)</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[10px] text-[#8b261b] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-8">
                <input
                  type="url"
                  placeholder="https://exemplo.com/capa.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-lg px-2.5 py-1.5 text-xs text-[#302414] placeholder-[#8c7b64] font-mono focus:outline-none focus:border-[#48551F]"
                />
              </div>

              {isMaster && (
                <div className="sm:col-span-4">
                  <label className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#716016]" />
                    <span>{isUploadingImage ? 'Enviando...' : 'Upload Arquivo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="text-[10px] text-[#8b261b] font-medium">{uploadError}</p>
            )}

            {imageUrl && (
              <div className="mt-2 flex items-center gap-3 p-2 bg-[#FAF4E6] rounded-lg border border-[#C6AD78]">
                <img
                  src={imageUrl}
                  alt="Prévia"
                  className="w-16 h-12 rounded object-cover border border-[#C6AD78]"
                />
                <span className="text-[10px] text-[#71634D] truncate max-w-xs">{imageUrl}</span>
              </div>
            )}
          </div>

          {/* Valor, Moeda & Obs de Promoção */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296]">
            <div>
              <label className="block text-[10px] font-semibold text-[#71634D] mb-1">Moeda</label>
              <select
                value={moeda}
                onChange={(e) => setMoeda(e.target.value as 'USD' | 'BRL')}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-lg px-2 py-1.5 text-xs text-[#302414] font-medium focus:outline-none focus:border-[#48551F]"
              >
                <option value="USD">USD ($)</option>
                <option value="BRL">BRL (R$)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#71634D] mb-1">Valor Total</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valorNumerico}
                onChange={(e) => setValorNumerico(e.target.value)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-lg px-2.5 py-1.5 text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#71634D] mb-1">Obs / Promoção</label>
              <input
                type="text"
                placeholder="Ex: 11,99 na promo"
                value={observacaoValor}
                onChange={(e) => setObservacaoValor(e.target.value)}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-lg px-2.5 py-1.5 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
              />
            </div>
          </div>

          {/* Sugerido por (Nome + WhatsApp) */}
          <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-[#716016] font-bold text-xs">
              <User className="w-3.5 h-3.5" />
              <span>Sugerido por (Perfil Vinculado):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Seu Nome / Apelido *"
                  value={sugeridoPorNome}
                  onChange={(e) => setSugeridoPorNome(e.target.value)}
                  className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-lg px-3 py-1.5 text-xs text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F]"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Seu WhatsApp (com DDD)"
                  value={sugeridoPorTelefone}
                  onChange={handlePhoneChange}
                  className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-lg px-3 py-1.5 text-xs text-[#302414] placeholder-[#8c7b64] font-mono focus:outline-none focus:border-[#48551F]"
                />
              </div>
            </div>
            {!isEditing && (
              <p className="text-[10px] text-[#71634D]">
                Você entrará automaticamente como o 1º apoiador deste item na fila de sugestões.
              </p>
            )}
          </div>

          {/* Descrição Opcional */}
          <div>
            <label className="block text-[11px] font-semibold text-[#71634D] mb-1">
              Descrição do Pacote (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="O que vem no pacote? Mapas, bestiário, regras..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] placeholder-[#8c7b64] focus:outline-none focus:border-[#48551F]"
            />
          </div>

          {/* Trava de Segurança: Senha de Admin Obrigatória no Modo Edição */}
          {isEditing && (
            <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-1.5">
              <label className="block text-xs font-semibold text-[#302414] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#716016]" />
                <span>Senha do Admin para salvar / mudar status *</span>
              </label>
              <input
                type="password"
                placeholder="Digite a senha de administrador..."
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                className="w-full bg-[#FAF4E6] border border-[#C6AD78] focus:border-[#48551F] rounded-lg px-3 py-2 text-xs text-[#302414] font-mono focus:outline-none"
              />
              {passwordError && (
                <div className="text-xs text-[#8b261b] font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#D6C296] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#F8EDD5] bg-[#48551F] hover:bg-[#59672A] rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Sugestão'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
