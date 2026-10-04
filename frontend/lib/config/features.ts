/**
 * Feature Flags Configuration
 * Optional/extra components are hidden behind FEATURE_FLAGS.EXTRAS (default false).
 */
export const FEATURE_FLAGS = {
  EXTRAS: process.env.NEXT_PUBLIC_FEATURE_EXTRAS === 'true',
};
