/** Copy educativo de Mi garage. El producto es opcional; no es registro de negocio. */

export const MI_GARAGE_CAPABILITIES = [
  {
    title: 'Guardar tu vehículo',
    short: 'Agregar tu vehículo a mano o al preguntar por un anuncio',
    detail:
      'Agrégalo tú con año, marca y modelo para que el sistema lo reconozca. También se guarda si preguntas por un anuncio o pides una cita.',
  },
  {
    title: 'Recibir recordatorios',
    short: 'Recibir recordatorios (seguro, inspección, marbete, rotación de gomas)',
    detail:
      'Te avisamos de seguro, inspección, marbete y rotación de gomas (unos 6 meses).',
  },
  {
    title: 'Ver negocios registrados',
    short: 'Ver solo talleres, gomeras y piezas del vehículo que elijas',
    detail:
      'Las sugerencias cambian al cambiar de carro. Solo negocios publicados en AutoDealers; si no hay para ese vehículo, te lo decimos.',
  },
  {
    title: 'Cuenta opcional',
    short: 'Cuenta opcional: no es obligatorio registrarse',
    detail:
      'Puedes usar Mi garage sin cuenta. Crea una solo si quieres volver desde otro celular o computadora.',
  },
] as const;
