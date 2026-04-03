import type { ComponentType } from 'react';
import type { WidgetInstance } from './widgetRegistry';
import './WidgetGrid.css';

interface WidgetGridProps {
  widgets: WidgetInstance[];
  editing: boolean;
  onRemoveWidget: (id: string) => void;
  widgetComponents: Record<string, ComponentType>;
}

export const WidgetGrid = ({ widgets, editing, onRemoveWidget, widgetComponents }: WidgetGridProps) => (
  <div className="widget-grid">
    {widgets.map(w => {
      const Comp = widgetComponents[w.id];
      if (!Comp) return null;
      return (
        <div
          key={w.id}
          className={`widget-slot widget-slot--span-${w.span}${editing ? ' widget-slot--editing' : ''}`}
        >
          {editing && (
            <button
              className="widget-slot__remove"
              onClick={() => onRemoveWidget(w.id)}
              title="Remove widget"
            >
              &times;
            </button>
          )}
          <Comp />
        </div>
      );
    })}
  </div>
);
