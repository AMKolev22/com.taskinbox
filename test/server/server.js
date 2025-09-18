import express from "express";
import cors from "cors";
import { PrismaClient } from "../generated/prisma/client.js"
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors({
  origin: "http://localhost:8080"
}));


function diffDays(from, to) {
  return Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
};



async function logActivity(actorId, action, absenceId = null, details = null) {
  try {
    console.log("Actor id", actorId);
    await prisma.activityLog.create({
      data: {
        actor: { connect: { id: actorId } },
        action,
        absence: { connect: { id: absenceId }},
        details,
      },
    });
  }
  catch (err) {
    console.log(err);
  }
};





// ROUTES RELATED TO AUTHENTICATION

app.post("/login", async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    let user = await prisma.user.findUnique({
      where: { email },
      select: { role: true, password: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || "New User",
          password,
          role: "MANAGER",
        },
      });
      return res.status(201).json({ message: "User created", user });
    }

    if (password !== user.password)
      return res.status(401).json({ error: "Invalid password" });

    const fullUser = await prisma.user.findUnique({
      where: { email },
      include: {
        absences: true,
        ActivityLog: true,
        ...(user.role === "MANAGER" && { managedAbsences: true })
      }
    });

    const formatDate = (date) => date.toISOString().split("T")[0];
    const formattedAbsences = fullUser.absences.map(abs => ({
      ...abs,
      dateFrom: formatDate(abs.dateFrom),
      dateTo: formatDate(abs.dateTo)
    }));

    const formattedManagedAbsences = fullUser.managedAbsences?.map(abs => ({
      ...abs,
      dateFrom: formatDate(abs.dateFrom),
      dateTo: formatDate(abs.dateTo)
    }));

    res.json({
      message: "Login successful",
      user: {
        ...fullUser,
        absences: formattedAbsences,
        managedAbsences: formattedManagedAbsences
      }
    });

  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});




// ROUTES RELATED TO ABSENCE CONTROL

app.get("/absences", async (req, res) => {
  try {
    const absences = await prisma.absence.findMany({
      include: { manager: true, substitute: true },
    });
    res.json(absences);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/absences/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if id is valid
    if (isNaN(id) || !req.params.id) {
      return res.json({ message: "Invalid or missing ID", absence: null });
    }
    
    const absence = await prisma.absence.findUnique({
      where: { id },
      include: { manager: true, substitute: true },
    });

    if (!absence) {
      return res.json({ message: "Absence not found", absence: null });
    }

    res.json(absence);
  }
  catch (err) {
    console.log(err);
    res.json({ message: "Error retrieving absence", absence: null, error: err.message });
  }
});

app.get("/absences/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Check if userId is valid
    if (isNaN(userId) || !req.params.userId) {
      return res.json({ message: "Invalid or missing user ID", absences: [] });
    }
    
    const absences = await prisma.absence.findMany({
      where: { userId },
      include: { manager: true, substitute: true },
    });
    
    const formatDate = (date) => date.toISOString().split("T")[0];
    const formattedAbsences = absences.map(abs => ({
      ...abs,
      dateFrom: formatDate(abs.dateFrom),
      dateTo: formatDate(abs.dateTo)
    }));
    
    res.json(formattedAbsences);
  }
  catch (err) {
    console.error(err);
    res.json({ message: "Error retrieving user absences", absences: [], error: err.message });
  }
});

app.post("/absences/validate", async (req, res) => {
  try {
    const { type, dateFrom, dateTo, substituteId } = req.body;

    const parsedFrom = new Date(dateFrom);
    const parsedTo = new Date(dateTo);
    const today = new Date();
    const days = diffDays(parsedFrom, parsedTo);
    const diffBefore = (parsedFrom - today) / (1000 * 60 * 60 * 24);

    if (type === "PLANNED") {
      if (days === 1 && diffBefore < 1)
        return res.status(400).json({ error: "1-day absence must be submitted at least the previous day." });

      if (days >= 2 && days <= 5 && diffBefore < 7)
        return res.status(400).json({ error: "2–5 days absence must be submitted at least 1 week earlier." });

      if (days > 5 && diffBefore < 14)
        return res.status(400).json({ error: "Absence longer than 5 days must be submitted at least 2 weeks earlier." });

      if (days > 3 && !substituteId)
        return res.status(400).json({ error: "Substitute is required for planned absence longer than 3 days." });
    }

    res.json({ message: "Validation passed" });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/absences", async (req, res) => {
  try {
    const { type, dateFrom, dateTo, userId, managerId, paid, substituteId, comment, confirmed } = req.body;

    if (!userId || !managerId)
      return res.status(400).json({ message: "userId and managerId are required" });

    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) return res.status(400).json({ message: "Manager not found" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const newAbsence = await prisma.absence.create({
      data: {
        type,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        user: { connect: { id: userId } },
        manager: { connect: { id: managerId } },
        confirmed,
        paid: type === "PLANNED" ? paid : null,
        substitute: substituteId ? { connect: { id: substituteId } } : undefined,
        comment: type === "SICK_LEAVE" ? comment : null,
      },
      include: { user: true, manager: true, substitute: true },
    });

    await logActivity(userId, "CREATE_ABSENCE", newAbsence.id, "Absence request created");
    res.status(201).json({ message: "Successfully created a new absence!", data: newAbsence });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/absences/:id/confirm", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { actorId } = req.body;

    const absence = await prisma.absence.update({
      where: { id },
      data: { confirmed: true }
    });
    console.log("Server actor id", actorId)

    await logActivity(actorId, "APPROVE_ABSENCE", id, "Absence confirmed");
    res.json({ message: "Absence confirmed", absence });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/absences/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { actorId } = req.body;

    const absence = await prisma.absence.update({
      where: { id },
      data: { confirmed: false } // or you can use a separate status field if you have one
    });

    await logActivity(actorId, "REJECT_ABSENCE", id, "Absence rejected");

    res.json({ message: "Absence rejected", absence });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/absences/:id", async (req, res) => {
  try {
    const { dateFrom, dateTo, paid, substituteId, comment, actorId } = req.body; // actor is the person, performing the action

    const updatedAbsence = await prisma.absence.update({
      where: { id: parseInt(req.params.id) },
      data: {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        paid,
        substitute: substituteId ? { connect: { id: substituteId } } : undefined,
        comment,
      },
      include: { manager: true, substitute: true },
    });

    await logActivity(actorId, "UPDATE_ABSENCE", updatedAbsence.id, "Absence updated");
    res.json(updatedAbsence);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});


app.delete("/absences/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { actorId } = req.body; // actor is the person, performing the action

    await logActivity(actorId, "CANCEL_ABSENCE", id, "Absence deleted");
    await prisma.absence.delete({ where: { id } });
    res.json({ message: "Absence deleted" });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});




// ROUTES RELATED TO SUBSCRIPTIONS

app.put("/subscribe/:id", async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { currentUserId } = req.body;
    console.log(currentUserId);

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: { subscribedTo: { connect: { id: targetUserId } } },
      include: { subscribedTo: true },
    });

    res.json({ message: `Successfully subscribed to user ${targetUserId}`, data: updatedUser.subscribedTo });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.post("/unsubscribe", async (req, res) => {
  try {
    const { currentUserId, subscribedToId } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: { subscribedTo: { disconnect: { id: subscribedToId } } },
      include: { subscribedTo: true },
    });

    res.json({ message: `Successfully unsubscribed from user ${subscribedToId}`, data: updatedUser.subscribedTo });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/subscriptions/:userId", async (req, res) => {
  try {
    const currentUserId = parseInt(req.params.userId);
    
    // Check if userId is valid
    if (isNaN(currentUserId) || !req.params.userId) {
      return res.json({ message: "Invalid or missing user ID", data: [] });
    }

    const userWithSubscriptions = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { subscribedTo: true },
    });

    if (!userWithSubscriptions) {
      return res.json({ message: "User not found", data: [] });
    }

    console.log("Server sub: ", userWithSubscriptions.subscribedTo);
    res.json({
      message: `User ${currentUserId} subscriptions`,
      data: userWithSubscriptions.subscribedTo,
    });
  }
  catch (err) {
    console.error(err);
    res.json({ message: "Error retrieving subscriptions", data: [], error: err.message });
  }
});




// GET ROUTES FOR ALL USERS (AND MANAGERS OPTIONALLY)

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  }
  catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/activity/:userId", async (req, res) => {
  try {
    const currentUserId = parseInt(req.params.userId);
    
    // Check if userId is valid
    if (isNaN(currentUserId) || !req.params.userId) {
      return res.json({ message: "Invalid or missing user ID", data: [] });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { ActivityLog: true },
    });

    if (!user) {
      return res.json({ message: "User not found", data: [] });
    }

    res.json({
      message: `User ${currentUserId} activity`,
      data: user.ActivityLog,
    });
  }
  catch (err) {
    console.error(err);
    res.json({ message: "Error retrieving activity", data: [], error: err.message });
  }
});


app.get("/managers", async (req, res) => {
  try {
    const managers = await prisma.user.findMany({ where: { role: "MANAGER" } });
    res.json(managers);
  }
  catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/pendingManaged/:id", async (req, res) => {
  try {
    const currentUserId = parseInt(req.params.id, 10);
    
    // Check if id is valid
    if (isNaN(currentUserId) || !req.params.id) {
      return res.json({ message: "Invalid or missing manager ID", managedAbsences: [] });
    }
    
    const managedAbsences = await prisma.absence.findMany({
      where: {
        managerId: currentUserId,
        confirmed: false
      },
      include: {
        user: true
      },
    });
    
    res.json({ managedAbsences });
  }
  catch (err) {
    console.error(err);
    res.json({ message: "Error retrieving managed absences", managedAbsences: [], error: err.message });
  }
})




const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});