import { verifyToken } from "@clerk/backend";

type ClerkSessionClaims = {
	sub?: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	image_url?: string;
	picture?: string;
};

export type SignedInUser = {
	id: string;
	name?: string;
	image?: string;
};

export class ClerkAuthConfigError extends Error {
	constructor() {
		super("Clerk server auth is not configured. Add CLERK_SECRET_KEY or CLERK_JWT_KEY.");
		this.name = "ClerkAuthConfigError";
	}
}

export function isClerkAuthConfigError(error: unknown): error is ClerkAuthConfigError {
	return error instanceof ClerkAuthConfigError;
}

function getBearerToken(request: Request) {
	const authorization = request.headers.get("authorization");
	return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
}

export async function getSignedInUser(request: Request): Promise<SignedInUser | null> {
	const token = getBearerToken(request);

	if (!token) {
		return null;
	}

	if (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_JWT_KEY) {
		throw new ClerkAuthConfigError();
	}

	try {
		const payload = (await verifyToken(token, {
			secretKey: process.env.CLERK_SECRET_KEY,
			jwtKey: process.env.CLERK_JWT_KEY,
			audience: process.env.CLERK_JWT_AUDIENCE,
		})) as ClerkSessionClaims;

		if (!payload.sub) {
			return null;
		}

		const fallbackName = [payload.given_name, payload.family_name].filter(Boolean).join(" ");

		return {
			id: payload.sub,
			name: payload.name ?? fallbackName,
			image: payload.image_url ?? payload.picture,
		};
	} catch (error) {
		console.warn("Clerk session token verification failed:", error);
		return null;
	}
}
