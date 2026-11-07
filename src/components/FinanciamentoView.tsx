import React, { useState } from 'react';
import { FundingPackage, UserProfile } from '../types';
import { ArrowLeft, Flame, Plus, ExternalLink, Users, Check, UserPlus, CheckCircle2, Edit2, Trash2, Calendar, AlertTriangle, Copy, MessageSquare, ShieldAlert } from 'lucide-react';
import { formatDateDisplay, generatePackageWhatsAppAnnouncement } from '../utils/helpers';

interface FinanciamentoViewProps {
  packages: FundingPackage[];
  currentUser: UserProfile;
  onGoHome: () => void;
  onOpenCreatePackage: () => void;
  onEditPackage: (pkg: FundingPackage) => void;
  onDeletePackage: (pkg: FundingPackage) => void;
  onMoveToCatalog: (pkg: FundingPackage) => void;
  onToggleSupport: (packageId: string) => void;
  onToast: (msg: string) => void;
}

export const FinanciamentoView: React.FC<FinanciamentoViewProps> = ({
  packages,
  currentUser,
  onGoHome,
  onOpenCreatePackage,
  onEditPackage,
  onDeletePackage,
  onMoveToCatalog,
  onToggleSupport,
  onToast,
}) => {
  const isMaster = Boolean(currentUser.isMaster);
  const openPackages = packages.filter((p) => p.status === 'Financiamento');

  // Commitment Confirmation Modal state
  const [packageToCommit, setPackageToCommit] = useState<FundingPackage | null>(null);
  const [copiedAnnouncementId, setCopiedAnnouncementId] = useState<string | null>(null);

  const handleParticipateClick = (pkg: FundingPackage) => {
    const isUserSupporting = (pkg.apoiadores || []).some(
      (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
    );

    if (isUserSupporting) {
      // Já está participando -> remove
      onToggleSupport(pkg.id);
    } else {
      // Não está participando -> abre modal de compromisso oficial
      setPackageToCommit(pkg);
    }
  };

  const handleConfirmCommitment = () => {
    if (!packageToCommit) return;
    onToggleSupport(packageToCommit.id);
    onToast(`Você assumiu o compromisso e entrou no rateio de "${packageToCommit.titulo}"!`);
    setPackageToCommit(null);
  };

  const handleCopyAnnouncement = (pkg: FundingPackage) => {
    const announcement = generatePackageWhatsAppAnnouncement(pkg);
    navigator.clipboard.writeText(announcement);
    setCopiedAnnouncementId(pkg.id);
    setTimeout(() => setCopiedAnnouncementId(null), 2200);
    onToast('Anúncio oficial para WhatsApp copiado! Envie no grupo.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col animate-in fade-in duration-200">
      
      {/* Top Bar com Voltar ao Menu Inicial */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1f3524]">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#142318] hover:bg-[#1a2f20] text-[#d49e2a] hover:text-[#f4ecd8] border border-[#27442d] text-xs font-semibold transition-all hover:-translate-x-0.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Menu Inicial</span>
        </button>

        <div className="flex items-center gap-2">
          {isMaster && (
            <button
              onClick={onOpenCreatePackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Criar Pacote de Financiamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Título da Seção */}
      <div className="mb-6 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e5b23d] uppercase tracking-wider">
          <Flame className="w-4 h-4 animate-pulse text-[#d49e2a]" />
          <span>Vaquinhas Abertas & Rateio Ativo</span>
        </div>
        <h1 className="font-rpg text-2xl sm:text-3xl font-bold text-[#f4ecd8]">
          Financiamento em Andamento
        </h1>
        <p className="text-xs sm:text-sm text-[#8a9d8c]">
          Pacotes oficiais consolidados pelo Mestre da Ponte. Clique para participar do rateio e garantir sua cota antes da compra!
        </p>
      </div>

      {/* Lista de Pacotes */}
      {openPackages.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#1f3524] rounded-3xl bg-[#0c150e]/60">
          <div className="w-16 h-16 rounded-full bg-[#182c1d] border border-[#27442d] flex items-center justify-center mx-auto mb-3 text-2xl">
            🔥
          </div>
          <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
            Nenhum pacote em financiamento no momento
          </h3>
          <p className="text-xs text-[#8a9d8c] mt-1 max-w-md mx-auto">
            {isMaster
              ? 'Como Mestre da Ponte, você pode clicar no botão acima "Criar Pacote de Financiamento" para agrupar as sugestões da galera em uma vaquinha.'
              : 'O Mestre da Ponte ainda não abriu novas vaquinhas. Você pode acessar a tela de "Sugerir Compras" para enviar novas ideias!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {openPackages.map((pkg) => {
            const apoiadores = pkg.apoiadores || [];
            const count = apoiadores.length;
            const valorTotal = pkg.valorTotalBRL || 0;
            const minimo = pkg.minimoParticipantes || 35;
            const valorMaximoPorPessoa = pkg.valorMaximoPorPessoa || (valorTotal / minimo);
            const valorAtualPorPessoa = count > 0 ? (valorTotal / count) : valorTotal;

            const isUserSupporting = apoiadores.some(
              (ap) => ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase()
            );

            return (
              <div
                key={pkg.id}
                className="bg-gradient-to-b from-[#152418] to-[#0f1b12] border-2 border-[#203625] hover:border-[#d49e2a]/50 rounded-3xl p-5 sm:p-7 shadow-xl transition-all space-y-5"
              >
                {/* Header do Card */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1c3222] text-[#d49e2a] border border-[#d49e2a]/30">
                        {pkg.sistema || 'Foundry VTT Geral'}
                      </span>
                      <span className="text-[11px] text-[#7a8e7d]">
                        Aberto em {formatDateDisplay(pkg.criadoEm)}
                      </span>
                    </div>
                    <h2 className="font-rpg text-xl sm:text-2xl font-bold text-[#f4ecd8] leading-tight">
                      {pkg.titulo}
                    </h2>
                  </div>

                  {/* Ações de Mestre */}
                  {isMaster && (
                    <div className="flex items-center gap-1.5 bg-[#0e1911] p-1.5 rounded-xl border border-[#203625]">
                      <button
                        onClick={() => onMoveToCatalog(pkg)}
                        className="px-2.5 py-1 text-xs font-bold bg-[#1d3d25] hover:bg-[#275232] text-[#6ee7b7] border border-[#34d399]/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mover este pacote concluído para o Catálogo do Drive"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mover para Catálogo</span>
                      </button>
                      <button
                        onClick={() => onEditPackage(pkg)}
                        className="p-1.5 text-[#a4b5a6] hover:text-[#f4ecd8] hover:bg-[#1a2f20] rounded-lg transition-colors cursor-pointer"
                        title="Editar pacote"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePackage(pkg)}
                        className="p-1.5 text-[#a4b5a6] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Excluir pacote"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Itens Inclusos Detalhados */}
                {pkg.itens && pkg.itens.length > 0 ? (
                  <div className="p-4 rounded-2xl bg-[#0c150e]/80 border border-[#1f3524] space-y-2.5">
                    <span className="text-[11px] font-bold text-[#d49e2a] uppercase tracking-wider block">
                      Itens inclusos no pacote ({pkg.itens.length}):
                    </span>
                    <div className="divide-y divide-[#182a1c]">
                      {pkg.itens.map((it) => (
                        <div key={it.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[#d49e2a] font-bold">📜</span>
                            <span className="font-semibold text-[#f4ecd8]">{it.nome}</span>
                            <span className="text-[10px] bg-[#1a3321] text-[#a4b5a6] px-1.5 py-0.2 rounded border border-[#25462e]">
                              {it.sistema}
                            </span>
                            {it.link && (
                              <a
                                href={it.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#6ee7b7] hover:underline flex items-center gap-0.5"
                                title="Ver link do produto"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#d49e2a]">
                            R$ {it.precoBRL.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  pkg.itensInclusos && pkg.itensInclusos.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#0c150e]/80 border border-[#1f3524] space-y-2">
                      <span className="text-[11px] font-bold text-[#d49e2a] uppercase tracking-wider block">
                        Itens inclusos neste pacote:
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#d1d5db]">
                        {pkg.itensInclusos.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#d49e2a] font-bold mt-0.5">✦</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}

                {/* Descrição */}
                {pkg.descricao && (
                  <p className="text-xs text-[#8a9d8c] leading-relaxed">
                    {pkg.descricao}
                  </p>
                )}

                {/* Prazos Importantes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-[#0e1911] border border-[#203625] text-xs">
                  <div className="flex items-center gap-2 text-[#a4b5a6]">
                    <Calendar className="w-4 h-4 text-[#d49e2a] shrink-0" />
                    <span>
                      Prazo para colocar nome: <strong className="text-[#f4ecd8]">{formatDateDisplay(pkg.dataFinalizar)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#a4b5a6]">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Prazo para pagamento: <strong className="text-[#f4ecd8]">{formatDateDisplay(pkg.dataPagamento)}</strong>
                    </span>
                  </div>
                </div>

                {/* Box Financeiro & Rateio */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#122015] border border-[#203625]">
                  <div>
                    <span className="text-[10px] text-[#7a8e7d] uppercase tracking-wider font-semibold block">
                      Valor Total do Pacote
                    </span>
                    <span className="font-mono text-lg sm:text-xl font-bold text-[#f4ecd8]">
                      R$ {valorTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#7a8e7d] uppercase tracking-wider font-semibold block">
                      Participantes Mínimos
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-[#6ee7b7] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#34d399]" />
                      <span>{count} / {minimo}</span>
                    </span>
                  </div>

                  {/* Destaque Dourado */}
                  <div className="bg-gradient-to-r from-[#21351d] to-[#172b1a] p-3 rounded-xl border-2 border-[#d49e2a] shadow-md">
                    <span className="text-[10px] text-[#d49e2a] uppercase tracking-wider font-bold block">
                      Valor Máximo por Pessoa:
                    </span>
                    <span className="font-rpg text-lg sm:text-xl font-bold text-[#fbbf24]">
                      R$ {valorMaximoPorPessoa.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Lista de Participantes Confirmados */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#a4b5a6] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#d49e2a]" />
                      <span>Participantes confirmados ({count}):</span>
                    </span>
                  </div>

                  {/* Tags dos membros participantes */}
                  <div className="flex flex-wrap gap-1.5">
                    {apoiadores.length === 0 ? (
                      <span className="text-xs italic text-[#7a8e7d]">
                        Nenhum participante ainda. Seja o primeiro a entrar na lista!
                      </span>
                    ) : (
                      apoiadores.map((ap, idx) => {
                        const isMe = ap.id === currentUser.id || ap.nome.toLowerCase() === currentUser.nome.toLowerCase();
                        return (
                          <span
                            key={ap.id || idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              isMe
                                ? 'bg-[#183824] text-[#6ee7b7] border-[#34d399]/60 font-bold'
                                : 'bg-[#122015] text-[#d1d5db] border-[#203625]'
                            }`}
                          >
                            <span>{idx + 1}. {ap.nome}</span>
                            {isMe && <span className="text-[10px] text-[#34d399]">(Você)</span>}
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Barra de Ações: Botão WhatsApp Oficial + Botão Participar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1f3524]">
                    {/* Botão Copiar Anúncio Oficial (WhatsApp) */}
                    <button
                      type="button"
                      onClick={() => handleCopyAnnouncement(pkg)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#152719] hover:bg-[#1d3523] text-[#43aa6a] hover:text-[#6ee7b7] border border-[#26482e] transition-colors flex items-center gap-2 cursor-pointer"
                      title="Copiar anúncio oficial idêntico ao formato do grupo do WhatsApp"
                    >
                      {copiedAnnouncementId === pkg.id ? (
                        <Check className="w-4 h-4 text-[#34d399]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>
                        {copiedAnnouncementId === pkg.id ? 'Anúncio Copiado!' : 'Copiar Anúncio Oficial (WhatsApp)'}
                      </span>
                    </button>

                    {/* Botão de Participar */}
                    <button
                      type="button"
                      onClick={() => handleParticipateClick(pkg)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                        isUserSupporting
                          ? 'bg-[#1c3825] hover:bg-[#254d31] text-[#6ee7b7] border border-[#34d399]/50 shadow-[#34d399]/10'
                          : 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-[#d49e2a]/20 hover:scale-[1.02]'
                      }`}
                    >
                      {isUserSupporting ? (
                        <>
                          <Check className="w-4 h-4 text-[#34d399] stroke-[3]" />
                          <span>Participando da Vaquinha (Clique para Sair)</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 stroke-[2.5]" />
                          <span>Participar deste Financiamento</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Compromisso de Pagamento (Especificação 4) */}
      {packageToCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#122015] border-2 border-amber-500/70 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-rpg text-lg font-bold text-[#f4ecd8]">
                  Compromisso Oficial de Pagamento
                </h3>
                <span className="text-xs text-amber-400/90 font-semibold">
                  A Ponte dos Trolls - Vaquinha Coletiva
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c150e] border border-[#203625] text-xs space-y-2 leading-relaxed text-[#f1ede4]">
              <p>
                Atenção, <strong>{currentUser.nome}</strong>!
              </p>
              <p className="text-[#d1d5db]">
                Ao colocar seu nome nesta lista, <strong>você se compromete oficialmente que, caso o financiamento atinja o número mínimo ({packageToCommit.minimoParticipantes || 35} cotistas) e seja realizado, você irá efetuar o pagamento do valor correspondente</strong> (no máximo <strong className="text-[#fbbf24]">R$ {(packageToCommit.valorMaximoPorPessoa || (packageToCommit.valorTotalBRL / (packageToCommit.minimoParticipantes || 1))).toFixed(2).replace('.', ',')}</strong>) até a data limite de <strong>{formatDateDisplay(packageToCommit.dataPagamento)}</strong>.
              </p>
              <p className="text-[11px] text-amber-300/80 pt-1">
                ⚠️ <em>Lembre-se: Pagamentos fora do prazo recebem 1 strike. Mantenha o compromisso com o grupo!</em>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPackageToCommit(null)}
                className="px-4 py-2 text-xs text-[#8a9d8c] hover:text-[#f4ecd8] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCommitment}
                className="px-5 py-2.5 font-bold text-xs sm:text-sm rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] shadow-lg shadow-black/40 transition-all cursor-pointer"
              >
                Assumir Compromisso e Participar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
