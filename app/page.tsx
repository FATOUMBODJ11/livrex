'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import HeroMap from '@/components/HeroMap';

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <section className="view-home">
      <div className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <img className="hero-logo" src="/logo-hero.png" alt="Afrique Express Services, livraison à tout moment, en tout lieu" width={300} height={110} />
            <span className="eyebrow">Voyageurs · Fret routier · LIVREX</span>
            <h1>Chaque trajet, chaque colis, suivi de <em>Dakar</em> à Ziguinchor.</h1>
            <p className="hero-lead">Réservez votre place, déposez un colis en agence ou faites livrer en express dans Dakar. Chaque étape est enregistrée, du guichet jusqu&apos;à la remise.</p>
            <form className="track-box" onSubmit={e => { e.preventDefault(); router.push('/suivre?q=' + encodeURIComponent(q.trim().toUpperCase() || 'COL-2026-000001')); }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="COL-2026-000001 ou TKT-…" aria-label="Numéro de colis ou de ticket" autoComplete="off" />
              <button className="btn btn-accent" type="submit">Suivre</button>
            </form>
            <div className="hero-ctas">
              <Link className="btn btn-line" href="/voyager">Réserver un trajet</Link>
              <Link className="btn btn-line" href="/envoyer">Envoyer un colis</Link>
            </div>
            <p className="hero-pay">Wave · Orange Money · Carte bancaire · Espèces en agence</p>
          </div>
          <div id="hero-stage" aria-hidden="true"><HeroMap /></div>
        </div>
        <div className="hero-legend">
          <span><i style={{ background: '#2CC9B6' }} />Véhicules</span>
          <span><i style={{ background: '#7FB2DA' }} />Livreurs</span>
          <span><i style={{ background: '#ECF3F8' }} />Agences</span>
        </div>
      </div>

      <div className="wrap">
        <div className="sec">
          <div className="sec-h">
            <h2>Trois métiers, une seule plateforme.</h2>
            <p>Les voyageurs, le fret entre agences et la livraison du dernier kilomètre partagent les mêmes agences, la même flotte et le même suivi.</p>
          </div>
          <div className="mods">
            <article className="mod">
              <div className="mod-code"><span>Module 1</span><span>Voyageurs</span></div>
              <h3>Transport de masse</h3>
              <ul><li>Recherche par départ, destination, date et nombre de places</li><li>Véhicule, horaires et places restantes visibles avant de payer</li><li>Choix du siège et ticket numérique avec QR code</li><li>Tarifs dédiés aux périodes de fêtes religieuses</li></ul>
              <Link className="btn btn-accent" href="/voyager">Réserver un trajet</Link>
            </article>
            <article className="mod">
              <div className="mod-code"><span>Module 2</span><span>Agence → agence</span></div>
              <h3>Fret routier</h3>
              <ul><li>Colis, bagages et marchandises déposés en agence</li><li>Pesage, emballage et étiquette code-barres au guichet</li><li>Zones de stockage sec, frais, congelé et fragile</li><li>Transfert suivi par GPS, retrait ou livraison à l&apos;arrivée</li></ul>
              <Link className="btn" href="/agent">Voir le guichet agent</Link>
            </article>
            <article className="mod feature">
              <div className="mod-code"><span>Module 3</span><span>LIVREX</span></div>
              <h3>Livraison express</h3>
              <ul><li>Devis immédiat au poids volumétrique et heure d&apos;arrivée estimée</li><li>Livreur le plus proche affecté, tournées regroupées par zone</li><li>Suivi du livreur sur la carte, SMS à chaque étape</li><li>Preuve de livraison : code, signature et photo</li></ul>
              <Link className="btn btn-accent" href="/envoyer">Envoyer en express</Link>
            </article>
          </div>
        </div>

        <div className="sec">
          <div className="sec-h">
            <h2>Le parcours d&apos;un colis de fret.</h2>
            <p>Quatre processus, onze statuts. Le client reçoit un message à chaque changement important.</p>
          </div>
          <div className="flow">
            <div><span className="n">Processus 1</span><h4>Prise en charge</h4><p>Identification, catégorie, emballage, pesage, facturation, paiement et étiquette.</p><div className="st"><span className="pill t-n">Créé</span><span className="pill t-n">En préparation</span></div></div>
            <div><span className="n">Processus 2</span><h4>Stockage</h4><p>Le colis rejoint la zone adaptée à sa catégorie, avec un emplacement précis.</p><div className="st"><span className="pill t-b">Stocké</span><span className="pill t-b">Prêt au transfert</span></div></div>
            <div><span className="n">Processus 3</span><h4>Transfert</h4><p>Chargé dans un véhicule, suivi par GPS jusqu&apos;à l&apos;agence de destination.</p><div className="st"><span className="pill t-w">En transit</span><span className="pill t-b">Arrivé</span></div></div>
            <div><span className="n">Processus 4</span><h4>Remise</h4><p>Retrait en agence sur pièce d&apos;identité ou livraison par un livreur.</p><div className="st"><span className="pill t-w">En livraison</span><span className="pill t-g">Livré</span><span className="pill t-g">Retiré</span></div></div>
          </div>
        </div>

        <div className="sec">
          <div className="sec-h">
            <h2>Les espaces de l&apos;équipe.</h2>
            <p>Chaque rôle dispose de son écran. Les actions faites ici se répercutent partout : créez un colis au guichet, faites-le partir avec un chauffeur, suivez-le côté client.</p>
          </div>
          <div className="spaces">
            <Link className="space" href="/agent"><b>Agent d&apos;agence</b><span>Guichet colis, stock, remise au bénéficiaire</span></Link>
            <Link className="space" href="/chauffeur"><b>Chauffeur</b><span>Chargement, départ, position, arrivée</span></Link>
            <Link className="space" href="/livreur"><b>Livreur</b><span>Missions, scan QR, preuve de livraison</span></Link>
            <Link className="space" href="/admin"><b>Administrateur</b><span>Tableau de bord, dispatch, tournées, flotte, tarifs, API</span></Link>
          </div>
        </div>
      </div>
      <footer className="foot">
        <div className="wrap">
          <span>Afrique Express Services · Groupe LIFEKHALIFA · Livraison à tout moment, en tout lieu</span>
          <span>Prototype fonctionnel. Tarifs, véhicules et personnes sont des exemples à valider.</span>
        </div>
      </footer>
    </section>
  );
}
