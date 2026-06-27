# Fonctionnalité : Récupération de la Consommation de RAM du Navigateur (`GET_BROWSER_RAM`)

## But
Cette fonctionnalité permet à l'extension de fournir une estimation en temps réel de la consommation de mémoire vive (RAM) par le navigateur Chrome et de l'afficher dans l'interface utilisateur du popup. Elle vise à donner à l'utilisateur une visibilité sur l'impact de ses onglets sur les ressources système.

## Fonctionnement technique

### 1. Requête depuis l'UI Svelte (`src/App.svelte` et `src/components/Header.svelte`)
L'interface utilisateur initie une requête périodique (toutes les 4 secondes) pour obtenir les informations sur la RAM du navigateur. L'affichage se fait dans le composant `Header`.

**Fichiers concernés :**
*   `src/App.svelte` (initialisation de l'intervalle et gestionnaire `updateBrowserRamUsage`)
*   `src/components/Header.svelte` (composant d'affichage de la RAM)

**Extrait de code (`src/App.svelte`) :**
```svelte
// ... dans onMount() de App.svelte
onMount(() => {
  // ... autres initialisations ...

  updateBrowserRamUsage(); // Première mise à jour au chargement
  const ramInterval = setInterval(updateBrowserRamUsage, 4000); // Mise à jour toutes les 4 secondes

  return () => {
    clearInterval(ramInterval); // Nettoyage lors du démontage du composant
  };
});

function updateBrowserRamUsage() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'GET_BROWSER_RAM' }, (response) => {
      if (response && response.success) {
        const totalBrowserBytes = response.bytes;
        const totalSystemMemoryBytes = response.capacity;

        // Calcul de l'affichage textuel (MB ou GB)
        const ramMB = totalBrowserBytes / (1024 * 1024);
        if (ramMB >= 1024) {
          browserRamMB = `${(ramMB / 1024).toFixed(1)} GB`;
        } else {
          browserRamMB = `${Math.round(ramMB)} MB`;
        }

        // Calcul du pourcentage
        browserRamPercent = Math.round(
          (totalBrowserBytes / totalSystemMemoryBytes) * 100,
        );
      }
    });
  } else {
    // Fallback pour le développement local hors extension
    browserRamMB = '340 MB';
    browserRamPercent = 8;
  }
}
```

### 2. Gestion dans le Service Worker (`public/background.js`)
Le script de fond reçoit le message `GET_BROWSER_RAM` et utilise les APIs `chrome.system.memory` et `chrome.tabs` pour estimer la consommation de RAM.

**Fichier concerné :** `public/background.js`
**Extrait de code :**
```javascript
case 'GET_BROWSER_RAM':
  (async () => {
    try {
      // 1. Récupérer la capacité totale de la machine à l'instant T
      const memoryInfo = await chrome.system.memory.getInfo();
      const totalCapacity = memoryInfo.capacity; // Capacité totale en bytes

      // 2. Récupérer l'état EN DIRECT de tous les onglets ouverts
      chrome.tabs.query({}, (tabs) => {
        let totalBrowserBytes = 0;

        // Base fixe du navigateur (estimation du moteur, extensions, etc.)
        const BROWSER_BASE_MEMORY = 350 * 1024 * 1024; // 350 Mo
        totalBrowserBytes += BROWSER_BASE_MEMORY;

        if (tabs) {
          tabs.forEach((tab) => {
            if (tab.discarded) {
              totalBrowserBytes += 2 * 1024 * 1024; // 2 Mo pour un onglet gelé (très faible)
            } else {
              // Estimation basée sur l'état de l'onglet
              if (tab.active) {
                totalBrowserBytes += 180 * 1024 * 1024; // ~180 Mo pour l'onglet au premier plan (actif)
              } else {
                totalBrowserBytes += 85 * 1024 * 1024; // ~85 Mo pour les onglets passifs en arrière-plan
              }
            }
          });
        }

        // 3. Renvoyer les données fraîches
        sendResponse({
          success: true,
          bytes: totalBrowserBytes,
          capacity: totalCapacity,
        });
      });
    } catch (error) {
      console.error('Erreur calcul RAM:', error);
      sendResponse({
        success: false,
        bytes: 450 * 1024 * 1024, // Valeurs par défaut en cas d'erreur
        capacity: 16 * 1024 * 1024 * 1024,
      });
    }
  })();
  return true;
```

**Mécanismes clés :**

*   **`chrome.system.memory.getInfo()` :** Cette API permet d'obtenir des informations sur la mémoire système, y compris la `capacity` totale de RAM de la machine sur laquelle le navigateur s'exécute.
*   **`chrome.tabs.query({}, (tabs) => { ... })` :** Interroge *tous* les onglets ouverts dans *toutes* les fenêtres du navigateur (le `{}` vide signifie "tous").
*   **Estimation heuristique de la RAM :** Chrome ne fournit pas de méthode directe pour obtenir la RAM consommée par chaque onglet ou par le navigateur dans son ensemble de manière précise pour les extensions. Le code utilise donc une **estimation heuristique** :
    *   **`BROWSER_BASE_MEMORY` (350 Mo) :** Une base fixe est ajoutée pour représenter la consommation du processus principal de Chrome, des extensions (y compris Keeps), et des processus système.
    *   **Onglets `discarded` (2 Mo) :** Les onglets gelés consomment très peu de RAM.
    *   **Onglets `active` (180 Mo) :** L'onglet actuellement visible par l'utilisateur est estimé à consommer plus.
    *   **Onglets passifs (85 Mo) :** Les onglets en arrière-plan qui ne sont pas gelés sont estimés à consommer une quantité moyenne.
    *   Ces valeurs sont des **approximations basées sur des observations typiques** et ne sont pas des mesures exactes fournies par l'API.
*   **Calcul et envoi de la réponse :**
    *   `totalBrowserBytes` est la somme de la base et des estimations de chaque onglet.
    *   `totalCapacity` est la RAM totale du système.
    *   Ces deux valeurs sont renvoyées à l'UI.
*   **Gestion d'erreurs :** En cas d'échec de la récupération des informations (par exemple, permissions manquantes ou problème API), des valeurs par défaut sont renvoyées pour éviter de bloquer l'affichage dans l'UI.

## Fichiers clés et Interactions

*   **`src/App.svelte`**: Composant principal qui déclenche la mise à jour de la RAM à intervalle régulier et traite la réponse pour mettre à jour les variables `$state` `browserRamMB` et `browserRamPercent`.
*   **`src/components/Header.svelte`**: Affiche visuellement la consommation de RAM (valeur et pourcentage) reçue de `App.svelte`.
*   **`public/background.js`**: Le Service Worker qui contient la logique principale pour interroger les APIs et effectuer l'estimation.
*   **API Chrome (`chrome.system.memory`, `chrome.tabs`)**: APIs du navigateur utilisées pour obtenir des informations sur la mémoire système et les onglets.

## Résumé du Flux

1.  `App.svelte` appelle `updateBrowserRamUsage()` toutes les 4 secondes.
2.  `updateBrowserRamUsage()` envoie un message `GET_BROWSER_RAM` à `background.js`.
3.  `background.js` :
    *   Récupère la RAM totale du système via `chrome.system.memory.getInfo()`.
    *   Récupère tous les onglets via `chrome.tabs.query({})`.
    *   Estime la RAM du navigateur en additionnant une base fixe et des valeurs approximatives pour chaque onglet (selon qu'il est actif, passif ou gelé).
    *   Renvoie l'estimation de la RAM du navigateur (`bytes`) et la capacité totale du système (`capacity`) à `App.svelte`.
4.  `App.svelte` reçoit les données, calcule le format d'affichage (MB/GB) et le pourcentage, et met à jour ses variables d'état.
5.  `Header.svelte` (enfant de `App.svelte`) affiche ces informations à l'utilisateur.

