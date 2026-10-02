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
const clinicIdInput = document.getElementById('clinicId');
const selectedClinicName = document.getElementById('selectedClinicName');
const doctorSelect = document.getElementById('doctorId');
const dateInput = document.getElementById('date');

// Automatically Load Data on Page Load
document.addEventListener('DOMContentLoaded', async () => {
    const clinicsContainer = document.getElementById('clinicsContainer');
    if (clinicsContainer) {
        await loadClinics();
    }

    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        await initBookingPage();
    }
});

// Load Clinics on Home Page
async function loadClinics() {
    const clinicsContainer = document.getElementById('clinicsContainer');
    if (!clinicsContainer) return;
    
    try {
        const response = await fetch('/api/clinics');
        const clinics = await response.json();
        
        clinicsContainer.innerHTML = '';
        if (Array.isArray(clinics) && clinics.length > 0) {
            clinics.forEach(clinic => {
                const clinicCard = document.createElement('div');
                clinicCard.className = 'clinic-card';
                clinicCard.style.cssText = "background: #fff; padding: 20px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
                
                const clinicId = clinic._id || clinic.id;
                clinicCard.innerHTML = `
                    <h3>${clinic.name || clinic.title}</h3>
                    <p><strong>Address:</strong> ${clinic.address || 'N/A'}</p>
                    <p><strong>Timing:</strong> ${clinic.timing || 'By Appointment'}</p>
                    <a href="booking.html?clinicId=${clinicId}" style="display: inline-block; margin-top: 10px; padding: 8px 15px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Book Appointment</a>
                `;
                clinicsContainer.appendChild(clinicCard);
            });
        } else {
            clinicsContainer.innerHTML = '<p>Koi clinic mojood nahi hai.</p>';
        }
    } catch (err) {
        console.error('Error loading clinics:', err);
        clinicsContainer.innerHTML = '<p>Clinics load karne mein error aa gaya hai.</p>';
    }
}

// Initialize Booking Page details from URL parameters
async function initBookingPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const clinicId = urlParams.get('clinicId');

    if (clinicIdInput && clinicId) {
        clinicIdInput.value = clinicId;
    }

    try {
        const response = await fetch('/api/clinics');
        const clinics = await response.json();
        
        if (Array.isArray(clinics)) {
            const currentClinic = clinics.find(c => (c._id === clinicId || c.id === clinicId));
            if (currentClinic && selectedClinicName) {
                selectedClinicName.textContent = currentClinic.name || currentClinic.title;
            } else if (selectedClinicName) {
                selectedClinicName.textContent = "Professorial Clinic - Psychological Medicine & Neuro Psychiatry";
            }
        }
    } catch (err) {
        console.error('Error fetching clinic details:', err);
    }

    // Load Doctors dropdown
    if (doctorSelect) {
        doctorSelect.innerHTML = '<option value="professorial-clinic">Prof. Dr. Shakil Jehangir Malik</option>';
    }
}

// Event Listeners for Date change to load slots
if (dateInput) {
    dateInput.addEventListener('change', loadAvailableSlots);
}

async function loadAvailableSlots() {
    if (!slotContainer || !dateInput) return;
    
    slotContainer.innerHTML = '';
    const clinicId = clinicIdInput ? clinicIdInput.value : 'professorial-clinic';
    const selectedDate = dateInput.value;

    if (!selectedDate) {
        return;
    }

    try {
        const response = await fetch('/api/booked-slots?clinicId=' + clinicId + '&date=' + selectedDate);
        const bookedSlotsData = await response.json();
        
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

    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.value = time;
    }
}

// Appointment Booking Form Submission Handler
const appointmentForm = document.getElementById('appointmentForm');
if (appointmentForm) {
    appointmentForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!selectedSlotTime) {
            alert('Please select an available time slot!');
            return;
        }

        const clinicId = clinicIdInput ? clinicIdInput.value : 'professorial-clinic';
        const doctorId = doctorSelect ? doctorSelect.value : 'professorial-clinic';
        const date = dateInput ? dateInput.value : '';
        const name = document.getElementById('name') ? document.getElementById('name').value : '';
        const phone = document.getElementById('phone') ? document.getElementById('phone').value : '';
        const age = document.getElementById('age') ? document.getElementById('age').value : '';
        const problem = document.getElementById('problem') ? document.getElementById('problem').value : '';
        const type = document.getElementById('appointmentType') ? document.getElementById('appointmentType').value : 'Initial';
        const fee = type === 'Follow-up' ? 8000 : 12000;

        const appointmentData = {
            clinicId: clinicId,
            doctorId: doctorId,
            name: name,
            phone: phone,
            age: age,
            date: date,
            time: selectedSlotTime,
            type: type,
            fee: fee,
            problem: problem
        };

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });
            const result = await response.json();

            if (result.success || response.ok) {
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