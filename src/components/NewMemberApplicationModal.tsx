import React, { useState } from 'react';
import {
  X,
  Scroll,
  HelpCircle,
  UserCheck,
  Send,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Shield,
  FileText,
} from 'lucide-react';
import { MembershipApplication } from '../types';
import {
  DEFAULT_RULES_TEXT,
  DEFAULT_TERMO_ACEITE,
  DEFAULT_QUESTIONS,
  RulesConfig,
  MembershipQuestion,
} from '../data/rulesAndQuestions';

export interface ApplicationDraft {
  step: 1 | 2 | 3 | 4;
  agreedToRules: boolean;
  agreedTimestamp: string;
  answers: Record<number, string>;
  nome: string;
  email: string;
  telefone: string;
  comoConheceu: string;
  indicadoPor: string;
}

interface NewMemberApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (app: Omit<MembershipApplication, 'id' | 'criadoEm'>) => Promise<boolean>;
  onSubmitSuccess?: () => void;
  onToast: (msg: string) => void;
  rulesConfig?: RulesConfig;
  draft?: ApplicationDraft;
  onUpdateDraft?: (draft: ApplicationDraft) => void;
}

export const NewMemberApplicationModal: React.FC<NewMemberApplicationModalProps> = ({
  isOpen,
  onClose,
  onSubmitApplication,
  onSubmitSuccess,
  onToast,
  rulesConfig,
  draft,
  onUpdateDraft,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(draft?.step || 1);

  // Etapa 1: Regras
  const [agreedToRules, setAgreedToRules] = useState<boolean>(draft?.agreedToRules || false);
  const [agreedTimestamp, setAgreedTimestamp] = useState<string>(draft?.agreedTimestamp || '');

  // Etapa 2: Perguntas
  const questionsList: MembershipQuestion[] = rulesConfig?.perguntas || DEFAULT_QUESTIONS;
  const [answers, setAnswers] = useState<Record<number, string>>(draft?.answers || {});
  const [questionsError, setQuestionsError] = useState<string>('');

  // Etapa 3: Dados Pessoais
  const [nome, setNome] = useState(draft?.nome || '');
  const [email, setEmail] = useState(draft?.email || '');
  const [telefone, setTelefone] = useState(draft?.telefone || '');
  const [comoConheceu, setComoConheceu] = useState(draft?.comoConheceu || 'Indicação de um membro');
  const [indicadoPor, setIndicadoPor] = useState(draft?.indicadoPor || '');
  const [dataError, setDataError] = useState('');

  // Etapa 4: Envio & Sucesso
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Sincroniza rascunho com o componente pai para garantir preservação total
  const syncDraft = (partial: Partial<ApplicationDraft>) => {
    if (onUpdateDraft) {
      onUpdateDraft({
        step: partial.step ?? step,
        agreedToRules: partial.agreedToRules ?? agreedToRules,
        agreedTimestamp: partial.agreedTimestamp ?? agreedTimestamp,
        answers: partial.answers ?? answers,
        nome: partial.nome ?? nome,
        email: partial.email ?? email,
        telefone: partial.telefone ?? telefone,
        comoConheceu: partial.comoConheceu ?? comoConheceu,
        indicadoPor: partial.indicadoPor ?? indicadoPor,
      });
    }
  };

  if (!isOpen) return null;

  const currentRulesText = rulesConfig?.textoRegras || DEFAULT_RULES_TEXT;
  const currentRulesVersion = rulesConfig?.version || '2.0.0';
  const currentTermoAceite = rulesConfig?.termoAceite || DEFAULT_TERMO_ACEITE;

  // Mask helper para telefone
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/[^\d+()\s-]/g, '');
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 11) {
      if (digits.length > 2 && digits.length <= 6) {
        setTelefone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
      } else if (digits.length > 6 && digits.length <= 10) {
        setTelefone(`(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`);
      } else if (digits.length > 10) {
        setTelefone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`);
      } else {
        setTelefone(digits);
      }
    } else {
      setTelefone(raw);
    }
  };

  const handleStep1Next = () => {
    if (!agreedToRules) {
      onToast('Você precisa ler e concordar com as regras da Ponte dos Trolls para prosseguir.');
      return;
    }
    const ts = agreedTimestamp || new Date().toISOString();
    if (!agreedTimestamp) {
      setAgreedTimestamp(ts);
    }
    syncDraft({ step: 2, agreedToRules: true, agreedTimestamp: ts });
    setStep(2);
  };

  const handleStep2Next = () => {
    setQuestionsError('');
    // Checa se todas as perguntas obrigatórias foram respondidas
    const unanswered = questionsList.filter((q) => !answers[q.id] || !answers[q.id].trim());
    if (unanswered.length > 0) {
      setQuestionsError(`Por favor, responda a todas as ${questionsList.length} perguntas obrigatórias antes de avançar. Restam ${unanswered.length} pendentes.`);
      return;
    }
    syncDraft({ step: 3, answers });
    setStep(3);
  };

  const handleStep3Next = () => {
    setDataError('');
    const cleanNome = nome.trim();
    const cleanEmail = email.trim();
    const cleanTelefone = telefone.trim();

    if (!cleanNome || cleanNome.length < 3) {
      setDataError('Informe seu nome completo (mínimo de 3 caracteres).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setDataError('Informe um e-mail válido para liberação das pastas do Google Drive.');
      return;
    }
    const digits = cleanTelefone.replace(/\D/g, '');
    if (digits.length < 8) {
      setDataError('Informe seu número de WhatsApp/celular com DDD para identificação.');
      return;
    }
    if (comoConheceu === 'Indicação de um membro' && !indicadoPor.trim()) {
      setDataError('Informe o nome do membro da Ponte dos Trolls que fez a indicação.');
      return;
    }

    syncDraft({
      step: 4,
      nome: cleanNome,
      email: cleanEmail,
      telefone: cleanTelefone,
      comoConheceu,
      indicadoPor: comoConheceu === 'Indicação de um membro' ? indicadoPor.trim() : undefined,
    });
    setStep(4);
  };

  const handleSubmitApplication = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const appPayload: Omit<MembershipApplication, 'id' | 'criadoEm'> = {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        comoConheceu: comoConheceu.trim(),
        indicadoPor: comoConheceu === 'Indicação de um membro' ? indicadoPor.trim() : undefined,
        respostas: answers,
        regrasTextoAceito: currentRulesText,
        regrasVersao: currentRulesVersion,
        aceitouTermos: agreedToRules,
        aceitouEm: agreedTimestamp || new Date().toISOString(),
        status: 'pendente',
      };

      const success = await onSubmitApplication(appPayload);
      if (success) {
        setIsSubmittedSuccess(true);
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      } else {
        onToast('Não foi possível enviar a solicitação no momento. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Erro ao enviar solicitação:', err);
      onToast('Erro ao enviar solicitação: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseClean = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#39421b] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <Scroll className="w-5 h-5 text-[#a8d363]" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Solicitar Entrada na Ponte dos Trolls
              </h2>
              <p className="text-[11px] text-[#A69371]">
                {isSubmittedSuccess
                  ? 'Solicitação concluída'
                  : `Etapa ${step} de 4: ${
                      step === 1
                        ? 'Conhecer o Grupo e Ler as Regras'
                        : step === 2
                        ? 'Responder às Perguntas'
                        : step === 3
                        ? 'Preencher Dados Pessoais'
                        : 'Revisar e Enviar para Aprovação'
                    }`}
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              onClick={handleCloseClean}
              className="p-1.5 text-[#A69371] hover:text-[#F8EDD5] rounded-xl hover:bg-[#39421b] transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        {!isSubmittedSuccess && (
          <div className="bg-[#EADBBE] px-6 py-2.5 border-b border-[#C6AD78]">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { s: 1, label: '1. Regras' },
                { s: 2, label: '2. Perguntas' },
                { s: 3, label: '3. Seus Dados' },
                { s: 4, label: '4. Revisão' },
              ].map((item) => {
                const isActive = step === item.s;
                const isPast = step > item.s;
                return (
                  <div
                    key={item.s}
                    className={`py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#48551F] text-[#F8EDD5] shadow-xs'
                        : isPast
                        ? 'bg-[#D5C299] text-[#282D13]'
                        : 'text-[#71634D] opacity-60'
                    }`}
                  >
                    {isPast && <CheckCircle2 className="w-3 h-3 text-[#282D13]" />}
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-[#302414] space-y-4">
          
          {/* Sucesso pós-envio */}
          {isSubmittedSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#E3E8D0] border-2 border-[#8F9F5B] flex items-center justify-center text-[#48551F] shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="font-rpg text-xl font-bold text-[#302414]">
                  Solicitação Enviada com Sucesso!
                </h3>
                <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-sm text-[#302414] leading-relaxed shadow-xs">
                  “Sua solicitação foi enviada. Aguarde a aprovação do Mestre para acessar a central.”
                </div>
                <p className="text-xs text-[#71634D]">
                  O Mestre analisará suas respostas e seus dados cadastrais. Assim que for aprovado, seu nome será habilitado no login do site e a entrada nos canais do WhatsApp será orientada pelo responsável.
                </p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Voltar para a Tela Inicial
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ETAPA 1: REGRAS */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#D6C296] flex items-start gap-2.5 text-xs text-[#55482e]">
                    <Shield className="w-4 h-4 text-[#716016] shrink-0 mt-0.5" />
                    <p>
                      Leia atentamente as diretrizes da comunidade antes de prosseguir. Responderemos dúvidas e orientaremos novos membros com base nestas regras.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF4E6] border border-[#C6AD78] shadow-inner max-h-[46vh] overflow-y-auto space-y-3 font-sans text-xs sm:text-[13px] leading-relaxed text-[#302414] whitespace-pre-wrap select-text">
                    {currentRulesText}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FBF4E4] border border-[#C6AD78] flex items-center gap-3">
                    <input
                      id="accept-rules-checkbox"
                      type="checkbox"
                      checked={agreedToRules}
                      onChange={(e) => {
                        setAgreedToRules(e.target.checked);
                        if (e.target.checked && !agreedTimestamp) {
                          setAgreedTimestamp(new Date().toISOString());
                        }
                      }}
                      className="w-5 h-5 rounded border-[#C6AD78] text-[#48551F] focus:ring-[#48551F] accent-[#48551F] cursor-pointer"
                    />
                    <label
                      htmlFor="accept-rules-checkbox"
                      className="text-xs sm:text-sm font-bold text-[#302414] cursor-pointer select-none"
                    >
                      {currentTermoAceite}
                    </label>
                  </div>
                </div>
              )}

              {/* ETAPA 2: PERGUNTAS */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] flex items-start gap-2 text-xs text-[#55482e]">
                    <HelpCircle className="w-4 h-4 text-[#716016] shrink-0 mt-0.5" />
                    <p>
                      Responda às 4 perguntas obrigatórias com suas próprias palavras com base no texto das regras. O Mestre avaliará manualmente suas respostas.
                    </p>
                  </div>

                  {questionsError && (
                    <div className="p-3 rounded-xl bg-[#fae5e5] border border-[#d69696] text-[#8b261b] text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{questionsError}</span>
                    </div>
                  )}

                  <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
                    {questionsList.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3.5 sm:p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] space-y-2"
                      >
                        <label className="block text-xs sm:text-sm font-bold text-[#302414]">
                          {idx + 1}. {q.pergunta}
                        </label>
                        <textarea
                          rows={2}
                          value={answers[q.id] || ''}
                          onChange={(e) => {
                            setAnswers({ ...answers, [q.id]: e.target.value });
                            if (questionsError) setQuestionsError('');
                          }}
                          placeholder="Digite sua resposta aqui com suas próprias palavras..."
                          className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl p-2.5 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ETAPA 3: DADOS PESSOAIS */}
              {step === 3 && (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs text-[#55482e]">
                    Preencha seus dados de contato para emissão do seu login e futura liberação de acesso às pastas de compras coletivas no Google Drive.
                  </div>

                  {dataError && (
                    <div className="p-3 rounded-xl bg-[#fae5e5] border border-[#d69696] text-[#8b261b] text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{dataError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#302414] mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#302414] mb-1">
                        E-mail para acesso ao Google Drive *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@gmail.com"
                        className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                      />
                      <span className="text-[10px] text-[#71634D] block mt-0.5">
                        Preferencialmente conta Google (Gmail) para acesso direto às pastas compartilhadas.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#302414] mb-1">
                        WhatsApp / Celular com DDD *
                      </label>
                      <input
                        type="text"
                        value={telefone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                      />
                      <span className="text-[10px] text-[#71634D] block mt-0.5">
                        Utilizado para identificação no login e comunicação de compras coletivas.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#302414] mb-1">
                        Como ficou sabendo da Ponte dos Trolls? *
                      </label>
                      <select
                        value={comoConheceu}
                        onChange={(e) => setComoConheceu(e.target.value)}
                        className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                      >
                        <option value="Indicação de um membro">Indicação de um membro</option>
                        <option value="Discord / Comunidade de RPG">Discord / Comunidade de RPG</option>
                        <option value="Redes Sociais">Redes Sociais</option>
                        <option value="Busca na Web">Busca na Web</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    {comoConheceu === 'Indicação de um membro' && (
                      <div className="animate-in fade-in-50">
                        <label className="block text-xs font-bold text-[#302414] mb-1">
                          Nome de quem te indicou *
                        </label>
                        <input
                          type="text"
                          value={indicadoPor}
                          onChange={(e) => setIndicadoPor(e.target.value)}
                          placeholder="Nome do amigo que te indicou"
                          className="w-full bg-[#FAF4E6] border border-[#C6AD78] rounded-xl px-3 py-2 text-xs text-[#302414] focus:outline-none focus:ring-1 focus:ring-[#48551F]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ETAPA 4: REVISÃO */}
              {step === 4 && (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  <div className="p-3 rounded-xl bg-[#FBF4E4] border border-[#D6C296] text-xs text-[#55482e]">
                    Confira todos os seus dados e respostas antes de enviar. Uma cópia das regras aceitas (versão {currentRulesVersion}) será registrada juntamente com sua solicitação.
                  </div>

                  {/* Resumo Dados Pessoais */}
                  <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] space-y-2">
                    <h4 className="font-rpg text-sm font-bold text-[#48551F] flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      <span>Dados Pessoais</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[#71634D] block">Nome:</span>
                        <span className="font-bold text-[#302414]">{nome}</span>
                      </div>
                      <div>
                        <span className="text-[#71634D] block">E-mail:</span>
                        <span className="font-bold text-[#302414]">{email}</span>
                      </div>
                      <div>
                        <span className="text-[#71634D] block">Telefone:</span>
                        <span className="font-bold text-[#302414]">{telefone}</span>
                      </div>
                      <div>
                        <span className="text-[#71634D] block">Origem:</span>
                        <span className="font-bold text-[#302414]">
                          {comoConheceu} {indicadoPor ? `(${indicadoPor})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Perguntas e Respostas */}
                  <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#C6AD78] space-y-3">
                    <h4 className="font-rpg text-sm font-bold text-[#48551F] flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      <span>Suas Respostas ({questionsList.length})</span>
                    </h4>
                    <div className="space-y-2 text-xs">
                      {questionsList.map((q, idx) => (
                        <div key={q.id} className="p-2.5 rounded-lg bg-[#FBF4E4] border border-[#D6C296]">
                          <p className="font-bold text-[#302414] mb-1">
                            {idx + 1}. {q.pergunta}
                          </p>
                          <p className="text-[#48551F] whitespace-pre-wrap italic bg-[#FAF4E6] p-2 rounded border border-[#E3D1AC]">
                            "{answers[q.id]}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Declaração de Aceite */}
                  <div className="p-3 rounded-xl bg-[#E3E8D0] border border-[#8F9F5B] text-xs text-[#282D13] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#48551F] shrink-0" />
                    <span>
                      Termos aceitos: <strong>"{currentTermoAceite}"</strong> (Versão {currentRulesVersion})
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        {!isSubmittedSuccess && (
          <div className="p-4 bg-[#EDE2CA] border-t border-[#D6C296] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCloseClean}
                className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar ao login</span>
              </button>
            )}

            <div>
              {step === 1 && (
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="px-5 py-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Avançar para Perguntas</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="px-5 py-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Avançar para Seus Dados</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  onClick={handleStep3Next}
                  className="px-5 py-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Revisar Solicitação</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === 4 && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitApplication}
                  className="px-6 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <span>Enviando solicitação...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar para Aprovação do Mestre</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
