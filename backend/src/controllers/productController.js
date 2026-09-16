const prisma = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { productName: 'asc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
};
