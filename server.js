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
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nsf_clinic";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to NSF Clinic MongoDB successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define Appointment Schema with Advanced Finance & Commission Tracking
const appointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  clinicId: { type: String, default: "professorial-clinic" },
  doctorId: { type: String, default: "doc-shakil" },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  age: String,
  date: { type: String, required: true },
  time: { type: String, required: true },
  type: { type: String, default: "Initial" },
  fee: { type: Number, default: 12000 },
  advancePaid: { type: Number, default: 0 },
  platformCommission: { type: Number, default: 100 },
  clinicShare: { type: Number, default: 0 },
  paymentMethod: { type: String, default: "EasyPaisa/JazzCash" },
  problem: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

// HR Schema for Staff/Management Data
const hrSchema = new mongoose.Schema({
  staffId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  phone: { type: String, required: true },
  salary: { type: Number, default: 0 }
});
const Staff = mongoose.model("Staff", hrSchema);

// Nodemailer Transporter Setup
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

// 1. Clinic Info API Route
app.get("/api/clinics", (req, res) => {
  try {
    const clinics = readJSON(clinicsFile);
    res.json(clinics);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Doctor Info API Route
app.get("/api/doctors/:clinicId", (req, res) => {
  try {
    const doctors = readJSON(doctorsFile);
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Create Appointment (Fixed: Double-Booking Prevention & Exact Fee Handling)
app.post("/api/appointments", async (req, res) => {
  try {
    const { name, phone, age, date, time, problem, type, fee, paymentMethod } = req.body;

    if (!name || !phone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

    // Check if time slot is already booked for that date (Excluding cancelled appointments)
    const existingBooking = await Appointment.findOne({ 
      date: date, 
      time: time, 
      status: { $ne: "Cancelled" } 
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Yeh time slot pehle se book ho chuki hai! Bara-e-karam koi aur time ya date select karein."
      });
    }

    const consultFee = fee || (type === 'Follow-up' ? 8000 : 12000);
    const advancePaid = consultFee * 0.20;
    const platformCommission = 100;
    const clinicShare = advancePaid - platformCommission;

    const uniqueId = "APT-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

    const newAppointment = new Appointment({
      id: uniqueId,
      clinicId: "professorial-clinic",
      doctorId: "doc-shakil",
      name,
      phone,
      age: age || "",
      date,
      time,
      type: type || "Initial",
      fee: consultFee,
      advancePaid,
      platformCommission,
      clinicShare,
      paymentMethod: paymentMethod || "EasyPaisa/JazzCash",
      problem: problem || "",
      status: "Pending"
    });

    await newAppointment.save();

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'akashpolous123@gmail.com',
        to: process.env.CLINIC_EMAIL || 'akashpolous123@gmail.com',
        subject: `New NSF Clinic Appointment - ${newAppointment.id}`,
        text: `Nayi appointment book hui hai!\n\nPatient: ${name}\nPhone: ${phone}\nDate: ${date} (${time})\nType: ${type}\nFee: ${consultFee} PKR\n20% Advance Paid: ${advancePaid} PKR`
      };
      transporter.sendMail(mailOptions, () => {});
    } catch (mailErr) {}

    res.json({
      success: true,
      message: "Appointment booked successfully!",
      appointment: newAppointment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Admin Login Route for NSF Clinic
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === "nsf" && password === "nsf123") {
      res.json({ success: true, clinicId: "professorial-clinic", clinicName: "NSF Clinic" });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get Clinic Appointments
app.get("/api/clinic-appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find({ clinicId: "professorial-clinic" });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Track Appointment API Route
app.get("/api/track", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: "Booking ID ya Phone number likhein" });
    }
    
    const appointment = await Appointment.findOne({
      $or: [{ id: query }, { phone: query }]
    }).sort({ createdAt: -1 });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Koi appointment nahi mili is ID ya phone number par." });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Cancel Appointment Route (Added)
app.put("/api/appointments/cancel/:id", async (req, res) => {
  try {
    const updated = await Appointment.findOneAndUpdate(
      { id: req.params.id }, 
      { status: "Cancelled" },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Appointment nahi mili." });
    }
    res.json({ success: true, message: "Appointment successfully cancel ho gayi hai." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Finance Analytics Route
app.get("/api/finance-summary", async (req, res) => {
  try {
    const appointments = await Appointment.find({ clinicId: "professorial-clinic", status: { $ne: "Cancelled" } });
    
    let totalConsultationsRevenue = 0;
    let totalAdvanceCollected = 0;
    let totalYourCommission = 0;

    appointments.forEach(app => {
      totalConsultationsRevenue += (app.fee || 0);
      totalAdvanceCollected += (app.advancePaid || 0);
      totalYourCommission += (app.platformCommission || 100);
    });

    res.json({
      success: true,
      totalConsultationsRevenue,
      totalAdvanceCollected,
      totalYourCommission,
      totalBookings: appointments.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. HR Data Route
app.get("/api/hr-staff", async (req, res) => {
  try {
    let staffList = await Staff.find();
    if (staffList.length === 0) {
      staffList = [
        { staffId: "STF-01", name: "Receptionist Desk", role: "Front Desk", phone: "0330-5934059", salary: 35000 },
        { staffId: "STF-02", name: "Clinic Assistant", role: "Medical Assistant", phone: "0300-1234567", salary: 40000 }
      ];
    }
    res.json(staffList);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Update Appointment Status
app.put("/api/appointments/:id", async (req, res) => {
  try {
    const { status } = req.body;
    await Appointment.findOneAndUpdate({ id: req.params.id }, { status });
    res.json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`NSF Clinic App running on http://localhost:${PORT}`);
});

module.exports = app;