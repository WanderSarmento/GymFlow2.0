import app from '../server.ts';

export default function handler(req: any, res: any) {
  const matched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (matched && typeof matched === 'string' && matched.startsWith('/api')) {
    req.url = matched;
  }
  return app(req, res);
}
