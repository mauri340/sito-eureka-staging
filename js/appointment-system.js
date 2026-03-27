// Advanced Appointment Booking System
// Calendar integration with slot management and booking

class AppointmentSystem {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.selectedDate = null;
    this.selectedSlot = null;
    this.availableSlots = new Map();
    this.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.minBookingAdvance = 2; // 2 hours minimum advance booking
    this.maxBookingDays = 30; // 30 days maximum advance booking
    
    console.log('Appointment system initialized, timezone:', this.timeZone);
  }

  // Get available slots for a specific date
  async getAvailableSlots(date) {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check cache first
      if (this.availableSlots.has(dateStr)) {
        const cached = this.availableSlots.get(dateStr);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
          return cached.slots;
        }
      }

      const response = await fetch(`${this.apiBaseUrl}/api/chat/appointments/slots?date=${dateStr}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Timezone': this.timeZone
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch slots: ${response.status}`);
      }

      const data = await response.json();
      const slots = this.processSlots(data.slots || []);
      
      // Cache the results
      this.availableSlots.set(dateStr, {
        slots: slots,
        timestamp: Date.now()
      });

      return slots;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      // Return mock data as fallback
      return this.getMockSlots(date);
    }
  }

  // Process and validate slots from API
  processSlots(rawSlots) {
    const now = new Date();
    const minTime = new Date(now.getTime() + (this.minBookingAdvance * 60 * 60 * 1000));

    return rawSlots
      .map(slot => ({
        id: slot.id,
        start: new Date(slot.start_time),
        end: new Date(slot.end_time),
        duration: slot.duration || 30,
        type: slot.type || 'consultation',
        available: slot.available !== false
      }))
      .filter(slot => slot.start > minTime && slot.available)
      .sort((a, b) => a.start - b.start);
  }

  // Mock slots for development/fallback
  getMockSlots(date) {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    const slotDuration = 30; // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Skip lunch break (12:00-13:00)
        if (hour === 12 && minute === 0) continue;
        if (hour === 12 && minute === 30) continue;

        // Random availability for demo
        const available = Math.random() > 0.3;

        slots.push({
          id: `mock_${date.toISOString().split('T')[0]}_${hour}_${minute}`,
          start: slotStart,
          end: slotEnd,
          duration: slotDuration,
          type: 'consultation',
          available: available
        });
      }
    }

    return slots.filter(slot => {
      const now = new Date();
      const minTime = new Date(now.getTime() + (this.minBookingAdvance * 60 * 60 * 1000));
      return slot.start > minTime && slot.available;
    });
  }

  // Book an appointment slot
  async bookAppointment(slotId, userData, sessionId) {
    try {
      const bookingData = {
        slot_id: slotId,
        session_id: sessionId,
        user_data: {
          nome: userData.nome,
          email: userData.email,
          telefono: userData.telefono,
          note: userData.note || ''
        },
        timezone: this.timeZone,
        booking_source: 'chat_widget'
      };

      const response = await fetch(`${this.apiBaseUrl}/api/chat/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Timezone': this.timeZone
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Booking failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Clear cache for the booked date
      const bookedDate = new Date(result.appointment.start_time).toISOString().split('T')[0];
      this.availableSlots.delete(bookedDate);

      return {
        success: true,
        appointment: result.appointment,
        confirmation_code: result.confirmation_code
      };
    } catch (error) {
      console.error('Error booking appointment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate calendar widget for date selection
  createCalendarWidget(containerId, onDateSelected) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Calendar container not found:', containerId);
      return;
    }

    const calendarHTML = this.generateCalendarHTML(onDateSelected);
    container.innerHTML = calendarHTML;
    this.bindCalendarEvents(container, onDateSelected);
  }

  generateCalendarHTML(onDateSelected) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    return `
      <div class="appointment-calendar">
        <div class="calendar-header">
          <button class="calendar-nav" data-direction="prev">&lt;</button>
          <h3 class="calendar-month" data-month="${currentMonth}" data-year="${currentYear}">
            ${monthNames[currentMonth]} ${currentYear}
          </h3>
          <button class="calendar-nav" data-direction="next">&gt;</button>
        </div>
        <div class="calendar-weekdays">
          ${daysOfWeek.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
        </div>
        <div class="calendar-days" id="calendar-days-grid">
          ${this.generateCalendarDays(currentYear, currentMonth)}
        </div>
      </div>
    `;
  }

  generateCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();
    const maxDate = new Date(today.getTime() + (this.maxBookingDays * 24 * 60 * 60 * 1000));

    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.toDateString() === today.toDateString();
      const isPast = currentDate < today;
      const isTooFar = currentDate > maxDate;
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

      const classes = ['calendar-day'];
      if (!isCurrentMonth) classes.push('other-month');
      if (isToday) classes.push('today');
      if (isPast || isTooFar) classes.push('disabled');
      if (isWeekend && isCurrentMonth && !isPast && !isTooFar) classes.push('weekend');

      const isClickable = isCurrentMonth && !isPast && !isTooFar && !isWeekend;

      days.push(`
        <div class="${classes.join(' ')}" 
             data-date="${currentDate.toISOString().split('T')[0]}"
             ${isClickable ? 'data-clickable="true"' : ''}>
          ${currentDate.getDate()}
        </div>
      `);
    }

    return days.join('');
  }

  bindCalendarEvents(container, onDateSelected) {
    // Navigation buttons
    const navButtons = container.querySelectorAll('.calendar-nav');
    navButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const direction = e.target.getAttribute('data-direction');
        this.navigateMonth(container, direction, onDateSelected);
      });
    });

    // Date selection
    this.bindDateSelection(container, onDateSelected);
  }

  bindDateSelection(container, onDateSelected) {
    const days = container.querySelectorAll('.calendar-day[data-clickable="true"]');
    days.forEach(day => {
      day.addEventListener('click', async (e) => {
        const dateStr = e.target.getAttribute('data-date');
        const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues

        // Remove previous selection
        container.querySelectorAll('.calendar-day.selected').forEach(el => {
          el.classList.remove('selected');
        });

        // Add selection to clicked day
        e.target.classList.add('selected');
        this.selectedDate = date;

        // Fetch and display available slots
        try {
          const slots = await this.getAvailableSlots(date);
          onDateSelected(date, slots);
        } catch (error) {
          console.error('Error handling date selection:', error);
          onDateSelected(date, []);
        }
      });
    });
  }

  navigateMonth(container, direction, onDateSelected) {
    const monthElement = container.querySelector('.calendar-month');
    let month = parseInt(monthElement.getAttribute('data-month'));
    let year = parseInt(monthElement.getAttribute('data-year'));

    if (direction === 'next') {
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    } else {
      month--;
      if (month < 0) {
        month = 11;
        year--;
      }
    }

    // Update month display
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    monthElement.textContent = `${monthNames[month]} ${year}`;
    monthElement.setAttribute('data-month', month);
    monthElement.setAttribute('data-year', year);

    // Update calendar days
    const daysGrid = container.querySelector('#calendar-days-grid');
    daysGrid.innerHTML = this.generateCalendarDays(year, month);
    this.bindDateSelection(container, onDateSelected);
  }

  // Generate time slots display
  createTimeSlotsWidget(containerId, slots, onSlotSelected) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Time slots container not found:', containerId);
      return;
    }

    if (slots.length === 0) {
      container.innerHTML = '<div class="no-slots">Nessun orario disponibile per questa data.</div>';
      return;
    }

    const slotsHTML = slots.map(slot => {
      const timeStr = slot.start.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      return `
        <button class="time-slot" data-slot-id="${slot.id}" data-slot-start="${slot.start.toISOString()}">
          ${timeStr}
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="time-slots-header">
        <h4>Orari disponibili</h4>
        <p>Seleziona l'orario che preferisci:</p>
      </div>
      <div class="time-slots-grid">
        ${slotsHTML}
      </div>
    `;

    // Bind slot selection
    const slotButtons = container.querySelectorAll('.time-slot');
    slotButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Remove previous selection
        slotButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Add selection
        button.classList.add('selected');
        
        const slotId = button.getAttribute('data-slot-id');
        const slotStart = new Date(button.getAttribute('data-slot-start'));
        const selectedSlot = slots.find(s => s.id === slotId);
        
        this.selectedSlot = selectedSlot;
        onSlotSelected(selectedSlot);
      });
    });
  }

  // Get selected appointment details
  getSelectedAppointment() {
    return {
      date: this.selectedDate,
      slot: this.selectedSlot,
      isValid: this.selectedDate && this.selectedSlot
    };
  }

  // Format appointment for display
  formatAppointmentDetails(appointment) {
    if (!appointment || !appointment.start) return '';

    const date = new Date(appointment.start_time || appointment.start);
    const dateStr = date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeStr = date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${dateStr} alle ${timeStr}`;
  }
}

// Export for use in chat widget
window.AppointmentSystem = AppointmentSystem;