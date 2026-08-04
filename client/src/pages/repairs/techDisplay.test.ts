import { describe, it, expect } from 'vitest';
import { formatTechCell } from './techDisplay';

describe('formatTechCell', () => {
  it('collapses an identical pair to one name', () => {
    expect(formatTechCell('A. Nguyen', 'A. Nguyen')).toBe('A. Nguyen');
  });

  it('keeps "primary / secondary" when the techs differ', () => {
    expect(formatTechCell('A. Nguyen', 'B. Ortiz')).toBe('A. Nguyen / B. Ortiz');
  });

  it('renders the primary alone when there is no secondary', () => {
    expect(formatTechCell('A. Nguyen', '')).toBe('A. Nguyen');
  });

  it('falls back to a dash when neither slot is set', () => {
    expect(formatTechCell('', '')).toBe('—');
  });

  it('still shows a secondary that arrived without a primary', () => {
    expect(formatTechCell('', 'B. Ortiz')).toBe('— / B. Ortiz');
  });

  // Blocked, not forgotten: the lineitems payload carries names only, so two
  // different technicians who share a display name are indistinguishable here
  // and collapse. Un-skip once lTechnicianKey/lTechnician2Key ship on
  // RepairLineItem and the comparison moves to the keys.
  it.todo('keeps both names for two different techs who share a display name');
});
