import React, { useState } from 'react';
import { ItemRPG, Apoiador, UserProfile } from '../types';
import { convertToBRL, formatBRL, formatPhone, cleanPhoneForWhatsApp } from '../utils/helpers';
import { Users, X, UserPlus, Trash2, Calculator, Copy, Check, PhoneCall, CheckCircle2, UserMinus } from 'lucide-react';

interface RateioModalProps {
  item: ItemRPG | null;
  currentUser: UserProfile | null;
  exchangeRate: number;
  onClose: () => void;
  onAddApoiador: (itemId: string, apoiador: Omit<Apoiador, 'id'>) => void;
  onRemoveApoiador: (itemId: string, apoiadorId: string) => void;
  onToast: (msg: string) => void;
}

export const RateioModal: React.FC<RateioModalProps> = ({
  item,
  currentUser,
  exchangeRate,
  onClose,
  onAddApoiador,
  onRemoveApoiador,
  onToast,
}) => {
  const [simulatedCount, setSimulatedCount] = useState<number>(() =>
    Math.max(item?.apoiadores?.length || 1, 3)
  );
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualNome, setManualNome] = useState('');
  const [manualTelefone, setManualTelefone] = useState('');

  React.useEffect(() => {
    if (item) {
      setSimulatedCount(Math.max(item.apoiadores?.length || 1, 3));
      setShowManualForm(false);
      setManualNome('');
      setManualTelefone('');
    }
  }, [item?.id]);

  const valorBRL = item ? convertToBRL(item.valorNumerico, item.moeda, exchangeRate) : 0;
  const totalApoiadores = item?.apoiadores?.length || 0;
  const isUnrevealed = item ? item.valorNumerico === 0 : false;

  const valorRealPorPessoa = totalApoiadores > 0 && !isUnrevealed
    ? valorBRL / totalApoiadores
    : 0;

  const valorSimuladoPorPessoa = simulatedCount > 0 && !isUnrevealed
    ? valorBRL / simulatedCount
    : 0;

  // Verifica se o usuário atual já apoia este item
  const userApoiador = currentUser && item
    ? item.apoiadores?.find(
        (ap) =>
          ap.nome.toLowerCase() === currentUser.nome.toLowerCase() ||
          (currentUser.telefone && ap.telefone && ap.telefone === currentUser.telefone)
      )
    : null;

  const isUserSupporting = Boolean(userApoiador);

  const handleToggleCurrentUserSupport = () => {
    if (!currentUser || !item) return;

    if (isUserSupporting && userApoiador) {
      onRemoveApoiador(item.id, userApoiador.id);
      onToast(`Seu apoio em "${item.nome}" foi retirado.`);
    } else {
      onAddApoiador(item.id, {
        nome: currentUser.nome,
        telefone: currentUser.telefone,
        email: currentUser.email,
        data: new Date().toISOString().split('T')[0],
      });
      onToast(`🤝 Você entrou no rateio de "${item.nome}"!`);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNome.trim() || !item) return;

    onAddApoiador(item.id, {
      nome: manualNome.trim(),
      telefone: manualTelefone.trim(),
      data: new Date().toISOString().split('T')[0],
    });

    setManualNome('');
    setManualTelefone('');
    setShowManualForm(false);
    onToast(`🤝 ${manualNome.trim()} entrou no rateio!`);
  };

  const handleCopyInvite = () => {
    if (!item) return;
    const porPessoaTexto = valorRealPorPessoa > 0
      ? `\n💰 Valor atual: *${formatBRL(valorRealPorPessoa)}* para cada um (${totalApoiadores} confirmados)`
      : '';

    const text = `🎲 *RATEIO ABERTO NO GRUPO:* ${item.nome}
📦 *Produto:* ${item.produto} (${item.sistema})
💵 *Valor Total:* ~${formatBRL(valorBRL)}${porPessoaTexto}
👥 *Interessados até agora:* ${item.apoiadores.map((a) => a.nome).join(', ') || 'Nenhum ainda'}

Quem tiver interesse em rachar, avisa aqui ou entra pelo app!
🔗 Link do produto: ${item.link || 'Foundry VTT Store'}`;

    navigator.clipboard.writeText(text);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
    onToast('Texto de convite copiado para o WhatsApp!');
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#282D13]/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="parchment-card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border-[#C6AD78]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#282D13] border-b border-[#3f471e] flex items-start justify-between text-[#F8EDD5]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-[#3a4419] text-[#F8EDD5] border border-[#C6AD78]">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold font-rpg text-[#F8EDD5]">
                Entrar no Rateio & Vaquinha
              </h2>
            </div>
            <p className="text-xs text-[#cfc4a6]">
              <strong className="text-[#F8EDD5] font-semibold">{item.nome}</strong> · {item.produto} ({item.sistema})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#cfc4a6] hover:text-[#F8EDD5] p-1.5 rounded-lg hover:bg-[#363e1a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 text-xs text-[#302414]">
          
          {/* Values Strip */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296]">
            <div>
              <span className="text-[11px] text-[#71634D] block">Valor Total do Item</span>
              <span className="text-lg font-bold font-mono text-[#302414] tabular-nums">
                {isUnrevealed ? (item.observacaoValor || 'A definir') : formatBRL(valorBRL)}
              </span>
              {item.moeda === 'USD' && !isUnrevealed && (
                <span className="text-[10px] text-[#716016] font-mono block">
                  Original: ${item.valorNumerico.toFixed(2)} USD
                </span>
              )}
            </div>

            <div className="border-l border-[#D6C296] pl-3">
              <span className="text-[11px] text-[#48551F] block font-bold">Divisão Atual</span>
              {totalApoiadores > 0 && !isUnrevealed ? (
                <div>
                  <span className="text-lg font-bold font-mono text-[#48551F] tabular-nums">
                    {formatBRL(valorRealPorPessoa)}
                  </span>
                  <span className="text-[10px] text-[#71634D] block">
                    Entre {totalApoiadores} apoiador(es)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[#71634D] mt-1 block">
                  {isUnrevealed ? 'Preço indefinido' : 'Seja o 1º a apoiar!'}
                </span>
              )}
            </div>
          </div>

          {/* 1-Click User Apoiar / Retirar Apoio */}
          {currentUser && (
            <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#71634D] block">Seu Perfil Conectado:</span>
                  <strong className="text-sm text-[#302414] font-bold">{currentUser.nome}</strong>
                  {currentUser.telefone && (
                    <span className="block text-[11px] text-[#71634D] font-mono">{currentUser.telefone}</span>
                  )}
                </div>
                {isUserSupporting && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#dbe6c2] text-[#354817] border border-[#8ea259] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apoiando</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleCurrentUserSupport}
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer ${
                  isUserSupporting
                    ? 'bg-[#FEE2E2] hover:bg-[#FECACA] text-[#991B1B] border border-[#EF4444]'
                    : 'bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5]'
                }`}
              >
                {isUserSupporting ? (
                  <>
                    <UserMinus className="w-4 h-4 stroke-[2.5]" />
                    <span>Retirar Meu Apoio Deste Rateio</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirmar Meu Apoio no Rateio</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Adicionar outro apoiador manualmente */}
          <div className="pt-1">
            {!showManualForm ? (
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="text-[11px] text-[#71634D] hover:text-[#302414] underline flex items-center gap-1 cursor-pointer"
              >
                <span>+ Adicionar outro apoiador manualmente</span>
              </button>
            ) : (
              <form onSubmit={handleManualAdd} className="p-3 bg-[#FAF4E6] border border-[#C6AD78] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#302414] text-xs">Adicionar Outro Apoiador:</span>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="text-[#71634D] hover:text-[#302414] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do apoiador"
                    value={manualNome}
                    onChange={(e) => setManualNome(e.target.value)}
                    className="bg-[#F8EDD5] border border-[#C6AD78] rounded-lg px-2.5 py-1.5 text-xs text-[#302414] focus:outline-none focus:border-[#48551F]"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp (opcional)"
                    value={manualTelefone}
                    onChange={(e) => setManualTelefone(formatPhone(e.target.value))}
                    className="bg-[#F8EDD5] border border-[#C6AD78] rounded-lg px-2.5 py-1.5 text-xs text-[#302414] font-mono focus:outline-none focus:border-[#48551F]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] transition-colors cursor-pointer"
                >
                  Adicionar Apoiador
                </button>
              </form>
            )}
          </div>

          {/* Interactive Split Simulator */}
          {!isUnrevealed && (
            <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#302414] flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#716016]" />
                  <span>Simulador de Rateio:</span>
                </span>
                <span className="font-mono font-bold text-[#48551F] tabular-nums">
                  {simulatedCount} pessoas = {formatBRL(valorSimuladoPorPessoa)} cada
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={simulatedCount}
                  onChange={(e) => setSimulatedCount(parseInt(e.target.value))}
                  className="w-full accent-[#48551F] cursor-pointer h-1.5 bg-[#EADBBE] rounded-lg"
                />
                <span className="font-mono text-xs text-[#71634D] w-7 text-right">
                  {simulatedCount}x
                </span>
              </div>
            </div>
          )}

          {/* Existing Supporters List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#302414]">
                Membros no Rateio ({totalApoiadores})
              </h4>
            </div>

            {totalApoiadores === 0 ? (
              <p className="text-xs text-[#71634D] text-center py-3 bg-[#FAF4E6] rounded-lg border border-dashed border-[#C6AD78]">
                Nenhum membro confirmou interesse ainda.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {item.apoiadores.map((ap) => {
                  const isCurrent = currentUser && ap.nome.toLowerCase() === currentUser.nome.toLowerCase();
                  return (
                    <div
                      key={ap.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                        isCurrent
                          ? 'bg-[#dbe6c2] border-[#8ea259]'
                          : 'bg-[#FAF4E6] border-[#C6AD78]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#48551F] text-[#F8EDD5] flex items-center justify-center font-bold text-[9px]">
                          {ap.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-[#302414]">
                            {ap.nome} {isCurrent && <span className="text-[#354817] text-[10px] font-bold">(você)</span>}
                          </span>
                          {ap.telefone && (
                            <a
                              href={`https://wa.me/${cleanPhoneForWhatsApp(ap.telefone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#48551F] hover:underline font-mono inline-flex items-center gap-1 ml-2 font-semibold"
                            >
                              <PhoneCall className="w-2.5 h-2.5" />
                              <span>{ap.telefone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onRemoveApoiador(item.id, ap.id);
                          onToast(`Removido do rateio: ${ap.nome}`);
                        }}
                        className="text-[#71634D] hover:text-[#8b261b] p-1 rounded transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#D6C296] bg-[#FBF4E4] flex items-center justify-between gap-2.5">
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#EADBBE] hover:bg-[#E2D1A8] border border-[#C6AD78] text-[#302414] transition-colors cursor-pointer"
          >
            {copiedInvite ? <Check className="w-3.5 h-3.5 text-[#48551F]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar Convite WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#302414] bg-[#EADBBE] hover:bg-[#E2D1A8] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
