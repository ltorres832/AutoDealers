# Guía de Contribución

## Estructura del Proyecto

Este es un monorepo usando:
- **Turbo** para builds
- **Workspaces** de npm
- **TypeScript** en todo el código

## Flujo de Trabajo

1. Crear branch desde `main`
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. Desarrollar y testear
   ```bash
   npm run dev
   npm run test
   ```

3. Commit con mensajes descriptivos
   ```bash
   git commit -m "feat: agregar funcionalidad X"
   ```

4. Push y crear Pull Request

## Convenciones

### Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Documentación
- `style:` Formato
- `refactor:` Refactorización
- `test:` Tests
- `chore:` Tareas de mantenimiento

### Código

- TypeScript estricto
- ESLint configurado
- Prettier para formato
- Comentarios en funciones complejas

### Estructura

- Un archivo por función/clase principal
- Exports desde `index.ts`
- Tests junto al código

## Pull Requests

1. Descripción clara
2. Screenshots si aplica
3. Tests incluidos
4. Documentación actualizada
5. Revisión requerida

## Preguntas

Abrir issue en GitHub o contactar al equipo.





