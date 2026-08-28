import { SpecRenderer } from "../render/SpecRenderer";
import { gallerySpec } from "../render/gallery-spec";

import "../styles/chat.css";
import "../styles/gallery.css";

/**
 * The catalog gallery.
 *
 * Hydrated with `client:load` rather than `client:only` so the markup is
 * server-rendered: the page is readable before JS arrives, and the SSR pass
 * is what proves every catalog entry has a working registry implementation.
 */
export function Gallery() {
  return (
    <div className="gallery">
      <header className="gallery-head">
        <h1>Catalog gallery</h1>
        <p>
          Every component the model can emit, rendered from one spec through the
          same registry the chat uses.
        </p>
        <a className="gallery-back" href="/">
          Back to chat
        </a>
      </header>

      <SpecRenderer spec={gallerySpec} />
    </div>
  );
}
