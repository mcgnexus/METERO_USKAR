import type { Advice, AdviceContext } from './types';

export function generalAdvice(ctx: AdviceContext): Advice {
  const { tempC, humidityPct, windSpeedKmh, precipitationProbPct, precipitationMm, season } = ctx;

  if (tempC >= 36) {
    return {
      status: 'bad',
      title: 'Calor extremo',
      label: 'Evita salir al mediodía',
      message: 'Temperatura muy alta. Si tienes que salir, busca la sombra, bebe agua y protégete del sol. No dejes a nadie dentro del coche.',
      reason: 'Riesgo de golpe de calor.',
    };
  }

  if (tempC >= 32 && (humidityPct ?? 50) >= 55) {
    return {
      status: 'bad',
      title: 'Mucho calor con bochorno',
      label: 'Hidrátate y evita el esfuerzo',
      message: 'Calor intenso con humedad alta. La sensación térmica es aún mayor. Bebe agua con frecuencia y busca lugares frescos.',
      reason: 'Alta humedad + calor dificulta la sudoración.',
    };
  }

  if (tempC >= 32) {
    return {
      status: 'caution',
      title: 'Calor intenso',
      label: 'Trabaja temprano o al atardecer',
      message: 'Mañana fresca y tarde calurosa. Mejor chaqueta fina temprano y ropa ligera después. Evita el sol directo entre las 12:00 y las 18:00.',
      reason: 'Temperatura > 32°C al mediodía.',
    };
  }

  if (tempC >= 22 && tempC < 32 && (precipitationProbPct ?? 0) < 40) {
    return {
      status: 'good',
      title: 'Buen día',
      label: 'Aprovecha el día',
      message: 'Temperatura agradable y sin lluvia. Ideal para planes al aire libre, campo o simplemente disfrutar del día.',
    };
  }

  if (tempC >= 22 && tempC < 32) {
    return {
      status: 'caution',
      title: 'Día templado con posibles lluvias',
      label: 'Precaución con la lluvia',
      message: 'Temperatura agradable pero existe posibilidad de lluvia. Si sales, lleva protección y revisa el cielo antes de planes largos al aire libre.',
      reason: `Probabilidad de lluvia: ${precipitationProbPct ?? 0}%.`,
    };
  }

  if (tempC >= 12 && tempC < 22) {
    return {
      status: 'good',
      title: 'Día templado',
      label: 'Perfecto para estar fuera',
      message: 'Ni frío ni calor. Un día ideal para pasear, hacer deporte, trabajar en el campo o cualquier actividad al aire libre.',
    };
  }

  if (tempC >= 5 && tempC < 12) {
    return {
      status: 'neutral',
      title: 'Día fresco',
      label: 'Abrígate bien',
      message: 'Temperatura fresca. Lleva chaqueta o abrigo ligero. Bueno para actividades activas, pero si estás parado, notarás el frío.',
      reason: 'Menos de 12°C. Viento puede enfriar más la sensación.',
    };
  }

  if (tempC >= 0 && tempC < 5) {
    return {
      status: 'caution',
      title: 'Día frío',
      label: 'Abrígate con varias capas',
      message: 'Frío notable. Usa varias capas de ropa, gorro y bufanda. Precaución con hielo en la calzada si ha llovido ohelado antes.',
      reason: `Temperatura baja: ${tempC.toFixed(1)}°C.`,
    };
  }

  return {
    status: 'bad',
    title: 'Helada',
    label: 'Máxima precaución',
    message: 'Temperaturas bajo cero. Protege plantas, tuberías y animales. Evita desplazamientos temprano por hielo en la calzada. Varias capas de ropa imprescindibles.',
    reason: `Temperatura: ${tempC.toFixed(1)}°C.`,
  };
}
