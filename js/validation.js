function parseNum(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const normalized = String(val).replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
}

function validateFields() {
    let isValid = true;

    function checkField(id, condition) {
        const el = document.getElementById(id);
        const errEl = document.getElementById(`err-${id}`);
        if (!condition) {
            el.classList.add("input-error");
            if (errEl) errEl.style.display = "block";
            isValid = false;
        } else {
            el.classList.remove("input-error");
            if (errEl) errEl.style.display = "none";
        }
    }

    // Бронетехніка
    const vName = document.getElementById("vehicleName").value.trim();
    checkField("vehicleName", vName.length > 0 && vName.length <= 50);

    const vCons = parseNum(document.getElementById("vehicleConsumption").value);
    checkField("vehicleConsumption", vCons >= 0 && document.getElementById("vehicleConsumption").value !== "");

    // Початкові дані
    const initSpeed = parseNum(document.getElementById("initialSpeedometer").value);
    checkField("initialSpeedometer", initSpeed >= 0 && document.getElementById("initialSpeedometer").value !== "");

    const initFuel = parseNum(document.getElementById("initialFuel").value);
    checkField("initialFuel", initFuel >= 0 && document.getElementById("initialFuel").value !== "");

    const waybill = document.getElementById("waybillNumber").value.trim();
    checkField("waybillNumber", waybill.length > 0);

    const initBR = document.getElementById("initialBR").value.trim();
    checkField("initialBR", initBR.length > 0);

    // Поїздка
    checkField("tripDate", document.getElementById("tripDate").value !== "");
    checkField("tripRoute", document.getElementById("tripRoute").value.trim().length > 0);
    
    const tCount = parseInt(document.getElementById("tripCount").value, 10);
    checkField("tripCount", tCount >= 1);

    checkField("depTime", document.getElementById("depTime").value !== "");
    checkField("arrTime", document.getElementById("arrTime").value !== "");

    checkField("distLoaded", parseNum(document.getElementById("distLoaded").value) >= 0);
    checkField("distUnloaded", parseNum(document.getElementById("distUnloaded").value) >= 0);
    checkField("cargoAmount", parseNum(document.getElementById("cargoAmount").value) >= 0);

    return isValid;
}