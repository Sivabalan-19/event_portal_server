const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(config.googleClientId);

function issueToken(user, shouldRemember) {
  const expiresIn = shouldRemember ? "30d" : "7d";
  const token = jwt.sign(
    { sub: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn },
  );
  return { token, expiresIn };
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, rollNo, department, year } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "missing required fields" });

    if (!["student", "organizer"].includes(role))
      return res.status(400).json({ error: "invalid role" });

    if (role === "student" && (!rollNo || !department || !year))
      return res.status(400).json({ error: "missing student details" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "email already registered" });

    const hash = await bcrypt.hash(password, 10);

    const userData = { name, email, password: hash, role };
    if (department) userData.department = department;
    if (role === "student") {
      userData.rollNo = rollNo;
      userData.year = year;
    }

    const user = new User(userData);
    await user.save();
    res.status(201).json({ message: "user registered" });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "missing email or password" });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    if (!user.password)
      return res.status(401).json({ error: "invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    const shouldRemember =
      rememberMe === true || rememberMe === "true" || rememberMe === 1 || rememberMe === "1";
    const { token, expiresIn } = issueToken(user, shouldRemember);
    res.json({ token, expiresIn, rememberMe: shouldRemember });
  } catch (err) {
    next(err);
  }
};

exports.googleLogin = async (req, res, next) => {
  try {
    const { credential, rememberMe } = req.body;
    if (!credential)
      return res.status(400).json({ error: "missing google credential" });
    if (!config.googleClientId)
      return res.status(500).json({ error: "google client id not configured" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: "unable to verify google account" });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ error: "google email not verified" });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name: payload.name || payload.given_name || "Google User",
        email,
        role: "student",
      });
      await user.save();
    }

    const shouldRemember =
      rememberMe === true || rememberMe === "true" || rememberMe === 1 || rememberMe === "1";
    const { token, expiresIn } = issueToken(user, shouldRemember);
    res.json({ token, expiresIn, rememberMe: shouldRemember });
  } catch (err) {
    next(err);
  }
};
