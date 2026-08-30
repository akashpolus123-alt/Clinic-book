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
        <div style="font-size: 30px; margin-bottom: 8px;">${clinic.logo || '🏥'}</div>
        <h3>${clinic.name}</h3>
        <p>📍 ${clinic.address}</p>
        <p>📞 ${clinic.phone}</p>
        <p>🕒 ${clinic.timing || 'Timings not available'}</p>

        <a href="booking.html?clinic=${clinic.id}" class="book-btn">
          Book Appointment
        </a>
      `;

      container.appendChild(clinicCard);
    });

  } catch (error) {
    console.error("Error loading clinics:", error);
    container.innerHTML = `<p>Unable to load clinics. Please try again.</p>`;
  }
}

async function loadBookingPage() {
  const form = document.getElementById("appointmentForm") || document.getElementById("bookingForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const clinicId = params.get("clinic");

  const clinicIdInput = document.getElementById("clinicId");
  const clinicNameElement = document.getElementById("selectedClinicName");
  const doctorSelect = document.getElementById("doctorId");

  if (!clinicId) {
    if (clinicNameElement) clinicNameElement.textContent = "Please select a clinic first.";
    if (doctorSelect) {
      doctorSelect.innerHTML = `<option value="">Select a clinic first</option>`;
    }
    return;
  }

  if (clinicIdInput) clinicIdInput.value = clinicId;

  try {
    const clinicResponse = await fetch("/api/clinics");
    const clinics = await clinicResponse.json();
    const selectedClinic = clinics.find((clinic) => clinic.id === clinicId);

    if (selectedClinic && clinicNameElement) {
      clinicNameElement.textContent = "Booking at: " + selectedClinic.name;
    }

    const doctorResponse = await fetch(`/api/doctors/${clinicId}`);
    const doctors = await doctorResponse.json();

    if (doctorSelect) {
      doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
      doctors.forEach((doctor) => {
        const option = document.createElement("option");
        option.value = doctor.id;
        option.textContent = `${doctor.name} - ${doctor.specialization}`;
        doctorSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading booking page:", error);
    if (clinicNameElement) {
      clinicNameElement.textContent = "Unable to load clinic information.";
    }
  }
}

function handleAppointmentForm() {
  const form = document.getElementById("appointmentForm") || document.getElementById("bookingForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const bookingMessage = document.getElementById("bookingMessage");
    const time = document.getElementById("time")?.value;
    
    if (!time) {
      if (bookingMessage) {
        bookingMessage.textContent = "Please select a time slot first!";
        bookingMessage.className = "error-message";
      } else {
        alert("Please select a time slot first!");
      }
      return;
    }

    const nameInput = document.getElementById("name") || document.getElementById("patientName");

    const appointmentData = {
      clinicId: document.getElementById("clinicId")?.value,
      doctorId: document.getElementById("doctorId")?.value,
      name: nameInput ? nameInput.value.trim() : "",
      phone: document.getElementById("phone")?.value.trim(),
      age: document.getElementById("age")?.value,
      date: document.getElementById("date")?.value,
      time: time,
      problem: document.getElementById("problem")?.value.trim()
    };

    try {
      if (bookingMessage) {
        bookingMessage.textContent = "Booking appointment...";
        bookingMessage.className = "";
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (bookingMessage) {
          bookingMessage.textContent = `Appointment booked successfully! Your Booking ID is: ${result.appointment.id}`;
          bookingMessage.className = "success-message";
        } else {
          alert("Appointment booked successfully!");
        }

        form.reset();
        const clinicIdField = document.getElementById("clinicId");
        if (clinicIdField) {
          clinicIdField.value = appointmentData.clinicId;
        }

        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);

      } else {
        const errorMsg = result.message || result.error || "Booking failed.";
        if (bookingMessage) {
          bookingMessage.textContent = errorMsg;
          bookingMessage.className = "error-message";
        } else {
          alert(errorMsg);
        }
      }
    } catch (error) {
      console.error("Booking error:", error);
      if (bookingMessage) {
        bookingMessage.textContent = "Something went wrong. Please try again.";
        bookingMessage.className = "error-message";
      } else {
        alert("Something went wrong. Please try again.");
      }
    }
  });
}

function setMinimumDate() {
  const dateInput = document.getElementById("date");
  if (!dateInput) return;

  const today = new Date();
  const formattedDate =
    today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  dateInput.min = formattedDate;
}

document.addEventListener("DOMContentLoaded", () => {
  loadClinics();
  loadBookingPage();
  handleAppointmentForm();
  setMinimumDate();

  const searchInput = document.getElementById("clinicSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const clinicCards = document.querySelectorAll(".clinic-card, .card");

      clinicCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? "block" : "none";
      });
    });
  }

  const doctorSelect = document.getElementById("doctorId");
  const dateInput = document.getElementById("date");

  if (doctorSelect) doctorSelect.addEventListener("change", loadAvailableSlots);
  if (dateInput) dateInput.addEventListener("change", loadAvailableSlots);
});

const STANDARD_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM",
  "03:00 PM", "04:00 PM", "05:00 PM"
];

let selectedSlotElement = null;

async function loadAvailableSlots() {
  const clinicId = document.getElementById("clinicId")?.value;
  const doctorId = document.getElementById("doctorId")?.value;
  const date = document.getElementById("date")?.value;
  const slotContainer = document.getElementById("slotContainer");
  const timeInput = document.getElementById("time");

  if (!slotContainer) return;

  slotContainer.innerHTML = "";
  if (timeInput) timeInput.value = "";
  selectedSlotElement = null;

  if (!doctorId || !date) {
    slotContainer.innerHTML = `<p style="color: #666; font-size: 13px;">Please select a doctor and date first.</p>`;
    return;
  }

  try {
    const response = await fetch(`/api/booked-slots?clinicId=${clinicId}&doctorId=${doctorId}&date=${date}`);
    const bookedSlots = await response.json();

    STANDARD_SLOTS.forEach(slotTime => {
      const slotDiv = document.createElement("div");
      slotDiv.className = "slot";
      slotDiv.textContent = slotTime;

      if (bookedSlots.includes(slotTime)) {
        slotDiv.classList.add("booked");
        slotDiv.textContent += " (Booked)";
      } else {
        slotDiv.classList.add("available");
        slotDiv.onclick = () => selectSlot(slotDiv, slotTime);
      }

      slotContainer.appendChild(slotDiv);
    });

  } catch (error) {
    console.error("Error loading slots:", error);
    slotContainer.innerHTML = `<p style="color: red; font-size: 13px;">Failed to load slots.</p>`;
  }
}

function selectSlot(element, slotTime) {
  if (selectedSlotElement) {
    selectedSlotElement.classList.remove("selected");
    selectedSlotElement.classList.add("available");
  }

  element.classList.remove("available");
  element.classList.add("selected");
  selectedSlotElement = element;

  const timeField = document.getElementById("time");
  if (timeField) {
    timeField.value = slotTime;
  }
}
