# Guide d'intégration - Animation de paiement

## 📋 Vue d'ensemble

Ce guide explique comment utiliser le nouveau système d'animation de paiement avec chargement et résultats.

## 🎯 Composants créés

### 1. **PaymentLoader.tsx**
Composant qui affiche une animation de chargement et les résultats du paiement.

**États gérés:**
- `loading` - Animation de chargement
- `success` - Transaction approuvée
- `error` - Erreur de paiement
- `cancelled` - Paiement annulé par l'utilisateur
- `message` - Message du terminal de paiement

### 2. **usePayment hook**
Hook personnalisé qui gère le flux de paiement via SSE.

**Fonctionnalités:**
- Envoie la requête POST au serveur de paiement
- Écoute les événements SSE en retour
- Gère les différents codes de réponse
- Retourne l'état du paiement

### 3. **sseUtils.js** (Backend)
Utilitaires pour envoyer des réponses SSE correctement formatées.

## 🔧 Installation

### Frontend

1. Les fichiers suivants ont été créés:
   - `src/components/Finalisation/PaymentLoader.tsx` - Composant d'animation
   - `src/hooks/usePayment.ts` - Hook de gestion du paiement

2. Vérifiez que `FinalisationModal.tsx` importe:
   ```typescript
   import PaymentLoader from "./PaymentLoader";
   import { usePayment } from "../../hooks/usePayment";
   ```

### Backend

1. Copiez `sseUtils.js` dans votre dossier `Paiment/`
2. Importez dans votre `index.js`:
   ```javascript
   const {
     sendSSEEvent,
     sendPaymentSuccess,
     sendPaymentError,
     sendPaymentCancelled,
     sendPaymentMessage,
     sendPaymentProcessing,
   } = require("./sseUtils");
   ```

## 📝 Utilisation

### Dans le composant FinalisationModal

```typescript
const { isProcessing, status, message, processPayment, resetStatus } = usePayment();

const handlePayment = async () => {
  const paymentPayload = {
    originName: "192.168.2.88",
    montant: 50.00,
    TransactionCB: "NEWREGLEMENTSOFTAVERA",
  };

  const success = await processPayment(
    paymentPayload,
    "http://localhost:3030/post"
  );

  if (success) {
    // Paiement réussi, traiter la commande
    console.log("Paiement approuvé!");
  }
};
```

### Backend - Améliorer le flux de paiement

Remplacez les `sseStream.write()` par les utilitaires:

```javascript
// Avant
sseStream.write(
  JSON.stringify({
    event: "result",
    data: JSON.stringify({
      code: "P999",
      message: "Paiement accepté",
    }),
  })
);

// Après
sendPaymentSuccess(sseStream, "P999", "Paiement accepté");
```

## 📊 Codes de paiement gérés

| Code | Nom | Action |
|------|------|--------|
| `P999` | Succès | ✅ Paiement accepté |
| `1` | Annulé | ⊘ Annulé par l'utilisateur |
| `M999` | Message | ℹ️ Message du terminal |
| `1002` | Traitement | ⏳ Traitement en cours |
| `0` | Erreur | ✕ Erreur de paiement |

## 🎨 Personnalisation

### Modifier les couleurs

Éditez `PaymentLoader.tsx`:

```typescript
// État de succès - modifier les dégradés
{status === "success" && (
  <Box sx={{
    background: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    // Changez ces couleurs
  }}
```

### Modifier les durées d'animation

```typescript
setTimeout(() => {
  setStatus(null);
}, 3000); // Changez 3000ms (3 secondes)
```

## 🔗 Intégration avec le backend existant

Le backend envoie les réponses via SSE. Exemple de flux:

```
Client        →  Serveur (POST /post)
                ↓
              Terminal de paiement
                ↓
           (réponse avec code)
                ↓
           Serveur SSE Stream
                ↓
Client (reçoit l'événement)
```

### Adapter le backend

Dans votre gestionnaire de données SSE:

```javascript
clientexe.on("data", function (data) {
  // ... traitement existant ...
  
  switch (ResultatPaiement.code) {
    case "M999":
      sendPaymentMessage(sseStream, ResultatPaiement.Message);
      break;
    case 1:
      sendPaymentCancelled(sseStream);
      break;
    case "P999":
      sendPaymentSuccess(sseStream, "P999", "Paiement approuvé");
      break;
    default:
      sendPaymentError(sseStream, "Erreur lors du paiement");
  }
});
```

## ⚙️ Configuration requise

### URL du serveur de paiement
- Frontend: `http://localhost:3030/post`
- Backend: À configurer dans `Settings.json`

### Headers SSE
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

## 🐛 Dépannage

### L'animation ne s'affiche pas
- Vérifiez que `PaymentLoader` est importé dans `FinalisationModal`
- Vérifiez que le `usePayment()` hook est appelé

### SSE ne reçoit pas les données
- Vérifiez que le serveur envoie `data: {...}\n\n`
- Utilisez DevTools → Network → voir les réponses SSE

### Paiement timeout
- Vérifiez la connexion au serveur de paiement
- Vérifiez les logs du serveur Adyen

## 📚 Fichiers modifiés

1. ✅ `Frontend-SmartCaisse/src/components/Finalisation/FinalisationModal.tsx` - Intégration hook
2. ✅ `Frontend-SmartCaisse/src/components/Finalisation/PaymentLoader.tsx` - Nouveau composant
3. ✅ `Frontend-SmartCaisse/src/hooks/usePayment.ts` - Nouveau hook
4. ✅ `Paiment/sseUtils.js` - Utilitaires backend

## 🚀 Prochaines étapes

1. Testez le flux complet avec un terminal Adyen
2. Personnalisez les messages et les couleurs selon votre marque
3. Ajoutez la gestion d'erreur additionnelle si nécessaire
4. Testez les différents scénarios (succès, annulation, erreur)
