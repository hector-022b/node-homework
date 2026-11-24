const crypto = require("crypto");
const util = require("util");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

const scrypt = util.promisify(crypto.scrypt);

// JWT cookie configuration
const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  const payload = { id: user.id, csrfToken: randomUUID() };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.cookie("jwt", token, {
    ...cookieFlags(req),
    maxAge: 3600000,
  });

  return payload.csrfToken;
};

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

// Register a user and create three welcome tasks
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

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: value.email,
          name: value.name,
          hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        {
          title: "Add your first task",
          userId: newUser.id,
          priority: "high",
        },
        {
          title: "Explore the app",
          userId: newUser.id,
          priority: "low",
        },
      ];

      await tx.task.createMany({
        data: welcomeTaskData,
      });

      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: {
            in: welcomeTaskData.map((task) => task.title),
          },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return {
        user: newUser,
        welcomeTasks,
      };
    });

    const csrfToken = setJwtCookie(req, res, result.user);

    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      csrfToken,
      transactionStatus: "success",
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "Email already registered",
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

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const goodCredentials = await comparePassword(
      password,
      user.hashedPassword,
    );

    if (!goodCredentials) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const csrfToken = setJwtCookie(req, res, user);

    return res.status(200).json({
      name: user.name,
      email: user.email,
      csrfToken,
    });
  } catch (err) {
    return next(err);
  }
}

// Log off
function logoff(req, res) {
  res.clearCookie("jwt", cookieFlags(req));

  return res.status(200).json({
    message: "Logged off successfully.",
  });
}

module.exports = {
  register,
  logon,
  logoff,
};