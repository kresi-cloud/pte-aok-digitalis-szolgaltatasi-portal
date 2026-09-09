import { defineMcp } from "@lovable.dev/mcp-js";
import searchCatalog from "./tools/search-catalog";
import listRequests from "./tools/list-requests";
import getRequest from "./tools/get-request";
import searchAssets from "./tools/search-assets";
import getAsset from "./tools/get-asset";
import procurementPlan from "./tools/procurement-plan";
import lifecycleForecast from "./tools/lifecycle-forecast";

export default defineMcp({
  name: "pte-aok-szolgaltatasi-kozpont",
  title: "PTE ÁOK Szolgáltatási Központ",
  version: "0.1.0",
  instructions:
    "A PTE ÁOK digitális szolgáltatási portál nyilvános, csak olvasható eszközei. Használd a `search_catalog` eszközt a szolgáltatáskatalógus böngészéséhez, a `list_requests` / `get_request` eszközöket a szolgáltatási igényekhez, a `search_assets` / `get_asset` eszközöket az eszközkataszterhez, a `procurement_plan` eszközt a következő pénzügyi év beszerzési tervéhez és a `lifecycle_forecast` eszközt a többéves csereigény-előrejelzéshez. Az adatok demonstrációs célú minta-adatok.",
  tools: [
    searchCatalog,
    listRequests,
    getRequest,
    searchAssets,
    getAsset,
    procurementPlan,
    lifecycleForecast,
  ] as unknown as Parameters<typeof defineMcp>[0]["tools"],
});