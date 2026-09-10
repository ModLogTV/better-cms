import { useCallback, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 2500;

/**
 * Tracks a single "flash" error keyed by an id (e.g. the row/item that
 * failed), auto-clearing after `durationMs`. Backs the project's standard
 * in-place error display - see AGENTS.md - where a failed action replaces
 * its own trigger icon with a destructive tooltip for a brief period,
 * instead of a toast.
 */
export function useTransientError(durationMs = DEFAULT_DURATION_MS) {
	const [error, setError] = useState<{ id: string; message: string } | null>(
		null,
	);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const flash = useCallback(
		(id: string, message: string) => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			setError({ id, message });
			timeoutRef.current = setTimeout(() => setError(null), durationMs);
		},
		[durationMs],
	);

	return { error, flash };
}
