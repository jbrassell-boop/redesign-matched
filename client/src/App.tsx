import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import tsiTheme from './theme/antdTheme';
import { router } from './router';
import './theme/tokens.css';

const App = () => (
  <ConfigProvider theme={tsiTheme}>
    <RouterProvider router={router} />
  </ConfigProvider>
);

export default App;
