import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get primary email
    const primaryEmail = email_addresses.find(
      (email) => email.id === evt.data.primary_email_address_id
    );

    if (!primaryEmail) {
      return new Response("No primary email found", { status: 400 });
    }

    // Create user in database
    try {
      await prisma.user.create({
        data: {
          id: id,
          email: primaryEmail.email_address,
          name: `${first_name || ""} ${last_name || ""}`.trim() || "User",
        },
      });

      console.log(`User created: ${id}`);
    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Error creating user", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get primary email
    const primaryEmail = email_addresses.find(
      (email) => email.id === evt.data.primary_email_address_id
    );

    if (!primaryEmail) {
      return new Response("No primary email found", { status: 400 });
    }

    // Update user in database
    try {
      await prisma.user.update({
        where: { id: id },
        data: {
          email: primaryEmail.email_address,
          name: `${first_name || ""} ${last_name || ""}`.trim() || "User",
        },
      });

      console.log(`User updated: ${id}`);
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response("Error updating user", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (!id) {
      return new Response("No user ID found", { status: 400 });
    }

    // Delete user and all related data (cascade delete)
    try {
      await prisma.user.delete({
        where: { id: id },
      });

      console.log(`User deleted: ${id}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error deleting user", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}
