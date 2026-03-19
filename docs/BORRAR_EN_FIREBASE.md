# Borrar Hosting y App Hosting **en Firebase** (en la nube)

Los cambios en tu repo (firebase.json, package.json) **no borran nada en Firebase**. Lo que ves en la consola de Firebase sigue ahí hasta que lo borres **desde la consola o con la CLI**.

Sigue estos pasos para eliminarlo **en la nube**.

---

## 1. Hosting: borrar sitios

### Ver qué sitios tienes

En la raíz del proyecto (donde está `firebase.json`):

```bash
firebase hosting:sites:list
```

Aparecerán todos los sitios. El sitio **por defecto** tiene el mismo nombre que tu proyecto (ej. `autodealers-7f62e`). **Ese no se puede borrar.**

### Borrar cada sitio que NO sea el por defecto

Por cada sitio que quieras eliminar (ej. `public-site`, `admin-panel`, `dealer-dashboard`, `seller-dashboard`, `advertiser-dashboard`):

```bash
firebase hosting:sites:delete NOMBRE_DEL_SITIO
```

Ejemplos:

```bash
firebase hosting:sites:delete public-site
firebase hosting:sites:delete admin-panel
firebase hosting:sites:delete dealer-dashboard
firebase hosting:sites:delete seller-dashboard
firebase hosting:sites:delete advertiser-dashboard
```

Te pedirá confirmación. Si quieres evitar el prompt: `firebase hosting:sites:delete NOMBRE --force`.

### O desde la consola

1. [Firebase Console](https://console.firebase.google.com) → tu proyecto.
2. **Hosting** (menú izquierdo) → pestaña **Sites**.
3. En cada sitio que no sea el por defecto: tres puntos (⋮) → **Delete site**.

---

## 2. App Hosting: borrar backends

### Ver qué backends tienes

```bash
firebase apphosting:backends:list
```

Si el comando no existe, actualiza la CLI: `npm install -g firebase-tools` (versión 13.13.3 o superior).

### Borrar cada backend

```bash
firebase apphosting:backends:delete BACKEND_ID --location us-central1
```

Sustituye `BACKEND_ID` por el id que te salga en la lista (ej. `admin-backend`). Si no estás seguro del `--location`, en la lista suele aparecer (ej. `us-central1`).

**Nota:** En la consola de Firebase a veces no hay botón para borrar App Hosting backends; hay que usar la CLI.

---

## 3. Comprobar

- **Hosting:** Vuelve a ejecutar `firebase hosting:sites:list`. Solo debería quedar (si quieres) el sitio por defecto.
- **App Hosting:** `firebase apphosting:backends:list` debería estar vacío o solo con lo que quieras mantener.

---

## Resumen

| Dónde está | Cómo se borra |
|------------|----------------|
| Sitios de Hosting (en la nube) | Consola → Hosting → Sites → Delete site, o `firebase hosting:sites:delete SITE_ID` |
| Backends de App Hosting (en la nube) | `firebase apphosting:backends:list` y luego `firebase apphosting:backends:delete BACKEND_ID --location us-central1` |
| firebase.json / package.json (en tu repo) | Ya no tienen hosting ni app hosting; no despliegan nada a Hosting/App Hosting |

Si después de esto sigues viendo algo en Firebase, dime qué ves exactamente (pantalla o salida de los comandos) y lo revisamos.

