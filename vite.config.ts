// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// A @lovable.dev/mcp-js Vite plugin Windowson nem indul el. A routesDir-t a
// node:path resolve() adja (fordított perjelekkel), a projectRoot-ot viszont a
// Vite már normál perjelesre normalizálta, így a plugin belső assertContains
// ellenőrzése mindig hibát dob:
//   routesDir "src/routes" must resolve under C:/..., got C:\...
// A hiba a csomag legfrissebb, 2.0.4-es verziójában is megvan.
//
// A plugin egyetlen feladata az MCP route-fájlok legenerálása
// (src/routes/mcp.ts, [.mcp]/*, [.well-known]/*). Ezek a fájlok a repóban
// vannak, és futásidőben a plugin nélkül is kiszolgálják az MCP végpontokat,
// ezért Windowson egyszerűen kihagyjuk a plugint.
const isWindows = process.platform === "win32";

export default defineConfig({
  plugins: isWindows ? [] : [mcpPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
