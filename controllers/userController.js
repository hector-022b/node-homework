
const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

const scrypt = util.promisify(crypto.scrypt);

// Hash passwords before storing them
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);

  return `${salt}:${derivedKey.toString("hex")}`;
}

// Compare a login password with the stored hash
async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Register a user
async function register(req, res, next) {
  const { error, value } = userSchema.validate(req.body || {}, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  try {
    const hashedPassword = await hashPassword(value.password);

    const result = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [value.email, value.name, hashedPassword]
    );

    const user = result.rows[0];

    global.user_id = user.id;

    return res.status(201).json({
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({
        message: "User already exists.",
      });
    }

    return next(err);
  }
}

// Log on
async function logon(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const goodCredentials = await comparePassword(
      password,
      user.hashed_password
    );

    if (!goodCredentials) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    global.user_id = user.id;

    return res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    return next(err);
  }
}

// Log off
function logoff(req, res) {
  global.user_id = null;

  return res.status(200).json({
    message: "Logged off successfully.",
  });
}

module.exports = {
  register,
  logon,
  logoff,
};
