import { test } from "node:test";
import assert from "node:assert/strict";
import { addReportLine, groupReportLines, removeProductGroup, removeReportLine, serializeReportGroups, validateReportGroups, type ProductReportGroup, type ReportLineDraft } from "../src/features/production/report-form";
import { reportInputSchema } from "../src/features/production/schema";

const oldLines: ReportLineDraft[] = [
  { component_id: "00000000-0000-4000-8000-000000000001", product_id: "10000000-0000-4000-8000-000000000001", product_name: "Doll A", component_color: "cream", size: "40", quantity: 2 },
  { component_id: "00000000-0000-4000-8000-000000000002", product_id: "10000000-0000-4000-8000-000000000001", product_name: "Doll A", component_color: "pink", size: "15", quantity: 1 },
  { component_id: "00000000-0000-4000-8000-000000000003", product_id: "10000000-0000-4000-8000-000000000002", product_name: "Doll B", component_color: "blue", size: "60", quantity: 4 },
];

test("legacy report lines group by product and retain every component field", () => {
  const groups = groupReportLines(oldLines);
  assert.deepEqual(groups.map(group => [group.product_id, group.lines.length]), [["10000000-0000-4000-8000-000000000001", 2], ["10000000-0000-4000-8000-000000000002", 1]]);
  assert.deepEqual(serializeReportGroups(groups), oldLines.map(({ component_id, product_id, component_color, size, quantity }) => ({ component_id, product_id, component_color, size, quantity })));
});

test("multiple product groups serialize once to the existing flat payload shape", () => {
  const groups: ProductReportGroup[] = [
    { key: "a", product_id: "10000000-0000-4000-8000-000000000001", product_name: "Doll A", lines: oldLines.slice(0, 2) },
    { key: "b", product_id: "10000000-0000-4000-8000-000000000002", product_name: "Doll B", lines: oldLines.slice(2) },
  ];
  const payload = serializeReportGroups(groups);
  assert.equal(payload.length, 3);
  assert.deepEqual(payload, oldLines.map(({ component_id, product_id, component_color, size, quantity }) => ({ component_id, product_id, component_color, size, quantity })));
  assert.deepEqual(Object.keys(payload[0]!).sort(), ["component_color", "component_id", "product_id", "quantity", "size"]);
  assert.equal(reportInputSchema.safeParse({ completed_on: "2026-11-06", notes: "", lines: payload }).success, true);
});

test("validation catches missing products, components, and repeated product groups", () => {
  const valid: ProductReportGroup = { key: "a", product_id: "10000000-0000-4000-8000-000000000001", product_name: "Doll A", lines: oldLines.slice(0, 1) };
  assert.match(validateReportGroups([{ ...valid, product_id: "" }]) ?? "", /chọn sản phẩm/i);
  assert.match(validateReportGroups([{ ...valid, lines: [{ ...oldLines[0]!, component_id: "" }] }]) ?? "", /chọn bộ phận/i);
  assert.match(validateReportGroups([valid, { ...valid, key: "duplicate" }]) ?? "", /một nhóm/i);
  assert.equal(validateReportGroups([valid]), null);
});

test("adding and removing parts or products leaves other groups untouched", () => {
  const groups = groupReportLines(oldLines);
  const added = addReportLine(groups, groups[1]!.key, { component_id: "00000000-0000-4000-8000-000000000004", product_id: "", product_name: "", component_color: "black", size: "40", quantity: 3 });
  assert.equal(added[0]!.lines.length, 2);
  assert.equal(added[1]!.lines.length, 2);
  assert.equal(added[1]!.lines[1]!.product_id, groups[1]!.product_id);

  const onePartRemoved = removeReportLine(added, groups[0]!.key, 0);
  assert.equal(onePartRemoved[0]!.lines.length, 1);
  assert.equal(onePartRemoved[1]!.lines.length, 2);

  const oneProductRemoved = removeProductGroup(added, groups[0]!.key);
  assert.deepEqual(oneProductRemoved.map(group => group.product_id), [groups[1]!.product_id]);
  assert.equal(oneProductRemoved[0]!.lines.length, 2);
});
