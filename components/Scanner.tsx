'use client';

import { useEffect, useRef, useState } from 'react';

interface Detector { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (o: { formats: string[] }) => Detector;

/**
 * Scanner de QR code / code-barres.
 * Utilise la caméra et l'API BarcodeDetector quand le navigateur la propose (Chrome Android),
 * sinon simule la lecture du code attendu après un court délai.
 */
export default function Scanner({ expected, onRead, onCancel }: { expected: string; onRead: (code: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'sim' | 'cam'>('sim');
  const [msg, setMsg] = useState('Simulation de scan · visez le QR code');
  const done = useRef(false);
  const cb = useRef(onRead);
  cb.current = onRead;

  // Simulation : le code attendu est « lu » au bout de 1,7 s
  useEffect(() => {
    if (mode !== 'sim') return;
    const t = setTimeout(() => { if (!done.current) { done.current = true; cb.current(expected); } }, 1700);
    return () => clearTimeout(t);
  }, [mode, expected]);

  useEffect(() => {
    if (mode !== 'cam') return;
    let stream: MediaStream | null = null, raf = 0, live = true;
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector!;
    const det = new Ctor({ formats: ['qr_code', 'code_128'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
      if (!live) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s;
      const v = video.current!;
      v.srcObject = s;
      v.play();
      setMsg('Visez le QR code ou le code-barres');
      const loop = async () => {
        if (!live || done.current) return;
        try {
          const r = await det.detect(v);
          if (r[0]) { done.current = true; cb.current(r[0].rawValue); return; }
        } catch { /* image pas prête */ }
        raf = requestAnimationFrame(loop);
      };
      loop();
    }).catch(() => { setMsg('Caméra refusée · simulation'); setMode('sim'); });
    return () => { live = false; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  }, [mode]);

  const canCam = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices;

  return (
    <>
      <div className="scanner">
        {mode === 'cam' && <video ref={video} muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div className="frame" />
        <p>{msg}</p>
      </div>
      <div className="row">
        {canCam && mode === 'sim' && <button className="btn btn-sm" onClick={() => { done.current = false; setMode('cam'); }}>Utiliser la caméra</button>}
        <button className="btn btn-sm" onClick={onCancel}>Annuler</button>
      </div>
    </>
  );
}
