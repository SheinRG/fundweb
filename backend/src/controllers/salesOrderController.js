const prisma = require('../config/db');
const { z } = require('zod');
const { AppError } = require('../middleware/errorHandler');

const dispatchSchema = z.object({
  dispatchDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid date required'),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'At least one item is required'),
});

async function generateDispatchNumber() {
  const last = await prisma.dispatch.findFirst({
    orderBy: { id: 'desc' },
    select: { dispatchNumber: true },
  });
  if (!last) return 'DSP-0001';
  const lastNum = parseInt(last.dispatchNumber.split('-')[1]);
  return `DSP-${String(lastNum + 1).padStart(4, '0')}`;
}

exports.list = async (req, res, next) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: { select: { id: true, companyName: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        items: { include: { product: { select: { id: true, productName: true, productCode: true } } } },
        dispatches: {
          select: { id: true, dispatchNumber: true, dispatchDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: { select: { id: true, quotationNumber: true } },
        items: { include: { product: true } },
        dispatches: {
          include: { items: { include: { product: true } } },
        },
      },
    });
    if (!order) throw new AppError('Sales Order not found.', 404);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

/**
 * CONFIRM a Sales Order — this is the CRITICAL concurrency-safe operation.
 * 
 * Uses PostgreSQL SELECT ... FOR UPDATE to acquire row-level locks on inventory
 * rows within a transaction. This prevents race conditions where two concurrent
 * requests try to reserve the same stock.
 * 
 * Flow:
 * 1. Lock the sales order row (FOR UPDATE)
 * 2. Verify status is PENDING
 * 3. For each order item, lock the inventory row and check availability
 * 4. If all items have sufficient stock, reserve them
 * 5. Update order status to CONFIRMED
 * 
 * If any item has insufficient stock, the entire transaction rolls back.
 */
exports.confirm = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock the sales order row to prevent concurrent modifications
      const [order] = await tx.$queryRawUnsafe(
        `SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`,
        id
      );

      if (!order) throw new AppError('Sales Order not found.', 404);
      if (order.status !== 'PENDING') {
        throw new AppError(
          `Order cannot be confirmed. Current status: ${order.status}`,
          400
        );
      }

      // 2. Get order items
      const orderItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: id },
        include: { product: true },
      });

      // 3. For EACH product, lock inventory row and validate availability
      for (const item of orderItems) {
        const [inv] = await tx.$queryRawUnsafe(
          `SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE`,
          item.productId
        );

        if (!inv) {
          throw new AppError(
            `No inventory record found for product: ${item.product.productName}`,
            400
          );
        }

        const available = Number(inv.physical_qty) - Number(inv.reserved_qty);
        if (item.quantity > available) {
          throw new AppError(
            `Insufficient stock for ${item.product.productName}. Available: ${available}, Required: ${item.quantity}`,
            400
          );
        }

        // 4. Reserve the stock
        await tx.$queryRawUnsafe(
          `UPDATE inventory SET reserved_qty = reserved_qty + $1 WHERE product_id = $2`,
          item.quantity,
          item.productId
        );
      }

      // 5. Update order status
      await tx.salesOrder.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      // Return the updated order
      return tx.salesOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          quotation: { select: { id: true, quotationNumber: true } },
          items: { include: { product: true } },
        },
      });
    }, {
      // Use SERIALIZABLE or at least READ COMMITTED with FOR UPDATE
      isolationLevel: 'Serializable',
      timeout: 10000,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * DISPATCH a confirmed Sales Order.
 * 
 * When stock is dispatched:
 * - Physical Quantity decreases
 * - Reserved Quantity decreases
 * 
 * Guards:
 * - Only CONFIRMED orders can be dispatched
 * - Cannot dispatch beyond reserved quantity
 * - Cannot dispatch a cancelled order
 */
exports.dispatch = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = dispatchSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Lock and verify the sales order
      const [order] = await tx.$queryRawUnsafe(
        `SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`,
        id
      );

      if (!order) throw new AppError('Sales Order not found.', 404);
      if (order.status !== 'CONFIRMED') {
        throw new AppError(
          `Only CONFIRMED orders can be dispatched. Current status: ${order.status}`,
          400
        );
      }

      // Verify dispatch items match order items
      const orderItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: id },
        include: { product: true },
      });

      // Get existing dispatches for this order to check remaining quantities
      const existingDispatches = await tx.dispatch.findMany({
        where: { salesOrderId: id },
        include: { items: true },
      });

      // Calculate already dispatched quantities per product
      const dispatchedQty = {};
      for (const d of existingDispatches) {
        for (const item of d.items) {
          dispatchedQty[item.productId] = (dispatchedQty[item.productId] || 0) + item.quantity;
        }
      }

      // Validate each dispatch item
      for (const dispItem of data.items) {
        const orderItem = orderItems.find((oi) => oi.productId === dispItem.productId);
        if (!orderItem) {
          throw new AppError(
            `Product ID ${dispItem.productId} is not part of this order.`,
            400
          );
        }

        const alreadyDispatched = dispatchedQty[dispItem.productId] || 0;
        const remaining = orderItem.quantity - alreadyDispatched;

        if (dispItem.quantity > remaining) {
          throw new AppError(
            `Cannot dispatch ${dispItem.quantity} of ${orderItem.product.productName}. Remaining: ${remaining}`,
            400
          );
        }

        // Lock and update inventory: decrease both physical and reserved
        const [inv] = await tx.$queryRawUnsafe(
          `SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE`,
          dispItem.productId
        );

        if (Number(inv.physical_qty) < dispItem.quantity) {
          throw new AppError(
            `Physical stock insufficient for ${orderItem.product.productName}.`,
            400
          );
        }

        await tx.$queryRawUnsafe(
          `UPDATE inventory SET physical_qty = physical_qty - $1, reserved_qty = reserved_qty - $1 WHERE product_id = $2`,
          dispItem.quantity,
          dispItem.productId
        );
      }

      // Create dispatch record
      const dispatchNumber = await generateDispatchNumber();

      const dispatch = await tx.dispatch.create({
        data: {
          dispatchNumber,
          salesOrderId: id,
          dispatchDate: new Date(data.dispatchDate),
          vehicleNumber: data.vehicleNumber || null,
          driverName: data.driverName || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      // Check if all items are fully dispatched → update order status
      let allDispatched = true;
      for (const orderItem of orderItems) {
        const totalDispatched =
          (dispatchedQty[orderItem.productId] || 0) +
          (data.items.find((di) => di.productId === orderItem.productId)?.quantity || 0);
        if (totalDispatched < orderItem.quantity) {
          allDispatched = false;
          break;
        }
      }

      if (allDispatched) {
        await tx.salesOrder.update({
          where: { id },
          data: { status: 'DISPATCHED' },
        });
      }

      return dispatch;
    }, {
      isolationLevel: 'Serializable',
      timeout: 10000,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
