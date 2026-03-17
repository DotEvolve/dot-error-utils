"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Globally mock @sentry/profiling-node to avoid segmentation faults with native modules during tests
vitest_1.vi.mock("@sentry/profiling-node", () => ({
    nodeProfilingIntegration: vitest_1.vi.fn(() => ({
        name: "ProfilingIntegration",
        setupOnce: vitest_1.vi.fn(),
    })),
}));
