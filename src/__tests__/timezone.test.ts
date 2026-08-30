import { describe, it, expect } from "vitest";
import { fmtHourMadrid, fmtDayLabelMadrid, madridHourFromUTC, madridMonthFromUTC, seasonFromMonth } from "@/lib/timezone";

describe("fmtHourMadrid", () => {
  it("convierte UTC a hora Madrid en horario de verano (CEST)", () => {
    // 2026-06-28T10:00 UTC = 12:00 CEST
    expect(fmtHourMadrid("2026-06-28T10:00:00Z")).toBe("12:00");
  });

  it("convierte UTC a hora Madrid en horario de invierno (CET)", () => {
    // 2026-01-15T10:00 UTC = 11:00 CET
    expect(fmtHourMadrid("2026-01-15T10:00:00Z")).toBe("11:00");
  });

  it("maneja medianoche UTC → 01:00 CET", () => {
    // 2026-01-15T00:00 UTC = 01:00 CET
    expect(fmtHourMadrid("2026-01-15T00:00:00Z")).toBe("01:00");
  });

  it("maneja cambio de día: 23:00 CET = 22:00 UTC en invierno", () => {
    // 2026-01-15T22:00 UTC = 23:00 CET
    expect(fmtHourMadrid("2026-01-15T22:00:00Z")).toBe("23:00");
  });
});

describe("madridHourFromUTC", () => {
  it("retorna hora correcta en CEST", () => {
    // 2026-06-28T10:00 UTC = 12:00 CEST
    expect(madridHourFromUTC("2026-06-28T10:00:00Z")).toBe(12);
  });

  it("retorna hora correcta en CET", () => {
    // 2026-01-15T10:00 UTC = 11:00 CET
    expect(madridHourFromUTC("2026-01-15T10:00:00Z")).toBe(11);
  });
});

describe("cambio de día (day boundary)", () => {
  it("detecta cambio de día entre 23:00 CET y 01:00 CET del día siguiente", () => {
    // 2026-06-28T21:00 UTC = 23:00 CEST (28 junio)
    // 2026-06-28T23:00 UTC = 01:00 CEST (29 junio)
    const hour23 = fmtHourMadrid("2026-06-28T21:00:00Z");
    const hour01 = fmtHourMadrid("2026-06-28T23:00:00Z");

    expect(hour23).toBe("23:00");
    expect(hour01).toBe("01:00");

    // Las horas en UTC deben ser secuenciales
    const ts23 = new Date("2026-06-28T21:00:00Z").getTime();
    const ts01 = new Date("2026-06-28T23:00:00Z").getTime();
    expect(ts01).toBeGreaterThan(ts23);
  });
});

describe("DST transitions", () => {
  it("CET→CEST: 29 marzo 2026, 01:59 UTC → 03:00 CEST", () => {
    // Just before DST: 2026-03-29T00:59 UTC = 01:59 CET
    expect(madridHourFromUTC("2026-03-29T00:59:00Z")).toBe(1);
    // Just after DST: 2026-03-29T01:00 UTC = 03:00 CEST (hora salta de 2:00 a 3:00)
    expect(madridHourFromUTC("2026-03-29T01:00:00Z")).toBe(3);
  });

  it("CEST→CET: 25 octubre 2026, 01:59 UTC → 02:00 CET", () => {
    // Just before clock change: 2026-10-25T00:59 UTC = 02:59 CEST
    expect(madridHourFromUTC("2026-10-25T00:59:00Z")).toBe(2);
    // Just after clock change: 2026-10-25T01:00 UTC = 02:00 CET (hora retrocede de 3:00 a 2:00)
    expect(madridHourFromUTC("2026-10-25T01:00:00Z")).toBe(2);
    // After stabilization: 2026-10-25T02:00 UTC = 03:00 CET
    expect(madridHourFromUTC("2026-10-25T02:00:00Z")).toBe(3);
  });

  it("fmtHourMadrid maneja correctamente el salto CET→CEST", () => {
    // Just before: 01:59 CET
    expect(fmtHourMadrid("2026-03-29T00:59:00Z")).toBe("01:59");
    // Just after: 03:00 CEST (no existe 02:00-02:59)
    expect(fmtHourMadrid("2026-03-29T01:00:00Z")).toBe("03:00");
  });

  it("fmtHourMadrid maneja correctamente el retroceso CEST→CET", () => {
    // Just before: 02:59 CEST (último minuto antes del retroceso)
    expect(fmtHourMadrid("2026-10-25T00:59:00Z")).toBe("02:59");
    // Just after: 02:00 CET (la hora retrocede)
    expect(fmtHourMadrid("2026-10-25T01:00:00Z")).toBe("02:00");
  });
});

describe("fmtDayLabelMadrid", () => {
  it("retorna 'Hoy' para la fecha actual", () => {
    const now = new Date();
    const todayUTC = now.toISOString().slice(0, 10) + "T12:00:00Z";
    expect(fmtDayLabelMadrid(todayUTC)).toBe("Hoy");
  });

  it("retorna 'Mañana' para el día siguiente", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowUTC = tomorrow.toISOString().slice(0, 10) + "T12:00:00Z";
    expect(fmtDayLabelMadrid(tomorrowUTC)).toBe("Mañana");
  });
});

describe("madridMonthFromUTC", () => {
  it("retorna mes correcto en CET (enero = 0)", () => {
    expect(madridMonthFromUTC("2026-01-15T12:00:00Z")).toBe(0);
  });

  it("retorna mes correcto en CEST (julio = 6)", () => {
    expect(madridMonthFromUTC("2026-07-15T12:00:00Z")).toBe(6);
  });

  it("retorna mes correcto en diciembre (11)", () => {
    expect(madridMonthFromUTC("2026-12-25T12:00:00Z")).toBe(11);
  });
});

describe("seasonFromMonth", () => {
  it("retorna spring para meses 3-5", () => {
    expect(seasonFromMonth(3)).toBe("spring");
    expect(seasonFromMonth(4)).toBe("spring");
    expect(seasonFromMonth(5)).toBe("spring");
  });

  it("retorna summer para meses 6-8", () => {
    expect(seasonFromMonth(6)).toBe("summer");
    expect(seasonFromMonth(7)).toBe("summer");
    expect(seasonFromMonth(8)).toBe("summer");
  });

  it("retorna autumn para meses 9-11", () => {
    expect(seasonFromMonth(9)).toBe("autumn");
    expect(seasonFromMonth(10)).toBe("autumn");
    expect(seasonFromMonth(11)).toBe("autumn");
  });

  it("retorna winter para meses 0-2", () => {
    expect(seasonFromMonth(0)).toBe("winter");
    expect(seasonFromMonth(1)).toBe("winter");
    expect(seasonFromMonth(2)).toBe("winter");
  });
});

describe("filtrado de próximas horas en cambio de día", () => {
  it("filtra correctamente las horas cuando cruza medianoche", () => {
    // Simular 23:30 UTC = 00:30 CEST del día siguiente
    const nowUTC = new Date("2026-06-28T21:30:00Z").getTime(); // 23:30 CEST
    const hourlyTimes = [
      "2026-06-28T21:00:00Z", // 23:00 CEST (pasado)
      "2026-06-28T22:00:00Z", // 00:00 CEST (siguiente día)
      "2026-06-28T23:00:00Z", // 01:00 CEST
      "2026-06-29T00:00:00Z", // 02:00 CEST
    ];

    const upcoming = hourlyTimes
      .map((time, index) => ({ time, index, ts: new Date(time).getTime() }))
      .filter((h) => h.ts >= nowUTC);

    expect(upcoming).toHaveLength(3);
    expect(upcoming[0].time).toBe("2026-06-28T22:00:00Z");
    expect(fmtHourMadrid(upcoming[0].time)).toBe("00:00");
  });
});
