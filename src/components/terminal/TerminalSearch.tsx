import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Icon } from '@/components/ui';
import { handles } from './ShellTerminal';
import { useTerminal } from '@/terminal/store';

export function TerminalSearch() {
  const { searchOpen, setSearchOpen, activeTab } = useTerminal();
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const tab = activeTab();
  const handle = tab ? handles.get(tab.activePaneId) : undefined;

  useEffect(() => {
    if (searchOpen) input.current?.focus();
    else handle?.search.clearDecorations();
  }, [searchOpen, handle]);

  if (!searchOpen) return null;
  const opts = { caseSensitive, decorations: { matchBackground: '#3a3a3a', activeMatchBackground: '#7a7a76', matchOverviewRuler: '#7a7a76', activeMatchColorOverviewRuler: '#ededea' } };
  const next = () => handle?.search.findNext(query, opts);
  const prev = () => handle?.search.findPrevious(query, opts);

  return (
    <div className="term-search" role="search">
      <input
        ref={input}
        className="input input--sm mono"
        placeholder="Search output…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handle?.search.findNext(e.target.value, { ...opts, incremental: true });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.shiftKey ? prev : next)();
          if (e.key === 'Escape') setSearchOpen(false);
        }}
      />
      <button className={`term-search__btn ${caseSensitive ? 'term-search__btn--on' : ''}`} onClick={() => setCaseSensitive((v) => !v)} title="Match case">
        Aa
      </button>
      <button className="term-search__btn" onClick={prev} title="Previous (Shift+Enter)">
        <Icon icon={ChevronUp} size="sm" />
      </button>
      <button className="term-search__btn" onClick={next} title="Next (Enter)">
        <Icon icon={ChevronDown} size="sm" />
      </button>
      <button className="term-search__btn" onClick={() => setSearchOpen(false)} title="Close (Esc)">
        <Icon icon={X} size="sm" />
      </button>
    </div>
  );
}
