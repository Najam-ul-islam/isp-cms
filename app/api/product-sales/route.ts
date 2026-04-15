import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/secure-jwt';
import {
  createProductSale,
  updateProductSale,
  deleteProductSale,
  listProductSales,
} from '@/modules/product-sales/services';

/**
 * GET /api/product-sales
 * List product sales with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const clientId = searchParams.get('clientId');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format' },
          { status: 400 }
        );
      }
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate format' },
          { status: 400 }
        );
      }
    }

    const result = await listProductSales(admin.companyId, {
      page: isNaN(page) ? 1 : page,
      pageSize: isNaN(pageSize) ? 20 : pageSize,
      startDate,
      endDate,
      clientId: clientId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ProductSales GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/product-sales
 * Create a new product sale
 * If clientId is provided, auto-attaches to existing unpaid invoice
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      clientId,
      productName,
      actualPrice,
      sellingPrice,
      quantity,
      notes,
      saleDate,
      // Invoice options
      attachToInvoice,
      allowDuplicateInvoice,
    } = body;

    if (!productName) {
      return NextResponse.json(
        { error: 'productName is required' },
        { status: 400 }
      );
    }

    if (typeof actualPrice !== 'number' || actualPrice < 0) {
      return NextResponse.json(
        { error: 'actualPrice must be a number >= 0' },
        { status: 400 }
      );
    }

    if (typeof sellingPrice !== 'number' || sellingPrice < 0) {
      return NextResponse.json(
        { error: 'sellingPrice must be a number >= 0' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: 'quantity must be an integer >= 1' },
        { status: 400 }
      );
    }

    // Create the product sale
    const result = await createProductSale({
      clientId: clientId || null,
      productName,
      actualPrice,
      sellingPrice,
      quantity,
      notes: notes || null,
      saleDate: saleDate ? new Date(saleDate) : undefined,
      companyId: admin.companyId,
    });

    // ✅ ENFORCE: If clientId is provided, ALWAYS create/update invoice
    // Product sales MUST be tracked via invoices for billing consistency
    if (clientId) {
      try {
        const { createInvoiceWithItems } = await import('@/modules/invoices/services');
        const { prisma } = await import('@/lib/prisma');

        // Check for existing unpaid invoice
        const existingUnpaidInvoice = await prisma.invoice.findFirst({
          where: {
            clientId,
            companyId: admin.companyId,
            status: { in: ['unpaid', 'partial'] }  // ✅ Also append to partial invoices
          },
          orderBy: { issuedDate: 'desc' }
        });

        // If there's an unpaid/partial invoice, append items to it
        if (existingUnpaidInvoice) {
          await createInvoiceWithItems(
            {
              clientId,
              items: [{
                name: productName,
                description: notes || undefined,
                amount: sellingPrice,
                quantity,
              }],
              description: `Product sale: ${productName}`,
              source: 'product_sale',  // ✅ Mark as product sale source
            },
            admin.companyId,
            { appendToExistingUnpaid: true }
          );
        }
        // If no unpaid/partial invoice exists, create a new one
        else {
          // Create new invoice with the product sale item
          await createInvoiceWithItems(
            {
              clientId,
              items: [{
                name: productName,
                description: notes || undefined,
                amount: sellingPrice,
                quantity,
              }],
              description: `Invoice for product sale: ${productName}`,
              source: 'product_sale',  // ✅ Mark as product sale source
            },
            admin.companyId,
            { allowDuplicate: false }
          );
        }
      } catch (invoiceError) {
        // Log error but don't fail product sale creation
        console.error('[ProductSales] Failed to auto-create/attach invoice:', invoiceError);
        // Return the product sale result with a warning
        return NextResponse.json({
          ...result,
          invoiceWarning: 'Could not auto-create invoice: ' + (invoiceError as Error).message,
        }, { status: 201 });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[ProductSales POST] Error:', error);

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
 * PUT /api/product-sales/[id]
 * Update an existing product sale
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Product sale ID is required' },
        { status: 400 }
      );
    }

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
    console.error('[ProductSales PUT] Error:', error);

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
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Product sale ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteProductSale(id, admin.companyId);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Product sale not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Product sale deleted' });
  } catch (error) {
    console.error('[ProductSales DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
