import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { RouteGuard } from './components/common/RouteGuard';
import { LoginPage } from './pages/login/LoginPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { RepairsPage } from './pages/repairs/RepairsPage';

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
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/repairs', element: <RepairsPage /> },
        ],
      },
    ],
  },
]);
