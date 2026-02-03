const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const path = require('path');
const next = require('next');

// Configurar opciones globales de Cloud Functions
setGlobalOptions({
  maxInstances: 10,
  memory: '1GiB',
  timeoutSeconds: 540,
  invoker: 'public',
});

// Helper para crear una función Next.js
const createNextAppFunction = (appName, appPath, prepareOnInit = false) => {
  const nextApp = next({
    dev: false,
    conf: {
      distDir: '.next',
    },
    dir: path.resolve(__dirname, appPath),
  });

  let handler = null;
  let isPreparing = false;
  let preparePromise = null;

  const prepare = async () => {
    if (handler) return handler;
    if (isPreparing) return preparePromise;
    
    isPreparing = true;
    preparePromise = (async () => {
      try {
        await nextApp.prepare();
        handler = nextApp.getRequestHandler();
        isPreparing = false;
        return handler;
      } catch (error) {
        isPreparing = false;
        throw error;
      }
    })();
    
    return preparePromise;
  };

  // Preparar inmediatamente si se solicita (para la app principal)
  if (prepareOnInit) {
    prepare().catch(err => {
      console.error(`Error preparing ${appName} on init:`, err);
    });
  }

  return onRequest({
    invoker: 'public',
    timeoutSeconds: 540,
    memory: '1GiB',
  }, async (req, res) => {
    try {
      const handle = await prepare();
      return handle(req, res);
    } catch (error) {
      console.error(`Error in ${appName}:`, error);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  });
};

// Crear funciones separadas para cada app
// Preparar public-web inmediatamente (app principal)
exports.nextjsServerPublicWeb = createNextAppFunction('public-web', 'public-web', true);
exports.nextjsServerAdmin = createNextAppFunction('admin', 'admin', false);
exports.nextjsServerDealer = createNextAppFunction('dealer', 'dealer', false);
exports.nextjsServerSeller = createNextAppFunction('seller', 'seller', false);
exports.nextjsServerAdvertiser = createNextAppFunction('advertiser', 'advertiser', false);

// Función única que enruta a la app correcta (para compatibilidad)
exports.nextjsServer = onRequest({
  invoker: 'public',
  timeoutSeconds: 540,
  memory: '1GiB',
}, async (req, res) => {
  try {
    const host = req.headers.host || '';
    const url = req.url || '';
    
    let targetFunction = exports.nextjsServerPublicWeb; // default

    if (host.includes('admin') || host.includes('admin-panel') || url.startsWith('/admin')) {
      targetFunction = exports.nextjsServerAdmin;
    } else if (host.includes('dealer') || host.includes('dealer-dashboard') || url.startsWith('/dealer')) {
      targetFunction = exports.nextjsServerDealer;
    } else if (host.includes('seller') || host.includes('seller-dashboard') || url.startsWith('/seller')) {
      targetFunction = exports.nextjsServerSeller;
    } else if (host.includes('advertiser') || host.includes('advertiser-dashboard') || url.startsWith('/advertiser')) {
      targetFunction = exports.nextjsServerAdvertiser;
    }

    return targetFunction(req, res);
  } catch (error) {
    console.error('Error routing request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

