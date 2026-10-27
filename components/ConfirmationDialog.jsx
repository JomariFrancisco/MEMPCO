'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, TriangleAlert, X } from 'lucide-react';

const ConfirmationContext = createContext(null);

function ConfirmationDialog({ request, onResolve }) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const isDanger = request.variant === 'danger';
  const Icon = isDanger ? TriangleAlert : ShieldCheck;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onResolve(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled)') || [];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [onResolve]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="app-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onResolve(false);
      }}
    >
      <section
        ref={dialogRef}
        className={`app-confirm-dialog${isDanger ? ' is-danger' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        aria-describedby="app-confirm-message"
      >
        <div className="app-confirm-header">
          <span className="app-confirm-icon" aria-hidden="true"><Icon size={20} /></span>
          <div className="app-confirm-copy">
            <span className="app-confirm-eyebrow">Confirmation</span>
            <h2 id="app-confirm-title">{request.title}</h2>
          </div>
          <button type="button" className="app-confirm-close" onClick={() => onResolve(false)} aria-label="Cancel">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p id="app-confirm-message" className="app-confirm-message">{request.message}</p>
        {request.warning && <p className="app-confirm-warning">{request.warning}</p>}
        <div className="app-confirm-actions">
          <button ref={cancelButtonRef} type="button" className="app-confirm-cancel" onClick={() => onResolve(false)}>
            {request.cancelLabel}
          </button>
          <button type="button" className="app-confirm-submit" onClick={() => onResolve(true)}>
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function ConfirmationProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);
  const requestIdRef = useRef(0);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    requestIdRef.current += 1;
    setRequest({
      id: requestIdRef.current,
      title: options.title || 'Confirm this action',
      message: options.message || 'Are you sure you want to continue?',
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      variant: options.variant || 'default',
      warning: options.warning || '',
    });
  }), []);

  const resolve = useCallback((confirmed) => {
    const currentResolver = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    currentResolver?.(confirmed);
  }, []);

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {request && <ConfirmationDialog key={request.id} request={request} onResolve={resolve} />}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('useConfirmDialog must be used within ConfirmationProvider.');
  return confirm;
}
