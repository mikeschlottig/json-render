import { useCallback, useMemo, type ReactNode } from "react";
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
  useStateStore,
  type ComponentRenderer,
  type SetState,
  type Spec,
} from "@json-render/react";

import { registry, handlers } from "./registry";

/**
 * A spec rendered inside one assistant message.
 *
 * The providers are per-message on purpose: two answers in the same transcript
 * are independent UIs, and sharing one state store between them would let a
 * later answer's bindings write into an earlier one.
 */

const fallback: ComponentRenderer = ({ element }) => (
  <div className="jr-unknown">
    Unknown component <code>{element.type}</code>
  </div>
);

/**
 * `defineRegistry` hands back a handlers *factory* that wants live getters for
 * state and setState, so it has to be called from inside StateProvider. If
 * getSetState ever returns undefined the registry silently skips the action —
 * hence the real setState here rather than a stub.
 */
function ActionBridge({ children }: { children: ReactNode }) {
  const store = useStateStore();

  const setState = useCallback<SetState>(
    (updater) => {
      const next = updater(store.getSnapshot());
      store.update(next);
    },
    [store],
  );

  const bound = useMemo(
    () =>
      handlers(
        () => setState,
        () => store.getSnapshot(),
      ),
    [setState, store],
  );

  return <ActionProvider handlers={bound}>{children}</ActionProvider>;
}

interface SpecRendererProps {
  spec: Spec;
  /** True while the spec is still streaming in. */
  loading?: boolean;
}

export function SpecRenderer({ spec, loading }: SpecRendererProps): ReactNode {
  return (
    <div className="jr-root" data-loading={loading ? "" : undefined}>
      <StateProvider initialState={spec.state ?? {}}>
        <VisibilityProvider>
          <ActionBridge>
            <Renderer
              spec={spec}
              registry={registry}
              fallback={fallback}
              loading={loading}
            />
          </ActionBridge>
        </VisibilityProvider>
      </StateProvider>
    </div>
  );
}
