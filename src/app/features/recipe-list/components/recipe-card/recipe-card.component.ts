import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookmarkOutline,
  leafOutline,
  nutritionOutline,
  restaurantOutline,
  timeOutline,
} from 'ionicons/icons';
import { PhotoService } from '../../../../core/photo.service';
import { Recipe } from '../../../../models/recipe.model';
import { formatSaisonDisplay } from '../../../../models/saison.enum';
import { BadgeColor, BadgeComponent } from '../../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  imports: [
    RouterLink,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    BadgeComponent,
  ],
})
export class RecipeCardComponent implements OnInit, OnChanges {
  private photoService = inject(PhotoService);
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) recipe!: Recipe;
  @Input() photoUrl?: string | null;
  @Output() cardClick = new EventEmitter<Recipe>();

  displayPhotoUrl: string | null = null;

  constructor() {
    addIcons({
      restaurantOutline,
      timeOutline,
      leafOutline,
      nutritionOutline,
      bookmarkOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.updatePhotoUrl();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['recipe'] || changes['photoUrl']) {
      await this.updatePhotoUrl();
    }
  }

  get totalMinutes(): number {
    return (this.recipe?.zeitVorbereitung ?? 0) + (this.recipe?.zeitKochen ?? 0);
  }

  get saisonLabel(): string {
    return formatSaisonDisplay(this.recipe?.saisonMonate ?? []);
  }

  get saisonColor(): BadgeColor {
    const label = this.saisonLabel;
    if (label.includes('Frühling')) return 'success';
    if (label.includes('Sommer')) return 'warning';
    if (label.includes('Herbst')) return 'warning';
    if (label.includes('Winter')) return 'tertiary';
    return 'medium';
  }

  onCardClicked(): void {
    this.cardClick.emit(this.recipe);
  }

  async updatePhotoUrl(): Promise<void> {
    if (this.photoUrl !== undefined) {
      this.displayPhotoUrl = this.photoUrl;
      this.cdr.markForCheck();
      return;
    }
    if (this.recipe?.fotoPath) {
      this.displayPhotoUrl = await this.photoService.getPhotoDisplayUrl(this.recipe.fotoPath);
    } else {
      this.displayPhotoUrl = null;
    }
    this.cdr.markForCheck();
  }
}
