import { memo, useState, useMemo } from 'react';
import './SplitLayout.css';

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
}

export const SplitLayout = memo(({ left, right, leftWidth = 280 }: SplitLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const leftStyle = useMemo(() => collapsed ? undefined : { width: leftWidth }, [collapsed, leftWidth]);

  return (
    <div className="split-layout">
      <aside
        className={`split-layout__left${collapsed ? ' split-layout__left--collapsed' : ''}`}
        style={leftStyle}
        aria-label="List panel"
      >
        {left}
      </aside>
      <section className="split-layout__right" aria-label="Detail panel">
        {collapsed && (
          <button
            className="split-layout__collapse-btn"
            onClick={() => setCollapsed(false)}
            title="Expand panel"
          >
            &#9654;
          </button>
        )}
        {right}
      </section>
    </div>
  );
});
