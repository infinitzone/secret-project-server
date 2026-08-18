module.exports.optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (e) {
    // ignore invalid token
  }
  next();
};