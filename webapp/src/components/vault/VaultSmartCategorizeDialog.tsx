import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  Check,
  FolderCheck,
  FolderPlus,
  Globe2,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  X,
} from 'lucide-preact';
import type { Cipher, Folder } from '@/lib/types';
import type {
  ExistingFolderInput,
  VaultCategorizeItemInput,
  VaultCategorizeItemResult,
  VaultCategorizeResponse,
} from '@/lib/api/vault';

interface VaultSmartCategorizeDialogProps {
  open: boolean;
  busy: boolean;
  ciphers: Cipher[];
  folders: Folder[];
  onClose: () => void;
  onCategorizeWebsites?: (
    items: VaultCategorizeItemInput[],
    existingFolders: ExistingFolderInput[]
  ) => Promise<VaultCategorizeResponse>;
  onCreateFolder: (name: string) => Promise<{ id?: string } | null | void>;
  onBulkMove: (cipherIds: string[], folderId: string | null) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning', text: string) => void;
}

export default function VaultSmartCategorizeDialog(props: VaultSmartCategorizeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categorizeResult, setCategorizeResult] = useState<VaultCategorizeResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [applying, setApplying] = useState(false);

  // Filter login ciphers that have URIs or names
  const candidateCiphers = useMemo(() => {
    return props.ciphers.filter((cipher) => {
      const isLogin = Number(cipher.type) === 1 || !cipher.type;
      const isNotDeleted = !cipher.deletedDate && !(cipher as { deletedAt?: string | null }).deletedAt;
      return isLogin && isNotDeleted;
    });
  }, [props.ciphers]);

  const ciphersById = useMemo(() => {
    const map = new Map<string, Cipher>();
    for (const c of props.ciphers) {
      map.set(c.id, c);
    }
    return map;
  }, [props.ciphers]);

  const foldersById = useMemo(() => {
    const map = new Map<string, Folder>();
    for (const f of props.folders) {
      map.set(f.id, f);
    }
    return map;
  }, [props.folders]);

  const existingFoldersInput = useMemo<ExistingFolderInput[]>(() => {
    return props.folders.map((f) => ({
      id: f.id,
      name: f.decName || f.name || '',
    }));
  }, [props.folders]);

  const runCategorization = async () => {
    if (!props.onCategorizeWebsites || candidateCiphers.length === 0) return;
    setLoading(true);
    try {
      const inputs: VaultCategorizeItemInput[] = candidateCiphers.map((c) => ({
        id: c.id,
        name: String(c.decName || c.name || ''),
        uri: c.login?.uris?.[0]?.uri || c.login?.uris?.[0]?.decUri,
        currentFolderId: c.folderId || null,
      }));

      const res = await props.onCategorizeWebsites(inputs, existingFoldersInput);
      setCategorizeResult(res);

      // Select uncategorized items or items whose suggested folder differs from current
      const toSelect = new Set<string>();
      for (const item of res.items) {
        const cipher = ciphersById.get(item.id);
        const currentFolderId = cipher?.folderId || null;
        if (!currentFolderId || currentFolderId !== item.suggestedFolderId) {
          toSelect.add(item.id);
        }
      }
      setSelectedIds(toSelect);
    } catch (err) {
      props.onNotify('error', String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (props.open && !categorizeResult && !loading) {
      void runCategorization();
    }
  }, [props.open]);

  if (!props.open) return null;

  const items = categorizeResult?.items || [];

  const filteredItems = useMemo(() => {
    if (folderFilter === 'all') return items;
    return items.filter((item) => item.suggestedFolderName === folderFilter);
  }, [items, folderFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    setApplying(true);
    try {
      // Group selected items by suggested folder name
      const groups = new Map<string, { folderId?: string | null; isNew: boolean; cipherIds: string[] }>();
      for (const id of selectedIds) {
        const item = items.find((i) => i.id === id);
        if (!item) continue;
        const entry = groups.get(item.suggestedFolderName) || {
          folderId: item.suggestedFolderId,
          isNew: item.isNewFolder,
          cipherIds: [],
        };
        entry.cipherIds.push(id);
        groups.set(item.suggestedFolderName, entry);
      }

      let totalMoved = 0;
      for (const [folderName, group] of groups.entries()) {
        let targetFolderId = group.folderId;

        // If folder is new or does not have an ID yet, check if it already exists or create it
        if (!targetFolderId) {
          const existing = props.folders.find(
            (f) => (f.decName || f.name || '').trim().toLowerCase() === folderName.trim().toLowerCase()
          );
          if (existing) {
            targetFolderId = existing.id;
          } else {
            const created = await props.onCreateFolder(folderName);
            if (created && typeof created === 'object' && created.id) {
              targetFolderId = created.id;
            } else {
              // Wait for folders state or find created
              const recheck = props.folders.find(
                (f) => (f.decName || f.name || '').trim().toLowerCase() === folderName.trim().toLowerCase()
              );
              targetFolderId = recheck?.id || null;
            }
          }
        }

        if (targetFolderId && group.cipherIds.length > 0) {
          await props.onBulkMove(group.cipherIds, targetFolderId);
          totalMoved += group.cipherIds.length;
        }
      }

      props.onNotify('success', `已成功將 ${totalMoved} 個網站憑證歸類至對應資料夾！`);
      props.onClose();
    } catch (err) {
      props.onNotify('error', `套用分類失敗: ${String(err)}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  AI 網站智慧分類建議
                </h2>
                {categorizeResult && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {categorizeResult.provider === 'primary_clef' ? 'Clef-Flash 邊緣推論' : '決策引擎'} ({categorizeResult.latencyMs}ms)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                依據網域、內外網架構與服務性質，自動建議合適資料夾與標籤
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={props.onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 size={36} className="text-amber-500 spin mb-4" />
              <strong className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Clef 正在分析 {candidateCiphers.length} 筆網站憑據與資料夾架構...
              </strong>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                零知識隱私保障：僅透過網域名稱進行邊緣分類，明文密碼不出本機
              </span>
            </div>
          ) : !categorizeResult ? (
            <div className="text-center py-16">
              <p className="text-sm text-slate-500">暫無可分析之網站項目</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Folder Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    folderFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                  }`}
                  onClick={() => setFolderFilter('all')}
                >
                  全部 ({items.length})
                </button>
                {categorizeResult.folderStats.map((stat) => (
                  <button
                    key={stat.folderName}
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      folderFilter === stat.folderName
                        ? 'bg-[var(--primary)] text-[var(--primary-text)] font-bold shadow-sm ring-2 ring-amber-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                    }`}
                    onClick={() => setFolderFilter(stat.folderName)}
                  >
                    {stat.isNew ? <FolderPlus size={13} /> : <FolderCheck size={13} />}
                    <span>{stat.folderName}</span>
                    <span className="text-[11px] opacity-75">({stat.count})</span>
                  </button>
                ))}
              </div>

              {/* Selection Bar */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>
                  共 {filteredItems.length} 項（已選取 {selectedIds.size} 項）
                </span>
                <button
                  type="button"
                  className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? '取消全選' : '全選本頁'}
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/30">
                {filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const cipher = ciphersById.get(item.id);
                  const currentFolder = cipher?.folderId
                    ? foldersById.get(cipher.folderId)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3.5 p-3.5 transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                      onClick={() => toggleSelect(item.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <strong className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </strong>

                          {/* Category badge */}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.categoryLabel}
                          </span>

                          {/* Target folder badge */}
                          {item.isNewFolder ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 inline-flex items-center gap-1">
                              <FolderPlus size={11} /> 建議新建: {item.suggestedFolderName}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                              <FolderCheck size={11} /> 歸入現有: {item.suggestedFolderName}
                            </span>
                          )}

                          {currentFolder && (
                            <span className="text-[10px] text-slate-400">
                              (目前: {currentFolder.decName || currentFolder.name})
                            </span>
                          )}
                        </div>

                        {/* URI & Reason */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mb-1.5">
                          <Globe2 size={12} className="flex-shrink-0" />
                          <span className="truncate">{cipher?.login?.uris?.[0]?.uri || '無網址'}</span>
                        </div>

                        <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                          {item.reason}
                        </div>

                        {/* Suggested Tags */}
                        {item.suggestedTags && item.suggestedTags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Tag size={11} className="text-slate-400" />
                            {item.suggestedTags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <button
            type="button"
            className="btn btn-secondary small"
            onClick={runCategorization}
            disabled={loading || applying}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            重新分析
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary small"
              onClick={props.onClose}
              disabled={applying}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary small flex items-center gap-1.5"
              onClick={handleApply}
              disabled={loading || applying || selectedIds.size === 0}
            >
              {applying ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              一鍵套用分類 ({selectedIds.size} 項)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
