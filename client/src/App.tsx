import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import tsiTheme from './theme/antdTheme';
import { router } from './router';
import { ServiceLocationProvider } from './hooks/useServiceLocation';
import './theme/tokens.css';
import './theme/hover.css';

const App = () => (
  <ConfigProvider theme={tsiTheme}>
    <ServiceLocationProvider>
      <RouterProvider router={router} />
    </ServiceLocationProvider>
  </ConfigProvider>
);

export default App;
