const prisma = require('../config/db');
const { z } = require('zod');

const createSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email('Valid email required'),
  city: z.string().min(1, 'City is required'),
});

exports.create = async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
};
