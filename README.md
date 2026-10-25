# Daymark — Task Management App

A small, responsive task manager built with HTML, CSS, and vanilla JavaScript. The goal is to practice the everyday building blocks of a web application: forms, CRUD operations, DOM rendering, filtering, sorting, browser storage, and accessible interaction patterns.

**Live demo:** available after enabling GitHub Pages for this repository.  
**Source:** [wdf-5618/task-management-app](https://github.com/wdf-5618/task-management-app)

## Features

- **Create tasks** with a name, area, priority, and optional due date.
- **Read and review tasks** in a simple list with completion and overdue summaries.
- **Edit tasks** without changing their completion status or creation time.
- **Complete and reopen tasks** using an accessible toggle.
- **Delete tasks** with a confirmation step to reduce accidental loss.
- **Search** task names, areas, priorities, and due dates.
- **Filter** between all, in-progress, and completed tasks.
- **Sort** by creation time, due date, priority, or task name.
- **Persist locally** with `localStorage`, so tasks remain after a page refresh in the same browser.
- **Responsive interface** with keyboard focus styles and reduced-motion support.

## Run locally

The app has no build step or package dependencies. From the repository root, start a small local web server:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

You can also use the Live Server extension in Visual Studio Code. A local server is recommended because browser storage behavior for pages opened directly from a file can vary.

## Project structure

```text
.
├── index.html       # Semantic page structure and form controls
├── css/
│   └── styles.css   # Layout, components, responsive rules, focus states
├── js/
│   └── app.js       # Task state, storage, events, sorting, and rendering
└── README.md
```

## A few implementation decisions

- **Plain JavaScript first:** no framework or build tools are needed, which keeps the relationship between state, events, and the DOM visible while learning.
- **Render from task state:** after an action, the list and summary counts are recalculated from the same `tasks` array. This avoids maintaining separate, potentially inconsistent counts.
- **Use `textContent` for user-entered text:** task names are inserted as text rather than interpreted as HTML, reducing the risk of injecting markup into the page.
- **Validate saved data:** `localStorage` is wrapped in `try/catch` and stored records are checked before rendering. The app can still open if browser storage is blocked.
- **Keep dates as `YYYY-MM-DD`:** due dates are stored as date-only strings so filtering and overdue comparisons do not depend on an ISO timestamp's timezone conversion.
- **Confirm deletion:** removing a task is destructive, so the interface asks before proceeding.
- **Prefer semantic controls:** buttons have meaningful accessible names, active filters expose `aria-pressed`, and status messages use live regions.

## Current scope and limitations

This is a front-end learning project, not a multi-user service. Tasks are stored only in the current browser profile; they do not sync across devices and there is no account, server, or database yet. Clearing the browser's site data can remove saved tasks.

The Google Fonts import is optional visual polish; the CSS includes system-font fallbacks. The app itself does not need a third-party JavaScript library.

## Manual test checklist

- [ ] Add a task with only a name.
- [ ] Add a task with a due date and a high priority.
- [ ] Edit a task and cancel an edit without saving.
- [ ] Mark a task complete, then reopen it.
- [ ] Confirm deleting a task removes it; cancel another deletion.
- [ ] Search for a word, then clear the search.
- [ ] Switch between all, in-progress, and completed filters.
- [ ] Try each sorting mode.
- [ ] Refresh the page and confirm tasks remain in the same browser.
- [ ] Check the layout on a narrow mobile screen and navigate using the keyboard.

## Next improvements

Potential next steps are automated tests, task export/import, and eventually a backend with authentication and a database. These should be added after the simple local version is understood and tested.
