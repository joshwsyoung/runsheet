import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteForm } from "@/app/actions/invites";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("peek_invite", { invite_token: token });
  const peek = rows?.[0];
  if (!peek) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh justify-center bg-[#fcfcfc] p-4">
      <div className="w-full max-w-[420px] space-y-4 pt-12">
        <div className="rs-card space-y-2">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">Invitation</p>
          <h1 className="text-xl font-bold text-[#333]">{peek.title}</h1>
          <p className="text-sm text-[#666]">
            You have been invited to collaborate using{" "}
            <span className="font-bold text-[#333]">{peek.email}</span>.
          </p>
        </div>

        {peek.accepted ? (
          <div className="rs-card text-sm text-[#555]">This invite was already accepted.</div>
        ) : !user ? (
          <div className="rs-card space-y-3 text-sm text-[#555]">
            <p>Sign in with the invited email to accept.</p>
            <Link
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#4a90e2] py-2.5 text-sm font-bold text-white no-underline shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
              href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            >
              Sign in
            </Link>
            <Link className="block text-center text-sm font-bold text-[#4a90e2]" href="/signup">
              Create account
            </Link>
          </div>
        ) : (
          <form action={acceptInviteForm} className="rs-card space-y-3">
            <input type="hidden" name="token" value={token} />
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {decodeURIComponent(error)}
              </p>
            ) : null}
            <p className="text-sm text-[#666]">
              Signed in as <span className="font-bold text-[#333]">{user.email}</span>. Accept to
              open the runsheet.
            </p>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#4a90e2] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
            >
              Accept invite
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
