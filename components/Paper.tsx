'use client';

import { AG, CATS } from '@/lib/data';
import { dfmt, fcfa } from '@/lib/format';
import type { Booking, Parcel } from '@/lib/types';
import { Barcode, QR } from './Codes';

function PaperTop({ title }: { title: string }) {
  return (
    <div className="paper-top">
      <img src="/logo-dark.png" alt="Afrique Express Services" />
      <span>{title}</span>
    </div>
  );
}

/** Lettre de voiture LIVREX ou étiquette de fret, avec Code 128 et QR code */
export function Waybill({ p }: { p: Parcel }) {
  const c = CATS[p.cat];
  const fromL = p.type === 'EXPRESS' ? p.pickup!.label : 'Agence ' + AG[p.from!].name;
  const toL = p.type === 'EXPRESS'
    ? p.drop!.label
    : 'Agence ' + AG[p.to!].name + (p.delivery === 'livraison' && p.drop ? ' → ' + p.drop.label : '');
  return (
    <>
      <PaperTop title={p.type === 'EXPRESS' ? 'LIVREX · LETTRE DE VOITURE' : 'FRET · ÉTIQUETTE COLIS'} />
      <div className="lb">
        <div className="big mono">{p.id}</div>
        <div className="kv">
          <div><small>Origine</small><b>{fromL}</b></div>
          <div><small>Destination</small><b>{toL}</b></div>
          <div><small>Destinataire</small><b>{p.recipient}<br />{p.recipientTel}</b></div>
          <div><small>Poids</small><b>{(+p.weight).toLocaleString('fr-FR')} kg</b></div>
          <div><small>Service</small><b>{p.service === 'EXPRESS' ? 'Express' : p.service === 'EXPRESS24' ? 'Express 24 h' : 'Standard'}</b></div>
          <div><small>Catégorie</small><b><span className="cat">{c.label}</span></b></div>
        </div>
        <div className="codes"><Barcode value={p.id} /><QR text={p.id} size={84} /></div>
      </div>
    </>
  );
}

export function Ticket({ b, i }: { b: Booking; i: number }) {
  const tk = b.tickets[i];
  return (
    <div className="paper">
      <PaperTop title="TICKET DE TRANSPORT" />
      <div className="ticket">
        <div className="main">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ color: '#5D6E80' }}>Ticket {tk}</span>
            <span className="eyebrow" style={{ color: '#5D6E80' }}>Réservation {b.id}</span>
          </div>
          <div className="route">{AG[b.from].name}<span />{AG[b.to].name}</div>
          <div className="kv">
            <div><small>Passager</small><b>{b.names[i]}</b></div>
            <div><small>Date</small><b>{dfmt(b.date)}</b></div>
            <div><small>Départ</small><b>{b.time}{b.arr ? ' → ' + b.arr : ''}</b></div>
            <div><small>Véhicule</small><b>{b.veh}{b.plate ? ' · ' + b.plate : ''}</b></div>
            <div><small>Siège</small><b>{b.seats[i]}</b></div>
            <div><small>Prix</small><b>{fcfa(b.amount / b.tickets.length)}{b.paid === false ? ' · à régler' : ''}</b></div>
          </div>
        </div>
        <div className="stub">
          <QR text={`${tk}|${b.id}|${b.from}-${b.to}|${b.date} ${b.time}|S${b.seats[i]}`} size={104} />
          <span className="mono" style={{ fontSize: 11 }}>{tk}</span>
        </div>
      </div>
    </div>
  );
}
