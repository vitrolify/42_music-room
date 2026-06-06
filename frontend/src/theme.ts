import { StyleSheet } from 'react-native';

export const colors = {
  brand: '#FF0033',
  bg: {
    base: '#121212',
    surface: '#181818',
    card: '#1f1f1f',
    elevated: '#252525',
    alternate: '#272727',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b3b3b3',
    nearWhite: '#cbcbcb',
    light: '#fdfdfd',
  },
  semantic: {
    error: '#f3727f',
    warning: '#ffa42b',
    info: '#539df5',
  },
  border: {
    gray: '#4d4d4d',
    light: '#7c7c7c',
    separator: '#b3b3b3',
  },
  lightSurface: '#eeeeee',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const fonts = {
  title: 'Montserrat_700Bold',
  body: 'Inter_400Regular',
  bodyBold: 'Inter_700Bold',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const fontSizes = {
  sectionTitle: 24,
  featureHeading: 18,
  body: 16,
  button: 14,
  navLink: 14,
  caption: 14,
  small: 12,
  badge: 10.5,
  micro: 10,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
  xxxl: 43,
} as const;

export const borderRadius = {
  pill: 9999,
  circle: '50%' as any,
  card: 6,
  section: 8,
  input: 500,
} as const;

export const shadows = {
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg.base,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: fontSizes.sectionTitle,
    color: colors.text.primary,
  },
  heading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.featureHeading,
    color: colors.text.primary,
    lineHeight: 23,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.text.primary,
  },
  bodyBold: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.body,
    color: colors.text.primary,
  },
  secondaryText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.text.secondary,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.text.secondary,
  },
  captionBold: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    color: colors.text.primary,
    lineHeight: 21,
  },
  small: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.text.secondary,
  },
  smallBold: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.small,
    color: colors.text.primary,
    lineHeight: 18,
  },
  badge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.badge,
    color: colors.text.primary,
    lineHeight: 14,
  },
  micro: {
    fontFamily: fonts.body,
    fontSize: fontSizes.micro,
    color: colors.text.secondary,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: colors.bg.card,
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.md,
  },
  inputFocused: {
    borderColor: colors.text.primary,
    borderWidth: 1,
  },
  pillButton: {
    backgroundColor: colors.bg.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.button,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  primaryPillButton: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPillButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.button,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  link: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.button,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  linkActive: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.button,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  separator: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.text.secondary,
    marginVertical: spacing.lg,
  },
  activityIndicator: {
    marginRight: spacing.sm,
  },
});
