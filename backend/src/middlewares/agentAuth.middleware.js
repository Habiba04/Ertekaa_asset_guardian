/**
 * Validates the shared static API key sent by tracker-agent.ps1
 * in the "x-agent-key" header against process.env.AGENT_API_KEY.
 */
function requireAgentKey(req, res, next) {
  const key = req.headers['x-agent-key'];

  if (!process.env.AGENT_API_KEY) {
    console.error('[agentAuth] AGENT_API_KEY is not configured on the server.');
    return res.status(500).json({ message: 'Agent authentication is not configured.' });
  }

  if (!key || key !== process.env.AGENT_API_KEY) {
    return res.status(401).json({ message: 'Invalid or missing agent API key.' });
  }

  return next();
}

module.exports = { requireAgentKey };
