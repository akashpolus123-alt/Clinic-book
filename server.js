const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/clinicbook";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define Appointment Schema
const appointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  clinicId: { type: String, required: true },
  doctorId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  age: String,
  date: { type: String, required: true },
  time: { type: String, required: true },
  type: { type: String, default: "Initial" },
  fee: { type: Number, default: 12000 },
  problem: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

// Nodemailer Transporter Setup (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'akashpolous123@gmail.com',
    pass: process.env.EMAIL_PASS || 'iwufsbgauvcfhwsy'
  }
});

const clinicsFile = path.join(__dirname, "data", "clinics.json");
const doctorsFile = path.join(__dirname, "data", "doctors.json");

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const data = fs.readFileSync(file, "utf8");
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 1. Clinics API Route
app.get("/api/clinics", (req, res) => {
  try {
    const clinics = readJSON(clinicsFile);
    res.json(clinics);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Doctors by Clinic API Route
app.get("/api/doctors/:clinicId", (req, res) => {
  try {
    const doctors = readJSON(doctorsFile);
    const clinicDoctors = doctors.filter(
      doctor => doctor.clinicId === req.params.clinicId
    );
    res.json(clinicDoctors);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Create Appointment API Route (MongoDB)
app.post("/api/appointments", async (req, res) => {
  try {
    const { clinicId, doctorId, name, phone, age, date, time, problem, type, fee } = req.body;

    if (!clinicId || !doctorId || !name || !phone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

    // 100% Unique ID generation to prevent duplicate key 500 error
    const uniqueId = "APT-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

    const newAppointment = new Appointment({
      id: uniqueId,
      clinicId,
      doctorId,
      name,
      phone,
      age: age || "",
      date,
      time,
      type: type || "Initial",
      fee: fee || 12000,
      problem: problem || "",
      status: "Pending"
    });

    await newAppointment.save();

    // Safe Email Notification
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'akashpolous123@gmail.com',
        to: process.env.CLINIC_EMAIL || 'akashpolous123@gmail.com',
        subject: `New Appointment Booking - ${newAppointment.id}`,
        text: `Nayi appointment book ho gayi hai!\n\nPatient Name: ${name}\nPhone: ${phone}\nAge: ${age || 'N/A'}\nDate: ${date}\nTime: ${time}\nType: ${newAppointment.type}\nFee: ${newAppointment.fee} PKR\nProblem: ${problem || 'N/A'}`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Email send error:", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    } catch (mailErr) {
      console.log("Mail exception caught safely:", mailErr);
    }

    res.json({
      success: true,
      message: "Appointment booked successfully!",
      appointment: newAppointment
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// 4. Get All Appointments (MongoDB)
app.get("/api/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Clinic Admin Login Route
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const clinics = readJSON(clinicsFile);
    
    const clinic = clinics.find(c => c.username === username && c.password === password);
    
    if (clinic) {
      res.json({ success: true, clinicId: clinic.id, clinicName: clinic.name });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Specific Clinic Appointments Route (MongoDB)
app.get("/api/clinic-appointments", async (req, res) => {
  try {
    const { clinicId } = req.query;
    const appointments = await Appointment.find({ clinicId });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Update Appointment Status (MongoDB)
app.put("/api/appointments/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updatedAppointment = await Appointment.findOneAndUpdate(
      { id: req.params.id },
      { status },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    res.json({
      success: true,
      message: "Appointment updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Delete Appointment (MongoDB)
app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const deleted = await Appointment.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    res.json({
      success: true,
      message: "Appointment deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Get Booked Slots (MongoDB)
app.get("/api/booked-slots", async (req, res) => {
  try {
    const { clinicId, doctorId, date } = req.query;
    const query = { clinicId, date, status: { $ne: "Cancelled" } };
    if (doctorId) query.doctorId = doctorId;

    const appointments = await Appointment.find(query);
    const bookedSlots = appointments.map(item => item.time);
    res.json(bookedSlots);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Clinic Booking App running on http://localhost:${PORT}`);
});

module.exports = app;