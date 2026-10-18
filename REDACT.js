"use strict";

/*
 * REDACT — Spectacles Object Inspection Controller
 * Version: 0.4.0
 * Target: Lens Studio / Snap Spectacles
 *
 * Native APIs:
 *   - LensStudio:CameraModule
 *   - ScanModule (when a compatible asset is assigned)
 *
 * Camera frames do not automatically perform object recognition.
 * Real-time custom detection requires a compatible model and inference setup.
 */

// @input Asset.ScanModule scanModule
// @input Asset.Texture targetTexture
// @input bool enableCameraFrames = true
// @input int cameraId = 0

var CameraModule = null;
var cameraModule = null;
var cameraRequest = null;
var cameraTexture = null;
var cameraTextureProvider = null;
var cameraFrameRegistration = null;

var REDACT = {
    version: "0.4.0",
    state: "INITIALIZING",
    busy: false,
    scanCount: 0,
    lastScanAt: null,
    lastError: null,
    lastResults: [],
    inspection: null,
    cameraReady: false,
    cameraFrameCount: 0,
    lastCameraFrameAt: null
};

function log(event, detail) {
    var suffix = "";
    if (detail !== undefined && detail !== null) {
        try {
            suffix = " " + JSON.stringify(detail);
        } catch (e) {
            suffix = " " + String(detail);
        }
    }
    print("[REDACT] " + event + suffix);
}

function timestamp() {
    try {
        return new Date().toISOString();
    } catch (e) {
        return null;
    }
}

function setState(nextState) {
    REDACT.state = nextState;
    log("STATE", nextState);
}

function fail(reason, stateName) {
    REDACT.busy = false;
    REDACT.lastError = String(reason);
    setState(stateName || "ERROR");
    log("ERROR_DETAIL", REDACT.lastError);
}

function normalizeConfidence(value) {
    if (typeof value !== "number" || !isFinite(value)) {
        return null;
    }

    if (value > 1 && value <= 100) {
        value = value / 100;
    }

    return Math.max(0, Math.min(1, value));
}

function parseAnnotations(json) {
    var result;

    try {
        result = typeof json === "string" ? JSON.parse(json) : json;
    } catch (error) {
        fail("Invalid ScanModule response: " + error, "SCAN_FAILED");
        return;
    }

    var objectContext = null;

    try {
        objectContext = result &&
            result.annotations &&
            result.annotations[ScanModule.Contexts.Objects];
    } catch (error) {
        log("ANNOTATION_CONTEXT_WARNING", String(error));
    }

    var annotations = objectContext && objectContext.annotations;

    if (!Array.isArray(annotations)) {
        REDACT.lastResults = [];
        REDACT.inspection = null;
        REDACT.busy = false;
        REDACT.lastScanAt = timestamp();
        REDACT.lastError = null;
        setState("NO_RESULTS");
        log("NO_OBJECT_ANNOTATIONS");
        return;
    }

    REDACT.lastResults = annotations.map(function (item, index) {
        item = item || {};

        return {
            index: index,
            name: typeof item.name === "string" && item.name.length
                ? item.name
                : "Unknown object",
            confidence: normalizeConfidence(item.confidence),
            source: "ScanModule"
        };
    });

    REDACT.lastResults.sort(function (a, b) {
        if (a.confidence === null && b.confidence === null) {
            return a.index - b.index;
        }

        if (a.confidence === null) {
            return 1;
        }

        if (b.confidence === null) {
            return -1;
        }

        return b.confidence - a.confidence;
    });

    REDACT.busy = false;
    REDACT.scanCount++;
    REDACT.lastScanAt = timestamp();
    REDACT.lastError = null;

    if (REDACT.lastResults.length === 0) {
        REDACT.inspection = null;
        setState("NO_RESULTS");
        log("NO_OBJECTS_RECOGNIZED");
        return;
    }

    REDACT.inspection = {
        id: "REDACT-" + String(REDACT.scanCount).padStart(4, "0"),
        name: REDACT.lastResults[0].name,
        confidence: REDACT.lastResults[0].confidence,
        annotations: REDACT.lastResults,
        observedAt: REDACT.lastScanAt,
        source: "ScanModule",
        status: "OBSERVED"
    };

    setState("INSPECTING");
    log("INSPECTION_RESULT", REDACT.inspection);
}

function scanFailed(reason) {
    fail(
        reason || "ScanModule reported an unspecified failure.",
        "SCAN_FAILED"
    );
}

// Requests a single scan from an assigned ScanModule asset.
function scan() {
    if (REDACT.busy) {
        log("SCAN_IGNORED", "A scan is already in progress.");
        return false;
    }

    if (
        typeof ScanModule === "undefined" ||
        !ScanModule.Contexts ||
        typeof ScanModule.Contexts.Objects === "undefined"
    ) {
        fail(
            "ScanModule object context is unavailable in this runtime.",
            "CONFIGURATION_REQUIRED"
        );
        return false;
    }

    if (!script.scanModule) {
        fail(
            "Assign a compatible ScanModule asset in the Inspector.",
            "CONFIGURATION_REQUIRED"
        );
        return false;
    }

    REDACT.busy = true;
    REDACT.inspection = null;
    REDACT.lastResults = [];
    REDACT.lastError = null;
    REDACT.lastScanAt = timestamp();

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

        log("SCAN_REQUESTED", {
            scanNumber: REDACT.scanCount + 1
        });

        return true;
    } catch (error) {
        fail(error, "SCAN_FAILED");
        return false;
    }
}

// Starts native Spectacles camera access.
// This receives frames but does not itself recognize objects.
function startCamera() {
    if (!script.enableCameraFrames) {
        log("CAMERA_DISABLED");
        return false;
    }

    if (REDACT.cameraReady) {
        return true;
    }

    try {
        CameraModule = require("LensStudio:CameraModule");
        cameraModule = CameraModule;
        cameraRequest = CameraModule.createCameraRequest();

        if (script.cameraId === 1) {
            cameraRequest.cameraId =
                CameraModule.CameraId.Left_Color;
        } else if (script.cameraId === 2) {
            cameraRequest.cameraId =
                CameraModule.CameraId.Right_Color;
        } else {
            cameraRequest.cameraId =
                CameraModule.CameraId.Default_Color;
        }

        cameraTexture = cameraModule.requestCamera(cameraRequest);

        if (
            !cameraTexture ||
            !cameraTexture.control ||
            !cameraTexture.control.onNewFrame
        ) {
            throw new Error(
                "CameraModule returned no usable CameraTextureProvider."
            );
        }

        cameraTextureProvider = cameraTexture.control;

        cameraFrameRegistration =
            cameraTextureProvider.onNewFrame.add(function (frame) {
                REDACT.cameraFrameCount++;
                REDACT.lastCameraFrameAt = timestamp();

                if (REDACT.cameraFrameCount === 1) {
                    log("CAMERA_FIRST_FRAME", {
                        timestampMillis:
                            frame &&
                            frame.timestampMillis !== undefined
                                ? frame.timestampMillis
                                : null
                    });
                }
            });

        REDACT.cameraReady = true;

        log("CAMERA_READY", {
            cameraId: script.cameraId,
            frames: "streaming"
        });

        return true;
    } catch (error) {
        REDACT.cameraReady = false;
        REDACT.lastError = "CameraModule: " + String(error);
        log("CAMERA_UNAVAILABLE", REDACT.lastError);
        return false;
    }
}

function stopCamera() {
    try {
        if (
            cameraTextureProvider &&
            cameraFrameRegistration !== null
        ) {
            cameraTextureProvider.onNewFrame.remove(
                cameraFrameRegistration
            );
        }
    } catch (error) {
        log("CAMERA_STOP_WARNING", String(error));
    }

    cameraFrameRegistration = null;
    cameraTextureProvider = null;
    cameraTexture = null;
    REDACT.cameraReady = false;

    log("CAMERA_STOPPED");
}

function clearInspection() {
    if (REDACT.busy) {
        log(
            "RELEASE_IGNORED",
            "Cannot release while a scan is in progress."
        );
        return false;
    }

    REDACT.inspection = null;
    REDACT.lastResults = [];
    REDACT.lastError = null;

    setState(
        script.scanModule
            ? "READY"
            : "CONFIGURATION_REQUIRED"
    );

    log("INSPECTION_RELEASED");
    return true;
}

function getStatus() {
    return {
        version: REDACT.version,
        state: REDACT.state,
        busy: REDACT.busy,
        scanCount: REDACT.scanCount,
        lastScanAt: REDACT.lastScanAt,
        lastError: REDACT.lastError,
        results: REDACT.lastResults.slice(0),
        inspection: REDACT.inspection,
        cameraReady: REDACT.cameraReady,
        cameraFrameCount: REDACT.cameraFrameCount,
        lastCameraFrameAt: REDACT.lastCameraFrameAt
    };
}

// Public API for other scripts and UI controls.
script.api.scan = scan;
script.api.startCamera = startCamera;
script.api.stopCamera = stopCamera;
script.api.clearInspection = clearInspection;
script.api.release = clearInspection;
script.api.getStatus = getStatus;
script.api.getCameraTexture = function () {
    return cameraTexture;
};

// Initialize when the scene starts.
var startEvent = script.createEvent("OnStartEvent");

startEvent.bind(function () {
    if (script.scanModule && script.targetTexture) {
        try {
            script.scanModule.scanTarget = script.targetTexture;
        } catch (error) {
            log("SCAN_TARGET_WARNING", String(error));
        }
    }

    if (script.enableCameraFrames) {
        startCamera();
    }

    setState(
        script.scanModule
            ? "READY"
            : "CONFIGURATION_REQUIRED"
    );

    log("REDACT_READY", {
        version: REDACT.version,
        scanModuleAssigned: !!script.scanModule,
        cameraFramesEnabled: !!script.enableCameraFrames
    });
});

// Clean up the camera frame listener when the object is destroyed.
var destroyEvent = script.createEvent("OnDestroyEvent");

destroyEvent.bind(function () {
    stopCamera();
});

// Optional long-press scan trigger.
var scanEvent = script.createEvent("LongPressStartEvent");

scanEvent.bind(function () {
    scan();
});
