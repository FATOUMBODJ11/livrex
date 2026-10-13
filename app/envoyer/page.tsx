'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type InputHTMLAttributes } from 'react';
import MapCanvas from '@/components/MapCanvas';
import { Waybill } from '@/components/Paper';
import { Choice, PageHead } from '@/components/ui';
import { setStatus } from '@/lib/actions';
import { AG, AG_CODES, CAT_CODES, CATS, METHODS, QUARTIERS, qp, ST } from '@/lib/data';
import { findParcel } from '@/lib/domain';
import { fcfa, nf, otp, pad } from '@/lib/format';
import { priceExp, priceFret } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import type { AgencyCode, CatCode, Channel, Method, Parcel } from '@/lib/types';

interface Form {
  sender: string; senderTel: string; fromQ: string; fromNote: string;
  recipient: string; recipientTel: string; toQ: string; toNote: string;
  desc: string; cat: CatCode; weight: number; L: number; W: number; H: number;
  service: 'EXPRESS' | 'STANDARD'; channel: Channel;
}

const BLANK: Form = {
  sender: '', senderTel: '', fromQ: 'Plateau', fromNote: '', recipient: '', recipientTel: '', toQ: 'Almadies', toNote: '',
  desc: '', cat: 'STD', weight: 2, L: 30, W: 20, H: 15, service: 'EXPRESS', channel: 'SMS',
};

export default function Envoyer() {
  const { S, act } = useStore();
  const router = useRouter();
  const [f, setF] = useState<Form>(BLANK);
  const [method, setMethod] = useState<Method>('WAVE');
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const [doneId, setDoneId] = useState<string | null>(null);
  const [fr, setFr] = useState({ from: 'DKR' as AgencyCode, to: 'TBA' as AgencyCode, weight: 5, cat: 'STD' as CatCode });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(x => ({ ...x, [k]: v }));
  const e = priceExp(S.tarifs, f);
  const frR = fr.from !== fr.to ? priceFret(S.tarifs, { ...fr, packed: 'client', service: 'STANDARD' }) : null;

  const submit = () => {
    const miss = ([['sender', 'expéditeur'], ['senderTel', 'téléphone expéditeur'], ['recipient', 'destinataire'], ['recipientTel', 'téléphone destinataire']] as const)
      .filter(([k]) => !String(f[k]).trim()).map(x => x[1] as string);
    if (f.fromQ === f.toQ && !miss.length) miss.push('quartiers différents');
    if (miss.length) { setErr('À compléter : ' + miss.join(', ') + '.'); return; }
    setErr(''); setPaying(true);
    setTimeout(() => {
      const id = act(c => {
        const r = priceExp(c.S.tarifs, f);
        const id = 'EXP-2026-' + pad(++c.S.seq.EXP);
        const p: Parcel = {
          id, type: 'EXPRESS', sender: f.sender.trim(), senderTel: f.senderTel.trim(), recipient: f.recipient.trim(), recipientTel: f.recipientTel.trim(),
          fromQ: f.fromQ, toQ: f.toQ,
          pickup: { ...qp(f.fromQ), label: f.fromQ + (f.fromNote ? ' · ' + f.fromNote : '') },
          drop: { ...qp(f.toQ), label: f.toQ + (f.toNote ? ' · ' + f.toNote : '') },
          desc: f.desc, cat: f.cat, weight: +f.weight, L: +f.L, W: +f.W, H: +f.H, service: f.service, channel: f.channel,
          delivery: 'livraison', packed: 'client', zone: '', price: r.total, otp: otp(), track: [], history: [],
          status: ST.CREATED, created: Date.now(), updated: Date.now(),
          payment: { mode: method, ref: 'PAY-' + pad(++c.S.seq.PAY), amount: r.total, status: method === 'COD' ? 'À encaisser' : 'Payé', t: Date.now() },
        };
        c.S.parcels.unshift(p);
        setStatus(c, p, ST.CREATED, 'Commande en ligne · ' + METHODS[method]);
        return id;
      });
      setPaying(false); setDoneId(id); window.scrollTo({ top: 0 });
    }, 1200);
  };

  const done = doneId ? findParcel(S, doneId) : null;
  if (done) {
    return (
      <section className="view">
        <PageHead eyebrow="LIVREX · Commande confirmée" title={`Colis ${done.id} enregistré`} lead="Un livreur va être affecté. Vous recevrez un SMS à chaque étape." />
        <div className="wrap split">
          <div className="paper label" style={{ maxWidth: 'none' }}><Waybill p={done} /></div>
          <div className="card stack">
            <h3>Et maintenant ?</h3>
            <p className="muted">Imprimez ou recopiez la lettre de voiture sur le colis. Le livreur scannera le QR code au ramassage.</p>
            <div className="row no-print">
              <button className="btn btn-accent" onClick={() => router.push('/suivre?q=' + done.id)}>Suivre ce colis</button>
              <button className="btn" onClick={() => window.print()}>Imprimer la lettre de voiture</button>
              <button className="btn" onClick={() => { setDoneId(null); setF(BLANK); }}>Nouvel envoi</button>
            </div>
            <p className="note">Côté équipe : la commande apparaît dans <b>Admin › Dispatch</b>, puis dans l&apos;application <b>Livreur</b>.</p>
          </div>
        </div>
      </section>
    );
  }

  const inp = (k: keyof Form, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label htmlFor={'e-' + k}>{label}</label>
      <input className={`in${props.type === 'number' ? ' mono' : ''}`} id={'e-' + k} value={f[k] as string | number}
        onChange={ev => set(k, (props.type === 'number' ? +ev.target.value : ev.target.value) as never)} {...props} /></div>
  );
  const qSel = (k: 'fromQ' | 'toQ') => (
    <div className="field"><label htmlFor={'e-' + k}>Quartier</label>
      <select className="in" id={'e-' + k} value={f[k]} onChange={ev => set(k, ev.target.value)}>{QUARTIERS.map(n => <option key={n}>{n}</option>)}</select></div>
  );

  return (
    <section className="view">
      <PageHead eyebrow="Module 3 · LIVREX" title="Envoyer un colis en express"
        lead="Livraison dans la région de Dakar. Le prix tient compte du poids réel ou volumétrique, de la distance et de la vitesse choisie." />
      <div className="wrap split">
        <form className="card" autoComplete="off" onSubmit={ev => ev.preventDefault()}>
          <fieldset className="fs"><legend>Ramassage</legend><div className="g2">
            {inp('sender', 'Expéditeur', { placeholder: 'Nom ou boutique' })}
            {inp('senderTel', 'Téléphone', { placeholder: '77 000 00 00', inputMode: 'tel' })}
            {qSel('fromQ')}
            {inp('fromNote', 'Repère', { placeholder: 'Rue, immeuble, étage' })}
          </div></fieldset>
          <fieldset className="fs"><legend>Livraison</legend><div className="g2">
            {inp('recipient', 'Destinataire', { placeholder: 'Prénom et nom' })}
            {inp('recipientTel', 'Téléphone', { placeholder: '77 000 00 00', inputMode: 'tel' })}
            {qSel('toQ')}
            {inp('toNote', 'Repère', { placeholder: 'Rue, immeuble, étage' })}
          </div></fieldset>
          <fieldset className="fs"><legend>Colis</legend>
            {inp('desc', 'Nature de la marchandise', { placeholder: 'Ex. vêtements, documents, téléphone' })}
            <div className="choices">
              {CAT_CODES.map(k => <Choice key={k} name="ecat" value={k} checked={f.cat === k} onChange={v => set('cat', v as CatCode)} title={CATS[k].label} sub={CATS[k].group + (CATS[k].sur ? ' · +' + Math.round(CATS[k].sur * 100) + ' %' : '')} />)}
            </div>
            <div className="g4">
              {inp('weight', 'Poids (kg)', { type: 'number', min: 0.1, step: 0.1 })}
              {inp('L', 'Longueur (cm)', { type: 'number', min: 1 })}
              {inp('W', 'Largeur (cm)', { type: 'number', min: 1 })}
              {inp('H', 'Hauteur (cm)', { type: 'number', min: 1 })}
            </div>
          </fieldset>
          <fieldset className="fs"><legend>Vitesse et notifications</legend>
            <div className="choices" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
              <Choice name="esp" value="EXPRESS" checked={f.service === 'EXPRESS'} onChange={() => set('service', 'EXPRESS')} title="Express" sub="Ramassage immédiat, livraison en moins de 2 h" />
              <Choice name="esp" value="STANDARD" checked={f.service === 'STANDARD'} onChange={() => set('service', 'STANDARD')} title="Standard" sub="Livraison dans la journée" />
            </div>
            <div className="field"><label htmlFor="e-ch">Prévenir le destinataire par</label>
              <select className="in" id="e-ch" value={f.channel} onChange={ev => set('channel', ev.target.value as Channel)}>
                <option value="SMS">SMS</option><option value="EMAIL">E-mail</option><option value="CALL">Appel téléphonique</option></select></div>
          </fieldset>
        </form>

        <div className="stack sticky">
          <div className="card">
            <span className="eyebrow">Estimation immédiate</span>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', margin: '10px 0 14px' }}>
              <div className="est-big">{fcfa(e.total)}</div>
              <div style={{ textAlign: 'right' }}><div className="lab">Arrivée estimée</div><b className="mono" style={{ fontSize: 18 }}>{e.eta}</b></div>
            </div>
            <div className="est-row">
              <div><small>Poids réel</small><b>{(+f.weight || 0).toLocaleString('fr-FR')} kg</b></div>
              <div><small>Volumétrique</small><b>{e.vol.toLocaleString('fr-FR')} kg</b></div>
              <div><small>Distance</small><b>{e.km.toLocaleString('fr-FR')} km</b></div>
            </div>
            <div style={{ margin: '14px 0' }}>
              <MapCanvas scene={{ mode: 'dkr', routes: [[qp(f.fromQ), qp(f.toQ)]], points: [{ ...qp(f.fromQ), kind: 'pick' }, { ...qp(f.toQ), kind: 'drop' }] }} />
            </div>
            <div className="sum" style={{ fontSize: 13 }}>{e.lines.map(l => <div key={l[0]}><span className="muted">{l[0]}</span><span className="mono">{nf(l[1])}</span></div>)}</div>
            <div className="lab" style={{ margin: '16px 0 8px' }}>Paiement</div>
            <div className="choices" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
              {(['WAVE', 'OM', 'CARD', 'COD'] as Method[]).map(m => <Choice key={m} name="em" value={m} checked={method === m} onChange={v => setMethod(v as Method)} title={METHODS[m]} />)}
            </div>
            <button className="btn btn-accent" style={{ width: '100%', marginTop: 14 }} disabled={paying} onClick={submit}>
              {paying ? <><span className="spin" /> Validation en cours…</> : method === 'COD' ? 'Confirmer la commande' : 'Payer et commander'}
            </button>
            <p className="muted" style={{ fontSize: 12, marginTop: 8, color: err ? 'var(--bad)' : undefined }}>{err}</p>
          </div>

          <div className="card">
            <div className="card-h"><h3>Entre deux villes ?</h3><span className="eyebrow">Fret routier</span></div>
            <p className="muted" style={{ fontSize: 14 }}>Déposez le colis dans l&apos;une de nos 8 agences. Estimation indicative :</p>
            <div className="g2" style={{ marginTop: 12 }}>
              <div className="field"><label htmlFor="fr-from">De</label><select className="in" id="fr-from" value={fr.from} onChange={ev => setFr({ ...fr, from: ev.target.value as AgencyCode })}>{AG_CODES.map(k => <option key={k} value={k}>{AG[k].name}</option>)}</select></div>
              <div className="field"><label htmlFor="fr-to">Vers</label><select className="in" id="fr-to" value={fr.to} onChange={ev => setFr({ ...fr, to: ev.target.value as AgencyCode })}>{AG_CODES.map(k => <option key={k} value={k}>{AG[k].name}</option>)}</select></div>
              <div className="field"><label htmlFor="fr-w">Poids (kg)</label><input className="in mono" type="number" min={0.5} step={0.5} id="fr-w" value={fr.weight} onChange={ev => setFr({ ...fr, weight: +ev.target.value || 0 })} /></div>
              <div className="field"><label htmlFor="fr-c">Catégorie</label><select className="in" id="fr-c" value={fr.cat} onChange={ev => setFr({ ...fr, cat: ev.target.value as CatCode })}>{CAT_CODES.map(k => <option key={k} value={k}>{CATS[k].label}</option>)}</select></div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
              <span className="muted">{frR ? `${frR.km} km par la route` : 'Choisissez deux agences différentes'}</span>
              <b className="mono" style={{ fontSize: 18 }}>{frR ? fcfa(frR.total) : '—'}</b>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Vous vendez en ligne ?</h3><span className="eyebrow">API e-commerce</span></div>
            <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>Créez vos envois depuis votre boutique et recevez les statuts automatiquement.</p>
            <pre className="code"><span className="k">POST</span> /api/v1/shipments{'\n'}{'{'} &quot;pickup&quot;: &quot;Plateau&quot;, &quot;dropoff&quot;: &quot;Almadies&quot;,{'\n'}  &quot;weight_kg&quot;: 2.4, &quot;service&quot;: &quot;express&quot;,{'\n'}  &quot;recipient&quot;: {'{'} &quot;phone&quot;: &quot;77 000 00 00&quot; {'}'} {'}'}</pre>
            <Link className="btn btn-sm" href="/admin?tab=api" style={{ marginTop: 12 }}>Essayer l&apos;API</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
