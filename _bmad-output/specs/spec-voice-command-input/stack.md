# Matching technique

On-device matching uses **Dynamic Time Warping (DTW) over MFCC features**, not a pretrained embedding model.

- Extract MFCC (Mel-frequency cepstral coefficients) from each recorded template (wake, Correct, Incorrect) and from each live audio window during listening.
- Compare via DTW distance; a live window matches a template when the distance is below threshold.
- CAP-3's distinguishability check is the same DTW distance computed pairwise between the three saved templates; a pair below the separation threshold blocks save.

## Matcher modes (CAP-4)

The matcher runs one of two modes, selected by the CAP-4 wake-word setting:

- **Wake-word ON (default):** two-state — `LISTENING_FOR_WAKE` (checks only the wake template) → `AWAITING_COMMAND` (checks only Correct/Incorrect templates, bounded window, reverts on timeout).
- **Wake-word OFF:** single-state — every live window is checked directly against the Correct/Incorrect templates only; the wake template is never evaluated and no window state exists. Functionally equivalent to always being in `AWAITING_COMMAND` with no timeout/reversion.

Both modes share the same DTW/MFCC comparison and threshold logic — CAP-4 changes which templates are checked and when, not how a check is performed.

Rejected: TFLite audio embeddings (e.g. YAMNet) — more robust to noise, but requires bundling a pretrained model and a new native TFLite dependency (separate dependency-governance approval per parent CLAUDE.md §5.2), larger app size, higher CPU draw while listening. Not justified for a fixed 3-template set.

Rejected: cloud/SDK wake-word engines (e.g. Porcupine) — require cloud-based training for custom keywords and only support spoken words, not arbitrary sounds (clap, hum, tap), conflicting with CAP-3.
