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
  if (!item) return null;

  const valorBRL = convertToBRL(item.valorNumerico, item.moeda, exchangeRate);
  const totalApoiadores = item.apoiadores?.length || 0;
  const isUnrevealed = item.valorNumerico === 0;

  const valorRealPorPessoa = totalApoiadores > 0 && !isUnrevealed
    ? valorBRL / totalApoiadores
    : 0;

  const [simulatedCount, setSimulatedCount] = useState<number>(
    Math.max(item.apoiadores.length || 1, 3)
  );
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualNome, setManualNome] = useState('');
  const [manualTelefone, setManualTelefone] = useState('');

  const valorSimuladoPorPessoa = simulatedCount > 0 && !isUnrevealed
    ? valorBRL / simulatedCount
    : 0;

  // Verifica se o usuário atual já apoia este item
  const userApoiador = currentUser
    ? item.apoiadores?.find(
        (ap) =>
          ap.nome.toLowerCase() === currentUser.nome.toLowerCase() ||
          (currentUser.telefone && ap.telefone && ap.telefone === currentUser.telefone)
      )
    : null;

  const isUserSupporting = Boolean(userApoiador);

  const handleToggleCurrentUserSupport = () => {
    if (!currentUser) return;

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
    if (!manualNome.trim()) return;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#122015] border border-[#233a29] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f3524] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-[#182b1d] text-[#d49e2a] border border-[#27442d]">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#f4ecd8]">
                Entrar no Rateio & Vaquinha
              </h2>
            </div>
            <p className="text-xs text-[#8a9d8c]">
              <strong className="text-[#d49e2a] font-medium">{item.nome}</strong> · {item.produto} ({item.sistema})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#738776] hover:text-[#f3efe6] p-1.5 rounded-lg hover:bg-[#182b1d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 text-xs">
          
          {/* Values Strip */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0d160f] border border-[#1e3422]">
            <div>
              <span className="text-[11px] text-[#7a8e7d] block">Valor Total do Item</span>
              <span className="text-lg font-bold font-mono text-[#f3efe6] tabular-nums">
                {isUnrevealed ? (item.observacaoValor || 'A definir') : formatBRL(valorBRL)}
              </span>
              {item.moeda === 'USD' && !isUnrevealed && (
                <span className="text-[10px] text-[#d49e2a]/80 font-mono block">
                  Original: ${item.valorNumerico.toFixed(2)} USD
                </span>
              )}
            </div>

            <div className="border-l border-[#1e3422] pl-3">
              <span className="text-[11px] text-[#d49e2a] block font-medium">Divisão Atual</span>
              {totalApoiadores > 0 && !isUnrevealed ? (
                <div>
                  <span className="text-lg font-bold font-mono text-[#e5b23d] tabular-nums">
                    {formatBRL(valorRealPorPessoa)}
                  </span>
                  <span className="text-[10px] text-[#8e9f90] block">
                    Entre {totalApoiadores} apoiador(es)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[#738776] mt-1 block">
                  {isUnrevealed ? 'Preço indefinido' : 'Seja o 1º a apoiar!'}
                </span>
              )}
            </div>
          </div>

          {/* 1-Click User Apoiar / Retirar Apoio */}
          {currentUser && (
            <div className="p-4 rounded-xl bg-[#0d160f] border border-[#203725] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#a4b5a6] block">Seu Perfil Conectado:</span>
                  <strong className="text-sm text-[#f4ecd8] font-bold">{currentUser.nome}</strong>
                  {currentUser.telefone && (
                    <span className="block text-[11px] text-[#7a8e7d] font-mono">{currentUser.telefone}</span>
                  )}
                </div>
                {isUserSupporting && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#183824] text-[#6ee7b7] border border-[#34d399]/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apoiando</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleCurrentUserSupport}
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                  isUserSupporting
                    ? 'bg-[#2b171a] hover:bg-[#3d1e22] text-[#e06c75] border border-[#7f1d1d]'
                    : 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015]'
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
                className="text-[11px] text-[#8e9f90] hover:text-[#d49e2a] underline flex items-center gap-1"
              >
                <span>+ Adicionar outro apoiador manualmente</span>
              </button>
            ) : (
              <form onSubmit={handleManualAdd} className="p-3 bg-[#0d160f]/60 border border-[#1b2f20] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#c2cbbe] text-xs">Adicionar Outro Apoiador:</span>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="text-[#7a8e7d] hover:text-[#f4ecd8]"
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
                    className="bg-[#142318] border border-[#233a29] rounded-lg px-2.5 py-1.5 text-xs text-[#f3efe6] focus:outline-none focus:border-[#d49e2a]"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp (opcional)"
                    value={manualTelefone}
                    onChange={(e) => setManualTelefone(formatPhone(e.target.value))}
                    className="bg-[#142318] border border-[#233a29] rounded-lg px-2.5 py-1.5 text-xs text-[#f3efe6] focus:outline-none focus:border-[#d49e2a]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-[#182b1d] hover:bg-[#203a27] text-[#d49e2a] border border-[#27442d] transition-colors"
                >
                  Adicionar Apoiador
                </button>
              </form>
            )}
          </div>

          {/* Interactive Split Simulator */}
          {!isUnrevealed && (
            <div className="p-3.5 rounded-xl bg-[#0d160f]/50 border border-[#1b2f20] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#a4b5a6] flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#d49e2a]" />
                  <span>Simulador de Rateio:</span>
                </span>
                <span className="font-mono font-bold text-[#d49e2a] tabular-nums">
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
                  className="w-full accent-[#d49e2a] cursor-pointer h-1.5 bg-[#1a2d1f] rounded-lg"
                />
                <span className="font-mono text-xs text-[#8e9f90] w-7 text-right">
                  {simulatedCount}x
                </span>
              </div>
            </div>
          )}

          {/* Existing Supporters List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-[#c2cbbe]">
                Membros no Rateio ({totalApoiadores})
              </h4>
            </div>

            {totalApoiadores === 0 ? (
              <p className="text-xs text-[#6e8071] text-center py-3 bg-[#0d160f]/40 rounded-lg border border-dashed border-[#1e3422]">
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
                          ? 'bg-[#183824] border-[#34d399]/40'
                          : 'bg-[#0d160f] border-[#1e3422]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#182b1d] text-[#d49e2a] flex items-center justify-center font-bold text-[9px] border border-[#27442d]">
                          {ap.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-[#f4ecd8]">
                            {ap.nome} {isCurrent && <span className="text-[#6ee7b7] text-[10px]">(você)</span>}
                          </span>
                          {ap.telefone && (
                            <a
                              href={`https://wa.me/${cleanPhoneForWhatsApp(ap.telefone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#43aa6a] hover:underline font-mono inline-flex items-center gap-1 ml-2"
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
                        className="text-[#647565] hover:text-[#e06c75] p-1 rounded transition-colors"
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
        <div className="p-4 sm:p-5 border-t border-[#1f3524] bg-[#0e1710]/80 flex items-center justify-between gap-2.5">
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#182b1d] hover:bg-[#203a27] border border-[#27442d] text-[#d49e2a] transition-colors"
          >
            {copiedInvite ? <Check className="w-3.5 h-3.5 text-[#52c27c]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar Convite WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#c2cbbe] hover:text-[#f4ecd8] bg-[#16271a] hover:bg-[#1f3724] transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
