'use client';

/*
 * État global du prototype. Tout vit dans le navigateur (localStorage) pour la démo :
 * les écrans Agent, Chauffeur, Livreur et Admin partagent les mêmes données.
 * Pour la vraie application, ces actions deviendront des appels à l'API serveur.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sim, type Ctx } from './actions';
import { freshState, STATE_VERSION } from './seed';
import type { AppState } from './types';

const KEY = 'aes-livrex-v' + STATE_VERSION;

interface Toast { id: number; msg: string; ch?: string }

interface Store {
  S: AppState;
  /** Change à chaque mise à jour, pour les mémos */
  rev: number;
  /** Exécute une action qui modifie l'état puis rafraîchit l'interface */
  act: <T>(fn: (c: Ctx) => T) => T;
  toast: (msg: string, ch?: string) => void;
  reset: () => void;
  /** Nombre de réinitialisations : sert de clé aux formulaires non contrôlés */
  resets: number;
  drawer: ReactNode;
  openDrawer: (node: ReactNode) => void;
  closeDrawer: () => void;
}

const StoreCtx = createContext<Store | null>(null);

function load(): AppState {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && j.v === STATE_VERSION) return j;
  } catch { /* stockage indisponible */ }
  return freshState();
}

function persist(S: AppState) {
  try {
    const c: AppState = JSON.parse(JSON.stringify(S));
    // Les photos et signatures ne sont pas conservées (taille du stockage local)
    c.parcels.forEach(p => { if (p.proof) { p.proof.photo = !!p.proof.photo; p.proof.sig = !!p.proof.sig; } });
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch { /* stockage plein ou bloqué */ }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const ref = useRef<AppState | null>(null);
  const [rev, setRev] = useState(0);
  const [resets, setResets] = useState(0);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawer, setDrawer] = useState<ReactNode>(null);
  const toastN = useRef(0);

  // Enregistrement immédiat : une action ne doit pas être perdue si la page est rechargée aussitôt
  const save = useCallback(() => { if (ref.current) persist(ref.current); }, []);

  const toast = useCallback((msg: string, ch?: string) => {
    const id = ++toastN.current;
    setToasts(t => [...t.slice(-2), { id, msg, ch }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);

  const act = useCallback(<T,>(fn: (c: Ctx) => T): T => {
    const out = fn({ S: ref.current!, toast });
    setRev(r => r + 1);
    save();
    return out;
  }, [toast, save]);

  const reset = useCallback(() => {
    ref.current = freshState();
    persist(ref.current);
    setRev(r => r + 1);
    setResets(n => n + 1);
    toast('Données de démonstration rétablies');
  }, [toast]);

  // Chargement côté client uniquement : évite les écarts entre rendu serveur et navigateur
  useEffect(() => {
    ref.current = load();
    setReady(true);
  }, []);

  // Simulation temps réel : une seconde = un pas
  useEffect(() => {
    if (!ready) return;
    let n = 0;
    const id = setInterval(() => {
      sim(ref.current!);
      setRev(r => r + 1);
      if (++n % 5 === 0) persist(ref.current!);
    }, 1000);
    // Les positions simulées sont aussi enregistrées quand on quitte ou masque la page
    const flush = () => { if (ref.current) persist(ref.current); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      clearInterval(id);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [ready]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(null); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const value = useMemo<Store | null>(() => ready && ref.current ? {
    S: ref.current, rev, act, toast, reset, resets, drawer,
    openDrawer: setDrawer, closeDrawer: () => setDrawer(null),
  } : null, [ready, rev, act, toast, reset, resets, drawer]);

  return (
    <StoreCtx.Provider value={value}>
      {value ? children : <div className="wrap boot"><span className="spin" /> Chargement…</div>}
      {value && drawer && (
        <>
          <div className="drawer-bg" onClick={() => setDrawer(null)} />
          <aside className="drawer" role="dialog" aria-modal="true">{drawer}</aside>
        </>
      )}
      <div id="toasts" aria-live="polite">
        {toasts.map(t => (
          <div className="toast" key={t.id}>{t.ch && <span className="ch">{t.ch}</span>}<span>{t.msg}</span></div>
        ))}
      </div>
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return s;
}
