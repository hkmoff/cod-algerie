# cod-algerie

Plateforme SaaS multi-boutiques de landing pages COD pour l'Algérie.

Stack : React + Vite + Tailwind (frontend) · Cloudflare Workers (backend) · Supabase Postgres + RLS (base de données) · dzship / Yalidine (livraison).

## Structure

```
cod-algerie/
├── worker/          Cloudflare Worker (API : tarifs de livraison, routing multi-boutique)
│   └── src/index.ts
└── frontend/         Application React (page produit, formulaire de commande)
    └── src/
```

## 1. Mettre le code sur GitHub

Ce projet n'est pas encore un dépôt Git. Depuis ce dossier :

```bash
git init
git add .
git commit -m "Initial commit: schéma Supabase + formulaire de commande"
git branch -M main
git remote add origin https://github.com/<ton-compte>/cod-algerie.git
git push -u origin main
```

## 2. Configurer les variables d'environnement

Copie `.env.example` vers `.env` dans `frontend/` et remplis les valeurs (déjà connues, voir ci-dessous) :

```
VITE_SUPABASE_URL=https://jqywitbdhmompmhpvwor.supabase.co
VITE_SUPABASE_ANON_KEY=<clé publishable, voir .env.example>
VITE_DEMO_SHOP_ID=<id de la boutique de test, à créer dans Supabase>
```

Côté Worker, les secrets ne vont JAMAIS dans le code ni sur GitHub — ils se configurent avec Wrangler :

```bash
cd worker
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

(la clé `service_role` se trouve dans Supabase → Project Settings → API — à garder strictement secrète, elle contourne toutes les policies RLS)

## 3. Lancer en local

```bash
# Frontend
cd frontend
npm install
npm run dev

# Worker (dans un autre terminal)
cd worker
npm install
npx wrangler dev
```

## 4. Déployer

```bash
cd worker
npx wrangler deploy

cd ../frontend
npm run build
npx wrangler pages deploy dist
```

## Prochaines étapes de code

- Créer une première boutique de test dans la table `shops` (avec ses identifiants Yalidine dans `shop_courier_credentials`)
- Brancher le routing multi-boutique (sous-domaine → shop_id) dans `worker/src/index.ts`
- Écran back-office vendeur (liste des commandes, statistiques)




