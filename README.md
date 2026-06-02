# SmartResto-AI-PFE-

SmartResto AI est un projet de fin d’études (PFE) qui vise à digitaliser et optimiser la gestion des restaurants grâce à l’intelligence artificielle.

## Description de l'application

Cette application contient trois interfaces principales :

### 1) Interface KDS (Kitchen Display System)
- Permet de suivre les commandes en cuisine.
- Contient un bouton pour changer l’état d’une commande de **« en cours »** à **« Prêt »**.

Exécution :
```bash
cd "SmartResto-AI-PFE-Project/Frontend-KDS"
yarn dev
```

### 2) Interface Caissier
- Permet de passer des commandes.
- Permet d’appliquer des codes promotionnels.
- Permet de gérer les points de fidélité pour les clients enregistrés.
- Si le client n’est pas enregistré, le caissier peut créer un nouveau client.

Exécution :
```bash
cd "SmartResto-AI-PFE-Project/Frontend-SmartCaisse"
yarn dev
```

### 3) Interface Admin
- Permet la gestion administrative avec plusieurs fonctionnalités.
- La fonctionnalité la plus importante est la **détection sanitaire**.

Exécution (interface admin) :
```bash
cd "SmartResto-AI-PFE-Project/Frontend-Admin"
yarn dev
```

Exécution (intégration du modèle avec le site web) :
```bat
SmartResto-AI-PFE-Project\Integrate modele with website\run_v3.bat
```
