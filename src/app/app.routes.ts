import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'recipes/new',
    loadComponent: () =>
      import('./features/recipe-edit/recipe-edit.page').then((m) => m.RecipeEditPage),
  },
  {
    path: 'recipes/:id/edit',
    loadComponent: () =>
      import('./features/recipe-edit/recipe-edit.page').then((m) => m.RecipeEditPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
