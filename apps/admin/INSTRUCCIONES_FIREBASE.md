# 🔥 INSTRUCCIONES PARA HABILITAR FIREBASE AUTH

## ⚠️ El problema:

El API Key de Firebase tiene restricciones o las APIs necesarias no están habilitadas.

## ✅ SOLUCIÓN (2 minutos):

### **Paso 1: Habilitar Email/Password en Firebase**

1. Ve a: **https://console.firebase.google.com/project/autodealers-7f62e/authentication/providers**

2. Busca **"Correo electrónico/contraseña"** o **"Email/Password"**

3. Haz clic en él

4. **ACTIVA** el switch (debe quedar en azul)

5. Haz clic en **"Guardar"**

---

### **Paso 2: Habilitar Identity Toolkit API**

1. Ve a: **https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=autodealers-7f62e**

2. Haz clic en **"ENABLE"** o **"HABILITAR"**

3. Espera 30 segundos

---

### **Paso 3: Verificar el API Key**

1. Ve a: **https://console.cloud.google.com/apis/credentials?project=autodealers-7f62e**

2. Busca el API Key que empieza con `AIzaSyC68yc67...`

3. Haz clic en él

4. En **"Application restrictions"** o **"Restricciones de aplicación"**:
   - Selecciona **"None"** o **"Ninguna"**

5. En **"API restrictions"** o **"Restricciones de API"**:
   - Selecciona **"Don't restrict key"** o **"No restringir la clave"**

6. Haz clic en **"Save"** o **"Guardar"**

---

## ✅ Después de hacer esto:

1. Espera **30 segundos**
2. Ve a: **http://localhost:3001/login**
3. Intenta hacer login

---

## 📧 Credenciales:

```
Email:    admin@autodealers.com
Password: Admin123456
```

---

## 🆘 SI SIGUE FALLANDO:

Dime y usaremos un método completamente del lado del servidor (sin Firebase Client SDK).


