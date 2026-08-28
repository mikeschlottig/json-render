import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MODELS,
  findModel,
  groupByProvider,
  type ProviderId,
} from "../lib/models";
import { CheckIcon, ChevronDownIcon } from "./icons";

/**
 * Model dropdown, grouped by provider.
 *
 * Hand-rolled rather than a listbox library because the accessibility contract
 * here is small and explicit: roving focus with the arrow keys, Enter/Space to
 * choose, Escape to dismiss, focus returned to the trigger.
 *
 * Models whose provider has no key are shown but not selectable — seeing that
 * Claude needs a gateway key is more useful than hiding it.
 */

interface ModelPickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<ProviderId[] | null>(null);
  const [active, setActive] = useState(() =>
    Math.max(
      MODELS.findIndex((model) => model.id === value),
      0,
    ),
  );
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = findModel(value);
  const groups = useMemo(() => groupByProvider(), []);

  // null means "not known yet" — before the answer arrives nothing is greyed
  // out, so the picker never flashes everything as unavailable.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { configured?: ProviderId[] } | null) => {
        if (!cancelled && data?.configured) setConfigured(data.configured);
      })
      .catch(() => {
        /* leave as unknown; the send path still reports the truth */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const available = useCallback(
    (provider: ProviderId) =>
      configured === null || configured.includes(provider),
    [configured],
  );

  const selectable = useMemo(
    () => MODELS.filter((model) => available(model.provider)),
    [available],
  );

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  // Dismiss on outside pointerdown. pointerdown rather than click so the menu
  // is gone before the click lands on whatever is underneath it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const choose = (model: (typeof MODELS)[number]) => {
    if (!available(model.provider)) return;
    onChange(model.id);
    close();
  };

  // Arrow keys walk only the selectable models, so focus never lands on a
  // model the user cannot pick.
  const step = (delta: number) => {
    if (selectable.length === 0) return;
    const currentId = MODELS[active]?.id;
    const at = selectable.findIndex((model) => model.id === currentId);
    const next =
      at === -1 ? 0 : (at + delta + selectable.length) % selectable.length;
    const target = selectable[next]!;
    setActive(MODELS.findIndex((model) => model.id === target.id));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        else step(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) setOpen(true);
        else step(-1);
        break;
      case "Enter":
      case " ":
        if (open) {
          event.preventDefault();
          const model = MODELS[active];
          if (model) choose(model);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="picker" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setActive(
            Math.max(
              MODELS.findIndex((model) => model.id === value),
              0,
            ),
          );
          setOpen((o) => !o);
        }}
      >
        <span className="picker-name">{selected.name}</span>
        {selected.free && <span className="picker-free">free</span>}
        <ChevronDownIcon
          className={open ? "picker-caret open" : "picker-caret"}
        />
      </button>

      {open && (
        <div className="picker-menu" role="listbox" aria-label="Model">
          {groups.map(({ provider, models }) => {
            const usable = available(provider.id);
            return (
              <div key={provider.id} className="picker-group">
                <div className="picker-group-head">
                  <span>{provider.label}</span>
                  {!usable && (
                    <span
                      className="picker-need"
                      title={`Set ${provider.envVar}`}
                    >
                      needs {provider.envVar}
                    </span>
                  )}
                </div>

                {models.map((model) => {
                  const index = MODELS.findIndex((m) => m.id === model.id);
                  const isSelected = model.id === value;
                  return (
                    <div
                      key={model.id}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={!usable}
                      className={[
                        "picker-option",
                        index === active && usable ? "active" : "",
                        usable ? "" : "unavailable",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={() => usable && setActive(index)}
                      onClick={() => choose(model)}
                    >
                      <span className="picker-check">
                        {isSelected && <CheckIcon />}
                      </span>
                      <span className="picker-body">
                        <span className="picker-row">
                          <span className="picker-option-name">
                            {model.name}
                          </span>
                          {model.free && (
                            <span className="picker-free">free</span>
                          )}
                          <span className={`picker-tier tier-${model.tier}`}>
                            {model.tier}
                          </span>
                        </span>
                        <span className="picker-blurb">{model.blurb}</span>
                        <span className="picker-meta">
                          {model.vendor} · {model.contextLabel}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
