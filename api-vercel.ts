import app from './server.ts';

/**
 * Vercel Serverless Function entry point for GymLivre SaaS API.
 * Wraps Express in a lifecycle-safe Promise to guarantee Lambda remains active
 * until the HTTP response stream is completely flushed.
 */
export default async function handler(req: any, res: any) {
  return new Promise<void>((resolve, reject) => {
    // Keep Serverless function alive until response is finished
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
    res.on('error', (err: any) => {
      console.error('[Vercel API Stream Error]', err);
      reject(err);
    });

    try {
      // Normalize URL: preserve original requested path from Vercel routing
      const origUrl = req.headers['x-forwarded-uri'] || 
                      req.headers['x-original-url'] || 
                      req.headers['x-vercel-original-url'] ||
                      req.originalUrl ||
                      req.url;

      if (origUrl && typeof origUrl === 'string') {
        if (origUrl.startsWith('/api')) {
          req.url = origUrl;
        } else {
          req.url = '/api' + (origUrl.startsWith('/') ? origUrl : '/' + origUrl);
        }
      }

      // Delegate request to Express app
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
