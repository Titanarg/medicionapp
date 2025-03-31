// Este código opcional se usa para registrar un service worker.
// register() no se llama por defecto.

// Esto permite que la aplicación cargue más rápido en visitas posteriores en producción y da
// capacidades offline. Sin embargo, también significa que los desarrolladores (y usuarios)
// solo verán las actualizaciones desplegadas en visitas posteriores a una página,
// después de que se hayan cerrado todas las pestañas/ventanas existentes en la página.
// Para obtener más información sobre las ventajas y desventajas de este modelo, y cómo
// optar por el registro, lee https://cra.link/PWA

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // La URL constructor está disponible en todos los navegadores que soportan SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Nuestro service worker no funcionará si PUBLIC_URL está en un origen diferente
      // al que sirve nuestra página. Esto podría pasar si un CDN se usa para
      // servir assets; ver https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // Esto se está ejecutando en localhost. Comprobemos si un service worker todavía existe o no.
        checkValidServiceWorker(swUrl, config);

        // Añadir algunos logs adicionales al localhost, apuntando a desarrolladores como
        // el service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'Esta web app está siendo servida con caché-first por un service ' +
              'worker. Para saber más, visitá https://cra.link/PWA'
          );
        });
      } else {
        // No es localhost. Solo registrar service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // En este punto, el contenido pre-almacenado en caché actualizado se ha recuperado,
              // pero el anterior service worker continuará sirviendo el contenido anterior
              // hasta que todas las pestañas del cliente estén cerradas.
              console.log(
                'Nuevo contenido está disponible y será usado cuando todas ' +
                  'las pestañas para esta página estén cerradas. Ver https://cra.link/PWA.'
              );

              // Ejecutar callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // En este punto, todo ha sido pre-cacheado.
              // Es el momento perfecto para mostrar un
              // "El contenido está almacenado en caché para uso offline." mensaje.
              console.log('El contenido está almacenado en caché para uso offline.');

              // Ejecutar callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error durante el registro del service worker:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Verifica si el service worker se puede encontrar. Si no puede vuelve a cargar la página.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Asegúrese de que el service worker existe y que realmente estamos obteniendo un archivo JS.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No se encontró ningún service worker. Probablemente una aplicación diferente. Vuelve a cargar la página.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker encontrado. Proceder normalmente.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No hay conexión a internet. La app se está ejecutando en modo offline.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
} 