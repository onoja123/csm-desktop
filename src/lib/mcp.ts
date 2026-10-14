import type { MCPStatus, StatusTone } from '@/types';

export function mcpTone(status: MCPStatus, requiresAuth: boolean): StatusTone {
  if (requiresAuth || status === 'requires_auth') return 'warn';
  switch (status) {
    case 'available':
    case 'migrated':
      return 'ok';
    case 'failed':
      return 'err';
    case 'unsupported':
      return 'warn';
    default:
      return 'idle';
  }
}

export function mcpLabel(status: MCPStatus, requiresAuth: boolean): string {
  if (requiresAuth || status === 'requires_auth') return 'Authentication required';
  switch (status) {
    case 'available':
      return 'Configured';
    case 'migrated':
      return 'Carried over';
    case 'failed':
      return 'Failed';
    case 'unsupported':
      return 'Unsupported';
    default:
      return 'Unknown';
  }
}
