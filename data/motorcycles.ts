export const MOTORCYCLE_DATA: Record<string, string[]> = {
  "Aprilia": ["RSV4", "Tuono V4", "RS 660", "Tuareg 660", "RS 457"],
  "BMW": ["S1000RR", "M1000RR", "S1000R", "R1250GS", "R1300GS", "F900R"],
  "Ducati": ["Panigale V4", "Panigale V2", "Streetfighter V4", "Monster", "Multistrada V4", "Hypermotard 950", "Diavel V4"],
  "Honda": ["CBR1000RR-R Fireblade", "CBR600RR", "CB1000R", "Africa Twin", "CB750 Hornet"],
  "Kawasaki": ["Ninja ZX-10R", "Ninja ZX-6R", "Ninja H2", "Z900", "Ninja 400", "Z H2"],
  "KTM": ["RC 8C", "1390 Super Duke R", "990 Duke", "890 Adventure", "RC 390"],
  "MV Agusta": ["F4", "F3", "Brutale", "Dragster", "Superveloce", "Turismo Veloce", "Rush"],
  "Suzuki": ["GSX-R1000R", "GSX-R750", "Hayabusa", "GSX-S1000", "V-Strom 1050"],
  "Triumph": ["Daytona 660", "Street Triple 765 RS", "Speed Triple 1200 RS", "Tiger 900"],
  "Yamaha": ["YZF-R1", "YZF-R6", "YZF-R7", "MT-09", "MT-10", "XSR900", "Ténéré 700"]
};

export const YEARS = Array.from({ length: 36 }, (_, i) => (2025 - i).toString());
