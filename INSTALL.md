# Installation

## Requirements

- Claude Code 2.1.306 (the version it was written and used with).
- `git`, or a downloaded copy of this folder.


## Install

1. Get the plugin:

   ```bash
   git clone https://github.com/your-account/EnergyBar.git ~/EnergyBar
   ```

   Replace the URL with wherever you got EnergyBar. A downloaded and unzipped folder works too.

2. Add the folder as a marketplace and install from it:

   ```bash
   claude plugin marketplace add ~/EnergyBar
   claude plugin install energybar@energybar
   ```

3. Run `/reload-plugins` in Claude Code.
4. Check that it worked. A chocolate bar and a `Context:` line appear above the prompt, with `Model:` and `Effort:` buttons on the right.

If the bar doesn't appear, run `claude plugin list` and make sure `energybar@energybar` is enabled. The bar shows its own error text in dim type when something fails at startup.


## Update

1. Replace the files in `~/EnergyBar` with the new version (`git pull` if you cloned it).
2. Run `/reload-plugins`.

Claude Code also keeps an installed copy under `~/.claude/plugins/cache/`. If the bar doesn't change after a reload, copy `hooks/register.tsx` over the cached one and reload again.


## Remove

```bash
claude plugin uninstall energybar@energybar
claude plugin marketplace remove energybar
```

Then run `/reload-plugins`. The `~/EnergyBar` folder stays until you move it yourself.
