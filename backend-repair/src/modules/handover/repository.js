const prisma = require("../../core/database/prisma");
const { TICKET_STATUSES } = require("../repair/constants");
const { TECHNICIAN_ACTIVITY_TYPES } = require("../assignments/constants");

const ticketSelect = {
  id: true,
  businessId: true,
  branchId: true,
  customerId: true,
  vendorId: true,
  ticketNumber: true,
  title: true,
  status: true,
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

const handoverSelect = {
  id: true,
  branchId: true,
  repairTicketId: true,
  type: true,
  fromHolderType: true,
  fromHolderId: true,
  toHolderType: true,
  toHolderId: true,
  vendorId: true,
  currentLocation: true,
  receiverName: true,
  verificationToken: true,
  notes: true,
  metadata: true,
  handedOverAt: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
  vendor: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
};

const withBranchFilter = (where, branchFilter = {}) => {
  if (branchFilter.branchId) {
    return {
      ...where,
      branchId: branchFilter.branchId,
    };
  }

  return where;
};

const findTicket = (businessId, ticketId, branchFilter = {}) =>
  prisma.repairTicket.findFirst({
    where: withBranchFilter({
      id: ticketId,
      businessId,
      deletedAt: null,
    }, branchFilter),
    select: ticketSelect,
  });

const findStaff = (businessId, staffId, branchId = null) =>
  prisma.staffMember.findFirst({
    where: {
      id: staffId,
      businessId,
      ...(branchId ? { branchId } : {}),
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      branchId: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

const findVendor = (businessId, vendorId) =>
  prisma.vendor.findFirst({
    where: {
      id: vendorId,
      businessId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

const findActiveAssignment = (client, businessId, ticketId, branchId = null) =>
  client.repairAssignment.findFirst({
    where: {
      businessId,
      ...(branchId ? { branchId } : {}),
      repairTicketId: ticketId,
      deletedAt: null,
      completedAt: null,
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "PAUSED"],
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
    select: {
      id: true,
      assignedToStaffId: true,
      status: true,
    },
  });

const isTechnicianAssigned = async (businessId, ticketId, technicianId, branchId = null) => {
  const assignment = await findActiveAssignment(prisma, businessId, ticketId, branchId);
  return assignment?.assignedToStaffId === technicianId;
};

const createHandover = ({
  businessId,
  branchFilter = {},
  ticketId,
  actorStaffId,
  transfer,
  workflowTransition,
  workflowTransitions,
  activityTechnicianId,
}) =>
  prisma.$transaction(async (tx) => {
    const ticket = await tx.repairTicket.findFirst({
      where: withBranchFilter({
        id: ticketId,
        businessId,
        deletedAt: null,
      }, branchFilter),
      select: {
        ...ticketSelect,
        assignments: {
          where: {
            deletedAt: null,
            completedAt: null,
            status: {
              in: ["ASSIGNED", "IN_PROGRESS", "PAUSED"],
            },
          },
          orderBy: {
            assignedAt: "desc",
          },
          take: 1,
          select: {
            assignedToStaffId: true,
          },
        },
      },
    });

    if (!ticket) {
      return { outcome: "TICKET_NOT_FOUND" };
    }

    let ticketStatus = ticket.status;
    const transitions = workflowTransitions || (workflowTransition ? [workflowTransition] : []);

    for (const transition of transitions) {
      const updated = await tx.repairTicket.updateMany({
        where: {
          id: ticketId,
          businessId,
          branchId: ticket.branchId,
          status: transition.fromStatus,
          deletedAt: null,
        },
        data: {
          status: transition.toStatus,
          closedAt:
            transition.toStatus === TICKET_STATUSES.CLOSED ? new Date() : undefined,
        },
      });

      if (updated.count !== 1) {
        return { outcome: "WORKFLOW_CONFLICT" };
      }

      await tx.repairStatusLog.create({
        data: {
          businessId,
          repairTicketId: ticketId,
          actorStaffId,
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus,
          reason: transition.reason,
          metadata: transfer.metadata,
        },
      });

      ticketStatus = transition.toStatus;
    }

    const handover = await tx.repairTicketHandover.create({
      data: {
        businessId,
        branchId: ticket.branchId,
        repairTicketId: ticketId,
        vendorId: transfer.vendorId,
        actorStaffId,
        fromHolderType: transfer.fromHolderType,
        fromHolderId: transfer.fromHolderId,
        toHolderType: transfer.toHolderType,
        toHolderId: transfer.toHolderId,
        type: transfer.type,
        currentLocation: transfer.currentLocation,
        receiverName: transfer.receiverName,
        verificationToken: transfer.verificationToken,
        notes: transfer.notes,
        metadata: transfer.metadata,
      },
      select: handoverSelect,
    });

    const updatedTicket = await tx.repairTicket.update({
      where: {
        id: ticketId,
      },
      data: {
        currentHolderType: transfer.toHolderType,
        currentHolderId: transfer.toHolderId,
        currentLocation: transfer.currentLocation,
        lastHandoverAt: handover.handedOverAt,
        vendorId: transfer.vendorId || undefined,
      },
      select: ticketSelect,
    });

    if (activityTechnicianId) {
      await tx.repairTechnicianActivityLog.create({
        data: {
          businessId,
          branchId: ticket.branchId,
          repairTicketId: ticketId,
          technicianId: activityTechnicianId,
          actorStaffId,
          type: TECHNICIAN_ACTIVITY_TYPES.REPAIR_PAUSED,
          notes: transfer.notes,
          metadata: {
            ...(transfer.metadata || {}),
            handoverId: handover.id,
            handoverType: transfer.type,
            fromHolderType: transfer.fromHolderType,
            toHolderType: transfer.toHolderType,
          },
        },
      });
    }

    return {
      outcome: "CREATED",
      handover,
      ticket: updatedTicket,
      ticketStatus,
    };
  });

const listTicketHandovers = async (businessId, ticketId, branchFilter = {}) => {
  const ticket = await findTicket(businessId, ticketId, branchFilter);

  if (!ticket) {
    return null;
  }

  const handovers = await prisma.repairTicketHandover.findMany({
    where: {
      businessId,
      branchId: ticket.branchId,
      repairTicketId: ticketId,
    },
    orderBy: {
      handedOverAt: "asc",
    },
    select: handoverSelect,
  });

  return {
    ticket,
    handovers,
  };
};

module.exports = {
  findTicket,
  findStaff,
  findVendor,
  findActiveAssignment,
  isTechnicianAssigned,
  createHandover,
  listTicketHandovers,
};
