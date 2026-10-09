export interface ZutatKH {
  /** Normalisierter Name in Kleinschreibung (exakter Teilstring-Match gegen Zutatenname) */
  name: string;
  /** KH-Tag, der gesetzt wird */
  tag: string;
  /** Priorität: 1 = hoch, 2 = mittel */
  prioritaet: 1 | 2;
}

/**
 * Statische KH-Erkennungs-Datenbank.
 * Beim Speichern wird der KH-Lieferant mit der höchsten Priorität (niedrigster Zahl)
 * als primärer Tag gesetzt. Bei Gleichstand gewinnt der erste Treffer in der Zutatenliste.
 */
export const ZUTAT_KH_DB: ZutatKH[] = [
  // Priorität 1 – Hauptkohlenhydratträger
  // Pasta
  { name: 'spaghetti', tag: 'Pasta', prioritaet: 1 },
  { name: 'penne', tag: 'Pasta', prioritaet: 1 },
  { name: 'tagliatelle', tag: 'Pasta', prioritaet: 1 },
  { name: 'fettuccine', tag: 'Pasta', prioritaet: 1 },
  { name: 'rigatoni', tag: 'Pasta', prioritaet: 1 },
  { name: 'fusilli', tag: 'Pasta', prioritaet: 1 },
  { name: 'lasagneplatten', tag: 'Pasta', prioritaet: 1 },
  { name: 'lasagne', tag: 'Pasta', prioritaet: 1 },
  { name: 'farfalle', tag: 'Pasta', prioritaet: 1 },
  { name: 'tortellini', tag: 'Pasta', prioritaet: 1 },
  { name: 'nudeln', tag: 'Pasta', prioritaet: 1 },
  { name: 'pasta', tag: 'Pasta', prioritaet: 1 },
  { name: 'gnocchi', tag: 'Kartoffeln', prioritaet: 1 }, // Gnocchi = Kartoffeln

  // Reis
  { name: 'reis', tag: 'Reis', prioritaet: 1 },
  { name: 'basmatireis', tag: 'Reis', prioritaet: 1 },
  { name: 'jasminreis', tag: 'Reis', prioritaet: 1 },
  { name: 'risottoreis', tag: 'Reis', prioritaet: 1 },
  { name: 'risotto', tag: 'Reis', prioritaet: 1 },
  { name: 'milchreis', tag: 'Reis', prioritaet: 1 },
  { name: 'klebreis', tag: 'Reis', prioritaet: 1 },

  // Kartoffeln
  { name: 'kartoffeln', tag: 'Kartoffeln', prioritaet: 1 },
  { name: 'kartoffel', tag: 'Kartoffeln', prioritaet: 1 },
  { name: 'gschwellti', tag: 'Kartoffeln', prioritaet: 1 },
  { name: 'pommes', tag: 'Kartoffeln', prioritaet: 1 },
  { name: 'bratkartoffeln', tag: 'Kartoffeln', prioritaet: 1 },
  { name: 'kartoffelpüree', tag: 'Kartoffeln', prioritaet: 1 },
  { name: 'ofenkartoffeln', tag: 'Kartoffeln', prioritaet: 1 },

  // Priorität 2 – Sekundäre Kohlenhydratträger
  // Brot / Teig
  { name: 'mehl', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'brotteig', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'blätterteig', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'pizzateig', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'hefeteig', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'brot', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'toast', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'brötchen', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'ciabatta', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'baguette', tag: 'Brot / Teig', prioritaet: 2 },
  { name: 'croissant', tag: 'Brot / Teig', prioritaet: 2 },

  // Hülsenfrüchte
  { name: 'linsen', tag: 'Hülsenfrüchte', prioritaet: 2 },
  { name: 'rote linsen', tag: 'Hülsenfrüchte', prioritaet: 2 },
  { name: 'kichererbsen', tag: 'Hülsenfrüchte', prioritaet: 2 },
  { name: 'bohnen', tag: 'Hülsenfrüchte', prioritaet: 2 },
  { name: 'kidneybohnen', tag: 'Hülsenfrüchte', prioritaet: 2 },
  { name: 'schwarze bohnen', tag: 'Hülsenfrüchte', prioritaet: 2 },
  { name: 'erbsen', tag: 'Hülsenfrüchte', prioritaet: 2 },
  { name: 'edamame', tag: 'Hülsenfrüchte', prioritaet: 2 },

  // Getreide
  { name: 'quinoa', tag: 'Getreide', prioritaet: 2 },
  { name: 'couscous', tag: 'Getreide', prioritaet: 2 },
  { name: 'bulgur', tag: 'Getreide', prioritaet: 2 },
  { name: 'polenta', tag: 'Getreide', prioritaet: 2 },
  { name: 'dinkel', tag: 'Getreide', prioritaet: 2 },
  { name: 'gerste', tag: 'Getreide', prioritaet: 2 },
  { name: 'haferflocken', tag: 'Getreide', prioritaet: 2 },
  { name: 'hafer', tag: 'Getreide', prioritaet: 2 },
  { name: 'grieß', tag: 'Getreide', prioritaet: 2 },
  { name: 'grünkern', tag: 'Getreide', prioritaet: 2 },
  { name: 'amaranth', tag: 'Getreide', prioritaet: 2 },
  { name: 'hirse', tag: 'Getreide', prioritaet: 2 },
];
