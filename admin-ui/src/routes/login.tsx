import { IconSettings } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, signIn } from "@/lib/auth";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const session = await getSession();
		if (session) throw redirect({ to: "/" });
	},
	component: LoginPage,
});

interface LoginValues {
	email: string;
	password: string;
}

function LoginPage() {
	const navigate = useNavigate();

	const submit = useMutation({
		mutationFn: (values: LoginValues) => signIn(values.email, values.password),
		onSuccess: () => navigate({ to: "/" }),
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Sign in failed"),
	});

	const form = useForm({
		defaultValues: { email: "", password: "" } as LoginValues,
		onSubmit: async ({ value }) => {
			await submit.mutateAsync(value);
		},
	});

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary">
						<IconSettings className="size-5 text-primary-foreground" />
					</div>
					<CardTitle className="text-xl">better-cms</CardTitle>
					<CardDescription>Sign in to access the admin panel</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field
							name="email"
							validators={{
								onChange: ({ value }) =>
									!value.trim() ? "Email is required" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Email</Label>
									<Input
										id={field.name}
										type="email"
										placeholder="admin@example.com"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										autoComplete="email"
									/>
								</div>
							)}
						</form.Field>
						<form.Field
							name="password"
							validators={{
								onChange: ({ value }) =>
									!value ? "Password is required" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Password</Label>
									<Input
										id={field.name}
										type="password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										autoComplete="current-password"
									/>
								</div>
							)}
						</form.Field>
						<form.Subscribe
							selector={(state) =>
								[state.values.email, state.values.password] as const
							}
						>
							{([email, password]) => (
								<Button
									type="submit"
									className="w-full"
									disabled={submit.isPending || !email.trim() || !password}
								>
									{submit.isPending ? "Signing in…" : "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
