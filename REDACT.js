
"use strict";

/*
 * REDACT
 * Single-file AR inspection runtime
 * Version 0.1.0
 *
 * Attach this script to one scene object in Lens Studio.
 * Target acquisition must be connected to a supported
 * tracking or detection source before real-world use.
 */

var REDACT = {
    version: "0.1.0",
    state: "IDLE",
    target: null,
    data: null,
    events: 0
};

function emit(eventName, payload) {
    REDACT.events++;

    print(
        "[REDACT][" + REDACT.state + "] " +
        eventName +
        (payload !== undefined ? " " + JSON.stringify(payload) : "")
    );
}

function transition(nextState) {
    if (REDACT.state === nextState) {
        return;
    }

    var previous = REDACT.state;
    REDACT.state = nextState;

    emit("STATE_CHANGE", {
        from: previous,
        to: nextState
    });
}

function acquire(id, metadata) {
    if (id === undefined || id === null || String(id) === "") {
        emit("ERROR", "Invalid target identifier");
        return false;
    }

    REDACT.target = String(id);
    REDACT.data = metadata || null;

    transition("TARGETED");
    emit("TARGET_ACQUIRED", REDACT.target);

    return true;
}

function inspect() {
    if (REDACT.state !== "TARGETED") {
        emit("REJECTED", "No target ready for inspection");
        return false;
    }

    transition("INSPECTING");
    emit("INSPECTION_STARTED", REDACT.target);

    return true;
}

function update(metadata) {
    if (REDACT.target === null) {
        emit("REJECTED", "No active target");
        return false;
    }

    REDACT.data = metadata || null;
    emit("TARGET_UPDATED", REDACT.target);

    return true;
}

function stopInspection() {
    if (REDACT.state !== "INSPECTING") {
        return false;
    }

    transition("TARGETED");
    emit("INSPECTION_STOPPED");

    return true;
}

function lose() {
    if (REDACT.target === null) {
        return;
    }

    emit("TARGET_LOST", REDACT.target);

    REDACT.target = null;
    REDACT.data = null;

    transition("LOST");
}

function reset() {
    REDACT.target = null;
    REDACT.data = null;

    transition("IDLE");
    emit("RESET");
}

function status() {
    return {
        version: REDACT.version,
        state: REDACT.state,
        target: REDACT.target,
        data: REDACT.data,
        events: REDACT.events
    };
}

// Lens Studio script API
script.api.acquire = acquire;
script.api.inspect = inspect;
script.api.update = update;
script.api.stopInspection = stopInspection;
script.api.lose = lose;
script.api.reset = reset;
script.api.status = status;

// Initialize automatically when the Lens starts.
var startup = script.createEvent("OnStartEvent");

startup.bind(function () {
    REDACT.state = "IDLE";
    REDACT.target = null;
    REDACT.data = null;

    emit("RUNTIME_READY", {
        version: REDACT.version
    });
});
