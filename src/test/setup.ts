import { beforeEach } from "vitest";
import { clearAdapterCache } from "../data/adapters";

// Feed responses are cached for a minute in the app; every test starts with a clean slate.
beforeEach(() => clearAdapterCache());
