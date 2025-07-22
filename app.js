console.log('app.js loaded');
// --- Data Structures ---
const people = [];
const countryToTimezone = {
    // Add more as needed; for demo, a few common ones
    'United States': 'America/New_York',
    'India': 'Asia/Kolkata',
    'United Kingdom': 'Europe/London',
    'Japan': 'Asia/Tokyo',
    'Australia': 'Australia/Sydney',
    'Nepal': 'Asia/Kathmandu',
    'Germany': 'Europe/Berlin',
    'France': 'Europe/Paris',
    'Canada': 'America/Toronto',
    'Brazil': 'America/Sao_Paulo',
    'China': 'Asia/Shanghai',
    'Singapore': 'Asia/Singapore',
    'South Africa': 'Africa/Johannesburg',
    'UAE': 'Asia/Dubai',
    'New Zealand': 'Pacific/Auckland',
};

// --- DOM Elements ---
const addPersonForm = document.getElementById('add-person-form');
const personNameInput = document.getElementById('person-name');
const personCountrySelect = document.getElementById('person-country');
const peopleClocksDiv = document.getElementById('people-clocks');
const userClockDiv = document.getElementById('user-clock');
const busyStartSlider = document.getElementById('busy-start-slider');
const busyEndSlider = document.getElementById('busy-end-slider');
const busyStartLabel = document.getElementById('busy-start-label');
const busyEndLabel = document.getElementById('busy-end-label');
const busySlotsListDiv = document.createElement('div');
let newPersonBusySlots = [];
let peopleFilter = 'all';
const peopleFilterForm = document.getElementById('people-filter-form');

// --- Edit Busy Slots UI Elements ---
const editBusySection = document.getElementById('edit-busy-section');
const editBusyTitle = document.getElementById('edit-busy-title');
const editBusyList = document.getElementById('edit-busy-list');
const editBusyStartSlider = document.getElementById('edit-busy-start-slider');
const editBusyEndSlider = document.getElementById('edit-busy-end-slider');
const editBusyStartLabel = document.getElementById('edit-busy-start-label');
const editBusyEndLabel = document.getElementById('edit-busy-end-label');
const editBusyAddBtn = document.getElementById('edit-busy-add-btn');
const editBusyDoneBtn = document.getElementById('edit-busy-done-btn');
let editingPersonIdx = null;
let lastSelectedTile = null;

// --- Helper Functions ---
function getTimezone(country) {
    // Try to match country to timezone
    return countryToTimezone[country] || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatTime(date, tz) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz });
}

function isBusy(person, date) {
    // date is a JS Date in the person's timezone
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: person.timezone });
    const [h, m] = timeStr.split(':');
    const mins = parseInt(h) * 60 + parseInt(m);
    for (const slot of person.busySlots) {
        const [startH, startM] = slot.start.split(':');
        const [endH, endM] = slot.end.split(':');
        const startMins = parseInt(startH) * 60 + parseInt(startM);
        const endMins = parseInt(endH) * 60 + parseInt(endM);
        if (startMins <= mins && mins < endMins) {
            return true;
        }
    }
    return false;
}

function renderPeopleClocks() {
    if (!peopleClocksDiv) {
        return;
    }
    peopleClocksDiv.innerHTML = '';
    let filteredPeople = people;
    if (peopleFilter === 'available') {
        filteredPeople = people.filter(person => !isBusy(person, new Date()));
    } else if (peopleFilter === 'busy') {
        filteredPeople = people.filter(person => isBusy(person, new Date()));
    }
    // Use fixed container size for grid calculation to prevent oscillation
    const gridWidth = 950 / 2; // half for display column
    const gridHeight = 600;    // fixed app height
    const n = filteredPeople.length;
    let gridCols = 1, gridRows = 1;
    if (n > 0) {
        let bestCols = 1, bestRows = n, bestSize = 0;
        for (let cols = 1; cols <= n; cols++) {
            const rows = Math.ceil(n / cols);
            const tileW = gridWidth / cols;
            const tileH = gridHeight / rows;
            const size = Math.min(tileW, tileH);
            if (cols * rows >= n && size > bestSize) {
                bestSize = size;
                bestCols = cols;
                bestRows = rows;
            }
        }
        gridCols = bestCols;
        gridRows = bestRows;
    }
    // Set grid columns and rows dynamically
    peopleClocksDiv.style.display = 'grid';
    peopleClocksDiv.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
    peopleClocksDiv.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;
    peopleClocksDiv.style.justifyItems = 'stretch';
    peopleClocksDiv.style.alignItems = 'stretch';
    filteredPeople.forEach((person, idx) => {
        const now = new Date();
        const tz = person.timezone;
        const time = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        const busy = isBusy(person, now);
        const clockDiv = document.createElement('div');
        clockDiv.className = 'person-clock ' + (busy ? 'busy' : 'available');
        // Analog clock
        const analogClock = document.createElement('div');
        analogClock.className = 'analog-clock ' + (busy ? 'busy' : 'available');
        analogClock.style.width = analogClock.style.height = '70%';
        const face = document.createElement('div');
        face.className = 'clock-face';
        face.style.width = face.style.height = '90%';
        // Hour dots and numbers
        for (let i = 1; i <= 12; i++) {
            const dot = document.createElement('div');
            dot.className = 'clock-hour-tick';
            const dotAngle = (i - 3) * 30 * (Math.PI / 180);
            const faceRadius = 35; // percent-based for 70% of cell
            const dotR = faceRadius - 8;
            dot.style.left = (50 + dotR * Math.cos(dotAngle)) + '%';
            dot.style.top = (50 + dotR * Math.sin(dotAngle)) + '%';
            face.appendChild(dot);
            const num = document.createElement('div');
            num.className = 'clock-hour-number';
            const numR = faceRadius - 18;
            num.style.left = (50 + numR * Math.cos(dotAngle)) + '%';
            num.style.top = (50 + numR * Math.sin(dotAngle)) + '%';
            num.textContent = i;
            face.appendChild(num);
        }
        // Hands
        const hour = time.getHours() % 12;
        const minute = time.getMinutes();
        const second = time.getSeconds();
        const hourDeg = (hour + minute / 60) * 30;
        const minDeg = (minute + second / 60) * 6;
        const secDeg = second * 6;
        const hourHand = document.createElement('div');
        hourHand.className = 'clock-hand hand-hour';
        hourHand.style.transform = `translate(-50%, -100%) rotate(${hourDeg}deg)`;
        const minHand = document.createElement('div');
        minHand.className = 'clock-hand hand-minute';
        minHand.style.transform = `translate(-50%, -100%) rotate(${minDeg}deg)`;
        const secHand = document.createElement('div');
        secHand.className = 'clock-hand hand-second';
        secHand.style.transform = `translate(-50%, -100%) rotate(${secDeg}deg)`;
        const centerDot = document.createElement('div');
        centerDot.className = 'clock-center-dot';
        face.appendChild(hourHand);
        face.appendChild(minHand);
        face.appendChild(secHand);
        face.appendChild(centerDot);
        analogClock.appendChild(face);
        // Only show name
        const infoDiv = document.createElement('div');
        infoDiv.className = 'person-info';
        infoDiv.innerHTML = `<span class="person-name">${person.name}</span>`;
        clockDiv.appendChild(infoDiv);
        clockDiv.appendChild(analogClock);
        peopleClocksDiv.appendChild(clockDiv);
    });
}

function renderUserClock() {
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Analog clock
    const analogDiv = document.getElementById('user-analog-clock');
    if (analogDiv) {
        analogDiv.innerHTML = '';
        analogDiv.className = 'analog-clock user-local';
        const face = document.createElement('div');
        face.className = 'clock-face';
        // Hour dots and numbers for user clock
        for (let i = 1; i <= 12; i++) {
            // Dot
            const dot = document.createElement('div');
            dot.className = 'clock-hour-tick';
            const dotAngle = (i - 3) * 30 * (Math.PI / 180);
            const faceRadius = 55; // half of face size (110px)
            const dotR = faceRadius - 8; // 8px inside the edge
            dot.style.left = (50 + (dotR * Math.cos(dotAngle)) / faceRadius * 50) + '%';
            dot.style.top = (50 + (dotR * Math.sin(dotAngle)) / faceRadius * 50) + '%';
            face.appendChild(dot);
            // Number
            const num = document.createElement('div');
            num.className = 'clock-hour-number';
            const numR = faceRadius - 20;
            num.style.left = (50 + (numR * Math.cos(dotAngle)) / faceRadius * 50) + '%';
            num.style.top = (50 + (numR * Math.sin(dotAngle)) / faceRadius * 50) + '%';
            num.textContent = i;
            face.appendChild(num);
        }
        const hour = now.getHours() % 12;
        const minute = now.getMinutes();
        const second = now.getSeconds();
        const hourDeg = (hour + minute / 60) * 30;
        const minDeg = (minute + second / 60) * 6;
        const secDeg = second * 6;
        const hourHand = document.createElement('div');
        hourHand.className = 'clock-hand hand-hour';
        hourHand.style.transform = `translate(-50%, -100%) rotate(${hourDeg}deg)`;
        const minHand = document.createElement('div');
        minHand.className = 'clock-hand hand-minute';
        minHand.style.transform = `translate(-50%, -100%) rotate(${minDeg}deg)`;
        const secHand = document.createElement('div');
        secHand.className = 'clock-hand hand-second';
        secHand.style.transform = `translate(-50%, -100%) rotate(${secDeg}deg)`;
        const centerDot = document.createElement('div');
        centerDot.className = 'clock-center-dot';
        face.appendChild(hourHand);
        face.appendChild(minHand);
        face.appendChild(secHand);
        face.appendChild(centerDot);
        analogDiv.appendChild(face);
    }
}

function tick() {
    console.log('tick: people array =', people);
    renderPeopleClocks();
    renderUserClock();
}

function populateCountrySelect() {
    personCountrySelect.innerHTML = '';
    Object.keys(countryToTimezone).forEach(country => {
        const opt = document.createElement('option');
        opt.value = country;
        opt.textContent = country;
        personCountrySelect.appendChild(opt);
    });
}

function minsToTimeStr(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}
function updateBusySliderLabels() {
    const start = parseInt(busyStartSlider.value);
    const end = parseInt(busyEndSlider.value);
    busyStartLabel.textContent = minsToTimeStr(start);
    busyEndLabel.textContent = minsToTimeStr(end);
    // Prevent invalid range
    if (start >= end) {
        busyEndSlider.value = Math.min(start + 30, 1440);
        busyEndLabel.textContent = minsToTimeStr(busyEndSlider.value);
    }
}
busyStartSlider.addEventListener('input', updateBusySliderLabels);
busyEndSlider.addEventListener('input', updateBusySliderLabels);

function renderBusySlotsList() {
    busySlotsListDiv.innerHTML = '';
    // Only show the message if the user is in the process of adding a new person
    if (newPersonBusySlots.length === 0) {
        // Only show if the add person form is visible (i.e., not after submit)
        if (document.body.contains(busySlotsListDiv)) {
            busySlotsListDiv.textContent = '';
        }
        return;
    }
    const ul = document.createElement('ul');
    newPersonBusySlots.forEach((slot, i) => {
        const li = document.createElement('li');
        li.textContent = `${slot.start} - ${slot.end}`;
        // Add remove button for each slot
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.marginLeft = '8px';
        removeBtn.onclick = () => {
            newPersonBusySlots.splice(i, 1);
            renderBusySlotsList();
        };
        li.appendChild(removeBtn);
        ul.appendChild(li);
    });
    busySlotsListDiv.appendChild(ul);
}

// Add busy slot button
const addBusySlotBtn = document.createElement('button');
addBusySlotBtn.type = 'button';
addBusySlotBtn.textContent = '+';
addBusySlotBtn.onclick = function() {
    const start = parseInt(busyStartSlider.value);
    const end = parseInt(busyEndSlider.value);
    if (start >= end) return;
    const slot = { start: minsToTimeStr(start), end: minsToTimeStr(end) };
    newPersonBusySlots.push(slot);
    renderBusySlotsList();
};

// Insert busy slot list and button into the form
const busySlotSliderGroup = document.querySelector('.busy-slot-slider-group');
busySlotSliderGroup.parentNode.insertBefore(addBusySlotBtn, busySlotSliderGroup.nextSibling);
busySlotSliderGroup.parentNode.insertBefore(busySlotsListDiv, addBusySlotBtn.nextSibling);

function updateEditBusySliderLabels() {
    const start = parseInt(editBusyStartSlider.value);
    const end = parseInt(editBusyEndSlider.value);
    editBusyStartLabel.textContent = minsToTimeStr(start);
    editBusyEndLabel.textContent = minsToTimeStr(end);
    if (start >= end) {
        editBusyEndSlider.value = Math.min(start + 30, 1440);
        editBusyEndLabel.textContent = minsToTimeStr(editBusyEndSlider.value);
    }
}
editBusyStartSlider.addEventListener('input', updateEditBusySliderLabels);
editBusyEndSlider.addEventListener('input', updateEditBusySliderLabels);

function showEditBusySection(idx) {
    editingPersonIdx = idx;
    const person = people[idx];
    editBusySection.style.display = '';
    addPersonForm.style.display = 'none';
    editBusyTitle.textContent = `Edit Busy Slots for ${person.name}`;
    renderEditBusyList();
    editBusyStartSlider.value = 540;
    editBusyEndSlider.value = 1020;
    updateEditBusySliderLabels();
    // Highlight selected tile
    if (lastSelectedTile) lastSelectedTile.classList.remove('selected');
    const tiles = document.querySelectorAll('.person-clock');
    if (tiles[idx]) {
        tiles[idx].classList.add('selected');
        lastSelectedTile = tiles[idx];
    }
}
function hideEditBusySection() {
    editingPersonIdx = null;
    editBusySection.style.display = 'none';
    addPersonForm.style.display = '';
    // Remove highlight
    if (lastSelectedTile) lastSelectedTile.classList.remove('selected');
    lastSelectedTile = null;
}
function renderEditBusyList() {
    editBusyList.innerHTML = '';
    if (editingPersonIdx === null) return;
    const person = people[editingPersonIdx];
    person.busySlots.forEach((slot, i) => {
        const li = document.createElement('li');
        li.textContent = `${slot.start} - ${slot.end}`;
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.style.marginLeft = '8px';
        delBtn.onclick = () => {
            person.busySlots.splice(i, 1);
            renderEditBusyList();
            renderPeopleClocks();
        };
        li.appendChild(delBtn);
        editBusyList.appendChild(li);
    });
}
editBusyAddBtn.addEventListener('click', function() {
    if (editingPersonIdx === null) return;
    const person = people[editingPersonIdx];
    const start = parseInt(editBusyStartSlider.value);
    const end = parseInt(editBusyEndSlider.value);
    if (start >= end) return;
    person.busySlots.push({ start: minsToTimeStr(start), end: minsToTimeStr(end) });
    renderEditBusyList();
    renderPeopleClocks();
});
editBusyDoneBtn.addEventListener('click', function() {
    if (window.confirm('Are you sure you are done editing busy slots for this person?')) {
        hideEditBusySection();
        renderPeopleClocks();
    }
});
// --- Person tile click handler ---
function attachPersonTileClickHandlers() {
    const tiles = document.querySelectorAll('.person-clock');
    tiles.forEach((tile, idx) => {
        tile.onclick = () => {
            showEditBusySection(idx);
        };
    });
}
// Patch renderPeopleClocks to attach click handlers
const origRenderPeopleClocks = renderPeopleClocks;
renderPeopleClocks = function() {
    origRenderPeopleClocks.apply(this, arguments);
    attachPersonTileClickHandlers();
};

// --- Event Listeners ---
addPersonForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = personNameInput.value.trim();
    const country = personCountrySelect.value;
    console.log('Add Person submit:', { name, country, newPersonBusySlots });
    if (!name || !country) return;
    const timezone = getTimezone(country);
    // Allow adding a person even if no busy slots are present
    people.push({ name, country, timezone, busySlots: [...newPersonBusySlots] });
    personNameInput.value = '';
    personCountrySelect.selectedIndex = 0;
    busyStartSlider.value = 540;
    busyEndSlider.value = 1020;
    updateBusySliderLabels();
    newPersonBusySlots = [];
    renderBusySlotsList();
    setTimeout(renderPeopleClocks, 0); // Ensure DOM updates after adding
});

if (peopleFilterForm) {
    peopleFilterForm.addEventListener('change', function(e) {
        const val = peopleFilterForm.elements['people-filter'].value;
        peopleFilter = val;
        renderPeopleClocks();
    });
}

// --- Initial Render and Timer ---
populateCountrySelect();
updateBusySliderLabels();
tick();
setInterval(tick, 1000); 