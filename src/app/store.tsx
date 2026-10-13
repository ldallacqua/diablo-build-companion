import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { freshState, type AppState } from '../domain/models';
import { catalogue, parseItem } from '../domain/parser';
import { loadBrowserState, saveBrowserState } from '../services/storage';
import type { OcrResult } from '../shared/bridge';
interface Store {
  state: AppState;
  ready: boolean;
  busy: boolean;
  preview: string;
  timing: number;
  error: string;
  message: (text: string) => void;
  update: (next: AppState | ((state: AppState) => AppState)) => void;
  scanImage: (image: string) => Promise<void>;
  capture: () => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(freshState),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(''),
    [timing, setTiming] = useState(0),
    [error, setError] = useState('');
  const current = useRef(state);
  function update(next: AppState | ((state: AppState) => AppState)) {
    const value = typeof next === 'function' ? next(current.current) : next;
    current.current = value;
    setState(value);
    if (window.sanctum) void window.sanctum.save(value).catch((e) => setError(String(e)));
    else
      try {
        saveBrowserState(value);
      } catch {
        setError('Could not save locally. Check available storage.');
      }
  }
  useEffect(() => {
    let cancelled = false;
    const host = window.sanctum;
    void (host ? host.load() : Promise.resolve(loadBrowserState()))
      .then((data) => {
        if (!cancelled) {
          current.current = data;
          setState(data);
          setReady(true);
        }
      })
      .catch((e) => {
        setError(String(e));
        setReady(true);
      });
    const off = host
      ? [
          host.onBusy(setBusy),
          host.onError(setError),
          host.onState((data) => {
            current.current = data;
            setState(data);
          }),
          host.onOcr((result: OcrResult) => {
            setPreview(result.image ?? '');
            setTiming(result.milliseconds);
            update((s) => ({
              ...s,
              lastItem: parseItem(
                result.text,
                catalogue(Object.values(s.builds)),
                result.confidence,
              ),
            }));
          }),
        ]
      : [];
    return () => {
      cancelled = true;
      off.forEach((fn) => fn());
    };
  }, []);
  async function scanImage(image: string) {
    if (!window.sanctum)
      throw new Error(
        'Screenshot OCR runs in the Windows app. Use the installer or correct tooltip text manually.',
      );
    await window.sanctum.scanImage(image);
  }
  async function capture() {
    if (!window.sanctum)
      throw new Error('Screen capture requires the Windows desktop application.');
    await window.sanctum.capture();
  }
  return (
    <Context.Provider
      value={{
        state,
        ready,
        busy,
        preview,
        timing,
        error,
        message: setError,
        update,
        scanImage,
        capture,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider is missing.');
  return store;
}
