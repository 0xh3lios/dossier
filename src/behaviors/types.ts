import type { Question } from '../trials/answers.ts';
import type { BEHAVIOR_FORMAT, COLLECTION_FORMAT, REVIEW_FORMAT } from './formats.ts';

export interface CollectionRecord { format: typeof COLLECTION_FORMAT; behaviors: string[] }
export interface KnowledgePin { ref: string; revision: string }
export interface ClaimScope { level: 'model' | 'source' | 'deployment'; description: string; pins: KnowledgePin[] }
export type MappingTarget =
  | { kind: 'passage'; dossier: string; id: string; side: 'chart' | 'model' }
  | { kind: 'cell'; dossier: string; property: string; scenario: string }
  | { kind: 'walk'; dossier: string; id: string; scenario: string | null }
  | { kind: 'answer'; dossier: string; question: Question; check: string }
  | ({ kind: 'knowledge' } & KnowledgePin);
export interface Mapping { id: string; target: MappingTarget; relation: 'supports' | 'challenges' | 'illustrates'; rationale: string; limitations: string[] }
export interface Claim { id: string; kind: 'descriptive' | 'requirement'; statement: string; scope: ClaimScope; assumptions: string[]; mappings: Mapping[] }
export interface BehaviorRecord { format: typeof BEHAVIOR_FORMAT; id: string; title: string; claims: Claim[] }
export interface ParsedRecord<T> { record: T; body: string; text: string; sha256: string }
export interface RecordIssue { path: string; message: string }
export interface BehaviorCollection { collection: ParsedRecord<CollectionRecord> | null; behaviors: ParsedRecord<BehaviorRecord>[]; issues: RecordIssue[] }

export interface ReviewSubject { kind: 'behavior' | 'dossier'; dossier: string; behaviors: string[] }
// A subject behavior file's entry also binds its parts: each claim's digest, and the rest's.
export interface BehaviorParts { claims: Record<string, string>; explanation: string }
export interface ReviewBasisEntry { role: 'required' | 'additional'; root: 'dossiers' | 'knowledge'; path: string; sha256: string; claims?: Record<string, string>; explanation?: string }
export interface ReviewCoverage { examined: string[]; unexamined: { item: string; reason: string }[] }
export interface AssessmentReplacement { review: string; sha256: string; mappings: string[]; reason: string }
export type AssessmentResult = 'supported' | 'too-broad' | 'contradicted' | 'inconclusive';
export interface ReviewAssessment { mapping: string; result: AssessmentResult; rationale: string; limitations: string[] }
export interface ReviewRecord { format: typeof REVIEW_FORMAT; subject: ReviewSubject; basis: ReviewBasisEntry[]; coverage: ReviewCoverage; replaces: AssessmentReplacement[]; assessments: ReviewAssessment[] }
export interface RequiredBasis { files: ReviewBasisEntry[]; issues: string[] }
// `changed` names what of a current review's subject changed since it was written: claims, by
// `<behavior>/<claim>`, whose assessments are out of effect, and behaviors whose explanation changed.
export interface EvaluatedReview { file: string; record: ReviewRecord | null; body: string; sha256: string; status: 'current' | 'stale' | 'invalid'; reasons: string[]; changed: { claims: string[]; explanations: string[] } }
export interface EffectiveAssessment extends ReviewAssessment { review: string; reviewSha256: string }
export interface ReviewEvaluation { reviews: EvaluatedReview[]; assessments: EffectiveAssessment[]; dossierReviewed: boolean }
