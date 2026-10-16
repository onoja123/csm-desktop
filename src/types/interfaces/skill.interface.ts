import type { ProviderID } from '../enums/agent.enum';
import type {
  SkillEntryStatus,
  SkillFindingLevel,
  SkillInspectionStatus,
  SkillLevel,
  SkillMode,
  SkillOrigin,
  SkillOutcomeStatus,
  SkillSeverity,
  SkillState,
} from '../enums/skill.enum';

export interface SkillFile {
  path: string;
  size: number;
  executable?: boolean;
  sha256: string;
}

export interface SkillManifest {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  allowed_tools?: string[];
  metadata?: Record<string, string>;
  extra?: Record<string, unknown>;
  features?: string[];
  files: SkillFile[];
  hash: string;
}

export interface SkillProblem {
  fatal: boolean;
  message: string;
}

export interface SkillFinding {
  severity: SkillSeverity;
  file: string;
  line?: number;
  message: string;
}

export interface SkillInspection {
  status: SkillInspectionStatus;
  findings?: SkillFinding[];
  scripts?: string[];
  binary?: string[];
}

export interface SkillSource {
  type: string;
  url?: string;
  repo?: string;
  path?: string;
  ref?: string;
  provider?: string;
}

export interface SkillRevision {
  hash: string;
  revision?: string;
  upstream?: string;
  at: string;
  note?: string;
}

export interface SkillProjection {
  provider: ProviderID;
  account?: string;
  scope: string;
  dir: string;
  hash: string;
  canonical: string;
  adapter?: string;
  adaptations?: string[];
  at: string;
}

export interface SkillUpstream {
  revision?: string;
  hash?: string;
  checked_at: string;
  error?: string;
}

export interface SkillCompat {
  provider: ProviderID;
  level: SkillLevel;
  reasons?: string[];
  adaptations?: string[];
  notes?: string[];
}

export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  revision?: string;
  hash: string;
  upstream_hash?: string;
  pinned?: boolean;
  license?: string;
  repo_license?: string;
  category?: string;
  tags?: string[];
  enabled: boolean;
  providers?: ProviderID[];
  global: boolean;
  projects?: string[];
  permissions_approved?: boolean;
  risk_accepted?: boolean;
  skill: SkillManifest;
  inspection: SkillInspection;
  problems?: SkillProblem[];
  projections?: SkillProjection[];
  history?: SkillRevision[];
  packs?: string[];
  facets?: Record<string, string>;
  upstream?: SkillUpstream;
  installed_at: string;
  updated_at: string;
  compatibility: SkillCompat[];
  placement_states: Record<string, string>;
  version: string;
}

export interface SkillPackRecord {
  id: string;
  version: string;
  members: string[];
  installed_at: string;
}

export interface SkillsView {
  skills: SkillRecord[];
  packs: SkillPackRecord[] | null;
}

export interface SkillSearchItem {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  source: string;
  installed: boolean;
  score?: number;
}

export interface SkillCatalogEntry {
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  commit: string;
  license?: string;
  repo_license?: string;
  files: number;
  scripts: number;
  problem?: string;
}

export interface SkillCatalogSource {
  repo: string;
  path?: string;
  note?: string;
}

export interface SkillCatalogView {
  results: SkillSearchItem[];
  entries: Record<string, SkillCatalogEntry>;
  fetched: Record<string, string>;
  sources: SkillCatalogSource[];
  errors: string[];
}

export interface SkillCandidate {
  id: string;
  dir?: string;
  source: SkillSource;
  revision?: string;
  skill?: SkillManifest;
  problems?: SkillProblem[];
  inspection: SkillInspection;
  repo_license?: string;
  error?: string;
}

export interface SkillCandidateView {
  candidate: SkillCandidate;
  compatibility: SkillCompat[];
  preview?: string;
}

export interface SkillListing {
  source: SkillSource;
  revision?: string;
  dirs: string[] | null;
  names?: Record<string, string>;
}

export interface SkillInspectView {
  listing: SkillListing;
  candidates: SkillCandidateView[];
  error?: string;
  limitation?: string;
}

export interface SkillInstallRequest {
  source: string;
  skills?: string[];
  all?: boolean;
  global: boolean;
  project_dir?: string;
  providers?: ProviderID[];
  pin?: boolean;
  replace?: boolean;
  keep_both?: boolean;
  accept_risk?: boolean;
  approve_permissions?: boolean;
}

export interface SkillOutcome {
  provider: ProviderID;
  account?: string;
  scope: string;
  dir?: string;
  status: SkillOutcomeStatus;
  detail?: string;
  level?: SkillLevel;
  adaptations?: string[];
}

export interface SkillInstallReport {
  id: string;
  name: string;
  action?: string;
  error?: string;
  placements?: SkillOutcome[];
  findings?: SkillFinding[];
  record?: SkillRecord;
}

export interface SkillInstallResult {
  reports: SkillInstallReport[];
}

export interface SkillPackInstallResult extends SkillInstallResult {
  pack: string;
  installed: string[] | null;
  failures: string[];
}

export interface SkillDetailView {
  record: SkillRecord;
  preview?: string;
  files?: SkillFile[];
  store_error?: string;
}

export interface SkillViewRoot {
  dir: string;
  scope: string;
  link?: string;
  exists: boolean;
  broken?: boolean;
}

export interface SkillViewEntry {
  name: string;
  dir?: string;
  scope: string;
  managed?: string;
  source?: string;
  version?: string;
  compatibility?: SkillLevel;
  status: SkillEntryStatus;
  detail?: string;
}

export interface SkillAgentView {
  provider: ProviderID;
  account?: string;
  profile?: string;
  roots: SkillViewRoot[];
  skills: SkillViewEntry[] | null;
}

export interface SkillDoctorFinding {
  level: SkillFindingLevel;
  label: string;
  detail?: string;
}

export interface SkillFileChange {
  path: string;
  change: string;
  diff?: string;
}

export interface SkillDiffView {
  dir: string;
  changes: SkillFileChange[];
}

export interface SkillPolicy {
  mode: SkillMode;
  defaults: string[];
  max_auto?: number;
  excluded?: Record<string, string[]> | null;
}

export interface SkillChoice {
  id: string;
  name: string;
  description: string;
  origin: SkillOrigin;
  reason: string;
  score?: number;
  compat: SkillCompat;
}

export interface SkillSkip {
  id?: string;
  name: string;
  reason: string;
}

export interface SkillConflict {
  facet: string;
  skills: string[];
  values: string[];
  project?: string;
  resolution: string;
  needs_decision?: boolean;
}

export interface SkillResolution {
  mode: SkillMode;
  selected: SkillChoice[] | null;
  recommended?: SkillChoice[];
  skipped?: SkillSkip[];
  conflicts?: SkillConflict[];
  missing?: string[];
}

export interface SkillResolveRequest {
  text: string;
  provider?: ProviderID;
  skills?: string[];
  mode?: SkillMode;
  project_dir?: string;
}

export interface SkillResolveView {
  result: SkillResolution;
  needs_decision: boolean;
}

export interface SkillEvidence {
  skill: string;
  provider: ProviderID;
  session?: string;
  kind: string;
  at?: string;
  detail?: string;
}

export interface SkillPlacement {
  provider: ProviderID;
  account?: string;
  state: SkillState;
  level?: SkillLevel;
  dir?: string;
  invoke?: string;
  request?: string;
  handoff?: boolean;
  adaptations?: string[];
  reasons?: string[];
  problem?: string;
  evidence?: SkillEvidence[];
  at: string;
}

export interface TaskSkill {
  id: string;
  name: string;
  description?: string;
  source: string;
  revision?: string;
  hash: string;
  license?: string;
  origin: SkillOrigin;
  reason?: string;
  state: SkillState;
  placements?: SkillPlacement[];
}

export interface SkillTaskEvent {
  at: string;
  provider?: string;
  skill?: string;
  kind: string;
  detail?: string;
}

export interface SkillTaskManifest {
  version?: number;
  mode?: SkillMode;
  task?: string;
  skills: TaskSkill[] | null;
  recommended?: SkillChoice[];
  skipped?: SkillSkip[];
  conflicts?: SkillConflict[];
  missing?: string[];
  observed?: SkillEvidence[];
  events?: SkillTaskEvent[];
  created_at?: string;
  updated_at?: string;
}

export interface SkillUpdatePlan {
  changes: SkillFileChange[] | null;
  local_changes?: string[];
  risk_increase?: boolean;
  new_permissions?: boolean;
  up_to_date: boolean;
  candidate: SkillCandidate;
}

export interface SkillUpdateReport {
  name: string;
  status: string;
  error?: string;
  plan?: SkillUpdatePlan;
  placements?: SkillOutcome[];
  upstream?: SkillUpstream;
}

export interface SkillActionRequest {
  id?: string;
  providers?: ProviderID[];
  global?: boolean;
  project_dir?: string;
  add_project?: boolean;
  dir?: string;
  keep_changed?: boolean;
  unpin?: boolean;
  accept_risk?: boolean;
}

export interface SkillActionResult {
  result?: unknown;
  placements?: SkillOutcome[];
}

export interface SkillPackMember {
  name: string;
  source: string;
  optional?: boolean;
  installed?: string;
}

export interface SkillPack {
  id: string;
  name: string;
  version: string;
  description: string;
  members: SkillPackMember[];
}

export interface SkillPacksView {
  packs: SkillPack[];
  disclaimer: string;
}

export interface SkillAgentInfo {
  provider: ProviderID;
  name: string;
  user_dirs?: string[];
  home_dirs?: string[];
  project_dirs?: string[];
  fields?: string[];
  variables?: string[];
  invoke?: string;
  request?: string;
  auto_select: boolean;
  scripts: boolean;
  evidence?: string;
  verified?: string;
  notes?: string;
}

export interface HandoffCarriedSkill {
  id?: string;
  name: string;
  version?: string;
  hash?: string;
  source?: string;
  origin?: string;
  from?: string;
  to?: string;
  level?: SkillLevel;
  adaptations?: string[];
  used?: string;
  use?: string;
  reason?: string;
}

export interface HandoffSkills {
  manifest?: string;
  source?: string;
  carried?: HandoffCarriedSkill[];
  not_carried?: HandoffCarriedSkill[];
  brief?: string;
}
