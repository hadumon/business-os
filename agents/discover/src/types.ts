export interface DiscoverInput {
  project: string;
  topic: string;
  author?: string;
}

export interface MarketSignal {
  label: string;
  strength: number; // 0-1
}

export interface Competitor {
  name: string;
  strength: number; // 0-1, relative market presence
  notes: string;
}

export interface RiskItem {
  label: string;
  severity: "low" | "medium" | "high";
}

/** The value threaded through every workflow node, growing at each stage. */
export interface DiscoverPipelineState {
  project: string;
  topic: string;
  author: string;

  // market-scan
  signals?: MarketSignal[];

  // problem-discovery
  problemStatement?: string;
  painPoints?: string[];

  // competitor-analysis
  competitors?: Competitor[];

  // demand-validation
  demandScore?: number; // 0-100

  // opportunity-score
  opportunityScore?: number; // 0-100

  // business-model
  businessModel?: string;

  // risk-analysis
  risks?: RiskItem[];

  // recommendation
  recommendation?: string;
}

export interface DiscoverOutput {
  artifactId: string;
  opportunityScore: number;
  recommendation: string;
}
