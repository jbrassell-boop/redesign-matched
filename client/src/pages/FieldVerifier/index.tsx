import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Progress, Tabs, Tag } from 'antd';
import { VerifierCard } from './VerifierCard';
import { DeveloperView } from './DeveloperView';
import { FIELD_VERIFIER_API, type FieldEntry, type ScreenRegistry } from '../../types/fieldRegistry';

export type { FieldEntry, ScreenRegistry };

const SCREEN_FILES: Record<string, string> = {
  'Dashboard': 'dashboard',
  'Clients': 'clients',
  'Departments': 'departments',
  'Repairs': 'repairs',
  'Inventory': 'inventory',
  'Contracts': 'contracts',
  'Onsite Services': 'onsite-services',
  'Product Sale': 'product-sale',
  'Financial': 'financial',
  'Suppliers': 'suppliers',
  'Scope Model': 'scope-model',
};

function getScreenStatus(fields: FieldEntry[]): 'green' | 'amber' | 'gray' {
  if (fields.length === 0) return 'gray';
  if (fields.every(f => f.status === 'confirmed')) return 'green';
  if (fields.some(f => f.status === 'flagged')) return 'amber';
  return 'gray';
}

export function FieldVerifierPage() {
  const [screens, setScreens] = useState<ScreenRegistry[]>([]);
  const [activeScreen, setActiveScreen] = useState<string>('Dashboard');
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch(`${FIELD_VERIFIER_API}/registry`)
      .then(r => r.json())
      .then((data: ScreenRegistry[]) => {
        setScreens(data);
        setLoading(false);
      });
  }, []);

  // Navigate to screen + field from deep-link params (?screen=repairs&field=rep_status)
  useEffect(() => {
    if (screens.length === 0) return; // not loaded yet
    const screenParam = searchParams.get('screen'); // e.g. 'repairs'
    const fieldParam = searchParams.get('field');   // e.g. 'rep_status'
    if (!screenParam) return;

    // Find the display name that matches this slug
    const screenName = Object.entries(SCREEN_FILES).find(([, slug]) => slug === screenParam)?.[0];
    if (!screenName) return;

    setActiveScreen(screenName);
    if (fieldParam) {
      const screen = screens.find(s => s.screen === screenName);
      const idx = screen?.fields.findIndex(f => f.id === fieldParam) ?? -1;
      if (idx >= 0) setActiveFieldIndex(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screens]); // runs once screens array becomes non-empty

  const totalFields = screens.reduce((acc, s) => acc + s.fields.length, 0);
  const confirmedFields = screens.reduce(
    (acc, s) => acc + s.fields.filter(f => f.status === 'confirmed').length, 0
  );
  const overallPct = totalFields > 0 ? Math.round((confirmedFields / totalFields) * 100) : 0;

  const currentScreen = screens.find(s => s.screen === activeScreen);

  function handleFieldUpdate(updated: FieldEntry) {
    setScreens(prev =>
      prev.map(s =>
        s.screen === activeScreen
          ? { ...s, fields: s.fields.map(f => f.id === updated.id ? updated : f) }
          : s
      )
    );
    const fields = currentScreen?.fields ?? [];
    const nextIndex = fields.findIndex((f, i) => i > activeFieldIndex && f.status === 'unverified');
    setActiveFieldIndex(nextIndex >= 0 ? nextIndex : activeFieldIndex);
  }

  if (loading) return <div style={{ padding: 32 }}>Loading field registry...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', background: 'var(--neutral-100)' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: 'var(--card)', borderRight: '1px solid var(--border)', padding: '16px 0', overflowY: 'auto' }}>
        <div style={{ padding: '0 16px 12px', fontWeight: 700, fontSize: 13, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Field Verifier
        </div>
        {Object.keys(SCREEN_FILES).map(screenName => {
          const s = screens.find(x => x.screen === screenName);
          const fields = s?.fields ?? [];
          const confirmed = fields.filter(f => f.status === 'confirmed').length;
          const status = getScreenStatus(fields);
          const color = status === 'green' ? 'var(--success)' : status === 'amber' ? 'var(--amber)' : 'var(--muted)';
          return (
            <div
              key={screenName}
              onClick={() => { setActiveScreen(screenName); setActiveFieldIndex(0); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: activeScreen === screenName ? 'var(--primary-light)' : 'transparent',
                borderLeft: activeScreen === screenName ? '3px solid var(--navy)' : '3px solid transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <span style={{ color: activeScreen === screenName ? 'var(--navy)' : 'var(--text-near-black)' }}>{screenName}</span>
              <Tag style={{ fontSize: 10, padding: '0 5px', margin: 0, color, borderColor: color, background: 'transparent' }}>
                {confirmed}/{fields.length}
              </Tag>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top progress bar */}
        <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            Overall: {confirmedFields} / {totalFields} fields confirmed
          </div>
          <Progress percent={overallPct} strokeColor="var(--navy)" trailColor="var(--border)" showInfo size="small" />
        </div>

        {/* Tabs */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Tabs
            defaultActiveKey="verify"
            items={[
              {
                key: 'verify',
                label: 'Verifier',
                children: currentScreen && currentScreen.fields[activeFieldIndex] ? (
                  <VerifierCard
                    screenFile={SCREEN_FILES[activeScreen]}
                    field={currentScreen.fields[activeFieldIndex]}
                    fieldIndex={activeFieldIndex}
                    totalFields={currentScreen.fields.length}
                    onUpdate={handleFieldUpdate}
                    onNavigate={setActiveFieldIndex}
                  />
                ) : (
                  <div style={{ color: 'var(--muted)', padding: 32 }}>No fields for this screen.</div>
                ),
              },
              {
                key: 'developer',
                label: 'Developer View',
                children: <DeveloperView screens={screens} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
