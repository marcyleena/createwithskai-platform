import { useAuth } from "@createwithskai/auth";
import { useToolActivity } from "../../hooks/useToolActivity";

// A single funnel-ordered message: Coach -> brand profile -> Creator HQ ->
// App Builder. Only the first unmet condition is shown; once every tool has
// been used, the prompt disappears entirely.
export function NextStepPrompt() {
  const { user } = useAuth();
  const activity = useToolActivity(user?.id);

  if (activity.loading) return null;

  let message: string | null = null;
  if (!activity.hasUsedCoach) {
    message =
      "New here? Start with Coach -- tell Skai what you are building and she will help you figure out the right path forward.";
  } else if (!activity.hasBrandProfile) {
    message =
      "Keep going in Coach -- you have started but your brand profile is not complete yet. Skai will help you finish it.";
  } else if (!activity.hasUsedHq) {
    message =
      "Ready for Creator HQ -- now that you have your brand direction, use Creator HQ to plan your content and track what is working in your niche.";
  } else if (!activity.hasUsedBuilder) {
    message =
      "Ready to build a product? Open the App Builder and describe the app you want to create. It will be live on your own domain in minutes.";
  }

  if (!message) return null;

  return (
    <section className="mb-16 rounded-2xl border border-taupe/40 bg-gradient-to-r from-pink/20 to-accent-pink/10 p-6">
      <p className="text-espresso">{message}</p>
    </section>
  );
}
