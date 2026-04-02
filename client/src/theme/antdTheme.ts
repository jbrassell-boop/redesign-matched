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
    fontSize: 13,          // Match TSI --text-base / --text-sm
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.12)',
    controlHeight: 32,     // Compact: toolbar/input height
    controlHeightSM: 28,   // Extra-compact variant
    controlHeightLG: 40,   // Standard form inputs
    paddingContentHorizontal: 12,
    paddingContentVertical: 6,
    lineHeight: 1.4,
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
      fontSize: 13,
      itemHeight: 34,
    },
    Table: {
      headerBg: '#F9FAFB',
      rowHoverBg: '#E8F0FE',
      fontSize: 13,
      cellPaddingBlock: 6,
      cellPaddingInline: 12,
      headerSplitColor: 'transparent',
    },
    Button: {
      primaryColor: '#fff',
      fontSize: 13,
      contentFontSize: 13,
    },
    Input: {
      fontSize: 13,
    },
    Form: {
      labelFontSize: 12,
      itemMarginBottom: 12,
    },
    Tabs: {
      titleFontSize: 13,
      horizontalItemPadding: '8px 18px',
    },
    Typography: {
      fontSize: 13,
    },
  },
};

export default tsiTheme;
