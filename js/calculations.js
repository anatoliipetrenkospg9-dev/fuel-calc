// 4.1 Загальна дистанція
function calculateTotalDistance(distLoaded, distUnloaded, tripCount) {
    return (distLoaded + distUnloaded) * tripCount;
}

// 4.2 Показання спідометра
function calculateSpeedometer(prevSpeedometer, totalDistance) {
    return prevSpeedometer + totalDistance;
}

// 4.3 Розхід з вантажем (л/100 км)
function calculateLoadedConsumption(baseConsumption, cargoAmount) {
    return (cargoAmount * 0.9) + baseConsumption;
}

/**
 * 4.4 Рух по бездоріжжю (л)
 * (Дистанція_Усього × Розхід_зВантажем / 100) + 20%
 */
function calculateOffRoadConsumption(totalDistance, loadedConsumption) {
    return (totalDistance * loadedConsumption / 100) * 1.2;
}

// 4.5 Округлення до цілого літра
function roundConsumption(val) {
    return Math.round(val);
}

// 4.6 Залишок
function calculateRemainingFuel(prevFuel, roundedOffRoadConsumption) {
    return prevFuel - roundedOffRoadConsumption;
}