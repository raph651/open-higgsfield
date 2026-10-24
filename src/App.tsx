import { useEffect } from 'react';
import { CanvasEditor } from './components/CanvasEditor';
import { ConnectionModal } from './components/ConnectionModal';
import { Dashboard } from './components/Dashboard';
import { Toast } from './components/Toast';
import { STORAGE_KEY, useCanvasStore } from './store/useCanvasStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useRoomStore } from './store/useRoomStore';

export default function App() {
  const view = useCanvasStore((state) => state.view);
  const accent = useSettingsStore((state) => state.accent);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    const roomId = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('room');
    if (roomId) useRoomStore.getState().join(roomId);
  }, []);

  useEffect(() => {
    let roomTimer: number | undefined;
    const unsubscribe = useCanvasStore.subscribe((state) => {
      const room = useRoomStore.getState();
      if (!room.connected) return;
      const doc = state.activeId ? state.docs[state.activeId] : null;
      if (!doc) return;
      if (roomTimer) window.clearTimeout(roomTimer);
      roomTimer = window.setTimeout(() => room.sendDoc(doc), 300);
    });
    return () => {
      unsubscribe();
      if (roomTimer) window.clearTimeout(roomTimer);
    };
  }, []);

  useEffect(() => {
    void useSettingsStore.getState().checkConnection();

    let dirty = false;
    let lastSaved = '';
    try {
      lastSaved = localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      // Local storage can be disabled; the app stays usable in memory.
    }

    const snapshot = () => {
      if (!dirty) return;
      const state = useCanvasStore.getState();
      if (state.dragging) return;
      const payload = {
        docs: state.docs,
        order: state.order,
        templates: state.templates,
        assets: state.assets,
        versions: state.versions,
        credits: state.credits,
        showPromo: state.showPromo,
      };
      try {
        const serialized = JSON.stringify(payload);
        dirty = false;
        if (serialized === lastSaved) return;
        localStorage.setItem(STORAGE_KEY, serialized);
        lastSaved = serialized;
      } catch {
        // Local storage can be full or disabled. The app stays usable in memory.
      }
    };

    const unsubscribe = useCanvasStore.subscribe(() => {
      dirty = true;
    });

    // Autosave cadence: flush pending changes at most every 3 seconds.
    const interval = window.setInterval(snapshot, 3000);

    const onUnload = () => snapshot();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') snapshot();
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div className={`app app--${view}`}>
      {view === 'dashboard' ? <Dashboard /> : <CanvasEditor />}
      <ConnectionModal />
      <Toast />
    </div>
  );
}
