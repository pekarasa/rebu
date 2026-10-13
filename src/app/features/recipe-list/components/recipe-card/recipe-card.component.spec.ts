import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoService } from '../../../../core/photo.service';
import { Kategorie } from '../../../../models/kategorie.enum';
import { Recipe } from '../../../../models/recipe.model';
import { RecipeCardComponent } from './recipe-card.component';

describe('RecipeCardComponent', () => {
  let component: RecipeCardComponent;
  let fixture: ComponentFixture<RecipeCardComponent>;
  let photoServiceMock: { getPhotoDisplayUrl: ReturnType<typeof vi.fn> };

  const mockRecipe: Recipe = {
    id: 'test-recipe-1',
    titel: 'Kürbis-Risotto',
    portionen: 4,
    zeitVorbereitung: 15,
    zeitKochen: 30,
    kategorie: Kategorie.Hauptgericht,
    notizen: 'Sehr lecker',
    fotoPath: 'recipe-photos/test.jpg',
    erstelltAm: '2026-10-01T10:00:00.000Z',
    geaendertAm: '2026-10-01T10:00:00.000Z',
    saisonMonate: [9, 10, 11],
    khTag: 'Reis',
    zutaten: [],
    schritte: [],
  };

  beforeEach(async () => {
    photoServiceMock = {
      getPhotoDisplayUrl: vi.fn().mockResolvedValue('data:image/jpeg;base64,mockphoto'),
    };

    await TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
      providers: [provideRouter([]), { provide: PhotoService, useValue: photoServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeCardComponent);
    component = fixture.componentInstance;
    component.recipe = mockRecipe;
  });

  it('erzeugt die Komponente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('zeigt den Rezepttitel an', () => {
    fixture.detectChanges();
    const titleEl = fixture.nativeElement.querySelector('.recipe-title');
    expect(titleEl.textContent.trim()).toBe('Kürbis-Risotto');
  });

  it('lädt und zeigt das Foto über den PhotoService an', async () => {
    component.recipe = mockRecipe;
    await component.updatePhotoUrl();
    fixture.detectChanges();

    expect(photoServiceMock.getPhotoDisplayUrl).toHaveBeenCalledWith('recipe-photos/test.jpg');
    const imgEl = fixture.nativeElement.querySelector('.recipe-image');
    expect(imgEl).not.toBeNull();
    expect(imgEl.getAttribute('src')).toBe('data:image/jpeg;base64,mockphoto');
  });

  it('zeigt einen Platzhalter an, wenn kein Foto vorhanden ist', async () => {
    component.recipe = {
      ...mockRecipe,
      fotoPath: null,
    };
    await component.updatePhotoUrl();
    fixture.detectChanges();

    const imgEl = fixture.nativeElement.querySelector('.recipe-image');
    const placeholderEl = fixture.nativeElement.querySelector('.photo-placeholder');
    expect(imgEl).toBeNull();
    expect(placeholderEl).not.toBeNull();
  });

  it('zeigt Badges für Saison, KH-Tag und Kategorie an', () => {
    fixture.detectChanges();
    const badges = fixture.nativeElement.querySelectorAll('app-badge');
    expect(badges.length).toBe(3); // Saison (Herbst), KH (Reis), Kategorie (Hauptgericht)

    const badgeTexts = Array.from(badges).map((b: unknown) =>
      (b as HTMLElement).textContent?.trim(),
    );
    expect(badgeTexts).toContain('Herbst');
    expect(badgeTexts).toContain('Reis');
    expect(badgeTexts).toContain(Kategorie.Hauptgericht);
  });

  it('zeigt Zeitaufwand an, wenn erfasst', () => {
    fixture.detectChanges();
    const timeOverlay = fixture.nativeElement.querySelector('.time-overlay');
    expect(timeOverlay).not.toBeNull();
    expect(timeOverlay.textContent).toContain('45 Min.');
  });

  it('verbirgt Zeitaufwand, wenn 0 oder null', () => {
    component.recipe = {
      ...mockRecipe,
      zeitVorbereitung: null,
      zeitKochen: null,
    };
    fixture.detectChanges();
    const timeOverlay = fixture.nativeElement.querySelector('.time-overlay');
    expect(timeOverlay).toBeNull();
  });

  it('emittiert cardClick beim Klick auf die Karte', () => {
    const emitSpy = vi.spyOn(component.cardClick, 'emit');
    fixture.detectChanges();

    component.onCardClicked();

    expect(emitSpy).toHaveBeenCalledWith(mockRecipe);
  });
});
