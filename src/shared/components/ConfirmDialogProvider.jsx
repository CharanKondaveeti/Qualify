import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';
import '../styles/confirm-dialog.css';

const DialogContext = createContext(null);
export function useAppDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('Dialog provider is missing');
  return ctx;
}
export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const pending = useRef(null);
  const focusBefore = useRef(null);
  const inputRef = useRef(null);
  const approveRef = useRef(null);
  const request = useCallback((options) => new Promise(resolve => {
    // Settle any previous request; never leave event handlers waiting indefinitely.
    pending.current?.(null);
    pending.current = resolve;
    focusBefore.current = document.activeElement;
    setDialog({ ...options, value: options.initialValue ?? '' });
  }), []);
  const dismiss = useCallback((value = null) => {
    pending.current?.(value);
    pending.current = null;
    setDialog(null);
    queueMicrotask(() => focusBefore.current?.focus?.());
  }, []);
  useEffect(() => { if (!dialog) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (dialog.type === 'input' ? inputRef : approveRef).current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(null); }
      if (event.key === 'Tab') {
        const focusables = [...document.querySelectorAll('[data-qualify-dialog] button:not([disabled]),[data-qualify-dialog] input:not([disabled])')];
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); };
  }, [dialog?.type, dismiss, Boolean(dialog)]);
  const api = {
    confirm: (message, options = {}) => request({ type: 'confirm', message, ...options }),
    input: (message, options = {}) => request({ type: 'input', message, ...options }),
    alert: (message, options = {}) => request({ type: 'alert', message, ...options }),
  };
  return <DialogContext.Provider value={api}>
    {children}
    {dialog && <div className="qualify-dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) dismiss(null); }}>
      <section className="qualify-dialog-panel" data-qualify-dialog role="dialog" aria-modal="true" aria-labelledby="qualify-dialog-title" aria-describedby="qualify-dialog-detail">
        <button className="qualify-dialog-close" aria-label="Close dialog" type="button" onClick={() => dismiss(null)}><FiX /></button>
        <div className="qualify-dialog-icon">{dialog.danger ? <FiAlertTriangle /> : <FiInfo />}</div>
        <h2 id="qualify-dialog-title">{dialog.title || (dialog.type === 'input' ? 'Enter details' : dialog.type === 'alert' ? 'Notification' : 'Confirm action')}</h2>
        <p id="qualify-dialog-detail">{dialog.message}</p>
        <form onSubmit={e => { e.preventDefault(); dismiss(dialog.type === 'input' ? dialog.value : true); }}>
          {dialog.type === 'input' && <label className="qualify-dialog-label">{dialog.label || 'Value'}<input ref={inputRef} type={dialog.inputType || 'text'} required={dialog.required !== false} value={dialog.value} placeholder={dialog.placeholder || ''} onChange={e => setDialog(d => ({ ...d, value: e.target.value }))} /></label>}
          <div className="qualify-dialog-actions">
            {dialog.type !== 'alert' && <button type="button" className="qualify-dialog-neutral" onClick={() => dismiss(null)}>Cancel</button>}
            <button ref={approveRef} className={dialog.danger ? 'qualify-dialog-danger' : 'qualify-dialog-primary'} type="submit">{dialog.confirmLabel || (dialog.type === 'alert' ? 'OK' : dialog.type === 'input' ? 'Continue' : 'Confirm')}</button>
          </div>
        </form>
      </section>
    </div>}
  </DialogContext.Provider>;
}
