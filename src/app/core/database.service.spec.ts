import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DatabaseService],
    });
    service = TestBed.inject(DatabaseService);
  });

  it('wird erfolgreich instanziiert', () => {
    expect(service).toBeTruthy();
  });

  it('wirft einen Fehler beim Zugriff auf connection vor init()', () => {
    expect(() => service.connection).toThrow(
      'DatabaseService: init() wurde noch nicht aufgerufen.',
    );
  });

  it('erkennt Nicht-Native-Plattform im Testumfeld (Web/Node)', () => {
    expect(service.isNative).toBe(false);
  });
});
