import { driverBillsInr, hisabTiles } from "../ownerReport";

// Shaped like GET /owner-report (main-backend ownerReport.sections.js yesterdaysWork / moneyOut).
const report = (work = {}, money = {}) => ({
  sections: [
    { id: "fleetNow", state: "ok", numbers: { moving: 3 } },
    { id: "yesterdaysWork", state: "ok", numbers: work },
    { id: "moneyOut", state: "ok", numbers: money },
  ],
});

describe("hisabTiles — the Aaj ka hisab boxes match the web Daily Digest", () => {
  test("trips box is trips STARTED (web: 'Trips started today'), completed shown alongside", () => {
    const [trips] = hisabTiles(report({ trips: 12, completedTrips: 0, openTrips: 12 }), { today: true });
    expect(trips.label).toBe("Trips started today");
    expect(trips.value).toBe(12);
    expect(trips.caption).toBe("0 completed · 12 still open");
    const [past] = hisabTiles(report({ trips: 9, completedTrips: 7, openTrips: 0 }), { today: false });
    expect(past.label).toBe("Trips started");
    expect(past.caption).toBe("7 completed");
  });

  test("km, diesel and driver bills read the fields the backend really sends", () => {
    const tiles = hisabTiles(
      report(
        { trips: 4, km: 812.4, kmPartial: true },
        {
          dieselBillInr: 45210.5,
          expensePendingCount: 2,
          expensePendingInr: 1500,
          expenseApprovedInr: 700,
          expenseRecordedInr: 300,
          expenseRejectedCount: 1,
        },
      ),
    );
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t]));
    expect(byKey.km.value).toBe(812.4);
    expect(byKey.km.caption).toMatch(/partial/);
    expect(byKey.diesel.value).toBe(45210.5);
    expect(byKey.bills.value).toBe(2500);
    expect(byKey.bills.caption).toBe("2 waiting · ₹1,500");
  });

  test("nothing recorded stays unavailable, never a fake 0", () => {
    const tiles = hisabTiles(report({}, { expensePendingInr: null, expenseApprovedInr: null, expenseRecordedInr: null }));
    expect(tiles.map((t) => t.value)).toEqual([null, null, null, null]);
    expect(hisabTiles(null).map((t) => t.value)).toEqual([null, null, null, null]);
  });

  test("a reported zero is a count", () => {
    const [trips] = hisabTiles(report({ trips: 0, completedTrips: 0, openTrips: 0 }), { today: true });
    expect(trips.value).toBe(0);
    expect(driverBillsInr({ expensePendingInr: 0 })).toBe(0);
  });

  test("every box opens a screen that exists for managers and a report section for owners", () => {
    const tiles = hisabTiles(report());
    expect(tiles.map((t) => t.route)).toEqual(["Fleet trips", "Fleet trips", "Fuel logs", "Manager approvals"]);
    expect(tiles.map((t) => t.section)).toEqual(["trips", "trips", "diesel", "expenses"]);
  });
});
