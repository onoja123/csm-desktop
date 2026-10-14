export type HandoffOutcomeStatus = 'starting' | 'complete' | 'partial' | 'failed';

export type TaskOrigin = 'user' | 'session' | 'none';

export type HandoffDelivery = 'opening_instruction' | 'file_only' | 'none';

export type HandoffCompleteness = 'complete' | 'partial';

export type HandoffPreviewMode = 'session' | 'checkpoint' | 'fresh' | 'none';
