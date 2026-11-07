import React, { useState, useEffect } from 'react';
import { FundingPackage, ItemRPG, SISTEMAS_PADRAO, ADMIN_PASSWORD } from '../types';
import { X, Layers, Plus, Trash2, KeyRound, Check, Link as LinkIcon, DollarSign } from 'lucide-react';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkgData: Omit<FundingPackage, 'id' | 'criadoEm'> & { id?: string }) => void;
  existingPackage?: FundingPackage | null;
  availableSugestoes: ItemRPG[];
  onToast: (msg: string) => void;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPackage,
  availableSugestoes,
  onToast,
}) => {
  const [titulo, setTitulo] = useState('');
  const [sistema, setSistema] = useState('Foundry VTT Geral');
  const [descricao, setDescricao] = useState('');
  const [valorTotalBRL, setValorTotalBRL] = useState('');
  const [linkLoja, setLinkLoja] = useState('');
  const [linkDrive, setLinkDrive] = useState('');
  const [itensInclusos, setItensInclusos] = useState<string[]>([]);
  const [novoItemTexto, setNovoItemTexto] = useState('');
  const [selectedSugestoesIds, setSelectedSugestoesIds] = useState<string[]>([]);
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (existingPackage) {
      setTitulo(existingPackage.titulo);
      setSistema(existingPackage.sistema || 'Foundry VTT Geral');
      setDescricao(existingPackage.descricao || '');
      setValorTotalBRL(existingPackage.valorTotalBRL.toString());
      setLinkLoja(existingPackage.linkLoja || '');
      setLinkDrive(existingPackage.linkDrive || '');
      setItensInclusos(existingPackage.itensInclusos || []);
      setSelectedSugestoesIds(existingPackage.sugestoesIds || []);
    } else {
      setTitulo('');
      setSistema('Foundry VTT Geral');
      setDescricao('');
      setValorTotalBRL('');
      setLinkLoja('');
      setLinkDrive('');
      setItensInclusos([]);
      setSelectedSugestoesIds([]);
    }
    setAdminPassword('');
    setErrorMsg('');
  }, [existingPackage, isOpen]);

  const handleAddItemIncluso = () => {
    if (!novoItemTexto.trim()) return;
    setItensInclusos([...itensInclusos, novoItemTexto.trim()]);
    setNovoItemTexto('');
  };

  const handleRemoveItemIncluso = (idx: number) => {
    setItensInclusos(itensInclusos.filter((_, i) => i !== idx));
  };

  const handleToggleSugestao = (sug: ItemRPG) => {
    const isSelected = selectedSugestoesIds.includes(sug.id);
    if (isSelected) {
      setSelectedSugestoesIds(selectedSugestoesIds.filter((id) => id !== sug.id));
    } else {
      setSelectedSugestoesIds([...selectedSugestoesIds, sug.id]);
      // Se o título do item ainda não estiver na lista de itens inclusos, adiciona
      if (!itensInclusos.includes(sug.nome)) {
        setItensInclusos([...itensInclusos, `${sug.nome} (${sug.sistema})`]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== ADMIN_PASSWORD) {
      setErrorMsg('Senha do Mestre incorreta! Acesso negado.');
      return;
    }

    const valorParsed = parseFloat(valorTotalBRL.replace(',', '.'));
    if (isNaN(valorParsed) || valorParsed <= 0) {
      setErrorMsg('Informe um valor consolidado válido em R$.');
      return;
    }

    if (!titulo.trim()) {
      setErrorMsg('Informe o título do pacote de financiamento.');
      return;
    }

    onSave({
      id: existingPackage?.id,
      titulo: titulo.trim(),
      sistema,
      descricao: descricao.trim(),
      valorTotalBRL: valorParsed,
      linkLoja: linkLoja.trim(),
      linkDrive: linkDrive.trim(),
      itensInclusos: itensInclusos.length > 0 ? itensInclusos : [titulo.trim()],
      sugestoesIds: selectedSugestoesIds,
      status: existingPackage?.status || 'Financiamento',
      apoiadores: existingPackage?.apoiadores || [],
    });

    onToast(existingPackage ? 'Pacote atualizado com sucesso!' : 'Novo pacote de vaquinha criado com sucesso!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#122015] border-2 border-[#d49e2a]/60 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#182d1d] to-[#122015] border-b border-[#203625] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f3524] border border-[#d49e2a]/40 flex items-center justify-center text-[#d49e2a]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-rpg text-lg font-bold text-[#f4ecd8]">
                {existingPackage ? 'Editar Pacote de Financiamento' : 'Novo Pacote de Financiamento'}
              </h2>
              <p className="text-[11px] text-[#8a9d8c]">
                Agrupe sugestões em um rateio oficial com valor consolidado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a8e7d] hover:text-[#f1ede4] hover:bg-[#1a2f20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Título & Sistema */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#a4b5a6] mb-1">
                Nome do Pacote / Vaquinha:
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Mega Bundle Módulos Foundry V12 - Outono"
                className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#a4b5a6] mb-1">
                Sistema de RPG:
              </label>
              <select
                value={sistema}
                onChange={(e) => setSistema(e.target.value)}
                className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              >
                {SISTEMAS_PADRAO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Valor Consolidado & Link Loja */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#a4b5a6] mb-1">
                Valor Total Consolidado (R$):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[#d49e2a] font-bold">R$</span>
                <input
                  type="text"
                  required
                  value={valorTotalBRL}
                  onChange={(e) => setValorTotalBRL(e.target.value)}
                  placeholder="280,00"
                  className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] font-mono focus:outline-none focus:border-[#d49e2a]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#a4b5a6] mb-1">
                Link da Loja / Campanha:
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-[#7a8e7d] absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={linkLoja}
                  onChange={(e) => setLinkLoja(e.target.value)}
                  placeholder="https://loja.com/produto"
                  className="w-full pl-9 pr-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
                />
              </div>
            </div>
          </div>

          {/* Descrição / Regras de Rateio */}
          <div>
            <label className="block font-semibold text-[#a4b5a6] mb-1">
              Descrição e Regras de Rateio:
            </label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Compêndio oficial com macros automatizadas. Mínimo 4 pessoas para fechar o pedido."
              className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
            />
          </div>

          {/* Sugestões da Comunidade para Anexar */}
          {availableSugestoes.length > 0 && (
            <div className="p-3 bg-[#0c150e] border border-[#1f3524] rounded-2xl space-y-2">
              <label className="block font-bold text-[#d49e2a]">
                Anexar Sugestões Existentes da Comunidade:
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1.5 divide-y divide-[#152317]">
                {availableSugestoes.map((sug) => {
                  const isChecked = selectedSugestoesIds.includes(sug.id);
                  return (
                    <label
                      key={sug.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-[#142318] rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSugestao(sug)}
                        className="rounded border-[#203625] text-[#d49e2a] focus:ring-[#d49e2a]"
                      />
                      <span className="font-semibold text-[#f1ede4] truncate flex-1">
                        {sug.nome}
                      </span>
                      <span className="text-[10px] text-[#8a9d8c] font-mono">
                        {sug.moeda === 'USD' ? `$${sug.valorNumerico}` : `R$${sug.valorNumerico}`}
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] bg-[#1a2f20] text-[#d49e2a] rounded">
                        {sug.sistema}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Itens Inclusos no Pacote */}
          <div className="space-y-2">
            <label className="block font-semibold text-[#a4b5a6]">
              Itens Inclusos no Pacote:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={novoItemTexto}
                onChange={(e) => setNovoItemTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItemIncluso())}
                placeholder="Ex: Módulo Oficial Foundry, Pack de Tokens, etc."
                className="flex-1 px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
              />
              <button
                type="button"
                onClick={handleAddItemIncluso}
                className="px-3 py-2 bg-[#1b2f20] hover:bg-[#25412b] text-[#d49e2a] font-bold rounded-xl border border-[#2e5035] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {itensInclusos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {itensInclusos.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#142618] border border-[#27442d] text-[#f4ecd8] text-[11px]"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItemIncluso(idx)}
                      className="text-[#7a8e7d] hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Trava de Senha do Mestre */}
          <div className="pt-2 border-t border-[#1f3524] space-y-1.5">
            <label className="block font-semibold text-[#d49e2a] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Senha do Mestre para Salvar Pacote:</span>
            </label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Digite a senha de administrador..."
              className="w-full px-3 py-2 bg-[#0c150e] border border-[#203625] rounded-xl text-xs text-[#f1ede4] focus:outline-none focus:border-[#d49e2a]"
            />
          </div>

          {errorMsg && (
            <p className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
              {errorMsg}
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#8a9d8c] hover:text-[#f1ede4] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#d49e2a] hover:bg-[#e5b23d] text-[#122015] font-bold shadow-lg shadow-black/40 cursor-pointer"
            >
              {existingPackage ? 'Salvar Alterações' : 'Criar Pacote de Vaquinha'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
