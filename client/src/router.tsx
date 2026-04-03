import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { RouteGuard } from './components/common/RouteGuard';
import { LoginPage } from './pages/login/LoginPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { ContractsPage } from './pages/contracts/ContractsPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { DepartmentsPage } from './pages/departments/DepartmentsPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { RepairsPage } from './pages/repairs/RepairsPage';
import { QualityPage } from './pages/quality/QualityPage';
import { LoanersPage } from './pages/loaners/LoanersPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { FinancialPage } from './pages/financial/FinancialPage';
import { OnsiteServicesPage } from './pages/onsite-services/OnsiteServicesPage';
import { ScopeModelPage } from './pages/scope-model/ScopeModelPage';
import { InstrumentsPage } from './pages/instruments/InstrumentsPage';
import { OutsourceValidationPage } from './pages/outsource-validation/OutsourceValidationPage';
import { AcquisitionsPage } from './pages/acquisitions/AcquisitionsPage';
import { ProductSalePage } from './pages/product-sale/ProductSalePage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { WorkspacePage } from './pages/workspace/WorkspacePage';
import { AdministrationPage } from './pages/administration/AdministrationPage';
import { DevelopmentListPage } from './pages/development-list/DevelopmentListPage';
import { EndoCartsPage } from './pages/endocarts/EndoCartsPage';
import { ReceivingPage } from './pages/receiving/ReceivingPage';
import { RepairItemsPage } from './pages/repair-items/RepairItemsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RouteGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/clients', element: <ClientsPage /> },
          { path: '/contracts', element: <ContractsPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/departments', element: <DepartmentsPage /> },
          { path: '/inventory', element: <InventoryPage /> },
          { path: '/quality', element: <QualityPage /> },
          { path: '/repairs', element: <RepairsPage /> },
          { path: '/repairs/:repairKey', element: <RepairsPage /> },
          { path: '/loaners', element: <LoanersPage /> },
          { path: '/suppliers', element: <SuppliersPage /> },
          { path: '/financial', element: <FinancialPage /> },
          { path: '/onsite-services', element: <OnsiteServicesPage /> },
          { path: '/scope-model', element: <ScopeModelPage /> },
          { path: '/instruments', element: <InstrumentsPage /> },
          { path: '/outsource-validation', element: <OutsourceValidationPage /> },
          { path: '/acquisitions', element: <AcquisitionsPage /> },
          { path: '/product-sale', element: <ProductSalePage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/workspace', element: <WorkspacePage /> },
          { path: '/administration', element: <AdministrationPage /> },
          { path: '/development-list', element: <DevelopmentListPage /> },
          { path: '/endocarts', element: <EndoCartsPage /> },
          { path: '/receiving', element: <ReceivingPage /> },
          { path: '/repair-items', element: <RepairItemsPage /> },
        ],
      },
    ],
  },
]);
