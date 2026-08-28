import { useId, useMemo, type ReactNode } from "react";
import { defineRegistry } from "@json-render/react";

import { chatCatalog } from "./catalog";
import { CodeBlock } from "../components/CodeBlock";
import { renderInline } from "../components/Markdown";
import { ask } from "../lib/chat-bridge";
import {
  ExternalIcon,
  TrendDownIcon,
  TrendFlatIcon,
  TrendUpIcon,
} from "../components/icons";

// =============================================================================
// Helpers
// =============================================================================

const gapClass = (gap?: string | null) => `gap-${gap ?? "md"}`;
const toneClass = (tone?: string | null) => `tone-${tone ?? "neutral"}`;

function niceNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * Chart geometry shared by the bar and line charts. Both draw into a fixed
 * viewBox and scale with CSS, so they stay crisp at any container width
 * without a resize observer.
 */
const CHART = { w: 640, h: 220, padX: 44, padY: 16, padBottom: 34 } as const;

function scaleY(value: number, min: number, max: number): number {
  const span = max - min || 1;
  const usable = CHART.h - CHART.padY - CHART.padBottom;
  return CHART.padY + usable - ((value - min) / span) * usable;
}

function bounds(values: number[]): [number, number] {
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  // Give the top of the plot some air so the peak is not flush with the frame.
  return [min, max === min ? max + 1 : max + (max - min) * 0.08];
}

// =============================================================================
// Registry
// =============================================================================

export const { registry, handlers } = defineRegistry(chatCatalog, {
  components: {
    // ---------------------------------------------------------------- layout

    Stack: ({ props, children }) => (
      <div
        className={[
          "jr-stack",
          props.direction === "horizontal" ? "row" : "col",
          gapClass(props.gap),
          `align-${props.align ?? "stretch"}`,
          props.wrap ? "wrap" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    ),

    Grid: ({ props, children }) => (
      <div
        className={`jr-grid ${gapClass(props.gap)}`}
        style={
          {
            "--cols": Math.min(Math.max(props.columns ?? 2, 1), 4),
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    ),

    Card: ({ props, children }) => (
      <section className={`jr-card ${toneClass(props.tone)}`}>
        {(props.title || props.subtitle) && (
          <header className="jr-card-head">
            {props.title && <h3 className="jr-card-title">{props.title}</h3>}
            {props.subtitle && (
              <p className="jr-card-sub">{renderInline(props.subtitle)}</p>
            )}
          </header>
        )}
        <div className="jr-card-body">{children}</div>
      </section>
    ),

    Divider: ({ props }) =>
      props.label ? (
        <div className="jr-divider labelled">
          <span>{props.label}</span>
        </div>
      ) : (
        <hr className="jr-divider" />
      ),

    // ------------------------------------------------------------------ text

    Heading: ({ props }) => {
      const level = Math.min(Math.max(props.level ?? 2, 1), 3);
      const Tag = (["h2", "h3", "h4"] as const)[level - 1]!;
      return <Tag className={`jr-heading lvl-${level}`}>{props.content}</Tag>;
    },

    Text: ({ props }) => (
      <p
        className={`jr-text size-${props.size ?? "md"}${props.muted ? " muted" : ""}`}
      >
        {renderInline(props.content)}
      </p>
    ),

    Quote: ({ props }) => (
      <blockquote className="jr-quote">
        <p>{renderInline(props.content)}</p>
        {props.cite && <cite>{props.cite}</cite>}
      </blockquote>
    ),

    Code: ({ props }) => (
      <CodeBlock
        code={props.code}
        language={props.language}
        filename={props.filename}
      />
    ),

    // ------------------------------------------------------------------ data

    Metric: ({ props }) => {
      const Trend =
        props.trend === "up"
          ? TrendUpIcon
          : props.trend === "down"
            ? TrendDownIcon
            : props.trend === "flat"
              ? TrendFlatIcon
              : null;

      return (
        <div className="jr-metric">
          <span className="jr-metric-label">{props.label}</span>
          <span className="jr-metric-value">{props.value}</span>
          {(props.delta || Trend) && (
            <span className={`jr-metric-delta trend-${props.trend ?? "flat"}`}>
              {Trend && <Trend />}
              {props.delta}
            </span>
          )}
          {props.hint && <span className="jr-metric-hint">{props.hint}</span>}
        </div>
      );
    },

    KeyValue: ({ props }) => (
      <dl className="jr-kv">
        {props.items.map((item, index) => (
          <div key={index} className="jr-kv-row">
            <dt>{item.key}</dt>
            <dd>{renderInline(item.value)}</dd>
          </div>
        ))}
      </dl>
    ),

    Table: ({ props }) => {
      const align = props.align ?? [];
      return (
        <div className="jr-table-wrap scroll">
          <table className="jr-table">
            {props.caption && <caption>{props.caption}</caption>}
            <thead>
              <tr>
                {props.columns.map((column, index) => (
                  <th key={index} style={{ textAlign: align[index] ?? "left" }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      style={{ textAlign: align[index] ?? "left" }}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },

    List: ({ props }) => {
      const items = props.items.map((item, index) => (
        <li key={index}>{renderInline(item)}</li>
      ));
      return props.ordered ? (
        <ol className="jr-list ordered">{items}</ol>
      ) : (
        <ul className="jr-list">{items}</ul>
      );
    },

    Steps: ({ props }) => (
      <ol className="jr-steps">
        {props.items.map((step, index) => (
          <li key={index} className={`status-${step.status ?? "todo"}`}>
            <span className="jr-step-marker">{index + 1}</span>
            <div className="jr-step-body">
              <span className="jr-step-title">{step.title}</span>
              {step.body && (
                <span className="jr-step-text">{renderInline(step.body)}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    ),

    BarChart: ({ props }) => <BarChart {...props} />,
    LineChart: ({ props }) => <LineChart {...props} />,

    Progress: ({ props }) => {
      const max = props.max ?? 100;
      const pct = Math.max(0, Math.min(100, (props.value / (max || 1)) * 100));
      return (
        <div className="jr-progress">
          <div className="jr-progress-head">
            <span>{props.label ?? ""}</span>
            <span className="jr-progress-num">{Math.round(pct)}%</span>
          </div>
          <div
            className="jr-progress-track"
            role="progressbar"
            aria-valuenow={props.value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={props.label ?? "Progress"}
          >
            <div className="jr-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    },

    // ------------------------------------------------------------- signalling

    Badge: ({ props }) => (
      <span className={`jr-badge ${toneClass(props.tone)}`}>{props.label}</span>
    ),

    Alert: ({ props }) => (
      <div className={`jr-alert ${toneClass(props.tone)}`} role="note">
        {props.title && (
          <strong className="jr-alert-title">{props.title}</strong>
        )}
        <span className="jr-alert-body">{renderInline(props.content)}</span>
      </div>
    ),

    // ------------------------------------------------------------ interactive

    Suggestions: ({ props }) => (
      <div className="jr-suggestions">
        {props.prompts.map((prompt, index) => (
          <button
            key={index}
            type="button"
            className="jr-chip"
            onClick={() => ask(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    ),

    Button: ({ props, emit }) => (
      <button
        type="button"
        className={`jr-button ${toneClass(props.tone)}`}
        onClick={() => emit("click")}
      >
        {props.label}
      </button>
    ),

    Link: ({ props }) => (
      <a
        className="jr-link"
        href={props.href}
        target="_blank"
        rel="noreferrer noopener"
      >
        {props.label}
        <ExternalIcon />
      </a>
    ),
  },

  actions: {
    ask: async (params) => {
      if (params?.prompt) ask(params.prompt);
    },

    copy: async (params) => {
      if (params?.text) await navigator.clipboard.writeText(params.text);
    },

    openUrl: async (params) => {
      if (params?.url) window.open(params.url, "_blank", "noopener,noreferrer");
    },
  },
});

// =============================================================================
// Charts
// =============================================================================

interface ChartData {
  data: Array<{ label: string; value: number }>;
  unit?: string | null;
}

function BarChart({
  data,
  unit,
  horizontal,
}: ChartData & { horizontal?: boolean | null }) {
  const values = data.map((d) => d.value);
  const [min, max] = bounds(values);

  if (horizontal) {
    return (
      <div className="jr-hbars">
        {data.map((point, index) => (
          <div key={index} className="jr-hbar">
            <span className="jr-hbar-label" title={point.label}>
              {point.label}
            </span>
            <div className="jr-hbar-track">
              <div
                className="jr-hbar-fill"
                style={{
                  width: `${((point.value - min) / (max - min || 1)) * 100}%`,
                }}
              />
            </div>
            <span className="jr-hbar-value">
              {niceNumber(point.value)}
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const inner = CHART.w - CHART.padX - 12;
  const slot = inner / Math.max(data.length, 1);
  const barWidth = Math.min(slot * 0.62, 56);
  const zero = scaleY(0, min, max);

  return (
    <figure className="jr-chart">
      <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img">
        <Axis min={min} max={max} unit={unit} />
        {data.map((point, index) => {
          const y = scaleY(point.value, min, max);
          const x = CHART.padX + slot * index + (slot - barWidth) / 2;
          return (
            <g key={index} className="jr-bar">
              <rect
                x={x}
                y={Math.min(y, zero)}
                width={barWidth}
                height={Math.max(Math.abs(zero - y), 1)}
                rx="3"
              />
              <title>{`${point.label}: ${point.value}${unit ?? ""}`}</title>
            </g>
          );
        })}
      </svg>
      <figcaption className="jr-chart-labels">
        {data.map((point, index) => (
          <span key={index} title={point.label}>
            {point.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function LineChart({
  data,
  unit,
  area,
}: ChartData & { area?: boolean | null }) {
  const gradientId = useId();
  const values = data.map((d) => d.value);
  const [min, max] = bounds(values);

  const points = useMemo(() => {
    const inner = CHART.w - CHART.padX - 12;
    const step = data.length > 1 ? inner / (data.length - 1) : 0;
    return data.map((point, index) => ({
      x: CHART.padX + step * index,
      y: scaleY(point.value, min, max),
      point,
    }));
  }, [data, min, max]);

  const line = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <figure className="jr-chart">
      <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} role="img">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <Axis min={min} max={max} unit={unit} />

        {area && first && last && (
          <polygon
            className="jr-area"
            fill={`url(#${gradientId})`}
            points={`${first.x},${CHART.h - CHART.padBottom} ${line} ${last.x},${CHART.h - CHART.padBottom}`}
          />
        )}

        <polyline className="jr-line" points={line} />

        {points.map((p, index) => (
          <g key={index}>
            <circle className="jr-dot" cx={p.x} cy={p.y} r="3" />
            <title>{`${p.point.label}: ${p.point.value}${unit ?? ""}`}</title>
          </g>
        ))}
      </svg>
      <figcaption className="jr-chart-labels">
        {data.map((point, index) => (
          <span key={index} title={point.label}>
            {point.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Three horizontal gridlines with value labels. */
function Axis({
  min,
  max,
  unit,
}: {
  min: number;
  max: number;
  unit?: string | null;
}): ReactNode {
  const ticks = [max, (max + min) / 2, min];
  return (
    <g className="jr-axis">
      {ticks.map((tick, index) => {
        const y = scaleY(tick, min, max);
        return (
          <g key={index}>
            <line x1={CHART.padX} x2={CHART.w - 12} y1={y} y2={y} />
            <text x={CHART.padX - 8} y={y + 4} textAnchor="end">
              {niceNumber(tick)}
              {unit}
            </text>
          </g>
        );
      })}
    </g>
  );
}
