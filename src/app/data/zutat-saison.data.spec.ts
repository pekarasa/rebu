import { describe, expect, it } from 'vitest';
import { ZUTAT_SAISON_DB } from './zutat-saison.data';

describe('ZUTAT_SAISON_DB', () => {
  it('enthält mindestens 50 Einträge für eine solide mitteleuropäische Abdeckung', () => {
    expect(ZUTAT_SAISON_DB.length).toBeGreaterThanOrEqual(50);
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

  it('Kürbis ist im Herbst verfügbar (Oktober–Dezember abgedeckt)', () => {
    const eintrag = ZUTAT_SAISON_DB.find((z) => z.name === 'kürbis');
    expect(eintrag).toBeDefined();
    expect(eintrag!.monate).toContain(10);
    expect(eintrag!.monate).toContain(11);
    expect(eintrag!.monate).toContain(12);
  });

  it('Spargel deckt April bis Juni ab', () => {
    const eintrag = ZUTAT_SAISON_DB.find((z) => z.name === 'spargel');
    expect(eintrag).toBeDefined();
    expect(eintrag!.monate).toEqual([4, 5, 6]);
  });

  it('Äpfel decken September bis November ab', () => {
    const eintrag = ZUTAT_SAISON_DB.find((z) => z.name === 'äpfel');
    expect(eintrag).toBeDefined();
    expect(eintrag!.monate).toContain(9);
    expect(eintrag!.monate).toContain(10);
    expect(eintrag!.monate).toContain(11);
  });

  it('enthält regionale und schweizer Synonyme (Rüebli, Randen, Nüsslisalat, Wirz, Marroni)', () => {
    const namen = new Set(ZUTAT_SAISON_DB.map((z) => z.name));
    expect(namen.has('rüebli')).toBe(true);
    expect(namen.has('randen')).toBe(true);
    expect(namen.has('nüsslisalat')).toBe(true);
    expect(namen.has('wirz')).toBe(true);
    expect(namen.has('marroni')).toBe(true);
  });

  it('enthält wichtige Singular- und Pluralformen gängiger Zutaten', () => {
    const namen = new Set(ZUTAT_SAISON_DB.map((z) => z.name));
    expect(namen.has('karotte') && namen.has('karotten')).toBe(true);
    expect(namen.has('möhre') && namen.has('möhren')).toBe(true);
    expect(namen.has('erbse') && namen.has('erbsen')).toBe(true);
    expect(namen.has('bohne') && namen.has('bohnen')).toBe(true);
    expect(namen.has('walnuss') && namen.has('walnüsse')).toBe(true);
  });
});
