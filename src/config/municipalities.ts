export type Municipality = {
  slug: string;
  name: string;
  province: string;
  elevationM: number;
  latitude: number;
  longitude: number;
  localText: string;
  agriculturalText: string;
};

export const MUNICIPALITIES: Municipality[] = [
  { slug: 'puebla-de-don-fadrique', name: 'Puebla de Don Fadrique', province: 'Granada', elevationM: 1164, latitude: 37.9583, longitude: -2.435, localText: 'Previsión para la Puebla, con atención a sus noches frías y a los cambios de viento del Altiplano.', agriculturalText: 'Una referencia útil para almendro, cereal y otros cultivos de secano: revisa mínimos nocturnos, viento y lluvia antes de planificar labores.' },
  { slug: 'castril', name: 'Castril', province: 'Granada', elevationM: 890, latitude: 37.7961, longitude: -2.7464, localText: 'Información meteorológica local para Castril y su entorno de vega y sierra.', agriculturalText: 'Consulta la evolución de temperatura, lluvia y viento para ajustar riego y labores según la parcela y la orientación del terreno.' },
  { slug: 'galera', name: 'Galera', province: 'Granada', elevationM: 820, latitude: 37.7433, longitude: -2.5514, localText: 'Previsión de Galera con una lectura práctica de las próximas horas y de la semana.', agriculturalText: 'La información ayuda a decidir ventanas de trabajo, vigilar heladas y anticipar necesidades de agua en los cultivos.' },
  { slug: 'orce', name: 'Orce', province: 'Granada', elevationM: 925, latitude: 37.7194, longitude: -2.4772, localText: 'Tiempo local de Orce para consultar cambios de temperatura, lluvia y viento sin perder contexto.', agriculturalText: 'Especialmente útil para revisar el riesgo de helada, la humedad disponible y las mejores horas para trabajar.' },
  { slug: 'castillejar', name: 'Castilléjar', province: 'Granada', elevationM: 795, latitude: 37.7186, longitude: -2.6489, localText: 'Previsión meteorológica para Castilléjar y sus parcelas agrícolas.', agriculturalText: 'Revisa lluvia, viento y temperatura antes de regar, tratar o entrar con maquinaria en la parcela.' },
  { slug: 'cullar', name: 'Cúllar', province: 'Granada', elevationM: 890, latitude: 37.5833, longitude: -2.5667, localText: 'Datos meteorológicos de Cúllar con previsión por horas y tendencia de los próximos días.', agriculturalText: 'Una referencia para organizar riego y labores con atención a la lluvia prevista, el viento y los contrastes térmicos.' },
];

export function getMunicipality(slug: string): Municipality | undefined {
  return MUNICIPALITIES.find((municipality) => municipality.slug === slug);
}
