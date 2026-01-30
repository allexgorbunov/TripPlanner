// TripPlanner PWA - Main App Logic

const STORAGE_KEY = 'tripPlannerTrips';
const CURRENCIES = ['RUB', 'USD', 'EUR', 'TRY', 'THB', 'JPY', 'GBP', 'CNY', 'KZT', 'BYR'];

let trips = [];
let editingId = null;
let editingRouteId = null;
let editingChecklistId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTrips();
    renderTrips();
    setupEventListeners();
    loadCurrencies();
});

function loadTrips() {
    const data = localStorage.getItem(STORAGE_KEY);
    trips = data ? JSON.parse(data) : [];
}

function saveTrips() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function loadCurrencies() {
    // Load exchange rates (static for demo, can be fetched from API)
    window.exchangeRates = {
        RUB: 1,
        USD: 90,
        EUR: 98,
        TRY: 2.8,
        THB: 2.5,
        JPY: 0.6,
        GBP: 115,
        CNY: 12.5,
        KZT: 0.19,
        BYR: 28
    };
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

    const sorted = [...trips].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    container.innerHTML = sorted.map(trip => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const routesCount = trip.routes?.length || 0;
        const checklistCount = trip.checklists?.length || 0;
        const checkedItems = trip.checklists?.filter(i => i.checked).length || 0;

        return `
            <div class="trip-card" data-id="${trip.id}">
                <div class="trip-name">${escapeHtml(trip.name)}</div>
                <div class="trip-destination">${escapeHtml(trip.destination)}</div>
                <div class="trip-meta">
                    <span class="trip-dates">${formatDate(start)} — ${formatDate(end)}</span>
                    <span class="trip-days">${days} дн.</span>
                </div>
                ${(routesCount > 0 || checklistCount > 0) ? `
                    <div class="trip-badges">
                        ${routesCount > 0 ? `<span class="badge">📍 ${routesCount} маршрут</span>` : ''}
                        ${checklistCount > 0 ? `<span class="badge">✓ ${checkedItems}/${checklistCount}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    document.getElementById('add-btn').addEventListener('click', () => openModal());
    document.getElementById('trip-form').addEventListener('submit', saveTrip);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    document.getElementById('trip-list').addEventListener('click', (e) => {
        const card = e.target.closest('.trip-card');
        if (card) {
            const id = card.dataset.id;
            const trip = trips.find(t => t.id === id);
            if (trip) openModal(trip);
        }
    });

    // Close modals on backdrop click
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
    document.getElementById('route-modal').addEventListener('click', (e) => {
        if (e.target.id === 'route-modal') closeRouteModal();
    });
    document.getElementById('checklist-modal').addEventListener('click', (e) => {
        if (e.target.id === 'checklist-modal') closeChecklistModal();
    });
    document.getElementById('currency-modal').addEventListener('click', (e) => {
        if (e.target.id === 'currency-modal') closeCurrencyModal();
    });
}

function openModal(trip = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('trip-form');
    const title = document.getElementById('modal-title');
    const extraSection = form.querySelector('.extra-section');

    if (trip) {
        editingId = trip.id;
        title.textContent = 'Изменить поездку';
        document.getElementById('trip-name').value = trip.name;
        document.getElementById('trip-destination').value = trip.destination;
        document.getElementById('trip-start').value = trip.startDate;
        document.getElementById('trip-end').value = trip.endDate;
        document.getElementById('trip-notes').value = trip.notes || '';

        // Show extra buttons for existing trip
        if (!extraSection) {
            const section = document.createElement('div');
            section.className = 'extra-section';
            section.innerHTML = `
                <button type="button" class="btn-secondary" onclick="openRouteModal('${trip.id}')">🗺️ Маршруты</button>
                <button type="button" class="btn-secondary" onclick="openChecklistModal('${trip.id}')">✓ Чек-лист</button>
                <button type="button" class="btn-secondary" onclick="openCurrencyModal('${trip.id}')">💱 Валюта</button>
            `;
            form.querySelector('.form-actions').before(section);
        }

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

        if (extraSection) extraSection.remove();
        const existingDelete = form.querySelector('.delete-btn');
        if (existingDelete) existingDelete.remove();
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ============ ROUTES ============
function openRouteModal(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('route-trip-id').value = tripId;
    editingRouteId = null;

    const container = document.getElementById('route-list');
    container.innerHTML = (trip.routes || []).map((route, idx) => `
        <div class="route-item">
            <span>${idx + 1}. ${escapeHtml(route.place)}</span>
            <button type="button" class="btn-icon" onclick="deleteRoute('${tripId}', '${route.id}')">🗑️</button>
        </div>
    `).join('') || '<p class="empty-text">Нет точек маршрута</p>';

    document.getElementById('route-modal').classList.remove('hidden');
}

function closeRouteModal() {
    document.getElementById('route-modal').classList.add('hidden');
}

function saveRoute(e) {
    e.preventDefault();
    const tripId = document.getElementById('route-trip-id').value;
    const place = document.getElementById('route-place').value.trim();

    if (!place) return;

    const trip = trips.find(t => t.id === tripId);
    if (trip) {
        if (!trip.routes) trip.routes = [];
        trip.routes.push({
            id: Date.now().toString(),
            place,
            order: trip.routes.length
        });
        saveTrips();
        openRouteModal(tripId);
    }

    document.getElementById('route-place').value = '';
}

function deleteRoute(tripId, routeId) {
    const trip = trips.find(t => t.id === tripId);
    if (trip && trip.routes) {
        trip.routes = trip.routes.filter(r => r.id !== routeId);
        saveTrips();
        openRouteModal(tripId);
        renderTrips();
    }
}

// ============ CHECKLIST ============
function openChecklistModal(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('checklist-trip-id').value = tripId;

    const container = document.getElementById('checklist-items');
    container.innerHTML = (trip.checklists || []).map((item, idx) => `
        <div class="checklist-item ${item.checked ? 'checked' : ''}">
            <label>
                <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleChecklistItem('${tripId}', '${item.id}')">
                <span>${escapeHtml(item.text)}</span>
            </label>
            <button type="button" class="btn-icon" onclick="deleteChecklistItem('${tripId}', '${item.id}')">🗑️</button>
        </div>
    `).join('') || '<p class="empty-text">Нет пунктов в чек-листе</p>';

    const progress = trip.checklists?.length ? Math.round(trip.checklists.filter(i => i.checked).length / trip.checklists.length * 100) : 0;
    document.getElementById('checklist-progress').textContent = `${progress}%`;
    document.getElementById('checklist-progress-bar').style.width = `${progress}%`;

    document.getElementById('checklist-modal').classList.remove('hidden');
}

function closeChecklistModal() {
    document.getElementById('checklist-modal').classList.add('hidden');
}

function saveChecklistItem(e) {
    e.preventDefault();
    const tripId = document.getElementById('checklist-trip-id').value;
    const text = document.getElementById('checklist-text').value.trim();

    if (!text) return;

    const trip = trips.find(t => t.id === tripId);
    if (trip) {
        if (!trip.checklists) trip.checklists = [];
        trip.checklists.push({
            id: Date.now().toString(),
            text,
            checked: false
        });
        saveTrips();
        openChecklistModal(tripId);
    }

    document.getElementById('checklist-text').value = '';
}

function toggleChecklistItem(tripId, itemId) {
    const trip = trips.find(t => t.id === tripId);
    if (trip && trip.checklists) {
        const item = trip.checklists.find(i => i.id === itemId);
        if (item) {
            item.checked = !item.checked;
            saveTrips();
            openChecklistModal(tripId);
            renderTrips();
        }
    }
}

function deleteChecklistItem(tripId, itemId) {
    const trip = trips.find(t => t.id === tripId);
    if (trip && trip.checklists) {
        trip.checklists = trip.checklists.filter(i => i.id !== itemId);
        saveTrips();
        openChecklistModal(tripId);
        renderTrips();
    }
}

// ============ CURRENCY ============
function openCurrencyModal(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('currency-trip-id').value = tripId;
    document.getElementById('currency-from').value = trip.currencyFrom || 'RUB';
    document.getElementById('currency-to').value = trip.currencyTo || 'USD';
    document.getElementById('currency-amount').value = trip.currencyAmount || '';

    document.getElementById('currency-modal').classList.remove('hidden');
}

function closeCurrencyModal() {
    document.getElementById('currency-modal').classList.add('hidden');
}

function convertCurrency() {
    const tripId = document.getElementById('currency-trip-id').value;
    const from = document.getElementById('currency-from').value;
    const to = document.getElementById('currency-to').value;
    let amount = parseFloat(document.getElementById('currency-amount').value);

    if (isNaN(amount)) amount = 0;

    // Save to trip
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
        trip.currencyFrom = from;
        trip.currencyTo = to;
        trip.currencyAmount = amount;
        saveTrips();
    }

    // Convert
    const fromRate = window.exchangeRates[from] || 1;
    const toRate = window.exchangeRates[to] || 1;
    const result = (amount / fromRate) * toRate;

    document.getElementById('currency-result').textContent = `${result.toFixed(2)} ${to}`;
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
