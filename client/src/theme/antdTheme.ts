import type { ThemeConfig } from 'antd';

const tsiTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2E75B6',
    colorError: '#B71234',
    colorSuccess: '#16A34A',
    colorWarning: '#F59E0B',
    colorBgBase: '#F9FAFB',
    colorTextBase: '#111827',
    colorBorder: '#E5E7EB',
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.12)',
    controlHeight: 40,
    controlHeightSM: 32,
  },
  components: {
    Layout: {
      siderBg: '#1E293B',
      headerBg: '#1E293B',
      headerHeight: 64,
    },
    Menu: {
      darkItemBg: '#1E293B',
      darkSubMenuItemBg: '#1E293B',
      darkItemSelectedBg: 'rgba(46, 117, 182, 0.15)',
      darkItemSelectedColor: '#fff',
      darkItemColor: 'rgba(255,255,255,0.7)',
    },
    Table: {
      headerBg: '#F9FAFB',
      rowHoverBg: '#E8F0FE',
    },
    Button: {
      primaryColor: '#fff',
    },
  },
};

export default tsiTheme;
