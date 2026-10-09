export interface Ingredient {
  id: string;
  rezeptId: string;
  reihenfolge: number;
  menge: number | null;
  einheit: string;
  name: string;
}

export type IngredientCreate = Omit<Ingredient, 'id' | 'rezeptId'>;
