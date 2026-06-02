# 🍽️ SmartResto-AI-PFE-Project

**SmartResto AI** est un projet de fin d'études (PFE) innovant qui vise à digitaliser, automatiser et optimiser la gestion des restaurants grâce à l'Intelligence Artificielle. Le projet se compose de trois interfaces frontend distinctes, d'un module d'intégration de modèles IA et d'une API backend.

---

## 🏗️ Architecture du Projet

Le projet est structuré en plusieurs modules indépendants :

1. **Frontend KDS (Kitchen Display System)** : Interface pour la cuisine.
2. **Frontend SmartCaisse** : Interface pour les caissiers.
3. **Frontend Admin** : Interface d'administration et de supervision.
4. **Backend API** : API REST TypeScript / Express connectée à PostgreSQL.
5. **Integrate modele with website** : Scripts de détection IA (vision par ordinateur).

---

## 💻 Description des Composants et Démarrage

### 1. 🍳 Kitchen Display System (KDS)
L'interface KDS permet à l'équipe en cuisine de suivre les commandes en temps réel et de gérer le flux de préparation.
* **Fonctionnalité principale** : Contient un bouton d'action pour changer l'état d'une commande de **"En cours"** à **"Prêt"**.
* **Chemin** : `Frontend-KDS`
* **Lancement** :
  ```bash
  cd Frontend-KDS
  yarn install
  yarn dev
  ```

### 2. 💵 SmartCaisse (Interface Caissier)
Cette interface est dédiée aux caissiers pour la prise de commandes rapide et la gestion de la clientèle.
* **Fonctionnalités principales** :
  - Saisie et passage des commandes en direct.
  - Application de **codes promotionnels**.
  - Gestion des **points de fidélité** pour les clients enregistrés.
  - Formulaire de création rapide pour un **nouveau client** s'il n'est pas encore enregistré dans la base de données.
* **Chemin** : `Frontend-SmartCaisse`
* **Lancement** :
  ```bash
  cd Frontend-SmartCaisse
  yarn install
  yarn dev
  ```

### 3. 👑 Interface Admin (Tableau de Bord)
Le centre de contrôle du restaurant pour les gérants et administrateurs.
* **Fonctionnalités principales** :
  - Gestion des utilisateurs, des produits, des catégories et des statistiques.
  - **Détection Sanitaire** (fonctionnalité majeure) : Suivi du respect des normes d'hygiène par le personnel (port du masque, des gants, etc.).
* **Chemin** : `Frontend-Admin`
* **Lancement** :
  ```bash
  cd Frontend-Admin
  yarn install
  yarn dev
  ```

### 4. 🧠 Intégration des Modèles IA
Ce module contient les scripts Python permettant de faire tourner les modèles de détection (masques, gants, etc.) et de transmettre les logs de conformité sanitaire au site web.
* **Chemin** : `Integrate modele with website`
* **Lancement** (via le fichier de commande Windows) :
  ```bash
  cd "Integrate modele with website"
  run_v3.bat
  ```

### 5. 🔌 API Backend
Le serveur central qui stocke les informations et expose les routes pour les différentes interfaces.
* **Chemin** : `Backend_API`
* **Lancement** :
  ```bash
  cd Backend_API
  yarn install
  yarn dev
  ```

---

## 🛠️ Prérequis et Technologies
- **Frontend** : React / Next.js / Vite / TypeScript
- **Backend** : Node.js (TypeScript) / Express / PostgreSQL
- **IA** : Python / OpenCV / PyTorch
- **Gestionnaire de paquets** : Yarn (recommandé pour les frontends)
