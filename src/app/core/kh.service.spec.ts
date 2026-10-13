import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { KhService } from './kh.service';

describe('KhService', () => {
  let service: KhService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KhService],
    });
    service = TestBed.inject(KhService);
  });

  it('gibt null zurück bei leerer Zutatenliste', () => {
    expect(service.calculateKhTag([])).toBeNull();
  });

  it('gibt null zurück wenn keine KH-Zutaten enthalten sind', () => {
    const ingredients = [
      { name: 'Rindersteak', menge: 400 },
      { name: 'Salat', menge: 150 },
      { name: 'Olivenöl', menge: 20 },
    ];
    expect(service.calculateKhTag(ingredients)).toBeNull();
  });

  it('erkennt einfache Pasta-Zutat', () => {
    const ingredients = [
      { name: 'Spaghetti', menge: 500 },
      { name: 'Tomatensauce', menge: 300 },
    ];
    expect(service.calculateKhTag(ingredients)).toBe('Pasta');
  });

  it('Priorität 1 schlägt Priorität 2 (Reis vor Mehl)', () => {
    const ingredients = [
      { name: 'Mehl (für die Soße)', menge: 50 }, // Prio 2 (Brot / Teig)
      { name: 'Basmatireis', menge: 200 }, // Prio 1 (Reis)
    ];
    expect(service.calculateKhTag(ingredients)).toBe('Reis');
  });

  it('bei gleicher Priorität gewinnt die Zutat mit der größeren Menge', () => {
    const ingredients = [
      { name: 'Kartoffeln', menge: 300 }, // Prio 1
      { name: 'Spaghetti', menge: 500 }, // Prio 1
    ];
    expect(service.calculateKhTag(ingredients)).toBe('Pasta');
  });

  it('bei gleicher Priorität und gleicher Menge gewinnt die erste Zutat', () => {
    const ingredients = [
      { name: 'Kartoffeln', menge: 400 }, // Prio 1
      { name: 'Spaghetti', menge: 400 }, // Prio 1
    ];
    expect(service.calculateKhTag(ingredients)).toBe('Kartoffeln');
  });

  it('Gnocchi werden als Kartoffeln klassifiziert', () => {
    const ingredients = [{ name: 'Gnocchi', menge: 400 }];
    expect(service.calculateKhTag(ingredients)).toBe('Kartoffeln');
  });
});
