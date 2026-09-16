const prisma = require('../config/db');
const { z } = require('zod');
const { AppError } = require('../middleware/errorHandler');

exports.list = async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          select: { id: true, productCode: true, productName: true, category: true, unit: true },
        },
      },
      orderBy: { product: { productName: 'asc' } },
    });

    // Add computed available quantity
    const result = inventory.map((inv) => ({
      ...inv,
      availableQty: inv.physicalQty - inv.reservedQty,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateStockSchema = z.object({
  physicalQty: z.number().int().min(0, 'Physical quantity cannot be negative'),
});

exports.updateStock = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const { physicalQty } = updateStockSchema.parse(req.body);

    const inventory = await prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new AppError('Inventory record not found for this product.', 404);
    }

    if (physicalQty < inventory.reservedQty) {
      throw new AppError(
        `Physical quantity (${physicalQty}) cannot be less than reserved quantity (${inventory.reservedQty}).`,
        400
      );
    }

    const updated = await prisma.inventory.update({
      where: { productId },
      data: { physicalQty },
      include: { product: true },
    });

    res.json({
      ...updated,
      availableQty: updated.physicalQty - updated.reservedQty,
    });
  } catch (err) {
    next(err);
  }
};
