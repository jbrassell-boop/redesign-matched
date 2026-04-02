import { useState } from 'react';
import './SplitLayout.css';

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
}

export const SplitLayout = ({ left, right, leftWidth = 280 }: SplitLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="split-layout">
      <div
        className={`split-layout__left${collapsed ? ' split-layout__left--collapsed' : ''}`}
        style={!collapsed ? { width: leftWidth } : undefined}
      >
        {left}
      </div>
      <div className="split-layout__right">
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
      </div>
    </div>
  );
};
