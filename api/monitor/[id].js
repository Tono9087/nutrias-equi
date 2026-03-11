// SSE monitor endpoint - Not supported on Vercel serverless.
// The frontend now uses polling via /api/sensor instead.
// This endpoint is kept for backwards compatibility but does nothing.
module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }
  // Return empty SSE stream that closes immediately
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(': SSE not supported on Vercel serverless. Use polling via /api/sensor.\n\n');
  res.end();
};
