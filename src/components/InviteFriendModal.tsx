import React, { useState, useMemo } from 'react';
import {
  X,
  UserPlus,
  Copy,
  Check,
  AlertTriangle,
  Phone,
  User,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '../types';

interface InviteFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onToast: (msg: string) => void;
  masterPhone?: string;
}

export const getPublicSiteUrl = (): string => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }
  return 'https://ais-pre-ff4jhnr4y6ecwfyammxynu-416616066819.us-west2.run.app';
};

export function normalizeWhatsAppNumber(phone: string): { valid: boolean; formattedForUrl: string } {
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 10) {
    return { valid: false, formattedForUrl: '' };
  }
  if (digits.startsWith('55') && digits.length >= 12) {
    return { valid: true, formattedForUrl: digits };
  }
  if (digits.length === 10 || digits.length === 11) {
    return { valid: true, formattedForUrl: `55${digits}` };
  }
  return { valid: digits.length >= 10, formattedForUrl: digits };
}

export const InviteFriendModal: React.FC<InviteFriendModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onToast,
  masterPhone = '5519981512030',
}) => {
  const [friendName, setFriendName] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [copiedFriend, setCopiedFriend] = useState(false);
  const [copiedMaster, setCopiedMaster] = useState(false);

  // Mask para o input de telefone
  const handlePhoneInputChange = (val: string) => {
    const raw = val.replace(/[^\d+()\s-]/g, '');
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 11) {
      if (digits.length > 2 && digits.length <= 6) {
        setFriendPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
      } else if (digits.length > 6 && digits.length <= 10) {
        setFriendPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`);
      } else if (digits.length > 10) {
        setFriendPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`);
      } else {
        setFriendPhone(digits);
      }
    } else {
      setFriendPhone(raw);
    }
  };

  const phoneNorm = useMemo(() => normalizeWhatsAppNumber(friendPhone), [friendPhone]);
  const siteUrl = useMemo(() => getPublicSiteUrl(), []);

  // MENSAGEM PARA O AMIGO (Texto exato da especificação)
  const friendMessageText = useMemo(() => {
    return `Olá! Quero te apresentar a Ponte dos Trolls, uma comunidade de compras coletivas de materiais digitais para RPG, como mapas, tokens, livros e módulos para Foundry VTT.

Os interessados dividem os custos de cada compra, e o acesso é destinado aos participantes daquela aquisição. O grupo possui regras de convivência e não permite compartilhar materiais brasileiros.

Estou te indicando porque confio em você. Vou encaminhar sua indicação ao Mestre, que entrará em contato caso tenha interesse em dar continuidade.`;
  }, []);

  // MENSAGEM PARA O MESTRE (Texto exato da especificação)
  const masterMessageText = useMemo(() => {
    const indicatorName = currentUser?.nome || 'Membro';
    const nomeInformado = friendName.trim() ? friendName.trim() : 'Não informado';
    const telefoneInformado = friendPhone.trim() ? friendPhone.trim() : 'A preencher';

    return `Olá, Mestre! Tenho uma pessoa de confiança para indicar à Ponte dos Trolls.

Indicado por: ${indicatorName}
Nome do amigo: ${nomeInformado}
Telefone do amigo: ${telefoneInformado}

Se tiver interesse em dar continuidade à indicação, entre em contato com essa pessoa.`;
  }, [currentUser, friendName, friendPhone]);

  if (!isOpen) return null;

  const handleCopyFriendMessage = () => {
    navigator.clipboard.writeText(friendMessageText);
    setCopiedFriend(true);
    onToast('Convite copiado para a área de transferência!');
    setTimeout(() => setCopiedFriend(false), 2500);
  };

  const handleOpenFriendWhatsApp = () => {
    if (!phoneNorm.valid) {
      onToast('Informe um número de telefone com DDD para abrir o WhatsApp.');
      return;
    }
    const url = `https://wa.me/${phoneNorm.formattedForUrl}?text=${encodeURIComponent(friendMessageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMasterMessage = () => {
    navigator.clipboard.writeText(masterMessageText);
    setCopiedMaster(true);
    onToast('Mensagem ao Mestre copiada para a área de transferência!');
    setTimeout(() => setCopiedMaster(false), 2500);
  };

  const handleOpenMasterWhatsApp = () => {
    const cleanMaster = masterPhone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanMaster}?text=${encodeURIComponent(masterMessageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#39421b] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <UserPlus className="w-5 h-5 text-[#a8d363]" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5] leading-tight">
                Convidar um Amigo
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Indique aventureiros de confiança para a Ponte dos Trolls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#cfc4a6] hover:text-[#F8EDD5] hover:bg-[#363e1a] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body com Scroll */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs text-[#302414]">
          
          {/* Aviso Destacado Obrigatório */}
          <div className="p-4 rounded-xl bg-[#FFF6DE] border-2 border-[#D4A538] flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-[#875508] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-xs sm:text-sm text-[#5a3805] block">
                Aviso importante sobre indicações
              </span>
              <p className="text-xs text-[#55482e] leading-relaxed font-medium">
                Indique apenas pessoas de sua confiança e não divulgue publicamente. O Mestre avaliará a indicação de sua confiança e fará contato caso tenha interesse.
              </p>
            </div>
          </div>

          {/* Formulário dos dados do amigo */}
          <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] space-y-3">
            <h3 className="font-rpg text-xs font-bold text-[#48551F] uppercase tracking-wider">
              Dados do Amigo Indicado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#302414] mb-1">
                  Nome do amigo (opcional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#71634D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full bg-[#FBF4E4] border border-[#C6AD78] rounded-xl pl-9 pr-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#302414] mb-1">
                  WhatsApp com DDD *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#71634D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={friendPhone}
                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-[#FBF4E4] border border-[#C6AD78] rounded-xl pl-9 pr-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                  />
                </div>
                <span className="text-[10px] text-[#71634D] block mt-0.5">
                  Preenche automaticamente a mensagem ao Mestre e o link direto ao amigo.
                </span>
              </div>
            </div>
          </div>

          {/* MENSAGEM 1: PARA O AMIGO */}
          <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-rpg font-bold text-xs sm:text-sm text-[#302414] flex items-center gap-1.5">
                <span>💬</span>
                <span>Mensagem para o Amigo</span>
              </span>
              <span className="text-[11px] text-[#71634D]">
                Indicador: <strong>{currentUser.nome}</strong>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#FBF4E4] border border-[#D6C296] text-xs leading-relaxed text-[#302414] whitespace-pre-wrap font-sans max-h-44 overflow-y-auto select-text">
              {friendMessageText}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyFriendMessage}
                className="px-3 py-1.5 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedFriend ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-[#716016]" />}
                <span>{copiedFriend ? 'Copiado!' : 'Copiar convite'}</span>
              </button>

              <button
                type="button"
                disabled={!phoneNorm.valid}
                onClick={handleOpenFriendWhatsApp}
                className="px-4 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
                title={phoneNorm.valid ? 'Abrir conversa do WhatsApp com o amigo' : 'Informe o telefone do amigo com DDD acima'}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp do amigo</span>
              </button>
            </div>
          </div>

          {/* MENSAGEM 2: PARA O MESTRE */}
          <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-rpg font-bold text-xs sm:text-sm text-[#302414] flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Mensagem para o Mestre</span>
              </span>
              <span className="text-[11px] text-[#71634D]">
                Aviso prévio de indicação
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#FBF4E4] border border-[#D6C296] text-xs leading-relaxed text-[#302414] whitespace-pre-wrap font-sans select-text">
              {masterMessageText}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyMasterMessage}
                className="px-3 py-1.5 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedMaster ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-[#716016]" />}
                <span>{copiedMaster ? 'Copiada!' : 'Copiar mensagem para o Mestre'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMasterWhatsApp}
                className="px-4 py-1.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp do Mestre</span>
              </button>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 bg-[#FAF4E6] border-t border-[#D6C296] flex items-center justify-between text-xs text-[#71634D] shrink-0">
          <span>Esta indicação não cria conta nem libera acesso imediato.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
