import { useState, useEffect, useCallback } from 'react';
import { getPendingArrivals, getReceivingStats } from '../../api/receiving';
import { ReceivingList } from './ReceivingList';
import { ReceivingDetailPane } from './ReceivingDetailPane';
import type { PendingArrival, ReceivingStats } from './types';
import './ReceivingPage.css';

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
    <div className="recv-page">
      {/* Stat strip */}
      <div className="recv-stat-strip">
        {statChips.map(chip => (
          <div key={chip.label} className="recv-stat-chip">
            <div className="recv-stat-chip-icon" style={{ background: chip.bg, color: chip.color }}>{chip.value}</div>
            <span className="recv-stat-chip-label">{chip.label}</span>
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div className="recv-split">
        {/* Left panel */}
        <aside aria-label="Pending arrivals list" className="recv-aside">
          <div className="recv-aside-header">
            <h2 className="recv-aside-title">Pending Arrivals</h2>
            <span className="recv-aside-count" aria-live="polite">{arrivals.length} records</span>
          </div>
          <ReceivingList
            arrivals={arrivals}
            loading={listLoading}
            selectedKey={selectedKey}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelect}
          />
        </aside>

        {/* Right panel */}
        <section aria-label="Arrival details" className="recv-main">
          <ReceivingDetailPane
            arrival={selectedArrival}
            loading={false}
            onReceived={handleReceived}
          />
        </section>
      </div>
    </div>
  );
};
