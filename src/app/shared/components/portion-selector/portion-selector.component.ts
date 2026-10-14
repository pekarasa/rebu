import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-portion-selector',
  templateUrl: './portion-selector.component.html',
  styleUrls: ['./portion-selector.component.scss'],
  imports: [IonButton, IonIcon],
})
export class PortionSelectorComponent {
  @Input() portion = 4;
  @Input() min = 1;
  @Input() max = 99;
  @Input() showLabel = true;

  @Output() portionChange = new EventEmitter<number>();

  @ViewChild('numberInput') numberInput?: ElementRef<HTMLInputElement>;

  constructor() {
    addIcons({ addOutline, removeOutline });
  }

  decrease(): void {
    if (this.portion > this.min) {
      this.setPortion(this.portion - 1);
    }
  }

  increase(): void {
    if (this.portion < this.max) {
      this.setPortion(this.portion + 1);
    }
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const rawVal = parseInt(target.value, 10);

    if (isNaN(rawVal)) {
      // Ungültig -> zurücksetzen auf aktuellen Wert
      target.value = String(this.portion);
      return;
    }

    const clamped = Math.min(Math.max(rawVal, this.min), this.max);
    target.value = String(clamped);
    this.setPortion(clamped);
  }

  private setPortion(val: number): void {
    const clamped = Math.min(Math.max(val, this.min), this.max);
    if (clamped !== this.portion) {
      this.portion = clamped;
      this.portionChange.emit(this.portion);
    }
  }
}
