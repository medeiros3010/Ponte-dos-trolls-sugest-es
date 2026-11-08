import React, { useState, useEffect } from 'react';
import { FundingPackage, ADMIN_PASSWORD } from '../types';
import { uploadImageFile } from '../utils/cloudStorage';
import { X, Image as ImageIcon, Upload, Trash2, Save, Lock, AlertCircle } from 'lucide-react';

interface EditPackageImageModalProps {
  isOpen: boolean;
  pkg: FundingPackage | null;
  onClose: () => void;
  onSave: (packageId: string, newImageUrl: string, adminPassword?: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export const EditPackageImageModal: React.FC<EditPackageImageModalProps> = ({
  isOpen,
  pkg,
  onClose,
  onSave,
  onToast,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (pkg && isOpen) {
      setImageUrl(pkg.imageUrl || '');
      setAdminPassword('');
      setPasswordError('');
      setUploadError('');
    }
  }, [pkg, isOpen]);

  if (!isOpen || !pkg) return null;

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
    if (adminPassword !== ADMIN_PASSWORD) {
      setPasswordError('Senha de administrador incorreta.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(pkg.id, imageUrl.trim(), adminPassword);
      onToast('Capa do pacote atualizada com sucesso!');
      onClose();
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao salvar capa do pacote');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/70 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#192f1f] to-[#122015] border-b border-[#203625] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#d49e2a]">
            <ImageIcon className="w-5 h-5" />
            <h3 className="font-rpg text-base sm:text-lg font-bold text-[#f4ecd8]">
              Editar Capa do Pacote
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8a9d8c] hover:text-[#f4ecd8] hover:bg-[#1a2f20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <div>
            <span className="text-[11px] text-[#7a8e7d] block font-semibold">Pacote:</span>
            <span className="font-bold text-[#f4ecd8] text-sm leading-tight block">{pkg.titulo}</span>
          </div>

          {/* Pré-visualização da imagem atual / nova */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-[#8a9d8c] font-semibold block">Prévia da Capa:</span>
            <div className="w-full h-44 rounded-xl bg-[#0b140d] border border-[#233a29] overflow-hidden flex items-center justify-center relative">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Prévia da capa"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="%231a2f20" width="200" height="150"/><text fill="%238a9d8c" x="50%" y="50%" text-anchor="middle" font-size="12">URL Inválida</text></svg>';
                  }}
                />
              ) : (
                <div className="text-center p-4 text-[#607363]">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <span className="text-[11px] block">Sem imagem cadastrada (será usado ícone padrão)</span>
                </div>
              )}

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/75 hover:bg-red-950/90 text-red-300 border border-red-500/40 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Remover imagem"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover Imagem</span>
                </button>
              )}
            </div>
          </div>

          {/* Opções de Inserção: URL ou Upload */}
          <div className="space-y-2 p-3 bg-[#0c150e] border border-[#1e3422] rounded-xl">
            <label className="text-[11px] font-semibold text-[#f4ecd8] block">
              URL da Imagem da Web:
            </label>
            <input
              type="url"
              placeholder="https://exemplo.com/capa.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-[#142318] border border-[#233a29] rounded-lg px-3 py-2 text-xs text-[#f3efe6] placeholder-[#506352] font-mono focus:outline-none focus:border-[#d49e2a]"
            />

            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-[#7a8e7d]">Ou envie um arquivo do seu dispositivo:</span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b2f20] hover:bg-[#25422b] text-[#d49e2a] hover:text-[#f4ecd8] border border-[#2e5035] rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Enviando...' : 'Fazer Upload'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {uploadError && (
              <p className="text-[10px] text-red-400 font-medium">{uploadError}</p>
            )}
          </div>

          {/* Confirmação de Senha do Mestre */}
          <div className="p-3 bg-[#0d160f] border border-[#27442d] rounded-xl space-y-1.5">
            <label className="block text-xs font-semibold text-[#f4ecd8] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#d49e2a]" />
              <span>Senha do Mestre para confirmar alteração *</span>
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
              className="w-full bg-[#142318] border border-[#233a29] focus:border-[#d49e2a] rounded-lg px-3 py-2 text-xs text-[#f3efe6] font-mono focus:outline-none"
            />
            {passwordError && (
              <div className="text-xs text-red-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#1f3524] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-[#a4b5a6] hover:text-[#f4ecd8] bg-[#16271a] hover:bg-[#1e3422] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#122015] bg-[#d49e2a] hover:bg-[#e5b23d] rounded-xl transition-colors shadow-md cursor-pointer disabled:opacity-50"
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
