import app from '../server.ts';

/**
 * Vercel Serverless Function entry point for GymFlow API.
 * Wraps Express in a lifecycle-safe Promise to guarantee Lambda remains active
 * until the HTTP response stream is completely flushed.
 */
export default function handler(req: any, res: any) {
  return new Promise<void>((resolve, reject) => {
    // Keep Serverless function alive until response is finished
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
    res.on('error', (err: any) => {
      console.error('[Vercel API Stream Error]', err);
      reject(err);
    });

    try {
      // Normalize URL: preserve original requested path if rewritten by Vercel
      if (req.url === '/api' || req.url === '/' || req.url === '') {
        const originalUrl = req.headers['x-forwarded-uri'] || 
                            req.headers['x-original-url'] || 
                            req.headers['x-vercel-original-url'];
        if (originalUrl && typeof originalUrl === 'string' && originalUrl.startsWith('/api')) {
          req.url = originalUrl;
        }
      } else if (!req.url.startsWith('/api')) {
        // If /api prefix was stripped by Vercel routing
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }

      // Delegate request to Express
      app(req, res, (err: any) => {
        if (err) {
          console.error('[Vercel Express Error]', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Erro interno ao processar requisição na nuvem.',
              error: err?.message || String(err)
            });
          }
        } else if (!res.headersSent) {
          res.status(404).json({
            success: false,
            message: `Rota da API não encontrada: ${req.method} ${req.url}`
          });
        }
        resolve();
      });
    } catch (err: any) {
      console.error('[Vercel Serverless Handler Exception]', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Falha crítica na execução da função serverless.',
          error: err?.message || String(err)
        });
      }
      resolve();
    }
  });
}
