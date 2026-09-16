const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const bcrypt = require('bcryptjs');

let adminToken, salesToken;
let testCustomer, testProducts, testEnquiry, testQuotation;

beforeAll(async () => {
  // Clean up test data
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

  // Create test users
  const passwordHash = await bcrypt.hash('test123', 10);

  await prisma.user.create({
    data: { name: 'Test Admin', email: 'testadmin@test.com', passwordHash, role: 'ADMIN' },
  });
  await prisma.user.create({
    data: { name: 'Test Sales', email: 'testsales@test.com', passwordHash, role: 'SALES' },
  });

  // Login to get tokens
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'testadmin@test.com', password: 'test123' });
  adminToken = adminLogin.body.token;

  const salesLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'testsales@test.com', password: 'test123' });
  salesToken = salesLogin.body.token;

  // Create test customer
  const custRes = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${salesToken}`)
    .send({
      companyName: 'Test Company',
      contactPerson: 'Test Person',
      mobile: '9999999999',
      email: 'test@test.com',
      city: 'TestCity',
    });
  testCustomer = custRes.body;

  // Create test products
  testProducts = [];
  for (let i = 1; i <= 2; i++) {
    const prod = await prisma.product.create({
      data: {
        productCode: `TEST-${i}`,
        productName: `Test Product ${i}`,
        category: 'Test',
        unit: 'PCS',
        basePrice: 1000 * i,
      },
    });
    testProducts.push(prod);

    // Create inventory for each product
    await prisma.inventory.create({
      data: { productId: prod.id, physicalQty: 100, reservedQty: 0 },
    });
  }

  // Create test enquiry
  const enqRes = await request(app)
    .post('/api/enquiries')
    .set('Authorization', `Bearer ${salesToken}`)
    .send({
      customerId: testCustomer.id,
      enquiryDate: '2026-09-15',
      items: [
        { productId: testProducts[0].id, quantity: 50 },
        { productId: testProducts[1].id, quantity: 30 },
      ],
    });
  testEnquiry = enqRes.body;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ============================================================
// TEST 1: Quotation total is calculated correctly
// ============================================================
describe('Test 1: Quotation total calculation', () => {
  it('should calculate line amounts and grand total on the backend', async () => {
    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: testEnquiry.id,
        validUntil: '2026-12-31',
        items: [
          {
            productId: testProducts[0].id,
            quantity: 10,
            unitPrice: 1000,
            discountPct: 10,
            gstPct: 18,
          },
          {
            productId: testProducts[1].id,
            quantity: 5,
            unitPrice: 2000,
            discountPct: 5,
            gstPct: 18,
          },
        ],
      });

    expect(res.status).toBe(201);

    // Item 1: 10 × 1000 × (1 - 0.10) × (1 + 0.18) = 10 × 1000 × 0.90 × 1.18 = 10620
    expect(Number(res.body.items[0].lineAmount)).toBeCloseTo(10620, 2);

    // Item 2: 5 × 2000 × (1 - 0.05) × (1 + 0.18) = 5 × 2000 × 0.95 × 1.18 = 11210
    expect(Number(res.body.items[1].lineAmount)).toBeCloseTo(11210, 2);

    // Grand total = 10620 + 11210 = 21830
    expect(Number(res.body.grandTotal)).toBeCloseTo(21830, 2);

    testQuotation = res.body;
  });
});

// ============================================================
// TEST 2: Rejected/Draft quotation cannot create a Sales Order
// ============================================================
describe('Test 2: Draft/Rejected quotation cannot create SO', () => {
  it('should reject conversion of DRAFT quotation', async () => {
    // testQuotation is in DRAFT status
    const res = await request(app)
      .post(`/api/quotations/${testQuotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ACCEPTED');
  });

  it('should reject conversion of REJECTED quotation', async () => {
    // Create another quotation and reject it
    const qRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: testEnquiry.id,
        items: [
          { productId: testProducts[0].id, quantity: 5, unitPrice: 500, discountPct: 0, gstPct: 18 },
        ],
      });

    // Move to SENT first
    await request(app)
      .patch(`/api/quotations/${qRes.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'SENT' });

    // Then REJECT
    await request(app)
      .patch(`/api/quotations/${qRes.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'REJECTED' });

    // Try to convert
    const res = await request(app)
      .post(`/api/quotations/${qRes.body.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ACCEPTED');
  });
});

// ============================================================
// TEST 3: Same quotation cannot generate duplicate Sales Orders
// ============================================================
describe('Test 3: Duplicate SO prevention', () => {
  let acceptedQuotation;

  beforeAll(async () => {
    // Move testQuotation: DRAFT → SENT → ACCEPTED
    await request(app)
      .patch(`/api/quotations/${testQuotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'SENT' });

    await request(app)
      .patch(`/api/quotations/${testQuotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    acceptedQuotation = testQuotation;
  });

  it('should create the first SO successfully', async () => {
    const res = await request(app)
      .post(`/api/quotations/${acceptedQuotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(201);
    expect(res.body.orderNumber).toBeDefined();
  });

  it('should reject duplicate SO for same quotation', async () => {
    const res = await request(app)
      .post(`/api/quotations/${acceptedQuotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(409);
  });
});

// ============================================================
// TEST 4: Cannot reserve more than available inventory
// ============================================================
describe('Test 4: Inventory over-reservation blocked', () => {
  let largeOrderQuotation;

  beforeAll(async () => {
    // Create a new enquiry with quantity > available (100)
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomer.id,
        enquiryDate: '2026-09-15',
        items: [{ productId: testProducts[0].id, quantity: 200 }],
      });

    // Create quotation
    const qRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqRes.body.id,
        items: [
          { productId: testProducts[0].id, quantity: 200, unitPrice: 1000, discountPct: 0, gstPct: 0 },
        ],
      });

    // Accept: DRAFT → SENT → ACCEPTED
    await request(app)
      .patch(`/api/quotations/${qRes.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'SENT' });

    await request(app)
      .patch(`/api/quotations/${qRes.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    // Convert to SO
    const soRes = await request(app)
      .post(`/api/quotations/${qRes.body.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    largeOrderQuotation = soRes.body;
  });

  it('should reject confirmation when stock is insufficient', async () => {
    const res = await request(app)
      .post(`/api/sales-orders/${largeOrderQuotation.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient');
  });
});

// ============================================================
// TEST 5: Unauthorized user cannot perform restricted operation
// ============================================================
describe('Test 5: Unauthorized access blocked', () => {
  it('should block SALES user from confirming a Sales Order', async () => {
    // Get any existing sales order
    const orders = await request(app)
      .get('/api/sales-orders')
      .set('Authorization', `Bearer ${salesToken}`);

    if (orders.body.length > 0) {
      const res = await request(app)
        .post(`/api/sales-orders/${orders.body[0].id}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(403);
    }
  });

  it('should block unauthenticated access', async () => {
    const res = await request(app).get('/api/sales-orders');
    expect(res.status).toBe(401);
  });

  it('should block SALES user from managing inventory', async () => {
    const res = await request(app)
      .patch(`/api/inventory/${testProducts[0].id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ physicalQty: 500 });

    expect(res.status).toBe(403);
  });
});

// ============================================================
// BONUS: Concurrent reservation test
// ============================================================
describe('Bonus: Concurrent inventory reservation', () => {
  it('should handle simultaneous reservations correctly', async () => {
    // Create two separate orders that together exceed available stock
    // Available stock = 100 for testProducts[1]
    // Order A needs 70, Order B needs 70 → only one should succeed

    const createOrderFlow = async (qty) => {
      const enqRes = await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: testCustomer.id,
          enquiryDate: '2026-09-15',
          items: [{ productId: testProducts[1].id, quantity: qty }],
        });

      const qRes = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          enquiryId: enqRes.body.id,
          items: [
            { productId: testProducts[1].id, quantity: qty, unitPrice: 2000, discountPct: 0, gstPct: 0 },
          ],
        });

      await request(app)
        .patch(`/api/quotations/${qRes.body.id}/status`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ status: 'SENT' });

      await request(app)
        .patch(`/api/quotations/${qRes.body.id}/status`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ status: 'ACCEPTED' });

      const soRes = await request(app)
        .post(`/api/quotations/${qRes.body.id}/convert`)
        .set('Authorization', `Bearer ${salesToken}`);

      return soRes.body.id;
    };

    const orderAId = await createOrderFlow(70);
    const orderBId = await createOrderFlow(70);

    // Fire both confirmations simultaneously
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/sales-orders/${orderAId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .post(`/api/sales-orders/${orderBId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    // Exactly one should succeed (200) and one should fail (400)
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);
  });
});
