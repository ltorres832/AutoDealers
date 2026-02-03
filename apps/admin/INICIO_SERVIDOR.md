# 🚀 Iniciar el Servidor Admin

## Comando Rápido

```powershell
cd C:\Users\ltorr\AutoDealers\apps\admin
npm run dev
```

## Puerto

El servidor admin corre en el puerto **3001** (no 3000).

## URL de Acceso

```
http://localhost:3001
```

## Si el Servidor No Inicia

1. **Limpiar caché:**
```powershell
Remove-Item -Path ".next" -Recurse -Force
npm run dev
```

2. **Detener procesos Node:**
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```

3. **Reinstalar dependencias (si es necesario):**
```powershell
npm install
npm run dev
```

## Verificar que Está Corriendo

```powershell
netstat -ano | Select-String ":3001"
```

Si ves una línea con `:3001`, el servidor está activo.

## Logs del Servidor

El servidor mostrará:
- `✓ Ready in X.Xs` cuando esté listo
- `Local: http://localhost:3001` con la URL de acceso
- Errores de compilación si los hay





