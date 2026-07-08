// Sandbox safety patch for window.fetch write attempts (e.g. from polyfills or other libraries)
try {
  const patchFetch = (obj: any) => {
    if (!obj) return;
    try {
      const originalFetch = obj.fetch;
      if (originalFetch) {
        Object.defineProperty(obj, "fetch", {
          get() { return originalFetch; },
          set() { console.warn("Sandbox safety patch: prevented overwrite of fetch"); },
          configurable: true,
          enumerable: true
        });
      }
    } catch {}
  };
  patchFetch(typeof window !== "undefined" ? window : null);
  patchFetch(typeof globalThis !== "undefined" ? globalThis : null);
  patchFetch(typeof global !== "undefined" ? global : null);
} catch {}

// Patch console.error to filter out benign Firestore idle connection stream logs
try {
  const originalError = console.error;
  console.error = function (...args: any[]) {
    const errorStr = args
      .map(arg => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");

    if (
      errorStr.includes("Disconnecting idle stream") ||
      errorStr.includes("Timed out waiting for new targets") ||
      errorStr.includes("GrpcConnection RPC 'Listen'")
    ) {
      console.info("[Firestore Benign Info]: Connection idle stream closed (reconnects automatically).");
      return;
    }
    originalError.apply(console, args);
  };
} catch {}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
