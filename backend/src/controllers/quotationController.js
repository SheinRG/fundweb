const prisma = require('../config/db');
const { z } = require('zod');
const { AppError } = require('../middleware/errorHandler');

const createSchema = z.object({
  enquiryId: z.number().int().positive(),
  validUntil: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid date required').optional(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive('Unit price must be positive'),
      discountPct: z.number().min(0).max(100).default(0),
      gstPct: z.number().min(0).max(100).default(0),
    })
  ).min(1, 'At least one item is required'),
});

const statusSchema = z.object({
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED']),
});

/**
 * Backend calculation of line amounts.
 * Formula: lineAmount = qty × unitPrice × (1 - discount/100) × (1 + gst/100)
 * This is NEVER accepted from the frontend — always computed server-side.
 */
function calculateLineAmount(quantity, unitPrice, discountPct, gstPct) {
  const baseAmount = quantity * unitPrice;
  const afterDiscount = baseAmount * (1 - discountPct / 100);
  const afterGst = afterDiscount * (1 + gstPct / 100);
  return Math.round(afterGst * 100) / 100; // Round to 2 decimal places
}

async function generateQuotationNumber() {
  const last = await prisma.quotation.findFirst({
    orderBy: { id: 'desc' },
    select: { quotationNumber: true },
  });
  if (!last) return 'QTN-0001';
  const lastNum = parseInt(last.quotationNumber.split('-')[1]);
  return `QTN-${String(lastNum + 1).padStart(4, '0')}`;
}

async function generateOrderNumber() {
  const last = await prisma.salesOrder.findFirst({
    orderBy: { id: 'desc' },
    select: { orderNumber: true },
  });
  if (!last) return 'SO-0001';
  const lastNum = parseInt(last.orderNumber.split('-')[1]);
  return `SO-${String(lastNum + 1).padStart(4, '0')}`;
}

exports.create = async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    // Verify enquiry exists
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: data.enquiryId },
      include: { customer: true },
    });
    if (!enquiry) throw new AppError('Enquiry not found.', 404);

    // Calculate line amounts on the backend
    const itemsWithAmounts = data.items.map((item) => {
      const lineAmount = calculateLineAmount(
        item.quantity,
        item.unitPrice,
        item.discountPct,
        item.gstPct
      );
      return { ...item, lineAmount };
    });

    const grandTotal = itemsWithAmounts.reduce((sum, item) => sum + item.lineAmount, 0);
    const quotationNumber = await generateQuotationNumber();

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        enquiryId: data.enquiryId,
        customerId: enquiry.customerId,
        createdById: req.user.userId,
        grandTotal,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        status: 'DRAFT',
        items: {
          create: itemsWithAmounts.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
            gstPct: item.gstPct,
            lineAmount: item.lineAmount,
          })),
        },
      },
      include: {
        customer: true,
        enquiry: { select: { id: true, enquiryNumber: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Update enquiry status to QUOTED
    await prisma.enquiry.update({
      where: { id: data.enquiryId },
      data: { status: 'QUOTED' },
    });

    res.status(201).json(quotation);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        customer: { select: { id: true, companyName: true } },
        enquiry: { select: { id: true, enquiryNumber: true } },
        items: { include: { product: { select: { id: true, productName: true, productCode: true } } } },
        createdBy: { select: { id: true, name: true } },
        salesOrder: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quotations);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        enquiry: { select: { id: true, enquiryNumber: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        salesOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    });
    if (!quotation) throw new AppError('Quotation not found.', 404);
    res.json(quotation);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = statusSchema.parse(req.body);

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new AppError('Quotation not found.', 404);

    // Validate status transitions
    const validTransitions = {
      DRAFT: ['SENT'],
      SENT: ['ACCEPTED', 'REJECTED'],
    };

    const allowed = validTransitions[quotation.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(
        `Cannot transition from ${quotation.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
        400
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        enquiry: { select: { id: true, enquiryNumber: true } },
        items: { include: { product: true } },
      },
    });

    // If quotation is accepted/rejected, update enquiry status
    if (status === 'ACCEPTED') {
      await prisma.enquiry.update({
        where: { id: quotation.enquiryId },
        data: { status: 'WON' },
      });
    } else if (status === 'REJECTED') {
      await prisma.enquiry.update({
        where: { id: quotation.enquiryId },
        data: { status: 'LOST' },
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Convert an ACCEPTED quotation into a Sales Order.
 * Guards: only ACCEPTED quotations, prevent duplicates (DB UNIQUE constraint).
 */
exports.convertToSalesOrder = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true, salesOrder: true },
    });

    if (!quotation) throw new AppError('Quotation not found.', 404);

    if (quotation.status !== 'ACCEPTED') {
      throw new AppError(
        `Only ACCEPTED quotations can be converted. Current status: ${quotation.status}`,
        400
      );
    }

    if (quotation.salesOrder) {
      throw new AppError(
        `This quotation already has a Sales Order: ${quotation.salesOrder.orderNumber}`,
        409
      );
    }

    const orderNumber = await generateOrderNumber();

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        orderDate: new Date(),
        totalAmount: quotation.grandTotal,
        status: 'PENDING',
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineAmount: item.lineAmount,
          })),
        },
      },
      include: {
        customer: true,
        quotation: { select: { id: true, quotationNumber: true } },
        items: { include: { product: true } },
      },
    });

    res.status(201).json(salesOrder);
  } catch (err) {
    // Handle unique constraint violation (duplicate SO for same quotation)
    if (err.code === 'P2002' && err.meta?.target?.includes('quotation_id')) {
      return res.status(409).json({
        error: 'A Sales Order already exists for this quotation.',
      });
    }
    next(err);
  }
};
