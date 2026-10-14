import { useRef } from 'react';

export function SplitGutter({
  direction,
  onDrag,
}: {
  direction: 'row' | 'column';
  onDrag: (delta: number) => void;
}) {
  const start = useRef<{ pos: number; size: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();

    start.current = {
      pos: direction === 'row' ? e.clientX : e.clientY,
      size: direction === 'row' ? parent.width : parent.height,
    };

    const move = (ev: MouseEvent) => {
      if (!start.current) return;

      const now = direction === 'row' ? ev.clientX : ev.clientY;

      onDrag((now - start.current.pos) / start.current.size);
      start.current.pos = now;
    };

    const up = () => {
      start.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = direction === 'row' ? 'col-resize' : 'row-resize';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div
      className={`gutter gutter--${direction}`}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={direction === 'row' ? 'vertical' : 'horizontal'}
    />
  );
}
