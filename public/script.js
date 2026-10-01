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
        <p>⏰ ${clinic.timing || 'Timings not available'}</p>

        <a href="booking.html?clinic=${clinic.id}" class="book-btn">
          Book Appointment
        </a>
      `;

      container.appendChild(clinicCard);
    });

  } catch (error) {
    console.error("Error loading clinics:", error);
    container.innerHTML = "<p>Unable to load clinics. Please try again.</p>";
  }
}

async function loadBookingPage() {
  const form = document.getElementById("appointmentForm") || document.getElementById("bookingForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  let clinicId = params.get("clinic");

  if (!clinicId) {
    clinicId = localStorage.getItem("selectedClinicId");
  }

  const clinicIdInput = document.getElementById("clinicId");
  const clinicNameElement = document.getElementById("selectedClinicName");
  const doctorSelect = document.getElementById("doctorId");

  if (!clinicId) {
    if (clinicNameElement) clinicNameElement.textContent = "Please select a clinic from the home page first.";
    if (doctorSelect) {
      doctorSelect.innerHTML = '<option value="">Select a clinic first</option>';
    }
    return;
  }

  localStorage.setItem("selectedClinicId", clinicId);
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
    const appType = document.getElementById("appointmentType")?.value || "Initial";
    const fee = appType === "Follow-up" ? 8000 : 12000;

    const appointmentData = {
      clinicId: document.getElementById("clinicId")?.value,
      doctorId: document.getElementById("doctorId")?.value,
      name: nameInput ? nameInput.value.trim() : "",
      phone: document.getElementById("phone")?.value.trim(),
      age: document.getElementById("age")?.value,
      date: document.getElementById("date")?.value,
      time: time,
      type: appType,
      fee: fee,
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

const DR_SHAKIL_SLOTS = [
  "11:00 AM", "11:30 AM", "12:00 PM",
  "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", 
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM"
];

let selectedSlotElements = [];

async function loadAvailableSlots() {
  const clinicId = document.getElementById("clinicId")?.value;
  const doctorId = document.getElementById("doctorId")?.value;
  const date = document.getElementById("date")?.value;
  const slotContainer = document.getElementById("slotContainer");
  const timeInput = document.getElementById("time");

  if (!slotContainer) return;

  slotContainer.innerHTML = "";
  if (timeInput) timeInput.value = "";
  selectedSlotElements = [];

  if (!doctorId || !date) {
    slotContainer.innerHTML = '<p style="color: #666; font-size: 13px;">Please select a doctor and date first.</p>';
    return;
  }

  const selectedDateObj = new Date(date);
  const dayOfWeek = selectedDateObj.getDay();
  
  if (doctorId === "doc-shakil" && dayOfWeek !== 2 && dayOfWeek !== 6) {
    slotContainer.innerHTML = '<p style="color: red; font-size: 13px;">Dr. Shakil is only available on Tuesdays and Saturdays.</p>';
    return;
  }

  try {
    const response = await fetch(`/api/booked-slots?clinicId=${clinicId}&doctorId=${doctorId}&date=${date}`);
    const bookedSlots = await response.json();

    DR_SHAKIL_SLOTS.forEach((slotTime, index) => {
      const slotDiv = document.createElement("div");
      slotDiv.className = "slot";
      slotDiv.textContent = slotTime;
      slotDiv.dataset.index = index;
      slotDiv.dataset.time = slotTime;

      if (bookedSlots.includes(slotTime)) {
        slotDiv.classList.add("booked");
        slotDiv.textContent += " (Booked)";
      } else {
        slotDiv.classList.add("available");
        slotDiv.onclick = () => selectSlot(slotDiv, index, slotTime, bookedSlots);
      }

      slotContainer.appendChild(slotDiv);
    });

  } catch (error) {
    console.error("Error loading slots:", error);
    slotContainer.innerHTML = '<p style="color: red; font-size: 13px;">Failed to load slots.</p>';
  }
}

function handleTypeChange() {
  const timeField = document.getElementById("time");
  if (timeField) timeField.value = "";
  selectedSlotElements.forEach(el => {
    el.classList.remove("selected");
    el.classList.add("available");
  });
  selectedSlotElements = [];
}

function selectSlot(element, index, slotTime, bookedSlots) {
  const appType = document.getElementById("appointmentType")?.value || "Initial";
  
  selectedSlotElements.forEach(el => {
    el.classList.remove("selected");
    el.classList.add("available");
  });
  selectedSlotElements = [];

  if (appType === "Initial") {
    const nextSlotDiv = document.querySelector(`.slot[data-index="${index + 1}"]`);
    
    if (!nextSlotDiv || nextSlotDiv.classList.contains("booked")) {
      alert("Initial consultation requires 1 full hour (2 consecutive slots). The next slot is either booked or not available!");
      return;
    }

    element.classList.remove("available");
    element.classList.add("selected");
    nextSlotDiv.classList.remove("available");
    nextSlotDiv.classList.add("selected");

    selectedSlotElements = [element, nextSlotDiv];

    const nextSlotTime = nextSlotDiv.dataset.time;
    const timeField = document.getElementById("time");
    if (timeField) {
      timeField.value = `${slotTime} - ${nextSlotTime} (1 Hour)`;
    }

  } else {
    element.classList.remove("available");
    element.classList.add("selected");
    selectedSlotElements = [element];

    const timeField = document.getElementById("time");
    if (timeField) {
      timeField.value = `${slotTime} (30 Mins)`;
    }
  }
}

async function cancelAppointment(appointmentId) {
  if (!confirm("Are you sure you want to cancel this appointment?")) return;

  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Cancelled" })
    });

    const result = await response.json();
    if (response.ok && result.success) {
      alert("Appointment cancelled successfully!");
      location.reload();
    } else {
      alert(result.message || "Failed to cancel appointment.");
    }
  } catch (error) {
    console.error("Cancellation error:", error);
    alert("Something went wrong while cancelling.");
  }
}