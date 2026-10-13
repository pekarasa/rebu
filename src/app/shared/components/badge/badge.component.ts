import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookmarkOutline,
  leafOutline,
  nutritionOutline,
  restaurantOutline,
  sparklesOutline,
  timeOutline,
} from 'ionicons/icons';

export type BadgeColor =
  'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'medium';

export type BadgeVariant = 'solid' | 'subtle';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  imports: [IonIcon],
})
export class BadgeComponent {
  @Input({ required: true }) label = '';
  @Input() icon?: string;
  @Input() color: BadgeColor = 'medium';
  @Input() variant: BadgeVariant = 'subtle';
  @Input() ariaLabel?: string;

  constructor() {
    addIcons({
      leafOutline,
      timeOutline,
      bookmarkOutline,
      restaurantOutline,
      sparklesOutline,
      nutritionOutline,
    });
  }
}
