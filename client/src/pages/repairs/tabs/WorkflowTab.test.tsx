import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowTab } from './WorkflowTab';
import type { RepairLineItem } from '../types';

vi.mock('../../../api/repairs', () => ({
  getRepairLineItems: vi.fn(),
}));

import { getRepairLineItems } from '../../../api/repairs';

const line = (over: Partial<RepairLineItem>): RepairLineItem => ({
  tranKey: 1, approved: 'Y', itemCode: 'A1', description: 'Bending section',
  cause: '', fixType: 'R', amount: 100, baseAmount: 100, amendmentCount: 0,
  tech: '', tech2: '', comments: '', ...over,
});

describe('WorkflowTab — Tech column', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the name once when both slots hold the same tech', async () => {
    vi.mocked(getRepairLineItems).mockResolvedValue([
      line({ tech: 'A. Nguyen', tech2: 'A. Nguyen' }),
    ]);
    render(<WorkflowTab repairKey={1} />);
    expect(await screen.findByText('A. Nguyen')).toBeInTheDocument();
    expect(screen.queryByText('A. Nguyen / A. Nguyen')).toBeNull();
  });

  it('still renders "primary / secondary" when the techs differ', async () => {
    vi.mocked(getRepairLineItems).mockResolvedValue([
      line({ tech: 'A. Nguyen', tech2: 'B. Ortiz' }),
    ]);
    render(<WorkflowTab repairKey={1} />);
    expect(await screen.findByText('A. Nguyen / B. Ortiz')).toBeInTheDocument();
  });

  it('renders the primary alone when there is no secondary', async () => {
    vi.mocked(getRepairLineItems).mockResolvedValue([
      line({ tech: 'A. Nguyen', tech2: '' }),
    ]);
    render(<WorkflowTab repairKey={1} />);
    expect(await screen.findByText('A. Nguyen')).toBeInTheDocument();
  });
});
