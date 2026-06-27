# Fonctionnalité : Geler un Onglet (`FREEZE_TAB`)

## But
Cette fonctionnalité permet à l'utilisateur de "geler" un onglet spécifique. Un onglet gelé (ou "discarded") libère une grande partie de la mémoire vive (RAM) qu'il consommait, sans pour autant être fermé. Son contenu est rechargé uniquement lorsque l'utilisateur clique dessus.

## Fonctionnement technique

### 1. Requête depuis l'UI Svelte (`src/App.svelte` et `src/components/TabItem.svelte`)
Lorsqu'un utilisateur clique sur l'icône de "gel" pour un onglet (généralement dans le composant `TabItem`), un événement est déclenché qui remonte au composant `App.svelte`. `App.svelte` envoie ensuite un message au script de fond pour exécuter l'action de gel.

**Fichiers concernés :**
*   `src/components/TabItem.svelte` (bouton déclencheur)
*   `src/App.svelte` (gestionnaire `freezeTab` qui envoie le message)

**Extrait de code (`src/App.svelte`) :**
```svelte
// ... dans la fonction freezeTab(tabId) de App.svelte
function freezeTab(tabId) {
  chrome.runtime.sendMessage(
    { action: 'FREEZE_TAB', tabId: tabId },
    (response) => {
      if (response && response.success) {
        refreshTabs(); // Rafraîchit la liste des onglets après le gel
      }
    },
  );
}
```

### 2. Gestion dans le Service Worker (`public/background.js`)
Le script de fond reçoit le message et utilise la méthode `chrome.tabs.discard` pour geler l'onglet spécifié.

**Fichier concerné :** `public/background.js`
**Extrait de code :**
```javascript
case 'FREEZE_TAB':
  chrome.tabs
    .discard(message.tabId)
    .then((discardedTab) => {
      sendResponse({ success: true, tab: discardedTab });
    })
    .catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
  return true;
```

**Mécanisme :**
*   `message.tabId`: Contient l'identifiant numérique de l'onglet à geler, envoyé par l'UI.
*   `chrome.tabs.discard(message.tabId)`: C'est l'appel clé de l'API Chrome. Il demande au navigateur de "jeter" (discard) le contenu de l'onglet spécifié. Le navigateur libère alors les ressources associées à la page, mais conserve l'onglet dans la barre d'onglets. L'onglet reste affiché mais sa propriété `discarded` passe à `true`.
*   La promesse (`.then()`, `.catch()`) gère la réponse :
    *   Si le gel est réussi, `success: true` est renvoyé.
    *   S'il y a une erreur (par exemple, l'onglet est déjà gelé ou l'ID est invalide), `success: false` et un message d'erreur sont renvoyés.
*   Après la réponse, `App.svelte` appelle `refreshTabs()` pour mettre à jour l'affichage, ce qui inclura l'état `discarded` de l'onglet.

## Fichiers clés et Interactions

*   **`src/App.svelte`**: Composant principal qui contient la logique `freezeTab` et appelle `refreshTabs` après le gel.
*   **`src/components/TabItem.svelte`**: Composant d'affichage d'un onglet individuel qui expose le bouton pour déclencher l'action de gel.
*   **`public/background.js`**: Le Service Worker qui exécute la commande `chrome.tabs.discard` via l'API Chrome.
*   **API Chrome (`chrome.tabs`)**: L'interface du navigateur utilisée pour manipuler l'état des onglets, spécifiquement la méthode `discard()`.

## Résumé du Flux

1.  L'utilisateur clique sur le bouton "geler" pour un onglet dans `TabItem.svelte`.
2.  L'événement est capturé par `App.svelte` qui appelle `freezeTab()`.
3.  `freezeTab()` envoie un message `FREEZE_TAB` avec l'ID de l'onglet à `background.js`.
4.  `background.js` exécute `chrome.tabs.discard()` pour geler l'onglet.
5.  `background.js` renvoie le statut de l'opération à `App.svelte`.
6.  `App.svelte` rafraîchit la liste des onglets pour refléter le nouvel état `discarded` de l'onglet.
