export function NextSteps({ steps }: { steps: string[] }) {
  if (!steps.length)
    return (
      <p className="muted">
        No next steps recorded. Add them so the next agent knows where to start.
      </p>
    );

  return (
    <ol className="handoff-steps">
      {steps.map((s, i) => (
        <li key={i} className="selectable">
          {s}
        </li>
      ))}
    </ol>
  );
}
