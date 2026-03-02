import { vi } from "vitest";

// Globally mock @sentry/profiling-node to avoid segmentation faults with native modules during tests
vi.mock("@sentry/profiling-node", () => ({
    nodeProfilingIntegration: vi.fn(() => ({
        name: "ProfilingIntegration",
        setupOnce: vi.fn(),
    })),
}));
