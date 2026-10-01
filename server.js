const express = require("express");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const clinicsFile = path.join(__dirname, "data", "clinics.json");
const doctorsFile = path.join(__dirname, "data", "doctors.json");
const appointmentsFile = path.join(__dirname, "data", "appointments.json");

// Nodemailer Transporter Setup (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'akashpolous123@gmail.com',
    pass: process.env.EMAIL_PASS || 'iwufsbgauvcfhwsy'
  }
});

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

function writeJSON(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("File write error (Read-only storage mode active)");
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

// 3. Create Appointment API Route
app.post("/api/appointments", async (req, res) => {
  try {
    const { clinicId, doctorId, name, phone, age, date, time, problem, type, fee } = req.body;

    if (!clinicId || !doctorId || !name || !phone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

    const appointments = readJSON(appointmentsFile);

    const newAppointment = {
      id: "APT-" + Date.now(),
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
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    writeJSON(appointmentsFile, appointments);

    // Send Email Notification to Clinic / Doctor
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

    res.json({
      success: true,
      message: "Appointment booked successfully!",
      appointment: newAppointment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// 4. Get All Appointments
app.get("/api/appointments", (req, res) => {
  const appointments = readJSON(appointmentsFile);
  res.json(appointments);
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

// 6. Specific Clinic Appointments Route
app.get("/api/clinic-appointments", (req, res) => {
  try {
    const { clinicId } = req.query;
    const appointments = readJSON(appointmentsFile);
    
    const clinicAppointments = appointments.filter(app => app.clinicId === clinicId);
    res.json(clinicAppointments);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Update Appointment Status
app.put("/api/appointments/:id", (req, res) => {
  const { status } = req.body;
  const appointments = readJSON(appointmentsFile);
  const appointment = appointments.find(item => item.id === req.params.id);

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found"
    });
  }

  appointment.status = status;
  writeJSON(appointmentsFile, appointments);

  res.json({
    success: true,
    message: "Appointment updated successfully"
  });
});

// 8. Delete Appointment
app.delete("/api/appointments/:id", (req, res) => {
  const appointments = readJSON(appointmentsFile);
  const updatedAppointments = appointments.filter(item => item.id !== req.params.id);
  writeJSON(appointmentsFile, updatedAppointments);

  res.json({
    success: true,
    message: "Appointment deleted successfully"
  });
});

// 9. Get Booked Slots
app.get("/api/booked-slots", (req, res) => {
  const { clinicId, doctorId, date } = req.query;
  const appointments = readJSON(appointmentsFile);

  const bookedSlots = appointments
    .filter(
      item =>
        item.clinicId === clinicId &&
        item.doctorId === doctorId &&
        item.date === date &&
        item.status !== "Cancelled"
    )
    .map(item => item.time);

  res.json(bookedSlots);
});

module.exports = app;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Clinic Booking App running on http://localhost:${PORT}`);
  });
}