import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for internal Next.js files and static assets
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the locale of the user
    '/(en|ar)/:path*',

    // Match all pathnames except for
    // - API routes
    // - Static files (_next/static, _next/image, favicon.ico, images, etc.)
    // - File downloads (.png, .jpg, .svg, etc.)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'
  ]
};
