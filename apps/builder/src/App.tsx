import { useEffect, useState } from "react";
import { useAuth, RequireAuth } from "@createwithskai/auth";
import { getHubOrigin } from "@createwithskai/api";
import { Button, Card, BackToHubLink } from "@createwithskai/ui";
import type { AppBuild } from "@createwithskai/types";
import { BuilderSidebar } from "./components/BuilderSidebar";
import { IntakeWizard } from "./components/IntakeWizard";
import { LivePreview } from "./components/LivePreview";
import { ChangeRequestBar } from "./components/ChangeRequestBar";
import { PostGenerationGuide } from "./components/PostGenerationGuide";
import { DeploySection } from "./components/DeploySection";
import { useApiKey } from "./hooks/useApiKey";
import { useCredential } from "./hooks/useCredential";
import { useBuilds } from "./hooks/useBuilds";
import { generateApp, requestChange, friendlyErrorMessage } from "./lib/anthropic";
import { determineStack, STACK_LABELS } from "./lib/stackDetection";
import { deployApp, type DeployResult } from "./lib/deployClient";
import { consumeGithubOAuthResult } from "./lib/githubOAuth";
import { clearIntakeDraft } from "./lib/intakeDraft";
import { resolveAppName, slugifyRepoName } from "./lib/naming";
import type { BuildConfig, GeneratedFile, IntakeAnswers, Stack } from "./lib/types";

type Mode = "intake" | "generating" | "build";

function MissingApiKey() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <Card className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold text-espresso">Add your Anthropic API key</h1>
        <p className="mb-5 text-sm text-espresso/70">
          The App Builder needs your own Anthropic API key to generate code. Add it once from your
          dashboard and every Launchpad tool -- including this one -- picks it up automatically.
        </p>
        <a href={getHubOrigin()}>
          <Button variant="dark">Go to your dashboard</Button>
        </a>
      </Card>
    </div>
  );
}

function BuilderApp() {
  const { user, signOut } = useAuth();
  const { apiKey, loading: apiKeyLoading } = useApiKey();
  const { builds, createBuild, updateBuild, deleteBuild } = useBuilds(user?.id);
  const github = useCredential({ provider: "github", credentialType: "oauth_token", valueKey: "access_token" });
  const vercel = useCredential({ provider: "vercel", credentialType: "api_token", valueKey: "token" });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("intake");
  const [intakeKey, setIntakeKey] = useState(0);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [buildName, setBuildName] = useState("");
  const [stack, setStack] = useState<Stack>("static-html");
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [answers, setAnswers] = useState<IntakeAnswers | null>(null);

  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [changeRequesting, setChangeRequesting] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);

  // Pick up the GitHub token embedded in the URL after the OAuth callback
  // redirects back here, and store it once.
  useEffect(() => {
    const result = consumeGithubOAuthResult();
    if (!result) return;
    if ("token" in result) {
      github.save(result.token);
    } else {
      setDeployError(result.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (apiKeyLoading) return null;
  if (!apiKey) return <MissingApiKey />;

  async function handleIntakeComplete(newAnswers: IntakeAnswers) {
    setAnswers(newAnswers);
    const detectedStack = determineStack(newAnswers);
    setStack(detectedStack);
    setMode("generating");
    setGenerateError(null);
    setGenerateProgress(0);

    try {
      const generatedFiles = await generateApp(apiKey!, detectedStack, newAnswers, setGenerateProgress);
      const name = resolveAppName(newAnswers);
      setBuildName(name);
      setFiles(generatedFiles);
      setDeployResult(null);

      const config: BuildConfig = { answers: newAnswers, stack: detectedStack, files: generatedFiles };
      const created = await createBuild(name, detectedStack, config);
      setActiveBuildId(created?.id ?? null);
      setMode("build");
    } catch (err) {
      setGenerateError(friendlyErrorMessage(err));
      setMode("intake");
    }
  }

  async function handleChangeRequest(request: string) {
    setChangeRequesting(true);
    setChangeError(null);
    try {
      const updatedFiles = await requestChange(apiKey!, stack, files, request);
      setFiles(updatedFiles);
      if (activeBuildId && answers) {
        const config: BuildConfig = { answers, stack, files: updatedFiles };
        await updateBuild(activeBuildId, { config });
      }
    } catch (err) {
      setChangeError(friendlyErrorMessage(err));
    } finally {
      setChangeRequesting(false);
    }
  }

  async function handleDeploy() {
    if (!github.value || !vercel.value) return;
    setDeploying(true);
    setDeployError(null);
    try {
      const result = await deployApp({
        githubToken: github.value,
        vercelToken: vercel.value,
        repoName: slugifyRepoName(buildName),
        files,
      });
      setDeployResult(result);
      if (activeBuildId && answers) {
        const config: BuildConfig = { answers, stack, files, ...result };
        await updateBuild(activeBuildId, { status: "published", config });
      }
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Deployment failed.");
    } finally {
      setDeploying(false);
    }
  }

  function handleSelectBuild(id: string) {
    const build = builds.find((b: AppBuild) => b.id === id);
    if (!build) return;
    const config = build.config as unknown as BuildConfig;
    setActiveBuildId(id);
    setBuildName(build.name);
    setStack(config.stack);
    setFiles(config.files);
    setAnswers(config.answers);
    setDeployResult(
      config.deploymentUrl && config.repoUrl && config.repoFullName
        ? {
            deploymentUrl: config.deploymentUrl,
            repoUrl: config.repoUrl,
            repoFullName: config.repoFullName,
            previewUrl: config.previewUrl ?? config.deploymentUrl,
          }
        : null
    );
    setDeployError(null);
    setChangeError(null);
    setMode("build");
    setSidebarOpen(false);
  }

  function handleNewBuild() {
    clearIntakeDraft();
    setIntakeKey((k) => k + 1);
    setActiveBuildId(null);
    setBuildName("");
    setFiles([]);
    setAnswers(null);
    setDeployResult(null);
    setGenerateError(null);
    setDeployError(null);
    setChangeError(null);
    setMode("intake");
    setSidebarOpen(false);
  }

  async function handleDeleteBuild(id: string) {
    await deleteBuild(id);
    if (id === activeBuildId) handleNewBuild();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <BuilderSidebar
        builds={builds}
        activeId={activeBuildId}
        onSelect={handleSelectBuild}
        onNew={handleNewBuild}
        onDelete={handleDeleteBuild}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-none items-center justify-between border-b border-taupe/30 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BackToHubLink href={getHubOrigin()} />
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-taupe/40 p-2 text-espresso/70 sm:hidden"
              aria-label="Open builds"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
            <a href={getHubOrigin()} className="text-lg font-semibold text-espresso">
              Builder
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-espresso/70 sm:inline">{user?.email}</span>
            <Button variant="outline" onClick={() => signOut()} className="px-4 py-2 text-sm">
              Sign out
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {mode === "intake" && (
            <div>
              {generateError && (
                <p className="mx-auto mt-6 max-w-2xl rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                  {generateError}
                </p>
              )}
              <IntakeWizard key={intakeKey} onComplete={handleIntakeComplete} />
            </div>
          )}

          {mode === "generating" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-taupe/40 border-t-accent-pink" />
              <p className="text-sm text-espresso/70">
                Building your {STACK_LABELS[stack].toLowerCase()} app...
              </p>
              {generateProgress > 0 && (
                <p className="text-xs text-espresso/40">{generateProgress.toLocaleString()} characters generated</p>
              )}
            </div>
          )}

          {mode === "build" && (
            <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="truncate text-lg font-semibold text-espresso">{buildName}</h2>
                <span className="flex-none rounded-full bg-taupe/20 px-3 py-1 text-xs font-medium text-espresso/70">
                  {STACK_LABELS[stack]}
                </span>
              </div>

              <div className="h-[420px] sm:h-[520px]">
                <LivePreview files={files} stack={stack} />
              </div>

              <ChangeRequestBar onSubmit={handleChangeRequest} disabled={changeRequesting} />
              {changeError && <p className="text-sm text-red-600">{changeError}</p>}

              <PostGenerationGuide
                key={activeBuildId ?? "new"}
                answers={answers}
                deployResult={deployResult}
                onAddFeature={handleChangeRequest}
                addingFeature={changeRequesting}
              />

              <DeploySection
                githubToken={github.value}
                vercelToken={vercel.value}
                onDeploy={handleDeploy}
                deploying={deploying}
                deployError={deployError}
                result={deployResult}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  return (
    <RequireAuth>
      <BuilderApp />
    </RequireAuth>
  );
}
