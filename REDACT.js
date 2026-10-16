
"use strict";

/*
 * REDACT
 * Single-file object inspection application
 * Target: Lens Studio 5.24.1 / Snap Spectacles
 *
 * Uses the native ScanModule API.
 * Scanning is on demand, not continuous object tracking.
 */

 // @input Asset.ScanModule scanModule
 // @input Asset.Texture targetTexture

var REDACT = {
    version: "0.3.0",
    state: "INITIALIZING",
    busy: false,
    scanCount: 0,
    lastResults: [],
    inspection: null
};

function log(event, detail) {
    print("[REDACT] " + event +
        (detail !== undefined ? " " + JSON.stringify(detail) : ""));
}

function setState(next) {
    REDACT.state = next;
    log("STATE", next);
}

function fail(reason) {
    REDACT.busy = false;
    setState("ERROR");
    log("SCAN_FAILED", String(reason));
}

function parseAnnotations(json) {
    var result;

    try {
        result = JSON.parse(json);
    } catch (error) {
        fail("Invalid ScanModule response: " + error);
        return;
    }

    var objectContext =
        result &&
        result.annotations &&
        result.annotations[ScanModule.Contexts.Objects];

    var annotations = objectContext && objectContext.annotations;

    if (!Array.isArray(annotations)) {
        REDACT.lastResults = [];
        REDACT.inspection = null;
        REDACT.busy = false;
        setState("NO_RESULTS");
        log("NO_OBJECT_ANNOTATIONS");
        return;
    }

    REDACT.lastResults = annotations.map(function (item) {
        return {
            name: item.name || "Unknown object",
            confidence: typeof item.confidence === "number"
                ? item.confidence
                : null
        };
    });

    REDACT.busy = false;
    REDACT.scanCount++;

    if (REDACT.lastResults.length === 0) {
        REDACT.inspection = null;
        setState("NO_RESULTS");
        log("NO_OBJECTS_RECOGNIZED");
        return;
    }

    // Prioritize the highest-confidence annotation when scores exist.
    REDACT.lastResults.sort(function (a, b) {
        return (b.confidence || 0) - (a.confidence || 0);
    });

    REDACT.inspection = {
        id: "REDACT-" + REDACT.scanCount,
        name: REDACT.lastResults[0].name,
        confidence: REDACT.lastResults[0].confidence,
        annotations: REDACT.lastResults
    };

    setState("INSPECTING");
    log("INSPECTION_RESULT", REDACT.inspection);
}

function scanFailed(reason) {
    REDACT.busy = false;
    setState("SCAN_FAILED");
    log("SCAN_FAILURE", String(reason));
}

function scan() {
    if (REDACT.busy) {
        log("SCAN_IGNORED", "Scan already in progress");
        return;
    }

    if (!script.scanModule) {
        fail("Assign a ScanModule asset in the Inspector.");
        return;
    }

    REDACT.busy = true;
    REDACT.inspection = null;
    setState("SCANNING");

    try {
        if (script.targetTexture) {
            script.scanModule.scanTarget = script.targetTexture;
        }

        script.scanModule.scan(
            [ScanModule.Contexts.Objects],
            parseAnnotations,
            scanFailed
        );
    } catch (error) {
        fail(error);
    }
}

function clearInspection() {
    REDACT.inspection = null;
    REDACT.lastResults = [];
    setState("READY");
    log("INSPECTION_CLEARED");
}

function getStatus() {
    return {
        version: REDACT.version,
        state: REDACT.state,
        busy: REDACT.busy,
        scanCount: REDACT.scanCount,
        results: REDACT.lastResults,
        inspection: REDACT.inspection
    };
}

script.api.scan = scan;
script.api.clearInspection = clearInspection;
script.api.getStatus = getStatus;

var startEvent = script.createEvent("OnStartEvent");

startEvent.bind(function () {
    if (!script.scanModule) {
        setState("CONFIGURATION_REQUIRED");
        log("ERROR", "Assign the ScanModule asset in the Inspector.");
        return;
    }

    if (script.targetTexture) {
        script.scanModule.scanTarget = script.targetTexture;
    }

    setState("READY");
    log("REDACT_READY", REDACT.version);
    log("ACTION", "Call script.api.scan() to scan for objects.");
});

// Long press initiates a real ScanModule request.
var scanEvent = script.createEvent("LongPressStartEvent");

scanEvent.bind(function () {
    scan();
});
