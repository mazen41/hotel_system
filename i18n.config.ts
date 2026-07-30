import defineConfig from 'next-intl/config';

export default defineConfig({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always'
});
