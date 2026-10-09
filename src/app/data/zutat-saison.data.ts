export interface ZutatSaison {
  /** Normalisierter Name in Kleinschreibung */
  name: string;
  /** Monate (1–12), in denen diese Zutat saisonal verfügbar ist */
  monate: number[];
}

/**
 * Statische Saisonal-Datenbank (Mitteleuropa).
 * Nicht gelistete Zutaten gelten als ganzjährig verfügbar.
 */
export const ZUTAT_SAISON_DB: ZutatSaison[] = [
  // Frühling (März–Mai)
  { name: 'spargel', monate: [4, 5, 6] },
  { name: 'weisser spargel', monate: [4, 5, 6] },
  { name: 'grüner spargel', monate: [4, 5, 6] },
  { name: 'radieschen', monate: [4, 5, 6, 7, 8, 9] },
  { name: 'rhabarber', monate: [4, 5, 6] },
  { name: 'bärlauch', monate: [3, 4, 5] },
  { name: 'erbsen', monate: [5, 6, 7] },
  { name: 'spinat', monate: [3, 4, 5, 9, 10] },
  { name: 'frühlingszwiebeln', monate: [3, 4, 5, 6] },
  { name: 'kopfsalat', monate: [4, 5, 6, 7, 8, 9] },

  // Sommer (Juni–August)
  { name: 'erdbeeren', monate: [5, 6, 7, 8] },
  { name: 'erdbeere', monate: [5, 6, 7, 8] },
  { name: 'tomaten', monate: [6, 7, 8, 9, 10] },
  { name: 'tomate', monate: [6, 7, 8, 9, 10] },
  { name: 'zucchini', monate: [6, 7, 8, 9] },
  { name: 'gurken', monate: [6, 7, 8, 9] },
  { name: 'gurke', monate: [6, 7, 8, 9] },
  { name: 'paprika', monate: [7, 8, 9, 10] },
  { name: 'peperoni', monate: [7, 8, 9, 10] },
  { name: 'himbeeren', monate: [6, 7, 8] },
  { name: 'himbeere', monate: [6, 7, 8] },
  { name: 'heidelbeeren', monate: [7, 8, 9] },
  { name: 'blaubeeren', monate: [7, 8, 9] },
  { name: 'kirschen', monate: [6, 7, 8] },
  { name: 'kirsche', monate: [6, 7, 8] },
  { name: 'mais', monate: [7, 8, 9] },
  { name: 'aubergine', monate: [7, 8, 9, 10] },
  { name: 'bohnen', monate: [6, 7, 8, 9] },
  { name: 'grüne bohnen', monate: [6, 7, 8, 9] },
  { name: 'pfirsich', monate: [7, 8, 9] },
  { name: 'aprikose', monate: [6, 7, 8] },
  { name: 'pflaume', monate: [7, 8, 9, 10] },
  { name: 'brombeere', monate: [7, 8, 9] },
  { name: 'brombeeren', monate: [7, 8, 9] },

  // Herbst (September–November)
  { name: 'äpfel', monate: [8, 9, 10, 11] },
  { name: 'apfel', monate: [8, 9, 10, 11] },
  { name: 'birnen', monate: [8, 9, 10, 11] },
  { name: 'birne', monate: [8, 9, 10, 11] },
  { name: 'kürbis', monate: [9, 10, 11, 12] },
  { name: 'hokkaido', monate: [9, 10, 11] },
  { name: 'butternut', monate: [9, 10, 11, 12] },
  { name: 'rote bete', monate: [9, 10, 11] },
  { name: 'randen', monate: [9, 10, 11] },
  { name: 'sellerie', monate: [9, 10, 11, 12] },
  { name: 'knollensellerie', monate: [9, 10, 11, 12] },
  { name: 'feldsalat', monate: [10, 11, 12, 1, 2, 3] },
  { name: 'nüsse', monate: [9, 10, 11] },
  { name: 'walnüsse', monate: [9, 10, 11] },
  { name: 'haselnüsse', monate: [9, 10, 11] },
  { name: 'kastanien', monate: [9, 10, 11] },
  { name: 'trauben', monate: [9, 10, 11] },
  { name: 'weintrauben', monate: [9, 10, 11] },
  { name: 'zwetschgen', monate: [8, 9, 10] },
  { name: 'rotkohl', monate: [9, 10, 11, 12] },
  { name: 'rotkraut', monate: [9, 10, 11, 12] },
  { name: 'wirsing', monate: [9, 10, 11, 12] },
  { name: 'lauch', monate: [9, 10, 11, 12, 1, 2] },
  { name: 'porree', monate: [9, 10, 11, 12, 1, 2] },
  { name: 'pastinake', monate: [9, 10, 11, 12, 1, 2] },

  // Winter (Dezember–Februar)
  { name: 'grünkohl', monate: [11, 12, 1, 2, 3] },
  { name: 'rosenkohl', monate: [10, 11, 12, 1, 2] },
  { name: 'steckrübe', monate: [10, 11, 12, 1, 2] },
  { name: 'schwarzwurzel', monate: [10, 11, 12, 1, 2, 3] },
  { name: 'chicorée', monate: [11, 12, 1, 2, 3] },
  { name: 'endivie', monate: [10, 11, 12, 1, 2] },
  { name: 'topinambur', monate: [10, 11, 12, 1, 2, 3] },
  { name: 'blumenkohl', monate: [6, 7, 8, 9, 10, 11] },
  { name: 'brokkoli', monate: [6, 7, 8, 9, 10] },
  { name: 'möhren', monate: [6, 7, 8, 9, 10, 11, 12] },
  { name: 'karotten', monate: [6, 7, 8, 9, 10, 11, 12] },
  { name: 'rüebli', monate: [6, 7, 8, 9, 10, 11, 12] },
];
