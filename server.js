const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const clinicsFile = path.join(__dirname, "data", "clinics.json");
const doctorsFile = path.join(__dirname, "data", "doctors.json");
const appointmentsFile = path.join(__dirname, "data", "appointments.json");

function readJSON(file) {
  try {
    const data = fs.readFileSync(file, "utf8");
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("File write error (Read-only storage mode active)");
  }
}

app.get("/api/clinics", (req, res) => {
  try {
    if (!fs.existsSync(clinicsFile)) {
      return res.json([]);
    }
    const fileData = fs.readFileSync(clinicsFile, "utf8");
    if (!fileData.trim()) {
      return res.json([]);
    }
    const clinics = JSON.parse(fileData);
    res.json(clinics);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/doctors/:clinicId", (req, res) => {
  const doctors = readJSON(doctorsFile);
  const clinicDoctors = doctors.filter(
    doctor => doctor.clinicId === req.params.clinicId
  );
  res.json(clinicDoctors);
});

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
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let appointments = [];
    if (fs.existsSync(appointmentsFile)) {
      try {
        const fileData = fs.readFileSync(appointmentsFile, "utf8");
        if (fileData.trim() !== "") {
          appointments = JSON.parse(fileData);
        }
      } catch (parseError) {
        appointments = [];
      }
    }

    const newAppointment = {
      id: "APT-" + Date.now(),
      clinicId,
      doctorId,
      name,
      phone,
      age: age || "",
      date,
      time,
      problem: problem || "",
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    writeJSON(appointmentsFile, appointments);

    console.log(`[Appointment Log] To ${phone}: Dear ${name}, your appointment is booked for ${date} at ${time}.`);

    res.json({
      success: true,
      message: "Appointment booked successfully!",
      appointment: newAppointment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

app.get("/api/appointments", (req, res) => {
  const appointments = readJSON(appointmentsFile);
  res.json(appointments);
});

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

app.delete("/api/appointments/:id", (req, res) => {
  const appointments = readJSON(appointmentsFile);
  const updatedAppointments = appointments.filter(item => item.id !== req.params.id);
  writeJSON(appointmentsFile, updatedAppointments);

  res.json({
    success: true,
    message: "Appointment deleted successfully"
  });
});

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

app.listen(PORT, () => {
  console.log(`Clinic Booking App running on http://localhost:${PORT}`);
});
