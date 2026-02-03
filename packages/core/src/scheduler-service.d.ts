/**
 * Inicia el servicio de scheduler con ejecución periódica
 * @param intervalMinutes Intervalo en minutos entre ejecuciones (default: 15 minutos)
 */
export declare function startSchedulerService(intervalMinutes?: number): void;
/**
 * Detiene el servicio de scheduler
 */
export declare function stopSchedulerService(): void;
/**
 * Obtiene el estado del servicio de scheduler
 */
export declare function getSchedulerServiceStatus(): {
    isRunning: boolean;
    intervalMinutes: number | null;
};
//# sourceMappingURL=scheduler-service.d.ts.map