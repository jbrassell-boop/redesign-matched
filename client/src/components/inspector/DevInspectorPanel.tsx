// client/src/components/inspector/DevInspectorPanel.tsx
import { Drawer, Spin } from 'antd';
import { useInspector } from '../../contexts/InspectorContext';
import { InspectorFieldDetail } from './InspectorFieldDetail';
import { SCREEN_FILES_REVERSE, type FieldEntry } from '../../types/fieldRegistry';

export function DevInspectorPanel() {
  const { enabled, toggle, activeScreen, registry, selectedFieldId, setSelectedFieldId, loading, error } = useInspector();

  const screen = activeScreen ? registry.find(s => s.screen === activeScreen) : null;
  const selectedField = screen?.fields.find(f => f.id === selectedFieldId) ?? null;
  const screenFile = activeScreen ? SCREEN_FILES_REVERSE[activeScreen] ?? activeScreen.toLowerCase() : '';

  return (
    <Drawer
      open={enabled}
      onClose={toggle}
      placement="right"
      width={420}
      mask={false}
      title={
        <span style={{ fontSize: 13, fontWeight: 700, color: '#00257A' }}>
          {selectedField ? selectedField.label : activeScreen ? `${activeScreen} Fields` : 'Dev Inspector'}
        </span>
      }
      styles={{ body: { padding: '16px 20px', overflowY: 'auto' } }}
      zIndex={500}
    >
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 48 }}>
          <Spin size="small" />
          <span style={{ fontSize: 13, color: '#8896AA' }}>Loading field registry…</span>
        </div>
      )}

      {error && (
        <div style={{ color: '#B71234', fontSize: 13, padding: 16 }}>{error}</div>
      )}

      {!loading && !error && !activeScreen && (
        <div style={{ color: '#8896AA', fontSize: 13 }}>
          Navigate to a portal screen to see its fields.
        </div>
      )}

      {!loading && !error && activeScreen && !screen && (
        <div style={{ color: '#8896AA', fontSize: 13 }}>
          No field registry found for <strong>{activeScreen}</strong>.
        </div>
      )}

      {!loading && !error && screen && !selectedField && (
        <FieldList
          fields={screen.fields}
          onSelect={setSelectedFieldId}
        />
      )}

      {!loading && !error && screen && selectedField && (
        <InspectorFieldDetail
          field={selectedField}
          screenFile={screenFile}
          onBack={() => setSelectedFieldId(null)}
        />
      )}
    </Drawer>
  );
}

function FieldList({ fields, onSelect }: { fields: FieldEntry[]; onSelect: (id: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 12 }}>
        {fields.length} registered field{fields.length !== 1 ? 's' : ''}
      </div>
      {fields.map(field => {
        const statusColor = field.status === 'confirmed' ? '#16A34A' : field.status === 'flagged' ? '#D97706' : '#8896AA';
        return (
          <div
            key={field.id}
            onClick={() => onSelect(field.id)}
            style={{
              padding: '9px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 4,
              border: '1px solid #DDE3EE',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EEF5FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {field.label}
              </div>
              <div style={{ fontSize: 11, color: '#8896AA', fontFamily: 'monospace', marginTop: 1 }}>
                {field.sqlTable}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              <code style={{ fontSize: 10, color: '#44697D' }}>{field.responseProperty}</code>
            </div>
          </div>
        );
      })}
    </div>
  );
}
