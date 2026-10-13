# Afrique Express Services · LIVREX

Prototype complet en **Next.js 15 (App Router, TypeScript)** de la plateforme du Groupe LIFEKHALIFA :
transport de voyageurs, fret routier entre agences et livraison express LIVREX à Dakar.

## Lancer

Prérequis : [Node.js 20 LTS ou plus](https://nodejs.org).

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

## Écrans

| Route | Rôle | Contenu |
|---|---|---|
| `/` | Public | Accueil, suivi rapide, carte animée du réseau |
| `/voyager` | Client | Réservation en 4 étapes : trajet, sièges et voyageurs, paiement, ticket QR |
| `/envoyer` | Client | Commande LIVREX : devis au poids volumétrique, ETA, paiement, lettre de voiture (Code 128 + QR) |
| `/suivre?q=…` | Client | Suivi colis (frise de statuts, carte live) ou ticket |
| `/agent` | Agent d'agence | Guichet en 8 étapes, stock par zone et scan hub, remise sur pièce + code |
| `/chauffeur` | Chauffeur | Chargement (contrôle froid), départ, progression GPS, arrivée |
| `/livreur` | Livreur | Appli mobile : prise de course, scan QR (caméra si disponible), signature, photo |
| `/admin` | Administrateur | KPI, colis + export CSV, dispatch, tournées par zone, réservations, flotte, agences, tarifs, notifications, banc d'essai API, points à valider |
| `/api/v1/shipments` | API e-commerce | `POST` crée un envoi (clé de démo `demo_livrex_2026`), `GET` décrit l'API |

## Organisation du code

```
app/            pages (une par espace) et route d'API
components/     carte canvas, QR/code-barres, étiquette, ticket, scanner, signature, tiroirs
lib/
  types.ts      modèle de données
  data.ts       référentiels : agences, quartiers, catégories, statuts, lignes
  pricing.ts    barèmes fret, LIVREX et voyageurs
  domain.ts     règles métier pures (parcours, sièges, tournées, statistiques)
  actions.ts    changements d'état + notifications + simulation
  seed.ts       données de démonstration
  store.tsx     état global React, persistance localStorage, horloge de simulation
```

## Limites du prototype

- Les données vivent dans le navigateur (localStorage) : pas de base de données ni de comptes.
- Paiements (Wave, Orange Money, carte), SMS et e-mails sont simulés.
- L'API valide et chiffre l'envoi mais ne le stocke pas côté serveur.
- L'optimisation de tournée est un regroupement par secteur + plus proche voisin. Une tournée lancée
  réserve ses courses au livreur, qui reçoit la suivante dès qu'il a livré la précédente.
- Le livreur ne peut scanner ou valider une livraison qu'à moins de 150 m du point (`GEOFENCE_KM`).
  Le bouton « Aller sur place (démo) » remplace le GPS réel pour les démonstrations.

Tarifs, véhicules et personnes sont des exemples à valider avec la direction.
