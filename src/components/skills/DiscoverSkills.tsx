import { useEffect, useState } from 'react';
import { Download04Icon, RefreshIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Button, EmptyState, LoadingState } from '@/components/ui';
import { SkillInstallDialog } from '@/components/skills/SkillInstallDialog';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import type { SkillCatalogView } from '@/types';

export function DiscoverSkills({ query }: { query: string }) {
  const [view, setView] = useState<SkillCatalogView>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('');
  const [installing, setInstalling] = useState<string>();
  const [registry, setRegistry] = useState(false);

  const load = async (refresh = false) => {
    setBusy(true);
    setError(undefined);

    try {
      setView(await api.skillCatalog(query, refresh, registry && !!query.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);

    return () => clearTimeout(t);
    // Search again whenever the query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, registry]);

  const fetched = Object.values(view?.fetched ?? {}).sort()[0];

  return (
    <div className="skill-discover">
      <div className="input-row skill-source">
        <input
          className="input input--sm mono"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Install from a folder, owner/repo/path, a GitHub URL or a .git URL"
          spellCheck={false}
          aria-label="Skill source"
        />

        <Button
          size="sm"
          icon={Download04Icon}
          disabled={!source.trim()}
          onClick={() => setInstalling(source.trim())}
        >
          Inspect
        </Button>

        <Button size="sm" icon={RefreshIcon} loading={busy} onClick={() => void load(true)}>
          Refresh catalog
        </Button>
      </div>

      <label className="skill-check">
        <input type="checkbox" checked={registry} onChange={(e) => setRegistry(e.target.checked)} />
        Also search the skills.sh registry. CSM installs its results from their own GitHub
        repositories, pinned to a commit, and ignores its install counts.
      </label>

      <p className="muted">
        The catalog lists the skills in {view?.sources.length ?? 0} public repositories, read from
        GitHub
        {fetched ? ` ${ago(fetched)}` : ''}. Results are ranked by how well they match your words;
        CSM shows no ratings or download counts.
      </p>

      {(view?.errors ?? []).map((e) => (
        <p key={e} className="form-error selectable">
          {e}
        </p>
      ))}

      {error ? <p className="form-error selectable">{error}</p> : null}
      {!view && !error ? <LoadingState label="Reading the catalog" /> : null}

      {view && view.results.length === 0 ? (
        <EmptyState
          icon={Search01Icon}
          title={query ? 'No skill matches' : 'The catalog is empty'}
          body={
            Object.keys(view.fetched).length === 0
              ? 'CSM could not read the catalog repositories. Installed skills still work offline.'
              : 'Try other words, or install from a source above.'
          }
        />
      ) : null}

      <div className="list">
        {(view?.results ?? []).map((it) => {
          const entry = view?.entries[it.id];

          return (
            <div key={it.id} className="skill-row skill-row--static">
              <span className="skill-row__top">
                <span className="skill-row__name">{it.name}</span>
                {it.installed ? <span className="tone-ok">installed</span> : null}
              </span>

              <span className="skill-row__desc">{it.description || entry?.problem}</span>

              <span className="skill-row__meta">
                <span className="mono">{it.source}</span>
                {entry?.license ? (
                  <span>{entry.license}</span>
                ) : entry?.repo_license ? (
                  <span>{entry.repo_license} (repository)</span>
                ) : null}
                {entry ? <span>{entry.files} files</span> : null}
                {entry?.scripts ? <span>{entry.scripts} scripts</span> : null}
              </span>

              {!it.installed && (entry || it.id.startsWith('skills.sh:')) ? (
                <Button
                  size="sm"
                  className="skill-row__action"
                  onClick={() =>
                    setInstalling(
                      entry ? `github.com/${entry.source.repo}/${entry.source.path ?? ''}` : it.id,
                    )
                  }
                >
                  Inspect
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <SkillInstallDialog
        source={installing ?? ''}
        open={!!installing}
        onClose={() => {
          setInstalling(undefined);
          void load();
        }}
      />
    </div>
  );
}
