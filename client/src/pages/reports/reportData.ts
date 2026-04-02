import type { ReportDef } from './types';

export const REPORTS: ReportDef[] = [
  // Repair Reports
  { id: 'repair-volume', cat: 'Repair Reports', name: 'Repair Volume by Period', desc: 'Total repair count broken down by month, quarter, or year.', lastRun: 2 },
  { id: 'repair-tat', cat: 'Repair Reports', name: 'Repair TAT Analysis', desc: 'Turn-around time distribution and SLA compliance rates.', lastRun: 5 },
  { id: 'tech-productivity', cat: 'Repair Reports', name: 'Technician Productivity', desc: 'Repairs completed per technician with average turnaround.', lastRun: 1 },
  { id: 'repair-cost', cat: 'Repair Reports', name: 'Repair Cost Summary', desc: 'Parts, labor, and total cost breakdown per repair order.', lastRun: null },
  { id: 'warranty-claims', cat: 'Repair Reports', name: 'Warranty Claims', desc: 'Warranty repair volume, cost, and claim status tracking.', lastRun: 14 },
  { id: 'scope-repair-list', cat: 'Repair Reports', name: 'Scope Repair List', desc: 'Repair listing by date, status, technician, sales rep, and instrument type.', lastRun: 1, params: 'repair-list' },
  { id: 'scope-repair-hist', cat: 'Repair Reports', name: 'Scope Repair History', desc: 'Historical repair data by client/dept with detail, amounts, totals, GL/SMT, and consumption toggles.', lastRun: 4, params: 'client-dept' },
  { id: 'repair-metrics', cat: 'Repair Reports', name: 'Repair Metrics', desc: 'Performance metrics by client and date range.', lastRun: 3, params: 'client-date' },
  { id: 'repair-counts-item', cat: 'Repair Reports', name: 'Repair Counts by Repair Item', desc: 'Repair frequency by item with high-level summary and instrument type filter.', lastRun: null, params: 'repair-counts' },
  { id: 'billable-report', cat: 'Repair Reports', name: 'Billable Report', desc: 'Billable repairs by client with summary or scope type breakdown.', lastRun: 7, params: 'billable' },
  { id: 'parent-child-items', cat: 'Repair Reports', name: 'Parent Child Repair Items', desc: 'Part dependency hierarchy \u2014 parent/child item relationships by instrument type.', lastRun: 12, extractOnly: true, params: 'instant' },
  { id: 'true-repair-costs', cat: 'Repair Reports', name: 'True Repair Item Costs', desc: 'Actual material and labor costs per repair item.', lastRun: null, extractOnly: true },
  { id: 'sub-assy-model', cat: 'Repair Reports', name: 'Sub-Assemblies by Model', desc: 'Sub-assembly usage breakdown grouped by scope model.', lastRun: null, extractOnly: true },
  { id: 'sub-assy-tech', cat: 'Repair Reports', name: 'Sub-Assemblies per Tech', desc: 'Sub-assembly usage per technician for quality tracking.', lastRun: null, extractOnly: true },
  { id: 'insert-tube-comp', cat: 'Repair Reports', name: 'Insertion Tube Replacement Comparison', desc: 'Insertion tube replacement rates and cost comparison across models.', lastRun: null, extractOnly: true },
  { id: 'repairs-non-tsi', cat: 'Repair Reports', name: 'Repairs Non-Total Scope List', desc: 'Repairs performed by outside vendors or subcontractors.', lastRun: null, extractOnly: true },
  { id: 'repairs-no-tracking', cat: 'Repair Reports', name: 'Repairs Without Tracking Numbers In', desc: 'Inbound repairs missing carrier tracking information.', lastRun: null, extractOnly: true },

  // Financial Reports
  { id: 'revenue-client', cat: 'Financial Reports', name: 'Revenue by Client', desc: 'Revenue totals grouped by client with year-over-year comparison.', lastRun: 3 },
  { id: 'outstanding-aging', cat: 'Financial Reports', name: 'Outstanding Invoices Aging', desc: 'Open invoice aging buckets: 0-30, 31-60, 61-90, 90+ days.', lastRun: 1 },
  { id: 'monthly-revenue', cat: 'Financial Reports', name: 'Monthly Revenue Trend', desc: '12-month revenue trend line with forecast projection.', lastRun: 7 },
  { id: 'cogs', cat: 'Financial Reports', name: 'Cost of Goods Sold', desc: 'Direct material and labor costs by product category.', lastRun: null },
  { id: 'profit-margin', cat: 'Financial Reports', name: 'Profit Margin Analysis', desc: 'Gross and net margin by service type, client, and period.', lastRun: 10 },
  { id: 'invoice-list', cat: 'Financial Reports', name: 'Invoice List', desc: 'Complete invoice listing for date range with export to local path.', lastRun: 2, extractOnly: true },
  { id: 'cash-receipts', cat: 'Financial Reports', name: 'Cash Receipts', desc: 'Cash receipts posted within date range.', lastRun: 5, extractOnly: true },
  { id: 'avalara-balancing', cat: 'Financial Reports', name: 'Invoice List - Avalara Balancing', desc: 'Invoice totals balanced against Avalara tax compliance ledgers.', lastRun: null, extractOnly: true },
  { id: 'cost-analysis', cat: 'Financial Reports', name: 'Cost Analysis', desc: 'Detailed cost analysis by service category and period.', lastRun: null },
  { id: 'sales-tax-report', cat: 'Financial Reports', name: 'Sales Tax Report', desc: 'Sales tax collected and remitted by state and jurisdiction.', lastRun: 8 },
  { id: 'revenue-per-state', cat: 'Financial Reports', name: 'Revenue per State', desc: 'Revenue breakdown by state for territory analysis.', lastRun: null, params: 'salesrep' },
  { id: 'revenue-per-rep', cat: 'Financial Reports', name: 'Revenue per Sales Rep', desc: 'Revenue totals grouped by sales representative.', lastRun: 4, params: 'salesrep' },
  { id: 'subcontract-analysis', cat: 'Financial Reports', name: 'Sub Contract Group Analysis', desc: 'Financial analysis of subcontract group performance.', lastRun: null },

  // Contract Reports
  { id: 'contract-expiry', cat: 'Contract Reports', name: 'Contract Expiration Schedule', desc: 'Upcoming contract expirations sorted by date with renewal status.', lastRun: 4 },
  { id: 'contract-value', cat: 'Contract Reports', name: 'Contract Value Summary', desc: 'Total and average contract values by client and type.', lastRun: null },
  { id: 'sla-compliance', cat: 'Contract Reports', name: 'SLA Compliance', desc: 'Service level agreement adherence rates across all contracts.', lastRun: 6 },
  { id: 'contract-util', cat: 'Contract Reports', name: 'Contract Utilization', desc: 'Actual usage vs. contracted capacity by department.', lastRun: 12 },

  // Inventory Reports
  { id: 'stock-level', cat: 'Inventory Reports', name: 'Stock Level Summary', desc: 'Current on-hand quantities with min/max thresholds.', lastRun: 1 },
  { id: 'reorder-point', cat: 'Inventory Reports', name: 'Reorder Point Analysis', desc: 'Items at or below reorder threshold with suggested order quantities.', lastRun: 3 },
  { id: 'parts-usage', cat: 'Inventory Reports', name: 'Parts Usage Trend', desc: 'Parts consumption over time by category and repair type.', lastRun: null },
  { id: 'dead-stock', cat: 'Inventory Reports', name: 'Dead Stock Report', desc: 'Inventory items with zero movement in the past 6+ months.', lastRun: 21 },
  { id: 'used-inventory', cat: 'Inventory Reports', name: 'Used Inventory', desc: 'Inventory items consumed in repairs during the period.', lastRun: null, extractOnly: true },
  { id: 'supplier-inv-price', cat: 'Inventory Reports', name: 'Supplier Inventory Size Pricing', desc: 'Supplier pricing comparison by inventory item and size.', lastRun: null, extractOnly: true },
  { id: 'instrument-repairs', cat: 'Inventory Reports', name: 'Instrument Repairs', desc: 'Repair history for rigid instruments and accessories.', lastRun: null },
  { id: 'instrument-extract', cat: 'Inventory Reports', name: 'Instrument Items Extract', desc: 'Complete instrument item catalog export.', lastRun: null, extractOnly: true },

  // Client Reports
  { id: 'client-activity', cat: 'Client Reports', name: 'Client Activity Summary', desc: 'Repair volume, revenue, and open orders per client.', lastRun: 2 },
  { id: 'dept-scope-census', cat: 'Client Reports', name: 'Department Scope Census', desc: 'Scope count and type distribution by department.', lastRun: 8 },
  { id: 'client-satisfaction', cat: 'Client Reports', name: 'Client Satisfaction Scores', desc: 'NPS and satisfaction survey results by client and period.', lastRun: null },
  { id: 'client-sales-summ', cat: 'Client Reports', name: 'Client Sales Summary', desc: 'Revenue summary by client and department, split by contract vs. non-contract.', lastRun: 5, params: 'client-dept' },
  { id: 'dept-audit', cat: 'Client Reports', name: 'Department Audit', desc: 'Client/department listing with customer-since date and last date in.', lastRun: 10, params: 'instant' },
  { id: 'dept-contacts', cat: 'Client Reports', name: 'Department Contacts', desc: 'Department contact list with shipping addresses.', lastRun: null, extractOnly: true, params: 'instant' },

  // Sales Reports
  { id: 'sales-invoices', cat: 'Sales Reports', name: 'Sales Rep Invoices', desc: 'Invoice listing by sales rep with date range, sortable by invoice date.', lastRun: 3, params: 'sales' },
  { id: 'monthly-sales', cat: 'Sales Reports', name: 'Monthly Sales', desc: 'Monthly revenue totals across all reps and accounts.', lastRun: 7 },
  { id: 'sales-by-account', cat: 'Sales Reports', name: 'Sales by Account', desc: 'Revenue breakdown by client account with sales rep filter.', lastRun: null, params: 'salesrep' },
  { id: 'active-customers', cat: 'Sales Reports', name: 'Active Customers Survey', desc: 'Annual survey of active customers within date range.', lastRun: null },
  { id: 'net-new-customers', cat: 'Sales Reports', name: 'Net New Customers', desc: 'New customer acquisitions by sales rep with summary/detail view.', lastRun: 14, extractOnly: true, params: 'salesrep-detail' },
  { id: 'sales-leaderboard', cat: 'Sales Reports', name: 'Sales Rep Leaderboard', desc: 'Monthly rankings by summary, net new customers, or work orders.', lastRun: 1, extractOnly: true, params: 'leaderboard' },
  { id: 'commissions-xref', cat: 'Sales Reports', name: 'Commissions Cross Reference', desc: 'Monthly commission cross-reference by sales rep.', lastRun: null, extractOnly: true, params: 'salesrep-month' },

  // GPO Reports
  { id: 'gsa-report', cat: 'GPO Reports', name: 'GSA Report', desc: 'Government Services Administration contract activity and compliance.', lastRun: null },
  { id: 'gsa-item-counts', cat: 'GPO Reports', name: 'GSA Repair Items Count', desc: 'Repair item frequency counts under GSA contracts.', lastRun: null, extractOnly: true },
  { id: 'hpg-report', cat: 'GPO Reports', name: 'HPG Report', desc: 'HealthTrust (HPG) purchasing group activity report.', lastRun: 6 },
  { id: 'hpg-item-counts', cat: 'GPO Reports', name: 'HPG Repair Item Counts', desc: 'Repair item frequency under HPG contracts.', lastRun: null, extractOnly: true },
  { id: 'hpg-extract-wo', cat: 'GPO Reports', name: 'HPG Extract - Work Orders', desc: 'Work order extract for HPG contract reporting.', lastRun: null, extractOnly: true },
  { id: 'vizient-report', cat: 'GPO Reports', name: 'Vizient Report', desc: 'Vizient purchasing group activity and compliance.', lastRun: 3 },
  { id: 'vizient-item-counts', cat: 'GPO Reports', name: 'Vizient Repair Item Counts', desc: 'Repair item frequency under Vizient contracts.', lastRun: null, extractOnly: true },
  { id: 'vizient-carts', cat: 'GPO Reports', name: 'Vizient Carts Extract', desc: 'EndoCart/cart data extract for Vizient reporting.', lastRun: null, extractOnly: true },
  { id: 'gpo-profitability', cat: 'GPO Reports', name: 'GPO Profitability', desc: 'Profitability analysis across all GPO contracts and affiliations.', lastRun: null },

  // Quality Reports
  { id: 'non-conformance', cat: 'Quality Reports', name: 'Non-Conformance Report', desc: 'Quality non-conformance events by date range and instrument type.', lastRun: 3, params: 'quality-std' },
  { id: 'po-receipts', cat: 'Quality Reports', name: 'Purchase Order Receipts', desc: 'PO receipt inspection records with lot number tracking.', lastRun: null, params: 'po-receipts' },
  { id: 'inspection-signoff', cat: 'Quality Reports', name: 'Blank Inspection Sign Off Log', desc: 'Inspection sign-off log for blank/new items by date range.', lastRun: 7 },
  { id: 'missing-docs', cat: 'Quality Reports', name: 'Invoiced Repairs with Missing Docs', desc: 'Invoiced repairs flagged for incomplete or missing documentation.', lastRun: 2, params: 'quality-std' },
  { id: 'defect-tracking', cat: 'Quality Reports', name: 'Defect Tracking Report', desc: 'Defect frequency and trending by instrument type and date range.', lastRun: null, params: 'quality-std' },
  { id: 'repairs-40-days', cat: 'Quality Reports', name: 'Repairs Within 40 Days', desc: 'Repeat repairs on same scope within 40-day warranty/SLA threshold.', lastRun: 5, params: 'quality-std' },
  { id: 'repair-amendments', cat: 'Quality Reports', name: 'Repair Amendments Report', desc: 'Amendments and corrections applied to completed repair orders.', lastRun: null },

  // Operations Reports
  { id: 'mgmt-report', cat: 'Operations Reports', name: 'Management Report', desc: 'Executive summary of operational metrics by client and period.', lastRun: 2 },
  { id: 'vendor-tracking', cat: 'Operations Reports', name: 'Vendor Tracking', desc: 'Subcontractor and vendor repair tracking by client and vendor.', lastRun: null, params: 'vendor' },
  { id: 'loaners-by-date', cat: 'Operations Reports', name: 'Loaners by Date Range', desc: 'Loaner scope assignments and returns within date range.', lastRun: 5 },
  { id: 'mobile-app-metrics', cat: 'Operations Reports', name: 'Mobile App Metrics', desc: 'Usage statistics for the mobile/portal application.', lastRun: null, extractOnly: true },
  { id: 'tech-barcodes', cat: 'Operations Reports', name: 'Technician Barcodes', desc: 'Barcode labels for technician identification and scanning.', lastRun: null },
  { id: 'new-portal-users', cat: 'Operations Reports', name: 'New Portal Users', desc: 'Recently created customer portal accounts.', lastRun: null, extractOnly: true },
  { id: 'missed-del-rates', cat: 'Operations Reports', name: 'Missed Delivery Dates - Rates', desc: 'On-time delivery rate analysis and trending.', lastRun: 3 },
  { id: 'missed-del-carrier', cat: 'Operations Reports', name: 'Missed Delivery Dates - Carrier', desc: 'Missed deliveries broken down by shipping carrier.', lastRun: null },
  { id: 'missed-del-ts', cat: 'Operations Reports', name: 'Missed Delivery Dates - TS', desc: 'Missed deliveries attributable to Total Scope processing delays.', lastRun: null },
  { id: 'activity-tracking', cat: 'Operations Reports', name: 'Activity Tracking', desc: 'Repair activity by date field with wildcard item filtering.', lastRun: 4, extractOnly: true, params: 'activity-tracking' },
  { id: 'client-report-card', cat: 'Operations Reports', name: 'Client Report Card', desc: 'Consolidated client performance: monthly breakdown, serial counts, and loaner requests.', lastRun: 1, extractOnly: true, params: 'client-report-card' },
  { id: 'new-customers', cat: 'Operations Reports', name: 'New Customers', desc: 'Recently onboarded customer accounts by date range.', lastRun: null, extractOnly: true },
  { id: 'loaner-requests', cat: 'Operations Reports', name: 'Loaner Requests', desc: 'Loaner scope requests with fulfillment status and dates.', lastRun: 8 },
  { id: 'at-risk-depts', cat: 'Operations Reports', name: 'At Risk Departments', desc: 'Department profitability risk analysis with configurable expense thresholds.', lastRun: null, extractOnly: true, params: 'at-risk' },
  { id: 'trending-workflow', cat: 'Operations Reports', name: 'Trending Workflow and Expenses', desc: 'Workflow and expense trending by repair detail, client, and department.', lastRun: null, extractOnly: true, params: 'trending' },
];

export const CATEGORIES = [
  'Repair Reports', 'Financial Reports', 'Contract Reports', 'Inventory Reports',
  'Client Reports', 'Sales Reports', 'GPO Reports', 'Quality Reports', 'Operations Reports',
];
