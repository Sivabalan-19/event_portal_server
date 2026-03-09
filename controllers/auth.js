const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "missing email or password" });
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "email already registered" });
    const hash = await bcrypt.hash(password, 10);
    console.log(hash);
    const user = new User({ email, password: hash });
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
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    const shouldRemember =
      rememberMe === true || rememberMe === "true" || rememberMe === 1 || rememberMe === "1";
    const expiresIn = shouldRemember ? "30d" : "7d";
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn },
    );
    res.json({ token, expiresIn, rememberMe: shouldRemember });
  } catch (err) {
    next(err);
  }
};
