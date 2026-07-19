export type FeedbackClassification =
  | "approved"
  | "rejected"
  | "mixed"
  | "correction"
  | "neutral";

export type RuleLevel =
  | "observation"
  | "task"
  | "component"
  | "route"
  | "repository";

export type RuleScope =
  | "component"
  | "route"
  | "viewport"
  | "interaction"
  | "repository"
  | "temporary";

export interface ExtractedFeedback {
  classification: FeedbackClassification;
  objectiveIssues: string[];
  subjectivePreferences: string[];
  explicitConstraints: string[];
  rejectedPatterns: string[];
  acceptedPatterns: string[];
  componentRules: MemoryRule[];
  routeRules: MemoryRule[];
  repositoryRules: MemoryRule[];
  temporaryRules: MemoryRule[];
  confidence: number;
  needsUserConfirmation: boolean;
  sourceText: string;
  detectedComponent?: string;
  detectedRoute?: string;
  detectedViewport?: string;
}

export interface MemoryRule {
  id: string;
  level: RuleLevel;
  scope: RuleScope;
  text: string;
  tags: string[];
  component?: string;
  route?: string;
  viewport?: string;
  interaction?: string;
  confidence: number;
  occurrences: number;
  createdAt: string;
  updatedAt: string;
  supersededBy?: string;
  sourceFeedbackIds: string[];
  explicit: boolean;
}

export interface MemoryDecision {
  id: string;
  summary: string;
  approved: boolean;
  component?: string;
  route?: string;
  createdAt: string;
  evidence?: string[];
}

export interface MemoryIndex {
  version: number;
  rules: MemoryRule[];
  decisions: MemoryDecision[];
  antiPatterns: string[];
  preferences: Record<string, string>;
  updatedAt: string;
}

export interface RetrievalQuery {
  taskText?: string;
  files?: string[];
  components?: string[];
  routes?: string[];
  interactions?: string[];
  viewports?: string[];
  tags?: string[];
  maxRules?: number;
  maxAntiPatterns?: number;
  maxDecisions?: number;
  maxTokens?: number;
}

export interface RetrievedMemory {
  rules: MemoryRule[];
  antiPatterns: string[];
  decisions: MemoryDecision[];
  estimatedTokens: number;
  reasons: string[];
}

export interface VisualBaseline {
  id: string;
  route: string;
  viewport: string;
  state: string;
  selector?: string;
  path: string;
  approvedAt: string;
  approvedBy: string;
  hash: string;
}
