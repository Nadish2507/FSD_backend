import express from 'express';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().populate('owner', 'name email');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a project
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, requiredSkills } = req.body;
    const project = await Project.create({
      title,
      description,
      requiredSkills,
      owner: req.user._id,
      members: [req.user._id]
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .populate('joinRequests.student', 'name email');
    if (project) {
      res.json(project);
    } else {
      res.status(404).json({ message: 'Project not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Request to join a project
router.post('/:id/join', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if already a member
    if (project.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member of this project' });
    }

    // Check if already requested
    const alreadyRequested = project.joinRequests.find(
      r => r.student.toString() === req.user._id.toString()
    );
    if (alreadyRequested) {
      return res.status(400).json({ message: 'Join request already sent' });
    }

    const { message } = req.body;
    project.joinRequests.push({ student: req.user._id, message });
    await project.save();

    res.status(200).json({ message: 'Join request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Handle join request (Accept/Reject)
router.put('/:projectId/requests/:requestId', protect, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    const project = await Project.findById(req.params.projectId);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can manage requests' });
    }

    const request = project.joinRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;

    if (status === 'accepted') {
      project.members.push(request.student);
    }

    await project.save();
    res.json({ message: `Request ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add task to project
router.post('/:id/tasks', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    // Only members can add tasks
    if (!project.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only project members can add tasks' });
    }

    const { title, description, assignedTo } = req.body;
    project.tasks.push({ title, description, assignedTo });
    await project.save();
    res.status(201).json(project.tasks[project.tasks.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update task status
router.put('/:projectId/tasks/:taskId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = project.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.status = req.body.status;
    await project.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add member manually by email (for owner)
router.post('/:id/members', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    // Only owner can manually add members
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can manually add members' });
    }

    const { email } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    // Check if already a member
    if (project.members.includes(userToAdd._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push(userToAdd._id);
    await project.save();
    res.json({ message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
