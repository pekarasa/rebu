import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { PortionSelectorComponent } from './portion-selector.component';

describe('PortionSelectorComponent', () => {
  let component: PortionSelectorComponent;
  let fixture: ComponentFixture<PortionSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortionSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortionSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('erzeugt die Komponente mit Standardwert 4 Portionen', () => {
    expect(component).toBeTruthy();
    expect(component.portion).toBe(4);
  });

  it('erhöht die Portionsanzahl beim Klick auf increase() und emittiert Event', () => {
    let emitted = 0;
    component.portionChange.subscribe((val) => (emitted = val));

    component.increase();

    expect(component.portion).toBe(5);
    expect(emitted).toBe(5);
  });

  it('verringert die Portionsanzahl beim Klick auf decrease() und emittiert Event', () => {
    let emitted = 0;
    component.portionChange.subscribe((val) => (emitted = val));

    component.decrease();

    expect(component.portion).toBe(3);
    expect(emitted).toBe(3);
  });

  it('verringert nicht unter das Minimum (Standard 1)', () => {
    component.portion = 1;
    let called = false;
    component.portionChange.subscribe(() => (called = true));

    component.decrease();

    expect(component.portion).toBe(1);
    expect(called).toBe(false);
  });

  it('erhöht nicht über das Maximum (Standard 99)', () => {
    component.portion = 99;
    let called = false;
    component.portionChange.subscribe(() => (called = true));

    component.increase();

    expect(component.portion).toBe(99);
    expect(called).toBe(false);
  });

  it('übernimmt Direkteingabe im gültigen Bereich', () => {
    let emitted = 0;
    component.portionChange.subscribe((val) => (emitted = val));

    const inputEl = document.createElement('input');
    inputEl.value = '8';
    const event = { target: inputEl } as unknown as Event;

    component.onInputChange(event);

    expect(component.portion).toBe(8);
    expect(emitted).toBe(8);
    expect(inputEl.value).toBe('8');
  });

  it('begrenzt Direkteingabe unter dem Minimum auf min', () => {
    let emitted = 0;
    component.portionChange.subscribe((val) => (emitted = val));

    const inputEl = document.createElement('input');
    inputEl.value = '0';
    const event = { target: inputEl } as unknown as Event;

    component.onInputChange(event);

    expect(component.portion).toBe(1);
    expect(emitted).toBe(1);
    expect(inputEl.value).toBe('1');
  });

  it('begrenzt Direkteingabe über dem Maximum auf max', () => {
    let emitted = 0;
    component.portionChange.subscribe((val) => (emitted = val));

    const inputEl = document.createElement('input');
    inputEl.value = '150';
    const event = { target: inputEl } as unknown as Event;

    component.onInputChange(event);

    expect(component.portion).toBe(99);
    expect(emitted).toBe(99);
    expect(inputEl.value).toBe('99');
  });

  it('setzt ungültige (NaN) Eingaben auf die bisherige Portionszahl zurück', () => {
    component.portion = 4;
    let called = false;
    component.portionChange.subscribe(() => (called = true));

    const inputEl = document.createElement('input');
    inputEl.value = 'abc';
    const event = { target: inputEl } as unknown as Event;

    component.onInputChange(event);

    expect(component.portion).toBe(4);
    expect(called).toBe(false);
    expect(inputEl.value).toBe('4');
  });

  it('zeigt im Template Einzahl "Portion" bei 1 und Mehrzahl "Portionen" bei >1', () => {
    fixture.componentRef.setInput('portion', 1);
    fixture.detectChanges();
    const unitEl = fixture.nativeElement.querySelector('.portion-unit');
    expect(unitEl?.textContent?.trim()).toBe('Portion');

    fixture.componentRef.setInput('portion', 2);
    fixture.detectChanges();
    expect(unitEl?.textContent?.trim()).toBe('Portionen');
  });
});
