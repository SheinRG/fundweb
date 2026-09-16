const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Seeding database...');

  // Clear existing data (in reverse dependency order)
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.enquiryItem.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const passwordHash = await bcrypt.hash('admin123', 10);
  const salesHash = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@fundsweb.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sales User',
      email: 'sales@fundsweb.com',
      passwordHash: salesHash,
      role: 'SALES',
    },
  });

  console.log('[ok] Users seeded:', admin.email, salesUser.email);

  // --- Customers ---
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        companyName: 'ABC Engineering Pvt. Ltd.',
        contactPerson: 'Rajesh Kumar',
        mobile: '9876543210',
        email: 'rajesh@abceng.com',
        city: 'Mumbai',
      },
    }),
    prisma.customer.create({
      data: {
        companyName: 'XYZ Manufacturing Co.',
        contactPerson: 'Priya Sharma',
        mobile: '9876543211',
        email: 'priya@xyzmanuf.com',
        city: 'Pune',
      },
    }),
    prisma.customer.create({
      data: {
        companyName: 'Delta Industries Ltd.',
        contactPerson: 'Amit Patel',
        mobile: '9876543212',
        email: 'amit@deltaindustries.com',
        city: 'Ahmedabad',
      },
    }),
    prisma.customer.create({
      data: {
        companyName: 'Omega Steel Works',
        contactPerson: 'Suresh Reddy',
        mobile: '9876543213',
        email: 'suresh@omegasteel.com',
        city: 'Hyderabad',
      },
    }),
    prisma.customer.create({
      data: {
        companyName: 'TechnoForge Solutions',
        contactPerson: 'Neha Gupta',
        mobile: '9876543214',
        email: 'neha@technoforge.com',
        city: 'Bangalore',
      },
    }),
  ]);

  console.log(`[ok] ${customers.length} customers seeded`);

  // --- Products (6 industrial products with realistic data) ---
  const products = await Promise.all([
    prisma.product.create({
      data: {
        productCode: 'IND-BRG-001',
        productName: 'Industrial Ball Bearing (6205)',
        category: 'Bearings',
        unit: 'PCS',
        basePrice: 450.00,
      },
    }),
    prisma.product.create({
      data: {
        productCode: 'IND-VLV-002',
        productName: 'Pneumatic Control Valve',
        category: 'Valves',
        unit: 'PCS',
        basePrice: 3200.00,
      },
    }),
    prisma.product.create({
      data: {
        productCode: 'IND-PMP-003',
        productName: 'Centrifugal Pump Motor (5HP)',
        category: 'Pumps',
        unit: 'PCS',
        basePrice: 28500.00,
      },
    }),
    prisma.product.create({
      data: {
        productCode: 'IND-GKT-004',
        productName: 'PTFE Gasket Sheet (3mm)',
        category: 'Sealing',
        unit: 'SQM',
        basePrice: 1800.00,
      },
    }),
    prisma.product.create({
      data: {
        productCode: 'IND-FLG-005',
        productName: 'SS304 Flange (6 inch)',
        category: 'Fittings',
        unit: 'PCS',
        basePrice: 5600.00,
      },
    }),
    prisma.product.create({
      data: {
        productCode: 'IND-CBL-006',
        productName: 'Armoured Power Cable (4C x 16mm)',
        category: 'Electrical',
        unit: 'MTR',
        basePrice: 680.00,
      },
    }),
  ]);

  console.log(`[ok] ${products.length} products seeded`);

  // --- Inventory (initial stock for each product) ---
  const inventoryData = [
    { productId: products[0].id, physicalQty: 500, reservedQty: 0 },
    { productId: products[1].id, physicalQty: 200, reservedQty: 0 },
    { productId: products[2].id, physicalQty: 50, reservedQty: 0 },
    { productId: products[3].id, physicalQty: 300, reservedQty: 0 },
    { productId: products[4].id, physicalQty: 150, reservedQty: 0 },
    { productId: products[5].id, physicalQty: 1000, reservedQty: 0 },
  ];

  await Promise.all(
    inventoryData.map((inv) => prisma.inventory.create({ data: inv }))
  );

  console.log(`[ok] ${inventoryData.length} inventory records seeded`);
  console.log('\n[done] Seeding complete!');
  console.log('\n[creds] Login Credentials:');
  console.log('  Admin: admin@fundsweb.com / admin123');
  console.log('  Sales: sales@fundsweb.com / sales123');
}

main()
  .catch((e) => {
    console.error('[error] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
