
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

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
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    return res.status(201).json(task);
  } catch (err) {
    console.error("Task creation error:", err);

    if (err.code === "P2003") {
      return res.status(400).json({
        message: "Invalid user reference.",
      });
    }

    if (typeof next === "function") {
      return next(err);
    }

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// Get all tasks for the logged-in user
async function index(req, res, next) {
  try {
    const userTasks = await prisma.task.findMany({
      where: {
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (userTasks.length === 0) {
      return res.status(404).json({
        message: "No tasks found.",
      });
    }

    return res.status(200).json(userTasks);
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
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
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
        userId: global.user_id,
      },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
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
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
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

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
