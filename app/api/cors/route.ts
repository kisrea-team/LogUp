import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS(request: NextRequest) {
    // Handle CORS preflight requests
    const response = new NextResponse(null, { status: 200 });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
}

export async function GET(request: NextRequest) {
    return new NextResponse('CORS proxy is working', { 
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}