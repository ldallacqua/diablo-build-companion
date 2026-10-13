# ADR 0002 — Manual data and screenshot input

Status: accepted, 2026-10-13.

No supported Diablo IV character interface was verified. Maxroll pages, robots and terms were unavailable to the research browser; no permission for an automated integration was established. We ship reference URLs, a manual build editor and validated JSON import/export. We do not call an undocumented endpoint or scrape guides.

The original v0.1 decision excluded game archive extraction. That exclusion is superseded by ADR 0005 following the owner’s explicit request for private, read-only unencrypted Steam artwork. A general, attributed user-image importer provides private enhancements with original fallbacks. The core product remains offline, has no telemetry and never uploads screenshots. OS-supported capture is distinct from publisher authorization; standalone screenshot upload is the documented fallback.
