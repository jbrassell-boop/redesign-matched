import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';
import { AppShell } from './components/shell/AppShell';
import { RouteGuard } from './components/common/RouteGuard';

// Stale-chunk recovery: when a new deploy lands while a user has the app
// open, dynamic-import chunks 404 because their content hash changed. The
// dashboard becomes unusable until the user manually hard-refreshes.
// Wrap every lazy() loader so a chunk-load failure triggers one reload to
// pick up the new bundle. sessionStorage guard prevents an infinite reload
// loop if the import fails for a different reason (e.g., genuine 500).
const CHUNK_RELOAD_KEY = 'tsi_chunkReloadAt';
function withChunkReload<T extends ComponentType<unknown>>(
  loader: () => Promise<{ default: T }>,
): () => Promise<{ default: T }> {
  return async () => {
    try {
      return await loader();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const looksLikeStaleChunk =
        /Failed to fetch dynamically imported module|Loading chunk .+ failed|ChunkLoadError|error loading dynamically imported module/i.test(msg);
      if (looksLikeStaleChunk) {
        const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
        const sinceLast = Date.now() - lastReloadAt;
        // Only reload once per ~30s — if a fresh reload still hits this, it's
        // not a stale-chunk issue and re-reloading would loop forever.
        if (sinceLast > 30000) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
          window.location.reload();
          return new Promise<{ default: T }>(() => { /* never resolves */ });
        }
      }
      throw err;
    }
  };
}

// Lazy-loaded pages (all use named exports). Each wrapped via withChunkReload.
const LoginPage = lazy(withChunkReload(() => import('./pages/login/LoginPage').then(m => ({ default: m.LoginPage }))));
const ClientsPage = lazy(withChunkReload(() => import('./pages/clients/ClientsPage').then(m => ({ default: m.ClientsPage }))));
const ContractsPage = lazy(withChunkReload(() => import('./pages/contracts/ContractsPage').then(m => ({ default: m.ContractsPage }))));
const PendingContractsPage = lazy(withChunkReload(() => import('./pages/pending-contracts/PendingContractsPage').then(m => ({ default: m.PendingContractsPage }))));
const DashboardPage = lazy(withChunkReload(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage }))));
const DepartmentsPage = lazy(withChunkReload(() => import('./pages/departments/DepartmentsPage').then(m => ({ default: m.DepartmentsPage }))));
const InventoryPage = lazy(withChunkReload(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage }))));
const RepairsPage = lazy(withChunkReload(() => import('./pages/repairs/RepairsPage').then(m => ({ default: m.RepairsPage }))));
const QualityPage = lazy(withChunkReload(() => import('./pages/quality/QualityPage').then(m => ({ default: m.QualityPage }))));
const LoanersPage = lazy(withChunkReload(() => import('./pages/loaners/LoanersPage').then(m => ({ default: m.LoanersPage }))));
const SuppliersPage = lazy(withChunkReload(() => import('./pages/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage }))));
const FinancialPage = lazy(withChunkReload(() => import('./pages/financial/FinancialPage').then(m => ({ default: m.FinancialPage }))));
const OnsiteServicesPage = lazy(withChunkReload(() => import('./pages/onsite-services/OnsiteServicesPage').then(m => ({ default: m.OnsiteServicesPage }))));
const ScopeModelPage = lazy(withChunkReload(() => import('./pages/scope-model/ScopeModelPage').then(m => ({ default: m.ScopeModelPage }))));
const InstrumentsPage = lazy(withChunkReload(() => import('./pages/instruments/InstrumentsPage').then(m => ({ default: m.InstrumentsPage }))));
const OutsourceValidationPage = lazy(withChunkReload(() => import('./pages/outsource-validation/OutsourceValidationPage').then(m => ({ default: m.OutsourceValidationPage }))));
const AcquisitionsPage = lazy(withChunkReload(() => import('./pages/acquisitions/AcquisitionsPage').then(m => ({ default: m.AcquisitionsPage }))));
const ProductSalePage = lazy(withChunkReload(() => import('./pages/product-sale/ProductSalePage').then(m => ({ default: m.ProductSalePage }))));
const ReportsPage = lazy(withChunkReload(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage }))));
const WorkspacePage = lazy(withChunkReload(() => import('./pages/workspace/WorkspacePage').then(m => ({ default: m.WorkspacePage }))));
const AdministrationPage = lazy(withChunkReload(() => import('./pages/administration/AdministrationPage').then(m => ({ default: m.AdministrationPage }))));
const DevelopmentListPage = lazy(withChunkReload(() => import('./pages/development-list/DevelopmentListPage').then(m => ({ default: m.DevelopmentListPage }))));
const EndoCartsPage = lazy(withChunkReload(() => import('./pages/endocarts/EndoCartsPage').then(m => ({ default: m.EndoCartsPage }))));
const ReceivingPage = lazy(withChunkReload(() => import('./pages/receiving/ReceivingPage').then(m => ({ default: m.ReceivingPage }))));
const RepairItemsPage = lazy(withChunkReload(() => import('./pages/repair-items/RepairItemsPage').then(m => ({ default: m.RepairItemsPage }))));
const FieldVerifierPage = lazy(withChunkReload(() => import('./pages/FieldVerifier/index').then(m => ({ default: m.FieldVerifierPage }))));
const NotFoundPage = lazy(withChunkReload(() => import('./pages/not-found/NotFoundPage').then(m => ({ default: m.NotFoundPage }))));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '2rem' }}><Spin size="large" /></div>}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
  },
  {
    path: '/verify',
    element: <SuspenseWrapper><FieldVerifierPage /></SuspenseWrapper>,
  },
  {
    element: <RouteGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
          { path: '/clients', element: <SuspenseWrapper><ClientsPage /></SuspenseWrapper> },
          { path: '/contracts', element: <SuspenseWrapper><ContractsPage /></SuspenseWrapper> },
          { path: '/pending-contracts', element: <SuspenseWrapper><PendingContractsPage /></SuspenseWrapper> },
          { path: '/dashboard', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
          { path: '/departments', element: <SuspenseWrapper><DepartmentsPage /></SuspenseWrapper> },
          { path: '/inventory', element: <SuspenseWrapper><InventoryPage /></SuspenseWrapper> },
          { path: '/quality', element: <SuspenseWrapper><QualityPage /></SuspenseWrapper> },
          { path: '/repairs', element: <SuspenseWrapper><RepairsPage /></SuspenseWrapper> },
          { path: '/repairs/:repairKey', element: <SuspenseWrapper><RepairsPage /></SuspenseWrapper> },
          { path: '/loaners', element: <SuspenseWrapper><LoanersPage /></SuspenseWrapper> },
          { path: '/suppliers', element: <SuspenseWrapper><SuppliersPage /></SuspenseWrapper> },
          { path: '/financial', element: <SuspenseWrapper><FinancialPage /></SuspenseWrapper> },
          { path: '/onsite-services', element: <SuspenseWrapper><OnsiteServicesPage /></SuspenseWrapper> },
          { path: '/scope-model', element: <SuspenseWrapper><ScopeModelPage /></SuspenseWrapper> },
          { path: '/instruments', element: <SuspenseWrapper><InstrumentsPage /></SuspenseWrapper> },
          { path: '/outsource-validation', element: <SuspenseWrapper><OutsourceValidationPage /></SuspenseWrapper> },
          { path: '/acquisitions', element: <SuspenseWrapper><AcquisitionsPage /></SuspenseWrapper> },
          { path: '/product-sale', element: <SuspenseWrapper><ProductSalePage /></SuspenseWrapper> },
          { path: '/reports', element: <SuspenseWrapper><ReportsPage /></SuspenseWrapper> },
          { path: '/workspace', element: <SuspenseWrapper><WorkspacePage /></SuspenseWrapper> },
          { path: '/administration', element: <SuspenseWrapper><AdministrationPage /></SuspenseWrapper> },
          { path: '/development-list', element: <SuspenseWrapper><DevelopmentListPage /></SuspenseWrapper> },
          { path: '/endocarts', element: <SuspenseWrapper><EndoCartsPage /></SuspenseWrapper> },
          { path: '/receiving', element: <SuspenseWrapper><ReceivingPage /></SuspenseWrapper> },
          { path: '/repair-items', element: <SuspenseWrapper><RepairItemsPage /></SuspenseWrapper> },
          { path: '*', element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper> },
        ],
      },
    ],
  },
]);
