import type { Advice, AdviceContext } from './types';

export function laundryAdvice(ctx: AdviceContext): Advice {
  const { tempC, humidityPct, windSpeedKmh, precipitationProbPct, cloudCoverPct } = ctx;

  const dryingConditions =
    tempC >= 15 &&
    tempC <= 35 &&
    (humidityPct ?? 50) <= 60 &&
    windSpeedKmh >= 8 &&
    windSpeedKmh <= 30 &&
    (precipitationProbPct ?? 0) < 30;

  const acceptableConditions =
    tempC >= 10 &&
    (humidityPct ?? 50) <= 75 &&
    (precipitationProbPct ?? 0) < 50;

  if (dryingConditions) {
    return {
      status: 'good',
      title: '¿Puedo tender?',
      label: 'Buen día para tender',
      message: 'Buen día para tender: temperatura alta, humedad baja y viento moderado. La ropa se secará rápido sin problemas.',
      reason: 'Temperatura, viento y humedad óptimos para secado al aire libre.',
    };
  }

  if (acceptableConditions) {
    return {
      status: 'caution',
      title: '¿Puedo tender?',
      label: 'Se puede tender con precaución',
      message: 'Las condiciones son aceptables para tender, pero vigila el cielo. Si ves nubes oscuras, mejor recoge la ropa o espera.',
      reason: (precipitationProbPct ?? 0) >= 30 ? `Probabilidad de lluvia: ${precipitationProbPct}%.` : undefined,
    };
  }

  if ((precipitationProbPct ?? 0) >= 50) {
    return {
      status: 'bad',
      title: '¿Puedo tender?',
      label: 'No recomendado',
      message: 'Mejor no tender hoy. Hay probabilidad alta de lluvia y la ropa podría mojarse. Espera a que mejore el tiempo.',
      reason: `Probabilidad de lluvia: ${precipitationProbPct}%.`,
    };
  }

  return {
    status: 'neutral',
    title: '¿Puedo tender?',
    label: 'Condiciones regulares',
    message: tempC < 10
      ? 'Hace demasiado frío para que la ropa se seque bien al aire libre. Mejor tender en interior o esperar a un día más templado.'
      : 'Las condiciones no son las mejores para tender. Si lo haces, procura que haya viento y no haya riesgo de lluvia.',
    reason: tempC < 10 ? 'Temperatura baja. El secado será muy lento.' : undefined,
  };
}
