import React from 'react';
import {
  X,
  ShoppingCart,
  Trash2,
  Package,
  MessageCircle,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { FundingPackage } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartPackages: FundingPackage[];
  onRemoveFromCart: (packageId: string) => void;
  onClearCart: () => void;
  onProceedToWhatsApp: () => void;
  onGoToCatalog: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cartPackages,
  onRemoveFromCart,
  onClearCart,
  onProceedToWhatsApp,
  onGoToCatalog,
}) => {
  if (!isOpen) return null;

  const totalBRL = cartPackages.reduce((accCents, pkg) => {
    const price = typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : pkg.valorTotalBRL;
    return accCents + Math.round((price || 0) * 100);
  }, 0) / 100;

  return (
    <div className="fixed inset-0 z-[86] flex items-center justify-center p-3 sm:p-4 bg-[#282D13]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="parchment-card w-full max-w-xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-[#C6AD78]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#282D13] border-b border-[#3f471e] flex items-center justify-between text-[#F8EDD5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#39421b] border border-[#C6AD78] flex items-center justify-center text-[#F8EDD5]">
              <ShoppingCart className="w-5 h-5 text-[#a8d363]" />
            </div>
            <div>
              <h2 className="font-rpg text-base sm:text-lg font-bold text-[#F8EDD5]">
                Carrinho de Aquisições
              </h2>
              <p className="text-[11px] text-[#A69371]">
                {cartPackages.length}{' '}
                {cartPackages.length === 1 ? 'pacote selecionado' : 'pacotes selecionados'}
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-[#302414] space-y-4">
          {cartPackages.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#71634D]">
                <span>Itens adicionados ao seu pedido:</span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[11px] text-[#8b261b] hover:underline font-semibold cursor-pointer"
                >
                  Esvaziar carrinho
                </button>
              </div>

              <div className="divide-y divide-[#E3D1AC] max-h-[48vh] overflow-y-auto pr-1">
                {cartPackages.map((pkg) => {
                  const price = typeof pkg.valorCatalogoBRL === 'number' ? pkg.valorCatalogoBRL : pkg.valorTotalBRL;
                  const itemCount = Array.isArray(pkg.itens) && pkg.itens.length > 0
                    ? pkg.itens.length
                    : (pkg.itensInclusos ? pkg.itensInclusos.length : 1);

                  return (
                    <div
                      key={pkg.id}
                      className="py-3 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Miniatura */}
                        <div className="w-14 h-14 rounded-xl bg-[#282D13] overflow-hidden shrink-0 border border-[#C6AD78]">
                          {pkg.imageUrl ? (
                            <img
                              src={pkg.imageUrl}
                              alt={pkg.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8c9c64]">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Dados */}
                        <div className="min-w-0">
                          <h4 className="font-rpg text-xs sm:text-sm font-bold text-[#302414] truncate group-hover:text-[#48551F] transition-colors">
                            {pkg.titulo}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#71634D] mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-[#FAF4E6] border border-[#D6C296]">
                              {pkg.sistema || 'Foundry VTT'}
                            </span>
                            <span>• {itemCount} itens</span>
                          </div>
                        </div>
                      </div>

                      {/* Preço e Remover */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#302414]">
                          R$ {price.toFixed(2).replace('.', ',')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(pkg.id)}
                          className="p-1.5 rounded-lg text-[#8b261b] hover:bg-[#fae5e5] transition-colors cursor-pointer"
                          title="Remover do carrinho"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Card */}
              <div className="p-4 rounded-xl bg-[#FBF4E4] border border-[#D6C296] flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase font-bold text-[#71634D] block">
                    Valor Total do Pedido
                  </span>
                  <span className="text-[11px] text-[#71634D]">
                    Chave Pix e orientações na finalização
                  </span>
                </div>
                <span className="font-mono text-xl font-bold text-[#48551F]">
                  R$ {totalBRL.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#FAF4E6] border-2 border-[#C6AD78] flex items-center justify-center text-[#716016]">
                <ShoppingCart className="w-7 h-7 opacity-60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-rpg text-base font-bold text-[#302414]">
                  Seu carrinho está vazio
                </h3>
                <p className="text-xs text-[#71634D] max-w-sm mx-auto">
                  Explore o catálogo de pacotes finalizados e adicione os materiais digitais e módulos RPG que deseja adquirir.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToCatalog();
                  }}
                  className="px-5 py-2 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Explorar Catálogo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {cartPackages.length > 0 && (
          <div className="p-4 bg-[#EDE2CA] border-t border-[#D6C296] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F8EDD5] hover:bg-[#FBF4E4] text-[#302414] border border-[#C6AD78] text-xs font-semibold cursor-pointer"
            >
              Continuar Comprando
            </button>

            <button
              type="button"
              onClick={onProceedToWhatsApp}
              className="px-5 py-2.5 rounded-xl bg-[#48551F] hover:bg-[#59672A] text-[#F8EDD5] text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Finalizar Pedido</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
