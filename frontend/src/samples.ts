export interface Sample {
  label: string;
  event: { name: string; date: string; budget_cad: number };
  email: string;
}

const market = { name: "Night Market", date: "2027-03-20", budget_cad: 12000 };
const concert = { name: "Spring Concert", date: "2027-04-10", budget_cad: 15000 };
const culture = { name: "Culture Fest", date: "2027-03-06", budget_cad: 6000 };

// Synthetic emails: no real vendors or people.
export const SAMPLES: Sample[] = [
  {
    label: "Messy: tent rental, \"deposit by next Fri\"",
    event: market,
    email:
      "Hey Mohan, Harbour Tents here. For the Night Market on March 20 we can bring the 10x10 tent and two staff for $850, deposit by next Fri to lock it in. Need power access near the tent.",
  },
  {
    label: "Trap: expired lighting quote",
    event: concert,
    email:
      "Hi Mohan,\n\nTillicum Lighting following up on the lighting quote I sent in September: truss lighting rig for April 10, 2027 at $3,400. As a reminder, that quote expired on October 1, 2026, and prices have gone up 8% since, so a new quote would be $3,672. Please confirm by October 14 if you want the old price.\n\nThanks,\nRosa\nTillicum Lighting",
  },
  {
    label: "Trap: over budget",
    event: culture,
    email:
      "Hi Mohan,\n\nHaultain Audio Visual here. For March 6, 2027 the LED wall rental is $4,200, the sound package is $2,300, and delivery is $350. Let me know.\n\nQuinn\nHaultain Audio Visual\nquinn@haultainav.example",
  },
  {
    label: "Trap: wrong event date",
    event: concert,
    email:
      "Hi Mohan,\n\nConfirming Ross Bay Bartending for your Spring Concert on April 17, 2027. Two bartenders at $35/hr for 5 hours = $350. Please send the signed agreement by November 30, 2026.\n\nColin\nRoss Bay Bartending\ncolin@rossbaybar.example",
  },
  {
    label: "Messy: bouncy castles, no date, insurance",
    event: market,
    email:
      "Hi there Mohan, Dev from Beacon Hill Bouncy Castles. yep we do events! castle is 350 for the day, the obstacle course is 425, you could do both for 700 if u book before the end of the month. we'd need a flat grassy area and an outlet, and we need a certificate of insurance from you before we show up. not sure what date you're looking at tho, let me know. cheers, Dev\ndev@beaconhillbouncy.example",
  },
];
