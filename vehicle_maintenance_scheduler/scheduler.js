function selectBestTasks(tasks, maxHours) {
  // Step 1: sort tasks based on impact efficiency
  // (impact per hour)
  tasks.sort((a, b) => {
    return (b.Impact / b.Duration) - (a.Impact / a.Duration);
  });

  let totalHours = 0;
  let totalImpact = 0;
  let selectedTasks = [];

  // Step 2: pick tasks greedily
  for (let task of tasks) {
    if (totalHours + task.Duration <= maxHours) {
      selectedTasks.push(task);
      totalHours += task.Duration;
      totalImpact += task.Impact;
    }
  }

  return {
    totalImpact,
    selectedTasks
  };
}

module.exports = selectBestTasks;