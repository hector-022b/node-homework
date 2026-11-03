const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;

  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

// Create a task
function create(req, res) {
  const { error, value } = taskSchema.validate(req.body || {});

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const newTask = {
    id: taskCounter(),
    userId: global.user_id.email,
    ...value,
  };

  global.tasks.push(newTask);

  const { userId, ...sanitizedTask } = newTask;
  return res.status(201).json(sanitizedTask);
}

// Get all tasks for the logged-in user
function index(req, res) {
  const userTasks = global.tasks
    .filter((task) => task.userId === global.user_id.email)
    .map(({ userId, ...task }) => task);

  if (userTasks.length === 0) {
    return res.status(404).json({ message: "No tasks found." });
  }

  return res.status(200).json(userTasks);
}

// Get one task
function show(req, res) {
  const taskId = parseInt(req.params?.id);

  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === global.user_id.email
  );

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const { userId, ...sanitizedTask } = task;
  return res.status(200).json(sanitizedTask);
}

// Update a task
function update(req, res) {
  const { error, value } = patchTaskSchema.validate(req.body || {});

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const taskId = parseInt(req.params?.id);

  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === global.user_id.email
  );

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  Object.assign(task, value);

  const { userId, ...sanitizedTask } = task;
  return res.status(200).json(sanitizedTask);
}

// Delete a task
function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id);

  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskId && task.userId === global.user_id.email
  );

  if (taskIndex === -1) {
    return res.status(404).json({ message: "Task not found." });
  }

  const [deletedTask] = global.tasks.splice(taskIndex, 1);

  const { userId, ...sanitizedTask } = deletedTask;
  return res.status(200).json(sanitizedTask);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};