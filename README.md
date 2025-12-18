# Évidencia – Certification numérique infalsifiable

Évidencia permet de certifier des photos, vidéos ou documents PDF en générant un hash SHA-256, en l’horodatant et en l’inscrivant sur la blockchain Polygon (testnet Mumbai). L’application fournit un certificat numérique vérifiable avec QR code et une API B2B.

## Sommaire
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation backend](#installation-backend)
- [Lancement backend](#lancement-backend)
- [Installation Flutter](#installation-flutter)
- [Lancement Flutter](#lancement-flutter)
- [Smart contract](#smart-contract)
- [API REST](#api-rest)
- [Vérification publique](#vérification-publique)
- [Capture mobile via navigateur](#capture-mobile-via-navigateur)
- [Déploiement Polygon](#déploiement-polygon)

## Architecture
```
/evidencia
├── backend/              # API Node.js + Express + SQLite
├── app_flutter/          # App Flutter (mobile + web)
├── contracts/            # Smart contract Solidity
├── public/capture.html   # Capture mobile + certification immédiate
├── public/verify.html    # Page publique de vérification
├── README.md
└── .env.example
```

## Prérequis
- Node.js 18+
- Flutter 3.x
- Accès RPC à Polygon Mumbai (ex: https://polygon-mumbai.g.alchemy.com/v2/KEY)
- Metamask avec des MATIC de test

## Installation backend
```bash
cd backend
npm install
cp ../.env.example .env
# Renseigner les variables : API_KEY, POLYGON_RPC_URL, WALLET_PRIVATE_KEY, PROOF_CONTRACT_ADDRESS, PUBLIC_BASE_URL
```

## Lancement backend
```bash
cd backend
npm start
# le serveur écoute sur http://localhost:4000
```
Endpoints principaux :
- `POST /api/certify` : upload de fichier (champ `file`, max 10 Mo)
- `POST /api/partner/certify` : même payload + clé API
- `GET /api/verify/:id` : récupérer un certificat
- `GET /api/history` : historique local (protégé par clé API si définie)

## Installation Flutter
```bash
cd app_flutter
flutter pub get
```

### Lancement Flutter
```bash
flutter run -d chrome --dart-define=API_BASE=http://localhost:4000
# ou pour mobile : flutter run --dart-define=API_BASE=http://10.0.2.2:4000
```
Écrans : Accueil (import/capture + certifier), Résultat (hash + QR + lien), Historique (certifications stockées localement).

## Smart contract
Contrat `contracts/EvidenciaProofs.sol` à déployer sur Polygon Mumbai. Fonctions :
- `registerProof(bytes32 hash, uint256 timestamp, string uri)`
- Événement `ProofRegistered`

Déploiement via Hardhat/Foundry (non inclus) : récupérer l’adresse pour `PROOF_CONTRACT_ADDRESS`.

## API REST
Exemple de certification :
```bash
curl -X POST http://localhost:4000/api/certify \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@/chemin/vers/document.pdf"
```
Réponse :
```json
{
  "id": "abc123",
  "hash": "0x...",
  "timestamp": 1710000000,
  "txHash": "0xTxHash",
  "uri": "https://votre-domaine/public/verify.html?id=abc123",
  "verifyUrl": "https://votre-domaine/public/verify.html?id=abc123",
  "imageUrl": "/public/proofs/abc123.png",
  "qrUrl": "data:image/png;base64,..."
}
```

## Vérification publique
La page `public/verify.html` consomme `GET /api/verify/:id` et affiche la photo certifiée, le hash, la date UTC, le QR code et le lien PolygonScan.

## Capture mobile via navigateur
Ouvrir directement la caméra d’un smartphone (Safari/Chrome) :

1. Démarrer le backend (`npm start`) et s’assurer qu’il est accessible depuis le téléphone (même réseau ou URL publique).
2. Ouvrir `http://<serveur>:4000/public/capture.html` dans le navigateur du mobile.
3. Appuyer sur **Prendre une photo** (l’input utilise `accept="image/*"` et `capture="environment"`).
4. La photo est immédiatement envoyée en `multipart/form-data` vers `POST /api/certify`.
5. Le proofId, hash et timestamp s’affichent avec un aperçu de la photo certifiée, un bouton **Ouvrir la certification** et un bouton **Partager** (lien ou share mobile). Redirection automatique vers la page de preuve après quelques secondes.
6. Si une clé API est configurée, la saisir dans le champ dédié avant la capture.
7. L’image est stockée dans `public/proofs/<id>.<ext>` et servie publiquement pour l’affichage/QR.

## Déploiement Polygon
1. Déployer `EvidenciaProofs.sol` sur Mumbai.
2. Renseigner `POLYGON_RPC_URL`, `WALLET_PRIVATE_KEY`, `PROOF_CONTRACT_ADDRESS` dans `.env`.
3. Démarrer le backend. Chaque certification appellera `registerProof` et retournera le `txHash` (visible sur PolygonScan).

## Sécurité
- Les photos certifiées capturées via le navigateur sont sauvegardées dans `public/proofs` pour affichage et partage de la preuve.
- Limite de taille 10 Mo, helmet + rate limit activés.
- Clé API optionnelle via `x-api-key` pour restreindre les appels.
