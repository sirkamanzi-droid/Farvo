import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

type DueTask = {
  id: string;
  user_id: string;
  title: string;
  due_at: string;
  plan?: { crop_name?: string; issue_name?: string } | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const SERVICE_KEY = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase server credentials for crop reminders");
    return Response.json({ error: "Reminder service is not configured" }, { status: 500 });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: vapid, error: vapidError } = await admin.rpc("get_crop_care_vapid_config");
    if (vapidError || !vapid?.public_key || !vapid?.private_key) {
      console.error("VAPID configuration unavailable", vapidError);
      return Response.json({ error: "Push delivery is not configured" }, { status: 503 });
    }

    webpush.setVapidDetails("mailto:hello@omulimi.app", vapid.public_key, vapid.private_key);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const { data: dueTasks, error: taskError } = await admin
      .from("crop_care_tasks")
      .select("id,user_id,title,due_at,plan:crop_care_plans(crop_name,issue_name)")
      .eq("status", "pending")
      .is("reminder_sent_at", null)
      .lte("due_at", now)
      .gte("due_at", cutoff)
      .order("due_at", { ascending: true })
      .limit(100);

    if (taskError) throw taskError;

    let sent = 0;
    let skipped = 0;
    for (const task of (dueTasks ?? []) as DueTask[]) {
      const { data: subscriptions, error: subscriptionError } = await admin
        .from("crop_care_push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", task.user_id);

      if (subscriptionError) {
        console.error("Could not load push subscriptions", subscriptionError);
        skipped++;
        continue;
      }
      if (!subscriptions?.length) {
        skipped++;
        continue;
      }

      let delivered = false;
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({
              title: "Omulimi · Crop check due",
              body: `It is time to: ${task.title}.`,
              icon: "/pwa-icon-192.png",
              tag: `omulimi-task-${task.id}`,
              url: "/",
            }),
            { TTL: 60 * 60 },
          );
          delivered = true;
          sent++;
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("crop_care_push_subscriptions").delete().eq("id", subscription.id);
          } else {
            console.error("Push delivery failed", { taskId: task.id, statusCode, error });
          }
        }
      }

      if (delivered) {
        const { error: markError } = await admin
          .from("crop_care_tasks")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", task.id)
          .is("reminder_sent_at", null);
        if (markError) console.error("Could not mark reminder as sent", markError);
      } else {
        skipped++;
      }
    }

    return Response.json({ ok: true, due: dueTasks?.length ?? 0, sent, skipped });
  } catch (error) {
    console.error("Crop reminder job failed", error);
    return Response.json({ error: "Crop reminder delivery failed" }, { status: 500 });
  }
});
