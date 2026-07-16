export interface DesignerSummary {
  lines: string[];
  text: string;
}

export function buildDesignerSummary(assembled?: {
  ok?: boolean;
  specification?: object;
  estimate?: { line?: object; line_items?: object[] };
  missing_fields?: string[];
  product?: object;
}): DesignerSummary;
