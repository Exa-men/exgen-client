import { NextRequest, NextResponse } from 'next/server';

// Mock data for development - replace with actual database calls
const mockProducts = [
  {
    id: '1',
    code: 'EX001',
    title: 'Basis Examen Nederlandse Taalvaardigheid en Communicatie voor MBO Niveau 2',
    description: 'Fundamentele Nederlandse taalvaardigheid voor MBO niveau 2. Dit examen test de basiskennis van de Nederlandse taal die vereist is voor studenten op MBO niveau 2. Het omvat leesvaardigheid, schrijfvaardigheid, luistervaardigheid en spreekvaardigheid. De vragen zijn gebaseerd op realistische situaties uit het dagelijks leven en werk. Studenten leren communiceren in eenvoudige maar effectieve Nederlandse taal.',
    cost: 25.00,
    validFrom: '2024-25',
    version: '2.1',
    versions: [
      { version: '2.1', releaseDate: '2024-01-15', isLatest: true },
      { version: '2.0', releaseDate: '2023-09-01', isLatest: false },
      { version: '1.9', releaseDate: '2023-03-15', isLatest: false },
    ],
    isPurchased: false,
  },
  {
    id: '2',
    code: 'EX002',
    title: 'Wiskunde A - Praktische Beroepsmatige Wiskundige Vaardigheden voor MBO Niveau 3',
    description: 'Wiskundige vaardigheden voor MBO niveau 3. Dit examen focust op praktische wiskundige vaardigheden die studenten nodig hebben in hun beroepspraktijk. Het omvat algebra, meetkunde, statistiek en kansberekening. Studenten leren wiskunde toe te passen in realistische contexten zoals financiële berekeningen, data-analyse en ruimtelijk inzicht. Het examen is ontwikkeld in samenwerking met het bedrijfsleven om te zorgen voor relevante en actuele wiskundige toepassingen.',
    cost: 30.00,
    validFrom: '2024-25',
    version: '1.8',
    versions: [
      { version: '1.8', releaseDate: '2024-02-01', downloadUrl: '/downloads/ex002-v1.8.pdf', isLatest: true },
      { version: '1.7', releaseDate: '2023-11-15', downloadUrl: '/downloads/ex002-v1.7.pdf', isLatest: false },
      { version: '1.6', releaseDate: '2023-08-20', downloadUrl: '/downloads/ex002-v1.6.pdf', isLatest: false },
    ],
    isPurchased: true,
    downloadUrl: '/downloads/ex002.pdf',
  },
  {
    id: '3',
    code: 'EX003',
    title: 'Engels B1 - Professionele en Sociale Communicatievaardigheden volgens Europees Referentiekader',
    description: 'Engelse communicatievaardigheden op B1 niveau volgens het Europees Referentiekader. Dit examen test de praktische communicatievaardigheden in zowel professionele als sociale contexten. Het omvat gesprekken voeren, presentaties geven, e-mails schrijven en documenten begrijpen. Studenten leren effectief te communiceren in internationale omgevingen en ontwikkelen culturele sensitiviteit. Het examen is erkend door internationale organisaties en wordt gebruikt door bedrijven wereldwijd.',
    cost: 28.50,
    validFrom: '2025-26',
    version: '3.2',
    versions: [
      { version: '3.2', releaseDate: '2024-03-01', isLatest: true },
      { version: '3.1', releaseDate: '2024-01-10', isLatest: false },
      { version: '3.0', releaseDate: '2023-10-15', isLatest: false },
    ],
    isPurchased: false,
  },
  {
    id: '4',
    code: 'EX004',
    title: 'Basis Rekenvaardigheden en Wiskundige Geletterdheid voor MBO Niveau 2 Studenten',
    description: 'Basis rekenvaardigheden voor MBO niveau 2. Dit examen focust op fundamentele rekenkundige vaardigheden die essentieel zijn voor het dagelijks leven en werk. Het omvat optellen, aftrekken, vermenigvuldigen, delen, breuken, decimalen en percentages. Studenten leren rekenen met geld, tijd, afstanden en andere praktische toepassingen. Het examen is ontwikkeld om te zorgen dat studenten zelfverzekerd kunnen rekenen in verschillende contexten.',
    cost: 22.00,
    validFrom: '2024-25',
    version: '1.5',
    versions: [
      { version: '1.5', releaseDate: '2024-01-15', isLatest: true },
      { version: '1.4', releaseDate: '2023-12-01', isLatest: false },
    ],
    isPurchased: false,
  },
  {
    id: '5',
    code: 'EX005',
    title: 'Digitale Geletterdheid en Moderne Computervaardigheden voor de 21e Eeuw',
    description: 'Basis computervaardigheden en digitale geletterdheid. Dit examen test de digitale vaardigheden die essentieel zijn in de moderne samenleving. Het omvat het gebruik van computers, internet, sociale media, digitale communicatie en online veiligheid. Studenten leren kritisch denken over digitale informatie, online samenwerken en digitale tools effectief gebruiken. Het examen is ontwikkeld in samenwerking met IT-experts en educatieve professionals om te zorgen voor relevante en toekomstbestendige digitale vaardigheden.',
    cost: 35.00,
    validFrom: '2025-26',
    version: '2.0',
    versions: [
      { version: '2.0', releaseDate: '2024-04-01', downloadUrl: '/downloads/ex005-v2.0.pdf', isLatest: true },
      { version: '1.9', releaseDate: '2024-02-15', downloadUrl: '/downloads/ex005-v1.9.pdf', isLatest: false },
      { version: '1.8', releaseDate: '2023-12-01', downloadUrl: '/downloads/ex005-v1.8.pdf', isLatest: false },
    ],
    isPurchased: true,
    downloadUrl: '/downloads/ex005.pdf',
  },
  {
    id: '6',
    code: 'EX006',
    title: 'Biologie - Leven en Gezondheid',
    description: 'Biologie-examen gericht op gezondheid, het menselijk lichaam en levensprocessen. Inclusief vragen over cellen, organen, en het milieu.',
    cost: 27.50,
    validFrom: '2024-25',
    version: '1.2',
    versions: [
      { version: '1.2', releaseDate: '2024-02-01', isLatest: true },
      { version: '1.1', releaseDate: '2023-09-01', isLatest: false },
    ],
    isPurchased: false,
  },
  {
    id: '7',
    code: 'EX007',
    title: 'Scheikunde - Stoffen en Reacties',
    description: 'Scheikunde-examen over chemische reacties, stoffen, mengsels en scheidingsmethoden. Praktische toepassingen in het laboratorium.',
    cost: 29.00,
    validFrom: '2025-26',
    version: '2.0',
    versions: [
      { version: '2.0', releaseDate: '2024-03-01', isLatest: true },
      { version: '1.9', releaseDate: '2023-11-01', isLatest: false },
    ],
    isPurchased: true,
    downloadUrl: '/downloads/ex007.pdf',
  },
  {
    id: '8',
    code: 'EX008',
    title: 'Aardrijkskunde - Wereld en Ruimte',
    description: 'Aardrijkskunde-examen over geografie, klimaat, continenten en wereldproblemen. Focus op duurzaamheid en globalisering.',
    cost: 26.00,
    validFrom: '2023-24',
    version: '1.0',
    versions: [
      { version: '1.0', releaseDate: '2023-05-01', isLatest: true },
    ],
    isPurchased: false,
  },
  {
    id: '9',
    code: 'EX009',
    title: 'Geschiedenis - Nederland en Europa',
    description: 'Geschiedenis-examen over de Nederlandse en Europese geschiedenis, belangrijke gebeurtenissen en personen.',
    cost: 28.00,
    validFrom: '2024-25',
    version: '1.3',
    versions: [
      { version: '1.3', releaseDate: '2024-01-10', isLatest: true },
      { version: '1.2', releaseDate: '2023-09-10', isLatest: false },
    ],
    isPurchased: true,
    downloadUrl: '/downloads/ex009.pdf',
  },
  {
    id: '10',
    code: 'EX010',
    title: 'Economie - Markt en Consument',
    description: 'Economie-examen over marktwerking, vraag en aanbod, consumenten en producenten. Inclusief actuele economische thema’s.',
    cost: 31.00,
    validFrom: '2025-26',
    version: '2.2',
    versions: [
      { version: '2.2', releaseDate: '2024-04-01', isLatest: true },
      { version: '2.1', releaseDate: '2023-12-01', isLatest: false },
    ],
    isPurchased: false,
  },
  ...Array.from({ length: 20 }, (_, i) => {
    const n = i + 11;
    return {
      id: String(n),
      code: `EX${String(n).padStart(3, '0')}`,
      title: `Mock Examen ${n}`,
      description: `Dit is een mock examen voor testdoeleinden. Examen nummer ${n}.` + (n % 2 === 0 ? ' Met extra lange beschrijving voor scrolltest.' : ''),
      cost: 20 + (n % 5) * 2 + (n % 3),
      validFrom: n % 2 === 0 ? '2024-25' : '2025-26',
      version: `1.${n % 4}`,
      versions: [
        { version: `1.${n % 4}`, releaseDate: `2024-0${(n % 9) + 1}-01`, isLatest: true },
        ...(n % 3 === 0 ? [{ version: `1.${(n % 4) - 1}`, releaseDate: `2023-0${(n % 9)}-01`, isLatest: false }] : [])
      ],
      isPurchased: n % 2 === 0,
      ...(n % 2 === 0 ? { downloadUrl: `/downloads/ex${String(n).padStart(3, '0')}.pdf` } : {})
    };
  })
];

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual database query
    // const products = await db.examProducts.findMany({
    //   where: { isActive: true },
    //   select: {
    //     id: true,
    //     code: true,
    //     title: true,
    //     description: true,
    //     cost: true,
    //     validFrom: true,
    //     version: true,
    //     isPurchased: true,
    //     downloadUrl: true,
    //   }
    // });

    // For now, return mock data
    return NextResponse.json({
      success: true,
      products: mockProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 