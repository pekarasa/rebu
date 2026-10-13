import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { getCurrentSaison, Saison } from '../models/saison.enum';
import {
  FilterPreferencesService,
  getDefaultFilterPreferences,
} from './filter-preferences.service';

describe('FilterPreferencesService', () => {
  let service: FilterPreferencesService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [FilterPreferencesService],
    });

    service = TestBed.inject(FilterPreferencesService);
    await service.resetFilterState();
  });

  it('gibt Standardwerte zurück, wenn noch nichts gespeichert ist', async () => {
    const state = await service.getFilterState();
    expect(state).toEqual({
      saison: getCurrentSaison(),
      khTag: null,
      sortierung: 'alphabetisch',
    });
  });

  it('speichert und lädt veränderten Filter-Zustand', async () => {
    await service.saveFilterState({
      saison: Saison.Sommer,
      khTag: 'Pasta',
      sortierung: 'zeitaufwand',
    });

    const state = await service.getFilterState();
    expect(state).toEqual({
      saison: Saison.Sommer,
      khTag: 'Pasta',
      sortierung: 'zeitaufwand',
    });
  });

  it('aktualisiert Filter-Zustand partiell', async () => {
    await service.saveFilterState({ khTag: 'Reis' });
    let state = await service.getFilterState();
    expect(state.khTag).toBe('Reis');
    expect(state.sortierung).toBe('alphabetisch');
    expect(state.saison).toBe(getCurrentSaison());

    await service.saveFilterState({ sortierung: 'neuste-zuerst' });
    state = await service.getFilterState();
    expect(state.khTag).toBe('Reis');
    expect(state.sortierung).toBe('neuste-zuerst');
  });

  it('setzt Filter-Zustand auf Standardwerte zurück', async () => {
    await service.saveFilterState({
      saison: 'alle',
      khTag: 'Kartoffeln',
      sortierung: 'neuste-zuerst',
    });

    const reset = await service.resetFilterState();
    expect(reset).toEqual(getDefaultFilterPreferences());

    const loaded = await service.getFilterState();
    expect(loaded).toEqual(getDefaultFilterPreferences());
  });
});
