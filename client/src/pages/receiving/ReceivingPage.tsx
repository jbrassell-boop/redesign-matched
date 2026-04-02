import { useState, useEffect, useCallback } from 'react';
import { getPendingArrivals, getReceivingStats } from '../../api/receiving';
import { ReceivingList } from './ReceivingList';
import { ReceivingDetailPane } from './ReceivingDetailPane';
import type { PendingArrival, ReceivingStats } from './types';

export const ReceivingPage = () => {
  const [arrivals, setArrivals] = useState<PendingArrival[]>([]);
  const [stats, setStats] = useState<ReceivingStats>({ totalPending: 0, overdue: 0, today: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [selectedArrival, setSelectedArrival] = useState<PendingArrival | null>(null);

  const loadArrivals = useCallback(async (s: string) => {
    setListLoading(true);
    try {
      const [data, st] = await Promise.all([
        getPendingArrivals(s || undefined),
        getReceivingStats(),
      ]);
      setArrivals(data);
      setStats(st);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadArrivals(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadArrivals]);

  const handleSelect = useCallback((a: PendingArrival) => {
    setSelectedKey(a.repairKey);
    setSelectedArrival(a);
  }, []);

  const handleReceived = useCallback(() => {
    loadArrivals(search);
  }, [loadArrivals, search]);

  const statChips = [
    { label: 'Total Pending', value: stats.totalPending, color: 'var(--primary)', bg: 'rgba(var(--primary-rgb), 0.08)' },
    { label: 'Overdue (14d+)', value: stats.overdue, color: 'var(--danger)', bg: 'rgba(var(--danger-rgb), 0.08)' },
    { label: 'Today', value: stats.today, color: 'var(--success)', bg: 'rgba(var(--success-rgb), 0.08)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Stat strip */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--neutral-200)',
        background: 'var(--card)', flexShrink: 0,
      }}>
        {statChips.map(chip => (
          <div key={chip.label} style={{
            flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            borderRight: '1px solid var(--neutral-100)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: chip.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: chip.color, fontSize: 13, fontWeight: 700,
            }}>{chip.value}</div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {chip.label}
            </span>
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{
          width: 320, flexShrink: 0,
          borderRight: '1px solid var(--neutral-200)',
          background: 'var(--card)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>Pending Arrivals</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{arrivals.length} records</span>
          </div>
          <ReceivingList
            arrivals={arrivals}
            loading={listLoading}
            selectedKey={selectedKey}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelect}
          />
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
          <ReceivingDetailPane
            arrival={selectedArrival}
            loading={false}
            onReceived={handleReceived}
          />
        </div>
      </div>
    </div>
  );
};
