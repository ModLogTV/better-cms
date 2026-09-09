import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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

export function ChangePasswordDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");

	function reset() {
		setCurrentPassword("");
		setNewPassword("");
	}

	const submit = useMutation({
		mutationFn: () => changePassword({ currentPassword, newPassword }),
		onSuccess: () => {
			toast.success("Password changed");
			reset();
			onClose();
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Failed to change password"),
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) {
					reset();
					onClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Change password</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="current-password">Current password</Label>
						<Input
							id="current-password"
							type="password"
							autoComplete="current-password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="new-password">New password</Label>
						<Input
							id="new-password"
							type="password"
							autoComplete="new-password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={() => submit.mutate()}
						disabled={
							submit.isPending || !currentPassword || newPassword.length < 8
						}
					>
						{submit.isPending ? "Saving…" : "Change password"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
