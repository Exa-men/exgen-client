import { NextRequest, NextResponse } from 'next/server';

// Mock data for development - replace with actual database calls
const mockProducts = [
  {
    id: '1',
    code: 'EX001',
    title: 'Basis Examen Nederlands',
    description: 'Fundamentele Nederlandse taalvaardigheid voor MBO niveau 2',
    longDescription: 'Dit examen test de fundamentele Nederlandse taalvaardigheid die vereist is voor MBO niveau 2. Het examen bestaat uit verschillende onderdelen: leesvaardigheid, schrijfvaardigheid, luistervaardigheid en spreekvaardigheid. De vragen zijn gebaseerd op realistische situaties die studenten kunnen tegenkomen in hun dagelijks leven en werk.',
    cost: 25.00,
    validFrom: '2024-25',
    version: '2.1',
    isPurchased: false,
    requirements: [
      'Basis kennis van Nederlandse grammatica',
      'Minimaal 1000 woorden vocabulaire',
      'Begrip van eenvoudige teksten',
      'Kunnen communiceren in dagelijkse situaties'
    ],
    duration: '120 minuten',
    questions: 45,
    level: 'MBO Niveau 2'
  },
  {
    id: '2',
    code: 'EX002',
    title: 'Wiskunde A - MBO 3',
    description: 'Wiskundige vaardigheden voor MBO niveau 3',
    longDescription: 'Dit wiskunde examen focust op praktische wiskundige vaardigheden die nodig zijn voor MBO niveau 3. Het omvat algebra, meetkunde, statistiek en kansberekening. Studenten leren wiskunde toe te passen in realistische contexten.',
    cost: 30.00,
    validFrom: '2024-25',
    version: '1.8',
    isPurchased: true,
    downloadUrl: '/downloads/ex002.pdf',
    requirements: [
      'Basis rekenvaardigheden',
      'Kennis van algebra',
      'Begrip van meetkunde',
      'Statistiek en kansberekening'
    ],
    duration: '150 minuten',
    questions: 60,
    level: 'MBO Niveau 3'
  },
  {
    id: '3',
    code: 'EX003',
    title: 'Engels B1 - Communicatie',
    description: 'Engelse communicatievaardigheden op B1 niveau',
    longDescription: 'Dit examen test de Engelse communicatievaardigheden op B1 niveau volgens het Europees Referentiekader. Het focust op praktische communicatie in zowel professionele als sociale contexten.',
    cost: 28.50,
    validFrom: '2025-26',
    version: '3.2',
    isPurchased: false,
    requirements: [
      'Basis Engelse grammatica',
      'Vocabulaire van 2000+ woorden',
      'Begrip van gesproken en geschreven Engels',
      'Kunnen communiceren in dagelijkse situaties'
    ],
    duration: '90 minuten',
    questions: 40,
    level: 'B1 Niveau'
  },
];

// @ts-ignore
export async function GET(request: NextRequest, context) {
  const { productId } = context.params;

    // TODO: Replace with actual database query
    // const product = await db.examProducts.findUnique({
    //   where: { id: productId },
    //   include: {
    //     requirements: true,
    //     // other relations
    //   }
    // });

    // For now, find in mock data
    const product = mockProducts.find(p => p.id === productId);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
} 