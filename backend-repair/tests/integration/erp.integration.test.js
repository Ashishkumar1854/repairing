process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";

require("dotenv").config({ quiet: true });

const bcrypt = require("bcrypt");
const request = require("supertest");

const app = require("../../src/app");
const prisma = require("../../src/core/database/prisma");
const { generateAccessToken } = require("../../src/shared/utils/jwt");

const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@12345";
const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const state = {
  business: null,
  branch: null,
  tenantB: null,
  tenantBBranch: null,
  staff: {},
  tokens: {},
  ticketId: null,
  customerId: null,
  estimateId: null,
  inventoryItemId: null,
  invoiceId: null,
  vendorId: null,
  vendorJobId: null,
};

const api = () => request(app);
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const expectSuccessEnvelope = (response) => {
  expect(response.body).toHaveProperty("success", true);
  expect(response.body).toHaveProperty("message");
  expect(response.body).toHaveProperty("data");
};

const tokenFor = (staff) =>
  generateAccessToken({
    staffId: staff.id,
    businessId: staff.businessId,
    branchId: staff.branchId,
    role: staff.role,
  });

const ensureBusiness = (slug, name) =>
  prisma.business.upsert({
    where: { slug },
    update: { name, deletedAt: null },
    create: { name, slug, type: "REPAIR_SHOP" },
  });

const ensureBranch = (businessId, code = "MAIN") =>
  prisma.branch.upsert({
    where: { businessId_code: { businessId, code } },
    update: {
      name: "Main Branch",
      isMainBranch: true,
      status: "ACTIVE",
    },
    create: {
      businessId,
      name: "Main Branch",
      code,
      isMainBranch: true,
      status: "ACTIVE",
    },
  });

const ensureStaff = async (businessId, role, prefix, branchId = null) => {
  const email = `${prefix}.${role.toLowerCase()}.${runId}@repair.test`;
  const passwordHash = await bcrypt.hash(password, 12);
  const scopedBranchId = ["OWNER", "SUPER_ADMIN"].includes(role) ? null : branchId;

  const existing = await prisma.staffMember.findFirst({
    where: { businessId, email },
  });

  if (existing) {
    return prisma.staffMember.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role,
        branchId: scopedBranchId,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  return prisma.staffMember.create({
    data: {
      businessId,
      branchId: scopedBranchId,
      fullName: `Integration ${role}`,
      email,
      passwordHash,
      role,
      isActive: true,
    },
  });
};

const createTicket = async (token, title = "Integration Repair") => {
  const response = await api()
    .post("/api/v1/repair/tickets")
    .set(authHeader(token))
    .send({
      customer: {
        fullName: `Integration Customer ${Date.now()}`,
        phone: `91${String(Date.now()).slice(-10)}`,
        email: `customer.${Date.now()}@repair.test`,
      },
      title,
      description: "Integration test repair ticket",
      priority: "HIGH",
      items: [
        {
          itemType: "PHONE",
          brand: "Apple",
          model: "iPhone Integration",
          serialNumber: `SN-${Date.now()}`,
          condition: "Screen cracked",
          accessories: ["case"],
        },
      ],
      issues: [{ title: "Screen broken", description: "Display cracked" }],
    });

  expect(response.status).toBe(201);
  expectSuccessEnvelope(response);
  return response.body.data.ticket;
};

beforeAll(async () => {
  state.business = await ensureBusiness("integration-tenant-a", "Integration Tenant A");
  state.tenantB = await ensureBusiness("integration-tenant-b", "Integration Tenant B");
  state.branch = await ensureBranch(state.business.id);
  state.tenantBBranch = await ensureBranch(state.tenantB.id);

  for (const role of [
    "OWNER",
    "ADMIN",
    "TECHNICIAN",
  ]) {
    state.staff[role] = await ensureStaff(state.business.id, role, "tenant-a", state.branch.id);
    state.tokens[role] = tokenFor(state.staff[role]);
  }

  state.staff.SECOND_TECHNICIAN = await ensureStaff(
    state.business.id,
    "TECHNICIAN",
    "tenant-a-second",
    state.branch.id
  );
  state.tokens.SECOND_TECHNICIAN = tokenFor(state.staff.SECOND_TECHNICIAN);

  state.tenantBAdmin = await ensureStaff(
    state.tenantB.id,
    "ADMIN",
    "tenant-b",
    state.tenantBBranch.id
  );
  state.tenantBToken = tokenFor(state.tenantBAdmin);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Authentication", () => {
  test("login, me, refresh, and logout work through the public auth API", async () => {
    const login = await api().post("/api/v1/auth/login").send({
      email: state.staff.ADMIN.email,
      password,
      branchName: "Main Branch",
    });

    expect(login.status).toBe(200);
    expectSuccessEnvelope(login);
    expect(login.body.data.tokens.accessToken).toBeTruthy();
    expect(login.body.data.tokens.refreshToken).toBeTruthy();

    const me = await api()
      .get("/api/v1/auth/me")
      .set(authHeader(login.body.data.tokens.accessToken));

    expect(me.status).toBe(200);
    expectSuccessEnvelope(me);
    expect(me.body.data.user.role).toBe("ADMIN");

    const refresh = await api().post("/api/v1/auth/refresh").send({
      refreshToken: login.body.data.tokens.refreshToken,
    });

    expect(refresh.status).toBe(200);
    expectSuccessEnvelope(refresh);

    const logout = await api()
      .post("/api/v1/auth/logout")
      .set(authHeader(refresh.body.data.tokens.accessToken));

    expect(logout.status).toBe(200);
    expectSuccessEnvelope(logout);
  });
});

describe("Core ERP lifecycle", () => {
  test("covers repair, assignment, estimate, inventory, billing, custody, and analytics", async () => {
    const inventory = await api()
      .post("/api/v1/inventory/items")
      .set(authHeader(state.tokens.ADMIN))
      .send({
        sku: `INT-SCREEN-${runId}`,
        partName: "Integration Screen Assembly",
        category: "Screens",
        stockQuantity: 3,
        unitCost: 40,
        sellingPrice: 90,
        reorderLevel: 1,
      });

    expect(inventory.status).toBe(201);
    state.inventoryItemId = inventory.body.data.item.id;

    const ticket = await createTicket(state.tokens.ADMIN);
    state.ticketId = ticket.id;
    state.customerId = ticket.customerId;

    await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/assign`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ technicianId: state.staff.TECHNICIAN.id, notes: "Integration assignment" })
      .expect(201);

    await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/handover`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        type: "RECEPTION_TO_TECHNICIAN",
        toHolderId: state.staff.TECHNICIAN.id,
        currentLocation: "Integration Bench",
      })
      .expect(201);

    const estimate = await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/estimate`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({
        diagnosis: {
          diagnosis: "Display assembly failure confirmed",
          estimatedRepairNotes: "Replace screen and retest",
          estimatedTurnaroundHours: 24,
          internalNotes: "Integration test diagnosis",
        },
        items: [
          {
            itemType: "PART",
            name: "Screen replacement",
            quantity: 1,
            unitAmount: 120,
            sku: `INT-SCREEN-${runId}`,
          },
          { itemType: "LABOR", name: "Repair labor", quantity: 1, unitAmount: 50 },
        ],
        discountAmount: 5,
        taxRate: 10,
      });

    expect(estimate.status).toBe(201);
    state.estimateId = estimate.body.data.estimate.id;

    await api()
      .post(`/api/v1/repair/estimates/${state.estimateId}/approve`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ notes: "Integration approval" })
      .expect(200);

    const unauthorizedConsume = await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/consume-parts`)
      .set(authHeader(state.tokens.SECOND_TECHNICIAN))
      .send({ parts: [{ inventoryItemId: state.inventoryItemId, quantity: 1 }] });
    expect(unauthorizedConsume.status).toBe(403);

    const consume = await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/consume-parts`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({
        parts: [{ inventoryItemId: state.inventoryItemId, quantity: 1 }],
      });
    expect(consume.status).toBe(201);
    expect(consume.body.data.ticketStatus).toBe("IN_REPAIR");

    const ticketRecord = await prisma.repairTicket.findUnique({
      where: { id: state.ticketId },
    });
    expect(Number(ticketRecord.partsCost)).toBe(40);

    const itemBefore = await prisma.inventoryItem.findUnique({
      where: { id: state.inventoryItemId },
    });

    await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/consume-parts`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({ parts: [{ inventoryItemId: state.inventoryItemId, quantity: 999 }] })
      .expect(409);

    const itemAfter = await prisma.inventoryItem.findUnique({
      where: { id: state.inventoryItemId },
    });
    expect(String(itemAfter.stockQuantity)).toBe(String(itemBefore.stockQuantity));

    const movementCount = await prisma.inventoryStockMovement.count({
      where: { businessId: state.business.id, inventoryItemId: state.inventoryItemId },
    });
    expect(movementCount).toBeGreaterThan(0);

    await api()
      .patch(`/api/v1/repair/tickets/${state.ticketId}/status`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({ status: "READY_FOR_REVIEW", reason: "Integration repair complete" })
      .expect(200);

    await api()
      .patch(`/api/v1/repair/tickets/${state.ticketId}/status`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ status: "READY_FOR_DELIVERY", reason: "Admin review complete" })
      .expect(200);

    await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/handover`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({ type: "TECHNICIAN_TO_RECEPTION", currentLocation: "Integration Reception" })
      .expect(201);

    const invoice = await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/invoice`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        estimateId: state.estimateId,
        includeApprovedEstimate: true,
        includeActualUsage: false,
        discountAmount: 0,
        taxRate: 0,
      });
    expect(invoice.status).toBe(201);
    state.invoiceId = invoice.body.data.invoice.id;

    const partial = await api()
      .post(`/api/v1/billing/invoices/${state.invoiceId}/payments`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ amount: 50, method: "CASH" });
    expect(partial.status).toBe(201);
    expect(partial.body.data.invoice.status).toBe("PARTIALLY_PAID");

    const finalPayment = await api()
      .post(`/api/v1/billing/invoices/${state.invoiceId}/payments`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ amount: Number(partial.body.data.invoice.dueAmount), method: "CARD" });
    expect(finalPayment.status).toBe(201);
    expect(finalPayment.body.data.invoice.status).toBe("PAID");
    expect(Number(finalPayment.body.data.invoice.dueAmount)).toBe(0);

    await api()
      .post(`/api/v1/billing/invoices/${state.invoiceId}/payments`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ amount: 1, method: "CASH" })
      .expect(409);

    const invoiceDb = await prisma.repairInvoice.findFirst({
      where: { id: state.invoiceId, businessId: state.business.id },
    });
    expect(invoiceDb.status).toBe("PAID");
    expect(String(invoiceDb.dueAmount)).toBe("0");

    const ledgerCount = await prisma.customerFinancialLedger.count({
      where: { businessId: state.business.id, customerId: state.customerId },
    });
    expect(ledgerCount).toBeGreaterThanOrEqual(3);

    const delivery = await api()
      .post(`/api/v1/repair/tickets/${state.ticketId}/handover`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        type: "RECEPTION_TO_CUSTOMER",
        receiverName: "Integration Receiver",
        currentLocation: "Delivered",
      });
    expect(delivery.status).toBe(201);
    expect(delivery.body.data.ticketStatus).toBe("DELIVERED");

    const custody = await api()
      .get(`/api/v1/repair/tickets/${state.ticketId}/current-custody`)
      .set(authHeader(state.tokens.ADMIN));
    expect(custody.status).toBe(200);
    expect(custody.body.data.custody.currentHolderType).toBe("CUSTOMER");

    const handovers = await api()
      .get(`/api/v1/repair/tickets/${state.ticketId}/handovers`)
      .set(authHeader(state.tokens.ADMIN));
    expect(handovers.status).toBe(200);
    expect(handovers.body.data.handovers.length).toBeGreaterThanOrEqual(3);

    await api()
      .get("/api/v1/analytics/dashboard/owner")
      .set(authHeader(state.tokens.OWNER))
      .expect(200);

    await api()
      .get("/api/v1/analytics/finance/revenue")
      .set(authHeader(state.tokens.ADMIN))
      .expect(200);
  });
});

describe("Vendor repair flow", () => {
  test("dispatches, updates, and receives a vendor repair job", async () => {
    const vendor = await api()
      .post("/api/v1/vendors")
      .set(authHeader(state.tokens.ADMIN))
      .send({ name: `Integration Vendor ${runId}`, email: `vendor.${runId}@repair.test` });
    expect(vendor.status).toBe(201);
    state.vendorId = vendor.body.data.vendor.id;

    const ticket = await createTicket(state.tokens.ADMIN, "Integration Vendor Repair");

    await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/assign`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ technicianId: state.staff.TECHNICIAN.id })
      .expect(201);

    await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/handover`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        type: "RECEPTION_TO_TECHNICIAN",
        toHolderId: state.staff.TECHNICIAN.id,
        currentLocation: "Vendor Bench",
      })
      .expect(201);

    await api()
      .patch(`/api/v1/repair/tickets/${ticket.id}/status`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({ status: "IN_REPAIR", reason: "Vendor specialist required" })
      .expect(200);

    const dispatch = await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/vendor-dispatch`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({
        vendorId: state.vendorId,
        issueDescription: "Board-level repair required",
        dispatchNotes: "Integration vendor dispatch",
        estimatedCost: 75,
        currentLocation: "Vendor Lab",
      });
    expect(dispatch.status).toBe(201);
    state.vendorJobId = dispatch.body.data.vendorRepairJob.id;

    await api()
      .patch(`/api/v1/vendors/repair-jobs/${state.vendorJobId}/status`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ status: "COMPLETED", vendorResolution: "Vendor completed repair" })
      .expect(200);

    await api()
      .post(`/api/v1/vendors/repair-jobs/${state.vendorJobId}/receive`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        nextTicketStatus: "IN_REPAIR",
        vendorResolution: "Returned from vendor",
        currentLocation: "Reception",
      })
      .expect(200);

    const job = await prisma.vendorRepairJob.findFirst({
      where: { id: state.vendorJobId, businessId: state.business.id },
    });
    expect(job.status).toBe("RETURNED");
  });
});

describe("Handover workflow transitions", () => {
  const createAssignedInRepairTicketAtTechnician = async (title) => {
    const ticket = await createTicket(state.tokens.ADMIN, title);

    await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/assign`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ technicianId: state.staff.TECHNICIAN.id })
      .expect(201);

    await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/handover`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        type: "RECEPTION_TO_TECHNICIAN",
        toHolderId: state.staff.TECHNICIAN.id,
        currentLocation: "Integration Bench",
      })
      .expect(201);

    await api()
      .patch(`/api/v1/repair/tickets/${ticket.id}/status`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({ status: "IN_REPAIR", reason: "Integration repair started" })
      .expect(200);

    return ticket;
  };

  test("reception to customer auto-delivers a ticket from IN_REPAIR and writes status history", async () => {
    const ticket = await createAssignedInRepairTicketAtTechnician(
      "Integration Direct Customer Delivery"
    );

    await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/handover`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({
        type: "TECHNICIAN_TO_RECEPTION",
        currentLocation: "Integration Reception",
      })
      .expect(201);

    const delivery = await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/handover`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        type: "RECEPTION_TO_CUSTOMER",
        receiverName: "Integration Receiver",
        currentLocation: "Delivered",
      });

    expect(delivery.status).toBe(201);
    expect(delivery.body.data.ticketStatus).toBe("DELIVERED");
    expect(delivery.body.data.ticket.status).toBe("DELIVERED");
    expect(delivery.body.data.ticket.currentHolderType).toBe("CUSTOMER");

    const statusLogs = await prisma.repairStatusLog.findMany({
      where: {
        businessId: state.business.id,
        repairTicketId: ticket.id,
        toStatus: { in: ["READY_FOR_DELIVERY", "DELIVERED"] },
      },
      orderBy: { createdAt: "asc" },
    });

    expect(statusLogs.map((log) => log.toStatus)).toEqual([
      "READY_FOR_DELIVERY",
      "DELIVERED",
    ]);

    const storedTicket = await prisma.repairTicket.findFirst({
      where: { id: ticket.id, businessId: state.business.id },
    });
    expect(storedTicket.status).toBe("DELIVERED");
    expect(storedTicket.currentHolderType).toBe("CUSTOMER");
  });

  test("technician to vendor and vendor to reception handovers keep workflow transitions intact", async () => {
    const vendor = await api()
      .post("/api/v1/vendors")
      .set(authHeader(state.tokens.ADMIN))
      .send({
        name: `Integration Handover Vendor ${Date.now()}`,
        email: `handover.vendor.${Date.now()}@repair.test`,
      });
    expect(vendor.status).toBe(201);

    const ticket = await createAssignedInRepairTicketAtTechnician(
      "Integration Vendor Handover"
    );

    const toVendor = await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/handover`)
      .set(authHeader(state.tokens.TECHNICIAN))
      .send({
        type: "TECHNICIAN_TO_VENDOR",
        vendorId: vendor.body.data.vendor.id,
        currentLocation: "Vendor Lab",
      });

    expect(toVendor.status).toBe(201);
    expect(toVendor.body.data.ticketStatus).toBe("SENT_TO_VENDOR");
    expect(toVendor.body.data.ticket.currentHolderType).toBe("VENDOR");

    const toReception = await api()
      .post(`/api/v1/repair/tickets/${ticket.id}/handover`)
      .set(authHeader(state.tokens.ADMIN))
      .send({
        type: "VENDOR_TO_RECEPTION",
        vendorId: vendor.body.data.vendor.id,
        currentLocation: "Reception",
      });

    expect(toReception.status).toBe(201);
    expect(toReception.body.data.ticketStatus).toBe("IN_REPAIR");
    expect(toReception.body.data.ticket.currentHolderType).toBe("RECEPTION");
  });
});

describe("Tenant isolation", () => {
  test("blocks cross-tenant access to sensitive ERP resources", async () => {
    const tenantBTicket = await createTicket(state.tenantBToken, "Tenant B private ticket");

    await api()
      .get(`/api/v1/repair/tickets/${tenantBTicket.id}`)
      .set(authHeader(state.tokens.ADMIN))
      .expect(404);

    await api()
      .post(`/api/v1/repair/tickets/${tenantBTicket.id}/assign`)
      .set(authHeader(state.tokens.ADMIN))
      .send({ technicianId: state.staff.TECHNICIAN.id })
      .expect(404);

    await api()
      .get(`/api/v1/inventory/items/${state.inventoryItemId}`)
      .set(authHeader(state.tenantBToken))
      .expect(404);

    await api()
      .get(`/api/v1/billing/invoices/${state.invoiceId}`)
      .set(authHeader(state.tenantBToken))
      .expect(404);

    await api()
      .get(`/api/v1/vendors/repair-jobs/${state.vendorJobId}`)
      .set(authHeader(state.tenantBToken))
      .expect(404);

    const tenantBAnalytics = await api()
      .get("/api/v1/analytics/finance/revenue")
      .set(authHeader(state.tenantBToken));
    expect(tenantBAnalytics.status).toBe(200);
    expect(tenantBAnalytics.body.data.summary.totalRevenue).toBe(0);
  });
});

describe("RBAC", () => {
  test.each([
    [
      "technician cannot create ticket",
      "post",
      "/api/v1/repair/tickets",
      "TECHNICIAN",
      {
        customer: { fullName: "RBAC Customer", phone: `92${String(Date.now()).slice(-10)}` },
        title: "RBAC blocked ticket",
        items: [{ itemType: "PHONE" }],
        issues: [{ title: "RBAC" }],
      },
    ],

    [
      "technician cannot collect payment",
      "post",
      () => `/api/v1/billing/invoices/${state.invoiceId}/payments`,
      "TECHNICIAN",
      { amount: 1, method: "CASH" },
    ],
    [
      "owner cannot create ticket",
      "post",
      "/api/v1/repair/tickets",
      "OWNER",
      {
        customer: { fullName: "RBAC Customer", phone: `92${String(Date.now()).slice(-10)}` },
        title: "RBAC blocked ticket",
        items: [{ itemType: "PHONE" }],
        issues: [{ title: "RBAC" }],
      },
    ],
    [
      "owner cannot create inventory",
      "post",
      "/api/v1/inventory/items",
      "OWNER",
      { sku: `RBAC-OWNER-${runId}`, partName: "RBAC Item" },
    ],
    [
      "owner cannot collect payment",
      "post",
      () => `/api/v1/billing/invoices/${state.invoiceId}/payments`,
      "OWNER",
      { amount: 1, method: "CASH" },
    ],
  ])("%s", async (_name, method, pathInput, role, bodyInput) => {
    const path = typeof pathInput === "function" ? pathInput() : pathInput;
    const body = typeof bodyInput === "function" ? bodyInput() : bodyInput;
    const response = await api()[method](path).set(authHeader(state.tokens[role])).send(body);
    expect(response.status).toBe(403);
  });

  describe("Staff Creation Role & Branch Enforcement", () => {
    test("Owner creates staff - role is automatically ADMIN and branch is verified", async () => {
      const email = `test-admin-create.${runId}@repair.test`;
      const response = await api()
        .post("/api/v1/staff")
        .set(authHeader(state.tokens.OWNER))
        .send({
          name: "New Admin",
          email,
          password: "password123",
          branchId: state.branch.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.staff.role).toBe("ADMIN");
      expect(response.body.data.staff.branchId).toBe(state.branch.id);
    });

    test("Owner cannot create staff with TECHNICIAN role explicitly", async () => {
      const email = `test-admin-create-fail.${runId}@repair.test`;
      const response = await api()
        .post("/api/v1/staff")
        .set(authHeader(state.tokens.OWNER))
        .send({
          name: "Fail Tech",
          email,
          password: "password123",
          branchId: state.branch.id,
          role: "TECHNICIAN",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid role selection");
    });

    test("Admin creates staff - role is automatically TECHNICIAN and branch is verified", async () => {
      const email = `test-tech-create.${runId}@repair.test`;
      const response = await api()
        .post("/api/v1/staff")
        .set(authHeader(state.tokens.ADMIN))
        .send({
          name: "New Tech",
          email,
          password: "password123",
          branchId: state.branch.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.staff.role).toBe("TECHNICIAN");
      expect(response.body.data.staff.branchId).toBe(state.branch.id);
    });

    test("Admin cannot assign staff to branch other than their own", async () => {
      const email = `test-tech-create-cross-branch.${runId}@repair.test`;
      const response = await api()
        .post("/api/v1/staff")
        .set(authHeader(state.tokens.ADMIN))
        .send({
          name: "Cross Tech",
          email,
          password: "password123",
          branchId: state.tenantBBranch.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("cannot write to another branch");
    });
  });

  describe("Branch Deletion & Suggestions", () => {
    let testBranchId;

    beforeAll(async () => {
      const response = await api()
        .post("/api/v1/branches")
        .set(authHeader(state.tokens.OWNER))
        .send({
          name: `Delete Test Branch ${runId}`,
        });
      if (response.status !== 201) {
        console.error("CREATE BRANCH FAILED:", response.body);
      }
      testBranchId = response.body.data.branch.id;
    });

    test("Owner can retrieve branch suggestions by email", async () => {
      const staffEmail = state.staff.ADMIN.email;
      const response = await api()
        .get(`/api/v1/auth/branches-by-email?email=${staffEmail}`);
      expect(response.status).toBe(200);
      expect(response.body.data.branches).toBeDefined();
      expect(response.body.data.branches.length).toBeGreaterThan(0);
      const names = response.body.data.branches.map(b => b.name);
      expect(names).toContain("Main Branch");
    });

    test("Owner cannot delete main branch", async () => {
      const mainBranchId = state.branch.id;
      const response = await api()
        .delete(`/api/v1/branches/${mainBranchId}`)
        .set(authHeader(state.tokens.OWNER));
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Main branch cannot be deleted");
    });

    test("Owner can delete a non-main branch", async () => {
      const response = await api()
        .delete(`/api/v1/branches/${testBranchId}`)
        .set(authHeader(state.tokens.OWNER));
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);

      const listResponse = await api()
        .get("/api/v1/branches")
        .set(authHeader(state.tokens.OWNER));
      const branchIds = listResponse.body.data.branches.map(b => b.id);
      expect(branchIds).not.toContain(testBranchId);
    });
  });

  describe("Staff Deletion", () => {
    let testStaffId;

    beforeAll(async () => {
      const email = `test-admin-delete.${runId}@repair.test`;
      const response = await api()
        .post("/api/v1/staff")
        .set(authHeader(state.tokens.OWNER))
        .send({
          name: "Temporary Admin",
          email,
          password: "password123",
          branchId: state.branch.id,
        });
      testStaffId = response.body.data.staff.id;
    });

    test("Owner can delete branch admin staff", async () => {
      const response = await api()
        .delete(`/api/v1/staff/${testStaffId}`)
        .set(authHeader(state.tokens.OWNER));
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);

      const listResponse = await api()
        .get("/api/v1/staff")
        .set(authHeader(state.tokens.OWNER));
      const staffIds = listResponse.body.data.staff.map(s => s.id);
      expect(staffIds).not.toContain(testStaffId);
    });

    test("Technician cannot delete staff", async () => {
      const response = await api()
        .delete(`/api/v1/staff/${state.staff.ADMIN.id}`)
        .set(authHeader(state.tokens.TECHNICIAN));
      expect(response.status).toBe(403);
    });

    test("Owner can create a new staff member with the same email after deletion", async () => {
      const email = `test-admin-delete.${runId}@repair.test`;
      const response = await api()
        .post("/api/v1/staff")
        .set(authHeader(state.tokens.OWNER))
        .send({
          name: "Recreated Admin",
          email,
          password: "password123",
          branchId: state.branch.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.staff.fullName).toBe("Recreated Admin");
    });
  });
});
