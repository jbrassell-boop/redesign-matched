import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepairItemsTable } from './RepairItemsTable';
import type { RepairLineItem } from '../types';

vi.mock('../../../api/repairs', () => ({
  addRepairLineItem: vi.fn(),
  deleteRepairLineItem: vi.fn(),
  patchLineItemCauseComments: vi.fn(),
  bulkApproveLineItems: vi.fn(),
}));

vi.mock('./RepairItemAutoComplete', () => ({ RepairItemAutoComplete: () => null }));
vi.mock('./RepairItemPicker', () => ({ RepairItemPicker: () => null }));

const line = (over: Partial<RepairLineItem>): RepairLineItem => ({
  tranKey: 1, approved: 'Y', itemCode: 'A1', description: 'Bending section',
  cause: '', fixType: 'R', amount: 100, baseAmount: 100, amendmentCount: 0,
  tech: '', tech2: '', comments: '', ...over,
});

const noop = () => {};

const renderWith = (item: RepairLineItem) =>
  render(
    <RepairItemsTable
      repairKey={1}
      items={[item]}
      onItemsChanged={noop}
      onOpenAmendments={noop}
      hasAmendments={false}
    />,
  );

describe('RepairItemsTable — tech cell', () => {
  it('renders the name once when both slots hold the same tech', () => {
    renderWith(line({ tech: 'A. Nguyen', tech2: 'A. Nguyen' }));
    expect(screen.getByText('A. Nguyen')).toBeInTheDocument();
    expect(screen.queryByText('A. Nguyen / A. Nguyen')).toBeNull();
  });

  it('still renders "primary / secondary" when the techs differ', () => {
    renderWith(line({ tech: 'A. Nguyen', tech2: 'B. Ortiz' }));
    expect(screen.getByText('A. Nguyen / B. Ortiz')).toBeInTheDocument();
  });

  it('renders the primary alone when there is no secondary', () => {
    renderWith(line({ tech: 'A. Nguyen', tech2: '' }));
    expect(screen.getByText('A. Nguyen')).toBeInTheDocument();
  });
});
