// Au démarrage et à l'installation, on configure le panneau latéral pour qu'il soit actif partout
// chrome.runtime.onInstalled.addListener(() => {
//   chrome.sidePanel
//     .setPanelBehavior({ openPanelOnActionClick: true })
//     .catch((error) =>
//       console.error('Erreur de configuration du sidePanel:', error),
//     );
// });

// Solution de secours si Brave ignore la configuration ci-dessus
// chrome.action.onClicked.addListener((tab) => {
//   if (tab.windowId) {
//     chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => {
//       // Si le sidePanel échoue sur Brave, on ouvre l'interface dans un onglet classique
//       // pour ne pas bloquer le développeur.
//       chrome.tabs.create({ url: 'index.html' });
//     });
//   }
// });
