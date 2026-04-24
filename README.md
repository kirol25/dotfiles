# Dotfiles

Personal macOS development environment — shell, editor, and tooling config.

## Structure

```text
dotfiles/
├── install.sh              # Main install script
├── zsh-setup/
│   └── .zshrc              # Zsh config (aliases, PATH, functions)
├── vscode/
│   ├── settings.json       # Editor settings
│   ├── keybindings.json    # Custom keybindings
│   └── extensions.json     # Recommended extensions
└── mac-tools/
    └── brew-setup.sh       # Homebrew packages
```

## Install

```bash
git clone git@github.com:kirol25/dotfiles.git ~/dotfiles
cd ~/dotfiles
bash install.sh
```

The install script will:
- Install all Homebrew packages
- Install VSCode extensions
- Symlink `.zshrc` to `~/.zshrc` (backs up existing one)
- Symlink VSCode `settings.json` and `keybindings.json` to the VSCode user directory

## Tools

| Category | Tools |
|---|---|
| Shell | Zsh, Oh My Zsh, Powerlevel10k |
| Python | Python, Pyright, Ruff, Jupyter |
| Flutter | Flutter, Dart |
| Infrastructure | Terraform, AWS CLI |
| Containers | Docker, kubectl, Helm, Helmfile |
| Task runner | Taskfile |
| Editor | VSCode |

## Aliases

| Alias | Command |
|---|---|
| `k` | `kubectl` |
| `h` | `helm` |
| `gcb` | `git checkout -b` |
| `gco` | `git checkout` |
| `gp` | `git push` |
| `gl` | `git pull` |
| `gm` | `git merge` |
| `gs` | `git stash` |
| `gsp` | `git stash pop` |
| `gfp` | `git fetch --prune` |
| `p` | `pyright` |
| `rf` | `ruff format .` |
| `rc` | `ruff check --fix` |
| `tfmt` | `terraform fmt --recursive` |
| `tfp` | `terraform plan` |
| `tfa` | `terraform apply` |
| `o` | `ollama` |
| `ol` | `ollama list` |
| `or` | `ollama run` |

## Functions

**`aws-sso <profile>`** — Login to AWS SSO and set `AWS_PROFILE`

```bash
aws-sso my-profile
```
