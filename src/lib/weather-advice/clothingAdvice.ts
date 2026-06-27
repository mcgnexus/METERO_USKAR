import type { Advice, AdviceContext } from './types';

export function clothingAdvice(ctx: AdviceContext): Advice {
  const { tempC, windSpeedKmh, humidityPct, season, isDaytime } = ctx;
  const windChill = windSpeedKmh > 15 ? tempC - (windSpeedKmh * 0.15) : tempC;

  if (tempC <= -2) {
    return {
      status: 'bad',
      title: '¿Qué me pongo?',
      label: 'Ropa de invierno extrema',
      message: 'Plumífero, gorro, bufanda, guantes y calzado térmico. Varias capas y protección para la cara si sales. El hielo es peligroso.',
      reason: `Sensación térmica de ${windChill.toFixed(0)}°C por el viento.`,
    };
  }

  if (tempC <= 3) {
    return {
      status: 'bad',
      title: '¿Qué me pongo?',
      label: 'Abrígate muy bien',
      message: 'Chaqueta gruesa o plumífero, gorro y bufanda. Si estás al aire libre, mejor con capas: camiseta térmica, jersey y chaqueta.',
      reason: `Temperatura baja: ${tempC.toFixed(0)}°C.`,
    };
  }

  if (tempC <= 10) {
    return {
      status: 'neutral',
      title: '¿Qué me pongo?',
      label: 'Chaqueta o abrigo ligero',
      message: windSpeedKmh > 20
        ? 'Chaqueta con cortaviento. El viento hará que la sensación sea más fría.'
        : 'Abrigo ligero o chaqueta. Por la mañana temprano hace más frío, luego la temperatura sube.',
      reason: `Sensación de ${windChill.toFixed(0)}°C.`,
    };
  }

  if (tempC <= 17) {
    return {
      status: 'good',
      title: '¿Qué me pongo?',
      label: 'Chaqueta fina o sudadera',
      message: 'Una chaqueta fina o sudadera es suficiente. Por la mañana puede hacer algo más de fresco, pero al mediodía estarás cómodo en manga larga.',
    };
  }

  if (tempC <= 25) {
    return {
      status: 'good',
      title: '¿Qué me pongo?',
      label: 'Ropa ligera',
      message: 'Día cálido. Manga corta, tejidos frescos. Si estás al sol, protégete la cabeza. Por la noche puede refrescar, lleva algo ligero por si acaso.',
    };
  }

  if (tempC <= 32) {
    return {
      status: 'good',
      title: '¿Qué me pongo?',
      label: 'Ropa muy fresca',
      message: 'Camiseta, pantalón corto, sandalias o zapatos ligeros. Protégete del sol con gorra y gafas de sol. Si vas a estar al aire libre, lleva protección solar.',
    };
  }

  return {
    status: 'caution',
    title: '¿Qué me pongo?',
    label: 'Mínima ropa y protección solar',
    message: 'Calor extremo. Lo más fresco posible: tejidos transpirables, colores claros, sombrero. Imprescindible protección solar alta y mantenerse hidratado.',
    reason: 'Temperatura muy alta. Riesgo de insolación.',
  };
}
