"use node";

// External Backup Destinations — pushes completed backup snapshots to
// S3-compatible storage, Dropbox, Google Drive, or emails a download link.
// Runs in the Node runtime since it needs Buffer + the AWS SDK.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import escapeHtml from "escape-html";
import { Hercules } from "@usehercules/sdk";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api.js";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

type Destination = {
  _id: Id<"backupDestinations">;
  provider: "s3" | "dropbox" | "gdrive" | "email";
  label: string;
  enabled: boolean;
  config: string;
};

type S3Config = { bucket: string; region: string; endpoint?: string; folder?: string };
type DropboxConfig = { folder?: string };
type GDriveConfig = { folderId?: string };
type EmailConfig = { recipients: string[]; fromAddress: string };

// ── Dispatcher: called after a backup completes, fans out to every enabled destination ──
export const syncBackupToDestinations = internalAction({
  args: { backupJobId: v.id("backupJobs") },
  handler: async (ctx, args): Promise<void> => {
    const destinations: Destination[] = await ctx.runQuery(internal.backupInternal.getEnabledDestinations, {});
    if (destinations.length === 0) return;

    const job = await ctx.runQuery(internal.backupInternal.getBackupJob, { backupJobId: args.backupJobId });
    if (!job || !job.storageId) return;

    const fileUrl = await ctx.storage.getUrl(job.storageId);
    if (!fileUrl) return;

    for (const dest of destinations) {
      try {
        switch (dest.provider) {
          case "s3":
            await pushToS3(fileUrl, job.jobRef, JSON.parse(dest.config) as S3Config);
            break;
          case "dropbox":
            await pushToDropbox(fileUrl, job.jobRef, JSON.parse(dest.config) as DropboxConfig);
            break;
          case "gdrive":
            await pushToGoogleDrive(fileUrl, job.jobRef, JSON.parse(dest.config) as GDriveConfig);
            break;
          case "email":
            await sendBackupEmail(fileUrl, job.jobRef, job.totalRecords ?? 0, JSON.parse(dest.config) as EmailConfig);
            break;
        }
        await ctx.runMutation(internal.backupInternal.recordDestinationSync, {
          destinationId: dest._id,
          backupJobId: args.backupJobId,
          provider: dest.provider,
          status: "success",
        });
      } catch (err) {
        await ctx.runMutation(internal.backupInternal.recordDestinationSync, {
          destinationId: dest._id,
          backupJobId: args.backupJobId,
          provider: dest.provider,
          status: "failed",
          detail: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  },
});

// ── S3 / S3-compatible (Cloudflare R2, Backblaze B2) ────────────────────────
async function pushToS3(fileUrl: string, jobRef: string, config: S3Config): Promise<void> {
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing BACKUP_S3_ACCESS_KEY_ID / BACKUP_S3_SECRET_ACCESS_KEY secrets");
  }
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to fetch backup file (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const client = new S3Client({
    region: config.region || "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  const key = `${config.folder ? config.folder.replace(/\/+$/, "") + "/" : ""}${jobRef}.json`;
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: "application/json",
    })
  );
}

// ── Dropbox ──────────────────────────────────────────────────────────────────
async function pushToDropbox(fileUrl: string, jobRef: string, config: DropboxConfig): Promise<void> {
  const accessToken = process.env.BACKUP_DROPBOX_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Missing BACKUP_DROPBOX_ACCESS_TOKEN secret");

  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to fetch backup file (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const path = `${config.folder ? "/" + config.folder.replace(/^\/+|\/+$/g, "") : ""}/${jobRef}.json`;
  const uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({ path, mode: "overwrite", autorename: false, mute: true }),
    },
    body: buffer,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Dropbox upload failed: ${uploadRes.status} ${text}`);
  }
}

// ── Google Drive ─────────────────────────────────────────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.BACKUP_GDRIVE_CLIENT_ID;
  const clientSecret = process.env.BACKUP_GDRIVE_CLIENT_SECRET;
  const refreshToken = process.env.BACKUP_GDRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing BACKUP_GDRIVE_CLIENT_ID / BACKUP_GDRIVE_CLIENT_SECRET / BACKUP_GDRIVE_REFRESH_TOKEN secrets");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function pushToGoogleDrive(fileUrl: string, jobRef: string, config: GDriveConfig): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to fetch backup file (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const metadata = {
    name: `${jobRef}.json`,
    ...(config.folderId ? { parents: [config.folderId] } : {}),
  };
  const boundary = "geodatabackupboundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${buffer.toString("utf-8")}\r\n--${boundary}--`;

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Google Drive upload failed: ${uploadRes.status} ${text}`);
  }
}

// ── Email a download link ───────────────────────────────────────────────────
async function sendBackupEmail(fileUrl: string, jobRef: string, totalRecords: number, config: EmailConfig): Promise<void> {
  if (!config.recipients?.length) throw new Error("No recipients configured");
  await hercules.email.send({
    from: config.fromAddress,
    to: config.recipients,
    subject: `Backup ${escapeHtml(jobRef)} is ready — Geodata World Services`,
    html: `
      <h2>Backup Snapshot Ready</h2>
      <p>Snapshot <strong>${escapeHtml(jobRef)}</strong> completed successfully with ${totalRecords.toLocaleString()} records.</p>
      <p><a href="${fileUrl}">Download the backup file</a></p>
      <p style="color:#888;font-size:12px;">This link is generated by Geodata World Services Limited's Backup &amp; Recovery Center.</p>
    `,
    text: `Backup ${jobRef} is ready (${totalRecords} records). Download: ${fileUrl}`,
  });
}
