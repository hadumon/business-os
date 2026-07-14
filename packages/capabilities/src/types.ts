export interface MarketSignal {
  label: string;
  strength: number; // 0-1
}

export interface MarketResearch {
  topic: string;
  signals: MarketSignal[];
  problemStatement: string;
  painPoints: string[];
}

export interface Competitor {
  name: string;
  strength: number; // 0-1
  notes: string;
}

export interface CompetitorAnalysis {
  competitors: Competitor[];
}

export interface DemandValidation {
  demandScore: number; // 0-100
}

export interface OpportunityScore {
  score: number; // 0-100
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface PricingRecommendation {
  model: string;
  rationale: string;
}

export interface RiskItem {
  label: string;
  severity: "low" | "medium" | "high";
}

export interface RiskAnalysis {
  risks: RiskItem[];
}
