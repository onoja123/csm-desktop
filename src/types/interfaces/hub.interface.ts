import type { DeliveryResult, DeliveryTone } from '../enums/hub.enum';

export interface HubWorkspace {
  id: string;
  name: string;
  role?: string;
}

export interface HubIntegration {
  id: string;
  kind: string;
  name: string;
  webhook_url: string;
  has_secret: boolean;
  last_delivery_at?: string;
  last_delivery_result?: DeliveryResult;
  last_event_at?: string;
}

export interface HubStatus {
  url: string;
  public: boolean;
  signed_in?: string;
  reachable: boolean;
  error?: string;
  workspace?: HubWorkspace;
  runner?: string;
  integrations: HubIntegration[];
  mappings: HubProjectMapping[];
  has_local_secret: boolean;
}

export interface HubSignin {
  url: string;
  email: string;
  public: boolean;
  workspaces: HubWorkspace[];
}

export interface HubSetup {
  workspace_id?: string;
  workspace_name?: string;
  project: string;
  repo: string;
  repository?: string;
  base_branch?: string;
}

export interface HubProjectMapping {
  source: string;
  project: string;
  repository: string;
  base_branch: string;
}

export interface HubSigninRequest {
  url: string;
  email: string;
  password: string;
  name?: string;
  create_account?: boolean;
}

export interface HubTestResult {
  ok: boolean;
  message: string;
}

export interface DeliveryHealth {
  tone: DeliveryTone;
  text: string;
}

export interface SentryConnectProps {
  connected: boolean;
  hubURL?: string;
  onSaved: () => void;
}
