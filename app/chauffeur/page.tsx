'use client';

import { useState } from 'react';
import MapCanvas from '@/components/MapCanvas';
import { PageHead } from '@/components/ui';
import { arrive, departVehicle } from '@/lib/actions';
import { AG, AG_CODES, CATS, DRIVERS, LINES, ST } from '@/lib/data';
import { agencyPts, findParcel } from '@/lib/domain';
import { dIso, hfmt, kg, plural } from '@/lib/format';
import { roadKm, vehPos } from '@/lib/geo';
import { useStore } from '@/lib/store';
import type { AgencyCode, MapScene } from '@/lib/types';

export default function Chauffeur() {
  const { S, act } = useStore();
  const [driver, setDriver] = useState('D3');
  const [dest, setDest] = useState<AgencyCode | ''>('');
  const [sel, setSel] = useState<string[]>([]);
  const v = S.vehicles.find(x => x.driver === driver)!;

  const dests = AG_CODES.filter(k => k !== v.agency);
  const to: AgencyCode = dest || S.parcels.find(p => p.status === ST.READY && p.from === v.agency)?.to || dests[0];
  const ready = S.parcels.filter(p => p.status === ST.READY && p.from === v.agency && p.to === to);
  const otherReady = S.parcels.filter(p => p.status === ST.READY && p.from === v.agency && p.to !== to);

  const pts = agencyPts();
  const scene: MapScene = { mode: 'sn', points: pts, routes: [], trail: v.trip?.trail || [] };
  if (v.trip) { scene.routes!.push([AG[v.trip.from], AG[v.trip.to]]); pts.push({ ...vehPos(v), kind: 'veh', label: v.id }); }
  else { pts.push({ ...AG[v.agency], kind: 'veh', label: v.id }); scene.routes!.push([AG[v.agency], AG[to]]); }

  const lines = LINES.filter(l => l[3] === v.id);
  const today = dIso(Date.now());

  return (
    <section className="view">
      <PageHead eyebrow="Espace chauffeur" title={DRIVERS[driver]} lead={`${v.type} · ${v.id} · ${v.plate}${v.cold ? ' · véhicule réfrigéré' : ''}`}
        right={<div className="field" style={{ minWidth: 220 }}><label htmlFor="c-d">Chauffeur</label>
          <select className="in" id="c-d" value={driver} onChange={e => { setDriver(e.target.value); setDest(''); setSel([]); }}>
            {S.vehicles.map(x => <option key={x.driver} value={x.driver}>{DRIVERS[x.driver]} · {x.id}</option>)}</select></div>} />
      <div className="wrap split">
        <div className="card">
          {v.trip ? (() => {
            const t = v.trip, km = roadKm(t.from, t.to), done = Math.round(km * t.progress), arrived = t.progress >= 1;
            return (
              <>
                <div className="card-h">
                  <div><span className="eyebrow">Trajet en cours</span><h3 style={{ marginTop: 4 }}>{AG[t.from].name} → {AG[t.to].name}</h3></div>
                  <span className={`pill ${arrived ? 't-g' : 't-w'}`}>{arrived ? 'À destination' : 'En route'}</span>
                </div>
                <div className="zonebar" style={{ height: 10 }}><i style={{ width: t.progress * 100 + '%' }} /></div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                  <span className="muted">Départ {hfmt(t.start)}</span><span className="mono">{done} / {km} km</span>
                </div>
                <div className="lab" style={{ margin: '18px 0 8px' }}>Colis à bord ({t.parcels.length})</div>
                <div className="stack" style={{ gap: 6 }}>
                  {t.parcels.length ? t.parcels.map(id => {
                    const p = findParcel(S, id);
                    return p && <div key={id} className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}><span className="mono">{id}</span><span>{CATS[p.cat].label} · {kg(p.weight)}</span></div>;
                  }) : <span className="muted">Aucun colis, trajet voyageurs.</span>}
                </div>
                <div className="row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => act(c => { c.S.speed = c.S.speed > 1 ? 1 : 10; })}>{S.speed > 1 ? 'Vitesse normale' : 'Accélérer la simulation ×10'}</button>
                  <button className="btn btn-accent" disabled={!arrived} onClick={() => act(c => arrive(c, v))}>Signaler l&apos;arrivée</button>
                </div>
              </>
            );
          })() : (
            <>
              <div className="card-h">
                <div><span className="eyebrow">Préparer un départ · Agence {AG[v.agency].name}</span><h3 style={{ marginTop: 4 }}>Chargement</h3></div>
                <span className="pill t-b">À quai</span>
              </div>
              <div className="field"><label htmlFor="c-to">Destination</label>
                <select className="in" id="c-to" value={to} onChange={e => { setDest(e.target.value as AgencyCode); setSel([]); }}>
                  {dests.map(k => <option key={k} value={k}>{AG[k].name} · {roadKm(v.agency, k)} km</option>)}</select></div>
              <div className="lab" style={{ margin: '18px 0 8px' }}>Colis prêts pour {AG[to].name}</div>
              {ready.length ? (
                <div className="stack" style={{ gap: 8 }}>
                  {ready.map(p => {
                    const bad = CATS[p.cat].cold && !v.cold;
                    return (
                      <label key={p.id} className="check" style={bad ? { opacity: 0.6 } : undefined}>
                        <input type="checkbox" checked={sel.includes(p.id)} disabled={bad}
                          onChange={e => setSel(s => e.target.checked ? [...s, p.id] : s.filter(x => x !== p.id))} />
                        <span><b className="mono">{p.id}</b> · {CATS[p.cat].label} · {kg(p.weight)}{bad && <> <span className="pill t-r">Véhicule réfrigéré requis</span></>}</span>
                      </label>
                    );
                  })}
                </div>
              ) : <p className="muted">Aucun colis prêt pour cette destination.</p>}
              {otherReady.length > 0 && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Aussi prêts au départ de {AG[v.agency].name} : {otherReady.map(p => `${p.id} → ${AG[p.to!].name}`).join(', ')}.</p>}
              <div className="row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: 13 }}>
                  {sel.length ? `${sel.length} colis à charger` : v.kind === 'fret' ? 'Cochez au moins un colis : un véhicule de fret ne part pas à vide.' : 'Aucun colis : départ voyageurs uniquement.'}
                </span>
                <button className="btn btn-accent" disabled={v.kind === 'fret' && !sel.length}
                  onClick={() => { act(c => departVehicle(c, v, to, sel)); setSel([]); setDest(''); }}>
                  {sel.length || v.kind === 'fret' ? 'Signaler le départ' : 'Départ sans colis'}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="stack">
          <div className="card">
            <MapCanvas scene={scene} className="tall" />
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Position envoyée toutes les secondes dans la démo. La fréquence réelle reste à définir.</p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Départs voyageurs du jour</h3>
            {lines.length ? (
              <div className="stack" style={{ gap: 6, fontSize: 14 }}>
                {lines.flatMap(([a, b, times]) => times.map(tm => {
                  const id = `${a}-${b}-${today}-${tm}`;
                  const bk = S.bookings.filter(x => x.tripId === id).reduce((s, x) => s + x.seats.length, 0);
                  return <div key={id} className="row" style={{ justifyContent: 'space-between' }}><span><b className="mono">{tm}</b> {AG[a].name} → {AG[b].name}</span><span className="muted">{bk} {plural(bk, 'réservé')} en ligne</span></div>;
                }))}
              </div>
            ) : <p className="muted">Ce véhicule est dédié au fret.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
