import { createFileRoute, redirect } from "@tanstack/react-router";

/** A dékáni és a vezetői áttekintés összevonásra került. */
export const Route = createFileRoute("/dekani-attekintes")({
  beforeLoad: () => {
    throw redirect({ to: "/vezetoi-attekintes" });
  },
});
