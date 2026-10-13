import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    component = fixture.componentInstance;
  });

  it('erzeugt die Komponente', () => {
    component.label = 'Sommer';
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('zeigt das Label korrekt an', () => {
    component.label = 'Herbst';
    fixture.detectChanges();
    const labelEl = fixture.nativeElement.querySelector('.badge-label');
    expect(labelEl.textContent.trim()).toBe('Herbst');
  });

  it('wendet Farb- und Varianten-Klassen an', () => {
    component.label = 'Pasta';
    component.color = 'primary';
    component.variant = 'subtle';
    fixture.detectChanges();

    const badgeEl = fixture.nativeElement.querySelector('.app-badge');
    expect(badgeEl.classList.contains('badge-color-primary')).toBe(true);
    expect(badgeEl.classList.contains('badge-variant-subtle')).toBe(true);
  });

  it('rendert kein Icon, wenn kein Icon angegeben ist', () => {
    component.label = 'Pasta';
    fixture.detectChanges();
    const iconEl = fixture.nativeElement.querySelector('ion-icon');
    expect(iconEl).toBeNull();
  });

  it('rendert ein Icon, wenn eines angegeben ist', () => {
    component.label = 'Frühling';
    component.icon = 'leaf-outline';
    fixture.detectChanges();
    const iconEl = fixture.nativeElement.querySelector('ion-icon');
    expect(iconEl).not.toBeNull();
  });
});
