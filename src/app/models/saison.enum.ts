export enum Saison {
  Fruehling = 'Frühling',
  Sommer = 'Sommer',
  Herbst = 'Herbst',
  Winter = 'Winter',
}

/** Gibt die aktuelle Saison basierend auf dem aktuellen Monat zurück. */
export function getCurrentSaison(): Saison {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return Saison.Fruehling;
  if (month >= 6 && month <= 8) return Saison.Sommer;
  if (month >= 9 && month <= 11) return Saison.Herbst;
  return Saison.Winter;
}

/** Gibt die Monate (1-12) zurück, die zu einer Saison gehören. */
export function getMonateForSaison(saison: Saison): number[] {
  switch (saison) {
    case Saison.Fruehling:
      return [3, 4, 5];
    case Saison.Sommer:
      return [6, 7, 8];
    case Saison.Herbst:
      return [9, 10, 11];
    case Saison.Winter:
      return [12, 1, 2];
  }
}

/** Gibt die Saison(en) zurück, zu der ein Monat gehört. */
export function getSaisonForMonat(monat: number): Saison {
  if (monat >= 3 && monat <= 5) return Saison.Fruehling;
  if (monat >= 6 && monat <= 8) return Saison.Sommer;
  if (monat >= 9 && monat <= 11) return Saison.Herbst;
  return Saison.Winter;
}

/**
 * Ermittelt den Anzeigenamen der Saison(en) für eine Liste von Monaten.
 * - Bei 12 Monaten (oder leer): "Ganzjährig"
 * - Sonst kommaseparierte Liste der beteiligten Saisons, z. B. "Herbst" oder "Sommer, Herbst".
 */
export function formatSaisonDisplay(saisonMonate: number[]): string {
  if (!saisonMonate || saisonMonate.length === 0 || saisonMonate.length === 12) {
    return 'Ganzjährig';
  }
  const seasons = new Set<Saison>();
  for (const m of saisonMonate) {
    seasons.add(getSaisonForMonat(m));
  }
  const orderedSaisons = [Saison.Fruehling, Saison.Sommer, Saison.Herbst, Saison.Winter].filter(
    (s) => seasons.has(s),
  );
  if (orderedSaisons.length === 0 || orderedSaisons.length === 4) {
    return 'Ganzjährig';
  }
  return orderedSaisons.join(', ');
}
