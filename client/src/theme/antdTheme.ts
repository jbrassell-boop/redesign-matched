import type { ThemeConfig } from 'antd';

/**
 * Shared color constants for the Ant Design theme.
 * These MUST stay in sync with the CSS variables defined in tokens.css.
 */
const COLORS = {
  primary: '#2E75B6',
  error: '#B71234',
  success: '#16A34A',
  warning: '#F59E0B',
  bgBase: '#F9FAFB',
  textBase: '#111827',
  border: '#E5E7EB',
  sidebar: '#1E293B',
  primaryLight: '#E8F0FE',
} as const;

const tsiTheme: ThemeConfig = {
  token: {
    colorPrimary: COLORS.primary,
    colorError: COLORS.error,
    colorSuccess: COLORS.success,
    colorWarning: COLORS.warning,
    colorBgBase: COLORS.bgBase,
    colorTextBase: COLORS.textBase,
    colorBorder: COLORS.border,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,          // Match TSI --text-sm (compact density)
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
      siderBg: COLORS.sidebar,
      headerBg: COLORS.sidebar,
      headerHeight: 64,
    },
    Menu: {
      darkItemBg: COLORS.sidebar,
      darkSubMenuItemBg: COLORS.sidebar,
      darkItemSelectedBg: 'rgba(46, 117, 182, 0.15)',
      darkItemSelectedColor: '#fff',
      darkItemColor: 'rgba(255,255,255,0.7)',
      fontSize: 13,
      itemHeight: 34,
    },
    Table: {
      headerBg: COLORS.bgBase,
      rowHoverBg: COLORS.primaryLight,
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
