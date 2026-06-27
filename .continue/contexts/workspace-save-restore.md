# Fonctionnalité : Restauration des Onglets d'un Espace de Travail (`RESTORE_WORKSPACE_TABS`)

## But
Cette fonctionnalité permet de restaurer un ensemble d'onglets précédemment sauvegardés dans un "Workspace". Elle gère la création de plusieurs nouveaux onglets à partir des données sauvegardées et inclut une logique pour potentiellement les "geler" automatiquement après leur création si l'intention est de les charger en arrière-plan et d'économiser la RAM.

## Fonctionnement technique

### 1. Requête depuis l'UI Svelte (`src/App.svelte` et `src/components/Workspaces.svelte`)
Lorsqu'un utilisateur sélectionne un Workspace et clique sur "Ouvrir" (dans `Workspaces.svelte`), le composant `App.svelte` orchestre la restauration. Il envoie un message au script de fond avec la liste des URLs des onglets à restaurer.

**Fichiers concernés :**
*   `src/components/Workspaces.svelte` (bouton déclencheur "Ouvrir")
*   `src/App.svelte` (gestionnaire `restoreWorkspace` qui envoie le message et gère le premier onglet)

**Extrait de code (`src/App.svelte` - partie pertinente de `restoreWorkspace`) :**
```svelte
// ... dans la fonction restoreWorkspace(workspaceToRestore) de App.svelte
function restoreWorkspace(workspaceToRestore) {
  // ... logique de sauvegarde de la session actuelle et gestion du premier onglet ...

  // Envoi des onglets restants au background script
  chrome.runtime.sendMessage(
    {
      action: 'RESTORE_WORKSPACE_TABS',
      tabs: remainingTabs, // Liste des onglets (URL, titre, favIconUrl)
    },
    () => {
      restoringCount = Math.max(0, restoringCount - 1);
      refreshTabs();
    },
  );
  // ...
}
```
**Note :** `App.svelte` gère la création du *premier* onglet du workspace pour s'assurer qu'une fenêtre reste ouverte et active, puis délègue les onglets suivants au script de fond pour une gestion asynchrone et potentiellement plus rapide.

### 2. Gestion dans le Service Worker (`public/background.js`)
Le script de fond reçoit le message `RESTORE_WORKSPACE_TABS` et boucle sur la liste des onglets à créer. Pour chaque onglet, il crée un nouvel onglet Chrome et attache un écouteur pour le geler automatiquement une fois qu'il commence à charger.

**Fichier concerné :** `public/background.js`
**Extrait de code :**
```javascript
case 'RESTORE_WORKSPACE_TABS':
  (async () => {
    try {
      for (const tabData of message.tabs) {
        const newTab = await chrome.tabs.create({
          url: tabData.url,
          active: false, // Créé en arrière-plan, non actif
        });

        const discardListener = (tabId, changeInfo, tab) => {
          if (
            tabId === newTab.id &&
            (changeInfo.status === 'loading' ||
              changeInfo.status === 'complete')
          ) {
            if (tab.url && !tab.url.startsWith('about:')) {
              chrome.tabs
                .discard(tabId)
                .catch((e) =>
                  console.log('Note: Onglet déjà gelé ou géré.'),
                );
              chrome.tabs.onUpdated.removeListener(discardListener); // Retire l'écouteur après usage
            }
          }
        };
        
        chrome.tabs.onUpdated.addListener(discardListener); // Ajoute l'écouteur pour geler le nouvel onglet
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error('Erreur lors de la restauration du workspace:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true;
```

**Mécanismes clés :**

*   **Création asynchrone d'onglets (`chrome.tabs.create`) :** Le script utilise `await chrome.tabs.create({ url: tabData.url, active: false });` pour créer chaque onglet. `active: false` est crucial car cela signifie que les onglets sont ouverts en arrière-plan et ne prennent pas le focus, ce qui est idéal pour une restauration en masse.
*   **Gel automatique après création (`discardListener`) :**
    *   Pour chaque `newTab` créé, un `discardListener` est ajouté à `chrome.tabs.onUpdated`.
    *   Ce listener attend que le `newTab` commence à charger (`status === 'loading'`) ou soit complètement chargé (`status === 'complete'`).
    *   Si l'URL n'est pas une page interne (`about:`), l'onglet est immédiatement gelé (`chrome.tabs.discard(tabId)`).
    *   L'écouteur est ensuite supprimé (`removeListener`) pour éviter des déclenchements futurs inutiles. Cette logique permet de créer les onglets rapidement, puis de libérer leur mémoire dès que possible sans intervention manuelle.
*   **Gestion d'erreurs :** Un bloc `try-catch` est utilisé pour intercepter les erreurs potentielles lors de la création ou du gel des onglets, et pour renvoyer une réponse appropriée à l'UI.

## Fichiers clés et Interactions

*   **`src/App.svelte`**: Orchestre le processus de restauration, gère le premier onglet, et envoie les onglets restants au Service Worker. Met à jour l'UI après la restauration complète.
*   **`src/components/Workspaces.svelte`**: Affiche la liste des Workspaces et fournit l'interface utilisateur pour déclencher la restauration.
*   **`public/background.js`**: Le Service Worker qui implémente la logique de création et de gel automatique des onglets.
*   **API Chrome (`chrome.tabs`)**: Utilisée intensivement pour créer des onglets (`create`) et pour les geler (`discard`).

## Résumé du Flux

1.  L'utilisateur choisit un Workspace à restaurer dans `Workspaces.svelte`.
2.  `App.svelte` reçoit l'action. Il peut d'abord sauvegarder la session actuelle et ferme les onglets existants.
3.  `App.svelte` crée le *premier* onglet du Workspace lui-même.
4.  `App.svelte` envoie un message `RESTORE_WORKSPACE_TABS` au `background.js` avec la liste des *onglets restants*.
5.  `background.js` boucle sur chaque onglet de la liste :
    *   Crée un nouvel onglet en arrière-plan (`active: false`).
    *   Attache un `discardListener` à cet onglet.
    *   Dès que l'onglet commence à charger (et n'est pas une page `about:`), le `discardListener` le gèle (`chrome.tabs.discard`).
    *   Le `discardListener` se désabonne de `onUpdated`.
6.  Une fois tous les onglets créés et potentiellement gelés, `background.js` renvoie une réponse à `App.svelte`.
7.  `App.svelte` met à jour son état et l'UI, et potentiellement rafraîchit la liste des onglets affichés.
