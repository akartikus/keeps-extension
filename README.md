# Svelte + Vite

This template should help get you started developing with Svelte in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Need an official Svelte framework?

Check out [SvelteKit](https://github.com/sveltejs/kit#readme), which is also powered by Vite. Deploy anywhere with its serverless-first approach and adapt to various platforms, with out of the box support for TypeScript, SCSS, and Less, and easily-added support for mdsvex, GraphQL, PostCSS, Tailwind CSS, and more.

## Technical considerations

**Why use this over SvelteKit?**

- It brings its own routing solution which might not be preferable for some users.
- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

This template contains as little as possible to get started with Vite + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

Should you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `checkJs` in the JS template?**

It is likely that most cases of changing variable types in runtime are likely to be accidental, rather than deliberate. This provides advanced typechecking out of the box. Should you like to take advantage of the dynamically-typed nature of JavaScript, it is trivial to change the configuration.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/sveltejs/svelte-hmr/tree/master/packages/svelte-hmr#preservation-of-local-state).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

```js
// store.js
// An extremely simple external store
import { writable } from 'svelte/store'
export default writable(0)
```


# Keeps Extension

"Workspace memory for your browser."

Keeps est une extension Chrome minimaliste et moderne conçue pour transformer la gestion de vos onglets en une expérience de gestion d'espaces de travail mentaux. Loin d'être un simple "tab manager", Keeps se positionne comme une couche intelligente qui vous aide à organiser vos contextes de travail, réduire la surcharge mentale, économiser de la RAM et retrouver instantanément votre environnement de travail.

## Problème que Keeps résout

Les solutions existantes pour la gestion des onglets sont souvent trop lourdes, trop simplistes, ou ne parviennent pas à gérer efficacement les "contextes mentaux" de l'utilisateur. Le vrai problème n'est pas "trop d'onglets", mais "trop de contextes mentaux ouverts en même temps", entraînant une surcharge cognitive et une consommation excessive de ressources.

## Objectif du produit

Keeps vise à offrir une expérience :
*   **Ultra fluide** et **rapide**
*   **Minimaliste** et **invisible**
*   **Sans friction**

Inspirée par l'UX de navigateurs comme Arc et Zen, ainsi que d'outils comme Linear et Raycast, Keeps propose une approche légère sous forme d'extension Chrome.

## Fonctionnalités principales (MVP)

1.  **Workspaces intelligents**
    *   Créez des espaces de travail nommés (ex: "Projet Nova", "Client IKEA") qui sauvegardent l'ensemble de vos onglets, groupes et leur ordre, préservant ainsi votre état de travail.
2.  **Sauvegarde et restauration instantanée**
    *   Fermez ou suspendez un workspace et restaurez-le exactement comme vous l'avez laissé en un clic, y compris l'ordre des onglets, les groupes, et le dernier focus. L'objectif est de restaurer votre contexte mental complet.
3.  **Suspension intelligente des onglets**
    *   Gère les onglets comme un OS moderne gère la mémoire : les onglets inactifs sont "hibernés" pour libérer la RAM, tout en restant instantanément récupérables. Ce système différencie les "tabs chauds" (actifs) des "tabs froids" (suspendus automatiquement).
4.  **Sidebar minimaliste**
    *   Une interface verticale, épurée, permettant une navigation rapide entre les workspaces. Pas de widgets, pas de surcharge visuelle, juste l'essentiel pour une gestion efficace.
5.  **Suivi de la consommation de RAM du navigateur**
    *   Une estimation en temps réel de la RAM utilisée par le navigateur est intégrée discrètement dans la sidebar, offrant une visibilité directe sur les économies de mémoire réalisées par la suspension intelligente.

## Technologies utilisées

*   **Svelte (v5)**: Framework JavaScript pour une interface utilisateur réactive et performante.
*   **Vite**: Outil de build rapide pour un développement frontal efficace.
*   **Tailwind CSS**: Framework CSS utilitaire pour un stylisme rapide et personnalisable.
*   **API Chrome Extensions (Manifest V3)**: Pour une interaction profonde avec le navigateur (gestion des onglets, stockage local, surveillance de la RAM).

## Démarrage rapide

Pour installer les dépendances et démarrer le serveur de développement :

```bash
npm install
npm run dev
```

Pour construire l'extension pour la production :

```bash
npm run build
```

Chargez le dossier `dist` dans votre navigateur en tant qu'extension non empaquetée.

## Contributions

Les contributions sont les bienvenues ! Veuillez consulter les problèmes ou proposer des requêtes de tirage.
