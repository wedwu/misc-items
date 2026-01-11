// Complete example
enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

const statusMap: Record<TaskStatus, { label: string; color: string }> = {
  [TaskStatus.TODO]: { label: 'To Do', color: 'bg-gray-200' },
  [TaskStatus.IN_PROGRESS]: { label: 'In Progress', color: 'bg-blue-200' },
  [TaskStatus.DONE]: { label: 'Done', color: 'bg-green-200' }
};

// In component:
<select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
  {Object.entries(statusMap).map(([key, config]) => (
    <option key={key} value={key}>
      {config.label}
    </option>
  ))}
</select>

// Or render badges:
{Object.entries(statusMap).map(([key, config]) => (
  <span key={key} className={`px-2 py-1 rounded ${config.color}`}>
    {config.label}
  </span>
))}