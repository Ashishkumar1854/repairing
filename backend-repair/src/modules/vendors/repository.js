const prisma = require("../../core/database/prisma");
const { TICKET_STATUSES } = require("../repair/constants");
const { CUSTODY_HOLDER_TYPES, HANDOVER_TYPES } = require("../handover/constants");
const {
  ACTIVE_VENDOR_JOB_STATUSES,
  VENDOR_COST_STATUSES,
  VENDOR_REPAIR_STATUSES,
} = require("./constants");

const staffSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
};

const vendorSelect = {
  id: true,
  businessId: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  isActive: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
};

const ticketSummarySelect = {
  id: true,
  ticketNumber: true,
  title: true,
  status: true,
  priority: true,
  currentHolderType: true,
  currentHolderId: true,
  currentLocation: true,
  lastHandoverAt: true,
  customer: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
    },
  },
};

const vendorRepairStatusLogSelect = {
  id: true,
  previousStatus: true,
  nextStatus: true,
  notes: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: staffSelect,
  },
};

const vendorRepairCostLogSelect = {
  id: true,
  previousEstimatedCost: true,
  estimatedCost: true,
  previousApprovedCost: true,
  approvedCost: true,
  previousFinalCost: true,
  finalCost: true,
  previousCostStatus: true,
  nextCostStatus: true,
  notes: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: staffSelect,
  },
};

const vendorRepairJobSelect = {
  id: true,
  businessId: true,
  repairTicketId: true,
  vendorId: true,
  createdByStaffId: true,
  externalRef: true,
  status: true,
  costStatus: true,
  issueDescription: true,
  dispatchNotes: true,
  vendorDiagnosis: true,
  vendorResolution: true,
  estimatedCost: true,
  approvedCost: true,
  finalCost: true,
  expectedReturnAt: true,
  dispatchedAt: true,
  completedAt: true,
  returnedAt: true,
  cancelledAt: true,
  notes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  ticket: {
    select: ticketSummarySelect,
  },
  vendor: {
    select: vendorSelect,
  },
  createdBy: {
    select: staffSelect,
  },
  statusLogs: {
    select: vendorRepairStatusLogSelect,
    orderBy: {
      createdAt: "desc",
    },
  },
  costLogs: {
    select: vendorRepairCostLogSelect,
    orderBy: {
      createdAt: "desc",
    },
  },
};

const listVendorRepairJobSelect = {
  id: true,
  repairTicketId: true,
  vendorId: true,
  externalRef: true,
  status: true,
  costStatus: true,
  estimatedCost: true,
  approvedCost: true,
  finalCost: true,
  expectedReturnAt: true,
  dispatchedAt: true,
  completedAt: true,
  returnedAt: true,
  createdAt: true,
  updatedAt: true,
  ticket: {
    select: ticketSummarySelect,
  },
  vendor: {
    select: vendorSelect,
  },
};

const buildVendorWhere = (businessId, query = {}) => {
  const where = {
    businessId,
    deletedAt: null,
  };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.search) {
    where.OR = [
      {
        name: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
};

const buildVendorJobWhere = (businessId, query = {}) => {
  const where = {
    businessId,
    deletedAt: null,
  };

  if (query.vendorId) {
    where.vendorId = query.vendorId;
  }

  if (query.repairTicketId) {
    where.repairTicketId = query.repairTicketId;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.costStatus) {
    where.costStatus = query.costStatus;
  }

  if (query.search) {
    where.OR = [
      {
        externalRef: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        issueDescription: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        vendor: {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      },
      {
        ticket: {
          ticketNumber: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
};

const createVendor = ({ businessId, data }) =>
  prisma.vendor.create({
    data: {
      businessId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      metadata: data.metadata,
    },
    select: vendorSelect,
  });

const listVendors = async ({ businessId, query }) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const where = buildVendorWhere(businessId, query);

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      select: vendorSelect,
      orderBy: {
        name: "asc",
      },
      skip,
      take: limit,
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    vendors,
    total,
  };
};

const findVendorById = (businessId, vendorId) =>
  prisma.vendor.findFirst({
    where: {
      id: vendorId,
      businessId,
      deletedAt: null,
    },
    select: vendorSelect,
  });

const updateVendor = ({ businessId, vendorId, data }) =>
  prisma.vendor.updateMany({
    where: {
      id: vendorId,
      businessId,
      deletedAt: null,
    },
    data,
  });

const findTicketForVendorRepair = (businessId, ticketId) =>
  prisma.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      deletedAt: null,
    },
    select: ticketSummarySelect,
  });

const findVendorRepairJobById = (businessId, jobId) =>
  prisma.vendorRepairJob.findFirst({
    where: {
      id: jobId,
      businessId,
      deletedAt: null,
    },
    select: vendorRepairJobSelect,
  });

const findActiveVendorJob = (client, businessId, ticketId) =>
  client.vendorRepairJob.findFirst({
    where: {
      businessId,
      repairTicketId: ticketId,
      deletedAt: null,
      status: {
        in: ACTIVE_VENDOR_JOB_STATUSES,
      },
    },
    select: {
      id: true,
      status: true,
      vendorId: true,
    },
  });

const hydrateVendorRepairJob = (client, businessId, jobId) =>
  client.vendorRepairJob.findFirst({
    where: {
      id: jobId,
      businessId,
      deletedAt: null,
    },
    select: vendorRepairJobSelect,
  });

const dispatchVendorRepair = ({
  businessId,
  ticketId,
  vendorId,
  actorStaffId,
  data,
  workflowTransition,
}) =>
  prisma.$transaction(async (tx) => {
    const [ticket, vendor, activeJob] = await Promise.all([
      tx.repairTicket.findFirst({
        where: {
          id: ticketId,
          businessId,
          deletedAt: null,
        },
        select: ticketSummarySelect,
      }),
      tx.vendor.findFirst({
        where: {
          id: vendorId,
          businessId,
          deletedAt: null,
        },
        select: vendorSelect,
      }),
      findActiveVendorJob(tx, businessId, ticketId),
    ]);

    if (!ticket) {
      return { outcome: "TICKET_NOT_FOUND" };
    }

    if (!vendor) {
      return { outcome: "VENDOR_NOT_FOUND" };
    }

    if (!vendor.isActive) {
      return { outcome: "VENDOR_INACTIVE" };
    }

    if (activeJob) {
      return { outcome: "ACTIVE_JOB_EXISTS", activeJob };
    }

    const now = new Date();

    if (workflowTransition) {
      const updatedTicket = await tx.repairTicket.updateMany({
        where: {
          id: ticketId,
          businessId,
          status: workflowTransition.fromStatus,
          deletedAt: null,
        },
        data: {
          status: workflowTransition.toStatus,
        },
      });

      if (updatedTicket.count !== 1) {
        return { outcome: "WORKFLOW_CONFLICT" };
      }

      await tx.repairStatusLog.create({
        data: {
          businessId,
          repairTicketId: ticketId,
          actorStaffId,
          fromStatus: workflowTransition.fromStatus,
          toStatus: workflowTransition.toStatus,
          reason: workflowTransition.reason,
          metadata: data.metadata,
        },
      });
    }

    const costStatus = data.estimatedCost
      ? VENDOR_COST_STATUSES.ESTIMATED
      : VENDOR_COST_STATUSES.NOT_ESTIMATED;

    const job = await tx.vendorRepairJob.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        vendorId,
        createdByStaffId: actorStaffId,
        externalRef: data.externalRef,
        status: VENDOR_REPAIR_STATUSES.DISPATCHED,
        costStatus,
        issueDescription: data.issueDescription,
        dispatchNotes: data.dispatchNotes,
        estimatedCost: data.estimatedCost,
        expectedReturnAt: data.expectedReturnAt,
        dispatchedAt: now,
        notes: data.dispatchNotes,
        metadata: data.metadata,
      },
      select: {
        id: true,
      },
    });

    await tx.vendorRepairStatusLog.create({
      data: {
        businessId,
        vendorRepairJobId: job.id,
        actorStaffId,
        previousStatus: null,
        nextStatus: VENDOR_REPAIR_STATUSES.DISPATCHED,
        notes: data.dispatchNotes,
        metadata: data.metadata,
      },
    });

    if (data.estimatedCost) {
      await tx.vendorRepairCostLog.create({
        data: {
          businessId,
          vendorRepairJobId: job.id,
          actorStaffId,
          estimatedCost: data.estimatedCost,
          nextCostStatus: costStatus,
          notes: "Initial vendor repair estimate recorded at dispatch",
          metadata: data.metadata,
        },
      });
    }

    const handover = await tx.repairTicketHandover.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        vendorId,
        actorStaffId,
        fromHolderType: ticket.currentHolderType || CUSTODY_HOLDER_TYPES.TECHNICIAN,
        fromHolderId: ticket.currentHolderId,
        toHolderType: CUSTODY_HOLDER_TYPES.VENDOR,
        toHolderId: vendorId,
        type: HANDOVER_TYPES.TECHNICIAN_TO_VENDOR,
        currentLocation: data.currentLocation || vendor.name,
        notes: data.dispatchNotes,
        metadata: {
          ...(data.metadata || {}),
          vendorRepairJobId: job.id,
          previousTicketStatus: ticket.status,
          workflowTransition,
        },
      },
      select: {
        id: true,
        handedOverAt: true,
      },
    });

    await tx.repairTicket.update({
      where: {
        id: ticketId,
      },
      data: {
        vendorId,
        currentHolderType: CUSTODY_HOLDER_TYPES.VENDOR,
        currentHolderId: vendorId,
        currentLocation: data.currentLocation || vendor.name,
        lastHandoverAt: handover.handedOverAt,
      },
    });

    return {
      outcome: "DISPATCHED",
      job: await hydrateVendorRepairJob(tx, businessId, job.id),
    };
  });

const listVendorRepairJobs = async ({ businessId, query }) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const where = buildVendorJobWhere(businessId, query);

  const [jobs, total] = await Promise.all([
    prisma.vendorRepairJob.findMany({
      where,
      select: listVendorRepairJobSelect,
      orderBy: [
        {
          expectedReturnAt: "asc",
        },
        {
          dispatchedAt: "desc",
        },
      ],
      skip,
      take: limit,
    }),
    prisma.vendorRepairJob.count({ where }),
  ]);

  return {
    jobs,
    total,
  };
};

const updateVendorRepairStatus = ({ businessId, jobId, actorStaffId, data }) =>
  prisma.$transaction(async (tx) => {
    const job = await tx.vendorRepairJob.findFirst({
      where: {
        id: jobId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!job) {
      return { outcome: "JOB_NOT_FOUND" };
    }

    const now = new Date();

    await tx.vendorRepairJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: data.status,
        vendorDiagnosis: data.vendorDiagnosis,
        vendorResolution: data.vendorResolution,
        completedAt: data.status === VENDOR_REPAIR_STATUSES.COMPLETED ? now : undefined,
        cancelledAt: data.status === VENDOR_REPAIR_STATUSES.CANCELLED ? now : undefined,
        notes: data.notes,
        metadata: data.metadata,
      },
    });

    await tx.vendorRepairStatusLog.create({
      data: {
        businessId,
        vendorRepairJobId: jobId,
        actorStaffId,
        previousStatus: job.status,
        nextStatus: data.status,
        notes: data.notes,
        metadata: data.metadata,
      },
    });

    return {
      outcome: "UPDATED",
      job: await hydrateVendorRepairJob(tx, businessId, jobId),
    };
  });

const receiveVendorRepair = ({ businessId, jobId, actorStaffId, data, workflowTransition }) =>
  prisma.$transaction(async (tx) => {
    const job = await tx.vendorRepairJob.findFirst({
      where: {
        id: jobId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        vendorId: true,
        repairTicketId: true,
        ticket: {
          select: ticketSummarySelect,
        },
        vendor: {
          select: vendorSelect,
        },
      },
    });

    if (!job) {
      return { outcome: "JOB_NOT_FOUND" };
    }

    if ([VENDOR_REPAIR_STATUSES.RETURNED, VENDOR_REPAIR_STATUSES.CANCELLED].includes(job.status)) {
      return { outcome: "INVALID_JOB_STATUS" };
    }

    if (workflowTransition) {
      const updatedTicket = await tx.repairTicket.updateMany({
        where: {
          id: job.repairTicketId,
          businessId,
          status: workflowTransition.fromStatus,
          deletedAt: null,
        },
        data: {
          status: workflowTransition.toStatus,
        },
      });

      if (updatedTicket.count !== 1) {
        return { outcome: "WORKFLOW_CONFLICT" };
      }

      await tx.repairStatusLog.create({
        data: {
          businessId,
          repairTicketId: job.repairTicketId,
          actorStaffId,
          fromStatus: workflowTransition.fromStatus,
          toStatus: workflowTransition.toStatus,
          reason: workflowTransition.reason,
          metadata: data.metadata,
        },
      });
    }

    const now = new Date();

    await tx.vendorRepairJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: VENDOR_REPAIR_STATUSES.RETURNED,
        vendorResolution: data.vendorResolution,
        returnedAt: now,
        notes: data.notes,
        metadata: data.metadata,
      },
    });

    await tx.vendorRepairStatusLog.create({
      data: {
        businessId,
        vendorRepairJobId: jobId,
        actorStaffId,
        previousStatus: job.status,
        nextStatus: VENDOR_REPAIR_STATUSES.RETURNED,
        notes: data.notes,
        metadata: data.metadata,
      },
    });

    const handover = await tx.repairTicketHandover.create({
      data: {
        businessId,
        repairTicketId: job.repairTicketId,
        vendorId: job.vendorId,
        actorStaffId,
        fromHolderType: CUSTODY_HOLDER_TYPES.VENDOR,
        fromHolderId: job.vendorId,
        toHolderType: CUSTODY_HOLDER_TYPES.RECEPTION,
        toHolderId: null,
        type: HANDOVER_TYPES.VENDOR_TO_RECEPTION,
        currentLocation: data.currentLocation,
        notes: data.notes,
        metadata: {
          ...(data.metadata || {}),
          vendorRepairJobId: jobId,
          previousTicketStatus: job.ticket.status,
          workflowTransition,
        },
      },
      select: {
        id: true,
        handedOverAt: true,
      },
    });

    await tx.repairTicket.update({
      where: {
        id: job.repairTicketId,
      },
      data: {
        currentHolderType: CUSTODY_HOLDER_TYPES.RECEPTION,
        currentHolderId: null,
        currentLocation: data.currentLocation,
        lastHandoverAt: handover.handedOverAt,
      },
    });

    return {
      outcome: "RECEIVED",
      job: await hydrateVendorRepairJob(tx, businessId, jobId),
    };
  });

const recordVendorRepairCost = ({ businessId, jobId, actorStaffId, data }) =>
  prisma.$transaction(async (tx) => {
    const job = await tx.vendorRepairJob.findFirst({
      where: {
        id: jobId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        costStatus: true,
        estimatedCost: true,
        approvedCost: true,
        finalCost: true,
      },
    });

    if (!job) {
      return { outcome: "JOB_NOT_FOUND" };
    }

    await tx.vendorRepairJob.update({
      where: {
        id: jobId,
      },
      data: {
        estimatedCost: data.estimatedCost,
        approvedCost: data.approvedCost,
        finalCost: data.finalCost,
        costStatus: data.costStatus,
        notes: data.notes,
        metadata: data.metadata,
      },
    });

    await tx.vendorRepairCostLog.create({
      data: {
        businessId,
        vendorRepairJobId: jobId,
        actorStaffId,
        previousEstimatedCost: job.estimatedCost,
        estimatedCost: data.estimatedCost,
        previousApprovedCost: job.approvedCost,
        approvedCost: data.approvedCost,
        previousFinalCost: job.finalCost,
        finalCost: data.finalCost,
        previousCostStatus: job.costStatus,
        nextCostStatus: data.costStatus,
        notes: data.notes,
        metadata: data.metadata,
      },
    });

    return {
      outcome: "COST_RECORDED",
      job: await hydrateVendorRepairJob(tx, businessId, jobId),
    };
  });

module.exports = {
  createVendor,
  listVendors,
  findVendorById,
  updateVendor,
  findTicketForVendorRepair,
  findVendorRepairJobById,
  dispatchVendorRepair,
  listVendorRepairJobs,
  updateVendorRepairStatus,
  receiveVendorRepair,
  recordVendorRepairCost,
};
