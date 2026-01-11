// 1. Enum to String Map
enum Status {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

const statusLabels: Record<Status, string> = {
  [Status.PENDING]: 'Pending Review',
  [Status.APPROVED]: 'Approved',
  [Status.REJECTED]: 'Rejected'
};

// Usage: statusLabels[Status.PENDING] → "Pending Review"

// 2. Enum to Config Map
enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

const priorityConfig: Record<Priority, { color: string; icon: string }> = {
  [Priority.LOW]: { color: 'text-gray-500', icon: '⬇️' },
  [Priority.MEDIUM]: { color: 'text-blue-500', icon: '➡️' },
  [Priority.HIGH]: { color: 'text-orange-500', icon: '⬆️' },
  [Priority.URGENT]: { color: 'text-red-500', icon: '🔥' }
};

// 3. Loop Through Enum Values
function getEnumValues<T extends Record<string, string>>(enumObj: T): T[keyof T][] {
  return Object.values(enumObj);
}

// Usage:
const allStatuses = getEnumValues(Status);
// Returns: ['pending', 'approved', 'rejected']

// 4. Map Enum to Options
function enumToOptions<T extends Record<string, string>>(
  enumObj: T,
  labels: Record<T[keyof T], string>
): Array<{ value: T[keyof T]; label: string }> {
  return Object.values(enumObj).map(value => ({
    value,
    label: labels[value]
  }));
}

// Usage:
const statusOptions = enumToOptions(Status, statusLabels);
// Returns: [{ value: 'pending', label: 'Pending Review' }, ...]

// 5. Render Enum in JSX
function renderEnumSelect<T extends string>(
  value: T,
  onChange: (value: T) => void,
  options: Record<T, string>
) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {Object.entries(options).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

// 6. Get Enum Label
function getEnumLabel<T extends string>(
  value: T,
  labels: Record<T, string>
): string {
  return labels[value] || value;
}

// 7. Validate Enum Value
function isValidEnum<T extends Record<string, string>>(
  value: string,
  enumObj: T
): value is T[keyof T] {
  return Object.values(enumObj).includes(value);
}

// Usage:
if (isValidEnum(userInput, Status)) {
  // TypeScript knows userInput is a valid Status
  const label = statusLabels[userInput];
}