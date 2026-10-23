import { describe, expect, it } from "vitest";
import { f1, f1DelayedSnapshot, f1Snapshot } from "@/fixtures/demo";
import { evaluateProactivity } from "./proactivity";

describe("proactivity evaluator", () => {
  it("reports the exact minimum and interval for delayed F1 cash", () => {
    const result = evaluateProactivity({ snapshot: f1DelayedSnapshot, now: "2026-10-26T12:00:00.000Z", origin: "user" });
    expect(result.proposals[0]).toMatchObject({ kind: "simulate", arguments: { start_date: "2026-10-27", end_date: "2026-10-31", minimum_balance_cents: -50000 } });
  });
  it("produces no negative-cash proposal for the base F1 snapshot", () => {
    expect(evaluateProactivity({ snapshot: f1Snapshot, now: "2026-10-23T12:00:00.000Z", origin: "user" }).proposals).toEqual([]);
  });
  it("returns no scheduled notifications during a user conversation", () => {
    expect(evaluateProactivity({ snapshot: f1DelayedSnapshot, now: "2026-10-26T12:00:00.000Z", origin: "user" }).notifications).toEqual([]);
  });
  it("limits initiatives to three even when several intervals exist", () => {
    const snapshot = { ...f1DelayedSnapshot, negative_intervals: [...f1DelayedSnapshot.negative_intervals, ...f1DelayedSnapshot.negative_intervals,
      ...f1DelayedSnapshot.negative_intervals] };
    expect(evaluateProactivity({ snapshot, now: "2026-10-26T12:00:00.000Z", origin: "task" }).proposals).toHaveLength(3);
  });
  it("does not repeat an initiative already present in the conversation", () => {
    const initial = evaluateProactivity({ snapshot: f1DelayedSnapshot, now: "2026-10-26T12:00:00.000Z", origin: "user" });
    expect(evaluateProactivity({ snapshot: f1DelayedSnapshot, now: "2026-10-26T12:00:00.000Z", origin: "user", existing: initial.proposals }).proposals).toEqual([]);
  });

  it("orders multiple negative intervals by their start date", () => {
    const snapshot = { ...f1DelayedSnapshot, negative_intervals: [
      { start_date: "2026-11-03", end_date: "2026-11-04" }, { start_date: "2026-10-27", end_date: "2026-10-31" },
    ] };
    expect(evaluateProactivity({ snapshot, now: "2026-10-26T12:00:00.000Z", origin: "user" }).proposals.map((proposal) => proposal.arguments.start_date))
      .toEqual(["2026-10-27", "2026-11-03"]);
  });

  it("drafts collection text from the overdue receivable facts without sending it", () => {
    const snapshot = { ...f1Snapshot, uncertain_receivables: [f1.transactions[0]] };
    const result = evaluateProactivity({ snapshot, now: "2026-10-26T12:00:00.000Z", origin: "user" });
    expect(result.proposals[0]).toMatchObject({ kind: "draft_collection", target_id: "rec-1",
      arguments: { amount_cents: 200000, counterparty: "Cliente Ana" } });
    expect(result.proposals[0].arguments.message).toContain("R$ 2000.00");
    expect(result.notifications).toEqual([]);
  });

  it("creates a rule-based internal notice for task-origin proposals", () => {
    const snapshot = { ...f1Snapshot, uncertain_receivables: [f1.transactions[0]] };
    const result = evaluateProactivity({ snapshot, now: "2026-10-26T12:00:00.000Z", origin: "task" });
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].proposal_ids).toEqual(["collection:rec-1:1"]);
  });
});
