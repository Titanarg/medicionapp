/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// Este service worker puede ser personalizado
// https://developers.google.com/web/tools/workbox/modules/workbox-precaching

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precalcula el runtime y precachea las URL generadas durante la compilación
precacheAndRoute(self.__WB_MANIFEST);

// Maneja las navegaciones a través de una estrategia de Network First (red primero)
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  // Return false para pasar un manejo de ruta diferente
  ({ request, url }: { request: Request; url: URL }) => {
    if (request.mode !== 'navigate') {
      return false;
    }

    // Si es una URL que parece un archivo de recursos, devuelve falso
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Una estrategia de stale-while-revalidate para recursos
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && (
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')
    ),
  new StaleWhileRevalidate({
    cacheName: 'assets-cache',
  })
);

// Este se permite a la aplicación usar las últimas versiones de un archivo
// siempre que se actualice el service worker y asegura que reabriendo ya
// pestañas existentes no quedas atascado con versiones anteriores del SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 