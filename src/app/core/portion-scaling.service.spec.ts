import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Ingredient } from '../models/ingredient.model';
import { PortionScalingService } from './portion-scaling.service';

describe('PortionScalingService', () => {
  let service: PortionScalingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortionScalingService],
    });
    service = TestBed.inject(PortionScalingService);
  });

  describe('scaleAmount', () => {
    it('skaliert Mengen proportional bei Vervierfachung', () => {
      expect(service.scaleAmount(100, 2, 8)).toBe(400);
    });

    it('skaliert Mengen proportional bei Halbierung', () => {
      expect(service.scaleAmount(500, 4, 2)).toBe(250);
    });

    it('rundet Nachkommastellen auf 2 Stellen kaufmännisch', () => {
      // 100 / 3 * 1 = 33.3333333333... -> 33.33
      expect(service.scaleAmount(100, 3, 1)).toBe(33.33);
      // 100 / 3 * 2 = 66.6666666666... -> 66.67
      expect(service.scaleAmount(100, 3, 2)).toBe(66.67);
    });

    it('gibt unveränderten Wert zurück, wenn basePortions === targetPortions', () => {
      expect(service.scaleAmount(250, 4, 4)).toBe(250);
    });

    it('gibt null zurück wenn baseAmount null oder undefined ist', () => {
      expect(service.scaleAmount(null, 4, 6)).toBeNull();
      expect(service.scaleAmount(undefined, 4, 6)).toBeNull();
    });

    it('gibt null zurück wenn baseAmount NaN ist', () => {
      expect(service.scaleAmount(Number.NaN, 4, 6)).toBeNull();
    });

    it('behandelt 0 als gültige Menge', () => {
      expect(service.scaleAmount(0, 4, 6)).toBe(0);
    });

    it('gibt baseAmount zurück wenn Portionen <= 0 sind (Fehlerprävention)', () => {
      expect(service.scaleAmount(200, 0, 4)).toBe(200);
      expect(service.scaleAmount(200, 4, 0)).toBe(200);
      expect(service.scaleAmount(200, -2, 4)).toBe(200);
      expect(service.scaleAmount(200, 4, -1)).toBe(200);
    });
  });

  describe('scaleIngredients', () => {
    const mockIngredients: Ingredient[] = [
      {
        id: '1',
        rezeptId: 'r1',
        reihenfolge: 0,
        menge: 400,
        einheit: 'g',
        name: 'Spaghetti',
      },
      {
        id: '2',
        rezeptId: 'r1',
        reihenfolge: 1,
        menge: 2,
        einheit: 'Stück',
        name: 'Eier',
      },
      {
        id: '3',
        rezeptId: 'r1',
        reihenfolge: 2,
        menge: null,
        einheit: '',
        name: 'Salz und Pfeffer',
      },
    ];

    it('skaliert alle Zutaten und erzeugt neue Instanzen (Unveränderlichkeit)', () => {
      const scaled = service.scaleIngredients(mockIngredients, 4, 2);

      expect(scaled).toHaveLength(3);
      // Original bleibt unverändert
      expect(mockIngredients[0].menge).toBe(400);

      // Skalierte Werte
      expect(scaled[0].menge).toBe(200);
      expect(scaled[1].menge).toBe(1);
      expect(scaled[2].menge).toBeNull();

      // Metadaten bleiben erhalten
      expect(scaled[0].name).toBe('Spaghetti');
      expect(scaled[0].einheit).toBe('g');
      expect(scaled[0].reihenfolge).toBe(0);
    });

    it('gibt ein leeres Array zurück bei leerem Input', () => {
      expect(service.scaleIngredients([], 4, 2)).toEqual([]);
    });
  });

  describe('formatAmount', () => {
    it('formatiert ganze Zahlen ohne Nachkommastellen', () => {
      expect(service.formatAmount(4)).toBe('4');
      expect(service.formatAmount(500)).toBe('500');
      expect(service.formatAmount(1000)).toBe('1000');
    });

    it('formatiert Dezimalzahlen mit deutschem Komma', () => {
      expect(service.formatAmount(1.5)).toBe('1,5');
      expect(service.formatAmount(0.25)).toBe('0,25');
      expect(service.formatAmount(33.33)).toBe('33,33');
    });

    it('formatiert 0 als "0"', () => {
      expect(service.formatAmount(0)).toBe('0');
    });

    it('gibt bei null, undefined oder NaN einen leeren String zurück', () => {
      expect(service.formatAmount(null)).toBe('');
      expect(service.formatAmount(undefined)).toBe('');
      expect(service.formatAmount(Number.NaN)).toBe('');
    });
  });
});
