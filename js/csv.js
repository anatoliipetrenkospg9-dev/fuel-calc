function generateCSVFileName() {
    const vehicleNameClean = (state.vehicle.name || "Техніка")
        .replace(/[\/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, '');

    // Витягуємо номер шляхового листа від "№" до " від"
    const waybillMatch = state.vehicle.waybillNumber.match(/№\s*([^\s]+)\s+від/);
    const waybillNumber = waybillMatch ? waybillMatch[1] : "БЛ";

    let startDate = "YYYY.MM.DD";
    let endDate = "YYYY.MM.DD";

    if (state.trips.length > 0) {
        startDate = state.trips[0].date.replace(/-/g, '.');
        endDate = state.trips[state.trips.length - 1].date.replace(/-/g, '.');
    } else {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
        startDate = today;
        endDate = today;
    }

    const startSpeedo = state.trips.length > 0
        ? ((state.trips[0].calculated && state.trips[0].calculated.startSpeedometer !== undefined && state.trips[0].calculated.startSpeedometer !== null)
            ? Number(state.trips[0].calculated.startSpeedometer)
            : Number(state.vehicle.initialSpeedometer) || 0)
        : Number(state.vehicle.initialSpeedometer) || 0;
    const endSpeedo = state.trips.length > 0
        ? state.trips[state.trips.length - 1].calculated.speedometer
        : startSpeedo;

    const datePart = (startDate === endDate) ? startDate : `${startDate}-${endDate}`;
    return `${waybillNumber}-${datePart}-${vehicleNameClean}(${startSpeedo}-${endSpeedo}).csv`;
}

function exportCSV() {
    if (state.trips.length === 0) {
        showToast("Немає поїздок для експорту");
        return;
    }

    recalculateAllTrips();

    const headers = [
        "НазваБронетехніки", "Розхід", "НомерШляховогоЛиста", "БР", "Дата",
        "Маршрут", "КількістьПоїздок", "ЧасВибуття", "ЧасПрибуття",
        "Дистанція_зВантажем", "Дистанція_безВантажу", "Дистанція_Усього",
        "НайменуванняВантажу", "КількістьВантажу", "ПоказанняСпідометра",
        "Розхід_зВантажем", "РухПоБездоріжжю", "РухПоБездоріжжюОкруглено", "Залишок"
    ];

    const rows = [];
    rows.push(headers.join(";"));

    state.trips.forEach((t) => {
        const c = t.calculated;
        const row = [
            `"${state.vehicle.name}"`,
            formatUaNum(state.vehicle.consumption, 2),
            `"${state.vehicle.waybillNumber}"`,
            `"${t.br}"`,
            formatDateUa(t.date),
            `"${t.route}"`,
            t.tripCount,
            t.depTime,
            t.arrTime,
            formatUaNum(t.distLoaded),
            formatUaNum(t.distUnloaded),
            formatUaNum(c.totalDistance),
            `"${t.cargoName}"`,
            formatUaNum(t.cargoAmount),
            c.speedometer,
            formatUaNum(c.loadedConsumption, 2),
            formatUaNum(c.offRoadFuel, 2),
            c.offRoadFuelRounded,
            formatUaNum(c.remainingFuel, 1)
        ];
        rows.push(row.join(";"));
    });

    const csvContent = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", generateCSVFileName());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV експортовано успішно");
}

function importCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        parseAndLoadCSV(e.target.result);
    };
    reader.readAsText(file, "UTF-8");
}

function parseAndLoadCSV(text) {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
        showToast("Помилка: Файл CSV порожній або має невірний формат");
        return;
    }

    const headers = lines[0].replace(/"/g, '').split(';').map(h => h.trim());
    const requiredFields = [
        "НазваБронетехніки", "Розхід", "НомерШляховогоЛиста", "БР", "Дата",
        "Маршрут", "КількістьПоїздок", "ЧасВибуття", "ЧасПрибуття",
        "Дистанція_зВантажем", "Дистанція_безВантажу", "НайменуванняВантажу",
        "КількістьВантажу", "ПоказанняСпідометра", "Залишок"
    ];
    const missing = requiredFields.filter(f => !headers.includes(f));

    if (missing.length > 0) {
        alert(`Невірний формат CSV.\nВідсутні обов'язкові поля:\n- ${missing.join('\n- ')}`);
        return;
    }

    const getIdx = (name) => headers.indexOf(name);
    const importedTrips = [];
    let lastVehicleName = "";
    let lastCons = 0;
    let lastWaybill = "";
    let lastBR = "";

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(';').map(cell => cell.replace(/^"|"$/g, '').trim());
        if (row.length < headers.length) continue;

        try {
            const dateVal = formatDateInput(row[getIdx("Дата")]);
            const tripCountVal = parseInt(row[getIdx("КількістьПоїздок")], 10);
            
            if (!dateVal || isNaN(tripCountVal) || tripCountVal < 1) {
                throw new Error(`Некоректна дата або кількість поїздок у рядку ${i + 1}`);
            }

            lastVehicleName = row[getIdx("НазваБронетехніки")];
            lastCons = parseNum(row[getIdx("Розхід")]);
            lastWaybill = row[getIdx("НомерШляховогоЛиста")] || "";
            lastBR = row[getIdx("БР")] || "";

            importedTrips.push({
                date: dateVal,
                route: row[getIdx("Маршрут")],
                tripCount: tripCountVal,
                depTime: row[getIdx("ЧасВибуття")] || "00:00",
                arrTime: row[getIdx("ЧасПрибуття")] || "00:00",
                distLoaded: parseNum(row[getIdx("Дистанція_зВантажем")]),
                distUnloaded: parseNum(row[getIdx("Дистанція_безВантажу")]),
                cargoName: row[getIdx("НайменуванняВантажу")] || "",
                cargoAmount: parseNum(row[getIdx("КількістьВантажу")]),
                br: lastBR
            });
        } catch (err) {
            alert(`Помилка імпорту у записі №${i}:\n${err.message}`);
            return;
        }
    }

    if (importedTrips.length === 0) {
        showToast("Не вдалося імпортувати жодного запису");
        return;
    }

    const firstCsvCells = lines[1].split(';').map(cell => cell.replace(/^"|"$/g, '').trim());
    const firstBaseConsumption = parseNum(firstCsvCells[getIdx("Розхід")]);
    const firstTotalDist = calculateTotalDistance(importedTrips[0].distLoaded, importedTrips[0].distUnloaded, importedTrips[0].tripCount);
    const firstEndSpeedo = parseNum(firstCsvCells[getIdx("ПоказанняСпідометра")]);
    const firstEndFuel = parseNum(firstCsvCells[getIdx("Залишок")]);
    const firstStartSpeedo = Math.max(0, firstEndSpeedo - firstTotalDist);
    const firstLoadedCons = calculateLoadedConsumption(firstBaseConsumption, importedTrips[0].cargoAmount);
    const firstOffRoad = roundConsumption(calculateOffRoadConsumption(firstTotalDist, firstLoadedCons));
    const firstStartFuel = Math.max(0, firstEndFuel + firstOffRoad);

    state.vehicle.name = lastVehicleName;
    state.vehicle.consumption = lastCons;
    state.vehicle.waybillNumber = lastWaybill;
    state.vehicle.br = lastBR;
    state.vehicle.initialSpeedometer = firstStartSpeedo;
    state.vehicle.initialFuel = firstStartFuel;
    state.vehicle.displaySpeedometer = null;
    state.vehicle.displayFuel = null;
    state.trips = importedTrips;

    recalculateAllTrips();

    const lastTrip = state.trips[state.trips.length - 1];
    if (lastTrip && lastTrip.calculated) {
        state.vehicle.displaySpeedometer = lastTrip.calculated.speedometer;
        state.vehicle.displayFuel = lastTrip.calculated.remainingFuel;
    }

    saveState();
    updateUI();
    resetTripForm();
    showToast("Дані успішно імпортовано");
}