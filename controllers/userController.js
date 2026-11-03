const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");

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
async function register(req, res) {
  const { error, value } = userSchema.validate(req.body || {}, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const { name, email, password } = value;

  const existingUser = global.users.find(
    (user) => user.email === email
  );

  if (existingUser) {
    return res.status(400).json({
      message: "User already exists.",
    });
  }

  const hashedPassword = await hashPassword(password);

  const newUser = {
    name,
    email,
    hashedPassword,
  };

  global.users.push(newUser);
  global.user_id = newUser;

  return res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
}

// Log on
async function logon(req, res) {
  const { email, password } = req.body || {};

  const user = global.users.find(
    (user) => user.email === email?.trim().toLowerCase()
  );

  if (!user || typeof password !== "string") {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  const goodCredentials = await comparePassword(
    password,
    user.hashedPassword
  );

  if (!goodCredentials) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  global.user_id = user;

  return res.status(200).json({
    name: user.name,
    email: user.email,
  });
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