import { NextRequest, NextResponse } from "next/server";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'World';


  return NextResponse.json({ message: `Hello, ${name}!` });
}

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const name = body.name;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    };

    return NextResponse.json({
      message: `Hello, ${name}!`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }
}
