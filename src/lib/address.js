const NUMBERS = [
  ...Array.from({ length: 30 }, (_, i) => i + 1),   // 1–30, heavier weight on low numbers
  ...Array.from({ length: 50 }, (_, i) => i + 1),
  ...Array.from({ length: 200 }, (_, i) => i + 10),
  ...Array.from({ length: 100 }, (_, i) => i + 100),
];

const NAMES = [
  'Maple', 'Oak', 'Elm', 'Cedar', 'Pine', 'Birch', 'Willow', 'Ash', 'Linden', 'Hazel',
  'Harbor', 'River', 'Hill', 'Meadow', 'Brook', 'Valley', 'Forest', 'Garden', 'Orchard',
  'Stone', 'Silver', 'Golden', 'Lantern', 'Candle', 'Ember', 'Cinder', 'Thistle', 'Clover',
  'Morning', 'Evening', 'Autumn', 'Winter', 'Spring', 'Summer', 'Hollow', 'Clearing',
  'Quiet', 'Still', 'Winding', 'Narrow', 'Gentle', 'Shady', 'Sunny', 'Mossy', 'Misty',
  'Foxglove', 'Heather', 'Fern', 'Briar', 'Sorrel', 'Yarrow', 'Wren', 'Finch', 'Robin',
];

const TYPES = [
  'Lane', 'Lane', 'Lane',       // weighted, feels most personal
  'Street', 'Street',
  'Court', 'Court',
  'Way', 'Way',
  'Place',
  'Road',
  'Path',
  'Walk',
  'Row',
  'Grove',
  'Close',
  'Terrace',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAddress() {
  return `${pick(NUMBERS)} ${pick(NAMES)} ${pick(TYPES)}`;
}

export function getAddress() {
  let addr = localStorage.getItem('room-address');
  if (!addr) {
    addr = generateAddress();
    localStorage.setItem('room-address', addr);
  }
  return addr;
}
