import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

// Maximalist popup. Bottom sheet on phones, centered card on larger screens.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div
        className="relative z-10 max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl border-2 border-ink bg-surface shadow-[6px_6px_0_0_var(--color-ink)] sm:rounded-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b-2 border-ink bg-surface px-4 py-3">
          <div className="font-display text-base font-bold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-2 border-ink bg-surface active:translate-x-[2px] active:translate-y-[2px]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
