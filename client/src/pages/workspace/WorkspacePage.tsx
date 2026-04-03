import { useState } from 'react';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import { WidgetGrid } from './WidgetGrid';
import { WidgetPicker } from './WidgetPicker';
import {
  WIDGET_REGISTRY, WIDGET_COMPONENTS, PRESETS,
  loadLayout, saveLayout,
  type WorkspaceLayout,
} from './widgetRegistry';

export const WorkspacePage = () => {
  const [layout, setLayout] = useState<WorkspaceLayout>(loadLayout);
  const [editing, setEditing] = useState(false);

  const handlePresetChange = (preset: string) => {
    const widgets = PRESETS[preset] ?? layout.widgets;
    const newLayout: WorkspaceLayout = { preset: preset as WorkspaceLayout['preset'], widgets };
    setLayout(newLayout);
    saveLayout(newLayout);
  };

  const handleRemoveWidget = (id: string) => {
    const newLayout: WorkspaceLayout = {
      preset: 'custom',
      widgets: layout.widgets.filter(w => w.id !== id),
    };
    setLayout(newLayout);
    saveLayout(newLayout);
  };

  const handleAddWidget = (id: string) => {
    const def = WIDGET_REGISTRY[id];
    if (!def) return;
    const newLayout: WorkspaceLayout = {
      preset: 'custom',
      widgets: [...layout.widgets, { id, span: def.defaultSpan }],
    };
    setLayout(newLayout);
    saveLayout(newLayout);
  };

  const handleToggleEdit = () => setEditing(e => !e);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--bg)' }}>
      <WorkspaceToolbar
        preset={layout.preset}
        editing={editing}
        onPresetChange={handlePresetChange}
        onToggleEdit={handleToggleEdit}
      />
      <WidgetGrid
        widgets={layout.widgets}
        editing={editing}
        onRemoveWidget={handleRemoveWidget}
        widgetComponents={WIDGET_COMPONENTS}
      />
      <WidgetPicker
        open={editing}
        currentWidgetIds={layout.widgets.map(w => w.id)}
        onAddWidget={handleAddWidget}
        onClose={() => setEditing(false)}
      />
    </div>
  );
};
