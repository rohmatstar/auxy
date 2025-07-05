#!/usr/bin/env node

const simpleGit = require("simple-git");
const git = simpleGit();
const { execSync, spawnSync } = require("child_process");
const fetch = require("node-fetch");

const validTypes = [
  "fix",
  "feat",
  "chore",
  "docs",
  "style",
  "refactor",
  "test",
  "major",
];

const args = process.argv.slice(2);
const inputType = args[0];
const msgParts = args.slice(1);

function checkOllamaExists() {
  try {
    const possibleNames =
      process.platform === "win32" ? ["ollama.exe"] : ["ollama"];
    const pathDirs = process.env.PATH.split(path.delimiter);

    for (const dir of pathDirs) {
      for (const name of possibleNames) {
        const fullPath = path.join(dir, name);
        if (fs.existsSync(fullPath)) {
          return true;
        }
      }
    }
  } catch {
    console.log("platform", process.platform);
    console.warn(
      `
⚠️  Ollama tidak ditemukan di sistem Anda.

Untuk menggunakan AI commit message otomatis, silakan install Ollama:

🔗 https://ollama.com/download

🛠 Atau gunakan perintah:
  curl -fsSL https://ollama.com/install.sh | sh     # untuk Linux/macOS

📦 Jika Anda di Windows, download installer dari situs resminya.

Sementara itu, fallback ke custom message atau daftar file...
    `.trim()
    );
    return false;
  }
}

async function ensureOllamaRunning() {
  try {
    const res = await fetch("http://localhost:11434");
    if (res.ok) return true;
  } catch (err) {
    console.log("🟡 Ollama tidak berjalan. Mencoba menjalankannya...");
  }

  spawnSync("ollama", ["run", "phi"], {
    detached: true,
    stdio: "ignore",
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));
}

function getGitDiffCached(limit = 3000) {
  try {
    const diff = execSync(
      "git diff --cached --unified=0 --no-color"
    ).toString();
    return diff.slice(0, limit);
  } catch {
    return "";
  }
}

async function getAIMessage(diffText, files) {
  const prompt = `
Buat commit message singkat, bermakna, dan sesuai format conventional commit.
File yang diubah: ${files.join(", ")}

Isi perubahan kode (terbatas 3000 karakter):
${diffText}
  `.trim();

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "phi", prompt, stream: false }),
  });

  const data = await res.json();
  return data.response.trim();
}

(async () => {
  let type = validTypes.includes(inputType) ? inputType : null;
  if (type === "major") type = "BREAKING CHANGE";

  try {
    console.log("🔄 Fetching & pulling...");
    await git.fetch();
    await git.pull();

    const status = await git.status();
    const changedFiles = status.files.map((f) => f.path);

    if (changedFiles.length === 0) {
      console.log("✅ Tidak ada perubahan untuk di-commit.");
      return;
    }

    console.log("➕ Menambahkan file...");
    await git.add("./*");

    // Auto detect type
    if (!type) {
      let hasMajor = changedFiles.some(
        (f) =>
          f.startsWith("routes/") || f.startsWith("auth/") || f === "app.js"
      );
      let hasMinor = changedFiles.includes("firebase.js");
      type = hasMajor ? "feat!" : hasMinor ? "feat" : "fix";
    }

    let commitMsg = msgParts.join(" ").trim();
    const useAI = !commitMsg && checkOllamaExists();

    if (useAI) {
      await ensureOllamaRunning();
      const diff = getGitDiffCached();
      commitMsg = await getAIMessage(diff, changedFiles);
    }

    const fallbackMsg = changedFiles.join(", ");
    const finalMessage = `${type}: ${commitMsg || fallbackMsg}`;

    console.log(`✅ Commit dengan pesan: "${finalMessage}"`);
    await git.commit(finalMessage);
    await git.push();

    console.log("🚀 Selesai!");
  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err.message);
  }
})();
