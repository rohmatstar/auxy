#!/usr/bin/env node

const simpleGit = require("simple-git");
const git = simpleGit();

const args = process.argv.slice(2);
const inputType = args[0];
const msgParts = args.slice(1);

process.removeAllListeners("warning");

(async () => {
  let type = inputType;
  if (type === "major") type = "feat: Major Changes\n\nBREAKING CHANGE";

  try {
    console.log("🔄 Fetching & pulling...");
    await git.fetch();
    await git.pull();

    const status = await git.status();
    const changedFiles = status.files.map((f) => f.path);

    if (changedFiles.length === 0) {
      console.log("✅ There is no changes to commit!");
      return;
    }

    console.log("➕ Adding all files...");
    await git.add("./*");

    // Auto detect type
    if (!type) {
      let hasMajor = changedFiles.some(
        (f) =>
          f.startsWith("routes/") || f.startsWith("auth/") || f === "app.js"
      );
      let hasMinor = changedFiles.includes("firebase.js");
      type = hasMajor
        ? "feat: Major Changes\n\nBREAKING CHANGE"
        : hasMinor
        ? "feat"
        : "fix";
    }

    let commitMsg = msgParts.join(" ").trim();

    const fallbackMsg = changedFiles.join(", ");
    const finalMessage = `${type}: ${commitMsg || fallbackMsg}`;

    console.log(`✅ Comitting: "${finalMessage}"`);
    await git.commit(finalMessage);
    await git.push();

    console.log("🔄 Fetching & pulling latest changes...");
    await git.fetch();
    await git.pull();

    console.log("🚀 Done!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
