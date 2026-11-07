import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ItemRPG, MainCategory, Apoiador } from './types';
import { SEED_ITEMS } from './data/seedData';
import { DEFAULT_EXCHANGE_RATE, generateItemWhatsAppMessage } from './utils/helpers';
import {
  getInitialBinId,
  saveBinId,
  fetchItemsFromCloud,
  pushItemsToCloud,
  DEFAULT_BIN_ID,
} from './utils/cloudStorage';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { ItemRow } from './components/ItemRow';
import { RateioModal } from './components/RateioModal';
import { ItemFormModal } from './components/ItemFormModal';
import { SettingsModal } from './components/SettingsModal';
import { WeeklyBulletinModal } from './components/WeeklyBulletinModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Toast } from './components/Toast';
import { Trees, Compass } from 'lucide-react';

const STORAGE_KEY_ITEMS = 'ponte_trolls_clean_v3';
const STORAGE_KEY_RATE = 'ponte_trolls_dollar_rate_v3';

export default function App() {
  // Cloud JSON Database Bin ID (Shared for everyone via URL ?bin=ID_DO_BANCO or default)
  const [binId, setBinId] = useState<string>(() => getInitialBinId());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<ItemRPG | null>(null);

  // State
  const [items, setItems] = useState<ItemRPG[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Fallback to seed items', e);
    }
    return SEED_ITEMS;
  });

  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RATE);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch (e) {
      console.warn('Fallback to default rate', e);
    }
    return DEFAULT_EXCHANGE_RATE;
  });

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving items', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RATE, exchangeRate.toString());
    } catch (e) {
      console.error('Error saving rate', e);
    }
  }, [exchangeRate]);

  // Push to cloud in background helper
  const triggerCloudSync = useCallback(
    (updatedItems: ItemRPG[]) => {
      const targetBin = binId || DEFAULT_BIN_ID;
      setIsSyncing(true);
      pushItemsToCloud(targetBin, updatedItems)
        .catch((err) => console.warn('Background cloud push failed', err))
        .finally(() => setIsSyncing(false));
    },
    [binId]
  );

  // Initial cloud fetch whenever binId is loaded
  useEffect(() => {
    const targetBin = binId || DEFAULT_BIN_ID;
    setIsSyncing(true);
    fetchItemsFromCloud(targetBin)
      .then((cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          setItems(cloudItems);
          showToast(`Sincronizados ${cloudItems.length} itens do banco na nuvem!`);
        }
      })
      .catch((err) => console.warn('Initial cloud sync error', err))
      .finally(() => setIsSyncing(false));
  }, [binId]);

  // Main 2 Categories, Search & System Filter
  const [activeTab, setActiveTab] = useState<MainCategory>('Em Financiamento');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');

  // Modals
  const [rateioItem, setRateioItem] = useState<ItemRPG | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemRPG | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Available Systems for Filter Dropdown
  const availableSystems = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.sistema && it.sistema.trim()) {
        set.add(it.sistema.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Tab counts
  const countEmFinanciamento = useMemo(() => {
    return items.filter((i) => i.status === 'Em Financiamento').length;
  }, [items]);

  const countFinalizados = useMemo(() => {
    return items.filter((i) => i.status === 'Finalizados').length;
  }, [items]);

  // Filtered List for Current Tab
  const displayedItems = useMemo(() => {
    let result = items.filter((i) => i.status === activeTab);

    if (selectedSystem) {
      result = result.filter(
        (i) => i.sistema.toLowerCase() === selectedSystem.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.nome.toLowerCase().includes(q) ||
          i.sistema.toLowerCase().includes(q) ||
          i.descricao.toLowerCase().includes(q) ||
          i.sugeridoPorNome.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, activeTab, selectedSystem, searchQuery]);

  // Handlers
  const handleSaveItem = (itemData: Omit<ItemRPG, 'id' | 'apoiadores'> & { id?: string }) => {
    let nextList: ItemRPG[];
    if (itemData.id) {
      nextList = items.map((it) => (it.id === itemData.id ? { ...it, ...itemData } : it));
      showToast(`"${itemData.nome}" atualizado!`);
    } else {
      const newItem: ItemRPG = {
        ...itemData,
        id: `troll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        apoiadores: itemData.sugeridoPorNome
          ? [{ id: `ap-${Date.now()}`, nome: itemData.sugeridoPorNome, telefone: itemData.sugeridoPorTelefone }]
          : [],
      };
      nextList = [newItem, ...items];
      showToast(`"${newItem.nome}" adicionado com sucesso!`);
    }
    setItems(nextList);
    triggerCloudSync(nextList);
  };

  const handleRequestDelete = (id: string) => {
    const item = items.find((i) => String(i.id) === String(id));
    if (item) {
      setItemToDelete(item);
    }
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const targetId = String(itemToDelete.id);
    const nextList = items.filter((i) => String(i.id) !== targetId);
    setItems(nextList);
    triggerCloudSync(nextList);
    showToast(`"${itemToDelete.nome}" foi removido com sucesso!`);
    setItemToDelete(null);
  };

  const handleAddApoiador = (itemId: string, apoiadorData: Omit<Apoiador, 'id'>) => {
    const newApoiador: Apoiador = {
      ...apoiadorData,
      id: `ap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    const nextList = items.map((it) => {
      if (it.id === itemId) {
        const updated = {
          ...it,
          apoiadores: [...(it.apoiadores || []), newApoiador],
        };
        if (rateioItem && rateioItem.id === itemId) {
          setRateioItem(updated);
        }
        return updated;
      }
      return it;
    });

    setItems(nextList);
    triggerCloudSync(nextList);
  };

  const handleRemoveApoiador = (itemId: string, apoiadorId: string) => {
    const nextList = items.map((it) => {
      if (it.id === itemId) {
        const updated = {
          ...it,
          apoiadores: it.apoiadores.filter((ap) => ap.id !== apoiadorId),
        };
        if (rateioItem && rateioItem.id === itemId) {
          setRateioItem(updated);
        }
        return updated;
      }
      return it;
    });

    setItems(nextList);
    triggerCloudSync(nextList);
  };

  const handleCopyWhatsApp = (item: ItemRPG) => {
    const msg = generateItemWhatsAppMessage(item, exchangeRate);
    navigator.clipboard.writeText(msg);
    showToast(`Texto formatado de "${item.nome}" copiado!`);
  };

  const handleImportItems = (newItems: ItemRPG[], mode: 'replace' | 'append') => {
    const nextList = mode === 'replace' ? newItems : [...newItems, ...items];
    setItems(nextList);
    triggerCloudSync(nextList);
  };

  return (
    <div className="min-h-screen bg-[#0c150e] text-[#f1ede4] flex flex-col selection:bg-[#d49e2a]/30 selection:text-[#f4ecd8]">
      
      {/* A. Cabeçalho Compacto */}
      <Header
        binId={binId}
        exchangeRate={exchangeRate}
        onExchangeRateChange={setExchangeRate}
        onOpenNewItemModal={() => {
          setItemToEdit(null);
          setIsFormOpen(true);
        }}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenBulletinModal={() => setIsBulletinOpen(true)}
        isSyncing={isSyncing}
        onToast={showToast}
      />

      {/* Main Container - Centered max-w-5xl without top stats cards */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        
        {/* B. Barra de Navegação Única (2 Abas + Filtro por Sistema + Busca) */}
        <NavigationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          countEmFinanciamento={countEmFinanciamento}
          countFinalizados={countFinalizados}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSystem={selectedSystem}
          onSystemChange={setSelectedSystem}
          availableSystems={availableSystems}
        />

        {/* C. Lista de Itens em Linhas Horizontais (Cards em Faixa) */}
        {displayedItems.length === 0 ? (
          <div className="bg-[#122015] border border-[#203625] rounded-2xl p-12 text-center my-6">
            <Compass className="w-10 h-10 text-[#d49e2a]/60 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-[#f4ecd8] mb-1">
              {searchQuery || selectedSystem ? 'Nenhum item encontrado com os filtros atuais' : `Nenhum item em ${activeTab}`}
            </h3>
            <p className="text-xs text-[#7a8e7d] max-w-sm mx-auto mb-4">
              {searchQuery || selectedSystem
                ? 'Tente remover o filtro de sistema ou buscar por outro termo.'
                : 'Clique no botão "+ Sugerir Compra" no topo para abrir um novo rateio!'}
            </p>
            {(searchQuery || selectedSystem) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSystem('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#182b1d] hover:bg-[#203a27] text-[#d49e2a] border border-[#27442d] transition-colors"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                exchangeRate={exchangeRate}
                onOpenApoiar={(it) => setRateioItem(it)}
                onRemoveApoiador={handleRemoveApoiador}
                onCopyWhatsApp={handleCopyWhatsApp}
                onEdit={(it) => {
                  setItemToEdit(it);
                  setIsFormOpen(true);
                }}
                onDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a2d1f] bg-[#09100a] py-6 text-center text-xs text-[#6e8070]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trees className="w-4 h-4 text-[#43aa6a]" />
            <span>A Ponte dos Trolls &copy; {new Date().getFullYear()} · Rateios de RPG</span>
          </div>
          <div className="flex items-center gap-4 text-[#8a9d8c]">
            <span>{items.length} itens cadastrados</span>
            <span>·</span>
            <button
              onClick={() => setIsBulletinOpen(true)}
              className="hover:text-[#d49e2a] transition-colors"
            >
              Boletim WhatsApp
            </button>
            <span>·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-[#d49e2a] transition-colors"
            >
              Nuvem & Planilha
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RateioModal
        item={rateioItem}
        exchangeRate={exchangeRate}
        onClose={() => setRateioItem(null)}
        onAddApoiador={handleAddApoiador}
        onRemoveApoiador={handleRemoveApoiador}
        onToast={showToast}
      />

      <ItemFormModal
        isOpen={isFormOpen}
        itemToEdit={itemToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setItemToEdit(null);
        }}
        onSave={handleSaveItem}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        currentItems={items}
        exchangeRate={exchangeRate}
        binId={binId}
        onSaveBinId={(newId) => {
          setBinId(newId);
          saveBinId(newId);
        }}
        onImportItems={handleImportItems}
        onUpdateItemsFromCloud={(newItems) => {
          setItems(newItems);
          triggerCloudSync(newItems);
        }}
        onClose={() => setIsSettingsOpen(false)}
        onToast={showToast}
      />

      <WeeklyBulletinModal
        isOpen={isBulletinOpen}
        items={items}
        exchangeRate={exchangeRate}
        onClose={() => setIsBulletinOpen(false)}
        onToast={showToast}
      />

      {/* Custom Delete Confirmation Modal (NO window.confirm) */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        item={itemToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

    </div>
  );
}
