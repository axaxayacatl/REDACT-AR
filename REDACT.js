// REDACT — AR OBJECT INSPECTION SYSTEM
// Version 1.1.0
// Lens Studio / Snap Spectacles
//
// Workflow: SCAN -> INSPECT -> RELEASE
//
// PURPOSE
// Application/controller layer for an AR object-inspection system.
// This script does not implement an object-recognition engine.
// Connect a compatible perception provider through registerScanHandler().
//
// SETUP
// 1. Add this script to a SceneObject in Lens Studio.
// 2. Connect UI components using the public script.api methods.
// 3. Register a compatible scanning provider.
// 4. Send actual detection records to receiveDetections().
//
// Detection format:
// {
//   name: "Object name",
//   confidence: 0.94
// }
//
// Confidence may be normalized (0..1) or a percentage (0..100).

"use strict";

//@input Component.Text statusText
//@input Component.Text resultsText
//@input Component.Text confidenceText
//@input SceneObject inspectionPanel

var REDACT = {
    name: "REDACT",
    version: "1.1.0",
    state: "INITIALIZING",
    busy: false,
    scanCount: 0,
    lastScanAt: null,
    lastError: null,
    results: [],
    inspection: null
};

var CONFIG = {
    maxResults: 20,
    minimumConfidence: 0,
    keepHistory: true,
    historyLimit: 25
};

var history = [];
var stateListeners = [];
var scanHandler = null;
var scanTimeoutEvent = null;
var SCAN_TIMEOUT_SECONDS = 15;


// ------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------

function timestamp() {
    try {
        return new Date().toISOString();
    } catch (error) {
        return null;
    }
}

function safeString(value) {
    try {
        if (typeof value === "string") {
            return value;
        }

        return JSON.stringify(value);
    } catch (error) {
        return String(value);
    }
}

function log(event, detail) {
    var message = "[REDACT] " + event;

    if (detail !== undefined && detail !== null) {
        message += " " + safeString(detail);
    }

    print(message);
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

function formatConfidence(value) {
    if (value === null || value === undefined) {
        return "UNAVAILABLE";
    }

    return Math.round(value * 100) + "%";
}


// ------------------------------------------------------------
// INTERFACE
// ------------------------------------------------------------

function updateInterface() {
    if (script.statusText) {
        script.statusText.text = "REDACT // " + REDACT.state;
    }

    if (script.resultsText) {
        if (REDACT.results.length === 0) {
            script.resultsText.text = "NO DETECTIONS";
        } else {
            var lines = [];

            for (var i = 0; i < REDACT.results.length; i++) {
                var result = REDACT.results[i];

                lines.push(
                    String(i + 1).padStart(2, "0") +
                    "  " +
                    result.name +
                    "  [" +
                    formatConfidence(result.confidence) +
                    "]"
                );
            }

            script.resultsText.text = lines.join("\n");
        }
    }

    if (script.confidenceText) {
        if (REDACT.inspection) {
            script.confidenceText.text =
                "SELECTED // " +
                REDACT.inspection.name +
                "\nCONFIDENCE // " +
                formatConfidence(REDACT.inspection.confidence);
        } else {
            script.confidenceText.text = "NO ACTIVE INSPECTION";
        }
    }

    if (script.inspectionPanel) {
        script.inspectionPanel.enabled = !!REDACT.inspection;
    }
}

function notifyStateListeners() {
    var snapshot = getStatus();

    for (var i = 0; i < stateListeners.length; i++) {
        try {
            stateListeners[i](snapshot);
        } catch (error) {
            log("LISTENER_ERROR", String(error));
        }
    }
}

function setState(state) {
    REDACT.state = state;
    updateInterface();

    log("STATE", state);
    notifyStateListeners();
}

function setError(message, state) {
    REDACT.busy = false;
    REDACT.lastError = safeString(message);

    setState(state || "ERROR");
    log("ERROR_DETAIL", REDACT.lastError);
}


// ------------------------------------------------------------
// RESULT NORMALIZATION
// ------------------------------------------------------------

function normalizeDetection(detection, index) {
    if (!detection || typeof detection !== "object") {
        return null;
    }

    var name = typeof detection.name === "string"
        ? detection.name.trim()
        : "";

    if (!name) {
        name = "Unknown object";
    }

    var confidence = normalizeConfidence(detection.confidence);

    if (
        confidence !== null &&
        confidence < CONFIG.minimumConfidence
    ) {
        return null;
    }

    return {
        index: index,
        name: name,
        confidence: confidence,
        source: typeof detection.source === "string"
            ? detection.source
            : "Perception provider",
        observedAt: timestamp()
    };
}

function saveHistory(inspection) {
    if (!CONFIG.keepHistory || !inspection) {
        return;
    }

    history.unshift({
        id: inspection.id,
        name: inspection.name,
        confidence: inspection.confidence,
        resultCount: inspection.results.length,
        observedAt: inspection.observedAt
    });

    if (history.length > CONFIG.historyLimit) {
        history.length = CONFIG.historyLimit;
    }
}


// ------------------------------------------------------------
// PERCEPTION ADAPTER
// ------------------------------------------------------------

// Register a real, supported scanning provider.
//
// Expected handler signature:
// handler(successCallback, failureCallback)
//
// successCallback(detections)
// failureCallback(error)
//
// The provider is responsible for using the actual Lens Studio
// perception API and returning genuine detection records.

function registerScanHandler(handler) {
    if (typeof handler !== "function") {
        log("REGISTRATION_FAILED", "Handler must be a function.");
        return false;
    }

    if (REDACT.busy) {
        log("REGISTRATION_FAILED", "Cannot change provider during a scan.");
        return false;
    }

    scanHandler = handler;

    if (REDACT.state === "CONFIGURATION_REQUIRED") {
        setState("READY");
    }

    log("PERCEPTION_PROVIDER_REGISTERED");
    return true;
}


// ------------------------------------------------------------
// SCAN
// ------------------------------------------------------------

function scan() {
    if (REDACT.busy) {
        log("SCAN_IGNORED", "Scan already in progress.");
        return false;
    }

    if (typeof scanHandler !== "function") {
        setError(
            "No perception provider registered. Connect a supported scanning API.",
            "CONFIGURATION_REQUIRED"
        );

        return false;
    }

    REDACT.busy = true;
    REDACT.results = [];
    REDACT.inspection = null;
    REDACT.lastError = null;
    REDACT.lastScanAt = timestamp();

    setState("SCANNING");

    var callbackUsed = false;

    function finishOnce(callback) {
        if (callbackUsed) {
            log("DUPLICATE_CALLBACK_IGNORED");
            return;
        }

        callbackUsed = true;
        callback();
    }

    function onSuccess(detections) {
        finishOnce(function () {
            receiveDetections(detections);
        });
    }

    function onFailure(error) {
        finishOnce(function () {
            setError(
                error || "Perception provider failed.",
                "SCAN_FAILED"
            );
        });
    }

    try {
        scanHandler(onSuccess, onFailure);
    } catch (error) {
        onFailure(error);
    }

    return true;
}


// ------------------------------------------------------------
// DETECTION PROCESSING
// ------------------------------------------------------------

// Accept an array of actual detections from the registered provider.
// This method may also be called by a connected script directly.

function receiveDetections(detections) {
    if (!Array.isArray(detections)) {
        setError(
            "Invalid detection response. Expected an array.",
            "SCAN_FAILED"
        );

        return false;
    }

    var normalized = [];

    for (
        var i = 0;
        i < detections.length && normalized.length < CONFIG.maxResults;
        i++
    ) {
        var detection = normalizeDetection(detections[i], i);

        if (detection) {
            normalized.push(detection);
        }
    }

    normalized.sort(function (a, b) {
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
    REDACT.lastScanAt = timestamp();
    REDACT.results = normalized;
    REDACT.lastError = null;
    REDACT.scanCount++;

    if (normalized.length === 0) {
        REDACT.inspection = null;
        setState("NO_RESULTS");

        log("SCAN_COMPLETE", "No matching objects detected.");

        return true;
    }

    var selected = normalized[0];

    REDACT.inspection = {
        id: "REDACT-" + String(REDACT.scanCount).padStart(4, "0"),
        name: selected.name,
        confidence: selected.confidence,
        results: normalized,
        observedAt: REDACT.lastScanAt,
        source: selected.source,
        status: "OBSERVED"
    };

    saveHistory(REDACT.inspection);
    setState("INSPECTING");

    log("INSPECTION_CREATED", {
        id: REDACT.inspection.id,
        name: REDACT.inspection.name,
        confidence: REDACT.inspection.confidence,
        results: normalized.length
    });

    return true;
}


// ------------------------------------------------------------
// INSPECTION / RELEASE
// ------------------------------------------------------------

function clearInspection() {
    if (REDACT.busy) {
        log("RELEASE_IGNORED", "A scan is currently in progress.");
        return false;
    }

    REDACT.inspection = null;
    REDACT.results = [];
    REDACT.lastError = null;

    setState(scanHandler ? "READY" : "CONFIGURATION_REQUIRED");

    log("INSPECTION_RELEASED");

    return true;
}

function selectResult(index) {
    if (
        typeof index !== "number" ||
        index < 0 ||
        index >= REDACT.results.length ||
        Math.floor(index) !== index
    ) {
        return false;
    }

    var selected = REDACT.results[index];

    REDACT.inspection = {
        id: "REDACT-" + String(REDACT.scanCount).padStart(4, "0"),
        name: selected.name,
        confidence: selected.confidence,
        results: REDACT.results.slice(0),
        observedAt: selected.observedAt,
        source: selected.source,
        status: "OBSERVED"
    };

    setState("INSPECTING");

    return true;
}


// ------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------

function configure(options) {
    options = options || {};

    if (
        typeof options.maxResults === "number" &&
        isFinite(options.maxResults)
    ) {
        CONFIG.maxResults = Math.max(
            1,
            Math.min(100, Math.floor(options.maxResults))
        );
    }

    if (
        typeof options.minimumConfidence === "number" &&
        isFinite(options.minimumConfidence)
    ) {
        CONFIG.minimumConfidence = Math.max(
            0,
            Math.min(1, options.minimumConfidence)
        );
    }

    if (typeof options.keepHistory === "boolean") {
        CONFIG.keepHistory = options.keepHistory;
    }

    if (
        typeof options.historyLimit === "number" &&
        isFinite(options.historyLimit)
    ) {
        CONFIG.historyLimit = Math.max(
            1,
            Math.min(100, Math.floor(options.historyLimit))
        );

        if (history.length > CONFIG.historyLimit) {
            history.length = CONFIG.historyLimit;
        }
    }

    log("CONFIGURATION_UPDATED", CONFIG);

    return getStatus();
}


// ------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------

function getStatus() {
    return {
        name: REDACT.name,
        version: REDACT.version,
        state: REDACT.state,
        busy: REDACT.busy,
        scanCount: REDACT.scanCount,
        lastScanAt: REDACT.lastScanAt,
        lastError: REDACT.lastError,
        results: REDACT.results.slice(0),
        inspection: REDACT.inspection,
        history: history.slice(0)
    };
}

function getHistory() {
    return history.slice(0);
}

function onStateChange(callback) {
    if (typeof callback !== "function") {
        return false;
    }

    stateListeners.push(callback);

    try {
        callback(getStatus());
    } catch (error) {
        log("LISTENER_ERROR", String(error));
    }

    return true;
}


// Methods exposed to other Lens Studio scripts.

script.api.scan = scan;
script.api.receiveDetections = receiveDetections;
script.api.registerScanHandler = registerScanHandler;
script.api.clearInspection = clearInspection;
script.api.release = clearInspection;
script.api.selectResult = selectResult;
script.api.getStatus = getStatus;
script.api.getHistory = getHistory;
script.api.configure = configure;
script.api.onStateChange = onStateChange;


// ------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------

var startEvent = script.createEvent("OnStartEvent");

startEvent.bind(function () {
    updateInterface();

    setState("CONFIGURATION_REQUIRED");

    log("INITIALIZED", {
        version: REDACT.version,
        workflow: "SCAN -> INSPECT -> RELEASE",
        providerRegistered: false
    });

    log(
        "SETUP",
        "Register a compatible perception provider before scanning."
    );
});
