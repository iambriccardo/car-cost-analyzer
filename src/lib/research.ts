export const researchNotes = [
  {
    title: "Austrian EV tax treatment",
    summary:
      "Battery-electric passenger cars are treated as NoVA-exempt in the base model, so initial Austrian emissions-based tax is derived as zero unless the architecture is extended for non-BEV vehicles."
  },
  {
    title: "Motorbezogene Versicherungssteuer",
    summary:
      "For EVs, the insurance-linked motor tax can be derived from rated power and vehicle mass. The app computes that amount and can show it as included inside the insurance quote rather than adding it twice."
  },
  {
    title: "Vienna parking",
    summary:
      "Vienna ownership economics are highly sensitive to parking mode. Garage rent, resident permit usage, destination parking, and fines reserves are modeled separately instead of collapsing them into one field."
  },
  {
    title: "Public charging only",
    summary:
      "Because tariff structures move faster than regulation, AC/DC prices, losses, idle fees, subscription discounts, and free charging share remain user-editable instead of being hardcoded."
  }
];
