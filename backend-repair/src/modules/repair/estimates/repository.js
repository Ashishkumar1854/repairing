const prisma = require("../../../core/database/prisma");

const staffSummarySelect = {
  id: true,
  fullName: true,
  role: true,
};

const estimateSelect = {
  id: true,
  businessId: true,
  repairTicketId: true,
  estimateNumber: true,
  status: true,
  subtotalAmount: true,
  laborAmount: true,
  partsAmount: true,
  discountAmount: true,
  taxAmount: true,
  totalAmount: true,
  validUntil: true,
  approvedAt: true,
  rejectedAt: true,
  notes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  ticket: {
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      priority: true,
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
    },
  },
  createdBy: {
    select: staffSummarySelect,
  },
  approvedBy: {
    select: staffSummarySelect,
  },
  rejectedBy: {
    select: staffSummarySelect,
  },
  items: {
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      itemType: true,
      name: true,
      description: true,
      sku: true,
      inventoryRef: true,
      quantity: true,
      unitAmount: true,
      totalAmount: true,
      metadata: true,
      createdAt: true,
    },
  },
  auditLogs: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      action: true,
      previousStatus: true,
      nextStatus: true,
      notes: true,
      metadata: true,
      createdAt: true,
      actor: {
        select: staffSummarySelect,
      },
    },
  },
};

const findTicketForEstimate = (businessId, ticketId) =>
  prisma.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      deletedAt: null,
    },
    select: {
      id: true,
      businessId: true,
      status: true,
      ticketNumber: true,
    },
  });

const findEstimateById = (businessId, estimateId) =>
  prisma.repairEstimate.findFirst({
    where: {
      id: estimateId,
      businessId,
      deletedAt: null,
    },
    select: estimateSelect,
  });

const createEstimateWithWorkflow = ({
  businessId,
  ticketId,
  actorStaffId,
  estimateNumber,
  diagnosis,
  estimate,
  workflowTransitions,
  technicianNotes,
}) =>
  prisma.$transaction(async (tx) => {
    const ticket = await tx.repairTicket.findFirst({
      where: {
        id: ticketId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!ticket) {
      return { outcome: "TICKET_NOT_FOUND" };
    }

    let currentStatus = ticket.status;

    for (const transition of workflowTransitions) {
      const updateResult = await tx.repairTicket.updateMany({
        where: {
          id: ticketId,
          businessId,
          status: currentStatus,
          deletedAt: null,
        },
        data: {
          status: transition.toStatus,
        },
      });

      if (updateResult.count !== 1) {
        return { outcome: "WORKFLOW_CONFLICT" };
      }

      await tx.repairStatusLog.create({
        data: {
          businessId,
          repairTicketId: ticketId,
          actorStaffId,
          fromStatus: currentStatus,
          toStatus: transition.toStatus,
          reason: transition.reason,
          metadata: transition.metadata,
        },
      });

      currentStatus = transition.toStatus;
    }

    await tx.repairDiagnosis.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        diagnosedByStaffId: actorStaffId,
        diagnosis: diagnosis.diagnosis,
        estimatedRepairNotes: diagnosis.estimatedRepairNotes,
        estimatedTurnaroundHours: diagnosis.estimatedTurnaroundHours,
        internalNotes: diagnosis.internalNotes,
        metadata: diagnosis.metadata,
      },
    });

    if (technicianNotes.length > 0) {
      await tx.repairNote.createMany({
        data: technicianNotes.map((note) => ({
          businessId,
          repairTicketId: ticketId,
          createdById: actorStaffId,
          note: note.note,
          isInternal: note.isInternal,
          metadata: note.metadata,
        })),
      });
    }

    const createdEstimate = await tx.repairEstimate.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        createdById: actorStaffId,
        estimateNumber,
        status: estimate.status,
        subtotalAmount: estimate.subtotalAmount,
        laborAmount: estimate.laborAmount,
        partsAmount: estimate.partsAmount,
        discountAmount: estimate.discountAmount,
        taxAmount: estimate.taxAmount,
        totalAmount: estimate.totalAmount,
        validUntil: estimate.validUntil,
        notes: estimate.notes,
        metadata: estimate.metadata,
        items: {
          create: estimate.items.map((item) => ({
            businessId,
            itemType: item.itemType,
            name: item.name,
            description: item.description,
            sku: item.sku,
            inventoryRef: item.inventoryRef,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            totalAmount: item.totalAmount,
            metadata: item.metadata,
          })),
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    await tx.repairEstimateAuditLog.create({
      data: {
        businessId,
        repairEstimateId: createdEstimate.id,
        actorStaffId,
        action: "ESTIMATE_CREATED",
        previousStatus: null,
        nextStatus: createdEstimate.status,
        notes: estimate.notes,
        metadata: {
          subtotalAmount: estimate.subtotalAmount,
          discountAmount: estimate.discountAmount,
          taxAmount: estimate.taxAmount,
          totalAmount: estimate.totalAmount,
        },
      },
    });

    const hydratedEstimate = await tx.repairEstimate.findFirst({
      where: {
        id: createdEstimate.id,
        businessId,
      },
      select: estimateSelect,
    });

    return {
      outcome: "CREATED",
      estimate: hydratedEstimate,
    };
  });

const approveEstimate = ({
  businessId,
  estimateId,
  actorStaffId,
  previousStatus,
  notes,
  metadata,
  workflowTransition,
}) =>
  prisma.$transaction(async (tx) => {
    const estimate = await tx.repairEstimate.findFirst({
      where: {
        id: estimateId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        repairTicketId: true,
        status: true,
        validUntil: true,
        ticket: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!estimate) {
      return { outcome: "ESTIMATE_NOT_FOUND" };
    }

    if (estimate.status !== previousStatus) {
      return { outcome: "ESTIMATE_STATUS_CONFLICT" };
    }

    const now = new Date();
    const updateEstimateResult = await tx.repairEstimate.updateMany({
      where: {
        id: estimateId,
        businessId,
        status: previousStatus,
        deletedAt: null,
      },
      data: {
        status: "APPROVED",
        approvedById: actorStaffId,
        approvedAt: now,
      },
    });

    if (updateEstimateResult.count !== 1) {
      return { outcome: "ESTIMATE_STATUS_CONFLICT" };
    }

    const updateTicketResult = await tx.repairTicket.updateMany({
      where: {
        id: estimate.repairTicketId,
        businessId,
        status: workflowTransition.fromStatus,
        deletedAt: null,
      },
      data: {
        status: workflowTransition.toStatus,
      },
    });

    if (updateTicketResult.count !== 1) {
      return { outcome: "WORKFLOW_CONFLICT" };
    }

    await tx.repairStatusLog.create({
      data: {
        businessId,
        repairTicketId: estimate.repairTicketId,
        actorStaffId,
        fromStatus: workflowTransition.fromStatus,
        toStatus: workflowTransition.toStatus,
        reason: "Estimate approved",
        metadata,
      },
    });

    await tx.repairEstimateAuditLog.create({
      data: {
        businessId,
        repairEstimateId: estimateId,
        actorStaffId,
        action: "ESTIMATE_APPROVED",
        previousStatus,
        nextStatus: "APPROVED",
        notes,
        metadata,
      },
    });

    const hydratedEstimate = await tx.repairEstimate.findFirst({
      where: {
        id: estimateId,
        businessId,
      },
      select: estimateSelect,
    });

    return {
      outcome: "APPROVED",
      estimate: hydratedEstimate,
    };
  });

const rejectEstimate = ({
  businessId,
  estimateId,
  actorStaffId,
  previousStatus,
  notes,
  metadata,
  workflowTransition,
}) =>
  prisma.$transaction(async (tx) => {
    const estimate = await tx.repairEstimate.findFirst({
      where: {
        id: estimateId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        repairTicketId: true,
        status: true,
      },
    });

    if (!estimate) {
      return { outcome: "ESTIMATE_NOT_FOUND" };
    }

    if (estimate.status !== previousStatus) {
      return { outcome: "ESTIMATE_STATUS_CONFLICT" };
    }

    const now = new Date();
    const updateEstimateResult = await tx.repairEstimate.updateMany({
      where: {
        id: estimateId,
        businessId,
        status: previousStatus,
        deletedAt: null,
      },
      data: {
        status: "REJECTED",
        rejectedById: actorStaffId,
        rejectedAt: now,
      },
    });

    if (updateEstimateResult.count !== 1) {
      return { outcome: "ESTIMATE_STATUS_CONFLICT" };
    }

    const updateTicketResult = await tx.repairTicket.updateMany({
      where: {
        id: estimate.repairTicketId,
        businessId,
        status: workflowTransition.fromStatus,
        deletedAt: null,
      },
      data: {
        status: workflowTransition.toStatus,
      },
    });

    if (updateTicketResult.count !== 1) {
      return { outcome: "WORKFLOW_CONFLICT" };
    }

    await tx.repairStatusLog.create({
      data: {
        businessId,
        repairTicketId: estimate.repairTicketId,
        actorStaffId,
        fromStatus: workflowTransition.fromStatus,
        toStatus: workflowTransition.toStatus,
        reason: "Estimate rejected",
        metadata,
      },
    });

    await tx.repairEstimateAuditLog.create({
      data: {
        businessId,
        repairEstimateId: estimateId,
        actorStaffId,
        action: "ESTIMATE_REJECTED",
        previousStatus,
        nextStatus: "REJECTED",
        notes,
        metadata,
      },
    });

    const hydratedEstimate = await tx.repairEstimate.findFirst({
      where: {
        id: estimateId,
        businessId,
      },
      select: estimateSelect,
    });

    return {
      outcome: "REJECTED",
      estimate: hydratedEstimate,
    };
  });

module.exports = {
  findTicketForEstimate,
  findEstimateById,
  createEstimateWithWorkflow,
  approveEstimate,
  rejectEstimate,
};
