import { describe, expect, it } from 'vitest';
import { ZUTAT_KH_DB } from './zutat-kh.data';

const VALID_TAGS = ['Pasta', 'Reis', 'Kartoffeln', 'Brot / Teig', 'Hülsenfrüchte', 'Getreide'];

describe('ZUTAT_KH_DB', () => {
  it('enthält mindestens 20 Einträge', () => {
    expect(ZUTAT_KH_DB.length).toBeGreaterThanOrEqual(20);
  });

  it('alle Namen sind in Kleinschreibung', () => {
    for (const z of ZUTAT_KH_DB) {
      expect(z.name, `"${z.name}" ist nicht vollständig klein`).toBe(z.name.toLowerCase());
    }
  });

  it('alle Tags sind gültige KH-Tags', () => {
    for (const z of ZUTAT_KH_DB) {
      expect(VALID_TAGS).toContain(z.tag);
    }
  });

  it('alle Prioritäten sind 1 oder 2', () => {
    for (const z of ZUTAT_KH_DB) {
      expect([1, 2]).toContain(z.prioritaet);
    }
  });

  it('Pasta-Zutaten haben Priorität 1', () => {
    const pasta = ZUTAT_KH_DB.filter((z) => z.tag === 'Pasta');
    expect(pasta.length).toBeGreaterThan(0);
    pasta.forEach((z) => expect(z.prioritaet).toBe(1));
  });

  it('Reis-Zutaten haben Priorität 1', () => {
    const reis = ZUTAT_KH_DB.filter((z) => z.tag === 'Reis');
    expect(reis.length).toBeGreaterThan(0);
    reis.forEach((z) => expect(z.prioritaet).toBe(1));
  });

  it('"spaghetti" ist Pasta mit Priorität 1', () => {
    const eintrag = ZUTAT_KH_DB.find((z) => z.name === 'spaghetti');
    expect(eintrag).toBeDefined();
    expect(eintrag!.tag).toBe('Pasta');
    expect(eintrag!.prioritaet).toBe(1);
  });

  it('"quinoa" ist Getreide mit Priorität 2', () => {
    const eintrag = ZUTAT_KH_DB.find((z) => z.name === 'quinoa');
    expect(eintrag).toBeDefined();
    expect(eintrag!.tag).toBe('Getreide');
    expect(eintrag!.prioritaet).toBe(2);
  });
});
