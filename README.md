# Momoan Todo

Momoan Todo is an Obsidian task and routine manager built around Markdown.

It brings daily tasks, recurring routines, categories and groups, and monthly reviews into one planner-focused interface without requiring a separate task service.

## What makes Momoan Todo different?

Momoan Todo is designed less as a general-purpose task query system and more as a day-to-day personal planner inside Obsidian.

### A planner-first workflow

The core workflow is:

**Today -> upcoming tasks -> recurring routines -> monthly review**

You can manage day-to-day work from one interface instead of assembling multiple notes, queries, and dashboards.

### Occurrence-level control for recurring routines

Recurring routines are handled as individual occurrences. You can:

- move one occurrence without changing the entire routine;
- edit a single occurrence separately;
- complete or skip individual occurrences; and
- preserve moved, completed, skipped, and overridden states.

This is useful for routines that do not always happen exactly as scheduled.

### Move tasks without losing context

Tasks can be moved between dates, copied, edited, completed, or restored directly from the planner. Moving a task does not force you to leave the date you are reviewing.

### Categories and groups in the same workflow

Use categories for broad areas such as work, personal life, or creative work, and groups for individual projects within those areas. No separate query syntax is required.

### Monthly review is part of the task system

Momoan Todo includes a monthly review workflow so completed tasks and activity can help you see how the month was actually spent.

### Vault-oriented and customizable

The plugin stores its working data in your Obsidian vault and is intended to be adaptable. You can modify the source yourself or use coding tools to adjust the layout, sorting, routine behavior, default categories, and other workflow details.

## Installation

After Momoan Todo is accepted into the Obsidian Community directory:

1. Open **Settings -> Community plugins -> Browse** in Obsidian.
2. Search for **Momoan Todo**.
3. Select **Install**, then **Enable**.
4. Open Momoan Todo and follow the in-app User Guide.

## Features

- Daily task management
- Create, edit, complete, and delete tasks
- Move or copy tasks between dates
- Categories and groups
- Recurring routines
- Per-occurrence routine overrides
- Monthly reviews
- Undo and redo
- Recovery snapshots
- Desktop and mobile support
- Korean, English, Japanese, and Chinese interface text

Detailed instructions for tasks, routines, categories, groups, monthly reviews, settings, backup, and recovery are available in the in-app User Guide.

## Optional companion plugins

Momoan Todo works on its own and does not require any other community plugin. Depending on your workflow, you may also find these plugins useful:

- **Air Sync** — synchronize the same vault across multiple computers or mobile devices.
- **Tasks** — query and manage Markdown tasks across your vault.
- **Full Calendar Remastered** — add a broader calendar view for schedules and tasks in your vault.
- **Local Backup** — keep a separate backup of your entire vault.

These plugins are not included with Momoan Todo and are maintained by their respective authors. Install and configure them separately only if you need them.

## Maintenance

Momoan Todo was originally built for personal use and is shared publicly as-is. Updates may be infrequent, and support for every workflow, device, or environment is not guaranteed.

If the plugin does not perfectly match your workflow, you may modify the source for your own use. Small, targeted changes based on the complete current plugin files are safer than replacing large sections at once.

Before installing updates or making custom modifications, back up important vault data.

## Customization

Possible customizations include:

- changing the interface layout;
- adjusting sorting behavior;
- modifying routine behavior;
- changing default categories;
- adding workflow-specific actions; and
- adapting the interface to your own vault structure.

## Data, privacy, and recovery

Momoan Todo stores its working data inside your Obsidian vault. It does not require an account or a separate task-management service, and the current release does not make network requests or include telemetry.

The plugin can save manual recovery snapshots and automatic safety backups in an `_Backups` folder under the selected Momoan Todo storage location. These recovery files are not a substitute for backing up your full vault.

If you use a sync or backup tool, review that tool's own documentation and privacy terms. Companion plugins named above are separate projects and are not bundled with Momoan Todo.

## License

Momoan Todo is released under the [MIT License](LICENSE).
