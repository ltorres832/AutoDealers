# 🧪 Guía Rápida de Prueba - Pipeline Kanban y Sistema de Tareas

**Fecha:** 3 de Febrero, 2026  
**Estado:** ✅ Todo implementado y listo para probar

---

## ✅ Estado del Sistema

El health check muestra que la API está funcionando correctamente:
```json
{
  "service": "AutoDealers Admin Panel API",
  "status": "healthy",
  "message": "AutoDealers Admin Panel API Backend is running"
}
```

---

## 🚀 Rutas Disponibles

### Para Usuarios Normales (Dealers/Vendedores):
- **Leads con Kanban:** http://localhost:3001/leads
- **Tareas:** http://localhost:3001/tasks

### Para Administradores:
- **Todos los Leads (Kanban):** http://localhost:3001/admin/all-leads/kanban
- **Todos los Leads (Lista):** http://localhost:3001/admin/all-leads
- **Tareas (Admin):** http://localhost:3001/admin/tasks

---

## 📋 Pasos para Probar

### 1. Acceder al Admin Panel
1. Abre http://localhost:3001
2. Inicia sesión (o crea un usuario si es necesario)
3. Verás el dashboard principal

### 2. Probar Pipeline Kanban

#### Opción A: Desde el menú lateral (Admin)
1. Click en **"📋 Pipeline Kanban"** en el sidebar
2. Verás el Kanban mejorado con todas las columnas
3. **Arrastra un lead** entre columnas para cambiar su estado
4. Usa los **filtros** (fuente, búsqueda, prioridad)
5. Observa las **alertas de leads estancados** (si hay alguno)

#### Opción B: Desde Leads (Usuario normal)
1. Click en **"Leads"** en el menú (o ve a `/leads`)
2. Click en el toggle **"📊 Kanban"** (arriba a la derecha)
3. Mismo comportamiento que arriba

### 3. Probar Sistema de Tareas

#### Crear una Tarea:
1. Ve a **"/tasks"** o **"/admin/tasks"**
2. Click en **"Nueva Tarea"**
3. Completa el formulario:
   - Tipo: Selecciona (Llamada, Email, WhatsApp, etc.)
   - Título: Ej. "Llamar a cliente mañana"
   - Prioridad: Selecciona (Baja, Media, Alta, Urgente)
   - Fecha y Hora: Selecciona fecha y hora de vencimiento
   - Recordatorio: Opcional
   - Repetición: Opcional
4. Click en **"Crear Tarea"**

#### Desde un Lead:
1. Abre cualquier lead (click en el nombre)
2. Scroll hasta la sección **"Tareas"**
3. Click en **"Nueva Tarea"**
4. La tarea se creará automáticamente vinculada al lead

#### Ver Tareas:
- **Pendientes:** Aparecen arriba con indicadores de vencimiento
- **Completadas:** Aparecen abajo con estilo diferente
- **Filtros:** Usa los filtros para encontrar tareas específicas

#### Completar Tarea:
1. En cualquier tarea pendiente
2. Click en **"✓ Completar"**
3. La tarea se moverá a la sección de completadas

---

## 🎯 Funcionalidades a Verificar

### Pipeline Kanban:
- [ ] Drag & drop funciona correctamente
- [ ] Los estados se actualizan al soltar
- [ ] Los filtros funcionan
- [ ] Las alertas de leads estancados aparecen
- [ ] Los contadores por columna son correctos
- [ ] Los indicadores de score y prioridad se muestran

### Sistema de Tareas:
- [ ] Crear tarea desde página principal
- [ ] Crear tarea desde lead
- [ ] Ver tareas pendientes
- [ ] Ver tareas completadas
- [ ] Completar tarea
- [ ] Eliminar tarea
- [ ] Filtros funcionan
- [ ] Alertas de vencimiento aparecen

### Integración:
- [ ] Las tareas aparecen en detalle del lead
- [ ] Crear tarea desde lead funciona
- [ ] El toggle Lista/Kanban funciona

---

## 🔍 Verificaciones Técnicas

### APIs Funcionando:
```bash
# Health check
curl http://localhost:3001/api/health

# Listar leads
curl http://localhost:3001/api/leads

# Listar tareas
curl http://localhost:3001/api/tasks
```

### Consola del Navegador:
- Abre DevTools (F12)
- Ve a la pestaña "Console"
- No debería haber errores rojos
- Las peticiones a `/api/tasks` y `/api/leads` deberían funcionar

---

## 🐛 Si Algo No Funciona

### Problemas Comunes:

1. **"No hay leads"**
   - Crea algunos leads de prueba desde `/leads` → "Nuevo Lead"

2. **"Error al cargar tareas"**
   - Verifica que estés autenticado
   - Revisa la consola del navegador para errores

3. **"Drag & drop no funciona"**
   - Asegúrate de estar en la vista Kanban (no Lista)
   - Verifica que el lead tenga un estado válido

4. **"No puedo crear tarea"**
   - Verifica que todos los campos requeridos estén completos
   - Revisa la fecha/hora de vencimiento

---

## 📊 Datos de Prueba Sugeridos

### Crear Leads de Prueba:
1. Ve a `/leads`
2. Click en "Nuevo Lead"
3. Crea varios leads con diferentes:
   - Fuentes (Web, WhatsApp, Facebook)
   - Estados (Nuevo, Contactado, Calificado)
   - Prioridades (si tienen clasificación IA)

### Crear Tareas de Prueba:
1. Crea tareas con diferentes:
   - Tipos (Llamada, Email, WhatsApp)
   - Prioridades (Baja, Media, Alta, Urgente)
   - Fechas (hoy, mañana, próxima semana)
   - Algunas vencidas (fecha pasada) para ver alertas

---

## ✅ Checklist de Prueba Completa

- [ ] Acceder al admin panel
- [ ] Ver leads en vista Kanban
- [ ] Arrastrar lead entre columnas
- [ ] Usar filtros en Kanban
- [ ] Ver alertas de leads estancados
- [ ] Crear tarea desde página de tareas
- [ ] Crear tarea desde detalle de lead
- [ ] Ver tareas pendientes
- [ ] Completar una tarea
- [ ] Ver tareas completadas
- [ ] Usar filtros de tareas
- [ ] Ver alertas de tareas vencidas
- [ ] Toggle entre Lista y Kanban funciona

---

## 🎉 ¡Todo Listo!

Todas las funcionalidades están implementadas y deberían funcionar correctamente. 

**Si encuentras algún problema, revisa:**
1. Consola del navegador (F12)
2. Network tab para ver errores de API
3. Que estés autenticado correctamente

**¡Disfruta probando las nuevas funcionalidades! 🚀**
