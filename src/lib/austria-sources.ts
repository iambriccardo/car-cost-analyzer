export const austriaSources = [
  {
    title: "Tesla Model 3 Austria",
    url: "https://www.tesla.com/de_at/model3",
    note: "Vehicle specifications and Austrian pricing baseline."
  },
  {
    title: "Wien Energie charging tariffs",
    url: "https://www.wienenergie.at/privat/produkte/e-mobilitaet/unterwegs-laden/",
    note: "Current official Wien Energie charging page used as the primary tariff reference. The default AC baseline uses the tariff without a fixed monthly fee, while the default DC baseline is a Vienna-oriented blend between Wien Energie's own network and partner-roaming prices."
  },
  {
    title: "Tesla Supercharger Vienna",
    url: "https://www.tesla.com/findus/location/supercharger/wienbaumschulgassesupercharger",
    note: "Tesla Supercharger pricing varies by site and time. The default Supercharger value is a practical Vienna baseline inferred from current Vienna Supercharger locations rather than a fixed statutory tariff."
  },
  {
    title: "Stadt Wien - Parkpickerl for residents",
    url: "https://www.wien.gv.at/amtswege/parkpickerl",
    note: "Current Vienna resident permit baseline used for the Parkpickerl default: 13 EUR per month, 156 EUR per year."
  },
  {
    title: "oesterreich.gv.at - NoVA",
    url: "https://www.oesterreich.gv.at/de/lexicon/N/Seite.991518.html",
    note: "Reference for Austrian NoVA treatment used in the BEV assumption."
  },
  {
    title: "oesterreich.gv.at - Budget measures",
    url: "https://www.oesterreich.gv.at/de/Gesetzliche-Neuerungen/Bundesgesetzblatt/budgetsanierungsmassnahmengesetz",
    note: "Current EV tax treatment context used for the Austrian model notes."
  },
  {
    title: "VAV motorbezogene Versicherungssteuer",
    url: "https://www.vav.at/privat/lp/motorbezogene-versicherungssteuer",
    note: "Cross-check source for the 88 kW / 1,847 kg EV motor tax example."
  }
];
