import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface PrintContextType {
  printContent: (content: React.ReactNode) => void;
  clearContent: () => void;
}

const PrintContext = createContext<PrintContextType | null>(null);

export const usePrint = () => {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error('usePrint must be inside PrintProvider');
  return ctx;
};

/**
 * Triggers browser print for whatever is currently in #print-area.
 * Adds body.printing class so CSS can hide the app and show #print-area.
 */
export const triggerPrint = (): Promise<void> => {
  return new Promise((resolve) => {
    document.body.classList.add('printing');
    // Small delay to let the DOM update
    requestAnimationFrame(() => {
      window.print();
      // afterprint fires when dialog closes (print or cancel)
      const cleanup = () => {
        document.body.classList.remove('printing');
        resolve();
      };
      window.addEventListener('afterprint', cleanup, { once: true });
      // Fallback: if afterprint doesn't fire within 10s, cleanup anyway
      setTimeout(() => {
        if (document.body.classList.contains('printing')) {
          cleanup();
        }
      }, 10000);
    });
  });
};

export const PrintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [node, setNode] = useState<React.ReactNode>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const printContent = useCallback((content: React.ReactNode) => {
    setNode(content);
  }, []);

  const clearContent = useCallback(() => {
    setNode(null);
  }, []);

  return (
    <PrintContext.Provider value={{ printContent, clearContent }}>
      {/* The app content — hidden during print via CSS */}
      <div id="app-root">
        {children}
      </div>
      {/* Print-only area — shown during print via CSS */}
      <div id="print-area" ref={printAreaRef}>
        {node}
      </div>
    </PrintContext.Provider>
  );
};
