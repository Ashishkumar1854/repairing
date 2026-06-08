const prisma = require("../../core/database/prisma");
const { TICKET_STATUSES } = require("../repair/constants");
const {
  ASSIGNMENT_EVENT_TYPES,
  TECHNICIAN_ACTIVITY_TYPES,
} = require("./constants");

const activeAssignmentStatuses = ["ASSIGNED", "IN_PROGRESS", "PAUSED"];
const terminalTicketStatuses = [
  TICKET_STATUSES.DELIVERED,
  TICKET_STATUSES.CANCELLED,
  TICKET_STATUSES.CLOSED,
];

const technicianSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
};

const assignmentSelect = {
  id: true,
  repairTicketId: true,
  assignedToStaffId: true,
  assignedByStaffId: true,
  status: true,
  assignedAt: true,
  completedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: technicianSelect,
  },
  assignedBy: {
    select: technicianSelect,
  },
};

const assignmentHistorySelect = {
  id: true,
  repairTicketId: true,
  type: true,
  reason: true,
  notes: true,
  metadata: true,
  assignedAt: true,
  unassignedAt: true,
  createdAt: true,
  assignedTo: {
    select: technicianSelect,
  },
  previousAssignedTo: {
    select: technicianSelect,
  },
  assignedBy: {
    select: technicianSelect,
  },
};

const ticketQueueSelect = {
  id: true,
  ticketNumber: true,
  title: true,
  status: true,
  priority: true,
  paymentStatus: true,
  dueAt: true,
  receivedAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
    },
  },
  estimates: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: {
      id: true,
      estimateNumber: true,
      status: true,
      totalAmount: true,
      validUntil: true,
    },
  },
};

const priorityRank = {
  URGENT: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

const findTicket = (client, businessId, ticketId) =>
  client.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      ticketNumber: true,
      priority: true,
      dueAt: true,
    },
  });

const findTechnician = (client, businessId, technicianId) =>
  client.staffMember.findFirst({
    where: {
      id: technicianId,
      businessId,
      deletedAt: null,
    },
    select: technicianSelect,
  });

const findActiveAssignment = (client, businessId, ticketId) =>
  client.repairAssignment.findFirst({
    where: {
      businessId,
      repairTicketId: ticketId,
      deletedAt: null,
      completedAt: null,
      status: {
        in: activeAssignmentStatuses,
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
    select: assignmentSelect,
  });

const createActivityLog = (client, data) =>
  client.repairTechnicianActivityLog.create({
    data,
  });

const createAssignment = ({
  businessId,
  ticketId,
  technicianId,
  actorStaffId,
  notes,
  metadata,
  shouldStartDiagnosis,
}) =>
  prisma.$transaction(async (tx) => {
    const [ticket, technician, activeAssignment] = await Promise.all([
      findTicket(tx, businessId, ticketId),
      findTechnician(tx, businessId, technicianId),
      findActiveAssignment(tx, businessId, ticketId),
    ]);

    if (!ticket) {
      return { outcome: "TICKET_NOT_FOUND" };
    }

    if (terminalTicketStatuses.includes(ticket.status)) {
      return { outcome: "INVALID_TICKET_STATUS" };
    }

    if (!technician) {
      return { outcome: "TECHNICIAN_NOT_FOUND" };
    }

    if (!technician.isActive) {
      return { outcome: "TECHNICIAN_INACTIVE" };
    }

    if (technician.role !== "TECHNICIAN") {
      return { outcome: "INVALID_TECHNICIAN_ROLE" };
    }

    if (activeAssignment?.assignedToStaffId === technicianId) {
      return { outcome: "ALREADY_ASSIGNED", assignment: activeAssignment };
    }

    if (activeAssignment) {
      return { outcome: "ACTIVE_ASSIGNMENT_EXISTS", assignment: activeAssignment };
    }

    let ticketStatus = ticket.status;

    if (shouldStartDiagnosis && ticket.status === TICKET_STATUSES.RECEIVED) {
      const updatedTicket = await tx.repairTicket.updateMany({
        where: {
          id: ticketId,
          businessId,
          status: TICKET_STATUSES.RECEIVED,
          deletedAt: null,
        },
        data: {
          status: TICKET_STATUSES.DIAGNOSING,
        },
      });

      if (updatedTicket.count !== 1) {
        return { outcome: "STATUS_CONFLICT" };
      }

      await tx.repairStatusLog.create({
        data: {
          businessId,
          repairTicketId: ticketId,
          actorStaffId,
          fromStatus: TICKET_STATUSES.RECEIVED,
          toStatus: TICKET_STATUSES.DIAGNOSING,
          reason: "Technician assignment started diagnosis workflow",
          metadata,
        },
      });

      ticketStatus = TICKET_STATUSES.DIAGNOSING;
    }

    const assignment = await tx.repairAssignment.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        assignedToStaffId: technicianId,
        assignedByStaffId: actorStaffId,
        status: "ASSIGNED",
        notes,
      },
      select: assignmentSelect,
    });

    const history = await tx.repairTicketAssignment.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        assignedToStaffId: technicianId,
        assignedByStaffId: actorStaffId,
        type: ASSIGNMENT_EVENT_TYPES.ASSIGNED,
        notes,
        metadata,
      },
      select: assignmentHistorySelect,
    });

    await createActivityLog(tx, {
      businessId,
      repairTicketId: ticketId,
      technicianId,
      actorStaffId,
      type: TECHNICIAN_ACTIVITY_TYPES.ASSIGNMENT_CREATED,
      notes,
      metadata,
    });

    return {
      outcome: "ASSIGNED",
      assignment,
      history,
      ticketStatus,
    };
  });

const reassignTicket = ({
  businessId,
  ticketId,
  technicianId,
  actorStaffId,
  reason,
  notes,
  metadata,
}) =>
  prisma.$transaction(async (tx) => {
    const [ticket, technician, activeAssignment] = await Promise.all([
      findTicket(tx, businessId, ticketId),
      findTechnician(tx, businessId, technicianId),
      findActiveAssignment(tx, businessId, ticketId),
    ]);

    if (!ticket) {
      return { outcome: "TICKET_NOT_FOUND" };
    }

    if (terminalTicketStatuses.includes(ticket.status)) {
      return { outcome: "INVALID_TICKET_STATUS" };
    }

    if (!technician) {
      return { outcome: "TECHNICIAN_NOT_FOUND" };
    }

    if (!technician.isActive) {
      return { outcome: "TECHNICIAN_INACTIVE" };
    }

    if (technician.role !== "TECHNICIAN") {
      return { outcome: "INVALID_TECHNICIAN_ROLE" };
    }

    if (!activeAssignment) {
      return { outcome: "ACTIVE_ASSIGNMENT_NOT_FOUND" };
    }

    if (activeAssignment.assignedToStaffId === technicianId) {
      return { outcome: "ALREADY_ASSIGNED", assignment: activeAssignment };
    }

    const unassignedAt = new Date();

    await tx.repairAssignment.update({
      where: {
        id: activeAssignment.id,
      },
      data: {
        status: "REASSIGNED",
        completedAt: unassignedAt,
      },
    });

    const assignment = await tx.repairAssignment.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        assignedToStaffId: technicianId,
        assignedByStaffId: actorStaffId,
        status: "ASSIGNED",
        notes,
      },
      select: assignmentSelect,
    });

    const history = await tx.repairTicketAssignment.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        assignedToStaffId: technicianId,
        previousAssignedToStaffId: activeAssignment.assignedToStaffId,
        assignedByStaffId: actorStaffId,
        type: ASSIGNMENT_EVENT_TYPES.REASSIGNED,
        reason,
        notes,
        metadata,
        unassignedAt,
      },
      select: assignmentHistorySelect,
    });

    await createActivityLog(tx, {
      businessId,
      repairTicketId: ticketId,
      technicianId,
      actorStaffId,
      type: TECHNICIAN_ACTIVITY_TYPES.ASSIGNMENT_REASSIGNED,
      notes: reason,
      metadata: {
        ...(metadata || {}),
        previousTechnicianId: activeAssignment.assignedToStaffId,
      },
    });

    return {
      outcome: "REASSIGNED",
      assignment,
      history,
      previousAssignment: activeAssignment,
      ticketStatus: ticket.status,
    };
  });

const listAssignmentHistory = (businessId, ticketId) =>
  prisma.repairTicketAssignment.findMany({
    where: {
      businessId,
      repairTicketId: ticketId,
    },
    select: assignmentHistorySelect,
    orderBy: {
      assignedAt: "desc",
    },
  });

const findTicketForHistory = (businessId, ticketId) =>
  prisma.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      deletedAt: null,
    },
    select: {
      id: true,
      ticketNumber: true,
    },
  });

const isTechnicianAssignedToTicket = async (businessId, technicianId, ticketId) => {
  const assignment = await prisma.repairAssignment.findFirst({
    where: {
      businessId,
      repairTicketId: ticketId,
      assignedToStaffId: technicianId,
      completedAt: null,
      deletedAt: null,
      status: {
        in: activeAssignmentStatuses,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(assignment);
};

const buildQueueWhere = ({ businessId, technicianId, status, priority }) => {
  const where = {
    businessId,
    assignedToStaffId: technicianId,
    completedAt: null,
    deletedAt: null,
    status: {
      in: activeAssignmentStatuses,
    },
    ticket: {
      businessId,
      deletedAt: null,
      status: {
        notIn: terminalTicketStatuses,
      },
    },
  };

  if (status) {
    where.ticket.status = status;
  }

  if (priority) {
    where.ticket.priority = priority;
  }

  return where;
};

const applyQueueFilters = (assignments, query) => {
  const now = new Date();

  return assignments.filter((assignment) => {
    const ticket = assignment.ticket;

    if (query.waitingApproval && ticket.status !== TICKET_STATUSES.WAITING_APPROVAL) {
      return false;
    }

    if (query.waitingParts && ticket.status !== TICKET_STATUSES.WAITING_PARTS) {
      return false;
    }

    if (query.overdueOnly && (!ticket.dueAt || new Date(ticket.dueAt) >= now)) {
      return false;
    }

    return true;
  });
};

const sortQueueAssignments = (assignments, sort) => {
  const now = new Date();
  const isOverdue = (assignment) =>
    assignment.ticket.dueAt && new Date(assignment.ticket.dueAt) < now ? 1 : 0;

  return [...assignments].sort((a, b) => {
    if (sort === "overdue") {
      const overdueDiff = isOverdue(b) - isOverdue(a);
      if (overdueDiff !== 0) return overdueDiff;
    }

    if (sort === "due_at") {
      const aDue = a.ticket.dueAt ? new Date(a.ticket.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.ticket.dueAt ? new Date(b.ticket.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
    }

    if (sort === "priority") {
      const priorityDiff = priorityRank[b.ticket.priority] - priorityRank[a.ticket.priority];
      if (priorityDiff !== 0) return priorityDiff;
    }

    return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
  });
};

const getTechnicianQueue = async ({ businessId, technicianId, query }) => {
  const assignments = await prisma.repairAssignment.findMany({
    where: buildQueueWhere({
      businessId,
      technicianId,
      status: query.status,
      priority: query.priority,
    }),
    select: {
      id: true,
      status: true,
      assignedAt: true,
      notes: true,
      ticket: {
        select: ticketQueueSelect,
      },
    },
    orderBy: {
      assignedAt: "asc",
    },
  });

  const filtered = applyQueueFilters(assignments, query);
  const sorted = sortQueueAssignments(filtered, query.sort);
  const skip = (query.page - 1) * query.limit;

  return {
    assignments: sorted.slice(skip, skip + query.limit),
    total: sorted.length,
  };
};

const getTechnicianDashboard = async ({ businessId, technicianId }) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const activeWhere = buildQueueWhere({ businessId, technicianId });

  const [
    activeAssignments,
    waitingApprovalCount,
    inRepairCount,
    waitingPartsCount,
    completedToday,
    overdueTickets,
    consumptionSummary,
  ] = await prisma.$transaction([
    prisma.repairAssignment.count({ where: activeWhere }),
    prisma.repairAssignment.count({
      where: {
        ...activeWhere,
        ticket: {
          ...activeWhere.ticket,
          status: TICKET_STATUSES.WAITING_APPROVAL,
        },
      },
    }),
    prisma.repairAssignment.count({
      where: {
        ...activeWhere,
        ticket: {
          ...activeWhere.ticket,
          status: TICKET_STATUSES.IN_REPAIR,
        },
      },
    }),
    prisma.repairAssignment.count({
      where: {
        ...activeWhere,
        ticket: {
          ...activeWhere.ticket,
          status: TICKET_STATUSES.WAITING_PARTS,
        },
      },
    }),
    prisma.repairTechnicianActivityLog.count({
      where: {
        businessId,
        technicianId,
        type: TECHNICIAN_ACTIVITY_TYPES.REPAIR_COMPLETED,
        createdAt: {
          gte: startOfDay,
        },
      },
    }),
    prisma.repairAssignment.count({
      where: {
        ...activeWhere,
        ticket: {
          ...activeWhere.ticket,
          dueAt: {
            lt: now,
          },
        },
      },
    }),
    prisma.repairPartsUsage.aggregate({
      where: {
        businessId,
        technicianId,
        deletedAt: null,
      },
      _sum: {
        quantity: true,
        totalCost: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  return {
    activeAssignments,
    waitingApprovalCount,
    inRepairCount,
    waitingPartsCount,
    completedToday,
    overdueTickets,
    inventoryConsumption: {
      usageCount: consumptionSummary._count.id,
      totalQuantity: consumptionSummary._sum.quantity || "0.00",
      totalCost: consumptionSummary._sum.totalCost || "0.00",
    },
  };
};

module.exports = {
  createAssignment,
  reassignTicket,
  listAssignmentHistory,
  findTicketForHistory,
  isTechnicianAssignedToTicket,
  getTechnicianQueue,
  getTechnicianDashboard,
};
