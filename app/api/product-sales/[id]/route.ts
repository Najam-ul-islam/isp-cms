import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {
  updateProductSale,
  deleteProductSale,
  getProductSaleById,
} from '@/modules/product-sales/services';

/**
 * GET /api/product-sales/[id]
 * Get a single product sale by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const sale = await getProductSaleById(id, admin.companyId);

    if (!sale) {
      return NextResponse.json(
        { error: 'Product sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error('[ProductSale GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/product-sales/[id]
 * Update an existing product sale
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const result = await updateProductSale({
      id,
      ...(body.clientId !== undefined && { clientId: body.clientId }),
      ...(body.productName !== undefined && { productName: body.productName }),
      ...(body.actualPrice !== undefined && { actualPrice: body.actualPrice }),
      ...(body.sellingPrice !== undefined && { sellingPrice: body.sellingPrice }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.saleDate !== undefined && { saleDate: new Date(body.saleDate) }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ProductSale PUT] Error:', error);

    if (error instanceof Error && error.message === 'ProductSale not found') {
      return NextResponse.json(
        { error: 'Product sale not found' },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/product-sales/[id]
 * Delete a product sale
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const result = await deleteProductSale(id, admin.companyId);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Product sale not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Product sale deleted' });
  } catch (error) {
    console.error('[ProductSale DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
