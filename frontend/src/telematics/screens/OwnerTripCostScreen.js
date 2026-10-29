import React, { useEffect, useState } from "react";
import { AppText, Button, Card, TextField } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useManagerData } from "../context/ManagerDataContext";
import { Screen, Choice, RequestState } from "../components/FormControls";
import useOwnerRequest from "../hooks/useOwnerRequest";
import useOwnerWrite from "../hooks/useOwnerWrite";

export default function OwnerTripCostScreen({ navigation, route }) {
  const { user } = useAuth();
  const { service, branchId } = useManagerData();
  const branch = branchId === "all" ? undefined : branchId;
  const key = `${user._id}:${user.orgId?._id || user.orgId}:${branch || "all"}:${route.params.id}`;
  const request = useOwnerRequest(`${key}:trip-costs`, () =>
    service.ownerTripCosts(route.params.id, branch),
  );
  const write = useOwnerWrite(`${key}:cost-closure`);
  const [allocations, setAllocations] = useState([]);
  const [complete, setComplete] = useState(false);
  const [noHire, setNoHire] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const value = request.data?.row?.closure;
    setAllocations(
      (value?.allocations || []).map((a) => ({
        ...a,
        amount: String(a.amount),
      })),
    );
    setComplete(false);
    setNoHire(value?.noHireCost || false);
    setNote("");
    setMessage("");
  }, [key, request.data?.row?.closureVersion]);
  const locked = write.busy || !!write.draft;
  function change(index, field, value) {
    setAllocations((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }
  async function save() {
    setMessage("");
    if (
      !write.draft &&
      allocations.some(
        (a) =>
          !a.amount.trim() ||
          !Number.isFinite(Number(a.amount)) ||
          Number(a.amount) < 0 ||
          !a.evidence.trim(),
      )
    ) {
      setMessage(
        "Each allocation needs a non-negative amount and source evidence.",
      );
      return;
    }
    const result = await write.execute(
      {
        expectedVersion: request.data.row.closureVersion,
        sourceFingerprint: request.data.row.sourceFingerprint,
        allCostsComplete: complete,
        noHireCost: noHire,
        allocations: allocations.map((a) => ({
          ...a,
          amount: Number(a.amount),
        })),
        note,
      },
      (body) => service.ownerSaveTripCosts(route.params.id, body, branch),
    );
    if (result) {
      setMessage("Cost statement saved.");
      request.reload();
    }
  }
  return (
    <Screen navigation={navigation} title="Trip costs and closure">
      <RequestState request={request} />
      <AppText muted>
        Allocate actual additional trip costs with source references. Include
        only costs excluded from the linked hire bills. Advances and recorded
        purchase captures are not automatically costs. All statement versions
        remain in history.
      </AppText>
      {request.data && (
        <>
          <Card>
            <AppText variant="h3">
              {request.data.erp.tripNumber} ·{" "}
              {request.data.row.registrationNumber}
            </AppText>
            <AppText>
              Posted freight:{" "}
              {request.data.row.postedRevenue == null
                ? "Unavailable"
                : `₹${request.data.row.postedRevenue}`}
            </AppText>
            <AppText>
              Posted hire bills:{" "}
              {request.data.row.postedHireCost == null
                ? "Unavailable"
                : `₹${request.data.row.postedHireCost}`}
            </AppText>
            {[
              ...request.data.row.revenueEvidence,
              ...request.data.row.costEvidence,
            ].map((bill) => (
              <AppText key={bill._id}>
                Bill {bill.billNumber || bill._id}: ₹
                {bill.lineNet ?? bill.netAmount}
              </AppText>
            ))}
            <AppText>
              Settled margin:{" "}
              {request.data.row.settledMargin == null
                ? "Unavailable until complete costs are declared against current evidence"
                : `₹${request.data.row.settledMargin}`}
            </AppText>
            <AppText>
              Settled cost per laden km:{" "}
              {request.data.row.settledCostPerLadenKm == null
                ? "Unavailable"
                : `₹${request.data.row.settledCostPerLadenKm.toFixed(2)}`}
            </AppText>
            {request.data.row.closureVersion > 0 &&
              !request.data.row.closureCurrent && (
                <AppText>
                  Posted bill evidence changed. The prior cost closure no longer
                  qualifies.
                </AppText>
              )}
          </Card>
          {allocations.map((a, index) => (
            <Card key={index}>
              <Choice
                label={`Cost category ${index + 1}`}
                value={a.category}
                onChange={(v) => change(index, "category", v)}
                disabled={locked}
                options={[
                  "DIESEL",
                  "TOLL",
                  "DRIVER",
                  "MAINTENANCE",
                  "OVERHEAD",
                  "OTHER",
                ].map((v) => [v, v])}
              />
              <TextField
                label={`Cost amount INR ${index + 1}`}
                value={a.amount}
                onChangeText={(v) => change(index, "amount", v)}
                editable={!locked}
                keyboardType="decimal-pad"
              />
              <TextField
                label={`Source evidence ${index + 1}`}
                value={a.evidence}
                onChangeText={(v) => change(index, "evidence", v)}
                editable={!locked}
                multiline
              />
              <Button
                label={`Remove cost ${index + 1}`}
                variant="ghost"
                disabled={locked}
                onPress={() =>
                  setAllocations((rows) => rows.filter((_, i) => i !== index))
                }
              />
            </Card>
          ))}
          <Button
            label="Add actual cost allocation"
            variant="secondary"
            disabled={locked || allocations.length >= 50}
            onPress={() =>
              setAllocations((rows) => [
                ...rows,
                { category: "OTHER", amount: "", evidence: "" },
              ])
            }
          />
          {request.data.erp.vehicleType === "OWN" &&
            !request.data.row.costEvidence.length && (
              <Choice
                label="No hire charge applies to this owned truck"
                value={String(noHire)}
                disabled={locked}
                onChange={(v) => setNoHire(v === "true")}
                options={[
                  ["false", "Not declared"],
                  ["true", "I confirm zero hire charge"],
                ]}
              />
            )}
          <Choice
            label="Cost coverage"
            value={String(complete)}
            disabled={locked}
            onChange={(v) => setComplete(v === "true")}
            options={[
              ["false", "Draft / incomplete"],
              [
                "true",
                "I attest all trip costs and overhead allocations are complete",
              ],
            ]}
          />
          <TextField
            label="Closure explanation"
            value={note}
            onChangeText={setNote}
            editable={!locked}
            multiline
          />
          <AppText muted>
            Settled margin uses posted freight, posted hire bills and your
            declared cost allocations. It is an owner-attested trip result. It
            is not audited company net profit. New or changed posted bills
            invalidate this closure automatically.
          </AppText>
          <Button
            label={
              write.draft ? "Retry saved cost statement" : "Save cost statement"
            }
            disabled={!write.ready || (!write.draft && !note.trim())}
            loading={write.busy}
            onPress={save}
          />
          {(request.data.history?.versions || [])
            .slice()
            .reverse()
            .map((v) => (
              <Card key={v.version}>
                <AppText>
                  Statement {v.version} ·{" "}
                  {v.allCostsComplete ? "Attested complete" : "Draft"} ·{" "}
                  {new Date(v.capturedAt).toLocaleString()}
                </AppText>
                <AppText>
                  {v.note} · recorded by {v.userId}
                </AppText>
                {v.allocations.map((a, i) => (
                  <AppText key={i}>
                    {a.category}: ₹{a.amount} · {a.evidence}
                  </AppText>
                ))}
              </Card>
            ))}
        </>
      )}
      {write.error || message ? (
        <AppText>{write.error || message}</AppText>
      ) : null}
      <Button
        label="Refresh evidence"
        variant="secondary"
        onPress={request.reload}
      />
    </Screen>
  );
}
