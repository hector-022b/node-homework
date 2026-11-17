const express = require("express");
const taskController = require("../controllers/taskController");

const router = express.Router();

router.post("/", taskController.create);
router.get("/", taskController.index);

// Week 7: Bulk task creation
router.post("/bulk", taskController.bulkCreate);

router.get("/:id", taskController.show);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.deleteTask);

module.exports = router;