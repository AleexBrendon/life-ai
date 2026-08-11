const crypto = require("crypto");

const getTokenKey = (token) => {
  const hash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return `auth:revoked:${hash}`;
};

module.exports = {
  getTokenKey,
};