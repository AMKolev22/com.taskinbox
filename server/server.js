import express from "express";
import cors from "cors";
import { PrismaClient } from "../generated/prisma/client.js"

const app = express();
app.use(cors({
    origin: "http://localhost:8080"
}));
app.use(express.json());

const prisma = new PrismaClient();



app.post("/login", async (req, res) => {
    try {
        const { email, name, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find user
        let user = await prisma.user.findUnique({
            where: { email },
            select: { role: true, password: true }
        });

        // Create new user if not exists
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || "New User",
                    password,
                    role: "USER" // default role
                }
            });
            return res.status(201).json({ message: "User created", user });
        }

        // Check password
        if (password !== user.password) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Fetch full user data
        const fullUser = await prisma.user.findUnique({
            where: { email },
            include: {
                tasks: true,   // Tasks assigned to user
                Task: true,    // Tasks managed by user
                decisions: true
            }
        });

        const formatDate = (date) => date ? date.toISOString().split("T")[0] : null;

        const formattedTasks = fullUser.tasks?.map(task => ({
            ...task,
            dueDate: formatDate(task.dueDate)
        }));

        const formattedManagerTasks = fullUser.Task?.map(task => ({
            ...task,
            dueDate: formatDate(task.dueDate)
        }));

        res.json({
            message: "Login successful",
            user: {
                ...fullUser,
                tasks: formattedTasks,
                Task: formattedManagerTasks
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});




app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/tasks/pending', async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                status: 'PENDING'
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        decisions: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({ tasks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tasks/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        let where = {
            employeeId: userId
        };

        if (status) where.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await prisma.task.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                decisions: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: parseInt(limit)
        });

        const total = await prisma.task.count({ where });

        res.json({
            tasks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/task/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                decisions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const {
            type,
            title,
            priority,
            description,
            dueDate,
            assignedToId,
            employeeId
        } = req.body;

        if (!type || !title || !priority || !employeeId) {
            return res.status(400).json({
                error: 'Type, title, priority, and employeeId are required'
            });
        }

        const task = await prisma.task.create({
            data: {
                type,
                title,
                priority,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                employeeId, 
                assignedToId: assignedToId || null
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.put('/api/tasks/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const {
            priority,
            description,
            dueDate,
            assignedToId
        } = req.body;

        const existingTask = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (existingTask.employeeId !== req.user.id &&
            existingTask.assignedToId !== req.user.id &&
            req.user.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Not authorized to update this task' });
        }

        const updateData = {};
        if (priority) updateData.priority = priority;
        if (description !== undefined) updateData.description = description;
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/tasks/:taskId/approve', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment } = req.body;

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.status !== 'PENDING') {
            return res.status(400).json({
                error: 'Task has already been decided on'
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const decision = await tx.decision.create({
                data: {
                    action: 'APPROVED',
                    comment: comment || null,
                    taskId,
                    userId: req.user.id
                }
            });

            const updatedTask = await tx.task.update({
                where: { id: taskId },
                data: { status: 'APPROVED' },
                include: {
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    decisions: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            return { decision, task: updatedTask };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks/:taskId/reject', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment } = req.body;

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Check if task is still pending
        if (task.status !== 'PENDING') {
            return res.status(400).json({
                error: 'Task has already been decided on'
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const decision = await tx.decision.create({
                data: {
                    action: 'DECLINED',
                    comment: comment || null,
                    taskId,
                    userId: req.user.id
                }
            });

            const updatedTask = await tx.task.update({
                where: { id: taskId },
                data: { status: 'DECLINED' },
                include: {
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    decisions: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            return { decision, task: updatedTask };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks/:taskId/forward', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment, forwardToId } = req.body;

        if (!forwardToId) {
            return res.status(400).json({
                error: 'forwardToId is required when forwarding a task'
            });
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.status !== 'PENDING') {
            return res.status(400).json({
                error: 'Task has already been decided on'
            });
        }

        // Check if forward target user exists
        const forwardToUser = await prisma.user.findUnique({
            where: { id: forwardToId }
        });

        if (!forwardToUser) {
            return res.status(404).json({ error: 'User to forward to not found' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const decision = await tx.decision.create({
                data: {
                    action: 'FORWARDED',
                    comment: comment || null,
                    taskId,
                    userId: req.user.id
                }
            });

            const updatedTask = await tx.task.update({
                where: { id: taskId },
                data: {
                    assignedToId: forwardToId,
                    status: 'PENDING'
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    decisions: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            return { decision, task: updatedTask };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/tasks/:taskId/decisions', async (req, res) => {
    try {
        const { taskId } = req.params;

        const decisions = await prisma.decision.findMany({
            where: { taskId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(decisions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(3000, () => {
    console.log(`Server running on port 3000`);
});