// Global Constants & Variables
const DR_SHAKIL_SLOTS = [
    "09:00 AM - 09:30 AM",
    "09:30 AM - 10:00 AM",
    "10:00 AM - 10:30 AM",
    "10:30 AM - 11:00 AM",
    "11:00 AM - 11:30 AM",
    "11:30 AM - 12:00 PM",
    "04:00 PM - 04:30 PM",
    "04:30 PM - 05:00 PM",
    "05:00 PM - 05:30 PM",
    "05:30 PM - 06:00 PM"
];

let selectedSlotTime = null;
let selectedSlotElement = null;

const slotContainer = document.getElementById('slotContainer');
const clinicSelect = document.getElementById('clinicSelect');
const dateInput = document.getElementById('dateInput');

// Event Listeners for Dynamic Slot Loading
if (clinicSelect && dateInput) {
    clinicSelect.addEventListener('change', loadAvailableSlots);
    dateInput.addEventListener('change', loadAvailableSlots);
}

async function loadAvailableSlots() {
    if (!slotContainer || !clinicSelect || !dateInput) return;
    
    slotContainer.innerHTML = '';
    const clinicId = clinicSelect.value;
    const selectedDate = dateInput.value;

    if (!clinicId || !selectedDate) {
        return;
    }

    try {
        const response = await fetch('/api/booked-slots?clinicId=' + clinicId + '&date=' + selectedDate);
        const bookedSlotsData = await response.json();
        
        // Ensure bookedSlotsArray is always a valid array to prevent .includes errors
        const bookedSlotsArray = Array.isArray(bookedSlotsData) ? bookedSlotsData : [];

        DR_SHAKIL_SLOTS.forEach((slotTime, index) => {
            const slotDiv = document.createElement("div");
            slotDiv.className = "slot";
            slotDiv.textContent = slotTime;
            slotDiv.dataset.index = index;
            slotDiv.dataset.time = slotTime;

            if (bookedSlotsArray.includes(slotTime)) {
                slotDiv.classList.add("booked");
                slotDiv.textContent += " (Booked)";
            } else {
                slotDiv.classList.add("available");
                slotDiv.onclick = function() {
                    selectSlot(slotDiv, index, slotTime);
                };
            }

            slotContainer.appendChild(slotDiv);
        });
    } catch (err) {
        console.error('Error loading slots:', err);
    }
}

function selectSlot(element, index, time) {
    if (selectedSlotElement) {
        selectedSlotElement.classList.remove("selected");
    }
    selectedSlotElement = element;
    selectedSlotElement.classList.add("selected");
    selectedSlotTime = time;

    const timeInput = document.getElementById('selectedTimeInput');
    if (timeInput) {
        timeInput.value = time;
    }
}

// Appointment Booking Form Submission Handler
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!selectedSlotTime) {
            alert('Please select an available time slot!');
            return;
        }

        const clinicId = clinicSelect ? clinicSelect.value : '';
        const date = dateInput ? dateInput.value : '';
        const name = document.getElementById('patientName') ? document.getElementById('patientName').value : '';
        const phone = document.getElementById('patientPhone') ? document.getElementById('patientPhone').value : '';
        const age = document.getElementById('patientAge') ? document.getElementById('patientAge').value : '';
        const problem = document.getElementById('patientProblem') ? document.getElementById('patientProblem').value : '';
        const type = document.getElementById('appointmentType') ? document.getElementById('appointmentType').value : 'Initial';

        const appointmentData = {
            clinicId: clinicId,
            doctorId: 'professorial-clinic',
            name: name,
            phone: phone,
            age: age,
            date: date,
            time: selectedSlotTime,
            type: type,
            fee: 12000,
            problem: problem
        };

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });
            const result = await response.json();

            if (result.success) {
                alert('Appointment booked successfully!');
                window.location.reload();
            } else {
                alert('Error: ' + (result.message || 'Could not book appointment'));
            }
        } catch (err) {
            console.error('Booking submission error:', err);
            alert('Server error while booking appointment.');
        }
    });
}