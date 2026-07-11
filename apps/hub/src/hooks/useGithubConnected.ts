import { useIdentities } from "./useIdentities";
import { useCredential } from "./useCredential";

// GitHub can get connected two different ways that both need to count as
// "connected" here: linking the identity directly through Supabase auth (this
// dashboard's own Connect button), or having already gone through the App
// Builder's separate GitHub OAuth flow, which stores the token as a
// user_credentials row (provider: "github", credential_type: "oauth_token",
// value: { access_token }) rather than a Supabase identity link. Without
// checking both, a user who connected via App Builder would be told to
// connect again here.
export function useGithubConnected() {
  const { identities, loading: identitiesLoading, connect, disconnect, refresh } = useIdentities();
  const { credential, loading: credentialLoading } = useCredential("github", "oauth_token");

  const identityLinked = identities.some((i) => i.provider === "github");
  const hasToken = Boolean((credential?.value as { access_token?: string } | undefined)?.access_token);

  return {
    connected: identityLinked || hasToken,
    loading: identitiesLoading || credentialLoading,
    identities,
    connect,
    disconnect,
    refresh,
  };
}
