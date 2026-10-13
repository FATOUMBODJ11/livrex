/*
 * API e-commerce LIVREX (prototype).
 * POST /api/v1/shipments : valide une demande d'envoi, calcule le prix et l'heure d'arrivée,
 * et renvoie l'envoi créé. Le prototype ne garde pas de base de données côté serveur :
 * l'écran Admin › API réinjecte la réponse dans les données de démonstration.
 */
import { NextResponse } from 'next/server';
import { CAT_CODES, Q } from '@/lib/data';
import { priceExp } from '@/lib/pricing';
import { freshState } from '@/lib/seed';
import type { CatCode } from '@/lib/types';

/** Clé de démonstration. En production : une clé par boutique, stockée chiffrée. */
const DEMO_KEY = 'demo_livrex_2026';

interface Body {
  pickup?: string; dropoff?: string; weight_kg?: number; service?: string; category?: string;
  dimensions_cm?: { l?: number; w?: number; h?: number };
  description?: string; reference?: string;
  sender?: { name?: string; phone?: string };
  recipient?: { name?: string; phone?: string };
  payment?: 'prepaid' | 'cod';
}

const bad = (status: number, error: string, details?: string[]) => NextResponse.json({ error, details }, { status });

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${DEMO_KEY}`) return bad(401, 'Clé API manquante ou invalide', [`En-tête attendu : Authorization: Bearer ${DEMO_KEY}`]);

  let b: Body;
  try { b = await req.json(); } catch { return bad(400, 'Corps JSON invalide'); }

  const errs: string[] = [];
  if (!b.pickup || !Q[b.pickup]) errs.push(`pickup : quartier inconnu. Valeurs : ${Object.keys(Q).join(', ')}`);
  if (!b.dropoff || !Q[b.dropoff]) errs.push('dropoff : quartier inconnu');
  if (b.pickup && b.pickup === b.dropoff) errs.push('pickup et dropoff doivent être différents');
  const w = Number(b.weight_kg);
  if (!(w > 0 && w <= 50)) errs.push('weight_kg : nombre entre 0 et 50');
  const service = (b.service || 'standard').toLowerCase();
  if (!['express', 'standard'].includes(service)) errs.push('service : "express" ou "standard"');
  const cat = (b.category || 'STD').toUpperCase() as CatCode;
  if (!CAT_CODES.includes(cat)) errs.push(`category : ${CAT_CODES.join(', ')}`);
  if (!b.recipient?.phone || b.recipient.phone.replace(/\D/g, '').length < 9) errs.push('recipient.phone : numéro à 9 chiffres');
  if (errs.length) return bad(422, 'Demande invalide', errs);

  const dims = { L: b.dimensions_cm?.l || 20, W: b.dimensions_cm?.w || 15, H: b.dimensions_cm?.h || 10 };
  const q = priceExp(freshState().tarifs, { fromQ: b.pickup!, toQ: b.dropoff!, cat, weight: w, ...dims, service: service === 'express' ? 'EXPRESS' : 'STANDARD' });

  return NextResponse.json({
    object: 'shipment',
    status: 'created',
    reference: b.reference || null,
    pickup: b.pickup, dropoff: b.dropoff, weight_kg: w, billable_weight_kg: q.bill, distance_km: q.km,
    category: cat, service, dimensions_cm: { l: dims.L, w: dims.W, h: dims.H },
    sender: { name: b.sender?.name || 'Boutique en ligne', phone: b.sender?.phone || '' },
    recipient: { name: b.recipient?.name || 'Client', phone: b.recipient!.phone },
    description: b.description || '',
    payment: b.payment === 'cod' ? 'cod' : 'prepaid',
    price: { amount: q.total, currency: 'XOF', lines: q.lines.map(([label, amount]) => ({ label, amount: Math.round(amount) })) },
    eta: q.eta,
    webhooks: ['shipment.assigned', 'shipment.picked_up', 'shipment.delivered'],
    created_at: new Date().toISOString(),
  }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({
    name: 'LIVREX API', version: 'v1', status: 'ok',
    endpoints: { 'POST /api/v1/shipments': 'Créer un envoi express dans Dakar' },
    zones: Object.keys(Q),
  });
}
