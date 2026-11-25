"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { EditorSnapshot, SaveStatus } from "./types";

interface UseEditorHistoryOptions {
  storeId: string;
  initialSnapshot: EditorSnapshot;
  initialVersion?: number;
  onApplySnapshot: (snapshot: EditorSnapshot) => void;
  onStorePersisted?: (persistedStore: Partial<EditorSnapshot> & { version?: number }) => void;
  debounceMs?: number;
}

export function useEditorHistory({
  storeId,
  initialSnapshot,
  initialVersion = 0,
  onApplySnapshot,
  onStorePersisted,
  debounceMs = 2500,
}: UseEditorHistoryOptions) {
  const historyRef = useRef<EditorSnapshot[]>([initialSnapshot]);
  const historyIndexRef = useRef<number>(0);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isApplyingHistoryRef = useRef(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestSnapshotRef = useRef<EditorSnapshot>(initialSnapshot);
  const lastSavedSnapshotRef = useRef<EditorSnapshot>(initialSnapshot);
  const lastPushTimestampRef = useRef<number>(0);

  // Request sequencing and serialization to guarantee FIFO ordering and avoid race conditions.
  // Initialized from the store's persisted version to prevent sequence resets across page reloads/remounts.
  const requestSeqRef = useRef<number>(initialVersion);
  const lastHandledSeqRef = useRef<number>(initialVersion);
  const lastSavedVersionRef = useRef<number>(initialVersion);
  const isSavingInProgressRef = useRef<boolean>(false);
  const queuedSnapshotRef = useRef<EditorSnapshot | null>(null);

  // Sync latest snapshot ref
  latestSnapshotRef.current = historyRef.current[historyIndexRef.current] || initialSnapshot;

  const updateHistoryCounts = useCallback(() => {
    const idx = historyIndexRef.current;
    const len = historyRef.current.length;
    setCanUndo(idx > 0);
    setCanRedo(idx < len - 1);
    setUndoCount(idx);
    setRedoCount(Math.max(0, len - 1 - idx));
  }, []);

  // Format payload helper
  const createPayloadFromSnapshot = (snap: EditorSnapshot) => ({
    templateId: snap.templateId,
    themeId: snap.themeId,
    name: snap.storeName.trim(),
    description: snap.aboutText.trim(),
    branding: {
      primaryColor: snap.primaryColor,
      secondaryColor: snap.secondaryColor,
      fontFamily: snap.fontFamily,
      logoUrl: snap.logoUrl,
      bannerUrl: snap.bannerUrl,
      heroHeadline: snap.heroHeadline.trim(),
      heroSubheadline: snap.heroSubheadline.trim(),
      aboutText: snap.aboutText.trim(),
      ctaText: snap.ctaText.trim(),
    },
    enabledSections: snap.enabledSections,
    orderedSections: snap.orderedSections,
    sections: snap.sections,
    pageSections: snap.pageSections,
    styling: snap.styling,
  });

  // Serialized persistence execution
  const executePersist = useCallback(
    async (snapshotToSave: EditorSnapshot): Promise<boolean> => {
      const thisSeq = ++requestSeqRef.current;
      setSaveStatus("saving");
      setErrorMessage(null);
      isSavingInProgressRef.current = true;

      try {
        const payload = {
          ...createPayloadFromSnapshot(snapshotToSave),
          version: thisSeq,
        };
        const res = await fetch(`/api/stores/${storeId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-GridRetail-Version": String(thisSeq),
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to persist editor changes.");
        }

        const resData = await res.json().catch(() => ({}));
        if (resData.store && typeof resData.store.version === "number") {
          requestSeqRef.current = Math.max(requestSeqRef.current, resData.store.version);
          lastSavedVersionRef.current = resData.store.version;
          if (onStorePersisted) {
            onStorePersisted(resData.store);
          }
        }

        // Only update status if this response is the newest handled request
        if (thisSeq >= lastHandledSeqRef.current) {
          lastHandledSeqRef.current = thisSeq;
          lastSavedSnapshotRef.current = snapshotToSave;

          // If another snapshot was queued while this save was executing, process it immediately
          if (queuedSnapshotRef.current && queuedSnapshotRef.current !== snapshotToSave) {
            const nextSnap = queuedSnapshotRef.current;
            queuedSnapshotRef.current = null;
            return await executePersist(nextSnap);
          } else {
            queuedSnapshotRef.current = null;
            setSaveStatus("saved");
          }
        }
        return true;
      } catch (err: unknown) {
        if (thisSeq >= lastHandledSeqRef.current) {
          lastHandledSeqRef.current = thisSeq;
          setSaveStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Error saving changes");
        }
        return false;
      } finally {
        isSavingInProgressRef.current = false;
      }
    },
    [storeId, onStorePersisted]
  );

  // Queue-aware persistence trigger
  const persistChanges = useCallback(
    async (snapshotToSave: EditorSnapshot): Promise<boolean> => {
      if (isSavingInProgressRef.current) {
        // Queue the latest snapshot to be executed immediately after current request completes
        queuedSnapshotRef.current = snapshotToSave;
        return true;
      }
      return await executePersist(snapshotToSave);
    },
    [executePersist]
  );

  // Trigger debounced autosave
  const triggerDebouncedAutosave = useCallback(
    (snapshot: EditorSnapshot) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      setSaveStatus("unsaved");

      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        persistChanges(snapshot);
      }, debounceMs);
    },
    [debounceMs, persistChanges]
  );

  // Manual save immediately
  const manualSave = useCallback(async (): Promise<boolean> => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const currentSnap = historyRef.current[historyIndexRef.current] || latestSnapshotRef.current;
    if (!currentSnap) return false;
    return await persistChanges(currentSnap);
  }, [persistChanges]);

  // Push new snapshot to undo stack with optional text edit coalescing
  const pushSnapshot = useCallback(
    (
      snapshot: EditorSnapshot,
      optionsOrShouldAutosave: boolean | { shouldAutosave?: boolean; isTextEdit?: boolean } = true
    ) => {
      if (isApplyingHistoryRef.current) return;

      const shouldAutosave =
        typeof optionsOrShouldAutosave === "boolean"
          ? optionsOrShouldAutosave
          : optionsOrShouldAutosave.shouldAutosave ?? true;

      const isTextEdit =
        typeof optionsOrShouldAutosave === "object"
          ? Boolean(optionsOrShouldAutosave.isTextEdit)
          : false;

      const now = Date.now();

      // Coalesce rapid text edits within 800ms into the active snapshot
      if (isTextEdit && now - lastPushTimestampRef.current < 800 && historyIndexRef.current >= 0) {
        historyRef.current[historyIndexRef.current] = snapshot;
        latestSnapshotRef.current = snapshot;
        lastPushTimestampRef.current = now;
        if (shouldAutosave) {
          triggerDebouncedAutosave(snapshot);
        }
        return;
      }

      lastPushTimestampRef.current = now;

      // Truncate forward redo states
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(snapshot);

      // Bound history stack to 30 items
      if (newHistory.length > 30) {
        newHistory.shift();
      }

      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
      latestSnapshotRef.current = snapshot;
      updateHistoryCounts();

      if (shouldAutosave) {
        triggerDebouncedAutosave(snapshot);
      }
    },
    [triggerDebouncedAutosave, updateHistoryCounts]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    isApplyingHistoryRef.current = true;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];

    if (snap) {
      latestSnapshotRef.current = snap;
      onApplySnapshot(snap);
      triggerDebouncedAutosave(snap);
    }

    updateHistoryCounts();

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 50);
  }, [onApplySnapshot, triggerDebouncedAutosave, updateHistoryCounts]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    isApplyingHistoryRef.current = true;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];

    if (snap) {
      latestSnapshotRef.current = snap;
      onApplySnapshot(snap);
      triggerDebouncedAutosave(snap);
    }

    updateHistoryCounts();

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 50);
  }, [onApplySnapshot, triggerDebouncedAutosave, updateHistoryCounts]);

  // Reset history with fresh base snapshot
  const resetHistory = useCallback(
    (baseSnapshot: EditorSnapshot, newVersion?: number) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      historyRef.current = [baseSnapshot];
      historyIndexRef.current = 0;
      latestSnapshotRef.current = baseSnapshot;
      lastSavedSnapshotRef.current = baseSnapshot;
      if (newVersion !== undefined) {
        requestSeqRef.current = newVersion;
        lastHandledSeqRef.current = newVersion;
        lastSavedVersionRef.current = newVersion;
      }
      updateHistoryCounts();
      setSaveStatus("saved");
      setErrorMessage(null);
    },
    [updateHistoryCounts]
  );

  // Flush pending changes before page unload (Scenario 12)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const isPending =
        autosaveTimerRef.current !== null ||
        saveStatus === "unsaved" ||
        queuedSnapshotRef.current !== null ||
        latestSnapshotRef.current !== lastSavedSnapshotRef.current;

      if (isPending) {
        const snap = queuedSnapshotRef.current || latestSnapshotRef.current;
        if (snap) {
          const unloadSeq = ++requestSeqRef.current;
          const payload = {
            ...createPayloadFromSnapshot(snap),
            version: unloadSeq,
          };
          if (typeof fetch === "function") {
            try {
              fetch(`/api/stores/${storeId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "X-GridRetail-Version": String(unloadSeq),
                },
                credentials: "same-origin",
                body: JSON.stringify(payload),
                keepalive: true,
              });
            } catch {
              // Best-effort: keepalive is asynchronous and cannot guarantee persistence on abrupt process termination
            }
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus, storeId]);

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      // Ctrl+S or Cmd+S triggers manual save and prevents default browser save dialog
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        manualSave();
        return;
      }

      // Allow native text undo/redo inside input and textarea
      if (isInput) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, manualSave]);

  // Clean up and flush on unmount (navigation)
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      const snap = queuedSnapshotRef.current || latestSnapshotRef.current;
      if (snap && snap !== lastSavedSnapshotRef.current) {
        const flushSeq = ++requestSeqRef.current;
        const payload = {
          ...createPayloadFromSnapshot(snap),
          version: flushSeq,
        };
        if (typeof fetch === "function") {
          try {
            fetch(`/api/stores/${storeId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "X-GridRetail-Version": String(flushSeq),
              },
              credentials: "same-origin",
              body: JSON.stringify(payload),
              keepalive: true,
            });
          } catch {
            // Best-effort: keepalive is asynchronous and cannot guarantee persistence on abrupt process termination
          }
        }
      }
    };
  }, [storeId]);

  return {
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    saveStatus,
    errorMessage,
    pushSnapshot,
    undo,
    redo,
    manualSave,
    resetHistory,
  };
}
