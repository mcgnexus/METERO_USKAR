'use client';

import { KeyboardEvent, ReactNode, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal accesible (patrón WAI-ARIA completo):
 *  - role="dialog" + aria-modal="true" con título y descripción asociados.
 *  - Al abrir: el foco salta al primer elemento interactivo del panel.
 *  - El foco queda atrapado dentro (Tab/Shift+Tab ciclan en el panel).
 *  - Escape cierra; se devuelve el foco al elemento que lo abrió.
 *  - Botón de cierre visible (✕) y bloqueo del scroll del fondo.
 *  - El overlay impide interactuar con el contenido de fondo.
 */
export function ModalDialog({
  onClose,
  labelId,
  descriptionId,
  panelClassName = 'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border bg-white p-6',
  children,
}: {
  onClose: () => void;
  /** id del elemento que actúa como título del diálogo. */
  labelId: string;
  /** id opcional del elemento que actúa como descripción. */
  descriptionId?: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables && focusables.length > 0) {
      focusables[0].focus();
    } else {
      panel?.focus();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`relative ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/10 text-lg font-bold text-slate-700 hover:bg-black/20"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
