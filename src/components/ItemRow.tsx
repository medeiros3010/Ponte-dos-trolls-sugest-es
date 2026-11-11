import React, { useState } from 'react';
import { ItemRPG, UserProfile } from '../types';
import { convertToBRL, formatBRL, formatUSD, cleanPhoneForWhatsApp } from '../utils/helpers';
import {
  ExternalLink,
  Users,
  Copy,
  Check,
  ChevronDown,
  PhoneCall,
  Pencil,
  Trash2,
  X,
  UserPlus,
  CheckCircle,
} from 'lucide-react';

interface ItemRowProps {
  item: ItemRPG;
  exchangeRate: number;
  currentUser?: UserProfile | null;
  onOpenApoiar: (item: ItemRPG) => void;
  onRemoveApoiador: (itemId: string, apoiadorId: string) => void;
  onCopyWhatsApp: (item: ItemRPG) => void;
  onEdit: (item: ItemRPG) => void;
  onDelete: (id: string) => void;
}

export const ItemRow: React.FC<ItemRowProps> = ({
  item,
  exchangeRate,
  currentUser,
  onOpenApoiar,
  onRemoveApoiador,
  onCopyWhatsApp,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSupporters, setShowSupporters] = useState(false);
  const [copied, setCopied] = useState(false);

  const valorConvertidoBRL = convertToBRL(item.valorNumerico, item.moeda, exchangeRate);
  const totalApoiadores = item.apoiadores?.length || 0;
  const isUnrevealed = item.valorNumerico === 0;
  const isFinalizado = item.status === 'Finalizados';

  const isUserSupporting = Boolean(
    currentUser &&
      item.apoiadores?.some(
        (ap) =>
          ap.nome.toLowerCase() === currentUser.nome.toLowerCase() ||
          (currentUser.telefone && ap.telefone && ap.telefone === currentUser.telefone)
      )
  );

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyWhatsApp(item);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-[#122015] border rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:border-[#2e5236] shadow-md shadow-black/20 ${
        isFinalizado
          ? 'border-[#1a2d1f] opacity-85 hover:opacity-100'
          : 'border-[#203625] hover:shadow-lg'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* 1. Esquerda: Miniatura + Sistema + Produto + Nome + Expansor */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-2">
          {item.imageUrl ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#0a120c] border border-[#203625] shrink-0 flex items-center justify-center">
              <img
                src={item.imageUrl}
                alt={item.nome}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#0e1911] border border-[#1f3524] shrink-0 flex items-center justify-center text-lg text-[#6e8571]">
              🎲
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Badges do Sistema, Produto e Promoção */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-[#182c1d] border border-[#27442d] text-[#d49e2a] font-mono font-bold text-xs uppercase tracking-wide">
                {item.sistema}
              </span>
              <span className="text-xs text-[#7e9381] font-medium">
                {item.produto}
              </span>
              {item.observacaoValor && (
                <span className="text-xs text-[#c69a45] italic font-medium">
                  · {item.observacaoValor}
                </span>
              )}
            </div>

            {/* Nome do Item */}
            <h3 className="font-bold text-[#f4ecd8] text-sm sm:text-base tracking-tight leading-snug break-words">
              {item.nome}
            </h3>

            {/* Botão de Expansão */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-[#7d9380] hover:text-[#d49e2a] transition-colors cursor-pointer"
            >
              <span>{isExpanded ? 'Ocultar detalhes' : 'Ver detalhes ▾'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Centro-Direita (Apenas Valor Total e Conversão - SEM divisão por pessoa) */}
        <div className="text-left lg:text-right shrink-0 lg:min-w-[130px] py-1 border-t lg:border-t-0 border-[#1a2e1e]">
          <div className="text-[11px] font-medium text-[#7a8e7d] uppercase tracking-wider mb-0.5">
            Valor Total
          </div>
          <div className="flex lg:flex-col items-baseline lg:items-end gap-2 lg:gap-0">
            <span className="text-base sm:text-xl font-bold font-mono text-[#f4ecd8] tabular-nums">
              {isUnrevealed
                ? (item.observacaoValor || 'A definir')
                : item.moeda === 'USD'
                  ? formatUSD(item.valorNumerico)
                  : formatBRL(item.valorNumerico)}
            </span>
            {item.moeda === 'USD' && !isUnrevealed && (
              <span className="text-xs text-[#8e9f90] font-mono tabular-nums">
                ~{formatBRL(valorConvertidoBRL)}
              </span>
            )}
          </div>
        </div>

        {/* 3. Direita (Apoiadores e Ações) */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#1a2e1e]">
          
          {/* Badge Clicável: 👥 X Apoiadores */}
          <div className="relative">
            <button
              onClick={() => setShowSupporters(!showSupporters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e1710] border border-[#203625] hover:border-[#d49e2a]/50 text-[#c2cbbe] hover:text-[#d49e2a] transition-colors text-xs font-semibold"
              title="Clique para ver quem já apoia ou remover"
            >
              <Users className="w-4 h-4 text-[#d49e2a]" />
              <span className="font-mono font-bold tabular-nums">{totalApoiadores}</span>
              <span className="hidden sm:inline text-xs text-[#8e9f90]">Apoiadores</span>
            </button>

            {/* Popover / Modal de Apoiadores */}
            {showSupporters && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowSupporters(false)}
                />
                <div className="absolute right-0 bottom-full mb-2 z-30 w-64 bg-[#142318] border border-[#27442d] rounded-2xl shadow-2xl p-3.5 text-xs text-[#f1ede4] animate-in fade-in duration-100">
                  <div className="font-semibold text-[#d49e2a] pb-2 border-b border-[#1f3724] mb-2 flex items-center justify-between">
                    <span>Apoiadores Confirmados ({totalApoiadores})</span>
                    <button
                      onClick={() => setShowSupporters(false)}
                      className="text-[#6e8070] hover:text-[#f4ecd8] p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {totalApoiadores === 0 ? (
                    <p className="text-xs text-[#738776] py-2 text-center">Nenhum apoiador ainda.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {item.apoiadores.map((ap) => (
                        <div
                          key={ap.id}
                          className="flex items-center justify-between py-1 px-2 rounded-lg bg-[#0e1710] border border-[#1e3422]"
                        >
                          <div className="truncate mr-2">
                            <span className="font-medium text-[#f4ecd8]">{ap.nome}</span>
                            {ap.telefone && (
                              <a
                                href={`https://wa.me/${cleanPhoneForWhatsApp(ap.telefone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-[10px] text-[#43aa6a] hover:underline font-mono"
                              >
                                {ap.telefone}
                              </a>
                            )}
                          </div>

                          <button
                            onClick={() => onRemoveApoiador(item.id, ap.id)}
                            className="text-[#738776] hover:text-[#e06c75] p-1 rounded transition-colors shrink-0"
                            title="Remover apoio"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isFinalizado && (
                    <button
                      onClick={() => {
                        setShowSupporters(false);
                        onOpenApoiar(item);
                      }}
                      className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-bold bg-[#182b1d] hover:bg-[#203a27] text-[#d49e2a] border border-[#27442d] flex items-center justify-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Adicionar Mais Um Apoio</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botão Principal: 🙋‍♂️ Apoiar ou Apoiado (Oculto no Modo Mestre) */}
          {!isFinalizado && !currentUser?.isMaster ? (
            <button
              onClick={() => onOpenApoiar(item)}
              className={`py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-black/30 active:scale-95 whitespace-nowrap ${
                isUserSupporting
                  ? 'bg-[#183824] hover:bg-[#1f482e] text-[#6ee7b7] border border-[#34d399]/70'
                  : 'bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015]'
              }`}
              title={isUserSupporting ? 'Você já está apoiando! Clique para gerenciar ou retirar apoio' : 'Entrar no rateio deste item'}
            >
              {isUserSupporting ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#34d399]" />
                  <span>Apoiado ({totalApoiadores})</span>
                </>
              ) : (
                <>
                  <span>🙋‍♂️ Apoiar</span>
                  {totalApoiadores > 0 && <span className="font-mono text-xs">({totalApoiadores})</span>}
                </>
              )}
            </button>
          ) : (
            <div className="py-2 px-3 rounded-xl bg-[#15291b] border border-[#264c30] text-[#52c27c] text-xs font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Finalizado</span>
            </div>
          )}

          {/* Botões de Ação Rápida (Exatamente 4 botões: WhatsApp, Link, Editar, Excluir) */}
          <div className="flex items-center gap-1">
            
            {/* 1. Copiar Resumo WhatsApp (📋) */}
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl text-[#43aa6a] hover:text-[#52c27c] bg-[#16271a] hover:bg-[#1f3724] border border-[#24402a] transition-colors"
              title="Copiar resumo para WhatsApp"
            >
              {copied ? <Check className="w-4 h-4 text-[#52c27c]" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* 2. Abrir Link da Loja (🔗) */}
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-[#8e9f90] hover:text-[#f4ecd8] bg-[#16271a] hover:bg-[#1f3724] border border-[#24402a] transition-colors"
                title="Abrir link oficial da loja"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <span
                className="p-2 rounded-xl text-[#3d5040] bg-[#101b13] border border-[#1b2f20] cursor-not-allowed opacity-40"
                title="Sem link informado"
              >
                <ExternalLink className="w-4 h-4" />
              </span>
            )}

            {/* 3. Editar (✏️) - Onde o status é alterado com segurança */}
            <button
              onClick={() => onEdit(item)}
              className="p-2 rounded-xl text-[#738776] hover:text-[#d49e2a] bg-[#16271a] hover:bg-[#1f3724] border border-[#24402a] transition-colors"
              title="Editar dados e status do item"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* 4. Excluir (🗑️) - Abre modal customizado sem window.confirm */}
            <button
              data-action="delete"
              data-id={String(item.id)}
              onClick={() => onDelete(String(item.id))}
              className="p-2 rounded-xl text-[#738776] hover:text-[#e06c75] bg-[#16271a] hover:bg-[#2b171a] border border-[#24402a] transition-colors"
              title="Excluir item do catálogo"
            >
              <Trash2 className="w-4 h-4" />
            </button>

          </div>

        </div>

      </div>

      {/* Área Expansível: Descrição e Autor */}
      {isExpanded && (
        <div className="mt-3.5 pt-3.5 border-t border-[#1e3422] text-xs text-[#a4b5a6] space-y-2 animate-in fade-in duration-150">
          {item.descricao && (
            <p className="leading-relaxed bg-[#0c150e] p-3 rounded-xl border border-[#1b2f20]">
              {item.descricao}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7a8e7d] pt-1">
            <span>
              Sugerido por: <strong className="text-[#f4ecd8] font-medium">{item.sugeridoPorNome}</strong>
            </span>
            {item.sugeridoPorTelefone && (
              <a
                href={`https://wa.me/${cleanPhoneForWhatsApp(item.sugeridoPorTelefone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#43aa6a] hover:underline font-mono"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{item.sugeridoPorTelefone}</span>
              </a>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
