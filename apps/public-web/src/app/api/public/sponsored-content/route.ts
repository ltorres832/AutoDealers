import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // No cache for real-time updates

export async function GET(request: NextRequest) {
    try {
        const db = getFirestore();
        const { searchParams } = new URL(request.url);
        const placement = searchParams.get('placement');
        const limit = parseInt(searchParams.get('limit') || '6');
        const includeApproved = searchParams.get('includeApproved') === 'true';

        // Definir estados válidos
        const validStatuses = ['active'];
        if (includeApproved) {
            validStatuses.push('approved');
        }

        let snapshot;
        let content: any[] = [];

        try {
            // Intentar consulta con orderBy
            let query: any = db.collection('sponsored_content')
                .where('status', 'in', validStatuses);

            if (placement) {
                query = query.where('placement', '==', placement);
            }

            // Intentar ordenar por fecha de creación
            // Nota: Esto requiere un índice compuesto en Firestore
            query = query.orderBy('createdAt', 'desc');

            if (limit > 0) {
                query = query.limit(limit);
            }

            snapshot = await query.get();

            content = snapshot.docs.map((doc: any) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                    startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
                    endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
                };
            });

        } catch (queryError: any) {
            // Si falla por falta de índice, usar fallback (filtrado y ordenamiento en memoria)
            const isIndexError = queryError.code === 9 ||
                queryError.message?.includes('index') ||
                queryError.details?.includes('index') ||
                queryError.message?.includes('FAILED_PRECONDITION');

            if (isIndexError) {
                console.warn('⚠️ Consulta de sponsored_content falló por falta de índice, usando fallback en memoria...');

                try {
                    // Fallback: Consulta simple sin orderBy
                    let fallbackQuery = db.collection('sponsored_content')
                        .where('status', 'in', validStatuses);

                    if (placement) {
                        fallbackQuery = fallbackQuery.where('placement', '==', placement);
                    }

                    snapshot = await fallbackQuery.get();

                    content = snapshot.docs.map((doc: any) => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                            startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
                            endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
                        };
                    });

                    // Filtrar por fechas si es necesario (server side filtering)
                    const now = new Date();
                    content = content.filter(item => {
                        const start = item.startDate ? new Date(item.startDate) : null;
                        const end = item.endDate ? new Date(item.endDate) : null;

                        if (start && start > now) return false;
                        if (end && end < now) return false;

                        return true;
                    });

                    // Ordenar en memoria por createdAt (más recientes primero)
                    content = content.sort((a: any, b: any) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return dateB - dateA;
                    });

                    // Aplicar límite manualmente
                    if (limit > 0) {
                        content = content.slice(0, limit);
                    }

                } catch (fallbackError: any) {
                    console.error('❌ Fallback de sponsored_content falló:', fallbackError.message);
                    // Si todo falla, devolver array vacío pero no error 500 para no romper la UI
                    content = [];
                }
            } else {
                throw queryError;
            }
        }

        return NextResponse.json({ content }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error: any) {
        console.error('Error fetching sponsored content:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
