# Architecture du projet "Keeps Extension"

## But du projet

L'extension "Keeps" pour navigateur vise à améliorer la gestion des onglets en permettant aux utilisateurs de :
- Mettre en veille des onglets (fonction "Icebox") pour libérer de la mémoire RAM sans les fermer complètement.
- Créer et restaurer des "Workspaces" (espaces de travail) qui sont des ensembles d'onglets sauvegardés, facilitant ainsi l'organisation et le basculement entre différentes sessions de travail.
- Visualiser en temps réel la consommation de RAM du navigateur.

Le projet utilise Svelte pour l'interface utilisateur et interagit directement avec l'API Chrome pour la gestion des onglets et du stockage local.

## Structure des dossiers principale

- **`.continue/`**: Fichiers de configuration pour l'outil `continue` (probablement un assistant de développement AI).
- **`.git/`**: Répertoire Git pour le contrôle de version.
- **`.vscode/`**: Configurations spécifiques à VS Code.
- **`public/`**: Contient les fichiers statiques de l'extension, notamment le manifeste (`manifest.json`) et le script de fond (`background.js`).
- **`src/`**: Le code source principal de l'application Svelte.
    - **`src/assets/`**: Probablement pour les ressources statiques comme les images, les icônes, etc. (non listé explicitement mais conventionnel).
    - **`src/components/`**: Composants Svelte réutilisables pour l'interface utilisateur.
    - **`src/lib/`**: Fichiers de modules Svelte ou JavaScript utilitaires.

## Technologies utilisées

- **Svelte**: Framework JavaScript pour la construction de l'interface utilisateur. Le projet utilise la version 5 (avec l'API `$state` et `$props`).
- **Vite**: Outil de build rapide pour le développement frontal.
- **Tailwind CSS (avec PostCSS et Autoprefixer)**: Framework CSS utilitaire pour le stylisme rapide et réactif.
- **API Chrome Extensions**: Pour interagir avec le navigateur (gestion des onglets, stockage local, consommation de RAM).

## Fichiers clés

- `@file package.json`: Définit les métadonnées du projet, les scripts de build et les dépendances (Svelte, Vite, Tailwind CSS, `@types/chrome`).
- `@file vite.config.js`: Configuration de Vite.
- `@file svelte.config.js`: Configuration de Svelte.
- `@file public/manifest.json`: Le manifeste de l'extension Chrome, déclarant les permissions, les scripts de fond, et l'UI du popup.
- `@file public/background.js`: Le script de fond (service worker) de l'extension. Il gère les communications avec l'API Chrome et les requêtes des composants Svelte (par exemple, `GET_TABS`, `FREEZE_TAB`, `GET_BROWSER_RAM`).
- `@file src/main.js`: Point d'entrée de l'application Svelte.
- `@file src/App.svelte`: Le composant racine de l'application. Il orchestre l'état global (onglets, icebox, workspaces, RAM), gère les interactions avec l'API Chrome et intègre les autres composants. C'est le cœur logique de l'UI.
- `@file src/app.css`: Fichier CSS global, probablement pour les styles de base et l'importation de Tailwind.
- `@file src/components/TabItem.svelte`: Affiche un onglet individuel avec des actions (figer, envoyer à l'icebox, etc.).
- `@file src/components/Header.svelte`: Composant d'en-tête, affiche le nom de l'application et l'utilisation de la RAM.
- `@file src/components/EmptyState.svelte`: Composant affiché lorsque aucun onglet n'est ouvert ou qu'une liste est vide.
- `@file src/components/Icebox.svelte`: Gère l'affichage et les actions des onglets "mis au frais".
- `@file src/components/Workspaces.svelte`: Gère l'affichage, la sauvegarde, la restauration et la suppression des espaces de travail.
- `@file src/lib/Counter.svelte`: Un composant Svelte simple qui pourrait être un exemple ou un composant utilitaire de base.

## Index des features
