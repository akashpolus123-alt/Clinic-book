const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// File paths
const clinicsFile = path.join(__dirname, "data", "clinics.json");
const doctorsFile = path.join(__dirname, "data", "doctors.json");
const appointmentsFile = path.join(__dirname, "data", "appointments.json");

// Helper function: JSON file read
function readJSON(file) {
  try {
    const data = fs.readFileSync(file, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper function: JSON file write
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Get all clinics
app.get("/api/clinics", (req, res) => {
  const clinics = readJSON(clinicsFile);
  res.json(clinics);
});

// Get doctors by clinic
app.get("/api/doctors/:clinicId", (req, res) => {
  const doctors = readJSON(doctorsFile);

  const clinicDoctors = doctors.filter(
    doctor => doctor.clinicId === req.params.clinicId
  );

  res.json(clinicDoctors);
});

// Create appointment
app.post("/api/appointments", (req, res) => {
  const { clinicId, doctorId, name, phone, age, date, time, problem } = req.body;

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
    age,
    date,
    time,
    problem,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  appointments.push(newAppointment);
  writeJSON(appointmentsFile, appointments);

  res.json({
    success: true,
    message: "Appointment booked successfully",
    appointment: newAppointment
  });
});

// Get all appointments
app.get("/api/appointments", (req, res) => {
  const appointments = readJSON(appointmentsFile);
  res.json(appointments);
});

// Update appointment status
app.put("/api/appointments/:id", (req, res) => {
  const { status } = req.body;

  const appointments = readJSON(appointmentsFile);

  const appointment = appointments.find(
    item => item.id === req.params.id
  );

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

// Delete appointment
app.delete("/api/appointments/:id", (req, res) => {
  const appointments = readJSON(appointmentsFile);

  const updatedAppointments = appointments.filter(
    item => item.id !== req.params.id
  );

  writeJSON(appointmentsFile, updatedAppointments);

  res.json({
    success: true,
    message: "Appointment deleted successfully"
  });
});

// Get booked slots for a specific doctor on a specific date (Yahan add karein)
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

const fs = require('fs');
const path = require('path');

app.post("/api/appointments", (req, res) => {
  try {
    const newAppointment = req.body;
    const dataDir = path.join(__dirname, "data");
    const dataPath = path.join(dataDir, "appointments.json");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    let appointments = [];
    if (fs.existsSync(dataPath)) {
      const fileData = fs.readFileSync(dataPath, "utf8");
      appointments = JSON.parse(fileData);
    }

    appointments.push({ id: Date.now(), ...newAppointment });
    fs.writeFileSync(dataPath, JSON.stringify(appointments, null, 2));

    res.json({ success: true, message: "Appointment saved successfully!" });
  } catch (error) {
    console.error("Error saving appointment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Clinic Booking App running on http://localhost:${PORT}`);
});