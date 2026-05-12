"use client";

import { useState } from "react";

export function ResponsiveSection({ title, titleStyle, isMobile, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!isMobile) {
    return (
      <div className="osa-sidebar-section">
        <div style={titleStyle}>{title}</div>
        {children}
      </div>
    );
  }

  return (
    <div className="osa-sidebar-section">
      <button
        type="button"
        className="osa-sidebar-section-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span style={titleStyle}>{title}</span>
        <span aria-hidden style={{ opacity: 0.65, fontSize: "12px", flexShrink: 0 }}>
          {open ? "Свернуть" : "Открыть"}
        </span>
      </button>
      {open ? <div className="osa-sidebar-section-body">{children}</div> : null}
    </div>
  );
}
