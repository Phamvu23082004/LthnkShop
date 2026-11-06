export type ReportLineDraft = {
  component_id: string;
  product_id: string;
  product_name: string;
  component_color: string;
  size: string;
  quantity: number;
};

export type ProductReportGroup = {
  key: string;
  product_id: string;
  product_name: string;
  lines: ReportLineDraft[];
};

export type ReportPayloadLine = Pick<ReportLineDraft, "component_id" | "product_id" | "component_color" | "size" | "quantity">;

export function groupReportLines(lines: readonly ReportLineDraft[]): ProductReportGroup[] {
  const groups = new Map<string, ProductReportGroup>();
  for (const line of lines) {
    let group = groups.get(line.product_id);
    if (!group) {
      group = { key: line.product_id, product_id: line.product_id, product_name: line.product_name, lines: [] };
      groups.set(line.product_id, group);
    }
    group.lines.push({ ...line });
  }
  return [...groups.values()];
}

export function serializeReportGroups(groups: readonly ProductReportGroup[]): ReportPayloadLine[] {
  return groups.flatMap(group => group.lines.map(line => ({
    component_id: line.component_id,
    product_id: group.product_id,
    component_color: line.component_color,
    size: line.size,
    quantity: line.quantity,
  })));
}

export function addReportLine(groups: readonly ProductReportGroup[], groupKey: string, line: ReportLineDraft): ProductReportGroup[] {
  if (groups.reduce((total, group) => total + group.lines.length, 0) >= 50) return [...groups];
  return groups.map(group => group.key === groupKey ? { ...group, lines: [...group.lines, { ...line, product_id: group.product_id, product_name: group.product_name }] } : group);
}

export function removeReportLine(groups: readonly ProductReportGroup[], groupKey: string, lineIndex: number): ProductReportGroup[] {
  return groups.map(group => group.key === groupKey ? { ...group, lines: group.lines.filter((_, index) => index !== lineIndex) } : group);
}

export function removeProductGroup(groups: readonly ProductReportGroup[], groupKey: string): ProductReportGroup[] {
  return groups.filter(group => group.key !== groupKey);
}

export function validateReportGroups(groups: readonly ProductReportGroup[]): string | null {
  if (groups.length === 0) return "Hãy thêm ít nhất một sản phẩm vào báo cáo.";
  const productIds = new Set<string>();
  const lines = serializeReportGroups(groups);
  if (lines.length === 0) return "Hãy thêm ít nhất một bộ phận vào báo cáo.";
  if (lines.length > 50) return "Một báo cáo tối đa có 50 bộ phận.";

  for (const group of groups) {
    if (!group.product_id) return "Hãy chọn sản phẩm cho từng nhóm.";
    if (productIds.has(group.product_id)) return "Mỗi sản phẩm chỉ nên có một nhóm trong báo cáo.";
    productIds.add(group.product_id);
    if (group.lines.length === 0) return `Hãy thêm ít nhất một bộ phận cho sản phẩm ${group.product_name || "đã chọn"}.`;
  }

  for (const line of lines) {
    if (!line.component_id) return "Hãy chọn bộ phận cho từng dòng.";
    if (!/^\d{1,3}$/.test(line.size)) return "Hãy chọn kích thước hợp lệ cho từng bộ phận.";
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000) return "Số lượng phải từ 1 đến 10.000.";
  }
  return null;
}
