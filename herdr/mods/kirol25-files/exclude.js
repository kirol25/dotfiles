// Names the Files panel leaves out, at any depth. Applies to files and folders.
// `*` matches any run of characters ("*.pyc"); everything else is literal.
// Saving this file updates the panel at once. The header's "N hidden" toggle shows them again.
export default [
  "__pycache__",
  ".ruff_cache",
  ".mypy_cache",
  ".pytest_cache",
  ".DS_Store",
  "*.pyc",
];
