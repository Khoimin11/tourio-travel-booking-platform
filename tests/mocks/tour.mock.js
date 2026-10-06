module.exports = overrides => ({
  name: "Tour", slug: "tour",
  priceNewAdult: 1000, priceNewChildren: 500, priceNewBaby: 100,
  stockAdult: 10, stockChildren: 10, stockBaby: 10,
  departureDate: "2026-10-06",
  ...overrides
});
