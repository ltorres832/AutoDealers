# Desarrollo Flutter - Hot Reload / Restart

## Si Hot Reload (r) no aplica los cambios

1. **Usa Hot Restart (tecla R mayúscula)** en la terminal donde corre `flutter run`. Reinicia la app en ~2 segundos sin cerrar el navegador.

2. **Hot Reload (r)** solo aplica cambios en código que no afecten:
   - `main()`, `initState()`, constructores
   - Añadir/quitar widgets en el árbol
   - Cambios en `const` o en rutas

3. Para cambios estructurales o tras errores, usa siempre **Hot Restart (R)**.

## Selección de texto

La app envuelve todo en `SelectionArea` (en `main.dart`). Para copiar: selecciona con el ratón y Ctrl+C o clic derecho → Copiar.


