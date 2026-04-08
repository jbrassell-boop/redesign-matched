import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Spin, message, Popconfirm } from 'antd';
import { useParams } from 'react-router-dom';
import type { RepairDetail, RepairFull, RepairLineItem, RepairInspections } from './types';
import { DiInspectionForm } from './forms/DiInspectionForm';
import { DiFlexibleForm } from './forms/DiFlexibleForm';
import { DiRigidForm } from './forms/DiRigidForm';
import { DiFlexibleDiagnosticForm } from './forms/DiFlexibleDiagnosticForm';
import { RequisitionForm } from './forms/RequisitionForm';
import { FinalInspectionForm } from './forms/FinalInspectionForm';
import { ReturnVerificationForm } from './forms/ReturnVerificationForm';
import { AmendmentForm } from './forms/AmendmentForm';
import { UpdateSlipForm } from './forms/UpdateSlipForm';
import { LoanerForm } from './forms/LoanerForm';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { CommandStrip } from './components/CommandStrip';
import { WorkflowPipeline } from './components/WorkflowPipeline';
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
import { NotesTab } from './tabs/NotesTab';
import { InlineEditor } from '../../components/common/InlineEditor';
import {
  updateRepairNotes, getRepairStatuses, updateRepairStatus,
  getRepairLineItems, getRepairScopeHistory, getRepairStatusHistory,
  getRepairFull, getRepairInspections, createDraftInvoice, patchRepairHeader,
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

// ── Extracted static styles (performance: avoid re-creating objects each render) ──
const repairCockpitContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' };
const repairQuickActionBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const repairLegacyQuickActionBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderBottom: '1px solid var(--neutral-200)', background: 'var(--neutral-50)' };
const repairDropdownMenuStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, marginTop: 4,
  background: 'var(--card)', border: '1px solid var(--neutral-200)',
  borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  minWidth: 220, maxHeight: 300, overflowY: 'auto', zIndex: 100,
};
const repairFormsDropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, marginTop: 4,
  background: 'var(--card)', border: '1px solid var(--neutral-200)',
  borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  minWidth: 240, zIndex: 100,
};
const repairFormsSectionHeaderStyle: React.CSSProperties = { padding: '6px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.06em', background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' };
const repairFormsSectionHeaderBorderTopStyle: React.CSSProperties = { ...repairFormsSectionHeaderStyle, borderTop: '1px solid var(--neutral-200)' };
const repairMenuItemStyle: React.CSSProperties = { padding: '9px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--text)', borderBottom: '1px solid var(--neutral-100)' };
const repairMenuItemStyle12: React.CSSProperties = { ...repairMenuItemStyle, fontSize: 12 };
const repairDropdownBtnStyle: React.CSSProperties = {
  height: 30, padding: '0 14px', border: '1px solid var(--neutral-200)',
  borderRadius: 5, background: 'var(--card)', color: 'var(--muted)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 5,
};
const repairLegacyDropdownBtnStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', border: '1px solid var(--neutral-200)',
  borderRadius: 5, background: 'var(--card)', color: 'var(--muted)',
  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 5,
};
const repairFieldLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 4 };
const repairCockpitTabBarStyle: React.CSSProperties = { background: 'var(--card)', borderBottom: '2px solid var(--border)', display: 'flex', padding: '0 16px', flexShrink: 0, overflowX: 'auto', gap: 2 };

const COCKPIT_TABS = [
  { key: 'scope-in', label: 'Scope In', group: 'intake' },
  { key: 'details',  label: 'Details',  group: 'intake' },
  { key: 'outgoing', label: 'Outgoing', group: 'process' },
  { key: 'expense',  label: 'Expense',  group: 'process' },
  { key: 'inspections', label: 'Inspections', group: 'process' },
  { key: 'financials', label: 'Financials', group: 'review' },
  { key: 'scopehistory', label: 'History', group: 'review' },
  { key: 'statuslog', label: 'Status Log', group: 'review' },
  { key: 'comments',  label: 'Notes',      group: 'review' },
] as const;

const INTERNAL_FORMS = [
  { key: 'di-inspection'  as const, label: 'D&I Camera (OM05-2)', title: 'Camera endoscope disassembly & inspection form' },
  { key: 'di-flexible'         as const, label: 'D&I Flexible (OM07-3)', title: 'Flexible endoscope disassembly & inspection form' },
  { key: 'di-flex-diagnostic'  as const, label: 'D&I Flex Diagnostic (OM05-1)', title: 'Flexible endoscope diagnostic disassembly & inspection form' },
  { key: 'di-rigid'            as const, label: 'D&I Rigid (OM05-3)', title: 'Rigid endoscope disassembly & inspection form' },
  { key: 'amendment'      as const, label: 'Amendment (OM07-9)', title: 'Repair order amendment form' },
  { key: 'update-slip'    as const, label: 'Update Slip (OM15-2)', title: 'Customer update communication slip' },
];

const CUSTOMER_FORMS = [
  { key: 'requisition'          as const, label: 'Requisition (OM07-2)', title: 'Customer repair requisition form' },
  { key: 'final-inspection'     as const, label: 'Final Inspection (OM10-2)', title: 'Final quality inspection report' },
  { key: 'return-verification'  as const, label: 'Return Verification (OM14-1)', title: 'Return shipment verification form' },
  { key: 'loaner'               as const, label: 'Loaner (OM17-1)', title: 'Loaner scope request and tracking form' },
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

  // Forms dropdown + overlay state
  const [formsMenuOpen, setFormsMenuOpen] = useState(false);
  const formsMenuRef = useRef<HTMLDivElement>(null);
  const [activeForm, setActiveForm] = useState<'di-inspection' | 'di-flexible' | 'di-flex-diagnostic' | 'di-rigid' | 'requisition' | 'final-inspection' | 'return-verification' | 'amendment' | 'update-slip' | 'loaner' | null>(null);

  // Cockpit-specific state
  const [headerExpanded, setHeaderExpanded] = useState(false);
  const [fullRepair, setFullRepair] = useState<RepairFull | null>(null);
  const [inspections, setInspections] = useState<RepairInspections | null>(null);
  const [flags, setFlags] = useState<ClientFlag[]>([]);
  const [cockpitLoading, setCockpitLoading] = useState(false);

  // Load cockpit data
  useEffect(() => {
    if (!isCockpit || !resolvedKey) return;
    let cancelled = false;
    setCockpitLoading(true);
    Promise.all([
      getRepairFull(resolvedKey),
      getRepairStatuses(),
    ]).then(([repair, sts]) => {
      if (cancelled) return;
      setFullRepair(repair);
      setStatuses(sts);
      // Load secondary data
      const promises: Promise<void>[] = [];
      if (repair.clientKey) {
        promises.push(
          getClientFlags(repair.clientKey).then(f => { if (!cancelled) setFlags(f); }).catch(() => { if (!cancelled) message.error('Failed to load client flags'); }),
        );
      }
      promises.push(
        getRepairLineItems(resolvedKey).then(li => { if (!cancelled) setLineItems(li); }).catch(() => { if (!cancelled) message.error('Failed to load repair line items'); }),
      );
      promises.push(
        getRepairInspections(resolvedKey).then(ins => { if (!cancelled) setInspections(ins); }).catch(() => { /* inspections may not exist for all repairs */ }),
      );
      return Promise.all(promises);
    }).catch(() => { if (!cancelled) message.error('Failed to load repair data'); }).finally(() => { if (!cancelled) setCockpitLoading(false); });
    return () => { cancelled = true; };
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
      let cancelled = false;
      getRepairStatuses().then(s => { if (!cancelled) setStatuses(s); }).catch(() => { if (!cancelled) message.error('Failed to load repair statuses'); });
      return () => { cancelled = true; };
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

  // Close forms menu on outside click
  useEffect(() => {
    if (!formsMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (formsMenuRef.current && !formsMenuRef.current.contains(e.target as Node)) {
        setFormsMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [formsMenuOpen]);

  const currentStatusId = isCockpit ? (fullRepair?.statusId ?? 0) : (detail?.statusId ?? 0);
  const currentStatus = isCockpit ? (fullRepair?.status ?? '') : (detail?.status ?? '');

  const handleAdvance = useCallback(async () => {
    const nextId = STATUS_NEXT_MAP[currentStatusId];
    if (nextId === undefined) {
      message.warning(`No next stage for: ${currentStatus}`);
      return;
    }
    if (nextId === 0) {
      // Shipping stage — prompt for tracking number
      const tracking = window.prompt('Enter tracking number (or leave blank to skip):');
      if (tracking === null) return; // cancelled
      if (tracking.trim()) {
        try {
          await patchRepairHeader(rk, { inboundTracking: tracking.trim() });
        } catch {
          message.error('Failed to save tracking number');
        }
      }
      // Auto-create draft invoice
      try {
        const inv = await createDraftInvoice(rk);
        message.success(`Draft invoice #${inv.invoiceKey} created`);
      } catch {
        // Invoice creation is optional — don't block the workflow
      }
      message.info('Workflow complete — repair shipped and invoiced');
      onStatusChanged?.(rk);
      if (isCockpit && resolvedKey) {
        getRepairFull(resolvedKey).then(setFullRepair).catch(() => { message.error('Failed to reload repair'); });
      }
      return;
    }
    try {
      await updateRepairStatus(rk, nextId);
      const nextName = statuses.find(s => s.statusId === nextId)?.statusName ?? `Status #${nextId}`;
      message.success(`Advanced to: ${nextName}`);
      onStatusChanged?.(rk);
      if (isCockpit && resolvedKey) {
        getRepairFull(resolvedKey).then(setFullRepair).catch(() => { message.error('Failed to reload repair'); });
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
        getRepairFull(resolvedKey).then(setFullRepair).catch(() => { message.error('Failed to reload repair'); });
      }
    } catch {
      message.error('Failed to change status');
    }
  }, [rk, statuses, onStatusChanged, isCockpit, resolvedKey]);

  const confirmAndSetStatus = useCallback((statusId: number) => {
    const name = statuses.find(s => s.statusId === statusId)?.statusName ?? '';
    if (window.confirm(`Change status to "${name}"?`)) {
      handleSetStatus(statusId);
    }
  }, [statuses, handleSetStatus]);

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
      <div style={repairCockpitContainerStyle}>
        <WorkflowPipeline currentStatus={fullRepair.status} />

        {/* Condensed header: summary line + collapsible details */}
        <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '5px 14px', flexShrink: 0 }}>
          <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            Repair {fullRepair.wo}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--navy)', fontWeight: 600 }}>
            <span>{fullRepair.client}</span>
            <span style={{ color: 'var(--muted)' }}>&mdash;</span>
            <span>{fullRepair.dept}</span>
            <span style={{ color: 'var(--neutral-200)' }}>&middot;</span>
            <span>WO# {fullRepair.wo}</span>
            <span style={{ color: 'var(--neutral-200)' }}>&middot;</span>
            <span style={{ fontWeight: 400 }}>{fullRepair.scopeType}</span>
            <span style={{ color: 'var(--neutral-200)' }}>&middot;</span>
            <span style={{ fontWeight: 400 }}>{fullRepair.serial || '\u2014'}</span>
            <span style={{ color: 'var(--neutral-200)' }}>&middot;</span>
            <span>TAT: <span style={{ fontWeight: 700, color: fullRepair.daysIn > 14 ? 'var(--danger)' : fullRepair.daysIn > 7 ? 'var(--amber)' : 'var(--muted)' }}>{fullRepair.daysIn}d</span></span>
            <button
              onClick={() => setHeaderExpanded(!headerExpanded)}
              style={{
                marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 600, color: 'var(--primary)', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px',
              }}
            >
              {headerExpanded ? '\u25B4 Less' : '\u25BE More'}
            </button>
          </div>
          {headerExpanded && (
            <div style={{ marginTop: 6 }}>
              <CommandStrip repair={fullRepair} />
              <ScopeGlance repair={fullRepair} flags={flags} />
            </div>
          )}
        </div>

        {/* Quick action bar */}
        <div style={repairQuickActionBarStyle}>
          {hasNext && (
            <Popconfirm
              title="Advance workflow?"
              description={`Move this repair to "${nextStatusName}"?`}
              onConfirm={handleAdvance}
              okText="Advance"
              cancelText="Cancel"
            >
              <button style={{
                height: 32, padding: '0 16px', border: 'none', borderRadius: 5,
                background: 'var(--primary)', color: 'var(--card)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {nextStatusName ?? 'Next Stage'}
              </button>
            </Popconfirm>
          )}
          <div ref={statusMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setStatusMenuOpen(!statusMenuOpen)} style={repairDropdownBtnStyle}>
              Change Status
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {statusMenuOpen && (
              <div role="listbox" style={repairDropdownMenuStyle}>
                {statuses.map(s => (
                  <div key={s.statusId} onClick={() => confirmAndSetStatus(s.statusId)} role="option" aria-selected={s.statusId === currentStatusId} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmAndSetStatus(s.statusId); } }} style={{
                    padding: '8px 14px', cursor: 'pointer', fontSize: 12,
                    color: s.statusId === currentStatusId ? 'var(--primary)' : 'var(--text)',
                    fontWeight: s.statusId === currentStatusId ? 700 : 400,
                    background: s.statusId === currentStatusId ? 'var(--primary-light)' : undefined,
                    borderBottom: '1px solid var(--neutral-100)',
                  }}
                  onMouseEnter={e => { if (s.statusId !== currentStatusId) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                  onMouseLeave={e => { if (s.statusId !== currentStatusId) e.currentTarget.style.background = ''; }}
                  >{s.statusName}</div>
                ))}
              </div>
            )}
          </div>
          {/* Forms dropdown — cockpit */}
          <div ref={formsMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setFormsMenuOpen(!formsMenuOpen)} style={repairDropdownBtnStyle}>
              Forms
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {formsMenuOpen && (
              <div role="menu" style={repairFormsDropdownStyle}>
                <div style={repairFormsSectionHeaderStyle}>Internal</div>
                {INTERNAL_FORMS.map(item => (
                  <div key={item.key} title={item.title} onClick={() => { setActiveForm(item.key); setFormsMenuOpen(false); }} role="menuitem" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveForm(item.key); setFormsMenuOpen(false); } }} style={repairMenuItemStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >{item.label}</div>
                ))}
                <div style={repairFormsSectionHeaderBorderTopStyle}>Customer-Facing</div>
                {CUSTOMER_FORMS.map(item => (
                  <div key={item.key} title={item.title} onClick={() => { setActiveForm(item.key); setFormsMenuOpen(false); }} role="menuitem" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveForm(item.key); setFormsMenuOpen(false); } }} style={repairMenuItemStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >{item.label}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form overlays — cockpit */}
        {activeForm === 'di-inspection'      && <DiInspectionForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
        {activeForm === 'di-flexible'        && <DiFlexibleForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
        {activeForm === 'di-flex-diagnostic' && <DiFlexibleDiagnosticForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
        {activeForm === 'di-rigid'           && <DiRigidForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
        {activeForm === 'requisition'        && <RequisitionForm repair={fullRepair} lineItems={lineItems} onClose={() => setActiveForm(null)} />}
        {activeForm === 'final-inspection'   && <FinalInspectionForm repair={fullRepair} inspections={inspections} lineItems={lineItems} onClose={() => setActiveForm(null)} />}
        {activeForm === 'return-verification' && <ReturnVerificationForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
        {activeForm === 'amendment'          && <AmendmentForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
        {activeForm === 'update-slip'        && <UpdateSlipForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
        {activeForm === 'loaner'             && <LoanerForm repair={fullRepair} onClose={() => setActiveForm(null)} />}

        {/* Tab bar */}
        <div style={repairCockpitTabBarStyle}>
          {COCKPIT_TABS.map((t, i) => (
            <React.Fragment key={t.key}>
              {i > 0 && COCKPIT_TABS[i - 1].group !== t.group && (
                <div style={{ width: 1, height: 20, background: 'var(--neutral-200)', margin: '0 8px', alignSelf: 'center' }} />
              )}
              <div
                role="tab"
                tabIndex={0}
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(t.key); } }}
                style={{
                  padding: '10px 16px',
                  fontSize: 13, fontWeight: 600,
                  color: activeTab === t.key ? 'var(--primary)' : 'var(--muted)',
                  borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'scope-in'    && <ScopeInTab repair={fullRepair} />}
          {activeTab === 'details'     && <DetailsTab repair={fullRepair} flags={flags} />}
          {activeTab === 'outgoing'    && <OutgoingTab repair={fullRepair} items={lineItems} />}
          {activeTab === 'expense'     && <ExpenseTab repairKey={fullRepair.repairKey} />}
          {activeTab === 'inspections' && <InspectionsTab repairKey={fullRepair.repairKey} />}
          {activeTab === 'financials'  && <FinancialsTab repairKey={fullRepair.repairKey} />}
          {activeTab === 'scopehistory' && <ScopeHistoryTab repairKey={fullRepair.repairKey} currentRepairKey={fullRepair.repairKey} />}
          {activeTab === 'statuslog'   && <StatusHistoryTab repairKey={fullRepair.repairKey} />}
          {activeTab === 'comments'    && <NotesTab repairKey={fullRepair.repairKey} />}
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
          <div style={repairFieldLabelStyle}>Complaint / Description</div>
          <div style={{ fontSize: 13, color: 'var(--text)', padding: '8px 10px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, whiteSpace: 'pre-wrap' }}>{detail.complaint}</div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <div style={repairFieldLabelStyle}>Notes</div>
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
        headingLevel="h2"
        title={detail.wo}
        badges={
          <>
            <StatusBadge status={detail.status} />
            {detail.isUrgent && <StatusBadge status="URGENT" variant="red" />}
          </>
        }
        meta={<span style={{ color: tatColor }}>TAT: {detail.daysIn}d</span>}
      />

      <WorkflowPipeline currentStatus={detail.status} />
      <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

      {/* Quick Actions Bar */}
      <div style={repairLegacyQuickActionBarStyle}>
        {hasNext && (
          <Popconfirm
            title="Advance workflow?"
            description={`Move this repair to "${nextStatusName}"?`}
            onConfirm={handleAdvance}
            okText="Advance"
            cancelText="Cancel"
          >
            <button
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
          </Popconfirm>
        )}

        {/* Status dropdown */}
        <div ref={statusMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            style={repairLegacyDropdownBtnStyle}
          >
            Change Status
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {statusMenuOpen && (
            <div style={{ ...repairDropdownMenuStyle, minWidth: 200 }}>
              {statuses.map(s => (
                <div
                  key={s.statusId}
                  onClick={() => confirmAndSetStatus(s.statusId)}
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

        {/* Forms dropdown — legacy pane */}
        <div ref={formsMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setFormsMenuOpen(!formsMenuOpen)}
            style={repairLegacyDropdownBtnStyle}
          >
            Forms
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {formsMenuOpen && (
            <div style={repairFormsDropdownStyle}>
              <div style={repairFormsSectionHeaderStyle}>Internal</div>
              {INTERNAL_FORMS.map(item => (
                <div key={item.key} title={item.title} onClick={() => { setActiveForm(item.key); setFormsMenuOpen(false); }} role="menuitem" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveForm(item.key); setFormsMenuOpen(false); } }} style={repairMenuItemStyle12}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >{item.label}</div>
              ))}
              <div style={repairFormsSectionHeaderBorderTopStyle}>Customer-Facing</div>
              {CUSTOMER_FORMS.map(item => (
                <div key={item.key} title={item.title} onClick={() => { setActiveForm(item.key); setFormsMenuOpen(false); }} role="menuitem" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveForm(item.key); setFormsMenuOpen(false); } }} style={repairMenuItemStyle12}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >{item.label}</div>
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
      {activeTab === 'comments'     && <NotesTab repairKey={detail.repairKey} />}

      {/* Form overlays — legacy pane. Cast detail to RepairFull shape (shared core fields). */}
      {activeForm === 'di-inspection'      && <DiInspectionForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'di-flexible'        && <DiFlexibleForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'di-flex-diagnostic' && <DiFlexibleDiagnosticForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'di-rigid'           && <DiRigidForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'requisition'        && <RequisitionForm repair={detail as unknown as RepairFull} lineItems={lineItems} onClose={() => setActiveForm(null)} />}
      {activeForm === 'final-inspection'   && <FinalInspectionForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'return-verification' && <ReturnVerificationForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'amendment'          && <AmendmentForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'update-slip'        && <UpdateSlipForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
      {activeForm === 'loaner'             && <LoanerForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
    </div>
  );
};
