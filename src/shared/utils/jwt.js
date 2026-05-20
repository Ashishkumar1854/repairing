const jwt = require("jsonwebtoken");

const env = require("../../core/config/env");

const buildPayload = ({ staffId, businessId, role }) => ({
  staffId,
  businessId,
  role,
});

const generateAccessToken = (payload) =>
  jwt.sign(
    {
      ...buildPayload(payload),
      tokenType: "access",
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    }
  );

const generateRefreshToken = (payload) =>
  jwt.sign(
    {
      ...buildPayload(payload),
      tokenType: "refresh",
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    }
  );

const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (payload.tokenType !== "access") {
    throw new Error("Invalid access token type");
  }

  return payload;
};

const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (payload.tokenType !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  return payload;
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
