import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComputerTerminal01Icon,
  Robot01Icon,
  Search01Icon,
  SearchRemoveIcon,
} from '@hugeicons/core-free-icons';
import { Page } from '@/components/shell/Page';
import { useStartAgent } from '@/store/start-agent-dialog';
import { SessionRow } from '@/components/mission/SessionRow';
import { SessionPanel } from '@/components/mission/SessionPanel';
import { useSessions } from '@/hooks/useSessions';
import { Button, EmptyState, Icon, LoadingState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import {
  STATUS_LABEL,
  STATUS_ORDER,
  countByStatus,
  filterSessions,
  groupSessions,
} from '@/lib/mission';
import { plural } from '@/lib/format';
import { useNow } from '@/hooks/useNow';
import { useData } from '@/store/data';
import type { MissionView, SessionGroupBy, SessionStatusFilter } from '@/types';

const VIEW_KEY = 'csm.mission.view';

function loadView(): MissionView {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<MissionView>) : {};

    return { group: parsed.group ?? 'status', filter: parsed.filter ?? 'all' };
  } catch {
    return { group: 'status', filter: 'all' };
  }
}

export function MissionControl() {
  const sessions = useSessions();
  const now = useNow();
  const nav = useNavigate();
  const openStart = useStartAgent((s) => s.open);
  const loaded = useData((s) => s.loaded.runs);
  const error = useData((s) => s.errors.runs);
  const refresh = useData((s) => s.refresh);
  const [view, setView] = useState<MissionView>(loadView);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view));
    } catch {
      // nothing to do without storage
    }
  }, [view]);

  const counts = useMemo(() => countByStatus(sessions), [sessions]);

  const visible = useMemo(
    () => filterSessions(sessions, view.filter, query),
    [sessions, view.filter, query],
  );

  const groups = useMemo(() => groupSessions(visible, view.group), [visible, view.group]);
  const selected = selectedId ? sessions.find((s) => s.id === selectedId) : undefined;
  const finished = sessions.filter((s) => s.runId && !s.live);

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(undefined);
  }, [selectedId, selected]);

  const filters: SessionStatusFilter[] = [
    'all',
    ...STATUS_ORDER.filter((st) => counts[st] > 0 || st === view.filter),
  ];

  if (!loaded && !error) {
    return (
      <Page wide>
        <PageHeader
          title="Mission Control"
          subtitle="Every agent session CSM knows about, across projects, terminals and providers."
        />

        <LoadingState label="Reading sessions" />
      </Page>
    );
  }

  return (
    <Page wide>
      <PageHeader
        title="Mission Control"
        subtitle="Every agent session CSM knows about, across projects, terminals and providers."
        action={
          <div className="page__actions">
            {finished.length > 0 ? (
              <Button
                variant="ghost"
                onClick={() => finished.forEach((s) => void api.forgetRun(s.runId!))}
              >
                Clear finished
              </Button>
            ) : null}

            <Button variant="primary" onClick={() => openStart()}>
              Start agent
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mc-notice" role="alert">
          <span>
            The session list could not be refreshed and may be stale:{' '}
            <span className="selectable">{error}</span>
          </span>

          <Button size="sm" onClick={() => void refresh('runs')}>
            Retry
          </Button>
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState
          icon={Robot01Icon}
          title="No agent sessions"
          body="Start Claude, Codex, Gemini or Copilot from here, or run csm in a terminal; every session shows up in this list as soon as CSM sees it."
          action={
            <>
              <Button variant="primary" onClick={() => openStart()}>
                Start agent
              </Button>

              <Button icon={ComputerTerminal01Icon} onClick={() => nav('/terminal')}>
                Open terminal
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="mc-toolbar">
            <label className="mc-search">
              <Icon icon={Search01Icon} size="sm" />

              <input
                className="mc-search__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search project, task, account, branch…"
                spellCheck={false}
                aria-label="Search sessions"
              />

              {query ? (
                <button
                  className="mc-search__clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </label>

            <div className="segmented" role="radiogroup" aria-label="Status filter">
              {filters.map((f) => (
                <button
                  key={f}
                  role="radio"
                  aria-checked={view.filter === f}
                  className={`segmented__item ${view.filter === f ? 'segmented__item--active' : ''}`}
                  onClick={() => setView((v) => ({ ...v, filter: f }))}
                >
                  {f === 'all' ? 'All' : STATUS_LABEL[f]}

                  <span className="segmented__count">
                    {f === 'all' ? sessions.length : counts[f]}
                  </span>
                </button>
              ))}
            </div>

            <div className="select-wrap">
              <span className="mc-toolbar__label">Group</span>

              <select
                className="input input--sm"
                value={view.group}
                aria-label="Group by"
                onChange={(e) =>
                  setView((v) => ({ ...v, group: e.target.value as SessionGroupBy }))
                }
              >
                <option value="status">Status</option>
                <option value="project">Project</option>
                <option value="provider">Provider</option>
              </select>
            </div>
          </div>

          <div className={`mc-layout ${selected ? 'mc-layout--panel' : ''}`}>
            <div className="mc-list" role="table" aria-label="Agent sessions">
              {visible.length === 0 ? (
                <EmptyState
                  icon={SearchRemoveIcon}
                  title="Nothing matches"
                  body={
                    query
                      ? `No session matches “${query}”.`
                      : `No session is ${STATUS_LABEL[view.filter as Exclude<SessionStatusFilter, 'all'>].toLowerCase()} right now.`
                  }
                  action={
                    <Button
                      onClick={() => {
                        setQuery('');
                        setView((v) => ({ ...v, filter: 'all' }));
                      }}
                    >
                      Show all
                    </Button>
                  }
                />
              ) : (
                groups.map((g) => (
                  <section
                    key={g.key}
                    className={`mc-group mc-group--${view.group === 'status' ? g.key : 'plain'}`}
                  >
                    <header className="mc-group__head">
                      <span className="mc-group__title">{g.title}</span>
                      {g.meta ? <span className="mc-group__meta mono">{g.meta}</span> : null}

                      <span className="mc-group__count">
                        {plural(g.sessions.length, 'session')}
                      </span>
                    </header>

                    <div className="mc-rows">
                      {g.sessions.map((s) => (
                        <SessionRow
                          key={s.id}
                          session={s}
                          selected={s.id === selectedId}
                          now={now}
                          onSelect={setSelectedId}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>

            {selected ? (
              <SessionPanel
                key={selected.id}
                session={selected}
                now={now}
                onClose={() => setSelectedId(undefined)}
              />
            ) : null}
          </div>
        </>
      )}
    </Page>
  );
}
