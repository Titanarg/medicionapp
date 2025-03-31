// Definir tipos de moldes
export enum MoldType {
  CORTE = 'Corte',
  FORRO = 'Forro',
  OTRO = 'Otro',
}

// Interfaz para los objetos de molde
export interface Mold {
  id: number;
  contour: number[][]; // Puntos del contorno
  type: MoldType;
  multiplier: number;
  area: number; // Area en píxeles
  areaInCm2: number; // Area en cm²
}

// Interfaz para los resultados de medición
export interface MeasurementResults {
  byType: Record<string, TypeResults>;
  total: {
    count: number;
    totalArea: number;
    totalAreaWithMultiplier: number;
  };
}

export interface TypeResults {
  count: number;
  totalArea: number;
  totalAreaWithMultiplier: number;
} 