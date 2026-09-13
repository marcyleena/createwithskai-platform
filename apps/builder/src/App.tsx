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
import { generateApp, requestChange, friendlyErrorMessage, type GenerationProgress } from "./lib/anthropic";
import { determineStack, STACK_LABELS } from "./lib/stackDetection";
import { isLikelySparseGeneration } from "./lib/previewBuilder";
import { deployApp, type DeployResult } from "./lib/deployClient";
import { consumeGithubOAuthResult } from "./lib/githubOAuth";
import { clearIntakeDraft } from "./lib/intakeDraft";
import { resolveAppName, slugifyRepoName } from "./lib/naming";
import { filesToRecord, filesFromRecord } from "./lib/fileStorage";
import { fetchRepoFiles } from "./lib/githubFetch";
import type { BuildConfig, GeneratedFile, IntakeAnswers, Stack } from "./lib/types";

type Mode = "intake" | "generating" | "build";

const INCOMPLETE_GENERATION_WARNING =
  "Your app generated but may be incomplete -- some features may be missing. You can request missing features using the change request field below.";

// Every React generation produces a fixed scaffold of files no matter how
// simple the app is (see isLikelySparseGeneration in lib/previewBuilder.ts),
// so a suspiciously low file count only means something went wrong for an
// app that was actually asked to do a lot -- for a genuinely simple,
// single-feature app, the same low count is normal and not worth flagging.
function isComplexApp(answers: IntakeAnswers): boolean {
  const featureCount = answers.features
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  return featureCount >= 3 || answers.needsAccounts || answers.needsPersistence || answers.usesAI;
}

// `error` distinguishes "we couldn't check whether you have a key" (a
// Supabase credential-fetch failure) from "you genuinely don't have one yet"
// -- the former is a transient problem worth retrying, not a setup step.
function MissingApiKey({ error }: { error?: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <Card className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold text-espresso">
          {error ? "Couldn't load your account" : "Add your Anthropic API key"}
        </h1>
        <p className="mb-5 text-sm text-espresso/70">
          {error ??
            "The App Builder needs your own Anthropic API key to generate code. Add it once from your dashboard and every Launchpad tool -- including this one -- picks it up automatically."}
        </p>
        {error ? (
          <Button variant="dark" onClick={() => window.location.reload()}>
            Try again
          </Button>
        ) : (
          <a href={getHubOrigin()}>
            <Button variant="dark">Go to your dashboard</Button>
          </a>
        )}
      </Card>
    </div>
  );
}

function BuilderApp() {
  const { user, signOut } = useAuth();
  const { apiKey, loading: apiKeyLoading, error: apiKeyError } = useApiKey();
  const { builds, createBuild, updateBuild, deleteBuild, hasMore, loadingMore, loadMore } = useBuilds(user?.id);
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
  const [incompleteWarning, setIncompleteWarning] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState<GenerationProgress>({ charsSoFar: 0, currentFile: null });
  const [changeRequesting, setChangeRequesting] = useState(false);
  const [changeProgress, setChangeProgress] = useState<GenerationProgress>({ charsSoFar: 0, currentFile: null });
  const [changeError, setChangeError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [loadingBuildFiles, setLoadingBuildFiles] = useState(false);

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
  if (apiKeyError) return <MissingApiKey error={apiKeyError} />;
  if (!apiKey) return <MissingApiKey />;

  async function handleIntakeComplete(newAnswers: IntakeAnswers) {
    setAnswers(newAnswers);
    const detectedStack = determineStack(newAnswers);
    setStack(detectedStack);
    setMode("generating");
    setGenerateError(null);
    setGenerateProgress({ charsSoFar: 0, currentFile: null });

    try {
      const generatedFiles = await generateApp(apiKey!, detectedStack, newAnswers, setGenerateProgress);
      const name = resolveAppName(newAnswers);
      setBuildName(name);
      setFiles(generatedFiles);
      setDeployResult(null);
      setIncompleteWarning(
        isComplexApp(newAnswers) && isLikelySparseGeneration(generatedFiles, detectedStack)
          ? INCOMPLETE_GENERATION_WARNING
          : null
      );

      const config: BuildConfig = { answers: newAnswers, stack: detectedStack, files: filesToRecord(generatedFiles) };
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
    setChangeProgress({ charsSoFar: 0, currentFile: null });
    try {
      const updatedFiles = await requestChange(apiKey!, stack, files, request, setChangeProgress);
      setFiles(updatedFiles);
      if (activeBuildId && answers) {
        const config: BuildConfig = { answers, stack, files: filesToRecord(updatedFiles) };
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
    // Captured before the call resolves and setDeployResult below replaces
    // it -- this specific click's intent (create vs. update the repo)
    // shouldn't change based on its own result.
    const isRedeploy = Boolean(deployResult?.repoFullName);
    setDeploying(true);
    setDeployError(null);
    try {
      const result = await deployApp({
        githubToken: github.value,
        vercelToken: vercel.value,
        repoName: slugifyRepoName(buildName),
        existingRepoFullName: deployResult?.repoFullName,
        files,
      });
      setDeployResult(result);
      if (activeBuildId && answers) {
        const config: BuildConfig = { answers, stack, files: filesToRecord(files), ...result };
        await updateBuild(activeBuildId, { status: isRedeploy ? "updated" : "published", config });
      }
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Deployment failed.");
    } finally {
      setDeploying(false);
    }
  }

  async function handleSelectBuild(id: string) {
    const build = builds.find((b: AppBuild) => b.id === id);
    if (!build) return;
    const config = build.config as unknown as BuildConfig;
    setActiveBuildId(id);
    setBuildName(build.name);
    setStack(config.stack);
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
    setIncompleteWarning(null);
    setMode("build");
    setSidebarOpen(false);

    let loadedFiles = filesFromRecord(config.files);
    // Every generation and change request stores files in config (see
    // filesToRecord above), so this should be rare -- a defensive fallback
    // for an older build saved before that, or any record that somehow
    // ended up without them, as long as it was at least deployed once.
    if (loadedFiles.length === 0 && config.repoFullName && github.value) {
      setFiles([]);
      setLoadingBuildFiles(true);
      try {
        loadedFiles = await fetchRepoFiles(github.value, config.repoFullName, config.stack);
      } catch {
        loadedFiles = [];
      }
      setLoadingBuildFiles(false);
    }
    setFiles(loadedFiles);
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
    setIncompleteWarning(null);
    setLoadingBuildFiles(false);
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
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
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
              <IntakeWizard key={intakeKey} apiKey={apiKey!} onComplete={handleIntakeComplete} />
            </div>
          )}

          {mode === "generating" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-taupe/40 border-t-accent-pink" />
              <p className="text-sm text-espresso/70">
                {generateProgress.currentFile
                  ? `Generating ${basename(generateProgress.currentFile)}...`
                  : `Building your ${STACK_LABELS[stack].toLowerCase()} app...`}
              </p>
              {generateProgress.charsSoFar > 0 && (
                <p className="text-xs text-espresso/40">
                  {generateProgress.charsSoFar.toLocaleString()} characters generated
                </p>
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

              {incompleteWarning && (
                <p className="rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-700">{incompleteWarning}</p>
              )}

              {loadingBuildFiles ? (
                <div className="flex h-[420px] items-center justify-center rounded-xl border border-taupe/40 bg-white text-sm text-espresso/60 sm:h-[520px]">
                  Loading your app's files from GitHub...
                </div>
              ) : (
                <div className="h-[420px] sm:h-[520px]">
                  <LivePreview files={files} stack={stack} />
                </div>
              )}

              <ChangeRequestBar onSubmit={handleChangeRequest} disabled={changeRequesting || loadingBuildFiles} />
              {changeRequesting && (
                <p className="text-xs text-espresso/40">
                  {changeProgress.currentFile
                    ? `Generating ${basename(changeProgress.currentFile)}...`
                    : "Working on it..."}
                  {changeProgress.charsSoFar > 0 &&
                    ` (${changeProgress.charsSoFar.toLocaleString()} characters generated)`}
                </p>
              )}
              {changeError && <p className="text-sm text-red-600">{changeError}</p>}

              <PostGenerationGuide
                key={activeBuildId ?? "new"}
                answers={answers}
                stack={stack}
                files={files}
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
                isRedeploy={Boolean(deployResult?.repoFullName)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function basename(path: string): string {
  return path.split("/").pop() || path;
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
