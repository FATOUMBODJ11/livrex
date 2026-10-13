export type AgencyCode = 'DKR' | 'THS' | 'MBR' | 'TBA' | 'KLK' | 'STL' | 'TBC' | 'ZIG';
export type CatCode = 'SEC' | 'FRESH' | 'FROZEN' | 'FRAGILE' | 'STD';
export type Method = 'WAVE' | 'OM' | 'CARD' | 'CASH' | 'COD';
export type Channel = 'SMS' | 'EMAIL' | 'CALL' | 'WA';
export type VehicleKind = 'bus' | 'mini' | 'sept' | 'fret';

export interface LatLon { lat: number; lon: number }
export interface Place extends LatLon { label: string }

export interface Agency extends LatLon {
  name: string; site: string; hours: string; cap: number; staff: number;
}

export interface Category {
  label: string; group: 'Produits alimentaires' | 'Objets'; zone: string;
  sur: number; cold?: boolean; hint: string; pack: string;
}

export interface HistoryEntry { s: Status; t: number; note: string }

export interface Payment {
  mode: Method; ref: string; amount: number; status: 'Payé' | 'À encaisser'; t: number;
}

export interface Proof {
  t: number; cni?: string; absent?: boolean; photo?: string | boolean; sig?: boolean; pos?: LatLon;
}

export type Status =
  | 'Créé' | 'En préparation' | 'Stocké' | 'Prêt au transfert' | 'En transit' | 'Arrivé'
  | 'En stockage destination' | 'Livreur affecté' | 'En livraison' | 'Livré' | 'Retiré';

export interface Parcel {
  id: string;
  type: 'FRET' | 'EXPRESS';
  sender: string; senderTel: string; recipient: string; recipientTel: string;
  email?: string;
  /** Fret : agences */
  from?: AgencyCode; to?: AgencyCode;
  /** LIVREX : quartiers de Dakar */
  fromQ?: string; toQ?: string;
  pickup?: Place | null; drop?: Place | null;
  cat: CatCode; weight: number; L?: number; W?: number; H?: number;
  desc: string;
  service: 'STANDARD' | 'EXPRESS' | 'EXPRESS24';
  delivery: 'retrait' | 'livraison';
  packed: 'agence' | 'client';
  channel: Channel;
  zone: string;
  vehicle?: string;
  courier?: string;
  /** Réservé dans la tournée d'un livreur, en attente de son tour */
  reservedFor?: string;
  otp: string;
  price: number;
  payment: Payment | null;
  proof?: Proof;
  track: LatLon[];
  history: HistoryEntry[];
  status: Status;
  created: number; updated: number;
}

export interface Trip {
  from: AgencyCode; to: AgencyCode; progress: number; parcels: string[]; start: number; trail?: LatLon[];
}

export interface Vehicle {
  id: string; type: string; cap: number | string; plate: string; kind: VehicleKind;
  cold?: boolean; driver: string; agency: AgencyCode; trip: Trip | null;
}

export interface Courier {
  id: string; name: string; mode: string; pos: LatLon; job: string | null;
  /** Courses suivantes de la tournée, dans l'ordre de passage */
  route?: string[];
}

export interface Booking {
  id: string; tripId: string; from: AgencyCode; to: AgencyCode; date: string; time: string; arr?: string;
  veh: string; plate?: string; seats: number[]; names: string[]; docs?: string[];
  contact?: { tel: string; email: string; channel: Channel };
  amount: number; method: Method; paid?: boolean; ref?: string; t: number; tickets: string[];
}

export interface Notif { t: number; id?: string; ch: string; to: string; msg: string }

export interface Tarifs {
  fretBase: number; fretKg: number; fretKm: number; pack: number;
  expBase: number; expKg: number; expKm: number; expressMult: number;
  seat: { bus: number; mini: number; sept: number };
  festive: number;
}

export interface AppState {
  v: number;
  festive: boolean;
  speed: number;
  tarifs: Tarifs;
  seq: { COL: number; EXP: number; RES: number; TKT: number; PAY: number };
  parcels: Parcel[];
  bookings: Booking[];
  notifs: Notif[];
  vehicles: Vehicle[];
  couriers: Courier[];
}

/** Ce que les cartes savent dessiner */
export interface MapPoint extends LatLon { kind: 'agency' | 'veh' | 'cour' | 'pick' | 'drop'; label?: string }
export interface MapScene {
  mode: 'sn' | 'dkr';
  dark?: boolean;
  points?: MapPoint[];
  routes?: [LatLon, LatLon][];
  trail?: LatLon[];
}
