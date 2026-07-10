import assert from "node:assert/strict";
import test from "node:test";
import { MonitoringAppointmentStatus, MonitoringOutcome, MonitoringProgram } from "@prisma/client";
import { calculateMonitoringMetrics, percentage } from "../lib/monitoring.ts";

test("percentage rondt normaal af op één decimaal", () => {
  assert.equal(percentage(236, 249), 94.8);
  assert.equal(percentage(0, 0), 0);
});

test("monitoringmetrics leiden KPI's af uit bronregistraties", () => {
  const records = [
    {
      participantId: "patient-a",
      referralDate: new Date("2026-07-01T12:00:00Z"),
      scheduledAt: new Date("2026-07-08T12:00:00Z"),
      status: MonitoringAppointmentStatus.ATTENDED,
      outcome: MonitoringOutcome.ONE_OFF_PHYSIO,
      feedbackSentAt: new Date("2026-07-08T12:00:00Z"),
      program: MonitoringProgram.MOVEMENT,
    },
    {
      participantId: "patient-a",
      referralDate: new Date("2026-07-01T12:00:00Z"),
      scheduledAt: new Date("2026-07-09T12:00:00Z"),
      status: MonitoringAppointmentStatus.ATTENDED,
      outcome: MonitoringOutcome.RETURN_TO_GP,
      feedbackSentAt: null,
      program: MonitoringProgram.MOVEMENT,
    },
    {
      participantId: "patient-b",
      referralDate: new Date("2026-07-03T12:00:00Z"),
      scheduledAt: new Date("2026-07-05T12:00:00Z"),
      status: MonitoringAppointmentStatus.NO_SHOW,
      outcome: null,
      feedbackSentAt: null,
      program: MonitoringProgram.SOCIAL,
    },
    {
      participantId: "patient-c",
      referralDate: new Date("2026-07-03T12:00:00Z"),
      scheduledAt: new Date("2026-07-06T12:00:00Z"),
      status: MonitoringAppointmentStatus.CANCELLED,
      outcome: null,
      feedbackSentAt: null,
      program: MonitoringProgram.SOCIAL,
    },
  ];

  const metrics = calculateMonitoringMetrics(records, 6);
  assert.equal(metrics.uniquePatients, 1);
  assert.equal(metrics.attended, 2);
  assert.equal(metrics.noShows, 1);
  assert.equal(metrics.cancelled, 1);
  assert.equal(metrics.withinSevenDays, 1);
  assert.equal(metrics.withinSevenDaysPercentage, 50);
  assert.equal(metrics.noShowPercentage, 33.3);
  assert.equal(metrics.feedbackPercentage, 50);
  assert.equal(metrics.oneOffMovementPercentage, 50);
  assert.equal(metrics.openSlots, 3);
});
