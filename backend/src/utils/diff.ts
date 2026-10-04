export interface FieldDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

export function computeDiff(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  trackedFields?: string[]
): { changedFields: string[]; diff: Record<string, { from: any; to: any }> } {
  const changedFields: string[] = [];
  const diff: Record<string, { from: any; to: any }> = {};

  const fieldsToCheck = trackedFields || Object.keys(newObj);

  for (const field of fieldsToCheck) {
    if (newObj[field] !== undefined) {
      const oldVal: any = oldObj[field];
      const newVal: any = newObj[field];

      // Compare dates, objects, or primitive values
      const isDifferent =
        oldVal instanceof Date && newVal instanceof Date
          ? oldVal.getTime() !== newVal.getTime()
          : oldVal instanceof Date && typeof newVal === 'string'
          ? oldVal.toISOString() !== new Date(newVal).toISOString()
          : JSON.stringify(oldVal) !== JSON.stringify(newVal);

      if (isDifferent) {
        const fieldStr = String(field);
        changedFields.push(fieldStr);
        diff[fieldStr] = {
          from: oldVal,
          to: newVal,
        };
      }
    }
  }

  return { changedFields, diff };
}

export function findConflictingFields(
  incomingFields: string[],
  historicalChangedFields: string[]
): string[] {
  const historicalSet = new Set(historicalChangedFields);
  return incomingFields.filter((field) => historicalSet.has(field));
}
