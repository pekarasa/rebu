import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { SeasonService } from './season.service';

describe('SeasonService', () => {
  let service: SeasonService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeasonService],
    });
    service = TestBed.inject(SeasonService);
  });

  it('gibt alle 12 Monate zurück wenn keine Zutaten übergeben werden', () => {
    expect(service.calculateSaisonMonate([])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('gibt alle 12 Monate zurück wenn nur ganzjährige Zutaten enthalten sind', () => {
    const ingredients = [
      { name: 'Salz' },
      { name: 'Pfeffer' },
      { name: 'Olivenöl' },
      { name: 'Wasser' },
    ];
    const monate = service.calculateSaisonMonate(ingredients);
    expect(monate).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(service.isAllYear(monate)).toBe(true);
  });

  it('berechnet die Saison für eine einzelne saisonale Zutat (Spargel)', () => {
    const ingredients = [{ name: 'Frischer weißer Spargel' }, { name: 'Butter' }];
    const monate = service.calculateSaisonMonate(ingredients);
    expect(monate).toEqual([4, 5, 6]);
    expect(service.isAllYear(monate)).toBe(false);
  });

  it('berechnet die Schnittmenge bei mehreren saisonalen Zutaten', () => {
    // Spargel: [4, 5, 6]
    // Erdbeeren: [5, 6, 7, 8]
    // Schnittmenge: [5, 6]
    const ingredients = [{ name: 'Spargel' }, { name: 'Erdbeeren' }, { name: 'Zucker' }];
    const monate = service.calculateSaisonMonate(ingredients);
    expect(monate).toEqual([5, 6]);
  });

  it('gibt leeres Array zurück, wenn saisonale Zutaten keine gemeinsame Saison haben', () => {
    // Bärlauch: [3, 4, 5]
    // Kürbis: [9, 10, 11, 12]
    const ingredients = [{ name: 'Bärlauch' }, { name: 'Kürbis' }];
    const monate = service.calculateSaisonMonate(ingredients);
    expect(monate).toEqual([]);
    expect(service.isAllYear(monate)).toBe(false);
  });

  it('findSaisonForIngredient findet korrekte Saisondaten', () => {
    const match = service.findSaisonForIngredient('200g Erdbeeren gewaschen');
    expect(match).not.toBeNull();
    expect(match?.name).toBe('erdbeeren');

    const noMatch = service.findSaisonForIngredient('Wasser');
    expect(noMatch).toBeNull();
  });

  it('schließt verarbeitete Vorratszutaten wie Essig, Öl, Kerne und Marmelade aus', () => {
    expect(service.findSaisonForIngredient('1 EL Apfelessig')).toBeNull();
    expect(service.findSaisonForIngredient('2 EL Kürbiskernöl')).toBeNull();
    expect(service.findSaisonForIngredient('50g Kürbiskerne geröstet')).toBeNull();
    expect(service.findSaisonForIngredient('100g Erdbeermarmelade')).toBeNull();
    expect(service.findSaisonForIngredient('200ml Apfelsaft')).toBeNull();
    expect(service.findSaisonForIngredient('Walnussöl')).toBeNull();
  });

  it('erkennt frische Zutat auch wenn Vorratsbestandteil in derselben Zeile vorkommt', () => {
    const match = service.findSaisonForIngredient('2 Äpfel und 1 EL Apfelessig');
    expect(match).not.toBeNull();
    expect(match?.name).toBe('äpfel');
  });

  it('erkennt regionale Begriffe und Schweizer Synonyme korrekt', () => {
    expect(service.findSaisonForIngredient('3 Rüebli geschält')?.name).toBe('rüebli');
    expect(service.findSaisonForIngredient('2 Randen gekocht')?.name).toBe('randen');
    expect(service.findSaisonForIngredient('100g Nüsslisalat')?.name).toBe('nüsslisalat');
    expect(service.findSaisonForIngredient('1 Wirz gehobelt')?.name).toBe('wirz');
    expect(service.findSaisonForIngredient('200g Marroni heiß')?.name).toBe('marroni');
  });

  it('erkennt Singular- und Pluralformen zuverlässig', () => {
    expect(service.findSaisonForIngredient('1 Karotte')).not.toBeNull();
    expect(service.findSaisonForIngredient('3 Karotten')).not.toBeNull();
    expect(service.findSaisonForIngredient('1 Erbse')).not.toBeNull();
    expect(service.findSaisonForIngredient('200g Erbsen')).not.toBeNull();
  });

  it('prüft isIngredientSeasonal und getIngredientSaisonDisplay', () => {
    expect(service.isIngredientSeasonal('Spargel')).toBe(true);
    expect(service.isIngredientSeasonal('Wasser')).toBe(false);

    expect(service.getIngredientSaisonDisplay('Frischer Spargel')).toContain('Frühling');
    expect(service.getIngredientSaisonDisplay('Salz')).toBeNull();
  });
});
