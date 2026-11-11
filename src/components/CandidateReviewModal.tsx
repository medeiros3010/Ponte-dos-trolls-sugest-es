import React, { useState } from 'react';
import {
  X,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  FileText,
  KeyRound,
  Phone,
  Mail,
  HelpCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { MembershipApplication } from '../types';
import { DEFAULT_QUESTIONS, LEGACY_QUESTIONS_V1, RulesConfig } from '../data/rulesAndQuestions';

interface CandidateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: MembershipApplication | null;
  onApprove: (applicationId: string, adminPassword?: string) => Promise<boolean>;
  onReject: (applicationId: string, observacoes: string, adminPassword?: string) => Promise<boolean>;
  onToast: (msg: string) => void;
  rulesConfig?: RulesConfig;
  onApproveSuccess?: (application: MembershipApplication) => void;
}

export const CandidateReviewModal: React.FC<CandidateReviewModalProps> = ({
  isOpen,
  onClose,
  application,
  onApprove,
  onReject,
  onToast,
  rulesConfig,
  onApproveSuccess,
}) => {
  const [rejectNotes, setRejectNotes] = useState('');
  const [isRejectingOpen, setIsRejectingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !application) return null;

  // Versionamento: Solicitações antigas conservam seus 8 enunciados e respostas originais
  const isV1 = application.regrasVersao === '1.0.0' || (application.respostas && Object.keys(application.respostas).some((k) => Number(k) > 4));
  const questionsList = isV1 ? LEGACY_QUESTIONS_V1 : (rulesConfig?.perguntas || DEFAULT_QUESTIONS);
  const isPending = application.status === 'pendente';

  const handleApprove = async () => {
    setErrorMsg('');

    try {
      setIsProcessing(true);
      const ok = await onApprove(application.id);
      if (ok) {
        onToast(`Membro "${application.nome}" aprovado com sucesso!`);
        onClose();
        if (onApproveSuccess) {
          onApproveSuccess(application);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao aprovar candidato');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setErrorMsg('');

    try {
      setIsProcessing(true);
      const ok = await onReject(application.id, rejectNotes.trim());
      if (ok) {
        onToast(`Solicitação de "${application.nome}" foi recusada.`);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao recusar candidato');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#39421b] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <UserCheck className="w-5 h-5 text-[#a8d363]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                  Avaliação de Candidato
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    application.status === 'pendente'
                      ? 'bg-[#fae8b4] text-[#875508] border border-[#e3c578]'
                      : application.status === 'aprovado'
                      ? 'bg-[#d1e7dd] text-[#0f5132] border border-[#a3cfbb]'
                      : 'bg-[#f8d7da] text-[#842029] border border-[#f1aeb5]'
                  }`}
                >
                  {application.status === 'pendente'
                    ? 'Pendente de aprovação'
                    : application.status === 'aprovado'
                    ? 'Aprovado'
                    : 'Recusado'}
                </span>
              </div>
              <p className="text-[11px] text-[#A69371]">
                Enviada em {new Date(application.criadoEm).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A69371] hover:text-[#F8EDD5] rounded-xl hover:bg-[#39421b] transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-[#302414] space-y-4">
          
          {/* Dados do Candidato */}
          <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-2">
            <h3 className="font-rpg text-sm font-bold text-[#48551F] flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>Identificação e Contato</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#71634D] block">Nome:</span>
                <span className="font-bold text-[#302414]">{application.nome}</span>
              </div>
              <div>
                <span className="text-[#71634D] block">E-mail:</span>
                <span className="font-bold text-[#302414] flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#716016]" />
                  <span>{application.email}</span>
                </span>
              </div>
              <div>
                <span className="text-[#71634D] block">WhatsApp:</span>
                <span className="font-bold text-[#302414] flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#48551F]" />
                  <span>{application.telefone}</span>
                </span>
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <span className="text-[#71634D] block">Como conheceu:</span>
                <span className="font-medium text-[#302414]">
                  {application.comoConheceu}
                  {application.indicadoPor ? ` (Indicado por: ${application.indicadoPor})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Histórico de Decisão (se já avaliado) */}
          {!isPending && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                application.status === 'aprovado'
                  ? 'bg-[#E3E8D0] border-[#8F9F5B] text-[#282D13]'
                  : 'bg-[#fae5e5] border-[#d69696] text-[#8b261b]'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {application.status === 'aprovado' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#48551F]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#8b261b]" />
                )}
                <span>
                  Decisão tomada em {application.avaliadoEm ? new Date(application.avaliadoEm).toLocaleString('pt-BR') : ''} por {application.avaliadoPor || 'Mestre'}
                </span>
              </div>
              {application.observacoesMestre && (
                <p className="italic pl-6">Obs: "{application.observacoesMestre}"</p>
              )}
            </div>
          )}

          {/* Perguntas, Respostas do Candidato e Guia de Avaliação do Mestre */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-rpg text-sm font-bold text-[#48551F] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Perguntas e Respostas ({questionsList.length})</span>
              </h3>
              <span className="text-[11px] text-[#716016] font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>Gabarito do Mestre visível para conferência</span>
              </span>
            </div>

            <div className="space-y-3">
              {questionsList.map((q, idx) => {
                const answer = application.respostas?.[q.id] || '(Sem resposta fornecida)';
                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] space-y-2 text-xs"
                  >
                    <p className="font-bold text-[#302414]">
                      {idx + 1}. {q.pergunta}
                    </p>

                    {/* Resposta do Candidato */}
                    <div className="p-2.5 rounded-lg bg-[#FBF4E4] border border-[#D6C296]">
                      <span className="text-[10px] text-[#71634D] uppercase font-bold block mb-0.5">
                        Resposta do Candidato:
                      </span>
                      <p className="text-[#302414] whitespace-pre-wrap font-medium">
                        "{answer}"
                      </p>
                    </div>

                    {/* Guia de Avaliação do Mestre */}
                    <div className="p-2 rounded-lg bg-[#EAE2CE] border border-[#C6AD78] text-[11px] text-[#5c4a2b] flex items-start gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#716016] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#302414]">Gabarito de Referência do Mestre:</strong>{' '}
                        <span>{q.guiaAvaliacao}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regras aceitas */}
          <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs space-y-1">
            <span className="font-bold text-[#302414] block">
              Registro de Concordância com as Regras:
            </span>
            <p className="text-[#71634D]">
              Versão aceita: <strong>{application.regrasVersao || '1.0.0'}</strong> em{' '}
              {application.aceitouEm ? new Date(application.aceitouEm).toLocaleString('pt-BR') : ''}.
            </p>
          </div>

        </div>

        {/* Footer Actions (Only if Pending) */}
        {isPending ? (
          <div className="p-4 bg-[#EDE2CA] border-t border-[#D6C296] space-y-3">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-[#fae5e5] border border-[#d69696] text-[#8b261b] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isRejectingOpen ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRejectingOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#f8d7da] hover:bg-[#f1aeb5] text-[#842029] border border-[#f1aeb5] text-xs font-bold transition-all cursor-pointer"
                  >
                    Recusar...
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApprove}
                    className="px-5 py-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar Membro</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in-50">
                <label className="block text-xs font-bold text-[#842029]">
                  Motivo ou Observação Administrativa da Recusa (opcional):
                </label>
                <textarea
                  rows={2}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Ex: Respostas incompletas ou não condizentes com as regras."
                  className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl p-2.5 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#842029]"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRejectingOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#71634D] hover:underline cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleReject}
                    className="px-5 py-2 rounded-xl bg-[#842029] hover:bg-[#65181f] text-[#F8EDD5] text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Confirmar Recusa</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-[#EDE2CA] border-t border-[#D6C296] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
