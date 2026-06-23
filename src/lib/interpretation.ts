export type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export interface Interpretation {
  label: string;
  detail: string;
  action: string;
  tone: Tone;
}

function fmt(v: number | null | undefined, d: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '--';
  return v.toFixed(d);
}

export function interpretTemperature(tempC: number, feelsLikeC: number, humidityPct: number | null, windKmh: number | null): Interpretation {
  if (tempC >= 38) {
    return {
      label: 'Calor extremo',
      detail: 'Temperatura peligrosamente alta. Riesgo de golpe de calor, deshidratacion y estres termico severo en personas y animales.',
      action: 'Evita toda actividad al sol entre 12:00 y 19:00. Busca sombra, hidratate constantemente y vigila a mayores y ninos.',
      tone: 'danger',
    };
  }
  if (tempC >= 32) {
    return {
      label: 'Calor intenso',
      detail: 'Temperatura muy alta. Riesgo de golpe de calor y deshidratacion. El cuerpo necesita mas esfuerzo para refrescarse.',
      action: 'Evita esfuerzos fisicos entre 13:00 y 18:00. Bebe agua con frecuencia. No dejes personas ni animales en vehiculos.',
      tone: 'warning',
    };
  }
  if (tempC >= 28) {
    return {
      label: 'Calor notable',
      detail: 'Temperatura alta. Sensacion de bochorno al sol. El calor puede afectar si trabajas al aire libre.',
      action: 'Realiza labores pesadas solo por la manana temprano o al atardecer. Mantente hidratado.',
      tone: 'warning',
    };
  }
  if (tempC >= 22) {
    return {
      label: 'Temperatura agradable',
      detail: 'Temperatura templada ideal para la mayoria de actividades al aire libre.',
      action: 'Buen momento para labores, paseos, tratamientos agricolas y actividad ganadera. Sin restricciones.',
      tone: 'success',
    };
  }
  if (tempC >= 15) {
    return {
      label: 'Templado',
      detail: 'Temperatura suave. Adecuado para trabajo y ocio al aire libre con ropa ligera.',
      action: 'Condiciones favorables para todo tipo de actividades. Si trabajas en el campo, buen momento.',
      tone: 'success',
    };
  }
  if (tempC >= 10) {
    return {
      label: 'Fresco',
      detail: 'Temperatura baja pero dentro de lo confortable si no hay viento fuerte.',
      action: 'Lleva abrigo si estas al aire libre. Vigila posibles heladas nocturnas si el cielo esta despejado.',
      tone: 'info',
    };
  }
  if (tempC >= 5) {
    return {
      label: 'Frio',
      detail: 'Temperatura baja. Sensacion de frio notable, especialmente con viento o humedad.',
      action: 'Abrigate bien. Revisa protecciones contra heladas en cultivos sensibles y animales en exterior.',
      tone: 'warning',
    };
  }
  if (tempC >= 0) {
    return {
      label: 'Frio intenso',
      detail: 'Temperatura cercana a cero. Riesgo de helada en zonas bajas y personas vulnerables.',
      action: 'Protege cultivos sensibles y animales. Vigila carreteras y aceras por posibles placas de hielo.',
      tone: 'danger',
    };
  }
  return {
    label: 'Helada',
    detail: 'Temperatura bajo cero (' + fmt(tempC, 1) + 'C). Formacion de hielo generalizada. Peligro para cultivos, animales y conducciones.',
    action: 'Activa sistemas antihelada. Revisa animales, bebederos y tuberias. Evita desplazamientos si hay hielo en carretera.',
    tone: 'danger',
  };
}

export function interpretHumidity(rhPct: number | null | undefined, tempC: number | null): Interpretation {
  if (rhPct === null || rhPct === undefined) {
    return { label: 'Sin dato', detail: 'No disponible', action: '', tone: 'neutral' };
  }
  if (rhPct <= 15) {
    return {
      label: 'Sequedad extrema',
      detail: 'Humedad criticamente baja. Ambiente muy seco. Aumenta drasticamente el riesgo de incendio y el estres vegetal.',
      action: 'Extrema precaucion con fuego, chispas o maquinaria. Aumenta riego en cultivos. Hidratate mas de lo normal.',
      tone: 'danger',
    };
  }
  if (rhPct <= 25) {
    return {
      label: 'Muy baja',
      detail: 'Ambiente muy seco. Aumenta la sequedad ambiental y el riesgo de estres vegetal. Mayor evaporacion.',
      action: 'Evita labores con fuego, chispas o maquinaria en horas centrales. Revisa riego y humedad del suelo.',
      tone: 'warning',
    };
  }
  if (rhPct <= 40) {
    return {
      label: 'Baja',
      detail: 'Ambiente seco. Sensacion de frescor por evaporacion. La atmosfera demanda mas agua de los cultivos.',
      action: 'Aumenta la frecuencia de riego si los cultivos estan en fase activa. La ET0 sera mas alta.',
      tone: 'info',
    };
  }
  if (rhPct <= 60) {
    return {
      label: 'Normal',
      detail: 'Humedad dentro del rango confortable para personas y cultivos.',
      action: 'Condiciones normales. Sin acciones especificas relacionadas con la humedad.',
      tone: 'success',
    };
  }
  if (rhPct <= 80) {
    return {
      label: 'Alta',
      detail: 'Ambiente humedo. Sensacion de bochorno si hay calor. Puede favorecer enfermedades fungicas.',
      action: 'Vigilar mildiu y oidio en cultivos sensibles. Ventilar invernaderos. Posible rocio nocturno.',
      tone: 'info',
    };
  }
  return {
    label: 'Muy alta',
    detail: 'Ambiente muy humedo. Condiciones favorables para hongos y enfermedades. Sensacion de bochorno con calor.',
    action: 'Evita tratamientos foliares. Vigilar signos de mildiu. Si hay frio, riesgo de helada por humedad.',
    tone: 'warning',
  };
}

export function interpretWind(speedKmh: number | null | undefined, gustKmh: number | null | undefined): Interpretation {
  if (speedKmh === null || speedKmh === undefined) {
    return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
  }
  if (gustKmh != null && gustKmh >= 90) {
    return {
      label: 'Viento peligroso',
      detail: 'Rafagas de ' + fmt(gustKmh, 0) + ' km/h. Riesgo de danos estructurales, caida de ramas y objetos sueltos.',
      action: 'Evita actividades al aire libre. Asegura invernaderos, cubiertas y animales. No hagas tratamientos agricolas.',
      tone: 'danger',
    };
  }
  if (gustKmh != null && gustKmh >= 60) {
    return {
      label: 'Viento fuerte',
      detail: 'Rafagas de ' + fmt(gustKmh, 0) + ' km/h. Puede afectar tratamientos agricolas, arbolado y actividades al aire libre.',
      action: 'Evita tratamientos fitosanitarios (deriva). Revisa tutores y acolchados. Precaución al conducir.',
      tone: 'warning',
    };
  }
  if (speedKmh >= 40) {
    return {
      label: 'Viento moderado-fuerte',
      detail: 'Viento de ' + fmt(speedKmh, 0) + ' km/h. Aumenta la ET0 y puede incomodar trabajos al aire libre.',
      action: 'Valorar si realizar tratamientos segun el producto. El viento seco acelera la evaporacion del suelo.',
      tone: 'warning',
    };
  }
  if (speedKmh >= 25) {
    return {
      label: 'Viento moderado',
      detail: 'Viento de ' + fmt(speedKmh, 0) + ' km/h. Brisa notable que aumenta la evaporacion.',
      action: 'Apto para la mayoria de labores. Revisar deriva si aplicas fitosanitarios.',
      tone: 'info',
    };
  }
  if (speedKmh >= 10) {
    return {
      label: 'Viento suave',
      detail: 'Brisa ligera de ' + fmt(speedKmh, 0) + ' km/h. Condiciones agradables.',
      action: 'Buen momento para tratamientos, paseos y trabajo al aire libre.',
      tone: 'success',
    };
  }
  return {
    label: 'Calma',
    detail: 'Viento muy debil o ausente. Noche en calma = mayor riesgo de inversion termica y helada si el cielo esta despejado.',
    action: 'Si hay prevision de minimas bajas, vigilar helada por inversion termica en zonas bajas.',
    tone: 'info',
  };
}

export function interpretRain(probPct: number | null | undefined, mm: number | null | undefined): Interpretation {
  if ((probPct === null || probPct === undefined) && (mm === null || mm === undefined)) {
    return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
  }
  const p = probPct ?? 0;
  const m = mm ?? 0;

  if (p >= 80 && m >= 20) {
    return {
      label: 'Lluvia intensa',
      detail: 'Probabilidad del ' + fmt(p, 0) + '% con ' + fmt(m, 1) + ' mm previstos. Puede haber encharcamientos.',
      action: 'Suspende labores al aire libre. Revisa drenajes y canalizaciones.',
      tone: 'danger',
    };
  }
  if (p >= 60 && m >= 5) {
    return {
      label: 'Lluvia probable',
      detail: 'Probabilidad del ' + fmt(p, 0) + '% con ' + fmt(m, 1) + ' mm estimados.',
      action: 'Prepara proteccion si tienes cultivos sensibles. Reduce o suspende riego.',
      tone: 'warning',
    };
  }
  if (p >= 40 && m >= 1) {
    return {
      label: 'Posibles lluvias',
      detail: 'Probabilidad del ' + fmt(p, 0) + '% con ' + fmt(m, 1) + ' mm.',
      action: 'Ten precaucion si tienes planes al aire libre. No suspendas riego aun, pero vigila.',
      tone: 'info',
    };
  }
  if (p >= 20) {
    return {
      label: 'Baja probabilidad',
      detail: 'Solo ' + fmt(p, 0) + '% de probabilidad. Poco probable que llueva.',
      action: 'Sin cambios en la planificacion. Continua con riego y labores normales.',
      tone: 'success',
    };
  }
  return {
    label: 'Sin lluvia',
    detail: 'No se espera precipitacion.',
    action: 'Sin restricciones. Si estas en temporada seca, mantén el riego programado.',
    tone: 'success',
  };
}

export function interpretUV(uvIndex: number | null | undefined): Interpretation {
  if (uvIndex === null || uvIndex === undefined) {
    return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
  }
  if (uvIndex >= 11) {
    return {
      label: 'Radiacion UV extrema',
      detail: 'Indice UV ' + uvIndex.toFixed(0) + '. Riesgo extremo de dano solar en piel y ojos.',
      action: 'Evita salir al sol. Usa proteccion total (gorro, gafas, crema SPF50+). La piel se quema en minutos.',
      tone: 'danger',
    };
  }
  if (uvIndex >= 8) {
    return {
      label: 'UV muy alto',
      detail: 'Indice UV ' + uvIndex.toFixed(0) + '. Riesgo alto de quemadura solar.',
      action: 'Minimiza exposicion al sol entre 11:00 y 17:00. Usa proteccion solar y ropa larga.',
      tone: 'warning',
    };
  }
  if (uvIndex >= 6) {
    return {
      label: 'UV alto',
      detail: 'Indice UV ' + uvIndex.toFixed(0) + '. Proteccion necesaria.',
      action: 'Usa gafas de sol, sombrero y crema solar si trabajas al aire libre.',
      tone: 'warning',
    };
  }
  if (uvIndex >= 3) {
    return {
      label: 'UV moderado',
      detail: 'Indice UV ' + uvIndex.toFixed(0) + '. Riesgo bajo con exposicion prolongada.',
      action: 'Proteccion basica si estas mucho tiempo al sol.',
      tone: 'info',
    };
  }
  return {
    label: 'UV bajo',
    detail: 'Indice UV ' + uvIndex.toFixed(0) + '. Sin riesgo de dano solar.',
    action: 'No requiere proteccion especial.',
    tone: 'success',
  };
}

export function interpretSoilTemp(tempC: number | null | undefined, depth: '10cm' | '40cm'): Interpretation {
  if (tempC === null || tempC === undefined) {
    return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
  }
  if (depth === '10cm') {
    if (tempC >= 30) {
      return {
        label: 'Suelo muy caliente',
        detail: 'A ' + fmt(tempC, 1) + 'C. Las raices superficiales sufren estres termico. La germinacion se detiene.',
        action: 'Evita siembra y trasplante. Acolcha para proteger la superficie. Riega en horas frescas.',
        tone: 'danger',
      };
    }
    if (tempC >= 25) {
      return {
        label: 'Suelo caliente',
        detail: 'A ' + fmt(tempC, 1) + 'C. Adecuado para cultivos de clima calido, pero estresante para raiz superficial.',
        action: 'Bueno para melon, sandia, tomate. Vigilar humedad, la evaporacion es alta.',
        tone: 'info',
      };
    }
    if (tempC >= 18) {
      return {
        label: 'Suelo calido',
        detail: 'A ' + fmt(tempC, 1) + 'C. Temperatura excelente para germinacion y crecimiento radicular.',
        action: 'Buen momento para siembra y trasplante de la mayoria de cultivos.',
        tone: 'success',
      };
    }
    if (tempC >= 12) {
      return {
        label: 'Suelo templado',
        detail: 'A ' + fmt(tempC, 1) + 'C. Aceptable para cultivos de clima templado (olivo, almendro, vid).',
        action: 'Sensible para horticolas: esperar si se quiere sembrar tomate, pepino o melon.',
        tone: 'info',
      };
    }
    if (tempC >= 8) {
      return {
        label: 'Suelo fresco',
        detail: 'A ' + fmt(tempC, 1) + 'C. Germinacion lenta. Solo cultivos de clima frio.',
        action: 'Retrasa siembra de cultivos termofilos. Patata y habas pueden sembrarse.',
        tone: 'warning',
      };
    }
    return {
      label: 'Suelo frio',
      detail: 'A ' + fmt(tempC, 1) + 'C. Por debajo del umbral de la mayoria de cultivos.',
      action: 'No sembrar ni trasplantar. Si hay plantas establecidas, cubrir con acolchado.',
      tone: 'danger',
    };
  }
  return {
    label: tempC >= 15 ? 'Suelo profundo templado' : 'Suelo profundo frio',
    detail: 'A ' + fmt(tempC, 1) + 'C. Temperatura a 40 cm cambia lentamente, marca la inercia termica del terreno.',
    action: tempC >= 15
      ? 'Buena reserva termica. Las raices profundas estan activas.'
      : 'Reserva termica baja. Las raices profundas pueden estar en reposo.',
    tone: 'info',
  };
}

export function interpretFrostRisk(risk: string | null | undefined): Interpretation {
  switch (risk) {
    case 'muy_alta':
      return {
        label: 'Riesgo muy alto de helada',
        detail: 'Helada severa probable en las proximas 48h. Dano celular en cultivos sensibles y riesgo para animales.',
        action: 'Activar sistemas antihelada urgentes. Proteger cultivos, tapar sensibles, revisar animales y bebederos.',
        tone: 'danger',
      };
    case 'alta':
      return {
        label: 'Riesgo alto de helada',
        detail: 'Helada probable. Cultivos lenosos y horticolas pueden sufrir danos.',
        action: 'Preparar proteccion: cubiertas flotantes, riego antes de helada, revisar sistemas antihelada.',
        tone: 'danger',
      };
    case 'media':
      return {
        label: 'Riesgo medio de helada',
        detail: 'Posible helada en zonas bajas o con inversion termica.',
        action: 'Vigilar minimas. Tener preparada proteccion para cultivos sensibles.',
        tone: 'warning',
      };
    case 'none':
      return {
        label: 'Sin riesgo de helada',
        detail: 'Temperaturas por encima del umbral de helada.',
        action: 'Sin acciones necesarias. Buen momento para labores al aire libre.',
        tone: 'success',
      };
    default:
      return { label: 'Riesgo no disponible', detail: '', action: '', tone: 'neutral' };
  }
}

export function interpretTHI(thi: number | null | undefined): Interpretation {
  if (thi === null || thi === undefined) {
    return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
  }
  if (thi >= 90) {
    return {
      label: 'Estres termico peligroso',
      detail: 'THI ' + thi.toFixed(0) + '. Condiciones peligrosas para el ganado. Riesgo de golpe de calor.',
      action: 'URGENTE: Sombra, agua abundante y ventilacion. Suspender cualquier manejo.',
      tone: 'danger',
    };
  }
  if (thi >= 85) {
    return {
      label: 'Estres termico severo',
      detail: 'THI ' + thi.toFixed(0) + '. El ganado sufre estres severo. Baja produccion y riesgo para animales jovenes.',
      action: 'Asegura sombra densa y agua fresca. Evita movimientos. Vigila signos de jadeo intenso.',
      tone: 'danger',
    };
  }
  if (thi >= 80) {
    return {
      label: 'Estres termico moderado',
      detail: 'THI ' + thi.toFixed(0) + '. El ganado empieza a sufrir estres. Disminuye el apetito y la produccion.',
      action: 'Asegura agua abundante y sombra. Evita manejo en horas centrales.',
      tone: 'warning',
    };
  }
  if (thi >= 72) {
    return {
      label: 'Estres termico leve',
      detail: 'THI ' + thi.toFixed(0) + '. Leve incomodidad en el ganado.',
      action: 'Proporcionar sombra y agua fresca. Vigilar evolucion.',
      tone: 'info',
    };
  }
  return {
    label: 'Sin estres termico',
    detail: 'THI ' + thi.toFixed(0) + '. El ganado esta en condiciones de confort termico.',
    action: 'Condiciones optimas para el ganado. Sin restricciones.',
    tone: 'success',
  };
}

export function interpretETo(etoMm: number | null | undefined, period: 'hora' | 'dia' | 'semana'): Interpretation {
  if (etoMm === null || etoMm === undefined) {
    return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
  }
  if (period === 'hora') {
    return etoMm >= 0.5
      ? { label: 'ET0 alta', detail: 'Demanda hidrica alta (' + fmt(etoMm, 2) + ' mm/h). El cultivo consume mucha agua.', action: 'Revisar riego. Aumentar frecuencia si el suelo esta seco.', tone: 'warning' }
      : { label: 'ET0 baja', detail: 'Demanda hidrica baja (' + fmt(etoMm, 2) + ' mm/h). Sin presion hidrica.', action: 'Mantener riego normal.', tone: 'success' };
  }
  if (period === 'dia') {
    if (etoMm >= 8) return { label: 'Demanda hidrica muy alta', detail: 'ET0 de ' + fmt(etoMm, 1) + ' mm/dia. Riesgo de estres hidrico.', action: 'Aumentar riego significativamente. Revisar humedad del suelo.', tone: 'danger' };
    if (etoMm >= 6) return { label: 'Demanda hidrica alta', detail: 'ET0 de ' + fmt(etoMm, 1) + ' mm/dia.', action: 'Ajustar riego al alza. Atencion a cultivos en fase media.', tone: 'warning' };
    if (etoMm >= 4) return { label: 'Demanda hidrica media', detail: 'ET0 de ' + fmt(etoMm, 1) + ' mm/dia.', action: 'Mantener riego programado.', tone: 'info' };
    return { label: 'Demanda hidrica baja', detail: 'ET0 de ' + fmt(etoMm, 1) + ' mm/dia.', action: 'Reducir riego si el suelo retiene humedad.', tone: 'success' };
  }
  if (period === 'semana') {
    if (etoMm >= 40) return { label: 'Demanda semanal muy alta', detail: 'ET0 acumulada de ' + fmt(etoMm, 1) + ' mm. Estres hidrico probable.', action: 'Planificar riegos intensivos.', tone: 'danger' };
    if (etoMm >= 25) return { label: 'Demanda semanal alta', detail: 'ET0 acumulada de ' + fmt(etoMm, 1) + ' mm.', action: 'Revisar programacion de riego.', tone: 'warning' };
    if (etoMm >= 15) return { label: 'Demanda semanal media', detail: 'ET0 acumulada de ' + fmt(etoMm, 1) + ' mm.', action: 'Mantener riego normal programado.', tone: 'info' };
    return { label: 'Demanda semanal baja', detail: 'ET0 acumulada de ' + fmt(etoMm, 1) + ' mm.', action: 'Reducir riego si hay lluvia o suelo humedo.', tone: 'success' };
  }
  return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
}

export function interpretLightning(active: boolean | null | undefined, count: number | null | undefined, nearestKm: number | null | undefined): Interpretation {
  if (!active) {
    return { label: 'Sin actividad electrica', detail: 'No se detectan rayos en el area.', action: 'Sin riesgo electrico. Actividades al aire libre seguras.', tone: 'success' };
  }
  const distText = nearestKm != null ? 'a ' + nearestKm.toFixed(1) + ' km' : 'en el area';
  if (count != null && count > 10) {
    return {
      label: 'Tormenta activa',
      detail: count + ' rayos detectados ' + distText + '. Actividad electrica intensa.',
      action: 'Busca refugio inmediato. No permanezcas al aire libre.',
      tone: 'danger',
    };
  }
  return {
    label: 'Rayos cercanos',
    detail: count + ' rayos detectados ' + distText + '. Actividad electrica presente.',
    action: 'Alejate de zonas abiertas, maquinaria metalica y cursos de agua.',
    tone: 'warning',
  };
}

export function interpretCloudCover(pct: number | null | undefined): Interpretation & { emoji: string } {
  if (pct === null || pct === undefined) {
    return { label: 'Sin dato', detail: '', action: '', tone: 'neutral', emoji: '?' };
  }
  if (pct < 15) return { label: 'Despejado', detail: 'Cielo completamente despejado. Sin nubes.', action: 'Si es de noche, riesgo de helada por irradiacion. Si es de dia, proteccion solar necesaria.', emoji: '\u2600\uFE0F', tone: 'info' };
  if (pct < 45) return { label: 'Claros', detail: 'Pocas nubes. Mayormente soleado.', action: 'Buen tiempo. Aprovecha para labores al aire libre.', emoji: '\u26C5', tone: 'success' };
  if (pct < 75) return { label: 'Nuboso variable', detail: 'Intervalos nubosos. Alternancia de sol y nubes.', action: 'Posibles cambios rapidos.', emoji: '\u26C5', tone: 'info' };
  return { label: 'Cubierto', detail: 'Cielo completamente nublado.', action: 'Sensacion mas fria. Posible lluvia si las nubes son bajas.', emoji: '\u2601\uFE0F', tone: 'info' };
}

export function interpretThermalAmplitude(maxC: number | null | undefined, minC: number | null | undefined): Interpretation | null {
  if (maxC === null || minC === null || maxC === undefined || minC === undefined) return null;
  const amp = maxC - minC;
  if (amp >= 25) {
    return {
      label: 'Amplitud termica extrema',
      detail: amp.toFixed(0) + 'C de diferencia entre la minima y la maxima. Contraste muy fuerte.',
      action: 'Riesgo de golpe termico. Viste por capas. Vigila cultivos y animales.',
      tone: 'danger',
    };
  }
  if (amp >= 20) {
    return {
      label: 'Amplitud termica alta',
      detail: amp.toFixed(0) + 'C de diferencia. Noche fria y dia calido.',
      action: 'Precaucion con cambios bruscos. Protege cultivos sensibles.',
      tone: 'warning',
    };
  }
  if (amp >= 15) {
    return {
      label: 'Amplitud termica notable',
      detail: amp.toFixed(0) + 'C de oscilacion.',
      action: 'Diferencia significativa entre dia y noche.',
      tone: 'info',
    };
  }
  return null;
}

export function interpretWindForTreatment(speedKmh: number | null | undefined): Interpretation {
  if (speedKmh === null || speedKmh === undefined) return { label: 'Sin dato', detail: '', action: '', tone: 'neutral' };
  if (speedKmh > 30) {
    return {
      label: 'No apto para tratamientos',
      detail: 'Viento de ' + fmt(speedKmh, 0) + ' km/h. Deriva alta.',
      action: 'Suspender tratamientos fitosanitarios. Esperar a que baje el viento.',
      tone: 'danger',
    };
  }
  if (speedKmh > 20) {
    return {
      label: 'Marginal para tratamientos',
      detail: 'Viento de ' + fmt(speedKmh, 0) + ' km/h. Deriva significativa.',
      action: 'Valorar urgencia. Usar boquillas antideriva.',
      tone: 'warning',
    };
  }
  if (speedKmh > 10) {
    return {
      label: 'Apto con precaucion',
      detail: 'Viento de ' + fmt(speedKmh, 0) + ' km/h. Condiciones aceptables.',
      action: 'Se puede tratar. Evitar horas de maxima temperatura.',
      tone: 'info',
    };
  }
  return {
    label: 'Optimo para tratamientos',
    detail: 'Viento de ' + fmt(speedKmh, 0) + ' km/h. Condiciones ideales.',
    action: 'Buen momento para tratamientos fitosanitarios.',
    tone: 'success',
  };
}

export function interpretHeatRisk(tempC: number, humidityPct: number | null): Interpretation {
  if (tempC < 32) return { label: 'Sin riesgo', detail: '', action: '', tone: 'success' };
  const hi = humidityPct != null ? tempC + (humidityPct - 40) * 0.1 : tempC;
  if (tempC >= 38) {
    return {
      label: 'Riesgo extremo de calor',
      detail: 'Temperatura de ' + fmt(tempC, 1) + 'C (sensacion ~' + fmt(hi, 1) + 'C). Peligro de golpe de calor.',
      action: 'Evita toda actividad al sol. Busca lugares refrigerados. Hidratacion constante.',
      tone: 'danger',
    };
  }
  if (tempC >= 35) {
    return {
      label: 'Riesgo alto de calor',
      detail: 'Temperatura de ' + fmt(tempC, 1) + 'C. El calor puede causar agotamiento.',
      action: 'Limita actividades al aire libre. Bebe agua cada 20 min.',
      tone: 'danger',
    };
  }
  if (tempC >= 32) {
    return {
      label: 'Riesgo moderado de calor',
      detail: 'Temperatura de ' + fmt(tempC, 1) + 'C. Precaucion con actividades prolongadas.',
      action: 'Toma descansos a la sombra. Hidratate bien.',
      tone: 'warning',
    };
  }
  return { label: 'Sin riesgo', detail: '', action: '', tone: 'success' };
}
