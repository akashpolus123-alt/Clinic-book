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

// Create appointment & trigger SMS notification
app.post("/api/appointments", async (req, res) => {
  try {
    const { clinicId, doctorId, name, phone, age, date, time, problem } = req.body;

    if (!clinicId || !doctorId || !name || !phone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

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
    fs.writeFileSync(dataPath, JSON.stringify(appointments, null, 2));

    // --- SMS Notification Integration ---
    // Jab aap Twilio account banayein, toh yahan apne credentials daal dein:
    try {
      /*
      const accountSid = 'YOUR_TWILIO_ACCOUNT_SID';
      const authToken = 'YOUR_TWILIO_AUTH_TOKEN';
      const twilioClient = require('twilio')(accountSid, authToken);

      await twilioClient.messages.create({
        body: Dear ${name}, your appointment (ID: ${newAppointment.id}) at the clinic is successfully booked for ${date} at ${time}.,
        from: 'YOUR_TWILIO_PHONE_NUMBER',
        to: phone
      });
      console.log('SMS sent successfully to:', phone);
      */
      
      // Filhal testing ke liye console par message print ho raha hai:
      console.log(`[SMS Notification Mock] To ${phone}: Dear ${name}, your appointment is booked for ${date} at ${time}.`);
    } catch (smsError) {
      console.error("Failed to send SMS notification:", smsError);
      // SMS fail hone par bhi booking save rahegi taake customer ka data zaya na ho
    }

    res.json({
      success: true,
      message: "Appointment booked successfully and notification processed",
      appointment: newAppointment
    });
  } catch (error) {
    console.error("Error saving appointment:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Get all appointments (Used by Admin Dashboard)
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

// Get booked slots for a specific doctor on a specific date
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

// Start server
app.listen(PORT, () => {
  console.log(`Clinic Booking App running on http://localhost:${PORT}`);
});