// TripPlanner PWA - Main App Logic

const STORAGE_KEY = 'tripPlannerTrips';

let trips = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTrips();
    renderTrips();
    setupEventListeners();
});

function loadTrips() {
    const data = localStorage.getItem(STORAGE_KEY);
    trips = data ? JSON.parse(data) : [];
}

function saveTrips() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function renderTrips() {
    const container = document.getElementById('trip-list');
    const emptyState = document.getElementById('empty-state');

    if (trips.length === 0) {
        container.innerHTML = '';
        container.appendChild(emptyState);
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Sort by start date, newest first
    const sorted = [...trips].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    container.innerHTML = sorted.map(trip => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        return `
            <div class="trip-card" data-id="${trip.id}">
                <div class="trip-name">${escapeHtml(trip.name)}</div>
                <div class="trip-destination">${escapeHtml(trip.destination)}</div>
                <div class="trip-dates">
                    <span>${formatDate(start)} — ${formatDate(end)}</span>
                    <span class="trip-days">${days} дн.</span>
                </div>
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    // Add button
    document.getElementById('add-btn').addEventListener('click', () => openModal());

    // Form
    document.getElementById('trip-form').addEventListener('submit', saveTrip);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    // Trip cards click
    document.getElementById('trip-list').addEventListener('click', (e) => {
        const card = e.target.closest('.trip-card');
        if (card) {
            const id = card.dataset.id;
            const trip = trips.find(t => t.id === id);
            if (trip) openModal(trip);
        }
    });
}

function openModal(trip = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('trip-form');
    const title = document.getElementById('modal-title');

    if (trip) {
        editingId = trip.id;
        title.textContent = 'Изменить поездку';
        document.getElementById('trip-name').value = trip.name;
        document.getElementById('trip-destination').value = trip.destination;
        document.getElementById('trip-start').value = trip.startDate;
        document.getElementById('trip-end').value = trip.endDate;
        document.getElementById('trip-notes').value = trip.notes;

        // Add delete button if editing
        const existingDelete = form.querySelector('.delete-btn');
        if (!existingDelete) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-primary delete-btn';
            deleteBtn.textContent = 'Удалить поездку';
            deleteBtn.addEventListener('click', () => deleteTrip(trip.id));
            form.querySelector('.form-actions').before(deleteBtn);
        }
    } else {
        editingId = null;
        title.textContent = 'Новая поездка';
        form.reset();
        document.getElementById('trip-start').value = new Date().toISOString().split('T')[0];
        document.getElementById('trip-end').value = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        const existingDelete = form.querySelector('.delete-btn');
        if (existingDelete) existingDelete.remove();
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function saveTrip(e) {
    e.preventDefault();

    const name = document.getElementById('trip-name').value.trim();
    const destination = document.getElementById('trip-destination').value.trim();
    const startDate = document.getElementById('trip-start').value;
    const endDate = document.getElementById('trip-end').value;
    const notes = document.getElementById('trip-notes').value.trim();

    if (!name || !destination || !startDate || !endDate) return;

    if (editingId) {
        const trip = trips.find(t => t.id === editingId);
        if (trip) {
            trip.name = name;
            trip.destination = destination;
            trip.startDate = startDate;
            trip.endDate = endDate;
            trip.notes = notes;
        }
    } else {
        trips.push({
            id: Date.now().toString(),
            name,
            destination,
            startDate,
            endDate,
            notes,
            createdAt: new Date().toISOString()
        });
    }

    saveTrips();
    renderTrips();
    closeModal();
}

function deleteTrip(id) {
    if (confirm('Удалить поездку?')) {
        trips = trips.filter(t => t.id !== id);
        saveTrips();
        renderTrips();
        closeModal();
    }
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
