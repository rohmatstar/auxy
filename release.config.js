module.exports = {
  branches: ["master"],
  plugins: [
    "@semantic-release/commit-analyzer", // Baca commit message
    "@semantic-release/release-notes-generator", // Buat release note
    "@semantic-release/changelog", // Update CHANGELOG.md
    "@semantic-release/npm", // Publish ke NPM
    "@semantic-release/git", // Commit perubahan changelog + package.json
    "@semantic-release/github", // Buat GitHub Release
  ],
  preset: "conventionalcommits",
};
