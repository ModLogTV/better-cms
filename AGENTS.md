# Agents Instructions

See [CLAUDE.md](./CLAUDE.md)

## Admin UI: error display convention

Action errors in `admin-ui` (a failed mutation - move, delete, save, etc.) are shown **in place**, not as a toast: the icon on the control that triggered the action swaps to `IconAlertTriangle` in `text-destructive`, and a destructive-variant `Tooltip` (`<TooltipContent variant="destructive">`) pinned open shows the error message right next to where the action happened. Both revert back to normal after a few seconds - see `admin-ui/src/lib/use-transient-error.ts` (`useTransientError`) for the reusable timer/state, and `TreeRow`'s drag handle in `admin-ui/src/routes/_layout/pages/index.tsx` for a worked example. This is the standard for every action error in the admin UI going forward - do not add new `toast.error(...)` calls for action failures; use this pattern instead. `toast.success(...)` for successful actions is unaffected and stays as-is.
