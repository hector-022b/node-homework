const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const pool = require("../db/pg-pool");

// Create a task
async function create(req, res, next) {
  const { error, value } = taskSchema.validate(req.body || {});

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, is_completed`,
      [value.title, value.isCompleted, global.user_id]
    );

    const task = result.rows[0];

    return res.status(201).json(task);
  } catch (err) {
  console.error("Task creation error:", err);

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
    const result = await pool.query(
      `SELECT id, title, is_completed
       FROM tasks
       WHERE user_id = $1
       ORDER BY id`,
      [global.user_id]
    );

    const userTasks = result.rows;

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
  const taskId = parseInt(req.params?.id);

  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, is_completed
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [taskId, global.user_id]
    );

    const task = result.rows[0];

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

  const taskId = parseInt(req.params?.id);

  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           is_completed = COALESCE($2, is_completed)
       WHERE id = $3 AND user_id = $4
       RETURNING id, title, is_completed`,
      [
        value.title ?? null,
        value.isCompleted ?? null,
        taskId,
        global.user_id,
      ]
    );

    const task = result.rows[0];

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

// Delete a task
async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_completed`,
      [taskId, global.user_id]
    );

    const deletedTask = result.rows[0];

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(deletedTask);
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
};