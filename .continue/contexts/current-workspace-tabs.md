# Fonctionnalité : Récupération des Onglets Actuels (`GET_TABS`)

## But
Cette fonctionnalité permet à l'interface utilisateur (le popup Svelte) de récupérer la liste de tous les onglets ouverts dans la fenêtre de navigateur actuellement active. C'est la base pour afficher les onglets dans la section "Espace de travail actuel".

## Fonctionnement technique

### 1. Requête depuis l'UI Svelte (`src/App.svelte`)
Lorsque l'application Svelte a besoin de rafraîchir la liste des onglets (par exemple, au chargement, après la création/suppression/mise à jour d'un onglet, ou après une action "Icebox"/"Workspace"), elle envoie un message au script de fond.

**Fichier concerné :** `src/App.svelte`
**Extrait de code (schématique) :**
```svelte
// ... dans la fonction refreshTabs() de App.svelte
chrome.runtime.sendMessage({ action: 'GET_TABS' }, (response) => {
  if (response && response.tabs) {
    tabs = response.tabs; // Mise à jour de l'état réactif Svelte
  }
});
```

### 2. Gestion dans le Service Worker (`public/background.js`)
Le script de fond intercepte le message et utilise l'API `chrome.tabs.query` pour obtenir les onglets.

**Fichier concerné :** `public/background.js`
**Extrait de code :**
```javascript
case 'GET_TABS':
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    sendResponse({ tabs: tabs });
  });
  return true;
```

**Mécanisme :**
*   `chrome.tabs.query({ currentWindow: true }, (tabs) => { ... });` : Cette fonction de l'API Chrome Extensions interroge tous les onglets qui se trouvent dans la *fenêtre de navigateur actuellement active*.
*   Le tableau `tabs` contient des objets onglets détaillés, chacun incluant des propriétés comme `id`, `title`, `url`, `favIconUrl`, `discarded`, etc.
*   `sendResponse({ tabs: tabs });` : Le script de fond renvoie le tableau d'objets `tabs` à l'application Svelte qui a initié la requête.

## Fichiers clés et Interactions

*   **`src/App.svelte`**: Composant principal qui initialise la récupération des onglets et met à jour son état `tabs` réactif avec les données reçues. Il contient la logique `refreshTabs()` qui appelle cette fonctionnalité.
*   **`public/background.js`**: Le Service Worker de l'extension qui écoute les messages de l'UI et exécute la requête `chrome.tabs.query`.
*   **API Chrome (`chrome.tabs`)**: L'interface du navigateur utilisée pour interroger les informations sur les onglets.

## Résumé du Flux

1.  L'UI Svelte (`App.svelte`) a besoin de la liste des onglets à jour.
2.  Elle envoie un message `GET_TABS` au `background.js`.
3.  `background.js` utilise `chrome.tabs.query` pour obtenir les onglets de la fenêtre courante.
4.  `background.js` renvoie la liste des onglets à `App.svelte`.
5.  `App.svelte` met à jour son état interne et l'interface utilisateur pour refléter les onglets actuels.
