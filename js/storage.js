const STORAGE_KEY = "armored_fuel_calc_data_v1";

const state = {
    vehicle: {
        name: "",
        consumption: 0,
        initialSpeedometer: 0,
        initialFuel: 0,
        waybillNumber: "",
        br: "",
        displaySpeedometer: null,
        displayFuel: null
    },
    trips: [],
    editingIndex: -1
};

function recalculateAllTrips() {
    const baseConsumption = Number(state.vehicle.consumption) || 0;
    let currentSpeedometer = Number(state.vehicle.initialSpeedometer) || 0;
    let currentFuel = Number(state.vehicle.initialFuel) || 0;

    state.trips.forEach((trip) => {
        const startSpeedometer = (typeof trip.startSpeedometerOverride === 'number')
            ? trip.startSpeedometerOverride
            : currentSpeedometer;
        const startFuel = (typeof trip.startFuelOverride === 'number')
            ? trip.startFuelOverride
            : currentFuel;

        const totalDist = calculateTotalDistance(
            Number(trip.distLoaded) || 0,
            Number(trip.distUnloaded) || 0,
            Number(trip.tripCount) || 1
        );

        const speedometer = calculateSpeedometer(startSpeedometer, totalDist);
        const loadedCons = calculateLoadedConsumption(baseConsumption, Number(trip.cargoAmount) || 0);
        const offRoadExact = calculateOffRoadConsumption(totalDist, loadedCons);
        const offRoadRounded = roundConsumption(offRoadExact);
        const remainingFuel = calculateRemainingFuel(startFuel, offRoadRounded);

        trip.calculated = {
            totalDistance: totalDist,
            speedometer: speedometer,
            loadedConsumption: loadedCons,
            offRoadFuel: offRoadExact,
            offRoadFuelRounded: offRoadRounded,
            remainingFuel: remainingFuel,
            startSpeedometer: startSpeedometer,
            startFuel: startFuel
        };

        currentSpeedometer = speedometer;
        currentFuel = remainingFuel;
    });
}

function saveState() {
    recalculateAllTrips();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        vehicle: state.vehicle,
        trips: state.trips
    }));
}

function loadState() {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (dataStr) {
        try {
            const parsed = JSON.parse(dataStr);
            if (parsed.vehicle) state.vehicle = parsed.vehicle;
            if (Array.isArray(parsed.trips)) state.trips = parsed.trips;
            recalculateAllTrips();
        } catch (e) {
            console.error("Помилка відновлення даних із localStorage", e);
        }
    }
}

function clearState() {
    localStorage.removeItem(STORAGE_KEY);
    state.vehicle = { name: "", consumption: 0, initialSpeedometer: 0, initialFuel: 0, waybillNumber: "", br: "" };
    state.trips = [];
    state.editingIndex = -1;
}