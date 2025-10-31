const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const axios = require("axios");

// AWS Cognito configuration - should come from environment variables
const REGION = process.env.AWS_REGION || "ap-southeast-1";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;

// URL for JSON Web Key Set (JWKS) - contains the public keys used to verify tokens
const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

// Cache for the JWKs to avoid fetching them on every request
let jwks = null;
let jwksLastFetched = null;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fetch the JSON Web Key Set from AWS Cognito
 * @returns {Promise<Object>} The JWKS
 */
const getJwks = async () => {
  // If we have cached JWKS and they're less than a day old, use them
  if (jwks && jwksLastFetched && Date.now() - jwksLastFetched < ONE_DAY_MS) {
    return jwks;
  }

  try {
    const response = await axios.get(JWKS_URL);
    jwks = response.data;
    jwksLastFetched = Date.now();
    return jwks;
  } catch (error) {
    console.error("Error fetching JWKS:", error);
    throw error;
  }
};

/**
 * Middleware to authenticate JWT token from AWS Cognito
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    // Extract token from header (remove "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    // Decode token header to get the key ID (kid)
    const tokenSections = token.split(".");
    if (tokenSections.length !== 3) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token format" });
    }

    const headerJSON = Buffer.from(tokenSections[0], "base64").toString("utf8");
    const header = JSON.parse(headerJSON);

    // Get JWKS
    const jwks = await getJwks();

    // Find the key that matches the key ID from the token
    const key = jwks.keys.find((k) => k.kid === header.kid);
    if (!key) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token: key not found" });
    }

    // Convert JWK to PEM format for verification
    const pem = jwkToPem(key);

    // Verify token
    const decodedToken = jwt.verify(token, pem, { algorithms: ["RS256"] });

    // Check if the token was issued for our app
    if (
      decodedToken.client_id !== APP_CLIENT_ID &&
      decodedToken.aud !== APP_CLIENT_ID
    ) {
      return res.status(401).json({
        success: false,
        message: "Token was not issued for this application",
      });
    }

    // Add user info to request object for use in route handlers
    req.user = {
      idToken: token,
      userId: decodedToken.sub, // The sub claim is the unique identifier for the user in Cognito
      email: decodedToken.email,
      username:
        decodedToken.preferred_username || decodedToken["cognito:username"],
      name: decodedToken.name,
      gender: decodedToken.gender,
      birthdate: decodedToken.birthdate,
      cognito: decodedToken, // Store the full token for access to additional attributes if needed
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = {
  authenticateJWT,
};
