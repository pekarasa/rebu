export interface Step {
  id: string;
  rezeptId: string;
  reihenfolge: number;
  text: string;
}

export type StepCreate = Omit<Step, 'id' | 'rezeptId'>;
