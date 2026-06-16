"use strict";
// Servicio interno que ejecuta el scheduler periódicamente
// Este servicio puede iniciarse cuando la aplicación arranca
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSchedulerService = startSchedulerService;
exports.stopSchedulerService = stopSchedulerService;
exports.getSchedulerServiceStatus = getSchedulerServiceStatus;
const scheduler_1 = require("./scheduler");
let intervalId = null;
let isRunning = false;
/**
 * Inicia el servicio de scheduler con ejecución periódica
 * @param intervalMinutes Intervalo en minutos entre ejecuciones (default: 15 minutos)
 */
function startSchedulerService(intervalMinutes = 15) {
    if (intervalId) {
        console.log('Scheduler service already running');
        return;
    }
    console.log(`Starting scheduler service with ${intervalMinutes} minute interval`);
    // Ejecutar inmediatamente al iniciar
    (0, scheduler_1.runScheduledTasks)().catch((error) => {
        console.error('Error in initial scheduler run:', error);
    });
    // Programar ejecuciones periódicas
    intervalId = setInterval(async () => {
        if (isRunning) {
            console.log('Scheduler task already running, skipping...');
            return;
        }
        isRunning = true;
        try {
            await (0, scheduler_1.runScheduledTasks)();
        }
        catch (error) {
            console.error('Error in scheduled task execution:', error);
        }
        finally {
            isRunning = false;
        }
    }, intervalMinutes * 60 * 1000);
    console.log('Scheduler service started successfully');
}
/**
 * Detiene el servicio de scheduler
 */
function stopSchedulerService() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('Scheduler service stopped');
    }
}
/**
 * Obtiene el estado del servicio de scheduler
 */
function getSchedulerServiceStatus() {
    return {
        isRunning: intervalId !== null,
        intervalMinutes: intervalId ? 15 : null, // Por ahora hardcodeado, puede mejorarse
    };
}
