import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';
import { AppShell } from './components/shell/AppShell';
import { RouteGuard } from './components/common/RouteGuard';

// Lazy-loaded pages (all use named exports)
const LoginPage = lazy(() => import('./pages/login/LoginPage').then(m => ({ default: m.LoginPage })));
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage').then(m => ({ default: m.ClientsPage })));
const ContractsPage = lazy(() => import('./pages/contracts/ContractsPage').then(m => ({ default: m.ContractsPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DepartmentsPage = lazy(() => import('./pages/departments/DepartmentsPage').then(m => ({ default: m.DepartmentsPage })));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const RepairsPage = lazy(() => import('./pages/repairs/RepairsPage').then(m => ({ default: m.RepairsPage })));
const QualityPage = lazy(() => import('./pages/quality/QualityPage').then(m => ({ default: m.QualityPage })));
const LoanersPage = lazy(() => import('./pages/loaners/LoanersPage').then(m => ({ default: m.LoanersPage })));
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const FinancialPage = lazy(() => import('./pages/financial/FinancialPage').then(m => ({ default: m.FinancialPage })));
const OnsiteServicesPage = lazy(() => import('./pages/onsite-services/OnsiteServicesPage').then(m => ({ default: m.OnsiteServicesPage })));
const ScopeModelPage = lazy(() => import('./pages/scope-model/ScopeModelPage').then(m => ({ default: m.ScopeModelPage })));
const InstrumentsPage = lazy(() => import('./pages/instruments/InstrumentsPage').then(m => ({ default: m.InstrumentsPage })));
const OutsourceValidationPage = lazy(() => import('./pages/outsource-validation/OutsourceValidationPage').then(m => ({ default: m.OutsourceValidationPage })));
const AcquisitionsPage = lazy(() => import('./pages/acquisitions/AcquisitionsPage').then(m => ({ default: m.AcquisitionsPage })));
const ProductSalePage = lazy(() => import('./pages/product-sale/ProductSalePage').then(m => ({ default: m.ProductSalePage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const WorkspacePage = lazy(() => import('./pages/workspace/WorkspacePage').then(m => ({ default: m.WorkspacePage })));
const AdministrationPage = lazy(() => import('./pages/administration/AdministrationPage').then(m => ({ default: m.AdministrationPage })));
const DevelopmentListPage = lazy(() => import('./pages/development-list/DevelopmentListPage').then(m => ({ default: m.DevelopmentListPage })));
const EndoCartsPage = lazy(() => import('./pages/endocarts/EndoCartsPage').then(m => ({ default: m.EndoCartsPage })));
const ReceivingPage = lazy(() => import('./pages/receiving/ReceivingPage').then(m => ({ default: m.ReceivingPage })));
const RepairItemsPage = lazy(() => import('./pages/repair-items/RepairItemsPage').then(m => ({ default: m.RepairItemsPage })));

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
    element: <RouteGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
          { path: '/clients', element: <SuspenseWrapper><ClientsPage /></SuspenseWrapper> },
          { path: '/contracts', element: <SuspenseWrapper><ContractsPage /></SuspenseWrapper> },
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
        ],
      },
    ],
  },
]);
