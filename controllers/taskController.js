const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

// Select task details and related user information
const taskSelect = {
  id: true,
  title: true,
  isCompleted: true,
  priority: true,
  createdAt: true,
  User: {
    select: {
      name: true,
      email: true,
    },
  },
};

// Create a task
async function create(req, res, next) {
  const { error, value } = taskSchema.validate(req.body || {});

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.isCompleted,
        priority: value.priority,
        userId: req.user.id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
      },
    });

    return res.status(201).json(task);
  } catch (err) {
    if (typeof next === "function") {
      return next(err);
    }

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// Get tasks with eager loading, pagination, and searching
async function index(req, res, next) {
  try {
    const query = req.query || {};

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: "Invalid pagination parameters.",
      });
    }

    const skip = (page - 1) * limit;

    const whereClause = {
      userId: req.user.id,
    };

    // Optional case-insensitive title search
    if (query.find) {
      if (typeof query.find !== "string") {
        return res.status(400).json({
          message: "Invalid search parameter.",
        });
      }

      whereClause.title = {
        contains: query.find,
        mode: "insensitive",
      };
    }

    const userTasks = await prisma.task.findMany({
      where: whereClause,
      select: taskSelect,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalTasks = await prisma.task.count({
      where: whereClause,
    });

    const pagination = {
      page,
      limit,
      total: totalTasks,
      pages: Math.ceil(totalTasks / limit),
      hasNext: page * limit < totalTasks,
      hasPrev: page > 1,
    };

    return res.status(200).json({
      tasks: userTasks,
      pagination,
    });
  } catch (err) {
    return next(err);
  }
}

// Get one task
async function show(req, res, next) {
  const taskId = Number(req.params?.id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId: req.user.id,
      },
      select: taskSelect,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
}

// Update a task
async function update(req, res, next) {
  const { error, value } = patchTaskSchema.validate(req.body || {});

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const taskId = Number(req.params?.id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.update({
      where: {
        id: taskId,
        userId: req.user.id,
      },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
      },
    });

    return res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return next(err);
  }
}

// Delete a task
async function deleteTask(req, res, next) {
  const taskId = Number(req.params?.id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const deletedTask = await prisma.task.delete({
      where: {
        id: taskId,
        userId: req.user.id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
      },
    });

    return res.status(200).json(deletedTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return next(err);
  }
}

// Create multiple tasks in one database operation
async function bulkCreate(req, res, next) {
  const { tasks } = req.body || {};

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate every task before inserting anything
  const validTasks = [];

  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }

    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted,
      priority: value.priority,
      userId: req.user.id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    return res.status(201).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
  bulkCreate,
};