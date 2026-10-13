import { describe, expect, it } from 'vitest';
import {
  formatSaisonDisplay,
  getCurrentSaison,
  getMonateForSaison,
  getSaisonForMonat,
  Saison,
} from './saison.enum';

describe('Saison-Enum Hilfsfunktionen', () => {
  describe('getMonateForSaison', () => {
    it('liefert Monate 3–5 für Frühling', () => {
      expect(getMonateForSaison(Saison.Fruehling)).toEqual([3, 4, 5]);
    });
    it('liefert Monate 6–8 für Sommer', () => {
      expect(getMonateForSaison(Saison.Sommer)).toEqual([6, 7, 8]);
    });
    it('liefert Monate 9–11 für Herbst', () => {
      expect(getMonateForSaison(Saison.Herbst)).toEqual([9, 10, 11]);
    });
    it('liefert Monate 12, 1, 2 für Winter', () => {
      expect(getMonateForSaison(Saison.Winter)).toEqual([12, 1, 2]);
    });
  });

  describe('getSaisonForMonat', () => {
    it.each([
      [3, Saison.Fruehling],
      [4, Saison.Fruehling],
      [5, Saison.Fruehling],
      [6, Saison.Sommer],
      [7, Saison.Sommer],
      [8, Saison.Sommer],
      [9, Saison.Herbst],
      [10, Saison.Herbst],
      [11, Saison.Herbst],
      [12, Saison.Winter],
      [1, Saison.Winter],
      [2, Saison.Winter],
    ])('Monat %i → %s', (monat, erwartet) => {
      expect(getSaisonForMonat(monat)).toBe(erwartet);
    });
  });

  describe('getCurrentSaison', () => {
    it('gibt eine gültige Saison zurück', () => {
      const result = getCurrentSaison();
      expect(Object.values(Saison)).toContain(result);
    });
  });

  describe('formatSaisonDisplay', () => {
    it('liefert "Ganzjährig" für leere Liste oder alle 12 Monate', () => {
      expect(formatSaisonDisplay([])).toBe('Ganzjährig');
      expect(formatSaisonDisplay([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('Ganzjährig');
    });

    it('liefert "Sommer" für Sommermonate', () => {
      expect(formatSaisonDisplay([6, 7, 8])).toBe('Sommer');
    });

    it('liefert "Herbst" für Herbstmonate', () => {
      expect(formatSaisonDisplay([9, 10, 11])).toBe('Herbst');
    });

    it('kombiniert mehrere Saisons in chronologischer Reihenfolge', () => {
      expect(formatSaisonDisplay([8, 9])).toBe('Sommer, Herbst');
    });
  });
});
