/* Tarification : barème indicatif, réglable dans Admin › Tarifs, à valider avec la direction. */
import { CATS, qp } from './data';
import { hfmt } from './format';
import { hav, roadKm } from './geo';
import type { AgencyCode, CatCode, Tarifs, VehicleKind } from './types';

export type PriceLine = [string, number];

export function seatPrice(t: Tarifs, festive: boolean, a: AgencyCode, b: AgencyCode, kind: VehicleKind) {
  const r = t.seat[kind as keyof Tarifs['seat']] || 20;
  let p = Math.round((roadKm(a, b) * r) / 100) * 100;
  p = Math.max(p, 1000);
  if (festive) p = Math.round((p * (1 + t.festive / 100)) / 100) * 100;
  return p;
}

export interface FretInput {
  from: AgencyCode; to: AgencyCode; cat: CatCode | ''; weight: number | string;
  service?: string; packed?: 'agence' | 'client';
}

export function priceFret(t: Tarifs, p: FretInput) {
  const km = roadKm(p.from, p.to);
  const c = p.cat ? CATS[p.cat] : { sur: 0, label: '' };
  const w = +p.weight || 0;
  const L: PriceLine[] = [
    ['Forfait de prise en charge', t.fretBase],
    [`Poids · ${w.toLocaleString('fr-FR')} kg × ${t.fretKg}`, w * t.fretKg],
    [`Distance · ${km} km × ${t.fretKm}`, km * t.fretKm],
  ];
  const sub = L.reduce((s, x) => s + x[1], 0);
  if (c.sur) L.push([`Catégorie ${c.label} · +${Math.round(c.sur * 100)} %`, sub * c.sur]);
  if (p.service === 'EXPRESS24') L.push([`Service express 24 h · ×${t.expressMult}`, sub * (1 + (c.sur || 0)) * (t.expressMult - 1)]);
  if (p.packed === 'agence') L.push(["Emballage fourni par l'agence", t.pack]);
  const total = Math.round(L.reduce((s, x) => s + x[1], 0) / 50) * 50;
  return { km, lines: L, total };
}

export interface ExpInput {
  fromQ: string; toQ: string; cat: CatCode; weight: number; L: number; W: number; H: number; service: string;
}

export function priceExp(t: Tarifs, e: ExpInput, now = Date.now()) {
  const a = qp(e.fromQ), b = qp(e.toQ);
  const km = Math.max(1, Math.round(hav(a, b) * 1.35 * 10) / 10);
  /** Poids volumétrique : L × l × H / 5000 */
  const vol = Math.round(((e.L * e.W * e.H) / 5000) * 10) / 10;
  const bill = Math.max(+e.weight || 0, vol);
  const c = CATS[e.cat] || { sur: 0, label: '' };
  const L: PriceLine[] = [
    ['Prise en charge', t.expBase],
    [`Poids facturé · ${bill.toLocaleString('fr-FR')} kg × ${t.expKg}`, bill * t.expKg],
    [`Distance · ${km.toLocaleString('fr-FR')} km × ${t.expKm}`, km * t.expKm],
  ];
  const sub = L.reduce((s, x) => s + x[1], 0);
  if (c.sur) L.push([`Catégorie ${c.label} · +${Math.round(c.sur * 100)} %`, sub * c.sur]);
  if (e.service === 'EXPRESS') L.push([`Express · ×${t.expressMult}`, sub * (1 + (c.sur || 0)) * (t.expressMult - 1)]);
  const total = Math.round(L.reduce((s, x) => s + x[1], 0) / 50) * 50;
  const mins = e.service === 'EXPRESS' ? Math.round(20 + (km / 18) * 60) : null;
  return { km, vol, bill, lines: L, total, mins, eta: mins ? hfmt(now + mins * 6e4) : "Avant 20:00 aujourd'hui" };
}
