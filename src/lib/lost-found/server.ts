import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { iso } from "@/lib/utils";
import {
  HANDOFF_CHECKPOINTS,
  ITEM_CATEGORIES,
  PHONE_RE,
  REG_NUMBER_RE,
  isCampusVenue,
  isCategory,
  isCheckpoint,
} from "@/lib/campus";

const TITLE_MAX = 80;
const DESC_MAX = 800;
const CHALLENGE_MAX = 200;
const ANSWER_MAX = 400;
const MESSAGE_MAX = 500;

function newId(): string {
  return crypto.randomUUID();
}

export type PublicItem = {
  id: string;
  kind: "lost" | "found";
  category: string;
  venue: string;
  title: string;
  description: string;
  verificationChallenge: string;
  status: "active" | "resolved";
  createdAt: string;
};

export type CampusStats = {
  activeLost: number;
  activeFound: number;
  recovered: number;
};

export type DeskItem = PublicItem & {
  pendingClaims: number;
  approvedClaimId: string | null;
};

export type IncomingClaim = {
  id: string;
  itemId: string;
  itemTitle: string;
  itemKind: "lost" | "found";
  answer: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type OutgoingClaim = {
  id: string;
  itemId: string;
  itemTitle: string;
  itemKind: "lost" | "found";
  itemVenue: string;
  status: "pending" | "approved" | "rejected";
  meetupCheckpoint: string | null;
  createdAt: string;
};

export type StudentProfile = {
  displayName: string;
  registrationNumber: string;
  phone: string;
  email: string | null;
};

export type HandoffMessage = {
  id: string;
  from: "you" | "other";
  body: string;
  createdAt: string;
};

export type HandoffPayload = {
  claimId: string;
  claimStatus: "pending" | "approved" | "rejected";
  meetupCheckpoint: string | null;
  role: "finder" | "claimant";
  otherLabel: "Finder" | "Claimant";
  item: PublicItem;
  messages: HandoffMessage[];
};

type ItemRow = {
  id: string;
  reporter_id: string;
  kind: "lost" | "found";
  category: string;
  venue: string;
  title: string;
  description: string;
  verification_challenge: string;
  status: "active" | "resolved";
  created_at: unknown;
};

function toPublicItem(row: ItemRow): PublicItem {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    venue: row.venue,
    title: row.title,
    description: row.description,
    verificationChallenge: row.verification_challenge,
    status: row.status,
    createdAt: iso(row.created_at),
  };
}

function parseBoardFilters(input: unknown) {
  return z
    .object({
      kind: z.enum(["lost", "found"]),
      category: z.string().optional(),
      venue: z.string().optional(),
      q: z.string().optional(),
    })
    .parse(input);
}

export const getCampusStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<CampusStats> => {
    const sql = await getSql();
    const [lost] = await sql<{ n: number }>`
      select count(*)::int as n from items where status = 'active' and kind = 'lost'
    `;
    const [found] = await sql<{ n: number }>`
      select count(*)::int as n from items where status = 'active' and kind = 'found'
    `;
    const [recovered] = await sql<{ n: number }>`
      select count(*)::int as n from items where status = 'resolved'
    `;
    return {
      activeLost: lost?.n ?? 0,
      activeFound: found?.n ?? 0,
      recovered: recovered?.n ?? 0,
    };
  },
);

export const listCampusBoard = createServerFn({ method: "GET" })
  .validator(parseBoardFilters)
  .handler(async ({ data }): Promise<PublicItem[]> => {
    const sql = await getSql();
    const params: unknown[] = [data.kind];
    let where = "status = 'active' and kind = $1";
    const category = data.category?.trim();
    if (category && category !== "all") {
      if (!isCategory(category)) throw new Error("Unknown category.");
      params.push(category);
      where += ` and category = $${params.length}`;
    }
    const venue = data.venue?.trim();
    if (venue && venue !== "all") {
      if (!isCampusVenue(venue)) throw new Error("Unknown campus venue.");
      params.push(venue);
      where += ` and venue = $${params.length}`;
    }
    const q = data.q?.trim();
    if (q) {
      params.push(`%${q.replace(/[%_]/g, "").slice(0, 80)}%`);
      where += ` and (title ilike $${params.length} or description ilike $${params.length})`;
    }
    const rows = await sql.query<ItemRow>(
      `select id, reporter_id, kind, category, venue, title, description, verification_challenge, status, created_at
       from items where ${where} order by created_at desc limit 80`,
      params,
    );
    return rows.map(toPublicItem);
  });

export const getPublicItem = createServerFn({ method: "GET" })
  .validator((id: unknown) => z.string().min(1).max(80).parse(id))
  .handler(async ({ data: id }): Promise<PublicItem | null> => {
    const sql = await getSql();
    const rows = await sql<ItemRow>`
      select id, reporter_id, kind, category, venue, title, description, verification_challenge, status, created_at
      from items where id = ${id} limit 1
    `;
    const row = rows[0];
    return row ? toPublicItem(row) : null;
  });

async function ensureProfile(
  userId: string,
  fallbackName: string,
): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into profiles (user_id, display_name)
    values (${userId}, ${fallbackName.slice(0, 80) || "VIT student"})
    on conflict (user_id) do nothing
  `;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<StudentProfile> => {
    const sql = await getSql();
    await ensureProfile(context.userId, "VIT student");
    const rows = await sql<{
      display_name: string;
      registration_number: string;
      phone: string;
    }>`
      select display_name, registration_number, phone
      from profiles where user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    return {
      displayName: row?.display_name ?? "VIT student",
      registrationNumber: row?.registration_number ?? "",
      phone: row?.phone ?? "",
      email: null,
    };
  });

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || REG_NUMBER_RE.test(v), "Use a VIT reg. number such as 21BCE0123."),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || PHONE_RE.test(v), "Use a 10-digit Indian mobile number."),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ context, data }): Promise<StudentProfile> => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, display_name, registration_number, phone, updated_at)
      values (${context.userId}, ${data.displayName}, ${data.registrationNumber}, ${data.phone}, now())
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        registration_number = excluded.registration_number,
        phone = excluded.phone,
        updated_at = now()
    `;
    return {
      displayName: data.displayName,
      registrationNumber: data.registrationNumber,
      phone: data.phone,
      email: null,
    };
  });

const reportSchema = z.object({
  kind: z.enum(["lost", "found"]),
  category: z.enum(ITEM_CATEGORIES),
  venue: z.string().refine(isCampusVenue, "Pick an official VIT campus landmark."),
  title: z.string().trim().min(3, "Title is too short.").max(TITLE_MAX),
  description: z.string().trim().min(10, "Add a bit more detail so the owner can recognise it.").max(DESC_MAX),
  verificationChallenge: z
    .string()
    .trim()
    .min(8, "Set a private question only the real owner would know.")
    .max(CHALLENGE_MAX),
});

export const createReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => reportSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const sql = await getSql();
    await ensureProfile(context.userId, "VIT student");
    const id = newId();
    await sql`
      insert into items (
        id, reporter_id, kind, category, venue, title, description, verification_challenge, status
      ) values (
        ${id}, ${context.userId}, ${data.kind}, ${data.category}, ${data.venue},
        ${data.title}, ${data.description}, ${data.verificationChallenge}, 'active'
      )
    `;
    return { id };
  });

const claimSchema = z.object({
  itemId: z.string().min(1).max(80),
  answer: z.string().trim().min(2, "Answer the verification question.").max(ANSWER_MAX),
});

export const submitClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => claimSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ id: string; status: string }> => {
    const sql = await getSql();
    const items = await sql<ItemRow>`
      select id, reporter_id, kind, category, venue, title, description, verification_challenge, status, created_at
      from items where id = ${data.itemId} limit 1
    `;
    const item = items[0];
    if (!item) throw new Error("That notice is no longer on the board.");
    if (item.status !== "active") throw new Error("This item has already been resolved.");
    if (item.reporter_id === context.userId) {
      throw new Error("You cannot claim a notice you posted.");
    }

    const existing = await sql<{
      id: string;
      status: "pending" | "approved" | "rejected";
    }>`
      select id, status from claims
      where item_id = ${item.id} and claimant_id = ${context.userId}
      limit 1
    `;
    const prior = existing[0];
    if (prior?.status === "approved") {
      return { id: prior.id, status: prior.status };
    }
    if (prior?.status === "pending") {
      throw new Error("Your claim is already with the reporter. Wait for a decision.");
    }
    if (prior?.status === "rejected") {
      await sql`
        update claims
        set answer = ${data.answer}, status = 'pending', decided_at = null
        where id = ${prior.id} and claimant_id = ${context.userId}
      `;
      return { id: prior.id, status: "pending" };
    }

    const id = newId();
    await sql`
      insert into claims (id, item_id, claimant_id, answer, status)
      values (${id}, ${item.id}, ${context.userId}, ${data.answer}, 'pending')
    `;
    return { id, status: "pending" };
  });

export const getItemWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.string().min(1).max(80).parse(id))
  .handler(
    async ({
      context,
      data: id,
    }): Promise<{
      item: PublicItem;
      isReporter: boolean;
      myClaim: OutgoingClaim | null;
      incoming: IncomingClaim[];
    } | null> => {
      const sql = await getSql();
      const items = await sql<ItemRow>`
        select id, reporter_id, kind, category, venue, title, description, verification_challenge, status, created_at
        from items where id = ${id} limit 1
      `;
      const row = items[0];
      if (!row) return null;
      const item = toPublicItem(row);
      const isReporter = row.reporter_id === context.userId;

      const mine = await sql<{
        id: string;
        status: "pending" | "approved" | "rejected";
        meetup_checkpoint: string | null;
        created_at: unknown;
      }>`
        select id, status, meetup_checkpoint, created_at
        from claims where item_id = ${row.id} and claimant_id = ${context.userId}
        limit 1
      `;
      const myRow = mine[0];
      const myClaim: OutgoingClaim | null = myRow
        ? {
            id: myRow.id,
            itemId: row.id,
            itemTitle: row.title,
            itemKind: row.kind,
            itemVenue: row.venue,
            status: myRow.status,
            meetupCheckpoint: myRow.meetup_checkpoint,
            createdAt: iso(myRow.created_at),
          }
        : null;

      let incoming: IncomingClaim[] = [];
      if (isReporter) {
        const claims = await sql<{
          id: string;
          answer: string;
          status: "pending" | "approved" | "rejected";
          created_at: unknown;
        }>`
          select id, answer, status, created_at
          from claims where item_id = ${row.id}
          order by created_at desc
        `;
        incoming = claims.map((c) => ({
          id: c.id,
          itemId: row.id,
          itemTitle: row.title,
          itemKind: row.kind,
          answer: c.answer,
          status: c.status,
          createdAt: iso(c.created_at),
        }));
      }

      return { item, isReporter, myClaim, incoming };
    },
  );

export const getMyDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(
    async ({
      context,
    }): Promise<{
      reports: DeskItem[];
      incoming: IncomingClaim[];
      outgoing: OutgoingClaim[];
    }> => {
      const sql = await getSql();
      await ensureProfile(context.userId, "VIT student");
      const reports = await sql<ItemRow & { pending: number; approved_id: string | null }>`
        select i.id, i.reporter_id, i.kind, i.category, i.venue, i.title, i.description,
               i.verification_challenge, i.status, i.created_at,
               (select count(*)::int from claims c where c.item_id = i.id and c.status = 'pending') as pending,
               (select c.id from claims c where c.item_id = i.id and c.status = 'approved' limit 1) as approved_id
        from items i
        where i.reporter_id = ${context.userId}
        order by i.created_at desc
      `;
      const incoming = await sql<{
        id: string;
        item_id: string;
        title: string;
        kind: "lost" | "found";
        answer: string;
        status: "pending" | "approved" | "rejected";
        created_at: unknown;
      }>`
        select c.id, c.item_id, i.title, i.kind, c.answer, c.status, c.created_at
        from claims c
        join items i on i.id = c.item_id
        where i.reporter_id = ${context.userId}
        order by c.created_at desc
      `;
      const outgoing = await sql<{
        id: string;
        item_id: string;
        title: string;
        kind: "lost" | "found";
        venue: string;
        status: "pending" | "approved" | "rejected";
        meetup_checkpoint: string | null;
        created_at: unknown;
      }>`
        select c.id, c.item_id, i.title, i.kind, i.venue, c.status, c.meetup_checkpoint, c.created_at
        from claims c
        join items i on i.id = c.item_id
        where c.claimant_id = ${context.userId}
        order by c.created_at desc
      `;
      return {
        reports: reports.map((r) => ({
          ...toPublicItem(r),
          pendingClaims: r.pending,
          approvedClaimId: r.approved_id,
        })),
        incoming: incoming.map((c) => ({
          id: c.id,
          itemId: c.item_id,
          itemTitle: c.title,
          itemKind: c.kind,
          answer: c.answer,
          status: c.status,
          createdAt: iso(c.created_at),
        })),
        outgoing: outgoing.map((c) => ({
          id: c.id,
          itemId: c.item_id,
          itemTitle: c.title,
          itemKind: c.kind,
          itemVenue: c.venue,
          status: c.status,
          meetupCheckpoint: c.meetup_checkpoint,
          createdAt: iso(c.created_at),
        })),
      };
    },
  );

const decideSchema = z.object({
  claimId: z.string().min(1).max(80),
  decision: z.enum(["approved", "rejected"]),
});

export const decideClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => decideSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ id: string; status: string }> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      item_id: string;
      status: string;
      reporter_id: string;
      item_status: string;
    }>`
      select c.id, c.item_id, c.status, i.reporter_id, i.status as item_status
      from claims c
      join items i on i.id = c.item_id
      where c.id = ${data.claimId}
      limit 1
    `;
    const row = rows[0];
    if (!row || row.reporter_id !== context.userId) {
      throw new Error("This claim is not on your desk.");
    }
    if (row.item_status !== "active") throw new Error("This item is already resolved.");
    if (row.status !== "pending") throw new Error("That claim has already been decided.");

    if (data.decision === "approved") {
      await sql`
        update claims set status = 'rejected', decided_at = now()
        where item_id = ${row.item_id} and status = 'pending' and id <> ${row.id}
      `;
    }
    await sql`
      update claims
      set status = ${data.decision}, decided_at = now()
      where id = ${row.id}
    `;
    return { id: row.id, status: data.decision };
  });

async function loadHandoffForUser(
  userId: string,
  claimId: string,
): Promise<HandoffPayload> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    item_id: string;
    claimant_id: string;
    status: "pending" | "approved" | "rejected";
    meetup_checkpoint: string | null;
    reporter_id: string;
    kind: "lost" | "found";
    category: string;
    venue: string;
    title: string;
    description: string;
    verification_challenge: string;
    item_status: "active" | "resolved";
    item_created: unknown;
  }>`
    select c.id, c.item_id, c.claimant_id, c.status, c.meetup_checkpoint,
           i.reporter_id, i.kind, i.category, i.venue, i.title, i.description,
           i.verification_challenge, i.status as item_status, i.created_at as item_created
    from claims c
    join items i on i.id = c.item_id
    where c.id = ${claimId}
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error("Handoff thread not found.");
  const isReporter = row.reporter_id === userId;
  const isClaimant = row.claimant_id === userId;
  if (!isReporter && !isClaimant) {
    throw new Error("You are not part of this handoff.");
  }
  if (row.status !== "approved") {
    throw new Error("The handoff thread opens only after the claim is approved.");
  }
  const messages = await sql<{
    id: string;
    sender_id: string;
    body: string;
    created_at: unknown;
  }>`
    select id, sender_id, body, created_at
    from messages where claim_id = ${row.id}
    order by created_at asc
  `;
  const role = isReporter ? "finder" : "claimant";
  return {
    claimId: row.id,
    claimStatus: row.status,
    meetupCheckpoint: row.meetup_checkpoint,
    role,
    otherLabel: role === "finder" ? "Claimant" : "Finder",
    item: toPublicItem({
      id: row.item_id,
      reporter_id: row.reporter_id,
      kind: row.kind,
      category: row.category,
      venue: row.venue,
      title: row.title,
      description: row.description,
      verification_challenge: row.verification_challenge,
      status: row.item_status,
      created_at: row.item_created,
    }),
    messages: messages.map((m) => ({
      id: m.id,
      from: m.sender_id === userId ? "you" : "other",
      body: m.body,
      createdAt: iso(m.created_at),
    })),
  };
}

export const getHandoff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.string().min(1).max(80).parse(id))
  .handler(async ({ context, data }) => loadHandoffForUser(context.userId, data));

const messageSchema = z.object({
  claimId: z.string().min(1).max(80),
  body: z.string().trim().min(1, "Write a message.").max(MESSAGE_MAX),
});

export const sendHandoffMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => messageSchema.parse(input))
  .handler(async ({ context, data }): Promise<HandoffPayload> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      claimant_id: string;
      reporter_id: string;
      status: string;
      item_status: string;
    }>`
      select c.id, c.claimant_id, i.reporter_id, c.status, i.status as item_status
      from claims c
      join items i on i.id = c.item_id
      where c.id = ${data.claimId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Handoff thread not found.");
    if (row.reporter_id !== context.userId && row.claimant_id !== context.userId) {
      throw new Error("You are not part of this handoff.");
    }
    if (row.status !== "approved") throw new Error("This claim is not approved.");
    if (row.item_status !== "active") {
      throw new Error("This return is already marked resolved.");
    }
    const id = newId();
    await sql`
      insert into messages (id, claim_id, sender_id, body)
      values (${id}, ${row.id}, ${context.userId}, ${data.body})
    `;
    return loadHandoffForUser(context.userId, row.id);
  });

const meetupSchema = z.object({
  claimId: z.string().min(1).max(80),
  checkpoint: z.enum(HANDOFF_CHECKPOINTS),
});

export const setMeetupCheckpoint = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => meetupSchema.parse(input))
  .handler(async ({ context, data }): Promise<HandoffPayload> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      claimant_id: string;
      reporter_id: string;
      status: string;
      item_status: string;
    }>`
      select c.id, c.claimant_id, i.reporter_id, c.status, i.status as item_status
      from claims c
      join items i on i.id = c.item_id
      where c.id = ${data.claimId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Handoff thread not found.");
    if (row.reporter_id !== context.userId && row.claimant_id !== context.userId) {
      throw new Error("You are not part of this handoff.");
    }
    if (row.status !== "approved") throw new Error("Approve the claim before setting a checkpoint.");
    if (row.item_status !== "active") throw new Error("This return is already resolved.");
    if (!isCheckpoint(data.checkpoint)) throw new Error("Pick an official campus checkpoint.");
    await sql`
      update claims set meetup_checkpoint = ${data.checkpoint}
      where id = ${row.id}
    `;
    const note = `Meetup checkpoint set: ${data.checkpoint}`;
    await sql`
      insert into messages (id, claim_id, sender_id, body)
      values (${newId()}, ${row.id}, ${context.userId}, ${note})
    `;
    return loadHandoffForUser(context.userId, row.id);
  });

const resolveSchema = z.object({
  itemId: z.string().min(1).max(80),
});

export const resolveItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => resolveSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await getSql();
    const items = await sql<{
      id: string;
      reporter_id: string;
      status: string;
    }>`
      select id, reporter_id, status from items where id = ${data.itemId} limit 1
    `;
    const item = items[0];
    if (!item) throw new Error("Notice not found.");
    if (item.status !== "active") return { ok: true };

    const approved = await sql<{ claimant_id: string }>`
      select claimant_id from claims
      where item_id = ${item.id} and status = 'approved'
      limit 1
    `;
    const claimantId = approved[0]?.claimant_id;
    const allowed = item.reporter_id === context.userId || claimantId === context.userId;
    if (!allowed) throw new Error("Only the two parties on an approved return can resolve it.");

    await sql`
      update items
      set status = 'resolved', resolved_at = now(), resolved_by = ${context.userId}
      where id = ${item.id} and status = 'active'
    `;
    return { ok: true };
  });
