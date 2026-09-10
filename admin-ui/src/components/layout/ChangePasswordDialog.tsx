import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth";

interface ChangePasswordValues {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export function ChangePasswordDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const submit = useMutation({
		mutationFn: (values: ChangePasswordValues) =>
			changePassword({
				currentPassword: values.currentPassword,
				newPassword: values.newPassword,
			}),
		onSuccess: () => {
			toast.success("Password changed");
			form.reset();
			onClose();
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Failed to change password"),
	});

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		} as ChangePasswordValues,
		onSubmit: async ({ value }) => {
			await submit.mutateAsync(value);
		},
	});

	function handleClose() {
		form.reset();
		onClose();
	}

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
			<DialogContent className="sm:max-w-sm">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="contents"
				>
					<DialogHeader>
						<DialogTitle>Change password</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<form.Field name="currentPassword">
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Current password</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										autoComplete="current-password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<form.Field
							name="newPassword"
							validators={{
								onChange: ({ value }) =>
									value.length < 8
										? "Must be at least 8 characters"
										: undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>New password</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										autoComplete="new-password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									<PasswordStrengthMeter password={field.state.value} />
									{field.state.meta.isTouched &&
										field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">
												{field.state.meta.errors.join(", ")}
											</p>
										)}
								</div>
							)}
						</form.Field>

						<form.Field
							name="confirmPassword"
							validators={{
								onChangeListenTo: ["newPassword"],
								onChange: ({ value, fieldApi }) =>
									value !== fieldApi.form.getFieldValue("newPassword")
										? "Passwords don't match"
										: undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Confirm new password</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										autoComplete="new-password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.isTouched &&
										field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">
												{field.state.meta.errors.join(", ")}
											</p>
										)}
								</div>
							)}
						</form.Field>
					</div>
					<DialogFooter>
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.values] as const}
						>
							{([canSubmit, values]) => (
								<Button
									type="submit"
									disabled={
										submit.isPending ||
										!canSubmit ||
										!values.currentPassword ||
										values.newPassword.length < 8 ||
										values.newPassword !== values.confirmPassword
									}
								>
									{submit.isPending ? "Saving…" : "Change password"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
