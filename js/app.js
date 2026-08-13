function formatUaNum(num, decimals = 1) {
    if (num === null || num === undefined || isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toString();
    return Number(num).toFixed(decimals).replace('.', ',');
}

function formatDateUa(dateStr) {
    if (!dateStr) return "";
    if (dateStr.includes('.')) return dateStr;
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
}

function formatDateInput(dateUa) {
    if (!dateUa) return "";
    const parts = dateUa.split('.');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateUa;
}

function showToast(msg) {
    const snackbar = document.getElementById("snackbar");
    snackbar.innerText = msg;
    snackbar.className = "show";
    setTimeout(() => { snackbar.className = snackbar.className.replace("show", ""); }, 3000);
}

function updateUI() {
    document.getElementById("vehicleName").value = state.vehicle.name || "";
    document.getElementById("vehicleConsumption").value = state.vehicle.consumption || "";
    document.getElementById("initialSpeedometer").value =
        state.vehicle.displaySpeedometer !== null && state.vehicle.displaySpeedometer !== undefined
            ? state.vehicle.displaySpeedometer
            : state.vehicle.initialSpeedometer || "";
    document.getElementById("initialFuel").value =
        state.vehicle.displayFuel !== null && state.vehicle.displayFuel !== undefined
            ? state.vehicle.displayFuel
            : state.vehicle.initialFuel || "";
    document.getElementById("waybillNumber").value = state.vehicle.waybillNumber || "";
    document.getElementById("initialBR").value = state.vehicle.br || "";

    renderTripList();
    updateLivePreview();
}

function updateLivePreview() {
    const baseCons = parseNum(document.getElementById("vehicleConsumption").value);
    
    let startSpeedo = parseNum(document.getElementById("initialSpeedometer").value);
    let startFuel = parseNum(document.getElementById("initialFuel").value);

    if (state.editingIndex > 0) {
        const prevTrip = state.trips[state.editingIndex - 1];
        if (prevTrip?.calculated) {
            startSpeedo = prevTrip.calculated.speedometer;
            startFuel = prevTrip.calculated.remainingFuel;
        }
    } else if (state.editingIndex === -1 && state.trips.length > 0) {
        const lastTrip = state.trips[state.trips.length - 1];
        if (lastTrip?.calculated) {
            const speedoInput = document.getElementById("initialSpeedometer").value;
            const fuelInput = document.getElementById("initialFuel").value;
            if (speedoInput === "") {
                startSpeedo = lastTrip.calculated.speedometer;
            }
            if (fuelInput === "") {
                startFuel = lastTrip.calculated.remainingFuel;
            }
        }
    }

    const distL = parseNum(document.getElementById("distLoaded").value);
    const distU = parseNum(document.getElementById("distUnloaded").value);
    const tCount = parseInt(document.getElementById("tripCount").value, 10) || 1;
    const cargoAmt = parseNum(document.getElementById("cargoAmount").value);
    const vbNumber = document.getElementById("waybillNumber").value.trim();
    const brVal = document.getElementById("initialBR").value.trim();
    const totalDistL = calculateFullLoadedDistance(distL, tCount); 
    const totalDistU = calculateFullUnloadedDistance(distU, tCount); 
    const totalDist = calculateTotalDistance(totalDistL, totalDistU);
    const endSpeedo = calculateSpeedometer(startSpeedo, totalDist);
    const loadedCons = calculateLoadedConsumption(baseCons, cargoAmt);
    const offRoadExact = calculateOffRoadConsumption(totalDist, loadedCons);
    const offRoadRound = roundConsumption(offRoadExact);
    const remFuel = calculateRemainingFuel(startFuel, offRoadRound);

    // Пряме виведення за єдиним правилом
    const unit = (text) => `<span class="unit">${text}</span>`;
    document.getElementById("prevVbNumber").innerText = vbNumber || "-";
    document.getElementById("prevBR").innerText = brVal || "-";
    document.getElementById("prevDistLoaded").innerHTML = `${formatUaNum(totalDistL)} ${unit("км")}`;
    document.getElementById("prevDistUnloaded").innerHTML = `${formatUaNum(totalDistU)} ${unit("км")}`;
    document.getElementById("prevTotalDist").innerHTML = `${formatUaNum(totalDist)} ${unit("км")}`;
    document.getElementById("prevSpeedometer").innerHTML = `${formatUaNum(endSpeedo, 0)} ${unit("км")}`;
    document.getElementById("prevLoadedCons").innerHTML = `${formatUaNum(loadedCons, 2)} ${unit("л/100 км")}`;
    document.getElementById("prevOffRoad").innerHTML = `${formatUaNum(offRoadExact, 2)} = ${offRoadRound} ${unit("л")}`;
    document.getElementById("prevFuelRemaining").innerHTML = `${formatUaNum(remFuel, 1)} ${unit("л")}`;

    document.getElementById("fuelWarning").style.display = remFuel < 0 ? "block" : "none";
}

function renderTripList() {
    const listEl = document.getElementById("tripsList");
    document.getElementById("tripCountBadge").innerText = state.trips.length;

    if (state.trips.length === 0) {
        listEl.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 12px;">Поїздок поки немає.</p>`;
        return;
    }

    let html = "";
    state.trips.forEach((trip, index) => {
        const c = trip.calculated;
        const routeDisp = `${trip.route} - ${trip.tripCount}р`;
        const dateDisp = formatDateUa(trip.date);
        const unit = (text) => `<span class="unit">${text}</span>`;

        html += `
        <div class="trip-card">
            <div class="trip-header">
                <span>${dateDisp}</span>
                <span>${state.vehicle.name}</span>
                <span>№ ${index + 1}</span>
            </div>
            <div class="trip-details">
            <div class="detail-item" style="grid-column: 1 / -1;"><span class="detail-label">Шляховий лист:</span><span class="detail-value">${state.vehicle.waybillNumber}</span></div>
                <div class="detail-item"><span class="detail-label">Маршрут:</span><span class="detail-value">${routeDisp}</span></div>
                <div class="detail-item"><span class="detail-label">Час:</span><span class="detail-value">${trip.depTime} - ${trip.arrTime}</span></div>
                <div class="detail-item"><span class="detail-label">З вантажем:</span><span class="detail-value detail-value-special">${formatUaNum(calculateFullLoadedDistance(trip.distLoaded, trip.tripCount))} ${unit('км')}</span></div>
                <div class="detail-item"><span class="detail-label">Без вантажу:</span><span class="detail-value">${formatUaNum(calculateFullUnloadedDistance(trip.distUnloaded, trip.tripCount))} ${unit('км')}</span></div>
                <div class="detail-item"><span class="detail-label">Усього:</span><span class="detail-value detail-value-special">${formatUaNum(c.totalDistance)} ${unit('км')}</span></div>
                <div class="detail-item"><span class="detail-label">Вантаж:</span><span class="detail-value">${trip.cargoName || '-'}, <span class="detail-value-special">${formatUaNum(trip.cargoAmount)} ${unit('т')}</span></span></div>
                <div class="detail-item"><span class="detail-label">Спідометр:</span><span class="detail-value detail-value-special">${formatUaNum(c.speedometer, 0)} ${unit('км')}</span></div>
                <div class="detail-item"><span class="detail-label">Розхід норма:</span><span class="detail-value">${formatUaNum(state.vehicle.consumption, 2)} ${unit('л')}</span></div>
                <div class="detail-item"><span class="detail-label">Розхід вантаж:</span><span class="detail-value detail-value-special">${formatUaNum(c.loadedConsumption, 2)} ${unit('л/100км')}</span></div>
                <div class="detail-item"><span class="detail-label">Бездоріжжя:</span><span class="detail-value detail-value-special">${formatUaNum(c.offRoadFuel, 2)} = ${c.offRoadFuelRounded} ${unit('л')}</span></div>
                <div class="detail-item"><span class="detail-label">Залишок:</span><span class="detail-value detail-value-special" style="${c.remainingFuel < 0 ? 'color:var(--error-color);font-weight:bold;' : ''}">${formatUaNum(c.remainingFuel, 1)} ${unit('л')}</span></div>
                <div class="detail-item" style="grid-column: 1 / -1;"><span class="detail-label">БР:</span><span class="detail-value">${trip.br}</span></div>
            </div>
            <div class="trip-actions">
                <button class="btn btn-secondary btn-sm" onclick="editTrip(${index})">Редагувати</button>
                <button class="btn btn-danger btn-sm" onclick="confirmDeleteTrip(${index})">Видалити</button>
            </div>
        </div>`;
    });

    listEl.innerHTML = html;
}

function saveTripFromForm() {
    if (!validateFields()) {
        showToast("Будь ласка, виправте помилки у формі");
        return;
    }

    state.vehicle.name = document.getElementById("vehicleName").value.trim();
    state.vehicle.consumption = parseNum(document.getElementById("vehicleConsumption").value);
    const inputSpeedometer = parseNum(document.getElementById("initialSpeedometer").value);
    const inputFuel = parseNum(document.getElementById("initialFuel").value);
    const hasTrips = state.trips.length > 0;
    const editingFirstTrip = state.editingIndex === 0;

    if (!hasTrips || editingFirstTrip) {
        state.vehicle.initialSpeedometer = inputSpeedometer;
        state.vehicle.initialFuel = inputFuel;
        state.vehicle.displaySpeedometer = null;
        state.vehicle.displayFuel = null;
    }

    state.vehicle.waybillNumber = document.getElementById("waybillNumber").value.trim();
    state.vehicle.br = document.getElementById("initialBR").value.trim();

    const initialSpeedometerValue = document.getElementById("initialSpeedometer").value;
    const initialFuelValue = document.getElementById("initialFuel").value;

    const tripData = {
        date: document.getElementById("tripDate").value,
        route: document.getElementById("tripRoute").value.trim(),
        tripCount: parseInt(document.getElementById("tripCount").value, 10),
        depTime: document.getElementById("depTime").value,
        arrTime: document.getElementById("arrTime").value,
        distLoaded: parseNum(document.getElementById("distLoaded").value),
        distUnloaded: parseNum(document.getElementById("distUnloaded").value),
        cargoName: document.getElementById("cargoName").value.trim(),
        cargoAmount: parseNum(document.getElementById("cargoAmount").value),
        br: state.vehicle.br // Береться з розділу "2. Початкові дані"
    };

    if (hasTrips && state.editingIndex === -1) {
        if (initialSpeedometerValue !== "") {
            tripData.startSpeedometerOverride = inputSpeedometer;
        }
        if (initialFuelValue !== "") {
            tripData.startFuelOverride = inputFuel;
        }
    }

    if (state.editingIndex >= 0) {
        state.trips[state.editingIndex] = tripData;
        showToast("Поїздку відредаговано");
    } else {
        state.trips.push(tripData);
        showToast("Поїздку додано");
    }

    saveState();

    // Завжди оновлюємо значення на основі останньої поїздки (при додаванні чи редаганні)
    const lastTrip = state.trips[state.trips.length - 1];
    if (lastTrip && lastTrip.calculated) {
        state.vehicle.displaySpeedometer = lastTrip.calculated.speedometer;
        state.vehicle.displayFuel = lastTrip.calculated.remainingFuel;
    }

    resetTripForm();
    updateUI();
}


function editTrip(index) {
    state.editingIndex = index;
    const trip = state.trips[index];

    document.getElementById("tripDate").value = trip.date;
    document.getElementById("tripRoute").value = trip.route;
    document.getElementById("tripCount").value = trip.tripCount;
    document.getElementById("depTime").value = trip.depTime;
    document.getElementById("arrTime").value = trip.arrTime;
    document.getElementById("distLoaded").value = trip.distLoaded;
    document.getElementById("distUnloaded").value = trip.distUnloaded;
    document.getElementById("cargoName").value = trip.cargoName;
    document.getElementById("cargoAmount").value = trip.cargoAmount;
    
    // Populate odometer and fuel from the trip's calculated starting values
    if (trip.calculated) {
        document.getElementById("initialSpeedometer").value = trip.calculated.startSpeedometer || "";
        document.getElementById("initialFuel").value = trip.calculated.startFuel || "";
    }
    
    document.getElementById("formTitle").innerText = `Редагування поїздки №${index + 1}`;
    document.getElementById("btnSaveTrip").innerText = "Зберегти зміни";
    document.getElementById("btnCancelEdit").classList.remove("hidden");

    document.getElementById("tripFormSection").scrollIntoView({ behavior: 'smooth' });
    autoResizeTextarea();
    updateLivePreview();
}

function resetTripForm() {
    state.editingIndex = -1;
    document.getElementById("formTitle").innerText = "3. Нова поїздка";
    document.getElementById("btnSaveTrip").innerText = "Додати поїздку";
    document.getElementById("btnCancelEdit").classList.add("hidden");

    // Автозаповнення маршруту та вантажу з останньої поїздки
    if (state.trips.length > 0) {
        const lastTrip = state.trips[state.trips.length - 1];
        document.getElementById("tripRoute").value = lastTrip.route || "";
        document.getElementById("cargoName").value = lastTrip.cargoName || "";
    } else {
        document.getElementById("tripRoute").value = "";
        document.getElementById("cargoName").value = "";
    }
    
    document.getElementById("tripCount").value = "1";
    document.getElementById("distLoaded").value = "0";
    document.getElementById("distUnloaded").value = "0";
    document.getElementById("cargoAmount").value = "0";
    
    autoResizeTextarea();
    updateLivePreview();
}

let modalActionHandler = null;

function showConfirmModal(title, message, onConfirm) {
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalMessage").innerText = message;
    modalActionHandler = onConfirm;
    document.getElementById("confirmModal").classList.add("active");
}

function hideConfirmModal() {
    document.getElementById("confirmModal").classList.remove("active");
    modalActionHandler = null;
}

function confirmDeleteTrip(index) {
    showConfirmModal("Видалити поїздку?", "Ви дійсно бажаєте видалити цей запис? Усі наступні розрахунки будуть перераховані.", () => {
        const prevEditingIndex = state.editingIndex;
        state.trips.splice(index, 1);

        if (prevEditingIndex === index) {
            resetTripForm();
        } else if (prevEditingIndex > index) {
            state.editingIndex = prevEditingIndex - 1;
        }

        saveState();

        // Оновлюємо значення на основі останньої поїздки, яка лишилась
        if (state.trips.length > 0) {
            const lastTrip = state.trips[state.trips.length - 1];
            if (lastTrip && lastTrip.calculated) {
                state.vehicle.displaySpeedometer = lastTrip.calculated.speedometer;
                state.vehicle.displayFuel = lastTrip.calculated.remainingFuel;
            }
        } else {
            // Якщо поїздок більше немає, очищуємо display значення
            state.vehicle.displaySpeedometer = null;
            state.vehicle.displayFuel = null;
        }

        updateUI();
        showToast("Поїздку видалено");
    });
}

function autoResizeTextarea() {
    const textarea = document.getElementById("tripRoute");
    if (textarea) {
        const singleLineHeight = 48; // Original default height
        textarea.style.height = "auto";
        const scrollHeight = textarea.scrollHeight;
        
        // Only expand if content actually needs more than one line
        // Add small buffer to account for line-height variations
        if (scrollHeight > singleLineHeight + 5) {
            textarea.style.height = scrollHeight + "px";
        } else {
            textarea.style.height = singleLineHeight + "px";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("tripDate").value = new Date().toISOString().split('T')[0];

    loadState();
    updateUI();

    const liveInputs = [
        "vehicleConsumption", "initialSpeedometer", "initialFuel", "initialBR",
        "distLoaded", "distUnloaded", "tripCount", "cargoAmount"
    ];
    liveInputs.forEach(id => {
        document.getElementById(id).addEventListener("input", updateLivePreview);
    });

    // Auto-resize textarea for Route field
    const tripRouteTextarea = document.getElementById("tripRoute");
    if (tripRouteTextarea) {
        tripRouteTextarea.addEventListener("input", autoResizeTextarea);
    }

    ["vehicleName", "vehicleConsumption", "waybillNumber", "initialBR"].forEach(id => {
        document.getElementById(id).addEventListener("change", () => {
            state.vehicle.name = document.getElementById("vehicleName").value.trim();
            state.vehicle.consumption = parseNum(document.getElementById("vehicleConsumption").value);
            state.vehicle.waybillNumber = document.getElementById("waybillNumber").value.trim();
            state.vehicle.br = document.getElementById("initialBR").value.trim();
            saveState();
            updateUI();
        });
    });

    ["initialSpeedometer", "initialFuel"].forEach(id => {
        document.getElementById(id).addEventListener("change", (event) => {
            const value = event.target.value;
            if (state.trips.length > 0) {
                if (id === "initialSpeedometer") {
                    state.vehicle.displaySpeedometer = value !== "" ? parseNum(value) : null;
                } else {
                    state.vehicle.displayFuel = value !== "" ? parseNum(value) : null;
                }
                updateLivePreview();
            } else {
                if (id === "initialSpeedometer") {
                    state.vehicle.initialSpeedometer = parseNum(value);
                    state.vehicle.displaySpeedometer = null;
                } else {
                    state.vehicle.initialFuel = parseNum(value);
                    state.vehicle.displayFuel = null;
                }
                saveState();
                updateUI();
            }
        });
    });

    document.getElementById("btnSaveTrip").addEventListener("click", saveTripFromForm);
    document.getElementById("btnCancelEdit").addEventListener("click", resetTripForm);

    document.getElementById("btnClear").addEventListener("click", () => {
        showConfirmModal("Очистити всі дані?", "Усі дані бронетехніки та журнал поїздок будуть видалені безповоротно.", () => {
            clearState();
            resetTripForm();
            updateUI();
            showToast("Дані очищено");
        });
    });

    document.getElementById("btnExport").addEventListener("click", exportCSV);
    
    const fileInput = document.getElementById("csvFileInput");
    document.getElementById("btnImport").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            importCSV(e.target.files[0]);
            fileInput.value = "";
        }
    });

    document.getElementById("modalBtnConfirm").addEventListener("click", () => {
        if (modalActionHandler) modalActionHandler();
        hideConfirmModal();
    });
    document.getElementById("modalBtnCancel").addEventListener("click", hideConfirmModal);
});