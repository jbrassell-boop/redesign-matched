import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Spin, message } from 'antd';
import { useParams } from 'react-router-dom';
import type { RepairDetail, RepairFull, RepairLineItem } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { CommandStrip } from './components/CommandStrip';
import { ScopeGlance } from './components/ScopeGlance';
import { DetailsTab } from './tabs/DetailsTab';
import { ScopeInTab } from './tabs/ScopeInTab';
import { OutgoingTab } from './tabs/OutgoingTab';
import { ExpenseTab } from './tabs/ExpenseTab';
import { WorkflowTab } from './tabs/WorkflowTab';
import { InspectionsTab } from './tabs/InspectionsTab';
import { FinancialsTab } from './tabs/FinancialsTab';
import { ScopeHistoryTab } from './tabs/ScopeHistoryTab';
import { StatusHistoryTab } from './tabs/StatusHistoryTab';
import { InlineEditor } from '../../components/common/InlineEditor';
import {
  updateRepairNotes, getRepairStatuses, updateRepairStatus,
  getRepairLineItems, getRepairScopeHistory, getRepairStatusHistory,
  getRepairFull,
} from '../../api/repairs';
import { getClientFlags } from '../../api/clients';
import type { RepairStatusOption } from '../../api/repairs';
import type { ClientFlag } from '../clients/types';
import { useTabBadges } from '../../hooks/useTabBadges';
import { useAlerts } from '../../hooks/useAlerts';
import { AlertBanner } from '../../components/common/AlertBanner';
import { evaluateRepair } from '../../components/common/alertsController';

interface RepairDetailPaneProps {
  detail?: RepairDetail | null;
  loading?: boolean;
  onNoteSaved?: (repairKey: number, notes: string) => void;
  onStatusChanged?: (repairKey: number) => void;
  cockpitMode?: boolean;
  repairKey?: number;
}

// Status flow: maps current status ID to next status ID (0 = end of workflow)
const STATUS_NEXT_MAP: Record<number, number> = {
  1:  6,   // Waiting on Inspection -> Waiting for Approved
  3:  6,   // In the Drying Room -> Waiting for Approved
  5:  6,   // Additional Evaluation -> Waiting for Approved
  6:  8,   // Waiting for Approved -> In Repair - Minor
  8:  21,  // In Repair - Minor -> QC
  9:  21,  // In Repair - Major -> QC
  11: 21,  // In Repair - Mid Level -> QC
  14: 21,  // Semi Rigid Repair -> QC
  15: 21,  // Special Rigid -> QC
  21: 10,  // QC -> Scheduled to Ship
  10: 0,   // Scheduled to Ship -> end
  12: 0,   // Scheduled to Ship Tomorrow -> end
  13: 0,   // Shipping Today or Tomorrow -> end
};

const BASE_TABS: TabDef[] = [
  { key: 'details',      label: 'Details' },
  { key: 'workflow',     label: 'Workflow' },
  { key: 'inspections',  label: 'Inspections' },
  { key: 'financials',   label: 'Financials' },
  { key: 'scopehistory', label: 'Scope History' },
  { key: 'statuslog',    label: 'Status Log' },
];

export const RepairDetailPane = ({ detail, loading, onNoteSaved, onStatusChanged, cockpitMode, repairKey: repairKeyProp }: RepairDetailPaneProps) => {
  const params = useParams<{ repairKey: string }>();
  const isCockpit = cockpitMode || !!params.repairKey;
  const resolvedKey = repairKeyProp ?? (params.repairKey ? parseInt(params.repairKey, 10) : null);

  const [activeTab, setActiveTab] = useState<'scope-in' | 'details' | 'outgoing' | 'expense' | 'workflow' | 'inspections' | 'financials' | 'scopehistory' | 'statuslog' | 'comments'>('details');
  const [lineItems, setLineItems] = useState<RepairLineItem[]>([]);
  const [statuses, setStatuses] = useState<RepairStatusOption[]>([]);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Cockpit-specific state
  const [fullRepair, setFullRepair] = useState<RepairFull | null>(null);
  const [flags, setFlags] = useState<ClientFlag[]>([]);
  const [cockpitLoading, setCockpitLoading] = useState(false);

  // Load cockpit data
  useEffect(() => {
    if (!isCockpit || !resolvedKey) return;
    setCockpitLoading(true);
    Promise.all([
      getRepairFull(resolvedKey),
      getRepairStatuses(),
    ]).then(([repair, sts]) => {
      setFullRepair(repair);
      setStatuses(sts);
      // Load secondary data
      const promises: Promise<void>[] = [];
      if (repair.clientKey) {
        promises.push(
          getClientFlags(repair.clientKey).then(setFlags).catch(() => {}),
        );
      }
      promises.push(
        getRepairLineItems(resolvedKey).then(setLineItems).catch(() => {}),
      );
      return Promise.all(promises);
    }).catch(() => {}).finally(() => setCockpitLoading(false));
  }, [isCockpit, resolvedKey]);

  const rk = isCockpit ? (fullRepair?.repairKey ?? 0) : (detail?.repairKey ?? 0);
  const badgeCounts = useTabBadges(
    rk ? {
      workflow: () => getRepairLineItems(rk),
      scopehistory: () => getRepairScopeHistory(rk),
      statuslog: () => getRepairStatusHistory(rk),
    } : {},
    [rk],
  );

  const tabs = useMemo<TabDef[]>(
    () => BASE_TABS.map(t => ({ ...t, badge: badgeCounts[t.key] ?? null })),
    [badgeCounts],
  );

  // Smart alerts
  const { alerts, setAll: setAlerts, dismiss: dismissAlert } = useAlerts();
  useEffect(() => {
    const src = isCockpit ? fullRepair : detail;
    if (!src) { setAlerts([]); return; }
    setAlerts(evaluateRepair({
      amountApproved: src.amountApproved,
      isUrgent: src.isUrgent,
      daysIn: src.daysIn,
    }));
  }, [isCockpit ? fullRepair : detail, setAlerts]);

  // Load statuses once (non-cockpit mode)
  useEffect(() => {
    if (!isCockpit) {
      getRepairStatuses().then(setStatuses).catch(() => {});
    }
  }, [isCockpit]);

  // Close status menu on outside click
  useEffect(() => {
    if (!statusMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [statusMenuOpen]);

  const currentStatusId = isCockpit ? (fullRepair?.statusId ?? 0) : (detail?.statusId ?? 0);
  const currentStatus = isCockpit ? (fullRepair?.status ?? '') : (detail?.status ?? '');

  const handleAdvance = useCallback(async () => {
    const nextId = STATUS_NEXT_MAP[currentStatusId];
    if (nextId === undefined) {
      message.warning(`No next stage for: ${currentStatus}`);
      return;
    }
    if (nextId === 0) {
      message.info('Workflow complete — this repair is ready to ship');
      return;
    }
    try {
      await updateRepairStatus(rk, nextId);
      const nextName = statuses.find(s => s.statusId === nextId)?.statusName ?? `Status #${nextId}`;
      message.success(`Advanced to: ${nextName}`);
      onStatusChanged?.(rk);
      if (isCockpit && resolvedKey) {
        getRepairFull(resolvedKey).then(setFullRepair).catch(() => {});
      }
    } catch {
      message.error('Failed to advance status');
    }
  }, [currentStatusId, currentStatus, rk, statuses, onStatusChanged, isCockpit, resolvedKey]);

  const handleSetStatus = useCallback(async (statusId: number) => {
    setStatusMenuOpen(false);
    try {
      await updateRepairStatus(rk, statusId);
      const name = statuses.find(s => s.statusId === statusId)?.statusName ?? '';
      message.success(`Status changed to: ${name}`);
      onStatusChanged?.(rk);
      if (isCockpit && resolvedKey) {
        getRepairFull(resolvedKey).then(setFullRepair).catch(() => {});
      }
    } catch {
      message.error('Failed to change status');
    }
  }, [rk, statuses, onStatusChanged, isCockpit, resolvedKey]);

  const handleNoteSave = useCallback(async (notes: string) => {
    try {
      await updateRepairNotes(rk, notes);
      message.success('Note saved');
      onNoteSaved?.(rk, notes);
    } catch {
      message.error('Failed to save note');
      throw new Error('save failed');
    }
  }, [rk, onNoteSaved]);

  const hasNext = STATUS_NEXT_MAP[currentStatusId] !== undefined && STATUS_NEXT_MAP[currentStatusId] !== 0;
  const nextStatusName = hasNext
    ? statuses.find(s => s.statusId === STATUS_NEXT_MAP[currentStatusId])?.statusName ?? null
    : null;

  // ── COCKPIT MODE ──
  if (isCockpit) {
    if (cockpitLoading) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
    }
    if (!fullRepair) {
      return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Repair not found</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <CommandStrip repair={fullRepair} />
        <ScopeGlance repair={fullRepair} flags={flags} />

        {/* Tab bar */}
        <div style={{
          background: '#fff', borderBottom: '2px solid var(--border)',
          display: 'flex', padding: '0 14px', flexShrink: 0,
        }}>
          {([
            { key: 'scope-in', label: '1 — Scope In' },
            { key: 'details',  label: '2 — Details' },
            { key: 'outgoing', label: '3 — Outgoing' },
            { key: 'expense',  label: '4 — Expense' },
          ] as const).map(t => (
            <div
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '9px 18px',
                fontSize: 12, fontWeight: 600,
                color: activeTab === t.key ? 'var(--primary)' : 'var(--muted)',
                borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'scope-in' && <ScopeInTab repair={fullRepair} />}
          {activeTab === 'details'  && <DetailsTab repair={fullRepair} flags={flags} />}
          {activeTab === 'outgoing' && <OutgoingTab repair={fullRepair} items={lineItems} />}
          {activeTab === 'expense'  && <ExpenseTab repairKey={fullRepair.repairKey} />}
        </div>
      </div>
    );
  }

  // ── LEGACY SPLIT-PANE MODE ──
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Select a repair to view details</div>;

  const tatColor = detail.daysIn > 14 ? 'var(--danger)' : detail.daysIn > 7 ? 'var(--amber)' : 'var(--muted)';

  const detailsContent = (
    <div style={{ padding: '16px 20px' }}>
      <FormGrid cols={2}>
        <Field label="Client" value={detail.client} />
        <Field label="Department" value={detail.dept} />
        <Field label="Scope Type" value={detail.scopeType} />
        <Field label="Serial #" value={detail.serial} />
        <Field label="Date In" value={detail.dateIn} />
        <Field label="Technician" value={detail.tech} />
        <Field label="Date Approved" value={detail.dateApproved} />
        <Field label="Est. Delivery" value={detail.estDelivery} />
        <Field label="Approved Amount" value={detail.amountApproved != null ? `$${detail.amountApproved.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null} />
        <Field label="Invoice #" value={detail.invoiceNumber} />
        <Field label="Ship Date" value={detail.shipDate} />
        <Field label="Tracking #" value={detail.trackingNumber} />
      </FormGrid>

      {detail.complaint && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Complaint / Description</div>
          <div style={{ fontSize: 13, color: 'var(--text)', padding: '8px 10px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, whiteSpace: 'pre-wrap' }}>{detail.complaint}</div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
        <InlineEditor
          value={detail.notes ?? ''}
          onSave={handleNoteSave}
          placeholder="Click to add note..."
          multiline
        />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={detail.wo}
        badges={
          <>
            <StatusBadge status={detail.status} />
            {detail.isUrgent && <StatusBadge status="URGENT" variant="red" />}
          </>
        }
        meta={<span style={{ color: tatColor }}>TAT: {detail.daysIn}d</span>}
      />

      <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

      {/* Quick Actions Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
        borderBottom: '1px solid var(--neutral-200)', background: 'var(--neutral-50)',
      }}>
        {hasNext && (
          <button
            onClick={handleAdvance}
            style={{
              height: 28, padding: '0 12px', border: 'none', borderRadius: 5,
              background: 'var(--primary)', color: 'var(--card)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {nextStatusName ?? 'Next Stage'}
          </button>
        )}

        {/* Status dropdown */}
        <div ref={statusMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            style={{
              height: 28, padding: '0 10px', border: '1px solid var(--neutral-200)',
              borderRadius: 5, background: 'var(--card)', color: 'var(--muted)',
              fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            Change Status
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {statusMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: 'var(--card)', border: '1px solid var(--neutral-200)',
              borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              minWidth: 200, maxHeight: 300, overflowY: 'auto', zIndex: 100,
            }}>
              {statuses.map(s => (
                <div
                  key={s.statusId}
                  onClick={() => handleSetStatus(s.statusId)}
                  style={{
                    padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                    color: s.statusId === detail.statusId ? 'var(--primary)' : 'var(--text)',
                    fontWeight: s.statusId === detail.statusId ? 700 : 400,
                    background: s.statusId === detail.statusId ? 'var(--primary-light)' : undefined,
                    borderBottom: '1px solid var(--neutral-100)',
                  }}
                  onMouseEnter={e => { if (s.statusId !== detail.statusId) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                  onMouseLeave={e => { if (s.statusId !== detail.statusId) e.currentTarget.style.background = ''; }}
                >
                  {s.statusName}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar tabs={[...tabs, { key: 'comments', label: 'Comments' }]} activeKey={activeTab} onChange={k => setActiveTab(k as Parameters<typeof setActiveTab>[0])} />
      {activeTab === 'details'      && detailsContent}
      {activeTab === 'workflow'     && <WorkflowTab repairKey={detail.repairKey} />}
      {activeTab === 'inspections'  && <InspectionsTab repairKey={detail.repairKey} />}
      {activeTab === 'financials'   && <FinancialsTab repairKey={detail.repairKey} />}
      {activeTab === 'scopehistory' && <ScopeHistoryTab repairKey={detail.repairKey} currentRepairKey={detail.repairKey} />}
      {activeTab === 'statuslog'    && <StatusHistoryTab repairKey={detail.repairKey} />}
      {activeTab === 'comments'     && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Comments coming soon</div>}
    </div>
  );
};
