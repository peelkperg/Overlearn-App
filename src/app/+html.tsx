import Constants from 'expo-constants';
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// AD-3: app.json#expo.experiments.baseUrl is the single source of truth for
// the deploy base path -- read it at build time rather than hardcoding a
// second copy of the path the manifest generator also derives.
const baseUrl = Constants.expoConfig?.experiments?.baseUrl;

if (
  typeof baseUrl !== 'string' ||
  !baseUrl.startsWith('/') ||
  !baseUrl.endsWith('/') ||
  baseUrl.includes('//')
) {
  throw new Error(
    `expo.experiments.baseUrl must be set in app.json, start and end with "/", and contain no "//" (got: ${JSON.stringify(baseUrl)}).`
  );
}

/**
 * This file is web-only and used to configure the root HTML for every
 * web page during static rendering. Any modifications to this file will
 * take effect in the entire app.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="manifest" href={`${baseUrl}manifest.json`} />
        {/* src/constants/theme.ts light.accent is the source of truth for this color. */}
        <meta name="theme-color" content="#127A45" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
