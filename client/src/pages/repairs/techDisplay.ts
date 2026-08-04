/**
 * A line's tech cell: "primary / secondary", collapsed to a single name when
 * both slots hold the same person.
 *
 * 27,423 of the 45,003 lines carrying a secondary tech (61%) hold the identical
 * person in both slots — migration data, not app writes — so the doubled name
 * would be the majority rendering and reads as a defect. Display-only: the
 * stored columns and the server payload keep both slots untouched.
 *
 * Compared by display NAME, not technician key, because the keys never reach
 * the client: GET /repairs/{key}/lineitems joins tblTechnicians twice but
 * projects only sTechName/sTech2Name. Two distinct technicians who share a
 * display name therefore collapse as well. Making this a true same-person test
 * needs lTechnicianKey/lTechnician2Key added to the RepairLineItem payload;
 * this function is the single seam where that comparison would change.
 *
 * Both surfaces that show the cell (RepairItemsTable's grid and WorkflowTab's
 * antd Tech column) call this so the rule cannot drift between them.
 */
export const formatTechCell = (tech: string, tech2: string): string =>
  `${tech || '—'}${tech2 && tech2 !== tech ? ` / ${tech2}` : ''}`;
