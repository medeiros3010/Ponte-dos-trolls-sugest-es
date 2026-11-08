import React, { useState, useEffect } from 'react';
import { FundingPackage } from '../types';
import { uploadImageFile } from '../utils/cloudStorage';
import { X, Image as ImageIcon, Upload, Trash2, Save, Lock, AlertCircle } from 'lucide-react';

interface EditPackageImageModalProps {
  isOpen: boolean;
  pkg?: FundingPackage | null;
  packageItem?: FundingPackage | null;
  onClose: () => void;
  onSave?: (packageId: string, newImageUrl: string, adminPassword?: string) => Promise<void>;
  onUpdateImage?: (packageId: string, newImageUrl: string, adminPassword?: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export const EditPackageImageModal: React.FC<EditPackageImageModalProps> = ({
  isOpen,
  pkg,
  packageItem,
  onClose,
  onSave,
  onUpdateImage,
  onToast,
}) => {
  const currentPkg = packageItem || pkg;
  const [imageUrl, setImageUrl] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentPkg && isOpen) {
      setImageUrl(currentPkg.imageUrl || '');
      setAdminPassword('');
      setPasswordError('');
      setUploadError('');
    }
  }, [currentPkg, isOpen]);

  if (!isOpen || !currentPkg) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError('');
      const res = await uploadImageFile(file);
      if (res && res.url) {
        setImageUrl(res.url);
        onToast('Upload de imagem concluído com sucesso!');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(currentPkg.id, imageUrl.trim(), adminPassword.trim());
      } else if (onUpdateImage) {
        await onUpdateImage(currentPkg.id, imageUrl.trim(), adminPassword.trim());
      }
      onToast('Capa do pacote atualizada com sucesso!');
      onClose();
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao salvar capa do pacote');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-md shadow-2xl overflow-hidden flex flex-col border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#d6be8c]" />
            <h3 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
              Editar Capa do Pacote
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs text-[#302414]">
          <div>
            <span className="text-[11px] text-[#71634D] block font-semibold">Pacote:</span>
            <span className="font-bold text-[#302414] text-sm leading-tight block font-rpg">{currentPkg.titulo}</span>
          </div>

          {/* Prévia da Capa */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-[#71634D] font-semibold block">Prévia da Capa:</span>
            <div className="w-full h-44 rounded-xl bg-[#282D13] border border-[#C6AD78] overflow-hidden flex items-center justify-center relative">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Prévia da capa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4 text-[#93a270]">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <span className="text-[11px] block">Sem imagem cadastrada</span>
                </div>
              )}

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-[#282D13]/85 hover:bg-[#8b261b] text-[#F8EDD5] border border-[#6b7a35] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Remover imagem"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover</span>
                </button>
              )}
            </div>
          </div>

          {/* Opções de Inserção */}
          <div className="space-y-2 p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl">
            <label className="text-[11px] font-semibold text-[#302414] block">
              URL da Imagem da Web:
            </label>
            <input
              type="url"
              placeholder="https://exemplo.com/imagem.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#FAF4E6] border border-[#C6AD78] rounded-lg text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
            />

            <div className="pt-1 flex items-center gap-2">
              <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] border border-[#C6AD78] rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-[#716016]" />
                <span>{isUploading ? 'Enviando...' : 'Fazer Upload do Arquivo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleFileUpload}
                />
              </label>
              <span className="text-[10px] text-[#71634D]">JPG, PNG, WebP (máx 5MB)</span>
            </div>
            {uploadError && <p className="text-[10px] text-[#8b261b]">{uploadError}</p>}
          </div>

          {/* Senha do Mestre */}
          <div className="p-3 bg-[#FBF4E4] border border-[#D6C296] rounded-xl space-y-1.5">
            <label className="block text-xs font-semibold text-[#302414] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#716016]" />
              <span>Senha do Mestre para Salvar *</span>
            </label>
            <input
              type="password"
              required
              placeholder="Digite a senha de administrador..."
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              className="w-full bg-[#FAF4E6] border border-[#C6AD78] focus:border-[#48551F] rounded-lg px-3 py-2 text-xs text-[#302414] font-mono focus:outline-none"
            />
          </div>

          {passwordError && (
            <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{passwordError}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-[#D6C296] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-[#F8EDD5] bg-[#48551F] hover:bg-[#59672A] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Capa'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
