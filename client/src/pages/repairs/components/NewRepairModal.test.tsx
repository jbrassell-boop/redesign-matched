import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewRepairModal } from './NewRepairModal';

// ── Mock the API modules the modal pulls from ──
vi.mock('../../../api/repairs', () => ({
  getRepairStatuses: vi.fn().mockResolvedValue([]),
  createRepair: vi.fn().mockResolvedValue({ repairKey: 999 }),
}));

vi.mock('../../../api/lookups', () => ({
  lookupScopeBySerial: vi.fn(),
  getScopeTypes: vi.fn().mockResolvedValue([]),
  getClientsSimple: vi.fn().mockResolvedValue([{ key: 1, name: 'Client A' }]),
  getDepartmentsByClient: vi.fn().mockResolvedValue([{ key: 10, name: 'Dept A' }]),
  getSalesReps: vi.fn().mockResolvedValue([]),
  getPricingCategories: vi.fn().mockResolvedValue([]),
  getPaymentTerms: vi.fn().mockResolvedValue([]),
  getCarriers: vi.fn().mockResolvedValue([]),
  getRepairReasonOptions: vi.fn().mockResolvedValue([]),
}));

import { lookupScopeBySerial } from '../../../api/lookups';

const noop = () => {};

describe('NewRepairModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Client & Department immediately — no serial search required (department trap fixed)', async () => {
    render(<NewRepairModal open onClose={noop} onCreated={noop} />);
    // The department field is on screen without ever touching the serial box —
    // this is the bug Jordan hit (no way to set a department → "Department is required").
    expect(await screen.findByLabelText('Department')).toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
  });

  it('no longer renders the orphan fields that were corrupting other columns', async () => {
    render(<NewRepairModal open onClose={noop} onCreated={noop} />);
    await screen.findByLabelText('Department');
    // Source → was clobbering displayCustomerComplaint; Level → billType;
    // Customer Ref/CMMS → rackPosition. All removed.
    expect(screen.queryByText('Source')).toBeNull();
    expect(screen.queryByText('Level')).toBeNull();
    expect(screen.queryByText(/Customer Ref/i)).toBeNull();
    // Sanity: the real fields that share those columns are still present.
    expect(screen.getByText('Billing Type')).toBeInTheDocument();
    expect(screen.getByText('Rack')).toBeInTheDocument();
  });

  it('disambiguates when one serial matches multiple scopes', async () => {
    vi.mocked(lookupScopeBySerial).mockResolvedValue([
      { scopeKey: 1, serialNumber: '12345', scopeTypeKey: null, scopeTypeDesc: 'Gastroscope', manufacturerKey: null, manufacturer: 'Olympus', deptKey: 10, deptName: 'GI Lab', clientKey: 1, clientName: 'Client ABC' },
      { scopeKey: 2, serialNumber: '12345', scopeTypeKey: null, scopeTypeDesc: 'Gastroscope', manufacturerKey: null, manufacturer: 'Olympus', deptKey: 20, deptName: 'Endo', clientKey: 2, clientName: 'Client XYZ' },
    ]);
    render(<NewRepairModal open onClose={noop} onCreated={noop} />);
    await screen.findByLabelText('Department');
    fireEvent.change(screen.getByLabelText('Instrument serial number lookup'), { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Search'));
    // Both owners are offered instead of one silently winning.
    expect(await screen.findByText('Client ABC')).toBeInTheDocument();
    expect(screen.getByText('Client XYZ')).toBeInTheDocument();
  });
});
