/* Actions qui modifient l'état. Elles reçoivent l'état et une fonction d'alerte. */
import { AG, CHANNELS, DRIVERS, ST } from './data';
import { findParcel, nearestFree, nextZone, pickupOf, placeName } from './domain';
import { hav, vehPos } from './geo';
import type { AppState, Parcel, Status, Vehicle } from './types';

export interface Ctx {
  S: AppState;
  toast: (msg: string, ch?: string) => void;
}

/** Modèles de messages envoyés au client à chaque changement important */
const MSG: Partial<Record<Status, string>> = {
  'Créé': 'Votre colis {id} a été enregistré.',
  'En transit': 'Votre colis {id} est actuellement en cours de transfert.',
  'Arrivé': "Votre colis {id} est arrivé à l'agence de destination ({to}).",
  'Livreur affecté': 'Un livreur a été affecté à votre colis {id}.',
  'En livraison': 'Votre colis {id} est actuellement en cours de livraison. Code de remise : {otp}.',
  'Livré': 'Votre colis {id} a été livré.',
  'Retiré': 'Votre colis {id} a été retiré en agence.',
  'En stockage destination': "Votre colis {id} vous attend à l'agence de {to}. Présentez le code {otp} et votre pièce d'identité.",
};

function notify(c: Ctx, p: Parcel, s: Status) {
  const tpl = MSG[s];
  if (!tpl) return;
  if (s === ST.DEST && p.delivery !== 'retrait') return;
  const msg = tpl.replace('{id}', p.id).replace('{to}', placeName(p, 'to')).replace('{otp}', p.otp);
  const who = s === ST.CREATED ? `${p.sender} · ${p.senderTel}` : `${p.recipient} · ${p.recipientTel}`;
  const ch = CHANNELS[p.channel] || 'SMS';
  c.S.notifs.unshift({ t: Date.now(), id: p.id, ch, to: who, msg });
  c.toast(msg, ch);
}

export function setStatus(c: Ctx, p: Parcel, s: Status, note = '') {
  p.status = s;
  p.updated = Date.now();
  p.history.push({ s, t: p.updated, note });
  notify(c, p, s);
}

/** Ajoute une étape à l'historique sans changer de statut */
export function logStep(p: Parcel, note: string) {
  p.history.push({ s: p.status, t: Date.now(), note });
  p.updated = Date.now();
}

export function assign(c: Ctx, p: Parcel, cid: string) {
  const cour = c.S.couriers.find(x => x.id === cid);
  if (!cour || cour.job) return false;
  // Un colis réservé dans la tournée d'un autre livreur en sort
  if (p.reservedFor && p.reservedFor !== cour.id) {
    const other = c.S.couriers.find(x => x.id === p.reservedFor);
    if (other?.route) other.route = other.route.filter(id => id !== p.id);
  }
  p.reservedFor = undefined;
  cour.job = p.id;
  p.courier = cour.id;
  if (!p.pickup) p.pickup = { ...AG[p.to!], label: 'Agence ' + AG[p.to!].name };
  p.track = [];
  setStatus(c, p, ST.ASSIGNED, `${cour.name} · ${cour.mode}`);
  return true;
}

/**
 * Lance une tournée : la première course est affectée tout de suite,
 * les suivantes sont réservées au livreur et lui seront données dans l'ordre.
 */
export function startRoute(c: Ctx, order: Parcel[], cid: string) {
  const cour = c.S.couriers.find(x => x.id === cid);
  if (!cour || cour.job || !order.length) return false;
  const [first, ...rest] = order;
  rest.forEach(p => { p.reservedFor = cid; });
  cour.route = rest.map(p => p.id);
  assign(c, first, cid);
  c.toast(`Tournée de ${order.length} course(s) confiée à ${cour.name}`);
  return true;
}

/** Après une livraison : passe à la course suivante de la tournée s'il y en a une */
export function nextInRoute(c: Ctx, cid: string) {
  const cour = c.S.couriers.find(x => x.id === cid);
  if (!cour || cour.job) return;
  while (cour.route && cour.route.length) {
    const p = findParcel(c.S, cour.route.shift()!);
    // On saute les colis repris entre-temps par quelqu'un d'autre
    if (p && p.reservedFor === cid) { assign(c, p, cid); return; }
  }
  cour.route = [];
}

export function autoAssign(c: Ctx, p: Parcel) {
  const best = nearestFree(c.S, pickupOf(p));
  if (!best) { c.toast('Aucun livreur disponible pour le moment.'); return false; }
  return assign(c, p, best.id);
}

export function departVehicle(c: Ctx, v: Vehicle, dest: Vehicle['agency'], parcelIds: string[]) {
  if (v.kind === 'fret' && !parcelIds.length) { c.toast('Un véhicule de fret ne part pas à vide.'); return; }
  v.trip = { from: v.agency, to: dest, progress: 0, parcels: [...parcelIds], start: Date.now(), trail: [] };
  parcelIds.forEach(id => {
    const p = findParcel(c.S, id);
    if (!p) return;
    p.vehicle = v.id;
    p.track = [];
    setStatus(c, p, ST.TRANSIT, `Départ ${AG[v.agency].name} · ${v.id} · ${DRIVERS[v.driver]}`);
  });
  c.toast(`Départ ${v.id} vers ${AG[dest].name} enregistré`);
}

export function arrive(c: Ctx, v: Vehicle) {
  const t = v.trip;
  if (!t) return;
  t.parcels.forEach(id => {
    const p = findParcel(c.S, id);
    if (!p) return;
    setStatus(c, p, ST.ARRIVED, 'Arrivée ' + AG[t.to].name + ' · ' + v.id);
    p.zone = ''; // l'emplacement de l'agence de départ ne compte plus
    p.zone = nextZone(c.S, t.to, p.cat);
    setStatus(c, p, ST.DEST, p.zone);
  });
  v.agency = t.to;
  v.trip = null;
  c.toast(`${v.id} arrivé à ${AG[t.to].name}`);
}

/** Un pas de simulation : véhicules et livreurs avancent */
export function sim(S: AppState) {
  const m = S.speed;
  S.vehicles.forEach(v => {
    if (!v.trip || v.trip.progress >= 1) return;
    v.trip.progress = Math.min(1, v.trip.progress + m / 120);
    const pos = vehPos(v);
    const trail = (v.trip.trail = v.trip.trail || []);
    if (!trail.length) trail.push({ lat: AG[v.trip.from].lat, lon: AG[v.trip.from].lon });
    trail.push(pos);
    if (trail.length > 200) trail.splice(1, 1);
    v.trip.parcels.forEach(id => { const p = findParcel(S, id); if (p) p.track = trail; });
  });
  S.couriers.forEach(c => {
    const p = c.job ? findParcel(S, c.job) : undefined;
    if (!p) return;
    const tg = p.status === ST.DELIV ? p.drop : p.status === ST.ASSIGNED ? p.pickup : null;
    if (!tg) return;
    const d = Math.hypot(tg.lat - c.pos.lat, tg.lon - c.pos.lon), stp = 0.0011 * m;
    if (d < 0.0004) return;
    const k = Math.min(1, stp / d);
    c.pos = { lat: c.pos.lat + (tg.lat - c.pos.lat) * k, lon: c.pos.lon + (tg.lon - c.pos.lon) * k };
    if (p.status === ST.DELIV) {
      p.track = p.track || [];
      if (!p.track.length && p.pickup) p.track.push({ lat: p.pickup.lat, lon: p.pickup.lon });
      p.track.push({ ...c.pos });
      if (p.track.length > 200) p.track.splice(1, 1);
    }
  });
}

/**
 * Rayon autour du point de ramassage ou de livraison dans lequel le livreur doit se trouver
 * pour scanner le colis ou valider la livraison. Valeur à ajuster selon la précision GPS réelle.
 */
export const GEOFENCE_KM = 0.15;

/** Démo uniquement : place le livreur sur son prochain point (remplace l'attente du trajet simulé) */
export function teleportCourier(c: Ctx, p: Parcel) {
  const cour = c.S.couriers.find(x => x.id === p.courier);
  const tg = p.status === ST.DELIV ? p.drop : pickupOf(p);
  if (!cour || !tg) return;
  cour.pos = { lat: tg.lat, lon: tg.lon };
}

/** Distance restante du livreur jusqu'à sa prochaine étape */
export const courierDistance = (S: AppState, p: Parcel) => {
  const c = S.couriers.find(x => x.id === p.courier);
  if (!c) return null;
  const tg = p.status === ST.DELIV ? p.drop : pickupOf(p);
  return tg ? hav(c.pos, tg) : null;
};
