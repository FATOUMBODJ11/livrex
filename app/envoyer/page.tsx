'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type InputHTMLAttributes } from 'react';
import MapCanvas from '@/components/MapCanvas';
import { Waybill } from '@/components/Paper';
import { CategoryPicker, ModePicker } from '@/components/Pickers';
import { Choice, PageHead } from '@/components/ui';
import { setStatus } from '@/lib/actions';
import { AG, AG_CODES, catLabel, isCold, kgTxt, METHODS, MODES, QUARTIERS, qp, ST } from '@/lib/data';
import { agencyPts, allowedModes, findParcel, modeForWeight } from '@/lib/domain';
import { dIso, fcfa, nf, otp, pad } from '@/lib/format';
import { priceExp, priceFret, priceMasse } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import type { AgencyCode, Channel, Cons, Method, Mode, Parcel } from '@/lib/types';

interface Form {
  /* Commun aux trois transports */
  weight: number; cons: Cons; fragile: boolean; desc: string;
  sender: string; senderTel: string; recipient: string; recipientTel: string; channel: Channel;
  /* Express : quartiers de Dakar, dimensions, vitesse */
  fromQ: string; fromNote: string; toQ: string; toNote: string;
  L: number; W: number; H: number; service: 'EXPRESS' | 'STANDARD';
  /* Fret et masse : villes */
  from: AgencyCode; to: AgencyCode;
  /* Fret : à l'arrivée */
  delivery: 'retrait' | 'livraison';
  /* Masse : adresses et date */
  pickupAddr: string; dropAddr: string; wanted: string;
}

const BLANK: Form = {
  weight: 2, cons: 'SEC', fragile: false, desc: '',
  sender: '', senderTel: '', recipient: '', recipientTel: '', channel: 'SMS',
  fromQ: 'Plateau', fromNote: '', toQ: 'Almadies', toNote: '', L: 30, W: 20, H: 15, service: 'EXPRESS',
  from: 'DKR', to: 'TBA', delivery: 'retrait',
  pickupAddr: '', dropAddr: '', wanted: dIso(Date.now() + 864e5),
};

export default function Envoyer() {
  const { S, act } = useStore();
  const router = useRouter();
  const T = S.tarifs;
  const [f, setF] = useState<Form>(BLANK);
  /** Type choisi à la main ; sinon on suit la proposition selon le poids */
  const [picked, setPicked] = useState<Mode | null>(null);
  const [method, setMethod] = useState<Method>('WAVE');
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const [doneId, setDoneId] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(x => ({ ...x, [k]: v }));
  const w = +f.weight || 0;
  const ok = allowedModes(T, w);
  const mode: Mode = picked && ok.includes(picked) ? picked : modeForWeight(T, w);
  const tooHeavy = !ok.length;

  const exp = priceExp(T, f);
  const fret = f.from !== f.to ? priceFret(T, { ...f, packed: 'client', service: 'STANDARD' }) : null;
  const masse = priceMasse(T, f);
  const total = mode === 'EXPRESS' ? exp.total : mode === 'MASSE' ? masse.total : fret?.total || 0;

  const submit = () => {
    const miss = ([['sender', 'expéditeur'], ['senderTel', 'téléphone expéditeur'], ['recipient', 'destinataire'], ['recipientTel', 'téléphone destinataire']] as const)
      .filter(([k]) => !String(f[k]).trim()).map(x => x[1] as string);
    if (mode === 'EXPRESS' && f.fromQ === f.toQ) miss.push('deux quartiers différents');
    if (mode === 'MASSE' && !f.pickupAddr.trim()) miss.push("adresse d'enlèvement");
    if (mode === 'MASSE' && !f.dropAddr.trim()) miss.push('adresse de livraison');
    if (miss.length) { setErr('À compléter : ' + miss.join(', ') + '.'); return; }
    setErr(''); setPaying(true);
    setTimeout(() => {
      const id = act(c => {
        const t = c.S.tarifs;
        const base = {
          sender: f.sender.trim(), senderTel: f.senderTel.trim(), recipient: f.recipient.trim(), recipientTel: f.recipientTel.trim(),
          desc: f.desc, cons: f.cons, fragile: f.fragile, weight: w, channel: f.channel, delivery: 'livraison' as const, packed: 'client' as const,
          zone: '', otp: otp(), track: [], history: [], status: ST.CREATED, created: Date.now(), updated: Date.now(),
        };
        let p: Parcel;
        if (mode === 'EXPRESS') {
          const r = priceExp(t, f);
          p = {
            ...base, id: 'EXP-2026-' + pad(++c.S.seq.EXP), type: 'EXPRESS', fromQ: f.fromQ, toQ: f.toQ,
            pickup: { ...qp(f.fromQ), label: f.fromQ + (f.fromNote ? ' · ' + f.fromNote : '') },
            drop: { ...qp(f.toQ), label: f.toQ + (f.toNote ? ' · ' + f.toNote : '') },
            L: +f.L, W: +f.W, H: +f.H, service: f.service, price: r.total, payment: null,
          };
        } else {
          const r = priceMasse(t, f);
          p = {
            ...base, id: 'MAS-2026-' + pad(++c.S.seq.MAS), type: 'MASSE', from: f.from, to: f.to,
            pickupAddr: f.pickupAddr.trim(), dropAddr: f.dropAddr.trim(), wanted: f.wanted, service: 'STANDARD', price: r.total, payment: null,
          };
        }
        p.payment = { mode: method, ref: 'PAY-' + pad(++c.S.seq.PAY), amount: p.price, status: method === 'COD' ? 'À encaisser' : 'Payé', t: Date.now() };
        c.S.parcels.unshift(p);
        setStatus(c, p, ST.CREATED, 'Commande en ligne · ' + METHODS[method] + (p.type === 'MASSE' ? ' · enlèvement souhaité le ' + new Date(f.wanted + 'T12:00').toLocaleDateString('fr-FR') : ''));
        return p.id;
      });
      setPaying(false); setDoneId(id); window.scrollTo({ top: 0 });
    }, 1200);
  };

  const done = doneId ? findParcel(S, doneId) : null;
  if (done) {
    const isMasse = done.type === 'MASSE';
    return (
      <section className="view">
        <PageHead eyebrow={`${MODES[done.type].label} · Commande confirmée`} title={`Commande ${done.id} enregistrée`}
          lead={isMasse ? 'Un camion adapté va être réservé. Nous vous appelons pour confirmer l’heure d’enlèvement.' : 'Un livreur va être affecté. Vous recevrez un SMS à chaque étape.'} />
        <div className="wrap split">
          <div className="paper label" style={{ maxWidth: 'none' }}><Waybill p={done} /></div>
          <div className="card stack">
            <h3>Et maintenant ?</h3>
            <p className="muted">{isMasse ? 'Le chauffeur présentera cette lettre de voiture à l’enlèvement et la fera signer à la livraison.' : 'Imprimez ou recopiez la lettre de voiture sur le colis. Le livreur scannera le QR code au ramassage.'}</p>
            <div className="row no-print">
              <button className="btn btn-accent" onClick={() => router.push('/suivre?q=' + done.id)}>Suivre</button>
              <button className="btn" onClick={() => window.print()}>Imprimer la lettre de voiture</button>
              <button className="btn" onClick={() => { setDoneId(null); setF(BLANK); setPicked(null); }}>Nouvel envoi</button>
            </div>
            <p className="note">Côté équipe : la commande apparaît dans <b>{isMasse ? 'Admin › Transport de masse' : 'Admin › Dispatch'}</b>, puis dans l&apos;espace <b>{isMasse ? 'Chauffeur' : 'Livreur'}</b>.</p>
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
  const city = (k: 'from' | 'to', label: string) => (
    <div className="field"><label htmlFor={'e-' + k}>{label}</label>
      <select className="in" id={'e-' + k} value={f[k]} onChange={ev => set(k, ev.target.value as AgencyCode)}>{AG_CODES.map(c => <option key={c} value={c}>{AG[c].name}</option>)}</select></div>
  );
  const contacts = (
    <>
      <div className="g2">
        {inp('sender', 'Expéditeur', { placeholder: 'Nom ou entreprise' })}
        {inp('senderTel', 'Téléphone expéditeur', { placeholder: '77 000 00 00', inputMode: 'tel' })}
        {inp('recipient', 'Destinataire', { placeholder: 'Nom ou entreprise' })}
        {inp('recipientTel', 'Téléphone destinataire', { placeholder: '77 000 00 00', inputMode: 'tel' })}
      </div>
      <div className="field"><label htmlFor="e-ch">Prévenir le destinataire par</label>
        <select className="in" id="e-ch" value={f.channel} onChange={ev => set('channel', ev.target.value as Channel)}>
          <option value="SMS">SMS</option><option value="EMAIL">E-mail</option><option value="CALL">Appel téléphonique</option></select></div>
    </>
  );
  const payBox = (
    <>
      <div className="lab" style={{ margin: '16px 0 8px' }}>Paiement</div>
      <div className="choices" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
        {(['WAVE', 'OM', 'CARD', 'COD'] as Method[]).map(m => <Choice key={m} name="em" value={m} checked={method === m} onChange={v => setMethod(v as Method)} title={METHODS[m]} />)}
      </div>
      <button className="btn btn-accent" style={{ width: '100%', marginTop: 14 }} disabled={paying} onClick={submit}>
        {paying ? <><span className="spin" /> Validation en cours…</> : method === 'COD' ? 'Confirmer la commande' : 'Payer et commander'}
      </button>
      <p className="muted" style={{ fontSize: 12, marginTop: 8, color: err ? 'var(--bad)' : undefined }}>{err}</p>
    </>
  );
  const lines = (L: [string, number][]) => <div className="sum" style={{ fontSize: 13 }}>{L.map(l => <div key={l[0]}><span className="muted">{l[0]}</span><span className="mono">{nf(l[1])}</span></div>)}</div>;

  return (
    <section className="view">
      <PageHead eyebrow="Envoyer" title="Envoyer un colis ou une marchandise"
        lead="Indiquez le poids et la catégorie : nous proposons le transport adapté. Livraison express dans Dakar, fret routier entre nos agences, ou transport de masse par camion." />
      <div className="wrap split">
        <form className="card" autoComplete="off" onSubmit={ev => ev.preventDefault()}>
          <fieldset className="fs"><legend>1. Votre envoi</legend>
            <div className="g2">
              {inp('weight', 'Poids total (kg)', { type: 'number', min: 0.1, step: 0.1 })}
              {inp('desc', 'Nature de la marchandise', { placeholder: 'Ex. vêtements, ciment, poisson' })}
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>Soit {kgTxt(w)}.</p>
            <CategoryPicker name="e" cons={f.cons} fragile={f.fragile} onChange={(cons, fragile) => setF(x => ({ ...x, cons, fragile }))} />
          </fieldset>

          <fieldset className="fs"><legend>2. Type de transport</legend>
            {tooHeavy
              ? <p className="errbox" style={{ marginTop: 0 }}>Au-delà de {kgTxt(T.masseMax)}, contactez-nous pour un transport sur mesure (plusieurs camions).</p>
              : <ModePicker t={T} weight={w} mode={mode} onChange={setPicked} />}
          </fieldset>

          {!tooHeavy && mode === 'EXPRESS' && (
            <>
              <fieldset className="fs"><legend>3. Ramassage et livraison dans Dakar</legend>
                <div className="g2">{qSel('fromQ')}{inp('fromNote', 'Repère de ramassage', { placeholder: 'Rue, immeuble, étage' })}{qSel('toQ')}{inp('toNote', 'Repère de livraison', { placeholder: 'Rue, immeuble, étage' })}</div>
                <div className="g3">{inp('L', 'Longueur (cm)', { type: 'number', min: 1 })}{inp('W', 'Largeur (cm)', { type: 'number', min: 1 })}{inp('H', 'Hauteur (cm)', { type: 'number', min: 1 })}</div>
                <div className="choices" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
                  <Choice name="esp" value="EXPRESS" checked={f.service === 'EXPRESS'} onChange={() => set('service', 'EXPRESS')} title="Rapide" sub="Ramassage immédiat, livraison en moins de 2 h" />
                  <Choice name="esp" value="STANDARD" checked={f.service === 'STANDARD'} onChange={() => set('service', 'STANDARD')} title="Standard" sub="Livraison dans la journée" />
                </div>
              </fieldset>
              <fieldset className="fs"><legend>4. Contacts</legend>{contacts}</fieldset>
            </>
          )}

          {!tooHeavy && mode === 'FRET' && (
            <fieldset className="fs"><legend>3. Trajet entre agences</legend>
              <div className="g2">{city('from', 'Agence de dépôt')}{city('to', "Agence d'arrivée")}</div>
              <div className="choices" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
                <Choice name="edl" value="retrait" checked={f.delivery === 'retrait'} onChange={() => set('delivery', 'retrait')} title="Retrait en agence" sub="Le destinataire vient avec sa pièce et son code" />
                <Choice name="edl" value="livraison" checked={f.delivery === 'livraison'} onChange={() => set('delivery', 'livraison')} title="Livraison à domicile" sub="Dakar uniquement pour l’instant" />
              </div>
              <p className="note">Le fret routier se dépose au guichet : l&apos;agent pèse, emballe si besoin, encaisse et pose l&apos;étiquette. {f.from !== f.to && <>Agence de <b>{AG[f.from].name}</b> ({AG[f.from].site}), ouverte {AG[f.from].hours}.</>}</p>
              {isCold(f.cons) && <p className="note">Produit {catLabel(f)} : transfert en véhicule réfrigéré uniquement.</p>}
            </fieldset>
          )}

          {!tooHeavy && mode === 'MASSE' && (
            <>
              <fieldset className="fs"><legend>3. Enlèvement et livraison</legend>
                <div className="g2">
                  {city('from', "Ville d'enlèvement")}
                  {inp('pickupAddr', "Adresse d'enlèvement", { placeholder: 'Entrepôt, usine, chantier…' })}
                  {city('to', 'Ville de livraison')}
                  {inp('dropAddr', 'Adresse de livraison', { placeholder: 'Quartier, repère' })}
                </div>
                <div className="g2">{inp('wanted', 'Date d’enlèvement souhaitée', { type: 'date', min: dIso(Date.now()) })}</div>
                {isCold(f.cons) && <p className="note">Produit {catLabel(f)} : un camion frigorifique sera réservé.</p>}
              </fieldset>
              <fieldset className="fs"><legend>4. Contacts</legend>{contacts}</fieldset>
            </>
          )}
        </form>

        <div className="stack sticky">
          {!tooHeavy && (
            <div className="card">
              <span className="eyebrow">{MODES[mode].label} · estimation immédiate</span>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', margin: '10px 0 14px' }}>
                <div className="est-big">{total ? fcfa(total) : '—'}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="lab">{mode === 'EXPRESS' ? 'Arrivée estimée' : mode === 'MASSE' ? 'Durée indicative' : 'Délai'}</div>
                  <b className="mono" style={{ fontSize: 18 }}>{mode === 'EXPRESS' ? exp.eta : mode === 'MASSE' ? `${masse.hours} h` : '48 à 72 h'}</b>
                </div>
              </div>
              {mode === 'EXPRESS' && (
                <>
                  <div className="est-row">
                    <div><small>Poids réel</small><b>{kgTxt(w)}</b></div>
                    <div><small>Volumétrique</small><b>{exp.vol.toLocaleString('fr-FR')} kg</b></div>
                    <div><small>Distance</small><b>{exp.km.toLocaleString('fr-FR')} km</b></div>
                  </div>
                  <div style={{ margin: '14px 0' }}>
                    <MapCanvas scene={{ mode: 'dkr', routes: [[qp(f.fromQ), qp(f.toQ)]], points: [{ ...qp(f.fromQ), kind: 'pick' }, { ...qp(f.toQ), kind: 'drop' }] }} />
                  </div>
                  {lines(exp.lines)}
                  {payBox}
                </>
              )}
              {mode === 'FRET' && (fret ? (
                <>
                  <div className="est-row">
                    <div><small>Poids</small><b>{kgTxt(w)}</b></div>
                    <div><small>Distance</small><b>{fret.km} km</b></div>
                    <div><small>Catégorie</small><b>{catLabel(f)}</b></div>
                  </div>
                  <div style={{ margin: '14px 0' }}><MapCanvas scene={{ mode: 'sn', points: agencyPts(), routes: [[AG[f.from], AG[f.to]]] }} /></div>
                  {lines(fret.lines)}
                  <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Emballage fourni par l&apos;agence en supplément ({fcfa(T.pack)}) si nécessaire. Paiement au guichet.</p>
                </>
              ) : <p className="muted">Choisissez deux agences différentes.</p>)}
              {mode === 'MASSE' && (
                <>
                  <div className="est-row">
                    <div><small>Facturé</small><b>{masse.tonnes.toLocaleString('fr-FR')} t</b></div>
                    <div><small>Distance</small><b>{masse.km} km</b></div>
                    <div><small>Camion</small><b>{isCold(f.cons) ? 'Frigorifique' : 'Porteur'}</b></div>
                  </div>
                  <div style={{ margin: '14px 0' }}><MapCanvas scene={{ mode: 'sn', points: agencyPts(), routes: [[AG[f.from], AG[f.to]]] }} /></div>
                  {lines(masse.lines)}
                  {payBox}
                </>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-h"><h3>Vous vendez en ligne ?</h3><span className="eyebrow">API e-commerce</span></div>
            <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>Créez vos envois express depuis votre boutique et recevez les statuts automatiquement.</p>
            <pre className="code"><span className="k">POST</span> /api/v1/shipments{'\n'}{'{'} &quot;pickup&quot;: &quot;Plateau&quot;, &quot;dropoff&quot;: &quot;Almadies&quot;,{'\n'}  &quot;weight_kg&quot;: 2.4, &quot;conservation&quot;: &quot;sec&quot;,{'\n'}  &quot;fragile&quot;: false, &quot;service&quot;: &quot;express&quot;,{'\n'}  &quot;recipient&quot;: {'{'} &quot;phone&quot;: &quot;77 000 00 00&quot; {'}'} {'}'}</pre>
            <Link className="btn btn-sm" href="/admin?tab=api" style={{ marginTop: 12 }}>Essayer l&apos;API</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
