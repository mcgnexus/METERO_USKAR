export type RaifSeverity = "alta" | "media" | "baja";
export type RaifAlertType = "accionable" | "informativa";
export type RaifAlertState = "active" | "archived";

export interface RaifAlert {
  id: string;
  titulo: string;
  cultivo: string;
  zona: string;
  provincia: string;
  plaga: string;
  severidad: RaifSeverity;
  tipo: RaifAlertType;
  estado: RaifAlertState;
  resumen: string;
  medidas: string[];
  validaDesde: string;
  validaHasta: string;
  fuenteUrl: string;
  creado: string;
}

export type CrossRiskLevel = "muy_favorable" | "favorable" | "moderado" | "desfavorable" | "desconocido";

export interface RaifCrossEvaluation {
  plaga: string;
  riskLevel: CrossRiskLevel;
  explanation: string;
  factors: { label: string; value: string; favorable: boolean }[];
}

export interface RaifAlertsPayload {
  alerts: RaifAlert[];
  count: number;
  fetchedAt: string;
  source: "RAIF";
  zone: string;
  error?: string;
}
