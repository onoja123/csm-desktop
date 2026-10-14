import type { ProviderInfo } from '@/types';

export function limitations(info: ProviderInfo | undefined): string[] {
  const c = info?.capabilities;

  if (!info?.installed || !c) return [];

  const out: string[] = [];

  if (!c.interactive)
    out.push('This version lacks the profile login and session supervision CSM needs; upgrade it.');

  if (!c.account_switching)
    out.push(
      info.shared_login
        ? 'One sign-in per user: CSM manages a single account for it and cannot switch accounts.'
        : 'Accounts cannot be switched.',
    );

  if (!c.usage_limits)
    out.push(
      'Usage limits are not detected, so failover and automatic handoff never start from it.',
    );

  if (!c.handoff_context)
    out.push('Its sessions cannot be read; a handoff from it carries the repository state only.');

  if (!c.tasks)
    out.push('It takes no opening instruction, so it cannot run Build Room tasks or reviews.');

  if (!c.handoff_target) out.push('It cannot receive a handoff.');
  if (!c.session_resume) out.push('Its sessions cannot be resumed.');
  if (!c.mcp) out.push('CSM does not manage its MCP servers.');

  return out;
}

// Unknown capabilities allow the choice: the service still refuses a target that cannot take an instruction.
export function canReceiveHandoff(info: ProviderInfo | undefined): boolean {
  return info?.capabilities?.handoff_target ?? true;
}
