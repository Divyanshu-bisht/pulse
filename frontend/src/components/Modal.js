import React, { useEffect } from 'react';
import './Modal.css';

// A small, reusable popup -- used anywhere we need to show something (like a
// freshly generated key) with a proper copy action, instead of the browser's
// plain alert() box, which can't be styled and can't be copied from easily.
export default function Modal({ title, children, onClose }) {
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
