const prisma = require('../config/db');
const { z } = require('zod');
const { AppError } = require('../middleware/errorHandler');

const createSchema = z.object({
  customerId: z.number().int().positive(),
  enquiryDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid date required'),
  requiredDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid date required').optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive('Quantity must be positive'),
    })
  ).min(1, 'At least one product is required'),
});

/**
 * Generate sequential enquiry numbers: ENQ-0001, ENQ-0002, etc.
 */
async function generateEnquiryNumber() {
  const last = await prisma.enquiry.findFirst({
    orderBy: { id: 'desc' },
    select: { enquiryNumber: true },
  });

  if (!last) return 'ENQ-0001';

  const lastNum = parseInt(last.enquiryNumber.split('-')[1]);
  return `ENQ-${String(lastNum + 1).padStart(4, '0')}`;
}

exports.create = async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new AppError('Customer not found.', 404);

    // Verify all products exist
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found.', 400);
    }

    const enquiryNumber = await generateEnquiryNumber();

    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNumber,
        customerId: data.customerId,
        createdById: req.user.userId,
        enquiryDate: new Date(data.enquiryDate),
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
        notes: data.notes || null,
        status: 'NEW',
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(enquiry);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      include: {
        customer: { select: { id: true, companyName: true } },
        items: { include: { product: { select: { id: true, productName: true, productCode: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(enquiries);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        quotations: { select: { id: true, quotationNumber: true, status: true, grandTotal: true } },
      },
    });

    if (!enquiry) throw new AppError('Enquiry not found.', 404);

    res.json(enquiry);
  } catch (err) {
    next(err);
  }
};
