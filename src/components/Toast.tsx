import { useCanvasStore } from '../store/useCanvasStore';

export function Toast() {
  const toast = useCanvasStore((state) => state.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span className="toast__dot" />
      {toast}
    </div>
  );
}
