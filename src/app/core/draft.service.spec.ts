import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DraftService, RecipeDraft } from './draft.service';
import { Kategorie } from '../models/kategorie.enum';

describe('DraftService', () => {
  let service: DraftService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [DraftService],
    });
    service = TestBed.inject(DraftService);
    await service.clearDraft();
    await service.clearDraft('recipe-123');
  });

  const sampleDraft: RecipeDraft = {
    recipeId: null,
    titel: 'Test Rezept',
    portionen: 4,
    zeitVorbereitung: 15,
    zeitKochen: 30,
    kategorie: Kategorie.Hauptgericht,
    notizen: 'Schmeckt lecker',
    fotoPath: null,
    zutaten: [{ menge: 250, einheit: 'g', name: 'Nudeln' }],
    schritte: [{ text: 'Nudeln kochen' }],
    updatedAt: '',
  };

  it('speichert und lädt einen Entwurf für ein neues Rezept', async () => {
    expect(await service.hasDraft()).toBe(false);

    await service.saveDraft(sampleDraft);

    expect(await service.hasDraft()).toBe(true);
    const loaded = await service.loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.titel).toBe('Test Rezept');
    expect(loaded?.portionen).toBe(4);
    expect(loaded?.zutaten.length).toBe(1);
    expect(loaded?.schritte.length).toBe(1);
    expect(loaded?.updatedAt).toBeTruthy();
  });

  it('speichert und lädt einen Entwurf für ein bestehendes Rezept getrennt von neuem Entwurf', async () => {
    const editDraft: RecipeDraft = {
      ...sampleDraft,
      recipeId: 'recipe-123',
      titel: 'Editiertes Rezept',
    };

    await service.saveDraft(sampleDraft);
    await service.saveDraft(editDraft);

    const loadedNew = await service.loadDraft();
    const loadedEdit = await service.loadDraft('recipe-123');

    expect(loadedNew?.titel).toBe('Test Rezept');
    expect(loadedEdit?.titel).toBe('Editiertes Rezept');
  });

  it('löscht einen Entwurf', async () => {
    await service.saveDraft(sampleDraft);
    expect(await service.hasDraft()).toBe(true);

    await service.clearDraft();
    expect(await service.hasDraft()).toBe(false);
    expect(await service.loadDraft()).toBeNull();
  });
});
