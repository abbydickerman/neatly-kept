import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * Validates the session for a protected API route.
 * Returns the authenticated user if the session is valid, or a 401 response if not.
 */
export async function getAuthenticatedUser(): Promise<
  | { user: AuthenticatedUser; error: null }
  | { user: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name,
      image: session.user.image,
    },
    error: null,
  };
}

/**
 * Checks if the authenticated user owns the specified resource.
 * Returns a 403 response if the user does not own the resource.
 */
export function assertOwnership(
  authenticatedUserId: string,
  resourceUserId: string
): NextResponse | null {
  if (authenticatedUserId !== resourceUserId) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  return null;
}
