# VIN: NHTSA y prueba de DataOne

Estado: NHTSA está conectado. DataOne aún no está conectado; falta el acceso de prueba y el contrato de respuesta vigente que entrega el proveedor.

## Acceso necesario

Solicitar Web Services API Trial o Dual Trial en https://vins.dataonesoftware.com/vin_decoder_api_free_trial.
Pedir OEM Build Data / Enhanced VIN Data y descripciones comerciales de equipamiento, además del decodificador básico. Confirmar cobertura de marcas/años y vehículos del mercado de EE. UU. y Puerto Rico utilizados por los clientes. Confirmar condiciones de uso para fichas públicas y anuncios en redes.
No enviar claves por el chat ni guardarlas en el repositorio. Configurar los secretos en el entorno servidor cuando el proveedor entregue el acceso.

## Integración pendiente del acceso

1. Verificar la documentación y ejemplos JSON de la cuenta de prueba. No implementar contra el antiguo servicio XML v6 ni adivinar endpoints.
2. Consultar ambos proveedores desde el servidor. Conservar NHTSA como respaldo si DataOne no cubre el VIN o no está disponible.
3. Separar equipamiento estándar de la versión, equipamiento instalado confirmado por fábrica y opciones no confirmadas. No mezclar versiones candidatas de un VIN ambiguo.
4. Conservar fuente y nivel de confirmación por característica. Los cambios manuales confirmados no se pierden al consultar de nuevo.
5. Verificar con VIN reales del inventario y contrastar con window sticker o ficha de fábrica. No considerar activada la integración hasta pasar esta validación.
6. Invalidar la caché básica al habilitar la fuente ampliada y respetar las condiciones de almacenamiento del proveedor.

## Presentación implementada

Pestañas Mecánica, Exterior, Entretenimiento, Interior y Seguridad; listas en dos columnas en escritorio y una en móvil. Otros datos aparece solo cuando existen datos adicionales. Mismo componente para creación/edición de dealer y vendedor, y ficha pública. Edición separada de la presentación; no hay un catálogo de campos vacíos desplegado por defecto.

## Fuentes oficiales

- NHTSA, datos básicos y alcance: https://vpic.nhtsa.dot.gov/
- DataOne, equipamiento y datos OEM: https://www.dataonesoftware.com/vin-decoding
- Prueba y entrega de documentación: https://vins.dataonesoftware.com/vin_decoder_api_free_trial
- Cobertura y condiciones de evaluación: https://www.dataonesoftware.com/faqs
