import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type UserUpdateInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
};

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found", 404);
  }
  return user;
}

export async function updateUser(id: string, input: UserUpdateInput) {
  try {
    return await prisma.user.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("VALIDATION_ERROR", "Email is already in use", 409);
    }
    throw error;
  }
}
