"use strict";

// Daymark is intentionally dependency-free: this keeps the first version easy
// to run, inspect, and extend while practicing core JavaScript and DOM APIs.
const STORAGE_KEY = "daymark.tasks.v1";

const elements = {
  form: document.querySelector("#task-form"),
  title: document.querySelector("#task-title"),
  category: document.querySelector("#task-category"),
  priority: document.querySelector("#task-priority"),
  dueDate: document.querySelector("#task-due-date"),
  submit: document.querySelector("#submit-task"),
  cancelEdit: document.querySelector("#cancel-edit"),
  formHeading: document.querySelector("#form-heading"),
  formStatus: document.querySelector("#form-status"),
  dateError: document.querySelector("#date-error"),
  search: document.querySelector("#task-search"),
  sort: document.querySelector("#task-sort"),
  taskList: document.querySelector("#task-list"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyDescription: document.querySelector("#empty-description"),
  emptyAction: document.querySelector("#empty-action"),
  visibleCount: document.querySelector("#visible-count"),
  totalCount: document.querySelector("#total-count"),
  completedCount: document.querySelector("#completed-count"),
  overdueCount: document.querySelector("#overdue-count"),
  completionCaption: document.querySelector("#completion-caption"),
  filterAllCount: document.querySelector("#filter-all-count"),
  filterActiveCount: document.querySelector("#filter-active-count"),
  filterCompletedCount: document.querySelector("#filter-completed-count"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  progress: document.querySelector("#progress-fill"),
  progressTrack: document.querySelector(".progress-track"),
  todayLabel: document.querySelector("#today-label"),
  listFooter: document.querySelector("#list-footer"),
  toast: document.querySelector("#toast")
};

let tasks = loadTasks();
let activeFilter = "all";
let editingTaskId = null;
let toastTimer = null;

// Store a plain, validated shape so old or manually edited storage data cannot
// unexpectedly break rendering. A storage error should not stop the app.
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((task) => task && typeof task.id === "string" && typeof task.title === "string")
      .map((task) => ({
        id: task.id,
        title: task.title.slice(0, 120),
        category: ["Study", "Work", "Personal", "Errands"].includes(task.category) ? task.category : "Personal",
        priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
        dueDate: isValidDateString(task.dueDate) ? task.dueDate : "",
        completed: task.completed === true,
        createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now()
      }));
  } catch (error) {
    console.warn("Could not read saved tasks from this browser.", error);
    return [];
  }
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.warn("Could not save tasks in this browser.", error);
    showToast("Changes are on screen, but this browser could not save them.");
    return false;
  }
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function startOfLocalDay(dateString) {
  return new Date(dateString + "T00:00:00");
}

function isOverdue(task) {
  return Boolean(task.dueDate) && !task.completed && task.dueDate < localDateKey();
}

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeBadge(className, text, attribute, value) {
  const badge = makeElement("span", className, text);
  if (attribute) badge.dataset[attribute] = value;
  return badge;
}

function formatDate(dateString) {
  const date = startOfLocalDay(dateString);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dueDateText(task) {
  const dateKey = task.dueDate;
  if (!dateKey) return null;

  const todayKey = localDateKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);

  if (!task.completed && dateKey < todayKey) {
    return { text: "Overdue · " + formatDate(dateKey), className: "task-due is-overdue" };
  }
  if (dateKey === todayKey) {
    return { text: "Today · " + formatDate(dateKey), className: "task-due is-today" };
  }
  if (dateKey === tomorrowKey) {
    return { text: "Tomorrow · " + formatDate(dateKey), className: "task-due" };
  }
  return { text: "Due " + formatDate(dateKey), className: "task-due" };
}

function priorityLabel(priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function compareTasks(a, b) {
  switch (elements.sort.value) {
    case "dueDate":
      // Undated tasks go last so deadlines remain easy to scan.
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
        Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt;
    case "priority": {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority] ||
        Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt;
    }
    case "alphabetical":
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    case "created":
    default:
      return b.createdAt - a.createdAt;
  }
}

function getVisibleTasks() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  return tasks
    .filter((task) => {
      if (activeFilter === "active" && task.completed) return false;
      if (activeFilter === "completed" && !task.completed) return false;
      if (!query) return true;
      return [task.title, task.category, task.priority, task.dueDate]
        .some((part) => String(part).toLocaleLowerCase().includes(query));
    })
    .sort(compareTasks);
}

function makeTaskCard(task) {
  const item = makeElement("li", "task-item" + (task.completed ? " is-complete" : ""));
  const check = makeElement("button", "task-check", task.completed ? "✓" : "");
  check.type = "button";
  check.setAttribute("aria-pressed", String(task.completed));
  check.setAttribute("aria-label", (task.completed ? "Mark as not completed: " : "Mark as completed: ") + task.title);
  check.addEventListener("click", () => toggleTask(task.id));

  const main = makeElement("div", "task-main");
  const title = makeElement("p", "task-title", task.title);
  main.append(title);

  const meta = makeElement("div", "task-meta");
  meta.append(makeBadge("category-badge", task.category, "category", task.category));
  meta.append(makeBadge("priority-pill", priorityLabel(task.priority) + " priority", "priority", task.priority));
  const due = dueDateText(task);
  if (due) meta.append(makeElement("span", due.className, due.text));
  main.append(meta);

  const actions = makeElement("div", "task-actions");
  const edit = makeElement("button", "task-action", "✎");
  edit.type = "button";
  edit.setAttribute("aria-label", "Edit task: " + task.title);
  edit.title = "Edit task";
  edit.addEventListener("click", () => beginEdit(task.id));

  const remove = makeElement("button", "task-action delete", "×");
  remove.type = "button";
  remove.setAttribute("aria-label", "Delete task: " + task.title);
  remove.title = "Delete task";
  remove.addEventListener("click", () => deleteTask(task.id));

  actions.append(edit, remove);
  item.append(check, main, actions);
  return item;
}

function render() {
  const visibleTasks = getVisibleTasks();
  const completed = tasks.filter((task) => task.completed).length;
  const active = tasks.length - completed;
  const overdue = tasks.filter(isOverdue).length;
  const percentage = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  elements.totalCount.textContent = String(tasks.length);
  elements.completedCount.textContent = String(completed);
  elements.overdueCount.textContent = String(overdue);
  elements.completionCaption.textContent = tasks.length
    ? percentage + "% of your list complete"
    : "Small steps add up";
  elements.filterAllCount.textContent = String(tasks.length);
  elements.filterActiveCount.textContent = String(active);
  elements.filterCompletedCount.textContent = String(completed);
  elements.visibleCount.textContent = String(visibleTasks.length);
  elements.progress.style.width = percentage + "%";
  elements.progressTrack.setAttribute("role", "progressbar");
  elements.progressTrack.setAttribute("aria-valuemin", "0");
  elements.progressTrack.setAttribute("aria-valuemax", "100");
  elements.progressTrack.setAttribute("aria-valuenow", String(percentage));
  elements.progressTrack.setAttribute("aria-label", "Task completion: " + percentage + "%");

  elements.filterButtons.forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  elements.taskList.replaceChildren(...visibleTasks.map(makeTaskCard));
  const isEmpty = visibleTasks.length === 0;
  elements.emptyState.hidden = !isEmpty;

  if (isEmpty) {
    if (tasks.length === 0) {
      elements.emptyTitle.textContent = "A fresh start.";
      elements.emptyDescription.textContent = "Your list is clear. Add one small task to begin.";
      elements.emptyAction.textContent = "Create your first task ↗";
    } else {
      elements.emptyTitle.textContent = "Nothing matches just yet.";
      elements.emptyDescription.textContent = "Try another search or switch to a different filter.";
      elements.emptyAction.textContent = "Clear search and filters ↗";
    }
  }

  if (tasks.length === 0) {
    elements.listFooter.textContent = "Your next step is waiting.";
  } else if (active === 0) {
    elements.listFooter.textContent = "Everything is complete. Take a moment to appreciate that.";
  } else if (overdue > 0) {
    elements.listFooter.textContent = overdue + " overdue " + (overdue === 1 ? "task needs" : "tasks need") + " a quick review.";
  } else {
    elements.listFooter.textContent = active + " task" + (active === 1 ? "" : "s") + " left to keep moving.";
  }
}

function setFormMode(isEditing) {
  elements.formHeading.textContent = isEditing ? "Edit your task" : "Add a task";
  elements.submit.innerHTML = isEditing ? "Save changes" : "<span aria-hidden=\"true\">＋</span> Add task";
  elements.cancelEdit.hidden = !isEditing;
}

function resetForm() {
  editingTaskId = null;
  elements.form.reset();
  elements.category.value = "Study";
  elements.priority.value = "medium";
  elements.dateError.hidden = true;
  elements.formStatus.textContent = "";
  setFormMode(false);
}

function beginEdit(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  editingTaskId = id;
  elements.title.value = task.title;
  elements.category.value = task.category;
  elements.priority.value = task.priority;
  elements.dueDate.value = task.dueDate;
  elements.dateError.hidden = true;
  elements.formStatus.textContent = "Editing selected task. Save or cancel your changes.";
  setFormMode(true);
  elements.title.focus();
  document.querySelector(".composer-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function createTaskId() {
  // randomUUID is preferred; the fallback supports older browsers without a dependency.
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function handleSubmit(event) {
  event.preventDefault();
  const title = elements.title.value.trim();
  const dueDate = elements.dueDate.value;

  if (!title) {
    elements.title.setCustomValidity("Please enter a task name.");
    elements.title.reportValidity();
    elements.title.setCustomValidity("");
    elements.title.focus();
    return;
  }
  if (dueDate && !isValidDateString(dueDate)) {
    elements.dateError.hidden = false;
    elements.dueDate.focus();
    return;
  }
  elements.dateError.hidden = true;

  if (editingTaskId) {
    const task = tasks.find((item) => item.id === editingTaskId);
    if (!task) {
      resetForm();
      return;
    }
    Object.assign(task, {
      title,
      category: elements.category.value,
      priority: elements.priority.value,
      dueDate
    });
    saveTasks();
    resetForm();
    render();
    showToast("Task updated.");
    elements.title.focus();
    return;
  }

  tasks.unshift({
    id: createTaskId(),
    title,
    category: elements.category.value,
    priority: elements.priority.value,
    dueDate,
    completed: false,
    createdAt: Date.now()
  });
  saveTasks();
  resetForm();
  render();
  showToast("Task added to your list.");
  elements.title.focus();
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
  showToast(task.completed ? "One step done. Nice work." : "Task moved back to in progress.");
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  // Confirm destructive actions to avoid losing a task by an accidental click.
  if (!window.confirm('Delete "' + task.title + '"? This cannot be undone.')) return;

  tasks = tasks.filter((item) => item.id !== id);
  if (editingTaskId === id) resetForm();
  saveTasks();
  render();
  showToast("Task deleted.");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

function updateDateLabel() {
  const today = new Date();
  elements.todayLabel.textContent = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).toLocaleUpperCase();
}

elements.form.addEventListener("submit", handleSubmit);
elements.cancelEdit.addEventListener("click", () => {
  resetForm();
  elements.title.focus();
});
elements.search.addEventListener("input", render);
elements.sort.addEventListener("change", render);
elements.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    render();
  });
});
elements.emptyAction.addEventListener("click", () => {
  if (tasks.length === 0) {
    elements.title.focus();
    return;
  }
  elements.search.value = "";
  activeFilter = "all";
  render();
  elements.search.focus();
});

// A single-key shortcut is useful for quick capture, but never steals typing
// from an input, textarea, select, or active modifier-key combination.
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
  if (event.key === "/" && !isTyping && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape" && document.activeElement === elements.search) {
    elements.search.value = "";
    render();
    elements.search.blur();
  }
});

updateDateLabel();
render();
