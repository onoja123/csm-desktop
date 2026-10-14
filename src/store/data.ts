import { create } from 'zustand';
import { api } from '@/lib/api';
import { decodeBase64, outputBus } from '@/lib/output-bus';
import type { ApprovalsView, DataSection, DataState, RunsView } from '@/types';

const EMPTY_RUNS: RunsView = { runs: [], external: [] };
const EMPTY_APPROVALS: ApprovalsView = { pending: [], recent: [] };

// Refreshes coalesce so a burst of events costs one request per section.
const pending = new Map<DataSection, ReturnType<typeof setTimeout>>();

function schedule(section: DataSection, fn: () => void) {
  if (pending.has(section)) return;
  pending.set(
    section,
    setTimeout(() => {
      pending.delete(section);
      fn();
    }, 60),
  );
}

export const useData = create<DataState>((set, get) => ({
  accounts: [],
  runs: EMPTY_RUNS,
  sessions: [],
  handoffs: [],
  mcp: [],
  approvals: EMPTY_APPROVALS,
  activity: [],
  projects: [],
  builds: [],
  signals: [],
  buildStamps: {},
  loaded: {},
  errors: {},

  async refresh(section, arg) {
    const done = (patch: Partial<DataState>) =>
      set((s) => ({ ...patch, loaded: { ...s.loaded, [section]: true }, errors: { ...s.errors, [section]: undefined } }));

    try {
      switch (section) {
        case 'status':
          done({ status: await api.status() });
          break;
        case 'settings':
          done({ settings: await api.settings() });
          break;
        case 'accounts':
          done({ accounts: await api.accounts() });
          break;
        case 'runs':
          done({ runs: await api.runs() });
          break;
        case 'sessions':
          done({ sessions: await api.sessions() });
          break;
        case 'handoffs':
          done({ handoffs: await api.handoffs() });
          break;
        case 'mcp': {
          const project = arg ?? get().mcpProject;
          done({ mcp: await api.mcp(project), mcpProject: project });
          break;
        }
        case 'approvals':
          done({ approvals: await api.approvals() });
          break;
        case 'activity':
          done({ activity: await api.activity() });
          break;
        case 'projects':
          done({ projects: await api.projects() });
          break;
        case 'failover':
          done({ failover: await api.failover() });
          break;
        case 'builds':
          done({ builds: await api.builds() });
          break;
        case 'signals':
          done({ signals: await api.signals() });
          break;
      }
    } catch (e) {
      set((s) => ({ errors: { ...s.errors, [section]: (e as Error).message } }));
    }
  },

  async refreshAll() {
    const sections: DataSection[] = ['status', 'settings', 'accounts', 'runs', 'approvals', 'activity', 'sessions', 'handoffs', 'projects', 'failover', 'builds', 'signals'];
    await Promise.all(sections.map((s) => get().refresh(s)));
  },

  applyEvent(ev) {
    switch (ev.type) {
      case 'run.output': {
        outputBus.emit(ev.data.run_id, decodeBase64(ev.data.data));
        const at = new Date().toISOString();
        set((s) => ({ runs: { ...s.runs, runs: s.runs.runs.map((r) => (r.id === ev.data.run_id ? { ...r, last_output_at: at } : r)) } }));
        return [];
      }
      case 'run.exit':
        return ['runs', 'status'];
      case 'approval.requested':
        set((s) => ({ approvals: { ...s.approvals, pending: [...s.approvals.pending.filter((a) => a.id !== ev.data.id), ev.data] } }));
        return ['status'];
      case 'approval.resolved':
        set((s) => ({
          approvals: {
            pending: s.approvals.pending.filter((a) => a.id !== ev.data.id),
            recent: [ev.data, ...s.approvals.recent].slice(0, 20),
          },
        }));
        return ['status'];
      case 'activity':
        set((s) => ({ activity: [ev.data, ...s.activity.filter((a) => a.id !== ev.data.id)].slice(0, 500) }));
        return [];
      case 'accounts':
        return ['accounts', 'failover'];
      case 'runs':
        return ['runs', 'status', 'accounts'];
      case 'sessions':
        return ['sessions'];
      case 'handoffs':
        return ['handoffs'];
      case 'projects':
        return ['projects'];
      case 'status':
        return ['status', 'settings', 'failover'];
      case 'build':
        set((s) => ({ buildStamps: { ...s.buildStamps, [ev.data.id]: (s.buildStamps[ev.data.id] ?? 0) + 1 } }));
        return ['builds'];
      case 'signals':
        return ['signals'];
      default:
        return [];
    }
  },

  handleEvent(ev) {
    for (const section of get().applyEvent(ev)) {
      schedule(section, () => void get().refresh(section));
    }
  },
}));
