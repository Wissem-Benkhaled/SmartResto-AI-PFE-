import { FaChartBar, FaBox, FaUsers, FaUser, FaTags, FaCog } from "react-icons/fa";
import { MdCategory, MdTimeline } from "react-icons/md";
import { ReactElement } from "react";

export type Section =
  | 'statistics'
  | 'categorie'
  | 'supplement'
  | 'produit'
  | 'utilisateur'
  | 'client'
  | 'promo'
  | 'parametre'
  | 'detect_sante'
  | 'mouvement'
  | 'pointage'
  | 'health_issue'
  | 'vol_logs'
  | 'pointeuse_logs';


export interface NavItem {
  id: Section;
  label: string;
  icon: any;
  roles: string[];
  subItems?: { id: Section; label: string }[]
}

export const allNavItems: NavItem[] = [
  { id: 'statistics', label: 'Statistiques', icon: FaChartBar({}), roles: ['Admin'] },
  { id: 'categorie', label: 'Catégories', icon: MdCategory({}), roles: ['Admin'] },
  { id: 'produit', label: 'Produits', icon: FaBox({}), roles: ['Admin'] },
  { id: 'supplement', label: 'Suppléments', icon: MdTimeline({}), roles: ['Admin'] },
  { id: 'utilisateur', label: 'Utilisateurs', icon: FaUsers({}), roles: ['Admin'] },
  { id: 'client', label: 'Clients', icon: FaUser({}), roles: ['Admin'] },
  { id: 'promo', label: 'Codes Promo', icon: FaTags({}), roles: ['Admin'] },
  { id: 'parametre', label: 'Paramètres', icon: FaCog({}), roles: ['Admin'] },
  {
    id: 'detect_sante', label: 'Détect. Santé', icon: '🛡️', roles: ['Admin'], subItems: [
      { id: 'detect_sante', label: 'Caméra en direct' },
      { id: 'health_issue', label: 'Logs des Infractions' }
    ]
  },
  {
    id: 'mouvement', label: 'Mouvements', icon: '🏃‍♀️‍➡️', roles: ['Admin'],
    subItems: [
      { id: 'mouvement', label: 'Caméra de Surveillance' },
      { id: 'vol_logs', label: 'Historique des Vols' }
    ]
  },
  {
    id: 'pointage', label: 'Pointages', icon: '⏱️', roles: ['Admin'],
    subItems: [
      { id: 'pointage', label: 'Scanner Facial' },
      { id: 'pointeuse_logs', label: 'Registre des Présences' }
    ]
  },
];

export const API_BASE_URL = 'http://localhost:5000';