// Netlify serverless function: GitHub OAuth token exchange proxy
// Receives ?code=XXX, exchanges with GitHub for an access_token
// client_secret is stored as GITHUB_CLIENT_SECRET env var on Netlify

exports.handler = async function (event) {
  // CORS headers for cross-origin requests from GitHub Pages
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  const code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing ?code parameter" }),
    };
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server misconfigured: missing client_id or client_secret" }),
    };
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: data.error_description || data.error }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ access_token: data.access_token }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Token exchange failed: " + err.message }),
    };
  }
};
