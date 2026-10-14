import type { Tone } from '@/design/tokens';
import type { ClaimStatus, EvidenceStatus, ReceiptOutcome } from '@/lib/types';

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  timed_out: 'Timed out',
  pre_existing_failure: 'Already failing on base',
  skipped: 'Skipped',
  unavailable: 'Unavailable',
  inconclusive: 'Inconclusive',
};

export const CLAIM_LABEL: Record<ClaimStatus, string> = {
  confirmed: 'Confirmed',
  contradicted: 'Contradicted',
  unverifiable: 'Unverifiable',
};

export const OUTCOME_LABEL: Record<ReceiptOutcome, string> = {
  verified: 'Verified',
  failed: 'Failed',
  partially_verified: 'Partially verified',
  unverified: 'Unverified',
};

export function evidenceTone(s: EvidenceStatus): Tone {
  switch (s) {
    case 'passed':
      return 'ok';
    case 'failed':
    case 'timed_out':
      return 'err';
    case 'pre_existing_failure':
    case 'inconclusive':
    case 'unavailable':
      return 'warn';
    default:
      return 'idle';
  }
}

export function claimTone(s: ClaimStatus): Tone {
  return s === 'confirmed' ? 'ok' : s === 'contradicted' ? 'err' : 'idle';
}

export function outcomeTone(o: ReceiptOutcome): Tone {
  return o === 'verified' ? 'ok' : o === 'failed' ? 'err' : o === 'partially_verified' ? 'warn' : 'idle';
}

export function testsLine(t?: { passed: number; total: number; unit: string; failed: number }): string {
  if (!t) return '';
  return `${t.passed}/${t.total} ${t.unit} passed`;
}
