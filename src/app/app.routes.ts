import { Routes } from '@angular/router';

export const routes: Routes = [
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
    path: 'recipes',
    loadComponent: () =>
      import('./features/recipe-list/recipe-list.page').then((m) => m.RecipeListPage),
  },
  {
    path: 'home',
    redirectTo: 'recipes',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'recipes',
    pathMatch: 'full',
  },
];
