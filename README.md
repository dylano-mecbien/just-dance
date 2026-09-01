# JD Contest — site du concours Just Dance

## Présentation

Ce projet est une page web React statique pensée pour le concours du samedi 5 septembre 2026. Elle comprend le programme de la journée, un compte à rebours, un formulaire d’inscription avec pseudo, téléphone et photo, un classement de participantes activable par l’organisation, ainsi qu’un tableau admin permettant de modifier les statuts : en course, éliminée ou championne.

L’interface fonctionne immédiatement en mode démo grâce au stockage local du navigateur. Pour passer en mode partagé, il suffit de connecter une table Supabase avec les variables d’environnement décrites ci-dessous.

## Démarrage local

```bash
pnpm install
pnpm dev
```

Le site est ensuite accessible sur l’URL indiquée par Vite.

## Connexion Supabase

Dans Supabase, créez un projet puis ouvrez le SQL Editor. Copiez-collez le contenu de `supabase/schema.sql` et exécutez-le. Dans Storage, créez ensuite un bucket public nommé `participant-photos` si vous souhaitez stocker durablement les photos. Le formulaire fonctionne aussi sans bucket, mais les photos ajoutées depuis un navigateur seront alors uniquement temporaires.

Créez un fichier `.env.local` à la racine du projet à partir de `.env.example` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
VITE_ADMIN_PIN=0509
```

La clé utilisée dans le navigateur doit être la clé `anon` publique de Supabase, jamais une clé `service_role`. Le PIN admin est volontairement simple pour un événement privé sans authentification. Comme il est livré dans une application frontend, il ne constitue pas une protection forte pour un système public : si nécessaire, ajoutez Supabase Auth et des règles RLS plus strictes avant un usage sensible.

## Déploiement Vercel

Le projet est compatible avec Vercel sans serveur supplémentaire. Dans Vercel, importez le dépôt ou le dossier du projet, sélectionnez le framework **Vite**, puis utilisez les paramètres suivants :

| Paramètre | Valeur |
|---|---|
| Install Command | `pnpm install` |
| Build Command | `pnpm build` |
| Output Directory | `dist/public` |
| Node.js | 20 ou plus récent |

Ajoutez `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_ADMIN_PIN` dans les Environment Variables de Vercel pour les environnements Preview et Production. Après chaque changement de variable, relancez un déploiement.

Le fichier `vercel.json` fournit la réécriture SPA nécessaire afin que l’URL principale reste fonctionnelle après un rafraîchissement.

## Utilisation le jour du concours

L’organisateur ouvre `/` pour présenter le programme. Le bouton d’inscription reste visible tant que le classement n’est pas activé. Pour administrer le concours, cliquez sur **Admin**, entrez le PIN, puis activez **Classement visible**. Les participantes inscrites apparaissent alors dans le tableau public. À chaque manche, le bouton rouge permet d’éliminer une participante. Le bouton trophée permet de désigner la championne finale. La page publique se rafraîchit automatiquement périodiquement lorsque Supabase est configuré.

Les données de démonstration locales servent uniquement à prévisualiser l’interface. Elles ne sont pas envoyées à Supabase tant qu’aucune vraie inscription n’est soumise.

## Structure utile

| Fichier | Rôle |
|---|---|
| `client/src/pages/Home.tsx` | Accueil, formulaire, classement et admin |
| `client/src/index.css` | Direction visuelle Arena Pop et responsive |
| `supabase/schema.sql` | Table `participants` et politiques publiques minimales |
| `.env.example` | Variables nécessaires |
| `vercel.json` | Réécriture pour le routage SPA |
| `ideas.md` | Décisions de direction artistique |

## Contact affiché

Le lien WhatsApp de la page utilise le numéro `+237 697 684 439` et ouvre directement une conversation via `wa.me`.
