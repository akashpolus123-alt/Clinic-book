// =============================
// HOME PAGE - LOAD CLINICS
// =============================

async function loadClinics() {
  const container = document.getElementById("clinicsContainer");

  if (!container) return;

  try {
    const response = await fetch("/api/clinics");
    const clinics = await response.json();

    container.innerHTML = "";

    clinics.forEach((clinic) => {
      const clinicCard = document.createElement("div");

      clinicCard.className = "clinic-card";

      clinicCard.innerHTML = `
        <h3>${clinic.name}</h3>
        <p>📍 ${clinic.address}</p>
        <p>📞 ${clinic.phone}</p>

        <a href="booking.html?clinic=${clinic.id}" class="book-btn">
          Book Appointment
        </a>
      `;

      container.appendChild(clinicCard);
    });

  } catch (error) {
    console.error("Error loading clinics:", error);

    container.innerHTML = `
      <p>Unable to load clinics. Please try again.</p>
    `;
  }
}


// =============================
// BOOKING PAGE - LOAD CLINIC
// =============================

async function loadBookingPage() {
  const form = document.getElementById("appointmentForm");

  if (!form) return;

  const params = new URLSearchParams(window.location.search);

  const clinicId = params.get("clinic");

  const clinicIdInput = document.getElementById("clinicId");
  const clinicNameElement = document.getElementById("selectedClinicName");
  const doctorSelect = document.getElementById("doctorId");

  if (!clinicId) {
    clinicNameElement.textContent = "Please select a clinic first.";

    doctorSelect.innerHTML = `
      <option value="">Select a clinic first</option>
    `;

    return;
  }

  clinicIdInput.value = clinicId;

  try {
    // Load clinic information
    const clinicResponse = await fetch("/api/clinics");
    const clinics = await clinicResponse.json();

    const selectedClinic = clinics.find(
      (clinic) => clinic.id === clinicId
    );

    if (selectedClinic) {
      clinicNameElement.textContent =
        "Booking at: " + selectedClinic.name;
    }

    // Load doctors for selected clinic
    const doctorResponse = await fetch(
      `/api/doctors/${clinicId}`
    );

    const doctors = await doctorResponse.json();

    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';

    doctors.forEach((doctor) => {
      const option = document.createElement("option");

      option.value = doctor.id;

      option.textContent =
        `${doctor.name} - ${doctor.specialization}`;

      doctorSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Error loading booking page:", error);

    clinicNameElement.textContent =
      "Unable to load clinic information.";
  }
}


// =============================
// BOOK APPOINTMENT
// =============================

async function handleAppointmentForm() {
  const form = document.getElementById("appointmentForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const bookingMessage =
      document.getElementById("bookingMessage");

    const appointmentData = {
      clinicId: document.getElementById("clinicId").value,
      doctorId: document.getElementById("doctorId").value,
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      age: document.getElementById("age").value,
      date: document.getElementById("date").value,
      time: document.getElementById("time").value,
      problem: document.getElementById("problem").value.trim()
    };

    try {
      bookingMessage.textContent = "Booking appointment...";
      bookingMessage.className = "";

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(appointmentData)
      });

      const result = await response.json();

      if (result.success) {
        bookingMessage.textContent =
          `Appointment booked successfully! Your Booking ID is: ${result.appointment.id}`;

        bookingMessage.className = "success-message";

        form.reset();

        // Keep clinic selected after reset
        document.getElementById("clinicId").value =
          appointmentData.clinicId;

      } else {
        bookingMessage.textContent =
          result.message || "Booking failed.";

        bookingMessage.className = "error-message";
      }

    } catch (error) {
      console.error("Booking error:", error);

      bookingMessage.textContent =
        "Something went wrong. Please try again.";

      bookingMessage.className = "error-message";
    }
  });
}


// =============================
// SET MINIMUM DATE AS TODAY
// =============================

function setMinimumDate() {
  const dateInput = document.getElementById("date");

  if (!dateInput) return;

  const today = new Date();

  const formattedDate =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  dateInput.min = formattedDate;
}


// =============================
// RUN FUNCTIONS
// =============================

loadClinics();
loadBookingPage();
handleAppointmentForm();
setMinimumDate();

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("clinicSearch");
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      // Aapke clinic cards ka jo bhi class name ho (jaise .clinic-card)
      const clinicCards = document.querySelectorAll(".clinic-card, .card"); 

      clinicCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
          card.style.display = "block"; // Match ho toh dikhao
        } else {
          card.style.display = "none";  // Match na ho toh chhupao
        }
      });
    });
  }
});