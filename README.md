# REDACT

**OBJECT INSPECTION SYSTEM // 001**

A minimal augmented reality interface for Snap SPECS, exploring object inspection through spatial computing, technical overlays, and uncertainty-aware information design.


## Overview

REDACT is an AR Lens concept designed around a simple interaction: scan, inspect, release.

The interface presents a compact inspection panel with an object identifier, inspection status, and available information. Its design draws from surveillance systems, machine telemetry, and corrupted data interfaces.

REDACT aims to make information legible without obscuring the physical environment or presenting uncertain information as fact.

## Core Interaction

1. **SCAN** — Activate the inspection interface.
2. **INSPECT** — View the inspection record and available information.
3. **RELEASE** — Dismiss the panel and return to the idle state.

The initial prototype prioritizes a reliable interaction loop over complex recognition features.

## Visual System

| Element | Specification |
|---|---|
| Background | Near-black |
| Primary text | Cold white |
| Secondary text | Muted gray |
| Accent | Signal red `#FF303B` |
| Typography | Technical monospace |
| Interface | Compact inspection panels, scan reticles, diagnostic labels |
| Motion | Restrained transitions and controlled signal interference |

The interface emphasizes clarity, contrast, and deliberate visual hierarchy.

## Technical Scope

- **Platform:** Snap SPECS
- **Development environment:** Lens Studio
- **Workflow:** SPECS Learn skill pack and CLAD
- **Interaction:** Supported glasses input and spatial interface components
- **Architecture:** Minimal Lens project with no backend required for the initial prototype

Implementation will use supported Lens Studio APIs and components from the SPECS Base Template wherever possible.

## Information Integrity

REDACT distinguishes between actual system output, unavailable information, and simulated demonstration data.

Object recognition, sensor access, and persistent spatial tracking will only be described as implemented when their functionality has been verified on the target platform.

## Hackathon

Developed for the **Learn AR with SPECS** hackathon, focused on building augmented reality experiences for Snap SPECS.

The project follows a specification-driven workflow: define the user experience, establish acceptance criteria, implement the minimum viable Lens, and validate its behavior.

## Resources

- [Learn AR with SPECS](https://learn-specs.devpost.com/)
- [Lens Studio](https://ar.snap.com/lens-studio)

---

`REDACT // END OF RECORD`
