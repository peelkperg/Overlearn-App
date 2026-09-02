# BMad customization overrides

Empty by design. Drop `{skill-name}.toml` here for a team-wide override of
any installed BMad skill's persona/menu, or `{skill-name}.user.toml` for a
personal one (gitignored — see `.gitignore`). Both are optional; every
skill falls back to its own `customize.toml` defaults when neither exists.

See the `bmad-customize` skill to author these interactively rather than
hand-writing TOML.
