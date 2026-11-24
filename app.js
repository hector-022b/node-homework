const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimiter = require("express-rate-limit");

const timeRouter = require("./routes/timeRoutes");
const userRouter = require("./routes/userRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const jwtMiddleware = require("./middleware/jwtMiddleware");
const taskRouter = require("./routes/taskRoutes");
const analyticsRouter = require("./routes/analyticsRoutes");

const app = express();

const prisma = require("./db/prisma");

app.set("trust proxy", 1);

// Rate limiting
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);

app.use(helmet());

// Parse request bodies and cookies
app.use(express.json());
app.use(cookieParser());
app.use(xss());

// Register routes
app.use("/api", timeRouter);
app.use("/api/users", userRouter);
app.use("/api/tasks", jwtMiddleware, taskRouter);
app.use("/api/analytics", jwtMiddleware, analyticsRouter);

// Previous assignment's routes
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

// Database health check using Prisma
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({
      status: "error",
      db: "not connected",
      error: err.message,
    });
  }
});

// Middleware must go after all routes
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("HTTP server closed.");

    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

module.exports = { app, server };