import type { SandboxResult } from '@/types';

export function SandboxRunOutput({ title, r }: { title: string; r?: SandboxResult }) {
  if (!r) return null;

  return (
    <details className="build-check">
      <summary>
        <span className="build-check__name">{title}</span>
        <span className="muted">{r.sandboxed ? `sandbox · ${r.image ?? ''}` : r.runner}</span>

        <span className="muted mono">
          {r.error ? 'did not run' : r.timed_out ? 'timed out' : `exit ${r.exit_code}`}
        </span>
      </summary>

      <div className="build-check__body">
        <code className="selectable">{r.command.join(' ')}</code>
        {r.limits ? <p className="muted">{r.limits}</p> : null}
        {r.error ? <p className="form-error">{r.error}</p> : null}
        {r.output ? <pre className="code-block code-block--tall selectable">{r.output}</pre> : null}
      </div>
    </details>
  );
}
