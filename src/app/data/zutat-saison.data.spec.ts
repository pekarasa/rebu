import { describe, expect, it } from 'vitest';
import { ZUTAT_SAISON_DB } from './zutat-saison.data';

describe('ZUTAT_SAISON_DB', () => {
  it('enthält mindestens 10 Einträge', () => {
    expect(ZUTAT_SAISON_DB.length).toBeGreaterThanOrEqual(10);
  });

  it('alle Namen sind in Kleinschreibung', () => {
    for (const z of ZUTAT_SAISON_DB) {
      expect(z.name, `"${z.name}" ist nicht vollständig klein`).toBe(z.name.toLowerCase());
    }
  });

  it('alle Monate liegen im Bereich 1–12', () => {
    for (const z of ZUTAT_SAISON_DB) {
      for (const m of z.monate) {
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      }
    }
  });

  it('jeder Eintrag hat mindestens einen Monat', () => {
    for (const z of ZUTAT_SAISON_DB) {
      expect(z.monate.length).toBeGreaterThan(0);
    }
  });

  it('keine doppelten Namen', () => {
    const namen = ZUTAT_SAISON_DB.map((z) => z.name);
    const unique = new Set(namen);
    expect(unique.size).toBe(namen.length);
  });

  it('Erdbeeren sind im Sommer verfügbar (Juni–August)', () => {
    const eintrag = ZUTAT_SAISON_DB.find((z) => z.name === 'erdbeeren');
    expect(eintrag).toBeDefined();
    expect(eintrag!.monate).toContain(6);
    expect(eintrag!.monate).toContain(7);
    expect(eintrag!.monate).toContain(8);
  });

  it('Kürbis ist im Herbst verfügbar', () => {
    const eintrag = ZUTAT_SAISON_DB.find((z) => z.name === 'kürbis');
    expect(eintrag).toBeDefined();
    expect(eintrag!.monate).toContain(10);
  });
});
