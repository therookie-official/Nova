// Single source of truth for Nova's design tokens.
// Plain CommonJS so tailwind.config.js can require it; typed by tokens.d.ts.
//
// Contrast, computed with the WCAG formula (AA needs 4.5:1 for normal text).
// On `background` #0B0D12:  text 17.6 · textMuted 9.1 · primarySoft 9.2 · danger 7.0
// On `surface` #141821:     text 16.1 · textMuted 8.3 · primarySoft 8.4
// On `surfaceAlt` #1C2230:  textMuted 7.5
// White on `primary` #6C4DFF (primary buttons, selected chips): 5.1
// `background` on `danger` #FF6B6B (danger button): 7.0
// Sizes are deliberately large so text stays readable on a phone.

const colors = {
  background: '#0B0D12',
  surface: '#141821',
  surfaceAlt: '#1C2230',
  border: '#2A3243',
  text: '#F2F4F8',
  textMuted: '#A9B2C3',
  primary: '#6C4DFF',
  primarySoft: '#B7A6FF',
  accent: '#2DD4BF',
  danger: '#FF6B6B',
  success: '#4ADE80',
  warning: '#FBBF24',
  overlay: 'rgba(0,0,0,0.6)',
};

const radius = {
  card: '16px',
  button: '14px',
  pill: '999px',
};

const fontSize = {
  sm: ['15px', '22px'],
  base: ['17px', '25px'],
  lg: ['20px', '28px'],
  xl: ['24px', '32px'],
  '2xl': ['30px', '38px'],
  '3xl': ['36px', '44px'],
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

module.exports = { colors, radius, fontSize, spacing };
