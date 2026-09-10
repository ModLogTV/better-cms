import { cn } from "cn";

export interface PasswordStrength {
	score: 0 | 1 | 2 | 3 | 4;
	label: string;
}

/**
 * Lightweight local heuristic (no external dep) — not a substitute for
 * server-side password policy enforcement, just UI feedback.
 */
export function scorePassword(password: string): PasswordStrength {
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
	if (/\d/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;

	const clamped = Math.min(score, 4) as PasswordStrength["score"];
	const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
	return { score: clamped, label: labels[clamped] };
}

const SEGMENT_COLOR = [
	"bg-destructive",
	"bg-destructive",
	"bg-amber-500",
	"bg-amber-500",
	"bg-emerald-500",
];

export function PasswordStrengthMeter({ password }: { password: string }) {
	if (!password) return null;
	const { score, label } = scorePassword(password);

	return (
		<div className="space-y-1">
			<div className="flex gap-1">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static 4-segment meter, never reordered
						key={i}
						className={cn(
							"h-1 flex-1 rounded-full bg-muted transition-colors",
							i < score && SEGMENT_COLOR[score],
						)}
					/>
				))}
			</div>
			<p className="text-[11px] text-muted-foreground">{label}</p>
		</div>
	);
}
