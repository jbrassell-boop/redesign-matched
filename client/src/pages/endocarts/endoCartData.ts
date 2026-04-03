// TODO: Replace with real API when DB tables are migrated.
// No EndoCart-specific tables (cart quotes, catalog, models) were found in db-schema-dump.json
// as of 2026-04-03. The EndoCartsController at /api/endocarts currently serves scope inventory
// and service history from tblScope / tblRepair. When cart-specific tables are added to the DB,
// replace these constants with API calls to the stub endpoints in EndoCartsController.cs.
//
// Stub endpoints to implement when tables exist:
//   GET /api/endocarts/quotes         → tblEndoCartQuote (not yet migrated)
//   GET /api/endocarts/catalog        → tblEndoCartCatalog (not yet migrated)
//   GET /api/endocarts/models         → tblEndoCartModel (not yet migrated)
//   POST /api/endocarts/quotes        → create new quote
//   PUT  /api/endocarts/quotes/{key}  → update quote

import type { CatalogPart, CartModel, EndoCartQuote } from './types';

export const CATALOG: CatalogPart[] = [
  { partNum: 'EC-FRM-001', desc: 'Motorized Cart Frame - Standard', category: 'Cart Frame', unitCost: 8200, stock: 4, reorderPt: 2 },
  { partNum: 'EC-FRM-002', desc: 'Motorized Cart Frame - Compact', category: 'Cart Frame', unitCost: 6800, stock: 3, reorderPt: 2 },
  { partNum: 'EC-FRM-003', desc: 'Manual Cart Frame - Standard', category: 'Cart Frame', unitCost: 3200, stock: 6, reorderPt: 3 },
  { partNum: 'EC-MON-001', desc: '24" Medical-Grade HD Monitor', category: 'Monitor', unitCost: 2450, stock: 8, reorderPt: 4 },
  { partNum: 'EC-MON-002', desc: '27" 4K Surgical Display', category: 'Monitor', unitCost: 4100, stock: 5, reorderPt: 3 },
  { partNum: 'EC-MON-003', desc: '19" Secondary Display', category: 'Monitor', unitCost: 1350, stock: 10, reorderPt: 5 },
  { partNum: 'EC-ACC-001', desc: 'Scope Hanger Bracket', category: 'Accessory', unitCost: 185, stock: 22, reorderPt: 10 },
  { partNum: 'EC-ACC-002', desc: 'Keyboard Tray - Articulating', category: 'Accessory', unitCost: 320, stock: 15, reorderPt: 8 },
  { partNum: 'EC-ACC-003', desc: 'Water Bottle Holder', category: 'Accessory', unitCost: 75, stock: 30, reorderPt: 15 },
  { partNum: 'EC-ACC-004', desc: 'Equipment Shelf - Adjustable', category: 'Accessory', unitCost: 290, stock: 18, reorderPt: 8 },
  { partNum: 'EC-ACC-005', desc: 'IV Pole Mount', category: 'Accessory', unitCost: 145, stock: 20, reorderPt: 10 },
  { partNum: 'EC-ACC-006', desc: 'Monitor Stand - Dual Arm', category: 'Accessory', unitCost: 520, stock: 7, reorderPt: 4 },
  { partNum: 'EC-ACC-007', desc: 'Drawer Unit - 3 Drawer', category: 'Accessory', unitCost: 410, stock: 12, reorderPt: 6 },
  { partNum: 'EC-PWR-001', desc: 'Medical-Grade Power Strip (6-outlet)', category: 'Power', unitCost: 245, stock: 25, reorderPt: 12 },
  { partNum: 'EC-PWR-002', desc: 'Isolation Transformer 120V', category: 'Power', unitCost: 680, stock: 6, reorderPt: 3 },
  { partNum: 'EC-PWR-003', desc: 'UPS Battery Backup 1500VA', category: 'Power', unitCost: 890, stock: 4, reorderPt: 2 },
  { partNum: 'EC-CBL-001', desc: 'Video Cable Kit (HDMI/SDI)', category: 'Cabling', unitCost: 165, stock: 35, reorderPt: 15 },
  { partNum: 'EC-CBL-002', desc: 'Cord Wrap Management System', category: 'Cabling', unitCost: 95, stock: 40, reorderPt: 20 },
  { partNum: 'EC-CBL-003', desc: 'Cable Tray - Under-shelf', category: 'Cabling', unitCost: 120, stock: 28, reorderPt: 12 },
  { partNum: 'EC-STR-001', desc: 'Storage Basket - Large', category: 'Storage', unitCost: 210, stock: 14, reorderPt: 8 },
  { partNum: 'EC-STR-002', desc: 'Accessory Bin Set (5-pack)', category: 'Storage', unitCost: 135, stock: 20, reorderPt: 10 },
];

function pick(pn: string, qty: number): { partNum: string; desc: string; qty: number; unitCost: number } {
  const c = CATALOG.find(x => x.partNum === pn);
  return { partNum: pn, desc: c ? c.desc : pn, qty, unitCost: c ? c.unitCost : 0 };
}

export const MODELS: CartModel[] = [
  { lModelKey: 1, modelName: 'IEDM-100', desc: 'Motorized Endocart - Standard single-screen configuration', components: [
    pick('EC-FRM-001', 1), pick('EC-MON-001', 1), pick('EC-ACC-001', 2), pick('EC-ACC-002', 1),
    pick('EC-ACC-004', 1), pick('EC-PWR-001', 1), pick('EC-CBL-001', 1), pick('EC-CBL-002', 1),
    pick('EC-ACC-003', 1), pick('EC-STR-002', 1),
  ], basePrice: 0, componentCount: 0 },
  { lModelKey: 2, modelName: 'IEDM-200', desc: 'Dual-Screen Endocart - Premium dual-monitor surgical setup', components: [
    pick('EC-FRM-001', 1), pick('EC-MON-002', 1), pick('EC-MON-003', 1), pick('EC-ACC-006', 1),
    pick('EC-ACC-001', 2), pick('EC-ACC-002', 1), pick('EC-ACC-004', 2), pick('EC-PWR-001', 1),
    pick('EC-PWR-002', 1), pick('EC-CBL-001', 2), pick('EC-CBL-002', 1), pick('EC-ACC-003', 1),
  ], basePrice: 0, componentCount: 0 },
  { lModelKey: 3, modelName: 'IEDM-300', desc: 'Compact Endocart - Smaller footprint for tight spaces', components: [
    pick('EC-FRM-002', 1), pick('EC-MON-003', 1), pick('EC-ACC-001', 1), pick('EC-ACC-002', 1),
    pick('EC-PWR-001', 1), pick('EC-CBL-001', 1), pick('EC-CBL-002', 1),
  ], basePrice: 0, componentCount: 0 },
  { lModelKey: 4, modelName: 'Custom-420', desc: 'Research Cart - Research-grade with extended storage and UPS backup', components: [
    pick('EC-FRM-001', 1), pick('EC-MON-002', 2), pick('EC-ACC-006', 1), pick('EC-ACC-001', 2),
    pick('EC-ACC-002', 1), pick('EC-ACC-004', 2), pick('EC-ACC-007', 1), pick('EC-PWR-001', 2),
    pick('EC-PWR-002', 1), pick('EC-PWR-003', 1), pick('EC-CBL-001', 2), pick('EC-CBL-002', 2),
    pick('EC-STR-001', 2), pick('EC-STR-002', 1),
  ], basePrice: 0, componentCount: 0 },
  { lModelKey: 5, modelName: 'IEDM-100S', desc: 'Basic Cart - Entry-level single-screen with manual frame', components: [
    pick('EC-FRM-003', 1), pick('EC-MON-003', 1), pick('EC-ACC-001', 1), pick('EC-PWR-001', 1),
    pick('EC-CBL-001', 1), pick('EC-CBL-002', 1),
  ], basePrice: 0, componentCount: 0 },
];

// Compute base prices and component counts
MODELS.forEach(m => {
  m.basePrice = m.components.reduce((sum, c) => sum + c.unitCost * c.qty, 0);
  m.componentCount = m.components.reduce((sum, c) => sum + c.qty, 0);
});

function buildQuotes(): EndoCartQuote[] {
  const raw: Omit<EndoCartQuote, 'itemCount' | 'total'>[] = [
    { lQuoteKey: 5001, quoteNum: 'ECQ-5001', clientKey: 1, clientName: 'Northside Hospital', deptName: 'Endoscopy', cartModel: 'IEDM-100', salesRep: 'Mike Rivera', dateCreated: '2025-11-02', dateQuoted: '2025-11-05', status: 'Billed', notes: 'Delivered and invoiced.', items: [pick('EC-FRM-001',1), pick('EC-MON-001',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1), pick('EC-ACC-003',1), pick('EC-STR-002',1)] },
    { lQuoteKey: 5002, quoteNum: 'ECQ-5002', clientKey: 2, clientName: 'Metro Health Hospital', deptName: 'Surgery', cartModel: 'IEDM-200', salesRep: 'Sarah Chen', dateCreated: '2025-11-18', dateQuoted: '2025-11-22', status: 'Billed', notes: '', items: [pick('EC-FRM-001',1), pick('EC-MON-002',1), pick('EC-MON-003',1), pick('EC-ACC-006',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',2), pick('EC-PWR-001',1), pick('EC-PWR-002',1), pick('EC-CBL-001',2), pick('EC-CBL-002',1), pick('EC-ACC-003',1)] },
    { lQuoteKey: 5003, quoteNum: 'ECQ-5003', clientKey: 3, clientName: 'Memorial Hermann', deptName: 'Pulmonology', cartModel: 'IEDM-300', salesRep: 'James Wilson', dateCreated: '2025-12-05', dateQuoted: '2025-12-10', status: 'Approved', notes: 'PO received, scheduling delivery.', items: [pick('EC-FRM-002',1), pick('EC-MON-003',1), pick('EC-ACC-001',1), pick('EC-ACC-002',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1)] },
    { lQuoteKey: 5004, quoteNum: 'ECQ-5004', clientKey: 4, clientName: 'HCA West Kendall', deptName: 'Endoscopy Center', cartModel: 'IEDM-100', salesRep: 'Mike Rivera', dateCreated: '2025-12-14', dateQuoted: '2025-12-18', status: 'Approved', notes: 'Awaiting delivery date confirmation.', items: [pick('EC-FRM-001',1), pick('EC-MON-001',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1), pick('EC-ACC-003',1), pick('EC-STR-002',1)] },
    { lQuoteKey: 5005, quoteNum: 'ECQ-5005', clientKey: 5, clientName: 'Piedmont Healthcare', deptName: 'Bronchoscopy', cartModel: 'Custom-420', salesRep: 'Sarah Chen', dateCreated: '2026-01-06', dateQuoted: '2026-01-12', status: 'Approved', notes: 'Custom research config approved by dept head.', items: [pick('EC-FRM-001',1), pick('EC-MON-002',2), pick('EC-ACC-006',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',2), pick('EC-ACC-007',1), pick('EC-PWR-001',2), pick('EC-PWR-002',1), pick('EC-PWR-003',1), pick('EC-CBL-001',2), pick('EC-CBL-002',2), pick('EC-STR-001',2), pick('EC-STR-002',1)] },
    { lQuoteKey: 5006, quoteNum: 'ECQ-5006', clientKey: 1, clientName: 'Northside Hospital', deptName: 'Pulmonology', cartModel: 'IEDM-200', salesRep: 'James Wilson', dateCreated: '2026-01-15', dateQuoted: '2026-01-20', status: 'Quoted', notes: 'Sent to dept for review.', items: [pick('EC-FRM-001',1), pick('EC-MON-002',1), pick('EC-MON-003',1), pick('EC-ACC-006',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',2), pick('EC-PWR-001',1), pick('EC-PWR-002',1), pick('EC-CBL-001',2), pick('EC-CBL-002',1), pick('EC-ACC-003',1)] },
    { lQuoteKey: 5007, quoteNum: 'ECQ-5007', clientKey: 2, clientName: 'Metro Health Hospital', deptName: 'Gastroenterology', cartModel: 'IEDM-100', salesRep: 'Mike Rivera', dateCreated: '2026-01-28', dateQuoted: '2026-02-01', status: 'Quoted', notes: 'Follow up scheduled next week.', items: [pick('EC-FRM-001',1), pick('EC-MON-001',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1), pick('EC-ACC-003',1), pick('EC-STR-002',1)] },
    { lQuoteKey: 5008, quoteNum: 'ECQ-5008', clientKey: 3, clientName: 'Memorial Hermann', deptName: 'ENT', cartModel: 'IEDM-100S', salesRep: 'Sarah Chen', dateCreated: '2026-02-03', dateQuoted: '2026-02-06', status: 'Quoted', notes: 'Budget review pending.', items: [pick('EC-FRM-003',1), pick('EC-MON-003',1), pick('EC-ACC-001',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1)] },
    { lQuoteKey: 5009, quoteNum: 'ECQ-5009', clientKey: 4, clientName: 'HCA West Kendall', deptName: 'GI Lab', cartModel: 'IEDM-300', salesRep: 'James Wilson', dateCreated: '2026-02-10', dateQuoted: '2026-02-14', status: 'Quoted', notes: 'Compact model for small procedure room.', items: [pick('EC-FRM-002',1), pick('EC-MON-003',1), pick('EC-ACC-001',1), pick('EC-ACC-002',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1)] },
    { lQuoteKey: 5010, quoteNum: 'ECQ-5010', clientKey: 5, clientName: 'Piedmont Healthcare', deptName: 'Gastro', cartModel: 'IEDM-200', salesRep: 'Mike Rivera', dateCreated: '2026-02-18', dateQuoted: '', status: 'Draft', notes: 'Waiting on monitor preference from surgeon.', items: [pick('EC-FRM-001',1), pick('EC-MON-002',1), pick('EC-MON-003',1), pick('EC-ACC-006',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',2), pick('EC-PWR-001',1), pick('EC-PWR-002',1), pick('EC-CBL-001',2), pick('EC-CBL-002',1), pick('EC-ACC-003',1)] },
    { lQuoteKey: 5011, quoteNum: 'ECQ-5011', clientKey: 1, clientName: 'Northside Hospital', deptName: 'Endoscopy', cartModel: 'IEDM-100', salesRep: 'Sarah Chen', dateCreated: '2026-02-25', dateQuoted: '', status: 'Draft', notes: 'Second cart for expansion.', items: [pick('EC-FRM-001',1), pick('EC-MON-001',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1), pick('EC-ACC-003',1), pick('EC-STR-002',1)] },
    { lQuoteKey: 5012, quoteNum: 'ECQ-5012', clientKey: 2, clientName: 'Metro Health Hospital', deptName: 'Surgery', cartModel: 'Custom-420', salesRep: 'James Wilson', dateCreated: '2026-03-01', dateQuoted: '', status: 'Draft', notes: 'Research dept requesting custom build.', items: [pick('EC-FRM-001',1), pick('EC-MON-002',2), pick('EC-ACC-006',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',2), pick('EC-ACC-007',1), pick('EC-PWR-001',2), pick('EC-PWR-002',1), pick('EC-PWR-003',1), pick('EC-CBL-001',2), pick('EC-CBL-002',2), pick('EC-STR-001',2), pick('EC-STR-002',1)] },
    { lQuoteKey: 5013, quoteNum: 'ECQ-5013', clientKey: 3, clientName: 'Memorial Hermann', deptName: 'Pulmonology', cartModel: 'IEDM-100', salesRep: 'Mike Rivera', dateCreated: '2026-03-05', dateQuoted: '', status: 'Draft', notes: 'Replacement for aging cart.', items: [pick('EC-FRM-001',1), pick('EC-MON-001',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1), pick('EC-ACC-003',1), pick('EC-STR-002',1)] },
    { lQuoteKey: 5014, quoteNum: 'ECQ-5014', clientKey: 4, clientName: 'HCA West Kendall', deptName: 'Endoscopy Center', cartModel: 'IEDM-200', salesRep: 'Sarah Chen', dateCreated: '2026-03-08', dateQuoted: '', status: 'Draft', notes: 'New procedure room build-out.', items: [pick('EC-FRM-001',1), pick('EC-MON-002',1), pick('EC-MON-003',1), pick('EC-ACC-006',1), pick('EC-ACC-001',2), pick('EC-ACC-002',1), pick('EC-ACC-004',2), pick('EC-PWR-001',1), pick('EC-PWR-002',1), pick('EC-CBL-001',2), pick('EC-CBL-002',1), pick('EC-ACC-003',1)] },
    { lQuoteKey: 5015, quoteNum: 'ECQ-5015', clientKey: 5, clientName: 'Piedmont Healthcare', deptName: 'Bronchoscopy', cartModel: 'IEDM-300', salesRep: 'James Wilson', dateCreated: '2026-02-20', dateQuoted: '2026-02-22', status: 'Cancelled', notes: 'Dept switched to different vendor.', items: [pick('EC-FRM-002',1), pick('EC-MON-003',1), pick('EC-ACC-001',1), pick('EC-ACC-002',1), pick('EC-PWR-001',1), pick('EC-CBL-001',1), pick('EC-CBL-002',1)] },
  ];
  return raw.map(q => ({
    ...q,
    itemCount: q.items.reduce((s, i) => s + i.qty, 0),
    total: q.items.reduce((s, i) => s + i.unitCost * i.qty, 0),
  }));
}

export const QUOTES: EndoCartQuote[] = buildQuotes();
export const SALES_REPS = ['Mike Rivera', 'Sarah Chen', 'James Wilson'];
export const CATALOG_CATEGORIES = ['Cart Frame', 'Monitor', 'Accessory', 'Power', 'Cabling', 'Storage'] as const;
