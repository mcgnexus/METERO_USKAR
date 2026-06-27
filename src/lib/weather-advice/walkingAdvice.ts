import type { Advice, AdviceContext } from './types';

export function walkingAdvice(ctx: AdviceContext): Advice {
  const { tempC, windSpeedKmh, precipitationProbPct, humidityPct, month } = ctx;

  const idealWalking =
    tempC >= 15 &&
    tempC <= 28 &&
    windSpeedKmh <= 20 &&
    (precipitationProbPct ?? 0) < 30 &&
    (humidityPct ?? 50) >= 25;

  if (tempC >= 32) {
    return {
      status: 'caution',
      title: 'Pasear / deporte',
      label: 'Mejor temprano o al atardecer',
      message: 'Mejor salir a pasear por la mañana o al atardecer; evitar horas centrales por calor. Si haces deporte, reduce la intensidad y lleva agua.',
      reason: 'Calor intenso. Riesgo de deshidratación o golpe de calor.',
    };
  }

  if (idealWalking) {
    return {
      status: 'good',
      title: 'Pasear / deporte',
      label: 'Perfecto para estar al aire libre',
      message: 'Día ideal para pasear, correr o hacer deporte al aire libre. Temperatura agradable, sin viento fuerte y sin lluvia. Disfruta del día.',
    };
  }

  if (tempC >= 10 && tempC < 15 && (precipitationProbPct ?? 0) < 40) {
    return {
      status: 'good',
      title: 'Pasear / deporte',
      label: 'Bueno para actividad suave',
      message: 'Temperatura fresca pero aceptable para pasear o hacer ejercicio suave. Abrígate al principio y quítate capas según entres en calor.',
    };
  }

  if ((precipitationProbPct ?? 0) >= 50) {
    return {
      status: 'bad',
      title: 'Pasear / deporte',
      label: 'Mejor posponer',
      message: 'Probabilidad alta de lluvia. Si vas a salir, lleva paraguas y elige actividades bajo cubierto. Mejor espera a que pase la lluvia.',
      reason: `Probabilidad de lluvia: ${precipitationProbPct}%.`,
    };
  }

  if (windSpeedKmh > 30) {
    return {
      status: 'caution',
      title: 'Pasear / deporte',
      label: 'Viento fuerte, precaución',
      message: 'Viento fuerte. Si vas a hacer deporte al aire libre, ten cuidado con rachas que puedan desequilibrarte. Mejor elige zonas resguardadas.',
      reason: `Viento de ${windSpeedKmh.toFixed(0)} km/h.`,
    };
  }

  if (tempC < 5) {
    return {
      status: 'caution',
      title: 'Pasear / deporte',
      label: 'Frío intenso, abrígate',
      message: 'Hace mucho frío. Si sales, varias capas de ropa, gorro y guantes. El ejercicio suave está bien, pero no te pares mucho tiempo al aire libre.',
      reason: `Temperatura: ${tempC.toFixed(0)}°C.`,
    };
  }

  return {
    status: 'neutral',
    title: 'Pasear / deporte',
    label: 'Aceptable con buena ropa',
    message: tempC < 10
      ? 'Día fresco. Si te abrigas bien, puedes salir a pasear sin problema. Mejor evitar deportes intensos si hace mucho frío.'
      : 'Condiciones normales. Puedes salir, pero lleva agua si hace calor o chaqueta si refresca.',
  };
}

export function elderlyAdvice(ctx: AdviceContext): Advice {
  const { tempC, humidityPct, windSpeedKmh } = ctx;

  if (tempC >= 35) {
    return {
      status: 'bad',
      title: 'Personas mayores',
      label: 'Evitar salir en horas de calor',
      message: 'Calor extremo. Las personas mayores deben evitar salir entre las 12:00 y las 19:00. Mantener la casa fresca, beber agua con frecuencia y no hacer esfuerzos.',
      reason: 'Riesgo alto de golpe de calor en personas mayores.',
    };
  }

  if (tempC >= 30) {
    return {
      status: 'caution',
      title: 'Personas mayores',
      label: 'Precaución con el calor',
      message: 'Calor intenso. Recomendable estar en lugares frescos o con aire acondicionado. Beber agua aunque no se tenga sed. Evitar paseos al mediodía.',
      reason: 'Temperatura elevada. Riesgo de deshidratación.',
    };
  }

  if (tempC <= 2) {
    return {
      status: 'bad',
      title: 'Personas mayores',
      label: 'Evitar salir por el frío',
      message: 'Frío intenso. Las personas mayores deben evitar salir, especialmente si hay hielo en el suelo. Mantener la casa caliente y abrigarse bien dentro.',
      reason: `Temperatura: ${tempC.toFixed(0)}°C. Riesgo de hipotermia o caídas.`,
    };
  }

  if (tempC <= 8) {
    return {
      status: 'caution',
      title: 'Personas mayores',
      label: 'Abrígate bien si sales',
      message: 'Temperatura baja. Si sales, varias capas de ropa, bufanda y calzado antideslizante. Mejor evitar salir temprano si hay hielo o niebla.',
      reason: 'Frío y posible riesgo de resbalones.',
    };
  }

  return {
    status: 'good',
    title: 'Personas mayores',
    label: 'Sin problemas destacables',
    message: 'Las condiciones son seguras para personas mayores. Pueden salir con normalidad, manteniendo la precaución habitual.',
  };
}
