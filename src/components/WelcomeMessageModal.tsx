import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Phone,
  User,
  Globe,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { normalizeWhatsAppNumber } from './InviteFriendModal';

interface WelcomeMemberData {
  nome: string;
  telefone: string;
}

interface WelcomeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: WelcomeMemberData | null;
  onToast: (msg: string) => void;
  initialSiteUrl?: string;
}

const STORAGE_OFFICIAL_URL_KEY = 'ponte_trolls_official_site_url';

export const WelcomeMessageModal: React.FC<WelcomeMessageModalProps> = ({
  isOpen,
  onClose,
  member,
  onToast,
  initialSiteUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_OFFICIAL_URL_KEY);
      if (stored && stored.trim()) return stored.trim();
    } catch (e) {}
    if (initialSiteUrl && initialSiteUrl.trim()) return initialSiteUrl.trim();
    return '';
  });

  const [isEditingUrl, setIsEditingUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      try {
        const stored = localStorage.getItem(STORAGE_OFFICIAL_URL_KEY);
        if (stored && stored.trim()) {
          setSiteUrl(stored.trim());
        }
      } catch (e) {}
    }
  }, [isOpen]);

  const handleSaveSiteUrl = (url: string) => {
    const clean = url.trim();
    setSiteUrl(clean);
    try {
      localStorage.setItem(STORAGE_OFFICIAL_URL_KEY, clean);
    } catch (e) {}
    setIsEditingUrl(false);
    onToast('URL pública oficial do site salva com sucesso!');
  };

  const phoneNorm = useMemo(() => {
    if (!member?.telefone) return { valid: false, formattedForUrl: '' };
    return normalizeWhatsAppNumber(member.telefone);
  }, [member?.telefone]);

  // Mensagem Oficial de Boas-Vindas
  const welcomeMessageText = useMemo(() => {
    const nome = member?.nome ? member.nome.trim() : 'Aventureiro';
    const linkSite = siteUrl.trim() ? siteUrl.trim() : '[CONFIGURAR LINK DO SITE ACIMA]';

    return `🎉 Olá, ${nome}! Sua entrada foi aprovada. Seja bem-vindo(a) à Ponte dos Trolls — PDT!

🌉 Sua aventura começa na nossa central:
${linkSite}

Seu cadastro já está liberado. Acesse com os dados cadastrados e confira seu perfil.

🖥️ A organização das compras acontece pelo site:

💡 Sugestões: cadastre materiais e apoie aqueles que realmente pretende adquirir.

💰 Financiamentos: coloque seu nome durante a coleta, acompanhe os prazos e consulte o valor final e a chave Pix. Depois de pagar, informe o pagamento no site.

📚 Catálogo: encontre compras já finalizadas, adicione os pacotes ao carrinho e encaminhe seu pedido ao Mestre pelo checkout.

📁 Meus itens: consulte os materiais que você adquiriu e os links de acesso disponibilizados.

⚠️ Na descrição do Pix, informe seu telefone cadastrado. Confirmar no site que você pagou não substitui a transferência pelo banco.

🚪 Entre também nos grupos do WhatsApp!

Os três primeiros são obrigatórios. O WhatsApp continua sendo nosso espaço de comunicação e avisos; os registros de sugestões, participações e pagamentos ficam organizados no site.

🔹 GRUPOS OBRIGATÓRIOS

💰 Ponte dos Trolls — Financiamentos
Avisos sobre novas compras, etapas e prazos. Para participar, coloque seu nome pelo site.
https://chat.whatsapp.com/F4XRYxZnG4p4PZR39aRCmJ

📌 Ponte dos Trolls — Assuntos Gerais
Comunicados, orientações e convivência da comunidade.
https://chat.whatsapp.com/EczIMB8znfsI07GoOoSOkW

🧠 Ponte dos Trolls — Sugestões de Compra
Avisos e acompanhamento das ideias da comunidade. Cadastre suas sugestões e registre seus apoios pelo site. Evite bate-papo fora do assunto.
https://chat.whatsapp.com/HMxVFy3qEEGDuWvLTozXWE

🔸 GRUPOS OPCIONAIS

🧙‍♂️ Trolls da Cultura — Pathfinder
https://chat.whatsapp.com/GUeCmy39CgOEH0TqM6iufn

🐉 Trolls da Costa — D&D e derivados
https://chat.whatsapp.com/LUG5PiylZwD8GFJKIYKaQ3

🎲 Trolls Hipsters — Outros RPGs e assuntos diversos
https://chat.whatsapp.com/KoeaCvfW2qS6xdT8vmElJb

📌 Ao entrar, leia a descrição e respeite as regras de cada grupo.

📦 MATERIAIS E ACESSO

Compras anteriores ficam disponíveis no Catálogo do site. Para adquirir, use o carrinho e siga as orientações do checkout.

Materiais de Patreon correspondem ao conteúdo da compra original, sem garantia de atualizações. Módulos de Foundry recebem atualizações conforme a disponibilidade e as condições de acesso.

📁 Drive público PDT — conteúdos gratuitos:
https://drive.google.com/drive/folders/10mGuvJmc2aT864U-o0CtLOMEqXaR4sr8?usp=sharing

Se precisar de acesso ou encontrar alguma dificuldade, procure a administração.

🤝 INDIQUE COM RESPONSABILIDADE

Use “Convidar um amigo” na tela inicial para indicar alguém de sua confiança. O Mestre avaliará a indicação e fará contato caso tenha interesse. Não divulgue convites publicamente.

📜 LEMBRETES IMPORTANTES

• Não compartilhe arquivos ou links de compras com quem não participou delas.
• É proibido compartilhar materiais brasileiros nos canais e no acervo do grupo.
• Respeite os prazos, as regras de convivência e a contribuição anual de manutenção.

👥 ADMINISTRAÇÃO

🧠 Erick — Coordenação geral e organização das compras.
💰 Sidney — Financeiro.
🔧 Daniel Nach — Atualizações de módulos e organização dos arquivos.

🎲 Que seus dados rolem bem, seus tokens tenham sombra e seus mapas estejam sempre prontos!

Bem-vindo(a) à Ponte dos Trolls! 👊🐉`;
  }, [member?.nome, siteUrl]);

  if (!isOpen || !member) return null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(welcomeMessageText);
    setCopied(true);
    onToast('Mensagem de boas-vindas copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsAppDirect = () => {
    if (!phoneNorm.valid) {
      onToast('Número de telefone do membro não possui formato válido para WhatsApp.');
      return;
    }

    // Se o texto for longo (> 1800 caracteres codificados), navegadores móveis e WhatsApp Desktop podem truncar a URL.
    // Nesse caso, copiamos a mensagem completa para a área de transferência e abrimos a conversa diretamente sem texto na URL.
    const encoded = encodeURIComponent(welcomeMessageText);
    if (encoded.length > 1800) {
      navigator.clipboard.writeText(welcomeMessageText);
      setCopied(true);
      onToast('Mensagem completa copiada! Cole na conversa que está se abrindo no WhatsApp.');
      const url = `https://wa.me/${phoneNorm.formattedForUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const url = `https://wa.me/${phoneNorm.formattedForUrl}?text=${encoded}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenWhatsAppAfterCopy = () => {
    if (!phoneNorm.valid) {
      onToast('Número de telefone do membro não possui formato válido para WhatsApp.');
      return;
    }
    navigator.clipboard.writeText(welcomeMessageText);
    setCopied(true);
    onToast('Mensagem completa copiada! Cole na conversa do WhatsApp.');
    const url = `https://wa.me/${phoneNorm.formattedForUrl}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#39421b] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <CheckCircle2 className="w-6 h-6 text-[#a8d363]" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5] leading-tight flex items-center gap-2">
                <span>Membro aprovado!</span>
              </h2>
              <p className="text-[11px] text-[#cfc4a6]">
                Envie as orientações de boas-vindas pelo WhatsApp.
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
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs text-[#302414]">
          
          {/* Card dos Dados do Membro Aprovado */}
          <div className="p-3.5 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#48551F] shrink-0" />
              <div>
                <span className="text-[10px] text-[#71634D] uppercase font-bold block">
                  Nome do Membro:
                </span>
                <span className="text-sm font-bold text-[#302414]">{member.nome}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#716016] shrink-0" />
              <div>
                <span className="text-[10px] text-[#71634D] uppercase font-bold block">
                  Telefone Cadastrado:
                </span>
                <span className="text-xs font-mono font-bold text-[#302414]">
                  {member.telefone || '(Sem telefone informado)'}
                </span>
              </div>
            </div>
          </div>

          {/* Configuração da URL Oficial do Site */}
          <div className="p-3 rounded-xl bg-[#FFF9EC] border border-[#D4A538] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-[#716016] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#48551F]" />
                <span>URL Pública Oficial do Site [LINK DO SITE]</span>
              </span>
              {!isEditingUrl && (
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  className="text-[11px] text-[#48551F] hover:underline font-bold cursor-pointer"
                >
                  {siteUrl ? 'Alterar URL' : 'Configurar URL'}
                </button>
              )}
            </div>

            {isEditingUrl ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://pontedostrolls.com.br"
                  className="flex-1 bg-[#FAF4E6] border border-[#C6AD78] rounded-lg px-2.5 py-1.5 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                />
                <button
                  type="button"
                  onClick={() => handleSaveSiteUrl(siteUrl)}
                  className="px-3 py-1.5 bg-[#48551F] text-[#F8EDD5] rounded-lg font-bold text-xs hover:bg-[#59672A] cursor-pointer"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(false)}
                  className="px-2.5 py-1.5 bg-[#EADBBE] text-[#302414] rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[#55482e]">
                {siteUrl ? (
                  <span className="font-mono font-semibold text-[#48551F]">{siteUrl}</span>
                ) : (
                  <span className="italic text-[#875508]">
                    Nenhuma URL configurada. Clique em "Configurar URL" para preencher o endereço oficial.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Prévia da Mensagem de Boas-Vindas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-rpg font-bold text-xs text-[#302414]">
                Prévia da Mensagem:
              </span>
              <span className="text-[11px] text-[#71634D]">
                Texto formatado com quebras de linha e emojis oficiais
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs leading-relaxed text-[#302414] whitespace-pre-wrap font-sans max-h-60 overflow-y-auto select-text shadow-inner">
              {welcomeMessageText}
            </div>
          </div>

          {/* Aviso sobre Envio Manual e Preservação */}
          <div className="p-2.5 rounded-xl bg-[#EADBBE]/50 border border-[#C6AD78] flex items-start gap-2 text-[11px] text-[#5c4b30]">
            <Info className="w-4 h-4 text-[#716016] shrink-0 mt-0.5" />
            <p>
              A aprovação do membro <strong>já está salva com segurança no sistema</strong>. Abrir o WhatsApp direciona a mensagem para sua conferência e envio manual. Se fechar esta janela agora, você poderá reenviar as orientações a qualquer momento pelo menu do membro.
            </p>
          </div>

        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-3.5 bg-[#FAF4E6] border-t border-[#D6C296] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-3.5 py-2 rounded-xl bg-[#EADBBE] hover:bg-[#E2D1A8] text-[#302414] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-[#716016]" />}
              <span>{copied ? 'Mensagem copiada!' : 'Copiar mensagem'}</span>
            </button>

            <button
              type="button"
              disabled={!phoneNorm.valid}
              onClick={handleOpenWhatsAppDirect}
              className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
              title={phoneNorm.valid ? 'Abrir WhatsApp com o membro aprovado' : 'Telefone do membro inválido'}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Abrir WhatsApp do membro</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
